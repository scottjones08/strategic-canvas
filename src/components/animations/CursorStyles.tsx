/**
 * Cursor Styles Component
 *
 * Custom cursor states for different tools and interactions.
 * Provides visual feedback for canvas operations.
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { prefersReducedMotion } from './config';

// Cursor types
export type CursorType =
  | 'default'
  | 'pointer'
  | 'grab'
  | 'grabbing'
  | 'crosshair'
  | 'text'
  | 'move'
  | 'resize-ns'
  | 'resize-ew'
  | 'resize-nesw'
  | 'resize-nwse'
  | 'not-allowed'
  | 'drawing'
  | 'eraser'
  | 'zoom-in'
  | 'zoom-out';

// CSS cursor values
const cursorCSS: Record<CursorType, string> = {
  default: 'default',
  pointer: 'pointer',
  grab: 'grab',
  grabbing: 'grabbing',
  crosshair: 'crosshair',
  text: 'text',
  move: 'move',
  'resize-ns': 'ns-resize',
  'resize-ew': 'ew-resize',
  'resize-nesw': 'nesw-resize',
  'resize-nwse': 'nwse-resize',
  'not-allowed': 'not-allowed',
  drawing: 'crosshair',
  eraser: 'crosshair',
  'zoom-in': 'zoom-in',
  'zoom-out': 'zoom-out',
};

// Context for cursor management
interface CursorContextType {
  cursor: CursorType;
  setCursor: (cursor: CursorType) => void;
  resetCursor: () => void;
}

const CursorContext = createContext<CursorContextType | null>(null);

// Provider component
export const CursorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cursor, setCursorState] = useState<CursorType>('default');
  const [cursorStack, setCursorStack] = useState<CursorType[]>(['default']);

  const setCursor = useCallback((newCursor: CursorType) => {
    setCursorState(newCursor);
    setCursorStack((prev) => [...prev, newCursor]);
  }, []);

  const resetCursor = useCallback(() => {
    setCursorStack((prev) => {
      if (prev.length > 1) {
        const newStack = prev.slice(0, -1);
        setCursorState(newStack[newStack.length - 1]);
        return newStack;
      }
      setCursorState('default');
      return ['default'];
    });
  }, []);

  // Apply cursor to document body
  useEffect(() => {
    document.body.style.cursor = cursorCSS[cursor];
    return () => {
      document.body.style.cursor = 'default';
    };
  }, [cursor]);

  return (
    <CursorContext.Provider value={{ cursor, setCursor, resetCursor }}>
      {children}
    </CursorContext.Provider>
  );
};

// Hook for cursor management
export const useCursor = (): CursorContextType => {
  const context = useContext(CursorContext);
  if (!context) {
    // Return a fallback if not in provider (for standalone usage)
    return {
      cursor: 'default',
      setCursor: () => {},
      resetCursor: () => {},
    };
  }
  return context;
};

// Hook for cursor on hover
export const useCursorHover = (hoverCursor: CursorType) => {
  const { setCursor, resetCursor } = useCursor();

  const onMouseEnter = useCallback(() => {
    setCursor(hoverCursor);
  }, [setCursor, hoverCursor]);

  const onMouseLeave = useCallback(() => {
    resetCursor();
  }, [resetCursor]);

  return { onMouseEnter, onMouseLeave };
};

// Custom cursor component (optional visual cursor)
interface CustomCursorProps {
  /** Enable custom cursor visual */
  enabled?: boolean;
  /** Cursor color */
  color?: string;
  /** Cursor size */
  size?: number;
}

export const CustomCursor: React.FC<CustomCursorProps> = ({
  enabled = false,
  color = '#6366f1',
  size = 20,
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const { cursor } = useCursor();

  useEffect(() => {
    if (!enabled || prefersReducedMotion()) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      setIsVisible(true);
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    const handleMouseDown = () => {
      setIsClicking(true);
    };

    const handleMouseUp = () => {
      setIsClicking(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [enabled]);

  if (!enabled || prefersReducedMotion()) return null;

  // Hide custom cursor for certain cursor types
  const hiddenCursors: CursorType[] = ['text', 'default', 'pointer', 'not-allowed'];
  if (hiddenCursors.includes(cursor)) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed pointer-events-none z-[9999]"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{
            opacity: 1,
            scale: isClicking ? 0.8 : 1,
            x: position.x - size / 2,
            y: position.y - size / 2,
          }}
          exit={{ opacity: 0, scale: 0.5 }}
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 28,
            mass: 0.5,
          }}
          style={{
            width: size,
            height: size,
          }}
        >
          {/* Cursor ring */}
          <motion.div
            className="absolute inset-0 rounded-full border-2"
            style={{ borderColor: color }}
            animate={{
              scale: isClicking ? 0.9 : 1,
            }}
            transition={{ duration: 0.1 }}
          />
          {/* Cursor dot */}
          <motion.div
            className="absolute rounded-full"
            style={{
              backgroundColor: color,
              top: '50%',
              left: '50%',
              width: 4,
              height: 4,
              marginTop: -2,
              marginLeft: -2,
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Cursor feedback indicator
interface CursorFeedbackProps {
  /** X position */
  x: number;
  /** Y position */
  y: number;
  /** Whether to show */
  show: boolean;
  /** Feedback type */
  type?: 'click' | 'drop' | 'create';
}

export const CursorFeedback: React.FC<CursorFeedbackProps> = ({
  x,
  y,
  show,
  type = 'click',
}) => {
  if (prefersReducedMotion()) return null;

  const colors: Record<string, string> = {
    click: 'rgba(99, 102, 241, 0.3)',
    drop: 'rgba(16, 185, 129, 0.3)',
    create: 'rgba(245, 158, 11, 0.3)',
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed pointer-events-none z-[9998]"
          style={{ left: x, top: y }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 2] }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <div
            className="w-10 h-10 -ml-5 -mt-5 rounded-full"
            style={{ backgroundColor: colors[type] }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// CSS styles to inject
export const cursorStyles = `
  /* Hide default cursor when custom cursor is active */
  .custom-cursor-active * {
    cursor: none !important;
  }

  /* Tool-specific cursor styles */
  .cursor-select { cursor: default; }
  .cursor-hand { cursor: grab; }
  .cursor-hand-grabbing { cursor: grabbing; }
  .cursor-draw { cursor: crosshair; }
  .cursor-text { cursor: text; }
  .cursor-move { cursor: move; }
  .cursor-resize-nw { cursor: nwse-resize; }
  .cursor-resize-ne { cursor: nesw-resize; }
  .cursor-resize-sw { cursor: nesw-resize; }
  .cursor-resize-se { cursor: nwse-resize; }
  .cursor-resize-n { cursor: ns-resize; }
  .cursor-resize-s { cursor: ns-resize; }
  .cursor-resize-e { cursor: ew-resize; }
  .cursor-resize-w { cursor: ew-resize; }

  /* Interactive element cursors */
  .cursor-interactive:hover {
    cursor: pointer;
  }

  /* Draggable elements */
  .cursor-draggable {
    cursor: grab;
  }
  .cursor-draggable:active {
    cursor: grabbing;
  }
`;

export default CustomCursor;
