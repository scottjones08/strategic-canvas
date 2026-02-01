import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Timer,
  Play,
  Pause,
  RotateCcw,
  Monitor,
  X,
  Maximize2,
} from 'lucide-react';
import type { Slide } from '../lib/presentation';
import { formatPresentationTime, getContrastColor } from '../lib/presentation';

interface PresenterViewProps {
  currentSlide: number;
  slides: Slide[];
  elapsedTime: number;
  isPaused: boolean;
  onNext: () => void;
  onPrev: () => void;
  onGoTo: (index: number) => void;
  onPauseTimer: () => void;
  onResumeTimer: () => void;
  onResetTimer: () => void;
  onClose: () => void;
  isOpen: boolean;
}

// Mini slide preview
const SlidePreview = ({ 
  slide, 
  label, 
  isActive = false,
  onClick
}: { 
  slide: Slide | null; 
  label: string;
  isActive?: boolean;
  onClick?: () => void;
}) => {
  if (!slide) {
    return (
      <div className="flex-1 bg-gray-800 rounded-xl p-4">
        <p className="text-gray-500 text-sm mb-2">{label}</p>
        <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
          <span className="text-gray-600 text-sm">No slide</span>
        </div>
      </div>
    );
  }
  
  const frameColor = slide.frame.color || '#ffffff';
  const textColor = getContrastColor(frameColor.replace(/80$/, ''));
  
  return (
    <div 
      className={`flex-1 bg-gray-800 rounded-xl p-4 ${onClick ? 'cursor-pointer hover:bg-gray-750' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-gray-400 text-sm">{label}</p>
        {isActive && (
          <span className="px-2 py-0.5 bg-navy-500 text-white text-xs rounded-full">
            Current
          </span>
        )}
      </div>
      <div 
        className="aspect-video rounded-lg overflow-hidden relative"
        style={{ backgroundColor: frameColor }}
      >
        <div className="absolute inset-0 p-4 flex flex-col">
          <h3 
            className="text-lg font-bold truncate"
            style={{ color: textColor }}
          >
            {slide.title}
          </h3>
          <div 
            className="text-xs mt-2 opacity-70 line-clamp-3"
            style={{ color: textColor }}
          >
            {slide.notes}
          </div>
        </div>
        
        {/* Contained nodes indicator */}
        {slide.containedNodes.length > 0 && (
          <div className="absolute bottom-2 right-2 text-xs bg-black/30 text-white px-2 py-0.5 rounded">
            {slide.containedNodes.length} element{slide.containedNodes.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
};

export function PresenterView({
  currentSlide,
  slides,
  elapsedTime,
  isPaused,
  onNext,
  onPrev,
  onGoTo,
  onPauseTimer,
  onResumeTimer,
  onResetTimer,
  onClose,
  isOpen
}: PresenterViewProps) {
  const [, setPresenterWindow] = useState<Window | null>(null);
  
  const currentSlideData = slides[currentSlide] || null;
  const nextSlideData = slides[currentSlide + 1] || null;
  
  // Open presenter view in new window
  const openInNewWindow = useCallback(() => {
    const newWindow = window.open(
      '',
      'presenter-view',
      'width=800,height=600,menubar=no,toolbar=no,location=no,status=no'
    );
    
    if (newWindow) {
      newWindow.document.title = 'Presenter View';
      setPresenterWindow(newWindow);
      
      // Close handler
      newWindow.addEventListener('beforeunload', () => {
        setPresenterWindow(null);
      });
    }
  }, []);
  
  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case ' ':
          e.preventDefault();
          onNext();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          onPrev();
          break;
        case 'p':
        case 'P':
          e.preventDefault();
          isPaused ? onResumeTimer() : onPauseTimer();
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onNext, onPrev, isPaused, onPauseTimer, onResumeTimer]);
  
  if (!isOpen) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-gray-900 z-[180] flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-4">
          <h1 className="text-white font-semibold text-lg flex items-center gap-2">
            <Monitor className="w-5 h-5" />
            Presenter View
          </h1>
          <span className="text-gray-400 text-sm">
            Slide {currentSlide + 1} of {slides.length}
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Timer */}
          <div className="flex items-center gap-3 bg-gray-800 rounded-lg px-4 py-2">
            <Timer className="w-5 h-5 text-gray-400" />
            <span className="font-mono text-xl text-white">
              {formatPresentationTime(elapsedTime)}
            </span>
            <div className="flex items-center gap-1 ml-2">
              <button
                onClick={isPaused ? onResumeTimer : onPauseTimer}
                className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
              >
                {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              </button>
              <button
                onClick={onResetTimer}
                className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <button
            onClick={openInNewWindow}
            className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white"
            title="Open in new window"
          >
            <Maximize2 className="w-5 h-5" />
          </button>
          
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex p-6 gap-6 overflow-hidden">
        {/* Left side - Current and next slides */}
        <div className="flex-1 flex flex-col gap-4">
          <div className="flex gap-4 flex-1">
            <SlidePreview 
              slide={currentSlideData} 
              label="Current Slide" 
              isActive 
            />
            <SlidePreview 
              slide={nextSlideData} 
              label="Next Slide"
              onClick={nextSlideData ? onNext : undefined}
            />
          </div>
          
          {/* Notes */}
          <div className="h-48 bg-gray-800 rounded-xl p-4 overflow-y-auto">
            <h3 className="text-gray-400 text-sm font-medium mb-2">Speaker Notes</h3>
            {currentSlideData?.notes ? (
              <p className="text-white whitespace-pre-wrap">{currentSlideData.notes}</p>
            ) : (
              <p className="text-gray-500 italic">No notes for this slide</p>
            )}
          </div>
        </div>
        
        {/* Right side - Slide list */}
        <div className="w-64 bg-gray-800 rounded-xl p-4 overflow-y-auto">
          <h3 className="text-gray-400 text-sm font-medium mb-3">All Slides</h3>
          <div className="space-y-2">
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                onClick={() => onGoTo(i)}
                className={`w-full p-2 rounded-lg text-left transition-colors ${
                  i === currentSlide 
                    ? 'bg-navy-700 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 flex items-center justify-center text-xs font-bold rounded"
                    style={{ backgroundColor: slide.frame.color || '#f3f4f6' }}
                  >
                    {i + 1}
                  </span>
                  <span className="text-sm truncate flex-1">{slide.title}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Navigation */}
      <div className="p-4 border-t border-gray-700 flex items-center justify-center gap-4">
        <button
          onClick={onPrev}
          disabled={currentSlide === 0}
          className="flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white"
        >
          <ChevronLeft className="w-5 h-5" />
          Previous
        </button>
        
        <div className="px-6 py-3 bg-gray-800 rounded-xl">
          <span className="text-gray-400">Press</span>
          <kbd className="mx-2 px-2 py-1 bg-gray-700 rounded text-white text-sm">→</kbd>
          <span className="text-gray-400">or</span>
          <kbd className="mx-2 px-2 py-1 bg-gray-700 rounded text-white text-sm">Space</kbd>
          <span className="text-gray-400">for next</span>
        </div>
        
        <button
          onClick={onNext}
          disabled={currentSlide === slides.length - 1}
          className="flex items-center gap-2 px-6 py-3 bg-navy-700 hover:bg-navy-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white"
        >
          Next
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  );
}

export default PresenterView;
