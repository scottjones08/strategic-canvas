/**
 * Unified Sidebar Component
 * Combines Transcript, Actions, Participants, and History into one tabbed panel
 * Positioned on the left side to avoid canvas overlap
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  ListTodo,
  Users,
  History,
  ChevronLeft,
  ChevronRight,
  Mic,
  MicOff,
  StopCircle,
  Plus,
  Check,
  User,
  Clock,
  Edit2,
  Loader2,
  Save,
  Download,
} from 'lucide-react';

// Types
interface ActionItem {
  id: string;
  content: string;
  isComplete: boolean;
  assigneeId?: string;
}

interface Participant {
  id: string;
  name: string;
  color: string;
  isActive?: boolean;
}

interface HistoryEntry {
  nodes: any[];
  timestamp: Date;
  action: string;
}

interface TranscriptSegment {
  id: string;
  speaker: string;
  speakerLabel?: string;
  text: string;
  startTime: number;
  confidence: number;
}

interface TranscriptSpeaker {
  id: string;
  label: string;
  customName?: string;
  color: string;
}

interface FullTranscript {
  segments: TranscriptSegment[];
  speakers: TranscriptSpeaker[];
  duration: number;
  createdAt: Date;
}

interface UnifiedSidebarProps {
  // Transcript props
  isRecording: boolean;
  isPaused?: boolean;
  isProcessing?: boolean;
  transcript?: FullTranscript | null;
  recordingDuration: number;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onPauseRecording?: () => void;
  onResumeRecording?: () => void;
  onSaveTranscript?: () => void;
  onExportTranscript?: (format: 'text' | 'markdown') => void;

  // Action items props
  actionItems: ActionItem[];
  onToggleActionComplete: (id: string) => void;
  onAddAction: (content: string) => void;
  onAssignUser: (id: string, assigneeId: string | undefined) => void;
  participants: Participant[];

  // Participants/Users props
  currentUser: { id: string; name: string; color: string };
  collaborators: Participant[];
  onEditUserName: () => void;

  // History props
  history: HistoryEntry[];
  currentHistoryIndex: number;
  onRestoreHistory: (index: number) => void;

  // General props
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  defaultTab?: 'transcript' | 'actions' | 'participants' | 'history';
}

type TabType = 'transcript' | 'actions' | 'participants' | 'history';

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const formatTimestamp = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function UnifiedSidebar({
  // Transcript
  isRecording,
  isPaused: _isPaused = false,
  isProcessing = false,
  transcript,
  recordingDuration,
  onStartRecording,
  onStopRecording,
  onPauseRecording: _onPauseRecording,
  onResumeRecording: _onResumeRecording,
  onSaveTranscript,
  onExportTranscript,
  // Actions
  actionItems,
  onToggleActionComplete,
  onAddAction,
  onAssignUser,
  participants,
  // Users
  currentUser,
  collaborators,
  onEditUserName,
  // History
  history,
  currentHistoryIndex,
  onRestoreHistory,
  // General
  isCollapsed = false,
  onToggleCollapse,
  defaultTab = 'actions',
}: UnifiedSidebarProps) {
  const [activeTab, setActiveTab] = useState<TabType>(defaultTab);
  const [newAction, setNewAction] = useState('');
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-switch to transcript tab when recording starts
  useEffect(() => {
    if (isRecording) {
      setActiveTab('transcript');
    }
  }, [isRecording]);

  // Auto-scroll transcript
  useEffect(() => {
    if (scrollRef.current && isRecording && activeTab === 'transcript') {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript?.segments.length, isRecording, activeTab]);

  const pendingActionsCount = actionItems.filter(a => !a.isComplete).length;
  const activeCollaborators = collaborators.filter(c => c.isActive !== false);

  const tabs: { id: TabType; label: string; icon: typeof FileText; badge?: number | string }[] = [
    {
      id: 'transcript',
      label: 'Transcript',
      icon: FileText,
      badge: isRecording ? formatDuration(recordingDuration) : (transcript?.segments.length || undefined)
    },
    {
      id: 'actions',
      label: 'Actions',
      icon: ListTodo,
      badge: pendingActionsCount > 0 ? pendingActionsCount : undefined
    },
    {
      id: 'participants',
      label: 'People',
      icon: Users,
      badge: activeCollaborators.length > 0 ? activeCollaborators.length + 1 : undefined
    },
    {
      id: 'history',
      label: 'History',
      icon: History,
      badge: history.length > 1 ? history.length : undefined
    },
  ];

  // Collapsed view
  if (isCollapsed) {
    return (
      <motion.div
        initial={{ x: -60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="fixed left-4 top-20 z-[100] flex flex-col gap-2"
      >
        {tabs.map((tab) => (
          <motion.button
            key={tab.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setActiveTab(tab.id);
              onToggleCollapse?.();
            }}
            className={`relative p-3 rounded-xl shadow-lg border transition-all ${
              tab.id === 'transcript' && isRecording
                ? 'bg-red-500 border-red-400 text-white animate-pulse'
                : 'bg-white/95 backdrop-blur-sm border-gray-200/80 hover:bg-white hover:shadow-xl'
            }`}
          >
            <tab.icon className={`w-5 h-5 ${
              tab.id === 'transcript' && isRecording ? 'text-white' : 'text-gray-600'
            }`} />
            {tab.badge && (
              <span className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] text-[10px] font-bold rounded-full flex items-center justify-center px-1 ${
                tab.id === 'transcript' && isRecording
                  ? 'bg-white text-red-600'
                  : 'bg-indigo-500 text-white'
              }`}>
                {tab.badge}
              </span>
            )}
          </motion.button>
        ))}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onToggleCollapse}
          className="p-3 rounded-xl bg-white/95 backdrop-blur-sm border border-gray-200/80 shadow-lg hover:bg-white hover:shadow-xl"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </motion.button>
      </motion.div>
    );
  }

  // Expanded view
  return (
    <motion.div
      initial={{ x: -400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -400, opacity: 0 }}
      className="fixed left-4 top-20 bottom-20 w-[360px] bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/80 z-[100] flex flex-col overflow-hidden"
    >
      {/* Header with tabs */}
      <div className="border-b border-gray-100 bg-gray-50/80">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? tab.id === 'transcript' && isRecording
                      ? 'bg-red-500 text-white'
                      : 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.badge && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.id
                      ? tab.id === 'transcript' && isRecording
                        ? 'bg-white/30 text-white'
                        : 'bg-indigo-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
          <button
            onClick={onToggleCollapse}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Tab content */}
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
              {/* Recording controls */}
              <div className={`p-4 border-b ${isRecording ? 'bg-red-50' : 'bg-gray-50/50'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={isRecording ? onStopRecording : onStartRecording}
                      disabled={isProcessing}
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                        isRecording
                          ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                          : isProcessing
                          ? 'bg-gray-300 cursor-not-allowed'
                          : 'bg-indigo-500 hover:bg-indigo-600'
                      }`}
                    >
                      {isProcessing ? (
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      ) : isRecording ? (
                        <StopCircle className="w-6 h-6 text-white" />
                      ) : (
                        <Mic className="w-6 h-6 text-white" />
                      )}
                    </motion.button>
                    <div>
                      <p className={`font-semibold text-sm ${isRecording ? 'text-red-700' : 'text-gray-700'}`}>
                        {isRecording ? 'Recording...' : isProcessing ? 'Processing...' : 'Ready to record'}
                      </p>
                      <p className="text-xs text-gray-500 font-mono">
                        {formatDuration(recordingDuration)}
                        {transcript && ` · ${transcript.segments.length} segments`}
                      </p>
                    </div>
                  </div>
                  {transcript && transcript.segments.length > 0 && (
                    <div className="flex gap-1">
                      {onSaveTranscript && (
                        <button onClick={onSaveTranscript} className="p-2 hover:bg-gray-200 rounded-lg" title="Save as note">
                          <Save className="w-4 h-4 text-gray-500" />
                        </button>
                      )}
                      {onExportTranscript && (
                        <button onClick={() => onExportTranscript('markdown')} className="p-2 hover:bg-gray-200 rounded-lg" title="Export">
                          <Download className="w-4 h-4 text-gray-500" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Transcript content */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {transcript && transcript.segments.length > 0 ? (
                  transcript.segments.map((segment, index) => {
                    const speaker = transcript.speakers.find(s => s.id === segment.speaker);
                    const isLatest = index === transcript.segments.length - 1;
                    return (
                      <motion.div
                        key={segment.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex gap-3 p-3 rounded-xl ${
                          isLatest && isRecording ? 'bg-indigo-50 border-l-2 border-indigo-500' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ backgroundColor: speaker?.color || '#6b7280' }}
                        >
                          {(speaker?.customName || speaker?.label || '?').charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm" style={{ color: speaker?.color }}>
                              {speaker?.customName || speaker?.label || 'Unknown'}
                            </span>
                            <span className="text-xs text-gray-400">{formatTimestamp(segment.startTime)}</span>
                          </div>
                          <p className="text-sm text-gray-700">{segment.text}</p>
                        </div>
                      </motion.div>
                    );
                  })
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center text-gray-400">
                      <MicOff className="w-12 h-12 mx-auto mb-3 opacity-40" />
                      <p className="font-medium">No transcript yet</p>
                      <p className="text-sm mt-1">Click the microphone to start recording</p>
                    </div>
                  </div>
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
              <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newAction}
                    onChange={(e) => setNewAction(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newAction.trim()) {
                        onAddAction(newAction);
                        setNewAction('');
                      }
                    }}
                    placeholder="Add new action item..."
                    className="flex-1 px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      if (newAction.trim()) {
                        onAddAction(newAction);
                        setNewAction('');
                      }
                    }}
                    className="px-4 py-2.5 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600"
                  >
                    <Plus className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>

              {/* Actions list */}
              <div className="flex-1 overflow-y-auto p-3">
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
                          onClick={() => onToggleActionComplete(item.id)}
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
                                    onClick={() => { onAssignUser(item.id, undefined); setShowAssigneeDropdown(null); }}
                                    className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 text-gray-500"
                                  >
                                    Unassigned
                                  </button>
                                  {participants.map(p => (
                                    <button
                                      key={p.id}
                                      onClick={() => { onAssignUser(item.id, p.id); setShowAssigneeDropdown(null); }}
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
                  <div className="text-center py-12 text-gray-400">
                    <ListTodo className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    <p className="font-medium">No action items yet</p>
                    <p className="text-sm mt-1">Add your first task above</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Participants Tab */}
          {activeTab === 'participants' && (
            <motion.div
              key="participants"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="h-full flex flex-col"
            >
              {/* Current user */}
              <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
                      style={{ backgroundColor: currentUser.color }}
                    >
                      {currentUser.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{currentUser.name}</p>
                      <p className="text-xs text-gray-500">You</p>
                    </div>
                  </div>
                  <button
                    onClick={onEditUserName}
                    className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Collaborators */}
              <div className="flex-1 overflow-y-auto p-4">
                {activeCollaborators.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Active Collaborators
                    </p>
                    {activeCollaborators.map((user) => (
                      <motion.div
                        key={user.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100"
                      >
                        <div className="relative">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                            style={{ backgroundColor: user.color }}
                          >
                            {user.name.charAt(0)}
                          </div>
                          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 text-sm">{user.name}</p>
                          <p className="text-xs text-gray-500">Active now</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    <p className="font-medium">Just you here</p>
                    <p className="text-sm mt-1">Share the board to collaborate</p>
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
              <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                <p className="text-sm font-medium text-gray-700">
                  {history.length} state{history.length !== 1 ? 's' : ''} saved
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Click to restore any previous state</p>
              </div>
              <div className="flex-1 overflow-y-auto">
                {history.map((entry, index) => (
                  <button
                    key={index}
                    onClick={() => onRestoreHistory(index)}
                    className={`w-full p-4 text-left border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                      index === currentHistoryIndex ? 'bg-indigo-50 border-l-2 border-l-indigo-500' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-sm ${index === currentHistoryIndex ? 'font-semibold text-indigo-700' : 'text-gray-700'}`}>
                        {entry.action}
                      </span>
                      {index === currentHistoryIndex && (
                        <span className="text-[10px] bg-indigo-500 text-white px-2 py-0.5 rounded-full font-medium">
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
                  <div className="text-center py-12 text-gray-400">
                    <History className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    <p className="font-medium">No history yet</p>
                    <p className="text-sm mt-1">Changes will appear here</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
