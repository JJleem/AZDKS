/**
 * Glob pattern matching for file names
 * Supports: * (any chars), ? (single char), ** (not used at name level)
 */
export function matchGlob(pattern: string, filename: string): boolean {
  const regexStr = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // escape regex special chars
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  const regex = new RegExp(`^${regexStr}$`, 'i');
  return regex.test(filename);
}

export function matchesAnyPattern(patterns: string[], filename: string): boolean {
  return patterns.some((p) => matchGlob(p, filename));
}
