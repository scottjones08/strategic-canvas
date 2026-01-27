// PDF Utilities - PDF manipulation using pdf-lib and pdf.js
// Provides functions for merging, splitting, rotating, and annotating PDFs

import { PDFDocument, rgb, StandardFonts, degrees, PDFFont } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure PDF.js worker - use bundled worker to avoid CDN version mismatch
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// ============================================
// TYPES
// ============================================

export interface PDFAnnotation {
  id: string;
  type: 'highlight' | 'underline' | 'strikethrough' | 'rectangle' | 'ellipse' | 
        'arrow' | 'line' | 'freehand' | 'text' | 'sticky_note' | 'signature' | 'stamp' | 'image';
  pageNumber: number;
  x: number; // Percentage of page width (0-1)
  y: number; // Percentage of page height (0-1)
  width?: number;
  height?: number;
  color: string;
  opacity: number;
  strokeWidth?: number;
  fontSize?: number;
  fontFamily?: string;
  content?: string;
  pathData?: { x: number; y: number }[];
  imageData?: string; // Base64 or URL
  textQuads?: { x: number; y: number; width: number; height: number }[];
  authorId?: string;
  authorName?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PDFComment {
  id: string;
  documentId: string;
  pageNumber: number;
  positionX: number;
  positionY: number;
  selectionStart?: number;
  selectionEnd?: number;
  selectedText?: string;
  content: string;
  authorName: string;
  authorEmail?: string;
  authorId?: string;
  parentId?: string;
  threadId?: string;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  reactions?: { emoji: string; count: number }[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentMetadata {
  id: string;
  name: string;
  description?: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  pageCount: number;
  clientId?: string;
  organizationId?: string;
  thumbnailUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PageInfo {
  pageNumber: number;
  width: number;
  height: number;
  rotation: number;
  thumbnail?: string;
}

// ============================================
// COLOR UTILITIES
// ============================================

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255,
    };
  }
  return { r: 1, g: 1, b: 0 }; // Default yellow
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

// ============================================
// PDF LOADING
// ============================================

export async function loadPDFDocument(source: string | ArrayBuffer | Uint8Array): Promise<pdfjsLib.PDFDocumentProxy> {
  const loadingTask = pdfjsLib.getDocument(source);
  return await loadingTask.promise;
}

export async function getPDFPageCount(source: string | ArrayBuffer): Promise<number> {
  const pdf = await loadPDFDocument(source);
  return pdf.numPages;
}

export async function getPDFMetadata(source: string | ArrayBuffer): Promise<{
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
}> {
  const pdf = await loadPDFDocument(source);
  const metadata = await pdf.getMetadata();
  const info = metadata.info as any;
  
  return {
    title: info.Title,
    author: info.Author,
    subject: info.Subject,
    keywords: info.Keywords,
    creator: info.Creator,
    producer: info.Producer,
    creationDate: info.CreationDate ? new Date(info.CreationDate) : undefined,
    modificationDate: info.ModDate ? new Date(info.ModDate) : undefined,
  };
}

// ============================================
// PAGE RENDERING
// ============================================

export async function renderPageToCanvas(
  pdf: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  scale: number = 1.5
): Promise<void> {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not get canvas context');
  
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  
  await page.render({
    canvasContext: context,
    viewport,
    canvas,
  } as any).promise;
}

export async function renderPageToImage(
  pdf: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  scale: number = 1.5,
  format: 'png' | 'jpeg' = 'png'
): Promise<string> {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  
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
  
  return canvas.toDataURL(`image/${format}`);
}

export async function generateThumbnails(
  pdf: pdfjsLib.PDFDocumentProxy,
  scale: number = 0.3
): Promise<string[]> {
  const thumbnails: string[] = [];
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const thumbnail = await renderPageToImage(pdf, i, scale, 'jpeg');
    thumbnails.push(thumbnail);
  }
  
  return thumbnails;
}

export async function getPageInfo(pdf: pdfjsLib.PDFDocumentProxy): Promise<PageInfo[]> {
  const pages: PageInfo[] = [];
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1 });
    
    pages.push({
      pageNumber: i,
      width: viewport.width,
      height: viewport.height,
      rotation: page.rotate,
    });
  }
  
  return pages;
}

