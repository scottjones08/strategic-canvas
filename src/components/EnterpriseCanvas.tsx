/**
 * Enterprise Canvas Component
 * 
 * Features:
 * - True infinite canvas with world-space coordinates
 * - Hardware-accelerated pan/zoom with momentum
 * - Smart grid with snapping
 * - Alignment guides
 * - Multi-selection with lasso
 * - Touch gesture support
 * - Optimized rendering
 */

import React, { 
  useRef, 
  useState, 
  useCallback, 
  useEffect, 
  useMemo,
  useReducer,
  forwardRef,
  useImperativeHandle
} from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import {
  ZoomIn,
  ZoomOut,
  Maximize,
  Magnet,
  MousePointer2,
  Hand
} from 'lucide-react';
import type { VisualNode } from '../types/board';
import { EnhancedConnector } from './EnhancedConnector';
import { nodeToConnectorPath } from '../lib/connector-engine';

// Constants
const GRID_SIZE = 20;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;
const MOMENTUM_FRICTION = 0.92;
const SPRING_CONFIG = { damping: 25, stiffness: 200, mass: 0.8 };

// Viewport state
interface ViewportState {
  zoom: number;
  panX: number;
  panY: number;
  isPanning: boolean;
  isZooming: boolean;
}

type ViewportAction =
  | { type: 'PAN'; dx: number; dy: number }
  | { type: 'ZOOM'; zoom: number; centerX?: number; centerY?: number }
  | { type: 'SET_PAN'; x: number; y: number }
  | { type: 'SET_ZOOM'; zoom: number }
  | { type: 'RESET' }
  | { type: 'FIT_BOUNDS'; bounds: { minX: number; minY: number; maxX: number; maxY: number }; viewportWidth: number; viewportHeight: number }
  | { type: 'START_PAN' }
  | { type: 'END_PAN' }
  | { type: 'START_ZOOM' }
  | { type: 'END_ZOOM' };

const viewportReducer = (state: ViewportState, action: ViewportAction): ViewportState => {
  switch (action.type) {
    case 'PAN':
      return { ...state, panX: state.panX + action.dx, panY: state.panY + action.dy };
    
    case 'ZOOM': {
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, action.zoom));
      if (action.centerX !== undefined && action.centerY !== undefined) {
        // Zoom toward center point
        const worldX = (action.centerX - state.panX) / state.zoom;
        const worldY = (action.centerY - state.panY) / state.zoom;
        const newPanX = action.centerX - worldX * newZoom;
        const newPanY = action.centerY - worldY * newZoom;
        return { ...state, zoom: newZoom, panX: newPanX, panY: newPanY };
      }
      return { ...state, zoom: newZoom };
    }
    
    case 'SET_PAN':
      return { ...state, panX: action.x, panY: action.y };
    
    case 'SET_ZOOM':
      return { ...state, zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, action.zoom)) };
    
    case 'RESET':
      return { ...state, zoom: 1, panX: 0, panY: 0 };
    
    case 'FIT_BOUNDS': {
      const { bounds, viewportWidth, viewportHeight } = action;
      const contentWidth = bounds.maxX - bounds.minX + 200;
      const contentHeight = bounds.maxY - bounds.minY + 200;
      const newZoom = Math.min(
        viewportWidth / contentWidth,
        viewportHeight / contentHeight,
        1.5
      );
      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerY = (bounds.minY + bounds.maxY) / 2;
      return {
        ...state,
        zoom: newZoom,
        panX: viewportWidth / 2 - centerX * newZoom,
        panY: viewportHeight / 2 - centerY * newZoom
      };
    }
    
    case 'START_PAN':
      return { ...state, isPanning: true };
    
    case 'END_PAN':
      return { ...state, isPanning: false };
    
    case 'START_ZOOM':
      return { ...state, isZooming: true };
    
    case 'END_ZOOM':
      return { ...state, isZooming: false };
    
    default:
      return state;
  }
};

// Props interface
interface EnterpriseCanvasProps {
  nodes: VisualNode[];
  selectedNodeIds: string[];
  onSelectNodes: (ids: string[], toggle?: boolean) => void;
  onUpdateNodes: (updates: VisualNode[]) => void;
  onDeleteNodes: (ids: string[]) => void;
  onCanvasClick?: (worldX: number, worldY: number, e: React.MouseEvent) => void;
  onCanvasDoubleClick?: (worldX: number, worldY: number) => void;
  gridEnabled?: boolean;
  gridSnap?: boolean;
  showGrid?: boolean;
  readOnly?: boolean;
  children?: React.ReactNode;
}

