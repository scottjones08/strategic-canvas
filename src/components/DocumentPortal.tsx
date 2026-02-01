// DocumentPortal.tsx - SharePoint-like Document Portal
// Full-featured document management with folder navigation, grid/list views, preview panel,
// upload zones, sharing capabilities, and real-time Supabase integration

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
  FolderPlus,
  MoreVertical,
  Grid3X3,
  List,
  ChevronRight,
  ChevronDown,
  Loader2,
  FileUp,
  X,
  Check,
  Copy,
  Clock,
  Users,
  Star,
  StarOff,
  Home,
  FolderClosed,
  RotateCcw,
  History,
  Lock,
  Link,
  Calendar,
  CheckCircle,
  Info,
  ExternalLink,
} from 'lucide-react';
import {
  ClientDocument,
  documentShareLinksApi,
  getDocumentShareUrl,
} from '../lib/documents-api';
import UploadProgressModal, { UploadResult } from './UploadProgressModal';

// ============================================
// TYPES
// ============================================

interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  color: string;
  icon?: string;
  createdAt: Date;
  updatedAt: Date;
  documentCount: number;
  children: Folder[];
}

interface ActivityItem {
  id: string;
  type: 'view' | 'edit' | 'share' | 'comment' | 'upload';
  userId: string;
  userName: string;
  userAvatar?: string;
  timestamp: Date;
  details?: string;
}

interface DocumentVersion {
  id: string;
  version: number;
  fileUrl: string;
  fileSize: number;
  createdAt: Date;
  createdBy: string;
  changes?: string;
}

interface Client {
  id: string;
  name: string;
  color: string;
  logo_url?: string | null;
}

interface DocumentPortalProps {
  documents: ClientDocument[];
  clients: Client[];
  onUpload: (files: FileList, folderId?: string, clientId?: string) => Promise<void>;
  onUploadWithProgress?: (results: UploadResult[], folderId?: string, clientId?: string) => Promise<void>;
  onDelete: (documentId: string) => void;
  onRename: (documentId: string, newName: string) => void;
  onOpen: (document: ClientDocument) => void;
  onShare: (document: ClientDocument) => void;
  onDownload: (document: ClientDocument) => void;
  onMove?: (documentId: string, folderId: string | null) => void;
  selectedClientId?: string;
  organizationId?: string;
  isLoading?: boolean;
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

const formatDate = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatDateTime = (date: Date): string => {
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const FOLDER_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#6366F1', // Indigo
  '#84CC16', // Lime
];

// ============================================
// FOLDER TREE COMPONENT
// ============================================

interface FolderTreeProps {
  folders: Folder[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolder: (parentId: string | null) => void;
  onRenameFolder: (folderId: string, newName: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onDrop: (documentId: string, folderId: string | null) => void;
  expandedFolders: Set<string>;
  onToggleExpand: (folderId: string) => void;
}

const FolderTree: React.FC<FolderTreeProps> = ({
  folders,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onDrop,
  expandedFolders,
  onToggleExpand,
}) => {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; folderId: string } | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  const handleContextMenu = (e: React.MouseEvent, folderId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, folderId });
  };

