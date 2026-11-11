import React from 'react';
import type { AnalysisResource } from '../../types/analysis.ts';
import { Database, Server, HardDrive, Network, Zap, Shield, Layers } from 'lucide-react';

interface DetectedResourcesProps {
  resources: AnalysisResource[];
}

export const DetectedResources: React.FC<DetectedResourcesProps> = ({ resources }) => {
  if (!resources || resources.length === 0) return null;

  const getResourceIcon = (id: string) => {
    switch (id) {
      case 's3':
        return HardDrive;
      case 'ec2':
        return Server;
      case 'rds':
      case 'dynamodb':
        return Database;
      case 'alb':
      case 'vpc':
        return Network;
      case 'lambda':
        return Zap;
      default:
        return Layers;
    }
  };

  return (
    <div className="bg-[#FFFFFF] rounded-xl border border-[#E5E2D8] p-5 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#49686C]" />
          <h3 className="text-sm font-bold text-[#283638]">
            Identified AWS Resources ({resources.length})
          </h3>
        </div>
        <span className="text-[11px] text-[#737A72]">
          Extracted via NLP entity extraction
        </span>
      </div>

      <div className="flex flex-wrap gap-2.5">
        {resources.map((res) => {
          const Icon = getResourceIcon(res.id);
          return (
            <div
              key={res.id}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#FAFAF8] border border-[#E5E2D8] text-xs font-semibold text-[#283638]"
            >
              <div className="p-1 rounded bg-[#E4EBDD] text-[#30494B]">
                <Icon className="w-3.5 h-3.5" />
              </div>
              <span>{res.label}</span>
              {res.category && (
                <span className="text-[10px] font-normal text-[#737A72]">
                  · {res.category}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
