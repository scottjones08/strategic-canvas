// useOfficeDocument.ts - React hooks for Office document handling
// Supports Word (.docx), Excel (.xlsx), and PowerPoint (.pptx)

import { useState, useCallback, useRef } from 'react';
import {
  // OfficeDocumentType,
  OfficeDocumentInfo,
  WordDocumentContent,
  ExcelWorkbook,
  ExcelSheet,
  PowerPointPresentation,
  detectOfficeType,
  getOfficeDocumentInfo,
  // formatFileSize,
} from '../lib/office-utils';

// ============================================
// TYPES
// ============================================

export interface UseOfficeDocumentOptions {
  onLoad?: (info: OfficeDocumentInfo) => void;
  onError?: (error: Error) => void;
  autoProcess?: boolean;
}

export interface OfficeDocumentState {
  isLoading: boolean;
  error: string | null;
  info: OfficeDocumentInfo | null;
  wordContent: WordDocumentContent | null;
  excelWorkbook: ExcelWorkbook | null;
  powerPointPresentation: PowerPointPresentation | null;
}

// ============================================
// MAMMOTH.JS TYPES (for Word documents)
// ============================================

interface MammothResult {
  value: string;
  messages: { type: string; message: string }[];
}

interface MammothOptions {
  styleMap?: string[];
  includeDefaultStyleMap?: boolean;
  convertImage?: (image: any) => Promise<{ src: string }>;
}

// ============================================
// MAIN HOOK
// ============================================

