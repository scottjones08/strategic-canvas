// office-utils.ts - Microsoft Office document utilities
// Supports Word (.docx), Excel (.xlsx), and PowerPoint (.pptx) file processing

// ============================================
// TYPES
// ============================================

export type OfficeDocumentType = 'word' | 'excel' | 'powerpoint' | 'unknown';

export interface OfficeDocumentInfo {
  type: OfficeDocumentType;
  name: string;
  size: number;
  mimeType: string;
  extension: string;
  pageCount?: number;
  sheetCount?: number;
  slideCount?: number;
  lastModified?: Date;
  author?: string;
  title?: string;
  subject?: string;
}

export interface WordDocumentContent {
  html: string;
  text: string;
  images: { id: string; data: string; contentType: string }[];
  styles: string;
  messages: string[];
}

export interface ExcelWorkbook {
  sheets: ExcelSheet[];
  activeSheet: number;
  metadata?: {
    title?: string;
    author?: string;
    lastModified?: Date;
  };
}

export interface ExcelSheet {
  name: string;
  data: (string | number | boolean | null)[][];
  merges?: { s: { r: number; c: number }; e: { r: number; c: number } }[];
  colWidths?: number[];
  rowHeights?: number[];
  styles?: ExcelCellStyle[][];
}

export interface ExcelCellStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontSize?: number;
  fontColor?: string;
  backgroundColor?: string;
  alignment?: 'left' | 'center' | 'right';
  verticalAlignment?: 'top' | 'middle' | 'bottom';
  border?: {
    top?: boolean;
    right?: boolean;
    bottom?: boolean;
    left?: boolean;
  };
  numberFormat?: string;
}

export interface PowerPointPresentation {
  slides: PowerPointSlide[];
  metadata?: {
    title?: string;
    author?: string;
    lastModified?: Date;
  };
  slideWidth?: number;
  slideHeight?: number;
  theme?: {
    primaryColor?: string;
    secondaryColor?: string;
    backgroundColor?: string;
  };
}

export interface PowerPointSlide {
  index: number;
  title?: string;
  content: string; // HTML representation
  notes?: string;
  thumbnail?: string; // Base64 image
  shapes?: PowerPointShape[];
  images?: { src: string; x: number; y: number; width: number; height: number }[];
}

export interface PowerPointShape {
  type: 'text' | 'image' | 'shape' | 'chart' | 'table';
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
  style?: Record<string, string>;
}

// ============================================
// MIME TYPE MAPPINGS
// ============================================

export const OFFICE_MIME_TYPES: Record<string, OfficeDocumentType> = {
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'word',
  'application/msword': 'word',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'excel',
  'application/vnd.ms-excel': 'excel',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'powerpoint',
  'application/vnd.ms-powerpoint': 'powerpoint',
};

export const OFFICE_EXTENSIONS: Record<string, OfficeDocumentType> = {
  '.docx': 'word',
  '.doc': 'word',
  '.xlsx': 'excel',
  '.xls': 'excel',
  '.pptx': 'powerpoint',
  '.ppt': 'powerpoint',
};

export const OFFICE_TYPE_LABELS: Record<OfficeDocumentType, string> = {
  word: 'Word Document',
  excel: 'Excel Spreadsheet',
  powerpoint: 'PowerPoint Presentation',
  unknown: 'Unknown Document',
};

export const OFFICE_TYPE_ICONS: Record<OfficeDocumentType, string> = {
  word: 'W',
  excel: 'X',
  powerpoint: 'P',
  unknown: '?',
};

export const OFFICE_TYPE_COLORS: Record<OfficeDocumentType, string> = {
  word: '#2B579A', // Word blue
  excel: '#217346', // Excel green
  powerpoint: '#D24726', // PowerPoint red/orange
  unknown: '#6B7280',
};

// ============================================
// DETECTION FUNCTIONS
// ============================================

/**
 * Detect Office document type from file extension
 */
export function detectOfficeTypeFromExtension(filename: string): OfficeDocumentType {
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return OFFICE_EXTENSIONS[ext] || 'unknown';
}

/**
 * Detect Office document type from MIME type
 */
export function detectOfficeTypeFromMime(mimeType: string): OfficeDocumentType {
  return OFFICE_MIME_TYPES[mimeType] || 'unknown';
}

/**
 * Detect Office document type from either file or MIME type
 */
