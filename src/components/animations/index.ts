/**
 * Animation Components - Premium micro-interactions for Strategic Canvas
 *
 * A consistent animation system using Framer Motion with:
 * - Consistent easing curves
 * - Consistent timing
 * - Motion reduce support (respects prefers-reduced-motion)
 */

// Configuration and utilities
export * from './config';

// Animation wrappers
export * from './ConfettiEffect';
export * from './RippleEffect';
export * from './PopIn';
export * from './SlideReveal';

// Loading states
export * from './SkeletonLoader';

// Interactive components
export * from './AnimatedButton';
export * from './CursorStyles';

// Sound effects
export * from './useSoundEffects';

// Node animations
export * from './NodeAnimations';

// Re-export commonly used items as named exports for convenience
export { ConfettiEffect, useConfetti } from './ConfettiEffect';
export { RippleEffect, useRipple } from './RippleEffect';
export { PopIn, PopInList, PopInItem } from './PopIn';
export { SlideReveal, SlideCollapse, SlideRevealList, SlideRevealItem } from './SlideReveal';
export {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonAvatar,
  SkeletonTable,
  SkeletonSticky,
  SkeletonNode,
} from './SkeletonLoader';
export { AnimatedButton, AnimatedIconButton } from './AnimatedButton';
export {
  CursorProvider,
  useCursor,
  useCursorHover,
  CustomCursor,
  CursorFeedback,
  cursorStyles,
} from './CursorStyles';
export { useSoundEffects, SoundEffectsProvider, useSoundEffectsContext } from './useSoundEffects';
export {
  AnimatedNode,
  AnimatedNodeList,
  SelectionHighlight,
  LassoSelection,
  getNodeVariants,
  getDragStyles,
  getSelectionStyles,
  nodeCreationVariants,
  stickyNoteVariants,
  shapeVariants,
  textNodeVariants,
  frameVariants,
} from './NodeAnimations';
