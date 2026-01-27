// Documents API - Supabase integration for PDF documents
// Handles document CRUD operations, sharing, and real-time sync

import { supabase, isSupabaseConfigured } from './supabase';
import type { PDFAnnotation, PDFComment } from './pdf-utils';

// ============================================
// TYPES
// ============================================

export interface ClientDocument {
  id: string;
  name: string;
  description?: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  pageCount: number;
  clientId?: string;
  organizationId?: string;
  thumbnailUrl?: string;
  annotations: PDFAnnotation[];
  comments: PDFComment[];
  shareToken?: string;
  sharePermissions?: 'view' | 'comment' | 'edit';
  shareExpiresAt?: Date;
  isPublic: boolean;
  status: 'active' | 'archived' | 'deleted';
  version: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  lastViewedAt?: Date;
}

export interface DocumentShareLink {
  id: string;
  documentId: string;
  token: string;
  permission: 'view' | 'comment' | 'edit';
  clientName?: string;
  passwordHash?: string;
  expiresAt?: Date;
  maxUses?: number;
  useCount: number;
  isActive: boolean;
  companyBranding?: {
    name?: string;
    logo?: string;
    primaryColor?: string;
  };
  views: number;
  lastViewedAt?: Date;
  createdAt: Date;
}

export interface CreateDocumentInput {
  name: string;
  description?: string;
  fileUrl: string;
  fileSize: number;
  fileType?: string;
  pageCount?: number;
  clientId?: string;
  organizationId?: string;
  thumbnailUrl?: string;
}

export interface UpdateDocumentInput {
  name?: string;
  description?: string;
  annotations?: PDFAnnotation[];
  thumbnailUrl?: string;
  status?: 'active' | 'archived' | 'deleted';
}

// ============================================
// STORAGE KEYS FOR LOCAL FALLBACK
// ============================================

const DOCUMENTS_STORAGE_KEY = 'strategic-canvas-documents';

// ============================================
// LOCAL STORAGE HELPERS
// ============================================

function loadDocumentsFromStorage(): ClientDocument[] {
  try {
    const stored = localStorage.getItem(DOCUMENTS_STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored).map((doc: any) => ({
      ...doc,
      createdAt: new Date(doc.createdAt),
      updatedAt: new Date(doc.updatedAt),
      lastViewedAt: doc.lastViewedAt ? new Date(doc.lastViewedAt) : undefined,
      shareExpiresAt: doc.shareExpiresAt ? new Date(doc.shareExpiresAt) : undefined,
    }));
  } catch (e) {
    console.error('Error loading documents from storage:', e);
    return [];
  }
}

function saveDocumentsToStorage(documents: ClientDocument[]): void {
  try {
    localStorage.setItem(DOCUMENTS_STORAGE_KEY, JSON.stringify(documents));
  } catch (e) {
    console.error('Error saving documents to storage:', e);
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateToken(length: number = 24): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (x) => chars[x % chars.length]).join('');
}

function dbRowToDocument(row: any): ClientDocument {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    fileUrl: row.file_url,
    fileSize: row.file_size || 0,
    fileType: row.file_type || 'application/pdf',
    pageCount: row.page_count || 1,
    clientId: row.client_id,
    organizationId: row.organization_id,
    thumbnailUrl: row.thumbnail_url,
    annotations: row.annotations || [],
    comments: [],
    shareToken: row.share_token,
    sharePermissions: row.share_permissions,
    shareExpiresAt: row.share_expires_at ? new Date(row.share_expires_at) : undefined,
    isPublic: row.is_public || false,
    status: row.status || 'active',
    version: row.version || 1,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    createdBy: row.created_by,
    lastViewedAt: row.last_viewed_at ? new Date(row.last_viewed_at) : undefined,
  };
}

function documentToDbRow(doc: CreateDocumentInput | UpdateDocumentInput): any {
  const row: any = {};
  
  if ('name' in doc && doc.name !== undefined) row.name = doc.name;
  if ('description' in doc && doc.description !== undefined) row.description = doc.description;
  if ('fileUrl' in doc && doc.fileUrl !== undefined) row.file_url = doc.fileUrl;
  if ('fileSize' in doc && doc.fileSize !== undefined) row.file_size = doc.fileSize;
  if ('fileType' in doc && doc.fileType !== undefined) row.file_type = doc.fileType;
  if ('pageCount' in doc && doc.pageCount !== undefined) row.page_count = doc.pageCount;
  if ('clientId' in doc && doc.clientId !== undefined) row.client_id = doc.clientId;
  if ('organizationId' in doc && doc.organizationId !== undefined) row.organization_id = doc.organizationId;
  if ('thumbnailUrl' in doc && doc.thumbnailUrl !== undefined) row.thumbnail_url = doc.thumbnailUrl;
  if ('annotations' in doc && doc.annotations !== undefined) row.annotations = doc.annotations;
  if ('status' in doc && doc.status !== undefined) row.status = doc.status;
  
  return row;
}

