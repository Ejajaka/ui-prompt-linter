import React from 'react';
import type { RiskLevel, FindingSeverity } from '../../types/analysis.ts';
import { ShieldAlert, AlertTriangle, AlertCircle, ShieldCheck, Shield } from 'lucide-react';

interface RiskBadgeProps {
  level: RiskLevel;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level, size = 'md', showIcon = true }) => {
  const config = {
    CRITICAL: {
      label: 'Critical Risk',
      bg: 'bg-[#FDF2F0]',
      border: 'border-[#F0C4BF]',
      text: 'text-[#B94D42]',
      icon: ShieldAlert
    },
    HIGH: {
      label: 'High Risk',
      bg: 'bg-[#FFF7ED]',
      border: 'border-[#FED7AA]',
      text: 'text-[#C96839]',
      icon: AlertTriangle
    },
    MEDIUM: {
      label: 'Medium Risk',
      bg: 'bg-[#FEFCE8]',
      border: 'border-[#FEF08A]',
      text: 'text-[#856C16]',
      icon: AlertCircle
    },
    LOW: {
      label: 'Low Risk',
      bg: 'bg-[#F4F9F1]',
      border: 'border-[#CFE2C8]',
      text: 'text-[#3E6B33]',
      icon: ShieldCheck
    },
    MINIMAL: {
      label: 'Minimal Risk',
      bg: 'bg-[#F0F5F5]',
      border: 'border-[#CFDFE1]',
      text: 'text-[#30494B]',
      icon: Shield
    }
  }[level];

  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1.5 font-medium',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-semibold',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-semibold'
  }[size];

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4'
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-md border ${config.bg} ${config.border} ${config.text} ${sizeClasses} whitespace-nowrap`}
    >
      {showIcon && <Icon className={`${iconSizes} shrink-0`} aria-hidden="true" />}
      <span>{config.label}</span>
    </span>
  );
};

export const SeverityBadge: React.FC<{ severity: FindingSeverity }> = ({ severity }) => {
  const styles = {
    critical: 'bg-[#FDF2F0] border-[#F0C4BF] text-[#B94D42]',
    high: 'bg-[#FFF7ED] border-[#FED7AA] text-[#C96839]',
    medium: 'bg-[#FEFCE8] border-[#FEF08A] text-[#856C16]',
    low: 'bg-[#F4F9F1] border-[#CFE2C8] text-[#3E6B33]'
  }[severity];

  const labels = {
    critical: 'Critical',
    high: 'High',
    medium: 'Medium',
    low: 'Low'
  }[severity];

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider border ${styles}`}
    >
      {labels}
    </span>
  );
};
