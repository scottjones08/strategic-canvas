# Enterprise Whiteboard Integration Guide

This guide explains how to integrate the new enterprise-level whiteboard components into the existing Fan Canvas application.

## Overview

The enterprise upgrade includes:

1. **Advanced Connector Routing** - Multiple control points, orthogonal routing, obstacle avoidance
2. **Enterprise Canvas** - World-space coordinates, hardware acceleration, momentum panning
3. **Top Toolbar** - Mural-like toolbar with tool groups and quick actions
4. **Mobile Toolbar** - Bottom sheet style toolbar optimized for touch
5. **Floating Property Panel** - Draggable, context-sensitive property panel
6. **Smart Alignment Guides** - Visual guides when dragging elements
7. **Touch Gestures** - Pinch-to-zoom, multi-touch support

## New Components

### 1. EnterpriseCanvas

Main canvas component with world-space coordinates.

```tsx
import { EnterpriseCanvas, EnterpriseCanvasRef } from './components/EnterpriseCanvas';

const canvasRef = useRef<EnterpriseCanvasRef>(null);

<EnterpriseCanvas
  ref={canvasRef}
  nodes={nodes}
  selectedNodeIds={selectedNodeIds}
  onSelectNodes={handleSelectNodes}
  onUpdateNodes={handleUpdateNodes}
  onDeleteNodes={handleDeleteNodes}
  onCanvasClick={handleCanvasClick}
  gridEnabled={true}
  gridSnap={false}
  showGrid={true}
>
  {/* Render your nodes here */}
</EnterpriseCanvas>
```

**Key Features:**
- World-space coordinates (not screen pixels)
- Hardware-accelerated transforms
- Momentum scrolling
- Smart grid with snapping
- Multi-selection with lasso

### 2. EnterpriseToolbar

Mural-like top toolbar with tool groups.

```tsx
import { EnterpriseToolbar, ToolType } from './components/EnterpriseToolbar';

const [activeTool, setActiveTool] = useState<ToolType>('select');

<EnterpriseToolbar
  activeTool={activeTool}
  onToolChange={handleToolChange}
  zoom={zoom}
  onZoomIn={() => canvasRef.current?.zoomIn()}
  onZoomOut={() => canvasRef.current?.zoomOut()}
  onResetView={() => canvasRef.current?.resetView()}
  onFitToContent={() => canvasRef.current?.fitToContent()}
  gridEnabled={gridEnabled}
  onToggleGrid={() => setGridEnabled(!gridEnabled)}
  gridSnap={gridSnap}
  onToggleSnap={() => setGridSnap(!gridSnap)}
  canUndo={canUndo}
  canRedo={canRedo}
  onUndo={handleUndo}
  onRedo={handleRedo}
  selectedCount={selectedNodeIds.length}
  onAlignLeft={handleAlignLeft}
  onAlignCenter={handleAlignCenter}
  // ... other alignment handlers
  onDeleteSelected={handleDeleteSelected}
  onDuplicateSelected={handleDuplicateSelected}
  participantCount={participantCount}
  boardName={board.name}
  onBoardNameChange={(name) => onUpdateBoard({ name })}
/>
```

### 3. EnhancedConnector

Advanced connector with draggable control points.

```tsx
import { EnhancedConnector } from './components/EnhancedConnector';
import { nodeToConnectorPath } from './lib/connector-engine';

// Convert VisualNode to ConnectorPath
const connectorPath = nodeToConnectorPath(node, fromNode, toNode);

<EnhancedConnector
  id={node.id}
  path={connectorPath}
  isSelected={selectedNodeIds.includes(node.id)}
  fromNode={fromNode}
  toNode={toNode}
  zoom={zoom}
  onUpdate={(newPath) => {
    // Update node with new waypoints
    onUpdateNode({
      ...node,
      connectorWaypoints: newPath.waypoints
    });
  }}
  onDelete={() => onDeleteNode(node.id)}
  onSelect={() => onSelectNode(node.id)}
/>
```