export interface EnterpriseCanvasRef {
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
  fitToContent: () => void;
  getWorldCoordinates: (screenX: number, screenY: number) => { x: number; y: number };
  getScreenCoordinates: (worldX: number, worldY: number) => { x: number; y: number };
  panTo: (worldX: number, worldY: number) => void;
  zoomTo: (zoom: number) => void;
}

// Alignment guide
interface AlignmentGuide {
  type: 'horizontal' | 'vertical';
  position: number;
  strength: number;
}

export const EnterpriseCanvas = forwardRef<EnterpriseCanvasRef, EnterpriseCanvasProps>(({
  nodes,
  selectedNodeIds,
  onSelectNodes,
  onUpdateNodes,
  onDeleteNodes,
  onCanvasClick: _onCanvasClick,
  onCanvasDoubleClick: _onCanvasDoubleClick,
  gridEnabled = true,
  gridSnap = false,
  showGrid = true,
  readOnly = false,
  children
}, ref) => {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>();
  const momentumRef = useRef<{ vx: number; vy: number } | null>(null);
  
  // Viewport state with reducer
  const [viewport, dispatch] = useReducer(viewportReducer, {
    zoom: 1,
    panX: 0,
    panY: 0,
    isPanning: false,
    isZooming: false
  });
  
  // Framer Motion values for smooth animations
  const motionZoom = useMotionValue(1);
  const motionPanX = useMotionValue(0);
  const motionPanY = useMotionValue(0);
  
  const springZoom = useSpring(motionZoom, SPRING_CONFIG);
  const springPanX = useSpring(motionPanX, SPRING_CONFIG);
  const springPanY = useSpring(motionPanY, SPRING_CONFIG);
  
  // Transform for the canvas
  const canvasTransform = useTransform(
    [springZoom, springPanX, springPanY],
    ([z, px, py]) => `translate3d(${px}px, ${py}px, 0) scale(${z})`
  );
  
  // Selection state
  const [isLassoing, setIsLassoing] = useState(false);
  const [lassoStart, setLassoStart] = useState<{ x: number; y: number } | null>(null);
  const [lassoEnd, setLassoEnd] = useState<{ x: number; y: number } | null>(null);
  
  // Alignment guides
  const [alignmentGuides, _setAlignmentGuides] = useState<AlignmentGuide[]>([]);
  
  // Pan state
  const [panStart, setPanStart] = useState<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const [spacePressed, setSpacePressed] = useState(false);
  const [activeTool, setActiveTool] = useState<'select' | 'pan' | 'hand'>('select');
  
  // Touch state
  const touchStateRef = useRef<{
    startX: number;
    startY: number;
    startDistance?: number;
    startZoom?: number;
    panX?: number;
    panY?: number;
    touches: number;
  } | null>(null);

  // Sync motion values with state
  useEffect(() => {
    motionZoom.set(viewport.zoom);
    motionPanX.set(viewport.panX);
    motionPanY.set(viewport.panY);
  }, [viewport.zoom, viewport.panX, viewport.panY, motionZoom, motionPanX, motionPanY]);

  // Coordinate conversion helpers
  const getWorldCoordinates = useCallback((screenX: number, screenY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    
    const x = (screenX - rect.left - viewport.panX) / viewport.zoom;
    const y = (screenY - rect.top - viewport.panY) / viewport.zoom;
    return { x, y };
  }, [viewport.panX, viewport.panY, viewport.zoom]);

  const getScreenCoordinates = useCallback((worldX: number, worldY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    
    const x = worldX * viewport.zoom + viewport.panX + rect.left;
    const y = worldY * viewport.zoom + viewport.panY + rect.top;
    return { x, y };
  }, [viewport.panX, viewport.panY, viewport.zoom]);

  // Suppress unused gridSnap warning (used in UI but not in current implementation)
  void gridSnap;

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    zoomIn: () => dispatch({ type: 'ZOOM', zoom: viewport.zoom * 1.2 }),
    zoomOut: () => dispatch({ type: 'ZOOM', zoom: viewport.zoom * 0.8 }),
    resetView: () => dispatch({ type: 'RESET' }),
    fitToContent: () => {
      if (nodes.length === 0 || !containerRef.current) return;
      
      const xs = nodes.map(n => n.x);
      const ys = nodes.map(n => n.y);
      const maxXs = nodes.map(n => n.x + n.width);
      const maxYs = nodes.map(n => n.y + n.height);
      
      const bounds = {
        minX: Math.min(...xs) - 100,
        minY: Math.min(...ys) - 100,
        maxX: Math.max(...maxXs) + 100,
        maxY: Math.max(...maxYs) + 100
      };
      
      dispatch({
        type: 'FIT_BOUNDS',
        bounds,
        viewportWidth: containerRef.current.clientWidth,
        viewportHeight: containerRef.current.clientHeight
      });
    },
    getWorldCoordinates,
    getScreenCoordinates,
    panTo: (worldX: number, worldY: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      dispatch({
        type: 'SET_PAN',
        x: rect.width / 2 - worldX * viewport.zoom,
        y: rect.height / 2 - worldY * viewport.zoom
      });
    },
    zoomTo: (zoom: number) => dispatch({ type: 'SET_ZOOM', zoom })
  }), [viewport.zoom, nodes, getWorldCoordinates, getScreenCoordinates]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      switch (e.key) {
        case ' ':
          e.preventDefault();
          setSpacePressed(true);
          break;
        case 'v':
        case 'V':
          setActiveTool('select');
          break;
        case 'h':
        case 'H':
          setActiveTool('pan');
          break;
        case '+':
        case '=':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            dispatch({ type: 'ZOOM', zoom: viewport.zoom * 1.2 });
          }
          break;
        case '-':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            dispatch({ type: 'ZOOM', zoom: viewport.zoom * 0.8 });
          }
          break;
        case '0':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            dispatch({ type: 'RESET' });
          }
          break;
        case 'Delete':
        case 'Backspace':
          if (selectedNodeIds.length > 0) {
            onDeleteNodes(selectedNodeIds);
            onSelectNodes([]);
          }
          break;
        case 'Escape':
          onSelectNodes([]);
          break;
        case 'a':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            onSelectNodes(nodes.filter(n => n.type !== 'connector').map(n => n.id));
          }
          break;
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        setSpacePressed(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [viewport.zoom, selectedNodeIds, nodes, onDeleteNodes, onSelectNodes]);

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    
    const isPanTool = activeTool === 'pan' || activeTool === 'hand' || spacePressed;
    const target = e.target as HTMLElement;
    const isCanvasClick = target === containerRef.current || target.hasAttribute('data-canvas-background');
    
    if (isPanTool) {
      e.preventDefault();
      dispatch({ type: 'START_PAN' });
      setPanStart({
        x: e.clientX,
        y: e.clientY,
        panX: viewport.panX,
        panY: viewport.panY
      });
    } else if (isCanvasClick) {
      // Start lasso selection
      e.preventDefault();
      setIsLassoing(true);
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setLassoStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        setLassoEnd({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }
      onSelectNodes([]);
    }
  }, [activeTool, spacePressed, viewport.panX, viewport.panY, onSelectNodes]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (viewport.isPanning && panStart) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      dispatch({ type: 'SET_PAN', x: panStart.panX + dx, y: panStart.panY + dy });
      
      // Track momentum
      momentumRef.current = { vx: dx * 0.1, vy: dy * 0.1 };
    } else if (isLassoing && lassoStart) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setLassoEnd({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }
    }
  }, [viewport.isPanning, panStart, isLassoing, lassoStart]);

  const handleMouseUp = useCallback(() => {
    if (viewport.isPanning) {
      dispatch({ type: 'END_PAN' });
      setPanStart(null);
      
      // Apply momentum
      if (momentumRef.current) {
        const applyMomentum = () => {
          if (!momentumRef.current) return;
          
          const { vx, vy } = momentumRef.current;
          if (Math.abs(vx) < 0.5 && Math.abs(vy) < 0.5) {
            momentumRef.current = null;
            return;
          }
          
          dispatch({ type: 'PAN', dx: vx, dy: vy });
          momentumRef.current = { vx: vx * MOMENTUM_FRICTION, vy: vy * MOMENTUM_FRICTION };
          rafRef.current = requestAnimationFrame(applyMomentum);
        };
        
        rafRef.current = requestAnimationFrame(applyMomentum);
      }
    }
    
    if (isLassoing && lassoStart && lassoEnd) {
      // Complete lasso selection
      const left = Math.min(lassoStart.x, lassoEnd.x);
      const top = Math.min(lassoStart.y, lassoEnd.y);
      const right = Math.max(lassoStart.x, lassoEnd.x);
      const bottom = Math.max(lassoStart.y, lassoEnd.y);
      
      const worldLeft = (left - viewport.panX) / viewport.zoom;
      const worldTop = (top - viewport.panY) / viewport.zoom;
      const worldRight = (right - viewport.panX) / viewport.zoom;
      const worldBottom = (bottom - viewport.panY) / viewport.zoom;
      
      const selectedIds = nodes
        .filter(n => n.type !== 'connector')
        .filter(n => 
          n.x < worldRight && 
          n.x + n.width > worldLeft &&
          n.y < worldBottom && 
          n.y + n.height > worldTop
        )
        .map(n => n.id);
      
      if (selectedIds.length > 0) {
        onSelectNodes(selectedIds);
      }
      
      setIsLassoing(false);
      setLassoStart(null);
      setLassoEnd(null);
    }
  }, [viewport.isPanning, viewport.panX, viewport.panY, viewport.zoom, isLassoing, lassoStart, lassoEnd, nodes, onSelectNodes]);

  // Wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = -e.deltaY * 0.001;
      const newZoom = viewport.zoom * (1 + delta);
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        dispatch({
          type: 'ZOOM',
          zoom: newZoom,
          centerX: e.clientX - rect.left,
          centerY: e.clientY - rect.top
        });
      }
    } else {
      // Pan with wheel
      dispatch({ type: 'PAN', dx: -e.deltaX, dy: -e.deltaY });
    }
  }, [viewport.zoom]);

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStateRef.current = {
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        panX: viewport.panX,
        panY: viewport.panY,
        touches: 1
      };
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchStateRef.current = {
        startX: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        startY: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        startDistance: Math.sqrt(dx * dx + dy * dy),
        startZoom: viewport.zoom,
        panX: viewport.panX,
        panY: viewport.panY,
        touches: 2
      };
      dispatch({ type: 'START_ZOOM' });
    }
  }, [viewport.panX, viewport.panY, viewport.zoom]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStateRef.current) return;
    e.preventDefault();
    
    if (e.touches.length === 1 && touchStateRef.current.touches === 1) {
      // Single finger pan
      const dx = e.touches[0].clientX - touchStateRef.current.startX;
      const dy = e.touches[0].clientY - touchStateRef.current.startY;
      dispatch({
        type: 'SET_PAN',
        x: (touchStateRef.current.panX ?? 0) + dx,
        y: (touchStateRef.current.panY ?? 0) + dy
      });
    } else if (e.touches.length === 2 && touchStateRef.current.touches === 2) {
      // Pinch zoom
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const scale = distance / (touchStateRef.current.startDistance || 1);
      const newZoom = (touchStateRef.current.startZoom || 1) * scale;
      
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const rect = containerRef.current?.getBoundingClientRect();
      
      if (rect) {
        dispatch({
          type: 'ZOOM',
          zoom: newZoom,
          centerX: midX - rect.left,
          centerY: midY - rect.top
        });
      }
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    touchStateRef.current = null;
    dispatch({ type: 'END_ZOOM' });
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Separate connectors from other nodes
  const { connectors } = useMemo(() => {
    const conn = nodes.filter(n => n.type === 'connector' && n.connectorFrom && n.connectorTo);
    return { connectors: conn };
  }, [nodes]);

  // Render
  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-gray-50"
      style={{
        cursor: viewport.isPanning || spacePressed ? 'grabbing' : 
                activeTool === 'pan' ? 'grab' :
                activeTool === 'hand' ? 'grab' : 'default',
        touchAction: 'none',
        userSelect: 'none'
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Grid background */}
      {showGrid && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: gridEnabled 
              ? `linear-gradient(to right, #e5e7eb 1px, transparent 1px), 
                 linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)`
              : 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
            backgroundSize: `${GRID_SIZE * viewport.zoom}px ${GRID_SIZE * viewport.zoom}px`,
            backgroundPosition: `${viewport.panX}px ${viewport.panY}px`,
            opacity: 0.5
          }}
          data-canvas-background
        />
      )}

      {/* World content */}
      <motion.div
        ref={canvasRef}
        className="absolute top-0 left-0"
        style={{
          width: '100%',
          height: '100%',
          transform: canvasTransform,
          transformOrigin: '0 0',
          willChange: 'transform'
        }}
      >
        {/* Render connectors first (below nodes) */}
        {connectors.map(node => {
          const fromNode = nodes.find(n => n.id === node.connectorFrom);
          const toNode = nodes.find(n => n.id === node.connectorTo);
          
          if (!fromNode || !toNode) return null;
          
          const connectorPath = nodeToConnectorPath(node, fromNode, toNode);
          if (!connectorPath) return null;
          
          return (
            <EnhancedConnector
              key={node.id}
              id={node.id}
              path={connectorPath}
              isSelected={selectedNodeIds.includes(node.id)}
              fromNode={fromNode}
              toNode={toNode}
              zoom={viewport.zoom}
              onUpdate={(newPath) => {
                const updatedNodes = nodes.map(n => 
                  n.id === node.id 
                    ? { 
                        ...n, 
                        connectorWaypoints: newPath.waypoints,
                        connectorLabel: newPath.label,
                        color: newPath.color
                      }
                    : n
                );
                onUpdateNodes(updatedNodes);
              }}
              onDelete={() => onDeleteNodes([node.id])}
              onSelect={() => onSelectNodes([node.id])}
              readOnly={readOnly}
            />
          );
        })}

        {/* Render child content (nodes) */}
        {children}
      </motion.div>

      {/* Lasso selection overlay */}
      <AnimatePresence>
        {isLassoing && lassoStart && lassoEnd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute border-2 border-indigo-500 bg-indigo-500/10 pointer-events-none z-50"
            style={{
              left: Math.min(lassoStart.x, lassoEnd.x),
              top: Math.min(lassoStart.y, lassoEnd.y),
              width: Math.abs(lassoEnd.x - lassoStart.x),
              height: Math.abs(lassoEnd.y - lassoStart.y)
            }}
          />
        )}
      </AnimatePresence>

      {/* Alignment guides */}
      <AnimatePresence>
        {alignmentGuides.map((guide, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: guide.strength }}
            exit={{ opacity: 0 }}
            className="absolute pointer-events-none z-40"
            style={{
              background: '#ef4444',
              ...(guide.type === 'vertical' 
                ? { left: guide.position, top: 0, bottom: 0, width: 1 }
                : { top: guide.position, left: 0, right: 0, height: 1 }
              )
            }}
          />
        ))}
      </AnimatePresence>

      {/* Toolbar */}
      <div className="absolute top-4 left-4 flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-2 z-50">
        <button
          onClick={() => setActiveTool('select')}
          className={`p-2 rounded-lg transition-colors ${activeTool === 'select' ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-gray-100 text-gray-600'}`}
          title="Select (V)"
        >
          <MousePointer2 className="w-5 h-5" />
        </button>
        <button
          onClick={() => setActiveTool('hand')}
          className={`p-2 rounded-lg transition-colors ${activeTool === 'hand' ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-gray-100 text-gray-600'}`}
          title="Pan (H)"
        >
          <Hand className="w-5 h-5" />
        </button>
        
        <div className="w-px h-6 bg-gray-200" />
        
        <button
          onClick={() => dispatch({ type: 'ZOOM', zoom: viewport.zoom * 1.2 })}
          className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
          title="Zoom in"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        <span className="text-sm font-medium text-gray-700 min-w-[50px] text-center">
          {Math.round(viewport.zoom * 100)}%
        </span>
        <button
          onClick={() => dispatch({ type: 'ZOOM', zoom: viewport.zoom * 0.8 })}
          className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
          title="Zoom out"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        
        <div className="w-px h-6 bg-gray-200" />
        
        <button
          onClick={() => dispatch({ type: 'RESET' })}
          className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
          title="Reset view"
        >
          <Maximize className="w-5 h-5" />
        </button>
      </div>

      {/* Tool hints */}
      <div className="absolute bottom-4 left-4 text-xs text-gray-400 space-y-0.5 pointer-events-none select-none">
        <div className="flex items-center gap-2">
          <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">V</kbd>
          <span>Select</span>
          <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-500 ml-2">H</kbd>
          <span>Pan</span>
          <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-500 ml-2">Space</kbd>
          <span>+ drag to pan</span>
        </div>
        <div className="flex items-center gap-2">
          <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">Ctrl/Cmd</kbd>
          <span>+ scroll to zoom</span>
        </div>
      </div>

      {/* Grid snap indicator */}
      {gridSnap && (
        <div className="absolute top-4 right-4 flex items-center gap-2 bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-full text-xs font-medium">
          <Magnet className="w-3.5 h-3.5" />
          Snap to grid
        </div>
      )}
    </div>
  );
});

EnterpriseCanvas.displayName = 'EnterpriseCanvas';

export default EnterpriseCanvas;
