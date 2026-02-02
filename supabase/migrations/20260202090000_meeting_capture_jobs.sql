-- Meeting capture jobs storage

CREATE TABLE IF NOT EXISTS meeting_capture_jobs (
  id UUID PRIMARY KEY,
  provider TEXT NOT NULL,
  meeting_url TEXT NOT NULL,
  meeting_id TEXT,
  status TEXT NOT NULL,
  auto_join BOOLEAN DEFAULT true,
  scheduled_start TIMESTAMPTZ,
  provider_details JSONB DEFAULT '{}'::jsonb,
  failure_reason TEXT,
  recording_status TEXT,
  transcript_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meeting_capture_jobs_provider ON meeting_capture_jobs(provider);
CREATE INDEX IF NOT EXISTS idx_meeting_capture_jobs_status ON meeting_capture_jobs(status);
CREATE INDEX IF NOT EXISTS idx_meeting_capture_jobs_meeting_id ON meeting_capture_jobs(meeting_id);

ALTER TABLE meeting_capture_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "meeting_capture_jobs_all" ON meeting_capture_jobs
  FOR ALL USING (TRUE) WITH CHECK (TRUE);
