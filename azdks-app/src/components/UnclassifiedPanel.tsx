import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import type { ProcessedFile } from '../hooks/useClassifier';

interface UnclassifiedPanelProps {
  files: ProcessedFile[];
  onAssign: (file: ProcessedFile, folder: string, saveRule: boolean) => void;
  onSkipAll: () => void;
}

export function UnclassifiedPanel({ files, onAssign, onSkipAll }: UnclassifiedPanelProps) {
  const [folderInputs, setFolderInputs] = useState<Record<string, string>>({});
  const [saveRules, setSaveRules] = useState<Record<string, boolean>>({});

  if (files.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        style={{
          background: 'rgba(255,255,255,0.95)',
          borderRadius: 20,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          padding: 20,
          margin: '0 16px',
          border: '1.5px solid rgba(246,173,85,0.4)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>🤔</span>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#2d3748' }}>
              미분류 파일 ({files.length}개)
            </span>
          </div>
          <button
            onClick={onSkipAll}
            style={{
              fontSize: 12,
              color: '#a0aec0',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '2px 8px',
            }}
          >
            모두 건너뛰기
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 220, overflowY: 'auto' }}>
          {files.map((file) => (
            <div
              key={file.path}
              style={{
                background: 'rgba(247,250,252,0.9)',
                borderRadius: 12,
                padding: '10px 12px',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: 16 }}>📁</span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#2d3748',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1,
                  }}
                >
                  {file.name}
                </span>
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="~/폴더/경로 입력..."
                  value={folderInputs[file.path] ?? ''}
                  onChange={(e) =>
                    setFolderInputs((prev) => ({ ...prev, [file.path]: e.target.value }))
                  }
                  style={{
                    flex: 1,
                    fontSize: 12,
                    padding: '6px 10px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e0',
                    outline: 'none',
                    background: '#fff',
                    color: '#2d3748',
                  }}
                />
                <button
                  onClick={() => {
                    const folder = folderInputs[file.path];
                    if (folder?.trim()) {
                      onAssign(file, folder.trim(), saveRules[file.path] ?? false);
                    }
                  }}
                  style={{
                    fontSize: 12,
                    padding: '6px 12px',
                    borderRadius: 8,
                    background: '#4299e1',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}
                >
                  이동
                </button>
              </div>

              <label
                style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, cursor: 'pointer' }}
              >
                <input
                  type="checkbox"
                  checked={saveRules[file.path] ?? false}
                  onChange={(e) =>
                    setSaveRules((prev) => ({ ...prev, [file.path]: e.target.checked }))
                  }
                  style={{ accentColor: '#4299e1' }}
                />
                <span style={{ fontSize: 11, color: '#718096' }}>이 패턴은 항상 여기로</span>
              </label>
            </div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
