/**
 * ParticipantsPanel - Unified right-side panel
 *
 * Combines:
 * - People (participants & collaborators)
 * - Actions (action items)
 * - Transcript (recording & transcription)
 * - History (board state history)
 */

import React, { memo, useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Eye,
  EyeOff,
  Edit3,
  MousePointer2,
  ChevronRight,
  ChevronLeft,
  UserPlus,
  Link2,
  Check,
  Wifi,
  WifiOff,
  Target,
  ListTodo,
  FileText,
  History,
  Mic,
  MicOff,
  StopCircle,
  Plus,
  User,
  Clock,
  Edit2,
  Loader2,
  Save,
  Download,
} from 'lucide-react';
import { UserPresence, getUserInitials } from '../lib/realtime-collaboration';

export interface ParticipantActivity {
  userId: string;
  type: 'joined' | 'left' | 'editing' | 'comment' | 'reaction';
  nodeId?: string;
  nodeName?: string;
  timestamp: Date;
}

export interface ActionItem {
  id: string;
  content: string;
  isComplete: boolean;
  assigneeId?: string;
}

export interface Participant {
  id: string;
  name: string;
  color: string;
  isActive?: boolean;
}

export interface HistoryEntry {
  nodes: any[];
  timestamp: Date;
  action: string;
}

export interface TranscriptSegment {
  id: string;
  speaker: string;
  speakerLabel?: string;
  text: string;
  startTime: number;
  confidence: number;
}

export interface TranscriptSpeaker {
  id: string;
  label: string;
  customName?: string;
  color: string;
}

export interface FullTranscript {
  segments: TranscriptSegment[];
  speakers: TranscriptSpeaker[];
  duration: number;
  createdAt: Date;
}

interface ParticipantsPanelProps {
  // Original props
  users: UserPresence[];
  currentUser: { id: string; name: string; color: string };
  isConnected: boolean;
  connectionError?: string | null;
  editingNodes?: Map<string, { userId: string; userName: string; color: string }>;
  showCursors: boolean;
  onToggleCursors: () => void;
  onFollowUser?: (userId: string | null) => void;
  followingUserId?: string | null;
  onInvite?: () => void;
  shareUrl?: string;
  recentActivity?: ParticipantActivity[];
  onEditUserName?: () => void;

  // Action items props
  actionItems?: ActionItem[];
  onToggleActionComplete?: (id: string) => void;
  onAddAction?: (content: string) => void;
  onAssignUser?: (id: string, assigneeId: string | undefined) => void;
  participants?: Participant[];

  // Transcript props
  isRecording?: boolean;
  isProcessing?: boolean;
  transcript?: FullTranscript | null;
  recordingDuration?: number;
  onStartRecording?: () => void;
  onStopRecording?: () => void;
  onSaveTranscript?: () => void;
  onExportTranscript?: (format: 'text' | 'markdown') => void;

  // History props
  history?: HistoryEntry[];
  currentHistoryIndex?: number;
  onRestoreHistory?: (index: number) => void;
}

type TabType = 'people' | 'actions' | 'transcript' | 'history';

