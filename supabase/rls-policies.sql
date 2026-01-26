-- =============================================
-- Row Level Security (RLS) Policies for Fan Canvas
-- Matches fan_consulting's security model
-- =============================================

-- Enable RLS on all tables
ALTER TABLE IF EXISTS canvas_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS canvas_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS canvas_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS canvas_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS canvas_action_items ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Helper Functions (same as fan_consulting)
-- =============================================

-- Check if user is a Fan Works team member
CREATE OR REPLACE FUNCTION is_fan_works_team()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND is_fan_works_team = TRUE
    AND is_active = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's organization ID
CREATE OR REPLACE FUNCTION get_user_organization()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT organization_id FROM users
    WHERE id = auth.uid()
    AND is_active = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is active
CREATE OR REPLACE FUNCTION is_active_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND is_active = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Canvas Boards Table
-- =============================================

-- Create table if not exists
CREATE TABLE IF NOT EXISTS canvas_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  client_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  visual_nodes JSONB DEFAULT '[]',
  zoom DECIMAL DEFAULT 1,
  pan_x DECIMAL DEFAULT 0,
  pan_y DECIMAL DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  progress INTEGER DEFAULT 0,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  upload_bucket_id TEXT,
  linked_note_ids UUID[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drop existing policies
DROP POLICY IF EXISTS "canvas_boards_fan_works_team" ON canvas_boards;
DROP POLICY IF EXISTS "canvas_boards_owner" ON canvas_boards;
DROP POLICY IF EXISTS "canvas_boards_organization" ON canvas_boards;

-- Fan Works team can see and manage all boards
CREATE POLICY "canvas_boards_fan_works_team" ON canvas_boards
  FOR ALL USING (is_fan_works_team());

-- Users can see and manage their own boards
CREATE POLICY "canvas_boards_owner" ON canvas_boards
  FOR ALL USING (
    owner_id = auth.uid()
    AND is_active_user()
  );

-- Organization members can view boards for their organization
CREATE POLICY "canvas_boards_organization" ON canvas_boards
  FOR SELECT USING (
    organization_id = get_user_organization()
    AND is_active_user()
  );

-- =============================================
-- Canvas Notes Table
-- =============================================

CREATE TABLE IF NOT EXISTS canvas_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES canvas_boards(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT,
  action_items TEXT[],
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drop existing policies
DROP POLICY IF EXISTS "canvas_notes_fan_works_team" ON canvas_notes;
DROP POLICY IF EXISTS "canvas_notes_owner" ON canvas_notes;
DROP POLICY IF EXISTS "canvas_notes_organization" ON canvas_notes;

-- Fan Works team can see and manage all notes
CREATE POLICY "canvas_notes_fan_works_team" ON canvas_notes
  FOR ALL USING (is_fan_works_team());

-- Users can see and manage their own notes
CREATE POLICY "canvas_notes_owner" ON canvas_notes
  FOR ALL USING (
    owner_id = auth.uid()
    AND is_active_user()
  );

-- Organization members can view notes for their organization
CREATE POLICY "canvas_notes_organization" ON canvas_notes
  FOR SELECT USING (
    organization_id = get_user_organization()
    AND is_active_user()
  );

-- =============================================
-- Canvas Clients Table (Organizations visible to canvas)
-- =============================================

CREATE TABLE IF NOT EXISTS canvas_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  phone TEXT,
  color TEXT DEFAULT '#6366f1',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'prospect', 'inactive')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drop existing policies
DROP POLICY IF EXISTS "canvas_clients_fan_works_team" ON canvas_clients;
DROP POLICY IF EXISTS "canvas_clients_organization" ON canvas_clients;

-- Fan Works team can see and manage all clients
CREATE POLICY "canvas_clients_fan_works_team" ON canvas_clients
  FOR ALL USING (is_fan_works_team());

-- Organization members can view their own clients
CREATE POLICY "canvas_clients_organization" ON canvas_clients
  FOR SELECT USING (
    organization_id = get_user_organization()
    AND is_active_user()
  );

-- =============================================
-- Canvas Transcripts Table
-- =============================================

CREATE TABLE IF NOT EXISTS canvas_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES canvas_boards(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  title TEXT,
  segments JSONB DEFAULT '[]',
  speakers JSONB DEFAULT '[]',
  duration INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drop existing policies
DROP POLICY IF EXISTS "canvas_transcripts_fan_works_team" ON canvas_transcripts;
DROP POLICY IF EXISTS "canvas_transcripts_owner" ON canvas_transcripts;
DROP POLICY IF EXISTS "canvas_transcripts_organization" ON canvas_transcripts;

-- Fan Works team can see and manage all transcripts
CREATE POLICY "canvas_transcripts_fan_works_team" ON canvas_transcripts
  FOR ALL USING (is_fan_works_team());

-- Users can see and manage their own transcripts
CREATE POLICY "canvas_transcripts_owner" ON canvas_transcripts
  FOR ALL USING (
    owner_id = auth.uid()
    AND is_active_user()
  );

-- Organization members can view transcripts for their organization
CREATE POLICY "canvas_transcripts_organization" ON canvas_transcripts
  FOR SELECT USING (
    organization_id = get_user_organization()
    AND is_active_user()
  );

-- =============================================
-- Canvas Action Items Table
-- =============================================

CREATE TABLE IF NOT EXISTS canvas_action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES canvas_boards(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  is_complete BOOLEAN DEFAULT FALSE,
  assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drop existing policies
DROP POLICY IF EXISTS "canvas_action_items_fan_works_team" ON canvas_action_items;
DROP POLICY IF EXISTS "canvas_action_items_owner" ON canvas_action_items;
DROP POLICY IF EXISTS "canvas_action_items_assignee" ON canvas_action_items;
DROP POLICY IF EXISTS "canvas_action_items_organization" ON canvas_action_items;

-- Fan Works team can see and manage all action items
CREATE POLICY "canvas_action_items_fan_works_team" ON canvas_action_items
  FOR ALL USING (is_fan_works_team());

-- Users can see and manage action items they created
CREATE POLICY "canvas_action_items_owner" ON canvas_action_items
  FOR ALL USING (
    owner_id = auth.uid()
    AND is_active_user()
  );

-- Users can view and update action items assigned to them
CREATE POLICY "canvas_action_items_assignee" ON canvas_action_items
  FOR ALL USING (
    assignee_id = auth.uid()
    AND is_active_user()
  );

-- Organization members can view action items for their organization
CREATE POLICY "canvas_action_items_organization" ON canvas_action_items
  FOR SELECT USING (
    organization_id = get_user_organization()
    AND is_active_user()
  );

-- =============================================
-- Board Collaborators Table (for sharing)
-- =============================================

CREATE TABLE IF NOT EXISTS canvas_board_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES canvas_boards(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'viewer' CHECK (role IN ('owner', 'editor', 'viewer')),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(board_id, user_id)
);

-- Enable RLS
ALTER TABLE canvas_board_collaborators ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "canvas_board_collaborators_fan_works_team" ON canvas_board_collaborators;
DROP POLICY IF EXISTS "canvas_board_collaborators_self" ON canvas_board_collaborators;
DROP POLICY IF EXISTS "canvas_board_collaborators_board_owner" ON canvas_board_collaborators;

-- Fan Works team can manage all collaborators
CREATE POLICY "canvas_board_collaborators_fan_works_team" ON canvas_board_collaborators
  FOR ALL USING (is_fan_works_team());

-- Users can see their own collaborations
CREATE POLICY "canvas_board_collaborators_self" ON canvas_board_collaborators
  FOR SELECT USING (
    user_id = auth.uid()
    AND is_active_user()
  );

-- Board owners can manage collaborators
CREATE POLICY "canvas_board_collaborators_board_owner" ON canvas_board_collaborators
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM canvas_boards
      WHERE id = canvas_board_collaborators.board_id
      AND owner_id = auth.uid()
    )
    AND is_active_user()
  );

-- =============================================
-- Client Portal Access Table
-- =============================================

CREATE TABLE IF NOT EXISTS canvas_client_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES canvas_boards(id) ON DELETE CASCADE,
  client_id UUID REFERENCES canvas_clients(id) ON DELETE CASCADE,
  access_token TEXT UNIQUE NOT NULL,
  permissions JSONB DEFAULT '{"view": true, "comment": true, "annotate": false}',
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE canvas_client_access ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "canvas_client_access_fan_works_team" ON canvas_client_access;
DROP POLICY IF EXISTS "canvas_client_access_board_owner" ON canvas_client_access;
DROP POLICY IF EXISTS "canvas_client_access_token" ON canvas_client_access;

-- Fan Works team can manage all client access
CREATE POLICY "canvas_client_access_fan_works_team" ON canvas_client_access
  FOR ALL USING (is_fan_works_team());

-- Board owners can manage client access
CREATE POLICY "canvas_client_access_board_owner" ON canvas_client_access
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM canvas_boards
      WHERE id = canvas_client_access.board_id
      AND owner_id = auth.uid()
    )
    AND is_active_user()
  );

