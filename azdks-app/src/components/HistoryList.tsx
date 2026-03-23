import { motion, AnimatePresence } from 'framer-motion';
import type { HistoryEntry } from '../store/historyStore';

interface HistoryListProps {
  entries: HistoryEntry[];
  onClose: () => void;
  onOpenFolder: (path: string) => void;
}

function fileEmoji(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (['jpg','jpeg','png','gif','webp','heic','svg'].includes(ext)) return '🖼️';
  if (['pdf','docx','doc','hwp','txt','md'].includes(ext)) return '📄';
  if (['pptx','ppt'].includes(ext)) return '📊';
  if (['xlsx','xls'].includes(ext)) return '📈';
  if (['mp4','mov','avi','mkv'].includes(ext)) return '🎬';
  if (['mp3','flac','wav','m4a'].includes(ext)) return '🎵';
  if (['zip','rar','7z','tar','gz'].includes(ext)) return '📦';
  if (['js','ts','jsx','tsx','py','go','rs'].includes(ext)) return '💻';
  return '📄';
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

function confidenceColor(c: number): string {
  if (c >= 0.9) return '#34d399';
  if (c >= 0.6) return '#fbbf24';
  return '#f87171';
}

function folderShort(path: string): string {
  const parts = path.split('/').filter(Boolean);
  if (parts.length >= 2) return parts.slice(-2).join(' / ');
  return parts[parts.length - 1] ?? path;
}

export function HistoryList({ entries, onClose, onOpenFolder }: HistoryListProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ type: 'spring', stiffness: 360, damping: 32 }}
      style={{
        position: 'fixed',
        top: 0, right: 0, bottom: 0,
        width: 300,
        background: 'rgba(8, 6, 20, 0.96)',
        backdropFilter: 'blur(24px)',
        boxShadow: '-4px 0 40px rgba(0,0,0,0.5), inset 1px 0 0 rgba(255,255,255,0.06)',
        zIndex: 500,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 헤더 */}
      <div style={{
        padding: '18px 18px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>📋</span>
          <span style={{ fontWeight: 700, fontSize: 15, color: 'rgba(255,255,255,0.9)' }}>
            정리 내역
          </span>
          {entries.length > 0 && (
            <span style={{
              fontSize: 10, fontWeight: 700,
              background: 'rgba(124,58,237,0.3)',
              color: '#c4b5fd',
              padding: '2px 7px', borderRadius: 10,
              border: '1px solid rgba(124,58,237,0.3)',
            }}>
              {entries.length}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8,
            width: 28, height: 28,
            fontSize: 14,
            cursor: 'pointer',
            color: 'rgba(255,255,255,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
            e.currentTarget.style.color = 'rgba(255,255,255,0.8)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
            e.currentTarget.style.color = 'rgba(255,255,255,0.45)';
          }}
        >
          ✕
        </button>
      </div>

      {/* 목록 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
        {entries.length === 0 ? (
          <div style={{
            textAlign: 'center',
            color: 'rgba(255,255,255,0.2)',
            marginTop: 60,
            fontSize: 13,
          }}>
            <div style={{ fontSize: 38, marginBottom: 12 }}>🌌</div>
            아직 정리한 파일이 없어요
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <AnimatePresence>
              {entries.map((entry, i) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.025 }}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: 12,
                    padding: '10px 12px',
                    border: '1px solid rgba(255,255,255,0.06)',
                    transition: 'background 0.15s',
                  }}
                  whileHover={{ background: 'rgba(124,58,237,0.08)' } as any}
                >
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 17, flexShrink: 0, marginTop: 1 }}>
                      {fileEmoji(entry.fileName)}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* 파일명 */}
                      <div style={{
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: 'rgba(255,255,255,0.82)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {entry.fileName}
                      </div>

                      {/* 폴더 경로 — 클릭 시 열기 */}
                      <button
                        onClick={() => onOpenFolder(entry.destPath)}
                        title={`${entry.destPath}\n클릭하면 폴더 열기`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          marginTop: 3,
                          background: 'none',
                          border: 'none',
                          padding: '2px 5px 2px 0',
                          cursor: 'pointer',
                          borderRadius: 5,
                          maxWidth: '100%',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(167,139,250,0.12)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                      >
                        <span style={{ fontSize: 10, opacity: 0.5 }}>📁</span>
                        <span style={{
                          fontSize: 11,
                          color: '#a78bfa',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {folderShort(entry.destPath)}
                        </span>
                      </button>

                      {/* 시간 */}
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', marginTop: 2 }}>
                        {formatDate(entry.movedAt)}
                      </div>
                    </div>

                    {/* 신뢰도 뱃지 */}
                    <div style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: confidenceColor(entry.confidence),
                      background: 'rgba(255,255,255,0.05)',
                      padding: '2px 6px',
                      borderRadius: 6,
                      flexShrink: 0,
                      marginTop: 2,
                    }}>
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
