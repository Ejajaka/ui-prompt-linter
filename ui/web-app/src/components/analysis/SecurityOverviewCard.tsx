import React from 'react';
import type { AnalysisResult } from '../../types/analysis.ts';
import { CircularScoreGauge } from '../ui/CircularScoreGauge.tsx';
import { RiskBadge } from '../ui/RiskBadge.tsx';
import { ShieldAlert, AlertTriangle, ShieldCheck, Cpu, Info, CheckCircle2 } from 'lucide-react';

interface SecurityOverviewCardProps {
  result: AnalysisResult;
  projectedMetrics?: { projectedRisk: number; projectedCoverage: number } | null;
}

export const SecurityOverviewCard: React.FC<SecurityOverviewCardProps> = ({
  result,
  projectedMetrics
}) => {
  const isProjected = projectedMetrics && (
    projectedMetrics.projectedRisk !== result.riskScore ||
    projectedMetrics.projectedCoverage !== result.coverageScore
  );

  return (
    <div className="bg-[#FFFFFF] rounded-xl border border-[#E5E2D8] shadow-xs p-5 sm:p-6 space-y-6">
      {/* Top Banner / Headline */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#E5E2D8]">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-lg font-bold text-[#283638] tracking-tight">
              Security Evaluation Summary
            </h2>
            <RiskBadge level={result.riskLevel} size="md" />
          </div>
          <p className="text-xs text-[#737A72]">
            Rule-based static analysis of AWS resources and configuration intent.
          </p>
        </div>

        {isProjected && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#F4F9F1] border border-[#CFE2C8] text-xs text-[#3E6B33]">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>
              Projected after accepted recommendations: <strong>{projectedMetrics.projectedRisk}/100</strong> Risk
            </span>
          </div>
        )}
      </div>

      {/* Main Metric Gauges & Counts Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
        {/* Risk Score Gauge */}
        <div className="p-4 rounded-xl bg-[#FAFAF8] border border-[#E5E2D8] flex flex-col items-center justify-center">
          <CircularScoreGauge
            score={isProjected ? projectedMetrics.projectedRisk : result.riskScore}
            label={isProjected ? 'Projected Risk Index' : 'Overall Risk Index'}
            sublabel={
              result.riskScore >= 75
                ? 'Critical exposure detected'
                : result.riskScore >= 50
                ? 'Moderate baseline gaps'
                : 'Low identified risk'
            }
            variant="risk"
          />
          <span className="text-[10px] text-[#737A72] mt-2 text-center">
            Heuristic index, not a breach probability
          </span>
        </div>

        {/* Security Coverage Gauge */}
        <div className="p-4 rounded-xl bg-[#FAFAF8] border border-[#E5E2D8] flex flex-col items-center justify-center">
          <CircularScoreGauge
            score={isProjected ? projectedMetrics.projectedCoverage : result.coverageScore}
            label={isProjected ? 'Projected Coverage' : 'Security Coverage'}
            sublabel="Applicable controls declared"
            variant="coverage"
          />
          <span className="text-[10px] text-[#737A72] mt-2 text-center">
            Higher coverage = more controls in prompt
          </span>
        </div>

        {/* Rule Confidence Card */}
        <div className="p-4 rounded-xl bg-[#FAFAF8] border border-[#E5E2D8] flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between text-xs text-[#737A72] mb-1">
              <span className="font-semibold text-[#283638]">Rule Confidence (heuristic)</span>
              <span className="text-xs font-mono font-bold text-[#49686C] tabular-nums">
                {result.confidenceScore}%
              </span>
            </div>
            <div className="w-full h-2 bg-[#E5E2D8] rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-[#49686C] rounded-full transition-all duration-500"
                style={{ width: `${result.confidenceScore}%` }}
              />
            </div>
            <p className="text-[11px] text-[#737A72] leading-relaxed">
              Describes how completely the rule patterns matched recognised AWS architecture patterns. It is not a calibrated probability.
            </p>
          </div>
          <div className="pt-2 border-t border-[#E5E2D8] text-[10px] text-[#737A72]">
            Advisory evaluation · Not a warranty of code safety
          </div>
        </div>

        {/* Findings Breakdown Mini Matrix */}
        <div className="p-4 rounded-xl bg-[#FAFAF8] border border-[#E5E2D8] flex flex-col justify-between h-full space-y-2">
          <span className="text-xs font-bold text-[#283638]">Detected Findings</span>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between p-1.5 rounded bg-white border border-[#E5E2D8]">
              <span className="text-[#737A72] flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-[#49686C]" /> AWS Resources
              </span>
              <span className="font-mono font-bold text-[#283638] tabular-nums">
                {result.resources.length}
              </span>
            </div>
            <div className="flex items-center justify-between p-1.5 rounded bg-white border border-[#E5E2D8]">
              <span className="text-[#737A72] flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-[#D1B653]" /> Missing Controls
              </span>
              <span className="font-mono font-bold text-[#283638] tabular-nums">
                {result.missing.length}
              </span>
            </div>
            <div className="flex items-center justify-between p-1.5 rounded bg-white border border-[#E5E2D8]">
              <span className="text-[#737A72] flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-[#B94D42]" /> Risky Statements
              </span>
              <span className="font-mono font-bold text-[#B94D42] tabular-nums">
                {result.riskyFindings.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Risk Explanation Text Box */}
      {result.feedback && result.feedback.length > 0 && (
        <div className="p-4 rounded-xl bg-[#F6F4EC] border border-[#E5E2D8] flex items-start gap-3">
          <div className="p-1 rounded bg-[#E5E2D8] text-[#30494B] shrink-0 mt-0.5">
            <Info className="w-4 h-4" />
          </div>
          <div className="space-y-1 text-xs text-[#283638] leading-relaxed">
            <span className="font-bold block text-[#30494B]">Evaluation Assessment</span>
            {result.feedback.map((msg, idx) => (
              <p key={idx}>{msg}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
