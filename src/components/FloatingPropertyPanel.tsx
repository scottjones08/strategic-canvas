/**
 * Floating Property Panel - Horizontal Compact Version
 * 
 * Features:
 * - Horizontal toolbar layout (top or bottom)
 * - Compact design that doesn't cover left navigation
 * - Quick actions, color picker, font controls
 * - Collapsible sections in horizontal layout
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Type,
  Palette,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Minus,
  Plus,
  Trash2,
  Copy,
  Lock,
  Unlock,
  ArrowUp,
  ArrowDown,
  Square,
  RotateCw,
  ChevronDown,
  MoreHorizontal
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
}

// Color presets
const COLOR_PRESETS = [
  { bg: '#fef3c7', name: 'Yellow' },
  { bg: '#dbeafe', name: 'Blue' },
  { bg: '#fce7f3', name: 'Pink' },
  { bg: '#dcfce7', name: 'Green' },
  { bg: '#f3e8ff', name: 'Purple' },
  { bg: '#fee2e2', name: 'Red' },
  { bg: '#ffedd5', name: 'Orange' },
  { bg: '#ccfbf1', name: 'Teal' },
  { bg: '#ffffff', name: 'White' },
];

// Font size options
const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32];

export const FloatingPropertyPanel: React.FC<FloatingPropertyPanelProps> = ({
  node,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  onDuplicate,
  onBringToFront,
  onSendToBack,
  onLockToggle
}) => {
  const [showMore, setShowMore] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  if (!isOpen) return null;

  const hasTextContent = !['image', 'youtube', 'bucket', 'connector', 'drawing'].includes(node.type);
  const isShape = node.type === 'shape';

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <>
      {/* Main Horizontal Toolbar - Positioned at bottom of screen, centered, smaller */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-[10%] left-1/2 -translate-x-1/2 z-50 w-auto max-w-[90vw]"
      >
        <div className="bg-white/95 backdrop-blur-xl rounded-xl shadow-xl border border-gray-200/80 overflow-hidden">
          {/* Header Row - Compact */}
          <div className="flex items-center justify-between px-2 py-1 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center gap-1">
              <span className="text-xs font-semibold text-gray-700">
                {node.type.charAt(0).toUpperCase() + node.type.slice(1)} Properties
              </span>
            </div>
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => setShowMore(!showMore)}
                className="p-1 hover:bg-gray-200 rounded text-gray-500 transition-colors"
                title="More options"
              >
                <MoreHorizontal className="w-3 h-3" />
              </button>
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-200 rounded text-gray-500 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Main Controls Row - Compact */}
          <div className="flex items-center gap-1 px-2 py-1.5 overflow-x-auto scrollbar-hide">
            {/* Quick Actions */}
            <div className="flex items-center gap-0.5 pr-2 border-r border-gray-200">
              <IconButton icon={<Copy className="w-3 h-3" />} onClick={onDuplicate} title="Duplicate" />
              <IconButton icon={<ArrowUp className="w-3 h-3" />} onClick={onBringToFront} title="To Front" />
              <IconButton icon={<ArrowDown className="w-3 h-3" />} onClick={onSendToBack} title="To Back" />
              <IconButton 
                icon={node.locked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />} 
                onClick={onLockToggle} 
                title={node.locked ? 'Unlock' : 'Lock'}
                active={node.locked}
              />
              <IconButton icon={<Trash2 className="w-3 h-3" />} onClick={onDelete} title="Delete" danger />
            </div>

            {/* Color Picker */}
            <div className="flex items-center gap-0.5 px-2 border-r border-gray-200">
              <span className="text-[10px] text-gray-500 mr-1">Color</span>
              {COLOR_PRESETS.slice(0, 6).map((color) => (
                <button
                  key={color.name}
                  onClick={() => onUpdate({ color: color.bg })}
                  className={`
                    w-4 h-4 rounded-full border-2 transition-all
                    ${node.color === color.bg 
                      ? 'border-navy-500 ring-1 ring-navy-100' 
                      : 'border-transparent hover:scale-110'
                    }
                  `}
                  style={{ backgroundColor: color.bg }}
                  title={color.name}
                />
              ))}
            </div>

            {/* Text Controls */}
            {hasTextContent && (
              <>
                <div className="flex items-center gap-0.5 px-2 border-r border-gray-200">
                  <span className="text-[10px] text-gray-500 mr-1">Size</span>
                  <select
                    value={node.fontSize || 14}
                    onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value) })}
                    className="text-xs px-1.5 py-0.5 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-navy-500"
                  >
                    {FONT_SIZES.map(size => (
                      <option key={size} value={size}>{size}px</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-0.5 px-2 border-r border-gray-200">
                  <StyleButton
                    icon={<Bold className="w-3 h-3" />}
                    active={node.fontWeight === 'bold'}
                    onClick={() => onUpdate({ fontWeight: node.fontWeight === 'bold' ? 'normal' : 'bold' })}
                  />
                  <StyleButton
                    icon={<Italic className="w-3 h-3" />}
                    active={node.fontStyle === 'italic'}
                    onClick={() => onUpdate({ fontStyle: node.fontStyle === 'italic' ? 'normal' : 'italic' })}
                  />
                  <StyleButton
                    icon={<AlignLeft className="w-3 h-3" />}
                    active={node.textAlign === 'left'}
                    onClick={() => onUpdate({ textAlign: 'left' })}
                  />
                  <StyleButton
                    icon={<AlignCenter className="w-3 h-3" />}
                    active={!node.textAlign || node.textAlign === 'center'}
                    onClick={() => onUpdate({ textAlign: 'center' })}
                  />
                  <StyleButton
                    icon={<AlignRight className="w-3 h-3" />}
                    active={node.textAlign === 'right'}
                    onClick={() => onUpdate({ textAlign: 'right' })}
                  />
                </div>
              </>
            )}

            {/* Dimensions */}
            <div className="flex items-center gap-1 px-2">
              <span className="text-[10px] text-gray-500">W</span>
              <input
                type="number"
                value={Math.round(node.width)}
                onChange={(e) => onUpdate({ width: parseInt(e.target.value) || 100 })}
                className="w-12 px-1.5 py-0.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-navy-500"
              />
              <span className="text-[10px] text-gray-500 ml-1">H</span>
              <input
                type="number"
                value={Math.round(node.height)}
                onChange={(e) => onUpdate({ height: parseInt(e.target.value) || 100 })}
                className="w-12 px-1.5 py-0.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-navy-500"
              />
            </div>
          </div>

          {/* Expanded Section */}
          <AnimatePresence>
            {showMore && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className="border-t border-gray-100 overflow-hidden"
              >
                <div className="p-3 flex flex-wrap gap-4">
                  {/* All Colors */}
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-2 block">All Colors</label>
                    <div className="flex gap-1">
                      {COLOR_PRESETS.map((color) => (
                        <button
                          key={color.name}
                          onClick={() => onUpdate({ color: color.bg })}
                          className={`
                            w-7 h-7 rounded-full border-2 transition-all
                            ${node.color === color.bg 
                              ? 'border-navy-500 ring-2 ring-navy-100' 
                              : 'border-transparent hover:scale-110'
                            }
                          `}
                          style={{ backgroundColor: color.bg }}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Opacity */}
                  <div>
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
                      className="w-24 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-navy-700"
                    />
                  </div>

                  {/* Rotation */}
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-2 block">Rotation</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="-180"
                        max="180"
                        value={node.rotation || 0}
                        onChange={(e) => onUpdate({ rotation: parseInt(e.target.value) })}
                        className="w-24 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-navy-700"
                      />
                      <span className="text-sm font-medium w-10">{node.rotation || 0}°</span>
                    </div>
                  </div>

                  {/* Shape Options */}
                  {isShape && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-2 block">Shape</label>
                      <div className="flex gap-1">
                        {['rectangle', 'circle', 'triangle', 'diamond'].map((shape) => (
                          <button
                            key={shape}
                            onClick={() => onUpdate({ shapeType: shape as any })}
                            className={`
                              px-2 py-1 text-xs rounded-lg border capitalize
                              ${node.shapeType === shape 
                                ? 'border-navy-500 bg-navy-50 text-navy-700' 
                                : 'border-gray-200 hover:border-gray-300'
                              }
                            `}
                          >
                            {shape}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  );
};

// Icon Button Component
interface IconButtonProps {
  icon: React.ReactNode;
  onClick: () => void;
  title: string;
  active?: boolean;
  danger?: boolean;
}

const IconButton: React.FC<IconButtonProps> = ({ icon, onClick, title, active, danger }) => (
  <button
    onClick={onClick}
    title={title}
    className={`
      p-1 rounded transition-colors
      ${danger 
        ? 'text-red-600 hover:bg-red-50' 
        : active 
          ? 'text-navy-700 bg-navy-50' 
          : 'text-gray-600 hover:bg-gray-100'
      }
    `}
  >
    {icon}
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
      p-1 rounded transition-colors
      ${active 
        ? 'bg-navy-100 text-navy-700' 
        : 'text-gray-600 hover:bg-gray-100'
      }
    `}
  >
    {icon}
  </button>
);

export default FloatingPropertyPanel;