// ============================================
// TEXT EXTRACTION
// ============================================

export async function extractTextFromPage(
  pdf: pdfjsLib.PDFDocumentProxy,
  pageNumber: number
): Promise<{ text: string; items: any[] }> {
  const page = await pdf.getPage(pageNumber);
  const textContent = await page.getTextContent();
  
  const text = textContent.items
    .filter((item): item is any => 'str' in item)
    .map(item => item.str)
    .join(' ');
  
  return { text, items: textContent.items };
}

export async function extractAllText(pdf: pdfjsLib.PDFDocumentProxy): Promise<string> {
  const texts: string[] = [];
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const { text } = await extractTextFromPage(pdf, i);
    texts.push(`Page ${i}:\n${text}`);
  }
  
  return texts.join('\n\n');
}

export async function searchText(
  pdf: pdfjsLib.PDFDocumentProxy,
  query: string
): Promise<{ pageNumber: number; text: string; position: number }[]> {
  const results: { pageNumber: number; text: string; position: number }[] = [];
  const lowerQuery = query.toLowerCase();
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const { text } = await extractTextFromPage(pdf, i);
    const lowerText = text.toLowerCase();
    let position = lowerText.indexOf(lowerQuery);
    
    while (position !== -1) {
      results.push({
        pageNumber: i,
        text: text.substring(Math.max(0, position - 20), position + query.length + 20),
        position,
      });
      position = lowerText.indexOf(lowerQuery, position + 1);
    }
  }
  
  return results;
}

// ============================================
// PDF MANIPULATION WITH PDF-LIB
// ============================================

export async function loadPDFLib(source: string | ArrayBuffer | Uint8Array): Promise<PDFDocument> {
  if (typeof source === 'string') {
    // URL
    const response = await fetch(source);
    const arrayBuffer = await response.arrayBuffer();
    return await PDFDocument.load(arrayBuffer);
  }
  return await PDFDocument.load(source);
}

export async function mergePDFs(sources: (string | ArrayBuffer | Uint8Array)[]): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();
  
  for (const source of sources) {
    const pdf = await loadPDFLib(source);
    const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    pages.forEach(page => mergedPdf.addPage(page));
  }
  
  return await mergedPdf.save();
}

export async function extractPages(
  source: string | ArrayBuffer | Uint8Array,
  pageNumbers: number[]
): Promise<Uint8Array> {
  const sourcePdf = await loadPDFLib(source);
  const newPdf = await PDFDocument.create();
  
  // Convert 1-based to 0-based indices
  const indices = pageNumbers.map(n => n - 1);
  const pages = await newPdf.copyPages(sourcePdf, indices);
  pages.forEach(page => newPdf.addPage(page));
  
  return await newPdf.save();
}

export async function deletePage(
  source: string | ArrayBuffer | Uint8Array,
  pageNumber: number
): Promise<Uint8Array> {
  const pdf = await loadPDFLib(source);
  pdf.removePage(pageNumber - 1); // 0-based index
  return await pdf.save();
}

export async function rotatePage(
  source: string | ArrayBuffer | Uint8Array,
  pageNumber: number,
  rotation: 0 | 90 | 180 | 270
): Promise<Uint8Array> {
  const pdf = await loadPDFLib(source);
  const page = pdf.getPage(pageNumber - 1);
  page.setRotation(degrees(rotation));
  return await pdf.save();
}

export async function rotateAllPages(
  source: string | ArrayBuffer | Uint8Array,
  rotation: 0 | 90 | 180 | 270
): Promise<Uint8Array> {
  const pdf = await loadPDFLib(source);
  const pages = pdf.getPages();
  pages.forEach(page => page.setRotation(degrees(rotation)));
  return await pdf.save();
}

