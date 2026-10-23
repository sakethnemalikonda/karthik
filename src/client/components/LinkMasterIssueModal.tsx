import React, { useState, useEffect } from 'react';
import { MasterIssue, ComplaintCategory } from '../../shared/types.js';
import { api } from '../lib/api.js';
import { useToast } from '../context/ToastContext.js';
import { X, Layers, Plus, Check, Loader2 } from 'lucide-react';

interface LinkMasterIssueModalProps {
  complaintId: string;
  category: ComplaintCategory;
  locality: string;
  currentMasterIssueId?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const LinkMasterIssueModal: React.FC<LinkMasterIssueModalProps> = ({
  complaintId,
  category,
  locality,
  currentMasterIssueId,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { success, error } = useToast();
  const [masterIssues, setMasterIssues] = useState<MasterIssue[]>([]);
  const [selectedId, setSelectedId] = useState<string>(currentMasterIssueId || '');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedId(currentMasterIssueId || '');
    setIsCreatingNew(false);

    const fetchMIs = async () => {
      try {
        setFetching(true);
        const data = await api.get<{ masterIssues: MasterIssue[] }>('/admin/master-issues');
        setMasterIssues(data.masterIssues || []);
      } catch (err: any) {
        error('Failed to load master issues', err.message);
      } finally {
        setFetching(false);
      }
    };
    fetchMIs();
  }, [isOpen, currentMasterIssueId]);

  if (!isOpen) return null;

  const handleLinkExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.post(`/admin/complaints/${complaintId}/link-master-issue`, {
        masterIssueId: selectedId || null,
      });

      success('Master Issue Updated', `Grievance #${complaintId} association updated.`);
      onSuccess();
      onClose();
    } catch (err: any) {
      error('Failed to link master issue', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDesc.trim()) {
      error('Title and description are required.');
      return;
    }

    try {
      setLoading(true);
      // Create master issue with this complaint initially linked
      const res = await api.post<{ id: string }>('/admin/master-issues', {
        title: newTitle.trim(),
        description: newDesc.trim(),
        category,
        locality,
        city: 'Bengaluru',
        initialComplaintIds: [complaintId],
      });

      success('Master Issue Created', `Master issue ${res.id} created and linked.`);
      onSuccess();
      onClose();
    } catch (err: any) {
      error('Failed to create master issue', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-base">Master Civic Issue Grouping</h3>
              <p className="text-xs text-slate-500">Associate #{complaintId} with localized incident</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex rounded-xl bg-slate-100 p-1 mb-4 text-xs font-semibold">
            <button
              onClick={() => setIsCreatingNew(false)}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                !isCreatingNew ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Link Existing Master Issue
            </button>
            <button
              onClick={() => setIsCreatingNew(true)}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                isCreatingNew ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              + Create New Master Issue
            </button>
          </div>

          {!isCreatingNew ? (
            <form onSubmit={handleLinkExisting} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Existing Master Incident
                </label>
                {fetching ? (
                  <div className="py-6 text-center text-xs text-slate-400">Loading master issues...</div>
                ) : (
                  <select
                    value={selectedId}
                    onChange={(e) => setSelectedId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- No Master Issue (Standalone Grievance) --</option>
                    {masterIssues.map((mi) => (
                      <option key={mi.id} value={mi.id}>
                        [{mi.id}] {mi.title} ({mi.locality} — {mi.complaintCount} linked)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm flex items-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Save Association
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleCreateNew} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Master Issue Headline <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Indiranagar 100ft Rd Water Pipeline Rupture & Road Cave-in"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Incident Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Summary of the root cause, affected zones, and coordinated inter-departmental action."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-500">
                <p>
                  <strong>Category:</strong> {category} &nbsp;•&nbsp; <strong>Locality:</strong> {locality}
                </p>
                <p className="mt-1">
                  Complaint #{complaintId} will automatically become the founding incident of this master cluster.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm flex items-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Create & Link
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
