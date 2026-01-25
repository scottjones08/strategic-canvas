import { useState, useCallback, useEffect, useRef } from 'react';
import type { Board } from '../types/board';
import { 
  extractSlidesFromBoard, 
  getSlideViewport, 
  reorderSlides,
  formatPresentationTime,
  type Slide, 
  type SlideViewport 
} from '../lib/presentation';

interface UsePresentationOptions {
  onSlideChange?: (slideIndex: number, slide: Slide) => void;
}

export function usePresentation(board: Board, options: UsePresentationOptions = {}) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [slideOrder, setSlideOrder] = useState<string[]>([]);
  const [excludedSlides, setExcludedSlides] = useState<Set<string>>(new Set());
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  // Extract and order slides
  const allSlides = extractSlidesFromBoard(board);
  
  // Apply custom ordering and exclusions
  const slides = allSlides
    .filter(slide => !excludedSlides.has(slide.id))
    .sort((a, b) => {
      if (slideOrder.length > 0) {
        const aIndex = slideOrder.indexOf(a.id);
        const bIndex = slideOrder.indexOf(b.id);
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
      }
      return a.order - b.order;
    });
  
  // Timer management
  useEffect(() => {
    if (!isPaused && isFullscreen) {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPaused, isFullscreen]);
  
  // Navigation
  const next = useCallback(() => {
    setCurrentSlide(prev => {
      const newIndex = Math.min(prev + 1, slides.length - 1);
      if (options.onSlideChange && slides[newIndex]) {
        options.onSlideChange(newIndex, slides[newIndex]);
      }
      return newIndex;
    });
  }, [slides, options]);
  
  const prev = useCallback(() => {
    setCurrentSlide(prev => {
      const newIndex = Math.max(prev - 1, 0);
      if (options.onSlideChange && slides[newIndex]) {
        options.onSlideChange(newIndex, slides[newIndex]);
      }
      return newIndex;
    });
  }, [slides, options]);
  
  const goTo = useCallback((index: number) => {
    const clampedIndex = Math.max(0, Math.min(index, slides.length - 1));
    setCurrentSlide(clampedIndex);
    if (options.onSlideChange && slides[clampedIndex]) {
      options.onSlideChange(clampedIndex, slides[clampedIndex]);
    }
  }, [slides, options]);
  
  const goToFirst = useCallback(() => goTo(0), [goTo]);
  const goToLast = useCallback(() => goTo(slides.length - 1), [goTo, slides.length]);
  
  // Fullscreen management
  const enterFullscreen = useCallback(async () => {
    try {
      if (containerRef.current && document.fullscreenEnabled) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        // Fallback: just set the state for pseudo-fullscreen
        setIsFullscreen(true);
      }
    } catch (error) {
      console.error('Failed to enter fullscreen:', error);
      setIsFullscreen(true); // Still enter presentation mode
    }
  }, []);
  
  const exitFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
      setIsFullscreen(false);
    } catch (error) {
      console.error('Failed to exit fullscreen:', error);
      setIsFullscreen(false);
    }
  }, []);
  
  const toggleFullscreen = useCallback(() => {
    if (isFullscreen) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  }, [isFullscreen, enterFullscreen, exitFullscreen]);
  
  // Listen for fullscreen changes from browser
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);
  
  // Timer controls
  const pauseTimer = useCallback(() => setIsPaused(true), []);
  const resumeTimer = useCallback(() => setIsPaused(false), []);
  const resetTimer = useCallback(() => {
    setElapsedTime(0);
    setIsPaused(false);
  }, []);
  
  // Slide management
  const reorder = useCallback((fromIndex: number, toIndex: number) => {
    const reordered = reorderSlides(slides, fromIndex, toIndex);
    setSlideOrder(reordered.map(s => s.id));
  }, [slides]);
  
  const toggleSlideExclusion = useCallback((slideId: string) => {
    setExcludedSlides(prev => {
      const next = new Set(prev);
      if (next.has(slideId)) {
        next.delete(slideId);
      } else {
        next.add(slideId);
      }
      return next;
    });
  }, []);
  
  const includeAllSlides = useCallback(() => {
    setExcludedSlides(new Set());
  }, []);
  
  const resetSlideOrder = useCallback(() => {
    setSlideOrder([]);
    setExcludedSlides(new Set());
  }, []);
  
  // Get current viewport
  const getCurrentViewport = useCallback((width: number, height: number): SlideViewport | null => {
    const slide = slides[currentSlide];
    if (!slide) return null;
    return getSlideViewport(slide, width, height);
  }, [currentSlide, slides]);
  
  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle when in presentation mode
      if (!isFullscreen) return;
      
      switch (e.key) {
        case 'ArrowRight':
        case ' ':
        case 'Enter':
          e.preventDefault();
          next();
          break;
        case 'ArrowLeft':
        case 'Backspace':
          e.preventDefault();
          prev();
          break;
        case 'Escape':
          e.preventDefault();
          exitFullscreen();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'Home':
          e.preventDefault();
          goToFirst();
          break;
        case 'End':
          e.preventDefault();
          goToLast();
          break;
        default:
          // Number keys 1-9 to jump to slides
          if (e.key >= '1' && e.key <= '9') {
            e.preventDefault();
            goTo(parseInt(e.key) - 1);
          }
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, next, prev, exitFullscreen, toggleFullscreen, goToFirst, goToLast, goTo]);
  
  return {
    // State
    currentSlide,
    slides,
    allSlides,
    isFullscreen,
    isPaused,
    elapsedTime,
    formattedTime: formatPresentationTime(elapsedTime),
    excludedSlides,
    
    // Refs
    containerRef,
    
    // Navigation
    next,
    prev,
    goTo,
    goToFirst,
    goToLast,
    
    // Fullscreen
    enterFullscreen,
    exitFullscreen,
    toggleFullscreen,
    
    // Timer
    pauseTimer,
    resumeTimer,
    resetTimer,
    
    // Slide management
    reorder,
    toggleSlideExclusion,
    includeAllSlides,
    resetSlideOrder,
    
    // Viewport
    getCurrentViewport,
    
    // Computed
    hasNext: currentSlide < slides.length - 1,
    hasPrev: currentSlide > 0,
    progress: slides.length > 0 ? ((currentSlide + 1) / slides.length) * 100 : 0,
    currentSlideData: slides[currentSlide] || null
  };
}
