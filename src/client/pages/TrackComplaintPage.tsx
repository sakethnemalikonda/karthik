import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { useToast } from '../context/ToastContext.js';
import { ComplaintStatus, CATEGORY_LABELS, STATUS_LABELS } from '../../shared/types.js';
import { StatusBadge } from '../components/StatusBadge.js';
import { PriorityBadge } from '../components/PriorityBadge.js';
import { formatDate } from '../lib/utils.js';
import {
  Search,
  CheckCircle2,
  Clock,
  Building2,
  MapPin,
  ArrowRight,
  ShieldCheck,
  Loader2,
  Share2,
} from 'lucide-react';

interface TrackComplaintPageProps {
  initialComplaintId?: string;
  navigate: (path: string) => void;
}

export const TrackComplaintPage: React.FC<TrackComplaintPageProps> = ({
  initialComplaintId = '',
  navigate,
}) => {
  const { error, success } = useToast();
  const [complaintId, setComplaintId] = useState(initialComplaintId);
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchTrackData = async (idToFetch: string) => {
    if (!idToFetch.trim()) return;
    try {
      setLoading(true);
      const res = await api.get<{ complaint: any }>(`/complaints/track/${idToFetch.trim().toUpperCase()}`);
      setData(res.complaint);
    } catch (err: any) {
      error('Tracking Lookup Failed', err.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialComplaintId) {
      setComplaintId(initialComplaintId);
      fetchTrackData(initialComplaintId);
    }
  }, [initialComplaintId]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (complaintId.trim()) {
      fetchTrackData(complaintId);
    }
  };

  const steps: ComplaintStatus[] = ['SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED'];

  const getStepStatus = (step: ComplaintStatus, currentStatus: ComplaintStatus) => {
    const stepOrder: Record<ComplaintStatus, number> = {
      SUBMITTED: 1,
      UNDER_REVIEW: 2,
      ASSIGNED: 3,
      IN_PROGRESS: 4,
      RESOLVED: 5,
      CLOSED: 6,
    };

    const currentOrder = stepOrder[currentStatus] || 1;
    const thisOrder = stepOrder[step] || 1;

    if (thisOrder < currentOrder || currentStatus === 'CLOSED' || (thisOrder === 5 && currentStatus === 'RESOLVED')) {
      return 'completed';
    }
    if (thisOrder === currentOrder) {
      return 'current';
    }
    return 'upcoming';
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Title */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-1">
          <ShieldCheck className="w-3.5 h-3.5" /> Public Redressal Verification
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Track Grievance Status
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
          Enter any complaint reference number (e.g. SGC-2026-00001) to view real-time department milestones.
        </p>
      </div>

      {/* Search Input Bar */}
      <form
        onSubmit={handleSearch}
        className="max-w-xl mx-auto p-1.5 bg-white rounded-2xl border border-slate-300 shadow-card flex items-center gap-2 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all"
      >
        <div className="pl-3.5 text-slate-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          placeholder="Enter Grievance ID: SGC-2026-00001..."
          value={complaintId}
          onChange={(e) => setComplaintId(e.target.value)}
          className="flex-1 px-2 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none font-mono"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Search'}
        </button>
      </form>

      {/* Results */}
      {data && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-card p-6 sm:p-8 space-y-8 animate-fadeIn">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="font-mono text-base font-extrabold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-200">
                  {data.id}
                </span>
                <StatusBadge status={data.status} size="md" />
                <PriorityBadge priority={data.priority} size="sm" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mt-2">{data.title}</h2>
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                success('Link Copied', 'Shareable tracking URL copied to clipboard.');
              }}
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              title="Share"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>

          {/* Stepper Progress Bar */}
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-6">
              Resolution Milestones
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {steps.map((st, i) => {
                const stepState = getStepStatus(st, data.status);
                return (
                  <div
                    key={st}
                    className={`p-3 rounded-2xl border text-center transition-all ${
                      stepState === 'completed'
                        ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900'
                        : stepState === 'current'
                        ? 'bg-indigo-50 border-indigo-400 text-indigo-950 font-bold ring-2 ring-indigo-200 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}
                  >
                    <div className="flex justify-center mb-1">
                      {stepState === 'completed' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : stepState === 'current' ? (
                        <div className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                          {i + 1}
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border border-slate-300 text-[10px] flex items-center justify-center text-slate-400">
                          {i + 1}
                        </div>
                      )}
                    </div>
                    <span className="text-xs leading-tight block">{STATUS_LABELS[st]}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-slate-400 block mb-1">Locality & Ward</span>
              <p className="font-semibold text-slate-900 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                {data.locality}, {data.city}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-slate-400 block mb-1">Assigned Department</span>
              <p className="font-semibold text-slate-900 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                {data.department}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-slate-400 block mb-1">Submission Date</span>
              <p className="font-semibold text-slate-900 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {formatDate(data.createdAt)}
              </p>
            </div>
          </div>

          {/* Citizen-Visible Remarks Timeline */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <h4 className="font-bold text-slate-900 text-sm">Public Action Log</h4>
            <div className="space-y-2">
              {data.timeline && data.timeline.length > 0 ? (
                data.timeline.map((entry: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start justify-between gap-3 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-slate-800">{entry.citizen_remark || 'Status updated.'}</p>
                      <span className="text-[11px] text-slate-400 mt-1 block">
                        Action by: {entry.actor_role === 'ADMIN' ? 'Municipal Department Engineer' : 'Citizen'}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 whitespace-nowrap">
                      {formatDate(entry.created_at)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic">No public remarks recorded yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
