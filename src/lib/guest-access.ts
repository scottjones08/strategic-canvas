// Guest Access System for Strategic Canvas
// Enables one-click guest access without signup, similar to Miro's guest sharing

import { supabase, isSupabaseConfigured, BoardMagicLink } from './supabase';

// ============================================
// TYPES
// ============================================

export type GuestPermission = 'view' | 'comment' | 'edit';

export type ExpirationOption = '1h' | '24h' | '7d' | 'never';

export interface GuestToken {
  id: string;
  boardId: string;
  token: string;
  permission: GuestPermission;
  password?: string; // hashed
  expiresAt: Date | null;
  createdAt: Date;
  createdBy: string | null;
  useCount: number;
  maxUses: number | null;
  guestName?: string;
  isActive: boolean;
}

export interface GuestSession {
  token: string;
  boardId: string;
  permission: GuestPermission;
  guestName?: string;
  authenticatedAt: Date;
}

export interface GenerateGuestTokenOptions {
  permission: GuestPermission;
  expiration: ExpirationOption;
  password?: string;
  maxUses?: number;
  guestName?: string;
}

// ============================================
// TOKEN GENERATION
// ============================================

/**
 * Generate a cryptographically secure random token
 */
function generateSecureToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (x) => chars[x % chars.length]).join('');
}

/**
 * Simple hash function for password (in production, use bcrypt on server)
 */
export function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `sha256:${Math.abs(hash).toString(16)}`;
}

/**
 * Calculate expiration date based on option
 */
function calculateExpiration(option: ExpirationOption): Date | null {
  const now = new Date();
  switch (option) {
    case '1h':
      return new Date(now.getTime() + 60 * 60 * 1000);
    case '24h':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    case '7d':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    case 'never':
      return null;
    default:
      return null;
  }
}

/**
 * Generate a guest access token for a board
 */
