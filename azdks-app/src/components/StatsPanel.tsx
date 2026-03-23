import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { type HistoryEntry } from '../store/historyStore';

interface StatsPanelProps {
  entries: HistoryEntry[];
  onClose: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  '스크린샷': '#7c3aed',
  '사진': '#06b6d4',
  '문서': '#3b82f6',
  '영상': '#ec4899',
  '음악': '#f59e0b',
  '디자인': '#10b981',
  '개발': '#6366f1',
  'SNS': '#f97316',
  '학업': '#84cc16',
  '게임': '#ef4444',
  '건강': '#14b8a6',
  '생활': '#a855f7',
  '쇼핑': '#fb923c',
  '기타': '#6b7280',
};

const DEFAULT_COLORS = [
  '#7c3aed', '#06b6d4', '#3b82f6', '#ec4899',
  '#f59e0b', '#10b981', '#6366f1', '#f97316',
];

function getEntryDate(entry: HistoryEntry): Date {
  if (entry.movedAt) {
    const d = new Date(entry.movedAt);
    if (!isNaN(d.getTime())) return d;
  }
  // Try extracting timestamp from UUID-like id (fallback: now)
  return new Date();
}

function extractTopCategory(category: string): string {
  // ~/AZDKS/스크린샷 → 스크린샷
  // ~/AZDKS/문서/Word → 문서
  const parts = category.replace(/^~\/AZDKS\//, '').split('/');
  return parts[0] || category;
}

function formatDateLabel(date: Date): string {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${m}/${d}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function StatsPanel({ entries, onClose }: StatsPanelProps) {
  const today = useMemo(() => new Date(), []);

  // 총 정리 파일 수
  const totalFiles = entries.length;

  // 오늘 정리한 파일 수
  const todayFiles = useMemo(
    () => entries.filter((e) => isSameDay(getEntryDate(e), today)).length,
    [entries, today],
  );

  // 가장 많이 사용한 폴더
  const topFolder = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of entries) {
      const cat = extractTopCategory(e.category);
      counts[cat] = (counts[cat] ?? 0) + 1;
    }
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] ?? '—';
  }, [entries]);

  // 카테고리 분포 (상위 8개)
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of entries) {
      const cat = extractTopCategory(e.category);
      counts[cat] = (counts[cat] ?? 0) + 1;
    }
    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
    const max = sorted[0]?.[1] ?? 1;
    return sorted.map(([cat, count], idx) => ({
      cat,
      count,
      pct: Math.round((count / totalFiles) * 100),
      barPct: Math.round((count / max) * 100),
      color: CATEGORY_COLORS[cat] ?? DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
    }));
  }, [entries, totalFiles]);

  // 최근 7일 활동
  const weekData = useMemo(() => {
    const days: { date: Date; label: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      days.push({ date: d, label: formatDateLabel(d), count: 0 });
    }
    for (const e of entries) {
      const ed = getEntryDate(e);
      for (const day of days) {
        if (isSameDay(ed, day.date)) {
          day.count++;
          break;
        }
      }
    }
    return days;
  }, [entries, today]);

  const weekMax = useMemo(() => Math.max(...weekData.map((d) => d.count), 1), [weekData]);

  return (
    <motion.div
      initial={{ x: -340, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -340, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 340, damping: 32 }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        width: 320,
        background: 'rgba(8, 6, 20, 0.96)',
        backdropFilter: 'blur(24px)',
        borderRight: '1px solid rgba(255,255,255,0.07)',
        zIndex: 500,
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 18px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 800,
              background: 'linear-gradient(90deg, #c4b5fd, #67e8f9)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            📊 통계
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2, letterSpacing: 1 }}>
            STATISTICS
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.04)',
            color: 'rgba(255,255,255,0.5)',
            cursor: 'pointer',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'inherit',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(124,58,237,0.25)';
            e.currentTarget.style.color = 'rgba(255,255,255,0.9)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
            e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
          }}
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: '16px 16px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Summary Cards */}
        <div style={{ display: 'flex', gap: 8 }}>
          <SummaryCard label="총 정리" value={String(totalFiles)} unit="개" color="#7c3aed" />
          <SummaryCard label="오늘" value={String(todayFiles)} unit="개" color="#06b6d4" />
          <SummaryCard label="인기 폴더" value={topFolder} unit="" color="#a855f7" small />
        </div>

        {/* Category Bar Chart */}
        <Section title="카테고리 분포">
          {categoryData.length === 0 ? (
            <EmptyMsg />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {categoryData.map((item, idx) => (
                <div key={item.cat}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 4,
                    }}
                  >
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>
                      {item.cat}
                    </span>
                    <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.38)' }}>
                      {item.count}개 ({item.pct}%)
                    </span>
                  </div>
                  <div
                    style={{
                      height: 6,
                      borderRadius: 3,
                      background: 'rgba(255,255,255,0.06)',
                      overflow: 'hidden',
                    }}
                  >
                    <AnimatePresence>
                      <motion.div
                        key={item.cat}
                        initial={{ width: 0 }}
                        animate={{ width: `${item.barPct}%` }}
                        transition={{ duration: 0.6, delay: idx * 0.06, ease: 'easeOut' }}
                        style={{
                          height: '100%',
                          borderRadius: 3,
                          background: item.color,
                          boxShadow: `0 0 8px ${item.color}66`,
                        }}
                      />
                    </AnimatePresence>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Weekly Activity */}
        <Section title="최근 7일 활동">
          {entries.length === 0 ? (
            <EmptyMsg />
          ) : (
            <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 72 }}>
              {weekData.map((day, idx) => {
                const barH = weekMax > 0 ? Math.max((day.count / weekMax) * 52, day.count > 0 ? 4 : 0) : 0;
                const isToday = isSameDay(day.date, today);
                return (
                  <div
                    key={idx}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                      justifyContent: 'flex-end',
                    }}
                  >
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>
                      {day.count > 0 ? day.count : ''}
                    </div>
                    <div
                      style={{
                        width: '100%',
                        borderRadius: 3,
                        background: 'rgba(255,255,255,0.06)',
                        height: 52,
                        display: 'flex',
                        alignItems: 'flex-end',
                        overflow: 'hidden',
                      }}
                    >
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: barH }}
                        transition={{ duration: 0.5, delay: idx * 0.05, ease: 'easeOut' }}
                        style={{
                          width: '100%',
                          borderRadius: 3,
                          background: isToday
                            ? 'linear-gradient(180deg, #a78bfa, #7c3aed)'
                            : 'linear-gradient(180deg, #67e8f9, #06b6d4)',
                          boxShadow: isToday
                            ? '0 0 8px rgba(167,139,250,0.5)'
                            : '0 0 6px rgba(6,182,212,0.3)',
                        }}
                      />
                    </div>
                    <div
                      style={{
                        fontSize: 9,
                        color: isToday ? '#c4b5fd' : 'rgba(255,255,255,0.3)',
                        fontWeight: isToday ? 700 : 500,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {day.label}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      </div>
    </motion.div>
  );
}

// ── Sub-components ──────────────────────────────────────────────

interface SummaryCardProps {
  label: string;
  value: string;
  unit: string;
  color: string;
  small?: boolean;
}

function SummaryCard({ label, value, unit, color, small }: SummaryCardProps) {
  return (
    <div
      style={{
        flex: 1,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 12,
        padding: '10px 8px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 3,
        boxShadow: `0 0 16px ${color}18`,
      }}
    >
      <div
        style={{
          fontSize: 9,
          fontWeight: 700,
          color: 'rgba(255,255,255,0.35)',
          letterSpacing: 0.8,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: small ? 12 : 20,
          fontWeight: 800,
          color,
          lineHeight: 1.1,
          textAlign: 'center',
          wordBreak: 'break-all',
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: small ? 'nowrap' : 'normal',
        }}
      >
        {value}
        {unit && (
          <span style={{ fontSize: small ? 9 : 11, fontWeight: 600, opacity: 0.7, marginLeft: 1 }}>
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        style={{
          fontSize: 9.5,
          fontWeight: 700,
          color: 'rgba(255,255,255,0.28)',
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          marginBottom: 10,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function EmptyMsg() {
  return (
    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', textAlign: 'center', padding: '12px 0' }}>
      아직 정리한 파일이 없어요
    </div>
  );
}
