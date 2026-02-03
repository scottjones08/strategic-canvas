/**
 * Pre-Session Context Brief Component
 * 
 * Automatically generates a briefing before planning sessions from:
 * - Recent canvas changes
 * - Open action items from previous meetings
 * - Previous meeting summaries
 * 
 * Shows as a dismissable panel when opening a board with a
 * "Prepare me for this session" button.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  X,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  ListTodo,
  Target,
  Users,
  ArrowRight,
  Loader2,
  Calendar,
  MessageSquare,
  TrendingUp,
  Flag,
  Zap,
  Brain,
  History,
  Eye,
  EyeOff,
  RefreshCw,
  Bookmark,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface CanvasChange {
  id: string;
  type: 'added' | 'modified' | 'deleted';
  nodeType: string;
  content: string;
  author: string;
  timestamp: Date;
}

export interface OpenActionItem {
  id: string;
  task: string;
  owner?: string;
  dueDate?: string;
  priority?: 'high' | 'medium' | 'low';
  status: 'todo' | 'in-progress' | 'overdue';
  fromMeetingId?: string;
  fromMeetingDate?: Date;
}

export interface PreviousMeetingSummary {
  id: string;
  date: Date;
  overview: string;
  keyDecisions: string[];
  openQuestions: string[];
  participants: string[];
}

export interface PreSessionBriefProps {
  boardId: string;
  boardName: string;
  /** Recent changes to the canvas */
  recentChanges?: CanvasChange[];
  /** Open action items from previous sessions */
  openActionItems?: OpenActionItem[];
  /** Summaries from previous meetings */
  previousMeetings?: PreviousMeetingSummary[];
  /** Current participants */
  participants?: string[];
  /** Called when the brief is dismissed */
  onDismiss?: () => void;
  /** Called when user wants to generate a full AI briefing */
  onGenerateBrief?: () => Promise<string>;
  /** Called when user clicks on an action item */
  onActionItemClick?: (item: OpenActionItem) => void;
  /** Whether the panel is visible */
  isVisible?: boolean;
  /** AI API key for generating briefs */
  aiApiKey?: string;
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

const getPriorityColor = (priority?: string): string => {
  switch (priority) {
    case 'high': return 'text-red-600 bg-red-50 border-red-200';
    case 'medium': return 'text-amber-600 bg-amber-50 border-amber-200';
    case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
    default: return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'overdue': return <AlertCircle className="w-3.5 h-3.5 text-red-500" />;
    case 'in-progress': return <TrendingUp className="w-3.5 h-3.5 text-blue-500" />;
    default: return <CheckCircle2 className="w-3.5 h-3.5 text-gray-400" />;
  }
};

function generateLocalBrief(
  changes: CanvasChange[],
  actionItems: OpenActionItem[],
  meetings: PreviousMeetingSummary[],
  boardName: string,
): string {
  const parts: string[] = [];

  parts.push(`Welcome back to "${boardName}".`);

  if (changes.length > 0) {
    const added = changes.filter(c => c.type === 'added').length;
    const modified = changes.filter(c => c.type === 'modified').length;
    if (added > 0 || modified > 0) {
      const changeParts: string[] = [];
      if (added > 0) changeParts.push(`${added} new item${added > 1 ? 's' : ''} added`);
      if (modified > 0) changeParts.push(`${modified} item${modified > 1 ? 's' : ''} updated`);
      parts.push(`Since your last session: ${changeParts.join(' and ')}.`);
    }
  }

  const overdue = actionItems.filter(a => a.status === 'overdue');
  const pending = actionItems.filter(a => a.status === 'todo' || a.status === 'in-progress');
  if (overdue.length > 0) {
    parts.push(`⚠️ ${overdue.length} overdue action item${overdue.length > 1 ? 's' : ''} need attention.`);
  }
  if (pending.length > 0) {
    parts.push(`${pending.length} pending task${pending.length > 1 ? 's' : ''} from previous sessions.`);
  }

  if (meetings.length > 0) {
    const lastMeeting = meetings[0];
    const openQCount = lastMeeting.openQuestions.length;
    if (openQCount > 0) {
      parts.push(`${openQCount} open question${openQCount > 1 ? 's' : ''} from your last meeting (${lastMeeting.date.toLocaleDateString()}).`);
    }
  }

  return parts.join(' ');
}

// ============================================================================
// Main Component
// ============================================================================

