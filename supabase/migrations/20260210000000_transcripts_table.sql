-- Transcripts table for saving meeting transcripts as drafts
CREATE TABLE IF NOT EXISTS transcripts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'Untitled Transcript',
  content TEXT DEFAULT '',
  segments JSONB DEFAULT '[]'::jsonb,
  speakers JSONB DEFAULT '[]'::jsonb,
  duration INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'final')),
  action_items JSONB DEFAULT '[]'::jsonb,
  board_id TEXT REFERENCES canvas_boards(id) ON DELETE SET NULL,
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transcripts_user ON transcripts(user_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_board ON transcripts(board_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_status ON transcripts(status);
CREATE INDEX IF NOT EXISTS idx_transcripts_created ON transcripts(created_at DESC);

ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transcripts_all" ON transcripts
  FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_transcripts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transcripts_updated_at
  BEFORE UPDATE ON transcripts
  FOR EACH ROW
  EXECUTE FUNCTION update_transcripts_updated_at();
