-- History tables for boards, documents, and collaboration events

-- ============================================================================
-- BOARD HISTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS board_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE NOT NULL,
  nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  action TEXT NOT NULL DEFAULT 'Update',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_board_history_board ON board_history(board_id);
CREATE INDEX IF NOT EXISTS idx_board_history_created_at ON board_history(created_at);

ALTER TABLE board_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "board_history_all" ON board_history
  FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- ============================================================================
-- DOCUMENT HISTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS document_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES client_documents(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_history_doc ON document_history(document_id);
CREATE INDEX IF NOT EXISTS idx_document_history_org ON document_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_document_history_client ON document_history(client_id);
CREATE INDEX IF NOT EXISTS idx_document_history_created_at ON document_history(created_at);

ALTER TABLE document_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "document_history_all" ON document_history
  FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- ============================================================================
-- COLLABORATION EVENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS collaboration_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE NOT NULL,
  user_id TEXT,
  user_name TEXT,
  event_type TEXT NOT NULL,
  node_id TEXT,
  node_name TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_collaboration_events_board ON collaboration_events(board_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_events_created_at ON collaboration_events(created_at);
CREATE INDEX IF NOT EXISTS idx_collaboration_events_type ON collaboration_events(event_type);

ALTER TABLE collaboration_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "collaboration_events_all" ON collaboration_events
  FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- ============================================================================
-- REALTIME
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE board_history;
ALTER PUBLICATION supabase_realtime ADD TABLE document_history;
ALTER PUBLICATION supabase_realtime ADD TABLE collaboration_events;
