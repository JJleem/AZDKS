export type ConfidenceLevel = 'auto' | 'confirm' | 'unknown';

export function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 0.9) return 'auto';
  if (confidence >= 0.6) return 'confirm';
  return 'unknown';
}

export function calcConfidence(
  hasRule: boolean,
  hasExtension: boolean,
  keywordBoost: number,
): number {
  if (hasRule) return 1.0;

  let base = 0.0;

  if (hasExtension) {
    base = 0.75;
  }

  const total = Math.min(1.0, base + keywordBoost);
  return parseFloat(total.toFixed(2));
}
