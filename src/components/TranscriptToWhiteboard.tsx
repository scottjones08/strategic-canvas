/**
 * Transcript to Whiteboard Component
 * Shows extracted items from transcript and allows adding them to the whiteboard
 */

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wand2,
  X,
  Check,
  Loader2,
  Lightbulb,
  CheckSquare,
  HelpCircle,
  Target,
  AlertTriangle,
  Rocket,
  Eye,
  EyeOff,
  Sparkles,
  LayoutGrid,
  Users,
  Clock,
} from 'lucide-react';
import {
  WhiteboardCategory,
  CATEGORY_CONFIG,
  extractWithPatterns,
  extractWithAI,
  generateLayout,
  ExtractionResult,
} from '../lib/transcript-to-whiteboard';
import { FullTranscript, formatDuration } from '../lib/transcription';

interface TranscriptToWhiteboardProps {
  transcript: FullTranscript;
  onAddToWhiteboard: (objects: Array<{
    type: string;
    content: string;
    color: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }>) => void;
  onClose: () => void;
  aiApiKey?: string;
  canvasCenter?: { x: number; y: number };
}

const CATEGORY_ICONS: Record<WhiteboardCategory, typeof Lightbulb> = {
  idea: Lightbulb,
  action: CheckSquare,
  question: HelpCircle,
  decision: Target,
  risk: AlertTriangle,
  opportunity: Rocket,
};

