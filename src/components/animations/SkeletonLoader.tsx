/**
 * Skeleton Loader Component
 *
 * Animated skeleton placeholders for loading states.
 * Provides visual feedback while content loads.
 * Respects prefers-reduced-motion for accessibility.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { prefersReducedMotion } from './config';

interface SkeletonProps {
  /** Width of the skeleton */
  width?: string | number;
  /** Height of the skeleton */
  height?: string | number;
  /** Border radius */
  borderRadius?: string | number;
  /** Custom className */
  className?: string;
  /** Variant style */
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width,
  height,
  borderRadius,
  className = '',
  variant = 'text',
}) => {
  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'circular':
        return {
          width: width ?? 40,
          height: height ?? 40,
          borderRadius: '50%',
        };
      case 'rectangular':
        return {
          width: width ?? '100%',
          height: height ?? 100,
          borderRadius: borderRadius ?? 0,
        };
      case 'rounded':
        return {
          width: width ?? '100%',
          height: height ?? 100,
          borderRadius: borderRadius ?? 8,
        };
      case 'text':
      default:
        return {
          width: width ?? '100%',
          height: height ?? 16,
          borderRadius: borderRadius ?? 4,
        };
    }
  };

  const styles = getVariantStyles();
  const reducedMotion = prefersReducedMotion();

  return (
    <motion.div
      className={`bg-gray-200 ${className}`}
      style={styles}
      animate={
        reducedMotion
          ? { opacity: 0.7 }
          : {
              backgroundPosition: ['200% 0', '-200% 0'],
            }
      }
      transition={
        reducedMotion
          ? undefined
          : {
              duration: 1.5,
              repeat: Infinity,
              ease: 'linear',
            }
      }
      initial={{
        background: reducedMotion
          ? 'rgb(229 231 235)'
          : 'linear-gradient(90deg, rgb(229 231 235) 25%, rgb(243 244 246) 50%, rgb(229 231 235) 75%)',
        backgroundSize: '200% 100%',
      }}
    />
  );
};

// Skeleton for text content with multiple lines
interface SkeletonTextProps {
  /** Number of lines */
  lines?: number;
  /** Width of the last line (percentage) */
  lastLineWidth?: string;
  /** Line height */
  lineHeight?: number;
  /** Gap between lines */
  gap?: number;
  /** Custom className */
  className?: string;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({
  lines = 3,
  lastLineWidth = '60%',
  lineHeight = 16,
  gap = 8,
  className = '',
}) => {
  return (
    <div className={`space-y-2 ${className}`} style={{ gap }}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          variant="text"
          height={lineHeight}
          width={index === lines - 1 ? lastLineWidth : '100%'}
        />
      ))}
    </div>
  );
};

// Skeleton for card content
interface SkeletonCardProps {
  /** Show image placeholder */
  hasImage?: boolean;
  /** Image height */
  imageHeight?: number;
  /** Number of text lines */
  textLines?: number;
  /** Custom className */
  className?: string;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  hasImage = true,
  imageHeight = 200,
  textLines = 3,
  className = '',
}) => {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 overflow-hidden ${className}`}>
      {hasImage && <Skeleton variant="rectangular" height={imageHeight} />}
      <div className="p-4 space-y-3">
        <Skeleton variant="text" height={20} width="70%" />
        <SkeletonText lines={textLines} />
      </div>
    </div>
  );
};

// Skeleton for avatar with text
interface SkeletonAvatarProps {
  /** Avatar size */
  size?: number;
  /** Show text lines beside avatar */
  withText?: boolean;
  /** Number of text lines */
  textLines?: number;
  /** Custom className */
  className?: string;
}

export const SkeletonAvatar: React.FC<SkeletonAvatarProps> = ({
  size = 40,
  withText = true,
  textLines = 2,
  className = '',
}) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Skeleton variant="circular" width={size} height={size} />
      {withText && (
        <div className="flex-1 space-y-2">
          {Array.from({ length: textLines }).map((_, index) => (
            <Skeleton
              key={index}
              variant="text"
              height={index === 0 ? 16 : 12}
              width={index === 0 ? '60%' : '40%'}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Skeleton for table rows
interface SkeletonTableProps {
  /** Number of rows */
  rows?: number;
  /** Number of columns */
  columns?: number;
  /** Custom className */
  className?: string;
}

export const SkeletonTable: React.FC<SkeletonTableProps> = ({
  rows = 5,
  columns = 4,
  className = '',
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header */}
      <div className="flex gap-4 pb-3 border-b border-gray-200">
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={index} variant="text" height={14} width={`${80 + Math.random() * 40}px`} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 py-2">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              variant="text"
              height={16}
              width={`${60 + Math.random() * 60}px`}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

// Skeleton for sticky note
interface SkeletonStickyProps {
  /** Custom className */
  className?: string;
}

export const SkeletonSticky: React.FC<SkeletonStickyProps> = ({ className = '' }) => {
  return (
    <div
      className={`w-48 h-36 bg-yellow-100 rounded-lg shadow-sm p-3 ${className}`}
      style={{ animation: 'pulse 2s infinite' }}
    >
      <SkeletonText lines={3} lineHeight={12} />
    </div>
  );
};

// Skeleton for canvas node
interface SkeletonNodeProps {
  /** Node type */
  type?: 'sticky' | 'shape' | 'frame' | 'text';
  /** Custom className */
  className?: string;
}

export const SkeletonNode: React.FC<SkeletonNodeProps> = ({ type = 'sticky', className = '' }) => {
  const getNodeStyles = (): React.CSSProperties => {
    switch (type) {
      case 'shape':
        return { width: 120, height: 120, borderRadius: 8 };
      case 'frame':
        return { width: 300, height: 200, borderRadius: 12 };
      case 'text':
        return { width: 200, height: 40, borderRadius: 4 };
      case 'sticky':
      default:
        return { width: 180, height: 140, borderRadius: 8 };
    }
  };

  const styles = getNodeStyles();

  return (
    <div
      className={`bg-gray-100 border border-gray-200 ${className}`}
      style={{
        ...styles,
        animation: prefersReducedMotion() ? undefined : 'pulse 2s infinite',
      }}
    >
      <div className="p-3 h-full">
        <SkeletonText lines={type === 'text' ? 1 : 3} lineHeight={10} />
      </div>
    </div>
  );
};

export default Skeleton;
