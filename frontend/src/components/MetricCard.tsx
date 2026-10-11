import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon: LucideIcon;
  badge?: {
    text: string;
    variant: 'critical' | 'high' | 'medium' | 'low' | 'info' | 'neutral';
  };
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtext,
  icon: Icon,
  badge,
}) => {
  return (
    <div className="forensic-card p-5 forensic-card-interactive flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">
          {label}
        </span>
        <div className="w-8 h-8 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600">
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-bold tracking-tight text-slate-900 font-sans">
            {value}
          </span>
          {badge && (
            <span
              className={`text-[11px] font-mono font-medium px-2 py-0.5 rounded border ${
                badge.variant === 'critical'
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : badge.variant === 'high'
                  ? 'bg-orange-50 text-orange-700 border-orange-200'
                  : badge.variant === 'low'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}
            >
              {badge.text}
            </span>
          )}
        </div>
        {subtext && <p className="text-xs text-slate-500 mt-1">{subtext}</p>}
      </div>
    </div>
  );
};
