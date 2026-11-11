import type { AnalysisResult, RiskLevel } from '../types/analysis.ts';

const STORAGE_KEY = 'vector_analysis_history_v1';

/**
 * Local analysis history. Starts empty - records are added only as the user
 * runs real analyses. No seeded/sample data.
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

  getAll(): AnalysisResult[] {
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

  save(result: AnalysisResult): void {
    const items = this.getAll();
    // Prepend new item or update if id matches
    const filtered = items.filter(i => i.id !== result.id);
    const updated = [result, ...filtered];
    this.saveAll(updated);
  }

  delete(id: string): void {
    const items = this.getAll().filter(i => i.id !== id);
    this.saveAll(items);
  }

  clear(): void {
    this.saveAll([]);
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
    search?: string;
    riskFilter?: RiskLevel | 'ALL';
    sortBy?: 'date_desc' | 'risk_desc' | 'coverage_asc';
  }): AnalysisResult[] {
    let list = this.getAll();

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
        // date_desc
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
    }

    return list;
  }
}

export const historyStorage = new HistoryStorageService();
