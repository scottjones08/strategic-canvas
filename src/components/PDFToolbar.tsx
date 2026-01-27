// PDFToolbar.tsx - Annotation tools for PDF Editor
// Full-featured toolbar with all annotation and editing tools

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MousePointer2,
  Highlighter,
  Underline,
  Strikethrough,
  Square,
  Circle,
  MoveUpRight,
  Minus,
  Pencil,
  Type,
  StickyNote,
  PenTool,
  Stamp,
  Eraser,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Download,
  Upload,
  RotateCw,
  Trash2,
  FileOutput,
  Merge,
  ChevronDown,
  Palette,
} from 'lucide-react';
import type { AnnotationTool } from '../hooks/usePDFDocument';

interface PDFToolbarProps {
  selectedTool: AnnotationTool;
  onToolSelect: (tool: AnnotationTool) => void;
  toolColor: string;
  onColorChange: (color: string) => void;
  toolWidth: number;
  onWidthChange: (width: number) => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomChange: (zoom: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onRotate: () => void;
  onDeletePage: () => void;
  onExtractPage: () => void;
  onMerge: () => void;
  onExport: () => void;
  onExportOriginal: () => void;
  onUpload: () => void;
  totalPages: number;
  currentPage: number;
  disabled?: boolean;
}

const ANNOTATION_COLORS = [
  '#ffff00', // Yellow
  '#ff6b6b', // Red
  '#4ecdc4', // Teal
  '#45b7d1', // Blue
  '#96ceb4', // Green
  '#ffeaa7', // Light yellow
  '#dfe6e9', // Gray
  '#fd79a8', // Pink
  '#a29bfe', // Purple
  '#00b894', // Emerald
];

const STROKE_WIDTHS = [1, 2, 3, 4, 6, 8, 10];

interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}

const ToolButton: React.FC<ToolButtonProps> = ({
  icon,
  label,
  selected,
  onClick,
  disabled,
}) => (
  <motion.button
    whileHover={{ scale: disabled ? 1 : 1.05 }}
    whileTap={{ scale: disabled ? 1 : 0.95 }}
    onClick={onClick}
    disabled={disabled}
    className={`
      relative p-2 rounded-lg transition-all duration-200 group
      ${selected
        ? 'bg-blue-500 text-white shadow-md'
        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
      }
      ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    `}
    title={label}
  >
    {icon}
    <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 
      bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 
      group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
      {label}
    </span>
  </motion.button>
);

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'danger' | 'success';
}

