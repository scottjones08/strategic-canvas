// PDFAnnotationLayer.tsx - Annotation overlay for PDF pages
// Handles drawing, selection, and rendering of annotations

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Check,
  Trash2,
} from 'lucide-react';
import type { PDFAnnotation } from '../lib/pdf-utils';
import type { AnnotationTool } from '../hooks/usePDFDocument';

interface PDFAnnotationLayerProps {
  pageWidth: number;
  pageHeight: number;
  annotations: PDFAnnotation[];
  selectedAnnotation: PDFAnnotation | null;
  onSelectAnnotation: (annotation: PDFAnnotation | null) => void;
  onAddAnnotation: (annotation: Omit<PDFAnnotation, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateAnnotation: (id: string, updates: Partial<PDFAnnotation>) => void;
  onDeleteAnnotation: (id: string) => void;
  selectedTool: AnnotationTool;
  toolColor: string;
  toolWidth: number;
  pageNumber: number;
  zoom: number;
}

interface Point {
  x: number;
  y: number;
}

interface DrawingState {
  isDrawing: boolean;
  startPoint: Point | null;
  currentPoint: Point | null;
  points: Point[];
}

export const PDFAnnotationLayer: React.FC<PDFAnnotationLayerProps> = ({
  pageWidth,
  pageHeight,
  annotations,
  selectedAnnotation,
  onSelectAnnotation,
  onAddAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation,
  selectedTool,
  toolColor,
  toolWidth,
  pageNumber,
  zoom,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [drawingState, setDrawingState] = useState<DrawingState>({
    isDrawing: false,
    startPoint: null,
    currentPoint: null,
    points: [],
  });
  
  const [textInput, setTextInput] = useState<{
    visible: boolean;
    position: Point;
    value: string;
  }>({
    visible: false,
    position: { x: 0, y: 0 },
    value: '',
  });
  
  const [stickyNote, setStickyNote] = useState<{
    visible: boolean;
    position: Point;
    value: string;
  }>({
    visible: false,
    position: { x: 0, y: 0 },
    value: '',
  });

  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });

