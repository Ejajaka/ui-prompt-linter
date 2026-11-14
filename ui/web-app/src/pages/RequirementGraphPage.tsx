import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  AlertTriangle,
  ArrowRight,
  Download,
  GitBranch,
  Loader2,
  Network,
  RefreshCw,
  Waypoints,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useProject } from '../context/ProjectContext.tsx';
import { useToast } from '../components/ui/Toast.tsx';
import { listRequirements } from '../services/documents/requirementDocuments.ts';
import { analyzeRequirements } from '../services/requirements/intelligence.ts';
import { exportRequirementGraph } from '../services/requirements/graphExport.ts';
import type { RequirementRecord } from '../types/requirements.ts';
import type {
  RequirementAnalysisResult,
  RequirementFinding,
} from '../types/requirementIntelligence.ts';

type FindingTab = 'all' | 'ambiguity' | 'conflict' | 'dependency';

const NODE_STYLES: Record<string, { background: string; border: string; color: string }> = {
  requirement: { background: '#FFFFFF', border: '#49686C', color: '#283638' },
  screen: { background: '#F4F9F1', border: '#CFE2C8', color: '#3E6B33' },
  component: { background: '#F6F4EC', border: '#E5E2D8', color: '#856C16' },
  role: { background: '#F0F5F5', border: '#B9D1D4', color: '#30494B' },
  interaction: { background: '#FFF7ED', border: '#FED7AA', color: '#9C4A28' },
};

function buildFlow(result: RequirementAnalysisResult): { nodes: Node[]; edges: Edge[] } {
  const counters: Record<string, number> = {};
  const columns: Record<string, number> = {
    requirement: 0,
    screen: 360,
    component: 720,
    role: 1060,
    interaction: 1400,
  };
  const nodes: Node[] = result.graph.nodes.map((node) => {
    const index = counters[node.kind] || 0;
    counters[node.kind] = index + 1;
    const style = NODE_STYLES[node.kind] || NODE_STYLES.requirement;
    return {
      id: node.id,
      position: { x: columns[node.kind] ?? 0, y: index * 100 },
      data: { label: node.label, kind: node.kind },
      style: {
        width: 230,
        padding: '8px 10px',
        borderRadius: 10,
        border: `1px solid ${style.border}`,
        background: style.background,
        color: style.color,
        fontSize: 11,
        fontWeight: node.kind === 'requirement' ? 700 : 600,
      },
    };
  });

  const edges: Edge[] = result.graph.edges.map((edge) => {
    const conflict = edge.kind === 'conflicts_with';
    const dependency = edge.kind === 'depends_on';
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: conflict || dependency ? edge.label : undefined,
      animated: conflict || dependency,
      style: {
        stroke: conflict ? '#B94D42' : dependency ? '#49686C' : '#B9B5A9',
        strokeWidth: conflict || dependency ? 2 : 1.2,
        strokeDasharray: conflict ? '5 4' : undefined,
      },
      labelStyle: { fontSize: 9, fill: conflict ? '#B94D42' : '#49686C' },
      markerEnd: { type: MarkerType.ArrowClosed, color: conflict ? '#B94D42' : '#9A9688' },
    };
  });

  return { nodes, edges };
}

function severityBadge(severity: string): string {
  if (severity === 'critical') return 'bg-[#FDF2F0] border-[#F0C4BF] text-[#B94D42]';
  if (severity === 'high') return 'bg-[#FFF7ED] border-[#FED7AA] text-[#9C4A28]';
  if (severity === 'medium') return 'bg-[#FEFCE8] border-[#FEF08A] text-[#856C16]';
  return 'bg-[#F4F9F1] border-[#CFE2C8] text-[#3E6B33]';
}