export async function reorderPages(
  source: string | ArrayBuffer | Uint8Array,
  newOrder: number[]
): Promise<Uint8Array> {
  const sourcePdf = await loadPDFLib(source);
  const newPdf = await PDFDocument.create();
  
  // Convert 1-based to 0-based indices
  const indices = newOrder.map(n => n - 1);
  const pages = await newPdf.copyPages(sourcePdf, indices);
  pages.forEach(page => newPdf.addPage(page));
  
  return await newPdf.save();
}

// ============================================
// ANNOTATION RENDERING TO PDF
// ============================================

export async function addTextAnnotation(
  pdf: PDFDocument,
  pageNumber: number,
  x: number,
  y: number,
  text: string,
  options: {
    fontSize?: number;
    color?: string;
    font?: PDFFont;
  } = {}
): Promise<void> {
  const page = pdf.getPage(pageNumber - 1);
  const { width, height } = page.getSize();
  const { fontSize = 12, color = '#000000' } = options;
  
  const font = options.font || await pdf.embedFont(StandardFonts.Helvetica);
  const { r, g, b } = hexToRgb(color);
  
  page.drawText(text, {
    x: x * width,
    y: height - (y * height), // PDF coordinates are from bottom
    size: fontSize,
    font,
    color: rgb(r, g, b),
  });
}

export async function addRectangleAnnotation(
  pdf: PDFDocument,
  pageNumber: number,
  x: number,
  y: number,
  rectWidth: number,
  rectHeight: number,
  options: {
    color?: string;
    opacity?: number;
    borderWidth?: number;
    fill?: boolean;
  } = {}
): Promise<void> {
  const page = pdf.getPage(pageNumber - 1);
  const { width, height } = page.getSize();
  const { color = '#ffff00', opacity = 0.3, borderWidth = 1, fill = true } = options;
  
  const { r, g, b } = hexToRgb(color);
  
  if (fill) {
    page.drawRectangle({
      x: x * width,
      y: height - (y * height) - (rectHeight * height),
      width: rectWidth * width,
      height: rectHeight * height,
      color: rgb(r, g, b),
      opacity,
    });
  }
  
  page.drawRectangle({
    x: x * width,
    y: height - (y * height) - (rectHeight * height),
    width: rectWidth * width,
    height: rectHeight * height,
    borderColor: rgb(r, g, b),
    borderWidth,
  });
}

export async function addHighlightAnnotation(
  pdf: PDFDocument,
  pageNumber: number,
  quads: { x: number; y: number; width: number; height: number }[],
  color: string = '#ffff00',
  opacity: number = 0.3
): Promise<void> {
  const page = pdf.getPage(pageNumber - 1);
  const { width, height } = page.getSize();
  const { r, g, b } = hexToRgb(color);
  
  for (const quad of quads) {
    page.drawRectangle({
      x: quad.x * width,
      y: height - (quad.y * height) - (quad.height * height),
      width: quad.width * width,
      height: quad.height * height,
      color: rgb(r, g, b),
      opacity,
    });
  }
}

export async function addLineAnnotation(
  pdf: PDFDocument,
  pageNumber: number,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  options: {
    color?: string;
    width?: number;
  } = {}
): Promise<void> {
  const page = pdf.getPage(pageNumber - 1);
  const { width, height } = page.getSize();
  const { color = '#000000', width: lineWidth = 2 } = options;
  
  const { r, g, b } = hexToRgb(color);
  
  page.drawLine({
    start: { x: startX * width, y: height - (startY * height) },
    end: { x: endX * width, y: height - (endY * height) },
    color: rgb(r, g, b),
    thickness: lineWidth,
  });
}

