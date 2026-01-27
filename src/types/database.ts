// Database types for Supabase (matching fan_consulting schema)
export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          logo_url: string | null;
          website: string | null;
          industry: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          logo_url?: string | null;
          website?: string | null;
          industry?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          logo_url?: string | null;
          website?: string | null;
          industry?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      boards: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          organization_id: string | null;
          owner_id: string;
          is_public: boolean;
          template_id: string | null;
          view_state: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          organization_id?: string | null;
          owner_id: string;
          is_public?: boolean;
          template_id?: string | null;
          view_state?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          organization_id?: string | null;
          owner_id?: string;
          is_public?: boolean;
          template_id?: string | null;
          view_state?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
      };
      nodes: {
        Row: {
          id: string;
          board_id: string;
          type: string;
          x: number;
          y: number;
          width: number;
          height: number;
          content: string | null;
          color: string;
          text_color: string | null;
          rotation: number;
          locked: boolean;
          votes: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          metadata: Record<string, unknown> | null;
        };
        Insert: {
          id?: string;
          board_id: string;
          type: string;
          x: number;
          y: number;
          width?: number;
          height?: number;
          content?: string | null;
          color?: string;
          text_color?: string | null;
          rotation?: number;
          locked?: boolean;
          votes?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          metadata?: Record<string, unknown> | null;
        };
        Update: {
          id?: string;
          board_id?: string;
          type?: string;
          x?: number;
          y?: number;
          width?: number;
          height?: number;
          content?: string | null;
          color?: string;
          text_color?: string | null;
          rotation?: number;
          locked?: boolean;
          votes?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          metadata?: Record<string, unknown> | null;
        };
      };
      notes: {
        Row: {
          id: string;
          title: string;
          content: string | null;
          organization_id: string | null;
          board_id: string | null;
          client_id: string | null;
          owner_id: string;
          is_public: boolean;
          icon: string | null;
          cover_image: string | null;
          parent_id: string | null;
          order_index: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          content?: string | null;
          organization_id?: string | null;
          board_id?: string | null;
          client_id?: string | null;
          owner_id: string;
          is_public?: boolean;
          icon?: string | null;
          cover_image?: string | null;
          parent_id?: string | null;
          order_index?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          content?: string | null;
          organization_id?: string | null;
          board_id?: string | null;
          client_id?: string | null;
          owner_id?: string;
          is_public?: boolean;
          icon?: string | null;
          cover_image?: string | null;
          parent_id?: string | null;
          order_index?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      client_activities: {
        Row: {
          id: string;
          organization_id: string;
          activity_type: string;
          title: string;
          description: string | null;
          scheduled_at: string | null;
          completed_at: string | null;
          created_by: string | null;
          metadata: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          activity_type: string;
          title: string;
          description?: string | null;
          scheduled_at?: string | null;
          completed_at?: string | null;
          created_by?: string | null;
          metadata?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          activity_type?: string;
          title?: string;
          description?: string | null;
          scheduled_at?: string | null;
          completed_at?: string | null;
          created_by?: string | null;
          metadata?: Record<string, unknown> | null;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

// Simplified types for use in components
export type Organization = Database['public']['Tables']['organizations']['Row'];
export type Board = Database['public']['Tables']['boards']['Row'];
export type Node = Database['public']['Tables']['nodes']['Row'];
export type Note = Database['public']['Tables']['notes']['Row'];
export type ClientActivity = Database['public']['Tables']['client_activities']['Row'];
