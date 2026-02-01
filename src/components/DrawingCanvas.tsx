/**
 * Drawing Canvas Component
 *
 * An SVG-based drawing layer for freehand pen/pencil strokes.
 * Features:
 * - Smooth line rendering with bezier curve smoothing
 * - Configurable stroke color and width
 * - Eraser mode
 * - Pressure sensitivity support (Pointer Events API)
 * - Shape recognition toggle
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  recognizeShape,
  smoothPoints,
  simplifyPoints,
  Point,
  RecognizedShape,
  getBoundingBox
} from '../lib/shape-recognition';

export interface DrawingPath {
  id: string;
  points: Point[];
  color: string;
  width: number;
  opacity: number;
}

export interface DrawingCanvasProps {
  // Canvas dimensions and transform
  width: number;
  height: number;
  zoom: number;
  panX: number;
  panY: number;

  // Drawing settings
  strokeColor: string;
  strokeWidth: number;
  strokeOpacity?: number;
  eraserMode?: boolean;
  shapeRecognitionEnabled?: boolean;

  // Callbacks
  onStrokeComplete: (
    path: DrawingPath,
    recognizedShape: RecognizedShape | null
  ) => void;
  onErase?: (pathIds: string[]) => void;

  // Active state
  isActive: boolean;

  // Existing paths to render (for eraser hit detection)
  existingPaths?: DrawingPath[];
}

// Generate unique ID for paths
const generatePathId = () => `path-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Smoothing factor for pressure sensitivity
const PRESSURE_SMOOTHING = 0.3;

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  width,
  height,
  zoom,
  panX,
  panY,
  strokeColor,
  strokeWidth,
  strokeOpacity = 1,
  eraserMode = false,
  shapeRecognitionEnabled = false,
  onStrokeComplete,
  onErase,
  isActive,
  existingPaths = []
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  // Current drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [currentPressures, setCurrentPressures] = useState<number[]>([]);

  // Eraser state
  const [erasedIds, setErasedIds] = useState<Set<string>>(new Set());

  // Shape preview state
  const [shapePreview, setShapePreview] = useState<RecognizedShape | null>(null);

  // Convert screen coordinates to canvas coordinates
  const screenToCanvas = useCallback((clientX: number, clientY: number): Point => {
    if (!svgRef.current) return { x: 0, y: 0 };

    const rect = svgRef.current.getBoundingClientRect();
    const x = (clientX - rect.left - panX) / zoom;
    const y = (clientY - rect.top - panY) / zoom;

    return { x, y };
  }, [zoom, panX, panY]);

  // Start drawing
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!isActive) return;

    e.preventDefault();
    e.stopPropagation();

    // Capture pointer for smooth tracking
    (e.target as Element).setPointerCapture(e.pointerId);

    const point = screenToCanvas(e.clientX, e.clientY);
    const pressure = e.pressure || 0.5;

    setIsDrawing(true);
    setCurrentPoints([point]);
    setCurrentPressures([pressure]);
    setShapePreview(null);

    if (eraserMode) {
      setErasedIds(new Set());
    }
  }, [isActive, screenToCanvas, eraserMode]);

  // Continue drawing
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDrawing || !isActive) return;

    e.preventDefault();
    e.stopPropagation();

    const point = screenToCanvas(e.clientX, e.clientY);
    const pressure = e.pressure || 0.5;

    if (eraserMode) {
      // Check for intersections with existing paths
      const eraserRadius = strokeWidth * 2;
      const newErasedIds = new Set(erasedIds);

      for (const path of existingPaths) {
        if (newErasedIds.has(path.id)) continue;

        for (const pathPoint of path.points) {
          const dx = pathPoint.x - point.x;
          const dy = pathPoint.y - point.y;
          if (dx * dx + dy * dy < eraserRadius * eraserRadius) {
            newErasedIds.add(path.id);
            break;
          }
        }
      }

      if (newErasedIds.size !== erasedIds.size) {
        setErasedIds(newErasedIds);
      }
    }

    // Add point with some minimum distance filtering
    const lastPoint = currentPoints[currentPoints.length - 1];
    const dx = point.x - lastPoint.x;
    const dy = point.y - lastPoint.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Only add if moved at least 2 pixels (scaled by zoom)
    if (dist > 2 / zoom) {
      setCurrentPoints(prev => [...prev, point]);
      setCurrentPressures(prev => [...prev, pressure]);

      // Update shape preview if enabled
      if (shapeRecognitionEnabled && !eraserMode && currentPoints.length > 10) {
        const allPoints = [...currentPoints, point];
        const shape = recognizeShape(allPoints);
        if (shape.type !== 'freehand' && shape.confidence > 0.5) {
          setShapePreview(shape);
        } else {
          setShapePreview(null);
        }
      }
    }
  }, [isDrawing, isActive, screenToCanvas, eraserMode, strokeWidth, existingPaths, erasedIds, currentPoints, zoom, shapeRecognitionEnabled]);

  // End drawing
  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDrawing) return;

    e.preventDefault();
    e.stopPropagation();

    // Release pointer capture
    (e.target as Element).releasePointerCapture(e.pointerId);

    setIsDrawing(false);

    if (eraserMode) {
      // Report erased paths
      if (erasedIds.size > 0 && onErase) {
        onErase(Array.from(erasedIds));
      }
      setErasedIds(new Set());
      return;
    }

    // Only save if we have enough points
    if (currentPoints.length < 2) {
      setCurrentPoints([]);
      setCurrentPressures([]);
      setShapePreview(null);
      return;
    }

    // Simplify the path
    const simplifiedPoints = simplifyPoints(currentPoints, 1.5);

    // Create the path object
    const path: DrawingPath = {
      id: generatePathId(),
      points: simplifiedPoints,
      color: strokeColor,
      width: strokeWidth,
      opacity: strokeOpacity
    };

    // Check for shape recognition
    let recognizedShape: RecognizedShape | null = null;
    if (shapeRecognitionEnabled) {
      const shape = recognizeShape(simplifiedPoints);
      if (shape.type !== 'freehand' && shape.confidence > 0.6) {
        recognizedShape = shape;
      }
    }

    // Call the completion callback
    onStrokeComplete(path, recognizedShape);

    // Clear state
    setCurrentPoints([]);
    setCurrentPressures([]);
    setShapePreview(null);
  }, [isDrawing, eraserMode, erasedIds, onErase, currentPoints, strokeColor, strokeWidth, strokeOpacity, shapeRecognitionEnabled, onStrokeComplete]);

  // Cancel drawing on pointer leave
  const handlePointerLeave = useCallback((e: React.PointerEvent) => {
    if (isDrawing) {
      handlePointerUp(e);
    }
  }, [isDrawing, handlePointerUp]);

  // Calculate variable width based on pressure
  const getVariableWidth = useCallback((baseWidth: number, pressure: number): number => {
    // Pressure typically ranges from 0 to 1
    // We scale width from 50% to 150% based on pressure
    const minWidth = baseWidth * 0.5;
    const maxWidth = baseWidth * 1.5;
    return minWidth + (maxWidth - minWidth) * pressure;
  }, []);

  // Generate SVG path with variable width (simplified to single path)
  const generateCurrentPath = useCallback((): string => {
    if (currentPoints.length < 2) return '';
    return smoothPoints(currentPoints, 0.25);
  }, [currentPoints]);

  // Calculate average pressure for consistent stroke
  const getAveragePressure = useCallback((): number => {
    if (currentPressures.length === 0) return 0.5;
    return currentPressures.reduce((a, b) => a + b, 0) / currentPressures.length;
  }, [currentPressures]);

  // Render shape preview
  const renderShapePreview = () => {
    if (!shapePreview || eraserMode) return null;

    const { type, bounds } = shapePreview;

    const previewStyle = {
      stroke: strokeColor,
      strokeWidth: strokeWidth,
      strokeDasharray: '5,5',
      fill: 'none',
      opacity: 0.6
    };

    switch (type) {
      case 'circle':
        return (
          <ellipse
            cx={bounds.x + bounds.width / 2}
            cy={bounds.y + bounds.height / 2}
            rx={bounds.width / 2}
            ry={bounds.height / 2}
            {...previewStyle}
          />
        );

      case 'rectangle':
        return (
          <rect
            x={bounds.x}
            y={bounds.y}
            width={bounds.width}
            height={bounds.height}
            {...previewStyle}
          />
        );

      case 'triangle':
        return (
          <polygon
            points={`${bounds.x + bounds.width / 2},${bounds.y} ${bounds.x + bounds.width},${bounds.y + bounds.height} ${bounds.x},${bounds.y + bounds.height}`}
            {...previewStyle}
          />
        );

      case 'line':
        return (
          <line
            x1={bounds.x}
            y1={bounds.y + bounds.height / 2}
            x2={bounds.x + bounds.width}
            y2={bounds.y + bounds.height / 2}
            {...previewStyle}
          />
        );

      case 'arrow': {
        const y = bounds.y + bounds.height / 2;
        const arrowSize = Math.min(15, bounds.width * 0.1);
        return (
          <g {...previewStyle}>
            <line x1={bounds.x} y1={y} x2={bounds.x + bounds.width} y2={y} />
            <line x1={bounds.x + bounds.width - arrowSize} y1={y - arrowSize} x2={bounds.x + bounds.width} y2={y} />
            <line x1={bounds.x + bounds.width - arrowSize} y1={y + arrowSize} x2={bounds.x + bounds.width} y2={y} />
          </g>
        );
      }

      default:
        return null;
    }
  };

  // Eraser cursor visualization
  const [eraserPos, setEraserPos] = useState<Point | null>(null);

  useEffect(() => {
    if (!eraserMode) {
      setEraserPos(null);
    }
  }, [eraserMode]);

  const handleMouseMoveForEraser = useCallback((e: React.MouseEvent) => {
    if (eraserMode && isActive) {
      const point = screenToCanvas(e.clientX, e.clientY);
      setEraserPos(point);
    }
  }, [eraserMode, isActive, screenToCanvas]);

  if (!isActive) {
    return null;
  }

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 touch-none"
      style={{
        cursor: eraserMode
          ? 'none'
          : 'crosshair',
        pointerEvents: 'all',
        zIndex: 100
      }}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      onPointerDown={handlePointerDown}
      onPointerMove={(e) => {
        handlePointerMove(e);
        handleMouseMoveForEraser(e as unknown as React.MouseEvent);
      }}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onPointerCancel={handlePointerUp}
    >
      {/* Transform group for zoom/pan */}
      <g transform={`translate(${panX}, ${panY}) scale(${zoom})`}>
        {/* Existing paths with eraser highlighting */}
        {existingPaths.map(path => (
          <path
            key={path.id}
            d={smoothPoints(path.points, 0.25)}
            stroke={erasedIds.has(path.id) ? '#ff0000' : path.color}
            strokeWidth={path.width}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity={erasedIds.has(path.id) ? 0.3 : path.opacity}
          />
        ))}

        {/* Current drawing stroke */}
        {isDrawing && !eraserMode && currentPoints.length >= 2 && (
          <path
            d={generateCurrentPath()}
            stroke={strokeColor}
            strokeWidth={strokeWidth * (0.5 + getAveragePressure())}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity={strokeOpacity}
          />
        )}

        {/* Shape preview */}
        <AnimatePresence>
          {shapePreview && isDrawing && (
            <motion.g
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {renderShapePreview()}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Eraser cursor */}
        {eraserMode && eraserPos && (
          <circle
            cx={eraserPos.x}
            cy={eraserPos.y}
            r={strokeWidth * 2}
            fill="rgba(255, 0, 0, 0.1)"
            stroke="rgba(255, 0, 0, 0.5)"
            strokeWidth={1}
            style={{ pointerEvents: 'none' }}
          />
        )}
      </g>
    </svg>
  );
};

