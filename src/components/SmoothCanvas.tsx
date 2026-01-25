/**
 * SmoothCanvas - Hardware-accelerated infinite canvas with buttery smooth panning/zooming
 * 
 * Features:
 * - GPU-accelerated transforms using CSS transform3d
 * - Momentum-based scrolling with inertia
 * - Smooth zoom with easing to cursor position
 * - Touch gesture support (pinch-to-zoom)
 * - RAF-throttled updates for consistent 60fps
 */

import React, { 
  useRef, 
  useState, 
  useCallback, 
  useEffect, 
  forwardRef,
  useImperativeHandle,
  memo,
} from 'react';
import { motion, useSpring, useMotionValue, useTransform } from 'framer-motion';

export interface SmoothCanvasProps {
  children: React.ReactNode;
  width?: number;
  height?: number;
  minZoom?: number;
  maxZoom?: number;
  initialZoom?: number;
  initialPanX?: number;
  initialPanY?: number;
  gridSize?: number;
  showGrid?: boolean;
  gridColor?: string;
  backgroundColor?: string;
  onPanChange?: (panX: number, panY: number) => void;
  onZoomChange?: (zoom: number) => void;
  onCanvasClick?: (canvasX: number, canvasY: number, e: React.MouseEvent) => void;
  onCanvasMouseMove?: (canvasX: number, canvasY: number, e: React.MouseEvent) => void;
  disabled?: boolean;
  className?: string;
}

export interface SmoothCanvasRef {
  panTo: (x: number, y: number, animate?: boolean) => void;
  zoomTo: (zoom: number, centerX?: number, centerY?: number, animate?: boolean) => void;
  fitToView: (bounds: { x: number; y: number; width: number; height: number }, padding?: number) => void;
  getCanvasCoordinates: (screenX: number, screenY: number) => { x: number; y: number };
  getScreenCoordinates: (canvasX: number, canvasY: number) => { x: number; y: number };
  getCurrentTransform: () => { zoom: number; panX: number; panY: number };
}

// Smooth spring config for animations
const SPRING_CONFIG = {
  damping: 30,
  stiffness: 300,
  mass: 0.5,
};

// Momentum config for inertia scrolling
const MOMENTUM_CONFIG = {
  friction: 0.92,
  minVelocity: 0.1,
};

