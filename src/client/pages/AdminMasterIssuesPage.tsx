import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { useToast } from '../context/ToastContext.js';
import { MasterIssue, CATEGORY_LABELS } from '../../shared/types.js';
import { PriorityBadge } from '../components/PriorityBadge.js';
import { formatDate } from '../lib/utils.js';
import {
  Layers,
  MapPin,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Loader2,
  X,
} from 'lucide-react';

export const AdminMasterIssuesPage: React.FC = () => {
  const { success, error } = useToast();
  const [issues, setIssues] = useState<MasterIssue[]>([]);
  const [loading, setLoading] = useState(true);

  // Status edit
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchIssues = async () => {
    try {
      setLoading(true);
      const data = await api.get<{ masterIssues: MasterIssue[] }>('/admin/master-issues');
      setIssues(data.masterIssues || []);
    } catch (err: any) {
      error('Failed to load master issues', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      setUpdatingId(id);
      await api.patch(`/admin/master-issues/${id}`, { status: newStatus });
      success('Master Issue Updated', `Status set to ${newStatus}.`);
      fetchIssues();
    } catch (err: any) {
      error('Update failed', err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold mb-2 border border-purple-200">
          <Layers className="w-3.5 h-3.5" /> Clustered Civic Incidents
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Master Civic Issues
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Coordinated management for multi-complaint civic emergencies (e.g. major pipeline bursts, localized flooding, power grid failures).
        </p>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
          Loading master incident clusters...
        </div>
      ) : issues.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200/80 text-center space-y-2">
          <Layers className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="font-bold text-slate-800">No active master incidents</h3>
          <p className="text-xs text-slate-500">
            Cluster multiple related complaints from the Complaints Queue to create a master issue.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {issues.map((mi) => (
            <div
              key={mi.id}
              className="bg-white p-6 sm:p-7 rounded-3xl border border-purple-200/80 shadow-subtle hover:shadow-card transition-all space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-extrabold text-purple-800 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-lg">
                    {mi.id}
                  </span>
                  <PriorityBadge priority={mi.priority} size="sm" />
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                    {CATEGORY_LABELS[mi.category]}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-full text-indigo-800 text-xs font-bold">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{mi.complaintCount} Linked Grievances</span>
                </div>
              </div>

              <h3 className="text-base font-bold text-slate-900 leading-snug">{mi.title}</h3>

              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                {mi.description}
              </p>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                  <MapPin className="w-4 h-4 text-rose-500" />
                  <span>{mi.locality}, {mi.city}</span>
                </div>

                {/* Status selector */}
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-[11px]">Status:</span>
                  <select
                    value={mi.status}
                    disabled={updatingId === mi.id}
                    onChange={(e) => handleUpdateStatus(mi.id, e.target.value)}
                    className="px-2.5 py-1 rounded-lg border border-slate-300 text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="INVESTIGATING">INVESTIGATING</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="RESOLVED">RESOLVED</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>Incident Logged: {formatDate(mi.createdAt)}</span>
                <span>Last Updated: {formatDate(mi.updatedAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
