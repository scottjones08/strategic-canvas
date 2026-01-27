// PDFThumbnails.tsx - Page thumbnails sidebar for PDF Editor
// Displays page thumbnails with drag-to-reorder functionality

import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Trash2,
  Copy,
  Scissors,
  Plus,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Loader2,
  Eye,
} from 'lucide-react';
import type { PageInfo } from '../lib/pdf-utils';

interface PDFThumbnailsProps {
  thumbnails: string[];
  pages: PageInfo[];
  currentPage: number;
  onPageSelect: (page: number) => void;
  onReorder: (newOrder: number[]) => void;
  onRotatePage: (page: number) => void;
  onDeletePage: (page: number) => void;
  onExtractPage: (page: number) => void;
  onDuplicatePage?: (page: number) => void;
  isCollapsed?: boolean;
  onToggleCollapsed?: () => void;
  isLoading?: boolean;
  annotationCounts?: Record<number, number>;
}

interface ThumbnailItemProps {
  pageNumber: number;
  thumbnail: string;
  pageInfo: PageInfo;
  isSelected: boolean;
  annotationCount: number;
  onSelect: () => void;
  onRotate: () => void;
  onDelete: () => void;
  onExtract: () => void;
  onDuplicate?: () => void;
  canDelete: boolean;
}

