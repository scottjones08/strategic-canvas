/**
 * AI Meeting Assistant Hub Component
 * Main orchestrator that combines Pre-Meeting Prep, Live Meeting Copilot,
 * and Post-Meeting Automation into one unified experience.
 *
 * Features:
 * - Three-Phase Workflow: PREP → LIVE → FOLLOW-UP
 * - State Management for meeting data (transcript, notes, action items)
 * - Integration with existing transcription.ts
 * - Smart transcript processing (action items, sentiment, key moments)
 * - Floating control bar with phase indicator, timer, and quick actions
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Play,
  Square,
  Pause,
  Clock,
  Mic,
  MicOff,
  Sparkles,
  ChevronRight,
  CheckCircle,
  FileText,
  ListTodo,
  MessageSquare,
  Calendar,
  Users,
  Target,
  MoreHorizontal,
  Minimize2,
  Maximize2,
  AlertCircle,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  Brain,
  Zap,
  RotateCcw,
  Save,
  Flag,
  Plus,
  Bookmark,
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';

// Import existing components
import MeetingPrepPanel from './MeetingPrepPanel';
import LiveMeetingCopilot, { LiveMeetingCopilotProps } from './LiveMeetingCopilot';
import PostMeetingAutomation from './PostMeetingAutomation';

// Import transcription utilities
import {
  startRealtimeTranscription,
  HybridTranscriptionSession,
  TranscriptSegment,
  FullTranscript,
  TranscriptionConfig,
  isAssemblyAIConfigured,
  loadTranscriptionConfig,
  formatTimestamp,
} from '../lib/transcription';

import {
  generateMeetingSummary,
  MeetingSummary,
  ActionItem,
} from '../lib/meeting-summary';

// ============================================
// TYPES & INTERFACES
// ============================================

type MeetingPhase = 'prep' | 'live' | 'follow-up';

interface AIMeetingAssistantProps {
  boardId: string;
  boardName: string;
  participants: Array<{ id: string; name: string; email: string; role: string }>;
  isOpen: boolean;
  onClose: () => void;
  existingTranscript?: Array<{ speaker: string; text: string; timestamp: Date }>;
  aiApiKey?: string;
  onSaveTranscript?: (transcript: FullTranscript) => Promise<void>;
  onSyncToCRM?: (data: { summary: MeetingSummary; actionItems: ActionItem[] }) => Promise<void>;
}

interface MeetingState {
  phase: MeetingPhase;
  isRecording: boolean;
  isPaused: boolean;
  startTime: Date | null;
  duration: number; // seconds
  transcript: TranscriptEntry[];
  notes: string[];
  actionItems: ActionItem[];
  keyMoments: string[];
  sentiment: 'positive' | 'neutral' | 'concerned';
}

interface TranscriptEntry {
  id: string;
  speaker: string;
  text: string;
  timestamp: Date;
  isKeyMoment?: boolean;
  sentiment?: 'positive' | 'neutral' | 'concerned' | 'confused';
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Simple sentiment analysis
function analyzeSentiment(text: string): 'positive' | 'neutral' | 'concerned' | 'confused' {
  const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'best', 'happy', 'excited', 'agree', 'yes', 'perfect', 'awesome'];
  const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'worst', 'disappointed', 'problem', 'issue', 'concern', 'worried', 'no', 'disagree', 'wrong', 'error'];
  const confusedWords = ['confused', 'unclear', 'don\'t understand', 'what do you mean', 'not sure', 'uncertain'];

  const lowerText = text.toLowerCase();

  if (confusedWords.some(w => lowerText.includes(w))) return 'confused';
  if (negativeWords.some(w => lowerText.includes(w))) return 'concerned';
  if (positiveWords.some(w => lowerText.includes(w))) return 'positive';
  return 'neutral';
}

// ============================================
// MAIN COMPONENT
// ============================================

export const AIMeetingAssistant: React.FC<AIMeetingAssistantProps> = ({
  boardId,
  boardName,
  participants,
  isOpen,
  onClose,
  existingTranscript = [],
  aiApiKey,
  onSaveTranscript,
  onSyncToCRM,
}) => {
  // ============================================
  // STATE
  // ============================================

  const [phase, setPhase] = useState<MeetingPhase>('prep');
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Meeting state
  const [meetingState, setMeetingState] = useState<MeetingState>({
    phase: 'prep',
    isRecording: false,
    isPaused: false,
    startTime: null,
    duration: 0,
    transcript: [],
    notes: [],
    actionItems: [],
    keyMoments: [],
    sentiment: 'neutral',
  });

  // Transcription session
  const transcriptionRef = useRef<HybridTranscriptionSession | null>(null);
  const [transcriptionStatus, setTranscriptionStatus] = useState<string>('idle');
  const [isTranscriptionReady, setIsTranscriptionReady] = useState(false);

  // Timer ref
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Final transcript for follow-up
  const [finalTranscript, setFinalTranscript] = useState<FullTranscript | null>(null);
  const [meetingSummary, setMeetingSummary] = useState<MeetingSummary | null>(null);

  // ============================================
  // INITIALIZATION
  // ============================================

  useEffect(() => {
    // Check if transcription is configured
    setIsTranscriptionReady(isAssemblyAIConfigured());
  }, []);

  // Load existing transcript if provided
  useEffect(() => {
    if (existingTranscript.length > 0 && phase === 'prep') {
      const entries: TranscriptEntry[] = existingTranscript.map((t, i) => ({
        id: `existing-${i}`,
        speaker: t.speaker,
        text: t.text,
        timestamp: t.timestamp,
        sentiment: analyzeSentiment(t.text),
      }));
      setMeetingState(prev => ({ ...prev, transcript: entries }));
    }
  }, [existingTranscript]);

  // ============================================
  // TIMER MANAGEMENT
  // ============================================

  const startTimer = useCallback(() => {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => {
      setMeetingState(prev => ({ ...prev, duration: prev.duration + 1 }));
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const pauseTimer = useCallback(() => {
    stopTimer();
  }, [stopTimer]);

  useEffect(() => {
    return () => stopTimer();
  }, [stopTimer]);

  // ============================================
  // PHASE TRANSITIONS
  // ============================================

  const startMeeting = useCallback(async () => {
    setPhase('live');
    setMeetingState(prev => ({
      ...prev,
      phase: 'live',
      startTime: new Date(),
      isRecording: true,
    }));
    startTimer();

    // Start transcription if configured
    if (isTranscriptionReady) {
      try {
        const config = loadTranscriptionConfig();
        if (config?.apiKey) {
          const session = startRealtimeTranscription({
            apiKey: config.apiKey,
            enableDiarization: true,
            speakersExpected: participants.length,
          });

          transcriptionRef.current = session;

          session.onStatusChange((status) => {
            setTranscriptionStatus(status);
          });

          session.onSegment((segment) => {
            const entry: TranscriptEntry = {
              id: segment.id,
              speaker: segment.speakerLabel || segment.speaker,
              text: segment.text,
              timestamp: new Date(),
              sentiment: analyzeSentiment(segment.text),
            };

            setMeetingState(prev => ({
              ...prev,
              transcript: [...prev.transcript, entry],
            }));
          });

          session.onError((error) => {
            console.error('Transcription error:', error);
            setTranscriptionStatus('error');
          });

          await session.start();
        }
      } catch (error) {
        console.error('Failed to start transcription:', error);
      }
    }
  }, [isTranscriptionReady, participants.length, startTimer]);

  const endMeeting = useCallback(async () => {
    stopTimer();

    // Stop transcription
    if (transcriptionRef.current) {
      try {
        const transcript = await transcriptionRef.current.stop();
        setFinalTranscript(transcript);

        // Save transcript if callback provided
        if (onSaveTranscript) {
          await onSaveTranscript(transcript);
        }
      } catch (error) {
        console.error('Error stopping transcription:', error);
      }
      transcriptionRef.current = null;
    }

    setMeetingState(prev => ({
      ...prev,
      phase: 'follow-up',
      isRecording: false,
    }));
    setPhase('follow-up');
  }, [stopTimer, onSaveTranscript]);

  const pauseMeeting = useCallback(() => {
    pauseTimer();
    setMeetingState(prev => ({
      ...prev,
      isPaused: true,
      isRecording: false,
    }));

    // Pause transcription (note: may be no-op for real-time)
    if (transcriptionRef.current) {
      transcriptionRef.current.pause();
    }
  }, [pauseTimer]);

  const resumeMeeting = useCallback(() => {
    startTimer();
    setMeetingState(prev => ({
      ...prev,
      isPaused: false,
      isRecording: true,
    }));

    if (transcriptionRef.current) {
      transcriptionRef.current.resume();
    }
  }, [startTimer]);

  const resetMeeting = useCallback(() => {
    stopTimer();
    if (transcriptionRef.current) {
      transcriptionRef.current.stop();
      transcriptionRef.current = null;
    }

    setPhase('prep');
    setMeetingState({
      phase: 'prep',
      isRecording: false,
      isPaused: false,
      startTime: null,
      duration: 0,
      transcript: [],
      notes: [],
      actionItems: [],
      keyMoments: [],
      sentiment: 'neutral',
    });
    setFinalTranscript(null);
    setMeetingSummary(null);
  }, [stopTimer]);

  // ============================================
  // SMART TRANSCRIPT PROCESSING
  // ============================================

  // Auto-extract action items from transcript
  useEffect(() => {
    if (meetingState.transcript.length === 0) return;

    const latestEntry = meetingState.transcript[meetingState.transcript.length - 1];
    const text = latestEntry.text;

    // Simple action item detection patterns
    const actionPatterns = [
      /\b(need to|should|will|must|have to)\s+(.+?)(?:\.|$)/i,
      /\b(let's|we should|we need to)\s+(.+?)(?:\.|$)/i,
      /\b(I'll|I'll make sure to|I'm going to)\s+(.+?)(?:\.|$)/i,
      /\b(action item|task|follow up|follow-up)\s*:?\s*(.+?)(?:\.|$)/i,
    ];

    actionPatterns.forEach(pattern => {
      const match = text.match(pattern);
      if (match) {
        const action = match[2] || match[1];
        if (action && action.length > 5) {
          const newAction: ActionItem = {
            task: action.trim(),
            owner: latestEntry.speaker,
          };

          setMeetingState(prev => {
            const exists = prev.actionItems.some(a =>
              a.task.toLowerCase() === newAction.task.toLowerCase()
            );
            if (exists) return prev;
            return { ...prev, actionItems: [...prev.actionItems, newAction] };
          });
        }
      }
    });
  }, [meetingState.transcript]);

  // Calculate overall sentiment
  useEffect(() => {
    if (meetingState.transcript.length === 0) return;

    const sentiments = meetingState.transcript.map(t => t.sentiment || 'neutral');
    const counts = {
      positive: sentiments.filter(s => s === 'positive').length,
      concerned: sentiments.filter(s => s === 'concerned' || s === 'confused').length,
      neutral: sentiments.filter(s => s === 'neutral').length,
    };

    if (counts.concerned > counts.positive && counts.concerned > counts.neutral) {
      setMeetingState(prev => ({ ...prev, sentiment: 'concerned' }));
    } else if (counts.positive > counts.concerned) {
      setMeetingState(prev => ({ ...prev, sentiment: 'positive' }));
    } else {
      setMeetingState(prev => ({ ...prev, sentiment: 'neutral' }));
    }
  }, [meetingState.transcript]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleAddNote = useCallback((text: string) => {
    setMeetingState(prev => ({
      ...prev,
      notes: [...prev.notes, text],
    }));
  }, []);

  const handleCreateActionItem = useCallback((text: string, assignee?: string) => {
    const newAction: ActionItem = {
      task: text,
      owner: assignee,
    };
    setMeetingState(prev => ({
      ...prev,
      actionItems: [...prev.actionItems, newAction],
    }));
  }, []);

  const handleFlagKeyMoment = useCallback((transcriptId: string) => {
    setMeetingState(prev => {
      const updatedTranscript = prev.transcript.map(entry =>
        entry.id === transcriptId ? { ...entry, isKeyMoment: !entry.isKeyMoment } : entry
      );
      const keyMoments = updatedTranscript
        .filter(e => e.isKeyMoment)
        .map(e => e.text);
      return { ...prev, transcript: updatedTranscript, keyMoments };
    });
  }, []);

  const handleGenerateAgenda = useCallback((template: string) => {
    console.log('Generating agenda with template:', template);
    // This would typically trigger AI generation
  }, []);

  // ============================================
  // COMPUTED VALUES
  // ============================================

  const agendaItems = useMemo(() => {
    // Create agenda items based on meeting context
    return [
      { topic: 'Introduction & Welcome', duration: 5, completed: meetingState.duration > 300 },
      { topic: 'Main Discussion', duration: 30, completed: meetingState.duration > 1800 },
      { topic: 'Action Items & Next Steps', duration: 10, completed: meetingState.duration > 2400 },
    ];
  }, [meetingState.duration]);

  const participantNames = useMemo(() =>
    participants.map(p => p.name),
    [participants]
  );

  const transcriptForCopilot = useMemo(() =>
    meetingState.transcript.map(t => ({
      id: t.id,
      speaker: t.speaker,
      text: t.text,
      timestamp: t.timestamp,
      isKeyMoment: t.isKeyMoment,
      sentiment: t.sentiment,
    })),
    [meetingState.transcript]
  );

  const transcriptForFollowUp = useMemo(() =>
    meetingState.transcript.map(t => ({
      speaker: t.speaker,
      text: t.text,
      timestamp: t.timestamp,
    })),
    [meetingState.transcript]
  );

  // ============================================
  // RENDER HELPERS
  // ============================================

  const PhaseIndicator = () => (
    <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5">
      {(['prep', 'live', 'follow-up'] as MeetingPhase[]).map((p, index) => (
        <React.Fragment key={p}>
          <div
            className={cn(
              'w-2.5 h-2.5 rounded-full transition-all duration-300',
              phase === p
                ? 'bg-white scale-125'
                : ['prep', 'live', 'follow-up'].indexOf(phase) > index
                ? 'bg-green-400'
                : 'bg-white/30'
            )}
          />
          <span
            className={cn(
              'text-xs font-medium capitalize transition-colors',
              phase === p ? 'text-white' : 'text-white/60'
            )}
          >
            {p === 'follow-up' ? 'Follow-up' : p}
          </span>
          {index < 2 && (
            <ChevronRight className="w-3 h-3 text-white/40 mx-1" />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  // ============================================
  // RENDER
  // ============================================

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{
              scale: 1,
              opacity: 1,
              y: 0,
              width: isFullscreen ? '100%' : 'auto',
              height: isFullscreen ? '100%' : 'auto',
            }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              'bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col',
              isFullscreen ? 'rounded-none' : 'w-full max-w-7xl max-h-[90vh]'
            )}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white flex-shrink-0">
              <div className="px-6 py-4">
                <div className="flex items-center justify-between">
                  {/* Left: Title & Info */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                      <Brain className="w-6 h-6" />
                    </div>
                    <div>
                      <h1 className="text-xl font-bold">AI Meeting Assistant</h1>
                      <p className="text-sm text-white/80">{boardName}</p>
                    </div>
                  </div>

                  {/* Center: Phase Indicator */}
                  <div className="hidden md:flex">
                    <PhaseIndicator />
                  </div>

                  {/* Right: Controls */}
                  <div className="flex items-center gap-2">
                    {/* Timer (Live phase only) */}
                    {phase === 'live' && (
                      <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl mr-4">
                        <Clock className="w-4 h-4" />
                        <span className="font-mono text-lg font-semibold">
                          {formatDuration(meetingState.duration)}
                        </span>
                        {meetingState.isRecording && (
                          <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse ml-1" />
                        )}
                      </div>
                    )}

                    {/* Window controls */}
                    <button
                      onClick={() => setIsFullscreen(!isFullscreen)}
                      className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                      title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                    >
                      {isFullscreen ? (
                        <Minimize2 className="w-5 h-5" />
                      ) : (
                        <Maximize2 className="w-5 h-5" />
                      )}
                    </button>
                    <button
                      onClick={onClose}
                      className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                      title="Close"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Mobile Phase Indicator */}
                <div className="md:hidden mt-4 flex justify-center">
                  <PhaseIndicator />
                </div>

                {/* Status Bar */}
                <div className="flex items-center gap-4 mt-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-white/70" />
                    <span className="text-white/80">
                      {participants.length} participant{participants.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {phase === 'live' && (
                    <>
                      <div className="flex items-center gap-2">
                        <Mic className={cn(
                          'w-4 h-4',
                          meetingState.isRecording ? 'text-green-400' : 'text-white/70'
                        )} />
                        <span className={cn(
                          meetingState.isRecording ? 'text-green-400' : 'text-white/80'
                        )}>
                          {meetingState.isRecording ? 'Recording' : 'Paused'}
                        </span>
                      </div>

                      {/* Sentiment Indicator */}
                      <div className="flex items-center gap-2 ml-auto">
                        {meetingState.sentiment === 'positive' && (
                          <>
                            <TrendingUp className="w-4 h-4 text-green-400" />
                            <span className="text-green-400">Positive</span>
                          </>
                        )}
                        {meetingState.sentiment === 'concerned' && (
                          <>
                            <TrendingDown className="w-4 h-4 text-red-400" />
                            <span className="text-red-400">Concerns detected</span>
                          </>
                        )}
                        {meetingState.sentiment === 'neutral' && (
                          <>
                            <Minus className="w-4 h-4 text-white/60" />
                            <span className="text-white/60">Neutral</span>
                          </>
                        )}
                      </div>
                    </>
                  )}

                  {phase === 'follow-up' && meetingState.duration > 0 && (
                    <div className="flex items-center gap-2 ml-auto">
                      <Clock className="w-4 h-4 text-white/70" />
                      <span className="text-white/80">
                        Total duration: {formatDuration(meetingState.duration)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden bg-gray-50">
              <AnimatePresence mode="wait">
                {/* PREP PHASE */}
                {phase === 'prep' && (
                  <motion.div
                    key="prep"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                    className="h-full p-6"
                  >
                    <MeetingPrepPanel
                      boardId={boardId}
                      participants={participants.map(p => ({ id: p.id, name: p.name, role: p.role }))}
                      onStartMeeting={startMeeting}
                      onGenerateAgenda={handleGenerateAgenda}
                      className="h-full"
                    />
                  </motion.div>
                )}

                {/* LIVE PHASE */}
                {phase === 'live' && (
                  <motion.div
                    key="live"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                    className="h-full flex"
                  >
                    {/* Main Canvas Area */}
                    <div className="flex-1 p-6 overflow-auto">
                      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 h-full p-6">
                        <div className="flex items-center justify-between mb-6">
                          <div>
                            <h2 className="text-lg font-semibold text-gray-900">Meeting Canvas</h2>
                            <p className="text-sm text-gray-500">
                              Real-time collaboration space for notes and visuals
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">
                              {meetingState.transcript.length} entries
                            </span>
                          </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="grid grid-cols-4 gap-4 mb-6">
                          <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                            <p className="text-2xl font-bold text-indigo-600">
                              {meetingState.transcript.length}
                            </p>
                            <p className="text-sm text-indigo-600/70">Transcript Entries</p>
                          </div>
                          <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                            <p className="text-2xl font-bold text-amber-600">
                              {meetingState.keyMoments.length}
                            </p>
                            <p className="text-sm text-amber-600/70">Key Moments</p>
                          </div>
                          <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                            <p className="text-2xl font-bold text-green-600">
                              {meetingState.actionItems.length}
                            </p>
                            <p className="text-sm text-green-600/70">Action Items</p>
                          </div>
                          <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                            <p className="text-2xl font-bold text-purple-600">
                              {meetingState.notes.length}
                            </p>
                            <p className="text-sm text-purple-600/70">Notes</p>
                          </div>
                        </div>

                        {/* Placeholder for canvas content */}
                        <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
                          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Target className="w-10 h-10 text-gray-400" />
                          </div>
                          <h3 className="text-lg font-medium text-gray-900 mb-2">
                            Meeting Canvas
                          </h3>
                          <p className="text-gray-500 max-w-md mx-auto">
                            This area can be extended to show your existing canvas content,
                            whiteboard, or meeting-specific visualizations.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Live Copilot Sidebar */}
                    <div className="w-[420px] border-l border-gray-200">
                      <LiveMeetingCopilot
                        isActive={meetingState.isRecording}
                        transcript={transcriptForCopilot}
                        agenda={agendaItems}
                        onAddNote={handleAddNote}
                        onCreateActionItem={handleCreateActionItem}
                        onFlagKeyMoment={handleFlagKeyMoment}
                        participants={participantNames}
                        meetingTitle={boardName}
                      />
                    </div>
                  </motion.div>
                )}

                {/* FOLLOW-UP PHASE */}
                {phase === 'follow-up' && (
                  <motion.div
                    key="follow-up"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                    className="h-full overflow-auto"
                  >
                    <PostMeetingAutomation
                      meetingId={boardId}
                      transcript={transcriptForFollowUp}
                      participants={participants.map(p => ({ name: p.name, email: p.email }))}
                      meetingDuration={meetingState.duration}
                      onSyncToCRM={onSyncToCRM}
                      aiApiKey={aiApiKey}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Floating Control Bar */}
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              className="bg-white border-t border-gray-200 px-6 py-4 flex-shrink-0"
            >
              <div className="flex items-center justify-between">
                {/* Left: Phase Info */}
                <div className="flex items-center gap-4">
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center',
                    phase === 'prep' && 'bg-blue-100 text-blue-600',
                    phase === 'live' && 'bg-green-100 text-green-600',
                    phase === 'follow-up' && 'bg-purple-100 text-purple-600'
                  )}>
                    {phase === 'prep' && <Calendar className="w-5 h-5" />}
                    {phase === 'live' && <Mic className="w-5 h-5" />}
                    {phase === 'follow-up' && <CheckCircle className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {phase === 'prep' && 'Pre-Meeting Preparation'}
                      {phase === 'live' && 'Live Meeting'}
                      {phase === 'follow-up' && 'Post-Meeting Follow-up'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {phase === 'prep' && 'Prepare agenda and review client notes'}
                      {phase === 'live' && transcriptionStatus === 'recording'
                        ? 'Recording in progress...'
                        : phase === 'live' && 'Ready to capture'}
                      {phase === 'follow-up' && 'Generate summary and action items'}
                    </p>
                  </div>
                </div>

                {/* Center: Quick Actions */}
                <div className="flex items-center gap-3">
                  {phase === 'live' && (
                    <>
                      {/* Pause/Resume */}
                      <button
                        onClick={meetingState.isPaused ? resumeMeeting : pauseMeeting}
                        className={cn(
                          'flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all',
                          meetingState.isPaused
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                        )}
                      >
                        {meetingState.isPaused ? (
                          <>
                            <Play className="w-4 h-4" />
                            Resume
                          </>
                        ) : (
                          <>
                            <Pause className="w-4 h-4" />
                            Pause
                          </>
                        )}
                      </button>

                      {/* Quick Note */}
                      <button
                        onClick={() => {
                          const note = prompt('Quick note:');
                          if (note) handleAddNote(note);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-xl font-medium hover:bg-indigo-200 transition-all"
                      >
                        <Bookmark className="w-4 h-4" />
                        Quick Note
                      </button>

                      {/* End Meeting */}
                      <button
                        onClick={endMeeting}
                        className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-all shadow-lg shadow-red-200"
                      >
                        <Square className="w-4 h-4 fill-current" />
                        End Meeting
                      </button>
                    </>
                  )}

                  {phase === 'follow-up' && (
                    <>
                      <button
                        onClick={resetMeeting}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all"
                      >
                        <RotateCcw className="w-4 h-4" />
                        New Meeting
                      </button>
                      <button
                        onClick={onClose}
                        className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Done
                      </button>
                    </>
                  )}

                  {phase === 'prep' && (
                    <button
                      onClick={startMeeting}
                      className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-indigo-200 transition-all"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      Start Meeting
                    </button>
                  )}
                </div>

                {/* Right: Status Indicators */}
                <div className="flex items-center gap-4">
                  {phase === 'live' && (
                    <>
                      {/* Transcription Status */}
                      <div className="flex items-center gap-2 text-sm">
                        <div className={cn(
                          'w-2 h-2 rounded-full',
                          transcriptionStatus === 'recording' && 'bg-green-500 animate-pulse',
                          transcriptionStatus === 'connecting' && 'bg-amber-500 animate-pulse',
                          transcriptionStatus === 'error' && 'bg-red-500',
                          transcriptionStatus === 'idle' && 'bg-gray-400'
                        )} />
                        <span className="text-gray-600 capitalize">
                          {transcriptionStatus === 'idle' ? 'Transcription off' : transcriptionStatus}
                        </span>
                      </div>

                      {!isTranscriptionReady && (
                        <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg">
                          <AlertCircle className="w-4 h-4" />
                          <span>Transcription not configured</span>
                        </div>
                      )}
                    </>
                  )}

                  {phase === 'prep' && (
                    <div className="text-sm text-gray-500">
                      Ready to start
                    </div>
                  )}

                  {phase === 'follow-up' && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      <span>Meeting completed</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AIMeetingAssistant;
