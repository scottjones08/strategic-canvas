import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function getSupabaseClient() {
  if (!supabaseUrl || !supabaseKey) {
    return null;
  }
  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });
}

export async function saveJob(job) {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data, error } = await client.from('meeting_capture_jobs').upsert({
    id: job.id,
    provider: job.provider,
    meeting_url: job.meetingUrl,
    meeting_id: job.meetingId,
    status: job.status,
    auto_join: job.autoJoin,
    scheduled_start: job.scheduledStart,
    provider_details: job.providerDetails || null,
    failure_reason: job.failureReason || null,
    recording_status: job.recordingStatus || null,
    transcript_id: job.transcriptId || null,
    created_at: job.createdAt,
    updated_at: job.updatedAt,
  }).select().single();
  if (error) {
    console.error('Supabase save error:', error.message);
    return null;
  }
  return data;
}

export async function fetchJobs() {
  const client = getSupabaseClient();
  if (!client) return [];
  const { data, error } = await client.from('meeting_capture_jobs').select('*').order('created_at', { ascending: false });
  if (error) {
    console.error('Supabase fetch error:', error.message);
    return [];
  }
  return data || [];
}

export async function fetchJobById(jobId) {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data, error } = await client.from('meeting_capture_jobs').select('*').eq('id', jobId).single();
  if (error) {
    console.error('Supabase fetch error:', error.message);
    return null;
  }
  return data;
}