  const handleDragOver = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    setDragOverFolderId(folderId);
  };

  const handleDrop = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    const documentId = e.dataTransfer.getData('documentId');
    if (documentId) {
      onDrop(documentId, folderId);
    }
    setDragOverFolderId(null);
  };

  const renderFolder = (folder: Folder, depth: number = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedFolderId === folder.id;
    const isDragOver = dragOverFolderId === folder.id;
    const hasChildren = folder.children && folder.children.length > 0;

    return (
      <div key={folder.id}>
        <div
          className={`
            flex items-center gap-2 px-3 py-2 cursor-pointer rounded-lg transition-all
            ${isSelected ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}
            ${isDragOver ? 'bg-blue-50 ring-2 ring-blue-400' : ''}
          `}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
          onClick={() => onSelectFolder(folder.id)}
          onContextMenu={(e) => handleContextMenu(e, folder.id)}
          onDragOver={(e) => handleDragOver(e, folder.id)}
          onDragLeave={() => setDragOverFolderId(null)}
          onDrop={(e) => handleDrop(e, folder.id)}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(folder.id);
              }}
              className="p-0.5 hover:bg-gray-200 rounded"
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          )}
          {!hasChildren && <div className="w-5" />}
          
          {isExpanded ? (
            <FolderOpen size={18} style={{ color: folder.color }} />
          ) : (
            <FolderClosed size={18} style={{ color: folder.color }} />
          )}
          
          {renamingId === folder.id ? (
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={() => {
                if (newName.trim()) onRenameFolder(folder.id, newName);
                setRenamingId(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (newName.trim()) onRenameFolder(folder.id, newName);
                  setRenamingId(null);
                }
                if (e.key === 'Escape') setRenamingId(null);
              }}
              className="flex-1 px-1 py-0.5 text-sm border border-blue-500 rounded focus:outline-none"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="flex-1 text-sm font-medium truncate">{folder.name}</span>
          )}
          
          {folder.documentCount > 0 && (
            <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
              {folder.documentCount}
            </span>
          )}
        </div>

        {isExpanded && hasChildren && (
          <div>
            {folder.children.map((child) => renderFolder(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="py-2">
      {/* Root / All Documents */}
      <div
        className={`
          flex items-center gap-2 px-3 py-2 cursor-pointer rounded-lg transition-all mx-2
          ${selectedFolderId === null ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}
          ${dragOverFolderId === 'root' ? 'bg-blue-50 ring-2 ring-blue-400' : ''}
        `}
        onClick={() => onSelectFolder(null)}
        onDragOver={(e) => handleDragOver(e, 'root')}
        onDragLeave={() => setDragOverFolderId(null)}
        onDrop={(e) => handleDrop(e, null)}
      >
        <Home size={18} className="text-gray-500" />
        <span className="flex-1 text-sm font-medium">All Documents</span>
      </div>

      <div className="mx-2 my-2">
        {folders.filter(f => !f.parentId).map((folder) => renderFolder(folder))}
      </div>

      {/* Add Folder Button */}
      <button
        onClick={() => onCreateFolder(selectedFolderId)}
        className="flex items-center gap-2 px-3 py-2 mx-2 mt-2 text-sm text-gray-600 
          hover:bg-gray-100 rounded-lg transition-colors w-[calc(100%-16px)]"
      >
        <FolderPlus size={16} />
        New Folder
      </button>

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50"
              onClick={() => setContextMenu(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50 min-w-[160px]"
              style={{ left: contextMenu.x, top: contextMenu.y }}
            >
              <button
                onClick={() => {
                  onCreateFolder(contextMenu.folderId);
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100"
              >
                <FolderPlus size={14} />
                New Subfolder
              </button>
              <button
                onClick={() => {
                  const folder = folders.find(f => f.id === contextMenu.folderId);
                  if (folder) {
                    setNewName(folder.name);
                    setRenamingId(contextMenu.folderId);
                  }
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100"
              >
                <Edit3 size={14} />
                Rename
              </button>
              <hr className="my-1" />
              <button
                onClick={() => {
                  onDeleteFolder(contextMenu.folderId);
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-red-50 text-red-600"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================
// BREADCRUMB NAVIGATION
// ============================================

interface BreadcrumbProps {
  folders: Folder[];
  currentFolderId: string | null;
  onNavigate: (folderId: string | null) => void;
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ folders, currentFolderId, onNavigate }) => {
  const getPath = useCallback((): Array<{ id: string | null; name: string }> => {
    const path: Array<{ id: string | null; name: string }> = [{ id: null, name: 'All Documents' }];
    
    if (!currentFolderId) return path;
    
    const findFolder = (id: string): Folder | undefined => {
      for (const f of folders) {
        if (f.id === id) return f;
        const child = f.children?.find(c => c.id === id);
        if (child) return child;
      }
      return undefined;
    };
    
    const buildPath = (folderId: string) => {
      const folder = findFolder(folderId);
      if (folder) {
        if (folder.parentId) {
          buildPath(folder.parentId);
        }
        path.push({ id: folder.id, name: folder.name });
      }
    };
    
    buildPath(currentFolderId);
    return path;
  }, [folders, currentFolderId]);

  const pathItems = getPath();

  return (
    <nav className="flex items-center gap-1 text-sm">
      {pathItems.map((item, index) => (
        <React.Fragment key={item.id ?? 'root'}>
          {index > 0 && <ChevronRight size={14} className="text-gray-400" />}
          <button
            onClick={() => onNavigate(item.id)}
            className={`px-2 py-1 rounded hover:bg-gray-100 transition-colors ${
              index === pathItems.length - 1 ? 'font-medium text-gray-900' : 'text-gray-500'
            }`}
          >
            {index === 0 ? <Home size={14} className="inline mr-1" /> : null}
            {item.name}
          </button>
        </React.Fragment>
      ))}
    </nav>
  );
};

// ============================================
// DOCUMENT CARD COMPONENT
// ============================================

interface DocumentCardProps {
  document: ClientDocument;
  client?: Client;
  isSelected: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onOpen: () => void;
  onShare: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onRename: (newName: string) => void;
  onPreview: () => void;
  onDragStart: (e: React.DragEvent) => void;
  viewMode: 'grid' | 'list';
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

const DocumentCard: React.FC<DocumentCardProps> = ({
  document,
  client,
  isSelected,
  onSelect,
  onOpen,
  onShare,
  onDownload,
  onDelete,
  onRename,
  onPreview,
  onDragStart,
  viewMode,
  isFavorite = false,
  onToggleFavorite,
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
      <div
        draggable
        onDragStart={onDragStart}
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`
            group flex items-center gap-4 p-3 bg-white rounded-lg border transition-all cursor-pointer
            ${isSelected ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-gray-200 hover:border-blue-300 hover:shadow-md'}
          `}
          onClick={onSelect}
          onDoubleClick={onOpen}
        >
        {/* Checkbox */}
        <div className="flex-shrink-0">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => {}}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            onClick={(e) => e.stopPropagation()}
          />
        </div>

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
              <FileText size={24} className="text-red-400" />
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
            <span>{document.pageCount} pages</span>
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
        <div className="text-xs text-gray-500 whitespace-nowrap w-24 text-right">
          {formatDate(new Date(document.updatedAt))}
        </div>

        {/* Hover Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onPreview(); }}
            className="p-2 hover:bg-gray-100 rounded-lg"
            title="Preview"
          >
            <Eye size={16} className="text-gray-600" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onShare(); }}
            className="p-2 hover:bg-gray-100 rounded-lg"
            title="Share"
          >
            <Share2 size={16} className="text-gray-600" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDownload(); }}
            className="p-2 hover:bg-gray-100 rounded-lg"
            title="Download"
          >
            <Download size={16} className="text-gray-600" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-2 hover:bg-red-100 rounded-lg"
            title="Delete"
          >
            <Trash2 size={16} className="text-red-600" />
          </button>
        </div>

        {/* More Menu */}
        <div className="relative">
          <button
            onClick={e => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-2 hover:bg-gray-100 rounded-lg"
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
                    onClick={() => { onOpen(); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-sm text-left"
                  >
                    <Eye size={14} /> View
                  </button>
                  <button
                    onClick={() => { setIsRenaming(true); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-sm text-left"
                  >
                    <Edit3 size={14} /> Rename
                  </button>
                  {onToggleFavorite && (
                    <button
                      onClick={() => { onToggleFavorite(); setShowMenu(false); }}
                      className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-sm text-left"
                    >
                      {isFavorite ? <StarOff size={14} /> : <Star size={14} />}
                      {isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                    </button>
                  )}
                  <hr className="my-1" />
                  <button
                    onClick={() => { onShare(); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-sm text-left"
                  >
                    <Share2 size={14} /> Share
                  </button>
                  <button
                    onClick={() => { onDownload(); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-sm text-left"
                  >
                    <Download size={14} /> Download
                  </button>
                  <hr className="my-1" />
                  <button
                    onClick={() => { onDelete(); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-sm text-left text-red-600"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
        </motion.div>
      </div>
    );
  }

  // Grid view
  return (
    <div
      draggable
      onDragStart={onDragStart}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`
          group relative bg-white rounded-xl border overflow-hidden cursor-pointer transition-all
          ${isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-blue-300 hover:shadow-lg'}
      `}
      onClick={onSelect}
      onDoubleClick={onOpen}
    >
      {/* Selection checkbox */}
      <div className="absolute top-2 left-2 z-10">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => {}}
          className={`w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 
            ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Favorite star */}
      {onToggleFavorite && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
          className={`absolute top-2 right-2 z-10 p-1 rounded-full 
            ${isFavorite ? 'text-yellow-500 bg-yellow-50' : 'text-gray-400 opacity-0 group-hover:opacity-100'} 
            hover:bg-yellow-100 transition-all`}
        >
          {isFavorite ? <Star size={16} fill="currentColor" /> : <Star size={16} />}
        </button>
      )}

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
            <FileText size={48} className="text-red-300" />
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors">
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex gap-2">
              <button
                onClick={e => { e.stopPropagation(); onPreview(); }}
                className="p-2.5 bg-white rounded-lg shadow-md hover:bg-gray-100"
                title="Preview"
              >
                <Eye size={18} />
              </button>
              <button
                onClick={e => { e.stopPropagation(); onOpen(); }}
                className="p-2.5 bg-white rounded-lg shadow-md hover:bg-gray-100"
                title="Open"
              >
                <ExternalLink size={18} />
              </button>
              <button
                onClick={e => { e.stopPropagation(); onShare(); }}
                className="p-2.5 bg-white rounded-lg shadow-md hover:bg-gray-100"
                title="Share"
              >
                <Share2 size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Badges */}
        <div className="absolute bottom-2 right-2 flex flex-col gap-1">
          {document.shareToken && (
            <span className="px-1.5 py-0.5 bg-green-500 text-white text-[10px] rounded flex items-center gap-1">
              <Share2 size={8} /> Shared
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
          <h4 className="font-medium text-gray-800 truncate text-sm" title={document.name}>
            {document.name}
          </h4>
        )}
        <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
          <span>{document.pageCount}p • {formatFileSize(document.fileSize)}</span>
          <span>{formatDate(new Date(document.updatedAt))}</span>
        </div>
      </div>

      {/* More menu trigger */}
      <button
        onClick={e => {
          e.stopPropagation();
          setShowMenu(!showMenu);
        }}
        className="absolute top-2 right-2 p-1.5 bg-white/80 rounded-lg opacity-0 group-hover:opacity-100 
          hover:bg-white transition-all shadow-sm"
        style={{ display: isFavorite ? 'none' : undefined }}
      >
        <MoreVertical size={14} />
      </button>

      {/* Grid view menu */}
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
              className="absolute right-2 top-10 py-1 bg-white rounded-lg shadow-xl 
                border border-gray-200 z-50 min-w-[140px]"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => { setIsRenaming(true); setShowMenu(false); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 text-sm text-left"
              >
                <Edit3 size={12} /> Rename
              </button>
              <button
                onClick={() => { onDownload(); setShowMenu(false); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 text-sm text-left"
              >
                <Download size={12} /> Download
              </button>
              <hr className="my-1" />
              <button
                onClick={() => { onDelete(); setShowMenu(false); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-red-50 text-sm text-left text-red-600"
              >
                <Trash2 size={12} /> Delete
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      </motion.div>
    </div>
  );
};

// ============================================
// PREVIEW PANEL COMPONENT
// ============================================

interface PreviewPanelProps {
  document: ClientDocument | null;
  client?: Client;
  onClose: () => void;
  onOpen: () => void;
  onShare: () => void;
  onDownload: () => void;
  onDelete: () => void;
  activity?: ActivityItem[];
  versions?: DocumentVersion[];
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({
  document,
  client,
  onClose,
  onOpen,
  onShare,
  onDownload,
  onDelete,
  activity = [],
  versions = [],
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'activity' | 'versions'>('details');

  if (!document) return null;

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="w-96 bg-white border-l border-gray-200 flex flex-col h-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900 truncate flex-1">{document.name}</h3>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Preview Thumbnail */}
      <div className="p-4">
        <div className="aspect-[8.5/11] bg-gray-100 rounded-xl overflow-hidden shadow-inner">
          {document.thumbnailUrl ? (
            <img 
              src={document.thumbnailUrl} 
              alt={document.name}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <FileText size={64} className="text-red-300" />
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2 px-4 pb-4">
        <button
          onClick={onOpen}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500 
            text-white rounded-xl hover:bg-blue-600 transition-colors font-medium"
        >
          <Eye size={16} />
          Open
        </button>
        <button
          onClick={onShare}
          className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          title="Share"
        >
          <Share2 size={16} />
        </button>
        <button
          onClick={onDownload}
          className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          title="Download"
        >
          <Download size={16} />
        </button>
        <button
          onClick={onDelete}
          className="p-2.5 border border-gray-200 rounded-xl hover:bg-red-50 text-red-600 transition-colors"
          title="Delete"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 px-4">
        {[
          { id: 'details', label: 'Details', icon: Info },
          { id: 'activity', label: 'Activity', icon: History },
          { id: 'versions', label: 'Versions', icon: RotateCcw },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'details' && (
          <div className="space-y-4">
            {/* Metadata */}
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">Type</span>
                <span className="text-sm font-medium text-gray-900">{document.fileType}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">Size</span>
                <span className="text-sm font-medium text-gray-900">{formatFileSize(document.fileSize)}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">Pages</span>
                <span className="text-sm font-medium text-gray-900">{document.pageCount}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">Created</span>
                <span className="text-sm font-medium text-gray-900">{formatDateTime(new Date(document.createdAt))}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">Modified</span>
                <span className="text-sm font-medium text-gray-900">{formatDateTime(new Date(document.updatedAt))}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">Version</span>
                <span className="text-sm font-medium text-gray-900">v{document.version}</span>
              </div>
              {client && (
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Client</span>
                  <span className="flex items-center gap-2 text-sm font-medium text-gray-900">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: client.color }} />
                    {client.name}
                  </span>
                </div>
              )}
            </div>

            {/* Annotations & Comments Summary */}
            {(document.annotations?.length > 0 || document.comments?.length > 0) && (
              <div className="p-3 bg-blue-50 rounded-xl">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Notes & Comments</h4>
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <Edit3 size={14} className="text-blue-600" />
                    <span className="text-blue-800">{document.annotations?.length || 0} annotations</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users size={14} className="text-blue-600" />
                    <span className="text-blue-800">{document.comments?.length || 0} comments</span>
                  </div>
                </div>
              </div>
            )}

            {/* Share Status */}
            {document.shareToken && (
              <div className="p-3 bg-green-50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Share2 size={14} className="text-green-600" />
                  <h4 className="text-sm font-medium text-green-900">Shared</h4>
                </div>
                <p className="text-xs text-green-700">
                  This document has an active share link with {document.sharePermissions} permissions
                  {document.shareExpiresAt && (
                    <> (expires {formatDate(new Date(document.shareExpiresAt))})</>
                  )}
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="space-y-3">
            {activity.length === 0 ? (
              <div className="text-center py-8">
                <History size={32} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">No activity yet</p>
              </div>
            ) : (
              activity.map((item) => (
                <div key={item.id} className="flex items-start gap-3 py-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    item.type === 'view' ? 'bg-gray-100' :
                    item.type === 'edit' ? 'bg-blue-100' :
                    item.type === 'share' ? 'bg-green-100' :
                    item.type === 'comment' ? 'bg-yellow-100' : 'bg-navy-100'
                  }`}>
                    {item.type === 'view' && <Eye size={14} className="text-gray-600" />}
                    {item.type === 'edit' && <Edit3 size={14} className="text-blue-600" />}
                    {item.type === 'share' && <Share2 size={14} className="text-green-600" />}
                    {item.type === 'comment' && <Users size={14} className="text-yellow-600" />}
                    {item.type === 'upload' && <Upload size={14} className="text-navy-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{item.userName}</span>
                      {' '}{item.type === 'view' && 'viewed'}
                      {item.type === 'edit' && 'edited'}
                      {item.type === 'share' && 'shared'}
                      {item.type === 'comment' && 'commented on'}
                      {item.type === 'upload' && 'uploaded'}
                      {' '}this document
                    </p>
                    {item.details && (
                      <p className="text-xs text-gray-500 mt-0.5">{item.details}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">{formatDateTime(item.timestamp)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'versions' && (
          <div className="space-y-3">
            {versions.length === 0 ? (
              <div className="text-center py-8">
                <RotateCcw size={32} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">No previous versions</p>
              </div>
            ) : (
              versions.map((version) => (
                <div key={version.id} className="p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm text-gray-900">Version {version.version}</span>
                    <span className="text-xs text-gray-500">{formatFileSize(version.fileSize)}</span>
                  </div>
                  <p className="text-xs text-gray-500">{version.createdBy} • {formatDateTime(version.createdAt)}</p>
                  {version.changes && (
                    <p className="text-xs text-gray-600 mt-1">{version.changes}</p>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ============================================
// UPLOAD MODAL COMPONENT
// ============================================

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (files: FileList) => Promise<void>;
}

const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onUpload,
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      f => f.type === 'application/pdf'
    );
    setFiles(prev => [...prev, ...droppedFiles]);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files).filter(
        f => f.type === 'application/pdf'
      );
      setFiles(prev => [...prev, ...selectedFiles]);
    }
  }, []);

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    
    // Simulate progress for each file
    files.forEach((file) => {
      const interval = setInterval(() => {
        setProgress(prev => {
          const current = prev[file.name] || 0;
          if (current >= 100) {
            clearInterval(interval);
            return prev;
          }
          return { ...prev, [file.name]: Math.min(current + Math.random() * 30, 100) };
        });
      }, 200);
    });

    try {
      const dataTransfer = new DataTransfer();
      files.forEach(f => dataTransfer.items.add(f));
      await onUpload(dataTransfer.files);
      onClose();
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
      setFiles([]);
      setProgress({});
    }
  };

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
        className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
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
              <p className="text-sm text-gray-500">PDF files only</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Drop Zone */}
        <div
          className="p-6"
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
        >
          <div
            className={`
              border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer
              ${files.length > 0 ? 'border-blue-300 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}
            `}
            onClick={() => fileInputRef.current?.click()}
          >
            <FileUp size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-1">
              Drop PDF files here
            </h3>
            <p className="text-sm text-gray-500">
              or click to browse
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="px-6 pb-4 max-h-64 overflow-y-auto">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              {files.length} file{files.length !== 1 ? 's' : ''} selected
            </h4>
            <div className="space-y-2">
              {files.map((file, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <FileText size={20} className="text-red-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                    {uploading && progress[file.name] !== undefined && (
                      <div className="mt-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 transition-all duration-300"
                          style={{ width: `${progress[file.name]}%` }}
                        />
                      </div>
                    )}
                  </div>
                  {!uploading && (
                    <button
                      onClick={() => removeFile(index)}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      <X size={16} className="text-gray-500" />
                    </button>
                  )}
                  {uploading && progress[file.name] >= 100 && (
                    <CheckCircle size={18} className="text-green-500" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 p-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            disabled={uploading}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl font-medium 
              hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={files.length === 0 || uploading}
            className="flex-1 px-4 py-2.5 bg-blue-500 text-white rounded-xl font-medium 
              hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload size={18} />
                Upload {files.length > 0 ? `(${files.length})` : ''}
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ============================================
// SHARE DIALOG COMPONENT
// ============================================

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  document: ClientDocument | null;
  onCreateLink: (options: {
    permission: 'view' | 'comment' | 'edit';
    password?: string;
    expiresInDays?: number;
  }) => Promise<string | null>;
}

const ShareDialog: React.FC<ShareDialogProps> = ({
  isOpen,
  onClose,
  document,
  onCreateLink,
}) => {
  const [permission, setPermission] = useState<'view' | 'comment' | 'edit'>('view');
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [useExpiration, setUseExpiration] = useState(false);
  const [expirationDays, setExpirationDays] = useState(30);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (creating) return;
    setCreating(true);

    try {
      const url = await onCreateLink({
        permission,
        password: usePassword ? password : undefined,
        expiresInDays: useExpiration ? expirationDays : undefined,
      });
      
      if (url) {
        setShareUrl(url);
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async () => {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen || !document) return null;

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
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">Share Document</h2>
            <p className="text-sm text-gray-500 truncate max-w-[280px]">{document.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Permission Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Access Level
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'view', label: 'View', icon: Eye },
                { value: 'comment', label: 'Comment', icon: Users },
                { value: 'edit', label: 'Edit', icon: Edit3 },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPermission(opt.value as any)}
                  className={`p-3 rounded-xl border-2 transition-all ${
                    permission === opt.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <opt.icon size={20} className={`mx-auto mb-1 ${
                    permission === opt.value ? 'text-blue-600' : 'text-gray-400'
                  }`} />
                  <p className={`text-xs font-medium ${
                    permission === opt.value ? 'text-blue-700' : 'text-gray-600'
                  }`}>
                    {opt.label}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Password Protection */}
          <div className="p-4 bg-gray-50 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock size={16} className="text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Password Protection</span>
              </div>
              <button
                onClick={() => setUsePassword(!usePassword)}
                className={`w-10 h-6 rounded-full transition-colors ${
                  usePassword ? 'bg-blue-500' : 'bg-gray-300'
                }`}
              >
                <motion.div
                  animate={{ x: usePassword ? 16 : 2 }}
                  className="w-5 h-5 bg-white rounded-full shadow-sm"
                />
              </button>
            </div>
            {usePassword && (
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>

          {/* Expiration */}
          <div className="p-4 bg-gray-50 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Link Expiration</span>
              </div>
              <button
                onClick={() => setUseExpiration(!useExpiration)}
                className={`w-10 h-6 rounded-full transition-colors ${
                  useExpiration ? 'bg-blue-500' : 'bg-gray-300'
                }`}
              >
                <motion.div
                  animate={{ x: useExpiration ? 16 : 2 }}
                  className="w-5 h-5 bg-white rounded-full shadow-sm"
                />
              </button>
            </div>
            {useExpiration && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={expirationDays}
                  onChange={(e) => setExpirationDays(Math.max(1, parseInt(e.target.value) || 1))}
                  min={1}
                  max={365}
                  className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-500">days</span>
              </div>
            )}
          </div>

          {/* Generated Link */}
          {shareUrl && (
            <div className="p-4 bg-green-50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={16} className="text-green-600" />
                <span className="text-sm font-medium text-green-800">Link Created!</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 px-3 py-2 bg-white border border-green-200 rounded-lg text-sm text-gray-600"
                />
                <button
                  onClick={handleCopy}
                  className={`p-2 rounded-lg transition-colors ${
                    copied ? 'bg-green-100 text-green-600' : 'bg-white border border-green-200 hover:bg-green-100'
                  }`}
                >
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl font-medium 
              hover:bg-gray-100 transition-colors"
          >
            {shareUrl ? 'Done' : 'Cancel'}
          </button>
          {!shareUrl && (
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex-1 px-4 py-2.5 bg-blue-500 text-white rounded-xl font-medium 
                hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {creating ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Link size={18} />
              )}
              Create Link
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

// ============================================
// CREATE FOLDER DIALOG
// ============================================

interface CreateFolderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, color: string) => void;
  parentFolderName?: string;
}

const CreateFolderDialog: React.FC<CreateFolderDialogProps> = ({
  isOpen,
  onClose,
  onCreate,
  parentFolderName,
}) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState(FOLDER_COLORS[0]);

  const handleCreate = () => {
    if (name.trim()) {
      onCreate(name.trim(), color);
      setName('');
      setColor(FOLDER_COLORS[0]);
      onClose();
    }
  };

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
        className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: color + '20' }}>
              <FolderPlus size={24} style={{ color }} />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">New Folder</h2>
              {parentFolderName && (
                <p className="text-sm text-gray-500">Inside "{parentFolderName}"</p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Folder Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter folder name"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none 
                  focus:ring-2 focus:ring-blue-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate();
                  if (e.key === 'Escape') onClose();
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Folder Color
              </label>
              <div className="flex gap-2 flex-wrap">
                {FOLDER_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full transition-transform ${
                      color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl font-medium 
              hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="flex-1 px-4 py-2.5 bg-blue-500 text-white rounded-xl font-medium 
              hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            Create Folder
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ============================================
// MAIN DOCUMENT PORTAL COMPONENT
// ============================================

export const DocumentPortal: React.FC<DocumentPortalProps> = ({
  documents,
  clients,
  onUpload,
  onUploadWithProgress,
  onDelete,
  onRename,
  onOpen,
  onShare: _onShare, // Reserved for future use
  onDownload,
  onMove,
  selectedClientId,
  organizationId,
  isLoading = false,
}) => {
  // Suppress unused variable warnings
  void _onShare;
  // View state
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [quickFilter, setQuickFilter] = useState<'all' | 'recent' | 'shared' | 'favorites'>('all');

  // Folder state
  const [folders, setFolders] = useState<Folder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Selection state
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [previewDocument, setPreviewDocument] = useState<ClientDocument | null>(null);

  // Modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreateFolderDialog, setShowCreateFolderDialog] = useState(false);
  const [createFolderParentId, setCreateFolderParentId] = useState<string | null>(null);
  const [shareDocument, setShareDocument] = useState<ClientDocument | null>(null);

  // Favorites (stored in local state for demo)
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Drag state
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter and sort documents
  const filteredDocuments = useMemo(() => {
    let filtered = documents.filter(doc => doc.status === 'active');

    // Filter by client if selected
    if (selectedClientId) {
      filtered = filtered.filter(doc => doc.clientId === selectedClientId);
    }

    // Quick filter
    if (quickFilter === 'recent') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      filtered = filtered.filter(doc => new Date(doc.updatedAt) >= weekAgo);
    } else if (quickFilter === 'shared') {
      filtered = filtered.filter(doc => doc.shareToken);
    } else if (quickFilter === 'favorites') {
      filtered = filtered.filter(doc => favorites.has(doc.id));
    }

    // Search filter
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
  }, [documents, selectedClientId, searchQuery, sortBy, sortOrder, quickFilter, favorites]);

  // Handle document selection
  const handleSelectDocument = useCallback((e: React.MouseEvent, docId: string) => {
    if (e.ctrlKey || e.metaKey) {
      setSelectedDocuments(prev => {
        const newSet = new Set(prev);
        if (newSet.has(docId)) {
          newSet.delete(docId);
        } else {
          newSet.add(docId);
        }
        return newSet;
      });
    } else if (e.shiftKey && selectedDocuments.size > 0) {
      // Range selection
      const docIds = filteredDocuments.map(d => d.id);
      const lastSelected = Array.from(selectedDocuments).pop()!;
      const lastIndex = docIds.indexOf(lastSelected);
      const currentIndex = docIds.indexOf(docId);
      const [start, end] = [Math.min(lastIndex, currentIndex), Math.max(lastIndex, currentIndex)];
      const range = docIds.slice(start, end + 1);
      setSelectedDocuments(new Set([...selectedDocuments, ...range]));
    } else {
      setSelectedDocuments(new Set([docId]));
      setPreviewDocument(documents.find(d => d.id === docId) || null);
    }
  }, [selectedDocuments, filteredDocuments, documents]);

  // Handle file drop
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);

    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    const pdfFiles = Array.from(files).filter(f => f.type === 'application/pdf');
    if (pdfFiles.length === 0) {
      alert('Please upload PDF files only');
      return;
    }

    const fileList = new DataTransfer();
    pdfFiles.forEach(f => fileList.items.add(f));
    await onUpload(fileList.files, currentFolderId || undefined, selectedClientId);
  }, [onUpload, currentFolderId, selectedClientId]);

  // Folder operations
  const handleCreateFolder = (parentId: string | null) => {
    setCreateFolderParentId(parentId);
    setShowCreateFolderDialog(true);
  };

  const handleFolderCreate = (name: string, color: string) => {
    const newFolder: Folder = {
      id: crypto.randomUUID(),
      name,
      parentId: createFolderParentId,
      color,
      createdAt: new Date(),
      updatedAt: new Date(),
      documentCount: 0,
      children: [],
    };

    if (createFolderParentId) {
      // Add as child to parent
      setFolders(prev => prev.map(f => {
        if (f.id === createFolderParentId) {
          return { ...f, children: [...f.children, newFolder] };
        }
        return f;
      }));
    } else {
      setFolders(prev => [...prev, newFolder]);
    }
  };

  const handleRenameFolder = (folderId: string, newName: string) => {
    setFolders(prev => prev.map(f => {
      if (f.id === folderId) {
        return { ...f, name: newName, updatedAt: new Date() };
      }
      // Check children
      if (f.children) {
        return {
          ...f,
          children: f.children.map(c => 
            c.id === folderId ? { ...c, name: newName, updatedAt: new Date() } : c
          ),
        };
      }
      return f;
    }));
  };

  const handleDeleteFolder = (folderId: string) => {
    if (!confirm('Delete this folder? Documents inside will be moved to the root.')) return;
    
    setFolders(prev => prev.filter(f => {
      if (f.id === folderId) return false;
      if (f.children) {
        f.children = f.children.filter(c => c.id !== folderId);
      }
      return true;
    }));

    if (currentFolderId === folderId) {
      setCurrentFolderId(null);
    }
  };

  const handleToggleExpand = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const handleDocumentDrop = (documentId: string, folderId: string | null) => {
    if (onMove) {
      onMove(documentId, folderId);
    }
  };

  const handleDragStart = (e: React.DragEvent, documentId: string) => {
    e.dataTransfer.setData('documentId', documentId);
  };

  // Share functionality
  const handleCreateShareLink = async (options: {
    permission: 'view' | 'comment' | 'edit';
    password?: string;
    expiresInDays?: number;
  }): Promise<string | null> => {
    if (!shareDocument) return null;
    
    const result = await documentShareLinksApi.create(shareDocument.id, {
      permission: options.permission,
      password: options.password,
      expiresInDays: options.expiresInDays,
    });

    if (result) {
      return getDocumentShareUrl(result.token);
    }
    return null;
  };

  // Toggle favorite
  const toggleFavorite = (docId: string) => {
    setFavorites(prev => {
      const newSet = new Set(prev);
      if (newSet.has(docId)) {
        newSet.delete(docId);
      } else {
        newSet.add(docId);
      }
      return newSet;
    });
  };

  return (
    <div 
      className="h-full flex bg-gray-50"
      onDragOver={e => {
        e.preventDefault();
        setIsDraggingOver(true);
      }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={handleDrop}
    >
      {/* Left Sidebar - Folder Tree */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <FileText size={20} className="text-blue-600" />
            <h2 className="font-semibold text-gray-900">Documents</h2>
          </div>
        </div>

        {/* Quick Filters */}
        <div className="p-3 border-b border-gray-100">
          <div className="space-y-1">
            {[
              { id: 'all', label: 'All Documents', icon: Home },
              { id: 'recent', label: 'Recent', icon: Clock },
              { id: 'shared', label: 'Shared', icon: Share2 },
              { id: 'favorites', label: 'Favorites', icon: Star },
            ].map((filter) => (
              <button
                key={filter.id}
                onClick={() => {
                  setQuickFilter(filter.id as any);
                  setCurrentFolderId(null);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  quickFilter === filter.id && currentFolderId === null
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <filter.icon size={16} />
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Folder Tree */}
        <div className="flex-1 overflow-y-auto">
          <FolderTree
            folders={folders}
            selectedFolderId={currentFolderId}
            onSelectFolder={(id) => {
              setCurrentFolderId(id);
              setQuickFilter('all');
            }}
            onCreateFolder={handleCreateFolder}
            onRenameFolder={handleRenameFolder}
            onDeleteFolder={handleDeleteFolder}
            onDrop={handleDocumentDrop}
            expandedFolders={expandedFolders}
            onToggleExpand={handleToggleExpand}
          />
        </div>

        {/* Storage Info (optional) */}
        <div className="p-4 border-t border-gray-100">
          <div className="text-xs text-gray-500 mb-1">
            {documents.length} documents • {formatFileSize(documents.reduce((sum, d) => sum + d.fileSize, 0))}
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: '35%' }} />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Toolbar */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between gap-4">
            {/* Breadcrumb */}
            <Breadcrumb
              folders={folders}
              currentFolderId={currentFolderId}
              onNavigate={setCurrentFolderId}
            />

            {/* Actions */}
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
                  title="Grid view"
                >
                  <Grid3X3 size={18} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}
                  title="List view"
                >
                  <List size={18} />
                </button>
              </div>

              {/* New Folder */}
              <button
                onClick={() => handleCreateFolder(currentFolderId)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg 
                  hover:bg-gray-50 transition-colors text-gray-700"
              >
                <FolderPlus size={18} />
                <span className="hidden sm:inline">New Folder</span>
              </button>

              {/* Upload button */}
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg 
                  hover:bg-blue-600 transition-colors"
              >
                <Upload size={18} />
                Upload
              </button>
            </div>
          </div>

          {/* Selection bar */}
          {selectedDocuments.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-4 mt-4 p-3 bg-blue-50 rounded-lg"
            >
              <span className="text-sm font-medium text-blue-700">
                {selectedDocuments.size} selected
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    selectedDocuments.forEach(id => onDelete(id));
                    setSelectedDocuments(new Set());
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-100 rounded-lg"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
                <button
                  onClick={() => setSelectedDocuments(new Set())}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <X size={14} />
                  Clear
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Document Grid/List */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <Loader2 size={48} className="animate-spin text-blue-500" />
              <p className="text-gray-600">Loading documents...</p>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <FolderOpen size={64} className="text-gray-300" />
              <h3 className="text-xl font-medium text-gray-600">
                {searchQuery ? 'No documents found' : 'No documents yet'}
              </h3>
              <p className="text-gray-500 text-center max-w-md">
                {searchQuery 
                  ? 'Try a different search term'
                  : 'Upload PDF documents to view, annotate, and share.'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="mt-4 flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg 
                    hover:bg-blue-600 transition-colors"
                >
                  <Upload size={20} />
                  Upload your first document
                </button>
              )}
            </div>
          ) : (
            <div className={viewMode === 'grid' 
              ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
              : 'flex flex-col gap-2'
            }>
              {filteredDocuments.map(doc => (
                <DocumentCard
                  key={doc.id}
                  document={doc}
                  client={clients.find(c => c.id === doc.clientId)}
                  isSelected={selectedDocuments.has(doc.id)}
                  onSelect={(e) => handleSelectDocument(e, doc.id)}
                  onOpen={() => onOpen(doc)}
                  onShare={() => setShareDocument(doc)}
                  onDownload={() => onDownload(doc)}
                  onDelete={() => onDelete(doc.id)}
                  onRename={(newName) => onRename(doc.id, newName)}
                  onPreview={() => setPreviewDocument(doc)}
                  onDragStart={(e) => handleDragStart(e, doc.id)}
                  viewMode={viewMode}
                  isFavorite={favorites.has(doc.id)}
                  onToggleFavorite={() => toggleFavorite(doc.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Preview Panel */}
      <AnimatePresence>
        {previewDocument && (
          <PreviewPanel
            document={previewDocument}
            client={clients.find(c => c.id === previewDocument.clientId)}
            onClose={() => setPreviewDocument(null)}
            onOpen={() => onOpen(previewDocument)}
            onShare={() => setShareDocument(previewDocument)}
            onDownload={() => onDownload(previewDocument)}
            onDelete={() => {
              onDelete(previewDocument.id);
              setPreviewDocument(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Drag overlay */}
      <AnimatePresence>
        {isDraggingOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-blue-500/20 backdrop-blur-sm flex items-center justify-center z-50 pointer-events-none"
          >
            <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
              <FileUp size={64} className="mx-auto text-blue-500 mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Drop PDF files here</h3>
              <p className="text-gray-600">Release to upload</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {showUploadModal && (
          onUploadWithProgress ? (
            <UploadProgressModal
              isOpen={showUploadModal}
              onClose={() => setShowUploadModal(false)}
              onUploadComplete={async (results) => {
                await onUploadWithProgress(results, currentFolderId || undefined, selectedClientId);
              }}
              clientId={selectedClientId}
              organizationId={organizationId}
            />
          ) : (
            <UploadModal
              isOpen={showUploadModal}
              onClose={() => setShowUploadModal(false)}
              onUpload={(files) => onUpload(files, currentFolderId || undefined, selectedClientId)}
            />
          )
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCreateFolderDialog && (
          <CreateFolderDialog
            isOpen={showCreateFolderDialog}
            onClose={() => setShowCreateFolderDialog(false)}
            onCreate={handleFolderCreate}
            parentFolderName={createFolderParentId 
              ? folders.find(f => f.id === createFolderParentId)?.name 
              : undefined}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {shareDocument && (
          <ShareDialog
            isOpen={!!shareDocument}
            onClose={() => setShareDocument(null)}
            document={shareDocument}
            onCreateLink={handleCreateShareLink}
          />
        )}
      </AnimatePresence>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        multiple
        onChange={async (e) => {
          if (e.target.files) {
            await onUpload(e.target.files, currentFolderId || undefined, selectedClientId);
          }
          e.target.value = '';
        }}
        className="hidden"
      />
    </div>
  );
};

export default DocumentPortal;

// Export types
export type {
  Folder,
  ActivityItem,
  DocumentVersion,
  Client,
  DocumentPortalProps,
};
