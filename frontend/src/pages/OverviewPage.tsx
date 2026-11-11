import React, { useState } from 'react';
import type { AnalysisResult, RiskLevel } from '../types/analysis.ts';
import { historyStorage } from '../services/historyStorage.ts';
import { RiskBadge } from '../components/ui/RiskBadge.tsx';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { 
  PlusCircle, 
  Search, 
  Filter, 
  ArrowUpRight, 
  ShieldAlert, 
  ShieldCheck, 
  Layers, 
  Clock, 
  BarChart3,
  AlertTriangle,
  FolderOpen
} from 'lucide-react';

interface OverviewPageProps {
  onStartNewAnalysis: () => void;
  onOpenAnalysis: (item: AnalysisResult) => void;
  onViewAllHistory: () => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  onStartNewAnalysis,
  onOpenAnalysis,
  onViewAllHistory
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<RiskLevel | 'ALL'>('ALL');

  const allAnalyses = historyStorage.getAll();
  const filteredAnalyses = historyStorage.filterAndSort({
    search: searchQuery,
    riskFilter: selectedRiskFilter,
    sortBy: 'date_desc'
  });

  const totalCount = allAnalyses.length;
  const avgRisk = totalCount > 0
    ? Math.round(allAnalyses.reduce((acc, curr) => acc + curr.riskScore, 0) / totalCount)
    : 0;
  const avgCoverage = totalCount > 0
    ? Math.round(allAnalyses.reduce((acc, curr) => acc + curr.coverageScore, 0) / totalCount)
    : 0;
  const highRiskCount = allAnalyses.filter(
    a => a.riskLevel === 'HIGH' || a.riskLevel === 'CRITICAL'
  ).length;

