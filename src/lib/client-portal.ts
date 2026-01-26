// Client Portal Types and Functions
// Provides read-only board access with commenting for clients
// Now uses Supabase for storage so share links work across browsers

import { supabase, isSupabaseConfigured, boardsApi } from './supabase';

export interface ShareLink {
  id: string;
  boardId: string;
  clientId?: string;
  clientName?: string;
  token: string;
  password?: string; // hashed
  expiresAt?: Date;
  permissions: 'view' | 'comment' | 'edit';
  createdAt: Date;
  views: number;
  lastViewedAt?: Date;
  isActive: boolean;
  companyBranding?: {
    name?: string;
    logo?: string;
    primaryColor?: string;
  };
}

export interface ClientComment {
  id: string;
  boardId: string;
  shareLinkId: string;
  position: { x: number; y: number };
  content: string;
  authorName: string;
  authorEmail?: string;
  parentId?: string; // for replies
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  reactions?: { emoji: string; count: number }[];
}

export interface ShareLinkOptions {
  clientId?: string;
  clientName?: string;
  password?: string;
  expiresInDays?: number;
  permissions: 'view' | 'comment' | 'edit';
  companyBranding?: {
    name?: string;
    logo?: string;
    primaryColor?: string;
  };
}

// Generate a cryptographically secure random token
function generateToken(length: number = 24): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (x) => chars[x % chars.length]).join('');
}

// Simple hash function for password (in production, use bcrypt on server)
export function hashPassword(password: string): string {
  // In a real app, this would be server-side bcrypt
  // For now, we use a simple hash for demo purposes
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `sha256:${Math.abs(hash).toString(16)}`;
}

// Convert database row to ShareLink interface
function dbRowToShareLink(row: any): ShareLink {
  return {
    id: row.id,
    boardId: row.board_id,
    clientName: row.client_name,
    token: row.token,
    password: row.password_hash,
    expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
    permissions: row.permission as 'view' | 'comment' | 'edit',
    createdAt: new Date(row.created_at),
    views: row.views || 0,
    lastViewedAt: row.last_viewed_at ? new Date(row.last_viewed_at) : undefined,
    isActive: row.is_active !== false,
    companyBranding: row.company_branding || {},
  };
}

// Generate a new share link for a board
export function generateShareLink(boardId: string, options: ShareLinkOptions): ShareLink {
  const now = new Date();
  const expiresAt = options.expiresInDays
    ? new Date(now.getTime() + options.expiresInDays * 24 * 60 * 60 * 1000)
    : undefined;

  return {
    id: crypto.randomUUID(),
    boardId,
    clientId: options.clientId,
    clientName: options.clientName,
    token: generateToken(),
    password: options.password ? hashPassword(options.password) : undefined,
    expiresAt,
    permissions: options.permissions,
    createdAt: now,
    views: 0,
    isActive: true,
    companyBranding: options.companyBranding,
  };
}

// Validate a share link
export function validateShareLink(
  shareLink: ShareLink | null,
  password?: string
): { valid: boolean; error?: string } {
  if (!shareLink) {
    return { valid: false, error: 'Share link not found' };
  }

  if (!shareLink.isActive) {
    return { valid: false, error: 'This share link has been deactivated' };
  }

  if (shareLink.expiresAt && new Date() > new Date(shareLink.expiresAt)) {
    return { valid: false, error: 'This share link has expired' };
  }

  if (shareLink.password) {
    if (!password) {
      return { valid: false, error: 'Password required' };
    }
    if (hashPassword(password) !== shareLink.password) {
      return { valid: false, error: 'Incorrect password' };
    }
  }

  return { valid: true };
}

// Create a new client comment
export function createClientComment(
  boardId: string,
  shareLinkId: string,
  position: { x: number; y: number },
  content: string,
  authorName: string,
  authorEmail?: string,
  parentId?: string
): ClientComment {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    boardId,
    shareLinkId,
    position,
    content,
    authorName,
    authorEmail,
    parentId,
    resolved: false,
    createdAt: now,
    updatedAt: now,
  };
}

// Storage keys for localStorage fallback
const SHARE_LINKS_KEY = 'fan-canvas-share-links';
const CLIENT_COMMENTS_KEY = 'fan-canvas-client-comments';

// ============================================
// SHARE LINKS - Supabase with localStorage fallback
// ============================================

