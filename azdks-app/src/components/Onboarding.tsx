import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { invoke } from '@tauri-apps/api/core';
import { updateDefaultFolders } from '../store/rulesStore';
import { Gecko } from './Gecko';

interface OnboardingProps {
  onComplete: () => void;
}

// 모든 파일이 ~/AZDKS/ 하나에 모임
const DEFAULT_FOLDERS = {
  '홈':    '~/AZDKS',
  '이미지': '~/AZDKS/이미지',
  '문서':   '~/AZDKS/문서',
  '코드':   '~/AZDKS/코드',
  '영상':   '~/AZDKS/영상',
  '음악':   '~/AZDKS/음악',
  '압축':   '~/AZDKS/압축',
  '미분류': '~/AZDKS/미분류',
};

const STEPS = [
  {
    id: 'welcome',
    title: '안녕하세요! 👋',
    subtitle: '저는 슬라임이에요',
    desc: '파일을 저한테 드래그해서 던져주시면\n알아서 쏙쏙 정리해드릴게요 ✨',
  },
  {
    id: 'folders',
    title: '저장 위치 설정',
    subtitle: '모든 파일은 여기에 모여요',
    desc: '기본값은 ~/AZDKS/ 하나의 폴더에 전부 정리돼요.\n필요하면 경로를 바꿀 수 있어요.',
  },
  {
    id: 'done',
    title: '준비 완료! 🎉',
    subtitle: '이제 시작해볼까요?',
    desc: '파일을 드래그해서 여기에 드롭하면\n바로 정리가 시작돼요!',
  },
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
        background: 'radial-gradient(ellipse 80% 60% at 20% 40%, rgba(76,29,149,0.4) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 20%, rgba(14,30,80,0.5) 0%, transparent 55%), #06060f',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 28,
      }}
    >
      {/* Step dots */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
        {STEPS.map((_, i) => (
          <motion.div
            key={i}
            animate={{
              width: i === step ? 24 : 8,
              background: i === step ? '#a78bfa' : 'rgba(255,255,255,0.15)',
            }}
            style={{ height: 7, borderRadius: 4 }}
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
          transition={{ duration: 0.22 }}
          style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}
        >
          {/* 슬라임 캐릭터 */}
          <div style={{ transform: 'scale(0.75)', marginBottom: -16 }}>
            <Gecko state={step === 2 ? 'happy' : 'idle'} />
          </div>

          {/* 타이틀 */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: 21,
              fontWeight: 800,
              background: 'linear-gradient(90deg, #c4b5fd, #e0e7ff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              {current.title}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', marginTop: 4 }}>
              {current.subtitle}
            </div>
          </div>

          {/* 설명 */}
          <div style={{
            fontSize: 13.5,
            color: 'rgba(255,255,255,0.6)',
            textAlign: 'center',
            lineHeight: 1.75,
            whiteSpace: 'pre-line',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
            padding: '12px 20px',
            borderRadius: 14,
            width: '100%',
          }}>
            {current.desc}
          </div>

          {/* 폴더 설정 스텝 */}
          {current.id === 'folders' && (
            <div style={{
              width: '100%',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 14,
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              maxHeight: 200,
              overflowY: 'auto',
            }}>
              {Object.entries(folders).map(([key, val]) => (
                <div key={key}>
                  <label style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(167,139,250,0.8)', display: 'block', marginBottom: 3, letterSpacing: '0.05em' }}>
                    {key}
                  </label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      value={val}
                      onChange={(e) => setFolders((prev) => ({ ...prev, [key]: e.target.value }))}
                      style={{
                        flex: 1, fontSize: 11, padding: '5px 9px', borderRadius: 8,
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(255,255,255,0.06)',
                        color: 'rgba(255,255,255,0.8)',
                        outline: 'none',
                        fontFamily: 'inherit',
                      }}
                    />
                    <button
                      onClick={() => invoke('open_folder', { path: val })}
                      style={{
                        padding: '5px 9px', borderRadius: 8,
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(255,255,255,0.06)',
                        cursor: 'pointer', fontSize: 12,
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

      {/* 버튼 */}
      <div style={{ display: 'flex', gap: 10, marginTop: 28, width: '100%' }}>
        {step > 0 && (
          <button
            onClick={() => setStep((s) => s - 1)}
            style={{
              flex: 1, padding: '12px', borderRadius: 12,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.55)',
              fontWeight: 600, fontSize: 14, cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            이전
          </button>
        )}
        <button
          onClick={handleNext}
          disabled={saving}
          style={{
            flex: 2, padding: '12px', borderRadius: 12,
            background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
            border: 'none',
            color: '#fff',
            fontWeight: 700, fontSize: 14, cursor: 'pointer',
            opacity: saving ? 0.7 : 1,
            boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
            fontFamily: 'inherit',
          }}
        >
          {saving ? '저장 중...' : isLast ? '시작하기! 🎉' : '다음'}
        </button>
      </div>
    </motion.div>
  );
}
