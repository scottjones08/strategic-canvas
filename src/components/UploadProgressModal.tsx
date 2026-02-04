// UploadProgressModal.tsx - Document upload modal with progress tracking
// Shows real-time upload progress, thumbnail generation, and status updates

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Upload,
  X,
  FileUp,
  CheckCircle,
  AlertCircle,
  Loader2,
  Trash2,
  Image,
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// Configure PDF.js worker - use bundled worker to avoid CDN version mismatch
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
}

// Accepted file types for document upload
const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'application/vnd.ms-powerpoint', // .ppt
];

const ACCEPTED_EXTENSIONS = '.pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt';

const isAcceptedFile = (file: File): boolean => {
  if (ACCEPTED_MIME_TYPES.includes(file.type)) return true;
  // Fallback to extension check for edge cases
  const ext = file.name.toLowerCase().split('.').pop();
  return ['pdf', 'docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt'].includes(ext || '');
};

// ============================================
// TYPES
// ============================================

export type UploadStatus = 'pending' | 'uploading' | 'processing' | 'complete' | 'error';

export interface UploadingFile {
  id: string;
  file: File;
  name: string;
  size: number;
  progress: number;
  status: UploadStatus;
  error?: string;
  thumbnailUrl?: string;
  fileUrl?: string;
  filePath?: string;
  pageCount?: number;
}

export interface UploadResult {
  name: string;
  fileUrl: string;
  filePath: string;
  fileSize: number;
  fileType: string;
  pageCount: number;
  thumbnailUrl?: string;
}

interface UploadProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: (results: UploadResult[]) => Promise<void>;
  clientId?: string;
  organizationId?: string;
  bucket?: string;
  maxSizeMB?: number;
  initialFiles?: File[];
}

// ============================================
// HELPER FUNCTIONS
// ============================================

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const generateThumbnail = async (
  arrayBuffer: ArrayBuffer,
  scale: number = 0.3
): Promise<{ thumbnail: string; pageCount: number }> => {
  try {
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get canvas context');

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({
      canvasContext: context,
      viewport,
      // @ts-ignore - pdfjs-dist types are strict but the API works without canvas
    } as any).promise;

    const thumbnail = canvas.toDataURL('image/jpeg', 0.7);
    return { thumbnail, pageCount: pdf.numPages };
  } catch (err) {
    console.error('Error generating thumbnail:', err);
    return { thumbnail: '', pageCount: 1 };
  }
};

