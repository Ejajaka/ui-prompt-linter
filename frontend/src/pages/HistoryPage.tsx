import React, { useState } from 'react';
import type { AnalysisResult, RiskLevel } from '../types/analysis.ts';
import { historyStorage } from '../services/historyStorage.ts';
import { RiskBadge } from '../components/ui/RiskBadge.tsx';
import { useToast } from '../components/ui/Toast.tsx';
import { 
  Search, 
  Trash2, 
  ArrowUpRight, 
  FolderOpen, 
  PlusCircle, 
  X, 
  AlertTriangle 
} from 'lucide-react';

interface HistoryPageProps {
  onOpenAnalysis: (item: AnalysisResult) => void;
  onStartNewAnalysis: () => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({
  onOpenAnalysis,
  onStartNewAnalysis
}) => {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'ALL'>('ALL');
  const [sortBy, setSortBy] = useState<'date_desc' | 'risk_desc' | 'coverage_asc'>('date_desc');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const items = historyStorage.filterAndSort({
    search,
    riskFilter,
    sortBy
  });

  const handleDeleteConfirm = () => {
    if (deleteTargetId) {
      historyStorage.delete(deleteTargetId);
      setDeleteTargetId(null);
      setRefreshKey(k => k + 1);
      toast('Analysis record removed from history', 'info');
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all analysis history records?')) {
      historyStorage.clear();
      setRefreshKey(k => k + 1);
      toast('All history records cleared', 'info');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#283638] tracking-tight">
            Analysis History
          </h1>
          <p className="text-xs sm:text-sm text-[#737A72]">
            Review, reopen, and manage previous infrastructure security evaluations.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {items.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#B94D42] hover:bg-[#FDF2F0] rounded-lg transition-colors border border-[#F0C4BF] bg-white"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#E5E2D8] shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#737A72] absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search prompt text, resources (e.g. S3, EC2)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#FAFAF8] border border-[#E5E2D8] rounded-lg text-[#283638] focus:bg-white focus:outline-none focus:border-[#49686C]"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Risk Level Filter */}
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value as any)}
            className="py-2 px-3 text-xs bg-[#FAFAF8] border border-[#E5E2D8] rounded-lg text-[#283638] focus:outline-none focus:border-[#49686C]"
            aria-label="Filter by risk severity"
          >
            <option value="ALL">All Risk Levels</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
            <option value="MINIMAL">Minimal</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="py-2 px-3 text-xs bg-[#FAFAF8] border border-[#E5E2D8] rounded-lg text-[#283638] focus:outline-none focus:border-[#49686C]"
            aria-label="Sort historical records"
          >
            <option value="date_desc">Most Recent</option>
            <option value="risk_desc">Highest Risk First</option>
            <option value="coverage_asc">Lowest Coverage First</option>
          </select>
        </div>
      </div>

      {/* History Items Container */}
      {items.length === 0 ? (
        <div className="bg-[#FFFFFF] rounded-xl border border-[#E5E2D8] p-12 text-center space-y-3">
          <FolderOpen className="w-10 h-10 text-[#CDC9BC] mx-auto" />
          <h3 className="text-base font-bold text-[#283638]">No analysis history</h3>
          <p className="text-xs text-[#737A72] max-w-sm mx-auto">
            {search || riskFilter !== 'ALL'
              ? 'No evaluations match your search or filter criteria.'
              : 'You have not evaluated any infrastructure prompts yet.'}
          </p>
          <button
            onClick={onStartNewAnalysis}
            className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-[#49686C] text-white text-xs font-bold rounded-lg hover:bg-[#30494B] transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Start your first analysis</span>
          </button>
        </div>
      ) : (
        <div className="bg-[#FFFFFF] rounded-xl border border-[#E5E2D8] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E5E2D8] text-[#737A72] font-semibold bg-[#FAFAF8]">
                  <th className="py-3 px-4">Evaluated Prompt</th>
                  <th className="py-3 px-4">AWS Resources</th>
                  <th className="py-3 px-4">Risk Level & Score</th>
                  <th className="py-3 px-4">Coverage</th>
                  <th className="py-3 px-4">Evaluated Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E2D8]">
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-[#FAFAF8] transition-colors group cursor-pointer"
                    onClick={() => onOpenAnalysis(item)}
                  >
                    <td className="py-3.5 px-4 max-w-md">
                      <p className="font-semibold text-[#283638] group-hover:text-[#49686C] line-clamp-2">
                        {item.prompt}
                      </p>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        {item.resources.map(r => (
                          <span
                            key={r.id}
                            className="px-2 py-0.5 rounded text-[10px] bg-[#F6F4EC] text-[#49686C] font-mono border border-[#E5E2D8]"
                          >
                            {r.label}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <RiskBadge level={item.riskLevel} size="sm" />
                        <span className="font-mono font-bold text-[#283638] tabular-nums">
                          {item.riskScore}/100
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-medium text-[#283638] tabular-nums">
                      {item.coverageScore}%
                    </td>

                    <td className="py-3.5 px-4 text-[#737A72] font-mono whitespace-nowrap">
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Recent'}
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenAnalysis(item);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#49686C] hover:bg-[#F0F5F5] rounded transition-colors"
                        >
                          <span>Reopen</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTargetId(item.id);
                          }}
                          className="p-1 text-[#737A72] hover:text-[#B94D42] hover:bg-[#FDF2F0] rounded transition-colors"
                          aria-label="Delete analysis"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#283638]/50 backdrop-blur-xs">
          <div className="bg-[#FFFFFF] border border-[#E5E2D8] rounded-xl max-w-sm w-full p-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E2D8]">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#B94D42]" />
                <h3 className="text-sm font-bold text-[#283638]">Confirm Deletion</h3>
              </div>
              <button
                onClick={() => setDeleteTargetId(null)}
                className="p-1 text-[#737A72] hover:text-[#283638] rounded"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="py-4 text-xs text-[#737A72] leading-relaxed">
              Are you sure you want to delete this analysis record from your local history? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTargetId(null)}
                className="px-3.5 py-1.5 border border-[#E5E2D8] rounded-lg text-xs font-semibold text-[#737A72] hover:bg-[#F6F4EC]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="px-4 py-1.5 bg-[#B94D42] text-white rounded-lg text-xs font-semibold hover:bg-[#a63c32]"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
