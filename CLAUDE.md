# CLAUDE.md - Strategic Canvas Project Guide

> **⚠️ IMPORTANT FOR ALL AI ASSISTANTS (Claude, Kimi, Minimax, etc.):**
> - READ THIS FILE COMPLETELY before making changes
> - DO NOT overwrite or remove existing functionality
> - ADD to this file when implementing new features
> - CHECK existing code patterns before introducing new ones
> - PRESERVE all existing UI/UX patterns

---

## Project Overview

**Strategic Canvas** is a Mural/Miro-style collaborative whiteboard application built with React, TypeScript, and Supabase. It's designed for enterprise meetings, brainstorming, and client collaboration.

**Live URL:** Deployed on Railway (auto-deploys from `main` branch)

**Tech Stack:**
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS + Framer Motion (styling/animations)
- Supabase (database, auth, real-time, storage)
- PDF.js + pdf-lib (PDF handling)

---

## Directory Structure

```
src/
├── components/           # React components
│   ├── EnterpriseCanvas.tsx      # Main infinite canvas with pan/zoom
│   ├── EnterpriseMeetingView.tsx # Meeting view with toolbar, nodes, connectors
│   ├── EnterpriseToolbar.tsx     # Top toolbar (tools, zoom, undo/redo)
│   ├── FloatingPropertyPanel.tsx # Node properties editor (style, text, dimensions)
│   ├── NodeComponent              # (inside EnterpriseMeetingView) Renders all node types
│   ├── EnhancedConnector.tsx     # Smart connector lines between nodes
│   ├── UnifiedLeftPanel.tsx      # Left sidebar (transcript, actions, people)
│   ├── DocumentsView.tsx         # PDF document management
│   ├── DocumentPortal.tsx        # Full document portal with sharing
│   ├── PDFEditor.tsx             # PDF viewer/annotator
│   ├── SignatureWorkflow.tsx     # Document signing flow
│   └── ... (many more)
├── lib/                  # Utilities and APIs
│   ├── supabase.ts              # Supabase client + APIs (boards, notes, orgs)
│   ├── documents-api.ts         # Document CRUD + file upload
│   ├── connector-engine.ts      # Smart connector routing
│   ├── realtime-collaboration.ts # Live cursors, presence
│   └── pdf-utils.ts             # PDF processing utilities
├── types/
│   └── board.ts                 # TypeScript types (VisualNode, Board, etc.)
└── App.tsx              # Main app with routing and state
```

---

## Core Features (DO NOT REMOVE)

### 1. Infinite Canvas (`EnterpriseCanvas.tsx`)
- Pan: Space + drag, or Hand tool
- Zoom: Ctrl/Cmd + scroll, or pinch gesture
- World-space coordinates with viewport transform
- Grid background with optional snap-to-grid
- Lasso multi-selection
- Momentum scrolling

### 2. Node Types (`VisualNode` in `types/board.ts`)
All nodes have: `id, type, x, y, width, height, content, color, rotation, locked`

| Type | Description | Special Properties |
|------|-------------|-------------------|
| `sticky` | Sticky notes | color, fontSize, fontWeight, fontStyle, textAlign, opacity |
| `text` | Free text | fontSize, fontWeight, fontStyle, textAlign |
| `shape` | Shapes | shapeType: rectangle/circle/triangle/diamond |
| `frame` | Grouping frame | - |
| `connector` | Lines between nodes | connectorFrom, connectorTo, connectorWaypoints |
| `image` | Embedded images | mediaUrl |
| `youtube` | YouTube embeds | mediaUrl (embed URL) |
| `table` | Data tables | tableData: { headers, rows } |
| `bucket` | Photo bucket | bucketId, bucketImages |
| `linklist` | Link collection | links: [{ id, title, url }] |
| `mindmap` | Mind map nodes | parentNodeId, isRootNode |

### 3. Toolbar (`EnterpriseToolbar.tsx`)
**Tools:**
- Select (V) - Select and move nodes
- Hand (H) - Pan canvas
- Sticky (N) - Add sticky note (shows color picker first)
- Text (T) - Add text
- Shapes (S) - Add shape (shows shape picker first)
- Connector (C) - Draw lines between nodes
- Frame (F) - Add grouping frame
- Mind Map (M) - Add mind map node
- YouTube (Y) - Embed video
- Image (I) - Embed image
- Table (B) - Add table
- Bucket (U) - Add photo bucket
- Links (L) - Add link list

**Behavior:** Clicking content tools (sticky, text, shape, etc.) immediately places the element at viewport center. No second click needed.

### 4. Property Panel (`FloatingPropertyPanel.tsx`)
Appears when a single node is selected. Features:
- **Actions:** Duplicate, To Front, To Back, Lock/Unlock, Delete
- **Style:** Color picker (10 presets), Opacity slider (works!)
- **Text:** Font size (+/-), Bold, Italic, Alignment (left/center/right)
- **Dimensions:** Width, Height, Rotation
- **Shape:** Shape type selector (for shape nodes)

