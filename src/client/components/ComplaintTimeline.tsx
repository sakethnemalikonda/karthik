import React from 'react';
import { StatusHistoryEntry } from '../../shared/types.js';
import { formatDate } from '../lib/utils.js';
import { StatusBadge } from './StatusBadge.js';
import { User, Shield, CheckCircle } from 'lucide-react';

interface ComplaintTimelineProps {
  history: StatusHistoryEntry[];
}

export const ComplaintTimeline: React.FC<ComplaintTimelineProps> = ({ history }) => {
  if (!history || history.length === 0) {
    return <p className="text-slate-500 text-sm italic">No status events recorded yet.</p>;
  }

  return (
    <div className="relative pl-6 border-l-2 border-slate-200 space-y-6 my-4">
      {history.map((entry, index) => {
        const isLatest = index === history.length - 1;
        const isAdmin = entry.actorRole === 'ADMIN';

        return (
          <div key={entry.id} className="relative group">
            {/* Timeline bullet */}
            <div
              className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 bg-white transition-all ${
                isLatest
                  ? 'border-indigo-600 ring-4 ring-indigo-100 bg-indigo-600'
                  : 'border-slate-400 group-hover:border-indigo-400'
              }`}
            />

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-subtle hover:shadow-card transition-shadow">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <StatusBadge status={entry.newStatus} size="sm" />
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    {isAdmin ? (
                      <>
                        <Shield className="w-3 h-3 text-indigo-600" />
                        <span className="font-medium text-slate-700">{entry.actorName}</span> (Municipal Authority)
                      </>
                    ) : (
                      <>
                        <User className="w-3 h-3 text-slate-500" />
                        <span className="font-medium text-slate-700">{entry.actorName}</span> (Citizen)
                      </>
                    )}
                  </span>
                </div>
                <span className="text-xs text-slate-400">{formatDate(entry.createdAt)}</span>
              </div>

              {entry.citizenRemark && (
                <div className="mt-2 text-sm text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <p className="leading-relaxed">{entry.citizenRemark}</p>
                </div>
              )}

              {entry.internalNote && (
                <div className="mt-2 text-xs text-amber-800 bg-amber-50/70 p-2 rounded border border-amber-200 flex items-start gap-2">
                  <span className="font-semibold text-amber-900 uppercase tracking-wider text-[10px] bg-amber-200 px-1 rounded">
                    Internal Admin Note:
                  </span>
                  <p className="italic">{entry.internalNote}</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
