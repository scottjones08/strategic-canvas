# Meeting Capture Service

API scaffold for first-party meeting capture (Zoom RTMS, Teams bot, Google Meet joiner).

## Endpoints
- `GET /healthz`
- `GET /capture/jobs`
- `GET /capture/jobs/:id`
- `POST /capture/start`
- `POST /webhooks/zoom`

## Run locally

```
cd services/meeting-capture
npm install
npm run dev
```

## Docker

```
docker build -t meeting-capture-service .
docker run -p 8787:8787 --env-file .env meeting-capture-service
```

The Docker image installs Chromium for the Google Meet joiner.

## Environment
See `.env.example` for required provider credentials.

### Supabase persistence
Set:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Providers

### Zoom RTMS
Set:
- `ZOOM_RTMS_CLIENT_ID`
- `ZOOM_RTMS_CLIENT_SECRET`
- `ZOOM_RTMS_ACCOUNT_ID`
- `ZOOM_RTMS_WEBHOOK_SECRET`
- `ZOOM_RTMS_PARTICIPANT_USER_ID` (optional override)

The capture service exposes `/webhooks/zoom` for RTMS events.

### Microsoft Teams calling bot
Set:
- `TEAMS_TENANT_ID`
- `TEAMS_CLIENT_ID`
- `TEAMS_CLIENT_SECRET`
- `TEAMS_BOT_ID`
- `TEAMS_BOT_APP_ID`
- `TEAMS_BOT_CALLBACK_URI`
- `TEAMS_MEETING_PASSCODE` (optional)

### Google Meet joiner
Set:
- `MEET_JOINER_EMAIL`
- `MEET_JOINER_PASSWORD`

Requires Playwright (already included) and a headless browser environment.

### Transcription + callbacks
Set:
- `ASSEMBLYAI_API_KEY`
- `APP_WEBHOOK_BASE_URL` (where to POST transcripts)
- `APP_WEBHOOK_API_KEY` (optional auth token)

### Audio capture
Set:
- `CAPTURE_AUTO_RECORD=true`
- `CAPTURE_AUDIO_MODE=pulse|url`
- `CAPTURE_AUDIO_SOURCE=default` (PulseAudio source)
- `CAPTURE_AUDIO_URL=` (if using URL mode)
- `CAPTURE_MAX_SECONDS=3600`
- `CAPTURE_OUTPUT_DIR=` (optional)
- `FFMPEG_PATH=ffmpeg`

## Notes
Provider handlers are stubbed; they return queued jobs until you wire the actual join and capture logic.
