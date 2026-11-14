import React, { useState } from 'react';
import type { AnalysisResult, RiskLevel } from '../types/analysis.ts';
import { historyStorage } from '../services/historyStorage.ts';
import { RiskBadge } from '../components/ui/RiskBadge.tsx';
import { useProject } from '../context/ProjectContext.tsx';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import {
  PlusCircle,
  Search,
  ArrowUpRight,
  ShieldAlert,
  ListChecks,
  Layers,
  BarChart3,
  AlertTriangle,
  FolderOpen,
  FileText,
  Network,
  ClipboardCheck,
  FileOutput,
  Palette,
  Monitor,
  Cpu,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  LogIn,
} from 'lucide-react';

interface OverviewPageProps {
  onStartNewAnalysis: () => void;
  onOpenAnalysis: (item: AnalysisResult) => void;
  onViewAllHistory: () => void;
  onOpenProjects?: () => void;
  publicMode?: boolean;
  onRequestSignIn?: () => void;
}

const FEATURES = [
  {
    icon: FileText,
    title: 'Requirement Compiler',
    text: 'Upload PDF, DOCX, TXT or Markdown. Every statement keeps its page, paragraph and character reference.',
    tone: '#49686C',
  },
  {
    icon: Network,
    title: 'Requirement Intelligence',
    text: 'A live graph of dependencies, ambiguities and conflicts — surfaced before design starts.',
    tone: '#688E5E',
  },
  {
    icon: ClipboardCheck,
    title: 'Review & Acceptance',
    text: 'Edge cases and implicit behaviour suggested, accepted by a human, and turned into Given/When/Then criteria.',
    tone: '#D1B653',
  },
  {
    icon: FileOutput,
    title: 'Specification & Prompt',
    text: 'A six-section design brief built only from approved requirements, with saved and restorable versions.',
    tone: '#49686C',
  },
  {
    icon: Palette,
    title: 'Design Systems',
    text: 'Colour, type, spacing and accessibility tokens injected into every brief, with full version history.',
    tone: '#C96839',
  },
  {
    icon: Monitor,
    title: 'Bolt Workspace',
    text: 'Validate on the left, generate on the right. Prompt transfer with an honest published-app preview.',
    tone: '#5A8090',
  },
  {
    icon: Cpu,
    title: 'Prompt Analysis',
    text: 'Describe the UI you want. Vector finds missing labels, colours, placement and actions, then asks only the questions that matter.',
    tone: '#3E6B33',
  },
  {
    icon: ShieldCheck,
    title: 'Project isolation',
    text: 'Projects, documents, approvals and prompts stay isolated per project and visible only to your account.',
    tone: '#B94D42',
  },
];

