// OfficeEditor.tsx - Enterprise-grade Office document editor
// Supports Word, Excel, PowerPoint via OnlyOffice or fallback viewers

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  FileSpreadsheet,
  Presentation,
  Download,
  Printer,
  Share2,
  Maximize2,
  Minimize2,
  Edit3,
  Eye,
  X,
  Loader2,
  AlertTriangle,
  // Settings,
  Users,
  MessageSquare,
  History,
  // Save,
  // Undo,
  // Redo,
  // ZoomIn,
  // ZoomOut,
} from 'lucide-react';

// ============================================
// Types
// ============================================

export type OfficeDocumentType = 'word' | 'excel' | 'powerpoint' | 'pdf' | 'unknown';

export interface OfficeDocument {
  id: string;
  name: string;
  url: string;
  type: OfficeDocumentType;
  key?: string; // Unique document key for OnlyOffice
  permissions?: {
    edit: boolean;
    download: boolean;
    print: boolean;
    comment: boolean;
    review: boolean;
  };
}

export interface OfficeEditorProps {
  document: OfficeDocument;
  mode?: 'view' | 'edit';
  onSave?: (document: OfficeDocument) => void;
  onClose?: () => void;
  onShare?: (document: OfficeDocument) => void;
  onDownload?: (document: OfficeDocument) => void;
  serverUrl?: string; // OnlyOffice Document Server URL
  userId?: string;
  userName?: string;
  className?: string;
}

interface OnlyOfficeConfig {
  documentType: string;
  document: {
    fileType: string;
    key: string;
    title: string;
    url: string;
    permissions: {
      edit: boolean;
      download: boolean;
      print: boolean;
      comment: boolean;
      review: boolean;
    };
  };
  editorConfig: {
    mode: string;
    lang: string;
    callbackUrl?: string;
    user: {
      id: string;
      name: string;
    };
    customization: {
      autosave: boolean;
      chat: boolean;
      comments: boolean;
      compactHeader: boolean;
      compactToolbar: boolean;
      feedback: boolean;
      forcesave: boolean;
      help: boolean;
      hideRightMenu: boolean;
      logo: {
        image: string;
        imageEmbedded: string;
        url: string;
      };
      reviewDisplay: string;
      showReviewChanges: boolean;
      toolbarNoTabs: boolean;
      zoom: number;
    };
  };
  events?: {
    onDocumentReady?: () => void;
    onError?: (event: { data: { errorCode: number; errorDescription: string } }) => void;
    onWarning?: (event: { data: { warningCode: number; warningDescription: string } }) => void;
    onAppReady?: () => void;
  };
}

// ============================================
// Helper Functions
// ============================================

export function detectDocumentType(filename: string, mimeType?: string): OfficeDocumentType {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  // Word documents
  if (ext === 'doc' || ext === 'docx' || ext === 'odt' || ext === 'rtf') return 'word';
  if (mimeType?.includes('word') || mimeType?.includes('document')) return 'word';
  
  // Excel documents
  if (ext === 'xls' || ext === 'xlsx' || ext === 'ods' || ext === 'csv') return 'excel';
  if (mimeType?.includes('sheet') || mimeType?.includes('excel')) return 'excel';
  
  // PowerPoint documents
  if (ext === 'ppt' || ext === 'pptx' || ext === 'odp') return 'powerpoint';
  if (mimeType?.includes('presentation') || mimeType?.includes('powerpoint')) return 'powerpoint';
  
  // PDF
  if (ext === 'pdf' || mimeType === 'application/pdf') return 'pdf';
  
  return 'unknown';
}

function getOnlyOfficeDocType(type: OfficeDocumentType): string {
  switch (type) {
    case 'word': return 'word';
    case 'excel': return 'cell';
    case 'powerpoint': return 'slide';
    default: return 'word';
  }
}

function getFileExtension(type: OfficeDocumentType, filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (ext) return ext;
  
  switch (type) {
    case 'word': return 'docx';
    case 'excel': return 'xlsx';
    case 'powerpoint': return 'pptx';
    default: return 'docx';
  }
}

function getDocumentIcon(type: OfficeDocumentType) {
  switch (type) {
    case 'word': return FileText;
    case 'excel': return FileSpreadsheet;
    case 'powerpoint': return Presentation;
    default: return FileText;
  }
}

function getDocumentColor(type: OfficeDocumentType): string {
  switch (type) {
    case 'word': return 'text-blue-600 bg-blue-100';
    case 'excel': return 'text-green-600 bg-green-100';
    case 'powerpoint': return 'text-orange-600 bg-orange-100';
    default: return 'text-gray-600 bg-gray-100';
  }
}

// ============================================
// OnlyOffice Editor Component
// ============================================

