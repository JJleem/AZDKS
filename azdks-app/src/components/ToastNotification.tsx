import { motion, AnimatePresence } from 'framer-motion';

export interface ToastAlternative {
  folder: string;
  confidence: number;
  reason: string;
}

export interface ToastItem {
  id: string;
  fileName: string;
  folder: string;         // 1순위 추천 폴더
  confidence: number;
  reason: string;
  alternatives?: ToastAlternative[];   // 2~3순위 대안
  onConfirm: () => void;               // 1순위로 이동
  onPickAlternative: (folder: string) => void;  // 대안 선택
  onChangeFolder: () => void;          // 직접 지정
  onSkip: () => void;
}

interface ToastNotificationProps {
  toasts: ToastItem[];
}

// 파일 확장자별 이모지
function fileEmoji(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (['jpg','jpeg','png','gif','webp','heic','svg','bmp'].includes(ext)) return '🖼️';
  if (['pdf','docx','doc','hwp','txt','md'].includes(ext)) return '📄';
  if (['pptx','ppt'].includes(ext)) return '📊';
  if (['xlsx','xls'].includes(ext)) return '📈';
  if (['mp4','mov','avi','mkv'].includes(ext)) return '🎬';
  if (['mp3','flac','wav','m4a','aac'].includes(ext)) return '🎵';
  if (['zip','rar','7z','tar','gz'].includes(ext)) return '📦';
  if (['js','ts','jsx','tsx','py','go','rs','swift'].includes(ext)) return '💻';
  return '📄';
}

// 폴더 경로에서 표시용 이름 추출 (마지막 2단계)
function folderLabel(folder: string): string {
  const parts = folder.replace(/\\/g, '/').split('/').filter(Boolean);
  if (parts.length >= 2) return parts.slice(-2).join(' / ');
  return parts[parts.length - 1] ?? folder;
}

// 신뢰도 → 색상
function confidenceColor(c: number): string {
  if (c >= 0.88) return '#38a169'; // green
  if (c >= 0.7)  return '#d69e2e'; // yellow
  return '#e53e3e';                 // red
}

export function ToastNotification({ toasts }: ToastNotificationProps) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        zIndex: 1000,
        width: 440,
        maxWidth: '92vw',
      }}
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const hasAlts = toast.alternatives && toast.alternatives.length > 0;
          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 40, scale: 0.93 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.95, transition: { duration: 0.18 } }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              style={{
                background: 'rgba(255,255,255,0.97)',
                borderRadius: 18,
                boxShadow: '0 8px 40px rgba(0,0,0,0.14)',
                padding: '14px 16px 12px',
                border: '1.5px solid rgba(99,179,237,0.25)',
                backdropFilter: 'blur(12px)',
              }}
            >
              {/* 파일명 + 이모지 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>{fileEmoji(toast.fileName)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 13.5,
                      color: '#1a202c',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {toast.fileName}
                  </div>
                  <div style={{ fontSize: 11.5, color: '#718096', marginTop: 1 }}>
                    {hasAlts ? '어디에 넣을까요?' : `${folderLabel(toast.folder)} 폴더로 보낼까요?`}
                  </div>
                </div>
              </div>

              {/* 선택지 버튼들 */}
              {hasAlts ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                  {/* 1순위 */}
                  <ChoiceButton
                    rank={1}
                    folder={toast.folder}
                    confidence={toast.confidence}
                    reason={toast.reason}
                    onClick={toast.onConfirm}
                  />
                  {/* 대안들 */}
                  {toast.alternatives!.map((alt, i) => (
                    <ChoiceButton
                      key={alt.folder}
                      rank={i + 2}
                      folder={alt.folder}
                      confidence={alt.confidence}
                      reason={alt.reason}
                      onClick={() => toast.onPickAlternative(alt.folder)}
                    />
                  ))}
                </div>
              ) : (
                /* 대안 없음 → 단순 confirm 버튼 */
                <div style={{ marginBottom: 10 }}>
                  <button
                    onClick={toast.onConfirm}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 10,
                      border: '1.5px solid #bee3f8',
                      background: '#ebf8ff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#bee3f8')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#ebf8ff')}
                  >
                    <span style={{ fontSize: 15 }}>📁</span>
                    <span style={{ flex: 1, textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#2b6cb0' }}>
                      {folderLabel(toast.folder)}
                    </span>
                    <span style={{ fontSize: 11.5, color: confidenceColor(toast.confidence), fontWeight: 700 }}>
                      {Math.round(toast.confidence * 100)}%
                    </span>
                  </button>
                </div>
              )}

              {/* 하단 액션 */}
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                <button className="toast-btn toast-btn-secondary" onClick={toast.onChangeFolder}>
                  📂 직접 지정
                </button>
                <button className="toast-btn toast-btn-ghost" onClick={toast.onSkip}>
                  건너뛰기
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

// 선택지 하나 버튼 컴포넌트
function ChoiceButton({
  rank,
  folder,
  confidence,
  reason,
  onClick,
}: {
  rank: number;
  folder: string;
  confidence: number;
  reason: string;
  onClick: () => void;
}) {
  const rankEmoji = ['🥇', '🥈', '🥉'][rank - 1] ?? '•';
  const isTop = rank === 1;

  return (
    <motion.button
      whileHover={{ scale: 1.015 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{
        width: '100%',
        padding: '9px 12px',
        borderRadius: 11,
        border: isTop ? '1.5px solid #bee3f8' : '1.5px solid #e2e8f0',
        background: isTop ? '#ebf8ff' : '#f7fafc',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        textAlign: 'left',
        transition: 'background 0.15s, border 0.15s',
      }}
    >
      <span style={{ fontSize: 16, flexShrink: 0 }}>{rankEmoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: isTop ? '#2b6cb0' : '#4a5568',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {folderLabel(folder)}
        </div>
        <div
          style={{
            fontSize: 11,
            color: '#a0aec0',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginTop: 1,
          }}
        >
          {reason}
        </div>
      </div>
      <span
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: confidenceColor(confidence),
          flexShrink: 0,
          background: 'rgba(0,0,0,0.04)',
          padding: '2px 7px',
          borderRadius: 6,
        }}
      >
        {Math.round(confidence * 100)}%
      </span>
    </motion.button>
  );
}