const uploadThumbnailToStorage = async (
  dataUrl: string,
  fileName: string,
  bucket: string,
  organizationId?: string
): Promise<string | null> => {
  if (!isSupabaseConfigured() || !supabase) {
    return dataUrl; // Return data URL for local mode
  }

  try {
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    const thumbnailPath = organizationId
      ? `${organizationId}/thumbnails/${fileName}.jpg`
      : `public/thumbnails/${fileName}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(thumbnailPath, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(thumbnailPath);
    return urlData.publicUrl;
  } catch (err) {
    console.error('Error uploading thumbnail:', err);
    return null;
  }
};

// ============================================
// UPLOAD PROGRESS MODAL COMPONENT
// ============================================

export const UploadProgressModal: React.FC<UploadProgressModalProps> = ({
  isOpen,
  onClose,
  onUploadComplete,
  clientId: _clientId, // eslint-disable-line @typescript-eslint/no-unused-vars
  organizationId,
  bucket = 'documents',
  maxSizeMB = 50,
  initialFiles,
}) => {
  void _clientId; // Reserved for future folder/client organization
  const [files, setFiles] = useState<UploadingFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const initialFilesProcessedRef = useRef(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setFiles([]);
      setIsProcessing(false);
      setIsDraggingOver(false);
      initialFilesProcessedRef.current = false;
    }
  }, [isOpen]);

  // Process initial files when modal opens with files
  useEffect(() => {
    if (isOpen && initialFiles && initialFiles.length > 0 && !initialFilesProcessedRef.current) {
      initialFilesProcessedRef.current = true;
      const uploadFiles: UploadingFile[] = initialFiles
        .filter(file => isAcceptedFile(file))
        .map(file => ({
          id: crypto.randomUUID(),
          file,
          name: file.name,
          size: file.size,
          progress: 0,
          status: 'pending' as UploadStatus,
        }));
      if (uploadFiles.length > 0) {
        setFiles(uploadFiles);
      }
    }
  }, [isOpen, initialFiles]);

  // Validate file
  const validateFile = useCallback((file: File): string | null => {
    if (!isAcceptedFile(file)) {
      return 'Please upload PDF or Office documents (.docx, .xlsx, .pptx)';
    }
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      return `File too large. Maximum size is ${maxSizeMB}MB`;
    }
    return null;
  }, [maxSizeMB]);

  // Add files to upload queue
  const addFiles = useCallback((newFiles: File[]) => {
    const uploadFiles: UploadingFile[] = newFiles
      .filter(file => isAcceptedFile(file))
      .map(file => ({
        id: crypto.randomUUID(),
        file,
        name: file.name,
        size: file.size,
        progress: 0,
        status: 'pending' as UploadStatus,
      }));

    if (uploadFiles.length === 0) {
      alert('Please upload PDF or Office documents (.docx, .xlsx, .pptx)');
      return;
    }

    setFiles(prev => [...prev, ...uploadFiles]);
  }, []);

  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  }, [addFiles]);

  // Handle file input change
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
    }
  }, [addFiles]);

  // Remove file from queue
  const removeFile = useCallback((fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);

  // Update file status
  const updateFile = useCallback((fileId: string, updates: Partial<UploadingFile>) => {
    setFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, ...updates } : f
    ));
  }, []);

  // Upload a single file with progress simulation
  const uploadSingleFile = async (uploadingFile: UploadingFile): Promise<UploadResult | null> => {
    const { file, id } = uploadingFile;

    // Validate
    const validationError = validateFile(file);
    if (validationError) {
      updateFile(id, { status: 'error', error: validationError });
      return null;
    }

    try {
      // Start uploading
      updateFile(id, { status: 'uploading', progress: 5 });

      // Read file as array buffer
      const arrayBuffer = await file.arrayBuffer();
      updateFile(id, { progress: 15 });

      // Generate thumbnail (only for PDFs)
      updateFile(id, { status: 'processing', progress: 20 });
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      let thumbnail: string | null = null;
      let pageCount = 1;
      
      if (isPdf) {
        const result = await generateThumbnail(arrayBuffer);
        thumbnail = result.thumbnail;
        pageCount = result.pageCount;
      }
      updateFile(id, { progress: 35, pageCount });

      let thumbnailUrl: string | undefined;
      let fileUrl: string;
      let filePath: string;

      if (!isSupabaseConfigured() || !supabase) {
        // Local storage mode - use data URLs
        updateFile(id, { progress: 60 });
        
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });

        fileUrl = dataUrl;
        filePath = `local/${file.name}`;
        thumbnailUrl = thumbnail || undefined;
        
        updateFile(id, { progress: 90 });
      } else {
        // Upload to Supabase Storage with retry logic
        const fileExt = file.name.split('.').pop();
        const fileName = crypto.randomUUID();
        filePath = organizationId
          ? `${organizationId}/${fileName}.${fileExt}`
          : `public/${fileName}.${fileExt}`;

        // Simulate progress during upload
        const progressInterval = setInterval(() => {
          setFiles(prev => prev.map(f => {
            if (f.id === id && f.progress < 80) {
              return { ...f, progress: Math.min(f.progress + 5, 80) };
            }
            return f;
          }));
        }, 200);

        // Retry logic for upload with exponential backoff
        const maxRetries = 3;
        let lastError: Error | null = null;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            const { error: uploadError } = await supabase.storage
              .from(bucket)
              .upload(filePath, arrayBuffer, {
                contentType: file.type,
                upsert: attempt > 1, // Allow upsert on retry in case partial upload
              });

            if (uploadError) {
              // Check if it's an abort error
              if (uploadError.message?.includes('abort') || uploadError.message?.includes('AbortError')) {
                throw new Error('Upload aborted');
              }
              throw new Error(uploadError.message);
            }
            
            // Success - break out of retry loop
            lastError = null;
            break;
          } catch (err) {
            lastError = err instanceof Error ? err : new Error('Upload failed');
            
            // Only retry on abort errors (likely React StrictMode double-mount)
            const isAbortError = lastError.message?.includes('abort') || lastError.message?.includes('AbortError');
            
            if (attempt < maxRetries && isAbortError) {
              const delay = attempt * 500; // 500ms, 1000ms, 1500ms
              console.log(`Upload attempt ${attempt} aborted, retrying in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
            
            // Non-abort error or max retries reached
            break;
          }
        }

        clearInterval(progressInterval);

        if (lastError) {
          throw lastError;
        }

        updateFile(id, { progress: 85 });

        // Get public URL
        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
        fileUrl = urlData.publicUrl;

        // Upload thumbnail
        if (thumbnail) {
          thumbnailUrl = await uploadThumbnailToStorage(
            thumbnail,
            fileName,
            bucket,
            organizationId
          ) || undefined;
        }

        updateFile(id, { progress: 95 });
      }

      // Complete
      updateFile(id, {
        status: 'complete',
        progress: 100,
        fileUrl,
        filePath,
        thumbnailUrl,
      });

      // Remove common extensions from display name
      const displayName = file.name.replace(/\.(pdf|docx?|xlsx?|pptx?)$/i, '');
      
      return {
        name: displayName,
        fileUrl,
        filePath,
        fileSize: file.size,
        fileType: file.type || 'application/octet-stream',
        pageCount,
        thumbnailUrl,
      };
    } catch (err) {
      console.error('Error uploading file:', err);
      updateFile(id, {
        status: 'error',
        error: err instanceof Error ? err.message : 'Failed to upload file',
      });
      return null;
    }
  };

  // Start upload process
  const handleStartUpload = async () => {
    if (files.length === 0 || isProcessing) return;

    setIsProcessing(true);
    abortControllerRef.current = new AbortController();

    const results: UploadResult[] = [];

    for (const uploadingFile of files) {
      if (uploadingFile.status === 'complete') {
        // Already uploaded (shouldn't happen but just in case)
        continue;
      }

      const result = await uploadSingleFile(uploadingFile);
      if (result) {
        results.push(result);
      }
    }

    setIsProcessing(false);

    // Only close and callback if we have results
    if (results.length > 0) {
      try {
        await onUploadComplete(results);
        onClose();
      } catch (err) {
        console.error('Upload completion failed:', err);
      }
    }
  };

  // Check if all files are complete or errored
  const allComplete = files.length > 0 && files.every(f => 
    f.status === 'complete' || f.status === 'error'
  );

  // Get counts
  const pendingCount = files.filter(f => f.status === 'pending').length;
  const completedCount = files.filter(f => f.status === 'complete').length;
  const errorCount = files.filter(f => f.status === 'error').length;

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Upload size={20} className="text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Upload Documents</h2>
              <p className="text-sm text-gray-500">PDF and Office files up to {maxSizeMB}MB</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            disabled={isProcessing}
            className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Drop Zone */}
        {files.length === 0 && (
          <div
            className="p-6"
            onDragOver={e => {
              e.preventDefault();
              setIsDraggingOver(true);
            }}
            onDragLeave={() => setIsDraggingOver(false)}
            onDrop={handleDrop}
          >
            <div
              className={`
                border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer
                ${isDraggingOver 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}
              `}
              onClick={() => fileInputRef.current?.click()}
            >
              <FileUp size={56} className={`mx-auto mb-4 ${isDraggingOver ? 'text-blue-500' : 'text-gray-400'}`} />
              <h3 className="text-lg font-medium text-gray-700 mb-1">
                {isDraggingOver ? 'Drop files here' : 'Drop PDF or Office files here'}
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                or click to browse from your computer
              </p>
              <button
                type="button"
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Select Files
              </button>
            </div>
          </div>
        )}

        {/* File List with Progress */}
        {files.length > 0 && (
          <div 
            className="flex-1 overflow-y-auto p-4"
            onDragOver={e => {
              e.preventDefault();
              setIsDraggingOver(true);
            }}
            onDragLeave={() => setIsDraggingOver(false)}
            onDrop={handleDrop}
          >
            {/* Add more files button */}
            {!isProcessing && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full mb-4 p-3 border-2 border-dashed border-gray-200 rounded-lg 
                  text-gray-500 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 
                  transition-all flex items-center justify-center gap-2"
              >
                <Plus size={18} />
                Add more files
              </button>
            )}

            {/* File items */}
            <div className="space-y-3">
              <AnimatePresence>
                {files.map((uploadFile) => (
                  <motion.div
                    key={uploadFile.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className={`
                      flex items-center gap-3 p-3 rounded-xl border transition-all
                      ${uploadFile.status === 'error' 
                        ? 'bg-red-50 border-red-200' 
                        : uploadFile.status === 'complete'
                          ? 'bg-green-50 border-green-200'
                          : 'bg-white border-gray-200'}
                    `}
                  >
                    {/* Thumbnail / Icon */}
                    <div className="w-12 h-14 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center">
                      {uploadFile.thumbnailUrl ? (
                        <img 
                          src={uploadFile.thumbnailUrl} 
                          alt={uploadFile.name}
                          className="w-full h-full object-cover"
                        />
                      ) : uploadFile.status === 'processing' ? (
                        <Image size={20} className="text-gray-400 animate-pulse" />
                      ) : (
                        <FileText size={20} className="text-red-400" />
                      )}
                    </div>

                    {/* File info and progress */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {uploadFile.name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{formatFileSize(uploadFile.size)}</span>
                        {uploadFile.pageCount && (
                          <>
                            <span>•</span>
                            <span>{uploadFile.pageCount} pages</span>
                          </>
                        )}
                      </div>

                      {/* Progress bar */}
                      {(uploadFile.status === 'uploading' || uploadFile.status === 'processing') && (
                        <div className="mt-2">
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-blue-500 rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${uploadFile.progress}%` }}
                              transition={{ duration: 0.3, ease: 'easeOut' }}
                            />
                          </div>
                          <p className="text-xs text-blue-600 mt-1">
                            {uploadFile.status === 'processing' 
                              ? 'Generating thumbnail...' 
                              : `Uploading... ${Math.round(uploadFile.progress)}%`}
                          </p>
                        </div>
                      )}

                      {/* Error message */}
                      {uploadFile.status === 'error' && uploadFile.error && (
                        <p className="text-xs text-red-600 mt-1">{uploadFile.error}</p>
                      )}
                    </div>

                    {/* Status indicator / Remove button */}
                    <div className="flex-shrink-0">
                      {uploadFile.status === 'pending' && !isProcessing && (
                        <button
                          onClick={() => removeFile(uploadFile.id)}
                          className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} className="text-gray-500" />
                        </button>
                      )}
                      {uploadFile.status === 'uploading' && (
                        <Loader2 size={20} className="text-blue-500 animate-spin" />
                      )}
                      {uploadFile.status === 'processing' && (
                        <Loader2 size={20} className="text-blue-500 animate-spin" />
                      )}
                      {uploadFile.status === 'complete' && (
                        <CheckCircle size={20} className="text-green-500" />
                      )}
                      {uploadFile.status === 'error' && (
                        <AlertCircle size={20} className="text-red-500" />
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Footer with actions */}
        <div className="flex items-center justify-between gap-3 p-4 border-t border-gray-100 bg-gray-50">
          {/* Status summary */}
          <div className="text-sm text-gray-600">
            {files.length === 0 ? (
              <span>No files selected</span>
            ) : isProcessing ? (
              <span className="flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                Uploading {files.filter(f => f.status === 'uploading' || f.status === 'processing').length} of {files.length}...
              </span>
            ) : allComplete ? (
              <span className="text-green-600">
                {completedCount} uploaded{errorCount > 0 ? `, ${errorCount} failed` : ''}
              </span>
            ) : (
              <span>{pendingCount} file{pendingCount !== 1 ? 's' : ''} ready</span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 border border-gray-200 rounded-lg font-medium 
                hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              {allComplete ? 'Done' : 'Cancel'}
            </button>
            
            {!allComplete && (
              <button
                onClick={handleStartUpload}
                disabled={files.length === 0 || isProcessing}
                className="px-5 py-2 bg-blue-500 text-white rounded-lg font-medium 
                  hover:bg-blue-600 transition-colors disabled:opacity-50 
                  flex items-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    Upload {files.length > 0 ? `(${files.length})` : ''}
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
      </motion.div>
    </motion.div>
  );
};

// Missing Plus icon - add it
const Plus: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

export default UploadProgressModal;
