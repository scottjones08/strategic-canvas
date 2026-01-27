// PDFEnterpriseEditor.tsx - Enterprise-grade PDF Editor Component
// Full-featured PDF viewer and editor with annotations, collaboration, and page operations

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileText,
  AlertCircle,
  Upload,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelLeft,
  // Save,
  Cloud,
  CloudOff,
  Users,
  History,
  // Printer,
  MessageSquare,
} from 'lucide-react';
import usePDFDocument from '../hooks/usePDFDocument';
import PDFEnterpriseToolbar, { EnterpriseTool } from './PDFEnterpriseToolbar';
import PDFThumbnails from './PDFThumbnails';
import PDFEnterpriseAnnotationLayer from './PDFEnterpriseAnnotationLayer';
import PDFSearchPanel, { SearchOptions } from './PDFSearchPanel';
import PDFBookmarksPanel from './PDFBookmarksPanel';
import PDFCollaborationPanel from './PDFCollaborationPanel';
import type { PDFAnnotation, PDFComment } from '../lib/pdf-utils';
import { 
  searchTextWithHighlight, 
  getBookmarks, 
  // insertBlankPage, 
  // duplicatePage as duplicatePageFunc,
  // flattenAnnotations,
  // generatePDFChecksum,
  STAMP_TEMPLATES,
  type SearchResult,
  type BookmarkEntry,
  type RedactionArea,
  type FormFieldDefinition,
  type StampConfig,
  type AnnotationThread,
  type ThreadComment,
} from '../lib/pdf-enterprise-utils';

// Configure PDF.js worker - use bundled worker to avoid CDN version mismatch
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export interface PDFEnterpriseEditorProps {
  documentUrl?: string;
  documentId?: string;
  documentName?: string;
  clientId?: string;
  userId?: string;
  userName?: string;
  userAvatar?: string;
  initialAnnotations?: PDFAnnotation[];
  initialComments?: PDFComment[];
  onSave?: (data: { 
    annotations: PDFAnnotation[]; 
    comments: PDFComment[];
    threads: AnnotationThread[];
    formFields: FormFieldDefinition[];
    redactions: RedactionArea[];
    pdfBytes?: Uint8Array;
  }) => void;
  onClose?: () => void;
  readOnly?: boolean;
  showToolbar?: boolean;
  showThumbnails?: boolean;
  showComments?: boolean;
  enableCollaboration?: boolean;
  collaborators?: Array<{
    id: string;
    name: string;
    avatar?: string;
    color: string;
    online: boolean;
    currentPage?: number;
  }>;
  onCollaboratorJoin?: (userId: string) => void;
  onCollaboratorLeave?: (userId: string) => void;
  className?: string;
}

