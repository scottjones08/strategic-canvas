// OfficeViewer.tsx - Microsoft Office Document Viewer/Editor Component
// Supports Word (.docx), Excel (.xlsx), and PowerPoint (.pptx) files
// with multiple rendering strategies: client-side libs, OnlyOffice, or MS Office embed

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Table,
  Presentation,
  Download,
  Printer,
  Share2,
  // Edit3,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Settings,
  X,
  ZoomIn,
  ZoomOut,
  Sheet,
} from 'lucide-react';
import {
  OfficeDocumentType,
  OfficeDocumentInfo,
  detectOfficeType,
  formatFileSize,
  OFFICE_TYPE_COLORS,
  OFFICE_TYPE_LABELS,
  getMicrosoftOfficeEmbedUrl,
  getGoogleDocsViewerUrl,
  createOnlyOfficeConfig,
  OnlyOfficeConfig,
} from '../lib/office-utils';
import {
  useOfficeDocument,
  // useExcelDocument,
} from '../hooks/useOfficeDocument';
import type {
  WordDocumentContent,
  ExcelWorkbook,
  PowerPointPresentation,
} from '../lib/office-utils';
import { detectOfficeType } from '../lib/office-utils';

// ============================================
// TYPES
// ============================================

export type ViewerMode = 'native' | 'onlyoffice' | 'microsoft' | 'google';
export type EditMode = 'view' | 'edit';

export interface OfficeViewerProps {
  // File source (provide one)
  file?: File;
  url?: string;
  arrayBuffer?: ArrayBuffer;
  filename?: string;
  
  // Viewer configuration
  viewerMode?: ViewerMode;
  editMode?: EditMode;
  
  // OnlyOffice configuration (for 'onlyoffice' mode)
  onlyOfficeConfig?: OnlyOfficeConfig;
  
  // Callbacks
  onLoad?: (info: OfficeDocumentInfo) => void;
  onError?: (error: Error) => void;
  onSave?: (data: Blob | ArrayBuffer) => Promise<void>;
  onShare?: () => void;
  onDownload?: () => void;
  onPrint?: () => void;
  onClose?: () => void;
  
  // UI options
  showToolbar?: boolean;
  showFullscreenButton?: boolean;
  toolbarActions?: React.ReactNode;
  className?: string;
  height?: string | number;
  width?: string | number;
}

// ============================================
// MAIN COMPONENT
// ============================================