export const SmoothCanvas = memo(forwardRef<SmoothCanvasRef, SmoothCanvasProps>(({
  children,
  width = 10000,
  height = 10000,
  minZoom = 0.1,
  maxZoom = 4,
  initialZoom = 1,
  initialPanX = 0,
  initialPanY = 0,
  gridSize = 20,
  showGrid = true,
  gridColor = 'rgba(0, 0, 0, 0.05)',
  backgroundColor = '#fafafa',
  onPanChange,
  onZoomChange,
  onCanvasClick,
  onCanvasMouseMove,
  disabled = false,
  className = '',
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>();
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const velocityRef = useRef({ x: 0, y: 0 });
  const momentumRafRef = useRef<number>();

  // Framer Motion values for smooth animations
  const motionZoom = useMotionValue(initialZoom);
  const motionPanX = useMotionValue(initialPanX);
  const motionPanY = useMotionValue(initialPanY);

  // Springs for animated transitions
  const springZoom = useSpring(motionZoom, SPRING_CONFIG);
  const springPanX = useSpring(motionPanX, SPRING_CONFIG);
  const springPanY = useSpring(motionPanY, SPRING_CONFIG);

  // State for interaction
  const [isPanning, setIsPanning] = useState(false);
  const [isZooming, setIsZooming] = useState(false);

  // Transform for GPU acceleration
  const transform = useTransform(
    [springZoom, springPanX, springPanY],
    ([z, px, py]) => `translate3d(${px}px, ${py}px, 0) scale(${z})`
  );

  // Convert screen coordinates to canvas coordinates
  const getCanvasCoordinates = useCallback((screenX: number, screenY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };

    const zoom = motionZoom.get();
    const panX = motionPanX.get();
    const panY = motionPanY.get();

    return {
      x: (screenX - rect.left - panX) / zoom,
      y: (screenY - rect.top - panY) / zoom,
    };
  }, [motionZoom, motionPanX, motionPanY]);

  // Convert canvas coordinates to screen coordinates
  const getScreenCoordinates = useCallback((canvasX: number, canvasY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };

    const zoom = motionZoom.get();
    const panX = motionPanX.get();
    const panY = motionPanY.get();

    return {
      x: canvasX * zoom + panX + rect.left,
      y: canvasY * zoom + panY + rect.top,
    };
  }, [motionZoom, motionPanX, motionPanY]);

  // Pan to position
  const panTo = useCallback((x: number, y: number, animate = true) => {
    if (animate) {
      springPanX.set(x);
      springPanY.set(y);
    } else {
      motionPanX.set(x);
      motionPanY.set(y);
    }
    onPanChange?.(x, y);
  }, [springPanX, springPanY, motionPanX, motionPanY, onPanChange]);

  // Zoom to level, optionally centered on a point
  const zoomTo = useCallback((
    targetZoom: number,
    centerX?: number,
    centerY?: number,
    animate = true
  ) => {
    const clampedZoom = Math.min(maxZoom, Math.max(minZoom, targetZoom));
    const rect = containerRef.current?.getBoundingClientRect();
    
    if (rect && centerX !== undefined && centerY !== undefined) {
      // Zoom toward the specified point
      const currentZoom = motionZoom.get();
      const currentPanX = motionPanX.get();
      const currentPanY = motionPanY.get();

      // Calculate canvas point under cursor
      const canvasX = (centerX - rect.left - currentPanX) / currentZoom;
      const canvasY = (centerY - rect.top - currentPanY) / currentZoom;

      // Calculate new pan to keep that point under cursor
      const newPanX = centerX - rect.left - canvasX * clampedZoom;
      const newPanY = centerY - rect.top - canvasY * clampedZoom;

      if (animate) {
        springZoom.set(clampedZoom);
        springPanX.set(newPanX);
        springPanY.set(newPanY);
      } else {
        motionZoom.set(clampedZoom);
        motionPanX.set(newPanX);
        motionPanY.set(newPanY);
      }

      onPanChange?.(newPanX, newPanY);
    } else {
      if (animate) {
        springZoom.set(clampedZoom);
      } else {
        motionZoom.set(clampedZoom);
      }
    }

    onZoomChange?.(clampedZoom);
  }, [springZoom, springPanX, springPanY, motionZoom, motionPanX, motionPanY, minZoom, maxZoom, onZoomChange, onPanChange]);

  // Fit view to bounds
  const fitToView = useCallback((
    bounds: { x: number; y: number; width: number; height: number },
    padding = 50
  ) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const availableWidth = rect.width - padding * 2;
    const availableHeight = rect.height - padding * 2;

    const zoomX = availableWidth / bounds.width;
    const zoomY = availableHeight / bounds.height;
    const targetZoom = Math.min(zoomX, zoomY, maxZoom);

    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;

    const panX = rect.width / 2 - centerX * targetZoom;
    const panY = rect.height / 2 - centerY * targetZoom;

    springZoom.set(targetZoom);
    springPanX.set(panX);
    springPanY.set(panY);

    onZoomChange?.(targetZoom);
    onPanChange?.(panX, panY);
  }, [springZoom, springPanX, springPanY, maxZoom, onZoomChange, onPanChange]);

  // Get current transform values
  const getCurrentTransform = useCallback(() => ({
    zoom: motionZoom.get(),
    panX: motionPanX.get(),
    panY: motionPanY.get(),
  }), [motionZoom, motionPanX, motionPanY]);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    panTo,
    zoomTo,
    fitToView,
    getCanvasCoordinates,
    getScreenCoordinates,
    getCurrentTransform,
  }), [panTo, zoomTo, fitToView, getCanvasCoordinates, getScreenCoordinates, getCurrentTransform]);

  // Apply momentum after pan ends
  const applyMomentum = useCallback(() => {
    const { friction, minVelocity } = MOMENTUM_CONFIG;
    
    const animate = () => {
      velocityRef.current.x *= friction;
      velocityRef.current.y *= friction;

      if (
        Math.abs(velocityRef.current.x) > minVelocity ||
        Math.abs(velocityRef.current.y) > minVelocity
      ) {
        const newPanX = motionPanX.get() + velocityRef.current.x;
        const newPanY = motionPanY.get() + velocityRef.current.y;
        
        motionPanX.set(newPanX);
        motionPanY.set(newPanY);
        onPanChange?.(newPanX, newPanY);
        
        momentumRafRef.current = requestAnimationFrame(animate);
      }
    };

    momentumRafRef.current = requestAnimationFrame(animate);
  }, [motionPanX, motionPanY, onPanChange]);

  // Stop momentum
  const stopMomentum = useCallback(() => {
    if (momentumRafRef.current) {
      cancelAnimationFrame(momentumRafRef.current);
      momentumRafRef.current = undefined;
    }
    velocityRef.current = { x: 0, y: 0 };
  }, []);

  // Mouse down handler
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (disabled || e.button !== 0) return;
    
    // Only pan if clicking on the canvas itself or with space key
    if (e.target !== containerRef.current && !e.shiftKey) return;

    stopMomentum();
    setIsPanning(true);
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
    velocityRef.current = { x: 0, y: 0 };
  }, [disabled, stopMomentum]);

  // Mouse move handler
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // Always report canvas coordinates
    const coords = getCanvasCoordinates(e.clientX, e.clientY);
    onCanvasMouseMove?.(coords.x, coords.y, e);

    if (!isPanning || disabled) return;

    const dx = e.clientX - lastMouseRef.current.x;
    const dy = e.clientY - lastMouseRef.current.y;

    // Track velocity for momentum
    velocityRef.current = { x: dx, y: dy };

    const newPanX = motionPanX.get() + dx;
    const newPanY = motionPanY.get() + dy;

    motionPanX.set(newPanX);
    motionPanY.set(newPanY);
    onPanChange?.(newPanX, newPanY);

    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  }, [isPanning, disabled, motionPanX, motionPanY, onPanChange, getCanvasCoordinates, onCanvasMouseMove]);

  // Mouse up handler
  const handleMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
      
      // Apply momentum if there's velocity
      if (
        Math.abs(velocityRef.current.x) > MOMENTUM_CONFIG.minVelocity ||
        Math.abs(velocityRef.current.y) > MOMENTUM_CONFIG.minVelocity
      ) {
        applyMomentum();
      }
    }
  }, [isPanning, applyMomentum]);

  // Wheel handler for zooming
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (disabled) return;
    e.preventDefault();

    // Determine zoom direction and amount
    const delta = -e.deltaY * 0.001;
    const currentZoom = motionZoom.get();
    const newZoom = Math.min(maxZoom, Math.max(minZoom, currentZoom * (1 + delta)));

    // Zoom toward cursor position
    zoomTo(newZoom, e.clientX, e.clientY, false);
  }, [disabled, motionZoom, minZoom, maxZoom, zoomTo]);

  // Canvas click handler
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (e.target !== containerRef.current) return;
    
    const coords = getCanvasCoordinates(e.clientX, e.clientY);
    onCanvasClick?.(coords.x, coords.y, e);
  }, [getCanvasCoordinates, onCanvasClick]);

  // Touch handlers for mobile
  const touchStartRef = useRef<{ x: number; y: number; distance?: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled) return;

    if (e.touches.length === 1) {
      // Single touch - pan
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
      setIsPanning(true);
    } else if (e.touches.length === 2) {
      // Two fingers - pinch zoom
      const distance = Math.hypot(
        e.touches[1].clientX - e.touches[0].clientX,
        e.touches[1].clientY - e.touches[0].clientY
      );
      touchStartRef.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        distance,
      };
      setIsZooming(true);
    }
  }, [disabled]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (disabled || !touchStartRef.current) return;

    if (e.touches.length === 1 && isPanning) {
      const dx = e.touches[0].clientX - touchStartRef.current.x;
      const dy = e.touches[0].clientY - touchStartRef.current.y;

      const newPanX = motionPanX.get() + dx;
      const newPanY = motionPanY.get() + dy;

      motionPanX.set(newPanX);
      motionPanY.set(newPanY);
      onPanChange?.(newPanX, newPanY);

      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    } else if (e.touches.length === 2 && isZooming && touchStartRef.current.distance) {
      const newDistance = Math.hypot(
        e.touches[1].clientX - e.touches[0].clientX,
        e.touches[1].clientY - e.touches[0].clientY
      );
      const scale = newDistance / touchStartRef.current.distance;
      const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

      const currentZoom = motionZoom.get();
      zoomTo(currentZoom * scale, centerX, centerY, false);

      touchStartRef.current = {
        ...touchStartRef.current,
        distance: newDistance,
      };
    }
  }, [disabled, isPanning, isZooming, motionPanX, motionPanY, motionZoom, zoomTo, onPanChange]);

  const handleTouchEnd = useCallback(() => {
    touchStartRef.current = null;
    setIsPanning(false);
    setIsZooming(false);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (momentumRafRef.current) cancelAnimationFrame(momentumRafRef.current);
    };
  }, []);

  // Grid pattern
  const gridPattern = showGrid ? `
    linear-gradient(${gridColor} 1px, transparent 1px),
    linear-gradient(90deg, ${gridColor} 1px, transparent 1px)
  ` : 'none';

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{
        backgroundColor,
        cursor: isPanning ? 'grabbing' : 'grab',
        touchAction: 'none',
        userSelect: 'none',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Grid background layer */}
      {showGrid && (
        <motion.div
          className="absolute pointer-events-none"
          style={{
            width: width * 2,
            height: height * 2,
            left: -width / 2,
            top: -height / 2,
            backgroundImage: gridPattern,
            backgroundSize: `${gridSize}px ${gridSize}px`,
            transform,
            transformOrigin: '0 0',
            willChange: 'transform',
          }}
        />
      )}

      {/* Canvas content layer */}
      <motion.div
        className="absolute"
        style={{
          width,
          height,
          transform,
          transformOrigin: '0 0',
          willChange: 'transform',
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}));

SmoothCanvas.displayName = 'SmoothCanvas';

export default SmoothCanvas;