// ============================================
// DOCUMENTS API
// ============================================

export const documentsApi = {
  // Get all documents
  async getAll(organizationId?: string): Promise<ClientDocument[]> {
    if (!isSupabaseConfigured()) {
      return loadDocumentsFromStorage();
    }

    try {
      let query = supabase!
        .from('client_documents')
        .select('*')
        .eq('status', 'active')
        .order('updated_at', { ascending: false });

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching documents:', error);
        return loadDocumentsFromStorage();
      }

      return data.map(dbRowToDocument);
    } catch (e) {
      console.error('Error fetching documents:', e);
      return loadDocumentsFromStorage();
    }
  },

  // Get documents for a specific client
  async getByClient(clientId: string): Promise<ClientDocument[]> {
    if (!isSupabaseConfigured()) {
      return loadDocumentsFromStorage().filter(d => d.clientId === clientId);
    }

    try {
      const { data, error } = await supabase!
        .from('client_documents')
        .select('*')
        .eq('client_id', clientId)
        .eq('status', 'active')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching client documents:', error);
        return loadDocumentsFromStorage().filter(d => d.clientId === clientId);
      }

      return data.map(dbRowToDocument);
    } catch (e) {
      console.error('Error fetching client documents:', e);
      return loadDocumentsFromStorage().filter(d => d.clientId === clientId);
    }
  },

  // Get a single document by ID
  async getById(id: string): Promise<ClientDocument | null> {
    if (!isSupabaseConfigured()) {
      return loadDocumentsFromStorage().find(d => d.id === id) || null;
    }

    try {
      const { data, error } = await supabase!
        .from('client_documents')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        console.error('Error fetching document:', error);
        return loadDocumentsFromStorage().find(d => d.id === id) || null;
      }

      // Also fetch comments
      const { data: comments } = await supabase!
        .from('document_comments')
        .select('*')
        .eq('document_id', id)
        .order('created_at', { ascending: true });

      const doc = dbRowToDocument(data);
      doc.comments = (comments || []).map((c: any) => ({
        id: c.id,
        documentId: c.document_id,
        pageNumber: c.page_number,
        positionX: c.position_x,
        positionY: c.position_y,
        selectionStart: c.selection_start,
        selectionEnd: c.selection_end,
        selectedText: c.selected_text,
        content: c.content,
        authorName: c.author_name,
        authorEmail: c.author_email,
        authorId: c.author_id,
        parentId: c.parent_id,
        threadId: c.thread_id,
        resolved: c.resolved,
        resolvedBy: c.resolved_by,
        resolvedAt: c.resolved_at ? new Date(c.resolved_at) : undefined,
        reactions: c.reactions,
        createdAt: new Date(c.created_at),
        updatedAt: new Date(c.updated_at),
      }));

      return doc;
    } catch (e) {
      console.error('Error fetching document:', e);
      return loadDocumentsFromStorage().find(d => d.id === id) || null;
    }
  },

  // Create a new document
  async create(input: CreateDocumentInput): Promise<ClientDocument | null> {
    const now = new Date();
    const newDoc: ClientDocument = {
      id: crypto.randomUUID(),
      name: input.name,
      description: input.description,
      fileUrl: input.fileUrl,
      fileSize: input.fileSize,
      fileType: input.fileType || 'application/pdf',
      pageCount: input.pageCount || 1,
      clientId: input.clientId,
      organizationId: input.organizationId,
      thumbnailUrl: input.thumbnailUrl,
      annotations: [],
      comments: [],
      isPublic: false,
      status: 'active',
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    if (!isSupabaseConfigured()) {
      const docs = loadDocumentsFromStorage();
      docs.unshift(newDoc);
      saveDocumentsToStorage(docs);
      return newDoc;
    }

    try {
      const { data, error } = await supabase!
        .from('client_documents')
        .insert({
          id: newDoc.id,
          ...documentToDbRow(input),
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating document:', error);
        // Fallback to local storage
        const docs = loadDocumentsFromStorage();
        docs.unshift(newDoc);
        saveDocumentsToStorage(docs);
        return newDoc;
      }

      return dbRowToDocument(data);
    } catch (e) {
      console.error('Error creating document:', e);
      // Fallback to local storage
      const docs = loadDocumentsFromStorage();
      docs.unshift(newDoc);
      saveDocumentsToStorage(docs);
      return newDoc;
    }
  },

  // Update a document
  async update(id: string, input: UpdateDocumentInput): Promise<ClientDocument | null> {
    if (!isSupabaseConfigured()) {
      const docs = loadDocumentsFromStorage();
      const index = docs.findIndex(d => d.id === id);
      if (index === -1) return null;
      
      docs[index] = {
        ...docs[index],
        ...input,
        updatedAt: new Date(),
      };
      saveDocumentsToStorage(docs);
      return docs[index];
    }

    try {
      const { data, error } = await supabase!
        .from('client_documents')
        .update({
          ...documentToDbRow(input),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating document:', error);
        return null;
      }

      return dbRowToDocument(data);
    } catch (e) {
      console.error('Error updating document:', e);
      return null;
    }
  },

  // Delete a document (soft delete)
  async delete(id: string): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      const docs = loadDocumentsFromStorage();
      const filtered = docs.filter(d => d.id !== id);
      saveDocumentsToStorage(filtered);
      return true;
    }

    try {
      const { error } = await supabase!
        .from('client_documents')
        .update({ status: 'deleted', updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        console.error('Error deleting document:', error);
        return false;
      }

      return true;
    } catch (e) {
      console.error('Error deleting document:', e);
      return false;
    }
  },

  // Update annotations
  async updateAnnotations(id: string, annotations: PDFAnnotation[]): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      const docs = loadDocumentsFromStorage();
      const index = docs.findIndex(d => d.id === id);
      if (index === -1) return false;
      
      docs[index].annotations = annotations;
      docs[index].updatedAt = new Date();
      saveDocumentsToStorage(docs);
      return true;
    }

    try {
      const { error } = await supabase!
        .from('client_documents')
        .update({
          annotations,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        console.error('Error updating annotations:', error);
        return false;
      }

      return true;
    } catch (e) {
      console.error('Error updating annotations:', e);
      return false;
    }
  },
};

