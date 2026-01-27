// PDF Enterprise Utilities - Advanced PDF manipulation features
// Includes form creation, redaction, stamps, search highlighting, collaboration

import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { hexToRgb, loadPDFLib } from './pdf-utils';

// ============================================
// EXTENDED TYPES
// ============================================

export interface StampConfig {
  type: 'approved' | 'rejected' | 'draft' | 'confidential' | 'final' | 'reviewed' | 'custom';
  text?: string;
  color: string;
  backgroundColor?: string;
  borderWidth?: number;
  rotation?: number;
  showDate?: boolean;
  showUser?: string;
}

export interface RedactionArea {
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  reason?: string;
}

export interface FormFieldDefinition {
  id: string;
  type: 'text' | 'checkbox' | 'dropdown' | 'radio' | 'signature';
  name: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  placeholder?: string;
  required?: boolean;
  options?: string[]; // For dropdown/radio
  multiline?: boolean;
  maxLength?: number;
  defaultValue?: string | boolean;
}

export interface SearchResult {
  pageNumber: number;
  text: string;
  position: number;
  rect?: { x: number; y: number; width: number; height: number };
  context: string;
}

export interface BookmarkEntry {
  title: string;
  pageNumber: number;
  children?: BookmarkEntry[];
  expanded?: boolean;
}

export interface VersionInfo {
  version: number;
  timestamp: Date;
  author: string;
  description?: string;
  annotations: number;
  comments: number;
  checksum?: string;
}

export interface CollaborationAnnotation {
  id: string;
  sessionId: string;
  userId: string;
  userName: string;
  userColor: string;
  type: string;
  data: any;
  timestamp: Date;
  synced: boolean;
}

