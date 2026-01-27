// useDocuments.ts - Supabase hooks for document management
// Provides CRUD operations, sharing, and real-time subscriptions for documents

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { PDFAnnotation, PDFComment } from '../lib/pdf-utils';

// Guard to throw if supabase is not configured
function getSupabase() {
  if (!supabase) throw new Error('Supabase not configured');
  return supabase;
}

// ============================================
// TYPES
// ============================================

export interface ClientDocument {
  id: string;
  organization_id: string;
  client_id?: string;
  folder_id?: string;
  name: string;
  description?: string;
  file_url: string;
  file_key?: string;
  file_size?: number;
  file_type?: string;
  page_count?: number;
  thumbnail_url?: string;
  annotations: PDFAnnotation[];
  comments: PDFComment[];
  share_token?: string;
  share_permissions?: {
    view: boolean;
    download: boolean;
    comment: boolean;
    edit: boolean;
  };
  share_expires_at?: string;
  status: 'active' | 'archived' | 'deleted';
  version: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
  last_viewed_at?: string;
}

export interface DocumentFolder {
  id: string;
  organization_id: string;
  client_id?: string;
  name: string;
  parent_id?: string;
  color: string;
  created_at: string;
  updated_at: string;
  children?: DocumentFolder[];
  documentCount?: number;
}

export interface UseDocumentsOptions {
  organizationId?: string;
  clientId?: string;
  folderId?: string;
  status?: 'active' | 'archived' | 'deleted';
  realtime?: boolean;
}

// ============================================
// useDocuments Hook
// ============================================

