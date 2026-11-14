import type { AnalysisResult, RiskLevel } from '../types/analysis.ts';

const STORAGE_KEY = 'prompt_linter_history_v1';

/**
 * Local analysis history.
 *
 * Records are project-scoped: an analysis is only listed for the project it was
 * run in. Older records without a project stay visible through the explicit
 * "assign legacy records" action instead of leaking into every project.
 */
class HistoryStorageService {
  private inMemoryItems: AnalysisResult[] = [];

  private isStorageAvailable(): boolean {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return false;
      const testKey = '__storage_test__';
      window.localStorage.setItem(testKey, testKey);
      window.localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  private readAll(): AnalysisResult[] {
    if (this.isStorageAvailable()) {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      try {
        return JSON.parse(raw) as AnalysisResult[];
      } catch {
        return [];
      }
    }
    return [...this.inMemoryItems];
  }

  getAll(projectId?: string): AnalysisResult[] {
    const items = this.readAll();
    if (!projectId) return items;
    return items.filter((item) => item.projectId === projectId);
  }

  getUnscoped(): AnalysisResult[] {
    return this.readAll().filter((item) => !item.projectId);
  }

  save(result: AnalysisResult): void {
    const items = this.readAll();
    const filtered = items.filter((item) => item.id !== result.id);
    this.saveAll([result, ...filtered]);
  }

  delete(id: string): void {
    this.saveAll(this.readAll().filter((item) => item.id !== id));
  }

  clear(projectId?: string): void {
    if (!projectId) {
      this.saveAll([]);
      return;
    }
    this.saveAll(this.readAll().filter((item) => item.projectId !== projectId));
  }

  /** Attach legacy, project-less records to a project. */
  assignProject(projectId: string): number {
    let assigned = 0;
    const next = this.readAll().map((item) => {
      if (item.projectId) return item;
      assigned += 1;
      return { ...item, projectId };
    });
    if (assigned) this.saveAll(next);
    return assigned;
  }

  private saveAll(items: AnalysisResult[]): void {
    if (this.isStorageAvailable()) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      } catch (e) {
        console.warn('Failed to persist history to localStorage', e);
      }
    }
    this.inMemoryItems = [...items];
  }

  filterAndSort(options: {
    projectId?: string;
    search?: string;
    riskFilter?: RiskLevel | 'ALL';
    sortBy?: 'date_desc' | 'risk_desc' | 'coverage_asc';
  }): AnalysisResult[] {
    let list = this.getAll(options.projectId);

    if (options.search && options.search.trim()) {
      const query = options.search.toLowerCase().trim();
      list = list.filter(item =>
        item.prompt.toLowerCase().includes(query) ||
        item.resources.some(r => r.label.toLowerCase().includes(query))
      );
    }

    if (options.riskFilter && options.riskFilter !== 'ALL') {
      list = list.filter(item => item.riskLevel === options.riskFilter);
    }

    if (options.sortBy) {
      list.sort((a, b) => {
        if (options.sortBy === 'risk_desc') {
          return b.riskScore - a.riskScore;
        }
        if (options.sortBy === 'coverage_asc') {
          return a.coverageScore - b.coverageScore;
        }
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
    }

    return list;
  }
}

export const historyStorage = new HistoryStorageService();
