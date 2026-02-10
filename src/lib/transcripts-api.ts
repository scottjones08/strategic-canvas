/**
 * Supabase API for saving/loading transcripts
 */

import { supabase } from './supabase';
import { FullTranscript, formatTranscriptAsText, extractActionItems } from './transcription';

export interface SavedTranscript {
  id: string;
  title: string;
  content: string;
  segments: any[];
  speakers: any[];
  duration: number;
  status: 'draft' | 'final';
  action_items: string[];
  board_id: string | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Save a transcript to Supabase
 */
export async function saveTranscriptToSupabase(
  transcript: FullTranscript,
  options: {
    title?: string;
    boardId?: string;
    status?: 'draft' | 'final';
  } = {}
): Promise<SavedTranscript | null> {
  if (!supabase) {
    console.warn('Supabase not configured, skipping transcript save');
    return null;
  }

  const content = formatTranscriptAsText(transcript);
  const actionItems = extractActionItems(transcript);
  const title = options.title || `Transcript - ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;

  const record = {
    title,
    content,
    segments: transcript.segments,
    speakers: transcript.speakers,
    duration: Math.round(transcript.duration / 1000),
    status: options.status || 'draft',
    action_items: actionItems,
    board_id: options.boardId || null,
  };

  const { data, error } = await supabase
    .from('transcripts')
    .insert(record)
    .select()
    .single();

  if (error) {
    console.error('Failed to save transcript to Supabase:', error);
    throw error;
  }

  return data;
}

/**
 * Update an existing transcript
 */
export async function updateTranscriptInSupabase(
  id: string,
  updates: Partial<Pick<SavedTranscript, 'title' | 'content' | 'segments' | 'speakers' | 'status' | 'action_items'>>
): Promise<SavedTranscript | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('transcripts')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Failed to update transcript:', error);
    throw error;
  }

  return data;
}

/**
 * List saved transcripts
 */
export async function listTranscriptsFromSupabase(
  options: { limit?: number; boardId?: string; status?: string } = {}
): Promise<SavedTranscript[]> {
  if (!supabase) return [];

  let query = supabase
    .from('transcripts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(options.limit || 50);

  if (options.boardId) {
    query = query.eq('board_id', options.boardId);
  }
  if (options.status) {
    query = query.eq('status', options.status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to list transcripts:', error);
    return [];
  }

  return data || [];
}

/**
 * Load a single transcript
 */
export async function loadTranscriptFromSupabase(id: string): Promise<SavedTranscript | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('transcripts')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Failed to load transcript:', error);
    return null;
  }

  return data;
}

/**
 * Delete a transcript
 */
export async function deleteTranscriptFromSupabase(id: string): Promise<boolean> {
  if (!supabase) return false;

  const { error } = await supabase
    .from('transcripts')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Failed to delete transcript:', error);
    return false;
  }

  return true;
}

/**
 * Convert a SavedTranscript back to a FullTranscript for display
 */
export function savedToFullTranscript(saved: SavedTranscript): FullTranscript {
  return {
    id: saved.id,
    segments: saved.segments || [],
    speakers: saved.speakers || [],
    duration: (saved.duration || 0) * 1000,
    createdAt: new Date(saved.created_at),
    status: 'completed',
  };
}
