/**
 * Transcript to Whiteboard Modal
 * Allows users to extract and select items from a transcript to add to the whiteboard
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Loader2,
  Sparkles,
  CheckSquare,
  Lightbulb,
  AlertCircle,
  HelpCircle,
  Target,
  TrendingUp,
  CheckCircle,
  Grid3X3,
  Layers,
  Clock,
  ChevronDown,
  ChevronRight,
  Wand2,
  Plus
} from 'lucide-react';
import {
  extractWithPatterns,
  generateLayout,
  WhiteboardObject,
  WhiteboardCategory,
  ExtractionResult,
  CATEGORY_CONFIG,
} from '../lib/transcript-to-whiteboard';
import { FullTranscript } from '../lib/transcription';

// ============================================
// TYPES
// ============================================

interface TranscriptToWhiteboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  transcript: string | FullTranscript;
  onAddNodes: (nodes: VisualNodeInput[]) => void;
  startPosition?: { x: number; y: number };
}

export interface VisualNodeInput {
  id: string;
  type: 'sticky' | 'action' | 'opportunity' | 'risk' | 'frame';
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  color: string;
  rotation: number;
  locked: boolean;
  votes: number;
  votedBy: string[];
  createdBy: string;
  comments: never[];
}

type LayoutType = 'grid' | 'grouped' | 'timeline';

// ============================================
// CATEGORY ICONS
// ============================================

const CATEGORY_ICONS: Record<WhiteboardCategory, typeof Lightbulb> = {
  idea: Lightbulb,
  action: CheckSquare,
  question: HelpCircle,
  decision: Target,
  risk: AlertCircle,
  opportunity: TrendingUp
};

// ============================================
// COMPONENT
// ============================================

export default function TranscriptToWhiteboardModal({
  isOpen,
  onClose,
  transcript,
  onAddNodes,
  startPosition = { x: 100, y: 100 }
}: TranscriptToWhiteboardModalProps) {
  // State
  const [isLoading, setIsLoading] = useState(false);
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [layout, setLayout] = useState<LayoutType>('grouped');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Extract items when modal opens
  useEffect(() => {
    if (isOpen && transcript) {
      extractItems();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setExtractionResult(null);
      setSelectedItems(new Set());
      setExpandedCategories(new Set());
      setError(null);
    }
  }, [isOpen]);

  // Group items by category
  const itemsByCategory = useMemo((): Record<WhiteboardCategory, WhiteboardObject[]> => {
    const grouped: Record<WhiteboardCategory, WhiteboardObject[]> = {
      idea: [],
      action: [],
      question: [],
      decision: [],
      risk: [],
      opportunity: []
    };
    
    if (!extractionResult) return grouped;
    
    extractionResult.objects.forEach((item: WhiteboardObject) => {
      if (grouped[item.category]) {
        grouped[item.category].push(item);
      }
    });
    
    return grouped;
  }, [extractionResult]);

  // Selected count by category
  const selectedByCategory = useMemo((): Record<string, number> => {
    const counts: Record<string, number> = {};
    selectedItems.forEach((id: string) => {
      const item = extractionResult?.objects.find((i: WhiteboardObject) => i.id === id);
      if (item) {
        counts[item.category] = (counts[item.category] || 0) + 1;
      }
    });
    return counts;
  }, [selectedItems, extractionResult]);

  // Extract items from transcript
  const extractItems = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      let fullTranscript: FullTranscript;
      
      // If transcript is a string, convert it to FullTranscript format
      if (typeof transcript === 'string') {
        // Parse the text format: [timestamp] Speaker: text
        const lines = transcript.split('\n').filter(line => line.trim());
        const segments = lines.map((line, index) => {
          const match = line.match(/^\[([^\]]+)\]\s*([^:]+):\s*(.+)$/);
          if (match) {
            return {
              id: `seg-${index}`,
              speaker: match[2].trim(),
              speakerLabel: match[2].trim(),
              text: match[3].trim(),
              startTime: parseTimestamp(match[1]),
              endTime: parseTimestamp(match[1]),
              confidence: 0.9,
            };
          }
          return {
            id: `seg-${index}`,
            speaker: 'Unknown',
            speakerLabel: 'Unknown',
            text: line.trim(),
            startTime: index * 5000,
            endTime: index * 5000,
            confidence: 0.9,
          };
        });
        
        const uniqueSpeakers = [...new Set(segments.map(s => s.speaker))];
        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
        
        fullTranscript = {
          id: 'temp-transcript',
          segments,
          speakers: uniqueSpeakers.map((speaker, i) => ({
            id: speaker,
            label: speaker,
            color: colors[i % colors.length],
          })),
          duration: segments.length > 0 ? segments[segments.length - 1].endTime : 0,
          createdAt: new Date(),
          status: 'completed' as const,
        };
      } else {
        fullTranscript = transcript;
      }
      
      const result = extractWithPatterns(fullTranscript);
      
      setExtractionResult(result);
      
      // Select all items by default
      const allIds = new Set(result.objects.map(item => item.id));
      setSelectedItems(allIds);
      
      // Expand categories that have items
      const categoriesWithItems = new Set<string>();
      result.objects.forEach(item => categoriesWithItems.add(item.category));
      setExpandedCategories(categoriesWithItems);
      
    } catch (err) {
      setError('Failed to extract items from transcript. Please try again.');
      console.error('Extraction error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Parse timestamp string like "1:23" to milliseconds
  const parseTimestamp = (ts: string): number => {
    const parts = ts.split(':').map(Number);
    if (parts.length === 2) {
      return (parts[0] * 60 + parts[1]) * 1000;
    }
    return 0;
  };

  // Toggle item selection
  const toggleItem = (id: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Toggle all items in a category
  const toggleCategory = (category: WhiteboardCategory) => {
    const categoryItems = itemsByCategory[category] || [];
    const categoryIds = categoryItems.map((item: WhiteboardObject) => item.id);
    const allSelected = categoryIds.every((id: string) => selectedItems.has(id));
    
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (allSelected) {
        categoryIds.forEach((id: string) => newSet.delete(id));
      } else {
        categoryIds.forEach((id: string) => newSet.add(id));
      }
      return newSet;
    });
  };

  // Toggle category expansion
  const toggleCategoryExpand = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  // Select all items
  const selectAll = () => {
    if (extractionResult) {
      setSelectedItems(new Set(extractionResult.objects.map(item => item.id)));
    }
  };

  // Deselect all items
  const deselectAll = () => {
    setSelectedItems(new Set());
  };

  // Add selected items to whiteboard
  const handleAddToWhiteboard = () => {
    if (!extractionResult || selectedItems.size === 0) return;
    
    // Filter to selected items
    const itemsToAdd = extractionResult.objects.filter((item: WhiteboardObject) => selectedItems.has(item.id));
    
    // Apply layout
    const laidOutItems = generateLayout(itemsToAdd, {
      startX: startPosition.x,
      startY: startPosition.y,
      groupByCategory: layout === 'grouped',
    });
    
    // Convert to visual nodes
    const visualNodes: VisualNodeInput[] = laidOutItems.map(item => ({
      id: item.id,
      type: item.type,
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height,
      content: item.content,
      color: item.color,
      rotation: 0,
      locked: false,
      votes: 0,
      votedBy: [],
      createdBy: 'AI',
      comments: [],
    }));
    
    // Add to board
    onAddNodes(visualNodes);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-[700px] max-h-[85vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-navy-500 to-navy-500 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Wand2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Generate Whiteboard from Transcript</h2>
                <p className="text-sm text-white/80">
                  AI-extracted ideas, actions, and insights
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-12 h-12 text-navy-500 animate-spin mb-4" />
              <p className="text-gray-600 font-medium">Analyzing transcript...</p>
              <p className="text-sm text-gray-400 mt-1">
                Extracting ideas, actions, and insights
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16">
              <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
              <p className="text-gray-600 font-medium">{error}</p>
              <button
                onClick={extractItems}
                className="mt-4 px-4 py-2 bg-navy-700 text-white rounded-lg hover:bg-navy-800"
              >
                Try Again
              </button>
            </div>
          ) : extractionResult && extractionResult.objects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Sparkles className="w-12 h-12 text-gray-300 mb-4" />
              <p className="text-gray-600 font-medium">No actionable items found</p>
              <p className="text-sm text-gray-400 mt-1">
                Try a longer transcript with more content
              </p>
            </div>
          ) : extractionResult ? (
            <>
              {/* Summary */}
              <div className="mb-6 p-4 bg-navy-50 rounded-xl">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-navy-700 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-navy-900">
                      Found {extractionResult.objects.length} items across{' '}
                      {Object.values(itemsByCategory).filter((arr: WhiteboardObject[]) => arr.length > 0).length} categories
                    </p>
                    {extractionResult.participants && extractionResult.participants.length > 0 && (
                      <p className="text-xs text-navy-800 mt-1">
                        Participants: {extractionResult.participants.join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Selection Controls */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={selectAll}
                    className="px-3 py-1.5 text-sm text-navy-700 hover:bg-navy-50 rounded-lg transition-colors"
                  >
                    Select All
                  </button>
                  <button
                    onClick={deselectAll}
                    className="px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Deselect All
                  </button>
                </div>
                <span className="text-sm text-gray-500">
                  {selectedItems.size} of {extractionResult.objects.length} selected
                </span>
              </div>

              {/* Categories */}
              <div className="space-y-3">
                {(Object.keys(CATEGORY_CONFIG) as WhiteboardCategory[]).map(category => {
                  const items = itemsByCategory[category] || [];
                  if (items.length === 0) return null;
                  
                  const config = CATEGORY_CONFIG[category];
                  const Icon = CATEGORY_ICONS[category];
                  const isExpanded = expandedCategories.has(category);
                  const selectedCount = selectedByCategory[category] || 0;
                  const allSelected = selectedCount === items.length;
                  const someSelected = selectedCount > 0 && selectedCount < items.length;
                  
                  return (
                    <div
                      key={category}
                      className="border border-gray-200 rounded-xl overflow-hidden"
                    >
                      {/* Category Header */}
                      <div
                        className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => toggleCategoryExpand(category)}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCategory(category);
                            }}
                            className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${
                              allSelected
                                ? 'bg-navy-700 border-navy-700'
                                : someSelected
                                ? 'bg-navy-200 border-navy-400'
                                : 'border-gray-300 hover:border-navy-400'
                            }`}
                          >
                            {(allSelected || someSelected) && (
                              <CheckCircle className="w-3 h-3 text-white" />
                            )}
                          </button>
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: config.color }}
                          >
                            <Icon className="w-4 h-4 text-gray-700" />
                          </div>
                          <span className="font-medium text-gray-900">
                            {config.icon} {config.label}s
                          </span>
                          <span className="text-sm text-gray-500">
                            ({selectedCount}/{items.length})
                          </span>
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      
                      {/* Category Items */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="p-2 space-y-1 max-h-48 overflow-y-auto">
                              {items.map((item: WhiteboardObject) => {
                                const isSelected = selectedItems.has(item.id);
                                return (
                                  <div
                                    key={item.id}
                                    onClick={() => toggleItem(item.id)}
                                    className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                                      isSelected
                                        ? 'bg-navy-50 hover:bg-navy-100'
                                        : 'hover:bg-gray-50'
                                    }`}
                                  >
                                    <button
                                      className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border-2 transition-colors mt-0.5 ${
                                        isSelected
                                          ? 'bg-navy-700 border-navy-700'
                                          : 'border-gray-300'
                                      }`}
                                    >
                                      {isSelected && (
                                        <CheckCircle className="w-3 h-3 text-white" />
                                      )}
                                    </button>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm text-gray-700 line-clamp-2">
                                        {item.content}
                                      </p>
                                      <div className="flex items-center gap-2 mt-1">
                                        {item.speakerLabel && (
                                          <span className="text-xs text-gray-400">
                                            👤 {item.speakerLabel}
                                          </span>
                                        )}
                                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                                          item.confidence > 0.7
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-yellow-100 text-yellow-700'
                                        }`}>
                                          {Math.round(item.confidence * 100)}%
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>

              {/* Layout Selection */}
              <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                <p className="text-sm font-medium text-gray-700 mb-3">Layout Style</p>
                <div className="flex gap-2">
                  {[
                    { id: 'grouped' as LayoutType, label: 'Grouped', icon: Layers, desc: 'By category' },
                    { id: 'grid' as LayoutType, label: 'Grid', icon: Grid3X3, desc: 'Simple grid' },
                    { id: 'timeline' as LayoutType, label: 'Timeline', icon: Clock, desc: 'Sequential' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setLayout(opt.id)}
                      className={`flex-1 p-3 rounded-xl border-2 transition-all ${
                        layout === opt.id
                          ? 'border-navy-500 bg-navy-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <opt.icon className={`w-5 h-5 mx-auto mb-1 ${
                        layout === opt.id ? 'text-navy-700' : 'text-gray-400'
                      }`} />
                      <p className={`text-sm font-medium ${
                        layout === opt.id ? 'text-navy-800' : 'text-gray-700'
                      }`}>
                        {opt.label}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-gray-700 hover:bg-gray-200 rounded-xl font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddToWhiteboard}
              disabled={selectedItems.size === 0 || isLoading}
              className="px-6 py-2.5 bg-navy-700 text-white rounded-xl font-medium hover:bg-navy-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add {selectedItems.size} Items to Whiteboard
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
