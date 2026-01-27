// PDFBookmarksPanel.tsx - Bookmarks/Outline navigation panel
// Displays document structure with expandable sections

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bookmark,
  ChevronRight,
  ChevronDown,
  FileText,
  Loader2,
  BookmarkPlus,
  X,
  // GripVertical,
} from 'lucide-react';
import type { BookmarkEntry } from '../lib/pdf-enterprise-utils';

interface PDFBookmarksPanelProps {
  bookmarks: BookmarkEntry[];
  currentPage: number;
  onPageSelect: (page: number) => void;
  onClose: () => void;
  isOpen: boolean;
  isLoading?: boolean;
  onAddBookmark?: (title: string, page: number) => void;
  onDeleteBookmark?: (title: string) => void;
  allowEditing?: boolean;
}

interface BookmarkItemProps {
  bookmark: BookmarkEntry;
  level: number;
  currentPage: number;
  onSelect: (page: number) => void;
  expandedItems: Set<string>;
  onToggleExpand: (title: string) => void;
  onDelete?: (title: string) => void;
  allowEditing?: boolean;
}

const BookmarkItem: React.FC<BookmarkItemProps> = ({
  bookmark,
  level,
  currentPage,
  onSelect,
  expandedItems,
  onToggleExpand,
  onDelete,
  allowEditing,
}) => {
  const hasChildren = bookmark.children && bookmark.children.length > 0;
  const isExpanded = expandedItems.has(bookmark.title);
  const isCurrentPage = bookmark.pageNumber === currentPage;
  
  return (
    <div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`
          flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer
          transition-colors group
          ${isCurrentPage 
            ? 'bg-blue-100 text-blue-700' 
            : 'hover:bg-gray-100 text-gray-700'
          }
        `}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => onSelect(bookmark.pageNumber)}
      >
        {/* Expand/Collapse Toggle */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(bookmark.title);
            }}
            className="p-0.5 hover:bg-gray-200 rounded"
          >
            {isExpanded ? (
              <ChevronDown size={14} className="text-gray-500" />
            ) : (
              <ChevronRight size={14} className="text-gray-500" />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}
        
        {/* Bookmark Icon */}
        <Bookmark 
          size={14} 
          className={isCurrentPage ? 'text-blue-600' : 'text-gray-400'}
          fill={isCurrentPage ? 'currentColor' : 'none'}
        />
        
        {/* Title */}
        <span className={`flex-1 text-sm truncate ${isCurrentPage ? 'font-medium' : ''}`}>
          {bookmark.title}
        </span>
        
        {/* Page Number */}
        <span className={`text-xs ${isCurrentPage ? 'text-blue-500' : 'text-gray-400'}`}>
          p. {bookmark.pageNumber}
        </span>
        
        {/* Delete Button (shown on hover if editing allowed) */}
        {allowEditing && onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(bookmark.title);
            }}
            className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-100 rounded transition-opacity"
          >
            <X size={12} className="text-red-500" />
          </button>
        )}
      </motion.div>
      
      {/* Children */}
      <AnimatePresence>
        {hasChildren && isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {bookmark.children!.map((child, index) => (
              <BookmarkItem
                key={`${child.title}-${index}`}
                bookmark={child}
                level={level + 1}
                currentPage={currentPage}
                onSelect={onSelect}
                expandedItems={expandedItems}
                onToggleExpand={onToggleExpand}
                onDelete={onDelete}
                allowEditing={allowEditing}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const PDFBookmarksPanel: React.FC<PDFBookmarksPanelProps> = ({
  bookmarks,
  currentPage,
  onPageSelect,
  onClose,
  isOpen,
  isLoading = false,
  onAddBookmark,
  onDeleteBookmark,
  allowEditing = false,
}) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [showAddForm, setShowAddForm] = useState(false);
  const [newBookmarkTitle, setNewBookmarkTitle] = useState('');
  const [newBookmarkPage, setNewBookmarkPage] = useState(currentPage);
  
  // Toggle item expansion
  const handleToggleExpand = useCallback((title: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(title)) {
        next.delete(title);
      } else {
        next.add(title);
      }
      return next;
    });
  }, []);
  
  // Expand all
  const expandAll = useCallback(() => {
    const getAllTitles = (items: BookmarkEntry[]): string[] => {
      return items.flatMap(item => [
        item.title,
        ...(item.children ? getAllTitles(item.children) : []),
      ]);
    };
    setExpandedItems(new Set(getAllTitles(bookmarks)));
  }, [bookmarks]);
  
  // Collapse all
  const collapseAll = useCallback(() => {
    setExpandedItems(new Set());
  }, []);
  
  // Add new bookmark
  const handleAddBookmark = useCallback(() => {
    if (newBookmarkTitle.trim() && onAddBookmark) {
      onAddBookmark(newBookmarkTitle.trim(), newBookmarkPage);
      setNewBookmarkTitle('');
      setNewBookmarkPage(currentPage);
      setShowAddForm(false);
    }
  }, [newBookmarkTitle, newBookmarkPage, currentPage, onAddBookmark]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 280, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      className="h-full bg-white border-r border-gray-200 flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Bookmark size={18} className="text-gray-600" />
          <h3 className="font-medium text-gray-700">Bookmarks</h3>
        </div>
        <div className="flex items-center gap-1">
          {bookmarks.length > 0 && (
            <>
              <button
                onClick={expandAll}
                className="p-1 text-xs text-gray-500 hover:bg-gray-100 rounded"
                title="Expand all"
              >
                Expand
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={collapseAll}
                className="p-1 text-xs text-gray-500 hover:bg-gray-100 rounded"
                title="Collapse all"
              >
                Collapse
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded ml-2"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      
      {/* Add Bookmark Button */}
      {allowEditing && onAddBookmark && (
        <div className="p-2 border-b border-gray-100">
          {showAddForm ? (
            <div className="space-y-2">
              <input
                type="text"
                value={newBookmarkTitle}
                onChange={(e) => setNewBookmarkTitle(e.target.value)}
                placeholder="Bookmark title"
                className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddBookmark();
                  if (e.key === 'Escape') setShowAddForm(false);
                }}
              />
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500">Page:</label>
                <input
                  type="number"
                  value={newBookmarkPage}
                  onChange={(e) => setNewBookmarkPage(parseInt(e.target.value) || 1)}
                  min={1}
                  className="w-16 px-2 py-1 border border-gray-200 rounded text-sm"
                />
                <div className="flex-1" />
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddBookmark}
                  className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Add
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => {
                setNewBookmarkPage(currentPage);
                setShowAddForm(true);
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 
                border border-dashed border-gray-300 rounded-lg text-gray-600 
                hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors text-sm"
            >
              <BookmarkPlus size={16} />
              Add Bookmark
            </button>
          )}
        </div>
      )}
      
      {/* Bookmarks List */}
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-500">
            <Loader2 size={24} className="animate-spin" />
            <span className="text-sm">Loading bookmarks...</span>
          </div>
        ) : bookmarks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 p-4">
            <Bookmark size={48} className="mb-3 opacity-30" />
            <p className="text-sm text-center">No bookmarks found</p>
            <p className="text-xs text-center mt-1">
              This document doesn't have an outline or table of contents.
            </p>
            {allowEditing && onAddBookmark && (
              <button
                onClick={() => {
                  setNewBookmarkPage(currentPage);
                  setShowAddForm(true);
                }}
                className="mt-4 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm hover:bg-blue-100 transition-colors"
              >
                Add First Bookmark
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-0.5">
            {bookmarks.map((bookmark, index) => (
              <BookmarkItem
                key={`${bookmark.title}-${index}`}
                bookmark={bookmark}
                level={0}
                currentPage={currentPage}
                onSelect={onPageSelect}
                expandedItems={expandedItems}
                onToggleExpand={handleToggleExpand}
                onDelete={onDeleteBookmark}
                allowEditing={allowEditing}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Quick Jump to Page */}
      <div className="p-3 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-gray-400" />
          <span className="text-xs text-gray-500">Jump to page:</span>
          <input
            type="number"
            min={1}
            placeholder="Page"
            className="w-16 px-2 py-1 border border-gray-200 rounded text-sm text-center"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const page = parseInt((e.target as HTMLInputElement).value);
                if (page && page > 0) {
                  onPageSelect(page);
                  (e.target as HTMLInputElement).value = '';
                }
              }
            }}
          />
        </div>
      </div>
    </motion.div>
  );
};

export default PDFBookmarksPanel;