export function useDocuments(options: UseDocumentsOptions = {}) {
  const { organizationId, clientId, folderId, status = 'active', realtime = true } = options;
  
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch documents
  const fetchDocuments = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      let query = getSupabase()
        .from('client_documents')
        .select('*')
        .eq('status', status)
        .order('updated_at', { ascending: false });

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }
      if (clientId) {
        query = query.eq('client_id', clientId);
      }
      if (folderId) {
        query = query.eq('folder_id', folderId);
      } else if (folderId === null) {
        query = query.is('folder_id', null);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setDocuments(data || []);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch documents');
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, clientId, folderId, status]);

  // Initial fetch
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Real-time subscription
  useEffect(() => {
    if (!realtime) return;

    const channel = getSupabase()
      .channel('documents-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'client_documents',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setDocuments((prev) => [payload.new as ClientDocument, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setDocuments((prev) =>
              prev.map((doc) =>
                doc.id === payload.new.id ? (payload.new as ClientDocument) : doc
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setDocuments((prev) => prev.filter((doc) => doc.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      getSupabase().removeChannel(channel);
    };
  }, [realtime]);

  // Create document
  const createDocument = useCallback(
    async (document: Partial<ClientDocument>): Promise<ClientDocument | null> => {
      try {
        const { data, error: createError } = await getSupabase()
          .from('client_documents')
          .insert([
            {
              ...document,
              organization_id: organizationId,
              annotations: document.annotations || [],
              comments: document.comments || [],
              status: 'active',
              version: 1,
            },
          ])
          .select()
          .single();

        if (createError) throw createError;
        return data;
      } catch (err) {
        console.error('Error creating document:', err);
        throw err;
      }
    },
    [organizationId]
  );

  // Update document
  const updateDocument = useCallback(
    async (id: string, updates: Partial<ClientDocument>): Promise<ClientDocument | null> => {
      try {
        const { data, error: updateError } = await getSupabase()
          .from('client_documents')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select()
          .single();

        if (updateError) throw updateError;
        return data;
      } catch (err) {
        console.error('Error updating document:', err);
        throw err;
      }
    },
    []
  );

  // Delete document (soft delete)
  const deleteDocument = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await getSupabase()
        .from('client_documents')
        .update({ status: 'deleted', updated_at: new Date().toISOString() })
        .eq('id', id);

      if (deleteError) throw deleteError;
      return true;
    } catch (err) {
      console.error('Error deleting document:', err);
      throw err;
    }
  }, []);

  // Archive document
  const archiveDocument = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: archiveError } = await getSupabase()
        .from('client_documents')
        .update({ status: 'archived', updated_at: new Date().toISOString() })
        .eq('id', id);

      if (archiveError) throw archiveError;
      return true;
    } catch (err) {
      console.error('Error archiving document:', err);
      throw err;
    }
  }, []);

  // Generate share link
  const generateShareLink = useCallback(
    async (
      id: string,
      permissions: { view: boolean; download: boolean; comment: boolean; edit: boolean },
      expiresAt?: Date
    ): Promise<string | null> => {
      try {
        const shareToken = crypto.randomUUID();
        
        const { error: updateError } = await getSupabase()
          .from('client_documents')
          .update({
            share_token: shareToken,
            share_permissions: permissions,
            share_expires_at: expiresAt?.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        if (updateError) throw updateError;
        
        // Return the share URL
        const baseUrl = window.location.origin;
        return `${baseUrl}/shared/document/${shareToken}`;
      } catch (err) {
        console.error('Error generating share link:', err);
        throw err;
      }
    },
    []
  );

  // Revoke share link
  const revokeShareLink = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: updateError } = await getSupabase()
        .from('client_documents')
        .update({
          share_token: null,
          share_permissions: null,
          share_expires_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) throw updateError;
      return true;
    } catch (err) {
      console.error('Error revoking share link:', err);
      throw err;
    }
  }, []);

  // Update annotations
  const updateAnnotations = useCallback(
    async (id: string, annotations: PDFAnnotation[]): Promise<boolean> => {
      try {
        const { error: updateError } = await getSupabase()
          .from('client_documents')
          .update({
            annotations,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        if (updateError) throw updateError;
        return true;
      } catch (err) {
        console.error('Error updating annotations:', err);
        throw err;
      }
    },
    []
  );

  // Update comments
  const updateComments = useCallback(
    async (id: string, comments: PDFComment[]): Promise<boolean> => {
      try {
        const { error: updateError } = await getSupabase()
          .from('client_documents')
          .update({
            comments,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        if (updateError) throw updateError;
        return true;
      } catch (err) {
        console.error('Error updating comments:', err);
        throw err;
      }
    },
    []
  );

  // Track view
  const trackView = useCallback(async (id: string): Promise<void> => {
    try {
      await getSupabase()
        .from('client_documents')
        .update({ last_viewed_at: new Date().toISOString() })
        .eq('id', id);
    } catch (err) {
      console.error('Error tracking view:', err);
    }
  }, []);

  return {
    documents,
    isLoading,
    error,
    refetch: fetchDocuments,
    createDocument,
    updateDocument,
    deleteDocument,
    archiveDocument,
    generateShareLink,
    revokeShareLink,
    updateAnnotations,
    updateComments,
    trackView,
  };
}

// ============================================
// useFolders Hook
// ============================================

export function useFolders(options: { organizationId?: string; clientId?: string } = {}) {
  const { organizationId, clientId } = options;
  
  const [folders, setFolders] = useState<DocumentFolder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch folders
  const fetchFolders = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      let query = getSupabase()
        .from('document_folders')
        .select('*')
        .order('name');

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }
      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      
      // Build folder hierarchy
      const foldersWithHierarchy = buildFolderTree(data || []);
      setFolders(foldersWithHierarchy);
    } catch (err) {
      console.error('Error fetching folders:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch folders');
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, clientId]);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  // Create folder
  const createFolder = useCallback(
    async (folder: Partial<DocumentFolder>): Promise<DocumentFolder | null> => {
      try {
        const { data, error: createError } = await getSupabase()
          .from('document_folders')
          .insert([
            {
              ...folder,
              organization_id: organizationId,
            },
          ])
          .select()
          .single();

        if (createError) throw createError;
        await fetchFolders();
        return data;
      } catch (err) {
        console.error('Error creating folder:', err);
        throw err;
      }
    },
    [organizationId, fetchFolders]
  );

  // Update folder
  const updateFolder = useCallback(
    async (id: string, updates: Partial<DocumentFolder>): Promise<boolean> => {
      try {
        const { error: updateError } = await getSupabase()
          .from('document_folders')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        if (updateError) throw updateError;
        await fetchFolders();
        return true;
      } catch (err) {
        console.error('Error updating folder:', err);
        throw err;
      }
    },
    [fetchFolders]
  );

  // Delete folder
  const deleteFolder = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const { error: deleteError } = await getSupabase()
          .from('document_folders')
          .delete()
          .eq('id', id);

        if (deleteError) throw deleteError;
        await fetchFolders();
        return true;
      } catch (err) {
        console.error('Error deleting folder:', err);
        throw err;
      }
    },
    [fetchFolders]
  );

  return {
    folders,
    isLoading,
    error,
    refetch: fetchFolders,
    createFolder,
    updateFolder,
    deleteFolder,
  };
}

