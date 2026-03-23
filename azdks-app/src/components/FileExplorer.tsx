import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { invoke } from '@tauri-apps/api/core';

interface TreeNode {
  name: string;
  path: string;
  is_dir: boolean;
  ext: string;
  size: number;
  children: TreeNode[];
}

interface FileExplorerProps {
  rootPath: string;
  onClose: () => void;
  onOpenFile: (path: string) => void;
}

function fileEmoji(ext: string, is_dir: boolean): string {
  if (is_dir) return '📁';
  const map: Record<string, string> = {
    png: '🖼️', jpg: '🖼️', jpeg: '🖼️', gif: '🖼️', webp: '🖼️', heic: '🖼️', heif: '🖼️',
    mp4: '🎬', mov: '🎬', avi: '🎬', mkv: '🎬',
    mp3: '🎵', wav: '🎵', flac: '🎵', aac: '🎵',
    pdf: '📄', doc: '📝', docx: '📝', ppt: '📊', pptx: '📊', xls: '📊', xlsx: '📊',
    zip: '🗜️', rar: '🗜️', '7z': '🗜️', tar: '🗜️', gz: '🗜️',
    js: '💻', ts: '💻', tsx: '💻', jsx: '💻', py: '💻', rs: '💻', go: '💻',
    fig: '🎨', sketch: '🎨', xd: '🎨', psd: '🎨',
    ttf: '🔤', otf: '🔤', woff: '🔤', woff2: '🔤',
  };
  return map[ext.toLowerCase()] ?? '📄';
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function TreeItem({
  node,
  depth,
  onOpen,
  searchQuery,
}: {
  node: TreeNode;
  depth: number;
  onOpen: (path: string) => void;
  searchQuery: string;
}) {
  const [expanded, setExpanded] = useState(depth === 0);

  const highlightName = (name: string) => {
    if (!searchQuery) return <>{name}</>;
    const idx = name.toLowerCase().indexOf(searchQuery.toLowerCase());
    if (idx === -1) return <>{name}</>;
    return (
      <>
        {name.slice(0, idx)}
        <span style={{ background: 'rgba(167,139,250,0.35)', borderRadius: 3, padding: '0 1px' }}>
          {name.slice(idx, idx + searchQuery.length)}
        </span>
        {name.slice(idx + searchQuery.length)}
      </>
    );
  };

  return (
    <div>
      <div
        onClick={() => {
          if (node.is_dir) setExpanded((e) => !e);
          else onOpen(node.path);
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          padding: `3px 8px 3px ${12 + depth * 14}px`,
          cursor: 'pointer',
          borderRadius: 6,
          fontSize: 12,
          color: node.is_dir ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.55)',
          transition: 'background 0.1s',
          userSelect: 'none',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        {node.is_dir && (
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', width: 10, flexShrink: 0 }}>
            {expanded ? '▼' : '▶'}
          </span>
        )}
        {!node.is_dir && <span style={{ width: 10, flexShrink: 0 }} />}
        <span style={{ fontSize: 13, flexShrink: 0 }}>{fileEmoji(node.ext, node.is_dir)}</span>
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {highlightName(node.name)}
        </span>
        {!node.is_dir && node.size > 0 && (
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)', flexShrink: 0 }}>
            {formatSize(node.size)}
          </span>
        )}
      </div>
      <AnimatePresence>
        {node.is_dir && expanded && node.children.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{ overflow: 'hidden' }}
          >
            {node.children.map((child) => (
              <TreeItem
                key={child.path}
                node={child}
                depth={depth + 1}
                onOpen={onOpen}
                searchQuery={searchQuery}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FileExplorer({ rootPath, onClose, onOpenFile }: FileExplorerProps) {
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TreeNode[] | null>(null);
  const [loading, setLoading] = useState(true);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadTree = useCallback(async () => {
    setLoading(true);
    try {
      const result = await invoke<TreeNode>('read_tree', { path: rootPath, depth: 4 });
      setTree(result);
    } catch (e) {
      console.error('Tree load failed:', e);
    } finally {
      setLoading(false);
    }
  }, [rootPath]);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    searchTimerRef.current = setTimeout(async () => {
      try {
        const results = await invoke<TreeNode[]>('search_files', {
          root: rootPath,
          query: searchQuery.trim(),
        });
        setSearchResults(results);
      } catch (e) {
        console.error('Search failed:', e);
      }
    }, 200);
  }, [searchQuery, rootPath]);

  const totalFiles = tree
    ? (function count(node: TreeNode): number {
        if (!node.is_dir) return 1;
        return node.children.reduce((acc, c) => acc + count(c), 0);
      })(tree)
    : 0;

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
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '18px 14px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>📁</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13.5, color: 'rgba(255,255,255,0.9)' }}>파일 탐색기</div>
            {!loading && (
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 1 }}>
                {totalFiles}개 파일
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            onClick={loadTree}
            title="새로고침"
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 7, width: 26, height: 26, fontSize: 12,
              cursor: 'pointer', color: 'rgba(255,255,255,0.45)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
          >↺</button>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 7, width: 26, height: 26, fontSize: 12,
              cursor: 'pointer', color: 'rgba(255,255,255,0.45)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
          >✕</button>
        </div>
      </div>

      {/* Search bar */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
        <div style={{ position: 'relative' }}>
          <span style={{
            position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)',
            fontSize: 12, color: 'rgba(255,255,255,0.25)', pointerEvents: 'none',
          }}>🔍</span>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="파일 검색..."
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '7px 28px 7px 28px',
              borderRadius: 9,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)',
              color: 'rgba(255,255,255,0.85)',
              fontSize: 12.5,
              outline: 'none',
              fontFamily: 'inherit',
              transition: 'border 0.15s',
            }}
            onFocus={(e) => (e.currentTarget.style.border = '1px solid rgba(124,58,237,0.5)')}
            onBlur={(e) => (e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)')}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(255,255,255,0.3)', fontSize: 11, padding: 2,
              }}
            >✕</button>
          )}
        </div>
        {searchResults !== null && (
          <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.3)', marginTop: 5, paddingLeft: 2 }}>
            {searchResults.length > 0 ? `${searchResults.length}개 검색됨` : '검색 결과 없음'}
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 4px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              style={{ fontSize: 22, display: 'inline-block', marginBottom: 8 }}
            >⟳</motion.div>
            <div>로딩 중...</div>
          </div>
        ) : searchResults !== null ? (
          searchResults.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
              <div>"{searchQuery}" 검색 결과 없음</div>
            </div>
          ) : (
            searchResults.map((node) => (
              <div
                key={node.path}
                onClick={() => onOpenFile(node.path)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '5px 10px', cursor: 'pointer', borderRadius: 7,
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ fontSize: 14, flexShrink: 0 }}>{fileEmoji(node.ext, false)}</span>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {(() => {
                      const name = node.name;
                      const idx = name.toLowerCase().indexOf(searchQuery.toLowerCase());
                      if (idx === -1) return name;
                      return (
                        <>
                          {name.slice(0, idx)}
                          <span style={{ background: 'rgba(167,139,250,0.35)', borderRadius: 3, padding: '0 1px' }}>
                            {name.slice(idx, idx + searchQuery.length)}
                          </span>
                          {name.slice(idx + searchQuery.length)}
                        </>
                      );
                    })()}
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
                    {node.path.replace(/\/[^/]+$/, '')}
                  </div>
                </div>
                {node.size > 0 && (
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)', flexShrink: 0 }}>{formatSize(node.size)}</span>
                )}
              </div>
            ))
          )
        ) : tree ? (
          <TreeItem node={tree} depth={0} onOpen={onOpenFile} searchQuery="" />
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>
            <div>AZDKS 폴더가 비어있어요</div>
            <div style={{ fontSize: 11, marginTop: 4 }}>파일을 드롭해서 정리를 시작하세요</div>
          </div>
        )}
      </div>

      {/* Footer: root path */}
      <div style={{
        padding: '8px 14px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        fontSize: 10,
        color: 'rgba(255,255,255,0.18)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        flexShrink: 0,
      }}>
        {rootPath}
      </div>
    </motion.div>
  );
}
