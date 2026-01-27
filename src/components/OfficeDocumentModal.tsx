// OfficeDocumentModal.tsx - Modal wrapper for OfficeViewer
// Provides a modal dialog for viewing/editing Office documents

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Maximize2, Minimize2 } from 'lucide-react';
import OfficeViewer, { ViewerMode, EditMode } from './OfficeViewer';
import { OfficeDocumentInfo } from '../lib/office-utils';

// ============================================
// TYPES
// ============================================

export interface OfficeDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  
  // Document source (provide one)
  file?: File;
  url?: string;
  filename?: string;
  
  // Viewer configuration
  initialViewerMode?: ViewerMode;
  initialEditMode?: EditMode;
  
  // Callbacks
  onSave?: (data: Blob | ArrayBuffer) => Promise<void>;
  onShare?: () => void;
  onDownload?: () => void;
  
  // Modal options
  title?: string;
  allowFullscreen?: boolean;
  showActions?: boolean;
}

// ============================================
// COMPONENT
// ============================================

export const OfficeDocumentModal: React.FC<OfficeDocumentModalProps> = ({
  isOpen,
  onClose,
  file,
  url,
  filename,
  initialViewerMode = 'native',
  initialEditMode = 'view',
  onSave,
  onShare,
  onDownload,
  title,
  allowFullscreen = true,
  showActions = true,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [documentInfo, setDocumentInfo] = useState<OfficeDocumentInfo | null>(null);

  const handleLoad = useCallback((info: OfficeDocumentInfo) => {
    setDocumentInfo(info);
  }, []);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  if (!isOpen) return null;

  const modalTitle = title || documentInfo?.name || filename || 'Document';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={`
            bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col
            ${isFullscreen ? 'fixed inset-2' : 'w-full max-w-6xl h-[90vh]'}
          `}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900 truncate flex-1">
              {modalTitle}
            </h2>
            <div className="flex items-center gap-2">
              {allowFullscreen && (
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                  title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                >
                  {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Content - OfficeViewer */}
          <div className="flex-1 overflow-hidden">
            <OfficeViewer
              file={file}
              url={url}
              filename={filename}
              viewerMode={initialViewerMode}
              editMode={initialEditMode}
              onLoad={handleLoad}
              onSave={onSave}
              onShare={onShare}
              onDownload={onDownload}
              onPrint={handlePrint}
              onClose={onClose}
              showToolbar={showActions}
              showFullscreenButton={false}
              height="100%"
              width="100%"
            />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ============================================
// QUICK ACCESS HOOK
// ============================================

export function useOfficeDocumentModal() {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    file?: File;
    url?: string;
    filename?: string;
    editMode?: EditMode;
  }>({
    isOpen: false,
  });

  const openWithFile = useCallback((file: File, editMode?: EditMode) => {
    setModalState({
      isOpen: true,
      file,
      filename: file.name,
      editMode,
    });
  }, []);

  const openWithUrl = useCallback((url: string, filename?: string, editMode?: EditMode) => {
    setModalState({
      isOpen: true,
      url,
      filename: filename || url.split('/').pop(),
      editMode,
    });
  }, []);

  const close = useCallback(() => {
    setModalState({ isOpen: false });
  }, []);

  return {
    modalState,
    openWithFile,
    openWithUrl,
    close,
    ModalComponent: () => (
      <OfficeDocumentModal
        isOpen={modalState.isOpen}
        onClose={close}
        file={modalState.file}
        url={modalState.url}
        filename={modalState.filename}
        initialEditMode={modalState.editMode}
      />
    ),
  };
}

export default OfficeDocumentModal;
