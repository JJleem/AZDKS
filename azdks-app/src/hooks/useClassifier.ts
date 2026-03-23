import { useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { classifyFile, ClassificationResult } from '../engine/classifier';
import { getCachedRulesStore } from '../store/rulesStore';
import { addHistoryEntry } from '../store/historyStore';

export interface ProcessedFile {
  path: string;
  name: string;
  result: ClassificationResult;
}

export function useClassifier() {
  const classifyFiles = useCallback(async (paths: string[]): Promise<ProcessedFile[]> => {
    const store = getCachedRulesStore();
    const results: ProcessedFile[] = [];

    for (const path of paths) {
      const name = path.split(/[\\/]/).pop() || path;
      const result = classifyFile(path, store);
      results.push({ path, name, result });
    }

    return results;
  }, []);

  const moveFile = useCallback(async (src: string, dest: string): Promise<void> => {
    await invoke('move_file', { src, dest });
  }, []);

  const executeMove = useCallback(
    async (file: ProcessedFile): Promise<void> => {
      const { path, name, result } = file;
      const destPath = `${result.folder}/${name}`;

      await invoke('move_file', { src: path, dest: destPath });
      await addHistoryEntry({
        fileName: name,
        srcPath: path,
        destPath,
        category: result.folder,
        confidence: result.confidence,
      });
    },
    [],
  );

  const expandPath = useCallback(async (path: string): Promise<string> => {
    try {
      return await invoke<string>('expand_path', { path });
    } catch {
      return path;
    }
  }, []);

  const getDirFiles = useCallback(async (path: string): Promise<string[]> => {
    try {
      return await invoke<string[]>('read_dir_files', { path });
    } catch {
      return [path];
    }
  }, []);

  return { classifyFiles, moveFile, executeMove, expandPath, getDirFiles };
}