**Key Features:**
- Double-click path to add waypoints
- Drag waypoints to reposition
- Multiple routing styles (straight, curved, orthogonal, stepped)
- Context menu for options
- Label editing

### 4. MobileToolbar

Bottom sheet toolbar for mobile devices.

```tsx
import { MobileToolbar } from './components/MobileToolbar';
import { useDeviceType } from './hooks/useDeviceType';

const { isMobile } = useDeviceType();
const [showMobileSheet, setShowMobileSheet] = useState(false);

{isMobile && (
  <MobileToolbar
    activeTool={activeTool}
    onToolChange={handleToolChange}
    zoom={zoom}
    onZoomIn={handleZoomIn}
    onZoomOut={handleZoomOut}
    canUndo={canUndo}
    canRedo={canRedo}
    onUndo={handleUndo}
    onRedo={handleRedo}
    selectedCount={selectedNodeIds.length}
    onDeleteSelected={handleDeleteSelected}
    onDuplicateSelected={handleDuplicateSelected}
    isOpen={showMobileSheet}
    onClose={() => setShowMobileSheet(false)}
  />
)}
```

### 5. FloatingPropertyPanel

Draggable property panel for selected elements.

```tsx
import { FloatingPropertyPanel } from './components/FloatingPropertyPanel';

<FloatingPropertyPanel
  node={selectedNode}
  isOpen={selectedNodeIds.length === 1}
  onClose={() => onSelectNodes([])}
  onUpdate={handleUpdateNode}
  onDelete={handleDeleteNode}
  onDuplicate={handleDuplicateNode}
  onBringToFront={handleBringToFront}
  onSendToBack={handleSendToBack}
  onLockToggle={handleLockToggle}
/>
```

## Integration Steps

### Step 1: Update Type Definitions

Update `src/types/board.ts` to include new properties:

```typescript
export interface VisualNode {
  // ... existing properties
  
  // Enhanced connector properties
  connectorWaypoints?: Waypoint[];
  connectorRouting?: ConnectorRoutingStyle;
  connectorArrowStart?: boolean;
  connectorArrowEnd?: boolean;
  
  // Text formatting
  textAlign?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
}
```

### Step 2: Replace InfiniteCanvas with EnterpriseCanvas

In your MeetingView component:

```tsx
// Replace this:
<InfiniteCanvas
  board={board}
  onUpdateBoard={onUpdateBoard}
  // ... other props
/>

// With this:
<EnterpriseCanvas
  ref={canvasRef}
  nodes={board.visualNodes}
  selectedNodeIds={selectedNodeIds}
  onSelectNodes={handleSelectNodes}
  onUpdateNodes={handleUpdateNodes}
  onDeleteNodes={handleDeleteNodes}
  onCanvasClick={handleCanvasClick}
  gridEnabled={gridEnabled}
  gridSnap={gridSnap}
>
  {/* Render connectors */}
  {connectors.map(node => (
    <EnhancedConnector
      key={node.id}
      id={node.id}
      path={nodeToConnectorPath(node, fromNode, toNode)}
      isSelected={selectedNodeIds.includes(node.id)}
      fromNode={fromNode}
      toNode={toNode}
      zoom={zoom}
      onUpdate={(newPath) => handleUpdateConnector(node.id, newPath)}
      onDelete={() => handleDeleteNode(node.id)}
      onSelect={() => handleSelectNode(node.id)}
    />
  ))}
  
  {/* Render other nodes */}
  {nonConnectors.map(node => (
    <NodeComponent
      key={node.id}
      node={node}
      isSelected={selectedNodeIds.includes(node.id)}
      // ... other props
    />
  ))}
</EnterpriseCanvas>
```

### Step 3: Add Enterprise Toolbar

```tsx
<EnterpriseToolbar
  activeTool={activeTool}
  onToolChange={handleToolChange}
  zoom={zoom}
  onZoomIn={() => canvasRef.current?.zoomIn()}
  onZoomOut={() => canvasRef.current?.zoomOut()}
  onResetView={() => canvasRef.current?.resetView()}
  onFitToContent={() => canvasRef.current?.fitToContent()}
  // ... other props
/>
```