  // Distribution calculations
  const distribution: Record<RiskLevel, number> = {
    CRITICAL: allAnalyses.filter(a => a.riskLevel === 'CRITICAL').length,
    HIGH: allAnalyses.filter(a => a.riskLevel === 'HIGH').length,
    MEDIUM: allAnalyses.filter(a => a.riskLevel === 'MEDIUM').length,
    LOW: allAnalyses.filter(a => a.riskLevel === 'LOW').length,
    MINIMAL: allAnalyses.filter(a => a.riskLevel === 'MINIMAL').length
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome Hero Card */}
      <div className="bg-[#FFFFFF] rounded-xl border border-[#E5E2D8] p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="max-w-2xl space-y-3 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#E4EBDD] text-[#30494B]">
            <span>Vector Platform</span>
            <span>·</span>
            <span>Pre-generation Diagnosis</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#283638]">
            Infrastructure Security Overview
          </h1>
          <p className="text-sm text-[#737A72] leading-relaxed">
            Identify missing security requirements and eliminate critical misconfigurations before generating your AWS infrastructure code.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-3">
            <button
              onClick={onStartNewAnalysis}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#49686C] hover:bg-[#30494B] text-white text-xs font-bold transition-all shadow-xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>New Analysis</span>
            </button>
            <button
              onClick={onViewAllHistory}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-[#E5E2D8] bg-white hover:bg-[#F6F4EC] text-xs font-bold text-[#283638] transition-colors"
            >
              <span>View recent analyses</span>
            </button>
          </div>
        </div>

        {/* Subtle Vector mark watermark in background */}
        <div className="absolute right-6 -bottom-8 opacity-5 hidden md:block pointer-events-none text-[#2D5D4F]">
          <svg width="220" height="220" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 6l6 13 6-13" />
          </svg>
        </div>
      </div>

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Analyses */}
        <div className="bg-[#FFFFFF] p-5 rounded-xl border border-[#E5E2D8] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#737A72] mb-3">
            <span className="text-xs font-semibold">Total Analyses</span>
            <div className="p-1.5 rounded-md bg-[#F0F5F5] text-[#49686C]">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-[#283638] font-mono tabular-nums">
              {totalCount}
            </div>
            <div className="text-[11px] text-[#737A72] mt-1">
              Prompts evaluated
            </div>
          </div>
        </div>

        {/* Average Risk Score */}
        <div className="bg-[#FFFFFF] p-5 rounded-xl border border-[#E5E2D8] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#737A72] mb-3">
            <span className="text-xs font-semibold">Average Risk Score</span>
            <div className="p-1.5 rounded-md bg-[#FEFCE8] text-[#D1B653]">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-[#283638] font-mono tabular-nums">
              {totalCount > 0 ? `${avgRisk}/100` : '—'}
            </div>
            <div className="text-[11px] text-[#737A72] mt-1">
              Across all evaluated prompts
            </div>
          </div>
        </div>

        {/* Average Coverage */}
        <div className="bg-[#FFFFFF] p-5 rounded-xl border border-[#E5E2D8] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#737A72] mb-3">
            <span className="text-xs font-semibold">Avg. Security Coverage</span>
            <div className="p-1.5 rounded-md bg-[#F4F9F1] text-[#3E6B33]">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-[#283638] font-mono tabular-nums">
              {totalCount > 0 ? `${avgCoverage}%` : '—'}
            </div>
            <div className="text-[11px] text-[#737A72] mt-1">
              Applicable controls declared
            </div>
          </div>
        </div>

        {/* High Risk Analyses */}
        <div className="bg-[#FFFFFF] p-5 rounded-xl border border-[#E5E2D8] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#737A72] mb-3">
            <span className="text-xs font-semibold">High-Risk Analyses</span>
            <div className="p-1.5 rounded-md bg-[#FDF2F0] text-[#B94D42]">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-[#B94D42] font-mono tabular-nums">
              {highRiskCount}
            </div>
            <div className="text-[11px] text-[#737A72] mt-1">
              Classified High or Critical risk
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Analyses Table (2/3) + Risk Distribution (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Recent Analyses Table */}
        <div className="lg:col-span-8 bg-[#FFFFFF] rounded-xl border border-[#E5E2D8] shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-[#283638]">
                Recent Analyses
              </h3>
              <p className="text-xs text-[#737A72]">
                Historical evaluation records and risk diagnoses
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#737A72] absolute left-2.5 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search prompts or resources..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-[#FAFAF8] border border-[#E5E2D8] rounded-lg focus:bg-white focus:outline-none focus:border-[#49686C] text-[#283638]"
                />
              </div>

              <select
                value={selectedRiskFilter}
                onChange={(e) => setSelectedRiskFilter(e.target.value as any)}
                className="py-1.5 px-2.5 text-xs bg-[#FAFAF8] border border-[#E5E2D8] rounded-lg text-[#283638] focus:outline-none focus:border-[#49686C]"
                aria-label="Filter by risk level"
              >
                <option value="ALL">All Levels</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
                <option value="MINIMAL">Minimal</option>
              </select>
            </div>
          </div>

          {filteredAnalyses.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <FolderOpen className="w-8 h-8 text-[#CDC9BC] mx-auto" />
              <div className="text-sm font-semibold text-[#283638]">No analyses found</div>
              <p className="text-xs text-[#737A72] max-w-sm mx-auto">
                {searchQuery || selectedRiskFilter !== 'ALL'
                  ? 'No records match your search filter criteria.'
                  : 'Start your first infrastructure prompt security diagnosis.'}
              </p>
              <button
                onClick={onStartNewAnalysis}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#49686C] text-white text-xs font-bold hover:bg-[#30494B] transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Start your first analysis</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E5E2D8] text-[#737A72] font-semibold">
                    <th className="py-2.5 px-3">Infrastructure Prompt</th>
                    <th className="py-2.5 px-3">Resources</th>
                    <th className="py-2.5 px-3">Risk</th>
                    <th className="py-2.5 px-3">Coverage</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E2D8]">
                  {filteredAnalyses.slice(0, 5).map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => onOpenAnalysis(item)}
                      className="hover:bg-[#FAFAF8] cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-3 max-w-[260px]">
                        <p className="font-semibold text-[#283638] truncate group-hover:text-[#49686C]">
                          {item.prompt}
                        </p>
                        <span className="text-[10px] text-[#737A72] font-mono">
                          {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Recent'}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1">
                          {item.resources.map(r => (
                            <span
                              key={r.id}
                              className="px-1.5 py-0.5 rounded text-[10px] bg-[#F6F4EC] text-[#49686C] font-mono border border-[#E5E2D8]"
                            >
                              {r.id.toUpperCase()}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-[#283638] tabular-nums">
                            {item.riskScore}
                          </span>
                          <RiskBadge level={item.riskLevel} size="sm" showIcon={false} />
                        </div>
                      </td>

                      <td className="py-3 px-3 font-mono font-medium text-[#737A72] tabular-nums">
                        {item.coverageScore}%
                      </td>

                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenAnalysis(item);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#49686C] hover:text-[#30494B]"
                        >
                          <span>Reopen</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Risk Distribution Breakdown Card with Recharts Donut Chart */}
        <div className="lg:col-span-4 bg-[#FFFFFF] rounded-xl border border-[#E5E2D8] shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#49686C]" />
              <h3 className="text-base font-bold text-[#283638]">
                Risk Distribution
              </h3>
            </div>
            <span className="text-xs font-mono font-medium text-[#737A72]">
              {totalCount} saved
            </span>
          </div>

          <p className="text-xs text-[#737A72]">
            Severity categorization across all stored analysis records.
          </p>

          {totalCount === 0 ? (
            <div className="py-8 text-center space-y-2 border border-dashed border-[#E5E2D8] rounded-lg bg-[#FAFAF8]">
              <AlertTriangle className="w-6 h-6 text-[#CDC9BC] mx-auto" />
              <span className="text-xs font-semibold text-[#283638] block">No analysis data</span>
              <p className="text-[11px] text-[#737A72] max-w-[200px] mx-auto">
                Evaluate a prompt to visualize risk distribution.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="h-44 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Critical', value: distribution.CRITICAL, color: '#B94D42' },
                        { name: 'High', value: distribution.HIGH, color: '#C96839' },
                        { name: 'Medium', value: distribution.MEDIUM, color: '#D1B653' },
                        { name: 'Low', value: distribution.LOW, color: '#688E5E' },
                        { name: 'Minimal', value: distribution.MINIMAL, color: '#49686C' }
                      ].filter(d => d.value > 0)}
                      innerRadius={46}
                      outerRadius={68}
                      paddingAngle={3}
                      dataKey="value"
                      animationDuration={800}
                    >
                      {[
                        { name: 'Critical', value: distribution.CRITICAL, color: '#B94D42' },
                        { name: 'High', value: distribution.HIGH, color: '#C96839' },
                        { name: 'Medium', value: distribution.MEDIUM, color: '#D1B653' },
                        { name: 'Low', value: distribution.LOW, color: '#688E5E' },
                        { name: 'Minimal', value: distribution.MINIMAL, color: '#49686C' }
                      ].filter(d => d.value > 0).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any, name: any) => [`${value} prompt(s)`, name]}
                      contentStyle={{
                        backgroundColor: '#283638',
                        color: '#FFFFFF',
                        borderRadius: '8px',
                        border: 'none',
                        fontSize: '11px',
                        padding: '6px 10px'
                      }}
                      itemStyle={{ color: '#FFFFFF' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-lg font-bold font-mono text-[#283638] leading-tight">
                    {totalCount}
                  </span>
                  <span className="text-[10px] text-[#737A72] uppercase font-semibold">
                    Prompts
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-1 border-t border-[#E5E2D8]">
                {[
                  { level: 'CRITICAL', label: 'Critical Risk', count: distribution.CRITICAL, color: '#B94D42' },
                  { level: 'HIGH', label: 'High Risk', count: distribution.HIGH, color: '#C96839' },
                  { level: 'MEDIUM', label: 'Medium Risk', count: distribution.MEDIUM, color: '#D1B653' },
                  { level: 'LOW', label: 'Low Risk', count: distribution.LOW, color: '#688E5E' },
                  { level: 'MINIMAL', label: 'Minimal Risk', count: distribution.MINIMAL, color: '#49686C' }
                ].map(({ level, label, count, color }) => {
                  const pct = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
                  return (
                    <div key={level} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <span className="font-medium text-[#283638]">{label}</span>
                      </div>
                      <span className="font-mono text-[#737A72] tabular-nums">
                        {count} <span className="text-[10px]">({pct}%)</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-[#E5E2D8] text-[11px] text-[#737A72]">
            Aggregated dynamically from actual saved evaluations.
          </div>
        </div>
      </div>
    </div>
  );
};
