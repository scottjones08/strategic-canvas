/**
 * useCollaboration Hook
 * 
 * React hook for managing real-time collaboration state.
 * Handles presence, cursors, and node synchronization.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import CollaborationManager, {
  UserPresence,
  NodeChange,
  getUserColor
} from '../lib/realtime-collaboration';

export interface UseCollaborationOptions {
  boardId: string;
  userId: string;
  userName: string;
  userColor?: string;
  enabled?: boolean;
  onNodeChange?: (change: NodeChange) => void;
}

export interface UseCollaborationReturn {
  // Connection state
  isConnected: boolean;
  connectionError: string | null;
  
  // Users
  users: UserPresence[];
  currentUser: { id: string; name: string; color: string };
  
  // Cursors
  cursors: Map<string, { x: number; y: number; name: string; color: string }>;
  broadcastCursor: (cursor: { x: number; y: number } | null) => void;
  
  // Node editing
  editingNodes: Map<string, { userId: string; userName: string; color: string }>;
  startEditing: (nodeId: string) => void;
  stopEditing: (nodeId: string) => void;
  
  // Node changes
  broadcastNodeChange: (change: Omit<NodeChange, 'userId' | 'timestamp'>) => void;
  
  // Control
  connect: () => Promise<boolean>;
  disconnect: () => Promise<void>;
}

export function useCollaboration(options: UseCollaborationOptions): UseCollaborationReturn {
  const {
    boardId,
    userId,
    userName,
    userColor,
    enabled = true,
    onNodeChange
  } = options;

  // State
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [users, setUsers] = useState<UserPresence[]>([]);
  const [cursors, setCursors] = useState<Map<string, { x: number; y: number; name: string; color: string }>>(new Map());
  const [editingNodes, setEditingNodes] = useState<Map<string, { userId: string; userName: string; color: string }>>(new Map());

  // Refs
  const managerRef = useRef<CollaborationManager | null>(null);
  const onNodeChangeRef = useRef(onNodeChange);

  // Keep callback ref updated
  useEffect(() => {
    onNodeChangeRef.current = onNodeChange;
  }, [onNodeChange]);

  // Current user info
  const currentUser = useMemo(() => ({
    id: userId,
    name: userName,
    color: userColor || getUserColor(userId)
  }), [userId, userName, userColor]);

  // Note: Throttled cursor broadcaster available via createCursorBroadcaster
  // Using direct throttledBroadcastCursor implementation below instead

  // Connect to collaboration
  const connect = useCallback(async (): Promise<boolean> => {
    if (!enabled || !boardId || !userId) {
      return false;
    }

    // Cleanup existing connection
    if (managerRef.current) {
      await managerRef.current.unsubscribe();
    }

    // Create new manager
    const manager = new CollaborationManager(
      boardId,
      userId,
      userName,
      userColor
    );
    managerRef.current = manager;

    try {
      const success = await manager.subscribe({
        onConnectionChange: (connected) => {
          setIsConnected(connected);
          if (!connected) {
            setConnectionError('Connection lost');
          } else {
            setConnectionError(null);
          }
        },

        onPresenceSync: (syncedUsers) => {
          setUsers(syncedUsers);
          
          // Update cursors map
          setCursors(prev => {
            const newCursors = new Map(prev);
            syncedUsers.forEach(user => {
              if (user.cursor) {
                newCursors.set(user.id, {
                  x: user.cursor.x,
                  y: user.cursor.y,
                  name: user.name,
                  color: user.color
                });
              }
            });
            return newCursors;
          });
        },

        onUserJoin: (user) => {
          setUsers(prev => {
            const existing = prev.find(u => u.id === user.id);
            if (existing) {
              return prev.map(u => u.id === user.id ? user : u);
            }
            return [...prev, user];
          });
        },

        onUserLeave: (leftUserId) => {
          setUsers(prev => prev.filter(u => u.id !== leftUserId));
          setCursors(prev => {
            const newCursors = new Map(prev);
            newCursors.delete(leftUserId);
            return newCursors;
          });
          setEditingNodes(prev => {
            const newEditing = new Map(prev);
            // Remove any nodes this user was editing
            for (const [nodeId, editor] of newEditing.entries()) {
              if (editor.userId === leftUserId) {
                newEditing.delete(nodeId);
              }
            }
            return newEditing;
          });
        },

        onCursorMove: (cursorUserId, cursor) => {
          setCursors(prev => {
            const newCursors = new Map(prev);
            const user = users.find(u => u.id === cursorUserId);
            if (cursor) {
              newCursors.set(cursorUserId, {
                x: cursor.x,
                y: cursor.y,
                name: user?.name || 'Anonymous',
                color: user?.color || getUserColor(cursorUserId)
              });
            } else {
              newCursors.delete(cursorUserId);
            }
            return newCursors;
          });
        },

        onNodeChange: (change) => {
          onNodeChangeRef.current?.(change);
        },

        onEditStart: (editorUserId, nodeId) => {
          const user = manager.getUser(editorUserId);
          setEditingNodes(prev => {
            const newEditing = new Map(prev);
            newEditing.set(nodeId, {
              userId: editorUserId,
              userName: user?.name || 'Someone',
              color: user?.color || getUserColor(editorUserId)
            });
            return newEditing;
          });
        },

        onEditEnd: (_editorUserId, nodeId) => {
          setEditingNodes(prev => {
            const newEditing = new Map(prev);
            newEditing.delete(nodeId);
            return newEditing;
          });
        }
      });

      if (success) {
        setIsConnected(true);
        setConnectionError(null);
        return true;
      } else {
        setConnectionError('Failed to connect');
        return false;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setConnectionError(message);
      return false;
    }
  }, [enabled, boardId, userId, userName, userColor, users]);

  // Disconnect from collaboration
  const disconnect = useCallback(async () => {
    if (managerRef.current) {
      await managerRef.current.unsubscribe();
      managerRef.current = null;
    }
    setIsConnected(false);
    setUsers([]);
    setCursors(new Map());
    setEditingNodes(new Map());
  }, []);

  // Broadcast node change
  const broadcastNodeChange = useCallback((change: Omit<NodeChange, 'userId' | 'timestamp'>) => {
    managerRef.current?.broadcastNodeChange(change);
  }, []);

  // Start editing a node
  const startEditing = useCallback((nodeId: string) => {
    managerRef.current?.broadcastEditStart(nodeId);
  }, []);

  // Stop editing a node
  const stopEditing = useCallback((nodeId: string) => {
    managerRef.current?.broadcastEditEnd(nodeId);
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (enabled && boardId && userId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, boardId, userId]); // Only reconnect if these change

  // Create a stable cursor broadcaster
  const stableBroadcastCursor = useCallback((cursor: { x: number; y: number } | null) => {
    managerRef.current?.broadcastCursor(cursor);
  }, []);

  // Throttled version
  const throttledBroadcastCursor = useMemo(() => {
    let lastBroadcast = 0;
    let pendingCursor: { x: number; y: number } | null = null;
    let timeoutId: NodeJS.Timeout | null = null;

    return (cursor: { x: number; y: number } | null) => {
      const now = Date.now();
      
      if (now - lastBroadcast >= 50) {
        stableBroadcastCursor(cursor);
        lastBroadcast = now;
        pendingCursor = null;
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      } else {
        pendingCursor = cursor;
        if (!timeoutId) {
          timeoutId = setTimeout(() => {
            if (pendingCursor !== null) {
              stableBroadcastCursor(pendingCursor);
              lastBroadcast = Date.now();
              pendingCursor = null;
            }
            timeoutId = null;
          }, 50 - (now - lastBroadcast));
        }
      }
    };
  }, [stableBroadcastCursor]);

  return {
    isConnected,
    connectionError,
    users,
    currentUser,
    cursors,
    broadcastCursor: throttledBroadcastCursor,
    editingNodes,
    startEditing,
    stopEditing,
    broadcastNodeChange,
    connect,
    disconnect
  };
}

export default useCollaboration;