// Save share link to Supabase
export async function saveShareLinkToSupabase(link: ShareLink): Promise<boolean> {
  console.log('saveShareLinkToSupabase called with:', { boardId: link.boardId, token: link.token });

  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured, saving to localStorage only');
    return false;
  }

  const insertData = {
    id: link.id,
    board_id: link.boardId,
    token: link.token,
    permission: link.permissions,
    client_name: link.clientName || null,
    password_hash: link.password || null,
    expires_at: link.expiresAt?.toISOString() || null,
    views: link.views,
    is_active: link.isActive,
    company_branding: link.companyBranding || {},
    created_at: link.createdAt.toISOString(),
  };

  console.log('Inserting share link to Supabase:', insertData);

  try {
    // Use direct fetch to avoid Supabase JS client hanging issues
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
      body: JSON.stringify(insertData),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to save share link to Supabase:', response.status, errorText);
      return false;
    }

    const data = await response.json();
    console.log('SUCCESS: Share link saved to Supabase:', link.token, data);
    return true;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.error('Supabase request timed out after 10s');
    } else {
      console.error('Error saving share link to Supabase:', err);
    }
    return false;
  }
}

// Get share link by token from Supabase
export async function getShareLinkByTokenFromSupabase(token: string): Promise<ShareLink | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    // Use direct fetch to avoid Supabase JS client hanging issues
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
      console.error('Failed to fetch share link:', response.status);
      return null;
    }

    const data = await response.json();
    if (!data || data.length === 0) {
      return null;
    }

    return dbRowToShareLink(data[0]);
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.error('Supabase fetch timed out');
    } else {
      console.error('Error fetching share link from Supabase:', err);
    }
    return null;
  }
}

// Get share links for a board from Supabase
export async function getShareLinksForBoardFromSupabase(boardId: string): Promise<ShareLink[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    // Use direct fetch to avoid Supabase JS client hanging issues
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(
      `${supabaseUrl}/rest/v1/board_magic_links?board_id=eq.${boardId}&order=created_at.desc`,
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
      console.error('Failed to fetch share links:', response.status);
      return [];
    }

    const data = await response.json();
    return data.map(dbRowToShareLink);
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.error('Supabase fetch timed out');
    } else {
      console.error('Error fetching share links from Supabase:', err);
    }
    return [];
  }
}

// Record a view in Supabase
export async function recordViewInSupabase(linkId: string): Promise<void> {
  if (!supabase || !isSupabaseConfigured()) return;

  try {
    // First get current views
    const { data } = await supabase
      .from('board_magic_links')
      .select('views')
      .eq('id', linkId)
      .single();

    const currentViews = data?.views || 0;

    // Update views count
    await supabase
      .from('board_magic_links')
      .update({
        views: currentViews + 1,
        last_viewed_at: new Date().toISOString(),
      })
      .eq('id', linkId);
  } catch (err) {
    console.error('Error recording view:', err);
  }
}

// Deactivate share link in Supabase
export async function deactivateShareLinkInSupabase(linkId: string): Promise<boolean> {
  if (!supabase || !isSupabaseConfigured()) {
    return false;
  }

  try {
    const { error } = await supabase
      .from('board_magic_links')
      .update({ is_active: false })
      .eq('id', linkId);

    return !error;
  } catch (err) {
    console.error('Error deactivating share link:', err);
    return false;
  }
}

// ============================================
// SHARE LINKS - localStorage fallback functions
// ============================================

