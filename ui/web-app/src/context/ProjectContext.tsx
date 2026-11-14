import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Project } from '../types/projects.ts';
import { projectService } from '../services/projects.ts';
import { useAuth } from './AuthContext.tsx';

interface ProjectContextValue {
  projects: Project[];
  currentProject: Project | null;
  loading: boolean;
  error: string | null;
  selectProject: (projectId: string) => void;
  createProject: (name: string, description?: string) => Promise<Project>;
  updateProject: (projectId: string, patch: { name?: string; description?: string }) => Promise<Project>;
  deleteProject: (projectId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

function currentKey(userId: string | null): string {
  return `vector_current_project_${userId || 'local'}`;
}

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userId = user?.id ?? null;
  const storageKey = currentKey(userId);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await projectService.list(userId);
      setProjects(list);
      let saved: string | null = null;
      try {
        saved = localStorage.getItem(storageKey);
      } catch {
        saved = null;
      }
      const next = list.find((project) => project.id === saved)?.id || list[0]?.id || null;
      setCurrentId(next);
      try {
        if (next) localStorage.setItem(storageKey, next);
      } catch {
        // ignore
      }
    } catch (e: any) {
      setError(e?.message || 'Could not load projects.');
    } finally {
      setLoading(false);
    }
  }, [userId, storageKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectProject = useCallback(
    (projectId: string) => {
      if (!projects.some((project) => project.id === projectId)) return;
      setCurrentId(projectId);
      try {
        localStorage.setItem(storageKey, projectId);
      } catch {
        // ignore
      }
    },
    [projects, storageKey]
  );

  const createProject = useCallback(
    async (name: string, description = '') => {
      const project = await projectService.create(userId, name, description);
      setProjects((prev) => [project, ...prev]);
      setCurrentId(project.id);
      try {
        localStorage.setItem(storageKey, project.id);
      } catch {
        // ignore
      }
      return project;
    },
    [userId, storageKey]
  );

  const updateProject = useCallback(
    async (projectId: string, patch: { name?: string; description?: string }) => {
      const project = await projectService.update(userId, projectId, patch);
      setProjects((prev) => prev.map((item) => (item.id === project.id ? project : item)));
      return project;
    },
    [userId]
  );

  const deleteProject = useCallback(
    async (projectId: string) => {
      await projectService.remove(userId, projectId);
      const next = projects.filter((project) => project.id !== projectId);
      setProjects(next);
      if (currentId === projectId) {
        const fallback = next[0]?.id || null;
        setCurrentId(fallback);
        try {
          if (fallback) localStorage.setItem(storageKey, fallback);
          else localStorage.removeItem(storageKey);
        } catch {
          // ignore
        }
      }
    },
    [userId, currentId, storageKey, projects]
  );

  const currentProject = useMemo(
    () => projects.find((project) => project.id === currentId) || null,
    [projects, currentId]
  );

  const value = useMemo<ProjectContextValue>(
    () => ({
      projects,
      currentProject,
      loading,
      error,
      selectProject,
      createProject,
      updateProject,
      deleteProject,
      refresh: load,
    }),
    [projects, currentProject, loading, error, selectProject, createProject, updateProject, deleteProject, load]
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};

export function useProject(): ProjectContextValue {
  const value = useContext(ProjectContext);
  if (!value) throw new Error('useProject must be used inside ProjectProvider.');
  return value;
}