export function detectOfficeType(filename: string, mimeType?: string): OfficeDocumentType {
  // Try MIME type first (more reliable)
  if (mimeType && OFFICE_MIME_TYPES[mimeType]) {
    return OFFICE_MIME_TYPES[mimeType];
  }
  // Fall back to extension
  return detectOfficeTypeFromExtension(filename);
}

/**
 * Check if a file is an Office document
 */
export function isOfficeDocument(filename: string, mimeType?: string): boolean {
  return detectOfficeType(filename, mimeType) !== 'unknown';
}

/**
 * Check if a file is a Word document
 */
export function isWordDocument(filename: string, mimeType?: string): boolean {
  return detectOfficeType(filename, mimeType) === 'word';
}

/**
 * Check if a file is an Excel spreadsheet
 */
export function isExcelDocument(filename: string, mimeType?: string): boolean {
  return detectOfficeType(filename, mimeType) === 'excel';
}

/**
 * Check if a file is a PowerPoint presentation
 */
export function isPowerPointDocument(filename: string, mimeType?: string): boolean {
  return detectOfficeType(filename, mimeType) === 'powerpoint';
}

/**
 * Get accepted file types for Office documents
 */
export function getOfficeAcceptedTypes(): string {
  return [
    '.docx', '.doc',
    '.xlsx', '.xls',
    '.pptx', '.ppt',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
  ].join(',');
}

// ============================================
// DOCUMENT INFO EXTRACTION
// ============================================

/**
 * Extract basic info from an Office document file
 */
export function getOfficeDocumentInfo(file: File): OfficeDocumentInfo {
  const type = detectOfficeType(file.name, file.type);
  const extension = file.name.substring(file.name.lastIndexOf('.'));
  
  return {
    type,
    name: file.name,
    size: file.size,
    mimeType: file.type || getDefaultMimeType(extension),
    extension,
    lastModified: file.lastModified ? new Date(file.lastModified) : undefined,
  };
}

/**
 * Get default MIME type for extension
 */
function getDefaultMimeType(extension: string): string {
  const mimeMap: Record<string, string> = {
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.doc': 'application/msword',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.xls': 'application/vnd.ms-excel',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.ppt': 'application/vnd.ms-powerpoint',
  };
  return mimeMap[extension.toLowerCase()] || 'application/octet-stream';
}

// ============================================
// ONLYOFFICE INTEGRATION
// ============================================

export interface OnlyOfficeConfig {
  documentServerUrl: string;
  apiKey?: string;
  jwtSecret?: string;
}

export interface OnlyOfficeDocument {
  fileType: string;
  key: string;
  title: string;
  url: string;
  permissions?: {
    comment: boolean;
    download: boolean;
    edit: boolean;
    print: boolean;
    review: boolean;
  };
}

export interface OnlyOfficeEditorConfig {
  document: OnlyOfficeDocument;
  documentType: 'word' | 'cell' | 'slide';
  editorConfig: {
    mode: 'view' | 'edit';
    lang?: string;
    callbackUrl?: string;
    user?: {
      id: string;
      name: string;
    };
    customization?: {
      autosave?: boolean;
      chat?: boolean;
      comments?: boolean;
      compactHeader?: boolean;
      compactToolbar?: boolean;
      feedback?: boolean;
      forcesave?: boolean;
      help?: boolean;
      hideRightMenu?: boolean;
      logo?: {
        image?: string;
        imageEmbedded?: string;
        url?: string;
      };
      toolbarNoTabs?: boolean;
      zoom?: number;
    };
  };
  height?: string;
  width?: string;
  type?: 'desktop' | 'mobile' | 'embedded';
  token?: string;
}

/**
 * Generate OnlyOffice document type from our type
 */
export function getOnlyOfficeDocumentType(type: OfficeDocumentType): 'word' | 'cell' | 'slide' {
  switch (type) {
    case 'word': return 'word';
    case 'excel': return 'cell';
    case 'powerpoint': return 'slide';
    default: return 'word';
  }
}

/**
 * Generate OnlyOffice file type from extension
 */
export function getOnlyOfficeFileType(extension: string): string {
  const ext = extension.toLowerCase().replace('.', '');
  return ext;
}

/**
 * Generate a unique document key for OnlyOffice
 */
export function generateOnlyOfficeKey(documentId: string, version?: number): string {
  const timestamp = Date.now();
  const versionSuffix = version ? `_v${version}` : '';
  return `${documentId}${versionSuffix}_${timestamp}`;
}