// Load share links from localStorage
export function loadShareLinks(): ShareLink[] {
  try {
    const stored = localStorage.getItem(SHARE_LINKS_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return parsed.map((link: any) => ({
      ...link,
      createdAt: new Date(link.createdAt),
      expiresAt: link.expiresAt ? new Date(link.expiresAt) : undefined,
      lastViewedAt: link.lastViewedAt ? new Date(link.lastViewedAt) : undefined,
    }));
  } catch (e) {
    console.error('Failed to load share links:', e);
    return [];
  }
}

// Save share links to localStorage
export function saveShareLinks(links: ShareLink[]): void {
  try {
    localStorage.setItem(SHARE_LINKS_KEY, JSON.stringify(links));
  } catch (e) {
    console.error('Failed to save share links:', e);
  }
}

// Get a share link by token (tries Supabase first, then localStorage)
export function getShareLinkByToken(token: string): ShareLink | null {
  // Synchronous version for backward compatibility - checks localStorage only
  // Use getShareLinkByTokenAsync for full functionality
  const links = loadShareLinks();
  return links.find(l => l.token === token) || null;
}

// Async version that checks Supabase first
export async function getShareLinkByTokenAsync(token: string): Promise<ShareLink | null> {
  // Try Supabase first
  const supabaseLink = await getShareLinkByTokenFromSupabase(token);
  if (supabaseLink) {
    return supabaseLink;
  }

  // Fall back to localStorage
  return getShareLinkByToken(token);
}

// Get all share links for a board
export function getShareLinksForBoard(boardId: string): ShareLink[] {
  const links = loadShareLinks();
  return links.filter(l => l.boardId === boardId);
}

// Async version that includes Supabase links
export async function getShareLinksForBoardAsync(boardId: string): Promise<ShareLink[]> {
  // Get from Supabase
  const supabaseLinks = await getShareLinksForBoardFromSupabase(boardId);

  // Get from localStorage
  const localLinks = getShareLinksForBoard(boardId);

  // Merge, preferring Supabase (dedupe by id)
  const seenIds = new Set(supabaseLinks.map(l => l.id));
  const mergedLinks = [...supabaseLinks];

  for (const link of localLinks) {
    if (!seenIds.has(link.id)) {
      mergedLinks.push(link);
    }
  }

  return mergedLinks;
}

// Update a share link (e.g., increment views)
export function updateShareLink(linkId: string, updates: Partial<ShareLink>): ShareLink | null {
  const links = loadShareLinks();
  const index = links.findIndex(l => l.id === linkId);
  if (index === -1) return null;

  links[index] = { ...links[index], ...updates };
  saveShareLinks(links);
  return links[index];
}

// Deactivate a share link
export function deactivateShareLink(linkId: string): void {
  updateShareLink(linkId, { isActive: false });
  // Also try to deactivate in Supabase
  deactivateShareLinkInSupabase(linkId);
}

// Record a view
export function recordView(linkId: string): void {
  const links = loadShareLinks();
  const link = links.find(l => l.id === linkId);
  if (link) {
    updateShareLink(linkId, {
      views: link.views + 1,
      lastViewedAt: new Date(),
    });
  }
  // Also record in Supabase
  recordViewInSupabase(linkId);
}

// ============================================
// CLIENT COMMENTS - localStorage for now
// ============================================

// Load client comments from localStorage
export function loadClientComments(): ClientComment[] {
  try {
    const stored = localStorage.getItem(CLIENT_COMMENTS_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return parsed.map((comment: any) => ({
      ...comment,
      createdAt: new Date(comment.createdAt),
      updatedAt: new Date(comment.updatedAt),
      resolvedAt: comment.resolvedAt ? new Date(comment.resolvedAt) : undefined,
    }));
  } catch (e) {
    console.error('Failed to load client comments:', e);
    return [];
  }
}

// Save client comments to localStorage
export function saveClientComments(comments: ClientComment[]): void {
  try {
    localStorage.setItem(CLIENT_COMMENTS_KEY, JSON.stringify(comments));
  } catch (e) {
    console.error('Failed to save client comments:', e);
  }
}

// Get comments for a board
export function getCommentsForBoard(boardId: string): ClientComment[] {
  const comments = loadClientComments();
  return comments.filter(c => c.boardId === boardId);
}

// Add a new comment
export function addComment(comment: ClientComment): void {
  const comments = loadClientComments();
  comments.push(comment);
  saveClientComments(comments);
}

// Update a comment
export function updateComment(commentId: string, updates: Partial<ClientComment>): ClientComment | null {
  const comments = loadClientComments();
  const index = comments.findIndex(c => c.id === commentId);
  if (index === -1) return null;

  comments[index] = { ...comments[index], ...updates, updatedAt: new Date() };
  saveClientComments(comments);
  return comments[index];
}

// Resolve/unresolve a comment
export function toggleCommentResolved(commentId: string, resolvedBy: string): ClientComment | null {
  const comments = loadClientComments();
  const comment = comments.find(c => c.id === commentId);
  if (!comment) return null;

  return updateComment(commentId, {
    resolved: !comment.resolved,
    resolvedBy: !comment.resolved ? resolvedBy : undefined,
    resolvedAt: !comment.resolved ? new Date() : undefined,
  });
}

// Delete a comment
export function deleteComment(commentId: string): void {
  const comments = loadClientComments();
  const filtered = comments.filter(c => c.id !== commentId && c.parentId !== commentId);
  saveClientComments(filtered);
}

// Get replies to a comment
export function getReplies(commentId: string): ClientComment[] {
  const comments = loadClientComments();
  return comments.filter(c => c.parentId === commentId);
}

// Generate shareable URL
export function getShareUrl(token: string): string {
  const baseUrl = window.location.origin;
  return `${baseUrl}/client/${token}`;
}

// Format date for display
export function formatCommentDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

// ============================================
// BOARD FETCHING FOR ANONYMOUS USERS
// ============================================

// Get board by ID from Supabase (for anonymous access via share link)
export async function getBoardForShareLink(boardId: string): Promise<any | null> {
  if (!supabase || !isSupabaseConfigured()) {
    // Fall back to localStorage
    try {
      const saved = localStorage.getItem('fan-canvas-boards');
      if (!saved) return null;
      const boards = JSON.parse(saved);
      return boards.find((b: any) => b.id === boardId) || null;
    } catch {
      return null;
    }
  }

  try {
    const board = await boardsApi.getById(boardId);
    if (!board) return null;

    // Convert to app format
    return {
      id: board.id,
      name: board.name,
      visualNodes: board.visual_nodes || [],
      zoom: board.zoom || 1,
      panX: board.pan_x || 0,
      panY: board.pan_y || 0,
    };
  } catch (err) {
    console.error('Error fetching board for share link:', err);
    return null;
  }
}
