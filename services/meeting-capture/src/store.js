const jobs = new Map();
const meetingIndex = new Map();

export function createJob(job) {
  jobs.set(job.id, job);
  if (job.meetingId) {
    meetingIndex.set(job.meetingId, job.id);
  }
  return job;
}

export function updateJob(jobId, updates) {
  const current = jobs.get(jobId);
  if (!current) return null;
  const updated = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  jobs.set(jobId, updated);
  if (updated.meetingId) {
    meetingIndex.set(updated.meetingId, updated.id);
  }
  return updated;
}

export function getJob(jobId) {
  return jobs.get(jobId) || null;
}

export function listJobs() {
  return Array.from(jobs.values());
}

export function getJobByMeetingId(meetingId) {
  const jobId = meetingIndex.get(meetingId);
  if (!jobId) return null;
  return jobs.get(jobId) || null;
}

export function hydrateJobs(rawJobs = []) {
  jobs.clear();
  meetingIndex.clear();
  rawJobs.forEach((row) => {
    const job = {
      id: row.id,
      provider: row.provider,
      meetingUrl: row.meeting_url,
      meetingId: row.meeting_id,
      status: row.status,
      autoJoin: row.auto_join,
      scheduledStart: row.scheduled_start,
    providerDetails: row.provider_details,
    failureReason: row.failure_reason,
    recordingStatus: row.recording_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
    jobs.set(job.id, job);
    if (job.meetingId) {
      meetingIndex.set(job.meetingId, job.id);
    }
  });
}
