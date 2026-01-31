/**
 * Confetti Effect Component
 *
 * Celebratory confetti animation for completing tasks, milestones, achievements.
 * Respects prefers-reduced-motion for accessibility.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { prefersReducedMotion } from './config';

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  rotation: number;
  color: string;
  size: number;
  shape: 'square' | 'circle' | 'triangle';
  delay: number;
}

interface ConfettiEffectProps {
  /** Whether the confetti is active */
  active: boolean;
  /** Number of confetti pieces */
  count?: number;
  /** Duration in milliseconds before auto-cleanup */
  duration?: number;
  /** Origin point as percentage (0-100) */
  origin?: { x: number; y: number };
  /** Custom colors array */
  colors?: string[];
  /** Callback when animation completes */
  onComplete?: () => void;
}

const DEFAULT_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f59e0b', // amber
  '#10b981', // emerald
  '#3b82f6', // blue
  '#ef4444', // red
  '#22c55e', // green
];

export const ConfettiEffect: React.FC<ConfettiEffectProps> = ({
  active,
  count = 50,
  duration = 3000,
  origin = { x: 50, y: 50 },
  colors = DEFAULT_COLORS,
  onComplete,
}) => {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  const generatePieces = useCallback(() => {
    const newPieces: ConfettiPiece[] = [];
    const shapes: ConfettiPiece['shape'][] = ['square', 'circle', 'triangle'];

    for (let i = 0; i < count; i++) {
      newPieces.push({
        id: i,
        x: origin.x + (Math.random() - 0.5) * 20,
        y: origin.y,
        rotation: Math.random() * 360,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 8 + Math.random() * 8,
        shape: shapes[Math.floor(Math.random() * shapes.length)],
        delay: Math.random() * 0.3,
      });
    }

    return newPieces;
  }, [count, origin.x, origin.y, colors]);

  useEffect(() => {
    if (active && !prefersReducedMotion()) {
      const newPieces = generatePieces();
      setPieces(newPieces);
      setIsVisible(true);

      const timer = setTimeout(() => {
        setIsVisible(false);
        setPieces([]);
        onComplete?.();
      }, duration);

      return () => clearTimeout(timer);
    } else if (active && prefersReducedMotion()) {
      // For reduced motion, just show a brief flash
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [active, duration, generatePieces, onComplete]);

  if (!isVisible) return null;

  // Simplified view for reduced motion
  if (prefersReducedMotion()) {
    return (
      <div className="fixed inset-0 pointer-events-none z-[9999]">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-indigo-500/10"
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      <AnimatePresence>
        {pieces.map((piece) => (
          <motion.div
            key={piece.id}
            initial={{
              left: `${piece.x}%`,
              top: `${piece.y}%`,
              opacity: 1,
              scale: 0,
              rotate: piece.rotation,
            }}
            animate={{
              left: `${piece.x + (Math.random() - 0.5) * 60}%`,
              top: `${piece.y + 50 + Math.random() * 40}%`,
              opacity: [1, 1, 0],
              scale: [0, 1, 1],
              rotate: piece.rotation + (Math.random() - 0.5) * 720,
            }}
            transition={{
              duration: 2 + Math.random(),
              delay: piece.delay,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
            style={{
              position: 'absolute',
              width: piece.size,
              height: piece.size,
              backgroundColor: piece.color,
              borderRadius: piece.shape === 'circle' ? '50%' : piece.shape === 'triangle' ? '0' : '2px',
              clipPath: piece.shape === 'triangle' ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : undefined,
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

// Hook for triggering confetti
export const useConfetti = () => {
  const [showConfetti, setShowConfetti] = useState(false);

  const triggerConfetti = useCallback(() => {
    setShowConfetti(true);
  }, []);

  const handleComplete = useCallback(() => {
    setShowConfetti(false);
  }, []);

  return {
    showConfetti,
    triggerConfetti,
    handleComplete,
  };
};

export default ConfettiEffect;