-- Public access via token (for client portal)
CREATE POLICY "canvas_client_access_token" ON canvas_client_access
  FOR SELECT USING (
    is_active = TRUE
    AND (expires_at IS NULL OR expires_at > NOW())
  );

-- =============================================
-- Activity Logs Table
-- =============================================

CREATE TABLE IF NOT EXISTS canvas_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  board_id UUID REFERENCES canvas_boards(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE canvas_activity_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "canvas_activity_logs_fan_works_team" ON canvas_activity_logs;
DROP POLICY IF EXISTS "canvas_activity_logs_own" ON canvas_activity_logs;

-- Fan Works team can see all activity
CREATE POLICY "canvas_activity_logs_fan_works_team" ON canvas_activity_logs
  FOR SELECT USING (is_fan_works_team());

-- Users can see their own activity
CREATE POLICY "canvas_activity_logs_own" ON canvas_activity_logs
  FOR SELECT USING (
    user_id = auth.uid()
    AND is_active_user()
  );

-- Anyone can insert activity (for logging)
CREATE POLICY "canvas_activity_logs_insert" ON canvas_activity_logs
  FOR INSERT WITH CHECK (TRUE);

-- =============================================
-- Indexes for Performance
-- =============================================

CREATE INDEX IF NOT EXISTS idx_canvas_boards_owner_id ON canvas_boards(owner_id);
CREATE INDEX IF NOT EXISTS idx_canvas_boards_organization_id ON canvas_boards(organization_id);
CREATE INDEX IF NOT EXISTS idx_canvas_boards_client_id ON canvas_boards(client_id);
CREATE INDEX IF NOT EXISTS idx_canvas_boards_status ON canvas_boards(status);

CREATE INDEX IF NOT EXISTS idx_canvas_notes_board_id ON canvas_notes(board_id);
CREATE INDEX IF NOT EXISTS idx_canvas_notes_owner_id ON canvas_notes(owner_id);
CREATE INDEX IF NOT EXISTS idx_canvas_notes_organization_id ON canvas_notes(organization_id);

CREATE INDEX IF NOT EXISTS idx_canvas_transcripts_board_id ON canvas_transcripts(board_id);
CREATE INDEX IF NOT EXISTS idx_canvas_transcripts_owner_id ON canvas_transcripts(owner_id);

CREATE INDEX IF NOT EXISTS idx_canvas_action_items_board_id ON canvas_action_items(board_id);
CREATE INDEX IF NOT EXISTS idx_canvas_action_items_assignee_id ON canvas_action_items(assignee_id);

CREATE INDEX IF NOT EXISTS idx_canvas_board_collaborators_board_id ON canvas_board_collaborators(board_id);
CREATE INDEX IF NOT EXISTS idx_canvas_board_collaborators_user_id ON canvas_board_collaborators(user_id);

CREATE INDEX IF NOT EXISTS idx_canvas_client_access_board_id ON canvas_client_access(board_id);
CREATE INDEX IF NOT EXISTS idx_canvas_client_access_token ON canvas_client_access(access_token);

CREATE INDEX IF NOT EXISTS idx_canvas_activity_logs_user_id ON canvas_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_canvas_activity_logs_board_id ON canvas_activity_logs(board_id);
CREATE INDEX IF NOT EXISTS idx_canvas_activity_logs_created_at ON canvas_activity_logs(created_at);

-- =============================================
-- Updated At Trigger
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
DROP TRIGGER IF EXISTS update_canvas_boards_updated_at ON canvas_boards;
CREATE TRIGGER update_canvas_boards_updated_at
    BEFORE UPDATE ON canvas_boards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_canvas_notes_updated_at ON canvas_notes;
CREATE TRIGGER update_canvas_notes_updated_at
    BEFORE UPDATE ON canvas_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_canvas_clients_updated_at ON canvas_clients;
CREATE TRIGGER update_canvas_clients_updated_at
    BEFORE UPDATE ON canvas_clients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_canvas_action_items_updated_at ON canvas_action_items;
CREATE TRIGGER update_canvas_action_items_updated_at
    BEFORE UPDATE ON canvas_action_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- Grant Permissions
-- =============================================

-- Grant usage on schema to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant select, insert, update, delete on all canvas tables
GRANT SELECT, INSERT, UPDATE, DELETE ON canvas_boards TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON canvas_notes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON canvas_clients TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON canvas_transcripts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON canvas_action_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON canvas_board_collaborators TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON canvas_client_access TO authenticated;
GRANT SELECT, INSERT ON canvas_activity_logs TO authenticated;

-- Grant anonymous access for client portal (via token)
GRANT SELECT ON canvas_client_access TO anon;
GRANT SELECT ON canvas_boards TO anon;
