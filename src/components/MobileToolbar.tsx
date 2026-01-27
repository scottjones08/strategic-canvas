/**
 * Mobile Toolbar Component
 * 
 * Features:
 * - Bottom sheet style toolbar for mobile devices
 * - Touch-optimized buttons (min 44px)
 * - Swipe gestures for tool selection
 * - Collapsible sections
 * - Quick actions drawer
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import {
  MousePointer2,
  Hand,
  StickyNote,
  Type,
  Shapes,
  GitBranch,
  Frame,
  Image as ImageIcon,
  ChevronDown,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize,
  Grid3X3,
  Magnet,
  Trash2,
  Copy,
  X,
  MoreHorizontal,
  Square,
  Circle,
  Triangle,
  Diamond
} from 'lucide-react';
import type { ToolType, ShapeType } from './EnterpriseToolbar';

interface MobileToolbarProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType, options?: { shapeType?: ShapeType; color?: string }) => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  gridEnabled: boolean;
  onToggleGrid: () => void;
  gridSnap: boolean;
  onToggleSnap: () => void;
  selectedCount: number;
  onDeleteSelected: () => void;
  onDuplicateSelected: () => void;
  isOpen: boolean;
  onClose: () => void;
}

// Sticky note colors
const STICKY_COLORS = [
  { bg: '#fef3c7', name: 'Yellow' },
  { bg: '#dbeafe', name: 'Blue' },
  { bg: '#fce7f3', name: 'Pink' },
  { bg: '#dcfce7', name: 'Green' },
  { bg: '#f3e8ff', name: 'Purple' },
  { bg: '#fee2e2', name: 'Red' },
  { bg: '#ffedd5', name: 'Orange' },
  { bg: '#ccfbf1', name: 'Teal' },
];

// Shape options
const SHAPE_OPTIONS: { type: ShapeType; icon: React.ReactNode; label: string }[] = [
  { type: 'rectangle', icon: <Square className="w-6 h-6" />, label: 'Rectangle' },
  { type: 'circle', icon: <Circle className="w-6 h-6" />, label: 'Circle' },
  { type: 'triangle', icon: <Triangle className="w-6 h-6" />, label: 'Triangle' },
  { type: 'diamond', icon: <Diamond className="w-6 h-6" />, label: 'Diamond' },
];

export const MobileToolbar: React.FC<MobileToolbarProps> = ({
  activeTool,
  onToolChange,
  zoom,
  onZoomIn,
  onZoomOut,
  onResetView,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  gridEnabled,
  onToggleGrid,
  gridSnap,
  onToggleSnap,
  selectedCount,
  onDeleteSelected,
  onDuplicateSelected,
  isOpen,
  onClose
}) => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState(STICKY_COLORS[0].bg);
  const [selectedShape, setSelectedShape] = useState<ShapeType>('rectangle');
  const sheetRef = useRef<HTMLDivElement>(null);

  // Handle drag to dismiss
  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.y > 100) {
      onClose();
    }
  };

  // Quick tools for the bottom bar
  const quickTools = [
    { id: 'select', icon: <MousePointer2 className="w-6 h-6" />, label: 'Select' },
    { id: 'hand', icon: <Hand className="w-6 h-6" />, label: 'Pan' },
    { id: 'sticky', icon: <StickyNote className="w-6 h-6" />, label: 'Sticky' },
    { id: 'more', icon: <MoreHorizontal className="w-6 h-6" />, label: 'More' },
  ];

  return (
    <>
      {/* Bottom Quick Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 sm:hidden">
        {/* Selection Actions */}
        <AnimatePresence>
          {selectedCount > 0 && (
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="mx-4 mb-2 bg-indigo-600 text-white rounded-2xl shadow-lg overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3">
                <span className="font-medium">{selectedCount} selected</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={onDuplicateSelected}
                    className="p-2 bg-indigo-500 rounded-xl active:bg-indigo-400"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                  <button
                    onClick={onDeleteSelected}
                    className="p-2 bg-red-500 rounded-xl active:bg-red-400"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => onToolChange('select')}
                    className="p-2 bg-indigo-500 rounded-xl active:bg-indigo-400"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Tools */}
        <div className="bg-white border-t border-gray-200 px-2 py-2">
          <div className="flex items-center justify-around">
            {quickTools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => {
                  if (tool.id === 'more') {
                    onClose(); // Toggle full sheet
                  } else {
                    onToolChange(tool.id as ToolType);
                  }
                }}
                className={`
                  flex flex-col items-center gap-1 p-3 rounded-xl min-w-[64px] min-h-[64px]
                  ${activeTool === tool.id 
                    ? 'bg-indigo-100 text-indigo-600' 
                    : 'text-gray-600 active:bg-gray-100'
                  }
                `}
              >
                {tool.icon}
                <span className="text-[10px] font-medium">{tool.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Safe area padding for iOS */}
        <div className="h-[env(safe-area-inset-bottom)] bg-white" />
      </div>

      {/* Full Sheet Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-50 sm:hidden"
              onClick={onClose}
            />

            {/* Sheet */}
            <motion.div
              ref={sheetRef}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEnd}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-50 max-h-[80vh] overflow-auto sm:hidden"
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
              </div>

              <div className="px-4 pb-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Tools</h2>
                  <button
                    onClick={onClose}
                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-full"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Undo/Redo */}
                <div className="flex gap-2 mb-6">
                  <button
                    onClick={onUndo}
                    disabled={!canUndo}
                    className="flex-1 flex items-center justify-center gap-2 p-3 bg-gray-100 rounded-xl disabled:opacity-40 active:bg-gray-200"
                  >
                    <Undo2 className="w-5 h-5" />
                    <span className="text-sm font-medium">Undo</span>
                  </button>
                  <button
                    onClick={onRedo}
                    disabled={!canRedo}
                    className="flex-1 flex items-center justify-center gap-2 p-3 bg-gray-100 rounded-xl disabled:opacity-40 active:bg-gray-200"
                  >
                    <Redo2 className="w-5 h-5" />
                    <span className="text-sm font-medium">Redo</span>
                  </button>
                </div>

                {/* Tools Grid */}
                <div className="grid grid-cols-4 gap-3 mb-6">
                  <ToolButton
                    icon={<MousePointer2 className="w-6 h-6" />}
                    label="Select"
                    active={activeTool === 'select'}
                    onClick={() => onToolChange('select')}
                  />
                  <ToolButton
                    icon={<Hand className="w-6 h-6" />}
                    label="Pan"
                    active={activeTool === 'hand'}
                    onClick={() => onToolChange('hand')}
                  />
                  <ToolButton
                    icon={<StickyNote className="w-6 h-6" />}
                    label="Sticky"
                    active={activeTool === 'sticky'}
                    onClick={() => setExpandedSection(expandedSection === 'sticky' ? null : 'sticky')}
                    hasOptions
                  />
                  <ToolButton
                    icon={<Type className="w-6 h-6" />}
                    label="Text"
                    active={activeTool === 'text'}
                    onClick={() => onToolChange('text')}
                  />
                  <ToolButton
                    icon={<Shapes className="w-6 h-6" />}
                    label="Shapes"
                    active={activeTool === 'shape'}
                    onClick={() => setExpandedSection(expandedSection === 'shapes' ? null : 'shapes')}
                    hasOptions
                  />
                  <ToolButton
                    icon={<GitBranch className="w-6 h-6" />}
                    label="Connect"
                    active={activeTool === 'connector'}
                    onClick={() => onToolChange('connector')}
                  />
                  <ToolButton
                    icon={<Frame className="w-6 h-6" />}
                    label="Frame"
                    active={activeTool === 'frame'}
                    onClick={() => onToolChange('frame')}
                  />
                  <ToolButton
                    icon={<ImageIcon className="w-6 h-6" />}
                    label="Image"
                    active={activeTool === 'image'}
                    onClick={() => onToolChange('image')}
                  />
                </div>

                {/* Sticky Color Options */}
                <AnimatePresence>
                  {expandedSection === 'sticky' && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden mb-4"
                    >
                      <p className="text-sm font-medium text-gray-700 mb-3">Choose color</p>
                      <div className="grid grid-cols-4 gap-2">
                        {STICKY_COLORS.map((color) => (
                          <button
                            key={color.name}
                            onClick={() => {
                              setSelectedColor(color.bg);
                              onToolChange('sticky', { color: color.bg });
                              setExpandedSection(null);
                            }}
                            className={`
                              h-14 rounded-xl border-2
                              ${selectedColor === color.bg 
                                ? 'border-indigo-500 ring-2 ring-indigo-200' 
                                : 'border-gray-200'
                              }
                            `}
                            style={{ backgroundColor: color.bg }}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Shape Options */}
                <AnimatePresence>
                  {expandedSection === 'shapes' && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden mb-4"
                    >
                      <p className="text-sm font-medium text-gray-700 mb-3">Choose shape</p>
                      <div className="grid grid-cols-4 gap-2">
                        {SHAPE_OPTIONS.map((shape) => (
                          <button
                            key={shape.type}
                            onClick={() => {
                              setSelectedShape(shape.type);
                              onToolChange('shape', { shapeType: shape.type });
                              setExpandedSection(null);
                            }}
                            className={`
                              flex flex-col items-center gap-2 p-3 rounded-xl border-2
                              ${selectedShape === shape.type 
                                ? 'border-indigo-500 bg-indigo-50' 
                                : 'border-gray-200'
                              }
                            `}
                          >
                            {shape.icon}
                            <span className="text-xs">{shape.label}</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* View Controls */}
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-sm font-medium text-gray-700 mb-3">View</p>
                  
                  {/* Zoom */}
                  <div className="flex items-center gap-3 mb-4">
                    <button
                      onClick={onZoomOut}
                      className="p-3 bg-gray-100 rounded-xl active:bg-gray-200"
                    >
                      <ZoomOut className="w-5 h-5" />
                    </button>
                    <span className="flex-1 text-center font-medium">{Math.round(zoom * 100)}%</span>
                    <button
                      onClick={onZoomIn}
                      className="p-3 bg-gray-100 rounded-xl active:bg-gray-200"
                    >
                      <ZoomIn className="w-5 h-5" />
                    </button>
                    <button
                      onClick={onResetView}
                      className="p-3 bg-gray-100 rounded-xl active:bg-gray-200"
                    >
                      <Maximize className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Toggles */}
                  <div className="flex gap-3">
                    <ToggleButton
                      icon={<Grid3X3 className="w-5 h-5" />}
                      label="Grid"
                      active={gridEnabled}
                      onClick={onToggleGrid}
                    />
                    <ToggleButton
                      icon={<Magnet className="w-5 h-5" />}
                      label="Snap"
                      active={gridSnap}
                      onClick={onToggleSnap}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

// Tool Button Component
interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
  hasOptions?: boolean;
}

const ToolButton: React.FC<ToolButtonProps> = ({ icon, label, active, onClick, hasOptions }) => (
  <button
    onClick={onClick}
    className={`
      flex flex-col items-center gap-2 p-3 rounded-xl border-2 min-h-[80px]
      ${active 
        ? 'border-indigo-500 bg-indigo-50 text-indigo-600' 
        : 'border-gray-200 text-gray-600 active:bg-gray-50'
      }
    `}
  >
    <div className="relative">
      {icon}
      {hasOptions && (
        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gray-400 rounded-full flex items-center justify-center">
          <ChevronDown className="w-3 h-3 text-white" />
        </div>
      )}
    </div>
    <span className="text-xs font-medium">{label}</span>
  </button>
);

// Toggle Button Component
interface ToggleButtonProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

const ToggleButton: React.FC<ToggleButtonProps> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`
      flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2
      ${active 
        ? 'border-indigo-500 bg-indigo-50 text-indigo-600' 
        : 'border-gray-200 text-gray-600 active:bg-gray-50'
      }
    `}
  >
    {icon}
    <span className="text-sm font-medium">{label}</span>
  </button>
);

export default MobileToolbar;
