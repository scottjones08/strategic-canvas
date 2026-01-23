# Strategic Canvas

AI-powered business planning whiteboard with voice input for strategic thinking, opportunity assessment, and business model development.

## Features

### 🎨 Visual Planning
- Drag-and-drop whiteboard for business strategy
- Multiple node types: stickies, cards, text blocks
- Color-coded by status (opportunities, risks, ideas, tasks, milestones)
- Connectors between related items

### 🎤 Voice Input (AI-Powered)
Record your ideas verbally and watch them transform into structured whiteboard nodes!

**How it works:**
1. Click the **Voice Input** button
2. Speak naturally about your business
3. AI automatically:
   - Transcribes your speech
   - Categorizes items (opportunity, risk, idea, task, milestone)
   - Extracts priorities (high, medium, low)
   - Identifies monetary values
   - Generates relevant tags
   - Creates structured nodes on the canvas

**Example voice prompts:**
- "Our main opportunity is targeting small businesses with $5-10M revenue"
- "Key risk is competition from ServiceTitan"
- "I want to build custom AI agents"
- "First milestone: reach $75K monthly recurring revenue"
- "Revenue will be $10K per month retainers"

### 🤖 AI-Powered Insights
- **Automatic Analysis** - Get insights on opportunities vs risks
- **Recommendations** - AI suggests next steps
- **Priority Extraction** - Automatically identifies high-priority items
- **Value Detection** - Captures financial figures from speech

### 📋 Smart Templates
- **AI Consulting Business Canvas** - Complete business model
- **SWOT Analysis** - Strategy matrix
- **Opportunity Matrix** - Prioritize by impact/effort
- **Business Mind Map** - Visual brainstorming
- **Project Kanban** - Task management

### 💾 Work Saving
- Auto-saves to your browser
- Export/Import as JSON files
- Share whiteboards easily

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:5176

## Voice Input Setup

### Option 1: Web Speech API (No API Key Required)
- Works in Chrome, Edge, Safari
- No configuration needed
- Click "Voice Input" and speak

### Option 2: OpenAI Whisper (Higher Accuracy)
For production use, add your OpenAI API key:

```bash
# Create .env file
echo "OPENAI_API_KEY=your-key-here" > .env
```

The app will automatically use Whisper for more accurate transcription.

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Web Speech API / OpenAI Whisper

## Project Structure

```
strategic-canvas/
├── src/
│   ├── App.tsx           # Main application with voice & whiteboard
│   ├── main.tsx          # Entry point
│   ├── index.css         # Styles
│   ├── types/
│   │   └── whiteboard.ts # TypeScript definitions
│   └── lib/
│       └── whiteboard-engine.ts # Core logic
├── index.html
├── package.json
├── vite.config.ts
└── README.md
```
