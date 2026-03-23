import type { FileAnalysis } from './analyzer';
import type { RulesStore } from '../store/rulesStore';
import { analyzeKeywords } from './keywordAnalyzer';
import { matchGlob } from './patternMatcher';
import type { ClassificationResult, ClassificationSource, ClassificationAlternative } from './classifier';
import { getConfidenceLevel } from './confidenceCalc';

// ── Priority 4.5: kMDItemWhereFroms URL origin map ──
const WHERE_FROMS_MAP: Array<{ domains: string[]; folder: string; label: string; conf: number }> = [
  // SNS
  { domains: ['instagram.com'], folder: 'SNS/인스타그램', label: 'Instagram 다운로드', conf: 0.95 },
  { domains: ['twitter.com', 'x.com', 't.co'], folder: 'SNS/트위터', label: 'Twitter/X 다운로드', conf: 0.95 },
  { domains: ['youtube.com', 'youtu.be'], folder: 'SNS/유튜브', label: 'YouTube 다운로드', conf: 0.93 },
  { domains: ['tiktok.com'], folder: 'SNS/TikTok', label: 'TikTok 다운로드', conf: 0.95 },
  { domains: ['pinterest.com'], folder: 'SNS/Pinterest', label: 'Pinterest 다운로드', conf: 0.93 },
  { domains: ['facebook.com', 'fbcdn.net'], folder: 'SNS/Facebook', label: 'Facebook 다운로드', conf: 0.93 },
  { domains: ['reddit.com', 'redd.it', 'i.redd.it', 'v.redd.it'], folder: 'SNS/Reddit', label: 'Reddit 다운로드', conf: 0.93 },
  { domains: ['threads.net'], folder: 'SNS/Threads', label: 'Threads 다운로드', conf: 0.93 },
  { domains: ['discord.com', 'discordapp.com', 'cdn.discordapp.com'], folder: 'SNS/Discord', label: 'Discord 다운로드', conf: 0.92 },
  { domains: ['line.me', 'obs.line-cdn.net'], folder: 'SNS/LINE', label: 'LINE 다운로드', conf: 0.95 },
  { domains: ['web.telegram.org', 't.me'], folder: 'SNS/텔레그램', label: 'Telegram 다운로드', conf: 0.95 },
  // 디자인 도구
  { domains: ['figma.com'], folder: '디자인/Figma', label: 'Figma 다운로드', conf: 0.97 },
  { domains: ['dribbble.com'], folder: '디자인/레퍼런스', label: 'Dribbble 레퍼런스', conf: 0.93 },
  { domains: ['behance.net'], folder: '디자인/레퍼런스', label: 'Behance 레퍼런스', conf: 0.93 },
  { domains: ['unsplash.com'], folder: '사진/스톡', label: 'Unsplash 스톡 사진', conf: 0.95 },
  { domains: ['pexels.com'], folder: '사진/스톡', label: 'Pexels 스톡 사진', conf: 0.95 },
  { domains: ['freepik.com'], folder: '디자인/에셋', label: 'Freepik 에셋', conf: 0.93 },
  { domains: ['flaticon.com'], folder: '디자인/아이콘', label: 'Flaticon 아이콘', conf: 0.95 },
  // 개발
  { domains: ['github.com', 'githubusercontent.com', 'codeload.github.com'], folder: '개발/GitHub', label: 'GitHub 다운로드', conf: 0.95 },
  { domains: ['npmjs.com'], folder: '개발/패키지', label: 'npm 패키지', conf: 0.93 },
  { domains: ['stackoverflow.com'], folder: '개발/참고자료', label: 'StackOverflow', conf: 0.90 },
  // 클라우드/업무
  { domains: ['drive.google.com', 'docs.google.com'], folder: '문서/Google Drive', label: 'Google Drive', conf: 0.92 },
  { domains: ['dropbox.com'], folder: '클라우드/Dropbox', label: 'Dropbox', conf: 0.90 },
  { domains: ['notion.so', 'notion.com'], folder: '문서/Notion', label: 'Notion 내보내기', conf: 0.93 },
  { domains: ['wetransfer.com'], folder: '공유파일', label: 'WeTransfer', conf: 0.88 },
  { domains: ['icloud.com', 'apple.com'], folder: '클라우드/iCloud', label: 'iCloud', conf: 0.88 },
  // 쇼핑/금융
  { domains: ['coupang.com'], folder: '쇼핑/쿠팡', label: '쿠팡 영수증', conf: 0.93 },
  { domains: ['baemin.com', 'baemincorp.com'], folder: '쇼핑/배민', label: '배달의민족', conf: 0.93 },
  { domains: ['amazon.com', 'amazon.co.kr'], folder: '쇼핑/아마존', label: 'Amazon', conf: 0.93 },
  { domains: ['naver.com', 'smartstore.naver.com'], folder: '쇼핑/네이버', label: '네이버 스마트스토어', conf: 0.88 },
];

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    // fallback for malformed URLs
    const match = url.match(/(?:https?:\/\/)?(?:www\.)?([^/]+)/);
    return match ? match[1] : url;
  }
}

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

  // ── 4.5순위: kMDItemWhereFroms — 다운로드 URL 기반 분류 (confidence 88-97%) ──
  if (analysis.whereFroms && analysis.whereFroms.length > 0) {
    let whereFromsMatched = false;
    outer: for (const url of analysis.whereFroms) {
      const domain = extractDomain(url);
      for (const entry of WHERE_FROMS_MAP) {
        if (entry.domains.some(d => domain === d || domain.endsWith('.' + d))) {
          options.push({
            folder: `${home}/${entry.folder}`,
            confidence: entry.conf,
            reason: `${entry.label} (출처: ${domain})`,
            source: 'keyword',
          });
          whereFromsMatched = true;
          break outer;
        }
      }
    }
    // If no known domain matched but we have whereFroms, note it's a web download
    if (!whereFromsMatched) {
      const firstDomain = extractDomain(analysis.whereFroms[0]);
      options.push({
        folder: `${home}/다운로드`,
        confidence: 0.72,
        reason: `웹 다운로드 (출처: ${firstDomain})`,
        source: 'keyword',
      });
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

  // ── 5.5순위: 영상 메타데이터 인텔리전스 ──
  if (analysis.durationSeconds !== null && analysis.durationSeconds !== undefined) {
    const dur = analysis.durationSeconds;
    const videoExts = ['mp4', 'mov', 'webm', 'mkv', 'avi'];
    const isVideoExt = videoExts.includes(ext);

    if (analysis.videoFramerate !== null && analysis.videoFramerate !== undefined) {
      const fps = analysis.videoFramerate;
      if (fps >= 100) {
        options.push({
          folder: `${home}/영상/슬로우모션`,
          confidence: 0.85,
          reason: `초고프레임 영상 (${fps.toFixed(0)}fps) — 슬로우모션`,
          source: 'keyword',
        });
      } else if (fps >= 60) {
        options.push({
          folder: `${home}/영상/고프레임`,
          confidence: 0.80,
          reason: `고프레임 영상 (${fps.toFixed(0)}fps) — 게임/슬로우모션`,
          source: 'keyword',
        });
      }
    }

    if (isVideoExt) {
      if (dur < 90) {
        options.push({
          folder: `${home}/영상/숏폼`,
          confidence: 0.82,
          reason: `짧은 영상 (${dur.toFixed(0)}초) — 숏폼`,
          source: 'keyword',
        });
      } else if (dur > 1800 && ['mp4', 'mov', 'mkv'].includes(ext)) {
        options.push({
          folder: `${home}/영상/장편`,
          confidence: 0.78,
          reason: `장편 영상 (${(dur / 60).toFixed(0)}분)`,
          source: 'keyword',
        });
      }
    }
  }

  // ── 5.6순위: PDF 인텔리전스 ──
  if (ext === 'pdf') {
    const pages = analysis.pageCount ?? analysis.numberOfPages;
    if (pages !== null && pages !== undefined) {
      if (pages === 1) {
        options.push({
          folder: `${home}/문서/영수증`,
          confidence: 0.70,
          reason: `1페이지 PDF — 영수증 가능성`,
          source: 'keyword',
        });
      } else if (pages >= 100) {
        options.push({
          folder: `${home}/학업/교재`,
          confidence: 0.75,
          reason: `PDF ${pages}페이지 — 교재/장문서`,
          source: 'keyword',
        });
      }
    }
  }

  // ── 5.7순위: 음악 메타데이터 ──
  if (analysis.artist || analysis.album) {
    const detail = [analysis.artist, analysis.album].filter(Boolean).join(' / ');
    options.push({
      folder: `${home}/음악/음원`,
      confidence: 0.88,
      reason: `음악 메타데이터 (${detail})`,
      source: 'keyword',
    });
  }
  if (analysis.audioBitrate !== null && analysis.audioBitrate !== undefined && analysis.audioBitrate > 900000) {
    options.push({
      folder: `${home}/음악/무손실`,
      confidence: 0.82,
      reason: `고비트레이트 오디오 (${(analysis.audioBitrate / 1000).toFixed(0)}kbps) — 무손실`,
      source: 'keyword',
    });
  }

  // ── 5.8순위: 언어 감지 ──
  if (analysis.languages && analysis.languages.length > 0) {
    if (analysis.languages.includes('ja')) {
      options.push({
        folder: `${home}/문서/일본어`,
        confidence: 0.68,
        reason: `일본어 문서 (언어 메타데이터)`,
        source: 'keyword',
      });
    } else if (analysis.languages.includes('ko')) {
      // 한국어 문서 — 기존 분류에 boost만 적용 (별도 폴더 없이 신뢰도 소폭 향상)
      // 이미 다른 옵션이 쌓이므로 특별 처리 없음
    }
    // 영어 전용은 일반 문서 버킷으로 충분
  }

  // ── 5.9순위: 파일 크기 인텔리전스 (Spotlight fileSize 우선, fallback: size) ──
  const effectiveSize = analysis.fileSize ?? analysis.size;
  if (effectiveSize !== null && effectiveSize !== undefined) {
    const MB = 1024 * 1024;
    const rawExts = ['arw', 'cr2', 'cr3', 'nef', 'orf', 'rw2', 'dng', 'raf'];
    const videoExts2 = ['mp4', 'mov', 'mkv', 'avi', 'webm'];
    if (rawExts.includes(ext) && effectiveSize > 15 * MB) {
      options.push({
        folder: `${home}/사진/RAW`,
        confidence: 0.88,
        reason: `RAW 사진 (${(effectiveSize / MB).toFixed(0)}MB)`,
        source: 'keyword',
      });
    } else if (videoExts2.includes(ext) && effectiveSize > 2 * 1024 * MB) {
      options.push({
        folder: `${home}/영상/원본`,
        confidence: 0.85,
        reason: `대용량 영상 (${(effectiveSize / MB / 1024).toFixed(1)}GB) — 원본`,
        source: 'keyword',
      });
    } else if (videoExts2.includes(ext) && effectiveSize < 3 * MB) {
      options.push({
        folder: `${home}/영상/숏폼`,
        confidence: 0.75,
        reason: `소용량 영상 (${(effectiveSize / MB).toFixed(1)}MB) — 숏폼`,
        source: 'keyword',
      });
    }
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
