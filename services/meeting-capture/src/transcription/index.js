import { transcribeBuffer } from './assemblyai.js';
import { postTranscriptToApp } from './callbacks.js';

export async function runTranscriptionPipeline({ audioBuffer, jobId }) {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) {
    throw new Error('ASSEMBLYAI_API_KEY not configured');
  }

  const transcript = await transcribeBuffer(audioBuffer, apiKey);

  const appBaseUrl = process.env.APP_WEBHOOK_BASE_URL;
  const appApiKey = process.env.APP_WEBHOOK_API_KEY;
  if (appBaseUrl) {
    await postTranscriptToApp({ appBaseUrl, apiKey: appApiKey, jobId, transcript });
  }

  return transcript;
}
