import { matchGlob } from './patternMatcher';
import { analyzeKeywords } from './keywordAnalyzer';
import { calcConfidence, getConfidenceLevel, ConfidenceLevel } from './confidenceCalc';
import { detectProject } from './projectDetector';
import { getFileDateInfo, buildDateFolder } from './dateClassifier';
import type { Rule, RulesStore } from '../store/rulesStore';
import type { ClassificationMode } from './classificationMode';

export type ClassificationSource = 'rule' | 'extension' | 'keyword' | 'project' | 'date' | 'unknown';

export interface ClassificationAlternative {
  folder: string;
  confidence: number;
  reason: string;
  source: ClassificationSource;
}

export interface ClassificationResult {
  folder: string;
  confidence: number;
  level: ConfidenceLevel;
  reason: string;
  source: ClassificationSource;
  subFolder?: string;
  projectName?: string;
  dateInfo?: { year: string; month: string; day: string };
  // 사용자에게 보여줄 대안 선택지 (스마트 모드에서 점수 차이 가까울 때)
  alternatives?: ClassificationAlternative[];
}

// Extension → category mapping
const EXTENSION_MAP: Record<string, string> = {
  jpg: '이미지', jpeg: '이미지', png: '이미지', gif: '이미지',
  webp: '이미지', heic: '이미지', svg: '이미지', bmp: '이미지', tiff: '이미지',
  pdf: '문서', docx: '문서', doc: '문서', pptx: '문서', ppt: '문서',
  xlsx: '문서', xls: '문서', hwp: '문서', hwpx: '문서', txt: '문서', md: '문서',
  js: '코드', ts: '코드', jsx: '코드', tsx: '코드', py: '코드',
  java: '코드', swift: '코드', cpp: '코드', c: '코드', h: '코드',
  go: '코드', rs: '코드', rb: '코드', php: '코드', css: '코드',
  html: '코드', json: '코드', yaml: '코드', yml: '코드', sh: '코드',
  mp4: '영상', mov: '영상', avi: '영상', mkv: '영상', wmv: '영상',
  flv: '영상', webm: '영상', m4v: '영상',
  mp3: '음악', flac: '음악', wav: '음악', m4a: '음악', aac: '음악',
  ogg: '음악', wma: '음악',
  zip: '압축', rar: '압축', '7z': '압축', tar: '압축', gz: '압축',
  bz2: '압축', xz: '압축',
  ttf: '폰트', otf: '폰트', woff: '폰트', woff2: '폰트',
};

// ─── 동기 분류 (rules + 확장자 + 키워드 + 프로젝트) ───
export function classifyFile(
  filePath: string,
  rulesStore: RulesStore,
  mode: ClassificationMode = 'smart',
): ClassificationResult {
  const fileName = filePath.split(/[\\/]/).pop() || filePath;
  const ext = fileName.includes('.') ? fileName.split('.').pop()?.toLowerCase() ?? '' : '';

  // Step 1: rules.json 패턴 매칭 (모드 무관하게 항상 우선)
  const matchedRule = findMatchingRule(fileName, ext, rulesStore.rules);
  if (matchedRule) {
    const folder = resolveFolder(matchedRule.folder, rulesStore.defaultFolders);
    return {
      folder,
      confidence: matchedRule.confidence,
      level: getConfidenceLevel(matchedRule.confidence),
      reason: `저장된 규칙 일치: ${matchedRule.pattern ?? matchedRule.extensions?.join(', ')}`,
      source: 'rule',
    };
  }

  const category = EXTENSION_MAP[ext] ?? null;
  const home = resolveHome(rulesStore.defaultFolders);

  // ─── 타입별 모드 ───
  if (mode === 'type') {
    return classifyByType(fileName, ext, category, rulesStore);
  }

  // ─── 날짜별 모드 (동기 fallback - 실제 날짜는 비동기로 채움) ───
  if (mode === 'date') {
    return {
      folder: `${home}/날짜별/로딩중`,
      confidence: 0.5,
      level: 'confirm',
      reason: '날짜 정보 로딩 중...',
      source: 'date',
    };
  }

  // ─── 프로젝트별 모드 ───
  if (mode === 'project') {
    const project = detectProject(fileName);
    if (project) {
      const folder = `${home}/프로젝트/${project.name}`;
      return {
        folder,
        confidence: project.confidence,
        level: getConfidenceLevel(project.confidence),
        reason: `프로젝트 "${project.name}" 감지 (${project.source})`,
        source: 'project',
        projectName: project.name,
      };
    }
    // 프로젝트 감지 실패 → 키워드 fallback
    const keyword = analyzeKeywords(fileName);
    if (keyword) {
      return {
        folder: `${home}/${keyword.subFolder}`,
        confidence: calcConfidence(false, !!category, keyword.boost),
        level: getConfidenceLevel(calcConfidence(false, !!category, keyword.boost)),
        reason: `키워드 "${keyword.matched}" → ${keyword.subFolder}`,
        source: 'keyword',
      };
    }
    return {
      folder: `${home}/프로젝트/기타`,
      confidence: 0.3,
      level: 'unknown',
      reason: '프로젝트 감지 실패',
      source: 'unknown',
    };
  }

  // ─── 스마트 모드 (기본) ───
  return classifySmart(fileName, ext, category, rulesStore);
}