  // Convert screen coordinates to normalized (0-1) coordinates
  const screenToNormalized = useCallback((screenX: number, screenY: number): Point => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    
    return {
      x: (screenX - rect.left) / (pageWidth * zoom),
      y: (screenY - rect.top) / (pageHeight * zoom),
    };
  }, [pageWidth, pageHeight, zoom]);

  // Convert normalized coordinates to screen coordinates
  const normalizedToScreen = useCallback((normX: number, normY: number): Point => {
    return {
      x: normX * pageWidth * zoom,
      y: normY * pageHeight * zoom,
    };
  }, [pageWidth, pageHeight, zoom]);

  // Draw all annotations on canvas
  const renderAnnotations = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw each annotation
    annotations.forEach(annotation => {
      ctx.save();
      ctx.globalAlpha = annotation.opacity;
      
      const screenPos = normalizedToScreen(annotation.x, annotation.y);
      
      switch (annotation.type) {
        case 'highlight':
          if (annotation.textQuads) {
            ctx.fillStyle = annotation.color;
            annotation.textQuads.forEach(quad => {
              const quadPos = normalizedToScreen(quad.x, quad.y);
              ctx.fillRect(
                quadPos.x,
                quadPos.y,
                quad.width * pageWidth * zoom,
                quad.height * pageHeight * zoom
              );
            });
          } else if (annotation.width && annotation.height) {
            ctx.fillStyle = annotation.color;
            ctx.fillRect(
              screenPos.x,
              screenPos.y,
              annotation.width * pageWidth * zoom,
              annotation.height * pageHeight * zoom
            );
          }
          break;
          
        case 'underline':
        case 'strikethrough':
          if (annotation.textQuads) {
            ctx.strokeStyle = annotation.color;
            ctx.lineWidth = annotation.strokeWidth || 2;
            annotation.textQuads.forEach(quad => {
              const quadPos = normalizedToScreen(quad.x, quad.y);
              const yOffset = annotation.type === 'strikethrough' 
                ? quad.height * pageHeight * zoom * 0.5
                : quad.height * pageHeight * zoom;
              ctx.beginPath();
              ctx.moveTo(quadPos.x, quadPos.y + yOffset);
              ctx.lineTo(
                quadPos.x + quad.width * pageWidth * zoom,
                quadPos.y + yOffset
              );
              ctx.stroke();
            });
          }
          break;
          
        case 'rectangle':
          ctx.strokeStyle = annotation.color;
          ctx.lineWidth = annotation.strokeWidth || 2;
          ctx.strokeRect(
            screenPos.x,
            screenPos.y,
            (annotation.width || 0.1) * pageWidth * zoom,
            (annotation.height || 0.1) * pageHeight * zoom
          );
          break;
          
        case 'ellipse':
          ctx.strokeStyle = annotation.color;
          ctx.lineWidth = annotation.strokeWidth || 2;
          ctx.beginPath();
          ctx.ellipse(
            screenPos.x + ((annotation.width || 0.1) * pageWidth * zoom) / 2,
            screenPos.y + ((annotation.height || 0.1) * pageHeight * zoom) / 2,
            ((annotation.width || 0.1) * pageWidth * zoom) / 2,
            ((annotation.height || 0.1) * pageHeight * zoom) / 2,
            0, 0, 2 * Math.PI
          );
          ctx.stroke();
          break;
          
        case 'arrow':
        case 'line':
          if (annotation.pathData && annotation.pathData.length >= 2) {
            ctx.strokeStyle = annotation.color;
            ctx.lineWidth = annotation.strokeWidth || 2;
            
            const start = normalizedToScreen(
              annotation.pathData[0].x,
              annotation.pathData[0].y
            );
            const end = normalizedToScreen(
              annotation.pathData[1].x,
              annotation.pathData[1].y
            );
            
            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();
            
            // Draw arrow head
            if (annotation.type === 'arrow') {
              const angle = Math.atan2(end.y - start.y, end.x - start.x);
              const headLength = 15;
              
              ctx.beginPath();
              ctx.moveTo(end.x, end.y);
              ctx.lineTo(
                end.x - headLength * Math.cos(angle - Math.PI / 6),
                end.y - headLength * Math.sin(angle - Math.PI / 6)
              );
              ctx.moveTo(end.x, end.y);
              ctx.lineTo(
                end.x - headLength * Math.cos(angle + Math.PI / 6),
                end.y - headLength * Math.sin(angle + Math.PI / 6)
              );
              ctx.stroke();
            }
          }
          break;
          
        case 'freehand':
          if (annotation.pathData && annotation.pathData.length > 1) {
            ctx.strokeStyle = annotation.color;
            ctx.lineWidth = annotation.strokeWidth || 2;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            ctx.beginPath();
            const firstPoint = normalizedToScreen(
              annotation.pathData[0].x,
              annotation.pathData[0].y
            );
            ctx.moveTo(firstPoint.x, firstPoint.y);
            
            for (let i = 1; i < annotation.pathData.length; i++) {
              const point = normalizedToScreen(
                annotation.pathData[i].x,
                annotation.pathData[i].y
              );
              ctx.lineTo(point.x, point.y);
            }
            ctx.stroke();
          }
          break;
          
        case 'text':
          if (annotation.content) {
            ctx.fillStyle = annotation.color;
            ctx.font = `${(annotation.fontSize || 14) * zoom}px ${annotation.fontFamily || 'Arial'}`;
            ctx.fillText(annotation.content, screenPos.x, screenPos.y);
          }
          break;
          
        case 'signature':
        case 'stamp':
        case 'image':
          if (annotation.imageData) {
            const img = new Image();
            img.src = annotation.imageData;
            img.onload = () => {
              ctx.drawImage(
                img,
                screenPos.x,
                screenPos.y,
                (annotation.width || 0.2) * pageWidth * zoom,
                (annotation.height || 0.1) * pageHeight * zoom
              );
            };
          }
          break;
      }
      
      ctx.restore();
    });
    
    // Draw current drawing preview
    if (drawingState.isDrawing && drawingState.startPoint && drawingState.currentPoint) {
      ctx.save();
      ctx.strokeStyle = toolColor;
      ctx.lineWidth = toolWidth;
      ctx.globalAlpha = 0.5;
      
      const start = normalizedToScreen(
        drawingState.startPoint.x,
        drawingState.startPoint.y
      );
      const current = normalizedToScreen(
        drawingState.currentPoint.x,
        drawingState.currentPoint.y
      );
      
      switch (selectedTool) {
        case 'rectangle':
        case 'highlight':
          ctx.strokeRect(
            start.x,
            start.y,
            current.x - start.x,
            current.y - start.y
          );
          if (selectedTool === 'highlight') {
            ctx.fillStyle = toolColor;
            ctx.globalAlpha = 0.3;
            ctx.fillRect(
              start.x,
              start.y,
              current.x - start.x,
              current.y - start.y
            );
          }
          break;
          
        case 'ellipse':
          ctx.beginPath();
          ctx.ellipse(
            (start.x + current.x) / 2,
            (start.y + current.y) / 2,
            Math.abs(current.x - start.x) / 2,
            Math.abs(current.y - start.y) / 2,
            0, 0, 2 * Math.PI
          );
          ctx.stroke();
          break;
          
        case 'arrow':
        case 'line':
          ctx.beginPath();
          ctx.moveTo(start.x, start.y);
          ctx.lineTo(current.x, current.y);
          ctx.stroke();
          
          if (selectedTool === 'arrow') {
            const angle = Math.atan2(current.y - start.y, current.x - start.x);
            const headLength = 15;
            ctx.beginPath();
            ctx.moveTo(current.x, current.y);
            ctx.lineTo(
              current.x - headLength * Math.cos(angle - Math.PI / 6),
              current.y - headLength * Math.sin(angle - Math.PI / 6)
            );
            ctx.moveTo(current.x, current.y);
            ctx.lineTo(
              current.x - headLength * Math.cos(angle + Math.PI / 6),
              current.y - headLength * Math.sin(angle + Math.PI / 6)
            );
            ctx.stroke();
          }
          break;
          
        case 'freehand':
          if (drawingState.points.length > 1) {
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            const firstPt = normalizedToScreen(
              drawingState.points[0].x,
              drawingState.points[0].y
            );
            ctx.moveTo(firstPt.x, firstPt.y);
            for (let i = 1; i < drawingState.points.length; i++) {
              const pt = normalizedToScreen(
                drawingState.points[i].x,
                drawingState.points[i].y
              );
              ctx.lineTo(pt.x, pt.y);
            }
            ctx.stroke();
          }
          break;
      }
      
      ctx.restore();
    }
  }, [
    annotations, 
    drawingState, 
    selectedTool, 
    toolColor, 
    toolWidth, 
    normalizedToScreen,
    pageWidth,
    pageHeight,
    zoom,
  ]);

  // Re-render when state changes
  useEffect(() => {
    renderAnnotations();
  }, [renderAnnotations]);

  // Handle mouse events
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (selectedTool === 'select') {
      // Check if clicking on an annotation
      const point = screenToNormalized(e.clientX, e.clientY);
      const clickedAnnotation = annotations.find(a => {
        const left = a.x;
        const top = a.y;
        const right = a.x + (a.width || 0.05);
        const bottom = a.y + (a.height || 0.05);
        return point.x >= left && point.x <= right && point.y >= top && point.y <= bottom;
      });
      
      if (clickedAnnotation) {
        onSelectAnnotation(clickedAnnotation);
        setIsDragging(true);
        setDragOffset({
          x: point.x - clickedAnnotation.x,
          y: point.y - clickedAnnotation.y,
        });
      } else {
        onSelectAnnotation(null);
      }
      return;
    }
    
    if (selectedTool === 'eraser') {
      const point = screenToNormalized(e.clientX, e.clientY);
      const annotationToDelete = annotations.find(a => {
        const left = a.x;
        const top = a.y;
        const right = a.x + (a.width || 0.05);
        const bottom = a.y + (a.height || 0.05);
        return point.x >= left && point.x <= right && point.y >= top && point.y <= bottom;
      });
      
      if (annotationToDelete) {
        onDeleteAnnotation(annotationToDelete.id);
      }
      return;
    }
    
    if (selectedTool === 'text') {
      const point = screenToNormalized(e.clientX, e.clientY);
      setTextInput({
        visible: true,
        position: point,
        value: '',
      });
      return;
    }
    
    if (selectedTool === 'sticky_note') {
      const point = screenToNormalized(e.clientX, e.clientY);
      setStickyNote({
        visible: true,
        position: point,
        value: '',
      });
      return;
    }
    
    // Start drawing
    const point = screenToNormalized(e.clientX, e.clientY);
    setDrawingState({
      isDrawing: true,
      startPoint: point,
      currentPoint: point,
      points: [point],
    });
  }, [
    selectedTool, 
    annotations, 
    screenToNormalized, 
    onSelectAnnotation, 
    onDeleteAnnotation,
  ]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && selectedAnnotation) {
      const point = screenToNormalized(e.clientX, e.clientY);
      onUpdateAnnotation(selectedAnnotation.id, {
        x: point.x - dragOffset.x,
        y: point.y - dragOffset.y,
      });
      return;
    }
    
    if (!drawingState.isDrawing) return;
    
    const point = screenToNormalized(e.clientX, e.clientY);
    
    setDrawingState(prev => ({
      ...prev,
      currentPoint: point,
      points: selectedTool === 'freehand' ? [...prev.points, point] : prev.points,
    }));
  }, [
    drawingState.isDrawing, 
    selectedTool, 
    screenToNormalized,
    isDragging,
    selectedAnnotation,
    dragOffset,
    onUpdateAnnotation,
  ]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      return;
    }
    
    if (!drawingState.isDrawing || !drawingState.startPoint || !drawingState.currentPoint) {
      return;
    }
    
    const { startPoint, currentPoint, points } = drawingState;
    
    // Create annotation based on tool
    let newAnnotation: Omit<PDFAnnotation, 'id' | 'createdAt' | 'updatedAt'>;
    
    switch (selectedTool) {
      case 'highlight':
        newAnnotation = {
          type: 'highlight',
          pageNumber,
          x: Math.min(startPoint.x, currentPoint.x),
          y: Math.min(startPoint.y, currentPoint.y),
          width: Math.abs(currentPoint.x - startPoint.x),
          height: Math.abs(currentPoint.y - startPoint.y),
          color: toolColor,
          opacity: 0.3,
        };
        break;
        
      case 'underline':
      case 'strikethrough':
        newAnnotation = {
          type: selectedTool,
          pageNumber,
          x: Math.min(startPoint.x, currentPoint.x),
          y: Math.min(startPoint.y, currentPoint.y),
          textQuads: [{
            x: Math.min(startPoint.x, currentPoint.x),
            y: Math.min(startPoint.y, currentPoint.y),
            width: Math.abs(currentPoint.x - startPoint.x),
            height: Math.abs(currentPoint.y - startPoint.y),
          }],
          color: toolColor,
          opacity: 1,
          strokeWidth: toolWidth,
        };
        break;
        
      case 'rectangle':
        newAnnotation = {
          type: 'rectangle',
          pageNumber,
          x: Math.min(startPoint.x, currentPoint.x),
          y: Math.min(startPoint.y, currentPoint.y),
          width: Math.abs(currentPoint.x - startPoint.x),
          height: Math.abs(currentPoint.y - startPoint.y),
          color: toolColor,
          opacity: 1,
          strokeWidth: toolWidth,
        };
        break;
        
      case 'ellipse':
        newAnnotation = {
          type: 'ellipse',
          pageNumber,
          x: Math.min(startPoint.x, currentPoint.x),
          y: Math.min(startPoint.y, currentPoint.y),
          width: Math.abs(currentPoint.x - startPoint.x),
          height: Math.abs(currentPoint.y - startPoint.y),
          color: toolColor,
          opacity: 1,
          strokeWidth: toolWidth,
        };
        break;
        
      case 'arrow':
      case 'line':
        newAnnotation = {
          type: selectedTool,
          pageNumber,
          x: startPoint.x,
          y: startPoint.y,
          pathData: [startPoint, currentPoint],
          color: toolColor,
          opacity: 1,
          strokeWidth: toolWidth,
        };
        break;
        
      case 'freehand':
        if (points.length < 2) {
          setDrawingState({
            isDrawing: false,
            startPoint: null,
            currentPoint: null,
            points: [],
          });
          return;
        }
        newAnnotation = {
          type: 'freehand',
          pageNumber,
          x: Math.min(...points.map(p => p.x)),
          y: Math.min(...points.map(p => p.y)),
          pathData: points,
          color: toolColor,
          opacity: 1,
          strokeWidth: toolWidth,
        };
        break;
        
      default:
        setDrawingState({
          isDrawing: false,
          startPoint: null,
          currentPoint: null,
          points: [],
        });
        return;
    }
    
    onAddAnnotation(newAnnotation);
    
    setDrawingState({
      isDrawing: false,
      startPoint: null,
      currentPoint: null,
      points: [],
    });
  }, [
    drawingState,
    selectedTool,
    pageNumber,
    toolColor,
    toolWidth,
    onAddAnnotation,
    isDragging,
  ]);

  const handleTextSubmit = useCallback(() => {
    if (textInput.value.trim()) {
      onAddAnnotation({
        type: 'text',
        pageNumber,
        x: textInput.position.x,
        y: textInput.position.y,
        content: textInput.value,
        color: toolColor,
        opacity: 1,
        fontSize: 14,
      });
    }
    setTextInput({ visible: false, position: { x: 0, y: 0 }, value: '' });
  }, [textInput, pageNumber, toolColor, onAddAnnotation]);

  const handleStickyNoteSubmit = useCallback(() => {
    if (stickyNote.value.trim()) {
      onAddAnnotation({
        type: 'sticky_note',
        pageNumber,
        x: stickyNote.position.x,
        y: stickyNote.position.y,
        width: 0.15,
        height: 0.15,
        content: stickyNote.value,
        color: toolColor,
        opacity: 1,
      });
    }
    setStickyNote({ visible: false, position: { x: 0, y: 0 }, value: '' });
  }, [stickyNote, pageNumber, toolColor, onAddAnnotation]);

  // Get cursor style based on selected tool
  const getCursor = useMemo(() => {
    switch (selectedTool) {
      case 'select':
        return 'default';
      case 'text':
        return 'text';
      case 'freehand':
        return 'crosshair';
      case 'eraser':
        return 'not-allowed';
      case 'highlight':
      case 'underline':
      case 'strikethrough':
        return 'text';
      default:
        return 'crosshair';
    }
  }, [selectedTool]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-auto"
      style={{ cursor: getCursor }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Canvas for drawing annotations */}
      <canvas
        ref={canvasRef}
        width={pageWidth * zoom}
        height={pageHeight * zoom}
        className="absolute inset-0"
      />

      {/* Sticky Notes Overlay */}
      {annotations
        .filter(a => a.type === 'sticky_note')
        .map(annotation => {
          const pos = normalizedToScreen(annotation.x, annotation.y);
          const isSelected = selectedAnnotation?.id === annotation.id;
          
          return (
            <motion.div
              key={annotation.id}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`
                absolute p-2 rounded shadow-lg cursor-pointer
                ${isSelected ? 'ring-2 ring-blue-500' : ''}
              `}
              style={{
                left: pos.x,
                top: pos.y,
                width: (annotation.width || 0.15) * pageWidth * zoom,
                minHeight: (annotation.height || 0.15) * pageHeight * zoom,
                backgroundColor: annotation.color,
              }}
              onClick={e => {
                e.stopPropagation();
                onSelectAnnotation(annotation);
              }}
            >
              <p className="text-xs text-gray-800 whitespace-pre-wrap">
                {annotation.content}
              </p>
              {isSelected && (
                <div className="absolute -top-8 left-0 flex gap-1">
                  <button
                    onClick={() => onDeleteAnnotation(annotation.id)}
                    className="p-1 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
            </motion.div>
          );
        })}

      {/* Text Input Modal */}
      <AnimatePresence>
        {textInput.visible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute bg-white rounded-lg shadow-xl border border-gray-200 p-3"
            style={{
              left: textInput.position.x * pageWidth * zoom,
              top: textInput.position.y * pageHeight * zoom,
            }}
            onClick={e => e.stopPropagation()}
          >
            <input
              type="text"
              autoFocus
              value={textInput.value}
              onChange={e => setTextInput(prev => ({ ...prev, value: e.target.value }))}
              onKeyDown={e => {
                if (e.key === 'Enter') handleTextSubmit();
                if (e.key === 'Escape') setTextInput({ visible: false, position: { x: 0, y: 0 }, value: '' });
              }}
              className="w-48 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter text..."
            />
            <div className="flex gap-1 mt-2">
              <button
                onClick={handleTextSubmit}
                className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
              >
                <Check size={12} />
              </button>
              <button
                onClick={() => setTextInput({ visible: false, position: { x: 0, y: 0 }, value: '' })}
                className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300"
              >
                <X size={12} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticky Note Input Modal */}
      <AnimatePresence>
        {stickyNote.visible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute rounded-lg shadow-xl p-3"
            style={{
              left: stickyNote.position.x * pageWidth * zoom,
              top: stickyNote.position.y * pageHeight * zoom,
              backgroundColor: toolColor,
              width: 200,
            }}
            onClick={e => e.stopPropagation()}
          >
            <textarea
              autoFocus
              value={stickyNote.value}
              onChange={e => setStickyNote(prev => ({ ...prev, value: e.target.value }))}
              onKeyDown={e => {
                if (e.key === 'Enter' && e.metaKey) handleStickyNoteSubmit();
                if (e.key === 'Escape') setStickyNote({ visible: false, position: { x: 0, y: 0 }, value: '' });
              }}
              className="w-full h-24 px-2 py-1 bg-transparent border-0 text-sm focus:outline-none resize-none"
              placeholder="Add note..."
              style={{ color: '#333' }}
            />
            <div className="flex gap-1 mt-1">
              <button
                onClick={handleStickyNoteSubmit}
                className="px-2 py-1 bg-white/50 text-gray-800 rounded text-xs hover:bg-white/70"
              >
                <Check size={12} />
              </button>
              <button
                onClick={() => setStickyNote({ visible: false, position: { x: 0, y: 0 }, value: '' })}
                className="px-2 py-1 bg-white/50 text-gray-800 rounded text-xs hover:bg-white/70"
              >
                <X size={12} />
              </button>
            </div>
            <p className="text-[10px] text-gray-600 mt-1">⌘+Enter to save</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selection handles for selected annotation */}
      {selectedAnnotation && selectedAnnotation.type !== 'sticky_note' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute border-2 border-blue-500 border-dashed pointer-events-none"
          style={{
            left: selectedAnnotation.x * pageWidth * zoom - 4,
            top: selectedAnnotation.y * pageHeight * zoom - 4,
            width: (selectedAnnotation.width || 0.05) * pageWidth * zoom + 8,
            height: (selectedAnnotation.height || 0.05) * pageHeight * zoom + 8,
          }}
        >
          {/* Resize handles would go here */}
        </motion.div>
      )}
    </div>
  );
};

export default PDFAnnotationLayer;
