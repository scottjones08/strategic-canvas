/**
 * AI Assist Panel
 *
 * A floating panel that provides AI-powered features for the canvas:
 * - Generate sticky notes from prompts
 * - Auto-cluster existing stickies by theme
 * - Summarize board content
 * - Expand ideas with alternatives
 *
 * Features:
 * - Modern glassmorphism design
 * - Animated loading states with Framer Motion
 * - Results display with "add to board" functionality
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Sparkles,
  Lightbulb,
  Layers,
  FileText,
  Wand2,
  ChevronRight,
  Plus,
  Check,
  Loader2,
  RefreshCw,
  ArrowRight,
  MessageSquare,
  TrendingUp,
  AlertCircle,
  Target,
  Zap
} from 'lucide-react';
import type { VisualNode } from '../types/board';
import {
  generateStickies,
  clusterStickies,
  summarizeBoard,
  expandIdea,
  type GeneratedSticky,
  type StickyCluster,
  type BoardSummary,
  type ExpandedIdea
} from '../lib/ai-features';

interface AIAssistPanelProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: VisualNode[];
  selectedNodes: VisualNode[];
  onAddStickies: (stickies: { content: string; color: string }[]) => void;
  onHighlightNodes: (nodeIds: string[]) => void;
  onCreateClusterFrames: (clusters: { label: string; nodeIds: string[]; color: string }[]) => void;
}

type AIMode = 'menu' | 'generate' | 'cluster' | 'summarize' | 'expand';

export const AIAssistPanel: React.FC<AIAssistPanelProps> = ({
  isOpen,
  onClose,
  nodes,
  selectedNodes,
  onAddStickies,
  onHighlightNodes,
  onCreateClusterFrames
}) => {
  const [mode, setMode] = useState<AIMode>('menu');
  const [prompt, setPrompt] = useState('');
  const [stickyCount, setStickyCount] = useState(5);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Results state
  const [generatedStickies, setGeneratedStickies] = useState<GeneratedSticky[]>([]);
  const [clusters, setClusters] = useState<StickyCluster[]>([]);
  const [summary, setSummary] = useState<BoardSummary | null>(null);
  const [expandedIdea, setExpandedIdea] = useState<ExpandedIdea | null>(null);
  const [addedItems, setAddedItems] = useState<Set<number>>(new Set());

  // Reset state when closing or changing mode
  const resetState = useCallback(() => {
    setPrompt('');
    setIsLoading(false);
    setError(null);
    setGeneratedStickies([]);
    setClusters([]);
    setSummary(null);
    setExpandedIdea(null);
    setAddedItems(new Set());
  }, []);

  const handleModeChange = (newMode: AIMode) => {
    resetState();
    setMode(newMode);
  };

  const handleClose = () => {
    resetState();
    setMode('menu');
    onClose();
  };

  // Generate stickies handler
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const results = await generateStickies(prompt, stickyCount);
      setGeneratedStickies(results);
    } catch (err) {
      setError('Failed to generate ideas. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Cluster stickies handler
  const handleCluster = async () => {
    const stickyNodes = nodes.filter(n => n.type === 'sticky' || n.type === 'text');
    if (stickyNodes.length < 2) {
      setError('Need at least 2 sticky notes to cluster');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const results = await clusterStickies(nodes);
      setClusters(results);
    } catch (err) {
      setError('Failed to analyze content. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Summarize board handler
  const handleSummarize = async () => {
    if (nodes.length === 0) {
      setError('Board is empty');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await summarizeBoard(nodes);
      setSummary(result);
    } catch (err) {
      setError('Failed to summarize board. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Expand idea handler
  const handleExpand = async () => {
    const nodeToExpand = selectedNodes[0];
    if (!nodeToExpand?.content) {
      setError('Select a sticky note with content to expand');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await expandIdea(nodeToExpand.content);
      setExpandedIdea(result);
    } catch (err) {
      setError('Failed to expand idea. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Add single sticky to board
  const handleAddSingleSticky = (index: number, sticky: GeneratedSticky) => {
    onAddStickies([{ content: sticky.content, color: sticky.suggestedColor }]);
    setAddedItems(prev => new Set([...prev, index]));
  };

  // Add all stickies to board
  const handleAddAllStickies = () => {
    onAddStickies(generatedStickies.map(s => ({ content: s.content, color: s.suggestedColor })));
    setAddedItems(new Set(generatedStickies.map((_, i) => i)));
  };

  // Add expanded alternatives to board
  const handleAddAlternative = (index: number, content: string) => {
    onAddStickies([{ content, color: '#dbeafe' }]);
    setAddedItems(prev => new Set([...prev, index]));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 20, scale: 0.95 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 20, scale: 0.95 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="fixed right-4 top-24 w-80 sm:w-96 max-h-[80vh] bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 overflow-hidden z-50"
        style={{
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.5) inset'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-navy-500 via-navy-500 to-pink-500">
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <Sparkles className="w-5 h-5 text-white" />
            </motion.div>
            <span className="font-semibold text-white">AI Assist</span>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(80vh-60px)] scrollbar-hide">
          <AnimatePresence mode="wait">
            {/* Main Menu */}
            {mode === 'menu' && (
              <motion.div
                key="menu"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 space-y-2"
              >
                <p className="text-sm text-gray-500 mb-4">
                  Let AI help you brainstorm, organize, and analyze your ideas.
                </p>

                <AIMenuButton
                  icon={<Lightbulb className="w-5 h-5" />}
                  title="Generate Ideas"
                  description="Create sticky notes from a prompt"
                  color="amber"
                  onClick={() => handleModeChange('generate')}
                />

                <AIMenuButton
                  icon={<Layers className="w-5 h-5" />}
                  title="Auto-Cluster"
                  description="Group stickies by theme"
                  color="blue"
                  onClick={() => handleModeChange('cluster')}
                />

                <AIMenuButton
                  icon={<FileText className="w-5 h-5" />}
                  title="Summarize Board"
                  description="Get insights and key themes"
                  color="green"
                  onClick={() => handleModeChange('summarize')}
                />

                <AIMenuButton
                  icon={<Wand2 className="w-5 h-5" />}
                  title="Expand Idea"
                  description="Get alternatives and questions"
                  color="purple"
                  onClick={() => handleModeChange('expand')}
                  disabled={selectedNodes.length === 0}
                  disabledReason="Select a sticky note first"
                />
              </motion.div>
            )}

            {/* Generate Mode */}
            {mode === 'generate' && (
              <motion.div
                key="generate"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4"
              >
                <BackButton onClick={() => handleModeChange('menu')} />

                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-xl bg-amber-100">
                    <Lightbulb className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Generate Ideas</h3>
                    <p className="text-xs text-gray-500">AI will brainstorm for you</p>
                  </div>
                </div>

                {/* Prompt Input */}
                <div className="space-y-3 mb-4">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                      What would you like ideas about?
                    </label>
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="e.g., marketing strategies for a new product launch"
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent resize-none bg-white/50"
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                      Number of ideas: {stickyCount}
                    </label>
                    <input
                      type="range"
                      min="3"
                      max="10"
                      value={stickyCount}
                      onChange={(e) => setStickyCount(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-navy-700"
                    />
                  </div>
                </div>

                {error && <ErrorMessage message={error} />}

                <button
                  onClick={handleGenerate}
                  disabled={isLoading || !prompt.trim()}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium rounded-xl hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Generate Ideas
                    </>
                  )}
                </button>

                {/* Results */}
                {generatedStickies.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        Generated Ideas
                      </span>
                      <button
                        onClick={handleAddAllStickies}
                        className="text-xs text-navy-700 hover:text-navy-800 font-medium flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        Add All
                      </button>
                    </div>

                    {generatedStickies.map((sticky, index) => (
                      <GeneratedStickyCard
                        key={index}
                        sticky={sticky}
                        index={index}
                        isAdded={addedItems.has(index)}
                        onAdd={() => handleAddSingleSticky(index, sticky)}
                      />
                    ))}
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Cluster Mode */}
            {mode === 'cluster' && (
              <motion.div
                key="cluster"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4"
              >
                <BackButton onClick={() => handleModeChange('menu')} />

                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-xl bg-blue-100">
                    <Layers className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Auto-Cluster</h3>
                    <p className="text-xs text-gray-500">Group stickies by theme</p>
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-4">
                  AI will analyze your sticky notes and group them by common themes and topics.
                </p>

                {error && <ErrorMessage message={error} />}

                {clusters.length === 0 && (
                  <button
                    onClick={handleCluster}
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium rounded-xl hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Layers className="w-4 h-4" />
                        Analyze & Cluster
                      </>
                    )}
                  </button>
                )}

                {/* Cluster Results */}
                {clusters.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        Found {clusters.length} themes
                      </span>
                      <button
                        onClick={() => onCreateClusterFrames(clusters.map(c => ({
                          label: c.label,
                          nodeIds: c.nodeIds,
                          color: c.suggestedColor
                        })))}
                        className="text-xs text-navy-700 hover:text-navy-800 font-medium flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        Create Frames
                      </button>
                    </div>

                    {clusters.map((cluster, index) => (
                      <ClusterCard
                        key={index}
                        cluster={cluster}
                        onHighlight={() => onHighlightNodes(cluster.nodeIds)}
                      />
                    ))}

                    <button
                      onClick={() => {
                        setClusters([]);
                        handleCluster();
                      }}
                      className="w-full py-2 text-sm text-gray-600 hover:text-gray-800 flex items-center justify-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Re-analyze
                    </button>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Summarize Mode */}
            {mode === 'summarize' && (
              <motion.div
                key="summarize"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4"
              >
                <BackButton onClick={() => handleModeChange('menu')} />

                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-xl bg-green-100">
                    <FileText className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Board Summary</h3>
                    <p className="text-xs text-gray-500">Key insights and themes</p>
                  </div>
                </div>

                {error && <ErrorMessage message={error} />}

                {!summary && (
                  <button
                    onClick={handleSummarize}
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium rounded-xl hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analyzing board...
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4" />
                        Generate Summary
                      </>
                    )}
                  </button>
                )}

                {/* Summary Results */}
                {summary && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    {/* Overview */}
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <p className="text-sm text-gray-700">{summary.overview}</p>
                    </div>

                    {/* Sentiment */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500">Overall Tone:</span>
                      <SentimentBadge sentiment={summary.sentiment} />
                    </div>

                    {/* Key Themes */}
                    {summary.keyThemes.length > 0 && (
                      <div>
                        <span className="text-xs font-medium text-gray-500 block mb-2">
                          Key Themes
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {summary.keyThemes.map((theme, i) => (
                            <span
                              key={i}
                              className="px-2 py-1 bg-navy-100 text-navy-800 text-xs font-medium rounded-full"
                            >
                              {theme}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Item Counts */}
                    <div>
                      <span className="text-xs font-medium text-gray-500 block mb-2">
                        Content Breakdown
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(summary.itemCounts).map(([type, count]) => (
                          <div key={type} className="flex items-center justify-between px-2 py-1.5 bg-gray-50 rounded-lg">
                            <span className="text-xs text-gray-600 capitalize">{type}</span>
                            <span className="text-xs font-semibold text-gray-800">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Suggestions */}
                    {summary.suggestions.length > 0 && (
                      <div>
                        <span className="text-xs font-medium text-gray-500 block mb-2">
                          Suggestions
                        </span>
                        <div className="space-y-1.5">
                          {summary.suggestions.map((suggestion, i) => (
                            <div
                              key={i}
                              className="flex items-start gap-2 text-xs text-gray-600"
                            >
                              <Target className="w-3 h-3 text-navy-500 mt-0.5 flex-shrink-0" />
                              <span>{suggestion}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => {
                        setSummary(null);
                        handleSummarize();
                      }}
                      className="w-full py-2 text-sm text-gray-600 hover:text-gray-800 flex items-center justify-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Refresh Summary
                    </button>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Expand Mode */}
            {mode === 'expand' && (
              <motion.div
                key="expand"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4"
              >
                <BackButton onClick={() => handleModeChange('menu')} />

                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-xl bg-navy-100">
                    <Wand2 className="w-5 h-5 text-navy-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Expand Idea</h3>
                    <p className="text-xs text-gray-500">Get alternatives and questions</p>
                  </div>
                </div>

                {selectedNodes.length === 0 ? (
                  <div className="text-center py-6">
                    <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">
                      Select a sticky note to expand
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Selected Node Preview */}
                    <div
                      className="p-3 rounded-xl mb-4 border-2 border-dashed border-gray-200"
                      style={{ backgroundColor: selectedNodes[0]?.color || '#fef3c7' }}
                    >
                      <p className="text-sm font-medium text-gray-800">
                        {selectedNodes[0]?.content || 'No content'}
                      </p>
                    </div>

                    {error && <ErrorMessage message={error} />}

                    {!expandedIdea && (
                      <button
                        onClick={handleExpand}
                        disabled={isLoading || !selectedNodes[0]?.content}
                        className="w-full py-2.5 px-4 bg-gradient-to-r from-navy-500 to-pink-500 text-white font-medium rounded-xl hover:from-navy-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Expanding...
                          </>
                        ) : (
                          <>
                            <Wand2 className="w-4 h-4" />
                            Expand This Idea
                          </>
                        )}
                      </button>
                    )}

                    {/* Expanded Results */}
                    {expandedIdea && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                      >
                        {/* Alternatives */}
                        <div>
                          <span className="text-xs font-medium text-gray-500 block mb-2">
                            Alternative Angles
                          </span>
                          <div className="space-y-1.5">
                            {expandedIdea.alternatives.map((alt, i) => (
                              <ExpandedItemCard
                                key={i}
                                content={alt}
                                index={i}
                                isAdded={addedItems.has(i)}
                                onAdd={() => handleAddAlternative(i, alt)}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Questions */}
                        <div>
                          <span className="text-xs font-medium text-gray-500 block mb-2">
                            Questions to Consider
                          </span>
                          <div className="space-y-1.5">
                            {expandedIdea.questions.map((q, i) => (
                              <ExpandedItemCard
                                key={i}
                                content={q}
                                index={i + 100}
                                isAdded={addedItems.has(i + 100)}
                                onAdd={() => handleAddAlternative(i + 100, q)}
                                icon={<MessageSquare className="w-3 h-3" />}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Related Concepts */}
                        <div>
                          <span className="text-xs font-medium text-gray-500 block mb-2">
                            Related Concepts
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {expandedIdea.relatedConcepts.map((concept, i) => (
                              <button
                                key={i}
                                onClick={() => handleAddAlternative(i + 200, concept)}
                                className={`px-2 py-1 text-xs font-medium rounded-full transition-all ${
                                  addedItems.has(i + 200)
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-600 hover:bg-navy-100 hover:text-navy-800'
                                }`}
                              >
                                {addedItems.has(i + 200) ? (
                                  <Check className="w-3 h-3 inline mr-1" />
                                ) : (
                                  <Plus className="w-3 h-3 inline mr-1" />
                                )}
                                {concept}
                              </button>
                            ))}
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setExpandedIdea(null);
                            setAddedItems(new Set());
                            handleExpand();
                          }}
                          className="w-full py-2 text-sm text-gray-600 hover:text-gray-800 flex items-center justify-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Re-expand
                        </button>
                      </motion.div>
                    )}
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-gray-50/80 border-t border-gray-100">
          <p className="text-[10px] text-gray-400 text-center">
            AI suggestions are simulated. Connect to OpenAI/Claude for real AI.
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

// Helper Components

interface AIMenuButtonProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: 'amber' | 'blue' | 'green' | 'purple';
  onClick: () => void;
  disabled?: boolean;
  disabledReason?: string;
}

const AIMenuButton: React.FC<AIMenuButtonProps> = ({
  icon,
  title,
  description,
  color,
  onClick,
  disabled,
  disabledReason
}) => {
  const colorClasses = {
    amber: 'bg-amber-50 text-amber-600 group-hover:bg-amber-100',
    blue: 'bg-blue-50 text-blue-600 group-hover:bg-blue-100',
    green: 'bg-green-50 text-green-600 group-hover:bg-green-100',
    purple: 'bg-navy-50 text-navy-600 group-hover:bg-navy-100'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`group w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 transition-all ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      title={disabled ? disabledReason : undefined}
    >
      <div className={`p-2.5 rounded-xl transition-colors ${colorClasses[color]}`}>
        {icon}
      </div>
      <div className="flex-1 text-left">
        <h4 className="font-medium text-gray-900 text-sm">{title}</h4>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-400 transition-colors" />
    </button>
  );
};

const BackButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3 transition-colors"
  >
    <ChevronRight className="w-4 h-4 rotate-180" />
    Back
  </button>
);

const ErrorMessage: React.FC<{ message: string }> = ({ message }) => (
  <motion.div
    initial={{ opacity: 0, y: -5 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex items-center gap-2 p-2 mb-3 bg-red-50 border border-red-100 rounded-lg"
  >
    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
    <span className="text-xs text-red-600">{message}</span>
  </motion.div>
);

interface GeneratedStickyCardProps {
  sticky: GeneratedSticky;
  index: number;
  isAdded: boolean;
  onAdd: () => void;
}

const GeneratedStickyCard: React.FC<GeneratedStickyCardProps> = ({
  sticky,
  index,
  isAdded,
  onAdd
}) => (
  <motion.div
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: index * 0.05 }}
    className="flex items-start gap-2 p-2 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors"
    style={{ backgroundColor: `${sticky.suggestedColor}40` }}
  >
    <div
      className="w-3 h-3 rounded-sm flex-shrink-0 mt-0.5"
      style={{ backgroundColor: sticky.suggestedColor }}
    />
    <p className="flex-1 text-xs text-gray-700">{sticky.content}</p>
    <button
      onClick={onAdd}
      disabled={isAdded}
      className={`p-1 rounded-md transition-all flex-shrink-0 ${
        isAdded
          ? 'bg-green-100 text-green-600'
          : 'bg-white/50 hover:bg-white text-gray-500 hover:text-navy-700'
      }`}
    >
      {isAdded ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
    </button>
  </motion.div>
);

interface ClusterCardProps {
  cluster: StickyCluster;
  onHighlight: () => void;
}

const ClusterCard: React.FC<ClusterCardProps> = ({ cluster, onHighlight }) => (
  <motion.div
    initial={{ opacity: 0, y: 5 }}
    animate={{ opacity: 1, y: 0 }}
    className="p-3 rounded-xl border border-gray-100"
    style={{ backgroundColor: `${cluster.suggestedColor}60` }}
  >
    <div className="flex items-center justify-between mb-1.5">
      <h4 className="font-medium text-sm text-gray-800">{cluster.label}</h4>
      <div className="flex items-center gap-2">
        <SentimentBadge sentiment={cluster.sentiment} small />
        <span className="text-xs text-gray-500">{cluster.nodeIds.length} items</span>
      </div>
    </div>
    <p className="text-xs text-gray-600 mb-2">{cluster.description}</p>
    <button
      onClick={onHighlight}
      className="text-xs text-navy-700 hover:text-navy-800 font-medium flex items-center gap-1"
    >
      <ArrowRight className="w-3 h-3" />
      Highlight on board
    </button>
  </motion.div>
);

interface SentimentBadgeProps {
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  small?: boolean;
}

const SentimentBadge: React.FC<SentimentBadgeProps> = ({ sentiment, small }) => {
  const config = {
    positive: { bg: 'bg-green-100', text: 'text-green-700', label: 'Positive' },
    negative: { bg: 'bg-red-100', text: 'text-red-700', label: 'Challenges' },
    neutral: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Neutral' },
    mixed: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Mixed' }
  };

  const { bg, text, label } = config[sentiment];

  return (
    <span className={`${bg} ${text} ${small ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs'} font-medium rounded-full`}>
      {label}
    </span>
  );
};

interface ExpandedItemCardProps {
  content: string;
  index: number;
  isAdded: boolean;
  onAdd: () => void;
  icon?: React.ReactNode;
}

const ExpandedItemCard: React.FC<ExpandedItemCardProps> = ({
  content,
  index,
  isAdded,
  onAdd,
  icon
}) => (
  <motion.div
    initial={{ opacity: 0, x: -5 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: (index % 10) * 0.03 }}
    className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
  >
    {icon && <span className="text-gray-400 mt-0.5">{icon}</span>}
    <p className="flex-1 text-xs text-gray-700">{content}</p>
    <button
      onClick={onAdd}
      disabled={isAdded}
      className={`p-1 rounded-md transition-all flex-shrink-0 ${
        isAdded
          ? 'bg-green-100 text-green-600'
          : 'hover:bg-white text-gray-400 hover:text-navy-700'
      }`}
    >
      {isAdded ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
    </button>
  </motion.div>
);

export default AIAssistPanel;
