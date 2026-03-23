import { useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { analyzeFile } from '../engine/analyzer';
import { classifyWithAnalysis } from '../engine/smartClassifier';
import { getCachedRulesStore } from '../store/rulesStore';
import { addHistoryEntry } from '../store/historyStore';
import type { ClassificationResult } from '../engine/classifier';

export interface ProcessedFile {
  path: string;
  name: string;
  result: ClassificationResult;
  analysis?: import('../engine/analyzer').FileAnalysis;
  duplicateExists?: boolean;
}

export function useClassifier() {
  const classifyFiles = useCallback(async (paths: string[]): Promise<ProcessedFile[]> => {
    const store = getCachedRulesStore();

    // 병렬로 분석
    const results = await Promise.all(
      paths.map(async (path) => {
        const name = path.split(/[\\/]/).pop() || path;
        let processed: ProcessedFile;
        try {
          const analysis = await analyzeFile(path);
          const result = classifyWithAnalysis(analysis, store);
          processed = { path, name, result, analysis };
        } catch {
          // analyze_file 실패 시 기본 분류로 fallback
          const { classifyFile } = await import('../engine/classifier');
          const result = classifyFile(path, store, 'smart');
          processed = { path, name, result };
        }

        // 중복 파일 감지: 목적 폴더에 같은 이름의 파일이 있는지 확인
        try {
          // expand_path로 ~ 먼저 풀어줘야 exists 체크가 정확함
          const expandedFolder = await invoke<string>('expand_path', { path: processed.result.folder });
          const destPath = `${expandedFolder}/${name}`;
          const duplicateExists = await invoke<boolean>('check_file_exists', { path: destPath });
          processed = { ...processed, duplicateExists };
        } catch {
          processed = { ...processed, duplicateExists: false };
        }

        return processed;
      })
    );

    return results;
  }, []);

  const moveFile = useCallback(async (src: string, dest: string): Promise<void> => {
    await invoke('move_file', { src, dest });
  }, []);

  const executeMove = useCallback(async (file: ProcessedFile): Promise<void> => {
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
  }, []);

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
