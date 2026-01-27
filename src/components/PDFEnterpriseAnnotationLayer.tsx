// PDFEnterpriseAnnotationLayer.tsx - Enterprise annotation overlay for PDF pages
// Handles all annotation types, redaction, form fields, signatures, stamps

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Check,
  Trash2,
  // Move,
  // GripVertical,
  // RotateCw,
  // Settings,
  MessageSquare,
  Edit2,
  // Copy,
  // Lock,
  // Unlock,
  // ChevronDown,
  // Bold,
  // Italic,
  // AlignLeft,
  // AlignCenter,
  // AlignRight,
} from 'lucide-react';
import type { PDFAnnotation } from '../lib/pdf-utils';
import type { EnterpriseTool } from './PDFEnterpriseToolbar';
import type { StampConfig, FormFieldDefinition, RedactionArea } from '../lib/pdf-enterprise-utils';
import { STAMP_TEMPLATES } from '../lib/pdf-enterprise-utils';

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

interface ResizeHandle {
  position: 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
  cursor: string;
}

const RESIZE_HANDLES: ResizeHandle[] = [
  { position: 'nw', cursor: 'nwse-resize' },
  { position: 'n', cursor: 'ns-resize' },
  { position: 'ne', cursor: 'nesw-resize' },
  { position: 'e', cursor: 'ew-resize' },
  { position: 'se', cursor: 'nwse-resize' },
  { position: 's', cursor: 'ns-resize' },
  { position: 'sw', cursor: 'nesw-resize' },
  { position: 'w', cursor: 'ew-resize' },
];

