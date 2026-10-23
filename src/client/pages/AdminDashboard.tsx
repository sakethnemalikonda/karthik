import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';
import { DashboardMetrics, CATEGORY_LABELS } from '../../shared/types.js';
import { StatusBadge } from '../components/StatusBadge.js';
import { formatDate, timeAgo } from '../lib/utils.js';
import {
  Users,
  FileText,
  Clock,
  Hammer,
  CheckCircle2,
  AlertTriangle,
  Building,
  TrendingUp,
  ArrowRight,
  Shield,
  Layers,
  BarChart3,
  Loader2,
  Download,
} from 'lucide-react';

interface AdminDashboardProps {
  navigate: (path: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ navigate }) => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const data = await api.get<{ metrics: DashboardMetrics }>('/admin/overview');
      setMetrics(data.metrics);
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();

    const handleUpdate = () => {
      fetchMetrics();
    };

    window.addEventListener('complaint:updated', handleUpdate);
    window.addEventListener('complaint:new', handleUpdate);

    return () => {
      window.removeEventListener('complaint:updated', handleUpdate);
      window.removeEventListener('complaint:new', handleUpdate);
    };
  }, []);

  if (loading || !metrics) {
    return (
      <div className="py-24 text-center text-slate-400 flex items-center justify-center gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        Loading administrative metrics from persistent database...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white p-8 rounded-3xl border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold mb-2">
            <Shield className="w-3.5 h-3.5" /> Central Grievance Command Center
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Municipal Operations Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
            Live database-backed oversight across registered citizens, departmental routing SLAs, and verified resolutions.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap gap-2.5">
          <button
            onClick={() => navigate('/admin/complaints')}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md transition-all flex items-center gap-1.5"
          >
            <FileText className="w-4 h-4" />
            Manage Complaints
          </button>
          <button
            onClick={() => navigate('/admin/reports')}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl border border-white/10 transition-all flex items-center gap-1.5"
          >
            <BarChart3 className="w-4 h-4" />
            Analytics & Reports
          </button>
        </div>
      </div>

      {/* Metrics Counter Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-subtle">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Total Reports</span>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{metrics.totalComplaints}</p>
          <span className="text-[10px] text-slate-400 mt-1 block">Persistent DB Records</span>
        </div>

        {/* Pending */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-subtle">
          <span className="text-[11px] font-semibold text-amber-700 uppercase">Pending Review</span>
          <p className="text-2xl font-extrabold text-amber-600 mt-1">{metrics.pendingComplaints}</p>
          <span className="text-[10px] text-amber-700/70 mt-1 block">Awaiting Dispatch</span>
        </div>

        {/* In Progress */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-subtle">
          <span className="text-[11px] font-semibold text-indigo-700 uppercase">In Progress</span>
          <p className="text-2xl font-extrabold text-indigo-600 mt-1">{metrics.inProgressComplaints}</p>
          <span className="text-[10px] text-indigo-700/70 mt-1 block">Active Field Work</span>
        </div>

        {/* Resolved */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-subtle">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase">Resolved</span>
          <p className="text-2xl font-extrabold text-emerald-600 mt-1">{metrics.resolvedComplaints}</p>
          <span className="text-[10px] text-emerald-700/70 mt-1 block">{metrics.resolutionRate}% Resolution Rate</span>
        </div>

        {/* Critical Hazards */}
        <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-subtle">
          <span className="text-[11px] font-semibold text-rose-700 uppercase">Critical Priority</span>
          <p className="text-2xl font-extrabold text-rose-600 mt-1">{metrics.criticalComplaints}</p>
          <span className="text-[10px] text-rose-700/70 mt-1 block">Immediate Hazard Flags</span>
        </div>

        {/* Citizens */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-subtle">
          <span className="text-[11px] font-semibold text-purple-700 uppercase">Registered Citizens</span>
          <p className="text-2xl font-extrabold text-purple-700 mt-1">{metrics.totalCitizens}</p>
          <span className="text-[10px] text-purple-600/70 mt-1 block">{metrics.activeCitizens} Active Accounts</span>
        </div>
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Category Breakdown (2 Cols) */}
        <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-card space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Grievance Distribution by Civic Category</h3>
              <p className="text-xs text-slate-500">Live volume counts across municipal departments</p>
            </div>
            <span className="text-xs bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded">
              Civic Breakdown
            </span>
          </div>

          <div className="space-y-3.5">
            {metrics.categoryDistribution.map((item) => {
              const pct = metrics.totalComplaints > 0
                ? Math.round((item.count / metrics.totalComplaints) * 100)
                : 0;

              return (
                <div key={item.category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">{item.label}</span>
                    <span className="font-mono text-slate-500 font-bold">
                      {item.count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(4, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Department Workloads (1 Col) */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Department Workload</h3>
              <p className="text-xs text-slate-500">Active assignments</p>
            </div>
            <button
              onClick={() => navigate('/admin/departments')}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-bold"
            >
              Details
            </button>
          </div>

          <div className="space-y-3">
            {metrics.departmentWorkloads.map((dept) => (
              <div
                key={dept.departmentId}
                className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between"
              >
                <div>
                  <p className="text-xs font-bold text-slate-800 line-clamp-1">{dept.name}</p>
                  <span className="text-[10px] text-slate-400 font-mono">[{dept.code}]</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-extrabold text-indigo-600">{dept.active}</span>
                  <span className="text-[10px] text-slate-400 block">active</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live Recent Activity Stream */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-card space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Real-Time Grievance Activity Feed</h3>
            <p className="text-xs text-slate-500">Live operational ledger of citizen filings and department actions</p>
          </div>
          <button
            onClick={() => navigate('/admin/complaints')}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            Complaints Queue <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {metrics.recentActivity.map((act) => (
            <div
              key={act.id}
              onClick={() => navigate(`/complaints/${act.complaintId}`)}
              className="py-3.5 flex items-center justify-between hover:bg-slate-50/80 px-2 rounded-xl transition-colors cursor-pointer text-xs"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-indigo-600 font-bold">{act.complaintId}</span>
                <span className="text-slate-800 font-medium line-clamp-1 max-w-md">{act.title}</span>
              </div>

              <div className="flex items-center gap-3">
                <StatusBadge status={act.status} size="sm" />
                <span className="text-slate-400 text-[11px] whitespace-nowrap">{timeAgo(act.timestamp)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
