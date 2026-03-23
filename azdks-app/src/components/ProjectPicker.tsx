import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import type { Project } from '../store/projectStore';

interface ProjectPickerProps {
  files: Array<{ path: string; name: string }>;
  projects: Project[];
  onAssignProject: (files: Array<{ path: string; name: string }>, project: Project) => void;
  onCreateProject: (files: Array<{ path: string; name: string }>, name: string, folder: string) => void;
  onSkipToType: (files: Array<{ path: string; name: string }>) => void;
  onDismiss: () => void;
}

export function ProjectPicker({
  files,
  projects,
  onAssignProject,
  onCreateProject,
  onSkipToType,
  onDismiss,
}: ProjectPickerProps) {
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newFolder, setNewFolder] = useState('');

  const fileLabel = (() => {
    if (files.length === 0) return '';
    if (files.length <= 3) return files.map(f => f.name).join(', ');
    return `${files[0].name} 외 ${files.length - 1}개`;
  })();

  const handleNameChange = (name: string) => {
    setNewName(name);
    if (name.trim()) {
      setNewFolder(`~/AZDKS/${name.trim()}`);
    } else {
      setNewFolder('');
    }
  };

  const handleSelectFolder = async () => {
    const selected = await openDialog({ directory: true, title: '프로젝트 폴더 선택' });
    if (selected && typeof selected === 'string') {
      setNewFolder(selected);
    }
  };

  const handleCreate = () => {
    const name = newName.trim();
    const folder = newFolder.trim() || `~/AZDKS/${name}`;
    if (!name) return;
    onCreateProject(files, name, folder);
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 90,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 500,
        width: 460,
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        style={{
          background: 'rgba(13, 10, 30, 0.95)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(124, 58, 237, 0.35)',
          borderRadius: 16,
          padding: '18px 20px 16px',
          boxShadow: '0 12px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(124,58,237,0.1)',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.92)', marginBottom: 3 }}>
              📁 어느 프로젝트에 넣을까요?
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {fileLabel}
            </div>
          </div>
          <button
            onClick={onDismiss}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.3)',
              fontSize: 16,
              cursor: 'pointer',
              padding: '0 0 0 8px',
              lineHeight: 1,
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Existing project buttons */}
        {projects.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 12 }}>
            {projects.map(project => (
              <button
                key={project.id}
                onClick={() => onAssignProject(files, project)}
                style={{
                  background: `${project.color}18`,
                  border: `1.5px solid ${project.color}55`,
                  borderRadius: 8,
                  padding: '5px 12px',
                  color: project.color,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = `${project.color}30`;
                  (e.currentTarget as HTMLButtonElement).style.borderColor = `${project.color}99`;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = `${project.color}18`;
                  (e.currentTarget as HTMLButtonElement).style.borderColor = `${project.color}55`;
                }}
              >
                {project.name}
              </button>
            ))}
          </div>
        )}

        {/* Divider if there are existing projects */}
        {projects.length > 0 && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', marginBottom: 10 }} />
        )}

        {/* New project toggle */}
        <button
          onClick={() => setShowNewForm(v => !v)}
          style={{
            background: showNewForm ? 'rgba(124,58,237,0.18)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${showNewForm ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: 8,
            padding: '7px 12px',
            color: showNewForm ? '#a78bfa' : 'rgba(255,255,255,0.55)',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            width: '100%',
            textAlign: 'left',
            transition: 'all 0.15s',
            fontFamily: 'inherit',
            marginBottom: showNewForm ? 10 : 0,
          }}
        >
          {showNewForm ? '▾ 새 프로젝트 만들기' : '＋ 새 프로젝트 만들기'}
        </button>

        {/* New project form */}
        <AnimatePresence>
          {showNewForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Name input */}
                <div>
                  <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 4, letterSpacing: '0.04em' }}>
                    프로젝트 이름
                  </label>
                  <input
                    autoFocus
                    value={newName}
                    onChange={e => handleNameChange(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setShowNewForm(false); }}
                    placeholder="예: 취준, AZDKS프로젝트, 일본여행"
                    style={{
                      width: '100%',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: 7,
                      padding: '7px 10px',
                      color: 'rgba(255,255,255,0.85)',
                      fontSize: 12,
                      fontFamily: 'inherit',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'rgba(124,58,237,0.6)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
                  />
                </div>

                {/* Folder input */}
                <div>
                  <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 4, letterSpacing: '0.04em' }}>
                    폴더
                  </label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      value={newFolder}
                      onChange={e => setNewFolder(e.target.value)}
                      placeholder={newName ? `~/AZDKS/${newName}` : '~/AZDKS/프로젝트명'}
                      style={{
                        flex: 1,
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: 7,
                        padding: '7px 10px',
                        color: 'rgba(255,255,255,0.7)',
                        fontSize: 11,
                        fontFamily: 'inherit',
                        outline: 'none',
                        minWidth: 0,
                      }}
                      onFocus={e => { e.currentTarget.style.borderColor = 'rgba(124,58,237,0.6)'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
                    />
                    <button
                      onClick={handleSelectFolder}
                      style={{
                        background: 'rgba(255,255,255,0.07)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: 7,
                        padding: '6px 10px',
                        color: 'rgba(255,255,255,0.55)',
                        fontSize: 11,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        fontFamily: 'inherit',
                        flexShrink: 0,
                      }}
                    >
                      Finder로 선택
                    </button>
                  </div>
                </div>

                {/* Create button */}
                <button
                  onClick={handleCreate}
                  disabled={!newName.trim()}
                  style={{
                    background: newName.trim() ? 'rgba(124,58,237,0.7)' : 'rgba(124,58,237,0.2)',
                    border: '1px solid rgba(124,58,237,0.5)',
                    borderRadius: 8,
                    padding: '8px',
                    color: newName.trim() ? '#fff' : 'rgba(255,255,255,0.3)',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: newName.trim() ? 'pointer' : 'not-allowed',
                    fontFamily: 'inherit',
                    transition: 'all 0.15s',
                  }}
                >
                  만들기
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Skip to type */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
          <button
            onClick={() => onSkipToType(files)}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.28)',
              fontSize: 10,
              cursor: 'pointer',
              padding: '2px 0',
              fontFamily: 'inherit',
              textDecoration: 'underline',
              textDecorationColor: 'rgba(255,255,255,0.15)',
            }}
          >
            타입별로 정리
          </button>
        </div>
      </motion.div>
    </div>
  );
}
