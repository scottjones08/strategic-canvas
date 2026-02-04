// DocumentPreviewModal.tsx - PDF Document Preview Modal
// Shows a preview of the document with basic controls

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Download,
  Share2,
  Maximize2,
  Minimize2,
  FileText,
  History,
  Loader2,
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { documentHistoryApi, type DocumentHistoryEntry } from '../lib/documents-api';
import { isOfficeDocument } from '../lib/office-utils';
import OfficeViewer from './OfficeViewer';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
const DEFAULT_BUCKET = 'documents';

const getStoragePath = (url: string) => {
  try {
    const { pathname } = new URL(url);
    const publicMatch = pathname.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
    if (publicMatch) return { bucket: publicMatch[1], path: publicMatch[2] };
    const privateMatch = pathname.match(/\/storage\/v1\/object\/([^/]+)\/(.+)$/);
    if (privateMatch) return { bucket: privateMatch[1], path: privateMatch[2] };
    return null;
  } catch {
    return null;
  }
};

const fetchPdfBytes = async (fileUrl: string): Promise<Uint8Array> => {
  const response = await fetch(fileUrl);
  if (response.ok) {
    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  }

  if (!isSupabaseConfigured() || !supabase) {
    throw new Error(`Failed to fetch PDF: ${response.status}`);
  }

  const storageInfo = getStoragePath(fileUrl);
  if (!storageInfo) {
    throw new Error(`Failed to fetch PDF: ${response.status}`);
  }

  const { data, error } = await supabase.storage
    .from(storageInfo.bucket || DEFAULT_BUCKET)
    .download(storageInfo.path);

  if (error || !data) {
    throw error || new Error('Failed to download PDF from storage');
  }

  const buffer = await data.arrayBuffer();
  return new Uint8Array(buffer);
};

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: {
    id: string;
    name: string;
    fileUrl: string;
    fileType: string;
    pageCount: number;
  } | null;
  onDownload?: () => void;
  onShare?: () => void;
}