// ============================================
// useDocument Hook (single document)
// ============================================

export function useDocument(documentId: string | null) {
  const [document, setDocument] = useState<ClientDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch document
  const fetchDocument = useCallback(async () => {
    if (!documentId) {
      setDocument(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await getSupabase()
        .from('client_documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (fetchError) throw fetchError;
      setDocument(data);
    } catch (err) {
      console.error('Error fetching document:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch document');
    } finally {
      setIsLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    fetchDocument();
  }, [fetchDocument]);

  // Real-time subscription
  useEffect(() => {
    if (!documentId) return;

    const channel = getSupabase()
      .channel(`document-${documentId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'client_documents',
          filter: `id=eq.${documentId}`,
        },
        (payload) => {
          setDocument(payload.new as ClientDocument);
        }
      )
      .subscribe();

    return () => {
      getSupabase().removeChannel(channel);
    };
  }, [documentId]);

  return {
    document,
    isLoading,
    error,
    refetch: fetchDocument,
  };
}

// ============================================
// useSharedDocument Hook (for public access)
// ============================================

export function useSharedDocument(shareToken: string | null) {
  const [document, setDocument] = useState<ClientDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<{
    view: boolean;
    download: boolean;
    comment: boolean;
    edit: boolean;
  } | null>(null);

  useEffect(() => {
    if (!shareToken) {
      setDocument(null);
      setIsLoading(false);
      return;
    }

    const fetchSharedDocument = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { data, error: fetchError } = await getSupabase()
          .from('client_documents')
          .select('*')
          .eq('share_token', shareToken)
          .eq('status', 'active')
          .single();

        if (fetchError) throw fetchError;

        // Check if share has expired
        if (data.share_expires_at && new Date(data.share_expires_at) < new Date()) {
          throw new Error('Share link has expired');
        }

        setDocument(data);
        setPermissions(data.share_permissions);
      } catch (err) {
        console.error('Error fetching shared document:', err);
        setError(err instanceof Error ? err.message : 'Document not found or access denied');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSharedDocument();
  }, [shareToken]);

  return {
    document,
    isLoading,
    error,
    permissions,
  };
}

// ============================================
// Helper Functions
// ============================================

function buildFolderTree(folders: DocumentFolder[]): DocumentFolder[] {
  const folderMap = new Map<string, DocumentFolder>();
  const roots: DocumentFolder[] = [];

  // First pass: create map
  folders.forEach((folder) => {
    folderMap.set(folder.id, { ...folder, children: [] });
  });

  // Second pass: build tree
  folders.forEach((folder) => {
    const current = folderMap.get(folder.id)!;
    if (folder.parent_id && folderMap.has(folder.parent_id)) {
      folderMap.get(folder.parent_id)!.children!.push(current);
    } else {
      roots.push(current);
    }
  });

  return roots;
}

export default useDocuments;
