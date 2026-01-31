/**
 * Onboarding Hook
 *
 * Manages the onboarding tour state for first-time users.
 * Persists completion status to localStorage.
 */

import { useState, useCallback, useEffect } from 'react';

// Onboarding step definition
export interface OnboardingStep {
  id: string;
  title: string;
  content: string;
  targetSelector?: string; // CSS selector for the element to highlight
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  spotlightPadding?: number; // Padding around the spotlight
}

// Default onboarding steps
export const DEFAULT_ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Strategic Canvas!',
    content: "Let's take a quick tour to help you get started with your collaborative whiteboard.",
    position: 'center',
  },
  {
    id: 'toolbar',
    title: 'Your Creative Toolkit',
    content: 'These are your tools. Click to add sticky notes, shapes, text, connectors, and more. Each tool has a keyboard shortcut for quick access.',
    targetSelector: '[data-onboarding="toolbar"]',
    position: 'bottom',
    spotlightPadding: 8,
  },
  {
    id: 'canvas',
    title: 'Infinite Canvas',
    content: 'This is your infinite canvas. Hold Space and drag to pan around. Use Ctrl/Cmd + scroll wheel to zoom in and out.',
    targetSelector: '[data-onboarding="canvas"]',
    position: 'center',
    spotlightPadding: 0,
  },
  {
    id: 'sticky',
    title: 'Add Your First Sticky Note',
    content: 'Click the sticky note tool (or press N) to add colorful sticky notes. Perfect for brainstorming and organizing ideas!',
    targetSelector: '[data-onboarding="sticky-tool"]',
    position: 'bottom',
    spotlightPadding: 4,
  },
  {
    id: 'collaboration',
    title: 'Real-time Collaboration',
    content: 'Invite your team to collaborate in real-time! Share your board and see live cursors as others join.',
    targetSelector: '[data-onboarding="share-button"]',
    position: 'left',
    spotlightPadding: 4,
  },
  {
    id: 'done',
    title: "You're All Set!",
    content: 'Start creating and collaborating. You can restart this tour anytime from the help menu.',
    position: 'center',
  },
];

const ONBOARDING_STORAGE_KEY = 'strategic-canvas-onboarding-completed';
const ONBOARDING_VERSION_KEY = 'strategic-canvas-onboarding-version';
const CURRENT_ONBOARDING_VERSION = '1.0';

interface UseOnboardingOptions {
  steps?: OnboardingStep[];
  autoStart?: boolean;
}

interface UseOnboardingReturn {
  // State
  isActive: boolean;
  currentStep: number;
  currentStepData: OnboardingStep | null;
  totalSteps: number;
  hasCompletedOnboarding: boolean;

  // Actions
  startTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  completeTour: () => void;
  goToStep: (step: number) => void;
  resetOnboarding: () => void;
}

// Safe localStorage helpers
const safeLocalStorage = {
  get(key: string, defaultValue: string = ''): string {
    try {
      return localStorage.getItem(key) || defaultValue;
    } catch {
      return defaultValue;
    }
  },
  set(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn('localStorage write error:', e);
    }
  },
};

export function useOnboarding(options: UseOnboardingOptions = {}): UseOnboardingReturn {
  const { steps = DEFAULT_ONBOARDING_STEPS, autoStart = true } = options;

  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(() => {
    const completed = safeLocalStorage.get(ONBOARDING_STORAGE_KEY) === 'true';
    const version = safeLocalStorage.get(ONBOARDING_VERSION_KEY);
    // Reset if version changed
    if (version !== CURRENT_ONBOARDING_VERSION) {
      return false;
    }
    return completed;
  });

  // Auto-start tour for new users
  useEffect(() => {
    if (autoStart && !hasCompletedOnboarding && !isActive) {
      // Small delay to let the UI render first
      const timer = setTimeout(() => {
        setIsActive(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [autoStart, hasCompletedOnboarding, isActive]);

  const startTour = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Last step - complete the tour
      setIsActive(false);
      setHasCompletedOnboarding(true);
      safeLocalStorage.set(ONBOARDING_STORAGE_KEY, 'true');
      safeLocalStorage.set(ONBOARDING_VERSION_KEY, CURRENT_ONBOARDING_VERSION);
    }
  }, [currentStep, steps.length]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const skipTour = useCallback(() => {
    setIsActive(false);
    setHasCompletedOnboarding(true);
    safeLocalStorage.set(ONBOARDING_STORAGE_KEY, 'true');
    safeLocalStorage.set(ONBOARDING_VERSION_KEY, CURRENT_ONBOARDING_VERSION);
  }, []);

  const completeTour = useCallback(() => {
    setIsActive(false);
    setHasCompletedOnboarding(true);
    safeLocalStorage.set(ONBOARDING_STORAGE_KEY, 'true');
    safeLocalStorage.set(ONBOARDING_VERSION_KEY, CURRENT_ONBOARDING_VERSION);
  }, []);

  const goToStep = useCallback((step: number) => {
    if (step >= 0 && step < steps.length) {
      setCurrentStep(step);
    }
  }, [steps.length]);

  const resetOnboarding = useCallback(() => {
    setHasCompletedOnboarding(false);
    setCurrentStep(0);
    safeLocalStorage.set(ONBOARDING_STORAGE_KEY, 'false');
  }, []);

  const currentStepData = steps[currentStep] || null;

  return {
    isActive,
    currentStep,
    currentStepData,
    totalSteps: steps.length,
    hasCompletedOnboarding,
    startTour,
    nextStep,
    prevStep,
    skipTour,
    completeTour,
    goToStep,
    resetOnboarding,
  };
}

export default useOnboarding;