const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  isOpen,
  onClose,
  document,
  onDownload,
  onShare,
}) => {
  const onlyOfficeUrl = import.meta.env.VITE_ONLYOFFICE_URL as string | undefined;
  const onlyOfficeJwtSecret = import.meta.env.VITE_ONLYOFFICE_JWT_SECRET as string | undefined;
  const onlyOfficeConfig = onlyOfficeUrl
    ? { documentServerUrl: onlyOfficeUrl, jwtSecret: onlyOfficeJwtSecret }
    : undefined;
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pageImage, setPageImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<DocumentHistoryEntry[]>([]);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  const isPdf = document?.fileType === 'application/pdf' || document?.name.toLowerCase().endsWith('.pdf');
  const isOffice = document ? isOfficeDocument(document.name, document.fileType) : false;

  // Load PDF and render page
  useEffect(() => {
    if (!isOpen || !document?.fileUrl || !isPdf) return;

    const loadPdf = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const bytes = await fetchPdfBytes(document.fileUrl);
        const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
        setTotalPages(pdf.numPages);

        const page = await pdf.getPage(currentPage);
        const scale = 1.5 * zoom;
        const viewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
          canvasContext: context,
          viewport: viewport,
          canvas: canvas as any,
        }).promise;

        setPageImage(canvas.toDataURL());
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading PDF:', err);
        setError('Failed to load document preview');
        setIsLoading(false);
      }
    };

    loadPdf();
  }, [isOpen, document?.fileUrl, currentPage, zoom, isPdf]);

  useEffect(() => {
    if (!isOpen || !document?.fileUrl || isPdf) return;
    setIsLoading(false);
    setError(null);
  }, [isOpen, document?.fileUrl, isPdf]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentPage(1);
      setZoom(1);
      setIsFullscreen(false);
      setShowHistory(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !document?.id) return;
    const loadHistory = async () => {
      try {
        const entries = await documentHistoryApi.getByDocumentId(document.id);
        setHistory(entries);
      } catch (err) {
        console.error('Failed to load document history:', err);
      }
    };
    loadHistory();
  }, [isOpen, document?.id]);

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handleZoomIn = () => {
    setZoom(Math.min(zoom + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom(Math.max(zoom - 0.25, 0.5));
  };

  if (!isOpen || !document) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className={`bg-white rounded-2xl shadow-2xl flex flex-col ${
            isFullscreen ? 'w-full h-full m-0 rounded-none' : 'w-[90vw] h-[90vh] max-w-6xl'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">{document.name}</h2>
                <p className="text-sm text-gray-500">
                  {isPdf ? `Page ${currentPage} of ${totalPages}` : 'Document Preview'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowHistory(prev => !prev)}
                className={`p-2 rounded-lg transition-colors ${showHistory ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100 text-gray-600'}`}
                title="History"
              >
                <History size={20} />
              </button>
              {/* Zoom controls */}
              {isPdf && (
                <>
                  <button
                    onClick={handleZoomOut}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Zoom out"
                  >
                    <ZoomOut size={20} className="text-gray-600" />
                  </button>
                  <span className="text-sm text-gray-600 min-w-[50px] text-center">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    onClick={handleZoomIn}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Zoom in"
                  >
                    <ZoomIn size={20} className="text-gray-600" />
                  </button>
                  <div className="w-px h-6 bg-gray-200 mx-2" />
                </>
              )}

              {/* Actions */}
              {onShare && (
                <button
                  onClick={onShare}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Share"
                >
                  <Share2 size={20} className="text-gray-600" />
                </button>
              )}
              {onDownload && (
                <button
                  onClick={onDownload}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Download"
                >
                  <Download size={20} className="text-gray-600" />
                </button>
              )}
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? (
                  <Minimize2 size={20} className="text-gray-600" />
                ) : (
                  <Maximize2 size={20} className="text-gray-600" />
                )}
              </button>
              <div className="w-px h-6 bg-gray-200 mx-2" />
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Close"
              >
                <X size={20} className="text-gray-600" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden flex">
            <div className="flex-1 overflow-auto bg-gray-100 flex items-center justify-center p-4">
              {isOffice ? (
                <div className="w-full h-full">
                  <OfficeViewer
                    url={document.fileUrl}
                    filename={document.name}
                    viewerMode={onlyOfficeConfig ? 'onlyoffice' : 'native'}
                    editMode="view"
                    onlyOfficeConfig={onlyOfficeConfig}
                    showToolbar={false}
                    showFullscreenButton={false}
                    height="100%"
                    width="100%"
                  />
                </div>
              ) : isLoading ? (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                  <p className="text-gray-600">Loading document...</p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <FileText className="w-8 h-8 text-red-500" />
                  </div>
                  <p className="text-gray-600">{error}</p>
                  <a
                    href={document.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Open in new tab
                  </a>
                </div>
              ) : isPdf ? (
                <div className="relative">
                  <canvas ref={canvasRef} className="hidden" />
                  {pageImage && (
                    <img
                      src={pageImage}
                      alt={`Page ${currentPage}`}
                      className="max-w-full max-h-full shadow-lg rounded-lg"
                      style={{ transform: `scale(${zoom > 1 ? 1 : zoom})` }}
                    />
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <FileText className="w-8 h-8 text-blue-500" />
                  </div>
                  <p className="text-gray-600">Preview not available for this file type</p>
                  <a
                    href={document.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Download to view
                  </a>
                </div>
              )}
            </div>

            {showHistory && (
              <div className="w-80 border-l border-gray-200 bg-white flex flex-col">
                <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-800">Document History</span>
                  <button
                    onClick={() => setShowHistory(false)}
                    className="p-1 rounded hover:bg-gray-100 text-gray-500"
                    title="Close history"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {history.length === 0 ? (
                    <div className="text-sm text-gray-500 text-center py-8">
                      No history yet.
                    </div>
                  ) : (
                    history.map(entry => (
                      <div key={entry.id} className="border border-gray-100 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-800 capitalize">
                            {entry.action.replace(/_/g, ' ')}
                          </span>
                          <span className="text-xs text-gray-400">
                            {entry.createdAt.toLocaleString()}
                          </span>
                        </div>
                        {entry.payload && Object.keys(entry.payload).length > 0 && (
                          <pre className="mt-2 text-xs text-gray-500 whitespace-pre-wrap">
                            {JSON.stringify(entry.payload, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer - Page navigation */}
          {isPdf && totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 px-6 py-4 border-t border-gray-200">
              <button
                onClick={handlePrevPage}
                disabled={currentPage <= 1}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={24} className="text-gray-600" />
              </button>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={currentPage}
                  onChange={(e) => {
                    const page = parseInt(e.target.value);
                    if (page >= 1 && page <= totalPages) {
                      setCurrentPage(page);
                    }
                  }}
                  className="w-16 px-2 py-1 text-center border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-gray-600">of {totalPages}</span>
              </div>
              <button
                onClick={handleNextPage}
                disabled={currentPage >= totalPages}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={24} className="text-gray-600" />
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DocumentPreviewModal;
