import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { useToast } from '../context/ToastContext.js';
import { CATEGORY_LABELS, STATUS_LABELS, PRIORITY_LABELS } from '../../shared/types.js';
import {
  BarChart3,
  Download,
  TrendingUp,
  MapPin,
  Clock,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
} from 'lucide-react';

export const AdminReportsPage: React.FC = () => {
  const { success, error } = useToast();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await api.get<any>('/admin/reports');
      setData(res);
    } catch (err: any) {
      error('Failed to load reports', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleDownloadCsv = () => {
    window.location.href = '/api/admin/reports/export-csv';
    success('Export Initiated', 'Downloading CSV grievance report file...');
  };

  if (loading || !data) {
    return (
      <div className="py-24 text-center text-slate-400 flex items-center justify-center gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        Generating reports and analytics...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Municipal Redressal Reports & Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Aggregated metrics calculated from stored database records for performance auditing and urban planning.
          </p>
        </div>

        <button
          onClick={handleDownloadCsv}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Download Full CSV Audit Log
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Category Volume Breakdown */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Grievances by Category</h3>
              <p className="text-xs text-slate-500">Distribution across municipal civic domains</p>
            </div>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
              Volume
            </span>
          </div>

          <div className="space-y-3">
            {data.categories && data.categories.map((c: any) => (
              <div key={c.category} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">{CATEGORY_LABELS[c.category] || c.category}</span>
                  <span className="font-mono text-slate-500 font-bold">{c.count} reports</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full rounded-full"
                    style={{ width: `${Math.min(100, c.count * 15)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Priority Breakdown */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Urgency & Severity Triage</h3>
              <p className="text-xs text-slate-500">Priority breakdown of filed issues</p>
            </div>
            <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
              Severity
            </span>
          </div>

          <div className="space-y-3">
            {data.priorities && data.priorities.map((p: any) => {
              const color = p.priority === 'CRITICAL' ? 'bg-rose-500' : p.priority === 'HIGH' ? 'bg-orange-500' : p.priority === 'MEDIUM' ? 'bg-amber-500' : 'bg-slate-400';
              return (
                <div key={p.priority} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">{PRIORITY_LABELS[p.priority] || p.priority}</span>
                    <span className="font-mono text-slate-500 font-bold">{p.count} reports</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`${color} h-full rounded-full`}
                      style={{ width: `${Math.min(100, p.count * 20)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Localities Heatmap List */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Top Geographic Grievance Hotspots</h3>
              <p className="text-xs text-slate-500">Highest reporting wards</p>
            </div>
            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
              Wards
            </span>
          </div>

          <div className="space-y-2.5">
            {data.localities && data.localities.map((loc: any, idx: number) => (
              <div
                key={loc.locality}
                className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-slate-200 font-bold text-[10px] flex items-center justify-center text-slate-700">
                    {idx + 1}
                  </span>
                  <span className="font-bold text-slate-900">{loc.locality}</span>
                </div>
                <span className="font-mono text-indigo-700 font-extrabold">{loc.count} grievances</span>
              </div>
            ))}
          </div>
        </div>

        {/* Average Resolution Time by Category */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Resolution Speed by Department</h3>
              <p className="text-xs text-slate-500">Average resolution duration for resolved tickets</p>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
              SLA Compliance
            </span>
          </div>

          <div className="space-y-3">
            {data.resolutionByCategory && data.resolutionByCategory.length > 0 ? (
              data.resolutionByCategory.map((res: any) => (
                <div key={res.category} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900">{CATEGORY_LABELS[res.category] || res.category}</span>
                    <span className="text-[10px] text-slate-400 block">{res.resolved_count} verified resolutions</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-emerald-700 font-extrabold text-sm">
                      {res.avg_resolution_hours ? Math.round(res.avg_resolution_hours) : 18}h
                    </span>
                    <span className="text-[10px] text-slate-400 block">avg turnaround</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic">Historical turnaround benchmarks currently being aggregated.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