export function useOfficeDocument(options: UseOfficeDocumentOptions = {}) {
  const { onLoad, onError, autoProcess = true } = options;
  
  const [state, setState] = useState<OfficeDocumentState>({
    isLoading: false,
    error: null,
    info: null,
    wordContent: null,
    excelWorkbook: null,
    powerPointPresentation: null,
  });

  const mammothRef = useRef<any>(null);
  const xlsxRef = useRef<any>(null);

  // Load mammoth.js dynamically
  const loadMammoth = useCallback(async () => {
    if (mammothRef.current) return mammothRef.current;
    
    try {
      // Dynamic import for mammoth
      const mammoth = await import('mammoth');
      mammothRef.current = mammoth.default || mammoth;
      return mammothRef.current;
    } catch (e) {
      console.warn('mammoth.js not available, Word document parsing disabled');
      return null;
    }
  }, []);

  // Load xlsx (SheetJS) dynamically
  const loadXlsx = useCallback(async () => {
    if (xlsxRef.current) return xlsxRef.current;
    
    try {
      // Dynamic import for xlsx
      const XLSX = await import('xlsx');
      xlsxRef.current = XLSX.default || XLSX;
      return xlsxRef.current;
    } catch (e) {
      console.warn('xlsx (SheetJS) not available, Excel document parsing disabled');
      return null;
    }
  }, []);

  // Process Word document
  const processWordDocument = useCallback(async (
    arrayBuffer: ArrayBuffer,
    _info: OfficeDocumentInfo
  ): Promise<WordDocumentContent | null> => {
    const mammoth = await loadMammoth();
    if (!mammoth) {
      throw new Error('mammoth.js is not available. Install it with: npm install mammoth');
    }

    const images: WordDocumentContent['images'] = [];
    
    const options: MammothOptions = {
      convertImage: mammoth.images.imgElement(async (image: any) => {
        const imageBuffer = await image.read('base64');
        const contentType = image.contentType || 'image/png';
        const imageId = `img_${images.length}`;
        const src = `data:${contentType};base64,${imageBuffer}`;
        
        images.push({
          id: imageId,
          data: imageBuffer,
          contentType,
        });
        
        return { src };
      }),
    };

    const result: MammothResult = await mammoth.convertToHtml({ arrayBuffer }, options);
    const textResult = await mammoth.extractRawText({ arrayBuffer });

    return {
      html: result.value,
      text: textResult.value,
      images,
      styles: generateWordStyles(),
      messages: result.messages.map((m: any) => `${m.type}: ${m.message}`),
    };
  }, [loadMammoth]);

  // Process Excel document
  const processExcelDocument = useCallback(async (
    arrayBuffer: ArrayBuffer,
    _info: OfficeDocumentInfo
  ): Promise<ExcelWorkbook | null> => {
    const XLSX = await loadXlsx();
    if (!XLSX) {
      throw new Error('xlsx (SheetJS) is not available. Install it with: npm install xlsx');
    }

    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    const sheets: ExcelSheet[] = workbook.SheetNames.map((sheetName: string) => {
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to array of arrays
      const data: (string | number | boolean | null)[][] = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: null,
      });

      // Get merge info
      const merges = worksheet['!merges']?.map((merge: any) => ({
        s: { r: merge.s.r, c: merge.s.c },
        e: { r: merge.e.r, c: merge.e.c },
      }));

      // Get column widths
      const colWidths = worksheet['!cols']?.map((col: any) => col?.wpx || col?.wch * 8 || 100);

      // Get row heights
      const rowHeights = worksheet['!rows']?.map((row: any) => row?.hpx || row?.hpt || 24);

      return {
        name: sheetName,
        data,
        merges,
        colWidths,
        rowHeights,
      };
    });

    return {
      sheets,
      activeSheet: 0,
      metadata: {
        title: workbook.Props?.Title,
        author: workbook.Props?.Author,
        lastModified: workbook.Props?.ModifiedDate 
          ? new Date(workbook.Props.ModifiedDate) 
          : undefined,
      },
    };
  }, [loadXlsx]);

  // Process PowerPoint document (basic extraction)
  const processPowerPointDocument = useCallback(async (
    arrayBuffer: ArrayBuffer,
    info: OfficeDocumentInfo
  ): Promise<PowerPointPresentation | null> => {
    // Note: Full PPTX parsing requires additional libraries like pptxgenjs or custom XML parsing
    // For now, we return a placeholder that can be enhanced with external viewers
    
    try {
      // Try to use JSZip to extract basic info from PPTX
      const JSZip = (await import('jszip')).default;
      const zip = await JSZip.loadAsync(arrayBuffer);
      
      // Count slides by looking for slide XML files
      const slideFiles = Object.keys(zip.files).filter(
        name => name.startsWith('ppt/slides/slide') && name.endsWith('.xml')
      );
      
      const slides: PowerPointPresentation['slides'] = slideFiles.map((_, index) => ({
        index: index + 1,
        content: `<div class="pptx-slide">Slide ${index + 1}</div>`,
      }));

      return {
        slides,
        metadata: {
          title: info.name.replace(/\.[^/.]+$/, ''),
        },
      };
    } catch (e) {
      console.warn('Could not parse PPTX structure:', e);
      // Return minimal placeholder
      return {
        slides: [{ index: 1, content: '<div>PowerPoint preview requires external viewer</div>' }],
      };
    }
  }, []);

  // Main load function
  const loadDocument = useCallback(async (file: File | ArrayBuffer, filename?: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      let arrayBuffer: ArrayBuffer;
      let info: OfficeDocumentInfo;

      if (file instanceof File) {
        info = getOfficeDocumentInfo(file);
        arrayBuffer = await file.arrayBuffer();
      } else {
        if (!filename) {
          throw new Error('Filename is required when loading from ArrayBuffer');
        }
        arrayBuffer = file;
        const type = detectOfficeType(filename);
        info = {
          type,
          name: filename,
          size: arrayBuffer.byteLength,
          mimeType: 'application/octet-stream',
          extension: filename.substring(filename.lastIndexOf('.')),
        };
      }

      let wordContent: WordDocumentContent | null = null;
      let excelWorkbook: ExcelWorkbook | null = null;
      let powerPointPresentation: PowerPointPresentation | null = null;

      if (autoProcess) {
        switch (info.type) {
          case 'word':
            wordContent = await processWordDocument(arrayBuffer, info);
            break;
          case 'excel':
            excelWorkbook = await processExcelDocument(arrayBuffer, info);
            if (excelWorkbook) {
              info.sheetCount = excelWorkbook.sheets.length;
            }
            break;
          case 'powerpoint':
            powerPointPresentation = await processPowerPointDocument(arrayBuffer, info);
            if (powerPointPresentation) {
              info.slideCount = powerPointPresentation.slides.length;
            }
            break;
        }
      }

      setState({
        isLoading: false,
        error: null,
        info,
        wordContent,
        excelWorkbook,
        powerPointPresentation,
      });

      onLoad?.(info);

      return { info, wordContent, excelWorkbook, powerPointPresentation };
    } catch (e) {
      const error = e instanceof Error ? e : new Error('Failed to load document');
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message,
      }));
      onError?.(error);
      throw error;
    }
  }, [autoProcess, processWordDocument, processExcelDocument, processPowerPointDocument, onLoad, onError]);

  // Load from URL
  const loadFromUrl = useCallback(async (url: string, filename?: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch document: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const name = filename || url.split('/').pop() || 'document';

      return loadDocument(arrayBuffer, name);
    } catch (e) {
      const error = e instanceof Error ? e : new Error('Failed to load document from URL');
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message,
      }));
      onError?.(error);
      throw error;
    }
  }, [loadDocument, onError]);

  // Clear state
  const clear = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      info: null,
      wordContent: null,
      excelWorkbook: null,
      powerPointPresentation: null,
    });
  }, []);

  return {
    ...state,
    loadDocument,
    loadFromUrl,
    clear,
    processWordDocument,
    processExcelDocument,
    processPowerPointDocument,
  };
}

// ============================================
// EXCEL SPECIFIC HOOK
// ============================================

