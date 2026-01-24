-- Strategic Canvas Database Schema
-- Run this in your Supabase SQL Editor

-- ============================================
-- CANVAS BOARDS (Whiteboard/Mural Boards)
-- ============================================
CREATE TABLE IF NOT EXISTS canvas_boards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    
    -- Board state
    visual_nodes JSONB DEFAULT '[]',
    zoom DECIMAL(4, 2) DEFAULT 1.0,
    pan_x DECIMAL(10, 2) DEFAULT 0,
    pan_y DECIMAL(10, 2) DEFAULT 0,
    
    -- Metadata
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'template')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    template_id UUID REFERENCES canvas_boards(id) ON DELETE SET NULL,
    
    -- Ownership
    owner_id UUID,
    is_public BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_canvas_boards_organization ON canvas_boards(organization_id);
CREATE INDEX IF NOT EXISTS idx_canvas_boards_status ON canvas_boards(status);

-- ============================================
-- PROJECT NOTES (Rich Text Documents)
-- ============================================
CREATE TABLE IF NOT EXISTS project_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    icon VARCHAR(10) DEFAULT '📄',
    
    parent_id UUID REFERENCES project_notes(id) ON DELETE SET NULL,
    sort_order INTEGER DEFAULT 0,
    
    tags TEXT[] DEFAULT '{}',
    is_ai_generated BOOLEAN DEFAULT FALSE,
    source_board_id UUID REFERENCES canvas_boards(id) ON DELETE SET NULL,
    
    owner_id UUID,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_notes_organization ON project_notes(organization_id);
CREATE INDEX IF NOT EXISTS idx_project_notes_tags ON project_notes USING GIN(tags);

-- ============================================
-- NOTE-BOARD LINKS
-- ============================================
CREATE TABLE IF NOT EXISTS note_board_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID REFERENCES project_notes(id) ON DELETE CASCADE,
    board_id UUID REFERENCES canvas_boards(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(note_id, board_id)
);

-- ============================================
-- BOARD MAGIC LINKS
-- ============================================
CREATE TABLE IF NOT EXISTS board_magic_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID REFERENCES canvas_boards(id) ON DELETE CASCADE,
    token VARCHAR(64) UNIQUE NOT NULL,
    permission VARCHAR(50) DEFAULT 'view' CHECK (permission IN ('view', 'edit')),
    expires_at TIMESTAMP WITH TIME ZONE,
    max_uses INTEGER,
    use_count INTEGER DEFAULT 0,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_magic_links_token ON board_magic_links(token);

-- ============================================
-- BOARD HISTORY
-- ============================================
CREATE TABLE IF NOT EXISTS board_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID REFERENCES canvas_boards(id) ON DELETE CASCADE,
    visual_nodes JSONB NOT NULL,
    action VARCHAR(100) NOT NULL,
    user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_board_history_board ON board_history(board_id);

-- ============================================
-- ENABLE REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE canvas_boards;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE canvas_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_board_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_magic_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_history ENABLE ROW LEVEL SECURITY;

-- Allow public access for now (adjust for production)
CREATE POLICY "Allow all on canvas_boards" ON canvas_boards FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on project_notes" ON project_notes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on note_board_links" ON note_board_links FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on board_magic_links" ON board_magic_links FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on board_history" ON board_history FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- SEED TEMPLATES
-- ============================================
INSERT INTO canvas_boards (id, name, description, status, visual_nodes) VALUES
(
    'a0000000-0000-0000-0000-000000000001',
    'SWOT Analysis',
    'Strategic planning framework',
    'template',
    '[{"id":"f1","type":"frame","x":50,"y":70,"width":400,"height":350,"content":"💪 STRENGTHS","color":"#dcfce7"},{"id":"f2","type":"frame","x":470,"y":70,"width":400,"height":350,"content":"⚠️ WEAKNESSES","color":"#fef3c7"},{"id":"f3","type":"frame","x":50,"y":440,"width":400,"height":350,"content":"🚀 OPPORTUNITIES","color":"#dbeafe"},{"id":"f4","type":"frame","x":470,"y":440,"width":400,"height":350,"content":"⛔ THREATS","color":"#fce7f3"}]'::jsonb
),
(
    'a0000000-0000-0000-0000-000000000002',
    'Brainstorming',
    'Generate and organize ideas',
    'template',
    '[{"id":"f1","type":"frame","x":50,"y":70,"width":350,"height":550,"content":"💡 IDEAS","color":"#fef3c7"},{"id":"f2","type":"frame","x":420,"y":70,"width":350,"height":550,"content":"❓ QUESTIONS","color":"#f3e8ff"},{"id":"f3","type":"frame","x":790,"y":70,"width":350,"height":550,"content":"✅ ACTIONS","color":"#dcfce7"}]'::jsonb
),
(
    'a0000000-0000-0000-0000-000000000003',
    'Sprint Retrospective',
    'Team reflection',
    'template',
    '[{"id":"f1","type":"frame","x":50,"y":70,"width":350,"height":450,"content":"😊 WHAT WENT WELL","color":"#dcfce7"},{"id":"f2","type":"frame","x":420,"y":70,"width":350,"height":450,"content":"😟 CHALLENGES","color":"#fee2e2"},{"id":"f3","type":"frame","x":790,"y":70,"width":350,"height":450,"content":"💡 IMPROVEMENTS","color":"#dbeafe"}]'::jsonb
)
ON CONFLICT (id) DO NOTHING;
