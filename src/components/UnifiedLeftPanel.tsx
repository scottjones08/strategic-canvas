/**
 * UnifiedLeftPanel - Beautiful left-side panel with all workspace tools
 *
 * Tabs:
 * - People (participants & collaborators)
 * - Transcript (professional recording with speaker diarization)
 * - Actions (action items from meetings)
 * - History (board state history)
 */

import React, { memo, useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Eye,
  EyeOff,
  Edit3,
  MousePointer2,
  ChevronRight,
  ChevronLeft,
  UserPlus,
  Link2,
  Check,
  Target,
  ListTodo,
  FileText,
  History,
  Mic,
  MicOff,
  StopCircle,
  Plus,
  User,
  Clock,
  Edit2,
  Loader2,
  Save,
  Download,
  Settings,
  Pause,
  Play,
  Upload,
  Search,
  X,
  Copy,
  ChevronDown,
  AlertCircle,
  Sparkles,
  Wand2,
  Layout,
  ClipboardList,
  Mail,
  MessageSquare,
} from 'lucide-react';
import { UserPresence, getUserInitials } from '../lib/realtime-collaboration';
import useTranscription from '../hooks/useTranscription';
import { FullTranscript, formatTimestamp, formatDuration } from '../lib/transcription';
import { MeetingSummary, generateMeetingSummary, SummaryFormat } from '../lib/meeting-summary';

// TranscriptEntry for saved transcripts (legacy format from App.tsx)
interface TranscriptEntry {
  id: string;
  speaker: string;
  text: string;
  timestamp: number;
}

// Legacy SavedTranscript format from App.tsx - kept for backward compatibility
export interface SavedTranscript {
  id: string;
  entries: TranscriptEntry[];
  startedAt: Date;
  endedAt: Date;
  duration: number;
  // New optional fields for enhanced transcripts
  title?: string;
  transcript?: FullTranscript;
  speakerCount?: number;
  segmentCount?: number;
}

export interface ParticipantActivity {
  userId: string;
  userName?: string;
  userColor?: string;
  type: 'joined' | 'left' | 'editing' | 'comment' | 'reaction';
  nodeId?: string;
  nodeName?: string;
  timestamp: Date;
}

export interface ActionItem {
  id: string;
  content: string;
  isComplete: boolean;
  assigneeId?: string;
}

export interface Participant {
  id: string;
  name: string;
  color: string;
  isActive?: boolean;
}

export interface HistoryEntry {
  nodes: any[];
  timestamp: Date;
  action: string;
}

interface UnifiedLeftPanelProps {
  // People props
  users: UserPresence[];
  currentUser: { id: string; name: string; color: string };
  isConnected: boolean;
  connectionError?: string | null;
  editingNodes?: Map<string, { userId: string; userName: string; color: string }>;
  showCursors: boolean;
  onToggleCursors: () => void;
  onFollowUser?: (userId: string | null) => void;
  followingUserId?: string | null;
  onInvite?: () => void;
  shareUrl?: string;
  recentActivity?: ParticipantActivity[];
  onEditUserName?: () => void;

  // Transcript props
  boardId?: string;
  boardName: string;
  clientId?: string;
  clientName?: string;
  onCreateNote?: (title: string, content: string, actionItems: string[]) => void;
  onGenerateWhiteboard?: (transcript: FullTranscript) => void;
  onGenerateSummary?: (summary: MeetingSummary) => void;
  onDraftEmail?: (transcript: FullTranscript) => void;
  autoSaveToNotes?: boolean;
  aiApiKey?: string;
  savedTranscripts?: SavedTranscript[];
  onSaveTranscript?: (transcript: SavedTranscript) => void;
  onDeleteTranscript?: (id: string) => void;
  onLoadTranscript?: (transcript: SavedTranscript) => void;

  // Action items props
  actionItems?: ActionItem[];
  onToggleActionComplete?: (id: string) => void;
  onAddAction?: (content: string) => void;
  onAssignUser?: (id: string, assigneeId: string | undefined) => void;
  participants?: Participant[];

  // History props
  history?: HistoryEntry[];
  currentHistoryIndex?: number;
  onRestoreHistory?: (index: number) => void;
}

type TabType = 'people' | 'transcript' | 'actions' | 'history';

