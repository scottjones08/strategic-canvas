/**
 * Notification Center Component
 * 
 * In-app notification system with:
 * - Bell icon with unread badge
 * - Notification panel with history
 * - Toast notifications for real-time events
 * - Mark as read/unread
 * - Notification preferences
 * - Categories: tasks, meetings, team, integrations
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  X,
  Check,
  CheckCheck,
  Clock,
  Users,
  Mic,
  Zap,
  ListTodo,
  AlertCircle,
  Settings,
  Trash2,
  ChevronRight,
  Filter,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  Calendar,
  MessageSquare,
  FileText,
  Star,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

type NotificationType = 'task' | 'meeting' | 'team' | 'integration' | 'system';
type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
  avatar?: string;
  icon?: React.ReactNode;
}

interface NotificationPreferences {
  tasks: boolean;
  meetings: boolean;
  team: boolean;
  integrations: boolean;
  sound: boolean;
  desktop: boolean;
}

interface NotificationCenterProps {
  className?: string;
}

// ── Sample Notifications ─────────────────────────────────────────────────────

const sampleNotifications: Notification[] = [
  {
    id: '1',
    type: 'meeting',
    priority: 'high',
    title: 'Meeting Summary Ready',
    message: 'AI summary for "Q1 Strategy Review" is ready with 5 action items.',
    timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 min ago
    read: false,
    actionLabel: 'View Summary',
  },
  {
    id: '2',
    type: 'task',
    priority: 'urgent',
    title: 'Task Deadline Approaching',
    message: '"Finalize pricing model" is due tomorrow. Assigned to you.',
    timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 min ago
    read: false,
    actionLabel: 'View Task',
  },
  {
    id: '3',
    type: 'team',
    priority: 'low',
    title: 'New Comment',
    message: 'Alex Kim commented on your board "Market Analysis 2024".',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    read: false,
    avatar: 'AK',
  },
  {
    id: '4',
    type: 'integration',
    priority: 'medium',
    title: 'Slack Connected',
    message: 'Your Slack workspace has been successfully connected.',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    read: true,
  },
  {
    id: '5',
    type: 'task',
    priority: 'medium',
    title: 'Action Item Completed',
    message: 'Maria Lee completed "Research competitor pricing" on the Strategy board.',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    read: true,
    avatar: 'ML',
  },
  {
    id: '6',
    type: 'meeting',
    priority: 'low',
    title: 'Upcoming Meeting',
    message: '"Weekly Strategy Sync" starts in 30 minutes. 4 participants confirmed.',
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000),
    read: true,
  },
  {
    id: '7',
    type: 'system',
    priority: 'low',
    title: 'Template Available',
    message: 'New template "OKR Quarterly Review" has been added to the library.',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
    read: true,
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

const getNotificationIcon = (type: NotificationType): React.ReactNode => {
  switch (type) {
    case 'task': return <ListTodo className="w-4 h-4" />;
    case 'meeting': return <Mic className="w-4 h-4" />;
    case 'team': return <Users className="w-4 h-4" />;
    case 'integration': return <Zap className="w-4 h-4" />;
    case 'system': return <Star className="w-4 h-4" />;
  }
};

const getNotificationColor = (type: NotificationType): string => {
  switch (type) {
    case 'task': return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
    case 'meeting': return 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400';
    case 'team': return 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400';
    case 'integration': return 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400';
    case 'system': return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
  }
};

const getPriorityDot = (priority: NotificationPriority): string => {
  switch (priority) {
    case 'urgent': return 'bg-red-500';
    case 'high': return 'bg-orange-500';
    case 'medium': return 'bg-blue-500';
    case 'low': return 'bg-gray-400';
  }
};

const formatTimeAgo = (date: Date): string => {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
};

// ── Toast Component ──────────────────────────────────────────────────────────

const Toast: React.FC<{
  notification: Notification;
  onDismiss: () => void;
  onAction?: () => void;
}> = ({ notification, onDismiss, onAction }) => (
  <motion.div
    initial={{ opacity: 0, y: -20, x: 20 }}
    animate={{ opacity: 1, y: 0, x: 0 }}
    exit={{ opacity: 0, y: -20, x: 20 }}
    className="fixed top-4 right-4 z-[60] w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
  >
    <div className="p-4">
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-lg ${getNotificationColor(notification.type)} flex items-center justify-center flex-shrink-0`}>
          {getNotificationIcon(notification.type)}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{notification.title}</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{notification.message}</p>
          {notification.actionLabel && (
            <button
              onClick={onAction}
              className="text-xs text-blue-500 hover:text-blue-600 font-medium mt-1.5 flex items-center gap-1"
            >
              {notification.actionLabel}
              <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>
        <button
          onClick={onDismiss}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
        >
          <X className="w-3.5 h-3.5 text-gray-400" />
        </button>
      </div>
    </div>
    <motion.div
      initial={{ width: '100%' }}
      animate={{ width: '0%' }}
      transition={{ duration: 5, ease: 'linear' }}
      onAnimationComplete={onDismiss}
      className="h-0.5 bg-blue-500"
    />
  </motion.div>
);

// ── Notification Item ────────────────────────────────────────────────────────

const NotificationItem: React.FC<{
  notification: Notification;
  onMarkRead: () => void;
  onDelete: () => void;
}> = ({ notification, onMarkRead, onDelete }) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: 5 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, x: -100 }}
    className={`flex items-start gap-3 p-3 rounded-xl transition-colors cursor-pointer group ${
      notification.read
        ? 'hover:bg-gray-50 dark:hover:bg-gray-750'
        : 'bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-50 dark:hover:bg-blue-900/20'
    }`}
    onClick={onMarkRead}
  >
    {/* Avatar or Icon */}
    {notification.avatar ? (
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center flex-shrink-0 text-white text-xs font-medium">
        {notification.avatar}
      </div>
    ) : (
      <div className={`w-9 h-9 rounded-lg ${getNotificationColor(notification.type)} flex items-center justify-center flex-shrink-0`}>
        {getNotificationIcon(notification.type)}
      </div>
    )}

    {/* Content */}
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        {!notification.read && (
          <span className={`w-1.5 h-1.5 rounded-full ${getPriorityDot(notification.priority)} flex-shrink-0`} />
        )}
        <h4 className={`text-sm truncate ${notification.read ? 'text-gray-700 dark:text-gray-300' : 'font-semibold text-gray-900 dark:text-white'}`}>
          {notification.title}
        </h4>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{notification.message}</p>
      <span className="text-[10px] text-gray-400 mt-1 block">{formatTimeAgo(notification.timestamp)}</span>
    </div>

    {/* Actions */}
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
      <button
        onClick={(e) => { e.stopPropagation(); onMarkRead(); }}
        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
        title={notification.read ? 'Mark as unread' : 'Mark as read'}
      >
        {notification.read ? <EyeOff className="w-3.5 h-3.5 text-gray-400" /> : <Eye className="w-3.5 h-3.5 text-gray-400" />}
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
        title="Delete"
      >
        <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
      </button>
    </div>
  </motion.div>
);

