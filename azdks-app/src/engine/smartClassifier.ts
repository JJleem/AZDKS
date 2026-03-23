import type { FileAnalysis } from './analyzer';
import type { RulesStore } from '../store/rulesStore';
import { analyzeKeywords } from './keywordAnalyzer';
import { matchGlob } from './patternMatcher';
import type { ClassificationResult, ClassificationSource, ClassificationAlternative } from './classifier';
import { getConfidenceLevel } from './confidenceCalc';

// 알려진 제작 앱 → 분류 폴더 매핑
const CREATOR_MAP: Array<{ patterns: string[]; folder: string; label: string }> = [
  { patterns: ['figma'],                          folder: '디자인/Figma',       label: 'Figma 익스포트' },
  { patterns: ['sketch'],                         folder: '디자인/Sketch',      label: 'Sketch 익스포트' },
  { patterns: ['adobe photoshop', 'photoshop'],   folder: '디자인/Photoshop',   label: 'Photoshop 파일' },
  { patterns: ['adobe illustrator','illustrator'],folder: '디자인/Illustrator', label: 'Illustrator 파일' },
  { patterns: ['adobe xd', 'xd'],                 folder: '디자인/AdobeXD',    label: 'Adobe XD 파일' },
  { patterns: ['canva'],                          folder: '디자인/Canva',       label: 'Canva 파일' },
  { patterns: ['microsoft word', 'word'],         folder: '문서/Word',          label: 'Word 문서' },
  { patterns: ['microsoft excel', 'excel'],       folder: '문서/Excel',         label: 'Excel 파일' },
  { patterns: ['microsoft powerpoint','powerpoint'], folder: '문서/PowerPoint', label: 'PowerPoint 파일' },
  { patterns: ['pages'],                          folder: '문서/Pages',         label: 'Pages 문서' },
  { patterns: ['numbers'],                        folder: '문서/Numbers',       label: 'Numbers 파일' },
  { patterns: ['keynote'],                        folder: '문서/Keynote',       label: 'Keynote 파일' },
  { patterns: ['notion'],                         folder: '문서/Notion',        label: 'Notion 내보내기' },
  { patterns: ['hancom', 'hwp', '한컴'],          folder: '문서/한글',           label: '한글 문서' },
  { patterns: ['final cut', 'fcpx'],              folder: '영상/FinalCut',      label: 'Final Cut 프로젝트' },
  { patterns: ['premiere', 'after effects'],      folder: '영상/Adobe',         label: 'Adobe 영상' },
  { patterns: ['davinci'],                        folder: '영상/DaVinci',       label: 'DaVinci 영상' },
  { patterns: ['logic pro', 'garageband'],        folder: '음악/DAW',           label: '음악 프로젝트' },
  { patterns: ['xcode'],                          folder: '개발/Xcode',         label: 'Xcode 프로젝트' },
];

// 카메라 제조사 → 분류
const CAMERA_MAKE_MAP: Record<string, string> = {
  apple:   '사진/iPhone',
  samsung: '사진/Android',
  google:  '사진/Android',
  sony:    '사진/카메라',
  canon:   '사진/카메라',
  nikon:   '사진/카메라',
  fujifilm:'사진/카메라',
};

// 흔한 화면 해상도 (스크린샷 감지용 fallback)
const SCREEN_RESOLUTIONS = new Set([
  '3456x2234','3024x1964','2560x1664','2560x1600','2560x1440',
  '1920x1200','1920x1080','3840x2160','5120x2880','2732x2048',
  '2388x1668','2360x1640','2266x1488','2048x1536',
  '2796x1290','2556x1179','2532x1170','2436x1125','1334x750',
]);

function isScreenRes(w: number | null, h: number | null): boolean {
  if (!w || !h) return false;
  return SCREEN_RESOLUTIONS.has(`${w}x${h}`) || SCREEN_RESOLUTIONS.has(`${h}x${w}`);
}

function resolveHome(defaultFolders: Record<string, string>): string {
  return defaultFolders['홈'] ?? '~/AZDKS';
}

function resolveFolder(key: string, defaultFolders: Record<string, string>): string {
  return defaultFolders[key] ?? defaultFolders['미분류'] ?? '~/AZDKS/미분류';
}

interface ScoredOption {
  folder: string;
  confidence: number;
  reason: string;
  source: ClassificationSource;
}

