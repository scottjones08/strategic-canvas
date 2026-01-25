// Client Portal Types and Functions
// Provides read-only board access with commenting for clients

export interface ShareLink {
  id: string;
  boardId: string;
  clientId?: string;
  clientName?: string;
  token: string;
  password?: string; // hashed
  expiresAt?: Date;
  permissions: 'view' | 'comment';
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
  permissions: 'view' | 'comment';
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

// Storage keys
const SHARE_LINKS_KEY = 'fan-canvas-share-links';
const CLIENT_COMMENTS_KEY = 'fan-canvas-client-comments';

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

// Get a share link by token
export function getShareLinkByToken(token: string): ShareLink | null {
  const links = loadShareLinks();
  return links.find(l => l.token === token) || null;
}

// Get all share links for a board
export function getShareLinksForBoard(boardId: string): ShareLink[] {
  const links = loadShareLinks();
  return links.filter(l => l.boardId === boardId);
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
}

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