const ThumbnailItem: React.FC<ThumbnailItemProps> = ({
  pageNumber,
  thumbnail,
  pageInfo,
  isSelected,
  annotationCount,
  onSelect,
  onRotate,
  onDelete,
  onExtract,
  onDuplicate,
  canDelete,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  return (
    <Reorder.Item
      value={pageNumber}
      id={`page-${pageNumber}`}
      className="relative group"
    >
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onSelect}
        onContextMenu={e => {
          e.preventDefault();
          setShowMenu(true);
        }}
        className={`
          relative cursor-pointer rounded-lg overflow-hidden transition-all duration-200
          ${isSelected
            ? 'ring-2 ring-blue-500 ring-offset-2 shadow-lg'
            : 'ring-1 ring-gray-200 hover:ring-gray-300 hover:shadow-md'
          }
        `}
      >
        {/* Drag Handle */}
        <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-black/30 to-transparent 
          opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10">
          <GripVertical size={14} className="text-white" />
        </div>

        {/* Thumbnail Image */}
        <div className="relative bg-white aspect-[8.5/11]">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={`Page ${pageNumber}`}
              className="w-full h-full object-contain"
              style={{
                transform: `rotate(${pageInfo.rotation || 0}deg)`,
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <Loader2 size={20} className="animate-spin text-gray-400" />
            </div>
          )}

          {/* Annotation Badge */}
          {annotationCount > 0 && (
            <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-blue-500 text-white 
              text-[10px] font-medium rounded-full">
              {annotationCount}
            </div>
          )}
        </div>

        {/* Page Number Label */}
        <div className={`
          text-center py-1.5 text-xs font-medium transition-colors
          ${isSelected ? 'bg-blue-500 text-white' : 'bg-gray-50 text-gray-600'}
        `}>
          Page {pageNumber}
        </div>

        {/* Hover Actions */}
        <div className="absolute bottom-8 right-1 flex flex-col gap-1 
          opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={e => {
              e.stopPropagation();
              onRotate();
            }}
            className="p-1 bg-white rounded shadow-sm hover:bg-gray-100"
            title="Rotate"
          >
            <RotateCw size={12} />
          </button>
          {canDelete && (
            <button
              onClick={e => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1 bg-white rounded shadow-sm hover:bg-red-100 text-red-600"
              title="Delete"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </motion.div>

      {/* Context Menu */}
      <AnimatePresence>
        {showMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setShowMenu(false)}
            />
            <motion.div
              ref={menuRef}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute top-full left-0 mt-1 py-1 bg-white rounded-lg shadow-xl 
                border border-gray-200 z-50 min-w-[140px]"
            >
              <button
                onClick={() => {
                  onSelect();
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 text-sm"
              >
                <Eye size={14} />
                View
              </button>
              <button
                onClick={() => {
                  onRotate();
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 text-sm"
              >
                <RotateCw size={14} />
                Rotate
              </button>
              <button
                onClick={() => {
                  onExtract();
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 text-sm"
              >
                <Scissors size={14} />
                Extract
              </button>
              {onDuplicate && (
                <button
                  onClick={() => {
                    onDuplicate();
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 text-sm"
                >
                  <Copy size={14} />
                  Duplicate
                </button>
              )}
              {canDelete && (
                <>
                  <hr className="my-1" />
                  <button
                    onClick={() => {
                      onDelete();
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-red-50 
                      text-sm text-red-600"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Reorder.Item>
  );
};

export const PDFThumbnails: React.FC<PDFThumbnailsProps> = ({
  thumbnails,
  pages,
  currentPage,
  onPageSelect,
  onReorder,
  onRotatePage,
  onDeletePage,
  onExtractPage,
  onDuplicatePage,
  isCollapsed = false,
  onToggleCollapsed,
  isLoading = false,
  annotationCounts = {},
}) => {
  const [pageOrder, setPageOrder] = useState<number[]>(
    Array.from({ length: pages.length }, (_, i) => i + 1)
  );

  // Update page order when pages change
  React.useEffect(() => {
    setPageOrder(Array.from({ length: pages.length }, (_, i) => i + 1));
  }, [pages.length]);

  const handleReorder = useCallback((newOrder: number[]) => {
    setPageOrder(newOrder);
    onReorder(newOrder);
  }, [onReorder]);

  const scrollToPage = useCallback((page: number) => {
    const element = document.getElementById(`page-${page}`);
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  if (isCollapsed) {
    return (
      <motion.div
        initial={{ width: 48 }}
        animate={{ width: 48 }}
        className="h-full bg-gray-50 border-r border-gray-200 flex flex-col items-center py-4"
      >
        <button
          onClick={onToggleCollapsed}
          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          title="Show thumbnails"
        >
          <ChevronRight size={20} />
        </button>

        <div className="mt-4 flex flex-col items-center gap-2">
          <span className="text-xs font-medium text-gray-500 -rotate-90 whitespace-nowrap">
            {pages.length} pages
          </span>
        </div>

        {/* Mini page indicators */}
        <div className="mt-4 flex flex-col gap-1 overflow-y-auto max-h-[60vh]">
          {pageOrder.map(pageNum => (
            <button
              key={pageNum}
              onClick={() => onPageSelect(pageNum)}
              className={`
                w-3 h-4 rounded-sm transition-all
                ${currentPage === pageNum
                  ? 'bg-blue-500'
                  : 'bg-gray-300 hover:bg-gray-400'
                }
              `}
              title={`Page ${pageNum}`}
            />
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ width: 200 }}
      animate={{ width: 200 }}
      className="h-full bg-gray-50 border-r border-gray-200 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200">
        <h3 className="font-medium text-gray-700 text-sm">
          Pages ({pages.length})
        </h3>
        <div className="flex items-center gap-1">
          {onToggleCollapsed && (
            <button
              onClick={onToggleCollapsed}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              title="Hide thumbnails"
            >
              <ChevronLeft size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-center gap-2 p-2 border-b border-gray-200">
        <button
          onClick={() => {
            if (currentPage > 1) {
              onPageSelect(currentPage - 1);
              scrollToPage(currentPage - 1);
            }
          }}
          disabled={currentPage <= 1}
          className="p-1 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronUp size={16} />
        </button>
        <span className="text-sm text-gray-600">
          {currentPage} / {pages.length}
        </span>
        <button
          onClick={() => {
            if (currentPage < pages.length) {
              onPageSelect(currentPage + 1);
              scrollToPage(currentPage + 1);
            }
          }}
          disabled={currentPage >= pages.length}
          className="p-1 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronDown size={16} />
        </button>
      </div>

      {/* Thumbnails List */}
      <div className="flex-1 overflow-y-auto p-3">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <Loader2 size={24} className="animate-spin text-gray-400" />
            <span className="text-sm text-gray-500">Loading pages...</span>
          </div>
        ) : (
          <Reorder.Group
            axis="y"
            values={pageOrder}
            onReorder={handleReorder}
            className="flex flex-col gap-3"
          >
            {pageOrder.map(pageNum => {
              const pageIndex = pageNum - 1;
              const pageInfo = pages[pageIndex] || {
                pageNumber: pageNum,
                width: 612,
                height: 792,
                rotation: 0,
              };

              return (
                <ThumbnailItem
                  key={pageNum}
                  pageNumber={pageNum}
                  thumbnail={thumbnails[pageIndex] || ''}
                  pageInfo={pageInfo}
                  isSelected={currentPage === pageNum}
                  annotationCount={annotationCounts[pageNum] || 0}
                  onSelect={() => {
                    onPageSelect(pageNum);
                    scrollToPage(pageNum);
                  }}
                  onRotate={() => onRotatePage(pageNum)}
                  onDelete={() => onDeletePage(pageNum)}
                  onExtract={() => onExtractPage(pageNum)}
                  onDuplicate={onDuplicatePage ? () => onDuplicatePage(pageNum) : undefined}
                  canDelete={pages.length > 1}
                />
              );
            })}
          </Reorder.Group>
        )}
      </div>

      {/* Add Page Button */}
      <div className="p-3 border-t border-gray-200">
        <button
          className="w-full flex items-center justify-center gap-2 px-3 py-2 
            border border-dashed border-gray-300 rounded-lg text-gray-600 
            hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          onClick={() => {
            // Trigger file upload for adding pages
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.pdf';
            input.click();
          }}
        >
          <Plus size={16} />
          <span className="text-sm">Add Pages</span>
        </button>
      </div>
    </motion.div>
  );
};

export default PDFThumbnails;
