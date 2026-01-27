// PDFEnterpriseToolbar.tsx - Full-featured enterprise PDF toolbar
// Complete annotation tools, page operations, stamps, redaction, and export options

import React, { useState, useRef, useEffect } from 'react';
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
  RotateCcw,
  Trash2,
  FileOutput,
  Merge,
  ChevronDown,
  Palette,
  Image,
  EyeOff,
  Printer,
  Search,
  Plus,
  Copy,
  Scissors,
  FileText,
  CheckSquare,
  XSquare,
  AlertTriangle,
  Lock,
  FileCheck,
  ClipboardCheck,
  Users,
  MessageSquarePlus,
  History,
  Bookmark,
  LayoutTemplate,
  Layers,
  Wand2,
  // Settings,
  Save,
} from 'lucide-react';
import type { AnnotationTool } from '../hooks/usePDFDocument';
import type { StampConfig } from '../lib/pdf-enterprise-utils';

// Extended tool type for enterprise features
export type EnterpriseTool = AnnotationTool | 'image' | 'redaction' | 'form_text' | 'form_checkbox' | 'form_dropdown' | 'form_signature';

export interface PDFEnterpriseToolbarProps {
  selectedTool: EnterpriseTool;
  onToolSelect: (tool: EnterpriseTool) => void;
  toolColor: string;
  onColorChange: (color: string) => void;
  toolWidth: number;
  onWidthChange: (width: number) => void;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  fontFamily: string;
  onFontFamilyChange: (font: string) => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomChange: (zoom: number) => void;
  onFitWidth: () => void;
  onFitHeight: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  
  // Page operations
  onRotateCW: () => void;
  onRotateCCW: () => void;
  onDeletePage: () => void;
  onExtractPage: () => void;
  onInsertBlankPage: () => void;
  onDuplicatePage: () => void;
  onMerge: () => void;
  
  // Stamp
  onAddStamp: (stamp: string | StampConfig) => void;
  
  // Export
  onExportWithAnnotations: () => void;
  onExportOriginal: () => void;
  onExportFlattened: () => void;
  onPrint: () => void;
  onSave: () => void;
  
  // Upload
  onUpload: () => void;
  onUploadImage: () => void;
  
  // Collaboration
  onToggleComments: () => void;
  commentsEnabled: boolean;
  onToggleVersionHistory: () => void;
  
  // Navigation
  onToggleBookmarks: () => void;
  onToggleSearch: () => void;
  onToggleThumbnails: () => void;
  
  // State
  totalPages: number;
  currentPage: number;
  hasUnsavedChanges: boolean;
  collaboratorsCount: number;
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
  '#000000', // Black
  '#ffffff', // White
];

const STROKE_WIDTHS = [1, 2, 3, 4, 6, 8, 10, 12, 16];
const FONT_SIZES = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72];
const FONT_FAMILIES = [
  'Arial',
  'Helvetica',
  'Times New Roman',
  'Georgia',
  'Verdana',
  'Courier New',
  'Comic Sans MS',
];

const STAMP_OPTIONS = [
  { id: 'approved', label: 'Approved', icon: CheckSquare, color: '#22c55e' },
  { id: 'rejected', label: 'Rejected', icon: XSquare, color: '#ef4444' },
  { id: 'draft', label: 'Draft', icon: FileText, color: '#f59e0b' },
  { id: 'confidential', label: 'Confidential', icon: Lock, color: '#dc2626' },
  { id: 'final', label: 'Final', icon: FileCheck, color: '#2563eb' },
  { id: 'reviewed', label: 'Reviewed', icon: ClipboardCheck, color: '#8b5cf6' },
];

interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  selected?: boolean;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