export const OfficeViewer: React.FC<OfficeViewerProps> = ({
  file,
  url,
  arrayBuffer,
  filename,
  viewerMode,
  editMode = 'view',
  onlyOfficeConfig,
  onLoad,
  onError,
  // onSave,
  onShare,
  onDownload,
  onPrint,
  onClose,
  showToolbar = true,
  showFullscreenButton = true,
  toolbarActions,
  className = '',
  height = '100%',
  width = '100%',
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [activeTab, setActiveTab] = useState(0); // For Excel sheets or PPT slides
  const [showSettings, setShowSettings] = useState(false);
  const onlyOfficeUrl = import.meta.env.VITE_ONLYOFFICE_URL as string | undefined;
  const onlyOfficeJwtSecret = import.meta.env.VITE_ONLYOFFICE_JWT_SECRET as string | undefined;
  const onlyOfficeSignUrl = (import.meta.env.VITE_ONLYOFFICE_SIGN_URL as string | undefined)
    || (import.meta.env.VITE_SUPABASE_URL
      ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/onlyoffice-sign`
      : undefined);
  const initialViewerMode = viewerMode || (onlyOfficeUrl ? 'onlyoffice' : 'native');
  const [selectedViewerMode, setSelectedViewerMode] = useState<ViewerMode>(initialViewerMode);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    isLoading,
    error,
    info,
    wordContent,
    excelWorkbook,
    powerPointPresentation,
    loadDocument,
    loadFromUrl,
    clear,
  } = useOfficeDocument({
    onLoad,
    onError,
    autoProcess: selectedViewerMode === 'native',
  });

  const resolvedInfo = useMemo(() => {
    if (info) return info;
    const sourceName = filename || file?.name || url?.split('/').pop() || 'document';
    const extension = sourceName.includes('.') ? sourceName.substring(sourceName.lastIndexOf('.')) : '';
    const isPdf = extension.toLowerCase() === '.pdf';
    const inferredType = isPdf ? 'word' : detectOfficeType(sourceName, file?.type);
    return {
      type: inferredType,
      name: sourceName,
      size: file?.size || 0,
      mimeType: file?.type || (isPdf ? 'application/pdf' : 'application/octet-stream'),
      extension,
    };
  }, [info, filename, file, url]);

  const resolvedOnlyOfficeConfig = useMemo<OnlyOfficeConfig | undefined>(() => {
    if (onlyOfficeConfig) return onlyOfficeConfig;
    if (!onlyOfficeUrl) return undefined;
    return {
      documentServerUrl: onlyOfficeUrl,
      jwtSecret: onlyOfficeJwtSecret,
    };
  }, [onlyOfficeConfig, onlyOfficeUrl, onlyOfficeJwtSecret]);

  // Determine document type from available inputs
  const documentType = useMemo((): OfficeDocumentType => {
    if (resolvedInfo) return resolvedInfo.type;
    if (file) return detectOfficeType(file.name, file.type);
    if (filename) return detectOfficeType(filename);
    if (url) {
      const urlFilename = url.split('/').pop()?.split('?')[0] || '';
      return detectOfficeType(urlFilename);
    }
    return 'unknown';
  }, [resolvedInfo, file, filename, url]);

  // Load document on mount or when source changes
  useEffect(() => {
    if (selectedViewerMode === 'native') {
      if (file) {
        loadDocument(file);
      } else if (url) {
        loadFromUrl(url, filename);
      } else if (arrayBuffer && filename) {
        loadDocument(arrayBuffer, filename);
      }
    }
  }, [file, url, arrayBuffer, filename, selectedViewerMode, loadDocument, loadFromUrl]);

  // Handle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  // Handle zoom
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 25, 200));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 25, 50));
  }, []);

  // Handle print
  const handlePrint = useCallback(() => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  }, [onPrint]);

  // Handle download
  const handleDownload = useCallback(async () => {
    if (onDownload) {
      onDownload();
      return;
    }

    // Default download behavior
    let downloadUrl = url;
    let downloadName = filename || resolvedInfo?.name || 'document';

    if (file) {
      downloadUrl = URL.createObjectURL(file);
      downloadName = file.name;
    }

    if (downloadUrl) {
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = downloadName;
      a.click();

      if (file) {
        URL.revokeObjectURL(downloadUrl);
      }
    }
  }, [url, file, filename, resolvedInfo, onDownload]);

  // Render document type icon

  // Get embed URL for external viewers
  const embedUrl = useMemo(() => {
    const fileUrl = url || (file ? URL.createObjectURL(file) : '');
    
    if (!fileUrl) return '';

    switch (selectedViewerMode) {
      case 'microsoft':
        return getMicrosoftOfficeEmbedUrl(documentType, fileUrl, { edit: editMode === 'edit' });
      case 'google':
        return getGoogleDocsViewerUrl(fileUrl);
      default:
        return '';
    }
  }, [url, file, selectedViewerMode, documentType, editMode]);

  // Render content based on viewer mode and document type
  const renderContent = () => {
    // External viewer modes (iframe-based)
    if (selectedViewerMode === 'microsoft' || selectedViewerMode === 'google' || selectedViewerMode === 'onlyoffice') {
      if (selectedViewerMode === 'onlyoffice' && resolvedOnlyOfficeConfig) {
        return (
          <OnlyOfficeViewer
            config={resolvedOnlyOfficeConfig}
            url={url || ''}
            info={resolvedInfo}
            editMode={editMode}
            signUrl={onlyOfficeSignUrl}
            supabaseAnonKey={import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined}
          />
        );
      }

      if (embedUrl) {
        return (
          <iframe
            src={embedUrl}
            className="w-full h-full border-0"
            title={resolvedInfo?.name || 'Document'}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        );
      }

      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-500">
          <AlertCircle size={48} />
          <p>No document URL available for external viewer</p>
        </div>
      );
    }

    // Native rendering mode
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <Loader2 size={48} className="animate-spin text-blue-500" />
          <p className="text-gray-600">Loading document...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 text-red-500">
          <AlertCircle size={48} />
          <p className="font-medium">Error loading document</p>
          <p className="text-sm text-gray-600 max-w-md text-center">{error}</p>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => {
                clear();
                if (file) loadDocument(file);
                else if (url) loadFromUrl(url, filename);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              <RefreshCw size={16} />
              Retry
            </button>
            <button
              onClick={() => setSelectedViewerMode('google')}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <ExternalLink size={16} />
              Try Google Viewer
            </button>
          </div>
        </div>
      );
    }

    // Render by document type
    switch (documentType) {
      case 'word':
        return wordContent ? (
          <WordDocumentRenderer content={wordContent} zoom={zoom} />
        ) : (
          <NoContentPlaceholder type="word" />
        );

      case 'excel':
        return excelWorkbook ? (
          <ExcelWorkbookRenderer
            workbook={excelWorkbook}
            activeSheet={activeTab}
            onSheetChange={setActiveTab}
            zoom={zoom}
            editMode={editMode}
          />
        ) : (
          <NoContentPlaceholder type="excel" />
        );

      case 'powerpoint':
        return powerPointPresentation ? (
          <PowerPointRenderer
            presentation={powerPointPresentation}
            activeSlide={activeTab}
            onSlideChange={setActiveTab}
            zoom={zoom}
          />
        ) : (
          <NoContentPlaceholder type="powerpoint" />
        );

      default:
        return (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-500">
            <AlertCircle size={48} />
            <p>Unsupported document type</p>
          </div>
        );
    }
  };

  return (
    <div
      ref={containerRef}
      className={`flex flex-col bg-white rounded-lg shadow-sm overflow-hidden ${className}`}
      style={{ height, width }}
    >
      {/* Toolbar */}
      {showToolbar && (
        <OfficeViewerToolbar
          info={info}
          documentType={documentType}
          editMode={editMode}
          viewerMode={selectedViewerMode}
          zoom={zoom}
          isFullscreen={isFullscreen}
          showFullscreenButton={showFullscreenButton}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onToggleFullscreen={toggleFullscreen}
          onPrint={handlePrint}
          onDownload={handleDownload}
          onShare={onShare}
          onClose={onClose}
          onViewerModeChange={setSelectedViewerMode}
          onShowSettings={() => setShowSettings(true)}
          toolbarActions={toolbarActions}
        />
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden relative">
        {renderContent()}
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <ViewerSettingsModal
            viewerMode={selectedViewerMode}
            onViewerModeChange={setSelectedViewerMode}
            onClose={() => setShowSettings(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================
// TOOLBAR COMPONENT
// ============================================

interface OfficeViewerToolbarProps {
  info: OfficeDocumentInfo | null;
  documentType: OfficeDocumentType;
  editMode: EditMode;
  viewerMode: ViewerMode;
  zoom: number;
  isFullscreen: boolean;
  showFullscreenButton: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToggleFullscreen: () => void;
  onPrint: () => void;
  onDownload: () => void;
  onShare?: () => void;
  onClose?: () => void;
  onViewerModeChange: (mode: ViewerMode) => void;
  onShowSettings: () => void;
  toolbarActions?: React.ReactNode;
}

const OfficeViewerToolbar: React.FC<OfficeViewerToolbarProps> = ({
  info,
  documentType,
  editMode,
  viewerMode,
  zoom,
  isFullscreen,
  showFullscreenButton,
  onZoomIn,
  onZoomOut,
  onToggleFullscreen,
  onPrint,
  onDownload,
  onShare,
  onClose,
  onViewerModeChange,
  onShowSettings,
  toolbarActions,
}) => {
  const [_showMoreMenu, _setShowMoreMenu] = useState(false);

  const DocumentIcon = useMemo(() => {
    switch (documentType) {
      case 'word': return FileText;
      case 'excel': return Table;
      case 'powerpoint': return Presentation;
      default: return FileText;
    }
  }, [documentType]);

  const typeColor = OFFICE_TYPE_COLORS[documentType];

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
      {/* Left: Document info */}
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${typeColor}15` }}
        >
          <DocumentIcon size={18} style={{ color: typeColor }} />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
            {info?.name || 'Document'}
          </h3>
          <p className="text-xs text-gray-500">
            {OFFICE_TYPE_LABELS[documentType]}
            {info?.size && ` • ${formatFileSize(info.size)}`}
          </p>
        </div>

        {/* Edit mode badge */}
        <span
          className={`px-2 py-0.5 text-xs rounded-full ${
            editMode === 'edit'
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          {editMode === 'edit' ? 'Editing' : 'View only'}
        </span>
      </div>

      {/* Center: Zoom controls (for native mode) */}
      {viewerMode === 'native' && (
        <div className="flex items-center gap-2">
          <button
            onClick={onZoomOut}
            disabled={zoom <= 50}
            className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Zoom out"
          >
            <ZoomOut size={16} />
          </button>
          <span className="text-sm text-gray-600 w-12 text-center">{zoom}%</span>
          <button
            onClick={onZoomIn}
            disabled={zoom >= 200}
            className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Zoom in"
          >
            <ZoomIn size={16} />
          </button>
        </div>
      )}

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        {/* Custom toolbar actions */}
        {toolbarActions}

        {/* Viewer mode selector */}
        <select
          value={viewerMode}
          onChange={(e) => onViewerModeChange(e.target.value as ViewerMode)}
          className="text-xs px-2 py-1.5 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="native">Native Viewer</option>
          <option value="google">Google Docs</option>
          <option value="microsoft">Microsoft Office</option>
          <option value="onlyoffice">OnlyOffice</option>
        </select>

        <div className="w-px h-6 bg-gray-200 mx-1" />

        <button
          onClick={onPrint}
          className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
          title="Print"
        >
          <Printer size={18} />
        </button>

        <button
          onClick={onDownload}
          className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
          title="Download"
        >
          <Download size={18} />
        </button>

        {onShare && (
          <button
            onClick={onShare}
            className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
            title="Share"
          >
            <Share2 size={18} />
          </button>
        )}

        {showFullscreenButton && (
          <button
            onClick={onToggleFullscreen}
            className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        )}

        <button
          onClick={onShowSettings}
          className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
          title="Settings"
        >
          <Settings size={18} />
        </button>

        {onClose && (
          <>
            <div className="w-px h-6 bg-gray-200 mx-1" />
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-red-100 text-gray-600 hover:text-red-600 transition-colors"
              title="Close"
            >
              <X size={18} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// ============================================
// WORD DOCUMENT RENDERER
// ============================================

interface WordDocumentRendererProps {
  content: WordDocumentContent;
  zoom: number;
}

const WordDocumentRenderer: React.FC<WordDocumentRendererProps> = ({ content, zoom }) => {
  return (
    <div className="h-full overflow-auto bg-gray-100 p-8">
      <div
        className="mx-auto bg-white shadow-lg rounded-sm"
        style={{
          maxWidth: `${8.5 * 96 * (zoom / 100)}px`, // 8.5 inches at 96dpi
          minHeight: `${11 * 96 * (zoom / 100)}px`, // 11 inches at 96dpi
          padding: `${1 * 96 * (zoom / 100)}px`, // 1 inch margins
          transform: `scale(${zoom / 100})`,
          transformOrigin: 'top center',
        }}
      >
        <style>{content.styles}</style>
        <div
          className="mammoth-document"
          dangerouslySetInnerHTML={{ __html: content.html }}
        />
      </div>

      {/* Conversion messages (warnings) */}
      {content.messages.length > 0 && (
        <div className="mx-auto mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg max-w-2xl">
          <h4 className="text-sm font-medium text-yellow-800 mb-2">Conversion Notes</h4>
          <ul className="text-xs text-yellow-700 space-y-1">
            {content.messages.map((msg: string, i: number) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// ============================================
// EXCEL WORKBOOK RENDERER
// ============================================

interface ExcelWorkbookRendererProps {
  workbook: ExcelWorkbook;
  activeSheet: number;
  onSheetChange: (index: number) => void;
  zoom: number;
  editMode: EditMode;
}

const ExcelWorkbookRenderer: React.FC<ExcelWorkbookRendererProps> = ({
  workbook,
  activeSheet,
  onSheetChange,
  zoom,
  editMode,
}) => {
  const sheet = workbook.sheets[activeSheet];
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [cellValue, setCellValue] = useState('');

  if (!sheet) return null;

  const handleCellClick = (row: number, col: number) => {
    if (editMode === 'edit') {
      setEditingCell({ row, col });
      setCellValue(String(sheet.data[row]?.[col] ?? ''));
    }
  };

  const handleCellBlur = () => {
    // In a real implementation, this would update the cell value
    setEditingCell(null);
  };

  // Get column letter (A, B, C, ... Z, AA, AB, etc.)
  const getColumnLetter = (col: number): string => {
    let letter = '';
    while (col >= 0) {
      letter = String.fromCharCode((col % 26) + 65) + letter;
      col = Math.floor(col / 26) - 1;
    }
    return letter;
  };

  // Calculate max columns
  const maxCols = Math.max(...sheet.data.map(row => row.length), 26);
  const maxRows = Math.max(sheet.data.length, 50);

  return (
    <div className="h-full flex flex-col">
      {/* Sheet tabs */}
      <div className="flex items-center bg-gray-100 border-b border-gray-200 px-2 overflow-x-auto">
        {workbook.sheets.map((s: any, index: number) => (
          <button
            key={s.name}
            onClick={() => onSheetChange(index)}
            className={`
              px-4 py-2 text-sm font-medium border-t border-l border-r rounded-t-lg -mb-px transition-colors
              ${activeSheet === index
                ? 'bg-white border-gray-200 text-gray-900'
                : 'bg-gray-50 border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }
            `}
          >
            <Sheet size={14} className="inline mr-1.5" />
            {s.name}
          </button>
        ))}
      </div>

      {/* Spreadsheet grid */}
      <div className="flex-1 overflow-auto">
        <table
          className="border-collapse"
          style={{ fontSize: `${12 * (zoom / 100)}px` }}
        >
          <thead className="sticky top-0 z-10">
            <tr>
              {/* Row number header */}
              <th className="sticky left-0 z-20 bg-gray-100 border border-gray-300 w-12 min-w-[48px]" />
              {/* Column headers */}
              {Array.from({ length: maxCols }, (_, i) => (
                <th
                  key={i}
                  className="bg-gray-100 border border-gray-300 px-2 py-1 text-center font-medium text-gray-600"
                  style={{ minWidth: sheet.colWidths?.[i] || 80 }}
                >
                  {getColumnLetter(i)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: maxRows }, (_, rowIndex) => (
              <tr key={rowIndex}>
                {/* Row number */}
                <td className="sticky left-0 z-10 bg-gray-100 border border-gray-300 px-2 py-1 text-center font-medium text-gray-600">
                  {rowIndex + 1}
                </td>
                {/* Cells */}
                {Array.from({ length: maxCols }, (_, colIndex) => {
                  const cellData = sheet.data[rowIndex]?.[colIndex];
                  const isEditing = editingCell?.row === rowIndex && editingCell?.col === colIndex;

                  return (
                    <td
                      key={colIndex}
                      className={`
                        border border-gray-200 px-2 py-1
                        ${editMode === 'edit' ? 'cursor-text hover:bg-blue-50' : ''}
                        ${isEditing ? 'bg-blue-50 ring-2 ring-blue-500' : ''}
                      `}
                      onClick={() => handleCellClick(rowIndex, colIndex)}
                      style={{
                        minWidth: sheet.colWidths?.[colIndex] || 80,
                        height: sheet.rowHeights?.[rowIndex] || 24,
                      }}
                    >
                      {isEditing ? (
                        <input
                          type="text"
                          value={cellValue}
                          onChange={(e) => setCellValue(e.target.value)}
                          onBlur={handleCellBlur}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === 'Tab') {
                              handleCellBlur();
                            }
                            if (e.key === 'Escape') {
                              setEditingCell(null);
                            }
                          }}
                          className="w-full h-full border-0 outline-none bg-transparent"
                          autoFocus
                        />
                      ) : (
                        <span className="block truncate">
                          {cellData !== null && cellData !== undefined ? String(cellData) : ''}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-1 bg-gray-50 border-t border-gray-200 text-xs text-gray-600">
        <span>
          {sheet.data.length} rows × {Math.max(...sheet.data.map(r => r.length))} columns
        </span>
        <span>{workbook.sheets.length} sheet(s)</span>
      </div>
    </div>
  );
};

// ============================================
// POWERPOINT RENDERER
// ============================================

interface PowerPointRendererProps {
  presentation: PowerPointPresentation;
  activeSlide: number;
  onSlideChange: (index: number) => void;
  zoom: number;
}

const PowerPointRenderer: React.FC<PowerPointRendererProps> = ({
  presentation,
  activeSlide,
  onSlideChange,
  zoom,
}) => {
  const currentSlide = presentation.slides[activeSlide];

  const handlePrevSlide = () => {
    if (activeSlide > 0) {
      onSlideChange(activeSlide - 1);
    }
  };

  const handleNextSlide = () => {
    if (activeSlide < presentation.slides.length - 1) {
      onSlideChange(activeSlide + 1);
    }
  };

  return (
    <div className="h-full flex">
      {/* Slide thumbnails sidebar */}
      <div className="w-48 bg-gray-100 border-r border-gray-200 overflow-y-auto p-2">
        {presentation.slides.map((slide: any, index: number) => (
          <button
            key={slide.index}
            onClick={() => onSlideChange(index)}
            className={`
              w-full mb-2 rounded-lg overflow-hidden border-2 transition-all
              ${activeSlide === index
                ? 'border-blue-500 shadow-md'
                : 'border-gray-200 hover:border-gray-300'
              }
            `}
          >
            <div className="aspect-video bg-white p-2 text-xs">
              {slide.thumbnail ? (
                <img src={slide.thumbnail} alt={`Slide ${index + 1}`} className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-50">
                  <span className="text-gray-400">Slide {index + 1}</span>
                </div>
              )}
            </div>
            <div className="py-1 px-2 bg-gray-50 text-xs text-gray-600 truncate">
              {slide.title || `Slide ${index + 1}`}
            </div>
          </button>
        ))}
      </div>

      {/* Main slide view */}
      <div className="flex-1 flex flex-col">
        {/* Slide content */}
        <div className="flex-1 flex items-center justify-center bg-gray-200 p-8 overflow-auto">
          <div
            className="bg-white shadow-xl rounded-sm"
            style={{
              width: `${960 * (zoom / 100)}px`,
              height: `${540 * (zoom / 100)}px`, // 16:9 aspect ratio
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'center',
            }}
          >
            {currentSlide ? (
              <div
                className="w-full h-full p-8"
                dangerouslySetInnerHTML={{ __html: currentSlide.content }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                No slide content
              </div>
            )}
          </div>
        </div>

        {/* Navigation controls */}
        <div className="flex items-center justify-center gap-4 py-3 bg-gray-100 border-t border-gray-200">
          <button
            onClick={handlePrevSlide}
            disabled={activeSlide === 0}
            className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={24} />
          </button>
          <span className="text-sm text-gray-600">
            Slide {activeSlide + 1} of {presentation.slides.length}
          </span>
          <button
            onClick={handleNextSlide}
            disabled={activeSlide === presentation.slides.length - 1}
            className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// ONLYOFFICE VIEWER COMPONENT
// ============================================

interface OnlyOfficeViewerProps {
  config: OnlyOfficeConfig;
  url: string;
  info: OfficeDocumentInfo | null;
  editMode: EditMode;
  signUrl?: string;
  supabaseAnonKey?: string;
}

const OnlyOfficeViewer: React.FC<OnlyOfficeViewerProps> = ({
  config,
  url,
  info,
  editMode,
  signUrl,
  supabaseAnonKey,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!config.documentServerUrl || !url || !info) {
      setError('OnlyOffice configuration incomplete');
      setIsLoading(false);
      return;
    }

    // Load OnlyOffice API script
    const loadScript = async () => {
      try {
        const script = document.createElement('script');
        script.src = `${config.documentServerUrl}/web-apps/apps/api/documents/api.js`;
        script.async = true;
        script.onload = () => initEditor();
        script.onerror = () => setError('Failed to load OnlyOffice API');
        document.head.appendChild(script);
      } catch (e) {
        setError('Failed to initialize OnlyOffice');
        setIsLoading(false);
      }
    };

    const initEditor = async () => {
      if (!containerRef.current || !(window as any).DocsAPI) {
        setError('OnlyOffice API not available');
        setIsLoading(false);
        return;
      }

      try {
        const editorConfig = await createOnlyOfficeConfig(
          config,
          {
            id: info.name, // Use filename as ID for now
            name: info.name,
            url: url,
            type: info.type,
          },
          {
            mode: editMode,
          }
        );

        if (!editorConfig.token && signUrl) {
          const response = await fetch(signUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(supabaseAnonKey ? { Authorization: `Bearer ${supabaseAnonKey}` } : {}),
            },
            body: JSON.stringify({ config: editorConfig }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data?.token) {
              editorConfig.token = data.token;
            }
          } else {
            setError('Failed to sign OnlyOffice config');
            setIsLoading(false);
            return;
          }
        }

        new (window as any).DocsAPI.DocEditor(containerRef.current.id, editorConfig);
        setIsLoading(false);
      } catch (e) {
        setError('Failed to create OnlyOffice editor');
        setIsLoading(false);
      }
    };

    loadScript();

    return () => {
      // Cleanup: remove script tag if needed
    };
  }, [config, url, info, editMode, signUrl, supabaseAnonKey]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-red-500">
        <AlertCircle size={48} />
        <p className="font-medium">OnlyOffice Error</p>
        <p className="text-sm text-gray-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white">
          <Loader2 size={48} className="animate-spin text-blue-500" />
        </div>
      )}
      <div ref={containerRef} id="onlyoffice-container" className="h-full" />
    </div>
  );
};

// ============================================
// NO CONTENT PLACEHOLDER
// ============================================

interface NoContentPlaceholderProps {
  type: OfficeDocumentType;
}

const NoContentPlaceholder: React.FC<NoContentPlaceholderProps> = ({ type }) => {
  const Icon = type === 'word' ? FileText : type === 'excel' ? Table : Presentation;
  const color = OFFICE_TYPE_COLORS[type];
  const label = OFFICE_TYPE_LABELS[type];

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-400">
      <div className="p-6 rounded-full" style={{ backgroundColor: `${color}10` }}>
        <Icon size={64} style={{ color }} />
      </div>
      <h3 className="text-lg font-medium text-gray-600">No {label} content</h3>
      <p className="text-sm text-gray-500 text-center max-w-md">
        The document could not be processed. Try using the OnlyOffice viewer or Google Docs.
      </p>
    </div>
  );
};

// ============================================
// SETTINGS MODAL
// ============================================

interface ViewerSettingsModalProps {
  viewerMode: ViewerMode;
  onViewerModeChange: (mode: ViewerMode) => void;
  onClose: () => void;
}

const ViewerSettingsModal: React.FC<ViewerSettingsModalProps> = ({
  viewerMode,
  onViewerModeChange,
  onClose,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-xl w-full max-w-md shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Viewer Settings</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Document Viewer
            </label>
            <div className="space-y-2">
              {[
                { value: 'native', label: 'Native Viewer', desc: 'Uses client-side libraries (mammoth, xlsx)' },
                { value: 'google', label: 'Google Docs Viewer', desc: 'Free, works with public URLs' },
                { value: 'onlyoffice', label: 'OnlyOffice', desc: 'Self-hosted, full editing support' },
              ].map((option) => (
                <label
                  key={option.value}
                  className={`
                    flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors
                    ${viewerMode === option.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}
                  `}
                >
                  <input
                    type="radio"
                    name="viewerMode"
                    value={option.value}
                    checked={viewerMode === option.value}
                    onChange={(e) => onViewerModeChange(e.target.value as ViewerMode)}
                    className="mt-1"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900">{option.label}</span>
                    <p className="text-xs text-gray-500">{option.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Done
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ============================================
// EXPORT
// ============================================

export default OfficeViewer;
