import { motion } from 'framer-motion';
import { MODES, type ClassificationMode } from '../engine/classificationMode';
import './ModeSelector.css';

interface ModeSelectorProps {
  mode: ClassificationMode;
  onChange: (mode: ClassificationMode) => void;
}

export function ModeSelector({ mode, onChange }: ModeSelectorProps) {
  return (
    <div className="mode-selector">
      <div className="mode-selector-label">정리 방식</div>
      <div className="mode-selector-tabs">
        {MODES.map((m) => (
          <button
            key={m.id}
            className={`mode-tab ${mode === m.id ? 'active' : ''}`}
            onClick={() => onChange(m.id)}
            title={m.description}
          >
            <motion.span
              className="mode-tab-inner"
              animate={mode === m.id ? { scale: 1.05 } : { scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              <span className="mode-emoji">{m.emoji}</span>
              <span className="mode-label">{m.label}</span>
            </motion.span>
            {mode === m.id && (
              <motion.div
                className="mode-active-indicator"
                layoutId="mode-indicator"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>
      <div className="mode-desc">
        {MODES.find((m) => m.id === mode)?.description}
      </div>
    </div>
  );
}
