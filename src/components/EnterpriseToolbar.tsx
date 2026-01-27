/**
 * Enterprise Toolbar Component
 * 
 * Features:
 * - Mural-like top toolbar with tool groups
 * - Sticky note quick picker with colors
 * - Shape tools with sub-menus
 * - Template quick access
 * - View controls
 * - Facilitator tools
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MousePointer2,
  Hand,
  Square,
  Type,
  StickyNote,
  Image as ImageIcon,
  Shapes,
  Minus,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize,
  Grid3X3,
  Magnet,
  Lock,
  Unlock,
  Users,
  Timer,
  Presentation,
  Share2,
  MoreHorizontal,
  ChevronDown,
  Circle,
  Triangle,
  Diamond,
  Hexagon,
  Star,
  ArrowRight,
  GitBranch,
  X,
  Plus,
  Download,
  Copy,
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  LayoutGrid,
  Frame,
  Youtube,
  Table2,
  Network,
  Link,
  FolderOpen,
  Inbox
} from 'lucide-react';

export type ToolType = 
  | 'select' 
  | 'hand' 
  | 'sticky' 
  | 'text' 
  | 'shape' 
  | 'connector' 
  | 'frame'
  | 'image'
  | 'youtube'
  | 'table'
  | 'pen'
  | 'mindmap'
  | 'bucket'
  | 'linklist';

export type ShapeType = 'rectangle' | 'circle' | 'triangle' | 'diamond' | 'hexagon' | 'star';

interface EnterpriseToolbarProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType, options?: { shapeType?: ShapeType; color?: string }) => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onFitToContent: () => void;
  gridEnabled: boolean;
  onToggleGrid: () => void;
  gridSnap: boolean;
  onToggleSnap: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  selectedCount: number;
  onAlignLeft: () => void;
  onAlignCenter: () => void;
  onAlignRight: () => void;
  onAlignTop: () => void;
  onAlignMiddle: () => void;
  onAlignBottom: () => void;
  onDistributeHorizontal: () => void;
  onDistributeVertical: () => void;
  onDeleteSelected: () => void;
  onDuplicateSelected: () => void;
  onGroupSelected: () => void;
  onUngroupSelected: () => void;
  onStartPresentation: () => void;
  onOpenShare: () => void;
  onOpenTimer: () => void;
  participantCount: number;
  facilitatorMode: boolean;
  onToggleFacilitatorMode: () => void;
  boardName: string;
  onBoardNameChange: (name: string) => void;
  onOpenMediaModal?: (type: 'youtube' | 'image') => void;
}

// Sticky note colors
const STICKY_COLORS = [
  { bg: '#fef3c7', border: '#fcd34d', name: 'Yellow' },
  { bg: '#dbeafe', border: '#60a5fa', name: 'Blue' },
  { bg: '#fce7f3', border: '#f472b6', name: 'Pink' },
  { bg: '#dcfce7', border: '#4ade80', name: 'Green' },
  { bg: '#f3e8ff', border: '#a78bfa', name: 'Purple' },
  { bg: '#fee2e2', border: '#f87171', name: 'Red' },
  { bg: '#ffedd5', border: '#fb923c', name: 'Orange' },
  { bg: '#ccfbf1', border: '#2dd4bf', name: 'Teal' },
];

// Shape options
const SHAPE_OPTIONS: { type: ShapeType; icon: React.ReactNode; label: string }[] = [
  { type: 'rectangle', icon: <Square className="w-4 h-4" />, label: 'Rectangle' },
  { type: 'circle', icon: <Circle className="w-4 h-4" />, label: 'Circle' },
  { type: 'triangle', icon: <Triangle className="w-4 h-4" />, label: 'Triangle' },
  { type: 'diamond', icon: <Diamond className="w-4 h-4" />, label: 'Diamond' },
];

export const EnterpriseToolbar: React.FC<EnterpriseToolbarProps> = ({
  activeTool,
  onToolChange,
  zoom,
  onZoomIn,
  onZoomOut,
  onResetView,
  onFitToContent,
  gridEnabled,
  onToggleGrid,
  gridSnap,
  onToggleSnap,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  selectedCount,
  onAlignLeft,
  onAlignCenter,
  onAlignRight,
  onAlignTop,
  onAlignMiddle,
  onAlignBottom,
  onDistributeHorizontal,
  onDistributeVertical,
  onDeleteSelected,
  onDuplicateSelected,
  onGroupSelected,
  onUngroupSelected,
  onStartPresentation,
  onOpenShare,
  onOpenTimer,
  participantCount,
  facilitatorMode,
  onToggleFacilitatorMode,
  boardName,
  onBoardNameChange,
  onOpenMediaModal
}) => {
  const [showStickyPicker, setShowStickyPicker] = useState(false);
  const [showShapePicker, setShowShapePicker] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showAlignMenu, setShowAlignMenu] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(boardName);
  
  const nameInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);
  
  const handleNameSubmit = () => {
    if (tempName.trim()) {
      onBoardNameChange(tempName.trim());
    } else {
      setTempName(boardName);
    }
    setIsEditingName(false);
  };

  return (
    <>
      {/* Main Toolbar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none">
        {/* Top row - Board name and participants */}
        <div className="flex items-center gap-3 pointer-events-auto">
          {/* Board Name */}
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 px-4 py-2">
            {isEditingName ? (
              <input
                ref={nameInputRef}
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onBlur={handleNameSubmit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleNameSubmit();
                  if (e.key === 'Escape') {
                    setTempName(boardName);
                    setIsEditingName(false);
                  }
                }}
                className="text-sm font-semibold text-gray-900 bg-transparent border-none outline-none min-w-[150px]"
              />
            ) : (
              <button
                onClick={() => setIsEditingName(true)}
                className="text-sm font-semibold text-gray-900 hover:text-indigo-600 transition-colors"
              >
                {boardName}
              </button>
            )}
          </div>
          
          {/* Participants */}
          <button
            onClick={onOpenShare}
            className="flex items-center gap-2 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 px-3 py-2 hover:bg-gray-50 transition-colors"
          >
            <div className="flex -space-x-2">
              <div className="w-6 h-6 rounded-full bg-indigo-500 border-2 border-white flex items-center justify-center text-white text-xs font-medium">
                S
              </div>
              {participantCount > 1 && (
                <div className="w-6 h-6 rounded-full bg-green-500 border-2 border-white flex items-center justify-center text-white text-xs font-medium">
                  +{participantCount - 1}
                </div>
              )}
            </div>
            <span className="text-sm text-gray-600">Share</span>
          </button>
        </div>
        
        {/* Tools row - responsive with horizontal scroll on small screens */}
        <div className="flex items-center gap-1 sm:gap-2 bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 p-1.5 sm:p-2 pointer-events-auto max-w-[95vw] overflow-x-auto scrollbar-hide">
          {/* Primary Tools */}
          <div className="flex items-center gap-1">
            {/* Select Tool */}
            <ToolbarButton
              active={activeTool === 'select'}
              onClick={() => onToolChange('select')}
              icon={<MousePointer2 className="w-5 h-5" />}
              label="Select"
              shortcut="V"
            />
            
            {/* Hand/Pan Tool */}
            <ToolbarButton
              active={activeTool === 'hand'}
              onClick={() => onToolChange('hand')}
              icon={<Hand className="w-5 h-5" />}
              label="Pan"
              shortcut="H"
            />
          </div>
          
          <div className="w-px h-8 bg-gray-200" />
          
          {/* Content Tools */}
          <div className="flex items-center gap-1">
            {/* Sticky Note - with color picker */}
            <div className="relative">
              <ToolbarButton
                active={activeTool === 'sticky' || showStickyPicker}
                onClick={() => {
                  // Only toggle picker, don't add sticky until user selects color
                  setShowStickyPicker(!showStickyPicker);
                  // Close other pickers
                  setShowShapePicker(false);
                }}
                onRightClick={(e) => {
                  e.preventDefault();
                  setShowStickyPicker(!showStickyPicker);
                  setShowShapePicker(false);
                }}
                icon={<StickyNote className="w-5 h-5" />}
                label="Sticky"
                shortcut="N"
                badge={<div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-yellow-400 border border-white" />}
              />
              
              {/* Sticky Color Picker */}
              <AnimatePresence>
                {showStickyPicker && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 p-3 z-[60]"
                  >
                    <div className="grid grid-cols-4 gap-2">
                      {STICKY_COLORS.map((color) => (
                        <button
                          key={color.name}
                          onClick={() => {
                            onToolChange('sticky', { color: color.bg });
                            setShowStickyPicker(false);
                          }}
                          className="w-10 h-10 rounded-lg border-2 hover:scale-110 transition-transform shadow-sm"
                          style={{ 
                            backgroundColor: color.bg, 
                            borderColor: color.border 
                          }}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Text Tool */}
            <ToolbarButton
              active={activeTool === 'text'}
              onClick={() => onToolChange('text')}
              icon={<Type className="w-5 h-5" />}
              label="Text"
              shortcut="T"
            />
            
            {/* Shape Tool - with shape picker */}
            <div className="relative">
              <ToolbarButton
                active={activeTool === 'shape' || showShapePicker}
                onClick={() => {
                  // Only toggle picker, don't add shape until user selects one
                  setShowShapePicker(!showShapePicker);
                  // Close other pickers
                  setShowStickyPicker(false);
                }}
                icon={<Shapes className="w-5 h-5" />}
                label="Shapes"
                shortcut="S"
              />
              
              {/* Shape Picker */}
              <AnimatePresence>
                {showShapePicker && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 p-2 z-[60]"
                  >
                    <div className="grid grid-cols-2 gap-1">
                      {SHAPE_OPTIONS.map((shape) => (
                        <button
                          key={shape.type}
                          onClick={() => {
                            onToolChange('shape', { shapeType: shape.type });
                            setShowShapePicker(false);
                          }}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          {shape.icon}
                          <span className="text-sm text-gray-700">{shape.label}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Connector Tool */}
            <ToolbarButton
              active={activeTool === 'connector'}
              onClick={() => onToolChange('connector')}
              icon={<GitBranch className="w-5 h-5" />}
              label="Connect"
              shortcut="C"
            />
            
            {/* Frame Tool */}
            <ToolbarButton
              active={activeTool === 'frame'}
              onClick={() => onToolChange('frame')}
              icon={<Frame className="w-5 h-5" />}
              label="Frame"
              shortcut="F"
            />
            
            {/* Mind Map Tool */}
            <ToolbarButton
              active={activeTool === 'mindmap'}
              onClick={() => onToolChange('mindmap')}
              icon={<Network className="w-5 h-5" />}
              label="Mind Map"
              shortcut="M"
            />
            
            {/* YouTube Tool */}
            <ToolbarButton
              active={activeTool === 'youtube'}
              onClick={() => onOpenMediaModal?.('youtube')}
              icon={<Youtube className="w-5 h-5" />}
              label="Video"
              shortcut="Y"
            />
            
            {/* Image Tool */}
            <ToolbarButton
              active={activeTool === 'image'}
              onClick={() => onOpenMediaModal?.('image')}
              icon={<ImageIcon className="w-5 h-5" />}
              label="Image"
              shortcut="I"
            />
            
            {/* Table Tool */}
            <ToolbarButton
              active={activeTool === 'table'}
              onClick={() => onToolChange('table')}
              icon={<Table2 className="w-5 h-5" />}
              label="Table"
              shortcut="B"
            />
            
            {/* Photo Bucket Tool */}
            <ToolbarButton
              active={activeTool === 'bucket'}
              onClick={() => onToolChange('bucket')}
              icon={<Inbox className="w-5 h-5" />}
              label="Bucket"
              shortcut="U"
            />
            
            {/* Link List Tool */}
            <ToolbarButton
              active={activeTool === 'linklist'}
              onClick={() => onToolChange('linklist')}
              icon={<Link className="w-5 h-5" />}
              label="Links"
              shortcut="L"
            />
          </div>
          
          <div className="w-px h-8 bg-gray-200" />
          
          {/* Actions */}
          <div className="flex items-center gap-1">
            <ToolbarButton
              onClick={onUndo}
              disabled={!canUndo}
              icon={<Undo2 className="w-5 h-5" />}
              label="Undo"
              shortcut="Ctrl+Z"
            />
            <ToolbarButton
              onClick={onRedo}
              disabled={!canRedo}
              icon={<Redo2 className="w-5 h-5" />}
              label="Redo"
              shortcut="Ctrl+Y"
            />
          </div>
          
          <div className="w-px h-8 bg-gray-200" />
          
          {/* View Controls */}
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-1 px-2">
              <button
                onClick={onZoomOut}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-gray-700 min-w-[50px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={onZoomIn}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
            
            <ToolbarButton
              active={gridEnabled}
              onClick={onToggleGrid}
              icon={<Grid3X3 className="w-5 h-5" />}
              label="Grid"
            />
            
            <ToolbarButton
              active={gridSnap}
              onClick={onToggleSnap}
              icon={<Magnet className="w-5 h-5" />}
              label="Snap"
            />
          </div>
          
          <div className="w-px h-8 bg-gray-200" />
          
          {/* More Menu */}
          <div className="relative">
            <ToolbarButton
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              icon={<MoreHorizontal className="w-5 h-5" />}
              label="More"
            />
            
            <AnimatePresence>
              {showMoreMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-[60] min-w-[200px]"
                >
                  <MenuItem icon={<Download className="w-4 h-4" />} label="Export board" />
                  <MenuItem icon={<Copy className="w-4 h-4" />} label="Duplicate board" />
                  <div className="h-px bg-gray-200 my-1" />
                  <MenuItem 
                    icon={facilitatorMode ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />} 
                    label={facilitatorMode ? "Exit facilitator mode" : "Facilitator mode"}
                    onClick={onToggleFacilitatorMode}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        
        {/* Selection Toolbar */}
        <AnimatePresence>
          {selectedCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2 bg-indigo-600 text-white rounded-xl shadow-lg px-3 py-2 pointer-events-auto"
            >
              <span className="text-sm font-medium px-2">
                {selectedCount} selected
              </span>
              
              <div className="w-px h-5 bg-indigo-400" />
              
              {/* Alignment */}
              <div className="relative">
                <button
                  onClick={() => setShowAlignMenu(!showAlignMenu)}
                  className="p-1.5 hover:bg-indigo-500 rounded-lg transition-colors"
                >
                  <AlignCenter className="w-4 h-4" />
                </button>
                
                <AnimatePresence>
                  {showAlignMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 p-2 z-50"
                    >
                      <div className="flex gap-1">
                        <button onClick={onAlignLeft} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600" title="Align left">
                          <AlignLeft className="w-4 h-4" />
                        </button>
                        <button onClick={onAlignCenter} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600" title="Align center">
                          <AlignCenter className="w-4 h-4" />
                        </button>
                        <button onClick={onAlignRight} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600" title="Align right">
                          <AlignRight className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex gap-1 mt-1">
                        <button onClick={onAlignTop} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600" title="Align top">
                          <AlignVerticalJustifyStart className="w-4 h-4" />
                        </button>
                        <button onClick={onAlignMiddle} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600" title="Align middle">
                          <AlignVerticalJustifyCenter className="w-4 h-4" />
                        </button>
                        <button onClick={onAlignBottom} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600" title="Align bottom">
                          <AlignVerticalJustifyEnd className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              <button
                onClick={onDuplicateSelected}
                className="p-1.5 hover:bg-indigo-500 rounded-lg transition-colors"
                title="Duplicate (Ctrl+D)"
              >
                <Copy className="w-4 h-4" />
              </button>
              
              <button
                onClick={onDeleteSelected}
                className="p-1.5 hover:bg-red-500 rounded-lg transition-colors"
                title="Delete (Del)"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Right side - Facilitator tools */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <button
          onClick={onOpenTimer}
          className="flex items-center gap-2 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 px-3 py-2 hover:bg-gray-50 transition-colors"
        >
          <Timer className="w-5 h-5 text-gray-600" />
          <span className="text-sm text-gray-600 hidden sm:inline">Timer</span>
        </button>
        
        <button
          onClick={onStartPresentation}
          className="flex items-center gap-2 bg-indigo-600 text-white rounded-xl shadow-lg px-4 py-2 hover:bg-indigo-700 transition-colors"
        >
          <Presentation className="w-5 h-5" />
          <span className="text-sm font-medium hidden sm:inline">Present</span>
        </button>
      </div>
      
      {/* Click outside to close menus */}
      {(showStickyPicker || showShapePicker || showMoreMenu || showAlignMenu) && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowStickyPicker(false);
            setShowShapePicker(false);
            setShowMoreMenu(false);
            setShowAlignMenu(false);
          }}
        />
      )}
    </>
  );
};

// Helper Components

interface ToolbarButtonProps {
  active?: boolean;
  onClick: () => void;
  onRightClick?: (e: React.MouseEvent) => void;
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  disabled?: boolean;
  badge?: React.ReactNode;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  active,
  onClick,
  onRightClick,
  icon,
  label,
  shortcut,
  disabled,
  badge
}) => (
  <button
    onClick={onClick}
    onContextMenu={onRightClick}
    disabled={disabled}
    className={`
      relative flex flex-col items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl transition-all flex-shrink-0
      ${active 
        ? 'bg-indigo-100 text-indigo-600' 
        : 'hover:bg-gray-100 text-gray-600'
      }
      ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
    `}
    title={`${label}${shortcut ? ` (${shortcut})` : ''}`}
  >
    {icon}
    <span className="text-[9px] sm:text-[10px] font-medium mt-0.5 hidden sm:block">{label}</span>
    {badge}
  </button>
);

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  shortcut?: string;
}

const MenuItem: React.FC<MenuItemProps> = ({ icon, label, onClick, shortcut }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
  >
    <div className="flex items-center gap-3">
      <span className="text-gray-500">{icon}</span>
      <span>{label}</span>
    </div>
    {shortcut && (
      <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs text-gray-500">
        {shortcut}
      </kbd>
    )}
  </button>
);

export default EnterpriseToolbar;
