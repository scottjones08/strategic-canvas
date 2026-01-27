import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

// Types matching the database schema
export interface CanvasBoard {
  id: string;
  organization_id: string | null;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  visual_nodes: any[];
  zoom: number;
  pan_x: number;
  pan_y: number;
  status: 'active' | 'archived' | 'template';
  progress: number;
  template_id: string | null;
  owner_id: string | null;
  is_public: boolean;
  allow_anonymous_view: boolean;
  allow_anonymous_edit: boolean;
  last_activity: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectNote {
  id: string;
  organization_id: string | null;
  client_id: string | null;
  title: string;
  content: string | null;
  icon: string;
  parent_id: string | null;
  sort_order: number;
  tags: string[];
  is_ai_generated: boolean;
  source_board_id: string | null;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface BoardCollaborator {
  id: string;
  board_id: string;
  user_id: string;
  role: 'viewer' | 'editor' | 'admin';
  invited_by: string | null;
  invited_at: string;
  accepted_at: string | null;
}

export interface BoardMagicLink {
  id: string;
  board_id: string;
  token: string;
  permission: 'view' | 'edit';
  expires_at: string | null;
  max_uses: number | null;
  use_count: number;
  created_by: string | null;
  created_at: string;
}

export interface BoardPresence {
  id: string;
  board_id: string;
  user_id: string;
  cursor_x: number | null;
  cursor_y: number | null;
  color: string | null;
  last_seen: string;
}

export interface ClientWorkspace {
  id: string;
  organization_id: string;
  default_board_template_id: string | null;
  brand_color: string;
  logo_url: string | null;
  boards_enabled: boolean;
  notes_enabled: boolean;
  collaboration_enabled: boolean;
  ai_features_enabled: boolean;
  max_boards: number;
  max_notes: number;
  max_collaborators: number;
  created_at: string;
  updated_at: string;
}

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey)
    : null;

// Check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  return supabase !== null;
}

// ============================================
// CURRENT USER HELPERS
// ============================================