function FindingCard({ finding, requirements }: { finding: RequirementFinding; requirements: RequirementRecord[] }) {
  const byId = new Map(requirements.map((requirement) => [requirement.id, requirement]));
  return (
    <article className="bg-[#FFFFFF] border border-[#E5E2D8] rounded-xl p-4 shadow-xs">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${severityBadge(finding.severity)}`}>
          {finding.severity}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wide text-[#737A72]">{finding.type}</span>
        <span className="ml-auto text-[10px] font-mono text-[#49686C]">
          {finding.affectedRequirementIds.map((id) => byId.get(id)?.requirementCode || id.slice(0, 8)).join(' · ')}
        </span>
      </div>
      <h3 className="text-sm font-bold text-[#283638] mt-2">{finding.title}</h3>
      <p className="text-xs text-[#283638] leading-relaxed mt-1">{finding.detail}</p>
      <p className="text-[11px] text-[#737A72] leading-relaxed mt-2">
        <b className="text-[#49686C]">Why it matters:</b> {finding.whyItMatters}
      </p>
      <div className="mt-2.5 space-y-1.5">
        {finding.evidence.map((item) => (
          <div key={`${finding.id}-${item.requirementId}`} className="text-[11px] bg-[#FAFAF8] border border-[#E5E2D8] rounded-lg p-2">
            <span className="font-mono font-bold text-[#49686C]">{item.requirementCode}</span>
            {item.sourcePage ? <span className="text-[#737A72]"> · page {item.sourcePage}</span> : null}
            <p className="text-[#283638] mt-0.5">“{item.text}”</p>
          </div>
        ))}
      </div>
    </article>
  );
}

export const RequirementGraphPage: React.FC = () => {
  const { localMode } = useAuth();
  const { currentProject } = useProject();
  const { toast } = useToast();
  const [requirements, setRequirements] = useState<RequirementRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [findingTab, setFindingTab] = useState<FindingTab>('all');

  const load = useCallback(async () => {
    if (!currentProject || localMode) {
      setRequirements([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      setRequirements(await listRequirements(currentProject.id));
    } catch (e: any) {
      setError(e?.message || 'Could not load requirements.');
    } finally {
      setLoading(false);
    }
  }, [currentProject, localMode]);

  useEffect(() => {
    void load();
  }, [load]);

  const analysis = useMemo(() => analyzeRequirements(requirements), [requirements]);
  const findings = analysis.findings;
  const visibleFindings = useMemo(
    () => (findingTab === 'all' ? findings : findings.filter((finding) => finding.type === findingTab)),
    [findings, findingTab]
  );
  const flow = useMemo(() => buildFlow(analysis), [analysis]);

  const downloadGraph = async () => {
    if (!flow.nodes.length || !currentProject) {
      toast('There is no graph to download yet.', 'info');
      return;
    }
    setDownloading(true);
    try {
      const blob = await exportRequirementGraph(analysis, {
        projectName: currentProject.name,
        counts: {
          requirements: requirements.length,
          ambiguities: findings.filter((finding) => finding.type === 'ambiguity').length,
          conflicts: findings.filter((finding) => finding.type === 'conflict').length,
          dependencies: findings.filter((finding) => finding.type === 'dependency').length,
        },
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const stamp = new Date().toISOString().slice(0, 10);
      link.download = `requirement-graph-${currentProject.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${stamp}.png`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast('Requirement graph downloaded', 'success');
    } catch (e: any) {
      toast(e?.message || 'Could not render the graph image.', 'error');
    } finally {
      setDownloading(false);
    }
  };

  if (!currentProject) {
    return (
      <div className="max-w-3xl mx-auto bg-[#FFFFFF] border border-[#E5E2D8] rounded-xl p-10 text-center shadow-xs">
        <Network className="w-8 h-8 text-[#49686C] mx-auto mb-3" />
        <h1 className="text-lg font-bold text-[#283638]">Choose a project first</h1>
        <p className="text-xs text-[#737A72] mt-1">The requirement graph is project-scoped.</p>
      </div>
    );
  }

  const counts = {
    requirements: requirements.length,
    ambiguities: findings.filter((finding) => finding.type === 'ambiguity').length,
    conflicts: findings.filter((finding) => finding.type === 'conflict').length,
    dependencies: findings.filter((finding) => finding.type === 'dependency').length,
  };

  return (
    <div className="space-y-6 max-w-[1500px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#283638] tracking-tight">Requirement Intelligence</h1>
          <p className="text-xs sm:text-sm text-[#737A72] mt-1">
            Explore relationships, ambiguities, conflicts and implementation dependencies.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[#E5E2D8] bg-white text-xs font-bold text-[#49686C] hover:bg-[#F6F4EC] disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Refresh
          </button>
          <button
            type="button"
            onClick={() => void downloadGraph()}
            disabled={downloading || !requirements.length}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[#E5E2D8] bg-white text-xs font-bold text-[#49686C] hover:bg-[#F6F4EC] disabled:opacity-60"
            title="Download the requirement graph as a PNG"
          >
            {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Download PNG
          </button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-[#F0C4BF] bg-[#FDF2F0] p-4 text-xs text-[#B94D42]">{error}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ['Requirements', counts.requirements, GitBranch, '#49686C'],
          ['Ambiguities', counts.ambiguities, AlertTriangle, '#D1B653'],
          ['Conflicts', counts.conflicts, Waypoints, '#B94D42'],
          ['Dependencies', counts.dependencies, ArrowRight, '#5A8090'],
        ].map(([label, value, Icon, color]: any) => (
          <div key={label} className="bg-[#FFFFFF] border border-[#E5E2D8] rounded-xl p-4 shadow-xs">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-[#737A72]">
              <Icon className="w-3.5 h-3.5" style={{ color }} />
              {label}
            </div>
            <div className="text-2xl font-bold font-mono text-[#283638] mt-1 tabular-nums">{value}</div>
          </div>
        ))}
      </div>

      {requirements.length === 0 ? (
        <div className="bg-[#FFFFFF] border border-[#E5E2D8] rounded-xl p-10 text-center text-xs text-[#737A72]">
          Upload and compile a requirement document first.
        </div>
      ) : (
        <>
          <div className="bg-[#FFFFFF] border border-[#E5E2D8] rounded-xl shadow-xs overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-[#E5E2D8]">
              <div className="flex items-center gap-2">
                <Network className="w-4 h-4 text-[#49686C]" />
                <h2 className="text-sm font-bold text-[#283638]">Requirement graph</h2>
              </div>
              <div className="flex flex-wrap gap-2 text-[10px] text-[#737A72]">
                <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#49686C]" /> requirement</span>
                <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#688E5E]" /> screen</span>
                <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#D1B653]" /> component</span>
                <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#B94D42]" /> conflict / dependency</span>
              </div>
            </div>
            <div className="h-[620px] bg-[#FAFAF8]">
              <ReactFlow
                nodes={flow.nodes}
                edges={flow.edges}
                fitView
                minZoom={0.15}
                maxZoom={1.5}
                nodesDraggable
                nodesConnectable={false}
                elementsSelectable
                proOptions={{ hideAttribution: true }}
              >
                <Background gap={20} size={1} color="#E5E2D8" />
                <MiniMap pannable zoomable nodeStrokeWidth={2} style={{ background: '#FFFFFF' }} />
                <Controls showInteractive={false} />
              </ReactFlow>
            </div>
          </div>

          <div className="bg-[#FFFFFF] border border-[#E5E2D8] rounded-xl shadow-xs p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#49686C]" />
                <h2 className="text-sm font-bold text-[#283638]">Findings</h2>
                <span className="text-[10px] font-mono text-[#737A72]">{visibleFindings.length}/{findings.length}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {([
                  ['all', 'All'],
                  ['ambiguity', 'Ambiguity'],
                  ['conflict', 'Conflicts'],
                  ['dependency', 'Dependencies'],
                ] as [FindingTab, string][]).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setFindingTab(id)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                      findingTab === id
                        ? 'bg-[#49686C] border-[#49686C] text-white'
                        : 'bg-white border-[#E5E2D8] text-[#737A72] hover:border-[#49686C]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3 mt-3">
              {visibleFindings.length === 0 ? (
                <p className="text-xs text-[#737A72] py-6 text-center">No findings in this category.</p>
              ) : (
                visibleFindings.map((finding) => (
                  <FindingCard key={finding.id} finding={finding} requirements={requirements} />
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