const ToolButton: React.FC<ToolButtonProps> = ({
  icon,
  label,
  selected,
  onClick,
  disabled,
  className = '',
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
      ${className}
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

interface DropdownMenuProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right';
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({ trigger, children, align = 'left' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`absolute top-full mt-2 py-2 bg-white rounded-lg shadow-xl border border-gray-200 z-50 min-w-[160px] ${
              align === 'right' ? 'right-0' : 'left-0'
            }`}
            onClick={() => setIsOpen(false)}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const PDFEnterpriseToolbar: React.FC<PDFEnterpriseToolbarProps> = ({
  selectedTool,
  onToolSelect,
  toolColor,
  onColorChange,
  toolWidth,
  onWidthChange,
  fontSize,
  onFontSizeChange,
  fontFamily,
  onFontFamilyChange,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomChange,
  onFitWidth,
  onFitHeight,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onRotateCW,
  onRotateCCW,
  onDeletePage,
  onExtractPage,
  onInsertBlankPage,
  onDuplicatePage,
  onMerge,
  onAddStamp,
  onExportWithAnnotations,
  onExportOriginal,
  onExportFlattened,
  onPrint,
  onSave,
  onUpload,
  // onUploadImage,
  onToggleComments,
  commentsEnabled,
  onToggleVersionHistory,
  onToggleBookmarks,
  onToggleSearch,
  onToggleThumbnails,
  totalPages,
  currentPage,
  hasUnsavedChanges,
  collaboratorsCount,
  disabled = false,
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [_showAdvancedOptions, _setShowAdvancedOptions] = useState(false);

  return (
    <div className="bg-white border-b border-gray-200 flex flex-col">
      {/* Main Toolbar Row */}
      <div className="px-4 py-2 flex items-center gap-2 flex-wrap">
        {/* Save & Undo/Redo */}
        <div className="flex items-center gap-1 pr-2 border-r border-gray-200">
          <ToolButton
            icon={
              <div className="relative">
                <Save size={18} />
                {hasUnsavedChanges && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full" />
                )}
              </div>
            }
            label={hasUnsavedChanges ? "Save (unsaved changes)" : "Save"}
            onClick={onSave}
            disabled={disabled || !hasUnsavedChanges}
          />
          <ToolButton
            icon={<Undo2 size={18} />}
            label="Undo (Ctrl+Z)"
            onClick={onUndo}
            disabled={disabled || !canUndo}
          />
          <ToolButton
            icon={<Redo2 size={18} />}
            label="Redo (Ctrl+Y)"
            onClick={onRedo}
            disabled={disabled || !canRedo}
          />
        </div>

        {/* Selection Tools */}
        <div className="flex items-center gap-1 pr-2 border-r border-gray-200">
          <ToolButton
            icon={<MousePointer2 size={18} />}
            label="Select"
            selected={selectedTool === 'select'}
            onClick={() => onToolSelect('select')}
            disabled={disabled}
          />
          <ToolButton
            icon={<Search size={18} />}
            label="Search Text"
            onClick={onToggleSearch}
            disabled={disabled}
          />
        </div>

        {/* Text Annotation Tools */}
        <div className="flex items-center gap-1 pr-2 border-r border-gray-200">
          <ToolButton
            icon={<Highlighter size={18} />}
            label="Highlight"
            selected={selectedTool === 'highlight'}
            onClick={() => onToolSelect('highlight')}
            disabled={disabled}
          />
          <ToolButton
            icon={<Underline size={18} />}
            label="Underline"
            selected={selectedTool === 'underline'}
            onClick={() => onToolSelect('underline')}
            disabled={disabled}
          />
          <ToolButton
            icon={<Strikethrough size={18} />}
            label="Strikethrough"
            selected={selectedTool === 'strikethrough'}
            onClick={() => onToolSelect('strikethrough')}
            disabled={disabled}
          />
        </div>

        {/* Shape Tools */}
        <div className="flex items-center gap-1 pr-2 border-r border-gray-200">
          <ToolButton
            icon={<Square size={18} />}
            label="Rectangle"
            selected={selectedTool === 'rectangle'}
            onClick={() => onToolSelect('rectangle')}
            disabled={disabled}
          />
          <ToolButton
            icon={<Circle size={18} />}
            label="Ellipse"
            selected={selectedTool === 'ellipse'}
            onClick={() => onToolSelect('ellipse')}
            disabled={disabled}
          />
          <ToolButton
            icon={<MoveUpRight size={18} />}
            label="Arrow"
            selected={selectedTool === 'arrow'}
            onClick={() => onToolSelect('arrow')}
            disabled={disabled}
          />
          <ToolButton
            icon={<Minus size={18} />}
            label="Line"
            selected={selectedTool === 'line'}
            onClick={() => onToolSelect('line')}
            disabled={disabled}
          />
        </div>

        {/* Drawing & Text Tools */}
        <div className="flex items-center gap-1 pr-2 border-r border-gray-200">
          <ToolButton
            icon={<Pencil size={18} />}
            label="Freehand"
            selected={selectedTool === 'freehand'}
            onClick={() => onToolSelect('freehand')}
            disabled={disabled}
          />
          <ToolButton
            icon={<Type size={18} />}
            label="Text Box"
            selected={selectedTool === 'text'}
            onClick={() => onToolSelect('text')}
            disabled={disabled}
          />
          <ToolButton
            icon={<StickyNote size={18} />}
            label="Sticky Note"
            selected={selectedTool === 'sticky_note'}
            onClick={() => onToolSelect('sticky_note')}
            disabled={disabled}
          />
          <ToolButton
            icon={<Image size={18} />}
            label="Insert Image"
            selected={selectedTool === 'image'}
            onClick={() => onToolSelect('image')}
            disabled={disabled}
          />
        </div>

        {/* Signature, Stamp, Redaction */}
        <div className="flex items-center gap-1 pr-2 border-r border-gray-200">
          <ToolButton
            icon={<PenTool size={18} />}
            label="Signature"
            selected={selectedTool === 'signature'}
            onClick={() => onToolSelect('signature')}
            disabled={disabled}
          />
          
          {/* Stamps Dropdown */}
          <DropdownMenu
            trigger={
              <ToolButton
                icon={<Stamp size={18} />}
                label="Stamps"
                selected={selectedTool === 'stamp'}
                onClick={() => {}}
                disabled={disabled}
              />
            }
          >
            {STAMP_OPTIONS.map(stamp => (
              <button
                key={stamp.id}
                onClick={() => onAddStamp(stamp.id)}
                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-sm text-left"
              >
                <stamp.icon size={16} style={{ color: stamp.color }} />
                <span>{stamp.label}</span>
              </button>
            ))}
            <hr className="my-1" />
            <button
              onClick={() => onToolSelect('stamp')}
              className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-sm text-left"
            >
              <Wand2 size={16} />
              <span>Custom Stamp...</span>
            </button>
          </DropdownMenu>

          <ToolButton
            icon={<EyeOff size={18} />}
            label="Redaction"
            selected={selectedTool === 'redaction'}
            onClick={() => onToolSelect('redaction')}
            disabled={disabled}
            className={selectedTool === 'redaction' ? 'bg-red-500 text-white' : ''}
          />
          
          <ToolButton
            icon={<Eraser size={18} />}
            label="Eraser"
            selected={selectedTool === 'eraser'}
            onClick={() => onToolSelect('eraser')}
            disabled={disabled}
          />
        </div>

        {/* Form Fields */}
        <DropdownMenu
          trigger={
            <motion.button
              whileHover={{ scale: 1.02 }}
              className="px-3 py-2 rounded-lg border border-gray-200 flex items-center gap-1 hover:bg-gray-100 text-sm"
              disabled={disabled}
            >
              <LayoutTemplate size={16} />
              <span>Forms</span>
              <ChevronDown size={14} />
            </motion.button>
          }
        >
          <button
            onClick={() => onToolSelect('form_text')}
            className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-sm text-left"
          >
            <Type size={16} />
            <span>Text Field</span>
          </button>
          <button
            onClick={() => onToolSelect('form_checkbox')}
            className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-sm text-left"
          >
            <CheckSquare size={16} />
            <span>Checkbox</span>
          </button>
          <button
            onClick={() => onToolSelect('form_dropdown')}
            className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-sm text-left"
          >
            <ChevronDown size={16} />
            <span>Dropdown</span>
          </button>
          <button
            onClick={() => onToolSelect('form_signature')}
            className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-sm text-left"
          >
            <PenTool size={16} />
            <span>Signature Field</span>
          </button>
        </DropdownMenu>

        {/* Color & Style Pickers */}
        <div className="flex items-center gap-1 pr-2 border-r border-gray-200">
          {/* Color Picker */}
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.05 }}
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
                  className="absolute top-full left-0 mt-2 p-3 bg-white rounded-lg shadow-xl border border-gray-200 z-50"
                >
                  <div className="grid grid-cols-6 gap-1.5 mb-2">
                    {ANNOTATION_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => {
                          onColorChange(color);
                          setShowColorPicker(false);
                        }}
                        className={`w-6 h-6 rounded border-2 transition-transform hover:scale-110 ${
                          toolColor === color ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-300'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <div className="pt-2 border-t border-gray-200">
                    <label className="flex items-center gap-2 text-xs text-gray-600">
                      <Palette size={14} />
                      Custom:
                      <input
                        type="color"
                        value={toolColor}
                        onChange={e => onColorChange(e.target.value)}
                        className="w-8 h-6 cursor-pointer"
                      />
                    </label>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Stroke Width */}
          <DropdownMenu
            trigger={
              <motion.button
                whileHover={{ scale: 1.05 }}
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
            }
          >
            {STROKE_WIDTHS.map(width => (
              <button
                key={width}
                onClick={() => onWidthChange(width)}
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
          </DropdownMenu>

          {/* Font Size (for text tool) */}
          {(selectedTool === 'text' || selectedTool === 'sticky_note') && (
            <DropdownMenu
              trigger={
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  className="p-2 rounded-lg border border-gray-200 flex items-center gap-1 hover:bg-gray-100"
                  disabled={disabled}
                >
                  <span className="text-sm">{fontSize}pt</span>
                  <ChevronDown size={14} />
                </motion.button>
              }
            >
              {FONT_SIZES.map(size => (
                <button
                  key={size}
                  onClick={() => onFontSizeChange(size)}
                  className={`w-full text-left px-3 py-1 hover:bg-gray-100 text-sm ${
                    fontSize === size ? 'bg-blue-50 text-blue-600' : ''
                  }`}
                >
                  {size}pt
                </button>
              ))}
            </DropdownMenu>
          )}

          {/* Font Family (for text tool) */}
          {(selectedTool === 'text') && (
            <DropdownMenu
              trigger={
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  className="p-2 rounded-lg border border-gray-200 flex items-center gap-1 hover:bg-gray-100 max-w-[100px]"
                  disabled={disabled}
                >
                  <span className="text-sm truncate">{fontFamily}</span>
                  <ChevronDown size={14} />
                </motion.button>
              }
            >
              {FONT_FAMILIES.map(font => (
                <button
                  key={font}
                  onClick={() => onFontFamilyChange(font)}
                  className={`w-full text-left px-3 py-1 hover:bg-gray-100 text-sm ${
                    fontFamily === font ? 'bg-blue-50 text-blue-600' : ''
                  }`}
                  style={{ fontFamily: font }}
                >
                  {font}
                </button>
              ))}
            </DropdownMenu>
          )}
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 pr-2 border-r border-gray-200">
          <ToolButton
            icon={<ZoomOut size={18} />}
            label="Zoom Out"
            onClick={onZoomOut}
            disabled={disabled}
          />
          <DropdownMenu
            trigger={
              <motion.button
                whileHover={{ scale: 1.02 }}
                className="px-2 py-1 border border-gray-200 rounded text-sm min-w-[60px]"
                disabled={disabled}
              >
                {Math.round(zoom * 100)}%
              </motion.button>
            }
          >
            {[50, 75, 100, 125, 150, 200, 300, 400].map(z => (
              <button
                key={z}
                onClick={() => onZoomChange(z / 100)}
                className={`w-full text-left px-3 py-1 hover:bg-gray-100 text-sm ${
                  Math.round(zoom * 100) === z ? 'bg-blue-50 text-blue-600' : ''
                }`}
              >
                {z}%
              </button>
            ))}
            <hr className="my-1" />
            <button
              onClick={onFitWidth}
              className="w-full text-left px-3 py-1 hover:bg-gray-100 text-sm"
            >
              Fit Width
            </button>
            <button
              onClick={onFitHeight}
              className="w-full text-left px-3 py-1 hover:bg-gray-100 text-sm"
            >
              Fit Page
            </button>
          </DropdownMenu>
          <ToolButton
            icon={<ZoomIn size={18} />}
            label="Zoom In"
            onClick={onZoomIn}
            disabled={disabled}
          />
        </div>

        {/* Page Operations */}
        <DropdownMenu
          trigger={
            <motion.button
              whileHover={{ scale: 1.02 }}
              className="px-3 py-2 rounded-lg border border-gray-200 flex items-center gap-1 hover:bg-gray-100 text-sm"
              disabled={disabled}
            >
              <Layers size={16} />
              <span>Page {currentPage}/{totalPages}</span>
              <ChevronDown size={14} />
            </motion.button>
          }
        >
          <button
            onClick={onRotateCW}
            className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-sm text-left"
          >
            <RotateCw size={16} />
            Rotate Clockwise
          </button>
          <button
            onClick={onRotateCCW}
            className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-sm text-left"
          >
            <RotateCcw size={16} />
            Rotate Counter-clockwise
          </button>
          <hr className="my-1" />
          <button
            onClick={onInsertBlankPage}
            className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-sm text-left"
          >
            <Plus size={16} />
            Insert Blank Page
          </button>
          <button
            onClick={onDuplicatePage}
            className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-sm text-left"
          >
            <Copy size={16} />
            Duplicate Page
          </button>
          <button
            onClick={onExtractPage}
            className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-sm text-left"
          >
            <Scissors size={16} />
            Extract Page
          </button>
          <button
            onClick={onDeletePage}
            className="w-full flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-sm text-left text-red-600"
            disabled={totalPages <= 1}
          >
            <Trash2 size={16} />
            Delete Page
          </button>
          <hr className="my-1" />
          <button
            onClick={onMerge}
            className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-sm text-left"
          >
            <Merge size={16} />
            Merge PDFs
          </button>
        </DropdownMenu>

        {/* View & Navigation */}
        <div className="flex items-center gap-1 pr-2 border-r border-gray-200">
          <ToolButton
            icon={<Bookmark size={18} />}
            label="Bookmarks/Outline"
            onClick={onToggleBookmarks}
            disabled={disabled}
          />
          <ToolButton
            icon={<Layers size={18} />}
            label="Thumbnails"
            onClick={onToggleThumbnails}
            disabled={disabled}
          />
        </div>

        {/* Collaboration */}
        <div className="flex items-center gap-1 pr-2 border-r border-gray-200">
          <ToolButton
            icon={
              <div className="relative">
                <MessageSquarePlus size={18} />
                {commentsEnabled && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
                )}
              </div>
            }
            label="Comments"
            selected={commentsEnabled}
            onClick={onToggleComments}
            disabled={disabled}
          />
          <ToolButton
            icon={<History size={18} />}
            label="Version History"
            onClick={onToggleVersionHistory}
            disabled={disabled}
          />
          {collaboratorsCount > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 bg-green-50 rounded-lg text-green-700">
              <Users size={14} />
              <span className="text-xs font-medium">{collaboratorsCount}</span>
            </div>
          )}
        </div>

        {/* Import/Export */}
        <div className="flex items-center gap-1 ml-auto">
          <ToolButton
            icon={<Upload size={18} />}
            label="Upload PDF"
            onClick={onUpload}
            disabled={disabled}
          />
          <ToolButton
            icon={<Printer size={18} />}
            label="Print"
            onClick={onPrint}
            disabled={disabled}
          />
          
          <DropdownMenu
            align="right"
            trigger={
              <motion.button
                whileHover={{ scale: 1.02 }}
                className="px-3 py-2 rounded-lg bg-blue-500 text-white flex items-center gap-1 hover:bg-blue-600"
                disabled={disabled}
              >
                <Download size={18} />
                Export
                <ChevronDown size={14} />
              </motion.button>
            }
          >
            <button
              onClick={onExportWithAnnotations}
              className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-sm text-left"
            >
              <Download size={16} />
              With Annotations
            </button>
            <button
              onClick={onExportFlattened}
              className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-sm text-left"
            >
              <Layers size={16} />
              Flattened (Annotations Baked In)
            </button>
            <button
              onClick={onExportOriginal}
              className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-sm text-left"
            >
              <FileOutput size={16} />
              Original PDF
            </button>
          </DropdownMenu>
        </div>
      </div>

      {/* Secondary Row - Contextual Options */}
      {selectedTool === 'redaction' && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="px-4 py-2 bg-red-50 border-t border-red-200 flex items-center gap-2"
        >
          <AlertTriangle size={16} className="text-red-600" />
          <span className="text-sm text-red-700">
            Redaction Mode: Draw over sensitive content. Redactions are permanent when exported.
          </span>
        </motion.div>
      )}

      {selectedTool?.startsWith('form_') && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="px-4 py-2 bg-blue-50 border-t border-blue-200 flex items-center gap-2"
        >
          <LayoutTemplate size={16} className="text-blue-600" />
          <span className="text-sm text-blue-700">
            Form Mode: Click and drag to create form fields. Double-click existing fields to edit.
          </span>
        </motion.div>
      )}
    </div>
  );
};

export default PDFEnterpriseToolbar;
