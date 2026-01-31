/**
 * SlideReveal Animation Component
 *
 * Smooth slide reveal animation for lists and content.
 * Perfect for sidebars, menus, and sequential content.
 * Respects prefers-reduced-motion for accessibility.
 */

import React from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { prefersReducedMotion, durations, springs, springValues } from './config';

type SlideDirection = 'up' | 'down' | 'left' | 'right';

interface SlideRevealProps {
  /** Whether the element is visible */
  isVisible?: boolean;
  /** Children to animate */
  children: React.ReactNode;
  /** Direction of the slide */
  direction?: SlideDirection;
  /** Distance to slide (in pixels) */
  distance?: number;
  /** Duration of animation (in seconds) */
  duration?: number;
  /** Delay before animation starts (in seconds) */
  delay?: number;
  /** Use spring animation instead of tween */
  spring?: boolean;
  /** Custom className */
  className?: string;
  /** Animation complete callback */
  onAnimationComplete?: () => void;
}

const getSlideOffset = (direction: SlideDirection, distance: number): { x: number; y: number } => {
  switch (direction) {
    case 'up':
      return { x: 0, y: distance };
    case 'down':
      return { x: 0, y: -distance };
    case 'left':
      return { x: distance, y: 0 };
    case 'right':
      return { x: -distance, y: 0 };
  }
};

export const SlideReveal: React.FC<SlideRevealProps> = ({
  isVisible = true,
  children,
  direction = 'up',
  distance = 20,
  duration = durations.normal,
  delay = 0,
  spring = false,
  className = '',
  onAnimationComplete,
}) => {
  const offset = getSlideOffset(direction, distance);

  const variants: Variants = prefersReducedMotion()
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { delay } },
        exit: { opacity: 0 },
      }
    : {
        hidden: {
          opacity: 0,
          x: offset.x,
          y: offset.y,
        },
        visible: {
          opacity: 1,
          x: 0,
          y: 0,
          transition: spring
            ? { type: 'spring', ...springValues.gentle, delay }
            : { duration, ease: [0.25, 0.1, 0.25, 1], delay },
        },
        exit: {
          opacity: 0,
          x: offset.x * 0.5,
          y: offset.y * 0.5,
          transition: { duration: duration * 0.75 },
        },
      };

  return (
    <AnimatePresence>
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

// Collapsible slide for accordions and expandable sections
interface SlideCollapseProps {
  /** Whether the content is expanded */
  isExpanded: boolean;
  /** Children to animate */
  children: React.ReactNode;
  /** Duration of animation (in seconds) */
  duration?: number;
  /** Custom className */
  className?: string;
}

export const SlideCollapse: React.FC<SlideCollapseProps> = ({
  isExpanded,
  children,
  duration = 0.3,
  className = '',
}) => {
  if (prefersReducedMotion()) {
    return isExpanded ? <div className={className}>{children}</div> : null;
  }

  return (
    <AnimatePresence initial={false}>
      {isExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{
            height: 'auto',
            opacity: 1,
            transition: {
              height: { duration },
              opacity: { duration: duration * 0.5, delay: duration * 0.25 },
            },
          }}
          exit={{
            height: 0,
            opacity: 0,
            transition: {
              height: { duration: duration * 0.75 },
              opacity: { duration: duration * 0.25 },
            },
          }}
          className={`overflow-hidden ${className}`}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Slide reveal for lists with stagger
interface SlideRevealListProps {
  /** Whether the list is visible */
  isVisible?: boolean;
  /** Children items */
  children: React.ReactNode;
  /** Direction of slide */
  direction?: SlideDirection;
  /** Stagger delay between items (in seconds) */
  staggerDelay?: number;
  /** Initial delay before first item (in seconds) */
  initialDelay?: number;
  /** Custom className */
  className?: string;
}

export const SlideRevealList: React.FC<SlideRevealListProps> = ({
  isVisible = true,
  children,
  direction = 'up',
  staggerDelay = 0.05,
  initialDelay = 0,
  className = '',
}) => {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: initialDelay,
      },
    },
    exit: {
      opacity: 0,
      transition: {
        staggerChildren: staggerDelay * 0.5,
        staggerDirection: -1,
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
          variants={containerVariants}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

interface SlideRevealItemProps {
  /** Children */
  children: React.ReactNode;
  /** Direction of slide */
  direction?: SlideDirection;
  /** Distance to slide */
  distance?: number;
  /** Custom className */
  className?: string;
}

export const SlideRevealItem: React.FC<SlideRevealItemProps> = ({
  children,
  direction = 'up',
  distance = 15,
  className = '',
}) => {
  const offset = getSlideOffset(direction, distance);

  const itemVariants: Variants = prefersReducedMotion()
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : {
        hidden: {
          opacity: 0,
          x: offset.x,
          y: offset.y,
        },
        visible: {
          opacity: 1,
          x: 0,
          y: 0,
          transition: springs.snappy,
        },
        exit: {
          opacity: 0,
          x: offset.x * 0.5,
          y: offset.y * 0.5,
          transition: { duration: 0.15 },
        },
      };

  return (
    <motion.div variants={itemVariants} className={className}>
      {children}
    </motion.div>
  );
};

export default SlideReveal;
