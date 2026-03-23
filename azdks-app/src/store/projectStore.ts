import { invoke } from '@tauri-apps/api/core';

export interface Project {
  id: string;
  name: string;
  folder: string;      // e.g. ~/AZDKS/AZDKS프로젝트
  keywords: string[];  // e.g. ['azdks', '알잘딱']
  color: string;       // hex color
  fileCount: number;
  createdAt: string;
}

export interface ProjectStore {
  projects: Project[];
}

const PROJECT_COLORS = [
  '#7c3aed','#06b6d4','#ec4899','#f59e0b','#10b981',
  '#6366f1','#f97316','#84cc16','#ef4444','#a855f7',
];

let cache: ProjectStore = { projects: [] };

export function getCachedProjectStore(): ProjectStore { return cache; }

// Projects are stored as a key inside the rules store object
export async function loadProjectStore(): Promise<ProjectStore> {
  try {
    const raw = await invoke<Record<string, unknown>>('load_rules');
    const projects = (raw['projects'] as Project[] | undefined) ?? [];
    cache = { projects };
  } catch {
    cache = { projects: [] };
  }
  return cache;
}

async function save(store: ProjectStore): Promise<void> {
  cache = store;
  // Merge projects into the existing rules store
  let existing: Record<string, unknown> = {};
  try {
    existing = await invoke<Record<string, unknown>>('load_rules');
  } catch {
    existing = {};
  }
  const merged = { ...existing, projects: store.projects };
  await invoke('save_rules', { rules: merged });
}

export async function addProject(name: string, folder: string, keywords: string[]): Promise<Project> {
  const store = getCachedProjectStore();
  const color = PROJECT_COLORS[store.projects.length % PROJECT_COLORS.length];
  const project: Project = {
    id: crypto.randomUUID(),
    name, folder,
    keywords: keywords.map(k => k.toLowerCase()),
    color,
    fileCount: 0,
    createdAt: new Date().toISOString(),
  };
  await save({ projects: [...store.projects, project] });
  return project;
}

export async function addKeywordsToProject(projectId: string, newKeywords: string[]): Promise<void> {
  const store = getCachedProjectStore();
  const updated = store.projects.map(p => {
    if (p.id !== projectId) return p;
    const merged = Array.from(new Set([...p.keywords, ...newKeywords.map(k => k.toLowerCase())]));
    return { ...p, keywords: merged };
  });
  await save({ projects: updated });
}

export async function incrementProjectFileCount(projectId: string): Promise<void> {
  const store = getCachedProjectStore();
  const updated = store.projects.map(p =>
    p.id === projectId ? { ...p, fileCount: p.fileCount + 1 } : p
  );
  await save({ projects: updated });
}

export async function deleteProject(projectId: string): Promise<void> {
  const store = getCachedProjectStore();
  await save({ projects: store.projects.filter(p => p.id !== projectId) });
}

// 파일명에서 키워드 추출
const NOISE = new Set([
  'img','image','photo','file','new','copy','final','draft','backup','temp','tmp',
  'v1','v2','v3','v4','v5','v6','v7','v8','v9','v10',
  '2023','2024','2025','2026','jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec',
  'jpg','png','pdf','ppt','pptx','doc','docx','xls','xlsx','mp4','mov','zip','gif',
  'screen','screenshot','capture','untitled','noname',
]);

export function extractKeywordsFromFilename(filename: string): string[] {
  const stem = filename.replace(/\.[^.]+$/, '');
  const tokens = stem.split(/[_\-\s.]+/);
  return tokens
    .map(t => t.toLowerCase())
    .filter(t => t.length >= 3 && !NOISE.has(t) && !/^\d+$/.test(t))
    .slice(0, 4);
}

// 파일명 → 매칭 프로젝트 찾기
export function findMatchingProject(filename: string, projects: Project[]): Project | null {
  const fileKeywords = extractKeywordsFromFilename(filename);
  if (fileKeywords.length === 0) return null;

  for (const project of projects) {
    for (const pk of project.keywords) {
      for (const fk of fileKeywords) {
        if (fk === pk || fk.startsWith(pk) || pk.startsWith(fk)) {
          return project;
        }
      }
    }
  }
  return null;
}
