/**
 * Audio Uploader Component
 * Supports drag-and-drop audio/video files for transcription
 */

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  FileAudio,
  FileVideo,
  X,
  Check,
  Loader2,
  AlertCircle,
  Music,
  Film,
} from 'lucide-react';

interface AudioUploaderProps {
  onUpload: (file: File) => Promise<void>;
  isProcessing?: boolean;
  progress?: string;
  disabled?: boolean;
  maxSizeMB?: number;
}

const SUPPORTED_FORMATS = {
  audio: ['mp3', 'wav', 'm4a', 'flac', 'ogg', 'aac', 'wma', 'webm'],
  video: ['mp4', 'webm', 'mkv', 'avi', 'mov'],
};

const SUPPORTED_MIME_TYPES = [
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
  'audio/mp4',
  'audio/x-m4a',
  'audio/flac',
  'audio/ogg',
  'audio/aac',
  'audio/webm',
  'video/mp4',
  'video/webm',
  'video/x-matroska',
  'video/quicktime',
  'video/x-msvideo',
];

export default function AudioUploader({
  onUpload,
  isProcessing = false,
  progress,
  disabled = false,
  maxSizeMB = 100,
}: AudioUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'complete' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): string | null => {
    // Check file type
    const extension = file.name.split('.').pop()?.toLowerCase();
    const isValidExtension = 
      SUPPORTED_FORMATS.audio.includes(extension || '') ||
      SUPPORTED_FORMATS.video.includes(extension || '');
    const isValidMime = SUPPORTED_MIME_TYPES.includes(file.type);

    if (!isValidExtension && !isValidMime) {
      return `Unsupported file format. Please use: ${[...SUPPORTED_FORMATS.audio, ...SUPPORTED_FORMATS.video].join(', ')}`;
    }

    // Check file size
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      return `File too large (${sizeMB.toFixed(1)}MB). Maximum size is ${maxSizeMB}MB.`;
    }

    return null;
  }, [maxSizeMB]);

  const handleFile = useCallback(async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setUploadStatus('error');
      return;
    }

    setSelectedFile(file);
    setError(null);
    setUploadStatus('uploading');

    try {
      await onUpload(file);
      setUploadStatus('complete');
    } catch (err: any) {
      setError(err.message || 'Upload failed');
      setUploadStatus('error');
    }
  }, [onUpload, validateFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isProcessing) {
      setIsDragOver(true);
    }
  }, [disabled, isProcessing]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (disabled || isProcessing) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [disabled, isProcessing, handleFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFile]);

  const handleReset = useCallback(() => {
    setSelectedFile(null);
    setError(null);
    setUploadStatus('idle');
  }, []);

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('video/')) {
      return <FileVideo className="w-8 h-8 text-purple-500" />;
    }
    return <FileAudio className="w-8 h-8 text-indigo-500" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept={[...SUPPORTED_FORMATS.audio.map(f => `.${f}`), ...SUPPORTED_FORMATS.video.map(f => `.${f}`)].join(',')}
        onChange={handleFileSelect}
        disabled={disabled || isProcessing}
        className="hidden"
      />

      <AnimatePresence mode="wait">
        {selectedFile && uploadStatus !== 'idle' ? (
          /* File Selected State */
          <motion.div
            key="file-selected"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`relative p-4 rounded-xl border-2 ${
              uploadStatus === 'error'
                ? 'border-red-300 bg-red-50'
                : uploadStatus === 'complete'
                ? 'border-green-300 bg-green-50'
                : 'border-indigo-300 bg-indigo-50'
            }`}
          >
            <div className="flex items-start gap-4">
              {/* File icon */}
              <div className="flex-shrink-0">{getFileIcon(selectedFile)}</div>

              {/* File info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>

                {/* Progress/Status */}
                {isProcessing && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                      <span className="text-sm text-indigo-600">{progress || 'Processing...'}</span>
                    </div>
                    <div className="mt-2 h-1.5 bg-indigo-100 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-indigo-600"
                        initial={{ width: '0%' }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 30, ease: 'linear' }}
                      />
                    </div>
                  </div>
                )}

                {uploadStatus === 'complete' && (
                  <div className="flex items-center gap-2 mt-2 text-green-600">
                    <Check className="w-4 h-4" />
                    <span className="text-sm">Transcription complete!</span>
                  </div>
                )}

                {error && (
                  <div className="flex items-center gap-2 mt-2 text-red-600">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}
              </div>

              {/* Reset button */}
              {!isProcessing && (
                <button
                  onClick={handleReset}
                  className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
                  title="Remove file"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              )}
            </div>
          </motion.div>
        ) : (
          /* Drop Zone State */
          <motion.div
            key="drop-zone"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !disabled && !isProcessing && fileInputRef.current?.click()}
            className={`relative p-8 rounded-xl border-2 border-dashed transition-all cursor-pointer ${
              disabled || isProcessing
                ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                : isDragOver
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-gray-300 bg-white hover:border-indigo-400 hover:bg-indigo-50/50'
            }`}
          >
            <div className="flex flex-col items-center text-center">
              {/* Icon */}
              <div
                className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${
                  isDragOver ? 'bg-indigo-100' : 'bg-gray-100'
                }`}
              >
                <Upload className={`w-8 h-8 ${isDragOver ? 'text-indigo-600' : 'text-gray-500'}`} />
              </div>

              {/* Text */}
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                {isDragOver ? 'Drop your file here' : 'Upload audio or video'}
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Drag and drop, or click to browse
              </p>

              {/* Supported formats */}
              <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
                <div className="flex items-center gap-1">
                  <Music className="w-4 h-4" />
                  <span>{SUPPORTED_FORMATS.audio.join(', ')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Film className="w-4 h-4" />
                  <span>{SUPPORTED_FORMATS.video.slice(0, 3).join(', ')}</span>
                </div>
              </div>

              {/* Max size */}
              <p className="text-xs text-gray-400 mt-2">
                Max file size: {maxSizeMB}MB
              </p>
            </div>

            {/* Drag overlay */}
            <AnimatePresence>
              {isDragOver && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-indigo-500/10 rounded-xl flex items-center justify-center"
                >
                  <div className="text-indigo-600 font-medium">Release to upload</div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
