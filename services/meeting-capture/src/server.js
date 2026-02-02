import express from 'express';
import morgan from 'morgan';
import { createJob, getJob, getJobByMeetingId, listJobs, updateJob, hydrateJobs } from './store.js';
import { startZoomCapture } from './providers/zoom.js';
import { startTeamsCapture } from './providers/teams.js';
import { startMeetCapture } from './providers/meet.js';
import { fetchJobById, fetchJobs, saveJob } from './db.js';
import { buildZoomChallengeResponse, verifyZoomWebhook } from './webhooks/zoom-verify.js';
import { runTranscriptionPipeline } from './transcription/index.js';
import { getRecording, readRecording, startRecordingForJob, stopRecording } from './recording/index.js';

const app = express();
const port = process.env.PORT || 8787;

app.use(morgan('tiny'));
app.use(express.json({
  limit: '8mb',
  verify: (req, _res, buf) => {
    req.rawBody = buf.toString();
  },
}));

function parseZoomMeetingId(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split('/').filter(Boolean);
    const meetingId = segments.find((segment) => /^[0-9]{9,11}$/.test(segment));
    return meetingId || null;
  } catch {
    return null;
  }
}

app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/capture/jobs', (_req, res) => {
  res.json({ jobs: listJobs() });
});

app.get('/capture/jobs/:id', (req, res) => {
  const job = getJob(req.params.id);
  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }
  res.json({ job });
});

app.post('/capture/start', async (req, res) => {
  const { jobId, meetingUrl, provider, scheduledStart, autoJoin } = req.body || {};

  if (!jobId || !meetingUrl || !provider) {
    res.status(400).json({ error: 'Missing jobId, meetingUrl, or provider.' });
    return;
  }

  const now = new Date().toISOString();
  const job = createJob({
    id: jobId,
    provider,
    meetingUrl,
    meetingId: provider === 'zoom' ? parseZoomMeetingId(meetingUrl) : null,
    scheduledStart: scheduledStart || null,
    autoJoin: Boolean(autoJoin),
    status: 'queued',
    createdAt: now,
    updatedAt: now,
  });
  await saveJob(job);
  await saveJob(job);

  let result;
  try {
    if (provider === 'zoom') {
      result = await startZoomCapture(job);
    } else if (provider === 'teams') {
      result = await startTeamsCapture(job);
    } else if (provider === 'meet') {
      result = await startMeetCapture(job);
    } else {
      result = { status: 'failed', reason: 'Unsupported provider' };
    }
  } catch (error) {
    result = { status: 'failed', reason: error?.message || 'Provider error' };
  }

  updateJob(jobId, {
    status: result.status || 'queued',
    providerDetails: result.details || null,
    failureReason: result.reason || null,
  });
  const updated = getJob(jobId);
  if (updated) await saveJob(updated);

  if (process.env.CAPTURE_AUTO_RECORD === 'true' && updated?.status === 'in_progress') {
    try {
      await startRecordingForJob(updated);
      updateJob(jobId, { recordingStatus: 'recording' });
      const saved = getJob(jobId);
      if (saved) await saveJob(saved);
    } catch (error) {
      updateJob(jobId, { recordingStatus: 'failed', failureReason: error?.message || 'Recording error' });
      const saved = getJob(jobId);
      if (saved) await saveJob(saved);
    }
  }

  res.status(result.status === 'failed' ? 500 : 202).json({
    jobId,
    status: result.status,
    reason: result.reason || null,
  });
});

