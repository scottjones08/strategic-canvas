/**
 * Enhanced Meeting Summary Component
 * 
 * Upgrades MeetingSummaryPanel with Jump AI-level features:
 * - Executive summary, key decisions, action items, open questions
 * - One-click export as email/PDF
 * - Sentiment analysis on discussion topics
 * - Compare with previous session summaries
 */

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  CheckCircle2,
  HelpCircle,
  Target,
  ListTodo,
  ArrowRight,
  Copy,
  Download,
  Check,
  X,
  ChevronDown,
  Sparkles,
  Mail,
  RefreshCw,
  MessageSquare,
  AlertCircle,
  Clock,
  Users,
  Save,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Smile,
  Frown,
  Meh,
  FileDown,
  Printer,
  GitCompareArrows,
  ChevronUp,
  Activity,
  Brain,
  Loader2,
} from 'lucide-react';
import {
  type MeetingSummary,
  type SummaryFormat,
  type ActionItem,
  formatSummaryAsText,
  formatSummaryAsMarkdown,
} from '../lib/meeting-summary';
import {
  analyzeMeetingSentiment,
  getSentimentStats,
  detectSentimentShifts,
  type MeetingSentimentAnalysis,
  type SentimentResult,
  type TranscriptEntry,
} from '../lib/sentiment-analysis';

// ============================================================================
// Types
// ============================================================================

export interface SessionComparison {
  previousSummary: MeetingSummary;
  currentSummary: MeetingSummary;
  newActionItems: ActionItem[];
  resolvedActionItems: ActionItem[];
  carryOverItems: ActionItem[];
  newDecisions: string[];
  progressSummary: string;
}