### Step 4: Add Mobile Support

```tsx
import { useDeviceType } from './hooks/useDeviceType';

const { isMobile } = useDeviceType();

// In your render:
{isMobile ? (
  <MobileToolbar
    activeTool={activeTool}
    onToolChange={handleToolChange}
    // ... other props
  />
) : (
  <EnterpriseToolbar
    activeTool={activeTool}
    onToolChange={handleToolChange}
    // ... other props
  />
)}
```

### Step 5: Add Property Panel

```tsx
{selectedNodeIds.length === 1 && (
  <FloatingPropertyPanel
    node={selectedNode}
    isOpen={true}
    onClose={() => setSelectedNodeIds([])}
    onUpdate={handleUpdateNode}
    // ... other handlers
  />
)}
```

## Keyboard Shortcuts

The enterprise canvas supports these keyboard shortcuts:

| Key | Action |
|-----|--------|
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
| `Ctrl/Cmd` + `D` | Duplicate |
| `Delete` / `Backspace` | Delete selected |
| `Ctrl/Cmd` + `Z` | Undo |
| `Ctrl/Cmd` + `Y` | Redo |

## Touch Gestures

### Mobile

- **Single finger drag**: Pan canvas
- **Two finger pinch**: Zoom in/out
- **Two finger rotate**: Rotate (future feature)
- **Long press**: Context menu

### Desktop (with trackpad)

- **Two finger scroll**: Pan canvas
- **Pinch gesture**: Zoom in/out

## Migration Notes

### From Old Connector System

Old connectors used simple `connectorControlPoint` property:

```typescript
// Old
connectorControlPoint?: { x: number; y: number };

// New
connectorWaypoints?: Waypoint[];
connectorRouting?: 'straight' | 'curved' | 'orthogonal' | 'stepped';
```

Migration:

```typescript
// Convert old control point to waypoints
function migrateConnector(node: VisualNode): Waypoint[] {
  if (node.connectorWaypoints) {
    return node.connectorWaypoints;
  }
  
  if (node.connectorControlPoint) {
    return [
      { x: startX, y: startY, id: 'start', type: 'start' },
      { x: node.connectorControlPoint.x, y: node.connectorControlPoint.y, id: 'control', type: 'control' },
      { x: endX, y: endY, id: 'end', type: 'end' }
    ];
  }
  
  // Default straight line
  return [
    { x: startX, y: startY, id: 'start', type: 'start' },
    { x: endX, y: endY, id: 'end', type: 'end' }
  ];
}
```

## Performance Tips

1. **Virtualization**: For boards with 100+ elements, consider virtualizing nodes outside the viewport
2. **Memoization**: Use `useMemo` for expensive calculations like connector paths
3. **Debouncing**: Debounce rapid updates like dragging
4. **Canvas Size**: The EnterpriseCanvas handles large bounds efficiently with world-space coordinates

## Example: Full Integration

See `src/components/EnterpriseMeetingView.tsx` for a complete example of integrating all enterprise components.

## Troubleshooting

### Connectors not rendering
- Ensure `connectorFrom` and `connectorTo` reference valid node IDs
- Check that waypoints have valid coordinates

### Touch gestures not working
- Verify `touch-action: none` is set on the canvas container
- Check browser console for touch event errors

### Performance issues
- Reduce number of visible connectors
- Disable grid dots for large boards
- Use `will-change: transform` sparingly

## Future Enhancements

Planned features for future releases:

1. **Auto-routing**: Automatic obstacle avoidance for connectors
2. **Grouping**: Visual grouping with expand/collapse
3. **Layers**: Layer management panel
4. **Templates**: Template library with previews
5. **Comments**: Threaded comments system
6. **Voting**: Voting and reaction system
7. **Export**: Export to PDF, PNG, SVG
