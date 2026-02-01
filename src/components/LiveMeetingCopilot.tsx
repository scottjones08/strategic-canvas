/**
 * Live Meeting Copilot Component
 *
 * AI-powered sidebar that assists DURING meetings with:
 * - Live Transcript Display with speaker labels and timestamps
 * - Smart Note Capture with key moment detection
 * - Live Action Item Detection with assignments
 * - AI Suggestions Panel with follow-up questions
 * - Sentiment Indicator for real-time analysis
 *
 * Features:
 * - Tabbed interface: Transcript | Notes | Action Items | Insights
 * - Floating action buttons for quick capture
 * - Professional gradient header
 * - Real-time indicators (pulsing dots, animations)
 * - Framer Motion animations throughout
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Target,
  Clock,
  User,
  Users,
  Plus,
  Bookmark,
  Flag,
  Send,
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  Minus,
  MessageSquare,
  ListTodo,
  Calendar,
  ChevronRight,
  Copy,
  Check,
  X,
  Zap,
  Brain,
  Activity,
  BarChart3,
  Hash,
  Edit3,
  Trash2,
  Volume2,
  VolumeX,
  Pin,
  PinOff,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface TranscriptEntry {
  id: string;
  speaker: string;
  text: string;
  timestamp: Date;
  isKeyMoment?: boolean;
  sentiment?: 'positive' | 'neutral' | 'concerned' | 'confused';
  confidence?: number;
}

interface AgendaItem {
  topic: string;
  duration: number;
  completed: boolean;
}

interface ActionItem {
  id: string;
  text: string;
  assignee?: string;
  dueDate?: Date;
  completed: boolean;
  sourceTranscriptId?: string;
  detectedAt: Date;
}

interface AISuggestion {
  id: string;
  type: 'question' | 'agenda' | 'topic' | 'insight';
  text: string;
  priority: 'high' | 'medium' | 'low';
  relatedTo?: string;
}

interface CapturedNote {
  id: string;
  text: string;
  sourceTranscriptId?: string;
  timestamp: Date;
  tags: string[];
}

export interface LiveMeetingCopilotProps {
  isActive: boolean;
  transcript: TranscriptEntry[];
  agenda: AgendaItem[];
  onAddNote: (text: string) => void;
  onCreateActionItem: (text: string, assignee?: string) => void;
  onFlagKeyMoment: (transcriptId: string) => void;
  participants?: string[];
  meetingTitle?: string;
  onClose?: () => void;
  onMinimize?: () => void;
  isMinimized?: boolean;
}

type TabType = 'transcript' | 'notes' | 'actions' | 'insights';

// =============================================================================
// CONSTANTS
// =============================================================================

const SPEAKER_COLORS: Record<string, string> = {
  'Advisor': '#6366f1',
  'Client 1': '#10b981',
  'Client 2': '#f59e0b',
  'Client 3': '#ec4899',
  'Client 4': '#8b5cf6',
  'Client 5': '#14b8a6',
};

const KEY_PHRASES = [
  { phrase: 'I want to', type: 'goal', icon: Target, color: 'text-amber-600', bg: 'bg-amber-50' },
  { phrase: 'My goal is', type: 'goal', icon: Target, color: 'text-amber-600', bg: 'bg-amber-50' },
  { phrase: 'Concerned about', type: 'concern', icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
  { phrase: 'Worried about', type: 'concern', icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
  { phrase: 'Important to me', type: 'priority', icon: Flag, color: 'text-navy-700', bg: 'bg-navy-50' },
  { phrase: 'Priority', type: 'priority', icon: Flag, color: 'text-navy-700', bg: 'bg-navy-50' },
  { phrase: 'Need to', type: 'action', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
  { phrase: 'Should', type: 'action', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
  { phrase: 'Will do', type: 'action', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
  { phrase: 'Question', type: 'question', icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-50' },
  { phrase: 'Wondering', type: 'question', icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-50' },
];

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

const formatTimestamp = (date: Date): string => {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
};

const getSpeakerColor = (speaker: string): string => {
  return SPEAKER_COLORS[speaker] || '#6b7280';
};

const getSpeakerInitial = (speaker: string): string => {
  return speaker.charAt(0).toUpperCase();
};

const detectKeyPhrases = (text: string): typeof KEY_PHRASES => {
  const detected = KEY_PHRASES.filter(kp => 
    text.toLowerCase().includes(kp.phrase.toLowerCase())
  );
  return detected;
};

const detectActionItems = (text: string): string[] => {
  const actionPatterns = [
    /\b(need to|should|will|must|have to)\s+(.+?)(?:\.|$)/i,
    /\b(let's|we should|we need to)\s+(.+?)(?:\.|$)/i,
    /\b(I'll|I'll make sure to|I'm going to)\s+(.+?)(?:\.|$)/i,
    /\b(action item|task|follow up|follow-up)\s*:?\s*(.+?)(?:\.|$)/i,
  ];
  
  const actions: string[] = [];
  actionPatterns.forEach(pattern => {
    const match = text.match(pattern);
    if (match) {
      const action = match[2] || match[1];
      if (action && action.length > 5) {
        actions.push(action.trim());
      }
    }
  });
  
  return actions;
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const LiveMeetingCopilot: React.FC<LiveMeetingCopilotProps> = ({
  isActive,
  transcript,
  agenda,
  onAddNote,
  onCreateActionItem,
  onFlagKeyMoment,
  participants = ['Advisor', 'Client 1'],
  meetingTitle = 'Live Meeting',
  onClose,
  onMinimize,
  isMinimized = false,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('transcript');
  const [capturedNotes, setCapturedNotes] = useState<CapturedNote[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [selectedText, setSelectedText] = useState<string>('');
  const [showQuickCapture, setShowQuickCapture] = useState(false);
  const [quickCapturePosition, setQuickCapturePosition] = useState({ x: 0, y: 0 });
  const [isRecording, setIsRecording] = useState(false);
  const [meetingDuration, setMeetingDuration] = useState(0);
  const [pinnedNotes, setPinnedNotes] = useState<Set<string>>(new Set());
  const [showAssigneeModal, setShowAssigneeModal] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editNoteText, setEditNoteText] = useState('');
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Meeting duration timer
  useEffect(() => {
    if (!isActive) return;
    
    const interval = setInterval(() => {
      setMeetingDuration(prev => prev + 1);
    }, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [isActive]);

  // Auto-scroll to latest transcript
  useEffect(() => {
    if (transcriptEndRef.current && activeTab === 'transcript') {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcript.length, activeTab]);

  // Generate AI suggestions based on transcript
  useEffect(() => {
    if (transcript.length === 0) return;
    
    const lastEntries = transcript.slice(-3);
    const suggestions: AISuggestion[] = [];
    
    // Check for agenda items not yet covered
    agenda.forEach((item, index) => {
      if (!item.completed) {
        const isMentioned = transcript.some(t => 
          t.text.toLowerCase().includes(item.topic.toLowerCase())
        );
        if (!isMentioned && index < 2) {
          suggestions.push({
            id: `agenda-${index}`,
            type: 'agenda',
            text: `Don't forget to discuss: ${item.topic}`,
            priority: 'high',
          });
        }
      }
    });
    
    // Generate follow-up questions based on recent content
    lastEntries.forEach(entry => {
      if (entry.text.includes('?')) {
        suggestions.push({
          id: `question-${entry.id}`,
          type: 'question',
          text: `Follow up on: "${entry.text.substring(0, 60)}..."`,
          priority: 'medium',
          relatedTo: entry.id,
        });
      }
      
      if (entry.text.toLowerCase().includes('concern') || entry.text.toLowerCase().includes('worried')) {
        suggestions.push({
          id: `insight-${entry.id}`,
          type: 'insight',
          text: 'Explore this concern further - ask about impact',
          priority: 'high',
          relatedTo: entry.id,
        });
      }
    });
    
    setAiSuggestions(suggestions.slice(0, 5));
  }, [transcript, agenda]);

  // Auto-detect action items from transcript
  useEffect(() => {
    if (transcript.length === 0) return;
    
    const latestEntry = transcript[transcript.length - 1];
    const detectedActions = detectActionItems(latestEntry.text);
    
    detectedActions.forEach(actionText => {
      const exists = actionItems.some(item => 
        item.text.toLowerCase() === actionText.toLowerCase()
      );
      
      if (!exists) {
        const newAction: ActionItem = {
          id: `action-${Date.now()}-${Math.random()}`,
          text: actionText,
          assignee: latestEntry.speaker,
          detectedAt: new Date(),
          completed: false,
          sourceTranscriptId: latestEntry.id,
        };
        setActionItems(prev => [newAction, ...prev]);
      }
    });
  }, [transcript]);

  // Handle text selection for quick capture
  const handleTextSelection = () => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    
    if (text && text.length > 5) {
      setSelectedText(text);
      const range = selection?.getRangeAt(0);
      const rect = range?.getBoundingClientRect();
      if (rect) {
        setQuickCapturePosition({ x: rect.left + rect.width / 2, y: rect.top - 40 });
        setShowQuickCapture(true);
      }
    } else {
      setShowQuickCapture(false);
    }
  };

  // Handlers
  const handleAddNote = (text: string, sourceId?: string) => {
    const note: CapturedNote = {
      id: `note-${Date.now()}`,
      text,
      sourceTranscriptId: sourceId,
      timestamp: new Date(),
      tags: [],
    };
    setCapturedNotes(prev => [note, ...prev]);
    onAddNote(text);
    setShowQuickCapture(false);
    window.getSelection()?.removeAllRanges();
  };

  const handleCreateActionItem = (text: string, assignee?: string) => {
    const action: ActionItem = {
      id: `action-${Date.now()}`,
      text,
      assignee,
      detectedAt: new Date(),
      completed: false,
    };
    setActionItems(prev => [action, ...prev]);
    onCreateActionItem(text, assignee);
  };

  const toggleActionComplete = (id: string) => {
    setActionItems(prev => prev.map(item =>
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };

  const deleteActionItem = (id: string) => {
    setActionItems(prev => prev.filter(item => item.id !== id));
  };

  const deleteNote = (id: string) => {
    setCapturedNotes(prev => prev.filter(note => note.id !== id));
  };

  const togglePinNote = (id: string) => {
    setPinnedNotes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const assignActionItem = (actionId: string, assignee: string) => {
    setActionItems(prev => prev.map(item =>
      item.id === actionId ? { ...item, assignee } : item
    ));
    setShowAssigneeModal(null);
  };

  const startEditingNote = (note: CapturedNote) => {
    setEditingNote(note.id);
    setEditNoteText(note.text);
  };

  const saveNoteEdit = (id: string) => {
    setCapturedNotes(prev => prev.map(note =>
      note.id === id ? { ...note, text: editNoteText } : note
    ));
    setEditingNote(null);
    setEditNoteText('');
  };

  // Calculate sentiment
  const overallSentiment = useMemo(() => {
    const sentiments = transcript.map(t => t.sentiment || 'neutral');
    const counts = {
      positive: sentiments.filter(s => s === 'positive').length,
      concerned: sentiments.filter(s => s === 'concerned' || s === 'confused').length,
      neutral: sentiments.filter(s => s === 'neutral').length,
    };
    
    if (counts.concerned > counts.positive && counts.concerned > counts.neutral) {
      return { type: 'concerned', color: 'text-red-500', bg: 'bg-red-50', icon: TrendingDown };
    }
    if (counts.positive > counts.concerned) {
      return { type: 'positive', color: 'text-green-500', bg: 'bg-green-50', icon: TrendingUp };
    }
    return { type: 'neutral', color: 'text-amber-500', bg: 'bg-amber-50', icon: Minus };
  }, [transcript]);

  // Calculate stats
  const stats = useMemo(() => ({
    totalEntries: transcript.length,
    keyMoments: transcript.filter(t => t.isKeyMoment).length,
    actionItems: actionItems.length,
    completedActions: actionItems.filter(a => a.completed).length,
    notes: capturedNotes.length,
    agendaProgress: agenda.filter(a => a.completed).length / (agenda.length || 1) * 100,
  }), [transcript, actionItems, capturedNotes, agenda]);

  if (isMinimized) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="fixed right-4 top-4 z-50"
      >
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onMinimize}
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-lg border backdrop-blur-sm bg-white/95 border-gray-200/80 hover:bg-white hover:shadow-xl transition-all"
        >
          <div className="relative flex items-center justify-center w-6 h-6 rounded-lg bg-gradient-to-br from-navy-500 to-navy-500">
            <Sparkles className="w-3.5 h-3.5 text-white" />
            {isActive && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full animate-ping" />
            )}
          </div>
          <div className="flex flex-col items-start">
            <span className="text-sm font-semibold leading-tight text-gray-800">Copilot</span>
            <span className="text-xs leading-tight text-gray-500">
              {isActive ? `${formatDuration(meetingDuration)} • ${stats.totalEntries} entries` : 'Click to open'}
            </span>
          </div>
        </motion.button>
      </motion.div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ x: 420, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 420, opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="fixed right-0 top-0 h-full w-[400px] bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200"
      >
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-navy-700 via-navy-600 to-pink-500 text-white">
          <div className="p-4">
            {/* Top Row */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ rotate: [0, 15, -15, 0] }}
                  transition={{ duration: 4, repeat: Infinity, repeatDelay: 5 }}
                  className="relative"
                >
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <Brain className="w-5 h-5 text-white" />
                  </div>
                  {isActive && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-navy-700 animate-pulse" />
                  )}
                </motion.div>
                <div>
                  <h2 className="font-bold text-lg leading-tight">Meeting Copilot</h2>
                  <p className="text-xs text-white/80">AI-powered assistance</p>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                <button
                  onClick={onMinimize}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  title="Minimize"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Meeting Info */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 px-2 py-1 bg-white/20 rounded-lg">
                  <Clock className="w-3.5 h-3.5" />
                  {formatDuration(meetingDuration)}
                </span>
                <span className="flex items-center gap-1.5 px-2 py-1 bg-white/20 rounded-lg">
                  <Users className="w-3.5 h-3.5" />
                  {participants.length}
                </span>
              </div>
              
              {/* Live Indicator */}
              {isActive && (
                <motion.span 
                  className="flex items-center gap-1.5 px-2 py-1 bg-green-500/30 rounded-lg text-xs font-medium"
                  animate={{ opacity: [1, 0.7, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  LIVE
                </motion.span>
              )}
            </div>
          </div>

          {/* Sentiment Bar */}
          {transcript.length > 0 && (
            <div className="px-4 pb-3">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${overallSentiment.bg} bg-opacity-20 backdrop-blur-sm`}>
                <overallSentiment.icon className={`w-4 h-4 ${overallSentiment.color}`} />
                <span className="text-sm font-medium capitalize">
                  {overallSentiment.type === 'concerned' ? 'Some concerns detected' : 
                   overallSentiment.type === 'positive' ? 'Positive engagement' : 'Neutral tone'}
                </span>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-t border-white/20">
            {[
              { id: 'transcript', label: 'Transcript', icon: FileText },
              { id: 'notes', label: 'Notes', icon: Bookmark, badge: capturedNotes.length },
              { id: 'actions', label: 'Actions', icon: ListTodo, badge: actionItems.filter(a => !a.completed).length },
              { id: 'insights', label: 'Insights', icon: Sparkles, badge: aiSuggestions.length },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition-all relative ${
                  activeTab === tab.id 
                    ? 'text-white bg-white/10' 
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.badge && tab.badge > 0 && (
                  <span className="px-1.5 py-0.5 bg-white/20 rounded-full text-xs">
                    {tab.badge}
                  </span>
                )}
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto custom-scrollbar bg-gray-50"
          onMouseUp={handleTextSelection}
        >
          <AnimatePresence mode="wait">
            {/* Transcript Tab */}
            {activeTab === 'transcript' && (
              <motion.div
                key="transcript"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 space-y-4"
              >
                {transcript.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="relative mb-4">
                      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
                        <MicOff className="w-8 h-8 text-gray-400" />
                      </div>
                    </div>
                    <p className="text-gray-500 font-medium">No transcript yet</p>
                    <p className="text-sm text-gray-400 mt-1">Start speaking to see live transcription</p>
                  </div>
                ) : (
                  <>
                    {transcript.map((entry, index) => {
                      const keyPhrases = detectKeyPhrases(entry.text);
                      const isLatest = index === transcript.length - 1;
                      const speakerColor = getSpeakerColor(entry.speaker);
                      
                      return (
                        <motion.div
                          key={entry.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: isLatest ? 0 : index * 0.05 }}
                          className={`group relative ${entry.isKeyMoment ? 'ring-2 ring-amber-400 ring-offset-2 rounded-xl' : ''}`}
                        >
                          <div className={`flex gap-3 p-3 rounded-xl transition-all ${
                            isLatest ? 'bg-white shadow-md' : 'bg-white/50 hover:bg-white'
                          }`}>
                            {/* Speaker Avatar */}
                            <div
                              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                              style={{ backgroundColor: speakerColor }}
                            >
                              {getSpeakerInitial(entry.speaker)}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-sm" style={{ color: speakerColor }}>
                                  {entry.speaker}
                                </span>
                                <span className="text-xs text-gray-400">
                                  {formatTimestamp(entry.timestamp)}
                                </span>
                                {isLatest && (
                                  <span className="px-1.5 py-0.5 bg-navy-100 text-navy-700 rounded text-[10px] font-medium animate-pulse">
                                    NEW
                                  </span>
                                )}
                              </div>
                              
                              <p className="text-sm text-gray-800 leading-relaxed">
                                {entry.text}
                              </p>

                              {/* Key Phrase Badges */}
                              {keyPhrases.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {keyPhrases.map((kp, i) => (
                                    <span
                                      key={i}
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${kp.bg} ${kp.color}`}
                                    >
                                      <kp.icon className="w-3 h-3" />
                                      {kp.phrase}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => onFlagKeyMoment(entry.id)}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  entry.isKeyMoment 
                                    ? 'bg-amber-100 text-amber-600' 
                                    : 'hover:bg-gray-100 text-gray-400 hover:text-amber-600'
                                }`}
                                title="Flag as key moment"
                              >
                                <Flag className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleAddNote(entry.text, entry.id)}
                                className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-navy-700 rounded-lg transition-colors"
                                title="Add as note"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                    <div ref={transcriptEndRef} />
                  </>
                )}
              </motion.div>
            )}

            {/* Notes Tab */}
            {activeTab === 'notes' && (
              <motion.div
                key="notes"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 space-y-3"
              >
                {/* Quick Add */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Quick add note..."
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                        handleAddNote(e.currentTarget.value.trim());
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      const input = document.querySelector('input[placeholder="Quick add note..."]') as HTMLInputElement;
                      if (input?.value.trim()) {
                        handleAddNote(input.value.trim());
                        input.value = '';
                      }
                    }}
                    className="px-3 py-2 bg-navy-700 text-white rounded-lg hover:bg-navy-800 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Notes List */}
                {capturedNotes.length === 0 ? (
                  <div className="text-center py-12">
                    <Bookmark className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No notes yet</p>
                    <p className="text-sm text-gray-400 mt-1">Capture important moments from the transcript</p>
                  </div>
                ) : (
                  capturedNotes
                    .sort((a, b) => (pinnedNotes.has(b.id) ? 1 : 0) - (pinnedNotes.has(a.id) ? 1 : 0))
                    .map((note, index) => (
                    <motion.div
                      key={note.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`p-3 rounded-xl border transition-all ${
                        pinnedNotes.has(note.id)
                          ? 'bg-amber-50 border-amber-200'
                          : 'bg-white border-gray-200 hover:border-navy-200'
                      }`}
                    >
                      {editingNote === note.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={editNoteText}
                            onChange={(e) => setEditNoteText(e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-200 rounded resize-none"
                            rows={2}
                            autoFocus
                          />
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => setEditingNote(null)}
                              className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => saveNoteEdit(note.id)}
                              className="px-2 py-1 text-xs bg-navy-700 text-white rounded hover:bg-navy-800"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm text-gray-800">{note.text}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-400">
                              {formatTimestamp(note.timestamp)}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => togglePinNote(note.id)}
                                className={`p-1 rounded transition-colors ${
                                  pinnedNotes.has(note.id)
                                    ? 'text-amber-600 bg-amber-100'
                                    : 'text-gray-400 hover:bg-gray-100'
                                }`}
                              >
                                {pinnedNotes.has(note.id) ? (
                                  <Pin className="w-3.5 h-3.5" />
                                ) : (
                                  <PinOff className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                onClick={() => startEditingNote(note)}
                                className="p-1 text-gray-400 hover:bg-gray-100 rounded transition-colors"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => deleteNote(note.id)}
                                className="p-1 text-gray-400 hover:bg-red-100 hover:text-red-600 rounded transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </motion.div>
                  ))
                )}
              </motion.div>
            )}

            {/* Action Items Tab */}
            {activeTab === 'actions' && (
              <motion.div
                key="actions"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 space-y-3"
              >
                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-white rounded-xl border border-gray-200">
                    <p className="text-2xl font-bold text-gray-900">{actionItems.filter(a => !a.completed).length}</p>
                    <p className="text-xs text-gray-500">Pending</p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-gray-200">
                    <p className="text-2xl font-bold text-green-600">{actionItems.filter(a => a.completed).length}</p>
                    <p className="text-xs text-gray-500">Completed</p>
                  </div>
                </div>

                {/* Quick Add */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add action item..."
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                        handleCreateActionItem(e.currentTarget.value.trim());
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      const input = document.querySelector('input[placeholder="Add action item..."]') as HTMLInputElement;
                      if (input?.value.trim()) {
                        handleCreateActionItem(input.value.trim());
                        input.value = '';
                      }
                    }}
                    className="px-3 py-2 bg-navy-700 text-white rounded-lg hover:bg-navy-800 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Action Items List */}
                {actionItems.length === 0 ? (
                  <div className="text-center py-12">
                    <ListTodo className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No action items yet</p>
                    <p className="text-sm text-gray-400 mt-1">AI will auto-detect tasks from the conversation</p>
                  </div>
                ) : (
                  actionItems
                    .sort((a, b) => (a.completed ? 1 : 0) - (b.completed ? 1 : 0))
                    .map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`p-3 rounded-xl border transition-all ${
                        item.completed
                          ? 'bg-gray-50 border-gray-200 opacity-60'
                          : 'bg-white border-gray-200 hover:border-navy-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => toggleActionComplete(item.id)}
                          className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                            item.completed
                              ? 'bg-green-500 border-green-500'
                              : 'border-gray-300 hover:border-navy-500'
                          }`}
                        >
                          {item.completed && <Check className="w-3 h-3 text-white" />}
                        </button>
                        
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${item.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                            {item.text}
                          </p>
                          
                          <div className="flex items-center gap-2 mt-2">
                            {item.assignee ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-navy-50 text-navy-700 rounded-full text-xs">
                                <User className="w-3 h-3" />
                                {item.assignee}
                              </span>
                            ) : (
                              <button
                                onClick={() => setShowAssigneeModal(item.id)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-500 hover:text-navy-700 rounded-full text-xs transition-colors"
                              >
                                <User className="w-3 h-3" />
                                Assign
                              </button>
                            )}
                            
                            <span className="text-xs text-gray-400">
                              {formatTimestamp(item.detectedAt)}
                            </span>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => deleteActionItem(item.id)}
                          className="p-1 text-gray-400 hover:bg-red-100 hover:text-red-600 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </motion.div>
            )}

            {/* Insights Tab */}
            {activeTab === 'insights' && (
              <motion.div
                key="insights"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 space-y-4"
              >
                {/* Stats Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gradient-to-br from-navy-50 to-navy-50 rounded-xl border border-navy-100">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-4 h-4 text-navy-700" />
                      <span className="text-xs font-medium text-navy-700">Entries</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalEntries}</p>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-100">
                    <div className="flex items-center gap-2 mb-1">
                      <Flag className="w-4 h-4 text-amber-600" />
                      <span className="text-xs font-medium text-amber-600">Key Moments</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{stats.keyMoments}</p>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span className="text-xs font-medium text-green-600">Completed</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{stats.completedActions}</p>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-100">
                    <div className="flex items-center gap-2 mb-1">
                      <Target className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-medium text-blue-600">Agenda</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{Math.round(stats.agendaProgress)}%</p>
                  </div>
                </div>

                {/* AI Suggestions */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-navy-600" />
                    AI Suggestions
                  </h3>
                  
                  {aiSuggestions.length === 0 ? (
                    <div className="p-4 bg-gray-100 rounded-xl text-center">
                      <p className="text-sm text-gray-500">No suggestions yet</p>
                      <p className="text-xs text-gray-400 mt-1">Continue the conversation for AI insights</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {aiSuggestions.map((suggestion, index) => (
                        <motion.div
                          key={suggestion.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className={`p-3 rounded-xl border transition-all hover:shadow-md ${
                            suggestion.priority === 'high'
                              ? 'bg-red-50 border-red-100'
                              : suggestion.priority === 'medium'
                              ? 'bg-amber-50 border-amber-100'
                              : 'bg-blue-50 border-blue-100'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-1.5 rounded-lg ${
                              suggestion.type === 'question' ? 'bg-blue-100 text-blue-600' :
                              suggestion.type === 'agenda' ? 'bg-navy-100 text-navy-600' :
                              suggestion.type === 'topic' ? 'bg-green-100 text-green-600' :
                              'bg-amber-100 text-amber-600'
                            }`}>
                              {suggestion.type === 'question' && <MessageSquare className="w-4 h-4" />}
                              {suggestion.type === 'agenda' && <Target className="w-4 h-4" />}
                              {suggestion.type === 'topic' && <Lightbulb className="w-4 h-4" />}
                              {suggestion.type === 'insight' && <Brain className="w-4 h-4" />}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm text-gray-800">{suggestion.text}</p>
                              <span className={`text-xs mt-1 inline-block ${
                                suggestion.priority === 'high' ? 'text-red-600' :
                                suggestion.priority === 'medium' ? 'text-amber-600' :
                                'text-blue-600'
                              }`}>
                                {suggestion.priority} priority
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Agenda Progress */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Target className="w-4 h-4 text-navy-700" />
                    Agenda Progress
                  </h3>
                  <div className="space-y-2">
                    {agenda.map((item, index) => (
                      <div
                        key={index}
                        className={`flex items-center gap-3 p-3 rounded-lg ${
                          item.completed ? 'bg-green-50' : 'bg-white border border-gray-200'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          item.completed ? 'bg-green-500' : 'border-2 border-gray-300'
                        }`}>
                          {item.completed && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm ${item.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                            {item.topic}
                          </p>
                          <p className="text-xs text-gray-400">{formatDuration(item.duration)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Floating Action Button */}
        <div className="absolute bottom-6 right-6">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab('notes')}
            className="w-14 h-14 bg-gradient-to-r from-navy-700 to-navy-600 text-white rounded-full shadow-lg shadow-navy-500/30 flex items-center justify-center hover:shadow-xl hover:shadow-navy-500/40 transition-shadow"
          >
            <Plus className="w-6 h-6" />
          </motion.button>
        </div>

        {/* Assignee Modal */}
        <AnimatePresence>
          {showAssigneeModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50"
              onClick={() => setShowAssigneeModal(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-2xl p-4 w-full max-w-xs shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="font-semibold text-gray-900 mb-3">Assign to</h3>
                <div className="space-y-2">
                  {participants.map((participant) => (
                    <button
                      key={participant}
                      onClick={() => assignActionItem(showAssigneeModal, participant)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                        style={{ backgroundColor: getSpeakerColor(participant) }}
                      >
                        {getSpeakerInitial(participant)}
                      </div>
                      <span className="text-sm font-medium text-gray-800">{participant}</span>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowAssigneeModal(null)}
                  className="w-full mt-3 py-2 text-sm text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Quick Capture Tooltip */}
      <AnimatePresence>
        {showQuickCapture && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            style={{
              position: 'fixed',
              left: quickCapturePosition.x - 60,
              top: quickCapturePosition.y,
              zIndex: 100,
            }}
            className="bg-gray-900 text-white rounded-lg shadow-xl p-2 flex items-center gap-2"
          >
            <button
              onClick={() => handleAddNote(selectedText)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-700 hover:bg-navy-800 rounded-md text-sm font-medium transition-colors"
            >
              <Bookmark className="w-3.5 h-3.5" />
              Add Note
            </button>
            <button
              onClick={() => {
                handleCreateActionItem(selectedText);
                setShowQuickCapture(false);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded-md text-sm font-medium transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Action Item
            </button>
            <button
              onClick={() => setShowQuickCapture(false)}
              className="p-1.5 hover:bg-gray-800 rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default LiveMeetingCopilot;
