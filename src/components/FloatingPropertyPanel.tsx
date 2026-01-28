/**
 * Floating Property Panel
 * 
 * Features:
 * - Context-sensitive properties based on selected element type
 * - Draggable positioning
 * - Collapsible sections
 * - Color picker with presets
 * - Font size and style controls
 * - Alignment tools
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  GripVertical,
  Type,
  Palette,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
  ChevronDown,
  ChevronUp,
  Minus,
  Plus,
  Trash2,
  Copy,
  Lock,
  Unlock,
  Move,
  ArrowUp,
  ArrowDown,
  LayoutGrid,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  Square,
  RotateCw
} from 'lucide-react';
import type { VisualNode } from '../types/board';

interface FloatingPropertyPanelProps {
  node: VisualNode;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updates: Partial<VisualNode>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onLockToggle: () => void;
  position?: { x: number; y: number };
  onPositionChange?: (pos: { x: number; y: number }) => void;
}

// Color presets
const COLOR_PRESETS = [
  { bg: '#fef3c7', border: '#fcd34d', name: 'Yellow' },
  { bg: '#dbeafe', border: '#60a5fa', name: 'Blue' },
  { bg: '#fce7f3', border: '#f472b6', name: 'Pink' },
  { bg: '#dcfce7', border: '#4ade80', name: 'Green' },
  { bg: '#f3e8ff', border: '#a78bfa', name: 'Purple' },
  { bg: '#fee2e2', border: '#f87171', name: 'Red' },
  { bg: '#ffedd5', border: '#fb923c', name: 'Orange' },
  { bg: '#ccfbf1', border: '#2dd4bf', name: 'Teal' },
  { bg: '#ffffff', border: '#e5e7eb', name: 'White' },
  { bg: '#1f2937', border: '#374151', name: 'Dark', text: '#ffffff' },
];

// Font size options
const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 40, 48];

export const FloatingPropertyPanel: React.FC<FloatingPropertyPanelProps> = ({
  node,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  onDuplicate,
  onBringToFront,
  onSendToBack,
  onLockToggle,
  position = { x: 20, y: 80 },
  onPositionChange
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [panelPos, setPanelPos] = useState(position);
  const [expandedSections, setExpandedSections] = useState<string[]>(['style', 'text']);
  const panelRef = useRef<HTMLDivElement>(null);

  // Update local position when prop changes (only on x/y value changes)
  useEffect(() => {
    setPanelPos(prev => {
      if (prev.x !== position.x || prev.y !== position.y) {
        return position;
      }
      return prev;
    });
  }, [position.x, position.y]);

  // Handle drag start
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-drag-handle]')) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - panelPos.x,
        y: e.clientY - panelPos.y
      });
      e.preventDefault();
    }
  };

  // Handle drag
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newPos = {
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      };
      
      // Keep within viewport bounds
      const maxX = window.innerWidth - 300;
      const maxY = window.innerHeight - 100;
      
      setPanelPos({
        x: Math.max(10, Math.min(newPos.x, maxX)),
        y: Math.max(10, Math.min(newPos.y, maxY))
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      onPositionChange?.(panelPos);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, panelPos, onPositionChange]);

  // Toggle section expansion
  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  // Check if section is expanded
  const isExpanded = (section: string) => expandedSections.includes(section);

  if (!isOpen) return null;

  const hasTextContent = !['image', 'youtube', 'bucket', 'connector', 'drawing'].includes(node.type);
  const isShape = node.type === 'shape';
  const isSticky = node.type === 'sticky';
  const isFrame = node.type === 'frame';

  // Mobile optimized position
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  const mobileStyle = isMobile ? {
    left: '50%',
    top: 'auto',
    bottom: '80px',
    transform: 'translateX(-50%)',
    width: '90vw',
    maxWidth: '360px'
  } : {
    left: panelPos.x,
    top: panelPos.y
  };

  return (
    <motion.div
      ref={panelRef}
      initial={{ opacity: 0, x: isMobile ? 0 : -20, y: isMobile ? 20 : 0 }}
      animate={{ opacity: 1, x: isMobile ? 0 : 0, y: 0 }}
      exit={{ opacity: 0, x: isMobile ? 0 : -20, y: isMobile ? 20 : 0 }}
      className={`
        fixed bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden
        ${isMobile ? 'w-[90vw] max-w-[360px]' : 'w-72'}
        ${isDragging ? 'cursor-grabbing select-none' : ''}
      `}
      style={isMobile ? mobileStyle : { left: panelPos.x, top: panelPos.y }}
      onMouseDown={!isMobile ? handleMouseDown : undefined}
    >
      {/* Header */}
      <div 
        data-drag-handle
        className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100 cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-semibold text-gray-700">
            {node.type === 'mindmap' ? 'Mind Map' : 
             node.type === 'youtube' ? 'YouTube' :
             node.type === 'linklist' ? 'Link List' :
             node.type.charAt(0).toUpperCase() + node.type.slice(1)} Properties
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Content - no scrollbar visible */}
      <div className="max-h-[70vh] overflow-y-auto scrollbar-hide">
        {/* Quick Actions */}
        <div className="flex items-center justify-between gap-1 p-2 border-b border-gray-100">
          <ActionButton
            icon={<Copy className="w-4 h-4" />}
            label="Duplicate"
            onClick={onDuplicate}
          />
          <ActionButton
            icon={<ArrowUp className="w-4 h-4" />}
            label="To Front"
            onClick={onBringToFront}
          />
          <ActionButton
            icon={<ArrowDown className="w-4 h-4" />}
            label="To Back"
            onClick={onSendToBack}
          />
          <ActionButton
            icon={node.locked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            label={node.locked ? 'Unlock' : 'Lock'}
            onClick={onLockToggle}
            active={node.locked}
          />
          <ActionButton
            icon={<Trash2 className="w-4 h-4" />}
            label="Delete"
            onClick={onDelete}
            danger
          />
        </div>

        {/* Style Section */}
        <Section 
          title="Style" 
          icon={<Palette className="w-4 h-4" />}
          expanded={isExpanded('style')}
          onToggle={() => toggleSection('style')}
        >
          {/* Color Picker */}
          <div className="mb-4">
            <label className="text-xs font-medium text-gray-500 mb-2 block">Color</label>
            <div className="grid grid-cols-5 gap-1.5">
              {COLOR_PRESETS.map((color) => (
                <button
                  key={color.name}
                  onClick={() => onUpdate({ color: color.bg })}
                  className={`
                    w-9 h-9 rounded-lg border-2 transition-all
                    ${node.color === color.bg 
                      ? 'border-indigo-500 ring-2 ring-indigo-100' 
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                  style={{ backgroundColor: color.bg }}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          {/* Opacity */}
          <div className="mb-4">
            <label className="text-xs font-medium text-gray-500 mb-2 block">
              Opacity ({Math.round((node.opacity ?? 1) * 100)}%)
            </label>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              value={node.opacity ?? 1}
              onChange={(e) => onUpdate({ opacity: parseFloat(e.target.value) })}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
          </div>
        </Section>

        {/* Text Section */}
        {hasTextContent && (
          <Section
            title="Text"
            icon={<Type className="w-4 h-4" />}
            expanded={isExpanded('text')}
            onToggle={() => toggleSection('text')}
          >
            {/* Font Size */}
            <div className="mb-4">
              <label className="text-xs font-medium text-gray-500 mb-2 block">Size</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onUpdate({ fontSize: Math.max(10, (node.fontSize || 14) - 2) })}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="flex-1 text-center text-sm font-medium">
                  {node.fontSize || 14}px
                </span>
                <button
                  onClick={() => onUpdate({ fontSize: Math.min(72, (node.fontSize || 14) + 2) })}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Font Style */}
            <div className="mb-4">
              <label className="text-xs font-medium text-gray-500 mb-2 block">Style</label>
              <div className="flex gap-1">
                <StyleButton
                  icon={<Bold className="w-4 h-4" />}
                  active={node.fontWeight === 'bold'}
                  onClick={() => onUpdate({ fontWeight: node.fontWeight === 'bold' ? 'normal' : 'bold' })}
                />
                <StyleButton
                  icon={<Italic className="w-4 h-4" />}
                  active={node.fontStyle === 'italic'}
                  onClick={() => onUpdate({ fontStyle: node.fontStyle === 'italic' ? 'normal' : 'italic' })}
                />
              </div>
            </div>

            {/* Text Alignment */}
            <div className="mb-4">
              <label className="text-xs font-medium text-gray-500 mb-2 block">Alignment</label>
              <div className="flex gap-1">
                <StyleButton
                  icon={<AlignLeft className="w-4 h-4" />}
                  active={node.textAlign === 'left'}
                  onClick={() => onUpdate({ textAlign: 'left' })}
                />
                <StyleButton
                  icon={<AlignCenter className="w-4 h-4" />}
                  active={!node.textAlign || node.textAlign === 'center'}
                  onClick={() => onUpdate({ textAlign: 'center' })}
                />
                <StyleButton
                  icon={<AlignRight className="w-4 h-4" />}
                  active={node.textAlign === 'right'}
                  onClick={() => onUpdate({ textAlign: 'right' })}
                />
              </div>
            </div>
          </Section>
        )}

        {/* Dimensions Section */}
        <Section
          title="Dimensions"
          icon={<Maximize2 className="w-4 h-4" />}
          expanded={isExpanded('dimensions')}
          onToggle={() => toggleSection('dimensions')}
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Width</label>
              <input
                type="number"
                value={Math.round(node.width)}
                onChange={(e) => onUpdate({ width: parseInt(e.target.value) || 100 })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Height</label>
              <input
                type="number"
                value={Math.round(node.height)}
                onChange={(e) => onUpdate({ height: parseInt(e.target.value) || 100 })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          
          {/* Rotation */}
          <div className="mt-4">
            <label className="text-xs font-medium text-gray-500 mb-2 block">Rotation</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="-180"
                max="180"
                value={node.rotation || 0}
                onChange={(e) => onUpdate({ rotation: parseInt(e.target.value) })}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <span className="text-sm font-medium w-12 text-right">
                {node.rotation || 0}°
              </span>
            </div>
          </div>
        </Section>

        {/* Shape-specific options */}
        {isShape && (
          <Section
            title="Shape"
            icon={<Square className="w-4 h-4" />}
            expanded={isExpanded('shape')}
            onToggle={() => toggleSection('shape')}
          >
            <div className="grid grid-cols-3 gap-2">
              {['rectangle', 'circle', 'triangle', 'diamond'].map((shape) => (
                <button
                  key={shape}
                  onClick={() => onUpdate({ shapeType: shape as any })}
                  className={`
                    p-2 text-sm rounded-lg border-2 capitalize
                    ${node.shapeType === shape 
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-600' 
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  {shape}
                </button>
              ))}
            </div>
          </Section>
        )}
      </div>
    </motion.div>
  );
};