// Participant row component
const ParticipantRow = memo(({
  user,
  isCurrentUser,
  isEditing,
  editingNodeName,
  isFollowing,
  onFollow,
  onEditName,
}: {
  user: UserPresence | { id: string; name: string; color: string; isOnline?: boolean; cursor?: { x: number; y: number } | null };
  isCurrentUser?: boolean;
  isEditing?: boolean;
  editingNodeName?: string;
  isFollowing?: boolean;
  onFollow?: () => void;
  onEditName?: () => void;
}) => {
  const initials = getUserInitials(user.name);
  const isOnline = 'isOnline' in user ? user.isOnline !== false : true;
  const hasCursor = 'cursor' in user && user.cursor !== null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={`
        flex items-center gap-3 p-3 rounded-xl transition-all
        ${isFollowing ? 'bg-navy-50 ring-2 ring-navy-200' : 'hover:bg-gray-50'}
        ${!isCurrentUser && onFollow ? 'group cursor-pointer' : ''}
      `}
      onClick={!isCurrentUser ? onFollow : undefined}
    >
      {/* Avatar with status */}
      <div className="relative flex-shrink-0">
        <div
          className={`
            w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold
            transition-all duration-300 ease-out
            ${isEditing ? 'ring-2 ring-amber-400 ring-offset-2' : ''}
            ${isCurrentUser ? 'ring-2 ring-offset-2' : ''}
          `}
          style={{ backgroundColor: user.color }}
        >
          {initials}
        </div>

        {/* Online indicator */}
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={`
            absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white
            ${isOnline ? 'bg-green-500' : 'bg-gray-400'}
          `}
        />

        {/* Editing pulse ring */}
        {isEditing && (
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ border: `2px solid ${user.color}` }}
            initial={{ scale: 1, opacity: 0.8 }}
            animate={{ scale: 1.4, opacity: 0 }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </div>

      {/* User info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-900 truncate">
            {user.name}
          </p>
          {isCurrentUser && (
            <span className="text-xs text-gray-400">(You)</span>
          )}
        </div>

        {/* Activity status */}
        <div className="flex items-center gap-1.5 mt-0.5">
          {isEditing ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-1 text-xs text-amber-600"
            >
              <Edit3 className="w-3 h-3" />
              <span className="truncate">
                Editing{editingNodeName ? `: ${editingNodeName}` : '...'}
              </span>
            </motion.div>
          ) : hasCursor ? (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <MousePointer2 className="w-3 h-3" />
              <span>Active</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Eye className="w-3 h-3" />
              <span>Viewing</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      {isCurrentUser && onEditName && (
        <button
          onClick={(e) => { e.stopPropagation(); onEditName(); }}
          className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <Edit2 className="w-4 h-4" />
        </button>
      )}
      {!isCurrentUser && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {isFollowing ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-1 px-2 py-1 bg-navy-100 text-navy-700 rounded-full text-xs font-medium"
            >
              <Target className="w-3 h-3" />
              Following
            </motion.div>
          ) : (
            <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
              <Eye className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Color indicator bar */}
      <div
        className="w-1 h-8 rounded-full transition-all"
        style={{ backgroundColor: user.color }}
      />
    </motion.div>
  );
});

ParticipantRow.displayName = 'ParticipantRow';

/**
 * Format transcript for note content
 */
function formatTranscriptForNote(transcript: FullTranscript, clientName?: string): string {
  const speakerColorMap = new Map(transcript.speakers.map(s => [s.id, s.color]));

  const header = `
    <div style="margin-bottom: 1rem; padding: 1rem; background: #f5f5f5; border-radius: 8px;">
      <strong>Duration:</strong> ${formatDuration(transcript.duration)}<br>
      <strong>Date:</strong> ${transcript.createdAt.toLocaleString()}<br>
      ${clientName ? `<strong>Client:</strong> ${clientName}<br>` : ''}
      <strong>Speakers:</strong> ${transcript.speakers.map(s => `<span style="color: ${s.color}; font-weight: 600;">${s.customName || s.label}</span>`).join(', ')}
    </div>
  `;

  const content = transcript.segments
    .map(segment => {
      const time = formatTimestamp(segment.startTime);
      const speaker = segment.speakerLabel || 'Unknown';
      const color = speakerColorMap.get(segment.speaker) || '#6b7280';
      return `
        <div style="margin-bottom: 1rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
            <span style="font-size: 0.75rem; color: #9ca3af;">${time}</span>
            <span style="font-weight: 600; color: ${color};">${speaker}:</span>
          </div>
          <p style="margin: 0; padding-left: 1rem;">${segment.text}</p>
        </div>
      `;
    })
    .join('');

  return header + content;
}

// Main Panel Component
export const UnifiedLeftPanel: React.FC<UnifiedLeftPanelProps> = memo(({
  // People props
  users,
  currentUser,
  isConnected,
  editingNodes,
  showCursors,
  onToggleCursors,
  onFollowUser,
  followingUserId,
  onInvite,
  shareUrl,
  recentActivity: _recentActivity = [],
  onEditUserName,

  // Transcript props
  boardName,
  clientName,
  onCreateNote,
  onGenerateWhiteboard,
  onGenerateSummary,
  onDraftEmail,
  autoSaveToNotes = true,
  aiApiKey,
  savedTranscripts = [],
  onSaveTranscript,
  onDeleteTranscript,
  onLoadTranscript,

  // Action items
  actionItems = [],
  onToggleActionComplete,
  onAddAction,
  onAssignUser,
  participants = [],

  // History
  history = [],
  currentHistoryIndex = 0,
  onRestoreHistory,
}) => {
  // Panel state
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('transcript');
  const [copied, setCopied] = useState(false);
  const [newAction, setNewAction] = useState('');
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState<string | null>(null);

  // Transcription hook
  const {
    isRecording,
    isPaused,
    isProcessing,
    transcript,
    error,
    duration,
    config,
    isConfigured,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    uploadAudio,
    updateSpeaker,
    clearTranscript,
    exportAsText,
    exportAsMarkdown,
    exportAsHTML,
    getActionItems: getTranscriptActionItems,
    updateConfig,
  } = useTranscription({
    autoSave: true,
    onTranscriptComplete: (t) => {
      console.log('Transcript complete:', t.segments.length, 'segments');
      if (autoSaveToNotes && onCreateNote && t.segments.length > 0) {
        const title = `Meeting Transcript - ${boardName} - ${new Date().toLocaleDateString()}`;
        const content = formatTranscriptForNote(t, clientName);
        const items = getTranscriptActionItems();
        onCreateNote(title, content, items);
        setNoteSaved(true);
        setTimeout(() => setNoteSaved(false), 3000);
      }
    },
  });

  // Transcription panel state
  const [showSettings, setShowSettings] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showSpeakerEdit, setShowSpeakerEdit] = useState<string | null>(null);
  const [editingSpeakerName, setEditingSpeakerName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showTimestamps, setShowTimestamps] = useState(true);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [noteSaved, setNoteSaved] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [showSavedTranscripts, setShowSavedTranscripts] = useState(false);
  const [viewingTranscript, setViewingTranscript] = useState<SavedTranscript | null>(null);

  const transcriptScrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-switch to transcript tab when recording starts
  useEffect(() => {
    if (isRecording) {
      setActiveTab('transcript');
    }
  }, [isRecording]);

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptScrollRef.current && isRecording && activeTab === 'transcript') {
      transcriptScrollRef.current.scrollTop = transcriptScrollRef.current.scrollHeight;
    }
  }, [transcript?.segments.length, isRecording, activeTab]);

  // Get editing info for each user
  const getEditingInfo = useCallback((userId: string) => {
    if (!editingNodes) return null;
    for (const [_nodeId, editor] of editingNodes.entries()) {
      if (editor.userId === userId) {
        return { nodeName: editor.userName };
      }
    }
    return null;
  }, [editingNodes]);

  const handleCopyLink = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  }, [shareUrl]);

  // Filter segments by search
  const filteredSegments = transcript?.segments.filter(segment =>
    !searchQuery || segment.text.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Handle file upload
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadProgress('Preparing upload...');
    try {
      await uploadAudio(file, (_status, message) => {
        setUploadProgress(message);
      });
    } catch (error) {
      console.error('Failed to upload audio:', error);
    } finally {
      setUploadProgress(null);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [uploadAudio]);

  // Handle speaker name edit
  const handleSpeakerNameSave = useCallback((speakerId: string) => {
    if (editingSpeakerName.trim()) {
      updateSpeaker(speakerId, editingSpeakerName.trim());
    }
    setShowSpeakerEdit(null);
    setEditingSpeakerName('');
  }, [editingSpeakerName, updateSpeaker]);

  // Export handlers
  const handleExport = useCallback((format: 'text' | 'markdown' | 'html') => {
    let content = '';
    let filename = '';
    let mimeType = '';

    switch (format) {
      case 'text':
        content = exportAsText();
        filename = `transcript-${boardName}-${new Date().toISOString().split('T')[0]}.txt`;
        mimeType = 'text/plain';
        break;
      case 'markdown':
        content = exportAsMarkdown();
        filename = `transcript-${boardName}-${new Date().toISOString().split('T')[0]}.md`;
        mimeType = 'text/markdown';
        break;
      case 'html':
        content = exportAsHTML();
        filename = `transcript-${boardName}-${new Date().toISOString().split('T')[0]}.html`;
        mimeType = 'text/html';
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
  }, [boardName, exportAsText, exportAsMarkdown, exportAsHTML]);

  // Manual save as note
  const handleSaveAsNote = useCallback(() => {
    if (!transcript || !onCreateNote) return;

    const title = `Meeting Transcript - ${boardName} - ${new Date().toLocaleDateString()}`;
    const content = formatTranscriptForNote(transcript, clientName);
    const items = getTranscriptActionItems();

    onCreateNote(title, content, items);
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 3000);
  }, [transcript, boardName, clientName, getTranscriptActionItems, onCreateNote]);

  // Generate whiteboard from transcript
  const handleGenerateWhiteboard = useCallback(() => {
    if (transcript && onGenerateWhiteboard) {
      onGenerateWhiteboard(transcript);
    }
  }, [transcript, onGenerateWhiteboard]);

  // Generate meeting summary
  const handleGenerateSummary = useCallback(async (format: SummaryFormat = 'executive') => {
    if (!transcript) return;

    setIsGeneratingSummary(true);
    try {
      const summary = await generateMeetingSummary(transcript, {
        format,
        clientName,
        boardName,
        aiApiKey,
      });

      if (onGenerateSummary) {
        onGenerateSummary(summary);
      }
    } catch (err) {
      console.error('Failed to generate summary:', err);
    } finally {
      setIsGeneratingSummary(false);
    }
  }, [transcript, clientName, boardName, aiApiKey, onGenerateSummary]);

  // Open email draft
  const handleDraftEmail = useCallback(() => {
    if (transcript && onDraftEmail) {
      onDraftEmail(transcript);
    }
  }, [transcript, onDraftEmail]);

  // Copy to clipboard
  const handleCopyToClipboard = useCallback(async () => {
    const text = exportAsText();
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Failed to copy transcript:', error);
    }
  }, [exportAsText]);

  // Save current transcript to saved list
  const handleSaveCurrentTranscript = useCallback(() => {
    if (!transcript || transcript.segments.length === 0 || !onSaveTranscript) return;

    // Convert to legacy format for backward compatibility
    const entries: TranscriptEntry[] = transcript.segments.map(seg => ({
      id: seg.id,
      speaker: seg.speaker,
      text: seg.text,
      timestamp: Math.floor(seg.startTime / 1000), // Convert ms to seconds
    }));

    const savedTranscript: SavedTranscript = {
      id: crypto.randomUUID(),
      entries,
      startedAt: new Date(Date.now() - duration * 1000),
      endedAt: new Date(),
      duration,
      // Enhanced fields
      title: `${boardName} - ${new Date().toLocaleString()}`,
      transcript: { ...transcript },
      speakerCount: transcript.speakers.length,
      segmentCount: transcript.segments.length,
    };

    onSaveTranscript(savedTranscript);
    clearTranscript();
  }, [transcript, duration, boardName, onSaveTranscript, clearTranscript]);

  // Load a saved transcript for viewing
  const handleLoadSavedTranscript = useCallback((saved: SavedTranscript) => {
    setViewingTranscript(saved);
    setShowSavedTranscripts(false);
    if (onLoadTranscript) {
      onLoadTranscript(saved);
    }
  }, [onLoadTranscript]);

  // Delete a saved transcript
  const handleDeleteSavedTranscript = useCallback((id: string) => {
    if (onDeleteTranscript) {
      onDeleteTranscript(id);
    }
    if (viewingTranscript?.id === id) {
      setViewingTranscript(null);
    }
  }, [onDeleteTranscript, viewingTranscript]);

  const totalParticipants = users.length + 1;
  const pendingActionsCount = actionItems.filter(a => !a.isComplete).length;

  const tabs: { id: TabType; label: string; icon: typeof Users; badge?: number | string }[] = [
    {
      id: 'transcript',
      label: 'Transcript',
      icon: FileText,
      badge: isRecording ? '●' : undefined
    },
    {
      id: 'people',
      label: 'People',
      icon: Users,
      badge: totalParticipants > 1 ? totalParticipants : undefined
    },
    {
      id: 'actions',
      label: 'Actions',
      icon: ListTodo,
      badge: pendingActionsCount > 0 ? pendingActionsCount : undefined
    },
    {
      id: 'history',
      label: 'History',
      icon: History,
      badge: history.length > 1 ? history.length : undefined
    },
  ];

  return (
    <motion.div
      initial={{ x: 380 }}
      animate={{ x: isExpanded ? 0 : 340 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="fixed right-0 top-16 sm:top-20 bottom-16 sm:bottom-4 w-[320px] sm:w-[360px] md:w-[380px] z-[100] max-w-[calc(100vw-16px)]"
    >
      {/* Panel content */}
      <div className="h-full bg-white/95 backdrop-blur-xl rounded-2xl sm:rounded-l-2xl rounded-r-none shadow-2xl border border-r-0 border-gray-200 flex flex-col overflow-hidden">
        {/* Header with recording status */}
        <div className={`p-4 border-b ${isRecording ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gradient-to-r from-navy-500 to-navy-500'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isRecording ? 'bg-white/20' : 'bg-white/20'}`}>
                {isRecording ? (
                  <div className="relative">
                    <Mic className="w-5 h-5 text-white animate-pulse" />
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full animate-ping" />
                  </div>
                ) : (
                  <FileText className="w-5 h-5 text-white" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">
                  {isRecording ? 'Recording Live' : 'Workspace'}
                </h3>
                <div className="flex items-center gap-2">
                  {isRecording && (
                    <span className="text-white/90 text-xs font-mono">{formatDuration(duration)}</span>
                  )}
                  {!isConfigured && !isRecording && (
                    <span className="px-2 py-0.5 bg-amber-400 text-amber-900 text-[10px] rounded-full font-medium">
                      Basic Mode
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Connection status hidden - synced automatically */}

              {/* Settings */}
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors text-white"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Recording Controls */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              {/* Duration badge */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 rounded-lg text-white">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-mono">{formatDuration(duration)}</span>
              </div>

              {/* Speaker count */}
              {transcript && transcript.speakers.length > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 rounded-lg text-white">
                  <Users className="w-4 h-4" />
                  <span className="text-sm">{transcript.speakers.length}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Pause/Resume button */}
              {isRecording && (
                <button
                  onClick={isPaused ? resumeRecording : pauseRecording}
                  className={`p-2.5 rounded-lg transition-colors ${
                    isPaused ? 'bg-green-500 hover:bg-green-600' : 'bg-white/20 hover:bg-white/30'
                  }`}
                >
                  {isPaused ? <Play className="w-4 h-4 text-white" /> : <Pause className="w-4 h-4 text-white" />}
                </button>
              )}

              {/* Main record button */}
              <button
                onClick={async () => {
                  if (isRecording) {
                    await stopRecording();
                  } else {
                    startRecording();
                  }
                }}
                disabled={isProcessing}
                className={`p-3 rounded-xl transition-all ${
                  isRecording
                    ? 'bg-white text-red-600 hover:bg-red-50'
                    : isProcessing
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-white text-navy-700 hover:bg-navy-50'
                }`}
              >
                {isProcessing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : isRecording ? (
                  <StopCircle className="w-5 h-5" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Settings Panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-b border-gray-200 overflow-hidden"
            >
              <div className="p-4 bg-gray-50 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    AssemblyAI API Key
                  </label>
                  <input
                    type="password"
                    value={config?.apiKey || ''}
                    onChange={(e) => updateConfig({ apiKey: e.target.value })}
                    placeholder="Enter your API key for speaker diarization"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Get a free key at{' '}
                    <a
                      href="https://www.assemblyai.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-navy-700 hover:underline"
                    >
                      assemblyai.com
                    </a>
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">
                    Speaker Diarization
                  </label>
                  <button
                    onClick={() => updateConfig({ enableDiarization: !config?.enableDiarization })}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      config?.enableDiarization ? 'bg-navy-700' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        config?.enableDiarization ? 'left-7' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">
                    Show Timestamps
                  </label>
                  <button
                    onClick={() => setShowTimestamps(!showTimestamps)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      showTimestamps ? 'bg-navy-700' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        showTimestamps ? 'left-7' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Upload audio file */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Audio File
                  </label>
                  <label
                    className={`flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                      isConfigured
                        ? 'border-gray-300 hover:border-navy-400 hover:bg-navy-50'
                        : 'border-gray-200 bg-gray-100 cursor-not-allowed'
                    }`}
                  >
                    <Upload className="w-5 h-5 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      {uploadProgress || (isConfigured ? 'Upload audio/video file' : 'API key required')}
                    </span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="audio/*,video/*,.mp3,.wav,.m4a,.mp4,.webm"
                      onChange={handleFileUpload}
                      disabled={!isConfigured || isProcessing}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Note saved indicator */}
        <AnimatePresence>
          {noteSaved && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-4 py-2 bg-green-50 border-b border-green-100 flex items-center gap-2"
            >
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-700">Transcript saved to Notes!</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error display */}
        {error && (
          <div className="px-4 py-2 bg-red-50 border-b border-red-100 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-700">{error}</span>
            <button onClick={clearTranscript} className="ml-auto text-red-500 hover:text-red-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="px-2 py-2 border-b border-gray-100 bg-gray-50/50">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  relative flex-1 flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg text-xs font-medium transition-all
                  ${activeTab === tab.id
                    ? tab.id === 'transcript' && isRecording
                      ? 'bg-red-500 text-white'
                      : 'bg-white text-gray-900 shadow-sm border border-gray-200'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }
                `}
              >
                <tab.icon className="w-4 h-4" />
                <span className="text-[10px]">{tab.label}</span>
                {tab.badge && (
                  <span className={`absolute -top-1 -right-1 min-w-[16px] h-[16px] text-[9px] font-bold rounded-full flex items-center justify-center px-1 ${
                    activeTab === tab.id
                      ? tab.id === 'transcript' && isRecording
                        ? 'bg-white text-red-600 animate-pulse'
                        : 'bg-navy-500 text-white'
                      : tab.id === 'transcript' && isRecording
                        ? 'bg-red-500 text-white animate-pulse'
                        : 'bg-gray-300 text-gray-700'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {/* Transcript Tab */}
            {activeTab === 'transcript' && (
              <motion.div
                key="transcript"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="h-full flex flex-col"
              >
                {/* Current/Saved toggle */}
                <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                    <button
                      onClick={() => { setShowSavedTranscripts(false); setViewingTranscript(null); }}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                        !showSavedTranscripts && !viewingTranscript
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Current
                      {isRecording && <span className="ml-1 w-1.5 h-1.5 bg-red-500 rounded-full inline-block animate-pulse" />}
                    </button>
                    <button
                      onClick={() => setShowSavedTranscripts(true)}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${
                        showSavedTranscripts || viewingTranscript
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Saved
                      {savedTranscripts.length > 0 && (
                        <span className="px-1.5 py-0.5 bg-navy-100 text-navy-800 rounded-full text-[10px]">
                          {savedTranscripts.length}
                        </span>
                      )}
                    </button>
                  </div>
                  {/* Save current button */}
                  {transcript && transcript.segments.length > 0 && !isRecording && !showSavedTranscripts && !viewingTranscript && onSaveTranscript && (
                    <button
                      onClick={handleSaveCurrentTranscript}
                      className="flex items-center gap-1 px-2 py-1 bg-navy-100 text-navy-800 rounded-lg text-xs font-medium hover:bg-navy-200 transition-colors"
                    >
                      <Save className="w-3 h-3" />
                      Save
                    </button>
                  )}
                </div>

                {/* Saved transcripts list */}
                {showSavedTranscripts && !viewingTranscript && (
                  <div className="flex-1 overflow-y-auto p-3">
                    {savedTranscripts.length === 0 ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center text-gray-400">
                          <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
                          <p className="font-medium">No saved transcripts</p>
                          <p className="text-sm mt-1">Record a session and save it here</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {savedTranscripts.map((saved) => (
                          <motion.div
                            key={saved.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer group"
                            onClick={() => handleLoadSavedTranscript(saved)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-sm text-gray-900 truncate">
                                  {saved.title || `Recording ${new Date(saved.startedAt).toLocaleDateString()}`}
                                </h4>
                                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {formatDuration(saved.duration)}
                                  </span>
                                  {(saved.speakerCount || saved.transcript?.speakers?.length) && (
                                    <span className="flex items-center gap-1">
                                      <User className="w-3 h-3" />
                                      {saved.speakerCount || saved.transcript?.speakers?.length || 1} speakers
                                    </span>
                                  )}
                                  <span>{saved.segmentCount || saved.transcript?.segments?.length || saved.entries?.length || 0} segments</span>
                                </div>
                                <p className="text-xs text-gray-400 mt-1">
                                  {new Date(saved.startedAt || saved.transcript?.createdAt || Date.now()).toLocaleString()}
                                </p>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm('Delete this transcript?')) {
                                    handleDeleteSavedTranscript(saved.id);
                                  }
                                }}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Viewing a saved transcript */}
                {viewingTranscript && (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="px-3 py-2 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-amber-600" />
                        <span className="text-sm font-medium text-amber-800 truncate max-w-[180px]">
                          {viewingTranscript.title || `Recording ${new Date(viewingTranscript.startedAt).toLocaleDateString()}`}
                        </span>
                      </div>
                      <button
                        onClick={() => setViewingTranscript(null)}
                        className="p-1 hover:bg-amber-100 rounded"
                      >
                        <X className="w-4 h-4 text-amber-600" />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                      {/* Handle new format (transcript object) */}
                      {viewingTranscript.transcript?.segments?.map((segment) => {
                        const speaker = viewingTranscript.transcript?.speakers?.find(s => s.id === segment.speaker);
                        return (
                          <div key={segment.id} className="flex gap-3 p-3 rounded-xl hover:bg-gray-50">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0"
                              style={{ backgroundColor: speaker?.color || '#6b7280' }}
                            >
                              {(speaker?.customName || speaker?.label || '?').charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm" style={{ color: speaker?.color }}>
                                  {speaker?.customName || speaker?.label || 'Unknown'}
                                </span>
                                <span className="text-xs text-gray-400">
                                  {formatTimestamp(segment.startTime)}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700">{segment.text}</p>
                            </div>
                          </div>
                        );
                      })}
                      {/* Handle legacy format (entries array) */}
                      {!viewingTranscript.transcript && viewingTranscript.entries?.map((entry) => (
                        <div key={entry.id} className="flex gap-3 p-3 rounded-xl hover:bg-gray-50">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0 bg-navy-500">
                            {entry.speaker?.charAt(0) || 'S'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm text-navy-700">
                                Speaker {entry.speaker || '1'}
                              </span>
                              <span className="text-xs text-gray-400">
                                {Math.floor(entry.timestamp / 60)}:{String(entry.timestamp % 60).padStart(2, '0')}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700">{entry.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Current transcript view (only show when not viewing saved) */}
                {!showSavedTranscripts && !viewingTranscript && (
                  <>
                {/* Speakers bar */}
                {transcript && transcript.speakers.length > 0 && (
                  <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-gray-500 font-medium">Speakers:</span>
                      {transcript.speakers.map((speaker) => (
                        <div key={speaker.id} className="relative group">
                          {showSpeakerEdit === speaker.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={editingSpeakerName}
                                onChange={(e) => setEditingSpeakerName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSpeakerNameSave(speaker.id);
                                  if (e.key === 'Escape') setShowSpeakerEdit(null);
                                }}
                                className="px-2 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-navy-500 w-24"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSpeakerNameSave(speaker.id)}
                                className="p-1 hover:bg-green-100 rounded"
                              >
                                <Check className="w-3 h-3 text-green-600" />
                              </button>
                              <button
                                onClick={() => setShowSpeakerEdit(null)}
                                className="p-1 hover:bg-gray-200 rounded"
                              >
                                <X className="w-3 h-3 text-gray-500" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setShowSpeakerEdit(speaker.id);
                                setEditingSpeakerName(speaker.customName || speaker.label);
                              }}
                              className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium hover:opacity-80 transition-opacity"
                              style={{ backgroundColor: `${speaker.color}20`, color: speaker.color }}
                            >
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: speaker.color }}
                              />
                              {speaker.customName || speaker.label}
                              <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Search bar */}
                {transcript && transcript.segments.length > 5 && (
                  <div className="px-3 py-2 border-b border-gray-100">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search transcript..."
                        className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2"
                        >
                          <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Transcript content */}
                <div ref={transcriptScrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
                  {filteredSegments.length > 0 ? (
                    <AnimatePresence>
                      {filteredSegments.map((segment, index) => {
                        const speaker = transcript?.speakers.find((s) => s.id === segment.speaker);
                        const isLatest = index === filteredSegments.length - 1;

                        return (
                          <motion.div
                            key={segment.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex gap-3 p-3 rounded-xl transition-colors ${
                              isLatest && isRecording ? 'bg-navy-50 border-l-4 border-navy-500' : 'hover:bg-gray-50'
                            }`}
                          >
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0"
                              style={{ backgroundColor: speaker?.color || '#6b7280' }}
                            >
                              {(speaker?.customName || speaker?.label || '?').charAt(0)}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span
                                  className="font-medium text-sm"
                                  style={{ color: speaker?.color || '#374151' }}
                                >
                                  {speaker?.customName || speaker?.label || 'Unknown'}
                                </span>
                                {showTimestamps && (
                                  <span className="text-xs text-gray-400">
                                    {formatTimestamp(segment.startTime)}
                                  </span>
                                )}
                                {segment.confidence < 0.8 && (
                                  <span className="text-xs text-amber-500" title="Low confidence">
                                    ⚠️
                                  </span>
                                )}
                                {isLatest && isRecording && (
                                  <span className="px-2 py-0.5 bg-navy-100 text-navy-800 rounded-full text-[10px] font-medium animate-pulse">
                                    Latest
                                  </span>
                                )}
                              </div>
                              <p className={`text-sm text-gray-700 leading-relaxed ${isLatest && isRecording ? 'font-medium' : ''}`}>
                                {segment.text}
                              </p>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  ) : isProcessing ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center">
                        <Loader2 className="w-12 h-12 text-navy-500 mx-auto mb-4 animate-spin" />
                        <p className="text-sm text-gray-600 font-medium">{uploadProgress || 'Processing...'}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center text-gray-400">
                        <MicOff className="w-16 h-16 mx-auto mb-4 opacity-40" />
                        <p className="font-medium text-lg">Ready to record</p>
                        <p className="text-sm mt-2">
                          {isConfigured
                            ? 'Click the microphone to start with speaker diarization'
                            : 'Add an API key for speaker identification'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer actions */}
                {transcript && transcript.segments.length > 0 && (
                  <div className="p-3 border-t border-gray-200 bg-gray-50">
                    {/* Action items indicator */}
                    {getTranscriptActionItems().length > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-amber-600 mb-2">
                        <ListTodo className="w-4 h-4" />
                        <span>{getTranscriptActionItems().length} action items found</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {/* Copy button */}
                        <button
                          onClick={handleCopyToClipboard}
                          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                          title="Copy to clipboard"
                        >
                          <Copy className="w-4 h-4 text-gray-500" />
                        </button>

                        {/* Export dropdown */}
                        <div className="relative">
                          <button
                            onClick={() => setShowExportMenu(!showExportMenu)}
                            className="flex items-center gap-1 px-3 py-1.5 hover:bg-gray-200 rounded-lg transition-colors text-sm text-gray-600"
                          >
                            <Download className="w-4 h-4" />
                            Export
                            <ChevronDown className="w-3 h-3" />
                          </button>

                          <AnimatePresence>
                            {showExportMenu && (
                              <>
                                <div
                                  className="fixed inset-0 z-10"
                                  onClick={() => setShowExportMenu(false)}
                                />
                                <motion.div
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  className="absolute bottom-full left-0 mb-2 w-40 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-20"
                                >
                                  <button
                                    onClick={() => handleExport('text')}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                  >
                                    <FileText className="w-4 h-4 text-gray-400" />
                                    Plain Text
                                  </button>
                                  <button
                                    onClick={() => handleExport('markdown')}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                  >
                                    <MessageSquare className="w-4 h-4 text-gray-400" />
                                    Markdown
                                  </button>
                                  <button
                                    onClick={() => handleExport('html')}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                  >
                                    <Sparkles className="w-4 h-4 text-gray-400" />
                                    Rich HTML
                                  </button>
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {/* Generate Summary button */}
                        {onGenerateSummary && (
                          <button
                            onClick={() => handleGenerateSummary('executive')}
                            disabled={isGeneratingSummary}
                            className="flex items-center gap-1 px-2 py-1.5 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors text-xs font-medium disabled:opacity-50"
                            title="Generate meeting summary"
                          >
                            {isGeneratingSummary ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <ClipboardList className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}

                        {/* Draft Email button */}
                        {onDraftEmail && (
                          <button
                            onClick={handleDraftEmail}
                            className="flex items-center gap-1 px-2 py-1.5 bg-teal-100 text-teal-700 rounded-lg hover:bg-teal-200 transition-colors text-xs font-medium"
                            title="Draft follow-up email"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Generate Whiteboard button */}
                        {onGenerateWhiteboard && (
                          <button
                            onClick={handleGenerateWhiteboard}
                            className="flex items-center gap-1 px-2 py-1.5 bg-navy-100 text-navy-700 rounded-lg hover:bg-navy-200 transition-colors text-xs font-medium"
                            title="Extract items and add to whiteboard"
                          >
                            <Wand2 className="w-3.5 h-3.5" />
                            <Layout className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Save as note button */}
                        {onCreateNote && (
                          <button
                            onClick={handleSaveAsNote}
                            className="flex items-center gap-1 px-3 py-1.5 bg-navy-700 text-white rounded-lg hover:bg-navy-800 transition-colors text-xs font-medium"
                          >
                            <Save className="w-3.5 h-3.5" />
                            Save
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                  </>
                )}
              </motion.div>
            )}

            {/* People Tab */}
            {activeTab === 'people' && (
              <motion.div
                key="people"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="h-full flex flex-col"
              >
                {/* Cursor toggle */}
                <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-2">
                  <button
                    onClick={onToggleCursors}
                    className={`
                      flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                      ${showCursors
                        ? 'bg-navy-100 text-navy-800'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }
                    `}
                  >
                    {showCursors ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    Cursors
                  </button>

                  {followingUserId && (
                    <button
                      onClick={() => onFollowUser?.(null)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-100 text-amber-700"
                    >
                      <Target className="w-3.5 h-3.5" />
                      Stop
                    </button>
                  )}
                </div>

                {/* Participants list */}
                <div className="flex-1 overflow-y-auto p-2">
                  {/* Current user */}
                  <ParticipantRow
                    user={currentUser}
                    isCurrentUser
                    isEditing={!!getEditingInfo(currentUser.id)}
                    onEditName={onEditUserName}
                  />

                  {/* Divider */}
                  {users.length > 0 && (
                    <div className="flex items-center gap-2 px-3 py-2">
                      <div className="flex-1 h-px bg-gray-200" />
                      <span className="text-xs text-gray-400">Collaborators</span>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>
                  )}

                  {/* Other participants */}
                  <AnimatePresence mode="popLayout">
                    {users.map(user => {
                      const editingInfo = getEditingInfo(user.id);
                      return (
                        <ParticipantRow
                          key={user.id}
                          user={user}
                          isEditing={!!editingInfo}
                          editingNodeName={editingInfo?.nodeName}
                          isFollowing={followingUserId === user.id}
                          onFollow={() => onFollowUser?.(
                            followingUserId === user.id ? null : user.id
                          )}
                        />
                      );
                    })}
                  </AnimatePresence>

                  {/* Empty state */}
                  {users.length === 0 && (
                    <div className="text-center py-6">
                      <Users className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm text-gray-500">Just you here</p>
                      <p className="text-xs text-gray-400">Invite others to collaborate</p>
                    </div>
                  )}
                </div>

                {/* Invite footer */}
                <div className="p-3 border-t border-gray-100 space-y-2">
                  {shareUrl && (
                    <button
                      onClick={handleCopyLink}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-green-600" />
                          <span className="text-green-600">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Link2 className="w-3.5 h-3.5" />
                          Copy invite link
                        </>
                      )}
                    </button>
                  )}

                  {onInvite && (
                    <button
                      onClick={onInvite}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-navy-700 hover:bg-navy-800 text-white rounded-lg text-xs font-medium transition-colors"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Invite people
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {/* Actions Tab */}
            {activeTab === 'actions' && (
              <motion.div
                key="actions"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="h-full flex flex-col"
              >
                {/* Add new action */}
                <div className="p-3 border-b border-gray-100">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newAction}
                      onChange={(e) => setNewAction(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newAction.trim() && onAddAction) {
                          onAddAction(newAction);
                          setNewAction('');
                        }
                      }}
                      placeholder="Add action item..."
                      className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
                    />
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        if (newAction.trim() && onAddAction) {
                          onAddAction(newAction);
                          setNewAction('');
                        }
                      }}
                      className="px-3 py-2 bg-navy-500 text-white rounded-lg hover:bg-navy-700"
                    >
                      <Plus className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>

                {/* Actions list */}
                <div className="flex-1 overflow-y-auto p-2">
                  <AnimatePresence mode="popLayout">
                    {actionItems.map((item) => {
                      const assignee = participants.find(p => p.id === item.assigneeId);
                      return (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          layout
                          className={`flex items-start gap-3 p-3 rounded-xl mb-2 transition-colors ${
                            item.isComplete ? 'bg-gray-50' : 'bg-white border border-gray-100 shadow-sm'
                          }`}
                        >
                          <motion.button
                            whileHover={{ scale: 1.15 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => onToggleActionComplete?.(item.id)}
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                              item.isComplete ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 hover:border-emerald-400'
                            }`}
                          >
                            {item.isComplete && <Check className="w-3 h-3 text-white" />}
                          </motion.button>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${item.isComplete ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                              {item.content}
                            </p>
                            <div className="flex items-center gap-2 mt-2 relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowAssigneeDropdown(showAssigneeDropdown === item.id ? null : item.id);
                                }}
                                className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md transition-colors ${
                                  assignee ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:bg-gray-100'
                                }`}
                              >
                                {assignee ? (
                                  <>
                                    <div className="w-4 h-4 rounded-full text-white text-[9px] font-bold flex items-center justify-center" style={{ backgroundColor: assignee.color }}>
                                      {assignee.name.charAt(0)}
                                    </div>
                                    <span>{assignee.name}</span>
                                  </>
                                ) : (
                                  <>
                                    <User className="w-3.5 h-3.5" />
                                    <span>Assign</span>
                                  </>
                                )}
                              </button>
                              <AnimatePresence>
                                {showAssigneeDropdown === item.id && (
                                  <motion.div
                                    initial={{ opacity: 0, y: -5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -5 }}
                                    className="absolute left-0 top-full mt-1 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50 w-36"
                                  >
                                    <button
                                      onClick={() => { onAssignUser?.(item.id, undefined); setShowAssigneeDropdown(null); }}
                                      className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 text-gray-500"
                                    >
                                      Unassigned
                                    </button>
                                    {participants.map(p => (
                                      <button
                                        key={p.id}
                                        onClick={() => { onAssignUser?.(item.id, p.id); setShowAssigneeDropdown(null); }}
                                        className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 flex items-center gap-2"
                                      >
                                        <div className="w-4 h-4 rounded-full text-white text-[9px] font-bold flex items-center justify-center" style={{ backgroundColor: p.color }}>
                                          {p.name.charAt(0)}
                                        </div>
                                        <span className="text-gray-700">{p.name}</span>
                                      </button>
                                    ))}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                  {actionItems.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      <ListTodo className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      <p className="text-sm font-medium">No action items</p>
                      <p className="text-xs mt-1">Add tasks above</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <motion.div
                key="history"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="h-full flex flex-col"
              >
                <div className="p-3 border-b border-gray-100 bg-gray-50/50">
                  <p className="text-sm font-medium text-gray-700">
                    {history.length} state{history.length !== 1 ? 's' : ''} saved
                  </p>
                  <p className="text-xs text-gray-500">Click to restore</p>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {history.map((entry, index) => (
                    <button
                      key={index}
                      onClick={() => onRestoreHistory?.(index)}
                      className={`w-full p-3 text-left border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                        index === currentHistoryIndex ? 'bg-navy-50 border-l-2 border-l-navy-500' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-sm ${index === currentHistoryIndex ? 'font-semibold text-navy-800' : 'text-gray-700'}`}>
                          {entry.action}
                        </span>
                        {index === currentHistoryIndex && (
                          <span className="text-[10px] bg-navy-500 text-white px-2 py-0.5 rounded-full font-medium">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                        <Clock className="w-3 h-3" />
                        {entry.timestamp.toLocaleTimeString()}
                      </div>
                    </button>
                  ))}
                  {history.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      <History className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      <p className="text-sm font-medium">No history</p>
                      <p className="text-xs mt-1">Changes will appear here</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Toggle button - on the left edge */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute -left-12 top-4 w-12 h-12 bg-white rounded-l-xl shadow-lg border border-r-0 border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
      >
        <div className="relative">
          {isExpanded ? (
            <ChevronRight className="w-5 h-5 text-gray-600" />
          ) : (
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          )}
          {/* Notification badges when collapsed */}
          {!isExpanded && (
            <>
              {isRecording && (
                <span className="absolute -top-2 -right-2 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              )}
              {pendingActionsCount > 0 && !isRecording && (
                <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] bg-navy-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {pendingActionsCount}
                </span>
              )}
            </>
          )}
        </div>
      </button>
    </motion.div>
  );
});

UnifiedLeftPanel.displayName = 'UnifiedLeftPanel';

export default UnifiedLeftPanel;
