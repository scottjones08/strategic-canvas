// meeting-capture.ts - Local scheduling + provider detection for capture jobs

export type MeetingProvider = 'zoom' | 'teams' | 'meet' | 'unknown';

export interface MeetingCaptureJob {
  id: string;
  provider: MeetingProvider;
  meetingUrl: string;
  scheduledStart?: string; // ISO string
  status: 'scheduled' | 'queued' | 'in_progress' | 'completed' | 'failed' | 'canceled';
  autoJoin: boolean;
  createdAt: string;
  updatedAt: string;
}

const CAPTURE_JOBS_KEY = 'strategic-canvas-capture-jobs';

export function detectMeetingProvider(url: string): MeetingProvider {
  const lower = url.toLowerCase();
  if (lower.includes('zoom.us') || lower.includes('zoomgov.com')) return 'zoom';
  if (lower.includes('teams.microsoft.com') || lower.includes('meetup-join')) return 'teams';
  if (lower.includes('meet.google.com')) return 'meet';
  return 'unknown';
}

export function loadCaptureJobs(): MeetingCaptureJob[] {
  try {
    const raw = localStorage.getItem(CAPTURE_JOBS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCaptureJobs(jobs: MeetingCaptureJob[]): void {
  localStorage.setItem(CAPTURE_JOBS_KEY, JSON.stringify(jobs));
}

export function createCaptureJob(input: {
  meetingUrl: string;
  scheduledStart?: string;
  autoJoin: boolean;
}): MeetingCaptureJob {
  const now = new Date().toISOString();
  const provider = detectMeetingProvider(input.meetingUrl);
  const job: MeetingCaptureJob = {
    id: crypto.randomUUID(),
    provider,
    meetingUrl: input.meetingUrl,
    scheduledStart: input.scheduledStart,
    status: 'scheduled',
    autoJoin: input.autoJoin,
    createdAt: now,
    updatedAt: now,
  };
  const jobs = loadCaptureJobs();
  const updated = [job, ...jobs];
  saveCaptureJobs(updated);
  return job;
}

export function updateCaptureJob(jobId: string, updates: Partial<MeetingCaptureJob>): MeetingCaptureJob | null {
  const jobs = loadCaptureJobs();
  const index = jobs.findIndex((job) => job.id === jobId);
  if (index === -1) return null;
  const updatedJob = {
    ...jobs[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  } as MeetingCaptureJob;
  const updated = [...jobs];
  updated[index] = updatedJob;
  saveCaptureJobs(updated);
  return updatedJob;
}

export function removeCaptureJob(jobId: string): void {
  const jobs = loadCaptureJobs().filter((job) => job.id !== jobId);
  saveCaptureJobs(jobs);
}

export function getUpcomingCaptureJobs(now: Date = new Date()): MeetingCaptureJob[] {
  const jobs = loadCaptureJobs();
  return jobs
    .filter((job) => job.status !== 'canceled')
    .sort((a, b) => {
      const aTime = a.scheduledStart ? new Date(a.scheduledStart).getTime() : 0;
      const bTime = b.scheduledStart ? new Date(b.scheduledStart).getTime() : 0;
      return bTime - aTime;
    })
    .filter((job) => {
      if (!job.scheduledStart) return true;
      return new Date(job.scheduledStart).getTime() >= now.getTime() - 24 * 60 * 60 * 1000;
    });
}
