import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Organization, Board, Note } from '@/types/database';

// Fetch organizations (clients)
export function useOrganizations() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchOrganizations = useCallback(async () => {
    if (!isSupabaseConfigured() || !supabase) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('name');

      if (error) throw error;
      if (isMountedRef.current) {
        setOrganizations(data || []);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err as Error);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  return { organizations, loading, error, refetch: fetchOrganizations };
}

// Fetch boards with optional organization filter
export function useBoards(organizationId?: string) {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchBoards = useCallback(async () => {
    if (!isSupabaseConfigured() || !supabase) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      let query = supabase.from('boards').select('*').order('updated_at', { ascending: false });

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      if (isMountedRef.current) {
        setBoards(data || []);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err as Error);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [organizationId]);

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  const createBoard = async (board: Partial<Board>) => {
    if (!isSupabaseConfigured() || !supabase) return null;

    try {
      const { data, error } = await supabase
        .from('boards')
        .insert(board)
        .select()
        .single();

      if (error) throw error;
      await fetchBoards();
      return data;
    } catch (err) {
      if (isMountedRef.current) {
        setError(err as Error);
      }
      return null;
    }
  };

  const updateBoard = async (id: string, updates: Partial<Board>) => {
    if (!isSupabaseConfigured() || !supabase) return null;

    try {
      const { data, error } = await supabase
        .from('boards')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      await fetchBoards();
      return data;
    } catch (err) {
      if (isMountedRef.current) {
        setError(err as Error);
      }
      return null;
    }
  };

  const deleteBoard = async (id: string) => {
    if (!isSupabaseConfigured() || !supabase) return;

    try {
      const { error } = await supabase.from('boards').delete().eq('id', id);
      if (error) throw error;
      await fetchBoards();
    } catch (err) {
      if (isMountedRef.current) {
        setError(err as Error);
      }
    }
  };

  return { boards, loading, error, refetch: fetchBoards, createBoard, updateBoard, deleteBoard };
}

// Fetch notes with Notion-style hierarchy
export function useNotes(organizationId?: string, parentId?: string | null) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchNotes = useCallback(async () => {
    if (!isSupabaseConfigured() || !supabase) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      let query = supabase.from('notes').select('*').order('order_index');

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      if (parentId !== undefined) {
        query = parentId === null
          ? query.is('parent_id', null)
          : query.eq('parent_id', parentId);
      }

      const { data, error } = await query;
      if (error) throw error;
      if (isMountedRef.current) {
        setNotes(data || []);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err as Error);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [organizationId, parentId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const createNote = async (note: Partial<Note>) => {
    if (!isSupabaseConfigured() || !supabase) return null;

    try {
      const { data, error } = await supabase
        .from('notes')
        .insert(note)
        .select()
        .single();

      if (error) throw error;
      await fetchNotes();
      return data;
    } catch (err) {
      if (isMountedRef.current) {
        setError(err as Error);
      }
      return null;
    }
  };

  const updateNote = async (id: string, updates: Partial<Note>) => {
    if (!isSupabaseConfigured() || !supabase) return null;

    try {
      const { data, error } = await supabase
        .from('notes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      await fetchNotes();
      return data;
    } catch (err) {
      if (isMountedRef.current) {
        setError(err as Error);
      }
      return null;
    }
  };

  const deleteNote = async (id: string) => {
    if (!isSupabaseConfigured() || !supabase) return;

    try {
      const { error } = await supabase.from('notes').delete().eq('id', id);
      if (error) throw error;
      await fetchNotes();
    } catch (err) {
      if (isMountedRef.current) {
        setError(err as Error);
      }
    }
  };

  return { notes, loading, error, refetch: fetchNotes, createNote, updateNote, deleteNote };
}

// Subscribe to realtime updates
export function useRealtimeBoard(boardId: string, onUpdate: () => void) {
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase || !boardId) return;

    const channel = supabase
      .channel(`board-${boardId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'nodes', filter: `board_id=eq.${boardId}` },
        () => onUpdateRef.current()
      )
      .subscribe();

    return () => {
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [boardId]);
}