const ActionButton: React.FC<ActionButtonProps> = ({
  icon,
  label,
  onClick,
  disabled,
  variant = 'default',
}) => {
  const variantClasses = {
    default: 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200',
    danger: 'bg-white text-red-600 hover:bg-red-50 border border-red-200',
    success: 'bg-white text-green-600 hover:bg-green-50 border border-green-200',
  };

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.05 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      onClick={onClick}
      disabled={disabled}
      className={`
        relative p-2 rounded-lg transition-all duration-200 group
        ${variantClasses[variant]}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      title={label}
    >
      {icon}
      <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 
        bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 
        group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
        {label}
      </span>
    </motion.button>
  );
};

export const PDFToolbar: React.FC<PDFToolbarProps> = ({
  selectedTool,
  onToolSelect,
  toolColor,
  onColorChange,
  toolWidth,
  onWidthChange,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onRotate,
  onDeletePage,
  onExtractPage,
  onMerge,
  onExport,
  onExportOriginal,
  onUpload,
  totalPages,
  currentPage,
  disabled = false,
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showWidthPicker, setShowWidthPicker] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showPageMenu, setShowPageMenu] = useState(false);

  const annotationTools: { tool: AnnotationTool; icon: React.ReactNode; label: string }[] = [
    { tool: 'select', icon: <MousePointer2 size={18} />, label: 'Select' },
    { tool: 'highlight', icon: <Highlighter size={18} />, label: 'Highlight' },
    { tool: 'underline', icon: <Underline size={18} />, label: 'Underline' },
    { tool: 'strikethrough', icon: <Strikethrough size={18} />, label: 'Strikethrough' },
  ];

  const shapeTools: { tool: AnnotationTool; icon: React.ReactNode; label: string }[] = [
    { tool: 'rectangle', icon: <Square size={18} />, label: 'Rectangle' },
    { tool: 'ellipse', icon: <Circle size={18} />, label: 'Ellipse' },
    { tool: 'arrow', icon: <MoveUpRight size={18} />, label: 'Arrow' },
    { tool: 'line', icon: <Minus size={18} />, label: 'Line' },
  ];

  const drawingTools: { tool: AnnotationTool; icon: React.ReactNode; label: string }[] = [
    { tool: 'freehand', icon: <Pencil size={18} />, label: 'Freehand' },
    { tool: 'text', icon: <Type size={18} />, label: 'Text' },
    { tool: 'sticky_note', icon: <StickyNote size={18} />, label: 'Sticky Note' },
    { tool: 'signature', icon: <PenTool size={18} />, label: 'Signature' },
    { tool: 'stamp', icon: <Stamp size={18} />, label: 'Stamp' },
    { tool: 'eraser', icon: <Eraser size={18} />, label: 'Eraser' },
  ];

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-2 flex-wrap">
      {/* Undo/Redo */}
      <div className="flex items-center gap-1 pr-2 border-r border-gray-200">
        <ActionButton
          icon={<Undo2 size={18} />}
          label="Undo (Ctrl+Z)"
          onClick={onUndo}
          disabled={disabled || !canUndo}
        />
        <ActionButton
          icon={<Redo2 size={18} />}
          label="Redo (Ctrl+Y)"
          onClick={onRedo}
          disabled={disabled || !canRedo}
        />
      </div>

      {/* Annotation Tools */}
      <div className="flex items-center gap-1 pr-2 border-r border-gray-200">
        {annotationTools.map(({ tool, icon, label }) => (
          <ToolButton
            key={tool}
            icon={icon}
            label={label}
            selected={selectedTool === tool}
            onClick={() => onToolSelect(tool)}
            disabled={disabled}
          />
        ))}
      </div>

      {/* Shape Tools */}
      <div className="flex items-center gap-1 pr-2 border-r border-gray-200">
        {shapeTools.map(({ tool, icon, label }) => (
          <ToolButton
            key={tool}
            icon={icon}
            label={label}
            selected={selectedTool === tool}
            onClick={() => onToolSelect(tool)}
            disabled={disabled}
          />
        ))}
      </div>

      {/* Drawing Tools */}
      <div className="flex items-center gap-1 pr-2 border-r border-gray-200">
        {drawingTools.map(({ tool, icon, label }) => (
          <ToolButton
            key={tool}
            icon={icon}
            label={label}
            selected={selectedTool === tool}
            onClick={() => onToolSelect(tool)}
            disabled={disabled}
          />
        ))}
      </div>

      {/* Color & Width Pickers */}
      <div className="flex items-center gap-1 pr-2 border-r border-gray-200">
        {/* Color Picker */}
        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="p-2 rounded-lg border border-gray-200 flex items-center gap-1 hover:bg-gray-100"
            disabled={disabled}
          >
            <div
              className="w-5 h-5 rounded border border-gray-300"
              style={{ backgroundColor: toolColor }}
            />
            <ChevronDown size={14} />
          </motion.button>

          <AnimatePresence>
            {showColorPicker && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 mt-2 p-2 bg-white rounded-lg shadow-xl border border-gray-200 z-50"
              >
                <div className="grid grid-cols-5 gap-1">
                  {ANNOTATION_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => {
                        onColorChange(color);
                        setShowColorPicker(false);
                      }}
                      className={`w-6 h-6 rounded border-2 transition-transform hover:scale-110 ${
                        toolColor === color ? 'border-blue-500' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <label className="flex items-center gap-2 text-xs text-gray-600">
                    <Palette size={14} />
                    Custom:
                    <input
                      type="color"
                      value={toolColor}
                      onChange={e => onColorChange(e.target.value)}
                      className="w-6 h-6 cursor-pointer"
                    />
                  </label>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Stroke Width Picker */}
        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowWidthPicker(!showWidthPicker)}
            className="p-2 rounded-lg border border-gray-200 flex items-center gap-1 hover:bg-gray-100"
            disabled={disabled}
          >
            <div className="flex items-center gap-1">
              <div
                className="bg-gray-800 rounded-full"
                style={{ width: 16, height: Math.min(toolWidth, 8) }}
              />
              <span className="text-xs text-gray-600">{toolWidth}px</span>
            </div>
            <ChevronDown size={14} />
          </motion.button>

          <AnimatePresence>
            {showWidthPicker && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 mt-2 p-2 bg-white rounded-lg shadow-xl border border-gray-200 z-50"
              >
                <div className="flex flex-col gap-1">
                  {STROKE_WIDTHS.map(width => (
                    <button
                      key={width}
                      onClick={() => {
                        onWidthChange(width);
                        setShowWidthPicker(false);
                      }}
                      className={`flex items-center gap-2 px-3 py-1 rounded hover:bg-gray-100 ${
                        toolWidth === width ? 'bg-blue-50 text-blue-600' : ''
                      }`}
                    >
                      <div
                        className="bg-gray-800 rounded-full"
                        style={{ width: 24, height: width }}
                      />
                      <span className="text-xs">{width}px</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="flex items-center gap-1 pr-2 border-r border-gray-200">
        <ActionButton
          icon={<ZoomOut size={18} />}
          label="Zoom Out"
          onClick={onZoomOut}
          disabled={disabled}
        />
        <select
          value={Math.round(zoom * 100)}
          onChange={e => onZoomChange(parseInt(e.target.value) / 100)}
          className="px-2 py-1 border border-gray-200 rounded text-sm"
          disabled={disabled}
        >
          <option value={50}>50%</option>
          <option value={75}>75%</option>
          <option value={100}>100%</option>
          <option value={125}>125%</option>
          <option value={150}>150%</option>
          <option value={200}>200%</option>
          <option value={300}>300%</option>
        </select>
        <ActionButton
          icon={<ZoomIn size={18} />}
          label="Zoom In"
          onClick={onZoomIn}
          disabled={disabled}
        />
      </div>

      {/* Page Operations */}
      <div className="flex items-center gap-1 pr-2 border-r border-gray-200">
        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowPageMenu(!showPageMenu)}
            className="px-3 py-2 rounded-lg border border-gray-200 flex items-center gap-1 hover:bg-gray-100 text-sm"
            disabled={disabled}
          >
            Page {currentPage}/{totalPages}
            <ChevronDown size={14} />
          </motion.button>

          <AnimatePresence>
            {showPageMenu && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 mt-2 py-2 bg-white rounded-lg shadow-xl border border-gray-200 z-50 min-w-[160px]"
              >
                <button
                  onClick={() => {
                    onRotate();
                    setShowPageMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-sm text-left"
                >
                  <RotateCw size={16} />
                  Rotate Page
                </button>
                <button
                  onClick={() => {
                    onExtractPage();
                    setShowPageMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-sm text-left"
                >
                  <FileOutput size={16} />
                  Extract Page
                </button>
                <button
                  onClick={() => {
                    onDeletePage();
                    setShowPageMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-sm text-left text-red-600"
                  disabled={totalPages <= 1}
                >
                  <Trash2 size={16} />
                  Delete Page
                </button>
                <hr className="my-2" />
                <button
                  onClick={() => {
                    onMerge();
                    setShowPageMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-sm text-left"
                >
                  <Merge size={16} />
                  Merge PDFs
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Export/Import */}
      <div className="flex items-center gap-1 ml-auto">
        <ActionButton
          icon={<Upload size={18} />}
          label="Upload PDF"
          onClick={onUpload}
          disabled={disabled}
        />
        
        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="px-3 py-2 rounded-lg bg-blue-500 text-white flex items-center gap-1 hover:bg-blue-600"
            disabled={disabled}
          >
            <Download size={18} />
            Export
            <ChevronDown size={14} />
          </motion.button>

          <AnimatePresence>
            {showExportMenu && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full right-0 mt-2 py-2 bg-white rounded-lg shadow-xl border border-gray-200 z-50 min-w-[180px]"
              >
                <button
                  onClick={() => {
                    onExport();
                    setShowExportMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-sm text-left"
                >
                  <Download size={16} />
                  With Annotations
                </button>
                <button
                  onClick={() => {
                    onExportOriginal();
                    setShowExportMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-sm text-left"
                >
                  <FileOutput size={16} />
                  Original PDF
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default PDFToolbar;
