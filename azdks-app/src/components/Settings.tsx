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

  return (
    <motion.div
      initial={{ opacity: 0, x: -40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        width: 340,
        background: 'rgba(255,255,255,0.98)',
        boxShadow: '4px 0 24px rgba(0,0,0,0.12)',
        zIndex: 500,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
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
          <span style={{ fontSize: 20 }}>⚙️</span>
          <span style={{ fontWeight: 700, fontSize: 16, color: '#2d3748' }}>설정</span>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#a0aec0', padding: 4 }}
        >
          ✕
        </button>
      </div>

      {/* Auto move toggle */}
      <div
        style={{
          padding: '14px 20px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#2d3748' }}>자동 이동</div>
          <div style={{ fontSize: 11, color: '#718096', marginTop: 2 }}>신뢰도 90% 이상 파일 자동 이동</div>
        </div>
        <div
          onClick={() => onAutoMoveChange(!autoMove)}
          style={{
            width: 44,
            height: 24,
            borderRadius: 12,
            background: autoMove ? '#4299e1' : '#cbd5e0',
            cursor: 'pointer',
            position: 'relative',
            transition: 'background 0.2s',
          }}
        >
          <motion.div
            animate={{ x: autoMove ? 22 : 2 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            style={{
              position: 'absolute',
              top: 2,
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: '#fff',
              boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
            }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0' }}>
        {(['folders', 'rules'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1,
              padding: '10px 0',
              fontSize: 13,
              fontWeight: tab === t ? 700 : 400,
              color: tab === t ? '#4299e1' : '#718096',
              background: 'none',
              border: 'none',
              borderBottom: tab === t ? '2px solid #4299e1' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {t === 'folders' ? '📂 기본 폴더' : '📋 분류 규칙'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
        {tab === 'folders' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Object.entries(folders).map(([key, val]) => (
              <div key={key}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#4a5568', marginBottom: 4, display: 'block' }}>
                  {key}
                </label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    value={val}
                    onChange={(e) => setFolders((prev) => ({ ...prev, [key]: e.target.value }))}
                    style={{
                      flex: 1,
                      fontSize: 11,
                      padding: '6px 8px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e0',
                      color: '#2d3748',
                      outline: 'none',
                    }}
                  />
                  <button
                    onClick={() => handleOpenFolder(val)}
                    title="폴더 열기"
                    style={{
                      padding: '6px 8px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e0',
                      background: '#f7fafc',
                      cursor: 'pointer',
                      fontSize: 12,
                    }}
                  >
                    📂
                  </button>
                </div>
              </div>
            ))}
            <button
              onClick={handleSaveFolders}
              disabled={saving}
              style={{
                marginTop: 8,
                padding: '10px',
                borderRadius: 10,
                background: '#4299e1',
                color: '#fff',
                border: 'none',
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        )}

        {tab === 'rules' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {store.rules.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#a0aec0', marginTop: 40, fontSize: 13 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                저장된 규칙이 없어요
              </div>
            ) : (
              store.rules.map((rule: Rule) => (
                <div
                  key={rule.id}
                  style={{
                    background: '#f7fafc',
                    borderRadius: 10,
                    padding: '10px 12px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#2d3748' }}>
                        {rule.pattern || rule.extensions?.join(', ') || '규칙'}
                      </div>
                      <div style={{ fontSize: 11, color: '#718096', marginTop: 2 }}>
                        → {rule.folder.split('/').slice(-2).join('/')}
                      </div>
                      <div style={{ fontSize: 10, color: '#a0aec0', marginTop: 2 }}>
                        사용 {rule.usageCount}회
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#fc8181',
                        cursor: 'pointer',
                        fontSize: 14,
                        padding: '0 4px',
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Open unclassified */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid #e2e8f0' }}>
        <button
          onClick={() => handleOpenFolder(store.defaultFolders['미분류'] ?? '~/Downloads/AZDKS/미분류')}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: 10,
            background: '#fff5f5',
            color: '#e53e3e',
            border: '1px solid #fed7d7',
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          🤔 미분류 폴더 열기
        </button>
      </div>
    </motion.div>
  );
}
