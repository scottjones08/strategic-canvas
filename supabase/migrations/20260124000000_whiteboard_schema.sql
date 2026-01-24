-- Whiteboard/Canvas Schema for Fan Workshop
-- Extends fan_consulting database with whiteboard functionality

-- Boards table
CREATE TABLE IF NOT EXISTS boards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  owner_id UUID NOT NULL,
  is_public BOOLEAN DEFAULT FALSE,
  template_id TEXT,
  view_state JSONB DEFAULT '{"zoom": 1, "panX": 0, "panY": 0}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Nodes table (sticky notes, shapes, etc.)
CREATE TABLE IF NOT EXISTS nodes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL DEFAULT 'sticky',
  x FLOAT NOT NULL DEFAULT 0,
  y FLOAT NOT NULL DEFAULT 0,
  width FLOAT DEFAULT 200,
  height FLOAT DEFAULT 150,
  content TEXT,
  color TEXT DEFAULT '#fef3c7',
  text_color TEXT DEFAULT '#92400e',
  rotation FLOAT DEFAULT 0,
  locked BOOLEAN DEFAULT FALSE,
  votes INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

-- Notes table (Notion-style pages)
CREATE TABLE IF NOT EXISTS notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'Untitled',
  content TEXT,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  board_id UUID REFERENCES boards(id) ON DELETE SET NULL,
  owner_id UUID NOT NULL,
  is_public BOOLEAN DEFAULT FALSE,
  icon TEXT,
  cover_image TEXT,
  parent_id UUID REFERENCES notes(id) ON DELETE SET NULL,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Boards policies
CREATE POLICY "Users can view their own boards" ON boards
  FOR SELECT USING (owner_id = auth.uid() OR is_public = TRUE OR organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can create boards" ON boards
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own boards" ON boards
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Users can delete their own boards" ON boards
  FOR DELETE USING (owner_id = auth.uid());

-- Nodes policies
CREATE POLICY "Users can view nodes on accessible boards" ON nodes
  FOR SELECT USING (board_id IN (
    SELECT id FROM boards WHERE owner_id = auth.uid() OR is_public = TRUE
  ));

CREATE POLICY "Users can manage nodes on their boards" ON nodes
  FOR ALL USING (board_id IN (
    SELECT id FROM boards WHERE owner_id = auth.uid()
  ));

-- Notes policies
CREATE POLICY "Users can view their own notes" ON notes
  FOR SELECT USING (owner_id = auth.uid() OR is_public = TRUE);

CREATE POLICY "Users can create notes" ON notes
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own notes" ON notes
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Users can delete their own notes" ON notes
  FOR DELETE USING (owner_id = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_boards_owner ON boards(owner_id);
CREATE INDEX IF NOT EXISTS idx_boards_org ON boards(organization_id);
CREATE INDEX IF NOT EXISTS idx_nodes_board ON nodes(board_id);
CREATE INDEX IF NOT EXISTS idx_notes_owner ON notes(owner_id);
CREATE INDEX IF NOT EXISTS idx_notes_parent ON notes(parent_id);
CREATE INDEX IF NOT EXISTS idx_notes_board ON notes(board_id);

-- Updated at triggers
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS boards_updated_at ON boards;
CREATE TRIGGER boards_updated_at
  BEFORE UPDATE ON boards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS nodes_updated_at ON nodes;
CREATE TRIGGER nodes_updated_at
  BEFORE UPDATE ON nodes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS notes_updated_at ON notes;
CREATE TRIGGER notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Enable realtime for collaborative editing
ALTER PUBLICATION supabase_realtime ADD TABLE boards;
ALTER PUBLICATION supabase_realtime ADD TABLE nodes;
ALTER PUBLICATION supabase_realtime ADD TABLE notes;
