// 파일명에서 프로젝트/주제 이름 추출

// 무시할 일반 단어들
const IGNORE_TOKENS = new Set([
  'img', 'image', 'photo', 'pic', 'picture', 'file', 'document', 'doc',
  'new', 'old', 'copy', 'the', 'a', 'an', 'of', 'and', 'or', 'to',
  'v1', 'v2', 'v3', 'v4', 'v5', 'final', 'draft', 'temp', 'tmp',
  'untitled', 'screenshot', 'capture', 'screen',
  '사진', '이미지', '파일', '문서', '새로운', '임시', '최종', '스크린샷',
]);

export interface ProjectCandidate {
  name: string;          // 감지된 프로젝트 이름
  confidence: number;    // 0~1
  source: 'camel' | 'prefix' | 'korean' | 'brand' | 'pattern';
}

export function detectProject(filename: string): ProjectCandidate | null {
  const name = filename.split(/[\\/]/).pop() ?? filename;
  const nameWithoutExt = name.includes('.') ? name.slice(0, name.lastIndexOf('.')) : name;

  // 1. 알려진 브랜드/앱 이름 감지
  const brand = detectBrand(nameWithoutExt);
  if (brand) return { name: brand, confidence: 0.9, source: 'brand' };

  // 2. 한국어 단어 추출 (의미있는 한글 단어)
  const korean = extractKoreanProject(nameWithoutExt);
  if (korean) return { name: korean, confidence: 0.75, source: 'korean' };

  // 3. CamelCase/PascalCase 첫 단어
  const camel = extractCamelPrefix(nameWithoutExt);
  if (camel) return { name: camel, confidence: 0.7, source: 'camel' };

  // 4. snake_case / kebab-case 첫 의미있는 토큰
  const prefix = extractPrefix(nameWithoutExt);
  if (prefix) return { name: prefix, confidence: 0.6, source: 'prefix' };

  return null;
}

// 알려진 브랜드/서비스 이름 (파일명에 자주 등장)
const KNOWN_BRANDS: Record<string, string> = {
  kakaotalk: '카카오톡', kakao: '카카오', instagram: '인스타그램', insta: '인스타그램',
  twitter: '트위터', youtube: '유튜브', discord: '디스코드', slack: '슬랙',
  notion: 'Notion', figma: 'Figma', github: 'GitHub', google: 'Google',
  apple: 'Apple', samsung: '삼성', naver: '네이버', line: 'Line',
  zoom: 'Zoom', teams: 'Teams', tiktok: 'TikTok',
};

function detectBrand(name: string): string | null {
  const lower = name.toLowerCase();
  for (const [key, label] of Object.entries(KNOWN_BRANDS)) {
    if (lower.includes(key)) return label;
  }
  return null;
}

function extractKoreanProject(name: string): string | null {
  // 한글 단어 시퀀스 추출
  const matches = name.match(/[가-힣]{2,}/g);
  if (!matches) return null;

  const meaningful = matches.filter(w => !IGNORE_TOKENS.has(w));
  if (meaningful.length === 0) return null;

  // 가장 긴 한글 단어를 프로젝트명으로
  return meaningful.sort((a, b) => b.length - a.length)[0];
}

function extractCamelPrefix(name: string): string | null {
  // CamelCase/PascalCase 분리
  const tokens = name
    .replace(/([A-Z])/g, ' $1')
    .split(/[\s_\-]+/)
    .map(t => t.trim())
    .filter(t => t.length > 1 && /[A-Za-z]/.test(t));

  const filtered = tokens.filter(t => !IGNORE_TOKENS.has(t.toLowerCase()));
  if (filtered.length === 0) return null;

  const first = filtered[0];
  // 2글자 이상, 숫자만은 아닌 것
  if (first.length >= 2 && /[A-Za-z]/.test(first)) return first;
  return null;
}

function extractPrefix(name: string): string | null {
  // snake_case, kebab-case, space 기준으로 분리
  const tokens = name
    .split(/[_\-\s\.]+/)
    .map(t => t.trim())
    .filter(t => t.length >= 2);

  for (const token of tokens) {
    if (!IGNORE_TOKENS.has(token.toLowerCase()) && /[A-Za-z가-힣]/.test(token)) {
      return token;
    }
  }
  return null;
}

// 여러 파일을 한꺼번에 분석해서 공통 프로젝트 감지 (배치 클러스터링)
export function clusterByProject(filenames: string[]): Map<string, string[]> {
  const clusters = new Map<string, string[]>();
  const others: string[] = [];

  for (const filename of filenames) {
    const project = detectProject(filename);
    if (project && project.confidence >= 0.6) {
      const key = project.name;
      if (!clusters.has(key)) clusters.set(key, []);
      clusters.get(key)!.push(filename);
    } else {
      others.push(filename);
    }
  }

  if (others.length > 0) clusters.set('기타', others);
  return clusters;
}
