import { motion, AnimatePresence } from 'framer-motion';
import type { HistoryEntry } from '../store/historyStore';

interface HistoryListProps {
  entries: HistoryEntry[];
  onClose: () => void;
}

const CATEGORY_EMOJI: Record<string, string> = {
  이미지: '🖼️', 문서: '📄', 코드: '💻', 영상: '🎬',
  음악: '🎵', 압축: '📦', 폰트: '🔤', 미분류: '🤔',
};

function getCategoryEmoji(folder: string): string {
  for (const [key, emoji] of Object.entries(CATEGORY_EMOJI)) {
    if (folder.includes(key)) return emoji;
  }
  return '📁';
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return '방금 전';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
  return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

export function HistoryList({ entries, onClose }: HistoryListProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: 320,
        background: 'rgba(255,255,255,0.98)',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
        zIndex: 500,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          padding: '20px 20px 12px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>📋</span>
          <span style={{ fontWeight: 700, fontSize: 16, color: '#2d3748' }}>정리 내역</span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: 20,
            cursor: 'pointer',
            color: '#a0aec0',
            lineHeight: 1,
            padding: 4,
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        {entries.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#a0aec0', marginTop: 60, fontSize: 14 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🦎</div>
            아직 정리한 파일이 없어요
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <AnimatePresence>
              {entries.map((entry, i) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  style={{
                    background: '#f7fafc',
                    borderRadius: 12,
                    padding: '10px 12px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>
                      {getCategoryEmoji(entry.category)}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: '#2d3748',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {entry.fileName}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: '#718096',
                          marginTop: 2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        → {entry.destPath.split('/').slice(-2).join('/')}
                      </div>
                      <div style={{ fontSize: 10, color: '#a0aec0', marginTop: 2 }}>
                        {formatDate(entry.movedAt)}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color:
                          entry.confidence >= 0.9
                            ? '#48bb78'
                            : entry.confidence >= 0.6
                            ? '#ecc94b'
                            : '#fc8181',
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {Math.round(entry.confidence * 100)}%
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}
