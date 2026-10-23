import React from 'react';
import { AlertOctagon, Flame, ArrowUp, ArrowDown } from 'lucide-react';
import { ComplaintPriority, PRIORITY_LABELS } from '../../shared/types.js';

interface PriorityBadgeProps {
  priority: ComplaintPriority;
  size?: 'sm' | 'md';
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, size = 'md' }) => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
  };

  const config: Record<
    ComplaintPriority,
    { bg: string; text: string; border: string; icon: React.ReactNode }
  > = {
    CRITICAL: {
      bg: 'bg-rose-100',
      text: 'text-rose-800',
      border: 'border-rose-300',
      icon: <AlertOctagon className="w-3.5 h-3.5 mr-1 text-rose-600 animate-pulse" />,
    },
    HIGH: {
      bg: 'bg-orange-100',
      text: 'text-orange-800',
      border: 'border-orange-300',
      icon: <Flame className="w-3.5 h-3.5 mr-1 text-orange-600" />,
    },
    MEDIUM: {
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
      icon: <ArrowUp className="w-3.5 h-3.5 mr-1 text-amber-500" />,
    },
    LOW: {
      bg: 'bg-slate-100',
      text: 'text-slate-700',
      border: 'border-slate-200',
      icon: <ArrowDown className="w-3.5 h-3.5 mr-1 text-slate-500" />,
    },
  };

  const style = config[priority] || config.MEDIUM;

  return (
    <span
      className={`inline-flex items-center font-medium rounded-md border ${style.bg} ${style.text} ${style.border} ${sizeClasses[size]}`}
    >
      {style.icon}
      {PRIORITY_LABELS[priority] || priority}
    </span>
  );
};
