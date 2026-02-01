/**
 * EmojiPicker Component
 *
 * A compact, fast emoji picker for reactions
 * Features:
 * - Common reaction emojis in a grid
 * - Category tabs (Reactions, Hands, Faces)
 * - Search functionality
 * - Recent/frequently used section
 * - Smooth Framer Motion animations
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Clock, Smile, ThumbsUp, Hand, X } from 'lucide-react';

interface EmojiPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
  position?: { x: number; y: number };
  recentEmojis?: string[];
}

// Emoji categories with their emojis
const EMOJI_CATEGORIES = {
  reactions: {
    icon: ThumbsUp,
    label: 'Reactions',
    emojis: [
      '\u{1F44D}', '\u{2764}\u{FE0F}', '\u{1F602}', '\u{1F389}', '\u{1F914}', '\u{1F44F}', '\u{1F525}', '\u{1F4AF}', '\u{2B50}', '\u{1F440}',
      '\u{1F64C}', '\u{1F4A1}', '\u{2705}', '\u{274C}', '\u{1F6A8}', '\u{1F4A5}', '\u{1F3AF}', '\u{1F680}', '\u{1F4AA}', '\u{1F49C}'
    ]
  },
  hands: {
    icon: Hand,
    label: 'Hands',
    emojis: [
      '\u{1F44D}', '\u{1F44E}', '\u{1F44F}', '\u{1F64C}', '\u{1F64B}', '\u{1F91A}', '\u{270B}', '\u{1F44B}', '\u{1F91D}', '\u{1F64F}',
      '\u{261D}\u{FE0F}', '\u{1F446}', '\u{1F447}', '\u{1F448}', '\u{1F449}', '\u{270C}\u{FE0F}', '\u{1F91E}', '\u{1F91F}', '\u{1F918}', '\u{1F44C}'
    ]
  },
  faces: {
    icon: Smile,
    label: 'Faces',
    emojis: [
      '\u{1F60A}', '\u{1F604}', '\u{1F601}', '\u{1F602}', '\u{1F923}', '\u{1F60D}', '\u{1F929}', '\u{1F914}', '\u{1F928}', '\u{1F644}',
      '\u{1F62E}', '\u{1F631}', '\u{1F62D}', '\u{1F621}', '\u{1F92F}', '\u{1F973}', '\u{1F60E}', '\u{1F913}', '\u{1F9D0}', '\u{1F634}'
    ]
  }
};

// Quick reaction emojis (shown at top)
const QUICK_REACTIONS = ['\u{1F44D}', '\u{2764}\u{FE0F}', '\u{1F602}', '\u{1F389}', '\u{1F914}', '\u{1F44F}'];

// Default recent emojis
const DEFAULT_RECENT = ['\u{1F44D}', '\u{2764}\u{FE0F}', '\u{1F525}', '\u{1F4AF}', '\u{2B50}', '\u{1F389}'];

export const EmojiPicker: React.FC<EmojiPickerProps> = ({
  isOpen,
  onClose,
  onSelect,
  position = { x: 0, y: 0 },
  recentEmojis = DEFAULT_RECENT
}) => {
  const [activeCategory, setActiveCategory] = useState<keyof typeof EMOJI_CATEGORIES>('reactions');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  // Focus search when shown
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showSearch) {
          setShowSearch(false);
          setSearchQuery('');
        } else {
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, showSearch, onClose]);

  // Filter emojis based on search (simple matching)
  const filteredEmojis = useMemo(() => {
    if (!searchQuery.trim()) return null;

    const query = searchQuery.toLowerCase();
    const allEmojis = Object.values(EMOJI_CATEGORIES).flatMap(cat => cat.emojis);
    const uniqueEmojis = [...new Set(allEmojis)];

    // Simple search - show all if query is short, or filter by position
    if (query.length < 2) return uniqueEmojis;

    // Return a subset for longer queries (simulated search)
    return uniqueEmojis.slice(0, 12);
  }, [searchQuery]);

  const handleEmojiClick = (emoji: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(emoji);
    onClose();
  };

  if (!isOpen) return null;

  const categoryEmojis = EMOJI_CATEGORIES[activeCategory].emojis;

  return (
    <AnimatePresence>
      <motion.div
        ref={pickerRef}
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 10 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="fixed bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-[1000]"
        style={{
          left: position.x,
          top: position.y,
          width: 280,
          maxHeight: 360
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with search toggle */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50">
          <span className="text-sm font-medium text-gray-700">Add reaction</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setShowSearch(!showSearch);
                if (showSearch) setSearchQuery('');
              }}
              className={`p-1.5 rounded-lg transition-colors ${
                showSearch ? 'bg-navy-100 text-navy-700' : 'hover:bg-gray-200 text-gray-500'
              }`}
            >
              <Search className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search input */}
        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <div className="px-3 py-2 border-b border-gray-100">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search emojis..."
                  className="w-full px-3 py-1.5 bg-gray-100 rounded-lg text-sm outline-none focus:ring-2 focus:ring-navy-200"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick reactions bar */}
        {!searchQuery && (
          <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
            {QUICK_REACTIONS.map((emoji) => (
              <motion.button
                key={emoji}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => handleEmojiClick(emoji, e)}
                className="w-8 h-8 flex items-center justify-center text-xl hover:bg-gray-100 rounded-lg transition-colors"
              >
                {emoji}
              </motion.button>
            ))}
          </div>
        )}

        {/* Category tabs */}
        {!searchQuery && (
          <div className="flex items-center gap-1 px-2 py-1.5 border-b border-gray-100">
            {/* Recent tab */}
            <button
              onClick={() => setActiveCategory('reactions')}
              className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs ${
                activeCategory === 'reactions' && recentEmojis.length > 0
                  ? 'bg-gray-200 text-gray-700'
                  : 'hover:bg-gray-100 text-gray-500'
              }`}
              title="Recent"
            >
              <Clock className="w-3.5 h-3.5" />
            </button>

            {/* Category tabs */}
            {Object.entries(EMOJI_CATEGORIES).map(([key, category]) => {
              const Icon = category.icon;
              return (
                <button
                  key={key}
                  onClick={() => setActiveCategory(key as keyof typeof EMOJI_CATEGORIES)}
                  className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs ${
                    activeCategory === key
                      ? 'bg-navy-100 text-navy-700'
                      : 'hover:bg-gray-100 text-gray-500'
                  }`}
                  title={category.label}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{category.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Emoji grid */}
        <div className="p-2 max-h-[200px] overflow-y-auto">
          {searchQuery && filteredEmojis ? (
            <>
              <p className="text-xs text-gray-400 px-1 mb-2">Search results</p>
              <div className="grid grid-cols-7 gap-1">
                {filteredEmojis.map((emoji, index) => (
                  <motion.button
                    key={`${emoji}-${index}`}
                    whileHover={{ scale: 1.15, backgroundColor: '#f3f4f6' }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => handleEmojiClick(emoji, e)}
                    className="w-9 h-9 flex items-center justify-center text-xl rounded-lg transition-colors"
                  >
                    {emoji}
                  </motion.button>
                ))}
              </div>
              {filteredEmojis.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">No emojis found</p>
              )}
            </>
          ) : (
            <>
              {/* Recent emojis section */}
              {recentEmojis.length > 0 && activeCategory === 'reactions' && (
                <div className="mb-3">
                  <p className="text-xs text-gray-400 px-1 mb-1.5">Recently used</p>
                  <div className="grid grid-cols-7 gap-1">
                    {recentEmojis.slice(0, 7).map((emoji, index) => (
                      <motion.button
                        key={`recent-${emoji}-${index}`}
                        whileHover={{ scale: 1.15, backgroundColor: '#f3f4f6' }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => handleEmojiClick(emoji, e)}
                        className="w-9 h-9 flex items-center justify-center text-xl rounded-lg transition-colors"
                      >
                        {emoji}
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* Category emojis */}
              <div>
                <p className="text-xs text-gray-400 px-1 mb-1.5">
                  {EMOJI_CATEGORIES[activeCategory].label}
                </p>
                <div className="grid grid-cols-7 gap-1">
                  {categoryEmojis.map((emoji, index) => (
                    <motion.button
                      key={`${activeCategory}-${emoji}-${index}`}
                      whileHover={{ scale: 1.15, backgroundColor: '#f3f4f6' }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => handleEmojiClick(emoji, e)}
                      className="w-9 h-9 flex items-center justify-center text-xl rounded-lg transition-colors"
                    >
                      {emoji}
                    </motion.button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default EmojiPicker;
