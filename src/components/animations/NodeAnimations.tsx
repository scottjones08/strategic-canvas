/**
 * Node Animation Components
 *
 * Pre-built animations for canvas nodes:
 * - Creation: bouncy pop-in animation
 * - Deletion: scale down and fade out
 * - Dragging: shadow elevation effect
 * - Selection: subtle pulse/glow
 * - Hover: gentle scale
 */

import React, { forwardRef } from 'react';
import { motion, AnimatePresence, Variants, TargetAndTransition } from 'framer-motion';
import { prefersReducedMotion, springs } from './config';

// Animation variants for node creation
export const nodeCreationVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.5,
    y: 20,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 20,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    transition: {
      duration: 0.15,
      ease: 'easeIn',
    },
  },
};

// Reduced motion variants
export const nodeCreationVariantsReduced: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.1 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

// Animation for sticky notes (with slight rotation wiggle)
export const stickyNoteVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.5,
    rotate: -10,
    y: 30,
  },
  visible: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 260,
      damping: 20,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.6,
    rotate: 5,
    y: -10,
    transition: {
      duration: 0.2,
      ease: 'easeIn',
    },
  },
};

// Animation for shapes
export const shapeVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25,
    },
  },
  exit: {
    opacity: 0,
    scale: 0,
    transition: {
      duration: 0.15,
    },
  },
};

// Animation for text nodes
export const textNodeVariants: Variants = {
  hidden: {
    opacity: 0,
    x: -10,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 25,
    },
  },
  exit: {
    opacity: 0,
    x: 10,
    transition: {
      duration: 0.15,
    },
  },
};

// Animation for frames
export const frameVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.9,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 200,
      damping: 20,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: {
      duration: 0.2,
    },
  },
};

// Get variants based on node type
export const getNodeVariants = (nodeType: string): Variants => {
  if (prefersReducedMotion()) {
    return nodeCreationVariantsReduced;
  }

  switch (nodeType) {
    case 'sticky':
      return stickyNoteVariants;
    case 'shape':
      return shapeVariants;
    case 'text':
      return textNodeVariants;
    case 'frame':
      return frameVariants;
    default:
      return nodeCreationVariants;
  }
};

// Drag state styles
export const getDragStyles = (isDragging: boolean): React.CSSProperties => {
  if (prefersReducedMotion()) {
    return {};
  }

  return isDragging
    ? {
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 10px 20px rgba(0, 0, 0, 0.1)',
        transform: 'scale(1.02)',
        transition: 'box-shadow 0.2s ease, transform 0.2s ease',
      }
    : {
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        transform: 'scale(1)',
        transition: 'box-shadow 0.2s ease, transform 0.2s ease',
      };
};

// Selection glow styles
export const getSelectionStyles = (isSelected: boolean): React.CSSProperties => {
  if (!isSelected) return {};

  return {
    outline: '2px solid #6366f1',
    outlineOffset: '2px',
  };
};

// Animated node wrapper component
interface AnimatedNodeProps {
  /** Node ID for key */
  nodeId: string;
  /** Node type for animation variant */
  nodeType: string;
  /** Whether node is being dragged */
  isDragging?: boolean;
  /** Whether node is selected */
  isSelected?: boolean;
  /** Whether node is newly created (trigger animation) */
  isNew?: boolean;
  /** Children to wrap */
  children: React.ReactNode;
  /** Custom className */
  className?: string;
  /** Style overrides */
  style?: React.CSSProperties;
  /** Animation complete callback */
  onAnimationComplete?: () => void;
}

export const AnimatedNode = forwardRef<HTMLDivElement, AnimatedNodeProps>(
  (
    {
      nodeId,
      nodeType,
      isDragging = false,
      isSelected = false,
      isNew = false,
      children,
      className = '',
      style = {},
      onAnimationComplete,
    },
    ref
  ) => {
    const variants = getNodeVariants(nodeType);
    const dragStyles = getDragStyles(isDragging);
    const selectionStyles = getSelectionStyles(isSelected);
    const reducedMotion = prefersReducedMotion();

    // Hover animation
    const hoverAnimation: TargetAndTransition | undefined =
      !reducedMotion && !isDragging
        ? {
            scale: 1.01,
            transition: { type: 'spring', stiffness: 400, damping: 25 },
          }
        : undefined;

    // Tap animation
    const tapAnimation: TargetAndTransition | undefined =
      !reducedMotion
        ? {
            scale: 0.99,
            transition: { duration: 0.1 },
          }
        : undefined;

    return (
      <motion.div
        ref={ref}
        layout={!reducedMotion}
        layoutId={!reducedMotion ? nodeId : undefined}
        initial={isNew ? 'hidden' : false}
        animate="visible"
        exit="exit"
        variants={variants}
        whileHover={hoverAnimation}
        whileTap={tapAnimation}
        className={className}
        style={{
          ...style,
          ...dragStyles,
          ...selectionStyles,
        }}
        onAnimationComplete={onAnimationComplete}
      >
        {children}
      </motion.div>
    );
  }
);

AnimatedNode.displayName = 'AnimatedNode';

// Animated node list container
interface AnimatedNodeListProps {
  /** Children (AnimatedNode components) */
  children: React.ReactNode;
}

export const AnimatedNodeList: React.FC<AnimatedNodeListProps> = ({ children }) => {
  return <AnimatePresence mode="popLayout">{children}</AnimatePresence>;
};

// Selection highlight animation
interface SelectionHighlightProps {
  /** Whether visible */
  isVisible: boolean;
  /** Bounding box */
  bounds: { x: number; y: number; width: number; height: number };
}

export const SelectionHighlight: React.FC<SelectionHighlightProps> = ({ isVisible, bounds }) => {
  if (prefersReducedMotion()) {
    return isVisible ? (
      <div
        className="absolute pointer-events-none border-2 border-indigo-500 border-dashed"
        style={{
          left: bounds.x,
          top: bounds.y,
          width: bounds.width,
          height: bounds.height,
        }}
      />
    ) : null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="absolute pointer-events-none border-2 border-indigo-500 border-dashed rounded-lg"
          style={{
            left: bounds.x - 4,
            top: bounds.y - 4,
            width: bounds.width + 8,
            height: bounds.height + 8,
          }}
        />
      )}
    </AnimatePresence>
  );
};

// Lasso selection animation
interface LassoSelectionProps {
  /** Start point */
  start: { x: number; y: number };
  /** Current point */
  current: { x: number; y: number };
  /** Whether active */
  isActive: boolean;
}

export const LassoSelection: React.FC<LassoSelectionProps> = ({ start, current, isActive }) => {
  if (!isActive) return null;

  const x = Math.min(start.x, current.x);
  const y = Math.min(start.y, current.y);
  const width = Math.abs(current.x - start.x);
  const height = Math.abs(current.y - start.y);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute pointer-events-none"
      style={{
        left: x,
        top: y,
        width,
        height,
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        border: '1px solid rgba(99, 102, 241, 0.5)',
        borderRadius: 4,
      }}
    />
  );
};

export default AnimatedNode;
