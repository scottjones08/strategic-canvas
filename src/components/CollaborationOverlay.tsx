/**
 * CollaborationOverlay Component
 * 
 * Renders live cursors and collaboration indicators on the canvas.
 * Shows other users' cursor positions with smooth animations.
 */

import React, { memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getUserInitials } from '../lib/realtime-collaboration';

interface CursorData {
  x: number;
  y: number;
  name: string;
  color: string;
}

interface CollaborationOverlayProps {
  cursors: Map<string, CursorData>;
  zoom: number;
  panX: number;
  panY: number;
  showCursors?: boolean;
}

// Individual cursor component with smooth animation
const LiveCursor = memo(({ 
  userId, 
  cursor, 
  zoom, 
  panX, 
  panY 
}: { 
  userId: string; 
  cursor: CursorData; 
  zoom: number; 
  panX: number; 
  panY: number;
}) => {
  // Calculate screen position from canvas coordinates
  const screenX = cursor.x * zoom + panX;
  const screenY = cursor.y * zoom + panY;
  const initials = getUserInitials(cursor.name);

  return (
    <motion.div
      key={userId}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ 
        opacity: 1, 
        scale: 1,
        x: screenX,
        y: screenY
      }}
      exit={{ opacity: 0, scale: 0.5 }}
      transition={{
        type: 'spring',
        damping: 30,
        stiffness: 500,
        mass: 0.5
      }}
      className="absolute top-0 left-0 pointer-events-none z-[50]"
      style={{ willChange: 'transform' }}
    >
      {/* Cursor arrow */}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        className="drop-shadow-md"
        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
      >
        <path
          d="M5.5 3.5L18.5 11.5L12.5 13L9.5 20.5L5.5 3.5Z"
          fill={cursor.color}
          stroke="white"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
      
      {/* User name label */}
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-5 left-4 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-white whitespace-nowrap shadow-lg"
        style={{ backgroundColor: cursor.color }}
      >
        <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
          {initials}
        </span>
        <span>{cursor.name}</span>
      </motion.div>
    </motion.div>
  );
});

LiveCursor.displayName = 'LiveCursor';

// Main overlay component
export const CollaborationOverlay: React.FC<CollaborationOverlayProps> = memo(({
  cursors,
  zoom,
  panX,
  panY,
  showCursors = true
}) => {
  // Convert cursors map to array for rendering
  const cursorEntries = useMemo(() => {
    return Array.from(cursors.entries());
  }, [cursors]);

  if (!showCursors || cursorEntries.length === 0) {
    return null;
  }

  return (
    <div 
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{ zIndex: 50 }}
    >
      <AnimatePresence mode="popLayout">
        {cursorEntries.map(([userId, cursor]) => (
          <LiveCursor
            key={userId}
            userId={userId}
            cursor={cursor}
            zoom={zoom}
            panX={panX}
            panY={panY}
          />
        ))}
      </AnimatePresence>
    </div>
  );
});

CollaborationOverlay.displayName = 'CollaborationOverlay';

// Edit indicator component for showing who's editing a node
export interface EditIndicatorProps {
  userName: string;
  userColor: string;
}

export const EditIndicator: React.FC<EditIndicatorProps> = memo(({ userName, userColor }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="absolute -top-6 left-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-white whitespace-nowrap shadow-md"
      style={{ backgroundColor: userColor }}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
      <span>{userName} is editing...</span>
    </motion.div>
  );
});

EditIndicator.displayName = 'EditIndicator';

// Selection indicator ring for nodes being edited
export interface SelectionRingProps {
  color: string;
  isEditing?: boolean;
}

export const SelectionRing: React.FC<SelectionRingProps> = memo(({ color, isEditing }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 rounded-lg pointer-events-none"
      style={{
        border: `2px ${isEditing ? 'solid' : 'dashed'} ${color}`,
        boxShadow: isEditing ? `0 0 0 3px ${color}30` : 'none'
      }}
    />
  );
});

SelectionRing.displayName = 'SelectionRing';

export default CollaborationOverlay;