export async function addFreehandAnnotation(
  pdf: PDFDocument,
  pageNumber: number,
  points: { x: number; y: number }[],
  options: {
    color?: string;
    width?: number;
  } = {}
): Promise<void> {
  const page = pdf.getPage(pageNumber - 1);
  const { width, height } = page.getSize();
  const { color = '#000000', width: lineWidth = 2 } = options;
  
  const { r, g, b } = hexToRgb(color);
  
  for (let i = 0; i < points.length - 1; i++) {
    page.drawLine({
      start: { x: points[i].x * width, y: height - (points[i].y * height) },
      end: { x: points[i + 1].x * width, y: height - (points[i + 1].y * height) },
      color: rgb(r, g, b),
      thickness: lineWidth,
    });
  }
}

export async function addImageAnnotation(
  pdf: PDFDocument,
  pageNumber: number,
  imageData: string | Uint8Array,
  x: number,
  y: number,
  imgWidth: number,
  imgHeight: number,
  imageType: 'png' | 'jpg' = 'png'
): Promise<void> {
  const page = pdf.getPage(pageNumber - 1);
  const { width, height } = page.getSize();
  
  let image;
  if (typeof imageData === 'string' && imageData.startsWith('data:')) {
    // Base64 data URL
    const base64 = imageData.split(',')[1];
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    image = imageType === 'png' 
      ? await pdf.embedPng(bytes)
      : await pdf.embedJpg(bytes);
  } else if (imageData instanceof Uint8Array) {
    image = imageType === 'png'
      ? await pdf.embedPng(imageData)
      : await pdf.embedJpg(imageData);
  } else {
    throw new Error('Invalid image data');
  }
  
  page.drawImage(image, {
    x: x * width,
    y: height - (y * height) - (imgHeight * height),
    width: imgWidth * width,
    height: imgHeight * height,
  });
}

// ============================================
// APPLY ALL ANNOTATIONS
// ============================================

export async function applyAnnotations(
  source: string | ArrayBuffer | Uint8Array,
  annotations: PDFAnnotation[]
): Promise<Uint8Array> {
  const pdf = await loadPDFLib(source);
  
  for (const annotation of annotations) {
    switch (annotation.type) {
      case 'highlight':
        if (annotation.textQuads) {
          await addHighlightAnnotation(
            pdf,
            annotation.pageNumber,
            annotation.textQuads,
            annotation.color,
            annotation.opacity
          );
        }
        break;
        
      case 'underline':
        if (annotation.textQuads) {
          for (const quad of annotation.textQuads) {
            await addLineAnnotation(
              pdf,
              annotation.pageNumber,
              quad.x,
              quad.y + quad.height,
              quad.x + quad.width,
              quad.y + quad.height,
              { color: annotation.color, width: annotation.strokeWidth }
            );
          }
        }
        break;
        
      case 'strikethrough':
        if (annotation.textQuads) {
          for (const quad of annotation.textQuads) {
            await addLineAnnotation(
              pdf,
              annotation.pageNumber,
              quad.x,
              quad.y + quad.height / 2,
              quad.x + quad.width,
              quad.y + quad.height / 2,
              { color: annotation.color, width: annotation.strokeWidth }
            );
          }
        }
        break;
        
      case 'rectangle':
        await addRectangleAnnotation(
          pdf,
          annotation.pageNumber,
          annotation.x,
          annotation.y,
          annotation.width || 0.1,
          annotation.height || 0.1,
          { color: annotation.color, opacity: annotation.opacity }
        );
        break;
        
      case 'line':
        if (annotation.pathData && annotation.pathData.length >= 2) {
          await addLineAnnotation(
            pdf,
            annotation.pageNumber,
            annotation.pathData[0].x,
            annotation.pathData[0].y,
            annotation.pathData[1].x,
            annotation.pathData[1].y,
            { color: annotation.color, width: annotation.strokeWidth }
          );
        }
        break;
        
      case 'freehand':
        if (annotation.pathData) {
          await addFreehandAnnotation(
            pdf,
            annotation.pageNumber,
            annotation.pathData,
            { color: annotation.color, width: annotation.strokeWidth }
          );
        }
        break;
        
      case 'text':
        if (annotation.content) {
          await addTextAnnotation(
            pdf,
            annotation.pageNumber,
            annotation.x,
            annotation.y,
            annotation.content,
            { fontSize: annotation.fontSize, color: annotation.color }
          );
        }
        break;
        
      case 'signature':
      case 'stamp':
      case 'image':
        if (annotation.imageData) {
          await addImageAnnotation(
            pdf,
            annotation.pageNumber,
            annotation.imageData,
            annotation.x,
            annotation.y,
            annotation.width || 0.2,
            annotation.height || 0.1
          );
        }
        break;
    }
  }
  
  return await pdf.save();
}