// ============================================
// DOCUMENT COMMENTS API
// ============================================

export const documentCommentsApi = {
  // Add a comment
  async create(comment: Omit<PDFComment, 'id' | 'createdAt' | 'updatedAt'>): Promise<PDFComment | null> {
    const now = new Date();
    const newComment: PDFComment = {
      ...comment,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };

    if (!comment.parentId) {
      newComment.threadId = newComment.id;
    }

    if (!isSupabaseConfigured()) {
      // For local storage, we store comments with the document
      const docs = loadDocumentsFromStorage();
      const docIndex = docs.findIndex(d => d.id === comment.documentId);
      if (docIndex === -1) return null;
      
      if (!docs[docIndex].comments) {
        docs[docIndex].comments = [];
      }
      docs[docIndex].comments.push(newComment);
      docs[docIndex].updatedAt = now;
      saveDocumentsToStorage(docs);
      return newComment;
    }

    try {
      const { error } = await supabase!
        .from('document_comments')
        .insert({
          id: newComment.id,
          document_id: comment.documentId,
          page_number: comment.pageNumber,
          position_x: comment.positionX,
          position_y: comment.positionY,
          selection_start: comment.selectionStart,
          selection_end: comment.selectionEnd,
          selected_text: comment.selectedText,
          content: comment.content,
          author_name: comment.authorName,
          author_email: comment.authorEmail,
          author_id: comment.authorId,
          parent_id: comment.parentId,
          thread_id: newComment.threadId,
          resolved: false,
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating comment:', error);
        return null;
      }

      return newComment;
    } catch (e) {
      console.error('Error creating comment:', e);
      return null;
    }
  },

  // Update a comment
  async update(id: string, updates: Partial<PDFComment>): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      const docs = loadDocumentsFromStorage();
      for (const doc of docs) {
        const commentIndex = doc.comments?.findIndex(c => c.id === id);
        if (commentIndex !== undefined && commentIndex !== -1) {
          doc.comments[commentIndex] = {
            ...doc.comments[commentIndex],
            ...updates,
            updatedAt: new Date(),
          };
          saveDocumentsToStorage(docs);
          return true;
        }
      }
      return false;
    }

    try {
      const updateData: any = { updated_at: new Date().toISOString() };
      if (updates.content !== undefined) updateData.content = updates.content;
      if (updates.resolved !== undefined) updateData.resolved = updates.resolved;
      if (updates.resolvedBy !== undefined) updateData.resolved_by = updates.resolvedBy;
      if (updates.resolvedAt !== undefined) updateData.resolved_at = updates.resolvedAt?.toISOString();

      const { error } = await supabase!
        .from('document_comments')
        .update(updateData)
        .eq('id', id);

      if (error) {
        console.error('Error updating comment:', error);
        return false;
      }

      return true;
    } catch (e) {
      console.error('Error updating comment:', e);
      return false;
    }
  },

  // Delete a comment
  async delete(id: string): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      const docs = loadDocumentsFromStorage();
      for (const doc of docs) {
        if (doc.comments) {
          const initialLength = doc.comments.length;
          doc.comments = doc.comments.filter(c => c.id !== id && c.parentId !== id);
          if (doc.comments.length !== initialLength) {
            saveDocumentsToStorage(docs);
            return true;
          }
        }
      }
      return false;
    }

    try {
      // Delete comment and all replies
      const { error } = await supabase!
        .from('document_comments')
        .delete()
        .or(`id.eq.${id},parent_id.eq.${id}`);

      if (error) {
        console.error('Error deleting comment:', error);
        return false;
      }

      return true;
    } catch (e) {
      console.error('Error deleting comment:', e);
      return false;
    }
  },

  // Resolve a comment thread
  async resolve(id: string, resolvedBy: string): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      const docs = loadDocumentsFromStorage();
      for (const doc of docs) {
        const comment = doc.comments?.find(c => c.id === id);
        if (comment) {
          const resolved = !comment.resolved;
          // Update all comments in the thread
          doc.comments?.forEach(c => {
            if (c.id === id || c.threadId === id) {
              c.resolved = resolved;
              c.resolvedBy = resolved ? resolvedBy : undefined;
              c.resolvedAt = resolved ? new Date() : undefined;
              c.updatedAt = new Date();
            }
          });
          saveDocumentsToStorage(docs);
          return true;
        }
      }
      return false;
    }

    try {
      // First get the comment to check current state
      const { data: comment } = await supabase!
        .from('document_comments')
        .select('resolved, thread_id')
        .eq('id', id)
        .single();

      if (!comment) return false;

      const resolved = !comment.resolved;
      const now = new Date().toISOString();

      // Update all comments in the thread
      const { error } = await supabase!
        .from('document_comments')
        .update({
          resolved,
          resolved_by: resolved ? resolvedBy : null,
          resolved_at: resolved ? now : null,
          updated_at: now,
        })
        .or(`id.eq.${id},thread_id.eq.${comment.thread_id || id}`);

      if (error) {
        console.error('Error resolving comment:', error);
        return false;
      }

      return true;
    } catch (e) {
      console.error('Error resolving comment:', e);
      return false;
    }
  },
};