export default function PreSessionBrief({
  boardId,
  boardName,
  recentChanges = [],
  openActionItems = [],
  previousMeetings = [],
  participants = [],
  onDismiss,
  onGenerateBrief,
  onActionItemClick,
  isVisible = true,
  aiApiKey,
  className = '',
}: PreSessionBriefProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showChanges, setShowChanges] = useState(false);
  const [showActions, setShowActions] = useState(true);
  const [showMeetings, setShowMeetings] = useState(false);
  const [aiBrief, setAiBrief] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Auto-generate local brief
  const localBrief = useMemo(() =>
    generateLocalBrief(recentChanges, openActionItems, previousMeetings, boardName),
    [recentChanges, openActionItems, previousMeetings, boardName]
  );

  // Stats
  const stats = useMemo(() => ({
    totalChanges: recentChanges.length,
    overdueItems: openActionItems.filter(a => a.status === 'overdue').length,
    pendingItems: openActionItems.filter(a => a.status !== 'overdue').length,
    totalActions: openActionItems.length,
    previousMeetingCount: previousMeetings.length,
    openQuestions: previousMeetings.reduce((sum, m) => sum + m.openQuestions.length, 0),
  }), [recentChanges, openActionItems, previousMeetings]);

  const handleGenerateBrief = useCallback(async () => {
    if (!onGenerateBrief) return;
    setIsGenerating(true);
    try {
      const brief = await onGenerateBrief();
      setAiBrief(brief);
    } catch (err) {
      console.error('Failed to generate AI brief:', err);
    } finally {
      setIsGenerating(false);
    }
  }, [onGenerateBrief]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    setTimeout(() => onDismiss?.(), 300);
  }, [onDismiss]);

  if (dismissed || !isVisible) return null;

  // Don't show if there's nothing to brief
  const hasContent = recentChanges.length > 0 || openActionItems.length > 0 || previousMeetings.length > 0;
  if (!hasContent) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.98 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className={`bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden ${className}`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, repeatDelay: 4 }}
              >
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <Brain className="w-5 h-5 text-white" />
                </div>
              </motion.div>
              <div>
                <h2 className="font-bold text-lg leading-tight">Session Brief</h2>
                <p className="text-xs text-white/80">Here's what you need to know</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              <button
                onClick={handleDismiss}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center gap-3 mt-3">
            {stats.totalChanges > 0 && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-white/20 rounded-lg text-xs font-medium">
                <History className="w-3.5 h-3.5" />
                {stats.totalChanges} changes
              </span>
            )}
            {stats.totalActions > 0 && (
              <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                stats.overdueItems > 0 ? 'bg-red-400/30' : 'bg-white/20'
              }`}>
                <ListTodo className="w-3.5 h-3.5" />
                {stats.totalActions} tasks
                {stats.overdueItems > 0 && ` (${stats.overdueItems} overdue)`}
              </span>
            )}
            {stats.openQuestions > 0 && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-white/20 rounded-lg text-xs font-medium">
                <MessageSquare className="w-3.5 h-3.5" />
                {stats.openQuestions} open Q's
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                {/* Brief Summary */}
                <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-800 leading-relaxed">
                        {aiBrief || localBrief}
                      </p>
                      {onGenerateBrief && !aiBrief && (
                        <button
                          onClick={handleGenerateBrief}
                          disabled={isGenerating}
                          className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                        >
                          {isGenerating ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Preparing...
                            </>
                          ) : (
                            <>
                              <Zap className="w-4 h-4" />
                              Prepare me for this session
                            </>
                          )}
                        </button>
                      )}
                      {aiBrief && (
                        <button
                          onClick={handleGenerateBrief}
                          disabled={isGenerating}
                          className="mt-2 inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800"
                        >
                          <RefreshCw className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} />
                          Regenerate
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Overdue Action Items (always visible if any) */}
                {stats.overdueItems > 0 && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      <h3 className="text-sm font-semibold text-red-800">
                        Overdue Items ({stats.overdueItems})
                      </h3>
                    </div>
                    <div className="space-y-2">
                      {openActionItems
                        .filter(a => a.status === 'overdue')
                        .map(item => (
                          <button
                            key={item.id}
                            onClick={() => onActionItemClick?.(item)}
                            className="w-full flex items-start gap-3 p-2.5 bg-white rounded-lg border border-red-100 hover:border-red-300 transition-colors text-left"
                          >
                            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-800">{item.task}</p>
                              <div className="flex items-center gap-2 mt-1">
                                {item.owner && (
                                  <span className="text-xs text-gray-500">👤 {item.owner}</span>
                                )}
                                {item.dueDate && (
                                  <span className="text-xs text-red-600">📅 {item.dueDate}</span>
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                {/* Open Action Items */}
                {openActionItems.filter(a => a.status !== 'overdue').length > 0 && (
                  <div>
                    <button
                      onClick={() => setShowActions(!showActions)}
                      className="w-full flex items-center justify-between text-left mb-2"
                    >
                      <div className="flex items-center gap-2">
                        <ListTodo className="w-4 h-4 text-navy-700" />
                        <h3 className="text-sm font-semibold text-gray-900">
                          Pending Tasks ({openActionItems.filter(a => a.status !== 'overdue').length})
                        </h3>
                      </div>
                      {showActions ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </button>

                    <AnimatePresence>
                      {showActions && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="space-y-2 overflow-hidden"
                        >
                          {openActionItems
                            .filter(a => a.status !== 'overdue')
                            .slice(0, 5)
                            .map(item => (
                              <button
                                key={item.id}
                                onClick={() => onActionItemClick?.(item)}
                                className="w-full flex items-start gap-3 p-2.5 bg-white rounded-lg border border-gray-200 hover:border-navy-200 transition-colors text-left"
                              >
                                {getStatusIcon(item.status)}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-gray-800">{item.task}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    {item.owner && (
                                      <span className="text-xs text-gray-500">👤 {item.owner}</span>
                                    )}
                                    {item.priority && (
                                      <span className={`text-xs px-1.5 py-0.5 rounded-full border ${getPriorityColor(item.priority)}`}>
                                        {item.priority}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <ArrowRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0 mt-1" />
                              </button>
                            ))}
                          {openActionItems.filter(a => a.status !== 'overdue').length > 5 && (
                            <p className="text-xs text-gray-400 text-center py-1">
                              +{openActionItems.filter(a => a.status !== 'overdue').length - 5} more items
                            </p>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Recent Canvas Changes */}
                {recentChanges.length > 0 && (
                  <div>
                    <button
                      onClick={() => setShowChanges(!showChanges)}
                      className="w-full flex items-center justify-between text-left mb-2"
                    >
                      <div className="flex items-center gap-2">
                        <History className="w-4 h-4 text-navy-700" />
                        <h3 className="text-sm font-semibold text-gray-900">
                          Recent Changes ({recentChanges.length})
                        </h3>
                      </div>
                      {showChanges ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </button>

                    <AnimatePresence>
                      {showChanges && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="space-y-2 overflow-hidden"
                        >
                          {recentChanges.slice(0, 8).map(change => (
                            <div
                              key={change.id}
                              className="flex items-start gap-3 p-2.5 bg-white rounded-lg border border-gray-200"
                            >
                              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                                change.type === 'added' ? 'bg-green-500' :
                                change.type === 'modified' ? 'bg-blue-500' : 'bg-red-500'
                              }`} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-800 truncate">{change.content || `${change.nodeType} ${change.type}`}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs text-gray-400">{change.author}</span>
                                  <span className="text-xs text-gray-400">•</span>
                                  <span className="text-xs text-gray-400">{formatRelativeTime(change.timestamp)}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Previous Meeting Summaries */}
                {previousMeetings.length > 0 && (
                  <div>
                    <button
                      onClick={() => setShowMeetings(!showMeetings)}
                      className="w-full flex items-center justify-between text-left mb-2"
                    >
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-navy-700" />
                        <h3 className="text-sm font-semibold text-gray-900">
                          Previous Sessions ({previousMeetings.length})
                        </h3>
                      </div>
                      {showMeetings ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </button>

                    <AnimatePresence>
                      {showMeetings && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="space-y-3 overflow-hidden"
                        >
                          {previousMeetings.slice(0, 3).map(meeting => (
                            <div
                              key={meeting.id}
                              className="p-3 bg-white rounded-xl border border-gray-200"
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                <span className="text-xs font-medium text-gray-600">
                                  {meeting.date.toLocaleDateString()} • {meeting.participants.length} participants
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 line-clamp-2">{meeting.overview}</p>
                              {meeting.keyDecisions.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {meeting.keyDecisions.slice(0, 2).map((decision, i) => (
                                    <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-xs">
                                      <CheckCircle2 className="w-3 h-3" />
                                      {decision.length > 40 ? decision.slice(0, 40) + '...' : decision}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {meeting.openQuestions.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-xs text-amber-600 font-medium">
                                    {meeting.openQuestions.length} unresolved question{meeting.openQuestions.length > 1 ? 's' : ''}
                                  </p>
                                </div>
                              )}
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  Auto-generated brief for {boardName}
                </p>
                <button
                  onClick={handleDismiss}
                  className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