app.post('/capture/audio', async (req, res) => {
  const { jobId } = req.query;
  if (!jobId) {
    res.status(400).json({ error: 'Missing jobId' });
    return;
  }
  const audioBase64 = req.body?.audio;
  if (!audioBase64 || typeof audioBase64 !== 'string') {
    res.status(400).json({ error: 'Missing audio buffer' });
    return;
  }
  const buffer = Buffer.from(audioBase64, 'base64');
  if (!buffer.length) {
    res.status(400).json({ error: 'Missing audio buffer' });
    return;
  }

  try {
    const transcript = await runTranscriptionPipeline({ audioBuffer: buffer, jobId });
    updateJob(jobId, { status: 'completed', transcriptId: transcript.id });
    const updated = getJob(jobId);
    if (updated) await saveJob(updated);
    res.json({ status: 'ok', transcriptId: transcript.id });
  } catch (error) {
    updateJob(jobId, { status: 'failed', failureReason: error?.message || 'Transcription error' });
    const updated = getJob(jobId);
    if (updated) await saveJob(updated);
    res.status(500).json({ error: error?.message || 'Transcription error' });
  }
});

app.post('/capture/stop', async (req, res) => {
  const { jobId } = req.body || {};
  if (!jobId) {
    res.status(400).json({ error: 'Missing jobId' });
    return;
  }
  const outputPath = await stopRecording(jobId);
  if (!outputPath) {
    res.status(404).json({ error: 'No active recording' });
    return;
  }

  try {
    const recording = await readRecording(jobId);
    if (!recording) {
      res.status(500).json({ error: 'Recording not found' });
      return;
    }
    const transcript = await runTranscriptionPipeline({ audioBuffer: recording.buffer, jobId });
    updateJob(jobId, { status: 'completed', transcriptId: transcript.id, recordingStatus: 'stopped' });
    const updated = getJob(jobId);
    if (updated) await saveJob(updated);
    res.json({ status: 'ok', transcriptId: transcript.id });
  } catch (error) {
    updateJob(jobId, { status: 'failed', failureReason: error?.message || 'Transcription error' });
    const updated = getJob(jobId);
    if (updated) await saveJob(updated);
    res.status(500).json({ error: error?.message || 'Transcription error' });
  }
});

app.post('/webhooks/zoom', async (req, res) => {
  const secret = process.env.ZOOM_RTMS_WEBHOOK_SECRET || '';
  if (secret && !verifyZoomWebhook(req, secret)) {
    res.status(401).json({ error: 'Invalid signature' });
    return;
  }

  if (req.body?.event === 'endpoint.url_validation') {
    const challenge = buildZoomChallengeResponse(req.body, secret);
    if (!challenge) {
      res.status(400).json({ error: 'Invalid challenge payload' });
      return;
    }
    res.json(challenge);
    return;
  }
  const event = req.body?.event;
  if (!event || !event.event) {
    res.status(400).json({ error: 'Invalid Zoom webhook payload' });
    return;
  }

  const meetingId = event.payload?.object?.id?.toString();
  const hostId = event.payload?.object?.host_id;
  const clientId = event.payload?.payload?.client_id;

  if (!meetingId) {
    res.status(200).json({ status: 'ignored' });
    return;
  }

  const job = getJobByMeetingId(meetingId);
  if (job && hostId && clientId) {
    updateJob(job.id, { participantUserId: hostId, clientId });
    await startZoomCapture({ ...job, participantUserId: hostId, clientId });
    const updated = getJob(job.id);
    if (updated) await saveJob(updated);
    if (process.env.CAPTURE_AUTO_RECORD === 'true' && updated?.status === 'in_progress') {
      try {
        await startRecordingForJob(updated);
        updateJob(job.id, { recordingStatus: 'recording' });
        const saved = getJob(job.id);
        if (saved) await saveJob(saved);
      } catch (error) {
        updateJob(job.id, { recordingStatus: 'failed', failureReason: error?.message || 'Recording error' });
        const saved = getJob(job.id);
        if (saved) await saveJob(saved);
      }
    }
  }

  res.status(200).json({ status: 'ok' });
});

async function bootstrap() {
  const rows = await fetchJobs();
  if (rows.length) {
    hydrateJobs(rows);
  }
  app.listen(port, () => {
    console.log(`Meeting capture service listening on :${port}`);
  });
}

bootstrap();
