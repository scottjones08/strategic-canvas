/**
 * ParticipantsPanel - Office 365-style collaboration panel
 * 
 * Shows all participants with their colors, cursors, and activity status.
 * Includes follow mode, activity feed, and editing indicators.
 */

import React, { memo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Eye,
  EyeOff,
  Edit3,
  MousePointer2,
  Circle,
  ChevronRight,
  ChevronLeft,
  UserPlus,
  Link2,
  Copy,
  Check,
  Wifi,
  WifiOff,
  MessageCircle,
  Bell,
  BellOff,
  Sparkles,
  Target,
} from 'lucide-react';
import { UserPresence, getUserInitials } from '../lib/realtime-collaboration';

export interface ParticipantActivity {
  userId: string;
  type: 'joined' | 'left' | 'editing' | 'comment' | 'reaction';
  nodeId?: string;
  nodeName?: string;
  timestamp: Date;
}

interface ParticipantsPanelProps {
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
}

// Participant row component
const ParticipantRow = memo(({
  user,
  isCurrentUser,
  isEditing,
  editingNodeName,
  isFollowing,
  onFollow,
}: {
  user: UserPresence | { id: string; name: string; color: string; isOnline?: boolean; cursor?: { x: number; y: number } | null };
  isCurrentUser?: boolean;
  isEditing?: boolean;
  editingNodeName?: string;
  isFollowing?: boolean;
  onFollow?: () => void;
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
        flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer
        ${isFollowing ? 'bg-indigo-50 ring-2 ring-indigo-200' : 'hover:bg-gray-50'}
        ${!isCurrentUser && onFollow ? 'group' : ''}
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
          style={{ 
            backgroundColor: user.color,
            ringColor: isCurrentUser ? user.color : undefined,
          }}
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
      {!isCurrentUser && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {isFollowing ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-600 rounded-full text-xs font-medium"
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
  connectionError,
  editingNodes,
  showCursors,
  onToggleCursors,
  onFollowUser,
  followingUserId,
  onInvite,
  shareUrl,
  recentActivity = [],
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'people' | 'activity'>('people');
  const [copied, setCopied] = useState(false);

  // Get editing info for each user
  const getEditingInfo = useCallback((userId: string) => {
    if (!editingNodes) return null;
    for (const [nodeId, editor] of editingNodes.entries()) {
      if (editor.userId === userId) {
        return { nodeId, nodeName: editor.userName };
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

  const totalParticipants = users.length + 1;

  return (
    <motion.div
      initial={{ x: 300 }}
      animate={{ x: isExpanded ? 0 : 260 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="fixed right-0 top-20 bottom-4 w-80 z-40"
    >
      {/* Toggle button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute -left-10 top-4 w-10 h-10 bg-white rounded-l-xl shadow-lg border border-r-0 border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
      >
        {isExpanded ? (
          <ChevronRight className="w-5 h-5 text-gray-600" />
        ) : (
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        )}
      </button>

      {/* Panel content */}
      <div className="h-full bg-white rounded-l-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">
                Participants
              </h3>
              <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs font-medium text-gray-600">
                {totalParticipants}
              </span>
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

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
            <button
              onClick={() => setActiveTab('people')}
              className={`
                flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all
                ${activeTab === 'people' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
                }
              `}
            >
              <Users className="w-4 h-4" />
              People
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`
                flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all
                ${activeTab === 'activity' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
                }
              `}
            >
              <Sparkles className="w-4 h-4" />
              Activity
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <button
            onClick={onToggleCursors}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
              ${showCursors 
                ? 'bg-indigo-100 text-indigo-700' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }
            `}
          >
            {showCursors ? (
              <Eye className="w-4 h-4" />
            ) : (
              <EyeOff className="w-4 h-4" />
            )}
            Cursors
          </button>
          
          {followingUserId && (
            <button
              onClick={() => onFollowUser?.(null)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-amber-100 text-amber-700"
            >
              <Target className="w-4 h-4" />
              Stop Following
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'people' ? (
              <motion.div
                key="people"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-2"
              >
                {/* Current user */}
                <ParticipantRow
                  user={currentUser}
                  isCurrentUser
                  isEditing={!!getEditingInfo(currentUser.id)}
                />
                
                {/* Divider */}
                {users.length > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-xs text-gray-400">Others</span>
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
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                      <Users className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-500 mb-1">No one else is here</p>
                    <p className="text-xs text-gray-400">Invite others to collaborate!</p>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="activity"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-4"
              >
                {recentActivity.length > 0 ? (
                  <div className="space-y-1">
                    {recentActivity.map((activity, idx) => (
                      <ActivityItem key={idx} activity={activity} users={users} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-500 mb-1">No recent activity</p>
                    <p className="text-xs text-gray-400">Activity will appear here</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer - Invite */}
        <div className="p-4 border-t border-gray-100 space-y-2">
          {shareUrl && (
            <button
              onClick={handleCopyLink}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="text-green-600">Copied!</span>
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4" />
                  Copy invite link
                </>
              )}
            </button>
          )}
          
          {onInvite && (
            <button
              onClick={onInvite}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Invite people
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
});

ParticipantsPanel.displayName = 'ParticipantsPanel';

export default ParticipantsPanel;
