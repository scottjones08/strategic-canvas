# Professional Voice Transcription with Speaker Diarization

## Overview

The Strategic Canvas now includes a professional-grade transcription system that provides:

- **🎙️ Live real-time transcription** - See text appear as you speak during meetings
- **👥 Speaker diarization** - Automatically identifies different speakers
- **📝 Auto-save to Notes** - Transcripts automatically saved when recording stops
- **🎯 Generate Whiteboard** - AI extracts ideas, actions, questions, and more from transcripts
- **📤 Export options** - Text, markdown, HTML formats
- **⬆️ Audio file upload** - Transcribe recordings after the meeting

## Quick Start

### 1. During a Meeting

1. Open a board and look for the **Transcript** panel (top-right)
2. Click the **🎤 microphone button** to start recording
3. **A large live view expands** showing your transcript in real-time
4. Different speakers are automatically labeled and color-coded
5. Click **Stop Recording** when done
6. **Transcript is automatically saved** to your Notes

### 2. Generate Whiteboard from Transcript

After recording:
1. Click the **✨ Generate Whiteboard** button (wand + layout icon)
2. The system analyzes your transcript and extracts:
   - **💡 Ideas** → Yellow sticky notes
   - **✅ Action Items** → Green action nodes
   - **❓ Questions** → Blue sticky notes  
   - **🎯 Decisions** → Purple sticky notes
   - **⚠️ Risks/Concerns** → Red risk nodes
   - **🚀 Opportunities** → Teal opportunity nodes
3. Preview and select which items to add
4. Click **Add to Whiteboard** - items are organized automatically

## Setup

### Basic Mode (No Setup Required)

The system works immediately with the browser's built-in Web Speech API:
- ✅ Real-time transcription
- ✅ Auto-save to notes
- ✅ Generate whiteboard
- ❌ No speaker identification
- ❌ Lower accuracy

### Professional Mode (AssemblyAI)

For speaker diarization and higher accuracy:

1. Get a free API key from [AssemblyAI](https://www.assemblyai.com/app/)
2. Click the **⚙️ Settings** icon in the transcript panel
3. Paste your API key
4. Enable **Speaker Diarization**
5. Click **Save Settings**

Benefits:
- ✅ Automatic speaker identification
- ✅ Higher transcription accuracy
- ✅ Upload audio/video files
- ✅ Better punctuation and formatting

## Features in Detail

### Live Recording View

When you start recording, a **large floating panel** appears at the bottom of the screen:
- **Red header** with recording indicator
- **Real-time transcript** with latest text highlighted
- **Pause/Resume** buttons
- Auto-scrolling to show newest text
- Duration timer and segment count

### Speaker Management

- Speakers auto-detected as "Speaker A", "Speaker B", etc.
- **Click any speaker label** to rename (e.g., "Scott Jones", "Client")
- Each speaker has a **unique color** for easy identification
- Colors persist throughout the transcript

### Auto-Save to Notes

When you stop recording:
1. Transcript is **automatically saved** as a Note
2. Note is **linked to the current board**
3. Note includes:
   - Meeting date and duration
   - Speaker-colored transcript
   - Timestamps (optional)

### Generate Whiteboard

The **Generate Whiteboard** feature uses AI/pattern matching to extract:

| Category | Node Type | Color | Trigger Words |
|----------|-----------|-------|---------------|
| Ideas | Sticky | Yellow | "idea", "think", "could", "suggest" |
| Actions | Action | Green | "will", "should", "need to", "let's" |
| Questions | Sticky | Blue | "?", "how", "what", "why" |
| Decisions | Sticky | Purple | "decided", "agreed", "confirmed" |
| Risks | Risk | Red | "risk", "concern", "worry", "problem" |
| Opportunities | Opportunity | Teal | "opportunity", "potential", "growth" |

**Two extraction methods:**
1. **Pattern Matching** - Fast, works offline, keyword-based
2. **AI-Powered** - Smarter context understanding (requires Claude API key)

### Export Options

- **📄 Plain Text** - Simple format with timestamps
- **📝 Markdown** - Formatted with headers
- **🎨 Rich HTML** - Color-coded speakers
- **💾 Save as Note** - Manual note creation

## UI Walkthrough

### Minimized State
- Small button showing "Transcript" with segment count
- Red dot pulses when recording
- Click to expand

### Normal Panel
- Compact panel in top-right corner
- Settings, export, and action buttons
- Scrollable transcript view
- Search functionality

### Recording Mode
- **Large bottom panel** takes center stage
- Very visible live text
- Large stop button
- Pause/resume controls

## API Reference

### Files Created

| File | Purpose |
|------|---------|
| `src/lib/transcription.ts` | Core transcription service |
| `src/lib/transcript-to-whiteboard.ts` | Whiteboard extraction logic |
| `src/hooks/useTranscription.ts` | React state management |
| `src/components/TranscriptionPanel.tsx` | Main UI component |
| `src/components/TranscriptToWhiteboard.tsx` | Whiteboard generation modal |
| `src/components/AudioUploader.tsx` | File upload component |
| `src/components/TranscriptionSettings.tsx` | Settings modal |

### Key Types

```typescript
interface FullTranscript {
  id: string;
  segments: TranscriptSegment[];
  speakers: Speaker[];
  duration: number;
  createdAt: Date;
  status: 'processing' | 'completed' | 'error';
}

interface TranscriptSegment {
  id: string;
  speaker: string;
  speakerLabel: string;
  text: string;
  startTime: number;
  endTime: number;
  confidence: number;
}

interface WhiteboardObject {
  type: 'sticky' | 'action' | 'opportunity' | 'risk' | 'frame';
  content: string;
  color: string;
  category: 'idea' | 'action' | 'question' | 'decision' | 'risk' | 'opportunity';
  confidence: number;
}
```

## Tips for Best Results

### For Better Transcription
1. Use a good microphone
2. Minimize background noise
3. Speak clearly at moderate pace
4. For important meetings, upload a recording for better accuracy

### For Better Whiteboard Generation
1. Use clear action language ("We should..." "Let's...")
2. Ask explicit questions
3. State decisions clearly ("We've decided...")
4. Name risks explicitly ("One concern is...")

### For Speaker Identification
1. Add your AssemblyAI API key
2. Set expected speaker count if known
3. Rename speakers immediately after recording
4. Upload recordings for better diarization than real-time

## Troubleshooting

### "No transcript appearing"
- Check microphone permissions in browser
- Ensure microphone is selected in system settings
- Try Chrome or Edge for best Web Speech API support

### "Speakers not identified"
- Requires AssemblyAI API key
- Enable "Speaker Diarization" in settings
- Upload a recording for better results than real-time

### "Generate Whiteboard finds nothing"
- Transcript may be too short
- Try using clearer action/question language
- Use AI-powered extraction for better context

### "Audio upload fails"
- Requires AssemblyAI API key
- Check file format (mp3, wav, m4a, mp4, webm)
- Maximum file size: 100MB

## Privacy & Security

- **API keys stored locally** in browser localStorage
- **Audio sent to AssemblyAI** when using professional mode
- **Web Speech API** sends audio to browser provider
- **AssemblyAI deletes audio** after processing
- **No data stored** on our servers

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Start/Stop Recording | Click mic button |
| Pause/Resume | Click pause button |
| Copy Transcript | Click copy icon |
| Close Panel | Click minimize |

---

*For questions or issues, check the console for detailed error messages.*
