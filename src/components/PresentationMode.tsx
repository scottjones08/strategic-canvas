import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Maximize2,
  Minimize2,
  LayoutGrid,
  Timer,
  RotateCcw,
  ChevronUp,
} from 'lucide-react';
import type { Board, VisualNode } from '../types/board';
import { usePresentation } from '../hooks/usePresentation';
import { getSlideViewport, getContrastColor, type Slide } from '../lib/presentation';

interface PresentationModeProps {
  board: Board;
  isOpen: boolean;
  onExit: () => void;
  startSlide?: number;
}

// Slide content renderer - renders the frame and its contents
const SlideContent = ({ 
  slide, 
  containerWidth, 
  containerHeight 
}: { 
  slide: Slide;
  containerWidth: number;
  containerHeight: number;
}) => {
  const viewport = getSlideViewport(slide, containerWidth, containerHeight, 80);
  
  // Get content lines from frame
  const contentLines = slide.frame.content?.split('\n').slice(1) || [];
  const frameColor = slide.frame.color || '#ffffff';
  const textColor = getContrastColor(frameColor.replace(/80$/, '')); // Remove opacity suffix
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -20 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="relative"
      style={{
        width: slide.frame.width * viewport.zoom,
        height: slide.frame.height * viewport.zoom,
        transform: `translate(${viewport.x}px, ${viewport.y}px)`,
      }}
    >
      {/* Frame background */}
      <div
        className="absolute inset-0 rounded-2xl shadow-2xl overflow-hidden"
        style={{ 
          backgroundColor: frameColor.replace(/80$/, 'ff'),
          border: `3px solid ${frameColor.replace(/80$/, 'cc')}`
        }}
      >
        {/* Frame title */}
        <div className="p-8">
          <h1 
            className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6"
            style={{ color: textColor }}
          >
            {slide.title}
          </h1>
          
          {/* Frame content/notes */}
          {contentLines.length > 0 && (
            <div 
              className="text-xl md:text-2xl leading-relaxed opacity-80 whitespace-pre-wrap"
              style={{ color: textColor }}
            >
              {contentLines.join('\n')}
            </div>
          )}
        </div>
      </div>
      
      {/* Contained nodes - rendered as visual elements */}
      {slide.containedNodes.map((node, index) => {
        // Calculate relative position within the scaled frame
        const relX = (node.x - slide.frame.x) * viewport.zoom;
        const relY = (node.y - slide.frame.y) * viewport.zoom;
        const nodeWidth = node.width * viewport.zoom;
        const nodeHeight = node.height * viewport.zoom;
        
        return (
          <motion.div
            key={node.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 + index * 0.05 }}
            className="absolute rounded-xl shadow-lg overflow-hidden"
            style={{
              left: relX,
              top: relY,
              width: nodeWidth,
              height: nodeHeight,
              backgroundColor: node.color || '#fef3c7',
              minWidth: 100 * viewport.zoom,
              minHeight: 60 * viewport.zoom,
            }}
          >
            <div className="p-3 h-full overflow-hidden">
              <p 
                className="text-sm font-medium text-gray-800"
                style={{ 
                  fontSize: Math.max(12, 14 * viewport.zoom),
                  lineHeight: 1.4
                }}
              >
                {node.content}
              </p>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
};

// Progress indicator
const ProgressBar = ({ current, total }: { current: number; total: number }) => {
  const progress = ((current + 1) / total) * 100;
  
  return (
    <div className="h-1 bg-white/20 rounded-full overflow-hidden">
      <motion.div
        className="h-full bg-white rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.3 }}
      />
    </div>
  );
};

// Slide thumbnail for navigation
const SlideThumbnail = ({ 
  slide, 
  index, 
  isActive, 
  onClick 
}: { 
  slide: { frame: VisualNode; title: string };
  index: number;
  isActive: boolean;
  onClick: () => void;
}) => (
  <motion.button
    onClick={onClick}
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    className={`relative w-24 h-16 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
      isActive 
        ? 'border-white shadow-lg ring-2 ring-white/30' 
        : 'border-white/30 hover:border-white/60'
    }`}
  >
    <div 
      className="absolute inset-0"
      style={{ backgroundColor: slide.frame.color || '#ffffff' }}
    />
    <div className="absolute inset-0 flex items-center justify-center p-2">
      <span className={`text-xs font-medium truncate ${
        isActive ? 'text-gray-900' : 'text-gray-700'
      }`}>
        {index + 1}. {slide.title.slice(0, 15)}
      </span>
    </div>
    {isActive && (
      <motion.div
        layoutId="activeSlide"
        className="absolute inset-0 border-2 border-white rounded-lg"
      />
    )}
  </motion.button>
);

export function PresentationMode({ board, isOpen, onExit, startSlide = 0 }: PresentationModeProps) {
  const [showControls, setShowControls] = useState(true);
  const [showOverview, setShowOverview] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const hideControlsTimer = useRef<NodeJS.Timeout | null>(null);
  
  const {
    currentSlide,
    slides,
    isFullscreen,
    isPaused,
    formattedTime,
    next,
    prev,
    goTo,
    toggleFullscreen,
    pauseTimer,
    resumeTimer,
    resetTimer,
    hasNext,
    hasPrev,
    currentSlideData
  } = usePresentation(board);
  
  // Set initial slide
  useEffect(() => {
    if (startSlide > 0 && startSlide < slides.length) {
      goTo(startSlide);
    }
  }, [startSlide, slides.length, goTo]);
  
  // Measure container
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [isOpen]);
  
  // Auto-hide controls
  const scheduleHideControls = useCallback(() => {
    if (hideControlsTimer.current) {
      clearTimeout(hideControlsTimer.current);
    }
    setShowControls(true);
    hideControlsTimer.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  }, []);
  
  const handleMouseMove = useCallback(() => {
    scheduleHideControls();
  }, [scheduleHideControls]);
  
  // Click handler for navigation
  const handleClick = useCallback((e: React.MouseEvent) => {
    // Don't navigate if clicking on controls
    if ((e.target as HTMLElement).closest('.presentation-controls')) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    
    // Click on left third = previous, right two-thirds = next
    if (x < rect.width / 3) {
      prev();
    } else {
      next();
    }
    
    scheduleHideControls();
  }, [next, prev, scheduleHideControls]);
  
  // Handle escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onExit();
      }
    };
    
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onExit]);
  
  if (!isOpen) return null;
  
  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-gray-900 z-[200] flex flex-col cursor-none"
      onMouseMove={handleMouseMove}
      onClick={handleClick}
      style={{ cursor: showControls ? 'default' : 'none' }}
    >
      {/* Top bar */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="presentation-controls absolute top-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent z-20"
          >
            <div className="flex items-center gap-4">
              <h2 className="text-white text-lg font-semibold truncate max-w-md">
                {board.name}
              </h2>
              <div className="flex items-center gap-2 text-white/70">
                <span className="text-sm font-medium">
                  {currentSlide + 1} / {slides.length}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Timer */}
              <div className="flex items-center gap-2 text-white/80">
                <Timer className="w-4 h-4" />
                <span className="font-mono text-sm">{formattedTime}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    isPaused ? resumeTimer() : pauseTimer();
                  }}
                  className="p-1 hover:bg-white/10 rounded"
                >
                  {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    resetTimer();
                  }}
                  className="p-1 hover:bg-white/10 rounded"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
              
              <div className="w-px h-6 bg-white/20" />
              
              {/* Overview toggle */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowOverview(!showOverview);
                }}
                className={`p-2 rounded-lg transition-colors ${
                  showOverview ? 'bg-white/20 text-white' : 'hover:bg-white/10 text-white/80'
                }`}
                title="Slide overview"
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
              
              {/* Fullscreen toggle */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFullscreen();
                }}
                className="p-2 hover:bg-white/10 rounded-lg text-white/80"
                title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              >
                {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </button>
              
              {/* Exit */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onExit();
                }}
                className="p-2 hover:bg-white/10 rounded-lg text-white/80"
                title="Exit presentation (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Main content area */}
      <div className="flex-1 flex items-center justify-center overflow-hidden p-8">
        <AnimatePresence mode="wait">
          {currentSlideData && (
            <SlideContent
              key={currentSlideData.id}
              slide={currentSlideData}
              containerWidth={containerSize.width - 64}
              containerHeight={containerSize.height - 180}
            />
          )}
        </AnimatePresence>
        
        {slides.length === 0 && (
          <div className="text-center text-white/60">
            <p className="text-xl mb-2">No slides available</p>
            <p className="text-sm">Add frame elements to your board to create slides</p>
          </div>
        )}
      </div>
      
      {/* Bottom navigation */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="presentation-controls absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent z-20"
          >
            {/* Progress bar */}
            <div className="mb-4 px-4">
              <ProgressBar current={currentSlide} total={slides.length} />
            </div>
            
            <div className="flex items-center justify-between">
              {/* Keyboard hints */}
              <div className="text-white/40 text-xs flex items-center gap-2">
                <kbd className="px-2 py-0.5 bg-white/10 rounded text-[10px]">←</kbd>
                <kbd className="px-2 py-0.5 bg-white/10 rounded text-[10px]">→</kbd>
                <span>navigate</span>
                <span className="mx-2">•</span>
                <kbd className="px-2 py-0.5 bg-white/10 rounded text-[10px]">Esc</kbd>
                <span>exit</span>
                <span className="mx-2">•</span>
                <kbd className="px-2 py-0.5 bg-white/10 rounded text-[10px]">F</kbd>
                <span>fullscreen</span>
              </div>
              
              {/* Navigation buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    prev();
                  }}
                  disabled={!hasPrev}
                  className="p-3 bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl text-white transition-colors"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                
                {/* Slide dots */}
                <div className="flex gap-2 max-w-xs overflow-x-auto px-2">
                  {slides.map((_, i) => (
                    <button
                      key={i}
                      onClick={(e) => {
                        e.stopPropagation();
                        goTo(i);
                      }}
                      className={`w-2.5 h-2.5 rounded-full transition-all flex-shrink-0 ${
                        i === currentSlide 
                          ? 'bg-white scale-125' 
                          : 'bg-white/40 hover:bg-white/60'
                      }`}
                    />
                  ))}
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    next();
                  }}
                  disabled={!hasNext}
                  className="p-3 bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl text-white transition-colors"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
              
              {/* Slide number */}
              <div className="text-white/60 text-sm font-medium min-w-[80px] text-right">
                {currentSlide + 1} of {slides.length}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Slide overview panel */}
      <AnimatePresence>
        {showOverview && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="presentation-controls absolute bottom-20 left-0 right-0 px-8 z-30"
          >
            <div className="bg-black/80 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-medium">Slide Overview</h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowOverview(false);
                  }}
                  className="p-1 hover:bg-white/10 rounded text-white/60"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {slides.map((slide, i) => (
                  <SlideThumbnail
                    key={slide.id}
                    slide={slide}
                    index={i}
                    isActive={i === currentSlide}
                    onClick={() => {
                      goTo(i);
                      setShowOverview(false);
                    }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Edge click indicators (only when controls hidden) */}
      {!showControls && (
        <>
          <div className="absolute left-0 top-0 bottom-0 w-1/3 flex items-center justify-start pl-8 opacity-0 hover:opacity-100 transition-opacity">
            <div className="p-4 bg-white/10 rounded-full">
              <ChevronLeft className="w-8 h-8 text-white/60" />
            </div>
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-2/3 flex items-center justify-end pr-8 opacity-0 hover:opacity-100 transition-opacity">
            <div className="p-4 bg-white/10 rounded-full">
              <ChevronRight className="w-8 h-8 text-white/60" />
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}

export default PresentationMode;