// ============================================
// DOCUMENT SHARE LINKS API
// ============================================

export const documentShareLinksApi = {
  // Create a share link
  async create(
    documentId: string,
    options: {
      permission?: 'view' | 'comment' | 'edit';
      clientName?: string;
      password?: string;
      expiresInDays?: number;
      maxUses?: number;
      companyBranding?: {
        name?: string;
        logo?: string;
        primaryColor?: string;
      };
    } = {}
  ): Promise<DocumentShareLink | null> {
    const now = new Date();
    const token = generateToken();
    const expiresAt = options.expiresInDays
      ? new Date(now.getTime() + options.expiresInDays * 24 * 60 * 60 * 1000)
      : undefined;

    const shareLink: DocumentShareLink = {
      id: crypto.randomUUID(),
      documentId,
      token,
      permission: options.permission || 'view',
      clientName: options.clientName,
      expiresAt,
      maxUses: options.maxUses,
      useCount: 0,
      isActive: true,
      companyBranding: options.companyBranding,
      views: 0,
      createdAt: now,
    };

    if (!isSupabaseConfigured()) {
      // Store in document
      const docs = loadDocumentsFromStorage();
      const docIndex = docs.findIndex(d => d.id === documentId);
      if (docIndex !== -1) {
        docs[docIndex].shareToken = token;
        docs[docIndex].sharePermissions = shareLink.permission;
        docs[docIndex].shareExpiresAt = expiresAt;
        saveDocumentsToStorage(docs);
      }
      return shareLink;
    }

    try {
      const { error } = await supabase!
        .from('document_magic_links')
        .insert({
          id: shareLink.id,
          document_id: documentId,
          token,
          permission: shareLink.permission,
          client_name: options.clientName,
          expires_at: expiresAt?.toISOString(),
          max_uses: options.maxUses,
          company_branding: options.companyBranding || {},
          created_at: now.toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating share link:', error);
        return null;
      }

      // Also update the document with share token
      await supabase!
        .from('client_documents')
        .update({
          share_token: token,
          share_permissions: shareLink.permission,
          share_expires_at: expiresAt?.toISOString(),
        })
        .eq('id', documentId);

      return shareLink;
    } catch (e) {
      console.error('Error creating share link:', e);
      return null;
    }
  },

  // Get share link by token
  async getByToken(token: string): Promise<{
    shareLink: DocumentShareLink;
    document: ClientDocument;
  } | null> {
    if (!isSupabaseConfigured()) {
      const docs = loadDocumentsFromStorage();
      const doc = docs.find(d => d.shareToken === token);
      if (!doc) return null;
      
      return {
        shareLink: {
          id: crypto.randomUUID(),
          documentId: doc.id,
          token,
          permission: doc.sharePermissions || 'view',
          useCount: 0,
          isActive: true,
          views: 0,
          createdAt: doc.createdAt,
        },
        document: doc,
      };
    }

    try {
      const { data, error } = await supabase!
        .from('document_magic_links')
        .select('*, client_documents(*)')
        .eq('token', token)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        console.error('Error fetching share link:', error);
        return null;
      }

      // Check expiration
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        return null;
      }

      // Check max uses
      if (data.max_uses && data.use_count >= data.max_uses) {
        return null;
      }

      return {
        shareLink: {
          id: data.id,
          documentId: data.document_id,
          token: data.token,
          permission: data.permission,
          clientName: data.client_name,
          expiresAt: data.expires_at ? new Date(data.expires_at) : undefined,
          maxUses: data.max_uses,
          useCount: data.use_count,
          isActive: data.is_active,
          companyBranding: data.company_branding,
          views: data.views,
          lastViewedAt: data.last_viewed_at ? new Date(data.last_viewed_at) : undefined,
          createdAt: new Date(data.created_at),
        },
        document: dbRowToDocument(data.client_documents),
      };
    } catch (e) {
      console.error('Error fetching share link:', e);
      return null;
    }
  },

  // Record a view
  async recordView(token: string): Promise<void> {
    if (!isSupabaseConfigured()) return;

    try {
      const { data } = await supabase!
        .from('document_magic_links')
        .select('views, use_count')
        .eq('token', token)
        .single();

      if (data) {
        await supabase!
          .from('document_magic_links')
          .update({
            views: (data.views || 0) + 1,
            use_count: (data.use_count || 0) + 1,
            last_viewed_at: new Date().toISOString(),
          })
          .eq('token', token);
      }
    } catch (e) {
      console.error('Error recording view:', e);
    }
  },

  // Deactivate a share link
  async deactivate(id: string): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      const docs = loadDocumentsFromStorage();
      // Find document with matching share token and clear it
      for (const doc of docs) {
        if (doc.shareToken) {
          doc.shareToken = undefined;
          doc.sharePermissions = undefined;
          doc.shareExpiresAt = undefined;
          saveDocumentsToStorage(docs);
          return true;
        }
      }
      return false;
    }

    try {
      const { error } = await supabase!
        .from('document_magic_links')
        .update({ is_active: false })
        .eq('id', id);

      if (error) {
        console.error('Error deactivating share link:', error);
        return false;
      }

      return true;
    } catch (e) {
      console.error('Error deactivating share link:', e);
      return false;
    }
  },
};

// ============================================
// FILE UPLOAD HELPER
// ============================================

export async function uploadDocumentFile(
  file: File,
  organizationId?: string
): Promise<{ url: string; path: string } | null> {
  if (!isSupabaseConfigured()) {
    // For local storage, create a data URL
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          url: reader.result as string,
          path: `local/${file.name}`,
        });
      };
      reader.readAsDataURL(file);
    });
  }

  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = organizationId 
      ? `${organizationId}/${fileName}`
      : `public/${fileName}`;

    const { error } = await supabase!.storage
      .from('documents')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error('Error uploading file:', error);
      return null;
    }

    const { data: urlData } = supabase!.storage
      .from('documents')
      .getPublicUrl(filePath);

    return {
      url: urlData.publicUrl,
      path: filePath,
    };
  } catch (e) {
    console.error('Error uploading file:', e);
    return null;
  }
}

// ============================================
// GET SHARE URL HELPER
// ============================================

export function getDocumentShareUrl(token: string): string {
  const baseUrl = window.location.origin;
  return `${baseUrl}/document/${token}`;
}
