/**
 * Keyboard Shortcuts Modal Component
 *
 * A beautiful modal showing all keyboard shortcuts organized by category.
 * Includes search/filter functionality and smooth animations.
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Search,
  MousePointer2,
  Hand,
  StickyNote,
  Type,
  Shapes,
  Minus,
  Frame,
  GitBranch,
  Move,
  ZoomIn,
  Grid3X3,
  Magnet,
  Undo2,
  Redo2,
  Copy,
  Trash2,
  Clipboard,
  ClipboardPaste,
  MousePointerClick,
  Eye,
  Keyboard,
  Command
} from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Shortcut {
  keys: string[];
  description: string;
  icon?: React.ReactNode;
}

interface ShortcutCategory {
  name: string;
  icon: React.ReactNode;
  shortcuts: Shortcut[];
}

// Define all keyboard shortcuts organized by category
const SHORTCUT_CATEGORIES: ShortcutCategory[] = [
  {
    name: 'Tools',
    icon: <MousePointer2 className="w-5 h-5" />,
    shortcuts: [
      { keys: ['V'], description: 'Select tool', icon: <MousePointer2 className="w-4 h-4" /> },
      { keys: ['H'], description: 'Hand/Pan tool', icon: <Hand className="w-4 h-4" /> },
      { keys: ['N'], description: 'Sticky note', icon: <StickyNote className="w-4 h-4" /> },
      { keys: ['T'], description: 'Text', icon: <Type className="w-4 h-4" /> },
      { keys: ['S'], description: 'Shapes', icon: <Shapes className="w-4 h-4" /> },
      { keys: ['C'], description: 'Connector', icon: <Minus className="w-4 h-4" /> },
      { keys: ['F'], description: 'Frame', icon: <Frame className="w-4 h-4" /> },
      { keys: ['M'], description: 'Mind Map', icon: <GitBranch className="w-4 h-4" /> },
    ]
  },
  {
    name: 'Canvas',
    icon: <Move className="w-5 h-5" />,
    shortcuts: [
      { keys: ['Space', 'drag'], description: 'Pan canvas' },
      { keys: ['Scroll'], description: 'Zoom in/out' },
      { keys: ['\u2318', '0'], description: 'Reset view' },
      { keys: ['\u2318', '1'], description: 'Fit to content' },
      { keys: ['\u2318', '+'], description: 'Zoom in' },
      { keys: ['\u2318', '-'], description: 'Zoom out' },
    ]
  },
  {
    name: 'Edit',
    icon: <Undo2 className="w-5 h-5" />,
    shortcuts: [
      { keys: ['\u2318', 'Z'], description: 'Undo', icon: <Undo2 className="w-4 h-4" /> },
      { keys: ['\u2318', 'Y'], description: 'Redo', icon: <Redo2 className="w-4 h-4" /> },
      { keys: ['\u2318', 'D'], description: 'Duplicate', icon: <Copy className="w-4 h-4" /> },
      { keys: ['Delete'], description: 'Delete selected', icon: <Trash2 className="w-4 h-4" /> },
      { keys: ['Backspace'], description: 'Delete selected', icon: <Trash2 className="w-4 h-4" /> },
      { keys: ['\u2318', 'C'], description: 'Copy', icon: <Clipboard className="w-4 h-4" /> },
      { keys: ['\u2318', 'V'], description: 'Paste', icon: <ClipboardPaste className="w-4 h-4" /> },
    ]
  },
  {
    name: 'Selection',
    icon: <MousePointerClick className="w-5 h-5" />,
    shortcuts: [
      { keys: ['\u2318', 'A'], description: 'Select all' },
      { keys: ['Escape'], description: 'Deselect / Cancel' },
      { keys: ['Shift', 'Click'], description: 'Add to selection' },
    ]
  },
  {
    name: 'View',
    icon: <Eye className="w-5 h-5" />,
    shortcuts: [
      { keys: ['G'], description: 'Toggle grid', icon: <Grid3X3 className="w-4 h-4" /> },
      { keys: ['\u2318', 'G'], description: 'Toggle snap to grid', icon: <Magnet className="w-4 h-4" /> },
      { keys: ['\u2318', '?'], description: 'Show keyboard shortcuts', icon: <Keyboard className="w-4 h-4" /> },
    ]
  },
];

// Helper to check if running on Mac
const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

// Convert command symbol to Ctrl for non-Mac
const formatKey = (key: string): string => {
  if (key === '\u2318') {
    return isMac ? '\u2318' : 'Ctrl';
  }
  return key;
};

export default function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Filter shortcuts based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return SHORTCUT_CATEGORIES;

    const query = searchQuery.toLowerCase();
    return SHORTCUT_CATEGORIES.map(category => ({
      ...category,
      shortcuts: category.shortcuts.filter(shortcut =>
        shortcut.description.toLowerCase().includes(query) ||
        shortcut.keys.some(key => key.toLowerCase().includes(query))
      )
    })).filter(category => category.shortcuts.length > 0);
  }, [searchQuery]);

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      // Small delay to ensure modal is fully rendered
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset search when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
        onClick={onClose}
      >
        <motion.div
          ref={modalRef}
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: 'spring', duration: 0.4, bounce: 0.2 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                  <Keyboard className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Keyboard Shortcuts</h2>
                  <p className="text-sm text-gray-500">Master the canvas with these shortcuts</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Search Bar */}
            <div className="mt-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search shortcuts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-gray-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {filteredCategories.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-1">No shortcuts found</h3>
                <p className="text-gray-500 text-sm">Try searching with different keywords</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredCategories.map((category, categoryIndex) => (
                  <motion.div
                    key={category.name}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: categoryIndex * 0.05 }}
                    className="space-y-3"
                  >
                    {/* Category Header */}
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                      <span className="text-indigo-600">{category.icon}</span>
                      <h3 className="font-semibold text-gray-800">{category.name}</h3>
                    </div>

                    {/* Shortcuts List */}
                    <div className="space-y-2">
                      {category.shortcuts.map((shortcut, shortcutIndex) => (
                        <motion.div
                          key={shortcutIndex}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: categoryIndex * 0.05 + shortcutIndex * 0.02 }}
                          className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors group"
                        >
                          <div className="flex items-center gap-2">
                            {shortcut.icon && (
                              <span className="text-gray-400 group-hover:text-indigo-500 transition-colors">
                                {shortcut.icon}
                              </span>
                            )}
                            <span className="text-sm text-gray-700">{shortcut.description}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {shortcut.keys.map((key, keyIndex) => (
                              <span key={keyIndex} className="flex items-center">
                                <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 bg-gray-100 border border-gray-200 rounded-md text-xs font-medium text-gray-600 shadow-sm">
                                  {formatKey(key)}
                                </kbd>
                                {keyIndex < shortcut.keys.length - 1 && (
                                  <span className="mx-0.5 text-gray-400 text-xs">+</span>
                                )}
                              </span>
                            ))}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Command className="w-4 h-4" />
                <span>Press <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-xs font-medium">{isMac ? '\u2318' : 'Ctrl'}+?</kbd> to toggle this modal</span>
              </div>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
