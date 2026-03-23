import { motion } from 'framer-motion';
import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { RulesStore, Rule } from '../store/rulesStore';
import { deleteRule, updateDefaultFolders } from '../store/rulesStore';

interface SettingsProps {
  store: RulesStore;
  onClose: () => void;
  onStoreUpdate: () => void;
  autoMove: boolean;
  onAutoMoveChange: (v: boolean) => void;
}

const panelStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0, left: 0, bottom: 0,
  width: 320,
  background: 'rgba(8, 6, 20, 0.96)',
  backdropFilter: 'blur(24px)',
  boxShadow: '4px 0 40px rgba(0,0,0,0.5), inset -1px 0 0 rgba(255,255,255,0.06)',
  zIndex: 500,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

export function Settings({ store, onClose, onStoreUpdate, autoMove, onAutoMoveChange }: SettingsProps) {
  const [folders, setFolders] = useState({ ...store.defaultFolders });
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'folders' | 'rules'>('folders');

  const handleSaveFolders = async () => {
    setSaving(true);
    await updateDefaultFolders(folders);
    onStoreUpdate();
    setSaving(false);
  };

  const handleDeleteRule = async (id: string) => {
    await deleteRule(id);
    onStoreUpdate();
  };

  const handleOpenFolder = async (path: string) => {
    await invoke('open_folder', { path });
  };

  const inputStyle: React.CSSProperties = {
    flex: 1,
    fontSize: 11,
    padding: '6px 9px',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.05)',
    color: 'rgba(255,255,255,0.8)',
    outline: 'none',
    fontFamily: 'inherit',
  };

  const iconBtnStyle: React.CSSProperties = {
    padding: '6px 9px',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.05)',
    cursor: 'pointer',
    fontSize: 13,
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ type: 'spring', stiffness: 360, damping: 32 }}
      style={panelStyle}
    >
      {/* 헤더 */}
      <div style={{
        padding: '18px 18px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>⚙️</span>
          <span style={{ fontWeight: 700, fontSize: 15, color: 'rgba(255,255,255,0.9)' }}>설정</span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8, width: 28, height: 28, fontSize: 13,
            cursor: 'pointer', color: 'rgba(255,255,255,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
        >✕</button>
      </div>

      {/* AZDKS 루트 폴더 바로 열기 */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button
          onClick={() => handleOpenFolder(store.defaultFolders['홈'] ?? '~/AZDKS')}
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 11,
            background: 'rgba(124,58,237,0.18)',
            border: '1px solid rgba(124,58,237,0.35)',
            color: '#c4b5fd', fontWeight: 700, fontSize: 13,
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 8,
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(124,58,237,0.3)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(124,58,237,0.18)')}
        >
          <span style={{ fontSize: 17 }}>🗂️</span>
          <div style={{ textAlign: 'left' }}>
            <div>AZDKS 폴더 열기</div>
            <div style={{ fontSize: 10, color: 'rgba(196,181,253,0.5)', fontWeight: 400, marginTop: 1 }}>
              {store.defaultFolders['홈'] ?? '~/AZDKS'}
            </div>
          </div>
        </button>
      </div>

      {/* 자동 이동 토글 */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>자동 이동</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>신뢰도 90% 이상 파일 자동 이동</div>
        </div>
        <div
          onClick={() => onAutoMoveChange(!autoMove)}
          style={{
            width: 42, height: 23, borderRadius: 12,
            background: autoMove ? '#7c3aed' : 'rgba(255,255,255,0.12)',
            cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
            boxShadow: autoMove ? '0 0 12px rgba(124,58,237,0.4)' : 'none',
          }}
        >
          <motion.div
            animate={{ x: autoMove ? 21 : 2 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            style={{
              position: 'absolute', top: 2,
              width: 19, height: 19, borderRadius: '50%',
              background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
            }}
          />
        </div>
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {(['folders', 'rules'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '10px 0', fontSize: 12.5,
            fontWeight: tab === t ? 700 : 400,
            color: tab === t ? '#a78bfa' : 'rgba(255,255,255,0.3)',
            background: 'none', border: 'none',
            borderBottom: tab === t ? '2px solid #7c3aed' : '2px solid transparent',
            cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit',
          }}>
            {t === 'folders' ? '📂 기본 폴더' : '📋 분류 규칙'}
          </button>
        ))}
      </div>

      {/* 컨텐츠 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
        {tab === 'folders' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Object.entries(folders).map(([key, val]) => (
              <div key={key}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(167,139,250,0.7)', marginBottom: 4, display: 'block', letterSpacing: '0.04em' }}>
                  {key}
                </label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    value={val}
                    onChange={(e) => setFolders((prev) => ({ ...prev, [key]: e.target.value }))}
                    style={inputStyle}
                  />
                  <button onClick={() => handleOpenFolder(val)} title="폴더 열기" style={iconBtnStyle}>📂</button>
                </div>
              </div>
            ))}
            <button
              onClick={handleSaveFolders}
              disabled={saving}
              style={{
                marginTop: 6, padding: '10px', borderRadius: 10,
                background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                color: '#fff', border: 'none',
                fontWeight: 700, fontSize: 13.5, cursor: 'pointer',
                opacity: saving ? 0.7 : 1, fontFamily: 'inherit',
                boxShadow: '0 4px 16px rgba(124,58,237,0.35)',
              }}
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        )}

        {tab === 'rules' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {store.rules.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', marginTop: 40, fontSize: 13 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                저장된 규칙이 없어요
              </div>
            ) : (
              store.rules.map((rule: Rule) => (
                <div key={rule.id} style={{
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: 10, padding: '10px 12px',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>
                        {rule.pattern || rule.extensions?.join(', ') || '규칙'}
                      </div>
                      <div style={{ fontSize: 11, color: '#a78bfa', marginTop: 2 }}>
                        → {rule.folder.split('/').slice(-2).join('/')}
                      </div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 2 }}>
                        사용 {rule.usageCount}회
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 14, padding: '0 4px' }}
                    >🗑️</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* 하단: 미분류 열기 */}
      <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <button
          onClick={() => handleOpenFolder(store.defaultFolders['미분류'] ?? '~/AZDKS/미분류')}
          style={{
            width: '100%', padding: '9px',
            borderRadius: 10,
            background: 'rgba(248,113,113,0.1)',
            color: '#fca5a5',
            border: '1px solid rgba(248,113,113,0.2)',
            fontWeight: 600, fontSize: 12.5,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(248,113,113,0.18)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(248,113,113,0.1)')}
        >
          🤔 미분류 폴더 열기
        </button>
      </div>
    </motion.div>
  );
}
