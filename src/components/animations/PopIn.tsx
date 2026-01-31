/**
 * PopIn Animation Component
 *
 * Bouncy pop-in animation wrapper for elements entering the screen.
 * Perfect for modals, tooltips, dropdowns, and new content.
 * Respects prefers-reduced-motion for accessibility.
 */

import React from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { prefersReducedMotion, springs } from './config';

type PopInDirection = 'center' | 'top' | 'bottom' | 'left' | 'right';
type PopInSize = 'small' | 'medium' | 'large';

interface PopInProps {
  /** Whether the element is visible */
  isVisible?: boolean;
  /** Children to animate */
  children: React.ReactNode;
  /** Direction of the pop-in animation */
  direction?: PopInDirection;
  /** Size of the animation (affects distance) */
  size?: PopInSize;
  /** Delay before animation starts (in seconds) */
  delay?: number;
  /** Custom className */
  className?: string;
  /** Animation complete callback */
  onAnimationComplete?: () => void;
  /** Enable exit animation */
  exitAnimation?: boolean;
}

const getOffset = (direction: PopInDirection, size: PopInSize): { x: number; y: number } => {
  const distances: Record<PopInSize, number> = {
    small: 10,
    medium: 20,
    large: 40,
  };

  const distance = distances[size];

  switch (direction) {
    case 'top':
      return { x: 0, y: -distance };
    case 'bottom':
      return { x: 0, y: distance };
    case 'left':
      return { x: -distance, y: 0 };
    case 'right':
      return { x: distance, y: 0 };
    case 'center':
    default:
      return { x: 0, y: 0 };
  }
};

const getVariants = (direction: PopInDirection, size: PopInSize, delay: number): Variants => {
  const offset = getOffset(direction, size);

  if (prefersReducedMotion()) {
    return {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { delay } },
      exit: { opacity: 0 },
    };
  }

  return {
    hidden: {
      opacity: 0,
      scale: direction === 'center' ? 0.8 : 0.95,
      x: offset.x,
      y: offset.y,
    },
    visible: {
      opacity: 1,
      scale: 1,
      x: 0,
      y: 0,
      transition: {
        ...springs.bouncy,
        delay,
      },
    },
    exit: {
      opacity: 0,
      scale: direction === 'center' ? 0.9 : 0.98,
      x: offset.x * 0.5,
      y: offset.y * 0.5,
      transition: {
        duration: 0.15,
        ease: 'easeIn',
      },
    },
  };
};

export const PopIn: React.FC<PopInProps> = ({
  isVisible = true,
  children,
  direction = 'center',
  size = 'medium',
  delay = 0,
  className = '',
  onAnimationComplete,
  exitAnimation = true,
}) => {
  const variants = getVariants(direction, size, delay);

  if (!exitAnimation) {
    // Without AnimatePresence, just render motion div
    return (
      <motion.div
        initial="hidden"
        animate={isVisible ? 'visible' : 'hidden'}
        variants={variants}
        className={className}
        onAnimationComplete={onAnimationComplete}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={variants}
          className={className}
          onAnimationComplete={onAnimationComplete}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Stagger children variant for lists
interface PopInListProps {
  /** Whether the list is visible */
  isVisible?: boolean;
  /** Children to animate */
  children: React.ReactNode;
  /** Stagger delay between items (in seconds) */
  staggerDelay?: number;
  /** Initial delay before first item (in seconds) */
  initialDelay?: number;
  /** Custom className */
  className?: string;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.03,
      staggerDirection: -1,
    },
  },
};

const itemVariants: Variants = prefersReducedMotion()
  ? {
      hidden: { opacity: 0 },
      visible: { opacity: 1 },
      exit: { opacity: 0 },
    }
  : {
      hidden: { opacity: 0, y: 20, scale: 0.95 },
      visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
          ...springs.snappy,
        },
      },
      exit: {
        opacity: 0,
        y: -10,
        scale: 0.98,
        transition: { duration: 0.15 },
      },
    };

export const PopInList: React.FC<PopInListProps> = ({
  isVisible = true,
  children,
  staggerDelay = 0.05,
  initialDelay = 0,
  className = '',
}) => {
  const customContainerVariants: Variants = {
    ...containerVariants,
    visible: {
      ...containerVariants.visible,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: initialDelay,
      },
    },
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={customContainerVariants}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const PopInItem: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <motion.div variants={itemVariants} className={className}>
    {children}
  </motion.div>
);

export default PopIn;
