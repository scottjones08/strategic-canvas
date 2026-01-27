// DocumentsView.tsx - Client Documents List and Management
// Displays documents grouped by client with upload, sharing, and editing capabilities
// Now supports PDF and Microsoft Office documents (Word, Excel, PowerPoint)
// Features: Folder support, document preview, admin/client-based visibility

import React, { useState, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Search,
  Upload,
  Trash2,
  Share2,
  Edit3,
  Eye,
  Download,
  FolderOpen,
  MoreVertical,
  Grid3X3,
  List,
  ChevronRight,
  ChevronDown,
  Loader2,
  FileUp,
  Table,
  Presentation,
  FolderPlus,
  // Folder,  // Reserved for folder view
  // X,       // Reserved for folder delete
  // Check,   // Reserved for folder rename
} from 'lucide-react';
import type { PDFAnnotation, PDFComment } from '../lib/pdf-utils';
import {
  isOfficeDocument,
  detectOfficeType,
  OfficeDocumentType,
  OFFICE_TYPE_COLORS,
  // OFFICE_TYPE_LABELS,
} from '../lib/office-utils';
import UploadProgressModal, { UploadResult } from './UploadProgressModal';
import DocumentPreviewModal from './DocumentPreviewModal';

// Document interface
// Folder interface for document organization
export interface DocumentFolder {
  id: string;
  name: string;
  clientId?: string;
  parentId?: string; // For nested folders
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientDocument {
  id: string;
  name: string;
  description?: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  pageCount: number;
  sheetCount?: number; // For Excel documents
  slideCount?: number; // For PowerPoint documents
  officeType?: OfficeDocumentType; // Office document type if applicable
  clientId?: string;
  organizationId?: string;
  folderId?: string; // Folder this document belongs to
  thumbnailUrl?: string;
  annotations: PDFAnnotation[];
  comments: PDFComment[];
  shareToken?: string;
  sharePermissions?: 'view' | 'comment' | 'edit';
  shareExpiresAt?: Date;
  isPublic: boolean;
  status: 'active' | 'archived' | 'deleted';
  version: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  lastViewedAt?: Date;
}

// Client interface
interface Client {
  id: string;
  name: string;
  color: string;
  logo_url?: string | null;
}

interface DocumentsViewProps {
  documents: ClientDocument[];
  clients: Client[];
  folders?: DocumentFolder[];
  onUpload: (files: FileList, clientId?: string, folderId?: string) => Promise<void>;
  onUploadWithProgress?: (results: UploadResult[], clientId?: string, folderId?: string) => Promise<void>;
  onDelete: (documentId: string) => void;
  onRename: (documentId: string, newName: string) => void;
  onOpen: (document: ClientDocument) => void;
  onShare: (document: ClientDocument) => void;
  onDownload: (document: ClientDocument) => void;
  onCreateFolder?: (name: string, clientId?: string, parentId?: string) => void;
  onDeleteFolder?: (folderId: string) => void;
  onRenameFolder?: (folderId: string, newName: string) => void;
  onMoveDocument?: (documentId: string, folderId: string | null) => void;
  selectedClientId?: string;
  organizationId?: string;
  isLoading?: boolean;
  // User context for permissions
  currentUserClientId?: string; // The client this user belongs to
  isAdmin?: boolean; // Whether user is admin (can see all clients)
}

// Helper functions
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDate = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString();
};

// Get document icon based on file type
const getDocumentIcon = (document: ClientDocument) => {
  const officeType = document.officeType || detectOfficeType(document.name, document.fileType);
  
  switch (officeType) {
    case 'word':
      return { Icon: FileText, color: OFFICE_TYPE_COLORS.word };
    case 'excel':
      return { Icon: Table, color: OFFICE_TYPE_COLORS.excel };
    case 'powerpoint':
      return { Icon: Presentation, color: OFFICE_TYPE_COLORS.powerpoint };
    default:
      // Check if it's a PDF
      if (document.fileType === 'application/pdf' || document.name.endsWith('.pdf')) {
        return { Icon: FileText, color: '#DC2626' }; // Red for PDF
      }
      return { Icon: FileText, color: '#6B7280' }; // Gray for unknown
  }
};