export async function generateGuestToken(
  boardId: string,
  options: GenerateGuestTokenOptions,
  createdBy?: string
): Promise<GuestToken> {
  const token = generateSecureToken();
  const expiresAt = calculateExpiration(options.expiration);
  const hashedPassword = options.password ? hashPassword(options.password) : undefined;

  const guestToken: GuestToken = {
    id: crypto.randomUUID(),
    boardId,
    token,
    permission: options.permission,
    password: hashedPassword,
    expiresAt,
    createdAt: new Date(),
    createdBy: createdBy || null,
    useCount: 0,
    maxUses: options.maxUses || null,
    guestName: options.guestName,
    isActive: true,
  };

  // Save to Supabase if configured
  if (isSupabaseConfigured() && supabase) {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${supabaseUrl}/rest/v1/board_magic_links`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          id: guestToken.id,
          board_id: boardId,
          token: token,
          permission: options.permission,
          expires_at: expiresAt?.toISOString() || null,
          max_uses: options.maxUses || null,
          use_count: 0,
          created_by: createdBy || null,
          password_hash: hashedPassword || null,
          guest_name: options.guestName || null,
          is_active: true,
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error('Failed to save guest token to Supabase:', response.status);
      }
    } catch (err: any) {
      console.error('Error saving guest token:', err);
    }
  }

  // Also save to localStorage as fallback
  saveGuestTokenToLocalStorage(guestToken);

  return guestToken;
}

// ============================================
// TOKEN VALIDATION
// ============================================

export interface ValidationResult {
  valid: boolean;
  error?: string;
  guestToken?: GuestToken;
  requiresPassword?: boolean;
}

/**
 * Validate a guest token
 */
export async function validateGuestToken(
  token: string,
  password?: string
): Promise<ValidationResult> {
  // Try to fetch from Supabase first
  let guestToken = await getGuestTokenFromSupabase(token);

  // Fall back to localStorage
  if (!guestToken) {
    guestToken = getGuestTokenFromLocalStorage(token);
  }

  if (!guestToken) {
    return { valid: false, error: 'Invalid or expired link' };
  }

  // Check if active
  if (!guestToken.isActive) {
    return { valid: false, error: 'This link has been deactivated' };
  }

  // Check expiration
  if (guestToken.expiresAt && new Date() > new Date(guestToken.expiresAt)) {
    return { valid: false, error: 'This link has expired' };
  }

  // Check max uses
  if (guestToken.maxUses && guestToken.useCount >= guestToken.maxUses) {
    return { valid: false, error: 'This link has reached its maximum uses' };
  }

  // Check password
  if (guestToken.password) {
    if (!password) {
      return { valid: false, requiresPassword: true, guestToken };
    }
    if (hashPassword(password) !== guestToken.password) {
      return { valid: false, error: 'Incorrect password', requiresPassword: true, guestToken };
    }
  }

  // Increment use count
  await incrementUseCount(guestToken.id);

  return { valid: true, guestToken };
}

/**
 * Get guest permissions from a validated token
 */
export function getGuestPermissions(guestToken: GuestToken): {
  canView: boolean;
  canComment: boolean;
  canEdit: boolean;
} {
  switch (guestToken.permission) {
    case 'view':
      return { canView: true, canComment: false, canEdit: false };
    case 'comment':
      return { canView: true, canComment: true, canEdit: false };
    case 'edit':
      return { canView: true, canComment: true, canEdit: true };
    default:
      return { canView: true, canComment: false, canEdit: false };
  }
}

// ============================================
// SUPABASE OPERATIONS
// ============================================

async function getGuestTokenFromSupabase(token: string): Promise<GuestToken | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(
      `${supabaseUrl}/rest/v1/board_magic_links?token=eq.${token}&limit=1`,
      {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
        signal: controller.signal
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (!data || data.length === 0) {
      return null;
    }

    const row = data[0];
    return {
      id: row.id,
      boardId: row.board_id,
      token: row.token,
      permission: row.permission as GuestPermission,
      password: row.password_hash,
      expiresAt: row.expires_at ? new Date(row.expires_at) : null,
      createdAt: new Date(row.created_at),
      createdBy: row.created_by,
      useCount: row.use_count || 0,
      maxUses: row.max_uses,
      guestName: row.guest_name,
      isActive: row.is_active !== false,
    };
  } catch (err) {
    console.error('Error fetching guest token from Supabase:', err);
    return null;
  }
}

async function incrementUseCount(tokenId: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    // Update localStorage
    const tokens = getGuestTokensFromLocalStorage();
    const index = tokens.findIndex(t => t.id === tokenId);
    if (index !== -1) {
      tokens[index].useCount++;
      localStorage.setItem('fan-canvas-guest-tokens', JSON.stringify(tokens));
    }
    return;
  }

  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    // First get current count
    const getResponse = await fetch(
      `${supabaseUrl}/rest/v1/board_magic_links?id=eq.${tokenId}&select=use_count`,
      {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        }
      }
    );

    if (!getResponse.ok) return;
    const data = await getResponse.json();
    const currentCount = data[0]?.use_count || 0;

    // Update count
    await fetch(
      `${supabaseUrl}/rest/v1/board_magic_links?id=eq.${tokenId}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ use_count: currentCount + 1 })
      }
    );
  } catch (err) {
    console.error('Error incrementing use count:', err);
  }
}

/**
 * Deactivate a guest token
 */
