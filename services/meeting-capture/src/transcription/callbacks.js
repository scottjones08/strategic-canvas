export async function postTranscriptToApp({ appBaseUrl, apiKey, jobId, transcript }) {
  if (!appBaseUrl) return;
  const response = await fetch(`${appBaseUrl}/functions/v1/meeting-capture-transcript`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({ jobId, transcript }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`App callback failed: ${response.status} ${text}`);
  }
}
