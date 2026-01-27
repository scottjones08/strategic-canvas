# Enterprise Whiteboard Features

This document summarizes the enterprise-level whiteboard features implemented for Fan Canvas.

## 🎯 Overview

The enterprise upgrade transforms Fan Canvas into a Mural-like enterprise whiteboard application with advanced features including multi-point connector routing, world-space canvas, and mobile-optimized UI.

## 📁 New Files Created

### Core Components

1. **`src/lib/connector-engine.ts`** (16KB)
   - Advanced connector routing engine
   - Waypoint management
   - Path generation (straight, curved, orthogonal, stepped)
   - Obstacle detection and avoidance
   - Edge intersection calculations

2. **`src/components/EnhancedConnector.tsx`** (19KB)
   - Interactive connector with draggable waypoints
   - Double-click to add control points
   - Visual waypoint handles
   - Context menu for options
   - Label editing inline
   - Style switching (solid/dashed/dotted)

3. **`src/components/EnterpriseCanvas.tsx`** (29KB)
   - World-space coordinate system
   - Hardware-accelerated pan/zoom with momentum
   - Smart grid with snapping
   - Alignment guides
   - Multi-selection with lasso
   - Touch gesture support (pinch-to-zoom)
   - Reduced-based state management

4. **`src/components/EnterpriseToolbar.tsx`** (23KB)
   - Mural-like top toolbar
   - Tool groups with quick actions
   - Sticky note color picker
   - Shape selector with preview
   - Undo/redo controls
   - View controls (zoom, grid, snap)
   - Selection toolbar with alignment options

5. **`src/components/EnterpriseMeetingView.tsx`** (21KB)
   - Complete meeting view using enterprise components
   - Integration of canvas, toolbar, and property panels
   - Alignment operations (left, center, right, top, middle, bottom)
   - Distribution operations
   - Group/ungroup functionality

6. **`src/components/MobileToolbar.tsx`** (17KB)
   - Bottom sheet style toolbar for mobile
   - Touch-optimized buttons (44px minimum)
   - Swipe to dismiss
   - Quick tool access
   - Selection actions
   - Collapsible sections

7. **`src/components/FloatingPropertyPanel.tsx`** (16KB)
   - Draggable property panel
   - Context-sensitive properties
   - Color picker with presets
   - Font size and style controls
   - Text alignment
   - Dimension controls
   - Rotation control
   - Quick actions (duplicate, delete, lock)

### Hooks

8. **`src/hooks/useDeviceType.ts`** (2KB)
   - Detects device type (mobile/tablet/desktop)
   - Touch capability detection
   - Orientation detection
   - Window size tracking

9. **`src/hooks/useFeatureFlags.ts`** (2.4KB)
   - Feature flag management
   - LocalStorage persistence
   - Enable/disable enterprise features
   - Individual flag controls

### Integration

10. **`src/lib/index.ts`** (New)
    - Centralized library exports
    - Includes connector-engine exports

11. **`INTEGRATION.md`** (11KB)
    - Comprehensive integration guide
    - Migration instructions
    - API documentation
    - Troubleshooting tips

## ✨ Key Features

### 1. Advanced Connector Routing

- **Multiple Control Points**: Add waypoints by double-clicking the connector path
- **Draggable Routing**: Drag waypoints to route around obstacles
- **Multiple Styles**: Straight, curved (bezier), orthogonal, and stepped
- **Smart Routing**: Automatic path calculation between nodes
- **Visual Feedback**: Handles appear when connector is selected
- **Labels**: Inline label editing at the midpoint

```typescript
// Example: Create a connector with waypoints
const connectorPath = createConnectorPath(fromNode, toNode, {
  style: 'orthogonal',
  routing: 'smart'
});
```

### 2. Enterprise Canvas

- **World Space Coordinates**: Elements positioned in world space, not screen pixels
- **Hardware Acceleration**: CSS transform3d for smooth 60fps animations
- **Momentum Scrolling**: Physics-based panning with friction
- **Smart Grid**: Configurable grid with snap-to-grid
- **Alignment Guides**: Visual guides when dragging near other elements
- **Lasso Selection**: Click and drag to select multiple elements
- **Keyboard Shortcuts**: Full keyboard navigation support

### 3. Mural-like Toolbar

- **Tool Groups**: Organized by function (select, draw, content, view)
- **Quick Actions**: Common actions always visible
- **Contextual UI**: Selection toolbar appears when elements selected
- **Alignment Tools**: One-click alignment and distribution
- **Undo/Redo**: Full history with keyboard shortcuts

### 4. Mobile-First Design

- **Bottom Sheet Toolbar**: Mobile-optimized tool access
- **Touch Targets**: 44px minimum for easy tapping
- **Gesture Support**: Pinch-to-zoom, pan, swipe
- **Responsive Layout**: Adapts to screen size
- **Safe Areas**: Respects notches and home indicators

### 5. Floating Property Panel

