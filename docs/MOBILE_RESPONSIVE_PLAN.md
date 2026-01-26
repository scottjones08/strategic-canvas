# Strategic Canvas Mobile & Tablet Responsiveness Plan

## Research Summary: How Mural, Miro & FigJam Handle Mobile

Based on research of leading whiteboard collaboration tools:

### Key Patterns from Industry Leaders

#### 1. **Touch-First Canvas Interaction**
- **Pinch-to-zoom** for canvas navigation (instead of mouse wheel)
- **Two-finger pan** for moving around the canvas
- **Long-press** to access context menus (instead of right-click)
- **Double-tap** to zoom to fit or create new elements
- **Single tap** to select, **drag** to move

#### 2. **Adaptive Toolbar Design**
- **Bottom toolbar** on mobile (thumb-reachable zone)
- **Collapsible/expandable** tool panels
- **Floating action button (FAB)** for primary actions
- **Gesture-based tool switching** (swipe between tools)
- Tools grouped into **expandable menus** to save space

#### 3. **Simplified Mobile Feature Set**
Mural & Miro focus mobile apps on:
- **Viewing and light editing** (not full creation)
- **Adding stickies/comments** quickly
- **Voting and reactions** during sessions
- **Following facilitator** view
- **Camera capture** to add photos directly

#### 4. **Responsive Breakpoints**
- **Desktop**: Full toolbar, side panels, minimap visible
- **Tablet (768px-1024px)**: Collapsible panels, simplified toolbar
- **Mobile (<768px)**: Bottom nav, FAB, minimal chrome

#### 5. **Performance Optimizations for Mobile**
- **Lazy loading** of off-screen elements
- **Reduced visual fidelity** on mobile (simpler shadows, fewer animations)
- **Virtual scrolling** for large boards
- **Progressive rendering** based on zoom level

---

## Implementation Plan for Strategic Canvas

### Phase 1: Touch Support & Basic Responsiveness

#### 1.1 Add Touch Event Handlers
```typescript
// Canvas touch events
- touchstart → begin pan/zoom/selection
- touchmove → continue gesture
- touchend → complete action
- Pinch gesture detection for zoom
- Two-finger pan detection
```

#### 1.2 Responsive CSS Breakpoints
```css
/* Tablet */
@media (max-width: 1024px) {
  .sidebar { width: 280px; }
  .toolbar { padding: 0.5rem; }
}

/* Mobile */
@media (max-width: 768px) {
  .sidebar { display: none; } /* Use bottom sheet instead */
  .toolbar { position: fixed; bottom: 0; }
  .header { height: 48px; }
}

/* Small mobile */
@media (max-width: 480px) {
  .node-controls { scale: 1.2; } /* Larger touch targets */
}
```

#### 1.3 Touch-Friendly Hit Areas
- Minimum 44x44px touch targets (Apple HIG)
- Increase resize handles size on touch devices
- Add padding to interactive elements

### Phase 2: Mobile-Optimized Toolbar

#### 2.1 Bottom Navigation Bar (Mobile)
```
┌─────────────────────────────────────────┐
│                Canvas                    │
│                                         │
│                                         │
├─────────────────────────────────────────┤
│  [Sticky] [Shape] [Text] [+] [Menu]     │
└─────────────────────────────────────────┘
```

#### 2.2 Floating Action Button
- Primary action: Add sticky note
- Expand to show: Shape, Text, Connector, Upload

#### 2.3 Collapsible Tool Groups
- "Draw" expands to: Marker, Highlighter, Eraser
- "Shape" expands to: Rectangle, Circle, Triangle, Arrow

### Phase 3: Adaptive Layout System

#### 3.1 Detect Device Type
```typescript
const useDeviceType = () => {
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  
  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      const hasTouch = 'ontouchstart' in window;
      
      if (width < 768 || (hasTouch && width < 1024)) {
        setDevice('mobile');
      } else if (width < 1200 || hasTouch) {
        setDevice('tablet');
      } else {
        setDevice('desktop');
      }
    };
    
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);
  
  return device;
};
```

#### 3.2 Conditional Feature Rendering
```typescript
// Hide complex features on mobile
{device !== 'mobile' && <Minimap />}
{device !== 'mobile' && <VersionHistory />}

// Show mobile-specific UI
{device === 'mobile' && <MobileToolbar />}
{device === 'mobile' && <BottomSheet />}
```

### Phase 4: Mobile-Specific Features

#### 4.1 Camera Integration
- Add photo from camera directly to board
- Scan documents/whiteboards

#### 4.2 Simplified Edit Mode
- Focus mode: Edit one sticky at a time
- Large keyboard-friendly input
- Voice-to-text for adding notes

#### 4.3 Follow Facilitator Mode
- Auto-pan to follow presenter
- Reduced editing controls
- Focus on viewing and reacting

### Phase 5: Performance Optimizations

#### 5.1 Viewport Culling
```typescript
// Only render nodes visible in viewport
const visibleNodes = nodes.filter(node => {
  const nodeRect = getNodeScreenRect(node, zoom, panX, panY);
  return isRectInViewport(nodeRect, viewportRect);
});
```

#### 5.2 Level of Detail (LOD)
```typescript
// Simplify rendering at low zoom levels
if (zoom < 0.5) {
  // Render simplified placeholders
  return <SimplifiedNode />;
}
```

#### 5.3 Debounced Updates
- Throttle position broadcasts on mobile
- Batch visual updates during pan/zoom

---

## File Changes Required

### New Files
1. `src/hooks/useDeviceType.ts` - Device detection hook
2. `src/hooks/useTouchGestures.ts` - Touch gesture handlers
3. `src/components/MobileToolbar.tsx` - Bottom toolbar for mobile
4. `src/components/MobileBottomSheet.tsx` - Slide-up panels
5. `src/components/FloatingActionButton.tsx` - FAB component

### Modified Files
1. `src/App.tsx` - Add responsive layout logic
2. `src/components/VisualCanvas.tsx` - Add touch handlers
3. `src/index.css` - Add responsive breakpoints
4. `tailwind.config.js` - Custom breakpoints if needed

---

## Priority Order

1. **Critical (Do First)**
   - Touch pan/zoom on canvas
   - Responsive toolbar (bottom on mobile)
   - Touch-friendly node selection/movement

2. **High Priority**
   - Collapsible sidebar as bottom sheet
   - Larger touch targets
   - Pinch-to-zoom gesture

3. **Medium Priority**
   - Mobile-specific toolbar layout
   - Simplified edit mode
   - Performance optimizations

4. **Nice to Have**
   - Camera integration
   - Follow facilitator mode
   - Voice input

---

## Testing Checklist

- [ ] iPhone SE (smallest common phone)
- [ ] iPhone 14/15 Pro Max (large phone)
- [ ] iPad Mini (small tablet)
- [ ] iPad Pro 12.9" (large tablet)
- [ ] Android phone (various sizes)
- [ ] Android tablet
- [ ] Touch-enabled laptop (Surface, etc.)

---

## References

- [Apple Human Interface Guidelines - Touch](https://developer.apple.com/design/human-interface-guidelines/gestures)
- [Material Design - Touch Targets](https://m3.material.io/foundations/interaction/states)
- [Mural Mobile App](https://www.mural.co/apps)
- [Miro Mobile App](https://miro.com/apps/)
- [FigJam Guide](https://help.figma.com/hc/en-us/articles/1500004362321)