// Format duration helper
const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const formatTimestamp = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Participant row component
const ParticipantRow = memo(({
  user,
  isCurrentUser,
  isEditing,
  editingNodeName,
  isFollowing,
  onFollow,
  onEditName,
}: {
  user: UserPresence | { id: string; name: string; color: string; isOnline?: boolean; cursor?: { x: number; y: number } | null };
  isCurrentUser?: boolean;
  isEditing?: boolean;
  editingNodeName?: string;
  isFollowing?: boolean;
  onFollow?: () => void;
  onEditName?: () => void;
}) => {
  const initials = getUserInitials(user.name);
  const isOnline = 'isOnline' in user ? user.isOnline !== false : true;
  const hasCursor = 'cursor' in user && user.cursor !== null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={`
        flex items-center gap-3 p-3 rounded-xl transition-all
        ${isFollowing ? 'bg-navy-50 ring-2 ring-navy-200' : 'hover:bg-gray-50'}
        ${!isCurrentUser && onFollow ? 'group cursor-pointer' : ''}
      `}
      onClick={!isCurrentUser ? onFollow : undefined}
    >
      {/* Avatar with status */}
      <div className="relative flex-shrink-0">
        <div
          className={`
            w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold
            transition-all duration-300 ease-out
            ${isEditing ? 'ring-2 ring-amber-400 ring-offset-2' : ''}
            ${isCurrentUser ? 'ring-2 ring-offset-2' : ''}
          `}
          style={{ backgroundColor: user.color }}
        >
          {initials}
        </div>

        {/* Online indicator */}
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={`
            absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white
            ${isOnline ? 'bg-green-500' : 'bg-gray-400'}
          `}
        />

        {/* Editing pulse ring */}
        {isEditing && (
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ border: `2px solid ${user.color}` }}
            initial={{ scale: 1, opacity: 0.8 }}
            animate={{ scale: 1.4, opacity: 0 }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </div>

      {/* User info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-900 truncate">
            {user.name}
          </p>
          {isCurrentUser && (
            <span className="text-xs text-gray-400">(You)</span>
          )}
        </div>

        {/* Activity status */}
        <div className="flex items-center gap-1.5 mt-0.5">
          {isEditing ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-1 text-xs text-amber-600"
            >
              <Edit3 className="w-3 h-3" />
              <span className="truncate">
                Editing{editingNodeName ? `: ${editingNodeName}` : '...'}
              </span>
            </motion.div>
          ) : hasCursor ? (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <MousePointer2 className="w-3 h-3" />
              <span>Active</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Eye className="w-3 h-3" />
              <span>Viewing</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      {isCurrentUser && onEditName && (
        <button
          onClick={(e) => { e.stopPropagation(); onEditName(); }}
          className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <Edit2 className="w-4 h-4" />
        </button>
      )}
      {!isCurrentUser && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {isFollowing ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-1 px-2 py-1 bg-navy-100 text-navy-700 rounded-full text-xs font-medium"
            >
              <Target className="w-3 h-3" />
              Following
            </motion.div>
          ) : (
            <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
              <Eye className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Color indicator bar */}
      <div
        className="w-1 h-8 rounded-full transition-all"
        style={{ backgroundColor: user.color }}
      />
    </motion.div>
  );
});

ParticipantRow.displayName = 'ParticipantRow';

// Activity feed item
const ActivityItem = memo(({ activity, users }: { activity: ParticipantActivity; users: UserPresence[] }) => {
  const user = users.find(u => u.id === activity.userId);
  if (!user) return null;

  const getActivityText = () => {
    switch (activity.type) {
      case 'joined':
        return 'joined the board';
      case 'left':
        return 'left the board';
      case 'editing':
        return `is editing ${activity.nodeName || 'a node'}`;
      case 'comment':
        return `commented on ${activity.nodeName || 'a node'}`;
      case 'reaction':
        return `reacted to ${activity.nodeName || 'a node'}`;
      default:
        return '';
    }
  };

  const timeAgo = getTimeAgo(activity.timestamp);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-2 py-2 text-xs"
    >
      <div
        className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
        style={{ backgroundColor: user.color }}
      >
        {getUserInitials(user.name).charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <span className="font-medium text-gray-900">{user.name}</span>{' '}
        <span className="text-gray-500">{getActivityText()}</span>
        <p className="text-gray-400 mt-0.5">{timeAgo}</p>
      </div>
    </motion.div>
  );
});

ActivityItem.displayName = 'ActivityItem';

// Helper function
function getTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// Main Panel Component
export const ParticipantsPanel: React.FC<ParticipantsPanelProps> = memo(({
  users,
  currentUser,
  isConnected,
  editingNodes,
  showCursors,
  onToggleCursors,
  onFollowUser,
  followingUserId,
  onInvite,
  shareUrl,
  recentActivity: _recentActivity = [],
  onEditUserName,
  // Action items
  actionItems = [],
  onToggleActionComplete,
  onAddAction,
  onAssignUser,
  participants = [],
  // Transcript
  isRecording = false,
  isProcessing = false,
  transcript,
  recordingDuration = 0,
  onStartRecording,
  onStopRecording,
  onSaveTranscript,
  onExportTranscript,
  // History
  history = [],
  currentHistoryIndex = 0,
  onRestoreHistory,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('people');
  const [copied, setCopied] = useState(false);
  const [newAction, setNewAction] = useState('');
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState<string | null>(null);
  const transcriptScrollRef = useRef<HTMLDivElement>(null);

  // Get editing info for each user
  const getEditingInfo = useCallback((userId: string) => {
    if (!editingNodes) return null;
    for (const [_nodeId, editor] of editingNodes.entries()) {
      if (editor.userId === userId) {
        return { nodeName: editor.userName };
      }
    }
    return null;
  }, [editingNodes]);

  const handleCopyLink = useCallback(() => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [shareUrl]);

  // Auto-switch to transcript tab when recording starts
  useEffect(() => {
    if (isRecording) {
      setActiveTab('transcript');
    }
  }, [isRecording]);

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptScrollRef.current && isRecording && activeTab === 'transcript') {
      transcriptScrollRef.current.scrollTop = transcriptScrollRef.current.scrollHeight;
    }
  }, [transcript?.segments.length, isRecording, activeTab]);

  const totalParticipants = users.length + 1;
  const pendingActionsCount = actionItems.filter(a => !a.isComplete).length;

  const tabs: { id: TabType; label: string; icon: typeof Users; badge?: number | string }[] = [
    {
      id: 'people',
      label: 'People',
      icon: Users,
      badge: totalParticipants > 1 ? totalParticipants : undefined
    },
    {
      id: 'actions',
      label: 'Actions',
      icon: ListTodo,
      badge: pendingActionsCount > 0 ? pendingActionsCount : undefined
    },
    {
      id: 'transcript',
      label: 'Transcript',
      icon: FileText,
      badge: isRecording ? formatDuration(recordingDuration) : undefined
    },
    {
      id: 'history',
      label: 'History',
      icon: History,
      badge: history.length > 1 ? history.length : undefined
    },
  ];

  return (
    <motion.div
      initial={{ x: 300 }}
      animate={{ x: isExpanded ? 0 : 300 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="fixed right-0 top-20 bottom-4 w-[340px] z-[100]"
    >
      {/* Toggle button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute -left-12 top-4 w-12 h-12 bg-white rounded-l-xl shadow-lg border border-r-0 border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
      >
        <div className="relative">
          {isExpanded ? (
            <ChevronRight className="w-5 h-5 text-gray-600" />
          ) : (
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          )}
          {/* Notification badges when collapsed */}
          {!isExpanded && (
            <>
              {isRecording && (
                <span className="absolute -top-2 -right-2 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              )}
              {pendingActionsCount > 0 && !isRecording && (
                <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] bg-navy-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {pendingActionsCount}
                </span>
              )}
            </>
          )}
        </div>
      </button>

      {/* Panel content */}
      <div className="h-full bg-white/95 backdrop-blur-xl rounded-l-2xl shadow-2xl border border-r-0 border-gray-200 flex flex-col overflow-hidden">
        {/* Header with connection status */}
        <div className="p-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 text-sm">Workspace</h3>
            </div>

            {/* Connection status */}
            <div
              className={`
                flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
                ${isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}
              `}
            >
              {isConnected ? (
                <>
                  <Wifi className="w-3 h-3" />
                  <span>Live</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3" />
                  <span>Offline</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-2 py-2 border-b border-gray-100 bg-gray-50/50">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  relative flex-1 flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg text-xs font-medium transition-all
                  ${activeTab === tab.id
                    ? tab.id === 'transcript' && isRecording
                      ? 'bg-red-500 text-white'
                      : 'bg-white text-gray-900 shadow-sm border border-gray-200'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }
                `}
              >
                <tab.icon className="w-4 h-4" />
                <span className="text-[10px]">{tab.label}</span>
                {tab.badge && (
                  <span className={`absolute -top-1 -right-1 min-w-[16px] h-[16px] text-[9px] font-bold rounded-full flex items-center justify-center px-1 ${
                    activeTab === tab.id
                      ? tab.id === 'transcript' && isRecording
                        ? 'bg-white text-red-600'
                        : 'bg-navy-500 text-white'
                      : 'bg-gray-300 text-gray-700'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {/* People Tab */}
            {activeTab === 'people' && (
              <motion.div
                key="people"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full flex flex-col"
              >
                {/* Cursor toggle */}
                <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-2">
                  <button
                    onClick={onToggleCursors}
                    className={`
                      flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                      ${showCursors
                        ? 'bg-navy-100 text-navy-800'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }
                    `}
                  >
                    {showCursors ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    Cursors
                  </button>

                  {followingUserId && (
                    <button
                      onClick={() => onFollowUser?.(null)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-100 text-amber-700"
                    >
                      <Target className="w-3.5 h-3.5" />
                      Stop
                    </button>
                  )}
                </div>

                {/* Participants list */}
                <div className="flex-1 overflow-y-auto p-2">
                  {/* Current user */}
                  <ParticipantRow
                    user={currentUser}
                    isCurrentUser
                    isEditing={!!getEditingInfo(currentUser.id)}
                    onEditName={onEditUserName}
                  />

                  {/* Divider */}
                  {users.length > 0 && (
                    <div className="flex items-center gap-2 px-3 py-2">
                      <div className="flex-1 h-px bg-gray-200" />
                      <span className="text-xs text-gray-400">Collaborators</span>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>
                  )}

                  {/* Other participants */}
                  <AnimatePresence mode="popLayout">
                    {users.map(user => {
                      const editingInfo = getEditingInfo(user.id);
                      return (
                        <ParticipantRow
                          key={user.id}
                          user={user}
                          isEditing={!!editingInfo}
                          editingNodeName={editingInfo?.nodeName}
                          isFollowing={followingUserId === user.id}
                          onFollow={() => onFollowUser?.(
                            followingUserId === user.id ? null : user.id
                          )}
                        />
                      );
                    })}
                  </AnimatePresence>

                  {/* Empty state */}
                  {users.length === 0 && (
                    <div className="text-center py-6">
                      <Users className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm text-gray-500">Just you here</p>
                      <p className="text-xs text-gray-400">Invite others to collaborate</p>
                    </div>
                  )}
                </div>

                {/* Invite footer */}
                <div className="p-3 border-t border-gray-100 space-y-2">
                  {shareUrl && (
                    <button
                      onClick={handleCopyLink}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-green-600" />
                          <span className="text-green-600">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Link2 className="w-3.5 h-3.5" />
                          Copy invite link
                        </>
                      )}
                    </button>
                  )}

                  {onInvite && (
                    <button
                      onClick={onInvite}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-navy-700 hover:bg-navy-800 text-white rounded-lg text-xs font-medium transition-colors"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Invite people
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {/* Actions Tab */}
            {activeTab === 'actions' && (
              <motion.div
                key="actions"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full flex flex-col"
              >
                {/* Add new action */}
                <div className="p-3 border-b border-gray-100">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newAction}
                      onChange={(e) => setNewAction(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newAction.trim() && onAddAction) {
                          onAddAction(newAction);
                          setNewAction('');
                        }
                      }}
                      placeholder="Add action item..."
                      className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
                    />
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        if (newAction.trim() && onAddAction) {
                          onAddAction(newAction);
                          setNewAction('');
                        }
                      }}
                      className="px-3 py-2 bg-navy-500 text-white rounded-lg hover:bg-navy-700"
                    >
                      <Plus className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>

                {/* Actions list */}
                <div className="flex-1 overflow-y-auto p-2">
                  <AnimatePresence mode="popLayout">
                    {actionItems.map((item) => {
                      const assignee = participants.find(p => p.id === item.assigneeId);
                      return (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          layout
                          className={`flex items-start gap-3 p-3 rounded-xl mb-2 transition-colors ${
                            item.isComplete ? 'bg-gray-50' : 'bg-white border border-gray-100 shadow-sm'
                          }`}
                        >
                          <motion.button
                            whileHover={{ scale: 1.15 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => onToggleActionComplete?.(item.id)}
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                              item.isComplete ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 hover:border-emerald-400'
                            }`}
                          >
                            {item.isComplete && <Check className="w-3 h-3 text-white" />}
                          </motion.button>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${item.isComplete ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                              {item.content}
                            </p>
                            <div className="flex items-center gap-2 mt-2 relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowAssigneeDropdown(showAssigneeDropdown === item.id ? null : item.id);
                                }}
                                className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md transition-colors ${
                                  assignee ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:bg-gray-100'
                                }`}
                              >
                                {assignee ? (
                                  <>
                                    <div className="w-4 h-4 rounded-full text-white text-[9px] font-bold flex items-center justify-center" style={{ backgroundColor: assignee.color }}>
                                      {assignee.name.charAt(0)}
                                    </div>
                                    <span>{assignee.name}</span>
                                  </>
                                ) : (
                                  <>
                                    <User className="w-3.5 h-3.5" />
                                    <span>Assign</span>
                                  </>
                                )}
                              </button>
                              <AnimatePresence>
                                {showAssigneeDropdown === item.id && (
                                  <motion.div
                                    initial={{ opacity: 0, y: -5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -5 }}
                                    className="absolute left-0 top-full mt-1 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50 w-36"
                                  >
                                    <button
                                      onClick={() => { onAssignUser?.(item.id, undefined); setShowAssigneeDropdown(null); }}
                                      className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 text-gray-500"
                                    >
                                      Unassigned
                                    </button>
                                    {participants.map(p => (
                                      <button
                                        key={p.id}
                                        onClick={() => { onAssignUser?.(item.id, p.id); setShowAssigneeDropdown(null); }}
                                        className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 flex items-center gap-2"
                                      >
                                        <div className="w-4 h-4 rounded-full text-white text-[9px] font-bold flex items-center justify-center" style={{ backgroundColor: p.color }}>
                                          {p.name.charAt(0)}
                                        </div>
                                        <span className="text-gray-700">{p.name}</span>
                                      </button>
                                    ))}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                  {actionItems.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      <ListTodo className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      <p className="text-sm font-medium">No action items</p>
                      <p className="text-xs mt-1">Add tasks above</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Transcript Tab */}
            {activeTab === 'transcript' && (
              <motion.div
                key="transcript"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full flex flex-col"
              >
                {/* Recording controls */}
                <div className={`p-3 border-b ${isRecording ? 'bg-red-50' : 'bg-gray-50/50'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={isRecording ? onStopRecording : onStartRecording}
                        disabled={isProcessing}
                        className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                          isRecording
                            ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                            : isProcessing
                            ? 'bg-gray-300 cursor-not-allowed'
                            : 'bg-navy-500 hover:bg-navy-700'
                        }`}
                      >
                        {isProcessing ? (
                          <Loader2 className="w-5 h-5 text-white animate-spin" />
                        ) : isRecording ? (
                          <StopCircle className="w-5 h-5 text-white" />
                        ) : (
                          <Mic className="w-5 h-5 text-white" />
                        )}
                      </motion.button>
                      <div>
                        <p className={`font-semibold text-sm ${isRecording ? 'text-red-700' : 'text-gray-700'}`}>
                          {isRecording ? 'Recording...' : isProcessing ? 'Processing...' : 'Ready'}
                        </p>
                        <p className="text-xs text-gray-500 font-mono">{formatDuration(recordingDuration)}</p>
                      </div>
                    </div>
                    {transcript && transcript.segments.length > 0 && (
                      <div className="flex gap-1">
                        {onSaveTranscript && (
                          <button onClick={onSaveTranscript} className="p-2 hover:bg-gray-200 rounded-lg" title="Save">
                            <Save className="w-4 h-4 text-gray-500" />
                          </button>
                        )}
                        {onExportTranscript && (
                          <button onClick={() => onExportTranscript('markdown')} className="p-2 hover:bg-gray-200 rounded-lg" title="Export">
                            <Download className="w-4 h-4 text-gray-500" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Transcript content */}
                <div ref={transcriptScrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
                  {transcript && transcript.segments.length > 0 ? (
                    transcript.segments.map((segment, index) => {
                      const speaker = transcript.speakers.find(s => s.id === segment.speaker);
                      const isLatest = index === transcript.segments.length - 1;
                      return (
                        <motion.div
                          key={segment.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex gap-2 p-2.5 rounded-xl ${
                            isLatest && isRecording ? 'bg-navy-50 border-l-2 border-navy-500' : 'hover:bg-gray-50'
                          }`}
                        >
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ backgroundColor: speaker?.color || '#6b7280' }}
                          >
                            {(speaker?.customName || speaker?.label || '?').charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="font-medium text-xs" style={{ color: speaker?.color }}>
                                {speaker?.customName || speaker?.label || 'Unknown'}
                              </span>
                              <span className="text-[10px] text-gray-400">{formatTimestamp(segment.startTime)}</span>
                            </div>
                            <p className="text-sm text-gray-700 leading-relaxed">{segment.text}</p>
                          </div>
                        </motion.div>
                      );
                    })
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center text-gray-400">
                        <MicOff className="w-10 h-10 mx-auto mb-2 opacity-40" />
                        <p className="text-sm font-medium">No transcript</p>
                        <p className="text-xs mt-1">Click record to start</p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <motion.div
                key="history"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full flex flex-col"
              >
                <div className="p-3 border-b border-gray-100 bg-gray-50/50">
                  <p className="text-sm font-medium text-gray-700">
                    {history.length} state{history.length !== 1 ? 's' : ''} saved
                  </p>
                  <p className="text-xs text-gray-500">Click to restore</p>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {history.map((entry, index) => (
                    <button
                      key={index}
                      onClick={() => onRestoreHistory?.(index)}
                      className={`w-full p-3 text-left border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                        index === currentHistoryIndex ? 'bg-navy-50 border-l-2 border-l-navy-500' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-sm ${index === currentHistoryIndex ? 'font-semibold text-navy-800' : 'text-gray-700'}`}>
                          {entry.action}
                        </span>
                        {index === currentHistoryIndex && (
                          <span className="text-[10px] bg-navy-500 text-white px-2 py-0.5 rounded-full font-medium">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                        <Clock className="w-3 h-3" />
                        {entry.timestamp.toLocaleTimeString()}
                      </div>
                    </button>
                  ))}
                  {history.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      <History className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      <p className="text-sm font-medium">No history</p>
                      <p className="text-xs mt-1">Changes will appear here</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
});

ParticipantsPanel.displayName = 'ParticipantsPanel';

export default ParticipantsPanel;
