import React from 'react';

interface CircularScoreGaugeProps {
  score: number; // 0 - 100
  label: string;
  sublabel?: string;
  size?: number;
  strokeWidth?: number;
  variant?: 'risk' | 'coverage';
}

export const CircularScoreGauge: React.FC<CircularScoreGaugeProps> = ({
  score,
  label,
  sublabel,
  size = 110,
  strokeWidth = 9,
  variant = 'risk'
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.max(0, Math.min(100, score));
  const offset = circumference - (clampedScore / 100) * circumference;

  // Color logic
  let strokeColor = '#49686C';
  if (variant === 'risk') {
    if (clampedScore >= 75) strokeColor = '#B94D42';
    else if (clampedScore >= 55) strokeColor = '#C96839';
    else if (clampedScore >= 35) strokeColor = '#D1B653';
    else strokeColor = '#49686C';
  } else {
    // coverage
    if (clampedScore >= 75) strokeColor = '#30494B';
    else if (clampedScore >= 50) strokeColor = '#49686C';
    else strokeColor = '#D1B653';
  }

  return (
    <div className="flex flex-col items-center justify-center text-center">
      <div className="relative inline-flex items-center justify-center">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#E5E2D8"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-bold tracking-tight text-[#283638] font-mono tabular-nums">
            {clampedScore}
          </span>
          <span className="text-[10px] text-[#737A72] uppercase font-semibold tracking-wider">
            / 100
          </span>
        </div>
      </div>
      <span className="mt-2 text-xs font-semibold text-[#283638]">{label}</span>
      {sublabel && <span className="text-[11px] text-[#737A72]">{sublabel}</span>}
    </div>
  );
};
