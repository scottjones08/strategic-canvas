import { motion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  X,
  LayoutGrid,
} from 'lucide-react';

interface PresentationControlsProps {
  currentSlide: number;
  totalSlides: number;
  onPrev: () => void;
  onNext: () => void;
  onGoTo: (index: number) => void;
  onExit: () => void;
  onToggleFullscreen: () => void;
  onToggleOverview: () => void;
  isFullscreen: boolean;
  showOverview: boolean;
  hasPrev: boolean;
  hasNext: boolean;
}

export function PresentationControls({
  currentSlide,
  totalSlides,
  onPrev,
  onNext,
  onGoTo,
  onExit,
  onToggleFullscreen,
  onToggleOverview,
  isFullscreen,
  showOverview,
  hasPrev,
  hasNext
}: PresentationControlsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="flex items-center justify-center gap-4 p-4 bg-black/60 backdrop-blur-sm rounded-2xl"
    >
      {/* Previous */}
      <button
        onClick={onPrev}
        disabled={!hasPrev}
        className="p-3 bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl text-white transition-colors"
        title="Previous slide (←)"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      
      {/* Slide counter */}
      <div className="flex items-center gap-2 px-4">
        <span className="text-white font-medium text-lg">{currentSlide + 1}</span>
        <span className="text-white/50">/</span>
        <span className="text-white/70">{totalSlides}</span>
      </div>
      
      {/* Slide dots */}
      <div className="flex gap-1.5 px-2">
        {Array.from({ length: Math.min(totalSlides, 10) }).map((_, i) => (
          <button
            key={i}
            onClick={() => onGoTo(i)}
            className={`w-2 h-2 rounded-full transition-all ${
              i === currentSlide 
                ? 'bg-white w-6' 
                : 'bg-white/40 hover:bg-white/60'
            }`}
            title={`Go to slide ${i + 1}`}
          />
        ))}
        {totalSlides > 10 && (
          <span className="text-white/50 text-xs ml-1">+{totalSlides - 10}</span>
        )}
      </div>
      
      {/* Next */}
      <button
        onClick={onNext}
        disabled={!hasNext}
        className="p-3 bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl text-white transition-colors"
        title="Next slide (→)"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
      
      <div className="w-px h-8 bg-white/20 mx-2" />
      
      {/* Overview toggle */}
      <button
        onClick={onToggleOverview}
        className={`p-2 rounded-lg transition-colors ${
          showOverview ? 'bg-white/20 text-white' : 'hover:bg-white/10 text-white/80'
        }`}
        title="Slide overview (G)"
      >
        <LayoutGrid className="w-5 h-5" />
      </button>
      
      {/* Fullscreen toggle */}
      <button
        onClick={onToggleFullscreen}
        className="p-2 hover:bg-white/10 rounded-lg text-white/80"
        title={isFullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'}
      >
        {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
      </button>
      
      {/* Exit */}
      <button
        onClick={onExit}
        className="p-2 hover:bg-white/10 rounded-lg text-white/80"
        title="Exit presentation (Esc)"
      >
        <X className="w-5 h-5" />
      </button>
    </motion.div>
  );
}

export default PresentationControls;