// Get document info text
const getDocumentInfo = (document: ClientDocument): string => {
  const officeType = document.officeType || detectOfficeType(document.name, document.fileType);
  
  switch (officeType) {
    case 'excel':
      return document.sheetCount 
        ? `${document.sheetCount} sheet${document.sheetCount !== 1 ? 's' : ''}`
        : '1 sheet';
    case 'powerpoint':
      return document.slideCount
        ? `${document.slideCount} slide${document.slideCount !== 1 ? 's' : ''}`
        : '1 slide';
    default:
      return `${document.pageCount} page${document.pageCount !== 1 ? 's' : ''}`;
  }
};

// Accepted file types for upload
const ACCEPTED_FILE_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
];

const ACCEPTED_FILE_EXTENSIONS = '.pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt';

// Document Card Component
interface DocumentCardProps {
  document: ClientDocument;
  client?: Client;
  onOpen: () => void;
  onEdit: () => void;
  onShare: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onRename: (newName: string) => void;
  viewMode: 'grid' | 'list';
}

const DocumentCard: React.FC<DocumentCardProps> = ({
  document,
  client,
  onOpen,
  onEdit,
  onShare,
  onDownload,
  onDelete,
  onRename,
  viewMode,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(document.name);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleRename = () => {
    if (newName.trim() && newName !== document.name) {
      onRename(newName.trim());
    }
    setIsRenaming(false);
  };

  const annotationCount = document.annotations?.length || 0;
  const commentCount = document.comments?.length || 0;

  if (viewMode === 'list') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="group flex items-center gap-4 p-3 bg-white rounded-lg border border-gray-200 
          hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
        onClick={onOpen}
      >
        {/* Thumbnail */}
        <div className="w-12 h-16 bg-gray-100 rounded flex-shrink-0 overflow-hidden">
          {document.thumbnailUrl ? (
            <img 
              src={document.thumbnailUrl} 
              alt={document.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              {(() => {
                const { Icon, color } = getDocumentIcon(document);
                return <Icon size={24} style={{ color }} />;
              })()}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          {isRenaming ? (
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={e => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') {
                  setNewName(document.name);
                  setIsRenaming(false);
                }
              }}
              onClick={e => e.stopPropagation()}
              className="w-full px-2 py-1 border border-blue-500 rounded text-sm focus:outline-none"
              autoFocus
            />
          ) : (
            <h4 className="font-medium text-gray-800 truncate">{document.name}</h4>
          )}
          <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
            <span>{getDocumentInfo(document)}</span>
            <span>{formatFileSize(document.fileSize)}</span>
            {client && (
              <span className="flex items-center gap-1">
                <span 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: client.color }}
                />
                {client.name}
              </span>
            )}
          </div>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2">
          {annotationCount > 0 && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
              {annotationCount} annotations
            </span>
          )}
          {commentCount > 0 && (
            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full">
              {commentCount} comments
            </span>
          )}
          {document.shareToken && (
            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1">
              <Share2 size={10} />
              Shared
            </span>
          )}
        </div>

        {/* Date */}
        <div className="text-xs text-gray-500 whitespace-nowrap">
          {formatDate(new Date(document.updatedAt))}
        </div>

        {/* Actions */}
        <div className="relative">
          <button
            onClick={e => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-2 hover:bg-gray-100 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreVertical size={16} />
          </button>

          <AnimatePresence>
            {showMenu && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-40"
                  onClick={e => {
                    e.stopPropagation();
                    setShowMenu(false);
                  }}
                />
                <motion.div
                  ref={menuRef}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute right-0 top-full mt-1 py-1 bg-white rounded-lg shadow-xl 
                    border border-gray-200 z-50 min-w-[160px]"
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    onClick={() => {
                      onOpen();
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-sm text-left"
                  >
                    <Eye size={14} />
                    View
                  </button>
                  <button
                    onClick={() => {
                      onEdit();
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-sm text-left"
                  >
                    <Edit3 size={14} />
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      setIsRenaming(true);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-sm text-left"
                  >
                    <Edit3 size={14} />
                    Rename
                  </button>
                  <hr className="my-1" />
                  <button
                    onClick={() => {
                      onShare();
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-sm text-left"
                  >
                    <Share2 size={14} />
                    Share
                  </button>
                  <button
                    onClick={() => {
                      onDownload();
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-sm text-left"
                  >
                    <Download size={14} />
                    Download
                  </button>
                  <hr className="my-1" />
                  <button
                    onClick={() => {
                      onDelete();
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-sm text-left text-red-600"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    );
  }

  // Grid view
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="group relative bg-white rounded-xl border border-gray-200 overflow-hidden
        hover:border-blue-300 hover:shadow-lg transition-all cursor-pointer"
      onClick={onOpen}
    >
      {/* Thumbnail */}
      <div className="aspect-[8.5/11] bg-gray-100 relative">
        {document.thumbnailUrl ? (
          <img 
            src={document.thumbnailUrl} 
            alt={document.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {(() => {
              const { Icon, color } = getDocumentIcon(document);
              return <Icon size={48} style={{ color, opacity: 0.6 }} />;
            })()}
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors">
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex gap-2">
              <button
                onClick={e => {
                  e.stopPropagation();
                  onOpen();
                }}
                className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-100"
                title="View"
              >
                <Eye size={16} />
              </button>
              <button
                onClick={e => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-100"
                title="Edit"
              >
                <Edit3 size={16} />
              </button>
              <button
                onClick={e => {
                  e.stopPropagation();
                  onShare();
                }}
                className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-100"
                title="Share"
              >
                <Share2 size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Badges */}
        <div className="absolute top-2 right-2 flex flex-col gap-1">
          {document.shareToken && (
            <span className="px-1.5 py-0.5 bg-green-500 text-white text-[10px] rounded">
              Shared
            </span>
          )}
          {(annotationCount > 0 || commentCount > 0) && (
            <span className="px-1.5 py-0.5 bg-blue-500 text-white text-[10px] rounded">
              {annotationCount + commentCount} notes
            </span>
          )}
        </div>

        {/* Client badge */}
        {client && (
          <div 
            className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-medium text-white"
            style={{ backgroundColor: client.color }}
          >
            {client.name}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        {isRenaming ? (
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={e => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') {
                setNewName(document.name);
                setIsRenaming(false);
              }
            }}
            onClick={e => e.stopPropagation()}
            className="w-full px-2 py-1 border border-blue-500 rounded text-sm focus:outline-none"
            autoFocus
          />
        ) : (
          <h4 className="font-medium text-gray-800 truncate text-sm">{document.name}</h4>
        )}
        <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
          <span>{getDocumentInfo(document)} • {formatFileSize(document.fileSize)}</span>
          <span>{formatDate(new Date(document.updatedAt))}</span>
        </div>
      </div>

      {/* Actions menu */}
      <button
        onClick={e => {
          e.stopPropagation();
          setShowMenu(!showMenu);
        }}
        className="absolute top-2 left-2 p-1.5 bg-white/80 rounded-lg opacity-0 group-hover:opacity-100 
          hover:bg-white transition-all shadow-sm"
      >
        <MoreVertical size={14} />
      </button>

      <AnimatePresence>
        {showMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={e => {
                e.stopPropagation();
                setShowMenu(false);
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute left-2 top-10 py-1 bg-white rounded-lg shadow-xl 
                border border-gray-200 z-50 min-w-[140px]"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  setIsRenaming(true);
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 text-sm text-left"
              >
                <Edit3 size={12} />
                Rename
              </button>
              <button
                onClick={() => {
                  onDownload();
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 text-sm text-left"
              >
                <Download size={12} />
                Download
              </button>
              <hr className="my-1" />
              <button
                onClick={() => {
                  onDelete();
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-red-50 text-sm text-left text-red-600"
              >
                <Trash2 size={12} />
                Delete
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Main DocumentsView Component
export const DocumentsView: React.FC<DocumentsViewProps> = ({
  documents,
  clients,
  folders: _folders = [],
  onUpload,
  onUploadWithProgress,
  onDelete,
  onRename,
  onOpen,
  onShare,
  onDownload,
  onCreateFolder,
  onDeleteFolder: _onDeleteFolder,
  onRenameFolder: _onRenameFolder,
  onMoveDocument: _onMoveDocument,
  selectedClientId,
  organizationId,
  isLoading = false,
  currentUserClientId,
  isAdmin = false,
}) => {
  // Reserved for future folder functionality
  void _folders;
  void _onDeleteFolder;
  void _onRenameFolder;
  void _onMoveDocument;

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set(['ungrouped', ...clients.map(c => c.id)]));
  const [_expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  void _expandedFolders; // Reserved for folder expansion
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Preview modal state
  const [previewDocument, setPreviewDocument] = useState<ClientDocument | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  
  // Folder creation state
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Determine which client to use for document assignment
  const effectiveClientId = selectedClientId || currentUserClientId;

  // Filter and sort documents based on user permissions
  const filteredDocuments = useMemo(() => {
    let filtered = documents.filter(doc => doc.status === 'active');

    // Apply client-based visibility
    if (!isAdmin && currentUserClientId) {
      // Non-admin users only see their client's documents
      filtered = filtered.filter(doc => doc.clientId === currentUserClientId);
    } else if (selectedClientId) {
      // Admin with a selected client filter
      filtered = filtered.filter(doc => doc.clientId === selectedClientId);
    }
    // If isAdmin and no selectedClientId, show all documents

    // Filter by current folder
    if (currentFolderId) {
      filtered = filtered.filter(doc => doc.folderId === currentFolderId);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(doc =>
        doc.name.toLowerCase().includes(query) ||
        doc.description?.toLowerCase().includes(query)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'date':
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
        case 'size':
          comparison = a.fileSize - b.fileSize;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [documents, selectedClientId, searchQuery, sortBy, sortOrder]);

  // Group documents by client
  const groupedDocuments = useMemo(() => {
    if (selectedClientId) {
      return { [selectedClientId]: filteredDocuments };
    }

    const groups: Record<string, ClientDocument[]> = { ungrouped: [] };
    
    clients.forEach(client => {
      groups[client.id] = [];
    });

    filteredDocuments.forEach(doc => {
      if (doc.clientId && groups[doc.clientId]) {
        groups[doc.clientId].push(doc);
      } else {
        groups.ungrouped.push(doc);
      }
    });

    return groups;
  }, [filteredDocuments, clients, selectedClientId]);

  // Handle file drop - show upload modal with files
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);

    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    // Filter for supported file types (PDF and Office documents)
    const supportedFiles = Array.from(files).filter(f => 
      ACCEPTED_FILE_TYPES.includes(f.type) ||
      isOfficeDocument(f.name, f.type)
    );
    
    if (supportedFiles.length === 0) {
      alert('Please upload PDF or Office documents (.docx, .xlsx, .pptx)');
      return;
    }

    // If we have the progress-enabled upload, show modal with files
    if (onUploadWithProgress) {
      setPendingFiles(supportedFiles);
      setShowUploadModal(true);
      return;
    }

    // Fallback to old behavior
    setIsUploading(true);
    try {
      const fileList = new DataTransfer();
      supportedFiles.forEach(f => fileList.items.add(f));
      await onUpload(fileList.files, selectedClientId);
    } finally {
      setIsUploading(false);
    }
  }, [onUpload, onUploadWithProgress, selectedClientId]);

  // Handle upload complete from modal - assign to effective client and current folder
  const handleUploadComplete = useCallback(async (results: UploadResult[]) => {
    if (onUploadWithProgress) {
      await onUploadWithProgress(results, effectiveClientId, currentFolderId || undefined);
    }
  }, [onUploadWithProgress, effectiveClientId, currentFolderId]);

  // Handle document preview
  const handlePreviewDocument = useCallback((doc: ClientDocument) => {
    setPreviewDocument(doc);
    setShowPreview(true);
  }, []);

  // Handle folder creation
  const handleCreateFolder = useCallback(() => {
    if (!newFolderName.trim() || !onCreateFolder) return;
    onCreateFolder(newFolderName.trim(), effectiveClientId, currentFolderId || undefined);
    setNewFolderName('');
    setShowNewFolderInput(false);
  }, [newFolderName, onCreateFolder, effectiveClientId, currentFolderId]);

  // Toggle folder expansion (reserved for folder tree view)
  const _toggleFolder = useCallback((folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  }, []);
  void _toggleFolder;

  // Navigate into a folder (reserved for folder navigation)
  const _navigateToFolder = useCallback((folderId: string | null) => {
    setCurrentFolderId(folderId);
  }, []);
  void _navigateToFolder;

  // Handle file input change - routes through modal for consistent UX
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Reset input immediately so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Filter for supported file types
    const supportedFiles = Array.from(files).filter(f => 
      ACCEPTED_FILE_TYPES.includes(f.type) ||
      isOfficeDocument(f.name, f.type)
    );

    if (supportedFiles.length === 0) {
      alert('Please upload PDF or Office documents (.docx, .xlsx, .pptx)');
      return;
    }

    // If we have progress-enabled upload, show modal with files
    if (onUploadWithProgress) {
      setPendingFiles(supportedFiles);
      setShowUploadModal(true);
      return;
    }

    // Fallback to old behavior
    setIsUploading(true);
    try {
      await onUpload(files, selectedClientId);
    } finally {
      setIsUploading(false);
    }
  }, [onUpload, onUploadWithProgress, selectedClientId]);

  const toggleClient = (clientId: string) => {
    const newExpanded = new Set(expandedClients);
    if (newExpanded.has(clientId)) {
      newExpanded.delete(clientId);
    } else {
      newExpanded.add(clientId);
    }
    setExpandedClients(newExpanded);
  };

  return (
    <div 
      className="h-full flex flex-col bg-gray-50"
      onDragOver={e => {
        e.preventDefault();
        setIsDraggingOver(true);
      }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
        <div className="flex items-center gap-3">
          <FileText size={24} className="text-red-500" />
          <h2 className="text-xl font-semibold text-gray-800">Documents</h2>
          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-sm rounded-full">
            {filteredDocuments.length}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search documents..."
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none 
                focus:ring-2 focus:ring-blue-500 w-64"
            />
          </div>

          {/* Sort */}
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={e => {
              const [by, order] = e.target.value.split('-');
              setSortBy(by as any);
              setSortOrder(order as any);
            }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none 
              focus:ring-2 focus:ring-blue-500"
          >
            <option value="date-desc">Newest first</option>
            <option value="date-asc">Oldest first</option>
            <option value="name-asc">Name A-Z</option>
            <option value="name-desc">Name Z-A</option>
            <option value="size-desc">Largest first</option>
            <option value="size-asc">Smallest first</option>
          </select>

          {/* View mode toggle */}
          <div className="flex border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}
            >
              <Grid3X3 size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}
            >
              <List size={18} />
            </button>
          </div>

          {/* Create Folder button */}
          {onCreateFolder && (
            <button
              onClick={() => setShowNewFolderInput(true)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg 
                hover:bg-gray-50 transition-colors"
            >
              <FolderPlus size={18} />
              New Folder
            </button>
          )}

          {/* Upload button */}
          <button
            onClick={() => {
              if (onUploadWithProgress) {
                setPendingFiles([]);
                setShowUploadModal(true);
              } else {
                fileInputRef.current?.click();
              }
            }}
            disabled={isUploading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg 
              hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {isUploading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Upload size={18} />
            )}
            Upload Document
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <Loader2 size={48} className="animate-spin text-blue-500" />
            <p className="text-gray-600">Loading documents...</p>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <FolderOpen size={64} className="text-gray-300" />
            <h3 className="text-xl font-medium text-gray-600">No documents yet</h3>
            <p className="text-gray-500 text-center max-w-md">
              Upload PDF and Office documents (Word, Excel, PowerPoint) to view, annotate, and share with your clients.
            </p>
            <button
              onClick={() => {
                if (onUploadWithProgress) {
                  setPendingFiles([]);
                  setShowUploadModal(true);
                } else {
                  fileInputRef.current?.click();
                }
              }}
              className="mt-4 flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg 
                hover:bg-blue-600 transition-colors"
            >
              <Upload size={20} />
              Upload your first document
            </button>
          </div>
        ) : selectedClientId ? (
          // Single client view
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
            : 'flex flex-col gap-2'
          }>
            {filteredDocuments.map(doc => (
              <DocumentCard
                key={doc.id}
                document={doc}
                client={clients.find(c => c.id === doc.clientId)}
                onOpen={() => handlePreviewDocument(doc)}
                onEdit={() => onOpen(doc)}
                onShare={() => onShare(doc)}
                onDownload={() => onDownload(doc)}
                onDelete={() => onDelete(doc.id)}
                onRename={(newName) => onRename(doc.id, newName)}
                viewMode={viewMode}
              />
            ))}
          </div>
        ) : (
          // Grouped by client view
          <div className="space-y-6">
            {Object.entries(groupedDocuments).map(([clientId, docs]) => {
              if (docs.length === 0) return null;
              
              const client = clients.find(c => c.id === clientId);
              const isExpanded = expandedClients.has(clientId);

              return (
                <div key={clientId} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  {/* Client Header */}
                  <button
                    onClick={() => toggleClient(clientId)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {clientId === 'ungrouped' ? (
                        <FolderOpen size={20} className="text-gray-400" />
                      ) : (
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                          style={{ backgroundColor: client?.color || '#6b7280' }}
                        >
                          {client?.name?.charAt(0) || '?'}
                        </div>
                      )}
                      <span className="font-medium text-gray-800">
                        {clientId === 'ungrouped' ? 'Unassigned Documents' : client?.name}
                      </span>
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                        {docs.length}
                      </span>
                    </div>
                    {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  </button>

                  {/* Documents */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className={`p-4 pt-0 ${
                          viewMode === 'grid'
                            ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
                            : 'flex flex-col gap-2'
                        }`}>
                          {docs.map(doc => (
                            <DocumentCard
                              key={doc.id}
                              document={doc}
                              client={client}
                              onOpen={() => handlePreviewDocument(doc)}
                              onEdit={() => onOpen(doc)}
                              onShare={() => onShare(doc)}
                              onDownload={() => onDownload(doc)}
                              onDelete={() => onDelete(doc.id)}
                              onRename={(newName) => onRename(doc.id, newName)}
                              viewMode={viewMode}
                            />
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Drag overlay */}
      <AnimatePresence>
        {isDraggingOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-blue-500/20 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
              <FileUp size={64} className="mx-auto text-blue-500 mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Drop files here</h3>
              <p className="text-gray-600">PDF, Word, Excel, or PowerPoint</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden file input - now accepts Office documents too */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_FILE_EXTENSIONS}
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Upload Progress Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <UploadProgressModal
            isOpen={showUploadModal}
            onClose={() => {
              setShowUploadModal(false);
              setPendingFiles([]);
            }}
            onUploadComplete={handleUploadComplete}
            clientId={effectiveClientId}
            organizationId={organizationId}
            initialFiles={pendingFiles}
          />
        )}
      </AnimatePresence>

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        isOpen={showPreview}
        onClose={() => {
          setShowPreview(false);
          setPreviewDocument(null);
        }}
        document={previewDocument}
        onDownload={previewDocument ? () => onDownload(previewDocument) : undefined}
        onShare={previewDocument ? () => onShare(previewDocument) : undefined}
      />

      {/* New Folder Modal */}
      <AnimatePresence>
        {showNewFolderInput && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
            onClick={() => setShowNewFolderInput(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <FolderPlus className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Create New Folder</h3>
              </div>
              
              <input
                type="text"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                placeholder="Folder name..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCreateFolder();
                  if (e.key === 'Escape') setShowNewFolderInput(false);
                }}
              />
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowNewFolderInput(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateFolder}
                  disabled={!newFolderName.trim()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  Create Folder
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DocumentsView;