export const userApi = {
  // Get current user's profile from users table
  async getCurrentUser() {
    if (!supabase) throw new Error('Supabase not configured');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  // Check if current user is Fan Works team member
  async isFanWorksTeam(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user?.is_fan_works_team === true;
  },

  // Get current user's organization ID
  async getOrganizationId(): Promise<string | null> {
    const user = await this.getCurrentUser();
    return user?.organization_id || null;
  }
};

// ============================================
// BOARDS API
// ============================================

export const boardsApi = {
  // Get all boards for current user (filtered by RLS)
  async getMyBoards(): Promise<CanvasBoard[]> {
    if (!supabase) throw new Error('Supabase not configured');

    const { data, error } = await supabase
      .from('canvas_boards')
      .select('*')
      .neq('status', 'template')
      .order('last_activity', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get all boards for an organization
  async getByOrganization(organizationId: string): Promise<CanvasBoard[]> {
    if (!supabase) throw new Error('Supabase not configured');
    
    const { data, error } = await supabase
      .from('canvas_boards')
      .select('*')
      .eq('organization_id', organizationId)
      .neq('status', 'template')
      .order('last_activity', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  // Get single board by ID
  async getById(boardId: string): Promise<CanvasBoard | null> {
    if (!supabase) throw new Error('Supabase not configured');
    
    // Use direct fetch to avoid Supabase JS client hanging issues
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    const response = await fetch(`${supabaseUrl}/rest/v1/canvas_boards?id=eq.${boardId}&limit=1`, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      }
    });
    
    if (!response.ok) {
      console.error('boardsApi.getById: HTTP error', response.status);
      return null;
    }
    
    const data = await response.json();
    return data && data[0] ? data[0] : null;
  },

  // Get board by magic link token
  async getByMagicLink(token: string): Promise<{ board: CanvasBoard; permission: string } | null> {
    if (!supabase) throw new Error('Supabase not configured');
    
    const { data: link, error: linkError } = await supabase
      .from('board_magic_links')
      .select('*, canvas_boards(*)')
      .eq('token', token)
      .single();
    
    if (linkError || !link) return null;
    
    // Check expiration
    if (link.expires_at && new Date(link.expires_at) < new Date()) return null;
    
    // Check max uses
    if (link.max_uses && link.use_count >= link.max_uses) return null;
    
    // Increment use count
    await supabase
      .from('board_magic_links')
      .update({ use_count: link.use_count + 1 })
      .eq('id', link.id);
    
    return {
      board: link.canvas_boards,
      permission: link.permission
    };
  },

  // Create new board
  async create(board: Partial<CanvasBoard>): Promise<CanvasBoard> {
    if (!supabase) throw new Error('Supabase not configured');
    
    console.log('boardsApi.create: inserting board...', board.id);
    
    // Use fetch directly to avoid Supabase JS client realtime issues
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    const response = await fetch(`${supabaseUrl}/rest/v1/canvas_boards`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(board)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('boardsApi.create: HTTP error', response.status, errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('boardsApi.create: response received', { success: true, id: data[0]?.id });
    
    if (!data || !data[0]) throw new Error('No data returned from insert');
    return data[0];
  },

  // Create board from template
  async createFromTemplate(templateId: string, organizationId: string, name: string, ownerId: string): Promise<CanvasBoard> {
    if (!supabase) throw new Error('Supabase not configured');
    
    const template = await this.getById(templateId);
    if (!template) throw new Error('Template not found');
    
    return this.create({
      organization_id: organizationId,
      name,
      visual_nodes: template.visual_nodes,
      template_id: templateId,
      owner_id: ownerId,
      status: 'active'
    });
  },

  // Update board
  async update(boardId: string, updates: Partial<CanvasBoard>): Promise<CanvasBoard> {
    if (!supabase) throw new Error('Supabase not configured');
    
    // Use direct fetch to avoid Supabase JS client hanging issues
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    const response = await fetch(`${supabaseUrl}/rest/v1/canvas_boards?id=eq.${boardId}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(updates)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    if (!data || !data[0]) throw new Error('No data returned from update');
    return data[0];
  },

  // Update only visual nodes (optimized for frequent updates)
  async updateNodes(boardId: string, nodes: any[]): Promise<void> {
    if (!supabase) throw new Error('Supabase not configured');
    
    const { error } = await supabase
      .from('canvas_boards')
      .update({ visual_nodes: nodes })
      .eq('id', boardId);
    
    if (error) throw error;
  },

  // Delete board
  async delete(boardId: string): Promise<void> {
    if (!supabase) throw new Error('Supabase not configured');
    
    const { error } = await supabase
      .from('canvas_boards')
      .delete()
      .eq('id', boardId);
    
    if (error) throw error;
  },

  // Get templates
  async getTemplates(): Promise<CanvasBoard[]> {
    if (!supabase) throw new Error('Supabase not configured');
    
    const { data, error } = await supabase
      .from('canvas_boards')
      .select('*')
      .eq('status', 'template')
      .order('name');
    
    if (error) throw error;
    return data || [];
  },

  // Create magic link
  async createMagicLink(boardId: string, permission: 'view' | 'edit', expiresInHours?: number): Promise<string> {
    if (!supabase) throw new Error('Supabase not configured');
    
    const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
    
    const { error } = await supabase
      .from('board_magic_links')
      .insert({
        board_id: boardId,
        token,
        permission,
        expires_at: expiresInHours ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString() : null
      });
    
    if (error) throw error;
    
    return `${window.location.origin}?token=${token}`;
  }
};

// ============================================
// NOTES API
// ============================================

export const notesApi = {
  // Get all notes for current user (filtered by RLS)
  async getMyNotes(): Promise<ProjectNote[]> {
    if (!supabase) throw new Error('Supabase not configured');

    const { data, error } = await supabase
      .from('project_notes')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get all notes for an organization
  async getByOrganization(organizationId: string): Promise<ProjectNote[]> {
    if (!supabase) throw new Error('Supabase not configured');
    
    const { data, error } = await supabase
      .from('project_notes')
      .select('*')
      .eq('organization_id', organizationId)
      .order('updated_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  // Get notes linked to a board
  async getByBoardId(boardId: string): Promise<ProjectNote[]> {
    if (!supabase) throw new Error('Supabase not configured');
    
    const { data, error } = await supabase
      .from('note_board_links')
      .select('project_notes(*)')
      .eq('board_id', boardId);
    
    if (error) throw error;
    return data?.map((d: any) => d.project_notes) || [];
  },

  // Create note
  async create(note: Partial<ProjectNote>): Promise<ProjectNote> {
    if (!supabase) throw new Error('Supabase not configured');
    
    const { data, error } = await supabase
      .from('project_notes')
      .insert(note)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Create AI summary note for a board
  async createAISummary(boardId: string, boardName: string, content: string, organizationId: string, ownerId: string): Promise<ProjectNote> {
    const note = await this.create({
      organization_id: organizationId,
      title: `${boardName} - AI Summary`,
      content,
      icon: '🤖',
      tags: ['ai-summary', 'auto-generated'],
      is_ai_generated: true,
      source_board_id: boardId,
      owner_id: ownerId
    });

    // Link note to board
    if (supabase) {
      await supabase
        .from('note_board_links')
        .insert({ note_id: note.id, board_id: boardId });
    }

    return note;
  },

  // Update note
  async update(noteId: string, updates: Partial<ProjectNote>): Promise<ProjectNote> {
    if (!supabase) throw new Error('Supabase not configured');
    
    const { data, error } = await supabase
      .from('project_notes')
      .update(updates)
      .eq('id', noteId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Delete note
  async delete(noteId: string): Promise<void> {
    if (!supabase) throw new Error('Supabase not configured');
    
    const { error } = await supabase
      .from('project_notes')
      .delete()
      .eq('id', noteId);
    
    if (error) throw error;
  },

  // Link note to board
  async linkToBoard(noteId: string, boardId: string): Promise<void> {
    if (!supabase) throw new Error('Supabase not configured');
    
    const { error } = await supabase
      .from('note_board_links')
      .insert({ note_id: noteId, board_id: boardId });
    
    if (error && error.code !== '23505') throw error; // Ignore duplicate
  },

  // Unlink note from board
  async unlinkFromBoard(noteId: string, boardId: string): Promise<void> {
    if (!supabase) throw new Error('Supabase not configured');
    
    const { error } = await supabase
      .from('note_board_links')
      .delete()
      .eq('note_id', noteId)
      .eq('board_id', boardId);
    
    if (error) throw error;
  }
};

// ============================================
// REAL-TIME COLLABORATION
// ============================================

export class BoardCollaboration {
  private channel: RealtimeChannel | null = null;
  private boardId: string;
  private userId: string;
  private userName: string;
  private userColor: string;

  constructor(boardId: string, userId: string, userName: string, userColor: string) {
    this.boardId = boardId;
    this.userId = userId;
    this.userName = userName;
    this.userColor = userColor;
  }

  // Subscribe to board updates
  async subscribe(callbacks: {
    onPresenceSync?: (users: BoardPresence[]) => void;
    onCursorMove?: (userId: string, x: number, y: number) => void;
    onBoardUpdate?: (nodes: any[]) => void;
    onUserJoin?: (user: BoardPresence) => void;
    onUserLeave?: (userId: string) => void;
  }): Promise<boolean> {
    if (!supabase) return false;

    this.channel = supabase.channel(`board:${this.boardId}`, {
      config: {
        presence: { key: this.userId },
        broadcast: { self: false }
      }
    });

    this.channel
      .on('presence', { event: 'sync' }, () => {
        const state = this.channel?.presenceState();
        if (state && callbacks.onPresenceSync) {
          const users: BoardPresence[] = [];
          Object.entries(state).forEach(([key, presences]: [string, any]) => {
            if (key !== this.userId && presences.length > 0) {
              const p = presences[0];
              users.push({
                id: crypto.randomUUID(),
                board_id: this.boardId,
                user_id: key,
                cursor_x: p.cursor_x,
                cursor_y: p.cursor_y,
                color: p.color,
                last_seen: new Date().toISOString()
              });
            }
          });
          callbacks.onPresenceSync(users);
        }
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        if (callbacks.onUserJoin && newPresences.length > 0) {
          const p = newPresences[0];
          callbacks.onUserJoin({
            id: crypto.randomUUID(),
            board_id: this.boardId,
            user_id: key,
            cursor_x: p.cursor_x,
            cursor_y: p.cursor_y,
            color: p.color,
            last_seen: new Date().toISOString()
          });
        }
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        if (callbacks.onUserLeave) {
          callbacks.onUserLeave(key);
        }
      })
      .on('broadcast', { event: 'cursor' }, ({ payload }) => {
        if (callbacks.onCursorMove) {
          callbacks.onCursorMove(payload.userId, payload.x, payload.y);
        }
      })
      .on('broadcast', { event: 'board_update' }, ({ payload }) => {
        if (callbacks.onBoardUpdate) {
          callbacks.onBoardUpdate(payload.nodes);
        }
      });

    return new Promise<boolean>((resolve) => {
      this.channel!.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await this.channel?.track({
            name: this.userName,
            color: this.userColor,
            cursor_x: 0,
            cursor_y: 0
          });
          resolve(true);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          resolve(false);
        }
      });
    });
  }

  // Broadcast cursor position
  broadcastCursor(x: number, y: number) {
    this.channel?.send({
      type: 'broadcast',
      event: 'cursor',
      payload: { userId: this.userId, x, y }
    });
  }

  // Broadcast board changes
  broadcastBoardUpdate(nodes: any[]) {
    this.channel?.send({
      type: 'broadcast',
      event: 'board_update',
      payload: { nodes }
    });
  }

  // Unsubscribe
  async unsubscribe() {
    if (this.channel) {
      await this.channel.unsubscribe();
      this.channel = null;
    }
  }
}

// ============================================
// CLIENT WORKSPACE API
// ============================================

export const workspaceApi = {
  // Get workspace for an organization
  async getByOrganization(organizationId: string): Promise<ClientWorkspace | null> {
    if (!supabase) throw new Error('Supabase not configured');
    
    const { data, error } = await supabase
      .from('client_workspaces')
      .select('*')
      .eq('organization_id', organizationId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  // Update workspace settings
  async update(organizationId: string, updates: Partial<ClientWorkspace>): Promise<ClientWorkspace> {
    if (!supabase) throw new Error('Supabase not configured');
    
    const { data, error } = await supabase
      .from('client_workspaces')
      .update(updates)
      .eq('organization_id', organizationId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Get full client data with boards and notes
  async getFullClientData(organizationId: string): Promise<{
    workspace: ClientWorkspace | null;
    boards: CanvasBoard[];
    notes: ProjectNote[];
  }> {
    const [workspace, boards, notes] = await Promise.all([
      this.getByOrganization(organizationId),
      boardsApi.getByOrganization(organizationId),
      notesApi.getByOrganization(organizationId)
    ]);

    return { workspace, boards, notes };
  }
};

// ============================================
// ORGANIZATIONS (CLIENTS) API
// ============================================

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  website: string | null;
  industry: string | null;
  created_at: string;
  updated_at: string;
}

export const organizationsApi = {
  // Get all organizations (clients)
  async getAll(): Promise<Organization[]> {
    if (!supabase) throw new Error('Supabase not configured');

    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Get single organization by ID
  async getById(id: string): Promise<Organization | null> {
    if (!supabase) throw new Error('Supabase not configured');

    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  // Create new organization (client)
  async create(org: { name: string; slug?: string; website?: string; industry?: string }): Promise<Organization> {
    if (!supabase) throw new Error('Supabase not configured');

    // Generate slug from name if not provided
    const slug = org.slug || org.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const { data, error } = await supabase
      .from('organizations')
      .insert({
        name: org.name,
        slug,
        website: org.website || null,
        industry: org.industry || null
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update organization
  async update(id: string, updates: Partial<Organization>): Promise<Organization> {
    if (!supabase) throw new Error('Supabase not configured');

    const { data, error } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete organization
  async delete(id: string): Promise<void> {
    if (!supabase) throw new Error('Supabase not configured');

    const { error } = await supabase
      .from('organizations')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};

export default supabase;
