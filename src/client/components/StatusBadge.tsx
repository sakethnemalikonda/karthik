import React from 'react';
import {
  Clock,
  Search,
  Building2,
  Hammer,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { ComplaintStatus, STATUS_LABELS } from '../../shared/types.js';

interface StatusBadgeProps {
  status: ComplaintStatus;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  const config: Record<
    ComplaintStatus,
    { bg: string; text: string; border: string; icon: React.ReactNode }
  > = {
    SUBMITTED: {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      icon: <Clock className="w-3.5 h-3.5 mr-1 text-amber-500" />,
    },
    UNDER_REVIEW: {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      icon: <Search className="w-3.5 h-3.5 mr-1 text-blue-500" />,
    },
    ASSIGNED: {
      bg: 'bg-indigo-50',
      text: 'text-indigo-700',
      border: 'border-indigo-200',
      icon: <Building2 className="w-3.5 h-3.5 mr-1 text-indigo-500" />,
    },
    IN_PROGRESS: {
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-200',
      icon: <Hammer className="w-3.5 h-3.5 mr-1 text-purple-500 animate-pulse" />,
    },
    RESOLVED: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      icon: <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />,
    },
    CLOSED: {
      bg: 'bg-slate-100',
      text: 'text-slate-700',
      border: 'border-slate-300',
      icon: <XCircle className="w-3.5 h-3.5 mr-1 text-slate-500" />,
    },
  };

  const style = config[status] || config.SUBMITTED;

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${style.bg} ${style.text} ${style.border} ${sizeClasses[size]}`}
    >
      {style.icon}
      {STATUS_LABELS[status] || status}
    </span>
  );
};
