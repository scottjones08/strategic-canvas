/**
 * MobileToolbar Component
 * 
 * Bottom-positioned toolbar optimized for mobile devices.
 * Features:
 * - Thumb-reachable zone positioning
 * - Expandable tool groups
 * - Floating action button for primary actions
 */

import React, { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  StickyNote,
  Square,
  Circle,
  Triangle,
  Type,
  Minus,
  Pencil,
  Image,
  MoreHorizontal,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Hand,
  Shapes,
} from 'lucide-react';

interface MobileToolbarProps {
  onAddSticky: () => void;
  onAddShape: (shape: 'square' | 'circle' | 'triangle') => void;
  onAddText: () => void;
  onAddConnector: () => void;
  onAddImage: () => void;
  onToggleDrawing: () => void;
  onTogglePan: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isDrawing: boolean;
  isPanMode: boolean;
  zoom: number;
}

const MobileToolbar: React.FC<MobileToolbarProps> = memo(({
  onAddSticky,
  onAddShape,
  onAddText,
  onAddConnector,
  onAddImage,
  onToggleDrawing,
  onTogglePan,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  canUndo,
  canRedo,
  isDrawing,
  isPanMode,
  zoom,
}) => {
  const [showShapes, setShowShapes] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const handleAddSticky = () => {
    onAddSticky();
  };

  const handleAddShape = (shape: 'square' | 'circle' | 'triangle') => {
    onAddShape(shape);
    setShowShapes(false);
  };

  const handleAddText = () => {
    onAddText();
  };

  return (
    <>
      {/* Zoom controls - top right */}
      <div className="fixed top-20 right-4 z-[100] flex flex-col gap-2">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onZoomIn}
          className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center border border-gray-200"
        >
          <ZoomIn className="w-5 h-5 text-gray-700" />
        </motion.button>
        <div className="text-xs text-center text-gray-500 font-medium">
          {Math.round(zoom * 100)}%
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onZoomOut}
          className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center border border-gray-200"
        >
          <ZoomOut className="w-5 h-5 text-gray-700" />
        </motion.button>
      </div>

      {/* Undo/Redo - top left */}
      <div className="fixed top-20 left-4 z-[100] flex gap-2">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onUndo}
          disabled={!canUndo}
          className={`w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center border border-gray-200 ${!canUndo ? 'opacity-40' : ''}`}
        >
          <Undo2 className="w-5 h-5 text-gray-700" />
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onRedo}
          disabled={!canRedo}
          className={`w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center border border-gray-200 ${!canRedo ? 'opacity-40' : ''}`}
        >
          <Redo2 className="w-5 h-5 text-gray-700" />
        </motion.button>
      </div>

      {/* Mode toggle - bottom left */}
      <div className="fixed bottom-24 left-4 z-[100] flex flex-col gap-2">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onTogglePan}
          className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center border ${
            isPanMode ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-200'
          }`}
        >
          <Hand className={`w-5 h-5 ${isPanMode ? 'text-white' : 'text-gray-700'}`} />
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onToggleDrawing}
          className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center border ${
            isDrawing ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-200'
          }`}
        >
          <Pencil className={`w-5 h-5 ${isDrawing ? 'text-white' : 'text-gray-700'}`} />
        </motion.button>
      </div>

      {/* Main bottom toolbar */}
      <div className="fixed bottom-0 left-0 right-0 z-[100] pb-safe">
        <div className="bg-white border-t border-gray-200 shadow-lg">
          <div className="flex items-center justify-around px-2 py-3">
            {/* Sticky Note */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleAddSticky}
              className="flex flex-col items-center gap-1 px-3 py-1"
            >
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <StickyNote className="w-5 h-5 text-yellow-600" />
              </div>
              <span className="text-[10px] text-gray-600">Sticky</span>
            </motion.button>

            {/* Shapes */}
            <div className="relative">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowShapes(!showShapes)}
                className="flex flex-col items-center gap-1 px-3 py-1"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Shapes className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-[10px] text-gray-600">Shape</span>
              </motion.button>

              {/* Shape submenu */}
              <AnimatePresence>
                {showShapes && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-xl border border-gray-200 p-2 flex gap-2"
                  >
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleAddShape('square')}
                      className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center"
                    >
                      <Square className="w-5 h-5 text-gray-700" />
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleAddShape('circle')}
                      className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center"
                    >
                      <Circle className="w-5 h-5 text-gray-700" />
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleAddShape('triangle')}
                      className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center"
                    >
                      <Triangle className="w-5 h-5 text-gray-700" />
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Text */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleAddText}
              className="flex flex-col items-center gap-1 px-3 py-1"
            >
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Type className="w-5 h-5 text-purple-600" />
              </div>
              <span className="text-[10px] text-gray-600">Text</span>
            </motion.button>

            {/* Connector */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onAddConnector}
              className="flex flex-col items-center gap-1 px-3 py-1"
            >
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <Minus className="w-5 h-5 text-gray-600 rotate-45" />
              </div>
              <span className="text-[10px] text-gray-600">Line</span>
            </motion.button>

            {/* More */}
            <div className="relative">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowMore(!showMore)}
                className="flex flex-col items-center gap-1 px-3 py-1"
              >
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <MoreHorizontal className="w-5 h-5 text-gray-600" />
                </div>
                <span className="text-[10px] text-gray-600">More</span>
              </motion.button>

              {/* More submenu */}
              <AnimatePresence>
                {showMore && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute bottom-full mb-2 right-0 bg-white rounded-xl shadow-xl border border-gray-200 p-2 min-w-[120px]"
                  >
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        onAddImage();
                        setShowMore(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-lg"
                    >
                      <Image className="w-5 h-5 text-gray-600" />
                      <span className="text-sm text-gray-700">Image</span>
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Backdrop for submenus */}
      <AnimatePresence>
        {(showShapes || showMore) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99]"
            onClick={() => {
              setShowShapes(false);
              setShowMore(false);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
});

MobileToolbar.displayName = 'MobileToolbar';

export default MobileToolbar;
