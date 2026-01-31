/**
 * AnimatedButton Component
 *
 * Enhanced button with premium micro-interactions:
 * - Subtle scale transform on hover
 * - Shadow elevation on hover
 * - Smooth color transitions
 * - Ripple effect on click
 * - Loading state support
 * - Respects prefers-reduced-motion
 */

import React, { useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { prefersReducedMotion, transitions } from './config';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg';

// Exclude conflicting event handlers between React and Framer Motion
type HTMLButtonPropsWithoutAnimation = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'onAnimationStart' | 'onAnimationEnd' | 'onDrag' | 'onDragEnd' | 'onDragStart'
>;

interface AnimatedButtonProps extends HTMLButtonPropsWithoutAnimation {
  /** Button variant */
  variant?: ButtonVariant;
  /** Button size */
  size?: ButtonSize;
  /** Loading state */
  isLoading?: boolean;
  /** Left icon */
  leftIcon?: React.ReactNode;
  /** Right icon */
  rightIcon?: React.ReactNode;
  /** Full width */
  fullWidth?: boolean;
  /** Enable ripple effect */
  ripple?: boolean;
}

interface Ripple {
  id: number;
  x: number;
  y: number;
  size: number;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 shadow-sm hover:shadow-md',
  secondary:
    'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300 border border-gray-200 hover:border-gray-300',
  ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 active:bg-gray-200',
  danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-sm hover:shadow-md',
  success:
    'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 shadow-sm hover:shadow-md',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg gap-1.5',
  md: 'px-4 py-2 text-sm rounded-xl gap-2',
  lg: 'px-6 py-3 text-base rounded-xl gap-2.5',
};

const iconSizes: Record<ButtonSize, string> = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-5 h-5',
};

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  ripple = true,
  className = '',
  disabled,
  onClick,
  ...props
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const rippleIdRef = useRef(0);
  const reducedMotion = prefersReducedMotion();

  const createRipple = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      if (!ripple || reducedMotion || disabled || isLoading) return;

      const button = buttonRef.current;
      if (!button) return;

      const rect = button.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const size = Math.max(rect.width, rect.height) * 2;

      const newRipple: Ripple = {
        id: rippleIdRef.current++,
        x,
        y,
        size,
      };

      setRipples((prev) => [...prev, newRipple]);

      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
      }, 600);
    },
    [ripple, reducedMotion, disabled, isLoading]
  );

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      createRipple(event);
      onClick?.(event);
    },
    [createRipple, onClick]
  );

  const isDisabled = disabled || isLoading;

  // Animation variants
  const buttonVariants: Variants = reducedMotion
    ? {
        initial: { scale: 1 },
        hover: { scale: 1 },
        tap: { scale: 1 },
      }
    : {
        initial: { scale: 1 },
        hover: { scale: 1.02 },
        tap: { scale: 0.98 },
      };

  // Ripple color based on variant
  const rippleColor =
    variant === 'primary' || variant === 'danger' || variant === 'success'
      ? 'rgba(255, 255, 255, 0.3)'
      : 'rgba(99, 102, 241, 0.2)';

  return (
    <motion.button
      ref={buttonRef}
      className={`
        relative inline-flex items-center justify-center font-medium
        transition-colors duration-200 ease-out
        focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
        overflow-hidden
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      variants={buttonVariants}
      initial="initial"
      whileHover={!isDisabled ? 'hover' : undefined}
      whileTap={!isDisabled ? 'tap' : undefined}
      transition={transitions.snappy}
      disabled={isDisabled}
      onClick={handleClick}
      {...props}
    >
      {/* Ripple effects */}
      <AnimatePresence>
        {ripples.map((r) => (
          <motion.span
            key={r.id}
            initial={{
              width: 0,
              height: 0,
              x: r.x,
              y: r.y,
              opacity: 0.5,
            }}
            animate={{
              width: r.size,
              height: r.size,
              x: r.x - r.size / 2,
              y: r.y - r.size / 2,
              opacity: 0,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="absolute rounded-full pointer-events-none"
            style={{ backgroundColor: rippleColor }}
          />
        ))}
      </AnimatePresence>

      {/* Loading spinner */}
      <AnimatePresence mode="wait">
        {isLoading && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={`absolute ${iconSizes[size]}`}
          >
            <svg
              className="animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </motion.span>
        )}
      </AnimatePresence>

      {/* Content */}
      <span
        className={`inline-flex items-center justify-center gap-2 ${isLoading ? 'opacity-0' : ''}`}
      >
        {leftIcon && <span className={iconSizes[size]}>{leftIcon}</span>}
        {children}
        {rightIcon && <span className={iconSizes[size]}>{rightIcon}</span>}
      </span>
    </motion.button>
  );
};

// Icon button variant
interface AnimatedIconButtonProps extends HTMLButtonPropsWithoutAnimation {
  /** Icon to display */
  icon: React.ReactNode;
  /** Button variant */
  variant?: ButtonVariant;
  /** Button size */
  size?: ButtonSize;
  /** Loading state */
  isLoading?: boolean;
  /** Tooltip text */
  tooltip?: string;
  /** Active state */
  isActive?: boolean;
}

export const AnimatedIconButton: React.FC<AnimatedIconButtonProps> = ({
  icon,
  variant = 'ghost',
  size = 'md',
  isLoading = false,
  tooltip,
  isActive = false,
  className = '',
  disabled,
  ...props
}) => {
  const reducedMotion = prefersReducedMotion();
  const isDisabled = disabled || isLoading;

  const sizeClasses: Record<ButtonSize, string> = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const iconSizeClasses: Record<ButtonSize, string> = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const activeStyles = isActive
    ? 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
    : variantStyles[variant];

  return (
    <motion.button
      className={`
        relative inline-flex items-center justify-center
        rounded-xl transition-colors duration-200 ease-out
        focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${activeStyles}
        ${sizeClasses[size]}
        ${className}
      `}
      whileHover={!reducedMotion && !isDisabled ? { scale: 1.05 } : undefined}
      whileTap={!reducedMotion && !isDisabled ? { scale: 0.95 } : undefined}
      transition={transitions.snappy}
      disabled={isDisabled}
      title={tooltip}
      {...props}
    >
      {isLoading ? (
        <svg
          className={`animate-spin ${iconSizeClasses[size]}`}
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        <span className={iconSizeClasses[size]}>{icon}</span>
      )}
    </motion.button>
  );
};

export default AnimatedButton;
