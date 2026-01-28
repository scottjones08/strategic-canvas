/**
 * UserPresenceList Component
 * 
 * Shows who's currently on the board with avatars, online status,
 * and what they're doing (viewing, editing).
 */

import React, { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  ChevronDown, 
  ChevronUp, 
  Wifi, 
  WifiOff,
  Eye,
  Edit3,
  Circle
} from 'lucide-react';
import { UserPresence, getUserInitials } from '../lib/realtime-collaboration';

interface UserPresenceListProps {
  users: UserPresence[];
  currentUser: { id: string; name: string; color: string };
  isConnected: boolean;
  connectionError?: string | null;
  editingNodes?: Map<string, { userId: string; userName: string; color: string }>;
  onFollowUser?: (userId: string) => void;
  isDemoMode?: boolean;
}

// Individual user avatar with status
const UserAvatar = memo(({ 
  user, 
  isCurrentUser,
  isEditing,
  onClick
}: { 
  user: UserPresence | { id: string; name: string; color: string; isOnline?: boolean };
  isCurrentUser?: boolean;
  isEditing?: boolean;
  onClick?: () => void;
}) => {
  const initials = getUserInitials(user.name);
  const isOnline = 'isOnline' in user ? user.isOnline : true;

  return (
    <motion.button
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      exit={{ scale: 0 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`
        relative w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold
        transition-shadow cursor-pointer
        ${isCurrentUser ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-800' : ''}
      `}
      style={{ backgroundColor: user.color }}
      title={`${user.name}${isCurrentUser ? ' (You)' : ''}${isEditing ? ' - Editing' : ''}`}
    >
      {initials}
      
      {/* Online indicator */}
      <span 
        className={`
          absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white
          ${isOnline ? 'bg-green-500' : 'bg-gray-400'}
        `}
      />
      
      {/* Editing pulse */}
      {isEditing && (
        <motion.span
          initial={{ scale: 1, opacity: 0.5 }}
          animate={{ scale: 1.5, opacity: 0 }}
          transition={{ repeat: Infinity, duration: 1 }}
          className="absolute inset-0 rounded-full"
          style={{ backgroundColor: user.color }}
        />
      )}
    </motion.button>
  );
});

UserAvatar.displayName = 'UserAvatar';

// Connection status badge
const ConnectionBadge = memo(({ isConnected, error, isDemoMode }: { isConnected: boolean; error?: string | null; isDemoMode?: boolean }) => {
  if (isDemoMode) {
    return (
      <div 
        className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700"
        title="Demo Mode - Local storage only"
      >
        <span>✨ Demo</span>
      </div>
    );
  }
  
  return (
    <div 
      className={`
        flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
        ${isConnected 
          ? 'bg-green-100 text-green-700' 
          : 'bg-red-100 text-red-700'
        }
      `}
      title={error || (isConnected ? 'Connected' : 'Disconnected')}
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
  );
});

ConnectionBadge.displayName = 'ConnectionBadge';

// Expanded user list
const ExpandedUserList = memo(({ 
  users, 
  currentUser, 
  editingNodes,
  onFollowUser 
}: { 
  users: UserPresence[];
  currentUser: { id: string; name: string; color: string };
  editingNodes?: Map<string, { userId: string; userName: string; color: string }>;
  onFollowUser?: (userId: string) => void;
}) => {
  // Get what each user is doing
  const getUserActivity = (userId: string) => {
    if (editingNodes) {
      for (const [_, editor] of editingNodes.entries()) {
        if (editor.userId === userId) {
          return 'editing';
        }
      }
    }
    return 'viewing';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, height: 0 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      exit={{ opacity: 0, y: -10, height: 0 }}
      className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50"
    >
      <div className="p-3 border-b border-gray-100">
        <p className="text-sm font-semibold text-gray-700">
          {users.length + 1} {users.length === 0 ? 'person' : 'people'} on this board
        </p>
      </div>
      
      <div className="max-h-64 overflow-y-auto">
        {/* Current user */}
        <div className="flex items-center gap-3 p-3 hover:bg-gray-50">
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ring-2 ring-indigo-500"
            style={{ backgroundColor: currentUser.color }}
          >
            {getUserInitials(currentUser.name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {currentUser.name} <span className="text-gray-400">(You)</span>
            </p>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Circle className="w-2 h-2 fill-green-500 text-green-500" />
              Online
            </p>
          </div>
        </div>

        {/* Other users */}
        {users.map(user => {
          const activity = getUserActivity(user.id);
          return (
            <button
              key={user.id}
              onClick={() => onFollowUser?.(user.id)}
              className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors text-left"
            >
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold relative"
                style={{ backgroundColor: user.color }}
              >
                {getUserInitials(user.name)}
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white bg-green-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.name}
                </p>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  {activity === 'editing' ? (
                    <>
                      <Edit3 className="w-3 h-3 text-amber-500" />
                      <span className="text-amber-600">Editing</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3 h-3" />
                      <span>Viewing</span>
                    </>
                  )}
                </p>
              </div>
              <span className="text-xs text-indigo-500">Follow →</span>
            </button>
          );
        })}

        {users.length === 0 && (
          <div className="p-4 text-center text-sm text-gray-500">
            <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p>No one else is here yet</p>
            <p className="text-xs mt-1">Share the board to collaborate!</p>
          </div>
        )}
      </div>
    </motion.div>
  );
});

ExpandedUserList.displayName = 'ExpandedUserList';

// Main component
export const UserPresenceList: React.FC<UserPresenceListProps> = memo(({
  users,
  currentUser,
  isConnected,
  connectionError,
  editingNodes,
  onFollowUser,
  isDemoMode = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Show max 4 avatars, rest as +N
  const visibleUsers = users.slice(0, 3);
  const overflowCount = users.length - 3;

  return (
    <div className="relative">
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 bg-white rounded-full shadow-lg px-3 py-2 border border-gray-200"
      >
        {/* Connection status */}
        <ConnectionBadge isConnected={isConnected} error={connectionError} isDemoMode={isDemoMode} />
        
        {/* Separator */}
        <div className="w-px h-5 bg-gray-200" />
        
        {/* User avatars */}
        <div className="flex items-center -space-x-2">
          {/* Current user */}
          <UserAvatar 
            user={currentUser} 
            isCurrentUser 
          />
          
          {/* Other users */}
          <AnimatePresence mode="popLayout">
            {visibleUsers.map(user => {
              const isEditing = editingNodes ? 
                Array.from(editingNodes.values()).some(e => e.userId === user.id) : 
                false;
              
              return (
                <UserAvatar 
                  key={user.id}
                  user={user}
                  isEditing={isEditing}
                  onClick={() => onFollowUser?.(user.id)}
                />
              );
            })}
          </AnimatePresence>
          
          {/* Overflow indicator */}
          {overflowCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600"
            >
              +{overflowCount}
            </motion.div>
          )}
        </div>
        
        {/* Expand button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="ml-1 p-1 rounded-full hover:bg-gray-100 transition-colors"
        >
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          )}
        </button>
      </motion.div>
      
      {/* Expanded dropdown */}
      <AnimatePresence>
        {isExpanded && (
          <ExpandedUserList
            users={users}
            currentUser={currentUser}
            editingNodes={editingNodes}
            onFollowUser={onFollowUser}
          />
        )}
      </AnimatePresence>
    </div>
  );
});

UserPresenceList.displayName = 'UserPresenceList';

export default UserPresenceList;