export async function deactivateGuestToken(tokenId: string): Promise<boolean> {
  // Update localStorage
  const tokens = getGuestTokensFromLocalStorage();
  const index = tokens.findIndex(t => t.id === tokenId);
  if (index !== -1) {
    tokens[index].isActive = false;
    localStorage.setItem('fan-canvas-guest-tokens', JSON.stringify(tokens));
  }

  if (!isSupabaseConfigured()) {
    return true;
  }

  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const response = await fetch(
      `${supabaseUrl}/rest/v1/board_magic_links?id=eq.${tokenId}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: false })
      }
    );

    return response.ok;
  } catch (err) {
    console.error('Error deactivating guest token:', err);
    return false;
  }
}

/**
 * Get all guest tokens for a board
 */
export async function getGuestTokensForBoard(boardId: string): Promise<GuestToken[]> {
  const tokens: GuestToken[] = [];

  // Get from Supabase
  if (isSupabaseConfigured()) {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(
        `${supabaseUrl}/rest/v1/board_magic_links?board_id=eq.${boardId}&order=created_at.desc`,
        {
          method: 'GET',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        for (const row of data) {
          tokens.push({
            id: row.id,
            boardId: row.board_id,
            token: row.token,
            permission: row.permission as GuestPermission,
            password: row.password_hash,
            expiresAt: row.expires_at ? new Date(row.expires_at) : null,
            createdAt: new Date(row.created_at),
            createdBy: row.created_by,
            useCount: row.use_count || 0,
            maxUses: row.max_uses,
            guestName: row.guest_name,
            isActive: row.is_active !== false,
          });
        }
      }
    } catch (err) {
      console.error('Error fetching guest tokens from Supabase:', err);
    }
  }

  // Also get from localStorage
  const localTokens = getGuestTokensFromLocalStorage().filter(t => t.boardId === boardId);

  // Merge, avoiding duplicates
  const seenIds = new Set(tokens.map(t => t.id));
  for (const localToken of localTokens) {
    if (!seenIds.has(localToken.id)) {
      tokens.push(localToken);
    }
  }

  return tokens;
}

// ============================================
// LOCALSTORAGE OPERATIONS
// ============================================

function getGuestTokensFromLocalStorage(): GuestToken[] {
  try {
    const stored = localStorage.getItem('fan-canvas-guest-tokens');
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return parsed.map((t: any) => ({
      ...t,
      expiresAt: t.expiresAt ? new Date(t.expiresAt) : null,
      createdAt: new Date(t.createdAt),
    }));
  } catch {
    return [];
  }
}

function getGuestTokenFromLocalStorage(token: string): GuestToken | null {
  const tokens = getGuestTokensFromLocalStorage();
  return tokens.find(t => t.token === token) || null;
}

function saveGuestTokenToLocalStorage(guestToken: GuestToken): void {
  const tokens = getGuestTokensFromLocalStorage();
  tokens.push(guestToken);
  localStorage.setItem('fan-canvas-guest-tokens', JSON.stringify(tokens));
}

// ============================================
// GUEST SESSION MANAGEMENT
// ============================================

const GUEST_SESSION_KEY = 'fan-canvas-guest-session';

/**
 * Create a guest session after successful authentication
 */
export function createGuestSession(guestToken: GuestToken, guestName?: string): GuestSession {
  const session: GuestSession = {
    token: guestToken.token,
    boardId: guestToken.boardId,
    permission: guestToken.permission,
    guestName: guestName || guestToken.guestName,
    authenticatedAt: new Date(),
  };

  // Store in sessionStorage (cleared when browser closes)
  sessionStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(session));

  return session;
}

/**
 * Get current guest session
 */
export function getGuestSession(): GuestSession | null {
  try {
    const stored = sessionStorage.getItem(GUEST_SESSION_KEY);
    if (!stored) return null;
    const session = JSON.parse(stored);
    return {
      ...session,
      authenticatedAt: new Date(session.authenticatedAt),
    };
  } catch {
    return null;
  }
}

/**
 * Clear guest session
 */
export function clearGuestSession(): void {
  sessionStorage.removeItem(GUEST_SESSION_KEY);
}

// ============================================
// URL HELPERS
// ============================================

/**
 * Generate a shareable guest URL
 */
export function getGuestShareUrl(token: string): string {
  const baseUrl = window.location.origin;
  return `${baseUrl}/?guest=${token}`;
}

/**
 * Parse guest token from URL
 */
export function parseGuestTokenFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('guest');
}

// ============================================
// EXPIRATION HELPERS
// ============================================

/**
 * Get human-readable expiration text
 */
export function getExpirationText(expiresAt: Date | null): string {
  if (!expiresAt) return 'Never expires';

  const now = new Date();
  const diff = expiresAt.getTime() - now.getTime();

  if (diff < 0) return 'Expired';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (hours < 1) return 'Expires in less than an hour';
  if (hours < 24) return `Expires in ${hours} hour${hours > 1 ? 's' : ''}`;
  if (days === 1) return 'Expires tomorrow';
  return `Expires in ${days} days`;
}

/**
 * Get expiration option label
 */
export function getExpirationOptionLabel(option: ExpirationOption): string {
  switch (option) {
    case '1h': return '1 hour';
    case '24h': return '24 hours';
    case '7d': return '7 days';
    case 'never': return 'Never';
    default: return option;
  }
}

/**
 * Get permission label
 */
export function getPermissionLabel(permission: GuestPermission): string {
  switch (permission) {
    case 'view': return 'View only';
    case 'comment': return 'Can comment';
    case 'edit': return 'Can edit';
    default: return permission;
  }
}

/**
 * Get permission description
 */
export function getPermissionDescription(permission: GuestPermission): string {
  switch (permission) {
    case 'view':
      return 'Guest can view the board but cannot make any changes';
    case 'comment':
      return 'Guest can view and leave comments on the board';
    case 'edit':
      return 'Guest can view, comment, and edit the board in real-time';
    default:
      return '';
  }
}
