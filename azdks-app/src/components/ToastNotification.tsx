import { motion, AnimatePresence } from 'framer-motion';

export interface ToastItem {
  id: string;
  fileName: string;
  folder: string;
  confidence: number;
  onConfirm: () => void;
  onChangeFolder: () => void;
  onSkip: () => void;
}

interface ToastNotificationProps {
  toasts: ToastItem[];
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
        width: 420,
        maxWidth: '90vw',
      }}
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            style={{
              background: 'rgba(255,255,255,0.97)',
              borderRadius: 16,
              boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
              padding: '14px 18px',
              border: '1.5px solid rgba(99,179,237,0.3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span style={{ fontSize: 22 }}>📄</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 14,
                    color: '#2d3748',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {toast.fileName}
                </div>
                <div style={{ fontSize: 12, color: '#718096', marginTop: 2 }}>
                  <span style={{ color: '#4299e1' }}>{toast.folder.split('/').pop()}</span> 폴더로 보낼까요?
                  <span style={{ marginLeft: 6, color: '#a0aec0' }}>
                    ({Math.round(toast.confidence * 100)}% 신뢰)
                  </span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
              <button className="toast-btn toast-btn-primary" onClick={toast.onConfirm}>
                이동
              </button>
              <button className="toast-btn toast-btn-secondary" onClick={toast.onChangeFolder}>
                다른 폴더
              </button>
              <button className="toast-btn toast-btn-ghost" onClick={toast.onSkip}>
                건너뛰기
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
