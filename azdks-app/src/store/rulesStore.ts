import { invoke } from '@tauri-apps/api/core';
import { v4 as uuidv4 } from 'uuid';

export interface Rule {
  id: string;
  pattern?: string;
  matchType?: 'glob' | 'exact';
  extensions?: string[];
  keywords?: string[];
  folder: string;
  confidence: number;
  usageCount: number;
  createdAt: string;
}

export interface RulesStore {
  version: number;
  rules: Rule[];
  defaultFolders: Record<string, string>;
}

const DEFAULT_RULES_STORE: RulesStore = {
  version: 1,
  rules: [],
  defaultFolders: {
    '홈':    '~/AZDKS',
    '이미지': '~/AZDKS/이미지',
    '문서':   '~/AZDKS/문서',
    '코드':   '~/AZDKS/코드',
    '영상':   '~/AZDKS/영상',
    '음악':   '~/AZDKS/음악',
    '압축':   '~/AZDKS/압축',
    '폰트':   '~/AZDKS/폰트',
    '미분류': '~/AZDKS/미분류',
  },
};

let _cache: RulesStore | null = null;

export async function loadRulesStore(): Promise<RulesStore> {
  try {
    const data = await invoke<RulesStore>('load_rules');
    const merged = { ...DEFAULT_RULES_STORE, ...data };
    // 옛날 분산 경로 → ~/AZDKS/ 자동 마이그레이션
    merged.defaultFolders = migrateDefaultFolders(merged.defaultFolders);
    _cache = merged;
    return _cache;
  } catch {
    _cache = { ...DEFAULT_RULES_STORE };
    return _cache;
  }
}

// ~/Pictures/AZDKS, ~/Documents/AZDKS 등 옛 경로 → ~/AZDKS 으로 통합
function migrateDefaultFolders(folders: Record<string, string>): Record<string, string> {
  const OLD_PREFIXES = [
    '~/Pictures/AZDKS', '~/Documents/AZDKS', '~/Movies/AZDKS',
    '~/Music/AZDKS', '~/Downloads/AZDKS', '~/Library/Fonts/AZDKS',
  ];
  const migrated: Record<string, string> = {};
  for (const [key, val] of Object.entries(folders)) {
    const isOld = OLD_PREFIXES.some((p) => val.startsWith(p));
    if (isOld) {
      // ~/X/AZDKS/Y → ~/AZDKS/Y
      const match = val.match(/~\/[^/]+\/AZDKS(.*)/);
      migrated[key] = match ? `~/AZDKS${match[1]}` : val;
    } else {
      migrated[key] = val;
    }
  }
  // 홈 키가 없으면 추가
  if (!migrated['홈']) migrated['홈'] = '~/AZDKS';
  return migrated;
}

export async function saveRulesStore(store: RulesStore): Promise<void> {
  _cache = store;
  await invoke('save_rules', { rules: store });
}

export function getCachedRulesStore(): RulesStore {
  return _cache ?? DEFAULT_RULES_STORE;
}

export async function addRule(rule: Omit<Rule, 'id' | 'createdAt' | 'usageCount'>): Promise<void> {
  const store = _cache ?? (await loadRulesStore());
  const newRule: Rule = {
    ...rule,
    id: uuidv4(),
    usageCount: 0,
    createdAt: new Date().toISOString(),
  };
  store.rules.unshift(newRule);
  await saveRulesStore(store);
}

export async function incrementRuleUsage(ruleId: string): Promise<void> {
  const store = _cache ?? (await loadRulesStore());
  const rule = store.rules.find((r) => r.id === ruleId);
  if (rule) {
    rule.usageCount += 1;
    await saveRulesStore(store);
  }
}

export async function deleteRule(ruleId: string): Promise<void> {
  const store = _cache ?? (await loadRulesStore());
  store.rules = store.rules.filter((r) => r.id !== ruleId);
  await saveRulesStore(store);
}

export async function updateDefaultFolders(folders: Record<string, string>): Promise<void> {
  const store = _cache ?? (await loadRulesStore());
  store.defaultFolders = { ...store.defaultFolders, ...folders };
  await saveRulesStore(store);
}
