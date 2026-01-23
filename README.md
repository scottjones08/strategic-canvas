# Meeting Companion

AI-powered meeting companion for client engagements with real-time whiteboard building, opportunity mapping, and structured onboarding workflows.

## 🎯 Key Features

### Real-Time Meeting Companion
- **Live Context Capture** - Record key points during meetings
- **Audio Recording** - Record sessions with visual level indicator
- **Quick Capture Buttons** - Rapidly log opportunities, risks, and action items
- **Live Context Stream** - See all captured items in real-time

### Connected Opportunity Mapping
- **Auto-Link Opportunities → Next Steps** - One click connects opportunities to related tasks
- **Visual Relationship Map** - See the connection between strategy and execution
- **Keyword-Based Linking** - AI detects relationships and creates connectors automatically

### Client Onboarding Workflows
**Discovery Session Structure:**
1. **Introduction (15 min)** - Business background, challenges, goals
2. **Discovery (20 min)** - Current workflows, tools, inefficiencies
3. **Opportunities (20 min)** - Top opportunities, values, risks
4. **Next Steps (15 min)** - Priorities, resources, follow-up schedule

### Meeting Stats Dashboard
- Real-time session timer
- Progress through onboarding phases
- Count of opportunities, actions, and decisions captured
- Session status (active/paused/completed)

## 🎤 Voice Recording
- Browser-native audio recording
- Visual audio level feedback
- Auto-transcription ready (Whisper API integration)

## 🚀 Quick Start

```bash
cd ~/Documents/GitHub/strategic-canvas
npm install
npm run dev
```

Open http://localhost:5176

## Usage Workflow

### 1. Start New Client Meeting
- Enter client name
- Click "Start Discovery Session"
- Meeting timer begins

### 2. During the Meeting
- Click **Record** to start audio recording
- Type key points in Quick Capture
- Click **Opportunity / Risk / Action** to categorize
- Watch nodes appear on the whiteboard automatically

### 3. After Discussion
- Click **Map Connections** to auto-link opportunities → tasks
- See visual connectors between strategy and execution
- Export meeting for client records

## Meeting Panel

| Section | Purpose |
|---------|---------|
| Phase Progress | Track where you are in the onboarding workflow |
| Quick Capture | Rapidly log items during conversation |
| Live Context | See all captured items in real-time |
| Stats | Count of opportunities, actions, decisions |

## Export Options
- JSON export with all nodes, connectors, and context
- Include meeting metadata (client name, duration, session stats)
- Import later for follow-up meetings

## Tech Stack
- React 18 + TypeScript
- Vite + Tailwind CSS
- Web Speech API ready
- localStorage persistence

## Project Structure
```
strategic-canvas/
├── src/
│   ├── App.tsx           # Meeting Companion with real-time features
│   ├── types/
│   │   └── whiteboard.ts # TypeScript interfaces
│   └── lib/
│       └── whiteboard-engine.ts
├── index.html
└── README.md
```