export const OverviewPage: React.FC<OverviewPageProps> = ({
  onStartNewAnalysis,
  onOpenAnalysis,
  onViewAllHistory,
  onOpenProjects,
  publicMode = false,
  onRequestSignIn,
}) => {
  const { currentProject } = useProject();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<RiskLevel | 'ALL'>('ALL');

  const projectId = currentProject?.id;
  const allAnalyses = projectId ? historyStorage.getAll(projectId) : [];
  const filteredAnalyses = projectId
    ? historyStorage.filterAndSort({ projectId, search: searchQuery, riskFilter: selectedRiskFilter, sortBy: 'date_desc' })
    : [];

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

  const distribution: Record<RiskLevel, number> = {
    CRITICAL: allAnalyses.filter(a => a.riskLevel === 'CRITICAL').length,
    HIGH: allAnalyses.filter(a => a.riskLevel === 'HIGH').length,
    MEDIUM: allAnalyses.filter(a => a.riskLevel === 'MEDIUM').length,
    LOW: allAnalyses.filter(a => a.riskLevel === 'LOW').length,
    MINIMAL: allAnalyses.filter(a => a.riskLevel === 'MINIMAL').length
  };

  if (publicMode) {
    return (
      <div className="space-y-14 max-w-6xl mx-auto pb-8">
        <section className="relative bg-[#FFFFFF] dark:bg-[#1B2426] rounded-2xl border border-[#E5E2D8] dark:border-[#29383A] p-7 sm:p-10 shadow-xs overflow-hidden">
          <div className="absolute -right-16 -top-16 w-72 h-72 rounded-full bg-[#49686C]/8 blur-2xl" />
          <div className="absolute -left-10 -bottom-20 w-64 h-64 rounded-full bg-[#D1B653]/12 blur-2xl" />
          <div className="max-w-3xl space-y-4 relative z-10">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#E4EBDD] dark:bg-[#23301F] text-[#30494B] dark:text-[#B7D9B0] border border-[#CFE2C8] dark:border-[#3D5236]">
              <Sparkles className="w-3 h-3" />
              Requirement engineering for UI teams
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#283638] dark:text-[#F2F5F3] leading-[1.15]">
              Everything between a document and a design.
            </h1>
            <p className="text-sm sm:text-base text-[#737A72] dark:text-[#9AA6A2] leading-relaxed max-w-2xl">
              Vector turns company requirements into traceable statements, reviewed edge cases,
              audited acceptance criteria and a six-section brief — before a generator guesses.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onRequestSignIn}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#49686C] hover:bg-[#30494B] text-white text-sm font-bold shadow-sm transition-all active:scale-[0.99]"
              >
                <LogIn className="w-4 h-4" />
                Sign in or create an account
              </button>
              <button
                type="button"
                onClick={() => document.getElementById('feature-grid')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center gap-1.5 px-4 py-3 rounded-xl border border-[#E5E2D8] dark:border-[#33403F] bg-white dark:bg-[#141C1D] text-sm font-bold text-[#283638] dark:text-[#E7E4D9] hover:bg-[#F6F4EC] dark:hover:bg-[#222E30] transition-colors"
              >
                Explore features
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2 text-[11px] text-[#737A72] dark:text-[#8E9A93]">
              {['Traceable requirements', 'Human-approved criteria', 'Design tokens in every brief', 'Isolated projects'].map((item) => (
                <span key={item} className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#688E5E]" /> {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section id="feature-grid" className="space-y-5 scroll-mt-20">
          <div className="max-w-2xl">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#49686C] dark:text-[#9DBEC1]">
              What is inside
            </div>
            <h2 className="text-2xl font-bold text-[#283638] dark:text-[#F2F5F3] tracking-tight mt-1">
              Eight connected steps, one source of truth.
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map(({ icon: Icon, title, text, tone }) => (
              <article
                key={title}
                className="bg-[#FFFFFF] dark:bg-[#1B2426] rounded-xl border border-[#E5E2D8] dark:border-[#29383A] p-4 shadow-xs hover:border-[#49686C] transition-colors"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${tone}18`, color: tone }}>
                  <Icon className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-[#283638] dark:text-[#E7E4D9] mt-3">{title}</h3>
                <p className="text-[11px] text-[#737A72] dark:text-[#8E9A93] leading-relaxed mt-1.5">{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[
            ['01', 'Compile', 'Upload the requirement document. Vector extracts, classifies and traces every statement.'],
            ['02', 'Review', 'Fix ambiguity, conflicts and dependencies. Accept edge cases and approve criteria.'],
            ['03', 'Generate', 'Produce the six-section brief, inject your design tokens, and launch Bolt.'],
          ].map(([step, title, text]) => (
            <div key={step} className="bg-[#FFFFFF] dark:bg-[#1B2426] rounded-xl border border-[#E5E2D8] dark:border-[#29383A] p-5 shadow-xs">
              <span className="font-mono text-xs font-bold text-[#D1B653]">{step}</span>
              <h3 className="text-base font-bold text-[#283638] dark:text-[#E7E4D9] mt-2">{title}</h3>
              <p className="text-xs text-[#737A72] dark:text-[#8E9A93] leading-relaxed mt-1">{text}</p>
            </div>
          ))}
        </section>

        <section className="bg-[#30494B] rounded-2xl p-8 sm:p-10 text-center text-white">
          <h2 className="text-2xl font-extrabold tracking-tight">Start with your next requirement document.</h2>
          <p className="text-sm text-gray-200 mt-2">Create a free workspace. Your projects stay private and isolated.</p>
          <button
            type="button"
            onClick={onRequestSignIn}
            className="mt-5 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#D1B653] hover:bg-[#bda241] text-[#283638] text-sm font-bold transition-all"
          >
            <LogIn className="w-4 h-4" />
            Sign in to Vector
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="bg-[#FFFFFF] dark:bg-[#1B2426] rounded-xl border border-[#E5E2D8] dark:border-[#29383A] p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="max-w-2xl space-y-3 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#E4EBDD] dark:bg-[#23301F] text-[#30494B] dark:text-[#B7D9B0]">
            <span>Vector</span>
            <span>·</span>
            <span>Pre-generation UI Review</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#283638] dark:text-[#F2F5F3]">
            {currentProject ? currentProject.name : 'Select a project to begin'}
          </h1>
          <p className="text-sm text-[#737A72] dark:text-[#9AA6A2] leading-relaxed">
            {currentProject
              ? 'Review prompt evaluations for this project, or move into the requirement pipeline.'
              : 'Analyses are project-scoped so history and metrics never mix between clients or products.'}
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-3">
            {currentProject ? (
              <>
                <button
                  onClick={onStartNewAnalysis}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#49686C] hover:bg-[#30494B] text-white text-xs font-bold transition-all shadow-xs"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>New Analysis</span>
                </button>
                <button
                  onClick={onViewAllHistory}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-[#E5E2D8] dark:border-[#33403F] bg-white dark:bg-[#141C1D] hover:bg-[#F6F4EC] dark:hover:bg-[#222E30] text-xs font-bold text-[#283638] dark:text-[#E7E4D9] transition-colors"
                >
                  <span>View recent analyses</span>
                </button>
              </>
            ) : (
              <button
                onClick={onOpenProjects}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#49686C] hover:bg-[#30494B] text-white text-xs font-bold transition-all shadow-xs"
              >
                <FolderOpen className="w-4 h-4" />
                <span>Create or open a project</span>
              </button>
            )}
          </div>
        </div>

        <div className="absolute -right-4 -bottom-12 opacity-[0.07] hidden md:block pointer-events-none text-[#2D5D4F]">
          <svg width="300" height="300" viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <path d="M13.1 11.4 L24 36.2 L34.9 11.4" stroke="currentColor" strokeWidth="7.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#FFFFFF] dark:bg-[#1B2426] p-5 rounded-xl border border-[#E5E2D8] dark:border-[#29383A] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#737A72] mb-3">
            <span className="text-xs font-semibold">Total Analyses</span>
            <div className="p-1.5 rounded-md bg-[#F0F5F5] dark:bg-[#222E30] text-[#49686C] dark:text-[#B9D1D4]">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-[#283638] dark:text-[#F2F5F3] font-mono tabular-nums">{totalCount}</div>
            <div className="text-[11px] text-[#737A72] dark:text-[#8E9A93] mt-1">Prompts evaluated in this project</div>
          </div>
        </div>

        <div className="bg-[#FFFFFF] dark:bg-[#1B2426] p-5 rounded-xl border border-[#E5E2D8] dark:border-[#29383A] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#737A72] mb-3">
            <span className="text-xs font-semibold">Average Risk Score</span>
            <div className="p-1.5 rounded-md bg-[#FEFCE8] dark:bg-[#2E2A18] text-[#D1B653]">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-[#283638] dark:text-[#F2F5F3] font-mono tabular-nums">
              {totalCount > 0 ? `${avgRisk}/100` : '—'}
            </div>
            <div className="text-[11px] text-[#737A72] dark:text-[#8E9A93] mt-1">Across this project's prompts</div>
          </div>
        </div>

        <div className="bg-[#FFFFFF] dark:bg-[#1B2426] p-5 rounded-xl border border-[#E5E2D8] dark:border-[#29383A] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#737A72] mb-3">
            <span className="text-xs font-semibold">Avg. Completeness</span>
            <div className="p-1.5 rounded-md bg-[#F4F9F1] dark:bg-[#23301F] text-[#3E6B33]">
              <ListChecks className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-[#283638] dark:text-[#F2F5F3] font-mono tabular-nums">
              {totalCount > 0 ? `${avgCoverage}%` : '—'}
            </div>
            <div className="text-[11px] text-[#737A72] dark:text-[#8E9A93] mt-1">Required details stated</div>
          </div>
        </div>

        <div className="bg-[#FFFFFF] dark:bg-[#1B2426] p-5 rounded-xl border border-[#E5E2D8] dark:border-[#29383A] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#737A72] mb-3">
            <span className="text-xs font-semibold">High-Risk Analyses</span>
            <div className="p-1.5 rounded-md bg-[#FDF2F0] dark:bg-[#3A2523] text-[#B94D42]">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-[#B94D42] font-mono tabular-nums">{highRiskCount}</div>
            <div className="text-[11px] text-[#737A72] dark:text-[#8E9A93] mt-1">Classified High or Critical</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 bg-[#FFFFFF] dark:bg-[#1B2426] rounded-xl border border-[#E5E2D8] dark:border-[#29383A] shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-[#283638] dark:text-[#E7E4D9]">Recent Analyses</h3>
              <p className="text-xs text-[#737A72] dark:text-[#8E9A93]">
                {currentProject ? `Evaluations saved to ${currentProject.name}` : 'Choose a project to see its history'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#737A72] absolute left-2.5 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search prompts or elements..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-[#FAFAF8] dark:bg-[#141C1D] border border-[#E5E2D8] dark:border-[#33403F] rounded-lg focus:bg-white dark:focus:bg-[#1B2426] focus:outline-none focus:border-[#49686C] text-[#283638] dark:text-[#E7E4D9]"
                />
              </div>

              <select
                value={selectedRiskFilter}
                onChange={(e) => setSelectedRiskFilter(e.target.value as RiskLevel | 'ALL')}
                className="py-1.5 px-2.5 text-xs bg-[#FAFAF8] dark:bg-[#141C1D] border border-[#E5E2D8] dark:border-[#33403F] rounded-lg text-[#283638] dark:text-[#E7E4D9] focus:outline-none focus:border-[#49686C]"
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
              <div className="text-sm font-semibold text-[#283638] dark:text-[#E7E4D9]">No analyses found</div>
              <p className="text-xs text-[#737A72] dark:text-[#8E9A93] max-w-sm mx-auto">
                {!currentProject
                  ? 'Select or create a project first. Analyses never mix between projects.'
                  : searchQuery || selectedRiskFilter !== 'ALL'
                    ? 'No records match your search filter criteria.'
                    : 'Run a prompt evaluation in this project to build its history.'}
              </p>
              <button
                onClick={currentProject ? onStartNewAnalysis : onOpenProjects}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#49686C] text-white text-xs font-bold hover:bg-[#30494B] transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>{currentProject ? 'Start an analysis' : 'Open projects'}</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E5E2D8] dark:border-[#29383A] text-[#737A72] dark:text-[#8E9A93] font-semibold">
                    <th className="py-2.5 px-3">UI Prompt</th>
                    <th className="py-2.5 px-3">Elements</th>
                    <th className="py-2.5 px-3">Risk</th>
                    <th className="py-2.5 px-3">Completeness</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E2D8] dark:divide-[#29383A]">
                  {filteredAnalyses.slice(0, 5).map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => onOpenAnalysis(item)}
                      className="hover:bg-[#FAFAF8] dark:hover:bg-[#222E30] cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-3 max-w-[260px]">
                        <p className="font-semibold text-[#283638] dark:text-[#E7E4D9] truncate group-hover:text-[#49686C]">
                          {item.prompt}
                        </p>
                        <span className="text-[10px] text-[#737A72] font-mono">
                          {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Recent'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1">
                          {item.resources.map((r) => (
                            <span key={r.id} className="px-1.5 py-0.5 rounded text-[10px] bg-[#F6F4EC] dark:bg-[#141C1D] text-[#49686C] dark:text-[#B9D1D4] font-mono border border-[#E5E2D8] dark:border-[#33403F]">
                              {r.label}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-[#283638] dark:text-[#E7E4D9] tabular-nums">{item.riskScore}</span>
                          <RiskBadge level={item.riskLevel} size="sm" showIcon={false} />
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono font-medium text-[#737A72] tabular-nums">{item.coverageScore}%</td>
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

        <div className="lg:col-span-4 bg-[#FFFFFF] dark:bg-[#1B2426] rounded-xl border border-[#E5E2D8] dark:border-[#29383A] shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#49686C]" />
              <h3 className="text-base font-bold text-[#283638] dark:text-[#E7E4D9]">Risk Distribution</h3>
            </div>
            <span className="text-xs font-mono font-medium text-[#737A72]">{totalCount} saved</span>
          </div>

          <p className="text-xs text-[#737A72] dark:text-[#8E9A93]">Severity across this project's stored evaluations.</p>

          {totalCount === 0 ? (
            <div className="py-8 text-center space-y-2 border border-dashed border-[#E5E2D8] dark:border-[#33403F] rounded-lg bg-[#FAFAF8] dark:bg-[#141C1D]">
              <AlertTriangle className="w-6 h-6 text-[#CDC9BC] mx-auto" />
              <span className="text-xs font-semibold text-[#283638] dark:text-[#E7E4D9] block">No analysis data</span>
              <p className="text-[11px] text-[#737A72] max-w-[200px] mx-auto">Evaluate a prompt to visualise risk distribution.</p>
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
                  <span className="text-lg font-bold font-mono text-[#283638] dark:text-[#F2F5F3] leading-tight">{totalCount}</span>
                  <span className="text-[10px] text-[#737A72] uppercase font-semibold">Prompts</span>
                </div>
              </div>

              <div className="space-y-2 pt-1 border-t border-[#E5E2D8] dark:border-[#29383A]">
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
                        <span className="font-medium text-[#283638] dark:text-[#E7E4D9]">{label}</span>
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

          <div className="pt-3 border-t border-[#E5E2D8] dark:border-[#29383A] text-[11px] text-[#737A72] dark:text-[#8E9A93]">
            Aggregated only from analyses saved in this project.
          </div>
        </div>
      </div>
    </div>
  );
};
