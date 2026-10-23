import React, { useState, useEffect } from 'react';
import { Department } from '../../shared/types.js';
import { api } from '../lib/api.js';
import { useToast } from '../context/ToastContext.js';
import { X, Building2, Check, Loader2 } from 'lucide-react';

interface AssignDeptModalProps {
  complaintId: string;
  currentDeptId?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AssignDeptModal: React.FC<AssignDeptModalProps> = ({
  complaintId,
  currentDeptId,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { success, error } = useToast();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string>(currentDeptId || '');
  const [citizenRemark, setCitizenRemark] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedDeptId(currentDeptId || '');
    setCitizenRemark('');
    setInternalNote('');

    const fetchDepts = async () => {
      try {
        setFetching(true);
        const data = await api.get<{ departments: Department[] }>('/admin/departments');
        setDepartments(data.departments.filter((d) => d.active));
      } catch (err: any) {
        error('Failed to load departments', err.message);
      } finally {
        setFetching(false);
      }
    };
    fetchDepts();
  }, [isOpen, currentDeptId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeptId) {
      error('Please select a department.');
      return;
    }

    try {
      setLoading(true);
      await api.post(`/admin/complaints/${complaintId}/assign`, {
        departmentId: selectedDeptId,
        citizenRemark: citizenRemark.trim() || undefined,
        internalNote: internalNote.trim() || undefined,
      });

      success('Department Assigned', `Grievance #${complaintId} has been successfully assigned.`);
      onSuccess();
      onClose();
    } catch (err: any) {
      error('Assignment failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden transform transition-all">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-base">Assign Municipal Department</h3>
              <p className="text-xs text-slate-500">Routing grievance #{complaintId}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {fetching ? (
            <div className="py-8 text-center text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
              Loading departments...
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Department <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedDeptId}
                  onChange={(e) => setSelectedDeptId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">-- Choose Department --</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Citizen-Visible Remark
                </label>
                <input
                  type="text"
                  placeholder="e.g. Assigned to PWD Sub-division 3 for road inspection."
                  value={citizenRemark}
                  onChange={(e) => setCitizenRemark(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  The citizen will receive this message in their notification & status timeline.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Internal Administrative Note (Restricted)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Contractor penalty clause applies if pothole not filled within 48h."
                  value={internalNote}
                  onChange={(e) => setInternalNote(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Confirm Assignment
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};
