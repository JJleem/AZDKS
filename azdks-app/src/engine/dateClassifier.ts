import { invoke } from '@tauri-apps/api/core';

export interface DateInfo {
  year: string;
  month: string;
  day: string;
  source: 'metadata' | 'filename' | 'unknown';
}

// 파일 메타데이터에서 날짜 읽기
export async function getFileDateInfo(filePath: string): Promise<DateInfo> {
  try {
    const meta = await invoke<{ created_at: string | null; modified_at: string | null }>('read_file_metadata', { path: filePath });
    const dateStr = meta.created_at ?? meta.modified_at;
    if (dateStr) {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return {
          year: d.getFullYear().toString(),
          month: String(d.getMonth() + 1).padStart(2, '0'),
          day: String(d.getDate()).padStart(2, '0'),
          source: 'metadata',
        };
      }
    }
  } catch {
    // fallthrough to filename parsing
  }

  // fallback: 파일명에서 날짜 추출
  return parseDateFromFilename(filePath);
}

function parseDateFromFilename(filePath: string): DateInfo {
  const name = filePath.split(/[\\/]/).pop() ?? filePath;

  // YYYYMMDD
  const m1 = name.match(/(\d{4})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])/);
  if (m1) return { year: m1[1], month: m1[2], day: m1[3], source: 'filename' };

  // YYYY-MM-DD or YYYY_MM_DD
  const m2 = name.match(/(\d{4})[_\-](0[1-9]|1[0-2])[_\-](0[1-9]|[12]\d|3[01])/);
  if (m2) return { year: m2[1], month: m2[2], day: m2[3], source: 'filename' };

  // YYYY-MM
  const m3 = name.match(/(\d{4})[_\-](0[1-9]|1[0-2])/);
  if (m3) return { year: m3[1], month: m3[2], day: '01', source: 'filename' };

  // 오늘 날짜로 fallback
  const today = new Date();
  return {
    year: today.getFullYear().toString(),
    month: String(today.getMonth() + 1).padStart(2, '0'),
    day: String(today.getDate()).padStart(2, '0'),
    source: 'unknown',
  };
}

// 날짜 기반 폴더 경로 생성
export function buildDateFolder(base: string, dateInfo: DateInfo, granularity: 'year' | 'month' | 'day' = 'month'): string {
  const { year, month, day } = dateInfo;
  if (granularity === 'year') return `${base}/${year}`;
  if (granularity === 'month') return `${base}/${year}/${month}`;
  return `${base}/${year}/${month}/${day}`;
}
