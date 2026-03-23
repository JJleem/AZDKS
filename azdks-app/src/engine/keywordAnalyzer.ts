export interface KeywordResult {
  subFolder: string;
  matched: string;
  boost: number; // 0.0 ~ 0.3
}

interface KeywordRule {
  keywords: string[];
  subFolder: string;
  boost: number;
}

// ──────────────────────────────────────────────
// 의도/프로젝트 기반 키워드 분류 규칙
// 확장자 분류보다 이걸 먼저 매칭해서 "얘가 뭔지" 파악
// ──────────────────────────────────────────────
const KEYWORD_RULES: KeywordRule[] = [
  // 📱 SNS / 메신저
  { keywords: ['kakaotalk', '카카오톡', 'kakao'], subFolder: 'SNS/카카오', boost: 0.3 },
  { keywords: ['instagram', 'insta'], subFolder: 'SNS/인스타그램', boost: 0.3 },
  { keywords: ['twitter', 'tweet', 'x_'], subFolder: 'SNS/트위터', boost: 0.3 },
  { keywords: ['discord', 'slack'], subFolder: 'SNS/메신저', boost: 0.25 },
  { keywords: ['telegram', 'tele_'], subFolder: 'SNS/텔레그램', boost: 0.3 },
  { keywords: ['line_', 'lineapp'], subFolder: 'SNS/LINE', boost: 0.3 },
  { keywords: ['youtube', 'yt_'], subFolder: 'SNS/유튜브', boost: 0.3 },

  // 📸 사진 종류 (이미지면서 의도 있는 것)
  { keywords: ['screenshot', '스크린샷', 'screen shot', 'screencapture', 'capture', 'snip'], subFolder: '스크린샷', boost: 0.3 },
  { keywords: ['profile', 'avatar', '프로필', '아바타', 'selfie', '셀카'], subFolder: '사진/프로필', boost: 0.25 },
  { keywords: ['photo', '사진', 'img_', 'dsc_', 'dcim'], subFolder: '사진/일반', boost: 0.1 },
  { keywords: ['wallpaper', '배경화면', 'bg_', 'background'], subFolder: '사진/배경화면', boost: 0.25 },
  { keywords: ['meme', '짤', '짤방', 'funny', 'lol'], subFolder: '사진/짤', boost: 0.25 },
  { keywords: ['thumbnail', '썸네일', 'thumb', 'tn_'], subFolder: '디자인/썸네일', boost: 0.25 },

  // ✈️ 여행
  { keywords: ['travel', 'trip', '여행', 'tour', '해외', 'vacation', 'holiday'], subFolder: '사진/여행', boost: 0.25 },
  { keywords: ['japan', '일본', 'tokyo', 'osaka', 'kyoto', '도쿄', '오사카'], subFolder: '사진/여행/일본', boost: 0.3 },
  { keywords: ['korea', 'seoul', '서울', 'busan', '부산', 'jeju', '제주'], subFolder: '사진/여행/국내', boost: 0.3 },
  { keywords: ['usa', 'newyork', 'nyc', 'lasvegas', 'la_'], subFolder: '사진/여행/미국', boost: 0.3 },
  { keywords: ['europe', 'paris', 'london', 'berlin', 'rome', '유럽'], subFolder: '사진/여행/유럽', boost: 0.3 },

  // 🍔 음식
  { keywords: ['food', 'meal', '음식', '먹방', 'eat', 'lunch', 'dinner', 'breakfast', 'cafe', '카페'], subFolder: '사진/음식', boost: 0.2 },

  // 🎨 디자인 / 작업물
  { keywords: ['design', '디자인', 'mockup', 'mock', 'prototype', 'wireframe', 'figma'], subFolder: '디자인/작업물', boost: 0.25 },
  { keywords: ['logo', '로고', 'icon', '아이콘', 'brand', '브랜드'], subFolder: '디자인/로고·아이콘', boost: 0.25 },
  { keywords: ['ui', 'ux', 'interface', 'screen', 'app_design'], subFolder: '디자인/UI·UX', boost: 0.2 },
  { keywords: ['illustration', 'illust', '일러스트', 'drawing', '그림', 'artwork'], subFolder: '디자인/일러스트', boost: 0.25 },
  { keywords: ['poster', '포스터', 'banner', '배너', 'flyer', '전단'], subFolder: '디자인/포스터·배너', boost: 0.25 },

  // 💼 업무 / 문서
  { keywords: ['invoice', '인보이스', 'receipt', '영수증', '청구서', '세금계산서'], subFolder: '문서/영수증', boost: 0.3 },
  { keywords: ['resume', 'cv', '이력서', '자기소개서', 'portfolio', '포트폴리오'], subFolder: '문서/이력서·포트폴리오', boost: 0.3 },
  { keywords: ['report', '보고서', 'summary', '요약', '분석', 'analysis'], subFolder: '문서/보고서', boost: 0.25 },
  { keywords: ['presentation', '발표', 'ppt', 'deck', 'slides', '슬라이드'], subFolder: '문서/발표자료', boost: 0.25 },
  { keywords: ['contract', '계약', 'agreement', '협약', '동의서'], subFolder: '문서/계약서', boost: 0.3 },
  { keywords: ['meeting', '회의', 'minutes', 'agenda', '미팅'], subFolder: '문서/회의', boost: 0.2 },
  { keywords: ['plan', '기획', 'planning', '계획', 'proposal', '제안'], subFolder: '문서/기획', boost: 0.2 },
  { keywords: ['tutorial', '튜토리얼', 'guide', '가이드', 'manual', '매뉴얼'], subFolder: '문서/가이드', boost: 0.2 },

  // 🎓 학업 / 공부
  { keywords: ['homework', '과제', 'assignment', 'study', '공부', 'exam', '시험', 'quiz'], subFolder: '학업/과제', boost: 0.25 },
  { keywords: ['lecture', '강의', 'class', '수업', 'lesson', 'course'], subFolder: '학업/강의자료', boost: 0.2 },
  { keywords: ['thesis', '논문', 'paper', 'research', '연구'], subFolder: '학업/논문·연구', boost: 0.25 },

  // 💻 개발 / 코드
  { keywords: ['project', '프로젝트', 'proj_'], subFolder: '개발/프로젝트', boost: 0.15 },
  { keywords: ['api', 'backend', 'frontend', 'server', 'client'], subFolder: '개발/코드', boost: 0.15 },
  { keywords: ['debug', 'log', 'error', 'crash', 'stacktrace'], subFolder: '개발/로그', boost: 0.2 },
  { keywords: ['config', 'setting', '.env', 'yaml', 'json_'], subFolder: '개발/설정파일', boost: 0.15 },

  // 🎵 음악 / 미디어
  { keywords: ['music', '음악', 'song', '노래', 'album', '앨범', 'track', 'playlist'], subFolder: '음악/음원', boost: 0.2 },
  { keywords: ['podcast', '팟캐스트', 'radio', '라디오'], subFolder: '음악/팟캐스트', boost: 0.2 },
  { keywords: ['vlog', 'video', '영상', 'clip', '클립', 'footage'], subFolder: '영상/클립', boost: 0.15 },
  { keywords: ['edit', 'edited', '편집', 'cut', 'trim'], subFolder: '영상/편집', boost: 0.15 },

  // 📦 기타
  { keywords: ['backup', '백업', 'bak'], subFolder: '백업', boost: 0.25 },
  { keywords: ['temp', 'tmp', '임시', 'test_', 'untitled', '제목없음'], subFolder: '임시', boost: 0.15 },
  { keywords: ['최종', 'final', 'finished', 'done', 'complete', 'v_final', '_v2', '_v3'], subFolder: '문서/최종본', boost: 0.2 },
  { keywords: ['archive', '아카이브', 'old_', '구버전', 'legacy'], subFolder: '아카이브', boost: 0.2 },
];

// 날짜 패턴: 2024-01-01, 20240101, 2024_01 등
const DATE_PATTERN = /(?:^|[_\-\s])(\d{4})[_\-\s]?(\d{2})(?:[_\-\s]?\d{2})?(?:$|[_\-\s])/;

export function analyzeKeywords(filename: string): KeywordResult | null {
  const lower = filename.toLowerCase();

  // 키워드 룰 먼저 (의도 파악이 날짜보다 우선)
  for (const rule of KEYWORD_RULES) {
    for (const kw of rule.keywords) {
      if (lower.includes(kw.toLowerCase())) {
        return {
          subFolder: rule.subFolder,
          matched: kw,
          boost: rule.boost,
        };
      }
    }
  }

  // 날짜 패턴 (의도 키워드 없을 때 fallback)
  const dateMatch = lower.match(DATE_PATTERN);
  if (dateMatch) {
    const year = dateMatch[1];
    const month = dateMatch[2];
    return {
      subFolder: `날짜별/${year}/${month}`,
      matched: dateMatch[0].trim(),
      boost: 0.15,
    };
  }

  return null;
}
