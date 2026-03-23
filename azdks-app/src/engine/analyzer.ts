import { invoke } from '@tauri-apps/api/core';

export interface FileAnalysis {
  name: string;
  extension: string;
  size: number;
  path: string;
  isDir: boolean;
  createdAt: string | null;
  modifiedAt: string | null;
  // 이미지
  imageWidth: number | null;
  imageHeight: number | null;
  // 카메라
  cameraMake: string | null;
  cameraModel: string | null;
  hasGps: boolean;
  // 문서
  docTitle: string | null;
  docAuthor: string | null;
  docCreator: string | null;
  // 스크린샷
  isScreenCapture: boolean;
  screenCaptureType: string | null;
  // 콘텐츠
  contentType: string | null;
}

export async function analyzeFile(path: string): Promise<FileAnalysis> {
  // Rust가 snake_case로 보내므로 camelCase 변환
  const raw = await invoke<Record<string, unknown>>('analyze_file', { path });
  return {
    name:               String(raw.name ?? ''),
    extension:          String(raw.extension ?? ''),
    size:               Number(raw.size ?? 0),
    path:               String(raw.path ?? path),
    isDir:              Boolean(raw.is_dir ?? false),
    createdAt:          (raw.created_at as string) ?? null,
    modifiedAt:         (raw.modified_at as string) ?? null,
    imageWidth:         (raw.image_width as number) ?? null,
    imageHeight:        (raw.image_height as number) ?? null,
    cameraMake:         (raw.camera_make as string) ?? null,
    cameraModel:        (raw.camera_model as string) ?? null,
    hasGps:             Boolean(raw.has_gps ?? false),
    docTitle:           (raw.doc_title as string) ?? null,
    docAuthor:          (raw.doc_author as string) ?? null,
    docCreator:         (raw.doc_creator as string) ?? null,
    isScreenCapture:    Boolean(raw.is_screen_capture ?? false),
    screenCaptureType:  (raw.screen_capture_type as string) ?? null,
    contentType:        (raw.content_type as string) ?? null,
  };
}

// 여러 파일 병렬 분석
export async function analyzeFiles(paths: string[]): Promise<FileAnalysis[]> {
  return Promise.all(paths.map(analyzeFile));
}