export default function TranscriptToWhiteboard({
  transcript,
  onAddToWhiteboard,
  onClose,
  aiApiKey,
  canvasCenter = { x: 100, y: 100 },
}: TranscriptToWhiteboardProps) {
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [useAI, setUseAI] = useState(!!aiApiKey);
  const [filterCategory, setFilterCategory] = useState<WhiteboardCategory | 'all'>('all');
  const [previewMode, setPreviewMode] = useState(false);

  // Extract items
  const handleExtract = useCallback(async () => {
    setIsExtracting(true);
    try {
      let result: ExtractionResult;
      
      if (useAI && aiApiKey) {
        result = await extractWithAI(transcript, aiApiKey);
      } else {
        result = extractWithPatterns(transcript);
      }
      
      setExtractionResult(result);
      // Select all by default
      setSelectedIds(new Set(result.objects.map(o => o.id)));
    } catch (error) {
      console.error('Extraction failed:', error);
      // Fall back to patterns
      const result = extractWithPatterns(transcript);
      setExtractionResult(result);
      setSelectedIds(new Set(result.objects.map(o => o.id)));
    } finally {
      setIsExtracting(false);
    }
  }, [transcript, useAI, aiApiKey]);

  // Toggle item selection
  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Select/deselect all
  const toggleSelectAll = useCallback(() => {
    if (!extractionResult) return;
    
    if (selectedIds.size === extractionResult.objects.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(extractionResult.objects.map(o => o.id)));
    }
  }, [extractionResult, selectedIds]);

  // Select by category
  const selectByCategory = useCallback((category: WhiteboardCategory) => {
    if (!extractionResult) return;
    
    const categoryIds = extractionResult.objects
      .filter(o => o.category === category)
      .map(o => o.id);
    
    setSelectedIds(new Set(categoryIds));
    setFilterCategory(category);
  }, [extractionResult]);

  // Filtered objects
  const filteredObjects = useMemo(() => {
    if (!extractionResult) return [];
    if (filterCategory === 'all') return extractionResult.objects;
    return extractionResult.objects.filter(o => o.category === filterCategory);
  }, [extractionResult, filterCategory]);

  // Category counts
  const categoryCounts = useMemo(() => {
    if (!extractionResult) return {};
    
    const counts: Record<string, number> = { all: extractionResult.objects.length };
    extractionResult.objects.forEach(o => {
      counts[o.category] = (counts[o.category] || 0) + 1;
    });
    return counts;
  }, [extractionResult]);

  // Add selected items to whiteboard
  const handleAddToWhiteboard = useCallback(() => {
    if (!extractionResult) return;
    
    const selectedObjects = extractionResult.objects.filter(o => selectedIds.has(o.id));
    
    // Generate layout
    const layoutedObjects = generateLayout(selectedObjects, {
      startX: canvasCenter.x,
      startY: canvasCenter.y,
      groupByCategory: true,
    });
    
    // Convert to whiteboard format
    const whiteboardObjects = layoutedObjects.map(obj => ({
      type: obj.type === 'frame' ? 'frame' : obj.type,
      content: obj.content,
      color: obj.color,
      x: obj.x,
      y: obj.y,
      width: obj.width,
      height: obj.height,
    }));
    
    onAddToWhiteboard(whiteboardObjects);
    onClose();
  }, [extractionResult, selectedIds, canvasCenter, onAddToWhiteboard, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-navy-500 to-navy-700 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Wand2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Generate Whiteboard from Transcript</h2>
                <p className="text-sm text-white/80">
                  {extractionResult 
                    ? `${extractionResult.objects.length} items found • ${selectedIds.size} selected`
                    : 'Extract key items and add them to your whiteboard'}
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
        {!extractionResult ? (
          /* Pre-extraction state */
          <div className="flex-1 p-8">
            {/* Transcript Preview */}
            <div className="mb-6 p-4 bg-gray-50 rounded-xl max-h-48 overflow-y-auto">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {transcript.segments.length} segments • {formatDuration(transcript.duration)} duration
                </span>
                <span className="mx-2 text-gray-300">|</span>
                <Users className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {transcript.speakers.length} speakers
                </span>
              </div>
              <div className="space-y-2">
                {transcript.segments.slice(0, 5).map((seg, i) => (
                  <p key={i} className="text-sm text-gray-700">
                    <span className="font-medium text-gray-500">{seg.speakerLabel}:</span>{' '}
                    {seg.text.substring(0, 100)}{seg.text.length > 100 ? '...' : ''}
                  </p>
                ))}
                {transcript.segments.length > 5 && (
                  <p className="text-xs text-gray-400 italic">
                    ...and {transcript.segments.length - 5} more segments
                  </p>
                )}
              </div>
            </div>

            {/* Extraction Options */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Extraction Method</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setUseAI(false)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    !useAI
                      ? 'border-navy-500 bg-navy-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <LayoutGrid className={`w-5 h-5 ${!useAI ? 'text-navy-600' : 'text-gray-500'}`} />
                    <span className={`font-medium ${!useAI ? 'text-navy-900' : 'text-gray-900'}`}>
                      Pattern Matching
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    Fast keyword-based extraction. Works offline, no API needed.
                  </p>
                </button>

                <button
                  onClick={() => aiApiKey && setUseAI(true)}
                  disabled={!aiApiKey}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    useAI && aiApiKey
                      ? 'border-navy-500 bg-navy-50'
                      : !aiApiKey
                      ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Sparkles className={`w-5 h-5 ${useAI ? 'text-navy-600' : 'text-gray-500'}`} />
                    <span className={`font-medium ${useAI ? 'text-navy-900' : 'text-gray-900'}`}>
                      AI-Powered
                    </span>
                    {!aiApiKey && (
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                        API key required
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    Smart analysis using Claude AI. Better context understanding.
                  </p>
                </button>
              </div>

              {/* What will be extracted */}
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Items to extract:</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(CATEGORY_CONFIG).map(([category, config]) => (
                    <div
                      key={category}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm"
                      style={{ backgroundColor: `${config.color}80` }}
                    >
                      <span>{config.icon}</span>
                      <span className="font-medium">{config.label}s</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Extract Button */}
            <div className="mt-8 flex justify-center">
              <button
                onClick={handleExtract}
                disabled={isExtracting}
                className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-navy-600 to-navy-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Analyzing Transcript...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5" />
                    Extract Items
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Post-extraction state */
          <>
            {/* Filter Bar */}
            <div className="p-3 border-b border-gray-200 bg-gray-50 flex items-center gap-2 overflow-x-auto">
              <span className="text-xs text-gray-500 font-medium shrink-0">Filter:</span>
              <button
                onClick={() => setFilterCategory('all')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors shrink-0 ${
                  filterCategory === 'all'
                    ? 'bg-gray-800 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                All ({categoryCounts.all || 0})
              </button>
              {Object.entries(CATEGORY_CONFIG).map(([category, config]) => {
                const count = categoryCounts[category] || 0;
                if (count === 0) return null;
                return (
                  <button
                    key={category}
                    onClick={() => selectByCategory(category as WhiteboardCategory)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors shrink-0 ${
                      filterCategory === category ? 'ring-2 ring-offset-1' : 'hover:opacity-80'
                    }`}
                    style={{ backgroundColor: config.color }}
                  >
                    <span>{config.icon}</span>
                    {count}
                  </button>
                );
              })}
              
              <div className="flex-1" />
              
              <button
                onClick={toggleSelectAll}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
              >
                {selectedIds.size === extractionResult.objects.length ? 'Deselect All' : 'Select All'}
              </button>
              
              <button
                onClick={() => setPreviewMode(!previewMode)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors shrink-0 ${
                  previewMode ? 'bg-navy-100 text-navy-800' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {previewMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                Preview
              </button>
            </div>

            {/* Items Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              {previewMode ? (
                /* Visual Preview */
                <div className="relative bg-gray-100 rounded-xl p-4 min-h-[400px] overflow-auto">
                  <div className="text-xs text-gray-400 mb-4">Preview of whiteboard layout</div>
                  {generateLayout(
                    filteredObjects.filter(o => selectedIds.has(o.id)),
                    { startX: 20, startY: 20, nodeWidth: 150, nodeHeight: 100, horizontalGap: 20, verticalGap: 20, maxColumns: 5 }
                  ).map((obj) => (
                    <div
                      key={obj.id}
                      className="absolute rounded-lg border-2 border-gray-300 p-2 shadow-sm transition-transform hover:scale-105"
                      style={{
                        left: obj.x,
                        top: obj.y,
                        width: obj.width,
                        height: obj.height,
                        backgroundColor: obj.color,
                      }}
                    >
                      {obj.type === 'frame' ? (
                        <div className="font-semibold text-sm text-gray-700 border-b border-gray-300 pb-1 mb-1">
                          {obj.content}
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-1 mb-1">
                            <span className="text-xs">{CATEGORY_CONFIG[obj.category]?.icon}</span>
                            <span className="text-[10px] text-gray-500 uppercase tracking-wide">
                              {CATEGORY_CONFIG[obj.category]?.label}
                            </span>
                          </div>
                          <p className="text-xs text-gray-700 line-clamp-3">{obj.content}</p>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                /* List View */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <AnimatePresence>
                    {filteredObjects.map((obj) => {
                      const config = CATEGORY_CONFIG[obj.category];
                      const Icon = CATEGORY_ICONS[obj.category];
                      const isSelected = selectedIds.has(obj.id);
                      
                      return (
                        <motion.div
                          key={obj.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          onClick={() => toggleSelection(obj.id)}
                          className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            isSelected
                              ? 'border-navy-500 shadow-md'
                              : 'border-transparent hover:border-gray-200'
                          }`}
                          style={{ backgroundColor: isSelected ? config.color : `${config.color}60` }}
                        >
                          <div className="flex items-start gap-3">
                            {/* Selection checkbox */}
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                              isSelected ? 'bg-navy-500 border-navy-500' : 'border-gray-300 bg-white'
                            }`}>
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                            
                            {/* Icon */}
                            <div className="p-2 bg-white/50 rounded-lg flex-shrink-0">
                              <Icon className="w-4 h-4 text-gray-700" />
                            </div>
                            
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                  {config.label}
                                </span>
                                <span className="text-xs text-gray-400">
                                  {Math.round(obj.confidence * 100)}% confident
                                </span>
                              </div>
                              <p className="text-sm text-gray-800 leading-snug">{obj.content}</p>
                              {obj.speakerLabel && (
                                <p className="text-xs text-gray-500 mt-1">— {obj.speakerLabel}</p>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
              
              {filteredObjects.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <Lightbulb className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p>No items found in this category</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <button
                onClick={() => setExtractionResult(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ← Re-analyze
              </button>
              
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">
                  {selectedIds.size} items selected
                </span>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddToWhiteboard}
                  disabled={selectedIds.size === 0}
                  className="flex items-center gap-2 px-6 py-2 bg-navy-700 text-white rounded-lg font-medium hover:bg-navy-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="w-4 h-4" />
                  Add to Whiteboard
                </button>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
