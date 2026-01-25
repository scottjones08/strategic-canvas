/**
 * Real-time Collaboration System
 * 
 * Enables multiple users to collaborate on the same board with:
 * - Live cursor tracking
 * - User presence indicators
 * - Real-time node synchronization
 * - Conflict resolution
 */

import { createClient, RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

// User presence data
export interface UserPresence {
  id: string;
  name: string;
  color: string;
  cursor: { x: number; y: number } | null;
  activeNodeId: string | null;
  lastSeen: Date;
  isOnline: boolean;
}

// Node change types for real-time sync
export type NodeChangeType = 'add' | 'update' | 'delete' | 'move' | 'batch';

export interface NodeChange {
  type: NodeChangeType;
  nodeId?: string;
  nodeIds?: string[];
  data?: any;
  userId: string;
  timestamp: number;
}

// Collaboration state for a board
export interface CollaborationState {
  users: Map<string, UserPresence>;
  boardId: string;
  isConnected: boolean;
  connectionError: string | null;
}

// Callbacks for collaboration events
export interface CollaborationCallbacks {
  onUserJoin?: (user: UserPresence) => void;
  onUserLeave?: (userId: string) => void;
  onCursorMove?: (userId: string, cursor: { x: number; y: number }) => void;
  onNodeChange?: (change: NodeChange) => void;
  onPresenceSync?: (users: UserPresence[]) => void;
  onConnectionChange?: (isConnected: boolean) => void;
  onEditStart?: (userId: string, nodeId: string) => void;
  onEditEnd?: (userId: string, nodeId: string) => void;
}

// Cursor color palette for users
const CURSOR_COLORS = [
  '#ef4444', // red
  '#f59e0b', // amber
  '#22c55e', // green
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
];

// Get a consistent color for a user based on their ID
export function getUserColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash = hash & hash;
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

// Generate user initials from name
export function getUserInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
}

// Throttle function for cursor updates
export function throttle<T extends (...args: any[]) => void>(
  func: T,
  limit: number
): T {
  let inThrottle = false;
  let lastArgs: Parameters<T> | null = null;

  return ((...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
        if (lastArgs) {
          func(...lastArgs);
          lastArgs = null;
        }
      }, limit);
    } else {
      lastArgs = args;
    }
  }) as T;
}

/**
 * CollaborationManager handles all real-time collaboration features
 */
export class CollaborationManager {
  private supabase: SupabaseClient | null = null;
  private channel: RealtimeChannel | null = null;
  private boardId: string;
  private userId: string;
  private userName: string;
  private userColor: string;
  private callbacks: CollaborationCallbacks = {};
  private users: Map<string, UserPresence> = new Map();
  private isConnected: boolean = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private editingNodeId: string | null = null;

  constructor(
    boardId: string,
    userId: string,
    userName: string,
    userColor?: string
  ) {
    this.boardId = boardId;
    this.userId = userId;
    this.userName = userName;
    this.userColor = userColor || getUserColor(userId);

    // Initialize Supabase client
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
  }

  /**
   * Subscribe to board collaboration channel
   */
  async subscribe(callbacks: CollaborationCallbacks): Promise<boolean> {
    this.callbacks = callbacks;

    if (!this.supabase) {
      console.warn('Supabase not configured, collaboration disabled');
      return false;
    }

    try {
      this.channel = this.supabase.channel(`board:${this.boardId}`, {
        config: {
          presence: { key: this.userId },
          broadcast: { self: false }
        }
      });

      // Handle presence sync
      this.channel.on('presence', { event: 'sync' }, () => {
        this.handlePresenceSync();
      });

      // Handle user join
      this.channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
        if (key !== this.userId && newPresences.length > 0) {
          const presence = newPresences[0] as any;
          const user: UserPresence = {
            id: key,
            name: presence.name || 'Anonymous',
            color: presence.color || getUserColor(key),
            cursor: presence.cursor || null,
            activeNodeId: presence.activeNodeId || null,
            lastSeen: new Date(),
            isOnline: true
          };
          this.users.set(key, user);
          this.callbacks.onUserJoin?.(user);
        }
      });

      // Handle user leave
      this.channel.on('presence', { event: 'leave' }, ({ key }) => {
        if (key !== this.userId) {
          this.users.delete(key);
          this.callbacks.onUserLeave?.(key);
        }
      });

      // Handle cursor broadcasts
      this.channel.on('broadcast', { event: 'cursor' }, ({ payload }) => {
        if (payload.userId !== this.userId) {
          const user = this.users.get(payload.userId);
          if (user) {
            user.cursor = payload.cursor;
            user.lastSeen = new Date();
          }
          this.callbacks.onCursorMove?.(payload.userId, payload.cursor);
        }
      });

      // Handle node changes
      this.channel.on('broadcast', { event: 'node_change' }, ({ payload }) => {
        if (payload.userId !== this.userId) {
          this.callbacks.onNodeChange?.(payload as NodeChange);
        }
      });

