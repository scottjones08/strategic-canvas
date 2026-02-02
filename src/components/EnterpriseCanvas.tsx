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
  Grid3X3, 
  Magnet,
  Move,
  MousePointer2,
  Hand
} from 'lucide-react';
import type { VisualNode, Waypoint } from '../types/board';
import type { ConnectorPath } from '../lib/connector-engine';
import { EnhancedConnector } from './EnhancedConnector';
import { nodeToConnectorPath } from '../lib/connector-engine';

// Constants
const GRID_SIZE = 20;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;
const MOMENTUM_FRICTION = 0.92;
const SPRING_CONFIG = { damping: 25, stiffness: 200, mass: 0.8 };
const WHEEL_EASE = 0.2;
const WHEEL_STOP_THRESHOLD = 0.2;

const normalizeWheelDelta = (event: React.WheelEvent) => {
  if (event.deltaMode === 1) {
    return { dx: event.deltaX * 16, dy: event.deltaY * 16 };
  }
  if (event.deltaMode === 2) {
    const height = typeof window !== 'undefined' ? window.innerHeight : 800;
    return { dx: event.deltaX * height, dy: event.deltaY * height };
  }
  return { dx: event.deltaX, dy: event.deltaY };
};

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
  onViewportChange?: (viewport: { zoom: number; panX: number; panY: number }) => void;
  activeTool?: string; // Tool from parent - 'select', 'hand', 'sticky', 'shape', etc.
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
  setPan: (panX: number, panY: number) => void;
  getViewport: () => { zoom: number; panX: number; panY: number; width: number; height: number };
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
  onCanvasClick,
  onCanvasDoubleClick,
  onViewportChange,
  activeTool: parentActiveTool = 'select',
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
  const wheelAnimationRef = useRef<number | null>(null);
  const wheelTargetRef = useRef({ panX: 0, panY: 0, zoom: 1 });
  const wheelCurrentRef = useRef({ panX: 0, panY: 0, zoom: 1 });
  
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

  useEffect(() => {
    wheelCurrentRef.current = { panX: viewport.panX, panY: viewport.panY, zoom: viewport.zoom };
    if (!wheelAnimationRef.current) {
      wheelTargetRef.current = { ...wheelCurrentRef.current };
    }
  }, [viewport.panX, viewport.panY, viewport.zoom]);
  
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
  const [alignmentGuides, setAlignmentGuides] = useState<AlignmentGuide[]>([]);
  
  // Pan state
  const [panStart, setPanStart] = useState<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const [spacePressed, setSpacePressed] = useState(false);
  // Internal tool for canvas-specific tools (select/hand from toolbar in canvas)
  const [internalTool, setInternalTool] = useState<'select' | 'hand'>('select');
  // Effective tool: use parent tool, fall back to internal
  const activeTool = parentActiveTool || internalTool;
  
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

  // Clamp pan values to prevent getting lost in infinite canvas
  const clampPan = useCallback((panX: number, panY: number) => {
    if (!containerRef.current) return { x: panX, y: panY };
    
    const rect = containerRef.current.getBoundingClientRect();
    // Allow some extra space beyond content bounds
    const padding = 2000;
    
    // Get content bounds if there are nodes
    let contentMinX = 0, contentMinY = 0, contentMaxX = 0, contentMaxY = 0;
    if (nodes.length > 0) {
      contentMinX = Math.min(...nodes.map(n => n.x)) - padding;
      contentMinY = Math.min(...nodes.map(n => n.y)) - padding;
      contentMaxX = Math.max(...nodes.map(n => n.x + n.width)) + padding;
      contentMaxY = Math.max(...nodes.map(n => n.y + n.height)) + padding;
    }
    
    // Clamp pan values
    const minPanX = rect.width - contentMaxX * viewport.zoom;
    const maxPanX = -contentMinX * viewport.zoom;
    const minPanY = rect.height - contentMaxY * viewport.zoom;
    const maxPanY = -contentMinY * viewport.zoom;
    
    // Only clamp if zoomed out enough to see beyond content
    const clampedX = viewport.zoom < 0.5 ? Math.max(minPanX, Math.min(maxPanX, panX)) : panX;
    const clampedY = viewport.zoom < 0.5 ? Math.max(minPanY, Math.min(maxPanY, panY)) : panY;
    
    return { x: clampedX, y: clampedY };
  }, [nodes, viewport.zoom]);

  // Sync motion values with state
  useEffect(() => {
    motionZoom.set(viewport.zoom);
    // Clamp pan to prevent getting lost
    const clamped = clampPan(viewport.panX, viewport.panY);
    motionPanX.set(clamped.x);
    motionPanY.set(clamped.y);
  }, [viewport.zoom, viewport.panX, viewport.panY, motionZoom, motionPanX, motionPanY, clampPan]);

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

  // Snap to grid
  const snapToGrid = useCallback((value: number) => {
    if (!gridSnap) return value;
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
  }, [gridSnap]);

  // Calculate alignment guides
  const calculateAlignmentGuides = useCallback((draggingNode: VisualNode, newX: number, newY: number) => {
    const guides: AlignmentGuide[] = [];
    const SNAP_THRESHOLD = 10 / viewport.zoom;
    
    const draggedCenterX = newX + draggingNode.width / 2;
    const draggedCenterY = newY + draggingNode.height / 2;
    const draggedRight = newX + draggingNode.width;
    const draggedBottom = newY + draggingNode.height;
    
    nodes.filter(n => n.id !== draggingNode.id && n.type !== 'connector').forEach(node => {
      const nodeCenterX = node.x + node.width / 2;
      const nodeCenterY = node.y + node.height / 2;
      const nodeRight = node.x + node.width;
      const nodeBottom = node.y + node.height;
      
      // Left edge alignment
      if (Math.abs(newX - node.x) < SNAP_THRESHOLD) {
        guides.push({ 
          type: 'vertical', 
          position: node.x * viewport.zoom + viewport.panX,
          strength: 1 - Math.abs(newX - node.x) / SNAP_THRESHOLD
        });
      }
      // Right edge alignment
      if (Math.abs(draggedRight - nodeRight) < SNAP_THRESHOLD) {
        guides.push({ 
          type: 'vertical', 
          position: (node.x + node.width) * viewport.zoom + viewport.panX,
          strength: 1 - Math.abs(draggedRight - nodeRight) / SNAP_THRESHOLD
        });
      }
      // Center X alignment
      if (Math.abs(draggedCenterX - nodeCenterX) < SNAP_THRESHOLD) {
        guides.push({ 
          type: 'vertical', 
          position: nodeCenterX * viewport.zoom + viewport.panX,
          strength: 1 - Math.abs(draggedCenterX - nodeCenterX) / SNAP_THRESHOLD
        });
      }
      // Top edge alignment
      if (Math.abs(newY - node.y) < SNAP_THRESHOLD) {
        guides.push({ 
          type: 'horizontal', 
          position: node.y * viewport.zoom + viewport.panY,
          strength: 1 - Math.abs(newY - node.y) / SNAP_THRESHOLD
        });
      }
      // Bottom edge alignment
      if (Math.abs(draggedBottom - nodeBottom) < SNAP_THRESHOLD) {
        guides.push({ 
          type: 'horizontal', 
          position: (node.y + node.height) * viewport.zoom + viewport.panY,
          strength: 1 - Math.abs(draggedBottom - nodeBottom) / SNAP_THRESHOLD
        });
      }
      // Center Y alignment
      if (Math.abs(draggedCenterY - nodeCenterY) < SNAP_THRESHOLD) {
        guides.push({ 
          type: 'horizontal', 
          position: nodeCenterY * viewport.zoom + viewport.panY,
          strength: 1 - Math.abs(draggedCenterY - nodeCenterY) / SNAP_THRESHOLD
        });
      }
    });
    
    return guides;
  }, [nodes, viewport.zoom, viewport.panX, viewport.panY]);

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
    setPan: (panX: number, panY: number) => {
      dispatch({ type: 'SET_PAN', x: panX, y: panY });
    },
    getViewport: () => ({
      zoom: viewport.zoom,
      panX: viewport.panX,
      panY: viewport.panY,
      width: containerRef.current?.clientWidth || 0,
      height: containerRef.current?.clientHeight || 0
    }),
    zoomTo: (zoom: number) => dispatch({ type: 'SET_ZOOM', zoom })
  }), [viewport.zoom, viewport.panX, viewport.panY, nodes, getWorldCoordinates, getScreenCoordinates]);
  
  // Notify parent of viewport changes
  useEffect(() => {
    if (onViewportChange) {
      onViewportChange({ zoom: viewport.zoom, panX: viewport.panX, panY: viewport.panY });
    }
  }, [viewport.zoom, viewport.panX, viewport.panY, onViewportChange]);

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
          setInternalTool('select');
          break;
        case 'h':
        case 'H':
          setInternalTool('hand');
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

  const stopWheelMomentum = useCallback(() => {
    if (wheelAnimationRef.current) {
      cancelAnimationFrame(wheelAnimationRef.current);
      wheelAnimationRef.current = null;
    }
    wheelTargetRef.current = { ...wheelCurrentRef.current };
  }, []);

  const startWheelAnimation = useCallback(() => {
    if (wheelAnimationRef.current) return;

    const step = () => {
      const current = wheelCurrentRef.current;
      const target = wheelTargetRef.current;

      const nextPanX = current.panX + (target.panX - current.panX) * WHEEL_EASE;
      const nextPanY = current.panY + (target.panY - current.panY) * WHEEL_EASE;
      const nextZoom = current.zoom + (target.zoom - current.zoom) * WHEEL_EASE;

      const done =
        Math.abs(target.panX - current.panX) < WHEEL_STOP_THRESHOLD &&
        Math.abs(target.panY - current.panY) < WHEEL_STOP_THRESHOLD &&
        Math.abs(target.zoom - current.zoom) < WHEEL_STOP_THRESHOLD;

      if (done) {
        dispatch({ type: 'SET_PAN', x: target.panX, y: target.panY });
        dispatch({ type: 'SET_ZOOM', zoom: target.zoom });
        wheelCurrentRef.current = { ...target };
        wheelAnimationRef.current = null;
        return;
      }

      dispatch({ type: 'SET_PAN', x: nextPanX, y: nextPanY });
      dispatch({ type: 'SET_ZOOM', zoom: nextZoom });
      wheelCurrentRef.current = { panX: nextPanX, panY: nextPanY, zoom: nextZoom };
      wheelAnimationRef.current = requestAnimationFrame(step);
    };

    wheelAnimationRef.current = requestAnimationFrame(step);
  }, []);

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    stopWheelMomentum();
    
    const isPanTool = activeTool === 'pan' || activeTool === 'hand' || spacePressed;
    const target = e.target as HTMLElement;
    // Check if click is on canvas (container, grid background, or world content div)
    const isCanvasClick = target === containerRef.current || 
                          target === canvasRef.current ||
                          target.hasAttribute('data-canvas-background');
    
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
      // Always deselect when clicking on canvas (regardless of tool)
      onSelectNodes([]);
      
      // Call onCanvasClick for tool-based element creation
      if (onCanvasClick) {
        const worldCoords = getWorldCoordinates(e.clientX, e.clientY);
        onCanvasClick(worldCoords.x, worldCoords.y, e);
      }
      // Start lasso selection only if select tool is active
      if (activeTool === 'select') {
        e.preventDefault();
        setIsLassoing(true);
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          setLassoStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
          setLassoEnd({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }
      }
    }
  }, [activeTool, spacePressed, viewport.panX, viewport.panY, onSelectNodes, onCanvasClick, getWorldCoordinates, stopWheelMomentum]);

  // Double-click handler for quick sticky note creation
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isCanvasClick = target === containerRef.current || 
                          target === canvasRef.current ||
                          target.hasAttribute('data-canvas-background');
    
    if (isCanvasClick && onCanvasDoubleClick) {
      const worldCoords = getWorldCoordinates(e.clientX, e.clientY);
      onCanvasDoubleClick(worldCoords.x, worldCoords.y);
    }
  }, [onCanvasDoubleClick, getWorldCoordinates]);

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
    const { dx, dy } = normalizeWheelDelta(e);
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const current = wheelCurrentRef.current;
      const scale = dy > 0 ? 0.9 : 1.1;
      const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current.zoom * scale));
      const pointerX = e.clientX - rect.left;
      const pointerY = e.clientY - rect.top;
      const worldX = (pointerX - current.panX) / current.zoom;
      const worldY = (pointerY - current.panY) / current.zoom;

      wheelTargetRef.current = {
        panX: pointerX - worldX * nextZoom,
        panY: pointerY - worldY * nextZoom,
        zoom: nextZoom
      };
    } else {
      wheelTargetRef.current = {
        ...wheelTargetRef.current,
        panX: wheelTargetRef.current.panX - dx,
        panY: wheelTargetRef.current.panY - dy
      };
    }

    startWheelAnimation();
  }, [startWheelAnimation]);

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    stopWheelMomentum();
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
  }, [viewport.panX, viewport.panY, viewport.zoom, stopWheelMomentum]);

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
  const { connectors, nonConnectors } = useMemo(() => {
    const conn = nodes.filter(n => n.type === 'connector' && n.connectorFrom && n.connectorTo);
    const nonConn = nodes.filter(n => !(n.type === 'connector' && n.connectorFrom && n.connectorTo));
    return { connectors: conn, nonConnectors: nonConn };
  }, [nodes]);

  // Recalculate connector waypoints when connected nodes move
  const getConnectorPath = useCallback((connector: VisualNode): ConnectorPath | null => {
    const fromNode = nodes.find(n => n.id === connector.connectorFrom);
    const toNode = nodes.find(n => n.id === connector.connectorTo);
    
    if (!fromNode || !toNode) return null;
    
    // Import and use nodeToConnectorPath
    return nodeToConnectorPath(connector, fromNode, toNode);
  }, [nodes]);

  // Render
  return (
    <div
      ref={containerRef}
      data-onboarding="canvas"
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
      onDoubleClick={handleDoubleClick}
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
          
          // Always recalculate the path based on current node positions
          const connectorPath = getConnectorPath(node);
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
            className="absolute border-2 border-navy-500 bg-navy-500/10 pointer-events-none z-50"
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
        <div className="absolute top-4 right-4 flex items-center gap-2 bg-navy-50 text-navy-700 px-3 py-1.5 rounded-full text-xs font-medium">
          <Magnet className="w-3.5 h-3.5" />
          Snap to grid
        </div>
      )}
    </div>
  );
});

EnterpriseCanvas.displayName = 'EnterpriseCanvas';

export default EnterpriseCanvas;
