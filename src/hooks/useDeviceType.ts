/**
 * useDeviceType Hook
 * 
 * Detects device type and capabilities for responsive UI decisions
 */

import { useState, useEffect } from 'react';

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouch: boolean;
  isPortrait: boolean;
  isLandscape: boolean;
  windowWidth: number;
  windowHeight: number;
}

export function useDeviceType(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isTouch: false,
    isPortrait: true,
    isLandscape: false,
    windowWidth: typeof window !== 'undefined' ? window.innerWidth : 1024,
    windowHeight: typeof window !== 'undefined' ? window.innerHeight : 768
  });

  useEffect(() => {
    const updateDeviceInfo = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      // Breakpoints
      const isMobile = width < 640;
      const isTablet = width >= 640 && width < 1024;
      const isDesktop = width >= 1024;
      
      // Touch detection
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      // Orientation
      const isPortrait = height > width;
      const isLandscape = width > height;
      
      setDeviceInfo({
        isMobile,
        isTablet,
        isDesktop,
        isTouch,
        isPortrait,
        isLandscape,
        windowWidth: width,
        windowHeight: height
      });
    };

    // Initial check
    updateDeviceInfo();

    // Listen for resize
    window.addEventListener('resize', updateDeviceInfo);
    
    // Listen for orientation change
    window.addEventListener('orientationchange', updateDeviceInfo);

    return () => {
      window.removeEventListener('resize', updateDeviceInfo);
      window.removeEventListener('orientationchange', updateDeviceInfo);
    };
  }, []);

  return deviceInfo;
}

export default useDeviceType;