export function classifyWithAnalysis(
  analysis: FileAnalysis,
  rulesStore: RulesStore,
): ClassificationResult {
  const home = resolveHome(rulesStore.defaultFolders);
  const fileName = analysis.name;
  const ext = analysis.extension.toLowerCase();
  const options: ScoredOption[] = [];

  // ── 1순위: 저장된 규칙 (항상 최우선) ──
  for (const rule of rulesStore.rules) {
    const matched =
      (rule.pattern && matchGlob(rule.pattern, fileName)) ||
      (rule.extensions?.includes('.' + ext) &&
        (!rule.keywords?.length || rule.keywords.some(kw => fileName.toLowerCase().includes(kw.toLowerCase()))));
    if (matched) {
      return {
        folder: rule.folder,
        confidence: rule.confidence,
        level: getConfidenceLevel(rule.confidence),
        reason: `저장된 규칙: ${rule.pattern ?? rule.extensions?.join(', ')}`,
        source: 'rule',
      };
    }
  }

  // ── 2순위: Spotlight — 스크린샷 확정 (신뢰도 99%) ──
  if (analysis.isScreenCapture) {
    const typeLabel = analysis.screenCaptureType
      ? ({ display: '전체화면', selection: '영역선택', window: '윈도우' } as Record<string, string>)[analysis.screenCaptureType] ?? analysis.screenCaptureType
      : '';
    options.push({
      folder: `${home}/스크린샷`,
      confidence: 0.99,
      reason: `맥 스크린샷 확인됨${typeLabel ? ` (${typeLabel})` : ''}`,
      source: 'keyword',
    });
  }

  // ── 3순위: Spotlight — 카메라 촬영 사진 ──
  if (analysis.cameraMake) {
    const make = analysis.cameraMake.toLowerCase();
    const subFolder = Object.entries(CAMERA_MAKE_MAP).find(([k]) => make.includes(k))?.[1] ?? '사진/카메라';
    const modelLabel = analysis.cameraModel ? ` (${analysis.cameraModel})` : '';
    const gpsLabel = analysis.hasGps ? ' · GPS 있음' : '';
    options.push({
      folder: `${home}/${subFolder}`,
      confidence: analysis.hasGps ? 0.96 : 0.90,
      reason: `${analysis.cameraMake}${modelLabel}로 촬영${gpsLabel}`,
      source: 'keyword',
    });
  }

  // ── 4순위: Spotlight — 제작 앱 감지 ──
  if (analysis.docCreator) {
    const creatorLower = analysis.docCreator.toLowerCase();
    for (const cm of CREATOR_MAP) {
      if (cm.patterns.some(p => creatorLower.includes(p))) {
        const titleSuffix = analysis.docTitle ? ` "${analysis.docTitle}"` : '';
        options.push({
          folder: `${home}/${cm.folder}`,
          confidence: 0.94,
          reason: `${cm.label}${titleSuffix}`,
          source: 'keyword',
        });
        break;
      }
    }
  }

  // ── 5순위: 파일명 키워드 분석 ──
  const keyword = analyzeKeywords(fileName);
  if (keyword) {
    options.push({
      folder: `${home}/${keyword.subFolder}`,
      confidence: 0.65 + keyword.boost,
      reason: `파일명 "${keyword.matched}" 감지`,
      source: 'keyword',
    });
  }

  // ── 6순위: 화면 해상도 일치 (스크린샷 가능성) ──
  if (!analysis.isScreenCapture && !analysis.cameraMake && isScreenRes(analysis.imageWidth, analysis.imageHeight)) {
    options.push({
      folder: `${home}/스크린샷`,
      confidence: 0.72,
      reason: `이미지 크기 ${analysis.imageWidth}×${analysis.imageHeight} — 화면 해상도와 일치`,
      source: 'keyword',
    });
  }

  // ── 7순위: 확장자 기반 폴더 (fallback) ──
  const EXT_MAP: Record<string, string> = {
    jpg:'이미지', jpeg:'이미지', png:'이미지', gif:'이미지', webp:'이미지', heic:'이미지', svg:'이미지', bmp:'이미지',
    pdf:'문서', docx:'문서', doc:'문서', pptx:'문서', ppt:'문서', xlsx:'문서', xls:'문서', hwp:'문서', txt:'문서', md:'문서',
    js:'코드', ts:'코드', jsx:'코드', tsx:'코드', py:'코드', java:'코드', swift:'코드', go:'코드', rs:'코드', cpp:'코드',
    mp4:'영상', mov:'영상', avi:'영상', mkv:'영상', webm:'영상',
    mp3:'음악', flac:'음악', wav:'음악', m4a:'음악', aac:'음악',
    zip:'압축', rar:'압축', '7z':'압축', tar:'압축', gz:'압축',
    ttf:'폰트', otf:'폰트', woff:'폰트', woff2:'폰트',
  };
  const category = EXT_MAP[ext];
  if (category) {
    options.push({
      folder: resolveFolder(category, rulesStore.defaultFolders),
      confidence: 0.60,
      reason: `확장자 .${ext}`,
      source: 'extension',
    });
  }

  // 분류 불가
  if (options.length === 0) {
    return {
      folder: resolveFolder('미분류', rulesStore.defaultFolders),
      confidence: 0.1,
      level: 'unknown',
      reason: '분류 기준 없음',
      source: 'unknown',
    };
  }

  // 점수 정렬
  options.sort((a, b) => b.confidence - a.confidence);
  const best = options[0];

  // 차이가 0.18 이내인 대안 수집 (최대 2개)
  const alternatives: ClassificationAlternative[] = options
    .slice(1)
    .filter(o => best.confidence - o.confidence <= 0.18)
    .slice(0, 2)
    .map(o => ({ folder: o.folder, confidence: o.confidence, reason: o.reason, source: o.source }));

  return {
    folder: best.folder,
    confidence: Math.min(best.confidence, 1.0),
    level: getConfidenceLevel(best.confidence),
    reason: best.reason,
    source: best.source,
    alternatives: alternatives.length > 0 ? alternatives : undefined,
  };
}
