// PDFEditor.tsx - Main PDF Editor Component
// Full-featured PDF viewer and editor with annotations, comments, and page operations

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as pdfjsLib from 'pdfjs-dist';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileText,
  MessageSquare,
  AlertCircle,
  Search,
  Upload,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import usePDFDocument from '../hooks/usePDFDocument';
import PDFToolbar from './PDFToolbar';
import PDFThumbnails from './PDFThumbnails';
import PDFAnnotationLayer from './PDFAnnotationLayer';
import type { PDFAnnotation, PDFComment } from '../lib/pdf-utils';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface PDFEditorProps {
  documentUrl?: string;
  documentId?: string;
  documentName?: string;
  clientId?: string;
  initialAnnotations?: PDFAnnotation[];
  initialComments?: PDFComment[];
  onSave?: (data: { annotations: PDFAnnotation[]; comments: PDFComment[] }) => void;
  onClose?: () => void;
  readOnly?: boolean;
  showToolbar?: boolean;
  showThumbnails?: boolean;
  showComments?: boolean;
  className?: string;
}

interface CommentInputState {
  visible: boolean;
  position: { x: number; y: number };
  pageNumber: number;
}

export const PDFEditor: React.FC<PDFEditorProps> = ({
  documentUrl,
  documentId,
  documentName = 'Document',
  clientId: _clientId,
  initialAnnotations: _initialAnnotations = [],
  initialComments: _initialComments = [],
  onSave,
  onClose,
  readOnly = false,
  showToolbar = true,
  showThumbnails = true,
  showComments = true,
  className = '',
}) => {
  // Suppress unused warnings (these will be used for initial state in future)
  void _clientId;
  void _initialAnnotations;
  void _initialComments;
  
  // PDF document hook
  const {
    pdfDoc,
    pages,
    thumbnails,
    isLoading,
    error,
    currentPage,
    totalPages,
    setCurrentPage,
    nextPage,
    prevPage,
    zoom,
    setZoom,
    zoomIn,
    zoomOut,
    annotations,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    getAnnotationsForPage,
    selectedAnnotation,
    setSelectedAnnotation,
    comments,
    addComment,
    deleteComment,
    resolveComment,
    getCommentsForPage,
    selectedComment,
    setSelectedComment,
    canUndo,
    canRedo,
    undo,
    redo,
    loadDocument,
    exportWithAnnotations,
    exportOriginal,
    rotateCurrentPage,
    deleteCurrentPage,
    extractCurrentPage,
    reorderPages,
    mergePDFs,
    selectedTool,
    setSelectedTool,
    toolColor,
    setToolColor,
    toolWidth,
    setToolWidth,
  } = usePDFDocument({
    documentId,
    initialUrl: documentUrl,
    onAnnotationsChange: (anns) => onSave?.({ annotations: anns, comments }),
    onCommentsChange: (cmts) => onSave?.({ annotations, comments: cmts }),
    autoSave: !readOnly,
  });

  // Local state
  const [showThumbnailPanel, setShowThumbnailPanel] = useState(showThumbnails);
  const [showCommentsPanel, setShowCommentsPanel] = useState(showComments);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [commentInput, setCommentInput] = useState<CommentInputState>({
    visible: false,
    position: { x: 0, y: 0 },
    pageNumber: 1,
  });
  const [newCommentText, setNewCommentText] = useState('');

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mergeInputRef = useRef<HTMLInputElement>(null);

  // Current page info
  const currentPageInfo = useMemo(() => {
    return pages[currentPage - 1] || { width: 612, height: 792, rotation: 0 };
  }, [pages, currentPage]);

  // Page dimensions
  const pageWidth = currentPageInfo.width;
  const pageHeight = currentPageInfo.height;

  // Annotation counts per page
  const annotationCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    annotations.forEach(a => {
      counts[a.pageNumber] = (counts[a.pageNumber] || 0) + 1;
    });
    return counts;
  }, [annotations]);

  // Current page annotations
  const currentPageAnnotations = useMemo(() => {
    return getAnnotationsForPage(currentPage);
  }, [currentPage, getAnnotationsForPage]);

  // Current page comments
  const currentPageComments = useMemo(() => {
    return getCommentsForPage(currentPage);
  }, [currentPage, getCommentsForPage]);

  // All comments grouped by thread
  const groupedComments = useMemo(() => {
    const threads = new Map<string, PDFComment[]>();
    comments.forEach(c => {
      const threadId = c.threadId || c.id;
      if (!threads.has(threadId)) {
        threads.set(threadId, []);
      }
      threads.get(threadId)!.push(c);
    });
    
    // Sort threads by first comment date
    return Array.from(threads.values()).sort((a, b) => {
      return new Date(a[0].createdAt).getTime() - new Date(b[0].createdAt).getTime();
    });
  }, [comments]);

  // Render PDF page to canvas
  const renderPage = useCallback(async (pageNumber: number, canvas: HTMLCanvasElement) => {
    if (!pdfDoc) return;

    try {
      const page = await pdfDoc.getPage(pageNumber);
      const viewport = page.getViewport({ scale: zoom });

      const context = canvas.getContext('2d');
      if (!context) return;

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvasContext: context,
        viewport,
        canvas,
      } as any).promise;
    } catch (err) {
      console.error('Error rendering page:', err);
    }
  }, [pdfDoc, zoom]);

  // Handle file upload
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const arrayBuffer = event.target?.result as ArrayBuffer;
      if (arrayBuffer) {
        await loadDocument(arrayBuffer);
      }
    };
    reader.readAsArrayBuffer(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [loadDocument]);

  // Handle merge upload
  const handleMergeUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const readers: Promise<ArrayBuffer>[] = [];
    
    for (let i = 0; i < files.length; i++) {
      readers.push(new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target?.result as ArrayBuffer);
        reader.readAsArrayBuffer(files[i]);
      }));
    }

    Promise.all(readers).then(async (buffers) => {
      await mergePDFs(buffers);
    });

    // Reset input
    if (mergeInputRef.current) {
      mergeInputRef.current.value = '';
    }
  }, [mergePDFs]);

  // Handle adding a comment - will be connected to annotation layer in future
  const handleAddCommentInternal = useCallback((position: { x: number; y: number }) => {
    setCommentInput({
      visible: true,
      position,
      pageNumber: currentPage,
    });
  }, [currentPage]);
  // Suppress for now - will use when annotation layer has comment callback
  void handleAddCommentInternal;

  // Submit new comment
  const submitComment = useCallback(() => {
    if (!newCommentText.trim()) return;

    addComment({
      documentId: documentId || '',
      pageNumber: commentInput.pageNumber,
      positionX: commentInput.position.x,
      positionY: commentInput.position.y,
      content: newCommentText,
      authorName: 'User', // Would come from auth context
      resolved: false,
    });

    setNewCommentText('');
    setCommentInput({ visible: false, position: { x: 0, y: 0 }, pageNumber: 1 });
  }, [newCommentText, commentInput, documentId, addComment]);

  // Handle page rotation
  const handleRotatePage = useCallback(async () => {
    await rotateCurrentPage(90 as any);
  }, [rotateCurrentPage]);

  // Handle page deletion
  const handleDeletePage = useCallback(async () => {
    if (totalPages <= 1) return;
    if (confirm(`Delete page ${currentPage}? This cannot be undone.`)) {
      await deleteCurrentPage();
    }
  }, [currentPage, totalPages, deleteCurrentPage]);

  // Handle page extraction
  const handleExtractPage = useCallback(async () => {
    try {
      const bytes = await extractCurrentPage();
      const blob = new Blob([bytes.slice()], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${documentName}-page-${currentPage}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error extracting page:', err);
    }
  }, [currentPage, documentName, extractCurrentPage]);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Navigation
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        prevPage();
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        nextPage();
      } else if (e.key === 'Home') {
        e.preventDefault();
        setCurrentPage(1);
      } else if (e.key === 'End') {
        e.preventDefault();
        setCurrentPage(totalPages);
      }

      // Zoom
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          zoomIn();
        } else if (e.key === '-') {
          e.preventDefault();
          zoomOut();
        } else if (e.key === '0') {
          e.preventDefault();
          setZoom(1);
        }
      }

      // Undo/Redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }

      // Search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowSearch(true);
      }

      // Escape
      if (e.key === 'Escape') {
        setSelectedAnnotation(null);
        setSelectedComment(null);
        setShowSearch(false);
        setCommentInput({ visible: false, position: { x: 0, y: 0 }, pageNumber: 1 });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    prevPage, 
    nextPage, 
    setCurrentPage, 
    totalPages, 
    zoomIn, 
    zoomOut, 
    setZoom, 
    undo, 
    redo,
    setSelectedAnnotation,
    setSelectedComment,
  ]);

  // Render current page when it changes
  useEffect(() => {
    const canvas = document.getElementById(`pdf-canvas-${currentPage}`) as HTMLCanvasElement;
    if (canvas && pdfDoc) {
      renderPage(currentPage, canvas);
    }
  }, [currentPage, pdfDoc, zoom, renderPage]);

  return (
    <div
      ref={containerRef}
      className={`flex flex-col h-full bg-gray-100 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
        <div className="flex items-center gap-3">
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          )}
          <div className="flex items-center gap-2">
            <FileText size={20} className="text-red-500" />
            <h1 className="font-medium text-gray-800 truncate max-w-[300px]">
              {documentName}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search toggle */}
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`p-2 rounded-lg transition-colors ${
              showSearch ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'
            }`}
          >
            <Search size={18} />
          </button>

          {/* Comments toggle */}
          {showComments && (
            <button
              onClick={() => setShowCommentsPanel(!showCommentsPanel)}
              className={`p-2 rounded-lg transition-colors ${
                showCommentsPanel ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'
              }`}
            >
              <MessageSquare size={18} />
            </button>
          )}

          {/* Thumbnails toggle */}
          <button
            onClick={() => setShowThumbnailPanel(!showThumbnailPanel)}
            className={`p-2 rounded-lg transition-colors ${
              showThumbnailPanel ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'
            }`}
          >
            {showThumbnailPanel ? <PanelLeftClose size={18} /> : <PanelLeft size={18} />}
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>
      </div>

      {/* Toolbar */}
      {showToolbar && !readOnly && (
        <PDFToolbar
          selectedTool={selectedTool}
          onToolSelect={setSelectedTool}
          toolColor={toolColor}
          onColorChange={setToolColor}
          toolWidth={toolWidth}
          onWidthChange={setToolWidth}
          zoom={zoom}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onZoomChange={setZoom}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={undo}
          onRedo={redo}
          onRotate={handleRotatePage}
          onDeletePage={handleDeletePage}
          onExtractPage={handleExtractPage}
          onMerge={() => mergeInputRef.current?.click()}
          onExport={() => exportWithAnnotations(`${documentName}-annotated.pdf`)}
          onExportOriginal={() => exportOriginal(`${documentName}.pdf`)}
          onUpload={() => fileInputRef.current?.click()}
          totalPages={totalPages}
          currentPage={currentPage}
          disabled={isLoading || !pdfDoc}
        />
      )}

      {/* Search Bar */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-white border-b border-gray-200 px-4 py-2"
          >
            <div className="flex items-center gap-2 max-w-md">
              <Search size={18} className="text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search in document..."
                className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <button
                onClick={() => {
                  setSearchQuery('');
                  setShowSearch(false);
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Thumbnails Panel */}
        {showThumbnailPanel && (
          <PDFThumbnails
            thumbnails={thumbnails}
            pages={pages}
            currentPage={currentPage}
            onPageSelect={setCurrentPage}
            onReorder={reorderPages}
            onRotatePage={(page) => {
              setCurrentPage(page);
              handleRotatePage();
            }}
            onDeletePage={(page) => {
              setCurrentPage(page);
              handleDeletePage();
            }}
            onExtractPage={(page) => {
              setCurrentPage(page);
              handleExtractPage();
            }}
            isLoading={isLoading}
            annotationCounts={annotationCounts}
            onToggleCollapsed={() => setShowThumbnailPanel(false)}
          />
        )}

        {/* PDF Viewer */}
        <div
          ref={viewerRef}
          className="flex-1 overflow-auto bg-gray-200 flex items-center justify-center"
        >
          {isLoading ? (
            <div className="flex flex-col items-center gap-4">
              <Loader2 size={48} className="animate-spin text-blue-500" />
              <p className="text-gray-600">Loading document...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-4 p-8 bg-white rounded-lg shadow-md">
              <AlertCircle size={48} className="text-red-500" />
              <p className="text-gray-800 font-medium">Failed to load document</p>
              <p className="text-gray-600 text-sm">{error}</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Upload PDF
              </button>
            </div>
          ) : !pdfDoc ? (
            <div className="flex flex-col items-center gap-4 p-8 bg-white rounded-lg shadow-md">
              <FileText size={64} className="text-gray-300" />
              <p className="text-gray-600">No document loaded</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
              >
                <Upload size={18} />
                Upload PDF
              </button>
            </div>
          ) : (
            <div className="p-4">
              {/* Page Container */}
              <div
                className="relative bg-white shadow-lg"
                style={{
                  width: pageWidth * zoom,
                  height: pageHeight * zoom,
                }}
              >
                {/* PDF Canvas */}
                <canvas
                  id={`pdf-canvas-${currentPage}`}
                  className="absolute inset-0"
                />

                {/* Annotation Layer */}
                {!readOnly && (
                  <PDFAnnotationLayer
                    pageWidth={pageWidth}
                    pageHeight={pageHeight}
                    annotations={currentPageAnnotations}
                    selectedAnnotation={selectedAnnotation}
                    onSelectAnnotation={setSelectedAnnotation}
                    onAddAnnotation={addAnnotation}
                    onUpdateAnnotation={updateAnnotation}
                    onDeleteAnnotation={deleteAnnotation}
                    selectedTool={selectedTool}
                    toolColor={toolColor}
                    toolWidth={toolWidth}
                    pageNumber={currentPage}
                    zoom={zoom}
                  />
                )}

                {/* Comment Markers */}
                {currentPageComments.map(comment => (
                  <motion.div
                    key={comment.id}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={`
                      absolute w-6 h-6 rounded-full flex items-center justify-center cursor-pointer
                      ${comment.resolved
                        ? 'bg-green-500 text-white'
                        : 'bg-yellow-400 text-yellow-800'
                      }
                      ${selectedComment?.id === comment.id ? 'ring-2 ring-blue-500' : ''}
                    `}
                    style={{
                      left: comment.positionX * pageWidth * zoom - 12,
                      top: comment.positionY * pageHeight * zoom - 12,
                    }}
                    onClick={() => setSelectedComment(comment)}
                    title={comment.content}
                  >
                    <MessageSquare size={12} />
                  </motion.div>
                ))}
              </div>

              {/* Page Navigation */}
              <div className="flex items-center justify-center gap-4 mt-4 bg-white rounded-lg shadow px-4 py-2">
                <button
                  onClick={prevPage}
                  disabled={currentPage <= 1}
                  className="p-2 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={20} />
                </button>
                
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={currentPage}
                    onChange={e => {
                      const page = parseInt(e.target.value);
                      if (page >= 1 && page <= totalPages) {
                        setCurrentPage(page);
                      }
                    }}
                    className="w-12 px-2 py-1 border border-gray-200 rounded text-center text-sm"
                    min={1}
                    max={totalPages}
                  />
                  <span className="text-gray-600">of {totalPages}</span>
                </div>
                
                <button
                  onClick={nextPage}
                  disabled={currentPage >= totalPages}
                  className="p-2 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Comments Panel */}
        <AnimatePresence>
          {showCommentsPanel && showComments && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="h-full bg-white border-l border-gray-200 flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between p-3 border-b border-gray-200">
                <h3 className="font-medium text-gray-700">
                  Comments ({comments.length})
                </h3>
                <button
                  onClick={() => setShowCommentsPanel(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {groupedComments.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No comments yet</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Click on the document to add a comment
                    </p>
                  </div>
                ) : (
                  groupedComments.map(thread => (
                    <div
                      key={thread[0].id}
                      className={`
                        p-3 rounded-lg border transition-colors cursor-pointer
                        ${thread[0].resolved
                          ? 'bg-green-50 border-green-200'
                          : 'bg-yellow-50 border-yellow-200'
                        }
                        ${selectedComment?.threadId === thread[0].id
                          ? 'ring-2 ring-blue-500'
                          : ''
                        }
                      `}
                      onClick={() => {
                        setSelectedComment(thread[0]);
                        setCurrentPage(thread[0].pageNumber);
                      }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-sm text-gray-800">
                            {thread[0].authorName}
                          </p>
                          <p className="text-xs text-gray-500">
                            Page {thread[0].pageNumber} • {new Date(thread[0].createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        {thread[0].resolved && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                            Resolved
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {thread[0].content}
                      </p>

                      {/* Replies */}
                      {thread.length > 1 && (
                        <div className="mt-2 pt-2 border-t border-gray-200 space-y-2">
                          {thread.slice(1).map(reply => (
                            <div key={reply.id} className="pl-3 border-l-2 border-gray-200">
                              <p className="text-xs text-gray-500">{reply.authorName}</p>
                              <p className="text-sm text-gray-700">{reply.content}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Actions */}
                      {!readOnly && (
                        <div className="flex gap-2 mt-2 pt-2 border-t border-gray-200">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              resolveComment(thread[0].id, 'User');
                            }}
                            className={`
                              px-2 py-1 text-xs rounded transition-colors
                              ${thread[0].resolved
                                ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                              }
                            `}
                          >
                            {thread[0].resolved ? 'Reopen' : 'Resolve'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteComment(thread[0].id);
                            }}
                            className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Comment Input Modal */}
      <AnimatePresence>
        {commentInput.visible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
            onClick={() => setCommentInput({ visible: false, position: { x: 0, y: 0 }, pageNumber: 1 })}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white rounded-lg shadow-xl p-4 w-80"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="font-medium text-gray-800 mb-3">Add Comment</h3>
              <textarea
                value={newCommentText}
                onChange={e => setNewCommentText(e.target.value)}
                placeholder="Enter your comment..."
                className="w-full h-24 px-3 py-2 border border-gray-200 rounded-lg text-sm 
                  focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                autoFocus
              />
              <div className="flex justify-end gap-2 mt-3">
                <button
                  onClick={() => setCommentInput({ visible: false, position: { x: 0, y: 0 }, pageNumber: 1 })}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={submitComment}
                  disabled={!newCommentText.trim()}
                  className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 
                    disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Comment
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handleFileUpload}
        className="hidden"
      />
      <input
        ref={mergeInputRef}
        type="file"
        accept=".pdf"
        multiple
        onChange={handleMergeUpload}
        className="hidden"
      />
    </div>
  );
};

export default PDFEditor;
