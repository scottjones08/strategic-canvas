// useFileUpload.ts - File upload hook for Supabase Storage
// Handles PDF and Office document uploads with progress tracking and thumbnail generation

import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  isOfficeDocument,
  detectOfficeType,
  OfficeDocumentType,
  OFFICE_TYPE_COLORS,
  // getOfficeAcceptedTypes,
} from '../lib/office-utils';

// Guard to throw if supabase is not configured
function getSupabase() {
  if (!supabase) throw new Error('Supabase not configured');
  return supabase;
}

// Configure PDF.js worker - use bundled worker to avoid CDN version mismatch
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// ============================================
// TYPES
// ============================================

export interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

export interface UploadedFile {
  name: string;
  url: string;
  key: string;
  size: number;
  type: string;
  pageCount?: number;
  sheetCount?: number;
  slideCount?: number;
  thumbnailUrl?: string;
  officeType?: OfficeDocumentType;
}

export interface UseFileUploadOptions {
  bucket?: string;
  folder?: string;
  maxSizeMB?: number;
  acceptedTypes?: string[];
  generateThumbnail?: boolean;
  thumbnailScale?: number;
  allowOfficeDocuments?: boolean;
}

// ============================================
// useFileUpload Hook
// ============================================

export function useFileUpload(options: UseFileUploadOptions = {}) {
  const {
    bucket = 'documents',
    folder = '',
    maxSizeMB = 50,
    acceptedTypes = ['application/pdf'],
    generateThumbnail = true,
    thumbnailScale = 0.3,
    allowOfficeDocuments = true,
  } = options;

  // Extend accepted types to include Office documents if allowed
  const effectiveAcceptedTypes = allowOfficeDocuments
    ? [
        ...acceptedTypes,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.ms-powerpoint',
      ]
    : acceptedTypes;

  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Validate file
  const validateFile = useCallback(
    (file: File): string | null => {
      // Check file type - also check by extension for Office documents
      const isOffice = allowOfficeDocuments && isOfficeDocument(file.name, file.type);
      const isAcceptedType = effectiveAcceptedTypes.length === 0 || 
        effectiveAcceptedTypes.includes(file.type) || 
        isOffice;

      if (!isAcceptedType) {
        const officeExts = allowOfficeDocuments ? ', .docx, .xlsx, .pptx' : '';
        return `Invalid file type. Accepted types: PDF${officeExts}`;
      }

      // Check file size
      const maxBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxBytes) {
        return `File too large. Maximum size is ${maxSizeMB}MB`;
      }

      return null;
    },
    [effectiveAcceptedTypes, maxSizeMB, allowOfficeDocuments]
  );

  // Generate thumbnail from PDF
  const generatePDFThumbnail = useCallback(
    async (arrayBuffer: ArrayBuffer): Promise<{ thumbnail: string; pageCount: number }> => {
      try {
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: thumbnailScale });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Could not get canvas context');

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
          canvasContext: context,
          viewport,
          canvas,
        } as any).promise;

        const thumbnail = canvas.toDataURL('image/jpeg', 0.7);
        return { thumbnail, pageCount: pdf.numPages };
      } catch (err) {
        console.error('Error generating thumbnail:', err);
        return { thumbnail: '', pageCount: 0 };
      }
    },
    [thumbnailScale]
  );

  // Upload thumbnail to storage
  const uploadThumbnail = useCallback(
    async (dataUrl: string, fileName: string): Promise<string | null> => {
      try {
        // Convert data URL to blob
        const response = await fetch(dataUrl);
        const blob = await response.blob();

        const thumbnailKey = `${folder ? folder + '/' : ''}thumbnails/${fileName.replace('.pdf', '')}.jpg`;

        const { error: uploadError } = await getSupabase().storage
          .from(bucket)
          .upload(thumbnailKey, blob, {
            contentType: 'image/jpeg',
            upsert: true,
          });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = getSupabase().storage.from(bucket).getPublicUrl(thumbnailKey);
        return urlData.publicUrl;
      } catch (err) {
        console.error('Error uploading thumbnail:', err);
        return null;
      }
    },
    [bucket, folder]
  );

  // Upload file
  const uploadFile = useCallback(
    async (file: File): Promise<UploadedFile | null> => {
      // Validate
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return null;
      }

      try {
        setIsUploading(true);
        setError(null);
        setProgress({ loaded: 0, total: file.size, percent: 0 });

        // Generate unique file key
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 8);
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileKey = `${folder ? folder + '/' : ''}${timestamp}_${randomId}_${sanitizedName}`;

        // Read file as array buffer for PDF processing
        const arrayBuffer = await file.arrayBuffer();

        // Generate thumbnail based on file type
        let thumbnailUrl: string | null = null;
        let pageCount = 0;
        let sheetCount: number | undefined;
        let slideCount: number | undefined;
        let officeType: OfficeDocumentType | undefined;

        if (file.type === 'application/pdf' && generateThumbnail) {
          const { thumbnail, pageCount: pages } = await generatePDFThumbnail(arrayBuffer);
          pageCount = pages;

          if (thumbnail) {
            thumbnailUrl = await uploadThumbnail(thumbnail, file.name);
          }
        } else if (isOfficeDocument(file.name, file.type)) {
          // Handle Office documents
          officeType = detectOfficeType(file.name, file.type);
          
          // Generate a colored placeholder thumbnail for Office docs
          if (generateThumbnail) {
            const officeThumbnail = generateOfficeDocumentThumbnail(officeType, file.name);
            if (officeThumbnail) {
              thumbnailUrl = await uploadThumbnail(officeThumbnail, file.name);
            }
          }

          // Try to extract metadata (sheet/slide count) from Office files
          try {
            const metadata = await extractOfficeMetadata(arrayBuffer, officeType);
            if (metadata) {
              sheetCount = metadata.sheetCount;
              slideCount = metadata.slideCount;
              pageCount = metadata.pageCount || 0;
            }
          } catch (e) {
            console.warn('Could not extract Office metadata:', e);
          }
        }

        // Upload the main file
        // Supabase storage doesn't support progress events natively
        // We simulate progress for UX
        setProgress({ loaded: file.size * 0.3, total: file.size, percent: 30 });

        const { error: uploadError } = await getSupabase().storage
          .from(bucket)
          .upload(fileKey, arrayBuffer, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) throw uploadError;

        setProgress({ loaded: file.size * 0.9, total: file.size, percent: 90 });

        // Get public URL
        const { data: urlData } = getSupabase().storage.from(bucket).getPublicUrl(fileKey);

        setProgress({ loaded: file.size, total: file.size, percent: 100 });

        return {
          name: file.name,
          url: urlData.publicUrl,
          key: fileKey,
          size: file.size,
          type: file.type,
          pageCount,
          sheetCount,
          slideCount,
          thumbnailUrl: thumbnailUrl || undefined,
          officeType,
        };
      } catch (err) {
        console.error('Error uploading file:', err);
        setError(err instanceof Error ? err.message : 'Failed to upload file');
        return null;
      } finally {
        setIsUploading(false);
        setProgress(null);
      }
    },
    [bucket, folder, validateFile, generateThumbnail, generatePDFThumbnail, uploadThumbnail]
  );

  // Upload multiple files
  const uploadFiles = useCallback(
    async (files: File[]): Promise<UploadedFile[]> => {
      const results: UploadedFile[] = [];

      for (const file of files) {
        const result = await uploadFile(file);
        if (result) {
          results.push(result);
        }
      }

      return results;
    },
    [uploadFile]
  );

  // Delete file
  const deleteFile = useCallback(
    async (fileKey: string): Promise<boolean> => {
      try {
        const { error: deleteError } = await getSupabase().storage.from(bucket).remove([fileKey]);

        if (deleteError) throw deleteError;
        return true;
      } catch (err) {
        console.error('Error deleting file:', err);
        setError(err instanceof Error ? err.message : 'Failed to delete file');
        return false;
      }
    },
    [bucket]
  );

  // Get signed URL (for private files)
  const getSignedUrl = useCallback(
    async (fileKey: string, expiresIn: number = 3600): Promise<string | null> => {
      try {
        const { data, error: signError } = await getSupabase().storage
          .from(bucket)
          .createSignedUrl(fileKey, expiresIn);

        if (signError) throw signError;
        return data.signedUrl;
      } catch (err) {
        console.error('Error getting signed URL:', err);
        return null;
      }
    },
    [bucket]
  );

  return {
    uploadFile,
    uploadFiles,
    deleteFile,
    getSignedUrl,
    isUploading,
    progress,
    error,
    clearError: () => setError(null),
  };
}