interface PDFEnterpriseAnnotationLayerProps {
  pageWidth: number;
  pageHeight: number;
  annotations: PDFAnnotation[];
  redactions: RedactionArea[];
  formFields: FormFieldDefinition[];
  selectedAnnotation: PDFAnnotation | null;
  onSelectAnnotation: (annotation: PDFAnnotation | null) => void;
  onAddAnnotation: (annotation: Omit<PDFAnnotation, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateAnnotation: (id: string, updates: Partial<PDFAnnotation>) => void;
  onDeleteAnnotation: (id: string) => void;
  onAddRedaction: (redaction: Omit<RedactionArea, 'pageNumber'>) => void;
  onAddFormField: (field: Omit<FormFieldDefinition, 'id'>) => void;
  onAddComment: (position: Point) => void;
  selectedTool: EnterpriseTool;
  toolColor: string;
  toolWidth: number;
  fontSize: number;
  fontFamily: string;
  pageNumber: number;
  zoom: number;
  stampConfig?: StampConfig;
  signatureImage?: string;
  insertImage?: string;
  readOnly?: boolean;
  showCommentMarkers?: boolean;
  commentMarkers?: { id: string; x: number; y: number; resolved: boolean }[];
  onCommentClick?: (id: string) => void;
}

export const PDFEnterpriseAnnotationLayer: React.FC<PDFEnterpriseAnnotationLayerProps> = ({
  pageWidth,
  pageHeight,
  annotations,
  redactions,
  formFields,
  selectedAnnotation,
  onSelectAnnotation,
  onAddAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation,
  onAddRedaction,
  onAddFormField,
  // onAddComment,
  selectedTool,
  toolColor,
  toolWidth,
  fontSize,
  fontFamily,
  pageNumber,
  zoom,
  stampConfig,
  signatureImage,
  insertImage,
  readOnly = false,
  showCommentMarkers = true,
  commentMarkers = [],
  onCommentClick,
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
    editing?: string;
  }>({
    visible: false,
    position: { x: 0, y: 0 },
    value: '',
  });
  
  const [stickyNote, setStickyNote] = useState<{
    visible: boolean;
    position: Point;
    value: string;
    editing?: string;
  }>({
    visible: false,
    position: { x: 0, y: 0 },
    value: '',
  });

  const [formFieldInput, setFormFieldInput] = useState<{
    visible: boolean;
    type: FormFieldDefinition['type'];
    position: Point;
    size: { width: number; height: number };
    label: string;
    placeholder: string;
    required: boolean;
    options: string[];
  } | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<ResizeHandle['position'] | null>(null);
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });
  const [resizeStartData, setResizeStartData] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
    mouseX: number;
    mouseY: number;
  } | null>(null);

  // Convert screen coordinates to normalized (0-1) coordinates
  const screenToNormalized = useCallback((screenX: number, screenY: number): Point => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    
    return {
      x: Math.max(0, Math.min(1, (screenX - rect.left) / (pageWidth * zoom))),
      y: Math.max(0, Math.min(1, (screenY - rect.top) / (pageHeight * zoom))),
    };
  }, [pageWidth, pageHeight, zoom]);

  // Convert normalized coordinates to screen coordinates
  const normalizedToScreen = useCallback((normX: number, normY: number): Point => {
    return {
      x: normX * pageWidth * zoom,
      y: normY * pageHeight * zoom,
    };
  }, [pageWidth, pageHeight, zoom]);

  // Render all annotations on canvas
  const renderAnnotations = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw redaction previews
    redactions.forEach(redaction => {
      const screenPos = normalizedToScreen(redaction.x, redaction.y);
      ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.fillRect(
        screenPos.x,
        screenPos.y,
        redaction.width * pageWidth * zoom,
        redaction.height * pageHeight * zoom
      );
      ctx.strokeRect(
        screenPos.x,
        screenPos.y,
        redaction.width * pageWidth * zoom,
        redaction.height * pageHeight * zoom
      );
      ctx.setLineDash([]);
    });

    // Draw annotations
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
          ctx.strokeStyle = annotation.color;
          ctx.lineWidth = annotation.strokeWidth || 2;
          if (annotation.textQuads) {
            annotation.textQuads.forEach(quad => {
              const quadPos = normalizedToScreen(quad.x, quad.y);
              const yOffset = annotation.type === 'strikethrough' 
                ? quad.height * pageHeight * zoom * 0.5
                : quad.height * pageHeight * zoom;
              ctx.beginPath();
              ctx.moveTo(quadPos.x, quadPos.y + yOffset);
              ctx.lineTo(quadPos.x + quad.width * pageWidth * zoom, quadPos.y + yOffset);
              ctx.stroke();
            });
          } else if (annotation.width) {
            const yOffset = annotation.type === 'strikethrough' ? 8 : 14;
            ctx.beginPath();
            ctx.moveTo(screenPos.x, screenPos.y + yOffset);
            ctx.lineTo(screenPos.x + annotation.width * pageWidth * zoom, screenPos.y + yOffset);
            ctx.stroke();
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
            ctx.lineCap = 'round';
            
            const start = normalizedToScreen(annotation.pathData[0].x, annotation.pathData[0].y);
            const end = normalizedToScreen(annotation.pathData[1].x, annotation.pathData[1].y);
            
            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();
            
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
            const firstPoint = normalizedToScreen(annotation.pathData[0].x, annotation.pathData[0].y);
            ctx.moveTo(firstPoint.x, firstPoint.y);
            
            for (let i = 1; i < annotation.pathData.length; i++) {
              const point = normalizedToScreen(annotation.pathData[i].x, annotation.pathData[i].y);
              ctx.lineTo(point.x, point.y);
            }
            ctx.stroke();
          }
          break;
          
        case 'text':
          if (annotation.content) {
            ctx.fillStyle = annotation.color;
            ctx.font = `${(annotation.fontSize || 14) * zoom}px ${annotation.fontFamily || 'Arial'}`;
            ctx.fillText(annotation.content, screenPos.x, screenPos.y + (annotation.fontSize || 14) * zoom);
          }
          break;
          
        case 'signature':
        case 'stamp':
        case 'image':
          if (annotation.imageData) {
            const img = new Image();
            img.src = annotation.imageData;
            if (img.complete) {
              ctx.drawImage(
                img,
                screenPos.x,
                screenPos.y,
                (annotation.width || 0.2) * pageWidth * zoom,
                (annotation.height || 0.1) * pageHeight * zoom
              );
            } else {
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
          }
          break;
      }
      
      ctx.restore();
    });
    
    // Draw current drawing preview
    if (drawingState.isDrawing && drawingState.startPoint && drawingState.currentPoint) {
      ctx.save();
      ctx.strokeStyle = selectedTool === 'redaction' ? '#ff0000' : toolColor;
      ctx.fillStyle = selectedTool === 'redaction' ? 'rgba(255, 0, 0, 0.3)' : toolColor;
      ctx.lineWidth = toolWidth;
      ctx.globalAlpha = selectedTool === 'highlight' ? 0.3 : 0.7;
      
      const start = normalizedToScreen(drawingState.startPoint.x, drawingState.startPoint.y);
      const current = normalizedToScreen(drawingState.currentPoint.x, drawingState.currentPoint.y);
      
      switch (selectedTool) {
        case 'redaction':
          ctx.setLineDash([5, 5]);
          ctx.fillRect(start.x, start.y, current.x - start.x, current.y - start.y);
          ctx.strokeRect(start.x, start.y, current.x - start.x, current.y - start.y);
          ctx.setLineDash([]);
          break;
          
        case 'rectangle':
          ctx.strokeRect(start.x, start.y, current.x - start.x, current.y - start.y);
          break;
          
        case 'highlight':
          ctx.fillRect(start.x, start.y, current.x - start.x, current.y - start.y);
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
            const firstPt = normalizedToScreen(drawingState.points[0].x, drawingState.points[0].y);
            ctx.moveTo(firstPt.x, firstPt.y);
            for (let i = 1; i < drawingState.points.length; i++) {
              const pt = normalizedToScreen(drawingState.points[i].x, drawingState.points[i].y);
              ctx.lineTo(pt.x, pt.y);
            }
            ctx.stroke();
          }
          break;
          
        case 'form_text':
        case 'form_checkbox':
        case 'form_dropdown':
        case 'form_signature':
          ctx.strokeStyle = '#2563eb';
          ctx.setLineDash([3, 3]);
          ctx.strokeRect(start.x, start.y, current.x - start.x, current.y - start.y);
          ctx.setLineDash([]);
          ctx.fillStyle = 'rgba(37, 99, 235, 0.1)';
          ctx.fillRect(start.x, start.y, current.x - start.x, current.y - start.y);
          break;
      }
      
      ctx.restore();
    }
  }, [
    annotations,
    redactions,
    drawingState,
    selectedTool,
    toolColor,
    toolWidth,
    normalizedToScreen,
    pageWidth,
    pageHeight,
    zoom,
  ]);

  useEffect(() => {
    renderAnnotations();
  }, [renderAnnotations]);

  // Handle mouse events
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (readOnly) return;
    
    const point = screenToNormalized(e.clientX, e.clientY);
    
    if (selectedTool === 'select') {
      // Check if clicking on an annotation
      const clickedAnnotation = [...annotations].reverse().find(a => {
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
      setTextInput({
        visible: true,
        position: point,
        value: '',
      });
      return;
    }
    
    if (selectedTool === 'sticky_note') {
      setStickyNote({
        visible: true,
        position: point,
        value: '',
      });
      return;
    }
    
    // Handle signature/image/stamp placement
    if (selectedTool === 'signature' && signatureImage) {
      onAddAnnotation({
        type: 'signature',
        pageNumber,
        x: point.x,
        y: point.y,
        width: 0.2,
        height: 0.08,
        color: '#000000',
        opacity: 1,
        imageData: signatureImage,
      });
      return;
    }
    
    if (selectedTool === 'image' && insertImage) {
      onAddAnnotation({
        type: 'image',
        pageNumber,
        x: point.x,
        y: point.y,
        width: 0.25,
        height: 0.2,
        color: '#000000',
        opacity: 1,
        imageData: insertImage,
      });
      return;
    }
    
    if (selectedTool === 'stamp' && stampConfig) {
      // Create stamp image data (would be generated from canvas)
      onAddAnnotation({
        type: 'stamp',
        pageNumber,
        x: point.x,
        y: point.y,
        width: 0.15,
        height: 0.08,
        color: stampConfig.color,
        opacity: 1,
        content: stampConfig.text || stampConfig.type.toUpperCase(),
      });
      return;
    }
    
    // Start drawing
    setDrawingState({
      isDrawing: true,
      startPoint: point,
      currentPoint: point,
      points: [point],
    });
  }, [
    readOnly,
    selectedTool,
    annotations,
    screenToNormalized,
    onSelectAnnotation,
    onDeleteAnnotation,
    onAddAnnotation,
    signatureImage,
    insertImage,
    stampConfig,
    pageNumber,
  ]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (readOnly) return;
    
    const point = screenToNormalized(e.clientX, e.clientY);
    
    if (isDragging && selectedAnnotation) {
      onUpdateAnnotation(selectedAnnotation.id, {
        x: Math.max(0, Math.min(1 - (selectedAnnotation.width || 0.05), point.x - dragOffset.x)),
        y: Math.max(0, Math.min(1 - (selectedAnnotation.height || 0.05), point.y - dragOffset.y)),
      });
      return;
    }
    
    if (isResizing && selectedAnnotation && resizeStartData) {
      const deltaX = (e.clientX - resizeStartData.mouseX) / (pageWidth * zoom);
      const deltaY = (e.clientY - resizeStartData.mouseY) / (pageHeight * zoom);
      
      let newX = resizeStartData.x;
      let newY = resizeStartData.y;
      let newWidth = resizeStartData.width;
      let newHeight = resizeStartData.height;
      
      switch (isResizing) {
        case 'e':
          newWidth = Math.max(0.02, resizeStartData.width + deltaX);
          break;
        case 'w':
          newX = resizeStartData.x + deltaX;
          newWidth = Math.max(0.02, resizeStartData.width - deltaX);
          break;
        case 's':
          newHeight = Math.max(0.02, resizeStartData.height + deltaY);
          break;
        case 'n':
          newY = resizeStartData.y + deltaY;
          newHeight = Math.max(0.02, resizeStartData.height - deltaY);
          break;
        case 'se':
          newWidth = Math.max(0.02, resizeStartData.width + deltaX);
          newHeight = Math.max(0.02, resizeStartData.height + deltaY);
          break;
        case 'sw':
          newX = resizeStartData.x + deltaX;
          newWidth = Math.max(0.02, resizeStartData.width - deltaX);
          newHeight = Math.max(0.02, resizeStartData.height + deltaY);
          break;
        case 'ne':
          newY = resizeStartData.y + deltaY;
          newWidth = Math.max(0.02, resizeStartData.width + deltaX);
          newHeight = Math.max(0.02, resizeStartData.height - deltaY);
          break;
        case 'nw':
          newX = resizeStartData.x + deltaX;
          newY = resizeStartData.y + deltaY;
          newWidth = Math.max(0.02, resizeStartData.width - deltaX);
          newHeight = Math.max(0.02, resizeStartData.height - deltaY);
          break;
      }
      
      onUpdateAnnotation(selectedAnnotation.id, {
        x: Math.max(0, Math.min(1 - newWidth, newX)),
        y: Math.max(0, Math.min(1 - newHeight, newY)),
        width: newWidth,
        height: newHeight,
      });
      return;
    }
    
    if (!drawingState.isDrawing) return;
    
    setDrawingState(prev => ({
      ...prev,
      currentPoint: point,
      points: selectedTool === 'freehand' ? [...prev.points, point] : prev.points,
    }));
  }, [
    readOnly,
    drawingState.isDrawing,
    selectedTool,
    screenToNormalized,
    isDragging,
    isResizing,
    selectedAnnotation,
    dragOffset,
    resizeStartData,
    onUpdateAnnotation,
    pageWidth,
    pageHeight,
    zoom,
  ]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      return;
    }
    
    if (isResizing) {
      setIsResizing(null);
      setResizeStartData(null);
      return;
    }
    
    if (!drawingState.isDrawing || !drawingState.startPoint || !drawingState.currentPoint) {
      return;
    }
    
    const { startPoint, currentPoint, points } = drawingState;
    
    // Handle redaction
    if (selectedTool === 'redaction') {
      onAddRedaction({
        x: Math.min(startPoint.x, currentPoint.x),
        y: Math.min(startPoint.y, currentPoint.y),
        width: Math.abs(currentPoint.x - startPoint.x),
        height: Math.abs(currentPoint.y - startPoint.y),
      });
      setDrawingState({ isDrawing: false, startPoint: null, currentPoint: null, points: [] });
      return;
    }
    
    // Handle form fields
    if (selectedTool?.startsWith('form_')) {
      const fieldType = selectedTool.replace('form_', '') as FormFieldDefinition['type'];
      setFormFieldInput({
        visible: true,
        type: fieldType,
        position: { x: Math.min(startPoint.x, currentPoint.x), y: Math.min(startPoint.y, currentPoint.y) },
        size: { 
          width: Math.abs(currentPoint.x - startPoint.x),
          height: Math.abs(currentPoint.y - startPoint.y),
        },
        label: '',
        placeholder: '',
        required: false,
        options: [],
      });
      setDrawingState({ isDrawing: false, startPoint: null, currentPoint: null, points: [] });
      return;
    }
    
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
          width: Math.abs(currentPoint.x - startPoint.x),
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
          type: selectedTool as 'arrow' | 'line',
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
          setDrawingState({ isDrawing: false, startPoint: null, currentPoint: null, points: [] });
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
        setDrawingState({ isDrawing: false, startPoint: null, currentPoint: null, points: [] });
        return;
    }
    
    onAddAnnotation(newAnnotation);
    setDrawingState({ isDrawing: false, startPoint: null, currentPoint: null, points: [] });
  }, [
    drawingState,
    selectedTool,
    pageNumber,
    toolColor,
    toolWidth,
    onAddAnnotation,
    onAddRedaction,
    isDragging,
    isResizing,
  ]);

  const handleTextSubmit = useCallback(() => {
    if (textInput.value.trim()) {
      if (textInput.editing) {
        onUpdateAnnotation(textInput.editing, { content: textInput.value });
      } else {
        onAddAnnotation({
          type: 'text',
          pageNumber,
          x: textInput.position.x,
          y: textInput.position.y,
          content: textInput.value,
          color: toolColor,
          opacity: 1,
          fontSize,
          fontFamily,
        });
      }
    }
    setTextInput({ visible: false, position: { x: 0, y: 0 }, value: '' });
  }, [textInput, pageNumber, toolColor, fontSize, fontFamily, onAddAnnotation, onUpdateAnnotation]);

  const handleStickyNoteSubmit = useCallback(() => {
    if (stickyNote.value.trim()) {
      if (stickyNote.editing) {
        onUpdateAnnotation(stickyNote.editing, { content: stickyNote.value });
      } else {
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
    }
    setStickyNote({ visible: false, position: { x: 0, y: 0 }, value: '' });
  }, [stickyNote, pageNumber, toolColor, onAddAnnotation, onUpdateAnnotation]);

  const handleFormFieldSubmit = useCallback(() => {
    if (!formFieldInput) return;
    
    onAddFormField({
      type: formFieldInput.type,
      name: formFieldInput.label.toLowerCase().replace(/\s+/g, '_') || `field_${Date.now()}`,
      pageNumber,
      x: formFieldInput.position.x,
      y: formFieldInput.position.y,
      width: formFieldInput.size.width,
      height: formFieldInput.size.height,
      label: formFieldInput.label,
      placeholder: formFieldInput.placeholder,
      required: formFieldInput.required,
      options: formFieldInput.type === 'dropdown' || formFieldInput.type === 'radio' 
        ? formFieldInput.options 
        : undefined,
    });
    
    setFormFieldInput(null);
  }, [formFieldInput, pageNumber, onAddFormField]);

  const handleResizeStart = useCallback((position: ResizeHandle['position'], e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedAnnotation) return;
    
    setIsResizing(position);
    setResizeStartData({
      x: selectedAnnotation.x,
      y: selectedAnnotation.y,
      width: selectedAnnotation.width || 0.1,
      height: selectedAnnotation.height || 0.1,
      mouseX: e.clientX,
      mouseY: e.clientY,
    });
  }, [selectedAnnotation]);

  // Get cursor style based on selected tool
  const getCursor = useMemo(() => {
    switch (selectedTool) {
      case 'select':
        return isDragging ? 'grabbing' : 'default';
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
      case 'redaction':
        return 'cell';
      default:
        return 'crosshair';
    }
  }, [selectedTool, isDragging]);

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

      {/* Form field placeholders */}
      {formFields.map(field => {
        const pos = normalizedToScreen(field.x, field.y);
        return (
          <div
            key={field.id}
            className="absolute border-2 border-dashed border-blue-400 bg-blue-50/50 rounded flex items-center justify-center text-xs text-blue-600"
            style={{
              left: pos.x,
              top: pos.y,
              width: field.width * pageWidth * zoom,
              height: field.height * pageHeight * zoom,
            }}
          >
            {field.label || field.type}
          </div>
        );
      })}

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
                absolute p-2 rounded-lg shadow-lg cursor-pointer select-none
                ${isSelected ? 'ring-2 ring-blue-500 z-20' : 'z-10'}
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
              onDoubleClick={e => {
                e.stopPropagation();
                setStickyNote({
                  visible: true,
                  position: { x: annotation.x, y: annotation.y },
                  value: annotation.content || '',
                  editing: annotation.id,
                });
              }}
            >
              <p className="text-xs text-gray-800 whitespace-pre-wrap">
                {annotation.content}
              </p>
              {isSelected && !readOnly && (
                <div className="absolute -top-8 left-0 flex gap-1 bg-white rounded-lg shadow-md p-1">
                  <button
                    onClick={() => {
                      setStickyNote({
                        visible: true,
                        position: { x: annotation.x, y: annotation.y },
                        value: annotation.content || '',
                        editing: annotation.id,
                      });
                    }}
                    className="p-1 hover:bg-gray-100 rounded"
                    title="Edit"
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    onClick={() => onDeleteAnnotation(annotation.id)}
                    className="p-1 hover:bg-red-100 text-red-600 rounded"
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
            </motion.div>
          );
        })}

      {/* Stamp Overlays */}
      {annotations
        .filter(a => a.type === 'stamp')
        .map(annotation => {
          const pos = normalizedToScreen(annotation.x, annotation.y);
          const isSelected = selectedAnnotation?.id === annotation.id;
          const stampConfig = STAMP_TEMPLATES[annotation.content?.toLowerCase() || ''] || {
            color: annotation.color,
            backgroundColor: '#f3f4f6',
            text: annotation.content,
          };
          
          return (
            <motion.div
              key={annotation.id}
              initial={{ scale: 0.8, opacity: 0, rotate: -15 }}
              animate={{ scale: 1, opacity: 0.9, rotate: stampConfig.rotation || -15 }}
              className={`
                absolute px-3 py-1 rounded border-2 cursor-pointer select-none font-bold
                ${isSelected ? 'ring-2 ring-blue-500 z-20' : 'z-10'}
              `}
              style={{
                left: pos.x,
                top: pos.y,
                borderColor: stampConfig.color,
                backgroundColor: stampConfig.backgroundColor,
                color: stampConfig.color,
              }}
              onClick={e => {
                e.stopPropagation();
                onSelectAnnotation(annotation);
              }}
            >
              {annotation.content}
              {isSelected && !readOnly && (
                <div className="absolute -top-8 left-0 flex gap-1 bg-white rounded-lg shadow-md p-1">
                  <button
                    onClick={() => onDeleteAnnotation(annotation.id)}
                    className="p-1 hover:bg-red-100 text-red-600 rounded"
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
            </motion.div>
          );
        })}

      {/* Comment Markers */}
      {showCommentMarkers && commentMarkers.map(marker => {
        const pos = normalizedToScreen(marker.x, marker.y);
        return (
          <motion.button
            key={marker.id}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`
              absolute w-6 h-6 rounded-full flex items-center justify-center cursor-pointer z-30
              ${marker.resolved
                ? 'bg-green-500 text-white'
                : 'bg-yellow-400 text-yellow-800'
              }
              hover:scale-110 transition-transform
            `}
            style={{
              left: pos.x - 12,
              top: pos.y - 12,
            }}
            onClick={e => {
              e.stopPropagation();
              onCommentClick?.(marker.id);
            }}
            title="View comment"
          >
            <MessageSquare size={12} />
          </motion.button>
        );
      })}

      {/* Text Input Modal */}
      <AnimatePresence>
        {textInput.visible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute bg-white rounded-lg shadow-xl border border-gray-200 p-3 z-50"
            style={{
              left: textInput.position.x * pageWidth * zoom,
              top: textInput.position.y * pageHeight * zoom,
              minWidth: 250,
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-2 border-b pb-2">
              <select
                value={fontFamily}
                onChange={() => {/* Would need callback */}}
                className="text-sm border rounded px-1"
              >
                <option value="Arial">Arial</option>
                <option value="Times New Roman">Times</option>
                <option value="Courier New">Courier</option>
              </select>
              <select
                value={fontSize}
                onChange={() => {/* Would need callback */}}
                className="text-sm border rounded px-1 w-16"
              >
                {[10, 12, 14, 16, 18, 20, 24, 28, 32].map(s => (
                  <option key={s} value={s}>{s}pt</option>
                ))}
              </select>
              <div
                className="w-6 h-6 rounded border cursor-pointer"
                style={{ backgroundColor: toolColor }}
                title="Text color"
              />
            </div>
            <textarea
              autoFocus
              value={textInput.value}
              onChange={e => setTextInput(prev => ({ ...prev, value: e.target.value }))}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleTextSubmit();
                if (e.key === 'Escape') setTextInput({ visible: false, position: { x: 0, y: 0 }, value: '' });
              }}
              className="w-full h-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Enter text..."
              style={{ fontFamily, fontSize: `${fontSize}px` }}
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-gray-500">⌘+Enter to save</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setTextInput({ visible: false, position: { x: 0, y: 0 }, value: '' })}
                  className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTextSubmit}
                  className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                >
                  Add
                </button>
              </div>
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
            className="absolute rounded-lg shadow-xl p-3 z-50"
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
            <div className="flex justify-between items-center mt-1">
              <span className="text-[10px] text-gray-600">⌘+Enter to save</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setStickyNote({ visible: false, position: { x: 0, y: 0 }, value: '' })}
                  className="p-1 bg-white/50 text-gray-800 rounded hover:bg-white/70"
                >
                  <X size={12} />
                </button>
                <button
                  onClick={handleStickyNoteSubmit}
                  className="p-1 bg-white/50 text-gray-800 rounded hover:bg-white/70"
                >
                  <Check size={12} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Form Field Configuration Modal */}
      <AnimatePresence>
        {formFieldInput && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-50"
            style={{
              left: formFieldInput.position.x * pageWidth * zoom,
              top: formFieldInput.position.y * pageHeight * zoom + formFieldInput.size.height * pageHeight * zoom + 10,
              width: 280,
            }}
            onClick={e => e.stopPropagation()}
          >
            <h4 className="font-medium text-gray-800 mb-3 capitalize">
              {formFieldInput.type} Field
            </h4>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500">Label</label>
                <input
                  type="text"
                  value={formFieldInput.label}
                  onChange={e => setFormFieldInput(prev => prev ? { ...prev, label: e.target.value } : null)}
                  className="w-full px-2 py-1 border rounded text-sm"
                  placeholder="Field label"
                  autoFocus
                />
              </div>
              
              {formFieldInput.type === 'text' && (
                <div>
                  <label className="text-xs text-gray-500">Placeholder</label>
                  <input
                    type="text"
                    value={formFieldInput.placeholder}
                    onChange={e => setFormFieldInput(prev => prev ? { ...prev, placeholder: e.target.value } : null)}
                    className="w-full px-2 py-1 border rounded text-sm"
                    placeholder="Placeholder text"
                  />
                </div>
              )}
              
              {(formFieldInput.type === 'dropdown' || formFieldInput.type === 'radio') && (
                <div>
                  <label className="text-xs text-gray-500">Options (one per line)</label>
                  <textarea
                    value={formFieldInput.options.join('\n')}
                    onChange={e => setFormFieldInput(prev => prev ? { 
                      ...prev, 
                      options: e.target.value.split('\n').filter(Boolean) 
                    } : null)}
                    className="w-full px-2 py-1 border rounded text-sm h-20 resize-none"
                    placeholder="Option 1&#10;Option 2&#10;Option 3"
                  />
                </div>
              )}
              
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formFieldInput.required}
                  onChange={e => setFormFieldInput(prev => prev ? { ...prev, required: e.target.checked } : null)}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Required field</span>
              </label>
            </div>
            
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setFormFieldInput(null)}
                className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleFormFieldSubmit}
                className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Add Field
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selection handles for selected annotation */}
      {selectedAnnotation && selectedAnnotation.type !== 'sticky_note' && selectedAnnotation.type !== 'stamp' && !readOnly && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute pointer-events-none z-20"
          style={{
            left: selectedAnnotation.x * pageWidth * zoom - 4,
            top: selectedAnnotation.y * pageHeight * zoom - 4,
            width: (selectedAnnotation.width || 0.05) * pageWidth * zoom + 8,
            height: (selectedAnnotation.height || 0.05) * pageHeight * zoom + 8,
            border: '2px dashed #3b82f6',
          }}
        >
          {/* Resize handles */}
          {RESIZE_HANDLES.map(handle => {
            const handleSize = 8;
            let left: string | number = 0;
            let top: string | number = 0;
            
            switch (handle.position) {
              case 'nw': left = -handleSize/2; top = -handleSize/2; break;
              case 'n': left = '50%'; top = -handleSize/2; break;
              case 'ne': left = `calc(100% - ${handleSize/2}px)`; top = -handleSize/2; break;
              case 'e': left = `calc(100% - ${handleSize/2}px)`; top = '50%'; break;
              case 'se': left = `calc(100% - ${handleSize/2}px)`; top = `calc(100% - ${handleSize/2}px)`; break;
              case 's': left = '50%'; top = `calc(100% - ${handleSize/2}px)`; break;
              case 'sw': left = -handleSize/2; top = `calc(100% - ${handleSize/2}px)`; break;
              case 'w': left = -handleSize/2; top = '50%'; break;
            }
            
            return (
              <div
                key={handle.position}
                className="absolute bg-white border-2 border-blue-500 rounded-sm pointer-events-auto"
                style={{
                  width: handleSize,
                  height: handleSize,
                  left,
                  top,
                  transform: typeof left === 'string' && left.includes('%') ? 'translateX(-50%)' : undefined,
                  cursor: handle.cursor,
                }}
                onMouseDown={(e) => handleResizeStart(handle.position, e)}
              />
            );
          })}
        </motion.div>
      )}
    </div>
  );
};

export default PDFEnterpriseAnnotationLayer;