// Section Component
interface SectionProps {
  title: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, icon, expanded, onToggle, children }) => (
  <div className="border-b border-gray-100 last:border-b-0">
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-center gap-2 text-gray-700">
        {icon}
        <span className="text-sm font-medium">{title}</span>
      </div>
      {expanded ? (
        <ChevronUp className="w-4 h-4 text-gray-400" />
      ) : (
        <ChevronDown className="w-4 h-4 text-gray-400" />
      )}
    </button>
    <AnimatePresence>
      {expanded && (
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: 'auto' }}
          exit={{ height: 0 }}
          className="overflow-hidden"
        >
          <div className="px-4 pb-4">
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

// Action Button Component
interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({ icon, label, onClick, active, danger }) => (
  <button
    onClick={onClick}
    className={`
      flex flex-col items-center gap-0.5 p-1.5 rounded-lg min-w-[48px] transition-colors
      ${danger 
        ? 'text-red-600 hover:bg-red-50' 
        : active 
          ? 'text-indigo-600 bg-indigo-50' 
          : 'text-gray-600 hover:bg-gray-100'
      }
    `}
  >
    {icon}
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);

// Style Button Component
interface StyleButtonProps {
  icon: React.ReactNode;
  active?: boolean;
  onClick: () => void;
}

const StyleButton: React.FC<StyleButtonProps> = ({ icon, active, onClick }) => (
  <button
    onClick={onClick}
    className={`
      p-2 rounded-lg transition-colors
      ${active 
        ? 'bg-indigo-100 text-indigo-600' 
        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }
    `}
  >
    {icon}
  </button>
);

export default FloatingPropertyPanel;