// ============================================
// Drag and Drop Hook
// ============================================

export function useFileDrop(options: {
  onDrop: (files: File[]) => void;
  acceptedTypes?: string[];
}) {
  const { onDrop, acceptedTypes = ['application/pdf'] } = options;
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files).filter(
        (file) => acceptedTypes.length === 0 || acceptedTypes.includes(file.type)
      );

      if (files.length > 0) {
        onDrop(files);
      }
    },
    [onDrop, acceptedTypes]
  );

  return {
    isDragging,
    dragProps: {
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDragOver: handleDragOver,
      onDrop: handleDrop,
    },
  };
}

// ============================================
// Office Document Helpers
// ============================================

/**
 * Generate a thumbnail placeholder for Office documents
 */
function generateOfficeDocumentThumbnail(type: OfficeDocumentType, filename: string): string {
  const color = OFFICE_TYPE_COLORS[type];
  const icon = type === 'word' ? 'W' : type === 'excel' ? 'X' : type === 'powerpoint' ? 'P' : '?';
  
  // Create a canvas to draw the thumbnail
  const canvas = document.createElement('canvas');
  canvas.width = 200;
  canvas.height = 260;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return '';

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Top colored bar
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, 60);

  // Document icon/letter
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(icon, canvas.width / 2, 30);

  // File icon outline
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(40, 80);
  ctx.lineTo(40, 220);
  ctx.lineTo(160, 220);
  ctx.lineTo(160, 100);
  ctx.lineTo(140, 80);
  ctx.lineTo(40, 80);
  ctx.closePath();
  ctx.stroke();

  // Folded corner
  ctx.beginPath();
  ctx.moveTo(140, 80);
  ctx.lineTo(140, 100);
  ctx.lineTo(160, 100);
  ctx.stroke();

  // Content lines (placeholder)
  ctx.strokeStyle = '#d1d5db';
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const y = 120 + i * 20;
    const width = i === 0 ? 80 : 100;
    ctx.beginPath();
    ctx.moveTo(55, y);
    ctx.lineTo(55 + width, y);
    ctx.stroke();
  }

  // File extension label
  const ext = filename.substring(filename.lastIndexOf('.')).toUpperCase();
  ctx.fillStyle = color;
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'right';
  ctx.fillText(ext, canvas.width - 20, canvas.height - 15);

  return canvas.toDataURL('image/jpeg', 0.8);
}

