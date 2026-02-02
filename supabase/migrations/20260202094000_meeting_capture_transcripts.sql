-- Meeting capture transcripts storage

CREATE TABLE IF NOT EXISTS meeting_capture_transcripts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES meeting_capture_jobs(id) ON DELETE CASCADE,
  transcript JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meeting_capture_transcripts_job ON meeting_capture_transcripts(job_id);

ALTER TABLE meeting_capture_transcripts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "meeting_capture_transcripts_all" ON meeting_capture_transcripts
  FOR ALL USING (TRUE) WITH CHECK (TRUE);
