import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { invoke } from '@tauri-apps/api/core';
import { updateDefaultFolders } from '../store/rulesStore';

interface OnboardingProps {
  onComplete: () => void;
}

const DEFAULT_FOLDERS = {
  '이미지': '~/Pictures/AZDKS/이미지',
  '문서': '~/Documents/AZDKS/문서',
  '코드': '~/Documents/AZDKS/코드',
  '영상': '~/Movies/AZDKS/영상',
  '음악': '~/Music/AZDKS/음악',
  '압축': '~/Downloads/AZDKS/압축',
  '미분류': '~/Downloads/AZDKS/미분류',
};

const STEPS = [
  { id: 'welcome', title: '안녕하세요! 👋', subtitle: '저는 꼬미예요!', desc: '파일을 저한테 드래그해서 던져주시면\n알아서 쏙쏙 정리해드릴게요 🦎' },
  { id: 'folders', title: '기본 폴더 설정', subtitle: '어디에 정리할까요?', desc: '각 파일 종류별 기본 저장 경로를 설정해요.\n나중에 설정에서 언제든 바꿀 수 있어요.' },
  { id: 'done', title: '준비 완료! 🎉', subtitle: '이제 시작해볼까요?', desc: '파일을 꼬미에게 드래그하면\n바로 정리가 시작돼요!' },
];

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [folders, setFolders] = useState({ ...DEFAULT_FOLDERS });
  const [saving, setSaving] = useState(false);

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  const handleNext = async () => {
    if (isLast) {
      setSaving(true);
      await updateDefaultFolders(folders);
      setSaving(false);
      onComplete();
    } else {
      setStep((s) => s + 1);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        background: 'linear-gradient(135deg, #fef9f0 0%, #fde8d5 40%, #f0e6ff 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
      }}
    >
      {/* Step dots */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
        {STEPS.map((_, i) => (
          <motion.div
            key={i}
            animate={{ width: i === step ? 24 : 8, background: i === step ? '#4299e1' : '#cbd5e0' }}
            style={{ height: 8, borderRadius: 4 }}
            transition={{ duration: 0.2 }}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.25 }}
          style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}
        >
          {/* Character */}
          <motion.img
            src="/character/idle.png"
            alt="꼬미"
            style={{ width: 130, height: 130, objectFit: 'contain' }}
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Title */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#2d3748' }}>{current.title}</div>
            <div style={{ fontSize: 14, color: '#718096', marginTop: 4 }}>{current.subtitle}</div>
          </div>

          {/* Description */}
          <div
            style={{
              fontSize: 14,
              color: '#4a5568',
              textAlign: 'center',
              lineHeight: 1.7,
              whiteSpace: 'pre-line',
              background: 'rgba(255,255,255,0.7)',
              padding: '12px 20px',
              borderRadius: 14,
              width: '100%',
            }}
          >
            {current.desc}
          </div>

          {/* Folder settings step */}
          {current.id === 'folders' && (
            <div
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.85)',
                borderRadius: 16,
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                maxHeight: 220,
                overflowY: 'auto',
              }}
            >
              {Object.entries(folders).map(([key, val]) => (
                <div key={key}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#718096', display: 'block', marginBottom: 3 }}>{key}</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      value={val}
                      onChange={(e) => setFolders((prev) => ({ ...prev, [key]: e.target.value }))}
                      style={{
                        flex: 1, fontSize: 11, padding: '5px 8px', borderRadius: 8,
                        border: '1px solid #e2e8f0', color: '#2d3748', outline: 'none', background: '#fff',
                      }}
                    />
                    <button
                      onClick={() => invoke('open_folder', { path: val })}
                      style={{
                        padding: '5px 8px', borderRadius: 8, border: '1px solid #e2e8f0',
                        background: '#f7fafc', cursor: 'pointer', fontSize: 12,
                      }}
                    >
                      📂
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div style={{ display: 'flex', gap: 12, marginTop: 32, width: '100%' }}>
        {step > 0 && (
          <button
            onClick={() => setStep((s) => s - 1)}
            style={{
              flex: 1, padding: '12px', borderRadius: 12, background: 'rgba(255,255,255,0.7)',
              border: '1px solid #e2e8f0', color: '#718096', fontWeight: 600, fontSize: 14, cursor: 'pointer',
            }}
          >
            이전
          </button>
        )}
        <button
          onClick={handleNext}
          disabled={saving}
          style={{
            flex: 2, padding: '12px', borderRadius: 12, background: '#4299e1',
            border: 'none', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? '저장 중...' : isLast ? '시작하기! 🎉' : '다음'}
        </button>
      </div>
    </motion.div>
  );
}
