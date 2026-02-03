/**
 * Enhanced Meeting Capture Component
 * 
 * Wraps MeetingCapturePanel + LiveMeetingCopilot with Jump AI-level features:
 * - Real-time transcription via Web Speech API
 * - Auto-extraction of action items, decisions, key topics
 * - Push extracted items as sticky notes onto the canvas
 * - Meeting timeline with bookmarks/highlights
 * - Speaker identification
 */

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  Play,
  Square,
  Pause,
  Clock,
  Users,
  BookmarkPlus,
  Bookmark,
  StickyNote,
  Zap,
  Brain,
  Target,
  CheckCircle2,
  MessageSquare,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  X,
  Flag,
  Plus,
  Sparkles,
  Download,
  Copy,
  Check,
  Volume2,
  User,
  Hash,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
} from 'lucide-react';
import { analyzeSentiment, type SentimentResult } from '../lib/sentiment-analysis';

// ============================================================================
// Types
// ============================================================================

export interface TimelineBookmark {
  id: string;
  timestamp: number; // seconds from start
  label: string;
  type: 'key-moment' | 'decision' | 'action-item' | 'question' | 'manual';
  color: string;
  transcriptEntryId?: string;
}

export interface TranscriptEntry {
  id: string;
  speaker: string;
  text: string;
  timestamp: Date;
  startSeconds: number;
  isKeyMoment: boolean;
  sentiment?: SentimentResult;
  extractedActions?: string[];
  extractedDecisions?: string[];
}

export interface CanvasStickyNote {
  content: string;
  color: string;
  type: 'action' | 'decision' | 'question' | 'key-point';
}

export interface EnhancedMeetingCaptureProps {
  /** Called when items should be pushed to canvas as sticky notes */
  onPushToCanvas?: (notes: CanvasStickyNote[]) => void;
  /** Called when transcript updates */
  onTranscriptUpdate?: (entries: TranscriptEntry[]) => void;
  /** Called when recording starts/stops */
  onRecordingStateChange?: (isRecording: boolean) => void;
  /** Called when bookmarks change */
  onBookmarksChange?: (bookmarks: TimelineBookmark[]) => void;
  /** Participant names for speaker identification */
  participants?: string[];
  /** Meeting title */
  meetingTitle?: string;
  /** Board ID for context */
  boardId?: string;
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const SPEAKER_COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6',
  '#f97316', '#06b6d4', '#84cc16', '#e11d48',
];

const ACTION_PATTERNS = [
  /\b(need to|should|will|must|have to|going to|let's)\s+([^.!?]+)/i,
  /\b(action item|task|follow up|todo)\s*:?\s*([^.!?]+)/i,
];

const DECISION_PATTERNS = [
  /\b(decided|agreed|confirmed|approved|going with|settled on)\s+([^.!?]+)/i,
  /\b(decision|conclusion)\s*:?\s*([^.!?]+)/i,
];

const QUESTION_PATTERNS = [
  /[^.!]*\?\s*$/,
  /\b(wondering|unclear|how do|what if|should we)\b/i,
];

// ============================================================================
// Web Speech API Hook
// ============================================================================

function useWebSpeechTranscription() {
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const onResultRef = useRef<((text: string, isFinal: boolean) => void) | null>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: any) => {
        const lastResult = event.results[event.results.length - 1];
        const text = lastResult[0].transcript;
        const isFinal = lastResult.isFinal;
        onResultRef.current?.(text, isFinal);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setIsListening(false);
        }
        // Auto-restart on network/aborted errors
        if (['network', 'aborted'].includes(event.error) && isListening) {
          try { recognition.start(); } catch {}
        }
      };

      recognition.onend = () => {
        // Auto-restart if still supposed to be listening
        if (recognitionRef.current?._shouldContinue) {
          try { recognition.start(); } catch {}
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current._shouldContinue = false;
        try { recognitionRef.current.stop(); } catch {}
      }
    };
  }, []);

  const start = useCallback((onResult: (text: string, isFinal: boolean) => void) => {
    if (!recognitionRef.current) return;
    onResultRef.current = onResult;
    recognitionRef.current._shouldContinue = true;
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch {}
  }, []);

  const stop = useCallback(() => {
    if (!recognitionRef.current) return;
    recognitionRef.current._shouldContinue = false;
    try {
      recognitionRef.current.stop();
      setIsListening(false);
    } catch {}
  }, []);

  return { isSupported, isListening, start, stop };
}

