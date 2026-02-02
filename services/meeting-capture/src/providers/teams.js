export function validateTeamsConfig() {
  const required = [
    'TEAMS_TENANT_ID',
    'TEAMS_CLIENT_ID',
    'TEAMS_CLIENT_SECRET',
    'TEAMS_BOT_ID',
    'TEAMS_BOT_APP_ID',
    'TEAMS_BOT_CALLBACK_URI',
  ];
  const missing = required.filter((key) => !process.env[key]);
  return missing;
}

async function fetchTeamsAccessToken() {
  const tenantId = process.env.TEAMS_TENANT_ID;
  const clientId = process.env.TEAMS_CLIENT_ID;
  const clientSecret = process.env.TEAMS_CLIENT_SECRET;
  const params = new URLSearchParams();
  params.set('client_id', clientId);
  params.set('client_secret', clientSecret);
  params.set('grant_type', 'client_credentials');
  params.set('scope', 'https://graph.microsoft.com/.default');

  const response = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Teams OAuth error: ${response.status} ${text}`);
  }
  const data = await response.json();
  return data.access_token;
}

function parseTeamsJoinUrl(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.toString();
  } catch {
    return null;
  }
}

async function createTeamsCall({ joinUrl }) {
  const token = await fetchTeamsAccessToken();
  const response = await fetch('https://graph.microsoft.com/v1.0/communications/calls', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      callbackUri: process.env.TEAMS_BOT_CALLBACK_URI,
      requestedModalities: ['audio'],
      mediaConfig: {
        '@odata.type': '#microsoft.graph.serviceHostedMediaConfig',
        preFetchMedia: [],
      },
      meetingInfo: {
        '@odata.type': '#microsoft.graph.joinMeetingIdMeetingInfo',
        joinMeetingId: joinUrl,
        passcode: process.env.TEAMS_MEETING_PASSCODE || undefined,
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Teams call error: ${response.status} ${text}`);
  }

  return response.json();
}

export async function startTeamsCapture(job) {
  const missing = validateTeamsConfig();
  if (missing.length) {
    return {
      status: 'failed',
      reason: `Missing Teams bot config: ${missing.join(', ')}`,
    };
  }

  const joinUrl = parseTeamsJoinUrl(job.meetingUrl);
  if (!joinUrl) {
    return { status: 'failed', reason: 'Invalid Teams meeting URL' };
  }

  await createTeamsCall({ joinUrl });
  return {
    status: 'in_progress',
    provider: 'teams',
    details: {
      jobId: job.id,
      meetingUrl: job.meetingUrl,
    },
  };
}