export function OfficeEditor({
  document,
  mode = 'view',
  // onSave,
  onClose,
  onShare,
  onDownload,
  serverUrl,
  userId = 'user-1',
  userName = 'User',
  className = '',
}: OfficeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentMode, setCurrentMode] = useState(mode);
  const [showCollaborators, setShowCollaborators] = useState(false);

  const DocIcon = getDocumentIcon(document.type);
  const colorClass = getDocumentColor(document.type);

  // Initialize OnlyOffice editor
  const initEditor = useCallback(() => {
    if (!containerRef.current || !serverUrl) {
      // Fallback: use iframe embed or show not configured message
      setIsLoading(false);
      if (!serverUrl) {
        setError('Document server not configured. Please configure OnlyOffice Document Server URL.');
      }
      return;
    }

    // Load OnlyOffice API script
    const script = window.document.createElement('script');
    script.src = `${serverUrl}/web-apps/apps/api/documents/api.js`;
    script.async = true;
    script.onload = () => {
      initOnlyOffice();
    };
    script.onerror = () => {
      setError('Failed to load document editor. Please check your OnlyOffice server configuration.');
      setIsLoading(false);
    };
    window.document.head.appendChild(script);

    return () => {
      if (editorRef.current) {
        editorRef.current.destroyEditor?.();
      }
      script.remove();
    };
  }, [serverUrl]);

  const initOnlyOffice = useCallback(() => {
    if (!containerRef.current || !(window as any).DocsAPI) return;

    const config: OnlyOfficeConfig = {
      documentType: getOnlyOfficeDocType(document.type),
      document: {
        fileType: getFileExtension(document.type, document.name),
        key: document.key || `${document.id}-${Date.now()}`,
        title: document.name,
        url: document.url,
        permissions: document.permissions || {
          edit: currentMode === 'edit',
          download: true,
          print: true,
          comment: true,
          review: true,
        },
      },
      editorConfig: {
        mode: currentMode,
        lang: 'en',
        callbackUrl: undefined, // Set this to your callback endpoint for saves
        user: {
          id: userId,
          name: userName,
        },
        customization: {
          autosave: true,
          chat: true,
          comments: true,
          compactHeader: false,
          compactToolbar: false,
          feedback: false,
          forcesave: true,
          help: false,
          hideRightMenu: false,
          logo: {
            image: '',
            imageEmbedded: '',
            url: '',
          },
          reviewDisplay: 'markup',
          showReviewChanges: true,
          toolbarNoTabs: false,
          zoom: 100,
        },
      },
      events: {
        onDocumentReady: () => {
          setIsLoading(false);
        },
        onError: (event) => {
          setError(event.data.errorDescription || 'An error occurred');
          setIsLoading(false);
        },
        onAppReady: () => {
          console.log('OnlyOffice editor ready');
        },
      },
    };

    try {
      editorRef.current = new (window as any).DocsAPI.DocEditor(
        containerRef.current.id,
        config
      );
    } catch (err) {
      setError('Failed to initialize document editor');
      setIsLoading(false);
    }
  }, [document, currentMode, userId, userName]);

  useEffect(() => {
    initEditor();
  }, [initEditor]);

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      containerRef.current?.requestFullscreen?.();
    } else {
      window.document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  // Handle mode change
  const handleModeChange = (newMode: 'view' | 'edit') => {
    setCurrentMode(newMode);
    // Reinitialize editor with new mode
    if (editorRef.current) {
      editorRef.current.destroyEditor?.();
      setTimeout(initOnlyOffice, 100);
    }
  };

  return (
    <div className={`flex flex-col h-full bg-gray-100 ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClass}`}>
            <DocIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-medium text-gray-900 truncate max-w-md">{document.name}</h2>
            <p className="text-xs text-gray-500 capitalize">{document.type} Document</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => handleModeChange('view')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                currentMode === 'view' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Eye className="w-4 h-4" />
              View
            </button>
            <button
              onClick={() => handleModeChange('edit')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                currentMode === 'edit' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Edit3 className="w-4 h-4" />
              Edit
            </button>
          </div>

          <div className="w-px h-6 bg-gray-200" />

          {/* Collaborators */}
          <button
            onClick={() => setShowCollaborators(!showCollaborators)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative"
            title="Collaborators"
          >
            <Users className="w-5 h-5 text-gray-600" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-navy-700 text-white text-[10px] rounded-full flex items-center justify-center">
              1
            </span>
          </button>

          {/* Comments */}
          <button
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Comments"
          >
            <MessageSquare className="w-5 h-5 text-gray-600" />
          </button>

          {/* Version History */}
          <button
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Version History"
          >
            <History className="w-5 h-5 text-gray-600" />
          </button>

          <div className="w-px h-6 bg-gray-200" />

          {/* Download */}
          {onDownload && (
            <button
              onClick={() => onDownload(document)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Download"
            >
              <Download className="w-5 h-5 text-gray-600" />
            </button>
          )}

          {/* Print */}
          <button
            onClick={() => window.print()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Print"
          >
            <Printer className="w-5 h-5 text-gray-600" />
          </button>

          {/* Share */}
          {onShare && (
            <button
              onClick={() => onShare(document)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Share"
            >
              <Share2 className="w-5 h-5 text-gray-600" />
            </button>
          )}

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-5 h-5 text-gray-600" />
            ) : (
              <Maximize2 className="w-5 h-5 text-gray-600" />
            )}
          </button>

          {/* Close */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Close"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          )}
        </div>
      </div>

      {/* Editor Container */}
      <div className="flex-1 relative">
        {/* Loading State */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-white flex items-center justify-center z-10"
            >
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-navy-700 animate-spin mx-auto" />
                <p className="mt-4 text-gray-600">Loading document...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error State */}
        {error && !isLoading && (
          <div className="absolute inset-0 bg-white flex items-center justify-center z-10">
            <div className="text-center max-w-md px-4">
              <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">Unable to Load Editor</h3>
              <p className="mt-2 text-gray-600">{error}</p>
              
              {/* Fallback Options */}
              <div className="mt-6 space-y-3">
                <p className="text-sm text-gray-500">You can still:</p>
                <div className="flex flex-col gap-2">
                  {onDownload && (
                    <button
                      onClick={() => onDownload(document)}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-navy-700 text-white rounded-lg hover:bg-navy-800"
                    >
                      <Download className="w-4 h-4" />
                      Download Document
                    </button>
                  )}
                  <a
                    href={document.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <Eye className="w-4 h-4" />
                    Open in New Tab
                  </a>
                </div>
              </div>
              
              {/* Setup Instructions */}
              <details className="mt-6 text-left">
                <summary className="text-sm text-navy-700 cursor-pointer hover:underline">
                  Setup OnlyOffice Document Server
                </summary>
                <div className="mt-2 p-4 bg-gray-50 rounded-lg text-xs text-gray-600 font-mono">
                  <p className="mb-2"># Docker (quickest):</p>
                  <code className="block bg-gray-200 p-2 rounded mb-2">
                    docker run -p 8080:80 onlyoffice/documentserver
                  </code>
                  <p className="mb-2"># Then set in .env:</p>
                  <code className="block bg-gray-200 p-2 rounded">
                    VITE_ONLYOFFICE_URL=http://localhost:8080
                  </code>
                </div>
              </details>
            </div>
          </div>
        )}

        {/* OnlyOffice Container */}
        <div
          ref={containerRef}
          id={`onlyoffice-editor-${document.id}`}
          className="w-full h-full"
        />

        {/* Fallback: Iframe Embed (when no OnlyOffice) */}
        {!serverUrl && !error && (
          <FallbackViewer document={document} />
        )}
      </div>
    </div>
  );
}

// ============================================
// Fallback Viewer (when OnlyOffice not available)
// ============================================

function FallbackViewer({ document }: { document: OfficeDocument }) {
  // Use Microsoft Office Online Viewer or Google Docs Viewer as fallback
  const msViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(document.url)}`;
  const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(document.url)}&embedded=true`;
  
  const [viewerType, setViewerType] = useState<'microsoft' | 'google'>('microsoft');
  const [iframeError, setIframeError] = useState(false);

  return (
    <div className="w-full h-full flex flex-col">
      {/* Viewer Toggle */}
      <div className="flex items-center justify-center gap-2 p-2 bg-gray-50 border-b">
        <span className="text-xs text-gray-500">Viewer:</span>
        <button
          onClick={() => setViewerType('microsoft')}
          className={`px-3 py-1 text-xs rounded ${
            viewerType === 'microsoft' ? 'bg-navy-700 text-white' : 'bg-gray-200 text-gray-600'
          }`}
        >
          Microsoft
        </button>
        <button
          onClick={() => setViewerType('google')}
          className={`px-3 py-1 text-xs rounded ${
            viewerType === 'google' ? 'bg-navy-700 text-white' : 'bg-gray-200 text-gray-600'
          }`}
        >
          Google
        </button>
      </div>
      
      {/* Iframe */}
      <iframe
        src={viewerType === 'microsoft' ? msViewerUrl : googleViewerUrl}
        className="flex-1 w-full border-0"
        onError={() => setIframeError(true)}
        title={document.name}
      />
      
      {iframeError && (
        <div className="absolute inset-0 flex items-center justify-center bg-white">
          <p className="text-gray-500">Unable to preview this document</p>
        </div>
      )}
    </div>
  );
}

// ============================================
// Quick Office Viewer (lightweight preview)
// ============================================

export function QuickOfficeViewer({
  url,
  filename,
  className = '',
}: {
  url: string;
  filename: string;
  className?: string;
}) {
  detectDocumentType(filename);
  const encodedUrl = encodeURIComponent(url);
  
  // Use Microsoft Office Online for quick preview
  const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`;
  
  return (
    <iframe
      src={viewerUrl}
      className={`w-full h-full border-0 ${className}`}
      title={filename}
    />
  );
}

export default OfficeEditor;
