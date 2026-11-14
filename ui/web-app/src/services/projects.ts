import type { Project, ProjectStatus } from '../types/projects.ts';
import { supabase } from './supabase/client.ts';

const LOCAL_KEY = 'vector_projects_v1';

interface ProjectRow {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

function fromRow(row: ProjectRow): Project {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    description: row.description || '',
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function readLocal(): Project[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocal(projects: Project[]): void {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(projects));
  } catch {
    // Local mode is best-effort.
  }
}

export const projectService = {
  async list(userId: string | null): Promise<Project[]> {
    if (!supabase || !userId) return readLocal();
    const { data, error } = await supabase
      .from('projects')
      .select('id, owner_id, name, description, status, created_at, updated_at')
      .order('updated_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map((row) => fromRow(row as ProjectRow));
  },

  async create(userId: string | null, name: string, description = ''): Promise<Project> {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Project name is required.');
    if (!supabase || !userId) {
      const now = new Date().toISOString();
      const project: Project = {
        id: crypto.randomUUID(),
        ownerId: 'local',
        name: trimmed,
        description: description.trim(),
        status: 'active',
        createdAt: now,
        updatedAt: now,
      };
      const projects = [project, ...readLocal()];
      writeLocal(projects);
      return project;
    }
    const { data, error } = await supabase
      .from('projects')
      .insert({ owner_id: userId, name: trimmed, description: description.trim() })
      .select('id, owner_id, name, description, status, created_at, updated_at')
      .single();
    if (error) throw new Error(error.message);
    return fromRow(data as ProjectRow);
  },

  async update(userId: string | null, projectId: string, patch: { name?: string; description?: string; status?: ProjectStatus }): Promise<Project> {
    if (!supabase || !userId) {
      const projects = readLocal();
      const index = projects.findIndex((project) => project.id === projectId);
      if (index < 0) throw new Error('Project not found.');
      const next: Project = {
        ...projects[index],
        ...patch,
        name: patch.name?.trim() || projects[index].name,
        updatedAt: new Date().toISOString(),
      };
      projects[index] = next;
      writeLocal(projects);
      return next;
    }
    const { data, error } = await supabase
      .from('projects')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', projectId)
      .select('id, owner_id, name, description, status, created_at, updated_at')
      .single();
    if (error) throw new Error(error.message);
    return fromRow(data as ProjectRow);
  },

  async remove(userId: string | null, projectId: string): Promise<void> {
    if (!supabase || !userId) {
      writeLocal(readLocal().filter((project) => project.id !== projectId));
      return;
    }
    const { error } = await supabase.from('projects').delete().eq('id', projectId);
    if (error) throw new Error(error.message);
  },
};
