-- Strategic Canvas Database Schema for Supabase
-- Run this in your Supabase SQL Editor
-- NOTE: If you have existing tables, you may need to drop them first or migrate data

-- Drop existing tables if they exist (CAUTION: This will delete existing data)
-- Uncomment the following lines if you need to recreate tables:
-- DROP TABLE IF EXISTS client_workspaces CASCADE;
-- DROP TABLE IF EXISTS board_history CASCADE;
-- DROP TABLE IF EXISTS board_magic_links CASCADE;
-- DROP TABLE IF EXISTS note_board_links CASCADE;
-- DROP TABLE IF EXISTS project_notes CASCADE;
-- DROP TABLE IF EXISTS canvas_boards CASCADE;

-- CANVAS BOARDS (using TEXT for id to support both UUIDs and short IDs)
CREATE TABLE IF NOT EXISTS canvas_boards (
    id TEXT PRIMARY KEY,
    organization_id TEXT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    visual_nodes JSONB DEFAULT '[]',
    zoom DECIMAL(4, 2) DEFAULT 1.0,
    pan_x DECIMAL(10, 2) DEFAULT 0,
    pan_y DECIMAL(10, 2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'template')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    template_id TEXT REFERENCES canvas_boards(id) ON DELETE SET NULL,
    owner_id TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    allow_anonymous_view BOOLEAN DEFAULT FALSE,
    allow_anonymous_edit BOOLEAN DEFAULT FALSE,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_canvas_boards_organization ON canvas_boards(organization_id);
CREATE INDEX IF NOT EXISTS idx_canvas_boards_status ON canvas_boards(status);

-- PROJECT NOTES
CREATE TABLE IF NOT EXISTS project_notes (
    id TEXT PRIMARY KEY,
    organization_id TEXT,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    icon VARCHAR(10) DEFAULT '📄',
    parent_id TEXT REFERENCES project_notes(id) ON DELETE SET NULL,
    sort_order INTEGER DEFAULT 0,
    tags TEXT[] DEFAULT '{}',
    is_ai_generated BOOLEAN DEFAULT FALSE,
    source_board_id TEXT REFERENCES canvas_boards(id) ON DELETE SET NULL,
    owner_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_notes_organization ON project_notes(organization_id);
CREATE INDEX IF NOT EXISTS idx_project_notes_tags ON project_notes USING GIN(tags);

-- NOTE-BOARD LINKS
CREATE TABLE IF NOT EXISTS note_board_links (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    note_id TEXT REFERENCES project_notes(id) ON DELETE CASCADE,
    board_id TEXT REFERENCES canvas_boards(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(note_id, board_id)
);

-- BOARD MAGIC LINKS (Share Links for Client Access)
CREATE TABLE IF NOT EXISTS board_magic_links (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    board_id TEXT REFERENCES canvas_boards(id) ON DELETE CASCADE,
    token VARCHAR(64) UNIQUE NOT NULL,
    permission VARCHAR(50) DEFAULT 'view' CHECK (permission IN ('view', 'comment', 'edit')),
    client_name TEXT,
    password_hash TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    max_uses INTEGER,
    use_count INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    last_viewed_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    company_branding JSONB DEFAULT '{}',
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_magic_links_token ON board_magic_links(token);
CREATE INDEX IF NOT EXISTS idx_magic_links_board ON board_magic_links(board_id);

-- BOARD HISTORY
CREATE TABLE IF NOT EXISTS board_history (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    board_id TEXT REFERENCES canvas_boards(id) ON DELETE CASCADE,
    visual_nodes JSONB NOT NULL,
    action VARCHAR(100) NOT NULL,
    user_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_board_history_board ON board_history(board_id);

-- CLIENT WORKSPACES
CREATE TABLE IF NOT EXISTS client_workspaces (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    organization_id TEXT UNIQUE NOT NULL,
    default_board_template_id TEXT REFERENCES canvas_boards(id) ON DELETE SET NULL,
    brand_color VARCHAR(7) DEFAULT '#6366f1',
    logo_url TEXT,
    boards_enabled BOOLEAN DEFAULT TRUE,
    notes_enabled BOOLEAN DEFAULT TRUE,
    collaboration_enabled BOOLEAN DEFAULT TRUE,
    ai_features_enabled BOOLEAN DEFAULT TRUE,
    max_boards INTEGER DEFAULT 100,
    max_notes INTEGER DEFAULT 1000,
    max_collaborators INTEGER DEFAULT 50,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ENABLE REALTIME
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE canvas_boards;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ROW LEVEL SECURITY
ALTER TABLE canvas_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_board_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_magic_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_workspaces ENABLE ROW LEVEL SECURITY;

-- Allow public access for development
DROP POLICY IF EXISTS "Allow all on canvas_boards" ON canvas_boards;
CREATE POLICY "Allow all on canvas_boards" ON canvas_boards FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on project_notes" ON project_notes;
CREATE POLICY "Allow all on project_notes" ON project_notes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on note_board_links" ON note_board_links;
CREATE POLICY "Allow all on note_board_links" ON note_board_links FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on board_magic_links" ON board_magic_links;
CREATE POLICY "Allow all on board_magic_links" ON board_magic_links FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on board_history" ON board_history;
CREATE POLICY "Allow all on board_history" ON board_history FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on client_workspaces" ON client_workspaces;
CREATE POLICY "Allow all on client_workspaces" ON client_workspaces FOR ALL USING (true) WITH CHECK (true);