export interface AnnotationThread {
  id: string;
  pageNumber: number;
  x: number;
  y: number;
  anchor?: { start: number; end: number; text: string };
  comments: ThreadComment[];
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ThreadComment {
  id: string;
  threadId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  mentions?: string[];
  reactions?: { emoji: string; users: string[] }[];
  edited?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// STAMP TEMPLATES
// ============================================

export const STAMP_TEMPLATES: Record<string, StampConfig> = {
  approved: {
    type: 'approved',
    text: 'APPROVED',
    color: '#22c55e',
    backgroundColor: '#dcfce7',
    borderWidth: 3,
    rotation: -15,
    showDate: true,
  },
  rejected: {
    type: 'rejected',
    text: 'REJECTED',
    color: '#ef4444',
    backgroundColor: '#fee2e2',
    borderWidth: 3,
    rotation: -15,
    showDate: true,
  },
  draft: {
    type: 'draft',
    text: 'DRAFT',
    color: '#f59e0b',
    backgroundColor: '#fef3c7',
    borderWidth: 2,
    rotation: -10,
  },
  confidential: {
    type: 'confidential',
    text: 'CONFIDENTIAL',
    color: '#dc2626',
    backgroundColor: '#fecaca',
    borderWidth: 3,
    rotation: -20,
  },
  final: {
    type: 'final',
    text: 'FINAL',
    color: '#2563eb',
    backgroundColor: '#dbeafe',
    borderWidth: 3,
    rotation: -15,
  },
  reviewed: {
    type: 'reviewed',
    text: 'REVIEWED',
    color: '#8b5cf6',
    backgroundColor: '#ede9fe',
    borderWidth: 2,
    rotation: -12,
    showDate: true,
  },
};

// ============================================
// STAMP FUNCTIONS
// ============================================

export async function addStampToPDF(
  source: string | ArrayBuffer | Uint8Array,
  pageNumber: number,
  x: number,
  y: number,
  stamp: StampConfig | string
): Promise<Uint8Array> {
  const pdf = await loadPDFLib(source);
  const page = pdf.getPage(pageNumber - 1);
  const { width, height } = page.getSize();
  
  const config = typeof stamp === 'string' ? STAMP_TEMPLATES[stamp] : stamp;
  if (!config) throw new Error(`Unknown stamp type: ${stamp}`);
  
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fontSize = 24;
  
  const stampText = config.text || config.type.toUpperCase();
  const textWidth = font.widthOfTextAtSize(stampText, fontSize);
  const textHeight = font.heightAtSize(fontSize);
  
  // Calculate position
  const stampX = x * width;
  const stampY = height - (y * height);
  const padding = 10;
  const boxWidth = textWidth + padding * 2;
  const boxHeight = textHeight + padding * 2 + (config.showDate ? 15 : 0);
  
  const { r, g, b } = hexToRgb(config.color);
  
  // Draw background if specified
  if (config.backgroundColor) {
    const bgColor = hexToRgb(config.backgroundColor);
    page.drawRectangle({
      x: stampX,
      y: stampY - boxHeight,
      width: boxWidth,
      height: boxHeight,
      color: rgb(bgColor.r, bgColor.g, bgColor.b),
      opacity: 0.8,
      rotate: degrees(config.rotation || 0),
    });
  }
  
  // Draw border
  page.drawRectangle({
    x: stampX,
    y: stampY - boxHeight,
    width: boxWidth,
    height: boxHeight,
    borderColor: rgb(r, g, b),
    borderWidth: config.borderWidth || 2,
    rotate: degrees(config.rotation || 0),
  });
  
  // Draw text
  page.drawText(stampText, {
    x: stampX + padding,
    y: stampY - textHeight - padding,
    size: fontSize,
    font,
    color: rgb(r, g, b),
    rotate: degrees(config.rotation || 0),
  });
  
  // Draw date if specified
  if (config.showDate) {
    const dateText = new Date().toLocaleDateString();
    const dateFont = await pdf.embedFont(StandardFonts.Helvetica);
    page.drawText(dateText, {
      x: stampX + padding,
      y: stampY - textHeight - padding - 12,
      size: 10,
      font: dateFont,
      color: rgb(r, g, b),
      rotate: degrees(config.rotation || 0),
    });
  }
  
  // Draw user if specified
  if (config.showUser) {
    const dateFont = await pdf.embedFont(StandardFonts.HelveticaOblique);
    page.drawText(`By: ${config.showUser}`, {
      x: stampX + padding + 60,
      y: stampY - textHeight - padding - 12,
      size: 9,
      font: dateFont,
      color: rgb(r, g, b),
      rotate: degrees(config.rotation || 0),
    });
  }
  
  return await pdf.save();
}

// ============================================
// REDACTION FUNCTIONS
// ============================================

export async function applyRedaction(
  source: string | ArrayBuffer | Uint8Array,
  redactions: RedactionArea[]
): Promise<Uint8Array> {
  const pdf = await loadPDFLib(source);
  
  for (const redaction of redactions) {
    const page = pdf.getPage(redaction.pageNumber - 1);
    const { width, height } = page.getSize();
    
    // Draw black rectangle over redacted area
    page.drawRectangle({
      x: redaction.x * width,
      y: height - (redaction.y * height) - (redaction.height * height),
      width: redaction.width * width,
      height: redaction.height * height,
      color: rgb(0, 0, 0),
      opacity: 1,
    });
    
    // Add redaction label if reason provided
    if (redaction.reason) {
      const font = await pdf.embedFont(StandardFonts.Helvetica);
      page.drawText(redaction.reason, {
        x: redaction.x * width + 2,
        y: height - (redaction.y * height) - (redaction.height * height) / 2,
        size: 8,
        font,
        color: rgb(1, 1, 1),
      });
    }
  }
  
  return await pdf.save();
}

export async function previewRedaction(
  source: string | ArrayBuffer | Uint8Array,
  redactions: RedactionArea[]
): Promise<Uint8Array> {
  const pdf = await loadPDFLib(source);
  
  for (const redaction of redactions) {
    const page = pdf.getPage(redaction.pageNumber - 1);
    const { width, height } = page.getSize();
    
    // Draw semi-transparent red overlay for preview
    page.drawRectangle({
      x: redaction.x * width,
      y: height - (redaction.y * height) - (redaction.height * height),
      width: redaction.width * width,
      height: redaction.height * height,
      color: rgb(1, 0, 0),
      opacity: 0.3,
      borderColor: rgb(1, 0, 0),
      borderWidth: 2,
    });
  }
  
  return await pdf.save();
}

// ============================================
// FORM FIELD CREATION
// ============================================

export async function createFormField(
  source: string | ArrayBuffer | Uint8Array,
  field: FormFieldDefinition
): Promise<Uint8Array> {
  const pdf = await loadPDFLib(source);
  const page = pdf.getPage(field.pageNumber - 1);
  const { width, height } = page.getSize();
  const form = pdf.getForm();
  
  const fieldX = field.x * width;
  const fieldY = height - (field.y * height) - (field.height * height);
  const fieldWidth = field.width * width;
  const fieldHeight = field.height * height;
  
  switch (field.type) {
    case 'text': {
      const textField = form.createTextField(field.name);
      textField.addToPage(page, {
        x: fieldX,
        y: fieldY,
        width: fieldWidth,
        height: fieldHeight,
      });
      if (field.multiline) textField.enableMultiline();
      if (field.maxLength) textField.setMaxLength(field.maxLength);
      if (field.defaultValue) textField.setText(field.defaultValue as string);
      break;
    }
    
    case 'checkbox': {
      const checkbox = form.createCheckBox(field.name);
      checkbox.addToPage(page, {
        x: fieldX,
        y: fieldY,
        width: fieldWidth,
        height: fieldHeight,
      });
      if (field.defaultValue === true) checkbox.check();
      break;
    }
    
    case 'dropdown': {
      if (!field.options) throw new Error('Dropdown field requires options');
      const dropdown = form.createDropdown(field.name);
      dropdown.addOptions(field.options);
      dropdown.addToPage(page, {
        x: fieldX,
        y: fieldY,
        width: fieldWidth,
        height: fieldHeight,
      });
      if (field.defaultValue) dropdown.select(field.defaultValue as string);
      break;
    }
    
    case 'radio': {
      if (!field.options) throw new Error('Radio field requires options');
      const radioGroup = form.createRadioGroup(field.name);
      field.options.forEach((option, index) => {
        radioGroup.addOptionToPage(option, page, {
          x: fieldX,
          y: fieldY - (index * 20),
          width: 15,
          height: 15,
        });
      });
      if (field.defaultValue) radioGroup.select(field.defaultValue as string);
      break;
    }
    
    case 'signature': {
      // Create a visual placeholder for signature
      page.drawRectangle({
        x: fieldX,
        y: fieldY,
        width: fieldWidth,
        height: fieldHeight,
        borderColor: rgb(0.5, 0.5, 0.5),
        borderWidth: 1,
      });
      const font = await pdf.embedFont(StandardFonts.HelveticaOblique);
      page.drawText(field.placeholder || 'Sign here', {
        x: fieldX + 5,
        y: fieldY + fieldHeight / 2 - 4,
        size: 10,
        font,
        color: rgb(0.7, 0.7, 0.7),
      });
      // Also create a text field for the signature
      const sigField = form.createTextField(field.name);
      sigField.addToPage(page, {
        x: fieldX,
        y: fieldY,
        width: fieldWidth,
        height: fieldHeight,
      });
      break;
    }
  }
  
  // Add label if specified
  if (field.label) {
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    page.drawText(field.label + (field.required ? ' *' : ''), {
      x: fieldX,
      y: fieldY + fieldHeight + 3,
      size: 9,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });
  }
  
  return await pdf.save();
}

export async function createMultipleFormFields(
  source: string | ArrayBuffer | Uint8Array,
  fields: FormFieldDefinition[]
): Promise<Uint8Array> {
  let pdfBytes = typeof source === 'string' 
    ? new Uint8Array(await (await fetch(source)).arrayBuffer())
    : source instanceof ArrayBuffer 
      ? new Uint8Array(source) 
      : source;
  
  for (const field of fields) {
    pdfBytes = await createFormField(pdfBytes, field);
  }
  
  return pdfBytes;
}

export async function detectFormFields(
  pdf: pdfjsLib.PDFDocumentProxy
): Promise<FormFieldDefinition[]> {
  const fields: FormFieldDefinition[] = [];
  
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const annotations = await page.getAnnotations();
    const viewport = page.getViewport({ scale: 1 });
    
    for (const annot of annotations) {
      if (annot.subtype === 'Widget') {
        const rect = annot.rect;
        const [x1, y1, x2, y2] = rect;
        
        fields.push({
          id: annot.id || `field_${fields.length}`,
          type: getFieldTypeFromAnnotation(annot),
          name: annot.fieldName || `field_${fields.length}`,
          pageNumber: pageNum,
          x: x1 / viewport.width,
          y: 1 - (y2 / viewport.height),
          width: (x2 - x1) / viewport.width,
          height: (y2 - y1) / viewport.height,
          label: annot.fieldName,
          required: annot.fieldFlags?.Required || false,
        });
      }
    }
  }
  
  return fields;
}

function getFieldTypeFromAnnotation(annot: any): FormFieldDefinition['type'] {
  const fieldType = annot.fieldType;
  switch (fieldType) {
    case 'Tx': return 'text';
    case 'Btn': 
      return annot.checkBox ? 'checkbox' : 'radio';
    case 'Ch': return 'dropdown';
    case 'Sig': return 'signature';
    default: return 'text';
  }
}

// ============================================
// ENHANCED TEXT SEARCH
// ============================================

export async function searchTextWithHighlight(
  pdf: pdfjsLib.PDFDocumentProxy,
  query: string,
  options: {
    caseSensitive?: boolean;
    wholeWord?: boolean;
    useRegex?: boolean;
  } = {}
): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  const { caseSensitive = false, wholeWord = false, useRegex = false } = options;
  
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1 });
    
    let fullText = '';
    const items: { str: string; transform: number[]; width: number; height: number }[] = [];
    
    for (const item of textContent.items) {
      if ('str' in item) {
        items.push({
          str: item.str,
          transform: item.transform as number[],
          width: item.width || 0,
          height: item.height || 10,
        });
        fullText += item.str + ' ';
      }
    }
    
    // Build search pattern
    let pattern: RegExp;
    if (useRegex) {
      pattern = new RegExp(query, caseSensitive ? 'g' : 'gi');
    } else {
      let escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (wholeWord) {
        escaped = `\\b${escaped}\\b`;
      }
      pattern = new RegExp(escaped, caseSensitive ? 'g' : 'gi');
    }
    
    let match;
    while ((match = pattern.exec(fullText)) !== null) {
      // Find the text item that contains this match
      let charIndex = 0;
      for (const item of items) {
        const itemEnd = charIndex + item.str.length;
        if (match.index >= charIndex && match.index < itemEnd) {
          const x = item.transform[4] / viewport.width;
          const y = 1 - (item.transform[5] / viewport.height);
          
          results.push({
            pageNumber: pageNum,
            text: match[0],
            position: match.index,
            context: fullText.substring(
              Math.max(0, match.index - 30),
              Math.min(fullText.length, match.index + match[0].length + 30)
            ),
            rect: {
              x,
              y,
              width: item.width / viewport.width,
              height: item.height / viewport.height,
            },
          });
          break;
        }
        charIndex = itemEnd + 1; // +1 for the space we added
      }
    }
  }
  
  return results;
}

