/**
 * Animation Configuration
 *
 * Consistent easing curves, timing, and motion settings for the entire app.
 * Respects prefers-reduced-motion for accessibility.
 */

import { Variants } from 'framer-motion';

// Check if user prefers reduced motion
export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// Easing curves - consistent across all animations
export const easings = {
  // Standard easing for most animations
  standard: [0.4, 0, 0.2, 1] as const,
  // Decelerate - enter screen
  decelerate: [0, 0, 0.2, 1] as const,
  // Accelerate - leave screen
  accelerate: [0.4, 0, 1, 1] as const,
  // Bouncy - playful interactions
  bounce: [0.68, -0.55, 0.265, 1.55] as const,
  // Spring-like - natural feeling
  spring: [0.34, 1.56, 0.64, 1] as const,
  // Smooth - subtle transitions
  smooth: [0.25, 0.1, 0.25, 1] as const,
} as const;

// Duration presets in seconds
export const durations = {
  instant: 0.1,
  fast: 0.15,
  normal: 0.2,
  slow: 0.3,
  slower: 0.4,
  entrance: 0.25,
  exit: 0.2,
} as const;

// Spring configurations for Framer Motion (values only, no type)
export const springValues = {
  // Snappy - quick and responsive
  snappy: { stiffness: 400, damping: 30 } as const,
  // Bouncy - playful with overshoot
  bouncy: { stiffness: 300, damping: 15 } as const,
  // Gentle - smooth and subtle
  gentle: { stiffness: 200, damping: 20 } as const,
  // Soft - very gentle
  soft: { stiffness: 150, damping: 25 } as const,
} as const;

// Full spring configurations with type
export const springs = {
  snappy: { type: 'spring' as const, ...springValues.snappy },
  bouncy: { type: 'spring' as const, ...springValues.bouncy },
  gentle: { type: 'spring' as const, ...springValues.gentle },
  soft: { type: 'spring' as const, ...springValues.soft },
} as const;

// Transition presets
export const transitions = {
  // Default transition
  default: {
    type: 'tween',
    duration: durations.normal,
    ease: easings.standard,
  },
  // Quick snap transition
  snap: {
    type: 'tween',
    duration: durations.fast,
    ease: easings.standard,
  },
  // Smooth transition for color changes
  smooth: {
    type: 'tween',
    duration: durations.normal,
    ease: easings.smooth,
  },
  // Bouncy entrance
  popIn: {
    ...springs.bouncy,
  },
  // Snappy interaction
  snappy: {
    ...springs.snappy,
  },
  // Gentle movement
  gentle: {
    ...springs.gentle,
  },
} as const;

// Common animation variants
export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: transitions.default,
  },
  exit: {
    opacity: 0,
    transition: { duration: durations.exit },
  },
};

export const scaleVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: transitions.popIn,
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    transition: { duration: durations.exit },
  },
};

export const slideUpVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitions.gentle,
  },
  exit: {
    opacity: 0,
    y: 10,
    transition: { duration: durations.exit },
  },
};

export const slideDownVariants: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitions.gentle,
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: durations.exit },
  },
};

export const slideLeftVariants: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: transitions.gentle,
  },
  exit: {
    opacity: 0,
    x: 20,
    transition: { duration: durations.exit },
  },
};

export const slideRightVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: transitions.gentle,
  },
  exit: {
    opacity: 0,
    x: -20,
    transition: { duration: durations.exit },
  },
};

// Node animation variants
export const nodeCreateVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.5,
    rotate: -5,
  },
  visible: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: {
      type: 'spring',
      stiffness: 260,
      damping: 20,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.5,
    transition: { duration: 0.15 },
  },
};

export const nodeDragVariants: Variants = {
  idle: {
    scale: 1,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  dragging: {
    scale: 1.02,
    boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
    transition: transitions.snappy,
  },
};

// Button hover animation variants
export const buttonHoverVariants: Variants = {
  idle: {
    scale: 1,
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
  hover: {
    scale: 1.03,
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    transition: transitions.snappy,
  },
  tap: {
    scale: 0.97,
    transition: { duration: 0.1 },
  },
};

// Get transition respecting reduced motion preference
export const getTransition = (transition: typeof transitions[keyof typeof transitions]) => {
  if (prefersReducedMotion()) {
    return { duration: 0 };
  }
  return transition;
};

// Get variants respecting reduced motion preference
export const getVariants = (variants: Variants): Variants => {
  if (prefersReducedMotion()) {
    return {
      hidden: { opacity: 0 },
      visible: { opacity: 1 },
      exit: { opacity: 0 },
    };
  }
  return variants;
};
