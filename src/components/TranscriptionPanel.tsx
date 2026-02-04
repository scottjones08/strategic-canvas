/**
 * Professional Transcription Panel Component
 * Features: 
 * - LIVE real-time transcription (very visible during recording)
 * - Auto-save to Notes when recording stops
 * - Speaker diarization
 * - Generate Whiteboard from transcript
 * - Export options
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  StopCircle,
  Pause,
  Play,
  FileText,
  Minimize2,
  Settings,
  Download,
  Upload,
  Users,
  Clock,
  Search,
  X,
  Check,
  Edit2,
  Copy,
  ChevronDown,
  AlertCircle,
  Loader2,
  Sparkles,
  ListTodo,
  MessageSquare,
  Wand2,
  Save,
  Layout,
  ClipboardList,
  Mail,
} from 'lucide-react';
import useTranscription from '../hooks/useTranscription';
import { FullTranscript, formatTimestamp, formatDuration } from '../lib/transcription';
import { MeetingSummary, generateMeetingSummary, SummaryFormat } from '../lib/meeting-summary';

interface TranscriptionPanelProps {
  boardId?: string;
  boardName: string;
  clientId?: string;
  clientName?: string;
  onCreateNote?: (title: string, content: string, actionItems: string[]) => void;
  onGenerateWhiteboard?: (transcript: FullTranscript) => void;
  onGenerateSummary?: (summary: MeetingSummary) => void;
  onDraftEmail?: (transcript: FullTranscript) => void;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
  autoSaveToNotes?: boolean;
  aiApiKey?: string;
}

export default function TranscriptionPanel({
  boardName,
  clientName,
  onCreateNote,
  onGenerateWhiteboard,
  onGenerateSummary,
  onDraftEmail,
  isMinimized = false,
  onToggleMinimize,
  autoSaveToNotes = true,
  aiApiKey,
}: TranscriptionPanelProps) {
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
    getActionItems,
    updateConfig,
  } = useTranscription({
    autoSave: true,
    onTranscriptComplete: (t) => {
      console.log('Transcript complete:', t.segments.length, 'segments');
      // Auto-save to notes when recording stops
      if (autoSaveToNotes && onCreateNote && t.segments.length > 0) {
        const title = `Meeting Transcript - ${boardName} - ${new Date().toLocaleDateString()}`;
        const content = formatTranscriptForNote(t, clientName);
        const actionItems = getActionItems();
        onCreateNote(title, content, actionItems);
        setNoteSaved(true);
        setTimeout(() => setNoteSaved(false), 3000);
      }
    },
  });

  const [showSettings, setShowSettings] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showSpeakerEdit, setShowSpeakerEdit] = useState<string | null>(null);
  const [editingSpeakerName, setEditingSpeakerName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showTimestamps, setShowTimestamps] = useState(true);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [highlightedSegment, setHighlightedSegment] = useState<string | null>(null);
  const [noteSaved, setNoteSaved] = useState(false);
  const [expandedView, setExpandedView] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-expand when recording starts
  useEffect(() => {
    if (isRecording && isMinimized) {
      onToggleMinimize?.();
    }
    if (isRecording) {
      setExpandedView(true);
    }
  }, [isRecording, isMinimized, onToggleMinimize]);

  // Auto-scroll to latest segment
  useEffect(() => {
    if (scrollRef.current && isRecording) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript?.segments.length, isRecording]);

  // Filter segments by search
  const filteredSegments = transcript?.segments.filter(segment =>
    !searchQuery || segment.text.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Handle file upload
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadProgress('Preparing upload...');
    await uploadAudio(file, (_status, message) => {
      setUploadProgress(message);
    });
    setUploadProgress(null);

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
    const actionItems = getActionItems();

    onCreateNote(title, content, actionItems);
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 3000);
  }, [transcript, boardName, clientName, getActionItems, onCreateNote]);

  // Convert transcript to notes and action items
  const handleConvertToNotesAndActions = useCallback(() => {
    if (!transcript || !onCreateNote) return;

    // Create a summary note with key points
    const actionItemsList = getActionItems();
    const title = `Meeting Summary - ${boardName} - ${new Date().toLocaleDateString()}`;
    
    // Format notes with action items highlighted
    let content = `<h3>📋 Meeting Notes</h3>\n\n`;
    content += `<p><strong>Duration:</strong> ${formatDuration(transcript.duration)}</p>\n`;
    content += `<p><strong>Speakers:</strong> ${transcript.speakers.map(s => s.customName || s.label).join(', ')}</p>\n\n`;
    
    // Add key discussion points
    content += `<h4>📝 Key Discussion Points</h4>\n<ul>\n`;
    transcript.segments.forEach(segment => {
      const speaker = transcript.speakers.find(s => s.id === segment.speaker);
      content += `<li><strong>${speaker?.customName || speaker?.label}:</strong> ${segment.text}</li>\n`;
    });
    content += `</ul>\n\n`;
    
    // Add action items section
    if (actionItemsList.length > 0) {
      content += `<h4>✅ Action Items (${actionItemsList.length})</h4>\n<ul>\n`;
      actionItemsList.forEach((item, index) => {
        content += `<li>[ ] ${item}</li>\n`;
      });
      content += `</ul>\n`;
    }
    
    onCreateNote(title, content, actionItemsList);
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 3000);
  }, [transcript, boardName, getActionItems, onCreateNote]);

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
    } catch (error) {
      console.error('Failed to generate summary:', error);
    } finally {
      setIsGeneratingSummary(false);
    }
  }, [transcript, clientName, boardName, aiApiKey, onGenerateSummary]);

  // Open email draft modal
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

  // Minimized view - show recording indicator as a compact pill
  if (isMinimized) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="absolute right-4 top-4 z-[100]"
      >
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onToggleMinimize}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-lg border backdrop-blur-sm transition-all ${
            isRecording
              ? 'bg-red-500/95 border-red-400 text-white'
              : isProcessing
              ? 'bg-amber-500/95 border-amber-400 text-white'
              : 'bg-white/95 border-gray-200/80 hover:bg-white hover:shadow-xl'
          }`}
        >
          <div className={`relative flex items-center justify-center w-6 h-6 rounded-lg ${
            isRecording ? 'bg-white/20' : isProcessing ? 'bg-white/20' : 'bg-navy-100'
          }`}>
            {isRecording ? (
              <>
                <Mic className="w-3.5 h-3.5 text-white" />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-white rounded-full animate-ping" />
              </>
            ) : (
              <FileText className={`w-3.5 h-3.5 ${isProcessing ? 'text-white' : 'text-navy-700'}`} />
            )}
          </div>
          <div className="flex flex-col items-start">
            <span className={`text-sm font-semibold leading-tight ${isRecording || isProcessing ? 'text-white' : 'text-gray-800'}`}>
              {isRecording ? 'Recording' : isProcessing ? 'Processing' : 'Transcript'}
            </span>
            <span className={`text-xs leading-tight ${isRecording || isProcessing ? 'text-white/80' : 'text-gray-500'}`}>
              {isRecording ? formatDuration(duration) : transcript?.segments.length ? `${transcript.segments.length} entries` : 'Click to open'}
            </span>
          </div>
          <ChevronDown className={`w-4 h-4 ml-1 ${isRecording || isProcessing ? 'text-white/70' : 'text-gray-400'}`} />
        </motion.button>
      </motion.div>
    );
  }

  // Expanded recording view - very visible during recording
  if (isRecording && expandedView) {
    return (
      <motion.div
        initial={{ y: 400, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="absolute inset-x-2 sm:inset-x-4 bottom-2 sm:bottom-4 z-50"
      >
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
          {/* Mobile Collapse Bar */}
          <button
            onClick={() => setExpandedView(false)}
            className="sm:hidden w-full py-3 bg-gray-100 border-b border-gray-200 flex items-center justify-center gap-2 active:bg-gray-200 touch-manipulation"
          >
            <ChevronDown className="w-5 h-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-600">Tap to collapse</span>
          </button>

          {/* Recording Header - Red and prominent */}
          <div className="p-3 sm:p-4 bg-gradient-to-r from-red-500 to-red-600 text-white">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <Mic className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-white rounded-full flex items-center justify-center">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-500 rounded-full animate-ping" />
                  </div>
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm sm:text-lg">🔴 LIVE</h3>
                  <div className="flex items-center gap-2 sm:gap-3 text-red-100 text-xs sm:text-base">
                    <span className="font-mono text-base sm:text-xl">{formatDuration(duration)}</span>
                    {transcript && (
                      <>
                        <span className="hidden sm:inline">•</span>
                        <span className="hidden sm:inline">{transcript.segments.length} segments</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                {/* Pause/Resume */}
                <button
                  onClick={isPaused ? resumeRecording : pauseRecording}
                  className={`p-2 sm:p-3 rounded-xl transition-colors ${
                    isPaused ? 'bg-green-500 hover:bg-green-600' : 'bg-white/20 hover:bg-white/30'
                  }`}
                >
                  {isPaused ? <Play className="w-4 h-4 sm:w-5 sm:h-5" /> : <Pause className="w-4 h-4 sm:w-5 sm:h-5" />}
                </button>
                
                {/* Stop */}
                <button
                  onClick={async () => {
                    await stopRecording();
                    setExpandedView(false);
                  }}
                  className="px-3 sm:px-6 py-2 sm:py-3 bg-white text-red-600 rounded-xl font-semibold hover:bg-red-50 transition-colors flex items-center gap-1 sm:gap-2 text-sm sm:text-base"
                >
                  <StopCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline">Stop Recording</span>
                  <span className="sm:hidden">Stop</span>
                </button>
                
                {/* Collapse - desktop only */}
                <button
                  onClick={() => setExpandedView(false)}
                  className="hidden sm:block p-3 bg-white/20 rounded-xl hover:bg-white/30 transition-colors"
                >
                  <Minimize2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Live Transcript Display */}
          <div ref={scrollRef} className="h-64 overflow-y-auto p-4 bg-gray-50">
            {transcript && transcript.segments.length > 0 ? (
              <div className="space-y-3">
                {transcript.segments.map((segment, index) => {
                  const speaker = transcript.speakers.find(s => s.id === segment.speaker);
                  const isLatest = index === transcript.segments.length - 1;
                  
                  return (
                    <motion.div
                      key={segment.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`flex gap-3 p-3 rounded-xl ${isLatest ? 'bg-white shadow-md border-l-4 border-navy-500' : 'bg-white/50'}`}
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                        style={{ backgroundColor: speaker?.color || '#6b7280' }}
                      >
                        {(speaker?.customName || speaker?.label || '?').charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-900" style={{ color: speaker?.color }}>
                            {speaker?.customName || speaker?.label || 'Unknown'}
                          </span>
                          <span className="text-xs text-gray-400">
                            {formatTimestamp(segment.startTime)}
                          </span>
                          {isLatest && (
                            <span className="px-2 py-0.5 bg-navy-100 text-navy-800 rounded-full text-xs font-medium animate-pulse">
                              Latest
                            </span>
                          )}
                        </div>
                        <p className={`text-gray-800 ${isLatest ? 'text-lg font-medium' : ''}`}>
                          {segment.text}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="relative mx-auto w-20 h-20 mb-4">
                    <div className="absolute inset-0 bg-red-200 rounded-full animate-ping opacity-50" />
                    <div className="relative w-20 h-20 bg-red-500 rounded-full flex items-center justify-center">
                      <Mic className="w-10 h-10 text-white animate-pulse" />
                    </div>
                  </div>
                  <p className="text-lg font-medium text-gray-700">Listening...</p>
                  <p className="text-sm text-gray-500 mt-1">Speak clearly into your microphone</p>
                  {!isConfigured && (
                    <p className="text-xs text-amber-600 mt-2">
                      💡 Add an API key in settings for speaker identification
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Auto-save indicator */}
          <div className="px-4 py-2 bg-gray-100 border-t border-gray-200 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-500">
              <Save className="w-4 h-4" />
              <span>Auto-saving to Notes when recording stops</span>
            </div>
            {isPaused && (
              <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                ⏸️ Paused
              </span>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  // Normal panel view
  return (
    <motion.div
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      className="absolute right-2 top-2 sm:right-4 sm:top-4 w-[calc(100vw-16px)] sm:w-[400px] bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden z-[100] flex flex-col border border-gray-200/80"
      style={{ maxHeight: 'calc(100vh - 120px)' }}
    >
      {/* Mobile Collapse Bar - Very prominent on mobile */}
      <button
        onClick={onToggleMinimize}
        className="sm:hidden w-full py-3 bg-gray-100 border-b border-gray-200 flex items-center justify-center gap-2 active:bg-gray-200 touch-manipulation"
      >
        <ChevronDown className="w-5 h-5 text-gray-500 rotate-180" />
        <span className="text-sm font-medium text-gray-600">Tap to collapse</span>
      </button>

      {/* Header */}
      <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-navy-500 to-navy-500 text-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5" />
            <h3 className="font-semibold text-sm sm:text-base">Professional Transcript</h3>
            {!isConfigured && (
              <span className="px-2 py-0.5 bg-amber-400 text-amber-900 text-xs rounded-full font-medium">
                Basic Mode
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={onToggleMinimize}
              className="hidden sm:block p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Recording Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Duration */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 rounded-lg">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-mono">{formatDuration(duration)}</span>
            </div>

            {/* Speaker count */}
            {transcript && transcript.speakers.length > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 rounded-lg">
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
                className={`p-2 rounded-lg transition-colors ${
                  isPaused ? 'bg-green-500 hover:bg-green-600' : 'bg-white/20 hover:bg-white/30'
                }`}
                title={isPaused ? 'Resume' : 'Pause'}
              >
                {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              </button>
            )}

            {/* Main record button */}
            <button
              onClick={async () => {
                if (isRecording) {
                  await stopRecording();
                } else {
                  startRecording();
                  setExpandedView(true);
                }
              }}
              disabled={isProcessing}
              className={`p-3 rounded-full transition-all ${
                isRecording
                  ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                  : isProcessing
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-white hover:bg-gray-100'
              }`}
              title={isRecording ? 'Stop Recording' : 'Start Recording'}
            >
              {isProcessing ? (
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              ) : isRecording ? (
                <StopCircle className="w-5 h-5 text-white" />
              ) : (
                <Mic className="w-5 h-5 text-navy-700" />
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

      {/* Speakers bar */}
      {transcript && transcript.speakers.length > 0 && (
        <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
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
        <div className="px-4 py-2 border-b border-gray-100">
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
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px]">
        {filteredSegments.length > 0 ? (
          <AnimatePresence>
            {filteredSegments.map((segment) => {
              const speaker = transcript?.speakers.find((s) => s.id === segment.speaker);
              const isHighlighted = highlightedSegment === segment.id;

              return (
                <motion.div
                  key={segment.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 p-2 rounded-lg transition-colors ${
                    isHighlighted ? 'bg-navy-50' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setHighlightedSegment(segment.id)}
                >
                  {/* Speaker avatar */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0"
                    style={{ backgroundColor: speaker?.color || '#6b7280' }}
                  >
                    {(speaker?.customName || speaker?.label || '?').charAt(0)}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Speaker name & timestamp */}
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
                    </div>

                    {/* Text content */}
                    <p className="text-sm text-gray-700 leading-relaxed">{segment.text}</p>
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
          <div className="flex items-center justify-center py-12">
            <div className="text-center text-gray-400">
              <MicOff className="w-12 h-12 mx-auto mb-4 opacity-40" />
              <p className="font-medium">Ready to record</p>
              <p className="text-sm mt-1">
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
          {getActionItems().length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-amber-600 mb-2">
              <ListTodo className="w-4 h-4" />
              <span>{getActionItems().length} action items found</span>
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
                        className="absolute bottom-full right-0 mb-2 w-40 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-20"
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

            <div className="flex items-center gap-2">
              {/* Generate Summary button */}
              {onGenerateSummary && (
                <button
                  onClick={() => handleGenerateSummary('executive')}
                  disabled={isGeneratingSummary}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors text-sm font-medium disabled:opacity-50"
                  title="Generate meeting summary"
                >
                  {isGeneratingSummary ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ClipboardList className="w-4 h-4" />
                  )}
                  Summary
                </button>
              )}

              {/* Draft Email button */}
              {onDraftEmail && (
                <button
                  onClick={handleDraftEmail}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-100 text-teal-700 rounded-lg hover:bg-teal-200 transition-colors text-sm font-medium"
                  title="Draft follow-up email"
                >
                  <Mail className="w-4 h-4" />
                  Email
                </button>
              )}

              {/* Generate Whiteboard button */}
              {onGenerateWhiteboard && (
                <button
                  onClick={handleGenerateWhiteboard}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-100 text-navy-700 rounded-lg hover:bg-navy-200 transition-colors text-sm font-medium"
                  title="Extract items and add to whiteboard"
                >
                  <Wand2 className="w-4 h-4" />
                  <Layout className="w-4 h-4" />
                </button>
              )}

              {/* Create Notes & Actions button */}
              {onCreateNote && (
                <button
                  onClick={handleConvertToNotesAndActions}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
                  title="Convert transcript to notes and action items"
                >
                  <Sparkles className="w-4 h-4" />
                  Notes & Actions
                </button>
              )}

              {/* Save as note button */}
              {onCreateNote && (
                <button
                  onClick={handleSaveAsNote}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-700 text-white rounded-lg hover:bg-navy-800 transition-colors text-sm font-medium"
                >
                  <FileText className="w-4 h-4" />
                  Save as Note
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

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