/**
 * Extract metadata from Office documents using JSZip
 */
async function extractOfficeMetadata(
  arrayBuffer: ArrayBuffer,
  type: OfficeDocumentType
): Promise<{ pageCount?: number; sheetCount?: number; slideCount?: number } | null> {
  try {
    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(arrayBuffer);

    switch (type) {
      case 'word': {
        // Word documents don't store page count directly in metadata
        // We could parse document.xml for paragraph count as an estimate
        return { pageCount: 1 };
      }

      case 'excel': {
        // Count sheets by looking for sheet XML files
        const sheetFiles = Object.keys(zip.files).filter(
          name => name.startsWith('xl/worksheets/sheet') && name.endsWith('.xml')
        );
        return { sheetCount: sheetFiles.length };
      }

      case 'powerpoint': {
        // Count slides by looking for slide XML files
        const slideFiles = Object.keys(zip.files).filter(
          name => name.startsWith('ppt/slides/slide') && name.endsWith('.xml')
        );
        return { slideCount: slideFiles.length };
      }

      default:
        return null;
    }
  } catch (e) {
    console.warn('Could not extract Office metadata:', e);
    return null;
  }
}

/**
 * Get file accept string for Office documents
 */
export function getOfficeFileAccept(): string {
  return [
    '.pdf',
    '.docx', '.doc',
    '.xlsx', '.xls',
    '.pptx', '.ppt',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
  ].join(',');
}

export default useFileUpload;
