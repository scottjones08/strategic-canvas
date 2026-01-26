/**
 * useDeviceType Hook
 * 
 * Detects device type (desktop/tablet/mobile) based on screen size and touch capability.
 * Used for responsive UI adaptations throughout the app.
 */

import { useState, useEffect, useCallback } from 'react';

export type DeviceType = 'desktop' | 'tablet' | 'mobile';

interface DeviceInfo {
  type: DeviceType;
  isTouch: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  width: number;
  height: number;
  orientation: 'portrait' | 'landscape';
}

// Breakpoints following common device sizes
const BREAKPOINTS = {
  mobile: 768,    // phones
  tablet: 1024,   // tablets and small laptops
  desktop: 1200,  // desktops
} as const;

export function useDeviceType(): DeviceInfo {
  const getDeviceInfo = useCallback((): DeviceInfo => {
    if (typeof window === 'undefined') {
      return {
        type: 'desktop',
        isTouch: false,
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        width: 1920,
        height: 1080,
        orientation: 'landscape',
      };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const orientation = height > width ? 'portrait' : 'landscape';

    let type: DeviceType;
    
    // Determine device type
    if (width < BREAKPOINTS.mobile) {
      type = 'mobile';
    } else if (width < BREAKPOINTS.tablet || (hasTouch && width < BREAKPOINTS.desktop)) {
      // Treat touch devices under desktop size as tablets
      type = 'tablet';
    } else {
      type = 'desktop';
    }

    // Also check user agent for mobile-specific detection
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobileUA = /iphone|ipod|android.*mobile|windows phone|blackberry/i.test(userAgent);
    const isTabletUA = /ipad|android(?!.*mobile)|tablet/i.test(userAgent);

    // Override based on user agent if screen size doesn't match
    if (isMobileUA && type !== 'mobile') {
      type = 'mobile';
    } else if (isTabletUA && type === 'desktop') {
      type = 'tablet';
    }

    return {
      type,
      isTouch: hasTouch,
      isMobile: type === 'mobile',
      isTablet: type === 'tablet',
      isDesktop: type === 'desktop',
      width,
      height,
      orientation,
    };
  }, []);

  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(getDeviceInfo);

  useEffect(() => {
    const handleResize = () => {
      setDeviceInfo(getDeviceInfo());
    };

    // Also listen for orientation changes
    const handleOrientationChange = () => {
      // Small delay to let the browser update dimensions
      setTimeout(handleResize, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    
    // Initial check
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, [getDeviceInfo]);

  return deviceInfo;
}

// Simple hook that just returns the device type string
export function useIsMobile(): boolean {
  const { isMobile } = useDeviceType();
  return isMobile;
}

export function useIsTouch(): boolean {
  const { isTouch } = useDeviceType();
  return isTouch;
}

export default useDeviceType;