// ============================================
// WATERMARK / STAMP
// ============================================

export async function addWatermark(
  source: string | ArrayBuffer | Uint8Array,
  text: string,
  options: {
    fontSize?: number;
    color?: string;
    opacity?: number;
    rotation?: number;
    position?: 'center' | 'diagonal' | 'bottom-right';
  } = {}
): Promise<Uint8Array> {
  const pdf = await loadPDFLib(source);
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  const { fontSize = 48, color = '#888888', opacity = 0.3, rotation = 45, position = 'diagonal' } = options;
  const { r, g, b } = hexToRgb(color);
  
  const pages = pdf.getPages();
  
  for (const page of pages) {
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    const textHeight = font.heightAtSize(fontSize);
    
    let x: number, y: number, rot: number;
    
    switch (position) {
      case 'center':
        x = (width - textWidth) / 2;
        y = (height - textHeight) / 2;
        rot = 0;
        break;
      case 'bottom-right':
        x = width - textWidth - 20;
        y = 20;
        rot = 0;
        break;
      case 'diagonal':
      default:
        x = width / 4;
        y = height / 2;
        rot = rotation;
        break;
    }
    
    page.drawText(text, {
      x,
      y,
      size: fontSize,
      font,
      color: rgb(r, g, b),
      opacity,
      rotate: degrees(rot),
    });
  }
  
  return await pdf.save();
}

// ============================================
// FORM HANDLING
// ============================================

export async function getFormFields(source: string | ArrayBuffer | Uint8Array): Promise<{
  name: string;
  type: string;
  value?: string;
}[]> {
  const pdf = await loadPDFLib(source);
  const form = pdf.getForm();
  const fields = form.getFields();
  
  return fields.map(field => ({
    name: field.getName(),
    type: field.constructor.name,
    value: 'getText' in field ? (field as any).getText() : undefined,
  }));
}

export async function fillFormField(
  source: string | ArrayBuffer | Uint8Array,
  fieldName: string,
  value: string
): Promise<Uint8Array> {
  const pdf = await loadPDFLib(source);
  const form = pdf.getForm();
  
  try {
    const field = form.getTextField(fieldName);
    field.setText(value);
  } catch {
    // Field might be a different type
    console.warn(`Could not fill field ${fieldName}`);
  }
  
  return await pdf.save();
}

export async function fillMultipleFields(
  source: string | ArrayBuffer | Uint8Array,
  fieldValues: Record<string, string>
): Promise<Uint8Array> {
  const pdf = await loadPDFLib(source);
  const form = pdf.getForm();
  
  for (const [fieldName, value] of Object.entries(fieldValues)) {
    try {
      const field = form.getTextField(fieldName);
      field.setText(value);
    } catch {
      console.warn(`Could not fill field ${fieldName}`);
    }
  }
  
  return await pdf.save();
}

// ============================================
// EXPORT UTILITIES
// ============================================

export function downloadPDF(pdfBytes: Uint8Array, filename: string): void {
  const blob = new Blob([pdfBytes.slice()], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function pdfBytesToBase64(pdfBytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < pdfBytes.length; i++) {
    binary += String.fromCharCode(pdfBytes[i]);
  }
  return btoa(binary);
}

export function base64ToPdfBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ============================================
// GENERATE ID UTILITY
// ============================================

export function generateAnnotationId(): string {
  return 'ann_' + Math.random().toString(36).substring(2, 11);
}

export function generateCommentId(): string {
  return 'com_' + Math.random().toString(36).substring(2, 11);
}
