import { useCallback, useEffect, useRef } from 'react';
import type { RefObject, Dispatch, SetStateAction } from 'react';

type PanZoomState = {
  panX: number;
  panY: number;
  zoom: number;
};

type SmoothPanZoomOptions = {
  canvasRef: RefObject<HTMLElement>;
  panX: number;
  panY: number;
  zoom: number;
  setPanX: Dispatch<SetStateAction<number>>;
  setPanY: Dispatch<SetStateAction<number>>;
  setZoom: Dispatch<SetStateAction<number>>;
  minZoom?: number;
  maxZoom?: number;
  ease?: number;
  stopThreshold?: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

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

export const useSmoothPanZoom = ({
  canvasRef,
  panX,
  panY,
  zoom,
  setPanX,
  setPanY,
  setZoom,
  minZoom = 0.1,
  maxZoom = 5,
  ease = 0.2,
  stopThreshold = 0.15
}: SmoothPanZoomOptions) => {
  const animationRef = useRef<number | null>(null);
  const currentRef = useRef<PanZoomState>({ panX, panY, zoom });
  const targetRef = useRef<PanZoomState>({ panX, panY, zoom });

  useEffect(() => {
    currentRef.current = { panX, panY, zoom };
  }, [panX, panY, zoom]);

  useEffect(() => () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  }, []);

  const stop = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    targetRef.current = { ...currentRef.current };
  }, []);

  const step = useCallback(() => {
    const current = currentRef.current;
    const target = targetRef.current;
    const next = {
      panX: current.panX + (target.panX - current.panX) * ease,
      panY: current.panY + (target.panY - current.panY) * ease,
      zoom: current.zoom + (target.zoom - current.zoom) * ease
    };

    const done =
      Math.abs(target.panX - current.panX) < stopThreshold &&
      Math.abs(target.panY - current.panY) < stopThreshold &&
      Math.abs(target.zoom - current.zoom) < stopThreshold;

    if (done) {
      currentRef.current = { ...target };
      setPanX(target.panX);
      setPanY(target.panY);
      setZoom(target.zoom);
      animationRef.current = null;
      return;
    }

    currentRef.current = next;
    setPanX(next.panX);
    setPanY(next.panY);
    setZoom(next.zoom);
    animationRef.current = requestAnimationFrame(step);
  }, [ease, setPanX, setPanY, setZoom, stopThreshold]);

  const start = useCallback(() => {
    if (!animationRef.current) {
      animationRef.current = requestAnimationFrame(step);
    }
  }, [step]);

  const handleWheel = useCallback((event: React.WheelEvent) => {
    const { dx, dy } = normalizeWheelDelta(event);
    if (event.metaKey || event.ctrlKey) {
      event.preventDefault();
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const current = currentRef.current;
      const scale = dy > 0 ? 0.9 : 1.1;
      const nextZoom = clamp(current.zoom * scale, minZoom, maxZoom);
      const pointerX = event.clientX - rect.left;
      const pointerY = event.clientY - rect.top;
      const worldX = (pointerX - current.panX) / current.zoom;
      const worldY = (pointerY - current.panY) / current.zoom;
      targetRef.current = {
        panX: pointerX - worldX * nextZoom,
        panY: pointerY - worldY * nextZoom,
        zoom: nextZoom
      };
    } else {
      targetRef.current = {
        ...targetRef.current,
        panX: targetRef.current.panX - dx,
        panY: targetRef.current.panY - dy
      };
    }
    start();
  }, [canvasRef, maxZoom, minZoom, start]);

  return { handleWheel, stop };
};
