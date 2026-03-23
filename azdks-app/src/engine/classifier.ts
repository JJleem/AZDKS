import { matchGlob } from './patternMatcher';
import { analyzeKeywords } from './keywordAnalyzer';
import { calcConfidence, getConfidenceLevel, ConfidenceLevel } from './confidenceCalc';
import type { Rule, RulesStore } from '../store/rulesStore';

export type ClassificationSource = 'rule' | 'extension' | 'keyword' | 'unknown';

export interface ClassificationResult {
  folder: string;
  confidence: number;
  level: ConfidenceLevel;
  reason: string;
  source: ClassificationSource;
  subFolder?: string;
}

// Extension → category mapping
const EXTENSION_MAP: Record<string, string> = {
  // 이미지
  jpg: '이미지', jpeg: '이미지', png: '이미지', gif: '이미지',
  webp: '이미지', heic: '이미지', svg: '이미지', bmp: '이미지', tiff: '이미지',
  // 문서
  pdf: '문서', docx: '문서', doc: '문서', pptx: '문서', ppt: '문서',
  xlsx: '문서', xls: '문서', hwp: '문서', hwpx: '문서', txt: '문서', md: '문서',
  // 코드
  js: '코드', ts: '코드', jsx: '코드', tsx: '코드', py: '코드',
  java: '코드', swift: '코드', cpp: '코드', c: '코드', h: '코드',
  go: '코드', rs: '코드', rb: '코드', php: '코드', css: '코드',
  html: '코드', json: '코드', yaml: '코드', yml: '코드', sh: '코드',
  // 영상
  mp4: '영상', mov: '영상', avi: '영상', mkv: '영상', wmv: '영상',
  flv: '영상', webm: '영상', m4v: '영상',
  // 음악
  mp3: '음악', flac: '음악', wav: '음악', m4a: '음악', aac: '음악',
  ogg: '음악', wma: '음악',
  // 압축
  zip: '압축', rar: '압축', '7z': '압축', tar: '압축', gz: '압축',
  bz2: '압축', xz: '압축',
  // 폰트
  ttf: '폰트', otf: '폰트', woff: '폰트', woff2: '폰트',
};

export function classifyFile(
  filePath: string,
  rulesStore: RulesStore,
): ClassificationResult {
  const fileName = filePath.split(/[\\/]/).pop() || filePath;
  const ext = fileName.includes('.') ? fileName.split('.').pop()?.toLowerCase() ?? '' : '';
  const nameWithoutExt = ext ? fileName.slice(0, -(ext.length + 1)) : fileName;

  // Step 1: rules.json pattern matching
  const matchedRule = findMatchingRule(fileName, ext, rulesStore.rules);
  if (matchedRule) {
    const folder = resolveFolder(matchedRule.folder, rulesStore.defaultFolders);
    return {
      folder,
      confidence: matchedRule.confidence,
      level: getConfidenceLevel(matchedRule.confidence),
      reason: `저장된 규칙과 일치: ${matchedRule.pattern || matchedRule.extensions?.join(', ')}`,
      source: 'rule',
    };
  }

  // Step 2: Extension-based classification
  const category = EXTENSION_MAP[ext] ?? null;

  // Step 3: Keyword analysis
  const keyword = analyzeKeywords(nameWithoutExt + (ext ? '.' + ext : ''));

  // Step 4: Confidence calculation
  const confidence = calcConfidence(false, !!category, keyword?.boost ?? 0);
  const level = getConfidenceLevel(confidence);

  if (!category && !keyword) {
    const folder = resolveFolder('미분류', rulesStore.defaultFolders);
    return {
      folder,
      confidence: 0.1,
      level: 'unknown',
      reason: '분류 기준 없음',
      source: 'unknown',
    };
  }

  const baseCategory = category ?? '미분류';
  const subFolder = keyword?.subFolder;

  let folderKey = baseCategory;
  let folder: string;

  if (subFolder && !subFolder.startsWith('날짜별')) {
    // Use keyword subFolder directly under default base
    const base = resolveFolder(baseCategory, rulesStore.defaultFolders);
    folder = `${base}/${subFolder.replace(baseCategory + '/', '')}`;
  } else if (subFolder?.startsWith('날짜별')) {
    const base = resolveFolder(baseCategory, rulesStore.defaultFolders);
    folder = `${base}/${subFolder.replace('날짜별/', '')}`;
  } else {
    folder = resolveFolder(folderKey, rulesStore.defaultFolders);
  }

  const reasonParts: string[] = [];
  if (category) reasonParts.push(`확장자 .${ext} → ${category}`);
  if (keyword) reasonParts.push(`키워드 "${keyword.matched}" 감지`);

  return {
    folder,
    confidence,
    level,
    reason: reasonParts.join(', '),
    source: keyword ? 'keyword' : 'extension',
    subFolder,
  };
}

function findMatchingRule(fileName: string, ext: string, rules: Rule[]): Rule | null {
  for (const rule of rules) {
    if (rule.pattern && matchGlob(rule.pattern, fileName)) {
      return rule;
    }
    if (rule.extensions?.includes('.' + ext)) {
      if (!rule.keywords || rule.keywords.length === 0) return rule;
      const lower = fileName.toLowerCase();
      if (rule.keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
        return rule;
      }
    }
  }
  return null;
}

function resolveFolder(key: string, defaultFolders: Record<string, string>): string {
  return defaultFolders[key] ?? defaultFolders['미분류'] ?? '~/Downloads/AZDKS/미분류';
}