      // Handle edit start/end
      this.channel.on('broadcast', { event: 'edit_start' }, ({ payload }) => {
        if (payload.userId !== this.userId) {
          const user = this.users.get(payload.userId);
          if (user) {
            user.activeNodeId = payload.nodeId;
          }
          this.callbacks.onEditStart?.(payload.userId, payload.nodeId);
        }
      });

      this.channel.on('broadcast', { event: 'edit_end' }, ({ payload }) => {
        if (payload.userId !== this.userId) {
          const user = this.users.get(payload.userId);
          if (user) {
            user.activeNodeId = null;
          }
          this.callbacks.onEditEnd?.(payload.userId, payload.nodeId);
        }
      });

      // Subscribe to channel
      return new Promise<boolean>((resolve) => {
        this.channel!.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            this.isConnected = true;
            this.callbacks.onConnectionChange?.(true);
            
            // Track our presence
            await this.channel?.track({
              name: this.userName,
              color: this.userColor,
              cursor: null,
              activeNodeId: null,
              joinedAt: new Date().toISOString()
            });

            // Start heartbeat
            this.startHeartbeat();

            resolve(true);
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            this.isConnected = false;
            this.callbacks.onConnectionChange?.(false);
            resolve(false);
          }
        });
      });
    } catch (error) {
      console.error('Failed to subscribe to collaboration channel:', error);
      return false;
    }
  }

  /**
   * Handle presence sync event
   */
  private handlePresenceSync() {
    const state = this.channel?.presenceState() || {};
    const updatedUsers: UserPresence[] = [];

    Object.entries(state).forEach(([key, presences]: [string, any[]]) => {
      if (key !== this.userId && presences.length > 0) {
        const presence = presences[0];
        const user: UserPresence = {
          id: key,
          name: presence.name || 'Anonymous',
          color: presence.color || getUserColor(key),
          cursor: presence.cursor || null,
          activeNodeId: presence.activeNodeId || null,
          lastSeen: new Date(),
          isOnline: true
        };
        this.users.set(key, user);
        updatedUsers.push(user);
      }
    });

    // Remove users not in presence state
    for (const userId of this.users.keys()) {
      if (!state[userId]) {
        this.users.delete(userId);
      }
    }

    this.callbacks.onPresenceSync?.(updatedUsers);
  }

  /**
   * Start heartbeat to keep presence alive
   */
  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.channel && this.isConnected) {
        this.channel.track({
          name: this.userName,
          color: this.userColor,
          cursor: null,
          activeNodeId: this.editingNodeId,
          lastUpdate: new Date().toISOString()
        });
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Broadcast cursor position
   */
  broadcastCursor(cursor: { x: number; y: number } | null): void {
    if (!this.channel || !this.isConnected) return;

    this.channel.send({
      type: 'broadcast',
      event: 'cursor',
      payload: {
        userId: this.userId,
        cursor
      }
    });
  }

  /**
   * Broadcast node change
   */
  broadcastNodeChange(change: Omit<NodeChange, 'userId' | 'timestamp'>): void {
    if (!this.channel || !this.isConnected) return;

    this.channel.send({
      type: 'broadcast',
      event: 'node_change',
      payload: {
        ...change,
        userId: this.userId,
        timestamp: Date.now()
      }
    });
  }

  /**
   * Broadcast edit start
   */
  broadcastEditStart(nodeId: string): void {
    if (!this.channel || !this.isConnected) return;

    this.editingNodeId = nodeId;
    this.channel.send({
      type: 'broadcast',
      event: 'edit_start',
      payload: {
        userId: this.userId,
        nodeId
      }
    });
  }

  /**
   * Broadcast edit end
   */
  broadcastEditEnd(nodeId: string): void {
    if (!this.channel || !this.isConnected) return;

    this.editingNodeId = null;
    this.channel.send({
      type: 'broadcast',
      event: 'edit_end',
      payload: {
        userId: this.userId,
        nodeId
      }
    });
  }

  /**
   * Get all online users
   */
  getUsers(): UserPresence[] {
    return Array.from(this.users.values());
  }

  /**
   * Get user by ID
   */
  getUser(userId: string): UserPresence | undefined {
    return this.users.get(userId);
  }

  /**
   * Check if connected
   */
  getIsConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Get current user info
   */
  getCurrentUser(): { id: string; name: string; color: string } {
    return {
      id: this.userId,
      name: this.userName,
      color: this.userColor
    };
  }

  /**
   * Unsubscribe from collaboration
   */
  async unsubscribe(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.channel) {
      await this.channel.unsubscribe();
      this.channel = null;
    }

    this.isConnected = false;
    this.users.clear();
    this.callbacks.onConnectionChange?.(false);
  }
}

/**
 * Create a throttled cursor broadcaster
 */
export function createCursorBroadcaster(
  manager: CollaborationManager,
  throttleMs: number = 50
): (cursor: { x: number; y: number } | null) => void {
  return throttle((cursor: { x: number; y: number } | null) => {
    manager.broadcastCursor(cursor);
  }, throttleMs);
}

export default CollaborationManager;
