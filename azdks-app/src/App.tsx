import { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';

import { Gecko, type GeckoState } from './components/Gecko';
import { ToastNotification, type ToastItem } from './components/ToastNotification';
import { UnclassifiedPanel } from './components/UnclassifiedPanel';
import { HistoryList } from './components/HistoryList';
import { Settings } from './components/Settings';
import { Onboarding } from './components/Onboarding';
import { FileExplorer } from './components/FileExplorer';
import { StatsPanel } from './components/StatsPanel';

import { useDropZone } from './hooks/useDropZone';
import { useClassifier, type ProcessedFile } from './hooks/useClassifier';

import { loadRulesStore, getCachedRulesStore, addRule } from './store/rulesStore';
import { loadHistory, addHistoryEntry, removeHistoryEntry, type HistoryEntry } from './store/historyStore';
import { getConfidenceLevel } from './engine/confidenceCalc';
import { invoke } from '@tauri-apps/api/core';
import { open as openDialog } from '@tauri-apps/plugin-dialog';

import './App.css';

function App() {
  const [onboarded, setOnboarded] = useState(() => localStorage.getItem('azdks_onboarded') === '1');
  const [geckoState, setGeckoState] = useState<GeckoState>('idle');
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [unclassified, setUnclassified] = useState<ProcessedFile[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [store, setStore] = useState(getCachedRulesStore());
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showExplorer, setShowExplorer] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [autoMove, setAutoMove] = useState(true);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const { classifyFiles, getDirFiles, expandPath } = useClassifier();
  const geckoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  type UndoEntry = { srcPath: string; destPath: string; fileName: string };
  const undoStackRef = useRef<UndoEntry[]>([]);
  const [lastUndo, setLastUndo] = useState<UndoEntry | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const init = async () => {
      const s = await loadRulesStore();
      setStore(s);
      const h = await loadHistory();
      setHistory(h);
    };
    init();
  }, []);

  const setGeckoFor = useCallback((state: GeckoState, duration = 2000) => {
    if (geckoTimerRef.current) clearTimeout(geckoTimerRef.current);
    setGeckoState(state);
    geckoTimerRef.current = setTimeout(() => setGeckoState('idle'), duration);
  }, []);

  const showStatus = useCallback((msg: string, duration = 3000) => {
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    setStatusMsg(msg);
    statusTimerRef.current = setTimeout(() => setStatusMsg(null), duration);
  }, []);

  const refreshStore = useCallback(async () => {
    const s = await loadRulesStore();
    setStore(s);
  }, []);

  const refreshHistory = useCallback(async () => {
    const h = await loadHistory();
    setHistory(h);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // 폴더 열기 — open -R 로 부모에서 하이라이트해서 보여줌
  const openFolder = useCallback(async (path: string) => {
    try {
      const expanded = path.startsWith('~') ? await expandPath(path) : path;
      await invoke('open_folder', { path: expanded });
    } catch (e) {
      console.error('Failed to open folder:', e);
    }
  }, [expandPath]);

  // 파일 이동 (히스토리 기록 포함, refresh는 밖에서)
  const doMove = useCallback(
    async (srcPath: string, fileName: string, folder: string, confidence: number): Promise<string> => {
      const expanded = await expandPath(folder);
      const dest = `${expanded}/${fileName}`;
      await invoke('move_file', { src: srcPath, dest });
      await addHistoryEntry({ fileName, srcPath, destPath: dest, category: folder, confidence });
      // undo 스택에 추가
      undoStackRef.current = [
        { srcPath, destPath: dest, fileName },
        ...undoStackRef.current,
      ].slice(0, 10);
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      setLastUndo({ srcPath, destPath: dest, fileName });
      undoTimerRef.current = setTimeout(() => setLastUndo(null), 5000);
      return dest;
    },
    [expandPath],
  );

  const handleUndo = useCallback(async () => {
    const last = undoStackRef.current[0];
    if (!last) return;
    await invoke('move_file', { src: last.destPath, dest: last.srcPath });
    await removeHistoryEntry(last.fileName, last.destPath);
    undoStackRef.current = undoStackRef.current.slice(1);
    const next = undoStackRef.current[0] ?? null;
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setLastUndo(next);
    if (next) {
      undoTimerRef.current = setTimeout(() => setLastUndo(null), 5000);
    }
    await refreshHistory();
    setGeckoFor('happy', 1500);
    showStatus(`↩ "${last.fileName}" 되돌렸어요`);
  }, [refreshHistory, setGeckoFor, showStatus]);

  // Cmd+Z / Ctrl+Z 키보드 단축키
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleUndo]);

  const handleFilesDropped = useCallback(
    async (paths: string[]) => {
      // 처리 중이면 무시
      if (isProcessing) {
        showStatus('⏳ 이전 작업 처리 중... 잠시 후 다시 시도해주세요');
        return;
      }

      setIsProcessing(true);

      try {
        // 파일 목록 수집
        let allFiles: string[] = [];
        for (const p of paths) {
          const files = await getDirFiles(p);
          allFiles.push(...files);
        }

        if (allFiles.length === 0) {
          showStatus('파일을 찾을 수 없어요');
          return;
        }

        setGeckoFor('eating', 1500);

        showStatus(`📂 ${allFiles.length}개 파일 스마트 분석 중...`);

        // 분류
        const results = await classifyFiles(allFiles);

        const autoFiles: ProcessedFile[] = [];
        const confirmFiles: ProcessedFile[] = [];
        const unknownFiles: ProcessedFile[] = [];
        const duplicateFiles: ProcessedFile[] = [];

        for (const r of results) {
          // 중복 파일은 별도 처리 (자동 이동 대상이더라도)
          if (r.duplicateExists) {
            duplicateFiles.push(r);
            continue;
          }
          const level = getConfidenceLevel(r.result.confidence);
          if (level === 'auto') autoFiles.push(r);
          else if (level === 'confirm') confirmFiles.push(r);
          else unknownFiles.push(r);
        }

        // 자동 이동
        let movedCount = 0;
        const moveErrors: string[] = [];

        if (autoMove && autoFiles.length > 0) {
          showStatus(`⚡ ${autoFiles.length}개 자동 이동 중...`);
          for (const f of autoFiles) {
            try {
              await doMove(f.path, f.name, f.result.folder, f.result.confidence);
              movedCount++;
            } catch (e) {
              moveErrors.push(f.name);
              console.error('Auto move failed:', f.name, e);
            }
          }
          // 히스토리 한번만 갱신
          await refreshHistory();

          if (moveErrors.length > 0) {
            setGeckoFor('confused', 2500);
            showStatus(`⚠️ ${movedCount}개 완료, ${moveErrors.length}개 실패 (권한 확인 필요)`, 4000);
          } else if (movedCount > 0) {
            setGeckoFor('happy', 2000);
            showStatus(`✅ ${movedCount}개 자동 정리 완료!`);
          }
        } else if (!autoMove) {
          for (const f of autoFiles) confirmFiles.unshift(f);
        }

        // 확인 토스트 생성
        const newToasts: ToastItem[] = [];
        for (const f of confirmFiles) {
          const id = uuidv4();
          const expanded = await expandPath(f.result.folder);

          const expandedAlts = await Promise.all(
            (f.result.alternatives ?? []).map(async (alt) => ({
              folder: await expandPath(alt.folder),
              confidence: alt.confidence,
              reason: alt.reason,
            }))
          );

          const onConfirm = async () => {
            removeToast(id);
            try {
              await doMove(f.path, f.name, f.result.folder, f.result.confidence);
              await refreshHistory();
              setGeckoFor('happy', 1500);
            } catch (e) {
              showStatus(`❌ 이동 실패: ${f.name} — 파일이 이미 없거나 권한 오류`, 4000);
            }
          };

          const onPickAlternative = async (folder: string) => {
            removeToast(id);
            try {
              await doMove(f.path, f.name, folder, f.result.confidence);
              await refreshHistory();
              setGeckoFor('happy', 1500);
            } catch (e) {
              showStatus(`❌ 이동 실패: ${f.name}`, 4000);
            }
          };

          const onSkip = () => removeToast(id);
          const onChangeFolder = () => {
            removeToast(id);
            setUnclassified((prev) => [...prev, f]);
          };

          newToasts.push({
            id,
            fileName: f.name,
            folder: expanded,
            confidence: f.result.confidence,
            reason: f.result.reason,
            alternatives: expandedAlts.length > 0 ? expandedAlts : undefined,
            onConfirm,
            onPickAlternative,
            onChangeFolder,
            onSkip,
          });
        }
        // 중복 파일 토스트 생성 (경고 스타일)
        for (const f of duplicateFiles) {
          const id = uuidv4();
          const expanded = await expandPath(f.result.folder);

          const onConfirm = async () => {
            removeToast(id);
            try {
              await doMove(f.path, f.name, f.result.folder, f.result.confidence);
              await refreshHistory();
              setGeckoFor('happy', 1500);
            } catch (e) {
              showStatus(`❌ 이동 실패: ${f.name} — 파일이 이미 없거나 권한 오류`, 4000);
            }
          };

          const onSkip = () => removeToast(id);
          const onChangeFolder = () => {
            removeToast(id);
            setUnclassified((prev) => [...prev, f]);
          };

          newToasts.push({
            id,
            fileName: f.name,
            folder: expanded,
            confidence: f.result.confidence,
            reason: f.result.reason,
            isDuplicate: true,
            onConfirm,
            onPickAlternative: async (folder: string) => {
              removeToast(id);
              try {
                await doMove(f.path, f.name, folder, f.result.confidence);
                await refreshHistory();
                setGeckoFor('happy', 1500);
              } catch (e) {
                showStatus(`❌ 이동 실패: ${f.name}`, 4000);
              }
            },
            onChangeFolder,
            onSkip,
          });
        }

        if (newToasts.length > 0) setToasts((prev) => [...prev, ...newToasts]);

        // 미분류
        if (unknownFiles.length > 0) {
          setUnclassified((prev) => [...prev, ...unknownFiles]);
          setGeckoFor('confused', 3000);
        }

      } catch (e) {
        console.error('Drop handling failed:', e);
        showStatus(`❌ 오류가 발생했어요: ${String(e)}`, 4000);
        setGeckoFor('confused', 2000);
      } finally {
        setIsProcessing(false);
      }
    },
    [isProcessing, autoMove, classifyFiles, getDirFiles, expandPath, setGeckoFor, showStatus, doMove, refreshHistory, removeToast],
  );

  const handleGeckoClick = useCallback(async () => {
    if (isProcessing) return;
    const selected = await openDialog({
      multiple: true,
      directory: false,
      title: '정리할 파일을 선택하세요',
    });
    if (!selected) return;
    const paths = Array.isArray(selected) ? selected : [selected];
    if (paths.length > 0) handleFilesDropped(paths);
  }, [isProcessing, handleFilesDropped]);

  // 추가 키보드 단축키: Cmd+O, Escape, Cmd+1~4
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Cmd+O — 파일 선택 다이얼로그
      if ((e.metaKey || e.ctrlKey) && e.key === 'o') {
        e.preventDefault();
        handleGeckoClick();
        return;
      }
      // Escape — 열린 패널 닫기
      if (e.key === 'Escape') {
        setShowHistory(false);
        setShowSettings(false);
        setShowExplorer(false);
        setShowStats(false);
        return;
      }
      // Cmd+1 — 통계 토글
      if ((e.metaKey || e.ctrlKey) && e.key === '1') {
        e.preventDefault();
        setShowStats(v => !v);
        setShowHistory(false);
        setShowSettings(false);
        setShowExplorer(false);
        return;
      }
      // Cmd+2 — 내역 토글
      if ((e.metaKey || e.ctrlKey) && e.key === '2') {
        e.preventDefault();
        setShowHistory(v => !v);
        setShowSettings(false);
        setShowExplorer(false);
        setShowStats(false);
        return;
      }
      // Cmd+3 — 설정 토글
      if ((e.metaKey || e.ctrlKey) && e.key === '3') {
        e.preventDefault();
        setShowSettings(v => !v);
        setShowHistory(false);
        setShowExplorer(false);
        setShowStats(false);
        return;
      }
      // Cmd+4 — 탐색기 토글
      if ((e.metaKey || e.ctrlKey) && e.key === '4') {
        e.preventDefault();
        setShowExplorer(v => !v);
        setShowHistory(false);
        setShowSettings(false);
        setShowStats(false);
        return;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleGeckoClick]);

  const { dropState } = useDropZone(handleFilesDropped);

  useEffect(() => {
    if (isProcessing) return;
    if (dropState === 'hover' && geckoState === 'idle') setGeckoState('hover');
    else if (dropState === 'idle' && geckoState === 'hover') setGeckoState('idle');
  }, [dropState, geckoState, isProcessing]);

  const handleAssignUnclassified = useCallback(
    async (file: ProcessedFile, folder: string, saveRuleFlag: boolean) => {
      setUnclassified((prev) => prev.filter((f) => f.path !== file.path));
      try {
        await doMove(file.path, file.name, folder, 1.0);
        await refreshHistory();
        if (saveRuleFlag) {
          const ext = file.name.includes('.') ? '.' + file.name.split('.').pop()! : '';
          await addRule({ extensions: ext ? [ext] : undefined, folder, confidence: 1.0 });
          await refreshStore();
        }
        setGeckoFor('happy', 1500);
      } catch (e) {
        showStatus(`❌ 이동 실패: ${file.name}`, 3000);
      }
    },
    [doMove, refreshHistory, refreshStore, setGeckoFor, showStatus],
  );

  const geckoLabel = {
    idle:     isProcessing ? '분석 중...' : '클릭하거나 파일을 드롭하세요',
    hover:    '놓아주세요! 🍽️',
    eating:   '냠냠냠...',
    happy:    '정리 완료! ✨',
    confused: '어디로 갈까요?',
  }[geckoState];

  const handleOnboardingComplete = useCallback(() => {
    localStorage.setItem('azdks_onboarded', '1');
    setOnboarded(true);
    refreshStore();
  }, [refreshStore]);

  return (
    <div className="app-root">
      <div className="app-bg" />

      <AnimatePresence>
        {!onboarded && <Onboarding onComplete={handleOnboardingComplete} />}
      </AnimatePresence>

      {/* Top bar */}
      <div className="top-bar">
        <div className="app-title">
          <span className="app-title-main">알잘딱깔쎈</span>
          <span className="app-title-sub">AZDKS</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* 처리 중 인디케이터 */}
          <AnimatePresence>
            {isProcessing && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: [1, 0.3, 1] }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 1, repeat: Infinity }}
                style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: '#a78bfa',
                  boxShadow: '0 0 8px #a78bfa',
                }}
              />
            )}
          </AnimatePresence>
          <button className="icon-btn" onClick={() => { setShowStats(v => !v); setShowHistory(false); setShowSettings(false); setShowExplorer(false); }} title="통계 (⌘1)">📊</button>
          <button className="icon-btn" onClick={() => { setShowHistory(true); setShowSettings(false); setShowExplorer(false); setShowStats(false); }} title="정리 내역 (⌘2)">📋</button>
          <button className="icon-btn" onClick={() => { setShowSettings(true); setShowHistory(false); setShowExplorer(false); setShowStats(false); }} title="설정 (⌘3)">⚙️</button>
          <button className="icon-btn" onClick={() => { setShowExplorer(v => !v); setShowHistory(false); setShowSettings(false); setShowStats(false); }} title="파일 탐색기 (⌘4)">📁</button>
        </div>
      </div>

      {/* Main gecko area */}
      <div className="main-area">
        <motion.p
          className="drop-hint"
          animate={{ opacity: dropState === 'hover' ? 0 : 1 }}
        >
          {geckoLabel}
        </motion.p>

        <div
          className="gecko-container"
          onClick={handleGeckoClick}
          style={{ cursor: isProcessing ? 'not-allowed' : 'pointer' }}
          title="클릭해서 파일 선택"
        >
          <Gecko state={geckoState} />
        </div>

        <AnimatePresence>
          {dropState === 'hover' && !isProcessing && (
            <motion.div
              className="drop-overlay"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <span style={{ fontSize: 38 }}>📥</span>
              <span style={{ fontSize: 16, fontWeight: 700 }}>놓아주세요!</span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {statusMsg && (
            <motion.div
              className="status-msg"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {statusMsg}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Recent strip — 폴더 클릭 가능 */}
      <AnimatePresence>
        {history.length > 0 && (
          <motion.div
            className="recent-strip"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="recent-strip-label">최근 정리</div>
            <div className="recent-strip-items">
              {history.slice(0, 5).map((entry) => (
                <div key={entry.id} className="recent-strip-item">
                  <span className="recent-file-name" title={entry.fileName}>
                    {entry.fileName}
                  </span>
                  <span className="recent-arrow">→</span>
                  <button
                    className="recent-folder-btn"
                    title={`${entry.destPath}\n클릭하면 폴더 열기`}
                    onClick={() => openFolder(entry.destPath)}
                  >
                    📁 {entry.destPath.split('/').slice(-2).join('/')}
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unclassified */}
      {unclassified.length > 0 && (
        <UnclassifiedPanel
          files={unclassified}
          onAssign={handleAssignUnclassified}
          onSkipAll={() => setUnclassified([])}
        />
      )}

      <ToastNotification toasts={toasts} />

      <AnimatePresence>
        {showHistory && (
          <HistoryList
            entries={history}
            onClose={() => setShowHistory(false)}
            onOpenFolder={openFolder}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showSettings && (
          <Settings
            store={store}
            onClose={() => setShowSettings(false)}
            onStoreUpdate={refreshStore}
            autoMove={autoMove}
            onAutoMoveChange={setAutoMove}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showExplorer && (
          <FileExplorer
            rootPath={store.defaultFolders['홈'] ?? '~/AZDKS'}
            onClose={() => setShowExplorer(false)}
            onOpenFile={openFolder}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showStats && (
          <StatsPanel
            entries={history}
            onClose={() => setShowStats(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(showHistory || showSettings || showExplorer || showStats) && (
          <motion.div
            className="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => { setShowHistory(false); setShowSettings(false); setShowExplorer(false); setShowStats(false); }}
          />
        )}
      </AnimatePresence>

      {/* 플로팅 되돌리기 버튼 */}
      {/* 단축키 힌트 바 */}
      <div style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        height: 26,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(8px)',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        zIndex: 10,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}>
        {[
          ['⌘O', '열기'],
          ['⌘Z', '되돌리기'],
          ['⌘1', '통계'],
          ['⌘2', '내역'],
          ['⌘3', '설정'],
          ['⌘4', '탐색기'],
          ['ESC', '닫기'],
        ].map(([key, label]) => (
          <span key={key} style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            <span style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.13)',
              borderRadius: 4,
              padding: '0 5px',
              fontSize: 10,
              lineHeight: '16px',
              color: 'rgba(255,255,255,0.4)',
              letterSpacing: 0,
            }}>{key}</span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)' }}>{label}</span>
          </span>
        ))}
      </div>

      <AnimatePresence>
        {lastUndo && (
          <motion.button
            initial={{ opacity: 0, y: 20, x: -20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: 20, x: -20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            onClick={handleUndo}
            style={{
              position: 'fixed',
              bottom: 100,
              left: 20,
              background: 'rgba(30, 20, 60, 0.92)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(124, 58, 237, 0.4)',
              borderRadius: 12,
              padding: '8px 14px',
              color: 'rgba(255,255,255,0.85)',
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
              zIndex: 600,
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(124,58,237,0.8)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(124,58,237,0.4)')}
          >
            <span>↩</span>
            <span>되돌리기</span>
            <span style={{ fontSize: 10, opacity: 0.45, marginLeft: 2 }}>⌘Z</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