export interface EnhancedMeetingSummaryProps {
  summary: MeetingSummary;
  /** Raw transcript entries for sentiment analysis */
  transcript?: TranscriptEntry[];
  /** Previous session summary for comparison */
  previousSummary?: MeetingSummary;
  /** Called when summary is updated (editing) */
  onUpdate?: (summary: MeetingSummary) => void;
  /** Called to generate follow-up email */
  onGenerateEmail?: () => void;
  /** Called to regenerate summary in different format */
  onRegenerate?: (format: SummaryFormat) => void;
  /** Called to save to notes */
  onSaveToNotes?: (summary: MeetingSummary) => void;
  /** Called to close the panel */
  onClose?: () => void;
  /** Whether summary is being generated */
  isGenerating?: boolean;
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

const getSentimentIcon = (label: string) => {
  switch (label) {
    case 'positive': return <Smile className="w-4 h-4 text-green-500" />;
    case 'negative': return <Frown className="w-4 h-4 text-red-500" />;
    default: return <Meh className="w-4 h-4 text-amber-500" />;
  }
};

const getSentimentColor = (label: string) => {
  switch (label) {
    case 'positive': return 'text-green-600 bg-green-50 border-green-200';
    case 'negative': return 'text-red-600 bg-red-50 border-red-200';
    default: return 'text-amber-600 bg-amber-50 border-amber-200';
  }
};

function generateComparison(current: MeetingSummary, previous: MeetingSummary): SessionComparison {
  const prevTaskTexts = new Set(previous.actionItems.map(a => a.task.toLowerCase()));
  const currTaskTexts = new Set(current.actionItems.map(a => a.task.toLowerCase()));

  const newActionItems = current.actionItems.filter(a => !prevTaskTexts.has(a.task.toLowerCase()));
  const resolvedActionItems = previous.actionItems.filter(a => !currTaskTexts.has(a.task.toLowerCase()));
  const carryOverItems = current.actionItems.filter(a => prevTaskTexts.has(a.task.toLowerCase()));

  const prevDecisionTexts = new Set(previous.decisions.map(d => d.toLowerCase()));
  const newDecisions = current.decisions.filter(d => !prevDecisionTexts.has(d.toLowerCase()));

  const progressParts: string[] = [];
  if (resolvedActionItems.length > 0) {
    progressParts.push(`${resolvedActionItems.length} task${resolvedActionItems.length > 1 ? 's' : ''} resolved`);
  }
  if (newActionItems.length > 0) {
    progressParts.push(`${newActionItems.length} new task${newActionItems.length > 1 ? 's' : ''} identified`);
  }
  if (newDecisions.length > 0) {
    progressParts.push(`${newDecisions.length} new decision${newDecisions.length > 1 ? 's' : ''} made`);
  }
  if (carryOverItems.length > 0) {
    progressParts.push(`${carryOverItems.length} task${carryOverItems.length > 1 ? 's' : ''} carry over`);
  }

  return {
    previousSummary: previous,
    currentSummary: current,
    newActionItems,
    resolvedActionItems,
    carryOverItems,
    newDecisions,
    progressSummary: progressParts.length > 0 ? progressParts.join(', ') + '.' : 'No significant changes from last session.',
  };
}

function generatePDFContent(summary: MeetingSummary, sentiment?: MeetingSentimentAnalysis): string {
  // Generate an HTML string that can be printed as PDF
  let html = `
    <html><head><style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 700px; margin: 40px auto; color: #1a1a1a; }
      h1 { font-size: 24px; border-bottom: 2px solid #4338ca; padding-bottom: 8px; }
      h2 { font-size: 18px; color: #4338ca; margin-top: 24px; }
      .meta { color: #666; font-size: 14px; margin: 8px 0 24px; }
      ul { padding-left: 20px; }
      li { margin: 6px 0; line-height: 1.5; }
      .action-item { background: #f0fdf4; padding: 8px 12px; border-left: 3px solid #22c55e; margin: 6px 0; border-radius: 4px; }
      .decision { background: #eef2ff; padding: 8px 12px; border-left: 3px solid #6366f1; margin: 6px 0; border-radius: 4px; }
      .question { background: #fefce8; padding: 8px 12px; border-left: 3px solid #f59e0b; margin: 6px 0; border-radius: 4px; }
      .sentiment-bar { height: 8px; border-radius: 4px; margin-top: 4px; }
      .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; color: #999; font-size: 12px; }
    </style></head><body>
    <h1>Meeting Summary</h1>
    <div class="meta">
      Generated: ${summary.generatedAt.toLocaleString()}<br/>
      ${summary.participants?.length ? `Participants: ${summary.participants.join(', ')}<br/>` : ''}
      ${summary.duration ? `Duration: ${Math.round(summary.duration / 60000)} minutes` : ''}
    </div>
    <h2>Overview</h2>
    <p>${summary.overview}</p>`;

  if (summary.keyPoints.length > 0) {
    html += `<h2>Key Discussion Points</h2><ul>${summary.keyPoints.map(p => `<li>${p}</li>`).join('')}</ul>`;
  }

  if (summary.decisions.length > 0) {
    html += `<h2>Decisions Made</h2>${summary.decisions.map(d => `<div class="decision">✅ ${d}</div>`).join('')}`;
  }

  if (summary.actionItems.length > 0) {
    html += `<h2>Action Items</h2>${summary.actionItems.map(a => {
      const owner = a.owner ? ` — <strong>${a.owner}</strong>` : '';
      const due = a.dueDate ? ` (Due: ${a.dueDate})` : '';
      return `<div class="action-item">📋 ${a.task}${owner}${due}</div>`;
    }).join('')}`;
  }

  if (summary.openQuestions.length > 0) {
    html += `<h2>Open Questions</h2>${summary.openQuestions.map(q => `<div class="question">❓ ${q}</div>`).join('')}`;
  }

  if (summary.nextSteps.length > 0) {
    html += `<h2>Next Steps</h2><ol>${summary.nextSteps.map(s => `<li>${s}</li>`).join('')}</ol>`;
  }

  html += `<div class="footer">Generated by Strategic Canvas — Meeting Intelligence</div></body></html>`;
  return html;
}

// ============================================================================
// Sub-Components
// ============================================================================

function SentimentPanel({ analysis }: { analysis: MeetingSentimentAnalysis }) {
  const stats = getSentimentStats(analysis);
  const shifts = detectSentimentShifts(analysis.timeline, 0.4);

  return (
    <div className="space-y-4">
      {/* Overall sentiment */}
      <div className="flex items-center gap-4">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${getSentimentColor(analysis.overall.label)}`}>
          {getSentimentIcon(analysis.overall.label)}
          <span className="text-sm font-medium capitalize">{analysis.overall.label}</span>
          <span className="text-xs opacity-75">({(analysis.overall.score * 100).toFixed(0)}%)</span>
        </div>
        {stats.dominantEmotion && (
          <span className="text-xs text-gray-500">
            Dominant emotion: <span className="font-medium capitalize">{stats.dominantEmotion}</span>
          </span>
        )}
      </div>

      {/* Sentiment distribution */}
      <div className="flex gap-1 h-3 rounded-full overflow-hidden">
        <div className="bg-green-400 rounded-l-full" style={{ width: `${stats.positiveRatio * 100}%` }} />
        <div className="bg-amber-400" style={{ width: `${stats.neutralRatio * 100}%` }} />
        <div className="bg-red-400 rounded-r-full" style={{ width: `${stats.negativeRatio * 100}%` }} />
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>Positive {(stats.positiveRatio * 100).toFixed(0)}%</span>
        <span>Neutral {(stats.neutralRatio * 100).toFixed(0)}%</span>
        <span>Negative {(stats.negativeRatio * 100).toFixed(0)}%</span>
      </div>

      {/* By speaker */}
      {Object.keys(analysis.bySpeaker).length > 1 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-600 mb-2">By Speaker</h4>
          <div className="space-y-2">
            {Object.entries(analysis.bySpeaker).map(([speaker, sentiment]) => (
              <div key={speaker} className="flex items-center gap-3">
                <span className="text-xs text-gray-700 w-20 truncate">{speaker}</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      sentiment.label === 'positive' ? 'bg-green-400' :
                      sentiment.label === 'negative' ? 'bg-red-400' : 'bg-amber-400'
                    }`}
                    style={{ width: `${((sentiment.score + 1) / 2) * 100}%` }}
                  />
                </div>
                {getSentimentIcon(sentiment.label)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* By topic */}
      {analysis.byTopic && Object.keys(analysis.byTopic).length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-600 mb-2">By Topic</h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(analysis.byTopic).map(([topic, sentiment]) => (
              <span
                key={topic}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium ${getSentimentColor(sentiment.label)}`}
              >
                {getSentimentIcon(sentiment.label)}
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Concerns & Highlights */}
      {analysis.concerns.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-red-600 mb-1.5 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" /> Concerns Detected
          </h4>
          <div className="space-y-1">
            {analysis.concerns.slice(0, 3).map((c, i) => (
              <p key={i} className="text-xs text-gray-600 bg-red-50 px-2 py-1 rounded">{c}</p>
            ))}
          </div>
        </div>
      )}

      {analysis.highlights.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-green-600 mb-1.5 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> Positive Highlights
          </h4>
          <div className="space-y-1">
            {analysis.highlights.slice(0, 3).map((h, i) => (
              <p key={i} className="text-xs text-gray-600 bg-green-50 px-2 py-1 rounded">{h}</p>
            ))}
          </div>
        </div>
      )}

      {/* Sentiment shifts */}
      {shifts.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1">
            <Activity className="w-3.5 h-3.5" /> Notable Shifts
          </h4>
          <div className="space-y-1">
            {shifts.slice(0, 3).map((shift, i) => (
              <p key={i} className="text-xs text-gray-600">
                {shift.speaker}: <span className={getSentimentColor(shift.from).split(' ')[0]}>{shift.from}</span>
                {' → '}
                <span className={getSentimentColor(shift.to).split(' ')[0]}>{shift.to}</span>
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ComparisonPanel({ comparison }: { comparison: SessionComparison }) {
  return (
    <div className="space-y-4">
      <div className="p-3 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
        <p className="text-sm text-gray-800">{comparison.progressSummary}</p>
      </div>

      {comparison.resolvedActionItems.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-green-600 mb-2 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Resolved ({comparison.resolvedActionItems.length})
          </h4>
          <div className="space-y-1">
            {comparison.resolvedActionItems.map((item, i) => (
              <p key={i} className="text-xs text-gray-500 line-through px-2 py-1 bg-green-50 rounded">
                {item.task}
              </p>
            ))}
          </div>
        </div>
      )}

      {comparison.newActionItems.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-blue-600 mb-2 flex items-center gap-1">
            <ArrowRight className="w-3.5 h-3.5" />
            New Tasks ({comparison.newActionItems.length})
          </h4>
          <div className="space-y-1">
            {comparison.newActionItems.map((item, i) => (
              <p key={i} className="text-xs text-gray-700 px-2 py-1 bg-blue-50 rounded">
                {item.task} {item.owner && `→ ${item.owner}`}
              </p>
            ))}
          </div>
        </div>
      )}

      {comparison.carryOverItems.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-amber-600 mb-2 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            Carry Over ({comparison.carryOverItems.length})
          </h4>
          <div className="space-y-1">
            {comparison.carryOverItems.map((item, i) => (
              <p key={i} className="text-xs text-gray-600 px-2 py-1 bg-amber-50 rounded">
                {item.task}
              </p>
            ))}
          </div>
        </div>
      )}

      {comparison.newDecisions.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-indigo-600 mb-2 flex items-center gap-1">
            <Target className="w-3.5 h-3.5" />
            New Decisions ({comparison.newDecisions.length})
          </h4>
          <div className="space-y-1">
            {comparison.newDecisions.map((d, i) => (
              <p key={i} className="text-xs text-gray-700 px-2 py-1 bg-indigo-50 rounded">
                ✅ {d}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

type TabType = 'summary' | 'sentiment' | 'comparison';

export default function EnhancedMeetingSummary({
  summary,
  transcript,
  previousSummary,
  onUpdate,
  onGenerateEmail,
  onRegenerate,
  onSaveToNotes,
  onClose,
  isGenerating = false,
  className = '',
}: EnhancedMeetingSummaryProps) {
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [copied, setCopied] = useState(false);
  const [savedToNotes, setSavedToNotes] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showFormatMenu, setShowFormatMenu] = useState(false);

  // Sentiment analysis
  const sentimentAnalysis = useMemo(() => {
    if (!transcript || transcript.length === 0) return null;
    return analyzeMeetingSentiment(transcript);
  }, [transcript]);

  // Session comparison
  const comparison = useMemo(() => {
    if (!previousSummary) return null;
    return generateComparison(summary, previousSummary);
  }, [summary, previousSummary]);

  // Format labels
  const formatLabels: Record<SummaryFormat, string> = {
    executive: 'Executive',
    detailed: 'Detailed',
    'actions-only': 'Actions Only',
  };

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    const text = formatSummaryAsText(summary);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [summary]);

  // Export as file
  const handleExport = useCallback((format: 'text' | 'markdown' | 'json' | 'pdf') => {
    if (format === 'pdf') {
      const htmlContent = generatePDFContent(summary, sentimentAnalysis || undefined);
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 500);
      }
      setShowExportMenu(false);
      return;
    }

    let content = '';
    let filename = '';
    let mimeType = '';
    const date = new Date().toISOString().split('T')[0];

    switch (format) {
      case 'text':
        content = formatSummaryAsText(summary);
        filename = `meeting-summary-${date}.txt`;
        mimeType = 'text/plain';
        break;
      case 'markdown':
        content = formatSummaryAsMarkdown(summary);
        filename = `meeting-summary-${date}.md`;
        mimeType = 'text/markdown';
        break;
      case 'json':
        content = JSON.stringify(summary, null, 2);
        filename = `meeting-summary-${date}.json`;
        mimeType = 'application/json';
        break;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  }, [summary, sentimentAnalysis]);

  // Send as email
  const handleEmailExport = useCallback(() => {
    const text = formatSummaryAsText(summary);
    const subject = encodeURIComponent(`Meeting Summary - ${summary.generatedAt.toLocaleDateString()}`);
    const body = encodeURIComponent(text);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  }, [summary]);

  // Save to notes
  const handleSaveToNotes = useCallback(() => {
    if (onSaveToNotes) {
      onSaveToNotes(summary);
      setSavedToNotes(true);
      setTimeout(() => setSavedToNotes(false), 2000);
    }
  }, [summary, onSaveToNotes]);

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={`bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-navy-700 via-navy-600 to-indigo-600 text-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Brain className="w-6 h-6" />
            <div>
              <h2 className="font-bold text-lg">Meeting Intelligence</h2>
              <div className="flex items-center gap-3 text-sm text-white/80">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {summary.generatedAt.toLocaleString()}
                </span>
                {summary.participants && summary.participants.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {summary.participants.length}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Format selector */}
            <div className="relative">
              <button
                onClick={() => setShowFormatMenu(!showFormatMenu)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 rounded-lg text-sm hover:bg-white/30 transition-colors"
              >
                <span>{formatLabels[summary.format]}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <AnimatePresence>
                {showFormatMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowFormatMenu(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="absolute right-0 mt-1 w-40 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-20"
                    >
                      {(['executive', 'detailed', 'actions-only'] as SummaryFormat[]).map(format => (
                        <button
                          key={format}
                          onClick={() => { onRegenerate?.(format); setShowFormatMenu(false); }}
                          className={`w-full px-4 py-2 text-left text-sm ${
                            summary.format === format ? 'bg-navy-50 text-navy-800 font-medium' : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {formatLabels[format]}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {onClose && (
              <button onClick={onClose} className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          {[
            { id: 'summary', label: 'Summary', icon: FileText },
            ...(sentimentAnalysis ? [{ id: 'sentiment', label: 'Sentiment', icon: Activity }] : []),
            ...(comparison ? [{ id: 'comparison', label: 'vs Previous', icon: GitCompareArrows }] : []),
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading state */}
      {isGenerating && (
        <div className="px-6 py-12 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-10 h-10 text-navy-500 mx-auto mb-3 animate-spin" />
            <p className="text-gray-600 font-medium">Analyzing transcript...</p>
            <p className="text-sm text-gray-400 mt-1">Generating intelligence report</p>
          </div>
        </div>
      )}

      {/* Content */}
      {!isGenerating && (
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <AnimatePresence mode="wait">
            {/* Summary Tab */}
            {activeTab === 'summary' && (
              <motion.div
                key="summary"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Executive Overview */}
                <section>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-5 h-5 text-navy-500" />
                    <h3 className="font-semibold text-gray-900">Executive Overview</h3>
                  </div>
                  <p className="text-gray-700 leading-relaxed">{summary.overview}</p>
                </section>

                {/* Key Points */}
                {summary.keyPoints.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="w-5 h-5 text-blue-500" />
                      <h3 className="font-semibold text-gray-900">Key Discussion Points</h3>
                    </div>
                    <ul className="space-y-2">
                      {summary.keyPoints.map((point, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* Decisions */}
                {summary.decisions.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-5 h-5 text-indigo-500" />
                      <h3 className="font-semibold text-gray-900">Decisions Made</h3>
                    </div>
                    <div className="space-y-2">
                      {summary.decisions.map((decision, i) => (
                        <div key={i} className="flex items-start gap-2 p-2 bg-indigo-50 rounded-lg text-sm text-gray-800">
                          <CheckCircle2 className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                          {decision}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Action Items */}
                {summary.actionItems.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-2">
                      <ListTodo className="w-5 h-5 text-green-500" />
                      <h3 className="font-semibold text-gray-900">Action Items</h3>
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                        {summary.actionItems.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {summary.actionItems.map((item, i) => (
                        <div key={i} className="flex items-start gap-3 p-2 bg-green-50 rounded-lg">
                          <div className="w-5 h-5 rounded border-2 border-green-400 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-800">{item.task}</p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                              {item.owner && <span className="px-2 py-0.5 bg-white rounded-full">👤 {item.owner}</span>}
                              {item.dueDate && <span className="px-2 py-0.5 bg-white rounded-full">📅 {item.dueDate}</span>}
                              {item.priority && (
                                <span className={`px-2 py-0.5 rounded-full ${
                                  item.priority === 'high' ? 'bg-red-100 text-red-700' :
                                  item.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                                  'bg-gray-100 text-gray-600'
                                }`}>
                                  {item.priority}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Open Questions */}
                {summary.openQuestions.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-2">
                      <HelpCircle className="w-5 h-5 text-amber-500" />
                      <h3 className="font-semibold text-gray-900">Open Questions</h3>
                    </div>
                    <div className="space-y-2">
                      {summary.openQuestions.map((q, i) => (
                        <div key={i} className="flex items-start gap-2 p-2 bg-amber-50 rounded-lg text-sm text-gray-800">
                          <HelpCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                          {q}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Next Steps */}
                {summary.nextSteps.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-2">
                      <ArrowRight className="w-5 h-5 text-teal-500" />
                      <h3 className="font-semibold text-gray-900">Next Steps</h3>
                    </div>
                    <ol className="space-y-2">
                      {summary.nextSteps.map((step, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="w-5 h-5 rounded-full bg-teal-500 text-white text-xs font-medium flex items-center justify-center flex-shrink-0">
                            {i + 1}
                          </span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </section>
                )}
              </motion.div>
            )}

            {/* Sentiment Tab */}
            {activeTab === 'sentiment' && sentimentAnalysis && (
              <motion.div
                key="sentiment"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <SentimentPanel analysis={sentimentAnalysis} />
              </motion.div>
            )}

            {/* Comparison Tab */}
            {activeTab === 'comparison' && comparison && (
              <motion.div
                key="comparison"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <ComparisonPanel comparison={comparison} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Footer */}
      {!isGenerating && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  copied ? 'bg-green-100 text-green-700' : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>

              {/* Export dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-gray-600 hover:bg-gray-200 rounded-lg text-sm transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export
                  <ChevronDown className="w-3 h-3" />
                </button>

                <AnimatePresence>
                  {showExportMenu && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute bottom-full left-0 mb-2 w-44 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-20"
                      >
                        <button onClick={() => handleExport('pdf')} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                          <FileDown className="w-4 h-4" /> PDF (Print)
                        </button>
                        <button onClick={() => handleExport('text')} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                          <FileText className="w-4 h-4" /> Plain Text
                        </button>
                        <button onClick={() => handleExport('markdown')} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                          <FileText className="w-4 h-4" /> Markdown
                        </button>
                        <button onClick={() => handleExport('json')} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                          <FileText className="w-4 h-4" /> JSON
                        </button>
                        <div className="border-t border-gray-100 my-1" />
                        <button onClick={handleEmailExport} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                          <Mail className="w-4 h-4" /> Email Summary
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {onRegenerate && (
                <button
                  onClick={() => onRegenerate(summary.format)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-gray-600 hover:bg-gray-200 rounded-lg text-sm transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Regenerate
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {onSaveToNotes && (
                <button
                  onClick={handleSaveToNotes}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    savedToNotes ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {savedToNotes ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  {savedToNotes ? 'Saved!' : 'Save'}
                </button>
              )}

              {onGenerateEmail && (
                <button
                  onClick={onGenerateEmail}
                  className="flex items-center gap-1.5 px-4 py-2 bg-navy-700 text-white rounded-lg text-sm font-medium hover:bg-navy-800 transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  Draft Email
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
