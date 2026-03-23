export type ClassificationMode = 'smart' | 'date' | 'project' | 'type';

export interface ModeConfig {
  id: ClassificationMode;
  label: string;
  emoji: string;
  description: string;
}

export const MODES: ModeConfig[] = [
  {
    id: 'smart',
    label: '스마트',
    emoji: '🔮',
    description: '파일을 분석해서 알아서 최적 분류',
  },
  {
    id: 'date',
    label: '날짜별',
    emoji: '📅',
    description: '파일 생성일 기준 연/월/일 정리',
  },
  {
    id: 'project',
    label: '프로젝트별',
    emoji: '📁',
    description: '파일명에서 프로젝트·주제 추출',
  },
  {
    id: 'type',
    label: '타입별',
    emoji: '🗂️',
    description: '확장자 기준 이미지·문서·코드 분류',
  },
];

const MODE_STORAGE_KEY = 'azdks_classification_mode';

export function getSavedMode(): ClassificationMode {
  return (localStorage.getItem(MODE_STORAGE_KEY) as ClassificationMode) ?? 'smart';
}

export function saveMode(mode: ClassificationMode): void {
  localStorage.setItem(MODE_STORAGE_KEY, mode);
}