export const PDFEnterpriseEditor: React.FC<PDFEnterpriseEditorProps> = ({
  documentUrl,
  documentId,
  documentName = 'Document',
  clientId: _clientId,
  userId = 'user_1',
  userName = 'User',
  userAvatar,
  initialAnnotations: _initialAnnotations = [],
  initialComments: _initialComments = [],
  onSave,
  onClose,
  readOnly = false,
  showToolbar = true,
  showThumbnails = true,
  showComments = true,
  enableCollaboration = false,
  collaborators = [],
  // onCollaboratorJoin,
  // onCollaboratorLeave,
  className = '',
}) => {
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
    // addComment,
    // deleteComment,
    // resolveComment,
    // getCommentsForPage,
    // selectedComment,
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
    selectedTool: _baseTool,
    setSelectedTool: setBaseTool,
    toolColor,
    setToolColor,
    toolWidth,
    setToolWidth,
  } = usePDFDocument({
    documentId,
    initialUrl: documentUrl,
    onAnnotationsChange: () => handleAutoSave(),
    onCommentsChange: () => handleAutoSave(),
    autoSave: !readOnly,
  });

  // Extended tool state for enterprise features
  const [selectedTool, setSelectedTool] = useState<EnterpriseTool>('select');
  const [fontSize, setFontSize] = useState(14);
  const [fontFamily, setFontFamily] = useState('Arial');
  
  // Panel states
  const [showThumbnailPanel, setShowThumbnailPanel] = useState(showThumbnails);
  const [showBookmarksPanel, setShowBookmarksPanel] = useState(false);
  const [showCommentsPanel, setShowCommentsPanel] = useState(showComments);
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  
  // Document state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [_isSaving, setIsSaving] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('synced');
  
  // Enterprise features state
  const [redactions, setRedactions] = useState<RedactionArea[]>([]);
  const [formFields, setFormFields] = useState<FormFieldDefinition[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkEntry[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [threads, setThreads] = useState<AnnotationThread[]>([]);
  const [signatureImage, _setSignatureImage] = useState<string | null>(null);
  const [insertImage, setInsertImage] = useState<string | null>(null);
  const [pendingStamp, setPendingStamp] = useState<StampConfig | null>(null);
  
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mergeInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

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

  // Current page redactions
  const currentPageRedactions = useMemo(() => {
    return redactions.filter(r => r.pageNumber === currentPage);
  }, [redactions, currentPage]);

  // Current page form fields
  const currentPageFormFields = useMemo(() => {
    return formFields.filter(f => f.pageNumber === currentPage);
  }, [formFields, currentPage]);

  // Comment markers for current page
  const commentMarkers = useMemo(() => {
    return comments
      .filter(c => c.pageNumber === currentPage)
      .map(c => ({
        id: c.id,
        x: c.positionX,
        y: c.positionY,
        resolved: c.resolved,
      }));
  }, [comments, currentPage]);

  // Load bookmarks when document loads
  useEffect(() => {
    if (pdfDoc) {
      getBookmarks(pdfDoc).then(setBookmarks);
    }
  }, [pdfDoc]);

  // Track unsaved changes
  useEffect(() => {
    setHasUnsavedChanges(true);
  }, [annotations, comments, threads, redactions, formFields]);

  // Handle tool selection with extended tools
  const handleToolSelect = useCallback((tool: EnterpriseTool) => {
    setSelectedTool(tool);
    // Sync with base tool if it's a standard tool
    if (['select', 'highlight', 'underline', 'strikethrough', 'rectangle', 'ellipse', 
         'arrow', 'line', 'freehand', 'text', 'sticky_note', 'signature', 'stamp', 'eraser'].includes(tool)) {
      setBaseTool(tool as any);
    }
    
    // Handle special tools
    if (tool === 'signature' && !signatureImage) {
      // Would open signature pad modal
    }
    if (tool === 'image') {
      imageInputRef.current?.click();
    }
  }, [setBaseTool, signatureImage]);

  // Handle stamp addition
  const handleAddStamp = useCallback((stampId: string | StampConfig) => {
    const config = typeof stampId === 'string' ? STAMP_TEMPLATES[stampId] : stampId;
    if (config) {
      setPendingStamp(config);
      setSelectedTool('stamp');
    }
  }, []);

  // Handle redaction addition
  const handleAddRedaction = useCallback((redaction: Omit<RedactionArea, 'pageNumber'>) => {
    setRedactions(prev => [...prev, { ...redaction, pageNumber: currentPage }]);
  }, [currentPage]);

  // Handle form field addition
  const handleAddFormField = useCallback((field: Omit<FormFieldDefinition, 'id'>) => {
    const newField: FormFieldDefinition = {
      ...field,
      id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
    setFormFields(prev => [...prev, newField]);
  }, []);

  // Handle comment addition from annotation layer
  const handleAddCommentFromLayer = useCallback((position: { x: number; y: number }) => {
    const newThread: AnnotationThread = {
      id: `thread_${Date.now()}`,
      pageNumber: currentPage,
      x: position.x,
      y: position.y,
      comments: [],
      resolved: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    setThreads(prev => [...prev, newThread]);
    setShowCommentsPanel(true);
  }, [currentPage]);

  // Handle search
  const handleSearch = useCallback(async (query: string, options: SearchOptions): Promise<SearchResult[]> => {
    if (!pdfDoc) return [];
    return await searchTextWithHighlight(pdfDoc, query, options);
  }, [pdfDoc]);

  // Handle search result selection
  const handleSearchResultSelect = useCallback((result: SearchResult) => {
    setCurrentPage(result.pageNumber);
    // Scroll to result position if available
  }, [setCurrentPage]);

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

    if (mergeInputRef.current) {
      mergeInputRef.current.value = '';
    }
  }, [mergePDFs]);

  // Handle image upload for insertion
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setInsertImage(dataUrl);
    };
    reader.readAsDataURL(file);
    
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  }, []);

  // Handle page rotation
  const handleRotateCW = useCallback(async () => {
    const current = currentPageInfo.rotation || 0;
    const newRotation = ((current + 90) % 360) as 0 | 90 | 180 | 270;
    await rotateCurrentPage(newRotation);
  }, [currentPageInfo.rotation, rotateCurrentPage]);

  const handleRotateCCW = useCallback(async () => {
    const current = currentPageInfo.rotation || 0;
    const newRotation = ((current - 90 + 360) % 360) as 0 | 90 | 180 | 270;
    await rotateCurrentPage(newRotation);
  }, [currentPageInfo.rotation, rotateCurrentPage]);

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

  // Handle insert blank page
  const handleInsertBlankPage = useCallback(async () => {
    // Would need to get PDF bytes and call insertBlankPage
    console.log('Insert blank page after', currentPage);
  }, [currentPage]);

  // Handle duplicate page
  const handleDuplicatePage = useCallback(async () => {
    // Would need to get PDF bytes and call duplicatePage
    console.log('Duplicate page', currentPage);
  }, [currentPage]);

  // Handle save
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setSyncStatus('syncing');
    
    try {
      await onSave?.({
        annotations,
        comments,
        threads,
        formFields,
        redactions,
      });
      
      setHasUnsavedChanges(false);
      setLastSaved(new Date());
      setSyncStatus('synced');
    } catch (error) {
      console.error('Save failed:', error);
      setSyncStatus('offline');
    } finally {
      setIsSaving(false);
    }
  }, [annotations, comments, threads, formFields, redactions, onSave]);

  // Auto-save handler
  const handleAutoSave = useCallback(() => {
    // Debounced auto-save would go here
    setHasUnsavedChanges(true);
  }, []);

  // Handle export with flattened annotations
  const handleExportFlattened = useCallback(async () => {
    // Would call flattenAnnotations and export
    console.log('Export flattened');
    await exportWithAnnotations(`${documentName}-annotated.pdf`);
  }, [documentName, exportWithAnnotations]);

  // Handle print
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

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

  // Fit to width
  const fitToWidth = useCallback(() => {
    if (!viewerRef.current) return;
    const containerWidth = viewerRef.current.clientWidth - 48;
    const newZoom = containerWidth / pageWidth;
    setZoom(Math.min(newZoom, 2));
  }, [pageWidth, setZoom]);

  // Fit to height
  const fitToHeight = useCallback(() => {
    if (!viewerRef.current) return;
    const containerHeight = viewerRef.current.clientHeight - 48;
    const newZoom = containerHeight / pageHeight;
    setZoom(Math.min(newZoom, 2));
  }, [pageHeight, setZoom]);

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

      // Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }

      // Search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowSearchPanel(true);
      }

      // Escape
      if (e.key === 'Escape') {
        setSelectedAnnotation(null);
        setSelectedComment(null);
        setShowSearchPanel(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prevPage, nextPage, setCurrentPage, totalPages, zoomIn, zoomOut, setZoom, undo, redo, handleSave, setSelectedAnnotation, setSelectedComment]);

  // Render current page when it changes
  useEffect(() => {
    const canvas = document.getElementById(`pdf-canvas-${currentPage}`) as HTMLCanvasElement;
    if (canvas && pdfDoc) {
      renderPage(currentPage, canvas);
    }
  }, [currentPage, pdfDoc, zoom, renderPage]);

  // Mentionable users for collaboration
  const mentionableUsers = useMemo(() => [
    { id: userId, name: userName, avatar: userAvatar },
    ...collaborators.map(c => ({ id: c.id, name: c.name, avatar: c.avatar })),
  ], [userId, userName, userAvatar, collaborators]);

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
            {hasUnsavedChanges && (
              <span className="w-2 h-2 bg-orange-500 rounded-full" title="Unsaved changes" />
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Sync Status */}
          <div className="flex items-center gap-1 text-sm">
            {syncStatus === 'synced' && (
              <span className="flex items-center gap-1 text-green-600">
                <Cloud size={16} />
                {lastSaved && `Saved ${lastSaved.toLocaleTimeString()}`}
              </span>
            )}
            {syncStatus === 'syncing' && (
              <span className="flex items-center gap-1 text-blue-600">
                <Loader2 size={16} className="animate-spin" />
                Saving...
              </span>
            )}
            {syncStatus === 'offline' && (
              <span className="flex items-center gap-1 text-orange-600">
                <CloudOff size={16} />
                Offline
              </span>
            )}
          </div>

          {/* Collaborators */}
          {enableCollaboration && collaborators.length > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-lg">
              <Users size={14} className="text-gray-500" />
              <div className="flex -space-x-2">
                {collaborators.slice(0, 3).map(c => (
                  <div
                    key={c.id}
                    className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[10px] text-white"
                    style={{ backgroundColor: c.online ? c.color : '#9ca3af' }}
                    title={`${c.name}${c.online ? '' : ' (offline)'}`}
                  >
                    {c.avatar ? (
                      <img src={c.avatar} alt="" className="w-full h-full rounded-full" />
                    ) : (
                      c.name[0].toUpperCase()
                    )}
                  </div>
                ))}
              </div>
              {collaborators.length > 3 && (
                <span className="text-xs text-gray-500">+{collaborators.length - 3}</span>
              )}
            </div>
          )}

          {/* Panel toggles */}
          <button
            onClick={() => setShowBookmarksPanel(!showBookmarksPanel)}
            className={`p-2 rounded-lg transition-colors ${
              showBookmarksPanel ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'
            }`}
            title="Bookmarks"
          >
            <History size={18} />
          </button>

          {showComments && (
            <button
              onClick={() => setShowCommentsPanel(!showCommentsPanel)}
              className={`p-2 rounded-lg transition-colors ${
                showCommentsPanel ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'
              }`}
              title="Comments"
            >
              <MessageSquare size={18} />
            </button>
          )}

          <button
            onClick={() => setShowThumbnailPanel(!showThumbnailPanel)}
            className={`p-2 rounded-lg transition-colors ${
              showThumbnailPanel ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'
            }`}
            title="Thumbnails"
          >
            {showThumbnailPanel ? <PanelLeftClose size={18} /> : <PanelLeft size={18} />}
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Fullscreen"
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>
      </div>

      {/* Toolbar */}
      {showToolbar && !readOnly && (
        <PDFEnterpriseToolbar
          selectedTool={selectedTool}
          onToolSelect={handleToolSelect}
          toolColor={toolColor}
          onColorChange={setToolColor}
          toolWidth={toolWidth}
          onWidthChange={setToolWidth}
          fontSize={fontSize}
          onFontSizeChange={setFontSize}
          fontFamily={fontFamily}
          onFontFamilyChange={setFontFamily}
          zoom={zoom}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onZoomChange={setZoom}
          onFitWidth={fitToWidth}
          onFitHeight={fitToHeight}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={undo}
          onRedo={redo}
          onRotateCW={handleRotateCW}
          onRotateCCW={handleRotateCCW}
          onDeletePage={handleDeletePage}
          onExtractPage={handleExtractPage}
          onInsertBlankPage={handleInsertBlankPage}
          onDuplicatePage={handleDuplicatePage}
          onMerge={() => mergeInputRef.current?.click()}
          onAddStamp={handleAddStamp}
          onExportWithAnnotations={() => exportWithAnnotations(`${documentName}-annotated.pdf`)}
          onExportOriginal={() => exportOriginal(`${documentName}.pdf`)}
          onExportFlattened={handleExportFlattened}
          onPrint={handlePrint}
          onSave={handleSave}
          onUpload={() => fileInputRef.current?.click()}
          onUploadImage={() => imageInputRef.current?.click()}
          onToggleComments={() => setShowCommentsPanel(!showCommentsPanel)}
          commentsEnabled={showCommentsPanel}
          onToggleVersionHistory={() => setShowVersionHistory(!showVersionHistory)}
          onToggleBookmarks={() => setShowBookmarksPanel(!showBookmarksPanel)}
          onToggleSearch={() => setShowSearchPanel(!showSearchPanel)}
          onToggleThumbnails={() => setShowThumbnailPanel(!showThumbnailPanel)}
          totalPages={totalPages}
          currentPage={currentPage}
          hasUnsavedChanges={hasUnsavedChanges}
          collaboratorsCount={collaborators.filter(c => c.online).length}
          disabled={isLoading || !pdfDoc}
        />
      )}

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Bookmarks Panel */}
        <AnimatePresence>
          {showBookmarksPanel && (
            <PDFBookmarksPanel
              bookmarks={bookmarks}
              currentPage={currentPage}
              onPageSelect={setCurrentPage}
              onClose={() => setShowBookmarksPanel(false)}
              isOpen={showBookmarksPanel}
              allowEditing={!readOnly}
            />
          )}
        </AnimatePresence>

        {/* Thumbnails Panel */}
        <AnimatePresence>
          {showThumbnailPanel && (
            <PDFThumbnails
              thumbnails={thumbnails}
              pages={pages}
              currentPage={currentPage}
              onPageSelect={setCurrentPage}
              onReorder={reorderPages}
              onRotatePage={(page) => {
                setCurrentPage(page);
                handleRotateCW();
              }}
              onDeletePage={(page) => {
                setCurrentPage(page);
                handleDeletePage();
              }}
              onExtractPage={(page) => {
                setCurrentPage(page);
                handleExtractPage();
              }}
              onDuplicatePage={!readOnly ? handleDuplicatePage : undefined}
              isLoading={isLoading}
              annotationCounts={annotationCounts}
              onToggleCollapsed={() => setShowThumbnailPanel(false)}
            />
          )}
        </AnimatePresence>

        {/* PDF Viewer */}
        <div
          ref={viewerRef}
          className="flex-1 overflow-auto bg-gray-200 flex items-center justify-center relative"
        >
          {/* Search Panel */}
          <AnimatePresence>
            {showSearchPanel && (
              <PDFSearchPanel
                onSearch={handleSearch}
                onResultSelect={handleSearchResultSelect}
                onClose={() => setShowSearchPanel(false)}
                onHighlightResults={setSearchResults}
                isOpen={showSearchPanel}
                currentPage={currentPage}
                totalPages={totalPages}
              />
            )}
          </AnimatePresence>

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
                  <PDFEnterpriseAnnotationLayer
                    pageWidth={pageWidth}
                    pageHeight={pageHeight}
                    annotations={currentPageAnnotations}
                    redactions={currentPageRedactions}
                    formFields={currentPageFormFields}
                    selectedAnnotation={selectedAnnotation}
                    onSelectAnnotation={setSelectedAnnotation}
                    onAddAnnotation={addAnnotation}
                    onUpdateAnnotation={updateAnnotation}
                    onDeleteAnnotation={deleteAnnotation}
                    onAddRedaction={handleAddRedaction}
                    onAddFormField={handleAddFormField}
                    onAddComment={handleAddCommentFromLayer}
                    selectedTool={selectedTool}
                    toolColor={toolColor}
                    toolWidth={toolWidth}
                    fontSize={fontSize}
                    fontFamily={fontFamily}
                    pageNumber={currentPage}
                    zoom={zoom}
                    stampConfig={pendingStamp || undefined}
                    signatureImage={signatureImage || undefined}
                    insertImage={insertImage || undefined}
                    showCommentMarkers={showComments}
                    commentMarkers={commentMarkers}
                    onCommentClick={(id) => {
                      const comment = comments.find(c => c.id === id);
                      if (comment) {
                        setSelectedComment(comment);
                        setShowCommentsPanel(true);
                      }
                    }}
                  />
                )}

                {/* Search Highlights */}
                {searchResults
                  .filter(r => r.pageNumber === currentPage && r.rect)
                  .map((result, i) => (
                    <div
                      key={i}
                      className="absolute bg-yellow-300/50 border-2 border-yellow-500 pointer-events-none"
                      style={{
                        left: result.rect!.x * pageWidth * zoom,
                        top: result.rect!.y * pageHeight * zoom,
                        width: result.rect!.width * pageWidth * zoom,
                        height: result.rect!.height * pageHeight * zoom,
                      }}
                    />
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

        {/* Comments/Collaboration Panel */}
        <AnimatePresence>
          {showCommentsPanel && showComments && (
            <PDFCollaborationPanel
              threads={threads}
              currentUserId={userId}
              
              currentPage={currentPage}
              onAddThread={(thread, comment) => {
                const newThread: AnnotationThread = {
                  ...thread,
                  id: `thread_${Date.now()}`,
                  comments: [{
                    id: `comment_${Date.now()}`,
                    threadId: '',
                    authorId: userId,
                    authorName: userName,
                    content: comment,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  }],
                  createdAt: new Date(),
                  updatedAt: new Date(),
                };
                newThread.comments[0].threadId = newThread.id;
                setThreads(prev => [...prev, newThread]);
              }}
              onAddComment={(threadId, comment) => {
                setThreads(prev => prev.map(t => 
                  t.id === threadId 
                    ? {
                        ...t,
                        comments: [...t.comments, {
                          ...comment,
                          id: `comment_${Date.now()}`,
                          threadId,
                          createdAt: new Date(),
                          updatedAt: new Date(),
                        } as ThreadComment],
                        updatedAt: new Date(),
                      }
                    : t
                ));
              }}
              onEditComment={(threadId, commentId, content) => {
                setThreads(prev => prev.map(t =>
                  t.id === threadId
                    ? {
                        ...t,
                        comments: t.comments.map(c =>
                          c.id === commentId
                            ? { ...c, content, edited: true, updatedAt: new Date() }
                            : c
                        ),
                        updatedAt: new Date(),
                      }
                    : t
                ));
              }}
              onDeleteComment={(threadId, commentId) => {
                setThreads(prev => prev.map(t =>
                  t.id === threadId
                    ? { ...t, comments: t.comments.filter(c => c.id !== commentId) }
                    : t
                ).filter(t => t.comments.length > 0));
              }}
              onResolveThread={(threadId) => {
                setThreads(prev => prev.map(t =>
                  t.id === threadId
                    ? { ...t, resolved: true, resolvedBy: userName, resolvedAt: new Date() }
                    : t
                ));
              }}
              onReopenThread={(threadId) => {
                setThreads(prev => prev.map(t =>
                  t.id === threadId
                    ? { ...t, resolved: false, resolvedBy: undefined, resolvedAt: undefined }
                    : t
                ));
              }}
              onDeleteThread={(threadId) => {
                setThreads(prev => prev.filter(t => t.id !== threadId));
              }}
              onReactToComment={(threadId, commentId, emoji) => {
                setThreads(prev => prev.map(t =>
                  t.id === threadId
                    ? {
                        ...t,
                        comments: t.comments.map(c => {
                          if (c.id !== commentId) return c;
                          
                          const reactions = c.reactions || [];
                          const existing = reactions.find(r => r.emoji === emoji);
                          
                          if (existing) {
                            if (existing.users.includes(userId)) {
                              existing.users = existing.users.filter(u => u !== userId);
                              if (existing.users.length === 0) {
                                return { ...c, reactions: reactions.filter(r => r.emoji !== emoji) };
                              }
                            } else {
                              existing.users.push(userId);
                            }
                            return { ...c, reactions: [...reactions] };
                          }
                          
                          return { ...c, reactions: [...reactions, { emoji, users: [userId] }] };
                        }),
                      }
                    : t
                ));
              }}
              onGoToThread={(thread) => {
                setCurrentPage(thread.pageNumber);
              }}
              onClose={() => setShowCommentsPanel(false)}
              isOpen={showCommentsPanel}
              collaborators={collaborators}
              mentionableUsers={mentionableUsers}
            />
          )}
        </AnimatePresence>
      </div>

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
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />
    </div>
  );
};

export default PDFEnterpriseEditor;
