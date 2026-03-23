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
    '홈': '~/Downloads/AZDKS',          // 의도 기반 분류의 루트
    '이미지': '~/Downloads/AZDKS/이미지', // 키워드 없는 순수 이미지
    '문서': '~/Downloads/AZDKS/문서',
    '코드': '~/Downloads/AZDKS/코드',
    '영상': '~/Downloads/AZDKS/영상',
    '음악': '~/Downloads/AZDKS/음악',
    '압축': '~/Downloads/AZDKS/압축',
    '폰트': '~/Downloads/AZDKS/폰트',
    '미분류': '~/Downloads/AZDKS/미분류',
  },
};

let _cache: RulesStore | null = null;

export async function loadRulesStore(): Promise<RulesStore> {
  try {
    const data = await invoke<RulesStore>('load_rules');
    _cache = { ...DEFAULT_RULES_STORE, ...data };
    return _cache;
  } catch {
    _cache = { ...DEFAULT_RULES_STORE };
    return _cache;
  }
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
