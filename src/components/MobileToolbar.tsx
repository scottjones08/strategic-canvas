/**
 * Mobile Toolbar Component
 * 
 * Features:
 * - Bottom sheet style toolbar for mobile devices
 * - Touch-optimized buttons (min 44px)
 * - Swipe gestures for tool selection
 * - Collapsible sections
 * - Quick actions drawer
 * - Haptic feedback support
 * - More tools (Pen, YouTube, Table, Bucket, Links)
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  MoreHorizontal,
  ChevronUp,
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
  LayoutGrid,
  X,
  Check,
  Palette,
  Square,
  Circle,
  Triangle,
  Diamond,
  Pencil,
  Youtube,
  Table2,
  FolderOpen,
  Link as LinkIcon,
  Clock,
  Share2,
  Settings,
  Layers,
  AlignCenter,
  AlignLeft,
  AlignRight,
  Sparkles
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
  onAlignLeft?: () => void;
  onAlignCenter?: () => void;
  onAlignRight?: () => void;
  onAlignTop?: () => void;
  onAlignMiddle?: () => void;
  onAlignBottom?: () => void;
  onDistributeHorizontal?: () => void;
  onDistributeVertical?: () => void;
  isOpen: boolean;
  onClose: () => void;
  onShowTimer?: () => void;
  onShare?: () => void;
  participantCount?: number;
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

// Haptic feedback helper
const hapticFeedback = (type: 'light' | 'medium' | 'heavy' = 'light') => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    const patterns = {
      light: 10,
      medium: 20,
      heavy: 30
    };
    navigator.vibrate(patterns[type]);
  }
};

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
  onAlignLeft,
  onAlignCenter,
  onAlignRight,
  onAlignTop,
  onAlignMiddle,
  onAlignBottom,
  onDistributeHorizontal,
  onDistributeVertical,
  isOpen,
  onClose,
  onShowTimer,
  onShare,
  participantCount = 1
}) => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState(STICKY_COLORS[0].bg);
  const [selectedShape, setSelectedShape] = useState<ShapeType>('rectangle');
  const [activeTab, setActiveTab] = useState<'tools' | 'actions' | 'view'>('tools');
  const sheetRef = useRef<HTMLDivElement>(null);

  // Handle drag to dismiss
  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.y > 100) {
      hapticFeedback('medium');
      onClose();
    }
  };

  // Handle tool selection with haptic feedback
  const handleToolSelect = useCallback((tool: ToolType, options?: { shapeType?: ShapeType; color?: string }) => {
    hapticFeedback('light');
    onToolChange(tool, options);
  }, [onToolChange]);

  // Quick tools for the bottom bar (show 5 most used)
  const quickTools = [
    { id: 'select', icon: <MousePointer2 className="w-6 h-6" />, label: 'Select' },
    { id: 'hand', icon: <Hand className="w-6 h-6" />, label: 'Pan' },
    { id: 'sticky', icon: <StickyNote className="w-6 h-6" />, label: 'Sticky' },
    { id: 'pen', icon: <Pencil className="w-6 h-6" />, label: 'Draw' },
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
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 400 }}
              className="mx-3 mb-2 bg-gradient-to-r from-navy-700 to-navy-600 text-white rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <Layers className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-sm">{selectedCount} selected</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {selectedCount > 1 && (
                    <>
                      <button
                        onClick={() => { hapticFeedback('light'); onAlignLeft?.(); }}
                        className="p-2.5 bg-white/20 rounded-xl active:bg-white/30"
                        title="Align left"
                      >
                        <AlignLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { hapticFeedback('light'); onAlignCenter?.(); }}
                        className="p-2.5 bg-white/20 rounded-xl active:bg-white/30"
                        title="Align center"
                      >
                        <AlignCenter className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => { hapticFeedback('light'); onDuplicateSelected(); }}
                    className="p-2.5 bg-white/20 rounded-xl active:bg-white/30"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => { hapticFeedback('medium'); onDeleteSelected(); }}
                    className="p-2.5 bg-red-500 rounded-xl active:bg-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => { hapticFeedback('light'); onToolChange('select'); }}
                    className="p-2.5 bg-white/20 rounded-xl active:bg-white/30"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collaboration Badge */}
        <AnimatePresence>
          {participantCount > 1 && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute -top-12 right-3"
            >
              <button
                onClick={onShare}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white rounded-full shadow-lg text-xs font-medium"
              >
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                {participantCount} online
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Tools Bar */}
        <div className="bg-white/95 backdrop-blur-lg border-t border-gray-200/80 px-2 py-2 shadow-lg">
          <div className="flex items-center justify-around">
            {quickTools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => {
                  hapticFeedback('light');
                  if (tool.id === 'more') {
                    onClose(); // Toggle full sheet
                  } else {
                    handleToolSelect(tool.id as ToolType);
                  }
                }}
                className={`
                  flex flex-col items-center gap-1 p-2.5 rounded-xl min-w-[56px] min-h-[56px]
                  transition-all duration-150 active:scale-95
                  ${activeTool === tool.id 
                    ? 'bg-navy-100 text-navy-700 shadow-inner' 
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
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 sm:hidden"
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
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-50 max-h-[85vh] overflow-hidden sm:hidden"
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-gray-300 rounded-full" />
              </div>

              {/* Tabs */}
              <div className="flex border-b border-gray-100 px-4">
                <TabButton 
                  active={activeTab === 'tools'} 
                  onClick={() => { hapticFeedback('light'); setActiveTab('tools'); }}
                  icon={<Palette className="w-4 h-4" />}
                  label="Tools"
                />
                <TabButton 
                  active={activeTab === 'actions'} 
                  onClick={() => { hapticFeedback('light'); setActiveTab('actions'); }}
                  icon={<Sparkles className="w-4 h-4" />}
                  label="Actions"
                />
                <TabButton 
                  active={activeTab === 'view'} 
                  onClick={() => { hapticFeedback('light'); setActiveTab('view'); }}
                  icon={<LayoutGrid className="w-4 h-4" />}
                  label="View"
                />
              </div>

              <div className="px-4 pb-8 overflow-auto max-h-[70vh]">
                {/* Tools Tab */}
                {activeTab === 'tools' && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-4 pt-4"
                  >
                    {/* Main Tools Grid */}
                    <div className="grid grid-cols-4 gap-2">
                      <ToolButton
                        icon={<MousePointer2 className="w-5 h-5" />}
                        label="Select"
                        active={activeTool === 'select'}
                        onClick={() => handleToolSelect('select')}
                      />
                      <ToolButton
                        icon={<Hand className="w-5 h-5" />}
                        label="Pan"
                        active={activeTool === 'hand'}
                        onClick={() => handleToolSelect('hand')}
                      />
                      <ToolButton
                        icon={<StickyNote className="w-5 h-5" />}
                        label="Sticky"
                        active={activeTool === 'sticky'}
                        onClick={() => setExpandedSection(expandedSection === 'sticky' ? null : 'sticky')}
                        hasOptions
                      />
                      <ToolButton
                        icon={<Type className="w-5 h-5" />}
                        label="Text"
                        active={activeTool === 'text'}
                        onClick={() => handleToolSelect('text')}
                      />
                      <ToolButton
                        icon={<Shapes className="w-5 h-5" />}
                        label="Shapes"
                        active={activeTool === 'shape'}
                        onClick={() => setExpandedSection(expandedSection === 'shapes' ? null : 'shapes')}
                        hasOptions
                      />
                      <ToolButton
                        icon={<GitBranch className="w-5 h-5" />}
                        label="Connect"
                        active={activeTool === 'connector'}
                        onClick={() => handleToolSelect('connector')}
                      />
                      <ToolButton
                        icon={<Pencil className="w-5 h-5" />}
                        label="Draw"
                        active={activeTool === 'pen'}
                        onClick={() => handleToolSelect('pen')}
                      />
                      <ToolButton
                        icon={<Frame className="w-5 h-5" />}
                        label="Frame"
                        active={activeTool === 'frame'}
                        onClick={() => handleToolSelect('frame')}
                      />
                      <ToolButton
                        icon={<ImageIcon className="w-5 h-5" />}
                        label="Image"
                        active={activeTool === 'image'}
                        onClick={() => handleToolSelect('image')}
                      />
                      <ToolButton
                        icon={<Youtube className="w-5 h-5" />}
                        label="YouTube"
                        active={activeTool === 'youtube'}
                        onClick={() => handleToolSelect('youtube')}
                      />
                      <ToolButton
                        icon={<Table2 className="w-5 h-5" />}
                        label="Table"
                        active={activeTool === 'table'}
                        onClick={() => handleToolSelect('table')}
                      />
                      <ToolButton
                        icon={<FolderOpen className="w-5 h-5" />}
                        label="Bucket"
                        active={activeTool === 'bucket'}
                        onClick={() => handleToolSelect('bucket')}
                      />
                    </div>

                    {/* Sticky Color Options */}
                    <AnimatePresence>
                      {expandedSection === 'sticky' && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden bg-gray-50 rounded-2xl p-3"
                        >
                          <p className="text-sm font-medium text-gray-700 mb-3">Choose color</p>
                          <div className="grid grid-cols-4 gap-2">
                            {STICKY_COLORS.map((color) => (
                              <button
                                key={color.name}
                                onClick={() => {
                                  setSelectedColor(color.bg);
                                  handleToolSelect('sticky', { color: color.bg });
                                  setExpandedSection(null);
                                }}
                                className={`
                                  h-14 rounded-xl border-2 transition-all active:scale-95
                                  ${selectedColor === color.bg 
                                    ? 'border-navy-500 ring-2 ring-navy-200' 
                                    : 'border-transparent'
                                  }
                                `}
                                style={{ backgroundColor: color.bg }}
                              >
                                {selectedColor === color.bg && (
                                  <Check className="w-5 h-5 text-navy-700 mx-auto" />
                                )}
                              </button>
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
                          className="overflow-hidden bg-gray-50 rounded-2xl p-3"
                        >
                          <p className="text-sm font-medium text-gray-700 mb-3">Choose shape</p>
                          <div className="grid grid-cols-4 gap-2">
                            {SHAPE_OPTIONS.map((shape) => (
                              <button
                                key={shape.type}
                                onClick={() => {
                                  setSelectedShape(shape.type);
                                  handleToolSelect('shape', { shapeType: shape.type });
                                  setExpandedSection(null);
                                }}
                                className={`
                                  flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all active:scale-95
                                  ${selectedShape === shape.type 
                                    ? 'border-navy-500 bg-navy-50' 
                                    : 'border-gray-200 bg-white'
                                  }
                                `}
                              >
                                {shape.icon}
                                <span className="text-xs font-medium">{shape.label}</span>
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}

                {/* Actions Tab */}
                {activeTab === 'actions' && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-4 pt-4"
                  >
                    {/* Undo/Redo */}
                    <div className="flex gap-2">
                      <ActionButton
                        icon={<Undo2 className="w-5 h-5" />}
                        label="Undo"
                        onClick={onUndo}
                        disabled={!canUndo}
                      />
                      <ActionButton
                        icon={<Redo2 className="w-5 h-5" />}
                        label="Redo"
                        onClick={onRedo}
                        disabled={!canRedo}
                      />
                    </div>

                    {/* Timer & Share */}
                    <div className="flex gap-2">
                      <ActionButton
                        icon={<Clock className="w-5 h-5" />}
                        label="Timer"
                        onClick={() => { hapticFeedback('light'); onShowTimer?.(); }}
                        variant="primary"
                      />
                      <ActionButton
                        icon={<Share2 className="w-5 h-5" />}
                        label="Share"
                        onClick={() => { hapticFeedback('light'); onShare?.(); }}
                        variant="primary"
                      />
                    </div>

                    {/* Alignment Tools */}
                    {selectedCount > 1 && (
                      <div className="bg-gray-50 rounded-2xl p-4">
                        <p className="text-sm font-medium text-gray-700 mb-3">Align {selectedCount} items</p>
                        <div className="grid grid-cols-3 gap-2">
                          <AlignButton icon={<AlignLeft className="w-4 h-4" />} onClick={onAlignLeft} />
                          <AlignButton icon={<AlignCenter className="w-4 h-4" />} onClick={onAlignCenter} />
                          <AlignButton icon={<AlignRight className="w-4 h-4" />} onClick={onAlignRight} />
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          <AlignButton icon={<div className="flex flex-col gap-0.5"><div className="w-4 h-0.5 bg-current" /><div className="w-2 h-0.5 bg-current" /><div className="w-4 h-0.5 bg-current" /></div>} onClick={onAlignTop} />
                          <AlignButton icon={<div className="flex flex-col gap-0.5 items-center"><div className="w-4 h-0.5 bg-current" /><div className="w-4 h-0.5 bg-current" /><div className="w-4 h-0.5 bg-current" /></div>} onClick={onAlignMiddle} />
                          <AlignButton icon={<div className="flex flex-col gap-0.5 items-end"><div className="w-4 h-0.5 bg-current" /><div className="w-2 h-0.5 bg-current" /><div className="w-4 h-0.5 bg-current" /></div>} onClick={onAlignBottom} />
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* View Tab */}
                {activeTab === 'view' && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-4 pt-4"
                  >
                    {/* Zoom Controls */}
                    <div className="bg-gray-50 rounded-2xl p-4">
                      <p className="text-sm font-medium text-gray-700 mb-3">Zoom</p>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={onZoomOut}
                          className="p-3 bg-white rounded-xl shadow-sm active:scale-95 transition-transform"
                        >
                          <ZoomOut className="w-5 h-5" />
                        </button>
                        <div className="flex-1 text-center">
                          <span className="text-2xl font-bold text-gray-900">{Math.round(zoom * 100)}%</span>
                        </div>
                        <button
                          onClick={onZoomIn}
                          className="p-3 bg-white rounded-xl shadow-sm active:scale-95 transition-transform"
                        >
                          <ZoomIn className="w-5 h-5" />
                        </button>
                      </div>
                      <button
                        onClick={onResetView}
                        className="w-full mt-3 p-3 bg-white rounded-xl shadow-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
                      >
                        <Maximize className="w-4 h-4" />
                        <span className="font-medium">Reset View</span>
                      </button>
                    </div>

                    {/* Toggles */}
                    <div className="bg-gray-50 rounded-2xl p-4">
                      <p className="text-sm font-medium text-gray-700 mb-3">Settings</p>
                      <div className="space-y-2">
                        <ToggleRow
                          icon={<Grid3X3 className="w-5 h-5" />}
                          label="Show Grid"
                          active={gridEnabled}
                          onClick={onToggleGrid}
                        />
                        <ToggleRow
                          icon={<Magnet className="w-5 h-5" />}
                          label="Snap to Grid"
                          active={gridSnap}
                          onClick={onToggleSnap}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Close Button */}
              <div className="absolute top-2 right-2">
                <button
                  onClick={() => { hapticFeedback('light'); onClose(); }}
                  className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

// Tab Button Component
const TabButton: React.FC<{ 
  active: boolean; 
  onClick: () => void; 
  icon: React.ReactNode;
  label: string;
}> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`
      flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors
      ${active 
        ? 'text-navy-700 border-b-2 border-navy-700' 
        : 'text-gray-500 hover:text-gray-700'
      }
    `}
  >
    {icon}
    {label}
  </button>
);

// Tool Button Component
const ToolButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
  hasOptions?: boolean;
}> = ({ icon, label, active, onClick, hasOptions }) => (
  <button
    onClick={onClick}
    className={`
      flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 min-h-[72px] transition-all active:scale-95
      ${active 
        ? 'border-navy-500 bg-navy-50 text-navy-700' 
        : 'border-gray-100 bg-white text-gray-600 hover:border-gray-200'
      }
    `}
  >
    <div className="relative">
      {icon}
      {hasOptions && (
        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-gray-400 rounded-full flex items-center justify-center">
          <ChevronDown className="w-2.5 h-2.5 text-white" />
        </div>
      )}
    </div>
    <span className="text-[11px] font-medium">{label}</span>
  </button>
);

// Action Button Component
const ActionButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'primary';
}> = ({ icon, label, onClick, disabled, variant = 'default' }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`
      flex-1 flex items-center justify-center gap-2 p-3 rounded-xl font-medium transition-all active:scale-95
      ${disabled 
        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
        : variant === 'primary'
          ? 'bg-navy-50 text-navy-700 hover:bg-navy-100'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }
    `}
  >
    {icon}
    <span>{label}</span>
  </button>
);

// Align Button Component
const AlignButton: React.FC<{
  icon: React.ReactNode;
  onClick?: () => void;
}> = ({ icon, onClick }) => (
  <button
    onClick={onClick}
    className="p-3 bg-white rounded-xl border border-gray-200 flex items-center justify-center hover:border-navy-300 active:scale-95 transition-all"
  >
    {icon}
  </button>
);

// Toggle Row Component
const ToggleRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center justify-between p-3 bg-white rounded-xl hover:bg-gray-50 transition-colors"
  >
    <div className="flex items-center gap-3">
      <div className={`${active ? 'text-navy-700' : 'text-gray-500'}`}>
        {icon}
      </div>
      <span className="font-medium text-gray-700">{label}</span>
    </div>
    <div className={`
      w-11 h-6 rounded-full transition-colors relative
      ${active ? 'bg-navy-700' : 'bg-gray-200'}
    `}>
      <div className={`
        absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform
        ${active ? 'translate-x-6' : 'translate-x-1'}
      `} />
    </div>
  </button>
);

export default MobileToolbar;
