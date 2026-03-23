import { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';

import { Gecko, type GeckoState } from './components/Gecko';
import { ToastNotification, type ToastItem } from './components/ToastNotification';
import { UnclassifiedPanel } from './components/UnclassifiedPanel';
import { HistoryList } from './components/HistoryList';
import { Settings } from './components/Settings';
import { Onboarding } from './components/Onboarding';
import { ModeSelector } from './components/ModeSelector';

import { useDropZone } from './hooks/useDropZone';
import { useClassifier, type ProcessedFile } from './hooks/useClassifier';

import { loadRulesStore, getCachedRulesStore, addRule } from './store/rulesStore';
import { loadHistory, addHistoryEntry, type HistoryEntry } from './store/historyStore';
import { getConfidenceLevel } from './engine/confidenceCalc';
import { getSavedMode, saveMode, type ClassificationMode } from './engine/classificationMode';
import { invoke } from '@tauri-apps/api/core';

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
  const [autoMove, setAutoMove] = useState(true);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [mode, setMode] = useState<ClassificationMode>(getSavedMode);
  const [isProcessing, setIsProcessing] = useState(false);

  const { classifyFiles, getDirFiles, expandPath } = useClassifier();
  const geckoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const handleModeChange = useCallback((newMode: ClassificationMode) => {
    setMode(newMode);
    saveMode(newMode);
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
      return dest;
    },
    [expandPath],
  );

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

        const modeLabels: Record<ClassificationMode, string> = {
          smart: '스마트 분석',
          date: '날짜 분석',
          project: '프로젝트 분석',
          type: '타입 분류',
        };
        showStatus(`📂 ${allFiles.length}개 파일 ${modeLabels[mode]} 중...`);

        // 분류
        const results = await classifyFiles(allFiles, mode);

        const autoFiles: ProcessedFile[] = [];
        const confirmFiles: ProcessedFile[] = [];
        const unknownFiles: ProcessedFile[] = [];

        for (const r of results) {
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
    [isProcessing, autoMove, classifyFiles, getDirFiles, expandPath, setGeckoFor, showStatus, doMove, refreshHistory, removeToast, mode],
  );

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
    idle:     isProcessing ? '분석 중...' : '파일을 드롭하세요',
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
          <span className="app-title-main">알잘딱깔쏀</span>
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
          <button className="icon-btn" onClick={() => { setShowHistory(true); setShowSettings(false); }} title="정리 내역">📋</button>
          <button className="icon-btn" onClick={() => { setShowSettings(true); setShowHistory(false); }} title="설정">⚙️</button>
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

        <ModeSelector mode={mode} onChange={handleModeChange} />

        <div className="gecko-container">
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
        {(showHistory || showSettings) && (
          <motion.div
            className="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => { setShowHistory(false); setShowSettings(false); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
