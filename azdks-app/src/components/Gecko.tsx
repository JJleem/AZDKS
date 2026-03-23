import { motion, AnimatePresence, type Easing } from 'framer-motion';
import { useEffect, useState } from 'react';

export type GeckoState = 'idle' | 'hover' | 'eating' | 'happy' | 'confused';

interface GeckoProps {
  state: GeckoState;
}

// ── 파티클 (우주 테마: 보라/시안) ──
function Particle({ x, y, delay, color }: { x: number; y: number; delay: number; color: string }) {
  return (
    <motion.div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: color,
        boxShadow: `0 0 8px ${color}`,
        pointerEvents: 'none',
        zIndex: 10,
      }}
      initial={{ scale: 0, opacity: 1 }}
      animate={{ scale: [0, 1.4, 0], opacity: [1, 0.8, 0], y: [0, -45] }}
      transition={{ duration: 0.75, delay, ease: 'easeOut' }}
    />
  );
}

const PARTICLE_POSITIONS = [
  { x: -55, y: -25, color: '#a78bfa' },
  { x: 55,  y: -35, color: '#22d3ee' },
  { x: -30, y: 25,  color: '#e879f9' },
  { x: 65,  y: 10,  color: '#a78bfa' },
  { x: 0,   y: -55, color: '#22d3ee' },
  { x: -60, y: -5,  color: '#c4b5fd' },
  { x: 38,  y: -18, color: '#e879f9' },
  { x: -18, y: 42,  color: '#a78bfa' },
];

// ── 슬라임 눈 ──
type EyeStyle = 'normal' | 'squint' | 'happy' | 'wide' | 'dizzy';

function SlimeEye({ cx, cy, style }: { cx: number; cy: number; style: EyeStyle }) {
  if (style === 'happy') {
    // ^ 모양 초승달 눈
    return (
      <path
        d={`M ${cx - 10} ${cy + 3} Q ${cx} ${cy - 10} ${cx + 10} ${cy + 3}`}
        stroke="#1a0040"
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
      />
    );
  }
  if (style === 'squint') {
    // 먹는 중: 가로선 눈
    return (
      <line
        x1={cx - 9} y1={cy}
        x2={cx + 9} y2={cy}
        stroke="#1a0040"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    );
  }
  if (style === 'dizzy') {
    // confused: 소용돌이 대신 x 눈
    return (
      <g>
        <line x1={cx - 7} y1={cy - 7} x2={cx + 7} y2={cy + 7} stroke="#1a0040" strokeWidth="3" strokeLinecap="round" />
        <line x1={cx + 7} y1={cy - 7} x2={cx - 7} y2={cy + 7} stroke="#1a0040" strokeWidth="3" strokeLinecap="round" />
      </g>
    );
  }
  if (style === 'wide') {
    // hover: 눈 더 크게
    return (
      <g>
        <circle cx={cx} cy={cy} r={12} fill="white" />
        <circle cx={cx + 2} cy={cy + 2} r={7} fill="#1a0040" />
        <circle cx={cx + 4} cy={cy - 2} r={2.5} fill="white" />
      </g>
    );
  }
  // normal
  return (
    <g>
      <circle cx={cx} cy={cy} r={10} fill="white" />
      <circle cx={cx + 1.5} cy={cy + 1.5} r={6} fill="#1a0040" />
      <circle cx={cx + 4} cy={cy - 1} r={2} fill="white" />
    </g>
  );
}

// ── 슬라임 본체 SVG ──
function SlimeSVG({ state }: { state: GeckoState }) {
  const eyeStyle: EyeStyle =
    state === 'happy'   ? 'happy'  :
    state === 'eating'  ? 'squint' :
    state === 'confused'? 'dizzy'  :
    state === 'hover'   ? 'wide'   : 'normal';

  // 상태별 색상
  const bodyColor =
    state === 'eating'  ? '#6d28d9' :
    state === 'happy'   ? '#8b5cf6' :
    state === 'confused'? '#5b21b6' : '#7c3aed';

  const shadowColor =
    state === 'happy'   ? '#a855f7' :
    state === 'confused'? '#4c1d95' : '#6d28d9';

  const glowColor =
    state === 'happy'  ? 'rgba(167,139,250,0.7)' :
    state === 'eating' ? 'rgba(109,40,217,0.5)'  : 'rgba(124,58,237,0.45)';

  // 상태별 입 경로
  const mouthPath =
    state === 'happy'
      ? 'M 70 122 Q 90 142 110 122'       // 큰 웃음
    : state === 'eating'
      ? undefined                           // eating은 원형 입
    : state === 'confused'
      ? 'M 74 122 Q 82 115 90 122 Q 98 129 106 122' // 물결 입
    : 'M 76 120 Q 90 130 104 120';         // 기본 미소

  return (
    <svg viewBox="0 0 180 195" width="170" height="170" style={{ overflow: 'visible' }}>
      <defs>
        {/* 슬라임 발광 필터 */}
        <filter id="slimeGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* 외곽 네온 글로우 */}
        <filter id="outerGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="10" result="blur" in="SourceGraphic" />
        </filter>
      </defs>

      {/* 네온 외곽 글로우 */}
      <ellipse cx="90" cy="100" rx="72" ry="68"
        fill={glowColor}
        filter="url(#outerGlow)"
        opacity="0.6"
      />

      {/* 슬라임 몸통 */}
      <path
        d="M90,28 C132,28 158,58 158,97 C158,136 142,162 112,172 C104,176 76,176 68,172 C38,162 22,136 22,97 C22,58 48,28 90,28 Z"
        fill={bodyColor}
        filter="url(#slimeGlow)"
      />

      {/* 하단 다리 뭉치 */}
      <ellipse cx="68"  cy="169" rx="19" ry="11" fill={shadowColor} />
      <ellipse cx="112" cy="169" rx="19" ry="11" fill={shadowColor} />

      {/* 하이라이트 */}
      <ellipse
        cx="65" cy="58" rx="22" ry="14"
        fill="rgba(255,255,255,0.18)"
        transform="rotate(-20,65,58)"
      />

      {/* 눈 */}
      <SlimeEye cx={72} cy={96} style={eyeStyle} />
      <SlimeEye cx={108} cy={96} style={eyeStyle} />

      {/* 입 */}
      {state === 'eating' ? (
        // 냠냠: 큰 원형 입
        <circle cx="90" cy="126" r="14"
          fill="#1a0040"
          stroke={shadowColor} strokeWidth="2"
        />
      ) : mouthPath ? (
        <path
          d={mouthPath}
          stroke="#1a0040"
          strokeWidth="3.5"
          fill="none"
          strokeLinecap="round"
        />
      ) : null}

      {/* confused: 땀방울 */}
      {state === 'confused' && (
        <g>
          <ellipse cx="128" cy="72" rx="5" ry="8" fill="#60a5fa" opacity="0.8" />
          <ellipse cx="128" cy="67" rx="3" ry="3" fill="#60a5fa" opacity="0.8" />
        </g>
      )}

      {/* happy: 볼 홍조 */}
      {state === 'happy' && (
        <>
          <ellipse cx="58"  cy="115" rx="12" ry="7" fill="rgba(251,113,133,0.35)" />
          <ellipse cx="122" cy="115" rx="12" ry="7" fill="rgba(251,113,133,0.35)" />
        </>
      )}
    </svg>
  );
}

