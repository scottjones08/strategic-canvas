// UploadProgress.tsx - Upload progress overlay with visual feedback
// Shows file upload progress, status, and handles errors gracefully

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  FileText,
  FileSpreadsheet,
  FileImage,
  File,
  CheckCircle,
  XCircle,
  Loader2,
  X,
} from 'lucide-react';

// ============================================
// Types
// ============================================

export interface UploadFile {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
  url?: string;
}

interface UploadProgressProps {
  files: UploadFile[];
  isVisible: boolean;
  onClose: () => void;
  onRetry?: (fileId: string) => void;
  onCancel?: (fileId: string) => void;
}

// ============================================
// Helper Functions
// ============================================

function getFileIcon(type: string) {
  if (type.includes('pdf')) return FileText;
  if (type.includes('sheet') || type.includes('excel') || type.includes('xlsx')) return FileSpreadsheet;
  if (type.includes('image')) return FileImage;
  if (type.includes('word') || type.includes('document')) return FileText;
  return File;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getStatusColor(status: UploadFile['status']): string {
  switch (status) {
    case 'complete': return 'bg-green-500';
    case 'error': return 'bg-red-500';
    case 'uploading': return 'bg-indigo-500';
    case 'processing': return 'bg-amber-500';
    default: return 'bg-gray-300';
  }
}

function getStatusText(status: UploadFile['status']): string {
  switch (status) {
    case 'pending': return 'Waiting...';
    case 'uploading': return 'Uploading...';
    case 'processing': return 'Processing...';
    case 'complete': return 'Complete';
    case 'error': return 'Failed';
    default: return '';
  }
}

// ============================================
// Main Component
// ============================================

export function UploadProgress({ files, isVisible, onClose, onRetry, onCancel }: UploadProgressProps) {
  const completedCount = files.filter(f => f.status === 'complete').length;
  const hasErrors = files.some(f => f.status === 'error');
  const isAllComplete = files.length > 0 && files.every(f => f.status === 'complete' || f.status === 'error');

  return (
    <AnimatePresence>
      {isVisible && files.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          className="fixed bottom-6 right-6 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50"
        >
          {/* Header */}
          <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isAllComplete ? (
                hasErrors ? (
                  <XCircle className="w-5 h-5 text-red-500" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                )
              ) : (
                <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
              )}
              <span className="font-medium text-gray-900">
                {isAllComplete
                  ? hasErrors
                    ? 'Upload completed with errors'
                    : 'Upload complete'
                  : `Uploading ${completedCount}/${files.length} files`}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-200 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* Overall Progress */}
          {!isAllComplete && (
            <div className="px-4 py-2 bg-gray-50 border-b">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-indigo-600 rounded-full"
                  initial={{ width: 0 }}
                  animate={{
                    width: `${(files.reduce((sum, f) => sum + f.progress, 0) / files.length)}%`,
                  }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          )}

          {/* File List */}
          <div className="max-h-64 overflow-y-auto">
            {files.map((uploadFile) => {
              const FileIcon = getFileIcon(uploadFile.file.type);
              
              return (
                <motion.div
                  key={uploadFile.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="px-4 py-3 border-b last:border-b-0 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    {/* File Icon */}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      uploadFile.status === 'complete' ? 'bg-green-100' :
                      uploadFile.status === 'error' ? 'bg-red-100' :
                      'bg-indigo-100'
                    }`}>
                      <FileIcon className={`w-5 h-5 ${
                        uploadFile.status === 'complete' ? 'text-green-600' :
                        uploadFile.status === 'error' ? 'text-red-600' :
                        'text-indigo-600'
                      }`} />
                    </div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {uploadFile.file.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-500">
                          {formatFileSize(uploadFile.file.size)}
                        </span>
                        <span className={`text-xs font-medium ${
                          uploadFile.status === 'complete' ? 'text-green-600' :
                          uploadFile.status === 'error' ? 'text-red-600' :
                          'text-indigo-600'
                        }`}>
                          {getStatusText(uploadFile.status)}
                        </span>
                      </div>
                      
                      {/* Error message */}
                      {uploadFile.status === 'error' && uploadFile.error && (
                        <p className="text-xs text-red-500 mt-1">{uploadFile.error}</p>
                      )}
                    </div>

                    {/* Status / Actions */}
                    <div className="flex items-center gap-2">
                      {uploadFile.status === 'uploading' && (
                        <span className="text-xs font-mono text-indigo-600">
                          {uploadFile.progress}%
                        </span>
                      )}
                      {uploadFile.status === 'complete' && (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      )}
                      {uploadFile.status === 'error' && onRetry && (
                        <button
                          onClick={() => onRetry(uploadFile.id)}
                          className="text-xs text-indigo-600 hover:underline"
                        >
                          Retry
                        </button>
                      )}
                      {(uploadFile.status === 'pending' || uploadFile.status === 'uploading') && onCancel && (
                        <button
                          onClick={() => onCancel(uploadFile.id)}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          <X className="w-4 h-4 text-gray-400" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Individual Progress Bar */}
                  {(uploadFile.status === 'uploading' || uploadFile.status === 'processing') && (
                    <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${getStatusColor(uploadFile.status)}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${uploadFile.progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Footer */}
          {isAllComplete && (
            <div className="px-4 py-3 bg-gray-50 border-t">
              <button
                onClick={onClose}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
              >
                Done
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================
// Drag Drop Zone Component
// ============================================

interface DragDropZoneProps {
  onFilesSelected: (files: File[]) => void;
  acceptedTypes?: string[];
  maxSizeMB?: number;
  multiple?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function DragDropZone({
  onFilesSelected,
  acceptedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword',
    'application/vnd.ms-excel',
    'application/vnd.ms-powerpoint',
  ],
  maxSizeMB = 50,
  multiple = true,
  className = '',
  children,
}: DragDropZoneProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter((file) => {
      // Check type
      if (acceptedTypes.length > 0 && !acceptedTypes.includes(file.type)) {
        console.warn(`Rejected file ${file.name}: invalid type ${file.type}`);
        return false;
      }
      // Check size
      if (file.size > maxSizeMB * 1024 * 1024) {
        console.warn(`Rejected file ${file.name}: too large`);
        return false;
      }
      return true;
    });

    if (files.length > 0) {
      onFilesSelected(multiple ? files : [files[0]]);
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onFilesSelected(multiple ? files : [files[0]]);
    }
    // Reset input
    e.target.value = '';
  };

  return (
    <div
      onClick={handleClick}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`
        relative cursor-pointer transition-all duration-200
        ${isDragging ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}
        ${className}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept={acceptedTypes.join(',')}
        multiple={multiple}
        onChange={handleInputChange}
        className="hidden"
      />

      {children || (
        <div
          className={`
            flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl
            transition-colors
            ${isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'}
          `}
        >
          <Upload className={`w-12 h-12 mb-3 ${isDragging ? 'text-indigo-500' : 'text-gray-400'}`} />
          <p className="text-sm text-gray-600 text-center">
            <span className="font-medium text-indigo-600">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-gray-400 mt-1">
            PDF, Word, Excel, PowerPoint up to {maxSizeMB}MB
          </p>
        </div>
      )}

      {/* Drag overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-indigo-500/10 rounded-xl flex items-center justify-center"
          >
            <div className="bg-white px-6 py-4 rounded-lg shadow-lg">
              <Upload className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-indigo-600">Drop files here</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default UploadProgress;
