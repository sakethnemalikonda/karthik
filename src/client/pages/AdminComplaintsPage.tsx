import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { useToast } from '../context/ToastContext.js';
import {
  Complaint,
  ComplaintCategory,
  ComplaintPriority,
  ComplaintStatus,
  CATEGORY_LABELS,
  STATUS_LABELS,
  PRIORITY_LABELS,
  Department,
} from '../../shared/types.js';
import { StatusBadge } from '../components/StatusBadge.js';
import { PriorityBadge } from '../components/PriorityBadge.js';
import { AssignDeptModal } from '../components/AssignDeptModal.js';
import { UpdateStatusModal } from '../components/UpdateStatusModal.js';
import { LinkMasterIssueModal } from '../components/LinkMasterIssueModal.js';
import { formatDate, timeAgo } from '../lib/utils.js';
import {
  Search,
  Filter,
  Building2,
  RefreshCw,
  Layers,
  MapPin,
  Sparkles,
  ArrowRight,
  Download,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface AdminComplaintsPageProps {
  navigate: (path: string) => void;
}

export const AdminComplaintsPage: React.FC<AdminComplaintsPageProps> = ({ navigate }) => {
  const { error, success } = useToast();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Active modals
  const [activeComplaint, setActiveComplaint] = useState<Complaint | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [masterIssueModalOpen, setMasterIssueModalOpen] = useState(false);

  const fetchDepartments = async () => {
    try {
      const data = await api.get<{ departments: Department[] }>('/admin/departments');
      setDepartments(data.departments || []);
    } catch {
      // Ignored
    }
  };

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams();
      if (statusFilter !== 'ALL') query.set('status', statusFilter);
      if (categoryFilter !== 'ALL') query.set('category', categoryFilter);
      if (priorityFilter !== 'ALL') query.set('priority', priorityFilter);
      if (deptFilter !== 'ALL') query.set('departmentId', deptFilter);
      if (search.trim()) query.set('search', search.trim());
      query.set('page', String(page));
      query.set('limit', '15');

      const data = await api.get<{
        complaints: Complaint[];
        pagination: { total: number; totalPages: number };
      }>(`/admin/complaints?${query.toString()}`);

      setComplaints(data.complaints || []);
      setTotalPages(data.pagination.totalPages || 1);
      setTotalCount(data.pagination.total || 0);
    } catch (err: any) {
      error('Failed to load complaints', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchComplaints();
  }, [statusFilter, categoryFilter, priorityFilter, deptFilter, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchComplaints();
  };

  const openAssign = (c: Complaint, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveComplaint(c);
    setAssignModalOpen(true);
  };

  const openStatus = (c: Complaint, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveComplaint(c);
    setStatusModalOpen(true);
  };

  const openMasterIssue = (c: Complaint, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveComplaint(c);
    setMasterIssueModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Grievance Redressal Queue
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Total {totalCount} complaints stored in live municipal database.
          </p>
        </div>

        <button
          onClick={() => {
            window.location.href = '/api/admin/reports/export-csv';
            success('Exporting CSV', 'Downloading complaints export...');
          }}
          className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 shadow-subtle flex items-center gap-2 self-start sm:self-auto"
        >
          <Download className="w-4 h-4" />
          Export All CSV
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-subtle space-y-3">
        <form onSubmit={handleSearchSubmit} className="relative w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by ID, keyword, citizen name, mobile (+91...), locality..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
          />
        </form>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700"
          >
            <option value="ALL">All Statuses</option>
            {Object.entries(STATUS_LABELS).map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>

          {/* Category */}
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700"
          >
            <option value="ALL">All Categories</option>
            {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>

          {/* Priority */}
          <select
            value={priorityFilter}
            onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700"
          >
            <option value="ALL">All Priorities</option>
            {Object.entries(PRIORITY_LABELS).map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>

          {/* Department */}
          <select
            value={deptFilter}
            onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Complaints Table / List */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-card overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
            Loading complaints queue...
          </div>
        ) : complaints.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No complaints match the specified filters.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {complaints.map((c) => (
              <div
                key={c.id}
                onClick={() => navigate(`/complaints/${c.id}`)}
                className="p-5 hover:bg-slate-50/80 transition-colors cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                {/* Left Info */}
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      {c.id}
                    </span>
                    <PriorityBadge priority={c.priority} size="sm" />
                    <StatusBadge status={c.status} size="sm" />
                    <span className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                      {CATEGORY_LABELS[c.category]}
                    </span>
                    {c.masterIssue && (
                      <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                        <Layers className="w-3 h-3" /> Master Ticket
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 leading-snug">{c.title}</h3>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1 text-slate-700 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {c.locality}, {c.city}
                    </span>
                    <span>•</span>
                    <span>Citizen: {c.citizenName} ({c.citizenPhone})</span>
                    <span>•</span>
                    <span>{timeAgo(c.createdAt)}</span>
                    {c.department && (
                      <>
                        <span>•</span>
                        <span className="text-indigo-700 font-semibold">{c.department.name}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Right Action Buttons */}
                <div className="flex items-center gap-2 self-start lg:self-center" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => openAssign(c, e)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Building2 className="w-3 h-3" />
                    Assign
                  </button>

                  <button
                    onClick={(e) => openStatus(c, e)}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Status
                  </button>

                  <button
                    onClick={(e) => openMasterIssue(c, e)}
                    className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Layers className="w-3 h-3" />
                    Cluster
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Admin Action Modals */}
      {activeComplaint && (
        <>
          <AssignDeptModal
            complaintId={activeComplaint.id}
            currentDeptId={activeComplaint.assignedDepartmentId}
            isOpen={assignModalOpen}
            onClose={() => setAssignModalOpen(false)}
            onSuccess={fetchComplaints}
          />

          <UpdateStatusModal
            complaintId={activeComplaint.id}
            currentStatus={activeComplaint.status}
            isOpen={statusModalOpen}
            onClose={() => setStatusModalOpen(false)}
            onSuccess={fetchComplaints}
          />

          <LinkMasterIssueModal
            complaintId={activeComplaint.id}
            category={activeComplaint.category}
            locality={activeComplaint.locality}
            currentMasterIssueId={activeComplaint.masterIssueId}
            isOpen={masterIssueModalOpen}
            onClose={() => setMasterIssueModalOpen(false)}
            onSuccess={fetchComplaints}
          />
        </>
      )}
    </div>
  );
};
