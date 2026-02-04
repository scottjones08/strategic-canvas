/**
 * useEnhancedCollaboration Hook
 * 
 * Extended collaboration hook with follow mode, activity tracking,
 * and smooth cursor interpolation.
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useCollaboration, UseCollaborationOptions, UseCollaborationReturn } from './useCollaboration';
import type { ParticipantActivity } from '../components/ParticipantsPanel';

export interface UseEnhancedCollaborationOptions extends UseCollaborationOptions {
  onFollowUserViewport?: (userId: string, cursor: { x: number; y: number }) => void;
  maxActivityHistory?: number;
}

export interface UseEnhancedCollaborationReturn extends UseCollaborationReturn {
  // Follow mode
  followingUserId: string | null;
  setFollowingUserId: (userId: string | null) => void;
  followedUserCursor: { x: number; y: number } | null;
  
  // Activity tracking
  recentActivity: ParticipantActivity[];
  addActivity: (activity: Omit<ParticipantActivity, 'timestamp'>) => void;
  clearActivity: () => void;
  
  // Interpolated cursors for smooth rendering
  interpolatedCursors: Map<string, { 
    x: number; 
    y: number; 
    targetX: number; 
    targetY: number;
    name: string; 
    color: string;
    isActive: boolean;
  }>;
  
  // Show/hide cursors toggle
  showCursors: boolean;
  setShowCursors: (show: boolean) => void;
}

export function useEnhancedCollaboration(
  options: UseEnhancedCollaborationOptions
): UseEnhancedCollaborationReturn {
  const { 
    onFollowUserViewport, 
    maxActivityHistory = 50,
    onNodeChange,
    ...baseOptions 
  } = options;

  // Base collaboration
  const baseCollaboration = useCollaboration({
    ...baseOptions,
    onNodeChange: (change) => {
      // Track node changes as activity
      addActivity({
        userId: change.userId,
        type: 'editing',
        nodeId: change.nodeId,
      });
      onNodeChange?.(change);
    },
  });

  // Follow mode state
  const [followingUserId, setFollowingUserId] = useState<string | null>(null);
  const [showCursors, setShowCursors] = useState(true);

  // Activity history
  const [recentActivity, setRecentActivity] = useState<ParticipantActivity[]>([]);

  // Interpolated cursors for smooth rendering
  const [interpolatedCursors, setInterpolatedCursors] = useState<Map<string, {
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    name: string;
    color: string;
    isActive: boolean;
  }>>(new Map());

  // Animation frame ref for cursor interpolation
  const rafRef = useRef<number>();
  const lastUpdateRef = useRef<number>(0);
  const prevUsersRef = useRef<Set<string>>(new Set());
  const removalTimeoutsRef = useRef<Map<string, number>>(new Map());
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      removalTimeoutsRef.current.forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
      removalTimeoutsRef.current.clear();
    };
  }, []);

  // Add activity entry
  const addActivity = useCallback((activity: Omit<ParticipantActivity, 'timestamp'>) => {
    setRecentActivity(prev => {
      const newActivity: ParticipantActivity = {
        ...activity,
        timestamp: new Date(),
      };
      const updated = [newActivity, ...prev].slice(0, maxActivityHistory);
      return updated;
    });
  }, [maxActivityHistory]);

  // Clear activity
  const clearActivity = useCallback(() => {
    setRecentActivity([]);
  }, []);

  // Track user joins/leaves
  useEffect(() => {
    const prevUsers = prevUsersRef.current;
    const nextUsers = new Set<string>(baseCollaboration.users.map(user => user.id));

    baseCollaboration.users.forEach(user => {
      if (!prevUsers.has(user.id)) {
        addActivity({ userId: user.id, userName: user.name, userColor: user.color, type: 'joined' });
      }
    });

    prevUsers.forEach(userId => {
      if (!nextUsers.has(userId)) {
        addActivity({ userId, type: 'left' });
      }
    });

    prevUsersRef.current = nextUsers;
  }, [baseCollaboration.users, addActivity]);

  // Get followed user's cursor
  const followedUserCursor = useMemo(() => {
    if (!followingUserId) return null;
    const cursor = baseCollaboration.cursors.get(followingUserId);
    return cursor ? { x: cursor.x, y: cursor.y } : null;
  }, [followingUserId, baseCollaboration.cursors]);

  // Notify when followed user moves
  useEffect(() => {
    if (followingUserId && followedUserCursor && onFollowUserViewport) {
      onFollowUserViewport(followingUserId, followedUserCursor);
    }
  }, [followingUserId, followedUserCursor, onFollowUserViewport]);

  // Smooth cursor interpolation loop
  useEffect(() => {
    const interpolate = (timestamp: number) => {
      // Throttle to ~60fps
      if (timestamp - lastUpdateRef.current < 16) {
        rafRef.current = requestAnimationFrame(interpolate);
        return;
      }
      lastUpdateRef.current = timestamp;

      setInterpolatedCursors(prev => {
        const next = new Map(prev);
        let hasChanges = false;

        // Update existing cursors with interpolation
        baseCollaboration.cursors.forEach((cursor, userId) => {
          const pendingRemoval = removalTimeoutsRef.current.get(userId);
          if (pendingRemoval) {
            clearTimeout(pendingRemoval);
            removalTimeoutsRef.current.delete(userId);
          }
          const existing = next.get(userId);
          
          if (existing) {
            // Interpolate toward target (lerp factor 0.2 for smooth movement)
            const lerpFactor = 0.2;
            const newX = existing.x + (cursor.x - existing.x) * lerpFactor;
            const newY = existing.y + (cursor.y - existing.y) * lerpFactor;
            
            // Only update if there's meaningful change
            if (Math.abs(newX - existing.x) > 0.1 || Math.abs(newY - existing.y) > 0.1) {
              next.set(userId, {
                ...existing,
                x: newX,
                y: newY,
                targetX: cursor.x,
                targetY: cursor.y,
                isActive: true,
              });
              hasChanges = true;
            }
          } else {
            // New cursor - start at target position
            next.set(userId, {
              x: cursor.x,
              y: cursor.y,
              targetX: cursor.x,
              targetY: cursor.y,
              name: cursor.name,
              color: cursor.color,
              isActive: true,
            });
            hasChanges = true;
          }
        });

        // Mark removed cursors as inactive (for fade-out animation)
        next.forEach((cursor, userId) => {
          if (!baseCollaboration.cursors.has(userId)) {
            if (cursor.isActive) {
              next.set(userId, { ...cursor, isActive: false });
              hasChanges = true;
              
              // Remove after fade-out delay
              const timeoutId = window.setTimeout(() => {
                if (!isMountedRef.current) return;
                setInterpolatedCursors(current => {
                  const updated = new Map(current);
                  updated.delete(userId);
                  return updated;
                });
                removalTimeoutsRef.current.delete(userId);
              }, 500);
              removalTimeoutsRef.current.set(userId, timeoutId);
            }
          }
        });

        return hasChanges ? next : prev;
      });

      rafRef.current = requestAnimationFrame(interpolate);
    };

    rafRef.current = requestAnimationFrame(interpolate);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [baseCollaboration.cursors]);

  // Stop following if user leaves
  useEffect(() => {
    if (followingUserId) {
      const isStillPresent = baseCollaboration.users.some(u => u.id === followingUserId);
      if (!isStillPresent) {
        setFollowingUserId(null);
      }
    }
  }, [followingUserId, baseCollaboration.users]);

  return {
    ...baseCollaboration,
    
    // Follow mode
    followingUserId,
    setFollowingUserId,
    followedUserCursor,
    
    // Activity
    recentActivity,
    addActivity,
    clearActivity,
    
    // Interpolated cursors
    interpolatedCursors,
    
    // Cursor visibility
    showCursors,
    setShowCursors,
  };
}

// Helper hook for cursor color assignment
export function useCursorColors() {
  const colors = useMemo(() => [
    '#ef4444', // red
    '#f97316', // orange
    '#eab308', // yellow
    '#22c55e', // green
    '#14b8a6', // teal
    '#3b82f6', // blue
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#84cc16', // lime
  ], []);

  const getColor = useCallback((userId: string): string => {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash) + userId.charCodeAt(i);
      hash = hash & hash;
    }
    return colors[Math.abs(hash) % colors.length];
  }, [colors]);

  return { colors, getColor };
}

export default useEnhancedCollaboration;