/**
 * Drawing Settings Panel Component
 *
 * A floating panel for configuring drawing settings.
 */
export interface DrawingSettingsProps {
  strokeColor: string;
  setStrokeColor: (color: string) => void;
  strokeWidth: number;
  setStrokeWidth: (width: number) => void;
  eraserMode: boolean;
  setEraserMode: (enabled: boolean) => void;
  shapeRecognition: boolean;
  setShapeRecognition: (enabled: boolean) => void;
}

// Preset colors for drawing
export const DRAWING_COLORS = [
  '#1a1a1a', // Black
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#6b7280', // Gray
  '#ffffff'  // White
];

// Preset stroke widths
export const STROKE_WIDTHS = [
  { value: 2, label: 'Thin' },
  { value: 4, label: 'Medium' },
  { value: 8, label: 'Thick' },
  { value: 16, label: 'Bold' }
];

export const DrawingSettingsPanel: React.FC<DrawingSettingsProps> = ({
  strokeColor,
  setStrokeColor,
  strokeWidth,
  setStrokeWidth,
  eraserMode,
  setEraserMode,
  shapeRecognition,
  setShapeRecognition
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-center gap-3 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 px-4 py-2"
    >
      {/* Color picker */}
      <div className="flex items-center gap-1">
        {DRAWING_COLORS.map(color => (
          <button
            key={color}
            onClick={() => {
              setStrokeColor(color);
              if (eraserMode) setEraserMode(false);
            }}
            className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
              strokeColor === color && !eraserMode
                ? 'border-navy-500 scale-110'
                : 'border-gray-300'
            }`}
            style={{
              backgroundColor: color,
              boxShadow: color === '#ffffff' ? 'inset 0 0 0 1px #e5e7eb' : 'none'
            }}
            title={color}
          />
        ))}
      </div>

      <div className="w-px h-6 bg-gray-200" />

      {/* Stroke width */}
      <div className="flex items-center gap-1">
        {STROKE_WIDTHS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setStrokeWidth(value)}
            className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
              strokeWidth === value
                ? 'bg-navy-100 text-navy-700'
                : 'hover:bg-gray-100 text-gray-600'
            }`}
            title={label}
          >
            <div
              className="rounded-full bg-current"
              style={{
                width: value,
                height: value
              }}
            />
          </button>
        ))}
      </div>

      <div className="w-px h-6 bg-gray-200" />

      {/* Eraser toggle */}
      <button
        onClick={() => setEraserMode(!eraserMode)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          eraserMode
            ? 'bg-red-100 text-red-600'
            : 'hover:bg-gray-100 text-gray-600'
        }`}
        title="Eraser"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 21h10" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
        <span className="hidden sm:inline">Eraser</span>
      </button>

      <div className="w-px h-6 bg-gray-200" />

      {/* Shape recognition toggle */}
      <button
        onClick={() => setShapeRecognition(!shapeRecognition)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          shapeRecognition
            ? 'bg-navy-100 text-navy-700'
            : 'hover:bg-gray-100 text-gray-600'
        }`}
        title="Auto-detect shapes"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
        <span className="hidden sm:inline">Shapes</span>
      </button>
    </motion.div>
  );
};

export default DrawingCanvas;
