/**
 * Onboarding Tour Component
 *
 * A step-by-step tour component for first-time users with:
 * - Spotlight/highlight effect on target elements
 * - Animated tooltip bubbles
 * - Progress indicator
 * - Navigation controls
 * - Mobile-friendly design
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Sparkles, CheckCircle2 } from 'lucide-react';
import type { OnboardingStep } from '../hooks/useOnboarding';

interface OnboardingTourProps {
  isActive: boolean;
  currentStep: number;
  currentStepData: OnboardingStep | null;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onComplete: () => void;
}

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({
  isActive,
  currentStep,
  currentStepData,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  onComplete,
}) => {
  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calculate spotlight position and tooltip position
  const updatePositions = useCallback(() => {
    if (!currentStepData) return;

    if (!currentStepData.targetSelector) {
      // Center position for steps without a target
      setSpotlightRect(null);
      setTooltipPosition({
        top: window.innerHeight / 2,
        left: window.innerWidth / 2,
      });
      return;
    }

    const targetElement = document.querySelector(currentStepData.targetSelector);
    if (!targetElement) {
      setSpotlightRect(null);
      setTooltipPosition({
        top: window.innerHeight / 2,
        left: window.innerWidth / 2,
      });
      return;
    }

    const rect = targetElement.getBoundingClientRect();
    const padding = currentStepData.spotlightPadding || 8;

    setSpotlightRect({
      top: rect.top - padding,
      left: rect.left - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
    });

    // Calculate tooltip position based on step's position preference
    const tooltipWidth = isMobile ? Math.min(320, window.innerWidth - 32) : 380;
    const tooltipHeight = 200; // Approximate
    const gap = 16;

    let top = 0;
    let left = 0;

    const position = currentStepData.position || 'bottom';

    switch (position) {
      case 'top':
        top = rect.top - tooltipHeight - gap;
        left = rect.left + rect.width / 2;
        break;
      case 'bottom':
        top = rect.bottom + gap + padding;
        left = rect.left + rect.width / 2;
        break;
      case 'left':
        top = rect.top + rect.height / 2;
        left = rect.left - tooltipWidth - gap;
        break;
      case 'right':
        top = rect.top + rect.height / 2;
        left = rect.right + gap + padding;
        break;
      case 'center':
      default:
        top = window.innerHeight / 2;
        left = window.innerWidth / 2;
        break;
    }

    // Ensure tooltip stays within viewport
    const viewportPadding = 16;

    // Adjust horizontal position
    if (left - tooltipWidth / 2 < viewportPadding) {
      left = tooltipWidth / 2 + viewportPadding;
    } else if (left + tooltipWidth / 2 > window.innerWidth - viewportPadding) {
      left = window.innerWidth - tooltipWidth / 2 - viewportPadding;
    }

    // Adjust vertical position
    if (top < viewportPadding) {
      top = viewportPadding + 100;
    } else if (top > window.innerHeight - viewportPadding - tooltipHeight) {
      top = window.innerHeight - viewportPadding - tooltipHeight;
    }

    setTooltipPosition({ top, left });
  }, [currentStepData, isMobile]);

  // Update positions on step change or window resize
  useEffect(() => {
    if (!isActive) return;

    updatePositions();

    const handleResize = () => updatePositions();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize);
    };
  }, [isActive, currentStepData, updatePositions]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onSkip();
          break;
        case 'ArrowRight':
        case 'Enter':
          if (currentStep === totalSteps - 1) {
            onComplete();
          } else {
            onNext();
          }
          break;
        case 'ArrowLeft':
          if (currentStep > 0) {
            onPrev();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, currentStep, totalSteps, onNext, onPrev, onSkip, onComplete]);

  if (!isActive || !currentStepData) return null;

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;
  const isCentered = !currentStepData.targetSelector || currentStepData.position === 'center';

  return (
    <AnimatePresence>
      <div className="onboarding-tour fixed inset-0 z-[9999] pointer-events-none">
        {/* Overlay with spotlight cutout */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 pointer-events-auto"
        >
          <svg className="w-full h-full" preserveAspectRatio="none">
            <defs>
              <mask id="spotlight-mask">
                <rect width="100%" height="100%" fill="white" />
                {spotlightRect && (
                  <motion.rect
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    x={spotlightRect.left}
                    y={spotlightRect.top}
                    width={spotlightRect.width}
                    height={spotlightRect.height}
                    rx="12"
                    fill="black"
                  />
                )}
              </mask>
            </defs>
            <rect
              width="100%"
              height="100%"
              fill="rgba(15, 23, 42, 0.75)"
              mask="url(#spotlight-mask)"
            />
          </svg>
        </motion.div>

        {/* Spotlight ring animation */}
        {spotlightRect && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="absolute pointer-events-none"
            style={{
              top: spotlightRect.top - 4,
              left: spotlightRect.left - 4,
              width: spotlightRect.width + 8,
              height: spotlightRect.height + 8,
            }}
          >
            <div
              className="w-full h-full rounded-xl border-2 border-navy-400 animate-pulse"
              style={{
                boxShadow: '0 0 0 4px rgba(99, 102, 241, 0.2), 0 0 20px rgba(99, 102, 241, 0.3)',
              }}
            />
          </motion.div>
        )}

        {/* Tooltip */}
        <motion.div
          ref={tooltipRef}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="absolute pointer-events-auto"
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left,
            transform: 'translate(-50%, -50%)',
            maxWidth: isMobile ? 'calc(100vw - 32px)' : '400px',
            width: isCentered ? (isMobile ? 'calc(100vw - 32px)' : '400px') : 'auto',
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl overflow-hidden"
            style={{
              boxShadow:
                '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
            }}
          >
            {/* Header with gradient */}
            <div className="bg-gradient-to-r from-navy-500 via-navy-500 to-pink-500 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isFirstStep ? (
                    <Sparkles className="w-5 h-5 text-white" />
                  ) : isLastStep ? (
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold text-sm">
                      {currentStep + 1}
                    </div>
                  )}
                  <h3 className="text-white font-semibold text-lg">{currentStepData.title}</h3>
                </div>
                <button
                  onClick={onSkip}
                  className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
                  aria-label="Skip tour"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-5">
              <p className="text-slate-600 text-base leading-relaxed">{currentStepData.content}</p>
            </div>

            {/* Footer */}
            <div className="px-6 pb-5">
              {/* Progress dots */}
              <div className="flex items-center justify-center gap-1.5 mb-4">
                {Array.from({ length: totalSteps }).map((_, index) => (
                  <motion.div
                    key={index}
                    initial={false}
                    animate={{
                      width: index === currentStep ? 24 : 8,
                      backgroundColor: index === currentStep ? '#6366f1' : index < currentStep ? '#a5b4fc' : '#e2e8f0',
                    }}
                    transition={{ duration: 0.2 }}
                    className="h-2 rounded-full"
                  />
                ))}
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={onSkip}
                  className="text-slate-500 hover:text-slate-700 text-sm font-medium px-3 py-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Skip Tour
                </button>

                <div className="flex items-center gap-2">
                  {!isFirstStep && (
                    <motion.button
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={onPrev}
                      className="flex items-center gap-1 px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl font-medium transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Back
                    </motion.button>
                  )}

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={isLastStep ? onComplete : onNext}
                    className="flex items-center gap-1 px-5 py-2.5 bg-gradient-to-r from-navy-500 to-navy-500 text-white rounded-xl font-semibold shadow-lg shadow-navy-500/25 hover:shadow-xl hover:shadow-navy-500/30 transition-shadow"
                  >
                    {isLastStep ? (
                      <>
                        Get Started
                        <CheckCircle2 className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Keyboard hint */}
        {!isMobile && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 pointer-events-none"
          >
            <div className="flex items-center gap-3 text-white/60 text-sm">
              <span className="flex items-center gap-1">
                <kbd className="px-2 py-1 bg-white/10 rounded text-xs">Esc</kbd>
                <span>to skip</span>
              </span>
              <span className="w-px h-4 bg-white/20" />
              <span className="flex items-center gap-1">
                <kbd className="px-2 py-1 bg-white/10 rounded text-xs">Enter</kbd>
                <span>to continue</span>
              </span>
            </div>
          </motion.div>
        )}
      </div>
    </AnimatePresence>
  );
};

export default OnboardingTour;
