/**
 * useTouchGestures Hook
 * 
 * Handles touch gestures for canvas interaction:
 * - Pinch to zoom
 * - Two-finger pan
 * - Single finger drag (for node movement)
 * - Long press (for context menu)
 */

import { useRef, useCallback, useEffect } from 'react';

interface TouchGestureOptions {
  onPinchZoom?: (scale: number, centerX: number, centerY: number) => void;
  onPan?: (deltaX: number, deltaY: number) => void;
  onTap?: (x: number, y: number) => void;
  onDoubleTap?: (x: number, y: number) => void;
  onLongPress?: (x: number, y: number) => void;
  longPressDelay?: number;
  doubleTapDelay?: number;
  minPinchDistance?: number;
}

interface TouchState {
  touches: Touch[];
  initialDistance: number;
  initialScale: number;
  lastTapTime: number;
  lastTapX: number;
  lastTapY: number;
  longPressTimer: NodeJS.Timeout | null;
  isPanning: boolean;
  isPinching: boolean;
  startX: number;
  startY: number;
}

export function useTouchGestures(
  elementRef: React.RefObject<HTMLElement>,
  options: TouchGestureOptions
) {
  const {
    onPinchZoom,
    onPan,
    onTap,
    onDoubleTap,
    onLongPress,
    longPressDelay = 500,
    doubleTapDelay = 300,
    minPinchDistance = 10,
  } = options;

  const stateRef = useRef<TouchState>({
    touches: [],
    initialDistance: 0,
    initialScale: 1,
    lastTapTime: 0,
    lastTapX: 0,
    lastTapY: 0,
    longPressTimer: null,
    isPanning: false,
    isPinching: false,
    startX: 0,
    startY: 0,
  });

  const getDistance = useCallback((touch1: Touch, touch2: Touch): number => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  const getCenter = useCallback((touch1: Touch, touch2: Touch): { x: number; y: number } => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2,
    };
  }, []);

  const clearLongPress = useCallback(() => {
    if (stateRef.current.longPressTimer) {
      clearTimeout(stateRef.current.longPressTimer);
      stateRef.current.longPressTimer = null;
    }
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const state = stateRef.current;
    const touches = Array.from(e.touches);
    state.touches = touches;

    clearLongPress();

    if (touches.length === 1) {
      const touch = touches[0];
      state.startX = touch.clientX;
      state.startY = touch.clientY;
      state.isPanning = false;
      state.isPinching = false;

      // Start long press timer
      if (onLongPress) {
        state.longPressTimer = setTimeout(() => {
          onLongPress(touch.clientX, touch.clientY);
        }, longPressDelay);
      }
    } else if (touches.length === 2) {
      // Two fingers - prepare for pinch or pan
      state.initialDistance = getDistance(touches[0], touches[1]);
      state.isPinching = state.initialDistance > minPinchDistance;
      state.isPanning = true;
      clearLongPress();
    }
  }, [clearLongPress, getDistance, longPressDelay, minPinchDistance, onLongPress]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    const state = stateRef.current;
    const touches = Array.from(e.touches);
    
    clearLongPress();

    if (touches.length === 1 && !state.isPinching) {
      // Single finger pan (when not editing a node)
      const touch = touches[0];
      const deltaX = touch.clientX - state.startX;
      const deltaY = touch.clientY - state.startY;
      
      // Only trigger pan if moved significantly
      if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        state.isPanning = true;
        if (onPan) {
          onPan(deltaX, deltaY);
        }
        state.startX = touch.clientX;
        state.startY = touch.clientY;
      }
    } else if (touches.length === 2) {
      const currentDistance = getDistance(touches[0], touches[1]);
      const center = getCenter(touches[0], touches[1]);

      // Pinch zoom
      if (state.isPinching && onPinchZoom && state.initialDistance > 0) {
        const scale = currentDistance / state.initialDistance;
        onPinchZoom(scale, center.x, center.y);
        state.initialDistance = currentDistance;
      }

      // Two-finger pan
      if (onPan && state.touches.length === 2) {
        const prevCenter = getCenter(state.touches[0], state.touches[1]);
        const deltaX = center.x - prevCenter.x;
        const deltaY = center.y - prevCenter.y;
        onPan(deltaX, deltaY);
      }

      state.touches = touches;
    }
  }, [clearLongPress, getCenter, getDistance, onPan, onPinchZoom]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    const state = stateRef.current;
    const changedTouches = Array.from(e.changedTouches);
    
    clearLongPress();

    // Check for tap (if didn't pan or pinch)
    if (changedTouches.length === 1 && !state.isPanning && !state.isPinching) {
      const touch = changedTouches[0];
      const now = Date.now();
      
      // Check for double tap
      if (
        onDoubleTap &&
        now - state.lastTapTime < doubleTapDelay &&
        Math.abs(touch.clientX - state.lastTapX) < 30 &&
        Math.abs(touch.clientY - state.lastTapY) < 30
      ) {
        onDoubleTap(touch.clientX, touch.clientY);
        state.lastTapTime = 0; // Reset to prevent triple tap
      } else {
        // Single tap
        if (onTap) {
          onTap(touch.clientX, touch.clientY);
        }
        state.lastTapTime = now;
        state.lastTapX = touch.clientX;
        state.lastTapY = touch.clientY;
      }
    }

    // Reset state if all fingers lifted
    if (e.touches.length === 0) {
      state.isPanning = false;
      state.isPinching = false;
      state.touches = [];
    } else {
      state.touches = Array.from(e.touches);
    }
  }, [clearLongPress, doubleTapDelay, onDoubleTap, onTap]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Use passive: false to allow preventDefault if needed
    const options = { passive: false };
    
    element.addEventListener('touchstart', handleTouchStart, options);
    element.addEventListener('touchmove', handleTouchMove, options);
    element.addEventListener('touchend', handleTouchEnd, options);
    element.addEventListener('touchcancel', handleTouchEnd, options);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchEnd);
      clearLongPress();
    };
  }, [elementRef, handleTouchStart, handleTouchMove, handleTouchEnd, clearLongPress]);

  return {
    isPanning: stateRef.current.isPanning,
    isPinching: stateRef.current.isPinching,
  };
}

export default useTouchGestures;