// ============================================
// BOOKMARKS / OUTLINE
// ============================================

export async function getBookmarks(pdf: pdfjsLib.PDFDocumentProxy): Promise<BookmarkEntry[]> {
  try {
    const outline = await pdf.getOutline();
    if (!outline) return [];
    
    const processOutlineItem = async (item: any): Promise<BookmarkEntry> => {
      let pageNumber = 1;
      
      if (item.dest) {
        try {
          const dest = typeof item.dest === 'string' 
            ? await pdf.getDestination(item.dest)
            : item.dest;
          if (dest && dest[0]) {
            const pageIndex = await pdf.getPageIndex(dest[0]);
            pageNumber = pageIndex + 1;
          }
        } catch {
          // Keep default page number
        }
      }
      
      const entry: BookmarkEntry = {
        title: item.title,
        pageNumber,
        expanded: item.items?.length > 0,
      };
      
      if (item.items && item.items.length > 0) {
        entry.children = await Promise.all(
          item.items.map((child: any) => processOutlineItem(child))
        );
      }
      
      return entry;
    };
    
    return await Promise.all(outline.map(item => processOutlineItem(item)));
  } catch (error) {
    console.error('Error getting bookmarks:', error);
    return [];
  }
}

// ============================================
// VERSION COMPARISON
// ============================================

