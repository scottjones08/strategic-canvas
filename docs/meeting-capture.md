# Meeting Capture (First-Party)

This app supports first-party capture for:
- Zoom RTMS
- Microsoft Teams calling bot
- Google Meet headless joiner

## Architecture
- A dedicated capture service handles calendar ingestion, bot join, and media capture.
- The web app schedules capture jobs via `VITE_MEETING_CAPTURE_API_URL`.
- Audio is transcribed and pushed back into the meeting workflow.

## Required environment variables (web app)

```
VITE_MEETING_CAPTURE_API_URL=https://your-capture-service
```

## Capture service persistence
Set in the capture service:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Zoom RTMS
- Create a Zoom OAuth app with RTMS enabled.
- Configure RTMS webhooks to your capture service.
- Provide Zoom credentials to the capture service.
- Set the RTMS webhook URL to `/webhooks/zoom`.

## Microsoft Teams
- Register a Teams calling bot in Azure AD.
- Enable Graph Communications permissions (tenant admin consent required).
- Provide bot credentials to the capture service.

## Google Meet
- The joiner runs as a headless Chromium service.
- Provide a dedicated Google Workspace account and enable Calendar access.
- Playwright is required for the joiner.
- The Docker image installs Chromium for Playwright.

## Local service scaffold
The service lives in `services/meeting-capture` and ships with:
- Provider stubs for Zoom RTMS, Teams bot, and Meet joiner.
- A minimal job store for testing.
- `.env.example` with required credentials.

## Notes
- If the capture service is not configured, the UI will still allow local capture via the in-browser recorder.

## Transcription pipeline
The capture service accepts base64 audio at `POST /capture/audio?jobId=...` and sends it to AssemblyAI.
When complete, it posts back to `APP_WEBHOOK_BASE_URL` at `/functions/v1/meeting-capture-transcript`.

## Audio capture
Set `CAPTURE_AUTO_RECORD=true` in the capture service to record audio via ffmpeg.
Use `CAPTURE_AUDIO_MODE=pulse` and `CAPTURE_AUDIO_SOURCE=default` for PulseAudio,
or set `CAPTURE_AUDIO_MODE=url` and `CAPTURE_AUDIO_URL` for stream capture.