// ── 메인 컴포넌트 ──
export function Gecko({ state }: GeckoProps) {
  const [showParticles, setShowParticles] = useState(false);
  const [particleKey, setParticleKey] = useState(0);

  useEffect(() => {
    if (state === 'happy') {
      setParticleKey((k) => k + 1);
      setShowParticles(true);
      const t = setTimeout(() => setShowParticles(false), 900);
      return () => clearTimeout(t);
    }
  }, [state]);

  const easeInOut: Easing = 'easeInOut';
  const easeOut: Easing   = 'easeOut';

  const animations = {
    idle: {
      y: [0, -10, 0] as number[],
      transition: { duration: 3.2, repeat: Infinity, ease: easeInOut },
    },
    hover: {
      scale: 1.08,
      y: [0, -13, 0] as number[],
      transition: {
        scale: { duration: 0.2 },
        y: { duration: 2.4, repeat: Infinity, ease: easeInOut },
      },
    },
    eating: {
      rotate: [-6, 6, -6, 6, 0] as number[],
      scale:  [1, 1.06, 1, 1.06, 1] as number[],
      transition: { duration: 0.35, repeat: Infinity, ease: easeInOut },
    },
    happy: {
      y: [0, -22, 0, -16, 0] as number[],
      scale: [1, 1.12, 1.04, 1.12, 1] as number[],
      transition: { duration: 0.55, repeat: 2, ease: easeOut },
    },
    confused: {
      rotate: [-9, 9, -9, 0] as number[],
      transition: { duration: 1.6, repeat: Infinity, ease: easeInOut },
    },
  };

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

      {/* 파티클 */}
      <AnimatePresence>
        {showParticles &&
          PARTICLE_POSITIONS.map((p, i) => (
            <Particle
              key={`${particleKey}-${i}`}
              x={p.x + 85} y={p.y + 85}
              delay={i * 0.07}
              color={p.color}
            />
          ))}
      </AnimatePresence>

      {/* hover 시 링 글로우 */}
      {state === 'hover' && (
        <motion.div
          style={{
            position: 'absolute',
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(124,58,237,0.2) 0%, transparent 70%)',
            border: '1.5px solid rgba(168,85,247,0.3)',
          }}
          animate={{ scale: [1, 1.12, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.4, repeat: Infinity }}
        />
      )}

      {/* eating 시 빨려드는 이펙트 */}
      {state === 'eating' && (
        <motion.div
          style={{
            position: 'absolute',
            top: -10,
            width: 50,
            height: 50,
            borderRadius: '50%',
            border: '2px solid rgba(34,211,238,0.5)',
            boxShadow: '0 0 16px rgba(34,211,238,0.4)',
          }}
          animate={{ scale: [1.2, 0.1], opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity, ease: easeInOut }}
        />
      )}

      {/* 슬라임 본체 */}
      <motion.div
        key={state}
        animate={animations[state]}
        initial={{ opacity: 0, scale: 0.88 }}
        whileInView={{ opacity: 1, scale: 1 }}
        transition={{ opacity: { duration: 0.18 }, scale: { duration: 0.18 } }}
        style={{ position: 'relative', zIndex: 1 }}
      >
        <SlimeSVG state={state} />
      </motion.div>

      {/* confused 물음표 */}
      {state === 'confused' && (
        <motion.div
          style={{ position: 'absolute', top: -18, right: 8, fontSize: 24, zIndex: 2 }}
          animate={{ y: [-4, -14, -4], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          ❓
        </motion.div>
      )}
    </div>
  );
}