export async function compareVersions(
  version1Bytes: Uint8Array,
  version2Bytes: Uint8Array
): Promise<{
  addedPages: number[];
  removedPages: number[];
  modifiedPages: number[];
  pageCountDiff: number;
}> {
  const pdf1 = await loadPDFLib(version1Bytes);
  const pdf2 = await loadPDFLib(version2Bytes);
  
  const pageCount1 = pdf1.getPageCount();
  const pageCount2 = pdf2.getPageCount();
  
  const addedPages: number[] = [];
  const removedPages: number[] = [];
  const modifiedPages: number[] = [];
  
  // Compare pages
  const maxPages = Math.max(pageCount1, pageCount2);
  
  for (let i = 0; i < maxPages; i++) {
    if (i >= pageCount1) {
      addedPages.push(i + 1);
    } else if (i >= pageCount2) {
      removedPages.push(i + 1);
    } else {
      // Compare page content (simplified - compare dimensions and text)
      const page1 = pdf1.getPage(i);
      const page2 = pdf2.getPage(i);
      
      const size1 = page1.getSize();
      const size2 = page2.getSize();
      
      if (size1.width !== size2.width || size1.height !== size2.height) {
        modifiedPages.push(i + 1);
      }
    }
  }
  
  return {
    addedPages,
    removedPages,
    modifiedPages,
    pageCountDiff: pageCount2 - pageCount1,
  };
}

