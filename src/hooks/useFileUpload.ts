// useFileUpload.ts - File upload hook for Supabase Storage
// Handles PDF uploads with progress tracking and thumbnail generation

import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import * as pdfjsLib from 'pdfjs-dist';

// Guard to throw if supabase is not configured
function getSupabase() {
  if (!supabase) throw new Error('Supabase not configured');
  return supabase;
}

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

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
  thumbnailUrl?: string;
}

export interface UseFileUploadOptions {
  bucket?: string;
  folder?: string;
  maxSizeMB?: number;
  acceptedTypes?: string[];
  generateThumbnail?: boolean;
  thumbnailScale?: number;
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
  } = options;

  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Validate file
  const validateFile = useCallback(
    (file: File): string | null => {
      // Check file type
      if (acceptedTypes.length > 0 && !acceptedTypes.includes(file.type)) {
        return `Invalid file type. Accepted types: ${acceptedTypes.join(', ')}`;
      }

      // Check file size
      const maxBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxBytes) {
        return `File too large. Maximum size is ${maxSizeMB}MB`;
      }

      return null;
    },
    [acceptedTypes, maxSizeMB]
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

        // Generate thumbnail if PDF
        let thumbnailUrl: string | null = null;
        let pageCount = 0;

        if (file.type === 'application/pdf' && generateThumbnail) {
          const { thumbnail, pageCount: pages } = await generatePDFThumbnail(arrayBuffer);
          pageCount = pages;

          if (thumbnail) {
            thumbnailUrl = await uploadThumbnail(thumbnail, file.name);
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
          thumbnailUrl: thumbnailUrl || undefined,
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

export default useFileUpload;
