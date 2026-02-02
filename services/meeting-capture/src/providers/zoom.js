export function validateZoomConfig() {
  const required = [
    'ZOOM_RTMS_CLIENT_ID',
    'ZOOM_RTMS_CLIENT_SECRET',
    'ZOOM_RTMS_ACCOUNT_ID',
    'ZOOM_RTMS_WEBHOOK_SECRET',
  ];
  const missing = required.filter((key) => !process.env[key]);
  return missing;
}

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

async function fetchZoomAccessToken() {
  const clientId = process.env.ZOOM_RTMS_CLIENT_ID;
  const clientSecret = process.env.ZOOM_RTMS_CLIENT_SECRET;
  const accountId = process.env.ZOOM_RTMS_ACCOUNT_ID;
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
      },
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Zoom OAuth error: ${response.status} ${text}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function startRtmsSession({ meetingId, participantUserId, clientId }) {
  const token = await fetchZoomAccessToken();
  const body = {
    action: 'start',
    participant_user_id: participantUserId,
    client_id: clientId,
  };

  const response = await fetch(
    `https://api.zoom.us/v2/live_meetings/${meetingId}/rtms_app/status`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Zoom RTMS status error: ${response.status} ${text}`);
  }

  return response.json();
}

export async function startZoomCapture(job) {
  const missing = validateZoomConfig();
  if (missing.length) {
    return {
      status: 'failed',
      reason: `Missing Zoom RTMS config: ${missing.join(', ')}`,
    };
  }

  const meetingId = job.meetingId || parseZoomMeetingId(job.meetingUrl);
  if (!meetingId) {
    return {
      status: 'failed',
      reason: 'Unable to parse Zoom meeting ID from URL.',
    };
  }

  const participantUserId = job.participantUserId || process.env.ZOOM_RTMS_PARTICIPANT_USER_ID;
  const rtmsClientId = job.clientId || process.env.ZOOM_RTMS_CLIENT_ID;

  if (!participantUserId || !rtmsClientId) {
    return {
      status: 'queued',
      provider: 'zoom',
      details: {
        jobId: job.id,
        meetingId,
        message: 'Waiting for participant_user_id/client_id from webhook.',
      },
    };
  }

  await startRtmsSession({
    meetingId,
    participantUserId,
    clientId: rtmsClientId,
  });

  return {
    status: 'in_progress',
    provider: 'zoom',
    details: {
      jobId: job.id,
      meetingId,
    },
  };
}
