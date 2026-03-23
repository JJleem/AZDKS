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

const KEYWORD_RULES: KeywordRule[] = [
  { keywords: ['kakaotalk', '카카오톡', 'kakao'], subFolder: 'SNS/카카오', boost: 0.25 },
  { keywords: ['screenshot', '스크린샷', 'screen shot', 'capture'], subFolder: '스크린샷', boost: 0.25 },
  { keywords: ['invoice', '인보이스', 'receipt', '영수증', '청구서'], subFolder: '문서/영수증', boost: 0.2 },
  { keywords: ['resume', 'cv', '이력서', '자기소개서'], subFolder: '문서/이력서', boost: 0.25 },
  { keywords: ['최종', 'final', 'finished', 'done', 'complete'], subFolder: '문서/작업중', boost: 0.15 },
  { keywords: ['report', '보고서', 'summary', '요약'], subFolder: '문서/보고서', boost: 0.2 },
  { keywords: ['presentation', '발표', 'deck', 'slides'], subFolder: '문서/발표자료', boost: 0.2 },
  { keywords: ['backup', '백업', 'bak'], subFolder: '백업', boost: 0.2 },
  { keywords: ['temp', 'tmp', '임시'], subFolder: '임시', boost: 0.15 },
  { keywords: ['project', '프로젝트', 'proj'], subFolder: '프로젝트', boost: 0.1 },
];

// Date pattern: 2024-01-01, 20240101, 2024_01, etc.
const DATE_PATTERN = /(?:^|[_\-\s])(\d{4})[_\-\s]?(\d{2})(?:[_\-\s]?\d{2})?(?:$|[_\-\s])/;

export function analyzeKeywords(filename: string): KeywordResult | null {
  const lower = filename.toLowerCase();

  // Date pattern check
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

  // Keyword rules
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

  return null;
}