// ============================================================================
// Auto-Extraction Functions
// ============================================================================

function extractActions(text: string): string[] {
  const actions: string[] = [];
  for (const pattern of ACTION_PATTERNS) {
    const match = text.match(pattern);
    if (match && match[2] && match[2].length > 5) {
      actions.push(match[2].trim());
    }
  }
  return actions;
}

function extractDecisions(text: string): string[] {
  const decisions: string[] = [];
  for (const pattern of DECISION_PATTERNS) {
    const match = text.match(pattern);
    if (match && match[2] && match[2].length > 5) {
      decisions.push(match[2].trim());
    }
  }
  return decisions;
}

function isQuestion(text: string): boolean {
  return QUESTION_PATTERNS.some(p => p.test(text));
}

// ============================================================================
// Main Component
// ============================================================================

export default function EnhancedMeetingCapture({
  onPushToCanvas,
  onTranscriptUpdate,
  onRecordingStateChange,
  onBookmarksChange,
  participants = ['Speaker 1'],
  meetingTitle = 'Meeting',
  boardId,
  className = '',
}: EnhancedMeetingCaptureProps) {
  // State
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [bookmarks, setBookmarks] = useState<TimelineBookmark[]>([]);
  const [currentSpeaker, setCurrentSpeaker] = useState(participants[0] || 'Speaker 1');
  const [interimText, setInterimText] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showTimeline, setShowTimeline] = useState(true);
  const [showTranscript, setShowTranscript] = useState(true);
  const [autoPushToCanvas, setAutoPushToCanvas] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakerMap] = useState<Map<string, string>>(new Map());

  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const speech = useWebSpeechTranscription();

  // Timer
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRecording, isPaused]);

  // Auto-scroll
  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcript.length]);

  // Notify parent of transcript changes
  useEffect(() => {
    onTranscriptUpdate?.(transcript);
  }, [transcript, onTranscriptUpdate]);

  // Handle new finalized text
  const handleSpeechResult = useCallback((text: string, isFinal: boolean) => {
    if (!isFinal) {
      setInterimText(text);
      return;
    }

    setInterimText('');
    if (!text.trim()) return;

    const sentiment = analyzeSentiment(text);
    const actions = extractActions(text);
    const decisions = extractDecisions(text);

    const entry: TranscriptEntry = {
      id: `entry-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      speaker: currentSpeaker,
      text: text.trim(),
      timestamp: new Date(),
      startSeconds: elapsedSeconds,
      isKeyMoment: actions.length > 0 || decisions.length > 0,
      sentiment,
      extractedActions: actions.length > 0 ? actions : undefined,
      extractedDecisions: decisions.length > 0 ? decisions : undefined,
    };

    setTranscript(prev => [...prev, entry]);

    // Auto-bookmark key moments
    if (actions.length > 0) {
      const bookmark: TimelineBookmark = {
        id: `bm-action-${Date.now()}`,
        timestamp: elapsedSeconds,
        label: actions[0].slice(0, 50),
        type: 'action-item',
        color: '#10b981',
        transcriptEntryId: entry.id,
      };
      setBookmarks(prev => {
        const updated = [...prev, bookmark];
        onBookmarksChange?.(updated);
        return updated;
      });
    }

    if (decisions.length > 0) {
      const bookmark: TimelineBookmark = {
        id: `bm-decision-${Date.now()}`,
        timestamp: elapsedSeconds,
        label: decisions[0].slice(0, 50),
        type: 'decision',
        color: '#6366f1',
        transcriptEntryId: entry.id,
      };
      setBookmarks(prev => {
        const updated = [...prev, bookmark];
        onBookmarksChange?.(updated);
        return updated;
      });
    }

    if (isQuestion(text)) {
      const bookmark: TimelineBookmark = {
        id: `bm-question-${Date.now()}`,
        timestamp: elapsedSeconds,
        label: text.slice(0, 50),
        type: 'question',
        color: '#f59e0b',
        transcriptEntryId: entry.id,
      };
      setBookmarks(prev => {
        const updated = [...prev, bookmark];
        onBookmarksChange?.(updated);
        return updated;
      });
    }

    // Auto-push to canvas if enabled
    if (autoPushToCanvas && onPushToCanvas) {
      const notes: CanvasStickyNote[] = [];
      actions.forEach(a => notes.push({ content: `📋 ${a}`, color: '#dcfce7', type: 'action' }));
      decisions.forEach(d => notes.push({ content: `✅ ${d}`, color: '#e0e7ff', type: 'decision' }));
      if (notes.length > 0) onPushToCanvas(notes);
    }
  }, [currentSpeaker, elapsedSeconds, autoPushToCanvas, onPushToCanvas, onBookmarksChange]);

  // Start/Stop recording
  const handleStartRecording = useCallback(() => {
    if (!speech.isSupported) {
      alert('Web Speech API is not supported in this browser. Please use Chrome.');
      return;
    }
    setIsRecording(true);
    setIsPaused(false);
    startTimeRef.current = Date.now();
    speech.start(handleSpeechResult);
    onRecordingStateChange?.(true);
  }, [speech, handleSpeechResult, onRecordingStateChange]);

  const handleStopRecording = useCallback(() => {
    setIsRecording(false);
    setIsPaused(false);
    speech.stop();
    onRecordingStateChange?.(false);
  }, [speech, onRecordingStateChange]);

  const handlePauseResume = useCallback(() => {
    if (isPaused) {
      speech.start(handleSpeechResult);
      setIsPaused(false);
    } else {
      speech.stop();
      setIsPaused(true);
    }
  }, [isPaused, speech, handleSpeechResult]);

  // Manual bookmark
  const addManualBookmark = useCallback(() => {
    const label = prompt('Bookmark label:');
    if (!label) return;
    const bookmark: TimelineBookmark = {
      id: `bm-manual-${Date.now()}`,
      timestamp: elapsedSeconds,
      label,
      type: 'manual',
      color: '#ec4899',
    };
    setBookmarks(prev => {
      const updated = [...prev, bookmark];
      onBookmarksChange?.(updated);
      return updated;
    });
  }, [elapsedSeconds, onBookmarksChange]);

  // Push all extracted items to canvas
  const handlePushAllToCanvas = useCallback(() => {
    if (!onPushToCanvas) return;
    const notes: CanvasStickyNote[] = [];
    transcript.forEach(entry => {
      entry.extractedActions?.forEach(a =>
        notes.push({ content: `📋 Action: ${a}`, color: '#dcfce7', type: 'action' })
      );
      entry.extractedDecisions?.forEach(d =>
        notes.push({ content: `✅ Decision: ${d}`, color: '#e0e7ff', type: 'decision' })
      );
    });
    if (notes.length > 0) {
      onPushToCanvas(notes);
    }
  }, [transcript, onPushToCanvas]);

  // Copy transcript
  const handleCopyTranscript = useCallback(async () => {
    const text = transcript
      .map(e => `[${formatTime(e.startSeconds)}] ${e.speaker}: ${e.text}`)
      .join('\n');
    await navigator.clipboard.writeText(text);
    setCopiedId('transcript');
    setTimeout(() => setCopiedId(null), 2000);
  }, [transcript]);

  // Stats
  const stats = useMemo(() => ({
    totalEntries: transcript.length,
    totalActions: transcript.reduce((sum, e) => sum + (e.extractedActions?.length || 0), 0),
    totalDecisions: transcript.reduce((sum, e) => sum + (e.extractedDecisions?.length || 0), 0),
    totalBookmarks: bookmarks.length,
    speakers: [...new Set(transcript.map(e => e.speaker))],
  }), [transcript, bookmarks]);

  return (
    <div className={`bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden flex flex-col ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-navy-700 via-navy-600 to-indigo-600 text-white p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight">Smart Capture</h2>
              <p className="text-xs text-white/80">Real-time transcription & extraction</p>
            </div>
          </div>

          {/* Recording controls */}
          <div className="flex items-center gap-2">
            {isRecording && (
              <motion.span
                className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/30 rounded-lg text-xs font-medium"
                animate={{ opacity: isPaused ? 1 : [1, 0.5, 1] }}
                transition={{ duration: 1.5, repeat: isPaused ? 0 : Infinity }}
              >
                <span className="w-2 h-2 bg-red-400 rounded-full" />
                {isPaused ? 'PAUSED' : 'REC'}
              </motion.span>
            )}
            <span className="px-2.5 py-1 bg-white/20 rounded-lg text-sm font-mono">
              {formatTime(elapsedSeconds)}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {!isRecording ? (
              <button
                onClick={handleStartRecording}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Mic className="w-4 h-4" />
                Start Recording
              </button>
            ) : (
              <>
                <button
                  onClick={handlePauseResume}
                  className="flex items-center gap-2 px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
                >
                  {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                  {isPaused ? 'Resume' : 'Pause'}
                </button>
                <button
                  onClick={handleStopRecording}
                  className="flex items-center gap-2 px-3 py-2 bg-red-500/80 hover:bg-red-500 rounded-lg text-sm font-medium transition-colors"
                >
                  <Square className="w-4 h-4" />
                  Stop
                </button>
              </>
            )}
            <button
              onClick={addManualBookmark}
              disabled={!isRecording}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors disabled:opacity-50"
              title="Add bookmark"
            >
              <BookmarkPlus className="w-4 h-4" />
            </button>
          </div>

          {/* Speaker selector */}
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-white/60" />
            <select
              value={currentSpeaker}
              onChange={e => setCurrentSpeaker(e.target.value)}
              className="px-2 py-1 bg-white/20 rounded-lg text-sm text-white border-none focus:ring-2 focus:ring-white/40"
            >
              {participants.map(p => (
                <option key={p} value={p} className="text-gray-900">{p}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick stats */}
        {transcript.length > 0 && (
          <div className="flex items-center gap-3 mt-3">
            <span className="flex items-center gap-1 px-2 py-1 bg-white/15 rounded text-xs">
              <Hash className="w-3 h-3" /> {stats.totalEntries} entries
            </span>
            {stats.totalActions > 0 && (
              <span className="flex items-center gap-1 px-2 py-1 bg-green-500/30 rounded text-xs">
                <CheckCircle2 className="w-3 h-3" /> {stats.totalActions} actions
              </span>
            )}
            {stats.totalDecisions > 0 && (
              <span className="flex items-center gap-1 px-2 py-1 bg-indigo-500/30 rounded text-xs">
                <Target className="w-3 h-3" /> {stats.totalDecisions} decisions
              </span>
            )}
            {stats.totalBookmarks > 0 && (
              <span className="flex items-center gap-1 px-2 py-1 bg-pink-500/30 rounded text-xs">
                <Bookmark className="w-3 h-3" /> {stats.totalBookmarks} bookmarks
              </span>
            )}
          </div>
        )}
      </div>

      {/* Timeline */}
      {bookmarks.length > 0 && (
        <div className="border-b border-gray-200">
          <button
            onClick={() => setShowTimeline(!showTimeline)}
            className="w-full px-4 py-2 flex items-center justify-between text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <span className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Timeline ({bookmarks.length} bookmarks)
            </span>
            {showTimeline ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          <AnimatePresence>
            {showTimeline && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-3">
                  {/* Timeline bar */}
                  <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden">
                    {elapsedSeconds > 0 && bookmarks.map(bm => {
                      const position = (bm.timestamp / elapsedSeconds) * 100;
                      return (
                        <div
                          key={bm.id}
                          className="absolute top-0 bottom-0 w-1 rounded-full cursor-pointer group"
                          style={{
                            left: `${Math.min(position, 99)}%`,
                            backgroundColor: bm.color,
                          }}
                          title={`[${formatTime(bm.timestamp)}] ${bm.label}`}
                        >
                          <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                            {bm.label}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Bookmark list */}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {bookmarks.slice(-6).map(bm => (
                      <span
                        key={bm.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                        style={{
                          backgroundColor: `${bm.color}15`,
                          color: bm.color,
                          border: `1px solid ${bm.color}30`,
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: bm.color }} />
                        {formatTime(bm.timestamp)} — {bm.label.length > 30 ? bm.label.slice(0, 30) + '...' : bm.label}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Options bar */}
      <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between bg-gray-50">
        <label className="flex items-center gap-2 text-xs text-gray-600">
          <input
            type="checkbox"
            checked={autoPushToCanvas}
            onChange={e => setAutoPushToCanvas(e.target.checked)}
            className="rounded border-gray-300 text-navy-700"
          />
          Auto-push items to canvas
        </label>
        <div className="flex items-center gap-2">
          {stats.totalActions + stats.totalDecisions > 0 && onPushToCanvas && (
            <button
              onClick={handlePushAllToCanvas}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-navy-700 bg-navy-50 rounded-lg hover:bg-navy-100 transition-colors"
            >
              <StickyNote className="w-3.5 h-3.5" />
              Push all to canvas ({stats.totalActions + stats.totalDecisions})
            </button>
          )}
          <button
            onClick={handleCopyTranscript}
            disabled={transcript.length === 0}
            className="flex items-center gap-1 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            {copiedId === 'transcript' ? (
              <><Check className="w-3.5 h-3.5 text-green-600" /> Copied</>
            ) : (
              <><Copy className="w-3.5 h-3.5" /> Copy</>
            )}
          </button>
        </div>
      </div>

      {/* Transcript */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[50vh]">
        {transcript.length === 0 && !isRecording && (
          <div className="text-center py-12">
            <MicOff className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No transcript yet</p>
            <p className="text-sm text-gray-400 mt-1">
              {speech.isSupported
                ? 'Click "Start Recording" to begin real-time transcription'
                : 'Web Speech API not supported — use Chrome for live transcription'}
            </p>
          </div>
        )}

        {transcript.map((entry, index) => {
          const speakerIndex = participants.indexOf(entry.speaker);
          const speakerColor = SPEAKER_COLORS[speakerIndex % SPEAKER_COLORS.length] || '#6b7280';

          return (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`group relative flex gap-3 p-3 rounded-xl transition-all ${
                entry.isKeyMoment ? 'bg-amber-50 ring-1 ring-amber-200' : 'bg-white hover:bg-gray-50'
              }`}
            >
              {/* Speaker avatar */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: speakerColor }}
              >
                {entry.speaker.charAt(0).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-semibold" style={{ color: speakerColor }}>
                    {entry.speaker}
                  </span>
                  <span className="text-xs text-gray-400">{formatTime(entry.startSeconds)}</span>
                  {entry.isKeyMoment && (
                    <Flag className="w-3 h-3 text-amber-500" />
                  )}
                  {entry.sentiment && entry.sentiment.label !== 'neutral' && (
                    <span className={`text-[10px] px-1 rounded ${
                      entry.sentiment.label === 'positive' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {entry.sentiment.label === 'positive' ? '😊' : '😟'}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-800 leading-relaxed">{entry.text}</p>

                {/* Extracted items */}
                {entry.extractedActions && entry.extractedActions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {entry.extractedActions.map((action, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs">
                        <CheckCircle2 className="w-3 h-3" />
                        {action.length > 40 ? action.slice(0, 40) + '...' : action}
                      </span>
                    ))}
                  </div>
                )}
                {entry.extractedDecisions && entry.extractedDecisions.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {entry.extractedDecisions.map((decision, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs">
                        <Target className="w-3 h-3" />
                        {decision.length > 40 ? decision.slice(0, 40) + '...' : decision}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Push single item to canvas */}
              {onPushToCanvas && entry.isKeyMoment && (
                <button
                  onClick={() => {
                    const notes: CanvasStickyNote[] = [];
                    entry.extractedActions?.forEach(a => notes.push({ content: `📋 ${a}`, color: '#dcfce7', type: 'action' }));
                    entry.extractedDecisions?.forEach(d => notes.push({ content: `✅ ${d}`, color: '#e0e7ff', type: 'decision' }));
                    if (notes.length > 0) onPushToCanvas(notes);
                  }}
                  className="p-1.5 text-gray-400 hover:text-navy-600 hover:bg-navy-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  title="Push to canvas"
                >
                  <StickyNote className="w-4 h-4" />
                </button>
              )}
            </motion.div>
          );
        })}

        {/* Interim (partial) text */}
        {interimText && (
          <div className="flex gap-3 p-3 rounded-xl bg-gray-50 border border-dashed border-gray-300">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 opacity-50"
              style={{ backgroundColor: SPEAKER_COLORS[participants.indexOf(currentSpeaker) % SPEAKER_COLORS.length] || '#6b7280' }}
            >
              {currentSpeaker.charAt(0).toUpperCase()}
            </div>
            <div>
              <span className="text-xs text-gray-400">{currentSpeaker} (listening...)</span>
              <p className="text-sm text-gray-500 italic">{interimText}</p>
            </div>
          </div>
        )}

        <div ref={transcriptEndRef} />
      </div>
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}
