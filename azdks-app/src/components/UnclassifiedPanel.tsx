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
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        style={{
          position: 'fixed',
          bottom: 90,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 420,
          maxWidth: '92vw',
          background: 'rgba(13, 10, 30, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: 18,
          boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(245,158,11,0.25)',
          border: '1px solid rgba(245,158,11,0.35)',
          padding: '14px 16px',
          zIndex: 900,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontSize: 18 }}>🤔</span>
            <span style={{ fontWeight: 700, fontSize: 13.5, color: 'rgba(255,255,255,0.88)' }}>
              미분류 파일 {files.length}개
            </span>
          </div>
          <button
            onClick={onSkipAll}
            style={{
              fontSize: 11.5, color: 'rgba(255,255,255,0.35)',
              background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px',
              fontFamily: 'inherit',
            }}
          >
            모두 건너뛰기
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
          {files.map((file) => (
            <div
              key={file.path}
              style={{
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 12,
                padding: '10px 12px',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: 14 }}>📄</span>
                <span style={{
                  fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.75)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                }}>
                  {file.name}
                </span>
              </div>

              <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="~/AZDKS/폴더명"
                  value={folderInputs[file.path] ?? ''}
                  onChange={(e) => setFolderInputs((prev) => ({ ...prev, [file.path]: e.target.value }))}
                  style={{
                    flex: 1, fontSize: 12, padding: '6px 10px', borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(255,255,255,0.07)',
                    color: 'rgba(255,255,255,0.85)',
                    outline: 'none', fontFamily: 'inherit',
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = 'rgba(124,58,237,0.5)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'}
                />
                <button
                  onClick={() => {
                    const folder = folderInputs[file.path];
                    if (folder?.trim()) onAssign(file, folder.trim(), saveRules[file.path] ?? false);
                  }}
                  style={{
                    fontSize: 12, padding: '6px 12px', borderRadius: 8,
                    background: 'rgba(124,58,237,0.25)', border: '1px solid rgba(124,58,237,0.4)',
                    color: '#c4b5fd', cursor: 'pointer', fontWeight: 600,
                    whiteSpace: 'nowrap', fontFamily: 'inherit',
                  }}
                >
                  이동
                </button>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={saveRules[file.path] ?? false}
                  onChange={(e) => setSaveRules((prev) => ({ ...prev, [file.path]: e.target.checked }))}
                  style={{ accentColor: '#7c3aed' }}
                />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>이 패턴은 항상 여기로</span>
              </label>
            </div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
