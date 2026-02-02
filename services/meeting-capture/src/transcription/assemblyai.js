import fs from 'fs/promises';

const ASSEMBLYAI_API_URL = 'https://api.assemblyai.com/v2';

export async function uploadAudio(buffer, apiKey) {
  const response = await fetch(`${ASSEMBLYAI_API_URL}/upload`, {
    method: 'POST',
    headers: {
      authorization: apiKey,
    },
    body: buffer,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AssemblyAI upload failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  return data.upload_url;
}

export async function requestTranscript(uploadUrl, apiKey) {
  const response = await fetch(`${ASSEMBLYAI_API_URL}/transcript`, {
    method: 'POST',
    headers: {
      authorization: apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      audio_url: uploadUrl,
      speaker_labels: true,
      punctuate: true,
      format_text: true,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AssemblyAI transcript request failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  return data.id;
}

export async function pollTranscript(transcriptId, apiKey) {
  while (true) {
    const response = await fetch(`${ASSEMBLYAI_API_URL}/transcript/${transcriptId}`, {
      headers: { authorization: apiKey },
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`AssemblyAI transcript poll failed: ${response.status} ${text}`);
    }
    const data = await response.json();
    if (data.status === 'completed') return data;
    if (data.status === 'error') throw new Error(data.error || 'AssemblyAI error');
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

export async function transcribeBuffer(buffer, apiKey) {
  const uploadUrl = await uploadAudio(buffer, apiKey);
  const transcriptId = await requestTranscript(uploadUrl, apiKey);
  return pollTranscript(transcriptId, apiKey);
}

export async function transcribeFile(filePath, apiKey) {
  const buffer = await fs.readFile(filePath);
  return transcribeBuffer(buffer, apiKey);
}