// ============================================
// BATCH OPERATIONS
// ============================================

export async function batchRotatePages(
  source: string | ArrayBuffer | Uint8Array,
  pageRotations: { pageNumber: number; rotation: 0 | 90 | 180 | 270 }[]
): Promise<Uint8Array> {
  const pdf = await loadPDFLib(source);
  
  for (const { pageNumber, rotation } of pageRotations) {
    const page = pdf.getPage(pageNumber - 1);
    page.setRotation(degrees(rotation));
  }
  
  return await pdf.save();
}

export async function insertBlankPage(
  source: string | ArrayBuffer | Uint8Array,
  afterPage: number,
  options: {
    width?: number;
    height?: number;
    orientation?: 'portrait' | 'landscape';
  } = {}
): Promise<Uint8Array> {
  const pdf = await loadPDFLib(source);
  
  // Get dimensions from existing page if not specified
  let width = options.width;
  let height = options.height;
  
  if (!width || !height) {
    const refPage = pdf.getPage(Math.min(afterPage - 1, pdf.getPageCount() - 1));
    const size = refPage.getSize();
    width = width || size.width;
    height = height || size.height;
  }
  
  // Swap for landscape
  if (options.orientation === 'landscape' && width < height) {
    [width, height] = [height, width];
  } else if (options.orientation === 'portrait' && width > height) {
    [width, height] = [height, width];
  }
  
  // Insert blank page
  pdf.insertPage(afterPage, [width, height]);
  
  return await pdf.save();
}

export async function duplicatePage(
  source: string | ArrayBuffer | Uint8Array,
  pageNumber: number,
  insertAfter: number = pageNumber
): Promise<Uint8Array> {
  const pdf = await loadPDFLib(source);
  const [copiedPage] = await pdf.copyPages(pdf, [pageNumber - 1]);
  pdf.insertPage(insertAfter, copiedPage);
  return await pdf.save();
}

// ============================================
// PRINT SETTINGS
// ============================================

