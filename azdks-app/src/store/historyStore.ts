import { invoke } from '@tauri-apps/api/core';
import { v4 as uuidv4 } from 'uuid';

export interface HistoryEntry {
  id: string;
  fileName: string;
  srcPath: string;
  destPath: string;
  category: string;
  confidence: number;
  movedAt: string;
}

let _cache: HistoryEntry[] | null = null;

export async function loadHistory(): Promise<HistoryEntry[]> {
  try {
    const data = await invoke<HistoryEntry[]>('load_history');
    _cache = data ?? [];
    return _cache;
  } catch {
    _cache = [];
    return _cache;
  }
}

export async function addHistoryEntry(entry: Omit<HistoryEntry, 'id' | 'movedAt'>): Promise<void> {
  if (!_cache) await loadHistory();
  const newEntry: HistoryEntry = {
    ...entry,
    id: uuidv4(),
    movedAt: new Date().toISOString(),
  };
  _cache = [newEntry, ...(_cache ?? [])].slice(0, 200); // Keep last 200
  await invoke('save_history', { history: _cache });
}

export function getCachedHistory(): HistoryEntry[] {
  return _cache ?? [];
}

export async function clearHistory(): Promise<void> {
  _cache = [];
  await invoke('save_history', { history: [] });
}

export async function removeHistoryEntry(fileName: string, destPath: string): Promise<void> {
  if (!_cache) await loadHistory();
  _cache = (_cache ?? []).filter(
    (e) => !(e.fileName === fileName && e.destPath === destPath)
  );
  await invoke('save_history', { history: _cache });
}
