import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';
import { Complaint, CATEGORY_LABELS } from '../../shared/types.js';
import { StatusBadge } from '../components/StatusBadge.js';
import { PriorityBadge } from '../components/PriorityBadge.js';
import { formatDate, timeAgo } from '../lib/utils.js';
import {
  FilePlus2,
  Search,
  Clock,
  CheckCircle2,
  Hammer,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  MapPin,
  Sparkles,
  Loader2,
  Layers,
} from 'lucide-react';

interface CitizenDashboardProps {
  navigate: (path: string) => void;
}

export const CitizenDashboard: React.FC<CitizenDashboardProps> = ({ navigate }) => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMyComplaints = async () => {
    try {
      setLoading(true);
      const data = await api.get<{ complaints: Complaint[] }>('/complaints/mine');
      setComplaints(data.complaints || []);
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyComplaints();

    const handleUpdate = () => {
      fetchMyComplaints();
    };
    window.addEventListener('complaint:updated', handleUpdate);
    window.addEventListener('complaint:new', handleUpdate);

    return () => {
      window.removeEventListener('complaint:updated', handleUpdate);
      window.removeEventListener('complaint:new', handleUpdate);
    };
  }, []);

  // Compute metrics from actual database records
  const total = complaints.length;
  const pending = complaints.filter((c) => c.status === 'SUBMITTED' || c.status === 'UNDER_REVIEW').length;
  const inProgress = complaints.filter((c) => c.status === 'ASSIGNED' || c.status === 'IN_PROGRESS').length;
  const resolved = complaints.filter((c) => c.status === 'RESOLVED' || c.status === 'CLOSED').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-8 rounded-3xl shadow-xl border border-indigo-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" /> Citizen Portal
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {user?.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
              Track your reported civic grievances in real-time, view municipal department remarks, and inspect verified field resolutions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate('/submit')}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-md transition-all flex items-center gap-2 group"
            >
              <FilePlus2 className="w-4 h-4" />
              File New Grievance
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button
              onClick={() => navigate('/track')}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold rounded-xl border border-white/20 backdrop-blur-md transition-all flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              Track Any ID
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-subtle">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">My Grievances</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
              #
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 mt-2">{total}</p>
          <span className="text-[11px] text-slate-400 mt-1 block">Registered in SmartGov</span>
        </div>

        {/* Pending */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-subtle">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700">Pending Review</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-amber-600 mt-2">{pending}</p>
          <span className="text-[11px] text-amber-700/70 mt-1 block">Under initial evaluation</span>
        </div>

        {/* In Progress */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-subtle">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-700">In Progress</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Hammer className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-indigo-600 mt-2">{inProgress}</p>
          <span className="text-[11px] text-indigo-700/70 mt-1 block">Field team assigned</span>
        </div>

        {/* Resolved */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-subtle">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700">Resolved & Closed</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-emerald-600 mt-2">{resolved}</p>
          <span className="text-[11px] text-emerald-700/70 mt-1 block">Satisfactorily remediated</span>
        </div>
      </div>

      {/* Recent Grievances List */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-card overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Grievances</h2>
            <p className="text-xs text-slate-500">Live progress and status of your filed civic issues</p>
          </div>
          <button
            onClick={() => navigate('/complaints')}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            View All ({total}) <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
            Loading grievances...
          </div>
        ) : complaints.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center">
              <FilePlus2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No grievances filed yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Spot a pothole, leaking pipe, or dark street? File your first grievance and let SmartGov AI route it to the right department.
            </p>
            <button
              onClick={() => navigate('/submit')}
              className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold shadow-sm"
            >
              File Grievance
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {complaints.slice(0, 5).map((c) => (
              <div
                key={c.id}
                onClick={() => navigate(`/complaints/${c.id}`)}
                className="p-5 hover:bg-slate-50/80 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-indigo-600">{c.id}</span>
                    <StatusBadge status={c.status} size="sm" />
                    <PriorityBadge priority={c.priority} size="sm" />
                    <span className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                      {CATEGORY_LABELS[c.category]}
                    </span>
                    {c.masterIssue && (
                      <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                        <Layers className="w-3 h-3" /> Master Incident
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 leading-snug">{c.title}</h4>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {c.locality}, {c.city}
                    </span>
                    <span>•</span>
                    <span>{timeAgo(c.createdAt)}</span>
                    {c.assignedDepartment && (
                      <>
                        <span>•</span>
                        <span className="text-slate-600 font-medium">{c.assignedDepartment.name}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 self-end sm:self-center">
                  <span>Track Details</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