// 날짜별 모드 비동기 버전 (실제 메타데이터 날짜 사용)
export async function classifyFileByDate(
  filePath: string,
  rulesStore: RulesStore,
): Promise<ClassificationResult> {
  const home = resolveHome(rulesStore.defaultFolders);

  const dateInfo = await getFileDateInfo(filePath);
  const folder = buildDateFolder(`${home}/날짜별`, dateInfo, 'month');

  const confidenceBySource: Record<string, number> = { metadata: 0.95, filename: 0.8, unknown: 0.5 };
  const confidence = confidenceBySource[dateInfo.source] ?? 0.5;

  const label = dateInfo.source === 'metadata'
    ? `파일 생성일 ${dateInfo.year}.${dateInfo.month}.${dateInfo.day}`
    : dateInfo.source === 'filename'
    ? `파일명 날짜 ${dateInfo.year}.${dateInfo.month}.${dateInfo.day}`
    : `오늘 날짜 기준 ${dateInfo.year}.${dateInfo.month}`;

  return {
    folder,
    confidence,
    level: getConfidenceLevel(confidence),
    reason: label,
    source: 'date',
    dateInfo: { year: dateInfo.year, month: dateInfo.month, day: dateInfo.day },
  };
}

function classifySmart(
  fileName: string,
  ext: string,
  category: string | null,
  rulesStore: RulesStore,
): ClassificationResult {
  const home = resolveHome(rulesStore.defaultFolders);

  // 신호 수집
  const keyword = analyzeKeywords(fileName);
  const project = detectProject(fileName);

  // 스코어링
  const scores: Array<{ type: string; score: number; folder: string; reason: string; source: ClassificationSource }> = [];

  if (keyword) {
    const conf = calcConfidence(false, !!category, keyword.boost);
    scores.push({
      type: 'keyword',
      score: conf + keyword.boost,
      folder: keyword.subFolder.startsWith('날짜별/')
        ? `${resolveFolder(category ?? '미분류', rulesStore.defaultFolders)}/${keyword.subFolder.replace('날짜별/', '')}`
        : `${home}/${keyword.subFolder}`,
      reason: `"${keyword.matched}" 감지 → ${keyword.subFolder}`,
      source: 'keyword',
    });
  }

  if (project) {
    scores.push({
      type: 'project',
      score: project.confidence,
      folder: `${home}/프로젝트/${project.name}`,
      reason: `프로젝트 "${project.name}" (${project.source})`,
      source: 'project',
    });
  }

  if (category) {
    scores.push({
      type: 'extension',
      score: 0.65,
      folder: resolveFolder(category, rulesStore.defaultFolders),
      reason: `확장자 .${ext} → ${category}`,
      source: 'extension',
    });
  }

  if (scores.length === 0) {
    return {
      folder: resolveFolder('미분류', rulesStore.defaultFolders),
      confidence: 0.1,
      level: 'unknown',
      reason: '분류 기준 없음',
      source: 'unknown',
    };
  }

  // 점수 내림차순 정렬
  scores.sort((a, b) => b.score - a.score);
  const best = scores[0];
  const confidence = Math.min(best.score, 1.0);

  // 2위 이하 중 top과 0.18 이내 차이 → 대안으로 제시
  const alternatives: ClassificationAlternative[] = scores
    .slice(1)
    .filter((s) => best.score - s.score <= 0.18)
    .slice(0, 2) // 최대 2개 대안
    .map((s) => ({
      folder: s.folder,
      confidence: Math.min(s.score, 1.0),
      reason: s.reason,
      source: s.source,
    }));

  return {
    folder: best.folder,
    confidence,
    level: getConfidenceLevel(confidence),
    reason: best.reason,
    source: best.source,
    alternatives: alternatives.length > 0 ? alternatives : undefined,
  };
}

function classifyByType(
  _fileName: string,
  ext: string,
  category: string | null,
  rulesStore: RulesStore,
): ClassificationResult {
  if (!category) {
    return {
      folder: resolveFolder('미분류', rulesStore.defaultFolders),
      confidence: 0.1,
      level: 'unknown',
      reason: '알 수 없는 파일 형식',
      source: 'unknown',
    };
  }
  return {
    folder: resolveFolder(category, rulesStore.defaultFolders),
    confidence: 0.75,
    level: 'auto',
    reason: `확장자 .${ext} → ${category}`,
    source: 'extension',
  };
}

function findMatchingRule(fileName: string, ext: string, rules: Rule[]): Rule | null {
  for (const rule of rules) {
    if (rule.pattern && matchGlob(rule.pattern, fileName)) return rule;
    if (rule.extensions?.includes('.' + ext)) {
      if (!rule.keywords || rule.keywords.length === 0) return rule;
      const lower = fileName.toLowerCase();
      if (rule.keywords.some((kw) => lower.includes(kw.toLowerCase()))) return rule;
    }
  }
  return null;
}

function resolveFolder(key: string, defaultFolders: Record<string, string>): string {
  return defaultFolders[key] ?? defaultFolders['미분류'] ?? '~/Downloads/AZDKS/미분류';
}

function resolveHome(defaultFolders: Record<string, string>): string {
  return defaultFolders['홈'] ?? '~/Downloads/AZDKS';
}
