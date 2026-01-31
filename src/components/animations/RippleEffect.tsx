/**
 * Ripple Effect Component
 *
 * Material-design style ripple animation for button clicks.
 * Respects prefers-reduced-motion for accessibility.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { prefersReducedMotion } from './config';

interface Ripple {
  id: number;
  x: number;
  y: number;
  size: number;
}

interface RippleEffectProps {
  /** Color of the ripple */
  color?: string;
  /** Duration of the ripple animation in ms */
  duration?: number;
  /** Children to wrap */
  children: React.ReactNode;
  /** Additional className */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
}

export const RippleEffect: React.FC<RippleEffectProps> = ({
  color = 'rgba(255, 255, 255, 0.4)',
  duration = 600,
  children,
  className = '',
  disabled = false,
}) => {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const rippleIdRef = useRef(0);

  const createRipple = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    if (disabled || prefersReducedMotion()) return;

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();

    let x: number, y: number;

    if ('touches' in event) {
      x = event.touches[0].clientX - rect.left;
      y = event.touches[0].clientY - rect.top;
    } else {
      x = event.clientX - rect.left;
      y = event.clientY - rect.top;
    }

    // Calculate ripple size to cover the entire container
    const size = Math.max(rect.width, rect.height) * 2;

    const newRipple: Ripple = {
      id: rippleIdRef.current++,
      x,
      y,
      size,
    };

    setRipples((prev) => [...prev, newRipple]);

    // Remove ripple after animation
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, duration);
  }, [disabled, duration]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      onMouseDown={createRipple}
      onTouchStart={createRipple}
    >
      {children}
      <AnimatePresence>
        {ripples.map((ripple) => (
          <motion.span
            key={ripple.id}
            initial={{
              width: 0,
              height: 0,
              x: ripple.x,
              y: ripple.y,
              opacity: 0.5,
            }}
            animate={{
              width: ripple.size,
              height: ripple.size,
              x: ripple.x - ripple.size / 2,
              y: ripple.y - ripple.size / 2,
              opacity: 0,
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: duration / 1000,
              ease: 'easeOut',
            }}
            style={{
              position: 'absolute',
              borderRadius: '50%',
              backgroundColor: color,
              pointerEvents: 'none',
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

// Hook for adding ripple to any element
export const useRipple = (options?: { color?: string; duration?: number }) => {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const rippleIdRef = useRef(0);
  const color = options?.color ?? 'rgba(255, 255, 255, 0.4)';
  const duration = options?.duration ?? 600;

  const addRipple = useCallback((event: React.MouseEvent | React.TouchEvent, element: HTMLElement) => {
    if (prefersReducedMotion()) return;

    const rect = element.getBoundingClientRect();

    let x: number, y: number;

    if ('touches' in event) {
      x = event.touches[0].clientX - rect.left;
      y = event.touches[0].clientY - rect.top;
    } else {
      x = event.clientX - rect.left;
      y = event.clientY - rect.top;
    }

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
    }, duration);
  }, [duration]);

  const RippleContainer: React.FC = () => (
    <AnimatePresence>
      {ripples.map((ripple) => (
        <motion.span
          key={ripple.id}
          initial={{
            width: 0,
            height: 0,
            x: ripple.x,
            y: ripple.y,
            opacity: 0.5,
          }}
          animate={{
            width: ripple.size,
            height: ripple.size,
            x: ripple.x - ripple.size / 2,
            y: ripple.y - ripple.size / 2,
            opacity: 0,
          }}
          exit={{ opacity: 0 }}
          transition={{
            duration: duration / 1000,
            ease: 'easeOut',
          }}
          style={{
            position: 'absolute',
            borderRadius: '50%',
            backgroundColor: color,
            pointerEvents: 'none',
          }}
        />
      ))}
    </AnimatePresence>
  );

  return { addRipple, RippleContainer };
};

export default RippleEffect;
