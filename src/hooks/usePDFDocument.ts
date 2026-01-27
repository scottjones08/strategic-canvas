// usePDFDocument - PDF state management hook
// Manages PDF loading, annotations, comments, and real-time sync

import { useState, useEffect, useCallback, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { 
  PDFAnnotation, 
  PDFComment, 
  DocumentMetadata,
  PageInfo,
  loadPDFDocument,
  getPageInfo,
  generateThumbnails,
  applyAnnotations,
  downloadPDF,
  generateAnnotationId,
  generateCommentId,
  mergePDFs,
  extractPages,
  deletePage,
  rotatePage,
  reorderPages,
} from '../lib/pdf-utils';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface UsePDFDocumentOptions {
  documentId?: string;
  initialUrl?: string;
  onAnnotationsChange?: (annotations: PDFAnnotation[]) => void;
  onCommentsChange?: (comments: PDFComment[]) => void;
  autoSave?: boolean;
  autoSaveDebounceMs?: number;
}

export interface UsePDFDocumentReturn {
  // Document state
  pdfDoc: pdfjsLib.PDFDocumentProxy | null;
  metadata: DocumentMetadata | null;
  pages: PageInfo[];
  thumbnails: string[];
  isLoading: boolean;
  error: string | null;
  
  // Navigation
  currentPage: number;
  totalPages: number;
  setCurrentPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  goToPage: (page: number) => void;
  
  // Zoom
  zoom: number;
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  fitToWidth: () => void;
  fitToHeight: () => void;
  
  // Annotations
  annotations: PDFAnnotation[];
  addAnnotation: (annotation: Omit<PDFAnnotation, 'id' | 'createdAt' | 'updatedAt'>) => PDFAnnotation;
  updateAnnotation: (id: string, updates: Partial<PDFAnnotation>) => void;
  deleteAnnotation: (id: string) => void;
  getAnnotationsForPage: (pageNumber: number) => PDFAnnotation[];
  selectedAnnotation: PDFAnnotation | null;
  setSelectedAnnotation: (annotation: PDFAnnotation | null) => void;
  
  // Comments
  comments: PDFComment[];
  addComment: (comment: Omit<PDFComment, 'id' | 'createdAt' | 'updatedAt'>) => PDFComment;
  updateComment: (id: string, updates: Partial<PDFComment>) => void;
  deleteComment: (id: string) => void;
  resolveComment: (id: string, resolvedBy: string) => void;
  getCommentsForPage: (pageNumber: number) => PDFComment[];
  selectedComment: PDFComment | null;
  setSelectedComment: (comment: PDFComment | null) => void;
  
  // History
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  
  // Document operations
  loadDocument: (source: string | ArrayBuffer | Uint8Array) => Promise<void>;
  exportWithAnnotations: (filename?: string) => Promise<void>;
  exportOriginal: (filename?: string) => void;
  
  // Page operations
  rotateCurrentPage: (rotation: 0 | 90 | 180 | 270) => Promise<void>;
  deleteCurrentPage: () => Promise<void>;
  extractCurrentPage: () => Promise<Uint8Array>;
  reorderPages: (newOrder: number[]) => Promise<void>;
  mergePDFs: (sources: (string | ArrayBuffer | Uint8Array)[]) => Promise<void>;
  
  // Selection
  selectedTool: AnnotationTool;
  setSelectedTool: (tool: AnnotationTool) => void;
  toolColor: string;
  setToolColor: (color: string) => void;
  toolWidth: number;
  setToolWidth: (width: number) => void;
  
  // Rendering
  renderPage: (canvas: HTMLCanvasElement, pageNumber?: number, scale?: number) => Promise<void>;
}

export type AnnotationTool = 
  | 'select'
  | 'highlight'
  | 'underline'
  | 'strikethrough'
  | 'rectangle'
  | 'ellipse'
  | 'arrow'
  | 'line'
  | 'freehand'
  | 'text'
  | 'sticky_note'
  | 'signature'
  | 'stamp'
  | 'eraser';

interface HistoryState {
  annotations: PDFAnnotation[];
  comments: PDFComment[];
}

export function usePDFDocument(options: UsePDFDocumentOptions = {}): UsePDFDocumentReturn {
  const {
    initialUrl,
    onAnnotationsChange,
    onCommentsChange,
    autoSave = true,
    autoSaveDebounceMs = 1000,
  } = options;
  
  // Core document state
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [metadata, _setMetadata] = useState<DocumentMetadata | null>(null);
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Navigation state
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1.0);
  
  // Annotations and comments
  const [annotations, setAnnotations] = useState<PDFAnnotation[]>([]);
  const [comments, setComments] = useState<PDFComment[]>([]);
  const [selectedAnnotation, setSelectedAnnotation] = useState<PDFAnnotation | null>(null);
  const [selectedComment, setSelectedComment] = useState<PDFComment | null>(null);
  
  // Tool state
  const [selectedTool, setSelectedTool] = useState<AnnotationTool>('select');
  const [toolColor, setToolColor] = useState('#ffff00');
  const [toolWidth, setToolWidth] = useState(2);
  
  // History for undo/redo
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // Refs
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const totalPages = pdfDoc?.numPages || 0;
  
  // ============================================
  // DOCUMENT LOADING
  // ============================================
  
  const loadDocument = useCallback(async (source: string | ArrayBuffer | Uint8Array) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Store bytes for manipulation
      let bytes: Uint8Array;
      if (typeof source === 'string') {
        const response = await fetch(source);
        const arrayBuffer = await response.arrayBuffer();
        bytes = new Uint8Array(arrayBuffer);
      } else if (source instanceof ArrayBuffer) {
        bytes = new Uint8Array(source);
      } else {
        bytes = source;
      }
      setPdfBytes(bytes);
      
      // Load document
      const doc = await loadPDFDocument(bytes);
      setPdfDoc(doc);
      
      // Get page info
      const pageInfo = await getPageInfo(doc);
      setPages(pageInfo);
      
      // Generate thumbnails (async, don't block)
      generateThumbnails(doc, 0.2).then(setThumbnails);
      
      // Initialize history
      setHistory([{ annotations: [], comments: [] }]);
      setHistoryIndex(0);
      
      setCurrentPage(1);
    } catch (err) {
      console.error('Failed to load PDF:', err);
      setError(err instanceof Error ? err.message : 'Failed to load PDF');
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Load initial document
  useEffect(() => {
    if (initialUrl) {
      loadDocument(initialUrl);
    }
  }, [initialUrl, loadDocument]);
  
  // ============================================
  // NAVIGATION
  // ============================================
  
  const nextPage = useCallback(() => {
    setCurrentPage(p => Math.min(p + 1, totalPages));
  }, [totalPages]);
  
  const prevPage = useCallback(() => {
    setCurrentPage(p => Math.max(p - 1, 1));
  }, []);
  
  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);
  
  // ============================================
  // ZOOM
  // ============================================
  
  const zoomIn = useCallback(() => {
    setZoom(z => Math.min(z * 1.2, 4));
  }, []);
  
  const zoomOut = useCallback(() => {
    setZoom(z => Math.max(z / 1.2, 0.25));
  }, []);
  
  const fitToWidth = useCallback(() => {
    // This would need access to container dimensions
    setZoom(1);
  }, []);
  
  const fitToHeight = useCallback(() => {
    setZoom(1);
  }, []);
  
  // ============================================
  // HISTORY MANAGEMENT
  // ============================================
  
  const pushHistory = useCallback((state: HistoryState) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(state);
      return newHistory.slice(-50); // Keep last 50 states
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex]);
  
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;
  
  const undo = useCallback(() => {
    if (canUndo) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const state = history[newIndex];
      setAnnotations(state.annotations);
      setComments(state.comments);
    }
  }, [canUndo, historyIndex, history]);
  
  const redo = useCallback(() => {
    if (canRedo) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const state = history[newIndex];
      setAnnotations(state.annotations);
      setComments(state.comments);
    }
  }, [canRedo, historyIndex, history]);
  
  // ============================================
  // ANNOTATIONS
  // ============================================
  
  const addAnnotation = useCallback((annotation: Omit<PDFAnnotation, 'id' | 'createdAt' | 'updatedAt'>): PDFAnnotation => {
    const now = new Date();
    const newAnnotation: PDFAnnotation = {
      ...annotation,
      id: generateAnnotationId(),
      createdAt: now,
      updatedAt: now,
    };
    
    setAnnotations(prev => {
      const updated = [...prev, newAnnotation];
      pushHistory({ annotations: updated, comments });
      return updated;
    });
    
    return newAnnotation;
  }, [comments, pushHistory]);
  
  const updateAnnotation = useCallback((id: string, updates: Partial<PDFAnnotation>) => {
    setAnnotations(prev => {
      const updated = prev.map(a => 
        a.id === id ? { ...a, ...updates, updatedAt: new Date() } : a
      );
      pushHistory({ annotations: updated, comments });
      return updated;
    });
  }, [comments, pushHistory]);
  
  const deleteAnnotation = useCallback((id: string) => {
    setAnnotations(prev => {
      const updated = prev.filter(a => a.id !== id);
      pushHistory({ annotations: updated, comments });
      return updated;
    });
    if (selectedAnnotation?.id === id) {
      setSelectedAnnotation(null);
    }
  }, [comments, pushHistory, selectedAnnotation]);
  
  const getAnnotationsForPage = useCallback((pageNumber: number) => {
    return annotations.filter(a => a.pageNumber === pageNumber);
  }, [annotations]);
  
  // ============================================
  // COMMENTS
  // ============================================
  
  const addComment = useCallback((comment: Omit<PDFComment, 'id' | 'createdAt' | 'updatedAt'>): PDFComment => {
    const now = new Date();
    const newComment: PDFComment = {
      ...comment,
      id: generateCommentId(),
      createdAt: now,
      updatedAt: now,
    };
    
    // Set thread ID for top-level comments
    if (!newComment.parentId) {
      newComment.threadId = newComment.id;
    }
    
    setComments(prev => {
      const updated = [...prev, newComment];
      pushHistory({ annotations, comments: updated });
      return updated;
    });
    
    return newComment;
  }, [annotations, pushHistory]);
  
  const updateComment = useCallback((id: string, updates: Partial<PDFComment>) => {
    setComments(prev => {
      const updated = prev.map(c =>
        c.id === id ? { ...c, ...updates, updatedAt: new Date() } : c
      );
      pushHistory({ annotations, comments: updated });
      return updated;
    });
  }, [annotations, pushHistory]);
  
  const deleteComment = useCallback((id: string) => {
    setComments(prev => {
      // Delete comment and all replies
      const updated = prev.filter(c => c.id !== id && c.parentId !== id);
      pushHistory({ annotations, comments: updated });
      return updated;
    });
    if (selectedComment?.id === id) {
      setSelectedComment(null);
    }
  }, [annotations, pushHistory, selectedComment]);
  
  const resolveComment = useCallback((id: string, resolvedBy: string) => {
    setComments(prev => {
      const comment = prev.find(c => c.id === id);
      if (!comment) return prev;
      
      const updated = prev.map(c =>
        c.id === id || c.threadId === id
          ? {
              ...c,
              resolved: !comment.resolved,
              resolvedBy: !comment.resolved ? resolvedBy : undefined,
              resolvedAt: !comment.resolved ? new Date() : undefined,
              updatedAt: new Date(),
            }
          : c
      );
      pushHistory({ annotations, comments: updated });
      return updated;
    });
  }, [annotations, pushHistory]);
  
  const getCommentsForPage = useCallback((pageNumber: number) => {
    return comments.filter(c => c.pageNumber === pageNumber);
  }, [comments]);
  
  // ============================================
  // AUTO-SAVE
  // ============================================
  
  useEffect(() => {
    if (!autoSave) return;
    
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    autoSaveTimeoutRef.current = setTimeout(() => {
      onAnnotationsChange?.(annotations);
      onCommentsChange?.(comments);
    }, autoSaveDebounceMs);
    
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [annotations, comments, autoSave, autoSaveDebounceMs, onAnnotationsChange, onCommentsChange]);
  
  // ============================================
  // EXPORT
  // ============================================
  
  const exportWithAnnotations = useCallback(async (filename?: string) => {
    if (!pdfBytes) return;
    
    const annotatedBytes = await applyAnnotations(pdfBytes, annotations);
    downloadPDF(annotatedBytes, filename || metadata?.name || 'document.pdf');
  }, [pdfBytes, annotations, metadata]);
  
  const exportOriginal = useCallback((filename?: string) => {
    if (!pdfBytes) return;
    downloadPDF(pdfBytes, filename || metadata?.name || 'document.pdf');
  }, [pdfBytes, metadata]);
  
  // ============================================
  // PAGE OPERATIONS
  // ============================================
  
  const rotateCurrentPage = useCallback(async (rotation: 0 | 90 | 180 | 270) => {
    if (!pdfBytes) return;
    
    const newBytes = await rotatePage(pdfBytes, currentPage, rotation);
    setPdfBytes(newBytes);
    
    // Reload document
    const doc = await loadPDFDocument(newBytes);
    setPdfDoc(doc);
    const pageInfo = await getPageInfo(doc);
    setPages(pageInfo);
  }, [pdfBytes, currentPage]);
  
  const deleteCurrentPage = useCallback(async () => {
    if (!pdfBytes || totalPages <= 1) return;
    
    const newBytes = await deletePage(pdfBytes, currentPage);
    setPdfBytes(newBytes);
    
    // Reload document
    const doc = await loadPDFDocument(newBytes);
    setPdfDoc(doc);
    const pageInfo = await getPageInfo(doc);
    setPages(pageInfo);
    
    // Remove annotations and comments for deleted page
    setAnnotations(prev => prev.filter(a => a.pageNumber !== currentPage));
    setComments(prev => prev.filter(c => c.pageNumber !== currentPage));
    
    // Adjust current page if needed
    if (currentPage > doc.numPages) {
      setCurrentPage(doc.numPages);
    }
    
    // Regenerate thumbnails
    generateThumbnails(doc, 0.2).then(setThumbnails);
  }, [pdfBytes, currentPage, totalPages]);
  
  const extractCurrentPage = useCallback(async () => {
    if (!pdfBytes) throw new Error('No document loaded');
    return await extractPages(pdfBytes, [currentPage]);
  }, [pdfBytes, currentPage]);
  
  const reorderPagesFunc = useCallback(async (newOrder: number[]) => {
    if (!pdfBytes) return;
    
    const newBytes = await reorderPages(pdfBytes, newOrder);
    setPdfBytes(newBytes);
    
    // Reload document
    const doc = await loadPDFDocument(newBytes);
    setPdfDoc(doc);
    const pageInfo = await getPageInfo(doc);
    setPages(pageInfo);
    
    // Update annotation and comment page numbers
    const orderMap = new Map(newOrder.map((oldPage, newIdx) => [oldPage, newIdx + 1]));
    
    setAnnotations(prev => prev.map(a => ({
      ...a,
      pageNumber: orderMap.get(a.pageNumber) || a.pageNumber,
    })));
    
    setComments(prev => prev.map(c => ({
      ...c,
      pageNumber: orderMap.get(c.pageNumber) || c.pageNumber,
    })));
    
    // Regenerate thumbnails
    generateThumbnails(doc, 0.2).then(setThumbnails);
  }, [pdfBytes]);
  
  const mergePDFsFunc = useCallback(async (sources: (string | ArrayBuffer | Uint8Array)[]) => {
    const allSources = pdfBytes ? [pdfBytes, ...sources] : sources;
    const mergedBytes = await mergePDFs(allSources);
    setPdfBytes(mergedBytes);
    
    // Reload document
    const doc = await loadPDFDocument(mergedBytes);
    setPdfDoc(doc);
    const pageInfo = await getPageInfo(doc);
    setPages(pageInfo);
    
    // Regenerate thumbnails
    generateThumbnails(doc, 0.2).then(setThumbnails);
  }, [pdfBytes]);
  
  // ============================================
  // RENDERING
  // ============================================
  
  const renderPage = useCallback(async (
    canvas: HTMLCanvasElement,
    pageNumber: number = currentPage,
    scale: number = zoom
  ) => {
    if (!pdfDoc) return;
    
    const page = await pdfDoc.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get canvas context');
    
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    await page.render({
      canvasContext: context,
      viewport,
      canvas,
    } as any).promise;
  }, [pdfDoc, currentPage, zoom]);
  
  return {
    // Document state
    pdfDoc,
    metadata,
    pages,
    thumbnails,
    isLoading,
    error,
    
    // Navigation
    currentPage,
    totalPages,
    setCurrentPage,
    nextPage,
    prevPage,
    goToPage,
    
    // Zoom
    zoom,
    setZoom,
    zoomIn,
    zoomOut,
    fitToWidth,
    fitToHeight,
    
    // Annotations
    annotations,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    getAnnotationsForPage,
    selectedAnnotation,
    setSelectedAnnotation,
    
    // Comments
    comments,
    addComment,
    updateComment,
    deleteComment,
    resolveComment,
    getCommentsForPage,
    selectedComment,
    setSelectedComment,
    
    // History
    canUndo,
    canRedo,
    undo,
    redo,
    
    // Document operations
    loadDocument,
    exportWithAnnotations,
    exportOriginal,
    
    // Page operations
    rotateCurrentPage,
    deleteCurrentPage,
    extractCurrentPage,
    reorderPages: reorderPagesFunc,
    mergePDFs: mergePDFsFunc,
    
    // Selection
    selectedTool,
    setSelectedTool,
    toolColor,
    setToolColor,
    toolWidth,
    setToolWidth,
    
    // Rendering
    renderPage,
  };
}

export default usePDFDocument;