// ── Main Component ───────────────────────────────────────────────────────────

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(sampleNotifications);
  const [activeFilter, setActiveFilter] = useState<NotificationType | 'all'>('all');
  const [toasts, setToasts] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    tasks: true,
    meetings: true,
    team: true,
    integrations: true,
    sound: true,
    desktop: false,
  });
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowPreferences(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Simulate incoming notification
  useEffect(() => {
    const timer = setTimeout(() => {
      const newNotification: Notification = {
        id: `new-${Date.now()}`,
        type: 'meeting',
        priority: 'high',
        title: 'Live Meeting Detected',
        message: 'A meeting is in progress. Would you like to start capturing?',
        timestamp: new Date(),
        read: false,
        actionLabel: 'Start Capture',
      };
      setToasts((prev) => [...prev, newNotification]);
      setNotifications((prev) => [newNotification, ...prev]);
    }, 30000); // 30 seconds after mount

    return () => clearTimeout(timer);
  }, []);

  const handleMarkRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n))
    );
  }, []);

  const handleDelete = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const handleMarkAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const handleClearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const handleDismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const filteredNotifications = notifications.filter(
    (n) => activeFilter === 'all' || n.type === activeFilter
  );

  const filterTabs: { id: NotificationType | 'all'; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'All', icon: <Bell className="w-3.5 h-3.5" /> },
    { id: 'task', label: 'Tasks', icon: <ListTodo className="w-3.5 h-3.5" /> },
    { id: 'meeting', label: 'Meetings', icon: <Mic className="w-3.5 h-3.5" /> },
    { id: 'team', label: 'Team', icon: <Users className="w-3.5 h-3.5" /> },
    { id: 'integration', label: 'Integrations', icon: <Zap className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className={`relative ${className}`} ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={() => { setIsOpen(!isOpen); setShowPreferences(false); }}
        className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        title="Notifications"
      >
        <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Notification Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-12 w-96 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50"
          >
            {showPreferences ? (
              /* Preferences View */
              <div>
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                  <button
                    onClick={() => setShowPreferences(false)}
                    className="text-sm text-blue-500 hover:text-blue-600 font-medium"
                  >
                    ← Back
                  </button>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Preferences</h3>
                  <div className="w-10" />
                </div>
                <div className="p-4 space-y-3">
                  {[
                    { key: 'tasks' as const, label: 'Task Notifications', desc: 'Deadlines, assignments, completions', icon: <ListTodo className="w-4 h-4" /> },
                    { key: 'meetings' as const, label: 'Meeting Notifications', desc: 'Summaries, upcoming meetings, captures', icon: <Mic className="w-4 h-4" /> },
                    { key: 'team' as const, label: 'Team Activity', desc: 'Comments, mentions, board changes', icon: <Users className="w-4 h-4" /> },
                    { key: 'integrations' as const, label: 'Integration Events', desc: 'Connection status, sync updates', icon: <Zap className="w-4 h-4" /> },
                    { key: 'sound' as const, label: 'Sound Alerts', desc: 'Play sound for new notifications', icon: <Volume2 className="w-4 h-4" /> },
                  ].map((pref) => (
                    <div key={pref.key} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-750">
                      <div className="flex items-center gap-3">
                        <div className="text-gray-400">{pref.icon}</div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white">{pref.label}</h4>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400">{pref.desc}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setPreferences((p) => ({ ...p, [pref.key]: !p[pref.key] }))}
                        className={`relative w-10 h-5 rounded-full transition-colors ${
                          preferences[pref.key] ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                            preferences[pref.key] ? 'translate-x-5' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Main Notifications View */
              <>
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    Notifications
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold rounded-full">
                        {unreadCount} new
                      </span>
                    )}
                  </h3>
                  <div className="flex items-center gap-1">
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="Mark all as read"
                      >
                        <CheckCheck className="w-4 h-4 text-gray-400" />
                      </button>
                    )}
                    <button
                      onClick={() => setShowPreferences(true)}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="Notification preferences"
                    >
                      <Settings className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-100 dark:border-gray-700 overflow-x-auto">
                  {filterTabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveFilter(tab.id)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                        activeFilter === tab.id
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      {tab.icon}
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Notification List */}
                <div className="max-h-[400px] overflow-y-auto">
                  {filteredNotifications.length > 0 ? (
                    <div className="p-2 space-y-0.5">
                      <AnimatePresence>
                        {filteredNotifications.map((notification) => (
                          <NotificationItem
                            key={notification.id}
                            notification={notification}
                            onMarkRead={() => handleMarkRead(notification.id)}
                            onDelete={() => handleDelete(notification.id)}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <div className="py-12 text-center">
                      <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                      <p className="text-sm text-gray-400">No notifications</p>
                      <p className="text-xs text-gray-300 dark:text-gray-600 mt-0.5">You&apos;re all caught up!</p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                {notifications.length > 0 && (
                  <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <button
                      onClick={handleClearAll}
                      className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                    >
                      Clear all
                    </button>
                    <span className="text-[10px] text-gray-300 dark:text-gray-600">
                      {notifications.length} notifications
                    </span>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notifications */}
      <AnimatePresence>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            notification={toast}
            onDismiss={() => handleDismissToast(toast.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

export default NotificationCenter;