/**
 * Create OnlyOffice editor configuration
 */
function base64UrlEncode(data: string | Uint8Array): string {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function createOnlyOfficeJwt(payload: Record<string, any>, secret: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return `${data}.${base64UrlEncode(new Uint8Array(signature))}`;
}

export async function createOnlyOfficeConfig(
  config: OnlyOfficeConfig,
  document: {
    id: string;
    name: string;
    url: string;
    type: OfficeDocumentType;
    version?: number;
  },
  options: {
    mode?: 'view' | 'edit';
    callbackUrl?: string;
    user?: { id: string; name: string };
    customization?: OnlyOfficeEditorConfig['editorConfig']['customization'];
  } = {}
): Promise<OnlyOfficeEditorConfig> {
  const extension = document.name.substring(document.name.lastIndexOf('.'));
  
  const editorConfig: OnlyOfficeEditorConfig = {
    document: {
      fileType: getOnlyOfficeFileType(extension),
      key: generateOnlyOfficeKey(document.id, document.version),
      title: document.name,
      url: document.url,
      permissions: {
        comment: true,
        download: true,
        edit: options.mode === 'edit',
        print: true,
        review: true,
      },
    },
    documentType: getOnlyOfficeDocumentType(document.type),
    editorConfig: {
      mode: options.mode || 'view',
      lang: 'en',
      callbackUrl: options.callbackUrl,
      user: options.user,
      customization: {
        autosave: true,
        chat: false,
        comments: true,
        compactHeader: false,
        compactToolbar: false,
        feedback: false,
        forcesave: true,
        help: true,
        hideRightMenu: false,
        toolbarNoTabs: false,
        zoom: 100,
        ...options.customization,
      },
    },
    height: '100%',
    width: '100%',
    type: 'desktop',
  };

  if (config.jwtSecret) {
    editorConfig.token = await createOnlyOfficeJwt(editorConfig as unknown as Record<string, any>, config.jwtSecret);
  }

  return editorConfig;
}

// ============================================
// MICROSOFT GRAPH / OFFICE ONLINE INTEGRATION
// ============================================

export interface MicrosoftGraphConfig {
  clientId: string;
  tenantId: string;
  redirectUri: string;
  scopes?: string[];
}

/**
 * Generate Microsoft Office Online embed URL
 */
export function getMicrosoftOfficeEmbedUrl(
  type: OfficeDocumentType,
  fileUrl: string,
  options: { edit?: boolean; embed?: boolean } = {}
): string {
  const encodedUrl = encodeURIComponent(fileUrl);
  const baseUrls: Record<OfficeDocumentType, { view: string; edit: string }> = {
    word: {
      view: `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`,
      edit: `https://view.officeapps.live.com/op/edit.aspx?src=${encodedUrl}`,
    },
    excel: {
      view: `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`,
      edit: `https://view.officeapps.live.com/op/edit.aspx?src=${encodedUrl}`,
    },
    powerpoint: {
      view: `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`,
      edit: `https://view.officeapps.live.com/op/edit.aspx?src=${encodedUrl}`,
    },
    unknown: {
      view: `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`,
      edit: `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`,
    },
  };

  return options.edit ? baseUrls[type].edit : baseUrls[type].view;
}

// ============================================
// GOOGLE DOCS INTEGRATION
// ============================================

/**
 * Generate Google Docs viewer URL for Office documents
 */
export function getGoogleDocsViewerUrl(fileUrl: string): string {
  const encodedUrl = encodeURIComponent(fileUrl);
  return `https://docs.google.com/viewer?url=${encodedUrl}&embedded=true`;
}

// ============================================
// FILE SIZE FORMATTING
// ============================================

/**
 * Format file size to human readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ============================================
// EXPORT DEFAULT
// ============================================

export default {
  detectOfficeType,
  detectOfficeTypeFromExtension,
  detectOfficeTypeFromMime,
  isOfficeDocument,
  isWordDocument,
  isExcelDocument,
  isPowerPointDocument,
  getOfficeDocumentInfo,
  getOfficeAcceptedTypes,
  createOnlyOfficeConfig,
  getMicrosoftOfficeEmbedUrl,
  getGoogleDocsViewerUrl,
  formatFileSize,
  OFFICE_MIME_TYPES,
  OFFICE_EXTENSIONS,
  OFFICE_TYPE_LABELS,
  OFFICE_TYPE_ICONS,
  OFFICE_TYPE_COLORS,
};
