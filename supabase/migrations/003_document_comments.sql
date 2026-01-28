-- Document Comments Table
-- Supports threaded comments on documents with position and selection info

CREATE TABLE IF NOT EXISTS document_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES client_documents(id) ON DELETE CASCADE NOT NULL,
  
  -- Position on page
  page_number INTEGER NOT NULL DEFAULT 1,
  position_x FLOAT,
  position_y FLOAT,
  
  -- Text selection (for text-based comments)
  selection_start INTEGER,
  selection_end INTEGER,
  selected_text TEXT,
  
  -- Comment content
  content TEXT NOT NULL,
  
  -- Author info
  author_name TEXT,
  author_email TEXT,
  author_id UUID,
  
  -- Threading
  parent_id UUID REFERENCES document_comments(id) ON DELETE CASCADE,
  thread_id UUID, -- ID of the root comment in the thread
  
  -- Resolution status
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  
  -- Reactions (JSONB for flexibility)
  reactions JSONB DEFAULT '[]'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_document_comments_document ON document_comments(document_id);
CREATE INDEX IF NOT EXISTS idx_document_comments_parent ON document_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_document_comments_thread ON document_comments(thread_id);
CREATE INDEX IF NOT EXISTS idx_document_comments_resolved ON document_comments(resolved);

-- RLS
ALTER TABLE document_comments ENABLE ROW LEVEL SECURITY;

-- Permissive policy for now
CREATE POLICY "document_comments_all" ON document_comments
  FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- Updated at trigger
DROP TRIGGER IF EXISTS document_comments_updated_at ON document_comments;
CREATE TRIGGER document_comments_updated_at
  BEFORE UPDATE ON document_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE document_comments;


-- ============================================
-- CANVAS BOARDS TABLE (matches code references)
-- ============================================

CREATE TABLE IF NOT EXISTS canvas_boards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  owner_id TEXT NOT NULL DEFAULT '',
  is_public BOOLEAN DEFAULT FALSE,
  template_id TEXT,
  
  -- Visual state
  visual_nodes JSONB DEFAULT '[]'::jsonb,
  zoom FLOAT DEFAULT 1,
  pan_x FLOAT DEFAULT 0,
  pan_y FLOAT DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'active',
  progress INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_canvas_boards_owner ON canvas_boards(owner_id);
CREATE INDEX IF NOT EXISTS idx_canvas_boards_org ON canvas_boards(organization_id);
CREATE INDEX IF NOT EXISTS idx_canvas_boards_status ON canvas_boards(status);

-- RLS
ALTER TABLE canvas_boards ENABLE ROW LEVEL SECURITY;

-- Permissive policy for now
CREATE POLICY "canvas_boards_all" ON canvas_boards
  FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- Updated at trigger
DROP TRIGGER IF EXISTS canvas_boards_updated_at ON canvas_boards;
CREATE TRIGGER canvas_boards_updated_at
  BEFORE UPDATE ON canvas_boards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE canvas_boards;


-- ============================================
-- DOCUMENT MAGIC LINKS TABLE (for sharing)
-- ============================================

CREATE TABLE IF NOT EXISTS document_magic_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES client_documents(id) ON DELETE CASCADE NOT NULL,
  
  token TEXT UNIQUE NOT NULL,
  permission TEXT DEFAULT 'view', -- 'view', 'comment', 'edit'
  client_name TEXT,
  
  expires_at TIMESTAMPTZ,
  max_uses INTEGER,
  use_count INTEGER DEFAULT 0,
  
  is_active BOOLEAN DEFAULT TRUE,
  company_branding JSONB DEFAULT '{}'::jsonb,
  
  views INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_document_magic_links_token ON document_magic_links(token);
CREATE INDEX IF NOT EXISTS idx_document_magic_links_document ON document_magic_links(document_id);
CREATE INDEX IF NOT EXISTS idx_document_magic_links_active ON document_magic_links(is_active);

-- RLS
ALTER TABLE document_magic_links ENABLE ROW LEVEL SECURITY;

-- Permissive policy for now
CREATE POLICY "document_magic_links_all" ON document_magic_links
  FOR ALL USING (TRUE) WITH CHECK (TRUE);