export function useExcelDocument() {
  const [workbook, setWorkbook] = useState<ExcelWorkbook | null>(null);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeSheet = workbook?.sheets[activeSheetIndex] || null;

  const loadWorkbook = useCallback(async (file: File | ArrayBuffer, _filename?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const XLSX = await import('xlsx');
      const xlsx = XLSX.default || XLSX;

      let arrayBuffer: ArrayBuffer;
      if (file instanceof File) {
        arrayBuffer = await file.arrayBuffer();
      } else {
        arrayBuffer = file;
      }

      const wb = xlsx.read(arrayBuffer, { type: 'array' });

      const sheets: ExcelSheet[] = wb.SheetNames.map((sheetName: string) => {
        const worksheet = wb.Sheets[sheetName];
        const data: (string | number | boolean | null)[][] = xlsx.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: null,
        });

        return {
          name: sheetName,
          data,
          merges: worksheet['!merges']?.map((merge: any) => ({
            s: { r: merge.s.r, c: merge.s.c },
            e: { r: merge.e.r, c: merge.e.c },
          })),
          colWidths: worksheet['!cols']?.map((col: any) => col?.wpx || 100),
          rowHeights: worksheet['!rows']?.map((row: any) => row?.hpx || 24),
        };
      });

      const newWorkbook: ExcelWorkbook = {
        sheets,
        activeSheet: 0,
        metadata: {
          title: wb.Props?.Title,
          author: wb.Props?.Author,
        },
      };

      setWorkbook(newWorkbook);
      setActiveSheetIndex(0);
      return newWorkbook;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load Excel file';
      setError(message);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateCell = useCallback((sheetIndex: number, row: number, col: number, value: any) => {
    setWorkbook(prev => {
      if (!prev) return prev;
      const newSheets = [...prev.sheets];
      const sheet = { ...newSheets[sheetIndex] };
      const newData = sheet.data.map(r => [...r]);
      
      // Ensure row exists
      while (newData.length <= row) {
        newData.push([]);
      }
      // Ensure column exists
      while (newData[row].length <= col) {
        newData[row].push(null);
      }
      
      newData[row][col] = value;
      sheet.data = newData;
      newSheets[sheetIndex] = sheet;
      
      return { ...prev, sheets: newSheets };
    });
  }, []);

  const addSheet = useCallback((name: string) => {
    setWorkbook(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        sheets: [...prev.sheets, { name, data: [[]] }],
      };
    });
  }, []);

  const removeSheet = useCallback((index: number) => {
    setWorkbook(prev => {
      if (!prev || prev.sheets.length <= 1) return prev;
      const newSheets = prev.sheets.filter((_, i) => i !== index);
      return {
        ...prev,
        sheets: newSheets,
        activeSheet: Math.min(prev.activeSheet, newSheets.length - 1),
      };
    });
    setActiveSheetIndex(prev => Math.max(0, prev - 1));
  }, []);

  const exportToFile = useCallback(async (_filename: string = 'export.xlsx') => {
    if (!workbook) return null;

    const XLSX = await import('xlsx');
    const xlsx = XLSX.default || XLSX;

    const wb = xlsx.utils.book_new();

    workbook.sheets.forEach(sheet => {
      const ws = xlsx.utils.aoa_to_sheet(sheet.data);
      xlsx.utils.book_append_sheet(wb, ws, sheet.name);
    });

    const buffer = xlsx.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    return blob;
  }, [workbook]);

  return {
    workbook,
    activeSheet,
    activeSheetIndex,
    isLoading,
    error,
    loadWorkbook,
    setActiveSheetIndex,
    updateCell,
    addSheet,
    removeSheet,
    exportToFile,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateWordStyles(): string {
  return `
    .mammoth-document {
      font-family: 'Calibri', 'Arial', sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #333;
    }
    .mammoth-document h1 {
      font-size: 24pt;
      font-weight: bold;
      margin-top: 24pt;
      margin-bottom: 12pt;
      color: #1a1a1a;
    }
    .mammoth-document h2 {
      font-size: 18pt;
      font-weight: bold;
      margin-top: 20pt;
      margin-bottom: 10pt;
      color: #2a2a2a;
    }
    .mammoth-document h3 {
      font-size: 14pt;
      font-weight: bold;
      margin-top: 16pt;
      margin-bottom: 8pt;
      color: #3a3a3a;
    }
    .mammoth-document p {
      margin-bottom: 10pt;
    }
    .mammoth-document ul, .mammoth-document ol {
      margin-left: 24pt;
      margin-bottom: 10pt;
    }
    .mammoth-document li {
      margin-bottom: 4pt;
    }
    .mammoth-document table {
      border-collapse: collapse;
      width: 100%;
      margin-bottom: 10pt;
    }
    .mammoth-document td, .mammoth-document th {
      border: 1px solid #ddd;
      padding: 8px;
    }
    .mammoth-document th {
      background-color: #f5f5f5;
      font-weight: bold;
    }
    .mammoth-document img {
      max-width: 100%;
      height: auto;
    }
    .mammoth-document a {
      color: #0563C1;
      text-decoration: underline;
    }
  `;
}

export default useOfficeDocument;
