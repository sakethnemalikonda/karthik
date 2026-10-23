import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { useToast } from '../context/ToastContext.js';
import { Notification } from '../../shared/types.js';
import { formatDate, timeAgo } from '../lib/utils.js';
import {
  Bell,
  Check,
  CheckCheck,
  ExternalLink,
  Loader2,
  Inbox,
  Sparkles,
} from 'lucide-react';

interface NotificationsPageProps {
  navigate: (path: string) => void;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({ navigate }) => {
  const { success, error } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await api.get<{ notifications: Notification[] }>('/notifications');
      setNotifications(data.notifications || []);
    } catch (err: any) {
      error('Failed to load notifications', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch {
      // Ignored
    }
  };

  const markAllRead = async () => {
    try {
      await api.post('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      success('Marked All Read', 'All notifications have been marked as read.');
    } catch {
      // Ignored
    }
  };

  const filtered = filter === 'UNREAD' ? notifications.filter((n) => !n.read) : notifications;
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Notifications & Dispatch Alerts
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time notifications dispatched to your verified citizen account.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 self-start sm:self-auto"
          >
            <CheckCheck className="w-4 h-4" />
            Mark All as Read ({unreadCount})
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-3 text-xs font-semibold">
        <button
          onClick={() => setFilter('ALL')}
          className={`px-4 py-1.5 rounded-xl transition-all ${
            filter === 'ALL'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
          }`}
        >
          All Alerts ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('UNREAD')}
          className={`px-4 py-1.5 rounded-xl transition-all ${
            filter === 'UNREAD'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-card overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
            Loading notifications...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Inbox className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="font-bold text-slate-800 text-sm">No notifications found</h3>
            <p className="text-xs text-slate-500">You are all caught up on your municipal grievance updates.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((n) => (
              <div
                key={n.id}
                onClick={() => {
                  if (!n.read) markAsRead(n.id);
                  if (n.link) navigate(n.link);
                }}
                className={`p-5 hover:bg-slate-50/80 transition-colors cursor-pointer flex items-start justify-between gap-4 ${
                  !n.read ? 'bg-indigo-50/30' : ''
                }`}
              >
                <div className="flex items-start gap-3.5 flex-1">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-bold ${
                      n.type === 'RESOLVED'
                        ? 'bg-emerald-100 text-emerald-700'
                        : n.type === 'ASSIGNMENT'
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    <Bell className="w-4 h-4" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className={`text-sm ${!n.read ? 'font-extrabold text-indigo-950' : 'font-semibold text-slate-800'}`}>
                        {n.title}
                      </h4>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                      )}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">{n.message}</p>
                    <span className="text-[10px] text-slate-400 block pt-1">{formatDate(n.createdAt)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-center flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  {!n.read && (
                    <button
                      onClick={() => markAsRead(n.id)}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                      title="Mark as read"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {n.link && (
                    <button
                      onClick={() => navigate(n.link!)}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                      title="Open details"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
