import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';
import { useSocket } from '../context/SocketContext.js';
import { useToast } from '../context/ToastContext.js';
import { Complaint, CATEGORY_LABELS } from '../../shared/types.js';
import { StatusBadge } from '../components/StatusBadge.js';
import { PriorityBadge } from '../components/PriorityBadge.js';
import { ComplaintTimeline } from '../components/ComplaintTimeline.js';
import { AIAssessmentCard } from '../components/AIAssessmentCard.js';
import { AssignDeptModal } from '../components/AssignDeptModal.js';
import { UpdateStatusModal } from '../components/UpdateStatusModal.js';
import { LinkMasterIssueModal } from '../components/LinkMasterIssueModal.js';
import { formatDate } from '../lib/utils.js';
import {
  ArrowLeft,
  MapPin,
  Building2,
  Calendar,
  Layers,
  Sparkles,
  RefreshCw,
  User,
  Shield,
  Loader2,
  Share2,
} from 'lucide-react';

interface ComplaintDetailPageProps {
  complaintId: string;
  navigate: (path: string) => void;
}

export const ComplaintDetailPage: React.FC<ComplaintDetailPageProps> = ({
  complaintId,
  navigate,
}) => {
  const { user } = useAuth();
  const { trackComplaint, untrackComplaint } = useSocket();
  const { success, error, info } = useToast();

  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals for Admin
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [masterIssueModalOpen, setMasterIssueModalOpen] = useState(false);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const data = await api.get<{ complaint: Complaint }>(`/complaints/${complaintId}`);
      setComplaint(data.complaint);
    } catch (err: any) {
      error('Failed to load complaint', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
    trackComplaint(complaintId);

    const handleUpdate = () => {
      fetchDetail();
    };

    window.addEventListener('complaint:updated', handleUpdate);
    return () => {
      untrackComplaint(complaintId);
      window.removeEventListener('complaint:updated', handleUpdate);
    };
  }, [complaintId]);

  const copyTrackingLink = () => {
    const url = `${window.location.origin}/track/${complaintId}`;
    navigator.clipboard.writeText(url);
    success('Tracking Link Copied', 'Public tracking link copied to clipboard.');
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400 flex items-center justify-center gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        Loading grievance records...
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Grievance Not Found</h2>
        <p className="text-xs text-slate-500">
          The requested complaint reference does not exist or you do not have permission to view it.
        </p>
        <button
          onClick={() => navigate(user?.role === 'ADMIN' ? '/admin/complaints' : '/complaints')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
        >
          Return to List
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Bar Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          onClick={() => navigate(user?.role === 'ADMIN' ? '/admin/complaints' : '/complaints')}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Grievances
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={copyTrackingLink}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-subtle flex items-center gap-1.5 transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share Public Track Link
          </button>

          {user?.role === 'ADMIN' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAssignModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-all"
              >
                Assign Dept
              </button>
              <button
                onClick={() => setStatusModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Update Status
              </button>
              <button
                onClick={() => setMasterIssueModalOpen(true)}
                className="px-3 py-1.5 rounded-xl border border-purple-200 text-purple-700 hover:bg-purple-50 text-xs font-semibold transition-all flex items-center gap-1"
              >
                <Layers className="w-3.5 h-3.5" />
                Master Issue
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Header Card */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg">
              {complaint.id}
            </span>
            <StatusBadge status={complaint.status} size="lg" />
            <PriorityBadge priority={complaint.priority} size="md" />
            <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
              {CATEGORY_LABELS[complaint.category]}
            </span>
          </div>

          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            Reported: {formatDate(complaint.createdAt)}
          </span>
        </div>

        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight">
          {complaint.title}
        </h1>

        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50/60 p-4 rounded-2xl border border-slate-100">
          {complaint.description}
        </p>

        {/* Location & Metadata Pill Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-semibold text-slate-700 block">Locality</span>
              <p className="text-slate-600">{complaint.locality}, {complaint.city}</p>
              {complaint.address && <p className="text-slate-400 text-[11px] mt-0.5">{complaint.address}</p>}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
            <Building2 className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-semibold text-slate-700 block">Assigned Authority</span>
              <p className="text-slate-900 font-medium">
                {complaint.assignedDepartment ? complaint.assignedDepartment.name : 'Pending Assignment'}
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
            <Layers className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-semibold text-slate-700 block">Master Civic Incident</span>
              <p className="text-slate-900 font-medium">
                {complaint.masterIssue ? complaint.masterIssue.title : 'Standalone Grievance'}
              </p>
            </div>
          </div>
        </div>

        {/* Uploaded Image Evidence */}
        {complaint.imageUrl && (
          <div className="pt-4 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-2">
              Citizen Photo Evidence
            </span>
            <div className="rounded-2xl overflow-hidden border border-slate-200 w-fit max-w-md shadow-sm">
              <img src={complaint.imageUrl} alt="Grievance photo" className="max-h-72 object-cover" />
            </div>
          </div>
        )}
      </div>

      {/* AI Grievance Intelligence Report */}
      <AIAssessmentCard analysis={complaint.analysis} />

      {/* Immutable Status Timeline */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-card space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Municipal Redressal Timeline</h3>
            <p className="text-xs text-slate-500">Immutable ledger of status transitions and field inspection remarks</p>
          </div>
          <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-bold border border-emerald-200">
            Live Redressal Ledger
          </span>
        </div>

        <ComplaintTimeline history={complaint.statusHistory || []} />
      </div>

      {/* Admin Modals */}
      {user?.role === 'ADMIN' && (
        <>
          <AssignDeptModal
            complaintId={complaint.id}
            currentDeptId={complaint.assignedDepartmentId}
            isOpen={assignModalOpen}
            onClose={() => setAssignModalOpen(false)}
            onSuccess={fetchDetail}
          />

          <UpdateStatusModal
            complaintId={complaint.id}
            currentStatus={complaint.status}
            isOpen={statusModalOpen}
            onClose={() => setStatusModalOpen(false)}
            onSuccess={fetchDetail}
          />

          <LinkMasterIssueModal
            complaintId={complaint.id}
            category={complaint.category}
            locality={complaint.locality}
            currentMasterIssueId={complaint.masterIssueId}
            isOpen={masterIssueModalOpen}
            onClose={() => setMasterIssueModalOpen(false)}
            onSuccess={fetchDetail}
          />
        </>
      )}
    </div>
  );
};
