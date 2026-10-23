import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { useToast } from '../context/ToastContext.js';
import { formatDate, timeAgo } from '../lib/utils.js';
import {
  Users,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  X,
  FileText,
} from 'lucide-react';

interface CitizenRecord {
  id: string;
  phone: string;
  name: string;
  email?: string | null;
  status: 'ACTIVE' | 'DISABLED';
  createdAt: string;
  lastLoginAt?: string | null;
  totalComplaints: number;
  resolvedComplaints: number;
}

export const AdminUsersPage: React.FC = () => {
  const { success, error } = useToast();
  const [users, setUsers] = useState<CitizenRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Selected user detail drawer/modal
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userDetail, setUserDetail] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams();
      if (statusFilter !== 'ALL') query.set('status', statusFilter);
      if (search.trim()) query.set('search', search.trim());

      const data = await api.get<{ users: CitizenRecord[] }>(`/admin/users?${query.toString()}`);
      setUsers(data.users || []);
    } catch (err: any) {
      error('Failed to load users', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers();
  };

  const viewUserDetail = async (id: string) => {
    try {
      setSelectedUserId(id);
      setLoadingDetail(true);
      const data = await api.get<{ user: any; complaints: any[]; securityEvents: any[] }>(`/admin/users/${id}`);
      setUserDetail(data);
    } catch (err: any) {
      error('Failed to load citizen records', err.message);
    } finally {
      setLoadingDetail(false);
    }
  };

  const toggleUserStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    try {
      await api.patch(`/admin/users/${id}/status`, {
        status: nextStatus,
        reason: 'Administrative review on user management console.',
      });
      success('Status Updated', `Citizen account has been ${nextStatus.toLowerCase()}.`);
      fetchUsers();
      if (selectedUserId === id) {
        viewUserDetail(id);
      }
    } catch (err: any) {
      error('Action failed', err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Registered Citizens & Security Ledger
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Review registered citizen accounts, grievance history, and security events for municipal audit compliance.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-subtle flex flex-col sm:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, phone (+91...), or user ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
          />
        </form>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-auto"
        >
          <option value="ALL">All Account Statuses</option>
          <option value="ACTIVE">Active Citizens</option>
          <option value="DISABLED">Deactivated Accounts</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-card overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
            Loading registered citizens...
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No registered citizens found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-4">Citizen Name</th>
                  <th className="py-3.5 px-4">Mobile Number</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Grievance Count</th>
                  <th className="py-3.5 px-4">Registered Date</th>
                  <th className="py-3.5 px-4">Last Activity</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{u.name}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">{u.phone}</td>
                    <td className="py-3.5 px-4">
                      {u.status === 'ACTIVE' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-bold border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] bg-rose-50 text-rose-700 px-2.5 py-0.5 rounded-full font-bold border border-rose-200">
                          <XCircle className="w-3 h-3 text-rose-600" /> Disabled
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-indigo-700">{u.totalComplaints} filed</span>
                      <span className="text-slate-400 block text-[10px]">({u.resolvedComplaints} resolved)</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">{formatDate(u.createdAt)}</td>
                    <td className="py-3.5 px-4 text-slate-500">{timeAgo(u.lastLoginAt)}</td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => viewUserDetail(u.id)}
                        className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg transition-colors"
                      >
                        Inspect
                      </button>
                      <button
                        onClick={() => toggleUserStatus(u.id, u.status)}
                        className={`px-3 py-1 font-semibold rounded-lg transition-colors ${
                          u.status === 'ACTIVE'
                            ? 'bg-rose-50 hover:bg-rose-100 text-rose-700'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {u.status === 'ACTIVE' ? 'Disable' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Citizen Detail Modal Drawer */}
      {selectedUserId && userDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{userDetail.user.name}</h3>
                <p className="text-xs text-slate-500 font-mono">
                  {userDetail.user.phone} • {userDetail.user.id}
                </p>
              </div>
              <button
                onClick={() => { setSelectedUserId(null); setUserDetail(null); }}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Complaints list */}
            <div>
              <h4 className="font-bold text-slate-800 text-sm mb-2 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-indigo-600" />
                Grievance History ({userDetail.complaints.length})
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {userDetail.complaints.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No grievances filed by this citizen.</p>
                ) : (
                  userDetail.complaints.map((c: any) => (
                    <div
                      key={c.id}
                      className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-mono font-bold text-indigo-600 mr-2">{c.id}</span>
                        <span className="font-medium text-slate-900">{c.title}</span>
                      </div>
                      <span className="font-bold text-slate-600">{c.status}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Security Events */}
            <div>
              <h4 className="font-bold text-slate-800 text-sm mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Security & Authentication Audit Events
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {userDetail.securityEvents.map((ev: any) => (
                  <div
                    key={ev.id}
                    className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-800">{ev.event_type}</span>
                      <p className="text-[10px] text-slate-400">{ev.details || 'IP: ' + ev.ip_address}</p>
                    </div>
                    <span className="text-[10px] text-slate-400">{formatDate(ev.created_at)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => { setSelectedUserId(null); setUserDetail(null); }}
                className="px-5 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl"
              >
                Close Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
