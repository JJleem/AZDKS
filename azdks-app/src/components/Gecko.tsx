import { motion, AnimatePresence, type Easing } from 'framer-motion';
import { useEffect, useState } from 'react';

export type GeckoState = 'idle' | 'hover' | 'eating' | 'happy' | 'confused';

const geckoImages: Record<GeckoState, string> = {
  idle: '/character/idle.png',
  hover: '/character/idle.png',
  eating: '/character/eating.png',
  happy: '/character/happy.png',
  confused: '/character/confused.png',
};

interface GeckoProps {
  state: GeckoState;
}

// Sparkle particle
function Sparkle({ x, y, delay }: { x: number; y: number; delay: number }) {
  return (
    <motion.div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: 'radial-gradient(circle, #ffe066, #ffb300)',
        pointerEvents: 'none',
        zIndex: 10,
      }}
      initial={{ scale: 0, opacity: 1 }}
      animate={{ scale: [0, 1.5, 0], opacity: [1, 1, 0], y: [0, -40] }}
      transition={{ duration: 0.7, delay, ease: 'easeOut' }}
    />
  );
}

const SPARKLE_POSITIONS = [
  { x: -50, y: -30 }, { x: 50, y: -40 }, { x: -30, y: 20 },
  { x: 60, y: 10 }, { x: 0, y: -60 }, { x: -60, y: -10 },
  { x: 40, y: -20 }, { x: -20, y: 40 },
];

export function Gecko({ state }: GeckoProps) {
  const [showSparkles, setShowSparkles] = useState(false);
  const [sparkleKey, setSparkleKey] = useState(0);

  useEffect(() => {
    if (state === 'happy') {
      setSparkleKey((k) => k + 1);
      setShowSparkles(true);
      const t = setTimeout(() => setShowSparkles(false), 800);
      return () => clearTimeout(t);
    }
  }, [state]);

  const easeInOut: Easing = 'easeInOut';
  const easeOut: Easing = 'easeOut';

  const idleAnimation = {
    y: [0, -10, 0] as number[],
    transition: { duration: 3, repeat: Infinity, ease: easeInOut },
  };

  const hoverAnimation = {
    scale: 1.1,
    y: [0, -12, 0] as number[],
    transition: {
      scale: { duration: 0.2 },
      y: { duration: 2.5, repeat: Infinity, ease: easeInOut },
    },
  };

  const eatingAnimation = {
    rotate: [-5, 5, -5, 5, 0] as number[],
    scale: [1, 1.05, 1, 1.05, 1] as number[],
    transition: { duration: 0.4, repeat: Infinity, ease: easeInOut },
  };

  const happyAnimation = {
    y: [0, -20, 0, -15, 0] as number[],
    scale: [1, 1.1, 1.05, 1.1, 1] as number[],
    transition: { duration: 0.6, repeat: 2, ease: easeOut },
  };

  const confusedAnimation = {
    rotate: [-8, 8, -8, 0] as number[],
    transition: { duration: 1.5, repeat: Infinity, ease: easeInOut },
  };

  const getAnimation = () => {
    switch (state) {
      case 'hover': return hoverAnimation;
      case 'eating': return eatingAnimation;
      case 'happy': return happyAnimation;
      case 'confused': return confusedAnimation;
      default: return idleAnimation;
    }
  };

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Sparkles */}
      <AnimatePresence>
        {showSparkles &&
          SPARKLE_POSITIONS.map((pos, i) => (
            <Sparkle key={`${sparkleKey}-${i}`} x={pos.x + 90} y={pos.y + 90} delay={i * 0.07} />
          ))}
      </AnimatePresence>

      {/* Drop target glow */}
      {state === 'hover' && (
        <motion.div
          style={{
            position: 'absolute',
            width: 220,
            height: 220,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99,179,237,0.25) 0%, transparent 70%)',
            zIndex: 0,
          }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
      )}

      <motion.img
        key={state}
        src={geckoImages[state]}
        alt="꼬미"
        style={{
          width: 180,
          height: 180,
          objectFit: 'contain',
          position: 'relative',
          zIndex: 1,
          filter: state === 'happy' ? 'drop-shadow(0 0 12px rgba(255,200,0,0.6))' : 'none',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
        animate={getAnimation()}
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        transition={{ opacity: { duration: 0.15 }, scale: { duration: 0.15 } }}
        draggable={false}
      />

      {/* Confused question marks */}
      {state === 'confused' && (
        <motion.div
          style={{
            position: 'absolute',
            top: -20,
            right: 10,
            fontSize: 28,
            zIndex: 2,
          }}
          animate={{ y: [-5, -15, -5], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          ❓
        </motion.div>
      )}
    </div>
  );
}
