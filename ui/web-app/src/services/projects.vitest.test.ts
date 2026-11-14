import { beforeEach, describe, expect, it } from 'vitest';
import { projectService } from './projects.ts';

class MemoryStorage {
  private data = new Map<string, string>();
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, value); }
  removeItem(key: string) { this.data.delete(key); }
  clear() { this.data.clear(); }
}

beforeEach(() => {
  (globalThis as any).localStorage = new MemoryStorage();
});

describe('projectService local mode', () => {
  it('creates, lists, updates and removes local projects', async () => {
    const created = await projectService.create(null, 'Customer portal', 'Phase 1');
    expect(created.ownerId).toBe('local');
    expect(created.name).toBe('Customer portal');

    const listed = await projectService.list(null);
    expect(listed).toHaveLength(1);
    expect(listed[0].id).toBe(created.id);

    const updated = await projectService.update(null, created.id, { name: 'Customer portal v2' });
    expect(updated.name).toBe('Customer portal v2');

    await projectService.remove(null, created.id);
    expect(await projectService.list(null)).toHaveLength(0);
  });

  it('rejects empty names', async () => {
    await expect(projectService.create(null, '   ')).rejects.toThrow('Project name is required.');
  });
});
