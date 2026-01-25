import { useState, useCallback } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  GripVertical,
  Eye,
  EyeOff,
  RotateCcw,
  Play,
  X,
} from 'lucide-react';
import type { Slide } from '../lib/presentation';

interface SlideOrderPanelProps {
  slides: Slide[];
  excludedSlides: Set<string>;
  currentSlide: number;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onToggleExclusion: (slideId: string) => void;
  onReset: () => void;
  onClose: () => void;
  onStartPresentation: (slideIndex: number) => void;
  isOpen: boolean;
}

interface DraggableSlideItemProps {
  slide: Slide;
  index: number;
  isExcluded: boolean;
  isCurrent: boolean;
  onToggleExclusion: () => void;
  onStartFrom: () => void;
}

const DraggableSlideItem = ({
  slide,
  index,
  isExcluded,
  isCurrent,
  onToggleExclusion,
  onStartFrom
}: DraggableSlideItemProps) => (
  <Reorder.Item
    value={slide}
    id={slide.id}
    className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
      isExcluded 
        ? 'bg-gray-100 opacity-60' 
        : isCurrent 
          ? 'bg-indigo-50 border-2 border-indigo-200' 
          : 'bg-white border border-gray-200 hover:border-gray-300'
    }`}
  >
    <div className="cursor-grab active:cursor-grabbing touch-none">
      <GripVertical className="w-4 h-4 text-gray-400" />
    </div>
    
    {/* Thumbnail */}
    <div 
      className="w-16 h-10 rounded-lg flex-shrink-0 flex items-center justify-center"
      style={{ backgroundColor: slide.frame.color || '#f3f4f6' }}
    >
      <span className="text-xs font-bold text-gray-700">{index + 1}</span>
    </div>
    
    {/* Title */}
    <div className="flex-1 min-w-0">
      <p className={`text-sm font-medium truncate ${isExcluded ? 'text-gray-400' : 'text-gray-900'}`}>
        {slide.title}
      </p>
      <p className="text-xs text-gray-500 truncate">
        {slide.containedNodes.length} element{slide.containedNodes.length !== 1 ? 's' : ''}
      </p>
    </div>
    
    {/* Actions */}
    <div className="flex items-center gap-1">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onStartFrom();
        }}
        className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-indigo-600"
        title="Start from this slide"
      >
        <Play className="w-4 h-4" />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleExclusion();
        }}
        className={`p-1.5 rounded-lg ${
          isExcluded 
            ? 'hover:bg-red-50 text-red-400 hover:text-red-600' 
            : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
        }`}
        title={isExcluded ? 'Include slide' : 'Exclude slide'}
      >
        {isExcluded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  </Reorder.Item>
);

export function SlideOrderPanel({
  slides,
  excludedSlides,
  currentSlide,
  onReorder,
  onToggleExclusion,
  onReset,
  onClose,
  onStartPresentation,
  isOpen
}: SlideOrderPanelProps) {
  const [orderedSlides, setOrderedSlides] = useState(slides);
  
  // Handle reorder completion
  const handleReorder = useCallback((newOrder: Slide[]) => {
    setOrderedSlides(newOrder);
    // Find the indices and notify parent
    newOrder.forEach((slide, newIndex) => {
      const oldIndex = slides.findIndex(s => s.id === slide.id);
      if (oldIndex !== newIndex) {
        onReorder(oldIndex, newIndex);
      }
    });
  }, [slides, onReorder]);
  
  // Sync with external slides changes
  if (slides.length !== orderedSlides.length || 
      slides.some((s, i) => s.id !== orderedSlides[i]?.id)) {
    setOrderedSlides(slides);
  }
  
  const includedCount = slides.filter(s => !excludedSlides.has(s.id)).length;
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-[150]"
            onClick={onClose}
          />
          
          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="fixed right-0 top-0 bottom-0 w-96 bg-white shadow-2xl z-[151] flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Slide Order</h2>
                <p className="text-sm text-gray-500">
                  {includedCount} of {slides.length} slides included
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            {/* Actions */}
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <button
                onClick={onReset}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <RotateCcw className="w-4 h-4" />
                Reset order
              </button>
              <div className="flex-1" />
              <button
                onClick={() => onStartPresentation(0)}
                className="flex items-center gap-2 px-4 py-1.5 text-sm bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg font-medium"
              >
                <Play className="w-4 h-4" />
                Present
              </button>
            </div>
            
            {/* Slides list */}
            <div className="flex-1 overflow-y-auto p-4">
              {slides.length > 0 ? (
                <Reorder.Group
                  axis="y"
                  values={orderedSlides}
                  onReorder={handleReorder}
                  className="space-y-2"
                >
                  {orderedSlides.map((slide, index) => (
                    <DraggableSlideItem
                      key={slide.id}
                      slide={slide}
                      index={index}
                      isExcluded={excludedSlides.has(slide.id)}
                      isCurrent={index === currentSlide}
                      onToggleExclusion={() => onToggleExclusion(slide.id)}
                      onStartFrom={() => onStartPresentation(index)}
                    />
                  ))}
                </Reorder.Group>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-lg mb-2">No slides available</p>
                  <p className="text-sm">Add frame elements to your board to create slides</p>
                </div>
              )}
            </div>
            
            {/* Footer with tips */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <p className="text-xs text-gray-500">
                <strong>Tip:</strong> Drag slides to reorder. Click the eye icon to exclude a slide from the presentation.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default SlideOrderPanel;