export interface PrintOptions {
  pageRange?: 'all' | 'current' | 'custom';
  customRange?: string; // e.g., "1-3, 5, 7-10"
  copies?: number;
  orientation?: 'auto' | 'portrait' | 'landscape';
  scale?: 'fit' | 'actual' | number;
  doubleSided?: boolean;
  includeAnnotations?: boolean;
  includeComments?: boolean;
}

export function parsePageRange(range: string, totalPages: number): number[] {
  const pages: Set<number> = new Set();
  
  const parts = range.split(',').map(p => p.trim());
  
  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(n => parseInt(n.trim(), 10));
      for (let i = Math.max(1, start); i <= Math.min(totalPages, end); i++) {
        pages.add(i);
      }
    } else {
      const page = parseInt(part, 10);
      if (page >= 1 && page <= totalPages) {
        pages.add(page);
      }
    }
  }
  
  return Array.from(pages).sort((a, b) => a - b);
}

export async function preparePrintPDF(
  source: string | ArrayBuffer | Uint8Array,
  options: PrintOptions
): Promise<Uint8Array> {
  const pdf = await loadPDFLib(source);
  const totalPages = pdf.getPageCount();
  
  // Determine pages to include
  let pagesToInclude: number[];
  
  switch (options.pageRange) {
    case 'current':
      pagesToInclude = [1]; // Would need current page context
      break;
    case 'custom':
      pagesToInclude = options.customRange 
        ? parsePageRange(options.customRange, totalPages)
        : Array.from({ length: totalPages }, (_, i) => i + 1);
      break;
    case 'all':
    default:
      pagesToInclude = Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  
  // Create new PDF with selected pages
  const printPdf = await PDFDocument.create();
  const pageIndices = pagesToInclude.map(p => p - 1);
  const copiedPages = await printPdf.copyPages(pdf, pageIndices);
  copiedPages.forEach(page => printPdf.addPage(page));
  
  return await printPdf.save();
}

// ============================================
// COLLABORATION UTILITIES
// ============================================

export function generateCollaborationId(): string {
  return 'collab_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
}

export function mergeAnnotationChanges(
  localAnnotations: CollaborationAnnotation[],
  remoteAnnotations: CollaborationAnnotation[]
): CollaborationAnnotation[] {
  const merged = new Map<string, CollaborationAnnotation>();
  
  // Add all local annotations
  localAnnotations.forEach(a => merged.set(a.id, a));
  
  // Merge remote annotations (remote wins for conflicts)
  remoteAnnotations.forEach(a => {
    const existing = merged.get(a.id);
    if (!existing || new Date(a.timestamp) > new Date(existing.timestamp)) {
      merged.set(a.id, a);
    }
  });
  
  return Array.from(merged.values());
}

export function extractMentions(text: string): string[] {
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;
  
  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[1]);
  }
  
  return mentions;
}

export function formatCommentWithMentions(content: string, mentions: string[]): string {
  let formatted = content;
  
  for (const mention of mentions) {
    formatted = formatted.replace(
      new RegExp(`@${mention}\\b`, 'g'),
      `<span class="mention">@${mention}</span>`
    );
  }
  
  return formatted;
}

// ============================================
// FLATTEN ANNOTATIONS
// ============================================

export async function flattenAnnotations(
  source: string | ArrayBuffer | Uint8Array
): Promise<Uint8Array> {
  const pdf = await loadPDFLib(source);
  const form = pdf.getForm();
  
  try {
    form.flatten();
  } catch {
    // Form might not exist or have fields
  }
  
  return await pdf.save();
}

// ============================================
// CHECKSUM / INTEGRITY
// ============================================

export async function generatePDFChecksum(pdfBytes: Uint8Array): Promise<string> {
  // Create a copy of the ArrayBuffer to ensure it's not a SharedArrayBuffer
  const buffer = new ArrayBuffer(pdfBytes.length);
  new Uint8Array(buffer).set(pdfBytes);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPDFIntegrity(
  pdfBytes: Uint8Array,
  expectedChecksum: string
): Promise<boolean> {
  const actualChecksum = await generatePDFChecksum(pdfBytes);
  return actualChecksum === expectedChecksum;
}
