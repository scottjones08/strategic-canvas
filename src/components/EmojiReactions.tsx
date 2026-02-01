/**
 * EmojiReactions Component
 *
 * Displays emoji reactions below a sticky note
 * Features:
 * - Shows current reactions as small pills with counts
 * - "+" button to add reactions (appears on hover)
 * - Opens emoji picker on click
 * - Toggle reactions (click to add/remove)
 * - Shows who reacted on hover tooltip
 * - Smooth animations
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import { EmojiPicker } from './EmojiPicker';

export interface Reaction {
  emoji: string;
  userIds: string[];
}

interface EmojiReactionsProps {
  reactions: Reaction[];
  currentUserId: string;
  onAddReaction: (emoji: string) => void;
  onRemoveReaction: (emoji: string) => void;
  nodeWidth?: number;
  compact?: boolean;
  getUserName?: (userId: string) => string;
}

// Default user name resolver
const defaultGetUserName = (userId: string): string => {
  // Try to create a friendly name from the userId
  if (userId.includes('@')) {
    return userId.split('@')[0];
  }
  // Truncate long IDs
  if (userId.length > 10) {
    return userId.slice(0, 8) + '...';
  }
  return userId;
};

export const EmojiReactions: React.FC<EmojiReactionsProps> = ({
  reactions = [],
  currentUserId,
  onAddReaction,
  onRemoveReaction,
  nodeWidth = 200,
  compact = false,
  getUserName = defaultGetUserName
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [pickerPosition, setPickerPosition] = useState({ x: 0, y: 0 });
  const [hoveredReaction, setHoveredReaction] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);

  // Calculate picker position when opening
  const openPicker = useCallback(() => {
    if (addButtonRef.current) {
      const rect = addButtonRef.current.getBoundingClientRect();
      // Position picker above the button, or below if near top of screen
      const pickerHeight = 360;
      const spaceAbove = rect.top;
      const spaceBelow = window.innerHeight - rect.bottom;

      let y: number;
      if (spaceAbove > pickerHeight || spaceAbove > spaceBelow) {
        y = rect.top - pickerHeight - 8;
      } else {
        y = rect.bottom + 8;
      }

      // Center horizontally, but keep within viewport
      let x = rect.left + rect.width / 2 - 140; // 140 = picker width / 2
      x = Math.max(8, Math.min(x, window.innerWidth - 288));

      setPickerPosition({ x, y: Math.max(8, y) });
    }
    setShowPicker(true);
  }, []);

  // Handle clicking a reaction pill to toggle
  const handleReactionClick = (emoji: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const reaction = reactions.find((r) => r.emoji === emoji);
    if (reaction?.userIds.includes(currentUserId)) {
      onRemoveReaction(emoji);
    } else {
      onAddReaction(emoji);
    }
  };

  // Handle selecting emoji from picker
  const handleSelectEmoji = (emoji: string) => {
    onAddReaction(emoji);
    setShowPicker(false);
  };

  // Close picker on scroll or resize
  useEffect(() => {
    const handleClose = () => setShowPicker(false);
    if (showPicker) {
      window.addEventListener('scroll', handleClose, true);
      window.addEventListener('resize', handleClose);
      return () => {
        window.removeEventListener('scroll', handleClose, true);
        window.removeEventListener('resize', handleClose);
      };
    }
  }, [showPicker]);

  // Filter out reactions with no users
  const activeReactions = reactions.filter((r) => r.userIds.length > 0);

  // Check if current user has reacted with a specific emoji
  const hasUserReacted = (emoji: string): boolean => {
    const reaction = reactions.find((r) => r.emoji === emoji);
    return reaction?.userIds.includes(currentUserId) ?? false;
  };

  // Get tooltip text for a reaction
  const getReactionTooltip = (reaction: Reaction): string => {
    const names = reaction.userIds.map(getUserName);
    if (names.length === 0) return '';
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} and ${names[1]}`;
    if (names.length === 3) return `${names[0]}, ${names[1]}, and ${names[2]}`;
    return `${names[0]}, ${names[1]}, and ${names.length - 2} others`;
  };

  // Show add button always if there are no reactions, or on hover
  const showAddButton = isHovered || activeReactions.length === 0;

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setHoveredReaction(null);
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Reactions row */}
      <div
        className={`flex flex-wrap items-center gap-1 ${compact ? 'mt-1' : 'mt-2'}`}
        style={{ maxWidth: nodeWidth }}
      >
        <AnimatePresence mode="popLayout">
          {activeReactions.map((reaction) => (
            <motion.div
              key={reaction.emoji}
              layout
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="relative"
              onMouseEnter={() => setHoveredReaction(reaction.emoji)}
              onMouseLeave={() => setHoveredReaction(null)}
            >
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => handleReactionClick(reaction.emoji, e)}
                className={`
                  flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs
                  transition-all duration-150 cursor-pointer select-none
                  ${
                    hasUserReacted(reaction.emoji)
                      ? 'bg-navy-100 border-2 border-navy-400 text-navy-800'
                      : 'bg-gray-100 border-2 border-transparent hover:bg-gray-200 text-gray-700'
                  }
                `}
              >
                <span className={compact ? 'text-sm' : 'text-base'}>{reaction.emoji}</span>
                <span className={`font-medium ${compact ? 'text-[10px]' : 'text-xs'}`}>
                  {reaction.userIds.length}
                </span>
              </motion.button>

              {/* Tooltip showing who reacted */}
              <AnimatePresence>
                {hoveredReaction === reaction.emoji && reaction.userIds.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1
                               bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap z-50
                               shadow-lg"
                  >
                    {getReactionTooltip(reaction)}
                    {/* Tooltip arrow */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Add reaction button */}
        <AnimatePresence>
          {showAddButton && (
            <motion.button
              ref={addButtonRef}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              whileHover={{ scale: 1.1, backgroundColor: '#e5e7eb' }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              onClick={(e) => {
                e.stopPropagation();
                openPicker();
              }}
              className={`
                flex items-center justify-center rounded-full
                bg-gray-100 hover:bg-gray-200 text-gray-500
                transition-colors cursor-pointer border-2 border-dashed border-gray-300
                ${compact ? 'w-6 h-6' : 'w-7 h-7'}
              `}
              title="Add reaction"
            >
              <Plus className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Emoji picker portal */}
      <EmojiPicker
        isOpen={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={handleSelectEmoji}
        position={pickerPosition}
      />
    </div>
  );
};

export default EmojiReactions;
