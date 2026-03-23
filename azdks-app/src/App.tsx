import { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';

import { Gecko, type GeckoState } from './components/Gecko';
import { ToastNotification, type ToastItem } from './components/ToastNotification';
import { UnclassifiedPanel } from './components/UnclassifiedPanel';
import { HistoryList } from './components/HistoryList';
import { Settings } from './components/Settings';

import { useDropZone } from './hooks/useDropZone';
import { useClassifier, type ProcessedFile } from './hooks/useClassifier';

import { loadRulesStore, getCachedRulesStore, addRule } from './store/rulesStore';
import { loadHistory, addHistoryEntry, type HistoryEntry } from './store/historyStore';
import { getConfidenceLevel } from './engine/confidenceCalc';
import { invoke } from '@tauri-apps/api/core';

import './App.css';

function App() {
  const [geckoState, setGeckoState] = useState<GeckoState>('idle');
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [unclassified, setUnclassified] = useState<ProcessedFile[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [store, setStore] = useState(getCachedRulesStore());
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [autoMove, setAutoMove] = useState(true);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const { classifyFiles, getDirFiles, expandPath } = useClassifier();
  const geckoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const showStatus = useCallback((msg: string, duration = 2500) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), duration);
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

  const doMove = useCallback(
    async (srcPath: string, fileName: string, folder: string, confidence: number) => {
      const expanded = await expandPath(folder);
      const dest = `${expanded}/${fileName}`;
      await invoke('move_file', { src: srcPath, dest });
      await addHistoryEntry({ fileName, srcPath, destPath: dest, category: folder, confidence });
      await refreshHistory();
    },
    [expandPath, refreshHistory],
  );

  const handleFilesDropped = useCallback(
    async (paths: string[]) => {
      let allFiles: string[] = [];
      for (const p of paths) {
        const files = await getDirFiles(p);
        allFiles.push(...files);
      }

      setGeckoFor('eating', 1500);
      showStatus(`${allFiles.length}개 파일 분석 중...`);

      const results = await classifyFiles(allFiles);

      const autoFiles: ProcessedFile[] = [];
      const confirmFiles: ProcessedFile[] = [];
      const unknownFiles: ProcessedFile[] = [];

      for (const r of results) {
        const level = getConfidenceLevel(r.result.confidence);
        if (level === 'auto') autoFiles.push(r);
        else if (level === 'confirm') confirmFiles.push(r);
        else unknownFiles.push(r);
      }

      // Auto move high-confidence files
      if (autoMove && autoFiles.length > 0) {
        for (const f of autoFiles) {
          try {
            await doMove(f.path, f.name, f.result.folder, f.result.confidence);
          } catch (e) {
            console.error('Auto move failed:', e);
          }
        }
        setGeckoFor('happy', 2000);
        showStatus(`✅ ${autoFiles.length}개 자동 정리 완료!`);
      } else {
        for (const f of autoFiles) confirmFiles.unshift(f);
      }

      // Build toasts for confirm-level files
      const newToasts: ToastItem[] = [];
      for (const f of confirmFiles) {
        const id = uuidv4();
        const expanded = await expandPath(f.result.folder);

        const onConfirm = async () => {
          removeToast(id);
          try {
            await doMove(f.path, f.name, f.result.folder, f.result.confidence);
            setGeckoFor('happy', 1500);
          } catch (e) {
            console.error('Move failed:', e);
          }
        };
        const onSkip = () => removeToast(id);
        const onChangeFolder = () => {
          removeToast(id);
          setUnclassified((prev) => [...prev, f]);
        };

        newToasts.push({ id, fileName: f.name, folder: expanded, confidence: f.result.confidence, onConfirm, onChangeFolder, onSkip });
      }
      if (newToasts.length > 0) setToasts((prev) => [...prev, ...newToasts]);

      // Unknown → unclassified panel
      if (unknownFiles.length > 0) {
        setUnclassified((prev) => [...prev, ...unknownFiles]);
        setGeckoFor('confused', 3000);
      }
    },
    [autoMove, classifyFiles, getDirFiles, expandPath, setGeckoFor, showStatus, doMove, removeToast],
  );

  const { dropState } = useDropZone(handleFilesDropped);

  useEffect(() => {
    if (dropState === 'hover' && geckoState === 'idle') setGeckoState('hover');
    else if (dropState === 'idle' && geckoState === 'hover') setGeckoState('idle');
  }, [dropState, geckoState]);

  const handleAssignUnclassified = useCallback(
    async (file: ProcessedFile, folder: string, saveRuleFlag: boolean) => {
      setUnclassified((prev) => prev.filter((f) => f.path !== file.path));
      try {
        await doMove(file.path, file.name, folder, 1.0);
        if (saveRuleFlag) {
          const ext = file.name.includes('.') ? '.' + file.name.split('.').pop()! : '';
          await addRule({ extensions: ext ? [ext] : undefined, folder, confidence: 1.0 });
          await refreshStore();
        }
        setGeckoFor('happy', 1500);
      } catch (e) {
        console.error('Assign failed:', e);
      }
    },
    [doMove, refreshStore, setGeckoFor],
  );

  const geckoLabel = {
    idle: '파일을 꼬미에게 드롭하세요! 🦎',
    hover: '냠냠냠... 입 벌리는 중! 👀',
    eating: '냠냠냠... 🍴',
    happy: '정리 완료! 🎉',
    confused: '음... 어디로 갈까요? 🤔',
  }[geckoState];

  return (
    <div className="app-root">
      <div className="app-bg" />

      {/* Top bar */}
      <div className="top-bar">
        <div className="app-title">
          <span className="app-title-main">알잘딱깔쏀</span>
          <span className="app-title-sub">AZDKS</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="icon-btn" onClick={() => { setShowHistory(true); setShowSettings(false); }} title="정리 내역">📋</button>
          <button className="icon-btn" onClick={() => { setShowSettings(true); setShowHistory(false); }} title="설정">⚙️</button>
        </div>
      </div>

      {/* Main gecko area */}
      <div className="main-area">
        <motion.p className="drop-hint" animate={{ opacity: dropState === 'hover' ? 0 : 1 }}>
          {geckoLabel}
        </motion.p>

        <div className="gecko-container">
          <Gecko state={geckoState} />
        </div>

        <AnimatePresence>
          {dropState === 'hover' && (
            <motion.div className="drop-overlay" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
              <span style={{ fontSize: 40 }}>📥</span>
              <span style={{ fontSize: 18, fontWeight: 700 }}>놓아주세요!</span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {statusMsg && (
            <motion.div className="status-msg" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              {statusMsg}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Recent strip */}
      {history.length > 0 && (
        <div className="recent-strip">
          <div className="recent-strip-label">최근 정리</div>
          <div className="recent-strip-items">
            {history.slice(0, 5).map((entry) => (
              <div key={entry.id} className="recent-strip-item">
                <span className="recent-file-name">{entry.fileName}</span>
                <span className="recent-arrow">→</span>
                <span className="recent-folder">{entry.destPath.split('/').slice(-2).join('/')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unclassified */}
      {unclassified.length > 0 && (
        <UnclassifiedPanel files={unclassified} onAssign={handleAssignUnclassified} onSkipAll={() => setUnclassified([])} />
      )}

      {/* Toasts */}
      <ToastNotification toasts={toasts} />

      {/* Side panels */}
      <AnimatePresence>
        {showHistory && <HistoryList entries={history} onClose={() => setShowHistory(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showSettings && (
          <Settings store={store} onClose={() => setShowSettings(false)} onStoreUpdate={refreshStore} autoMove={autoMove} onAutoMoveChange={setAutoMove} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(showHistory || showSettings) && (
          <motion.div className="backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setShowHistory(false); setShowSettings(false); }} />
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