- **Draggable**: Move anywhere on screen
- **Context-Sensitive**: Shows relevant properties for selected element type
- **Collapsible Sections**: Organized by category
- **Color Picker**: Preset colors with one-click selection
- **Typography Controls**: Font size, weight, style, alignment
- **Transform Controls**: Position, size, rotation

## 🚀 Getting Started

### Enable Enterprise Mode

Enterprise features are controlled by feature flags. They are enabled by default.

```typescript
import { useFeatureFlags } from './hooks';

function App() {
  const { flags, toggleFlag } = useFeatureFlags();
  
  // Toggle specific features
  toggleFlag('enhancedConnectors');
  toggleFlag('enterpriseCanvas');
  
  return (
    // ...
  );
}
```

### Using the Enterprise Meeting View

```tsx
import { EnterpriseMeetingView } from './components';

<EnterpriseMeetingView
  board={activeBoard}
  onUpdateBoard={handleUpdateBoard}
  onBack={handleBackToDashboard}
  userName="Scott"
  userColor="#3b82f6"
  participantCount={5}
  onOpenShare={() => setShowShareModal(true)}
/>
```

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `V` | Select tool |
| `H` | Hand/Pan tool |
| `N` | Sticky note tool |
| `T` | Text tool |
| `S` | Shape tool |
| `C` | Connector tool |
| `F` | Frame tool |
| `Space` + Drag | Pan canvas |
| `Ctrl/Cmd` + `+` | Zoom in |
| `Ctrl/Cmd` + `-` | Zoom out |
| `Ctrl/Cmd` + `0` | Reset view |
| `Ctrl/Cmd` + `A` | Select all |
| `Ctrl/Cmd` + `D` | Duplicate selected |
| `Delete` | Delete selected |
| `Ctrl/Cmd` + `Z` | Undo |
| `Ctrl/Cmd` + `Y` | Redo |

## 📱 Touch Gestures

### Mobile/Tablet

| Gesture | Action |
|---------|--------|
| Single finger drag | Pan canvas |
| Two finger pinch | Zoom in/out |
| Double tap | Zoom to fit |
| Long press | Context menu |

### Desktop Trackpad

| Gesture | Action |
|---------|--------|
| Two finger scroll | Pan canvas |
| Pinch | Zoom in/out |

## 🔧 Architecture

### State Management

The enterprise canvas uses a reducer pattern for viewport state:

```typescript
type ViewportAction =
  | { type: 'PAN'; dx: number; dy: number }
  | { type: 'ZOOM'; zoom: number; centerX?: number; centerY?: number }
  | { type: 'SET_PAN'; x: number; y: number }
  | { type: 'RESET' }
  | { type: 'FIT_BOUNDS'; bounds: Bounds; viewportWidth: number; viewportHeight: number };
```

### Coordinate System

- **World Space**: Elements positioned in world coordinates (x, y)
- **Screen Space**: Transformed for display (panX, panY, zoom)
- **Conversion**: `screenX = worldX * zoom + panX`

### Connector Path Format

```typescript
interface ConnectorPath {
  waypoints: Waypoint[];        // Array of points defining the path
  style: 'straight' | 'curved' | 'orthogonal' | 'stepped';
  routing: 'direct' | 'avoid-obstacles' | 'smart';
  label?: string;
  color: string;
  strokeWidth: number;
  strokeStyle: 'solid' | 'dashed' | 'dotted';
  arrowStart: boolean;
  arrowEnd: boolean;
  cornerRadius: number;
}
```

## 🎨 Customization

### Theme Customization

The enterprise components use Tailwind CSS classes. You can customize:

- Colors: Modify the `COLOR_PRESETS` arrays
- Spacing: Adjust grid size and snap thresholds
- Animation: Modify spring configs in components

### Adding New Tools

To add a new tool to the toolbar:

1. Add the tool type to `ToolType` in `EnterpriseToolbar.tsx`
2. Add the tool button to the toolbar JSX
3. Handle the tool in `EnterpriseMeetingView.tsx`
4. Implement the tool behavior in the canvas

## 🐛 Troubleshooting

### Connectors not appearing
- Check that `connectorFrom` and `connectorTo` reference valid node IDs
- Verify that the nodes have valid dimensions

### Performance issues
- Disable grid for large boards (>100 elements)
- Reduce number of waypoints on connectors
- Use `will-change: transform` sparingly

### Touch gestures not working
- Ensure `touch-action: none` is set on the canvas
- Check browser console for JavaScript errors
- Verify touch events are not being prevented

## 📈 Future Roadmap

- [ ] Auto-routing with obstacle avoidance
- [ ] Grouping with expand/collapse
- [ ] Layer management panel
- [ ] Template library with previews
- [ ] Threaded comments
- [ ] Voting and reactions
- [ ] Export to PDF/PNG/SVG
- [ ] Offline support
- [ ] Real-time collaboration improvements

## 📄 License

These enterprise features are part of the Fan Canvas project.
