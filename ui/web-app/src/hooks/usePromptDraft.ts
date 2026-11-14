import { useCallback, useEffect, useRef, useState } from 'react';
import { loadProjectMemory, removeProjectMemory, saveProjectMemory } from '../services/projectMemory.ts';

export interface PromptDraftRecord {
  text: string;
  updatedAt: string;
}

const MEMORY_KEY = 'prompt_draft';
const LOCAL_PREFIX = 'vector_prompt_draft_';

function localKey(projectId: string): string {
  return `${LOCAL_PREFIX}${projectId}`;
}

function readLocal(projectId: string): PromptDraftRecord | null {
  try {
    const raw = localStorage.getItem(localKey(projectId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PromptDraftRecord;
    return typeof parsed?.text === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

function writeLocal(projectId: string, text: string | null): void {
  try {
    if (text === null) localStorage.removeItem(localKey(projectId));
    else localStorage.setItem(localKey(projectId), JSON.stringify({ text, updatedAt: new Date().toISOString() }));
  } catch {
    // Local cache is best-effort.
  }
}

function newer(a: PromptDraftRecord | null, b: PromptDraftRecord | null): PromptDraftRecord | null {
  if (!a) return b;
  if (!b) return a;
  return new Date(a.updatedAt).getTime() >= new Date(b.updatedAt).getTime() ? a : b;
}

/**
 * One editable prompt draft per project, shared by Specification & Prompt and
 * the Bolt workspace. Edits are cached locally and synced to project memory.
 */
export function usePromptDraft(projectId?: string) {
  const [draft, setDraftState] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const latest = useRef<{ projectId?: string; draft: string | null }>({ projectId, draft: null });

  useEffect(() => {
    latest.current = { projectId, draft };
  }, [projectId, draft]);

  useEffect(() => {
    let cancelled = false;
    setDraftState(null);
    setLoaded(false);
    if (!projectId) {
      setLoaded(true);
      return;
    }
    (async () => {
      const local = readLocal(projectId);
      const remote = await loadProjectMemory<PromptDraftRecord | null>(projectId, MEMORY_KEY, null).catch(() => null);
      const selected = newer(local, remote);
      if (!cancelled) {
        setDraftState(selected?.text ?? null);
        setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    if (!loaded || !projectId) return;
    const timer = window.setTimeout(() => {
      if (draft === null) {
        writeLocal(projectId, null);
        void removeProjectMemory(projectId, MEMORY_KEY).catch(() => undefined);
      } else {
        writeLocal(projectId, draft);
        void saveProjectMemory<PromptDraftRecord>(
          projectId,
          MEMORY_KEY,
          { text: draft, updatedAt: new Date().toISOString() },
        ).catch(() => undefined);
      }
    }, 700);
    return () => {
      window.clearTimeout(timer);
      writeLocal(projectId, draft);
    };
  }, [draft, loaded, projectId]);

  useEffect(
    () => () => {
      const { projectId: currentProject, draft: currentDraft } = latest.current;
      if (currentProject && currentDraft !== null) writeLocal(currentProject, currentDraft);
    },
    [],
  );

  const setDraft = useCallback((text: string) => {
    setDraftState(text);
  }, []);

  const resetDraft = useCallback(async () => {
    setDraftState(null);
    if (projectId) {
      writeLocal(projectId, null);
      await removeProjectMemory(projectId, MEMORY_KEY).catch(() => undefined);
    }
  }, [projectId]);

  return { draft, loaded, setDraft, resetDraft };
}
