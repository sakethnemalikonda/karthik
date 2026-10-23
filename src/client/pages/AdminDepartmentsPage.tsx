import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { useToast } from '../context/ToastContext.js';
import { Department, ComplaintCategory, CATEGORY_LABELS } from '../../shared/types.js';
import {
  Building2,
  Plus,
  Mail,
  Phone,
  User,
  CheckCircle2,
  XCircle,
  Briefcase,
  X,
  Loader2,
} from 'lucide-react';

export const AdminDepartmentsPage: React.FC = () => {
  const { success, error } = useToast();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [headName, setHeadName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [categories, setCategories] = useState<ComplaintCategory[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const data = await api.get<{ departments: Department[] }>('/admin/departments');
      setDepartments(data.departments || []);
    } catch (err: any) {
      error('Failed to load departments', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const openAdd = () => {
    setEditingDept(null);
    setCode('');
    setName('');
    setDesc('');
    setHeadName('');
    setEmail('');
    setPhone('');
    setCategories(['OTHER']);
    setIsModalOpen(true);
  };

  const openEdit = (d: Department) => {
    setEditingDept(d);
    setCode(d.code);
    setName(d.name);
    setDesc(d.description);
    setHeadName(d.headName);
    setEmail(d.contactEmail);
    setPhone(d.contactPhone);
    setCategories(d.categories || []);
    setIsModalOpen(true);
  };

  const handleToggleCategory = (cat: ComplaintCategory) => {
    if (categories.includes(cat)) {
      setCategories(categories.filter((c) => c !== cat));
    } else {
      setCategories([...categories, cat]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (editingDept) {
        await api.patch(`/admin/departments/${editingDept.id}`, {
          name,
          headName,
          contactEmail: email,
          contactPhone: phone,
          categories,
        });
        success('Department Updated', `${name} updated successfully.`);
      } else {
        await api.post('/admin/departments', {
          code,
          name,
          description: desc,
          headName,
          contactEmail: email,
          contactPhone: phone,
          categories,
        });
        success('Department Created', `${name} added to municipal roster.`);
      }
      setIsModalOpen(false);
      fetchDepartments();
    } catch (err: any) {
      error('Operation failed', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Municipal Department Directory
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Configure jurisdiction authorities, category routing rules, and track department workloads.
          </p>
        </div>

        <button
          onClick={openAdd}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Department
        </button>
      </div>

      {/* Department Cards Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
          Loading department rosters...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {departments.map((d) => (
            <div
              key={d.id}
              className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-subtle hover:shadow-card transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    {d.code}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      d.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {d.active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    {d.active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 leading-snug">{d.name}</h3>

                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {d.description}
                </p>

                {/* Handled Categories */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {d.categories && d.categories.map((c) => (
                    <span key={c} className="text-[10px] bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded">
                      {CATEGORY_LABELS[c] || c}
                    </span>
                  ))}
                </div>

                {/* Contact info */}
                <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                  <div className="flex items-center gap-1.5 font-medium text-slate-800">
                    <User className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{d.headName}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{d.contactEmail}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500 font-mono">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{d.contactPhone}</span>
                  </div>
                </div>
              </div>

              {/* Workload footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Active Workload</span>
                  <span className="font-extrabold text-indigo-700 text-sm">{d.activeWorkload || 0} active</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px]">Resolved</span>
                  <span className="font-extrabold text-emerald-600 text-sm">{d.resolvedCount || 0}</span>
                </div>
                <button
                  onClick={() => openEdit(d)}
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors"
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">
                {editingDept ? 'Edit Department Roster' : 'Register New Department'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              {!editingDept && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Department Code</label>
                  <input
                    type="text"
                    placeholder="e.g. DEPT_HEALTH"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Department Name</label>
                <input
                  type="text"
                  placeholder="e.g. Public Health & Disease Surveillance"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Officer In Charge</label>
                <input
                  type="text"
                  placeholder="Name of Executive Engineer / Joint Commissioner"
                  value={headName}
                  onChange={(e) => setHeadName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Handled Categories</label>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(CATEGORY_LABELS) as ComplaintCategory[]).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleToggleCategory(cat)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                        categories.includes(cat)
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {CATEGORY_LABELS[cat]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 text-white font-semibold rounded-xl shadow-sm"
                >
                  Save Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