### 5. Connectors (`EnhancedConnector.tsx`)
- Click connector tool, click source node, click target node
- Smart routing with waypoints
- Draggable control points
- Labels on connectors
- Connection dots appear on nodes in connector mode

### 6. Documents (`documents-api.ts`, `DocumentsView.tsx`)
- PDF upload to Supabase Storage (bucket: `documents`)
- PDF viewing and annotation
- Document sharing with magic links
- Client organization

### 7. Real-time Collaboration
- Live cursors showing other users
- Presence indicators
- Real-time node updates via Supabase

---

## Supabase Configuration

**Required Storage Buckets:**
- `documents` - For PDF uploads (must be PUBLIC)

**Database Tables:**
- `canvas_boards` - Board data
- `project_notes` - Notes
- `organizations` - Clients/orgs
- `client_documents` - Document metadata
- `board_magic_links` - Sharing links
- `users` - User profiles

---

## Key Patterns

### Adding a New Node Type
1. Add type to `VisualNode['type']` union in `types/board.ts`
2. Add any special properties to `VisualNode` interface
3. Add render case in `NodeComponent.renderContent()` in `EnterpriseMeetingView.tsx`
4. Add toolbar button in `EnterpriseToolbar.tsx`
5. Add creation handler in `handleToolChange()` in `EnterpriseMeetingView.tsx`

### State Management
- Board state lives in `App.tsx` and passes down via props
- `onUpdateNodes` callback for all node changes
- History array for undo/redo

### Styling Conventions
- Tailwind CSS for all styling
- Framer Motion for animations
- Indigo as primary accent color
- Rounded corners (rounded-xl, rounded-2xl)
- Backdrop blur on floating elements

---

## Recent Changes Log

| Date | Change | Files |
|------|--------|-------|
| 2026-01-27 | Fixed toolbar dropdowns - show picker first | EnterpriseToolbar.tsx |
| 2026-01-27 | Fixed property panel - opacity, text styles work | FloatingPropertyPanel.tsx, EnterpriseMeetingView.tsx, types/board.ts |
| 2026-01-27 | Instant tool placement at viewport center | EnterpriseMeetingView.tsx |
| 2026-01-27 | Responsive toolbar with horizontal scroll | EnterpriseToolbar.tsx |
| 2026-01-27 | Document upload error handling | documents-api.ts |
| 2026-01-27 | Connection points on shapes | EnterpriseMeetingView.tsx |
| 2026-01-27 | Fixed shapes picker z-index - now visible above toolbar | EnterpriseToolbar.tsx |
| 2026-01-27 | Fixed connector arrows positioning - recalculates when nodes move | EnterpriseCanvas.tsx |
| 2026-01-27 | Fixed connector start/end waypoints - always recalculates from node positions | connector-engine.ts |
| 2026-01-27 | Fixed toolbar dropdowns - use fixed positioning to avoid overflow clipping | EnterpriseToolbar.tsx |
| 2026-01-27 | Fixed sticky button - adds sticky immediately on click | EnterpriseToolbar.tsx |
| 2026-01-27 | Fixed property panel scrollbars - hidden with scrollbar-hide | FloatingPropertyPanel.tsx |
| 2026-01-27 | Major connector improvements - pivot points, styling, mobile responsive | Multiple files |
| 2026-01-27 | Connection dots visible on selected nodes, better connector UX | EnterpriseMeetingView.tsx |
| 2026-01-27 | Mobile bottom toolbar, floating action button, responsive layout | EnterpriseMeetingView.tsx |
| 2026-01-27 | Connector control points - double-click to add, drag to route | EnhancedConnector.tsx |
| 2026-01-27 | Fixed connector not attaching to nodes - fresh start/end waypoints | connector-engine.ts |

---

## Known Issues / TODOs

- [ ] Document portal needs Supabase `documents` bucket created
- [ ] Large bundle size (>500KB) - consider code splitting
- [ ] Mobile toolbar could use more optimization

---

## Commands

```bash
# Development
npm run dev

# Build
npm run build

# Type check
npx tsc --noEmit
```

---

## For AI Assistants

### Before Making Changes:
1. Read this file completely
2. Check if feature already exists
3. Follow existing code patterns
4. Test with `npm run build`

### After Making Changes:
1. Update the "Recent Changes Log" section above
2. Add any new node types or major features to documentation
3. Commit with descriptive message
4. Push to `main` for auto-deploy

### DO NOT:
- Remove existing functionality
- Change core component APIs without updating all usages
- Introduce new state management patterns
- Add new dependencies without good reason
- Change the Supabase schema without migration plan
