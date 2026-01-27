/**
 * useFeatureFlags Hook
 * 
 * Manages feature flags for enabling/disabling enterprise features
 */

import { useState, useEffect, useCallback } from 'react';

export interface FeatureFlags {
  enterpriseCanvas: boolean;
  enhancedConnectors: boolean;
  floatingPanels: boolean;
  mobileToolbar: boolean;
  smartGuides: boolean;
  touchGestures: boolean;
}

const DEFAULT_FLAGS: FeatureFlags = {
  enterpriseCanvas: true,
  enhancedConnectors: true,
  floatingPanels: true,
  mobileToolbar: true,
  smartGuides: true,
  touchGestures: true
};

const STORAGE_KEY = 'fan-canvas-feature-flags';

export function useFeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlags>(DEFAULT_FLAGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load flags from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setFlags({ ...DEFAULT_FLAGS, ...parsed });
      }
    } catch (e) {
      console.error('Error loading feature flags:', e);
    }
    setIsLoaded(true);
  }, []);

  // Save flags when they change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(flags));
      } catch (e) {
        console.error('Error saving feature flags:', e);
      }
    }
  }, [flags, isLoaded]);

  const setFlag = useCallback(<K extends keyof FeatureFlags>(
    key: K,
    value: FeatureFlags[K]
  ) => {
    setFlags(prev => ({ ...prev, [key]: value }));
  }, []);

  const toggleFlag = useCallback((key: keyof FeatureFlags) => {
    setFlags(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const resetFlags = useCallback(() => {
    setFlags(DEFAULT_FLAGS);
  }, []);

  const enableAll = useCallback(() => {
    setFlags({
      enterpriseCanvas: true,
      enhancedConnectors: true,
      floatingPanels: true,
      mobileToolbar: true,
      smartGuides: true,
      touchGestures: true
    });
  }, []);

  const disableAll = useCallback(() => {
    setFlags({
      enterpriseCanvas: false,
      enhancedConnectors: false,
      floatingPanels: false,
      mobileToolbar: false,
      smartGuides: false,
      touchGestures: false
    });
  }, []);

  return {
    flags,
    isLoaded,
    setFlag,
    toggleFlag,
    resetFlags,
    enableAll,
    disableAll
  };
}

export default useFeatureFlags;
