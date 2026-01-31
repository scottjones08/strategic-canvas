/**
 * Post-Meeting Automation System
 * Comprehensive after-meeting workflow with AI summary generation, action items,
 * follow-up emails, export options, and analytics
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  FileText,
  CheckCircle,
  ListTodo,
  Mail,
  Download,
  Copy,
  Clock,
  Users,
  ChevronDown,
  Edit2,
  Check,
  X,
  Loader2,
  RefreshCw,
  Send,
  Calendar,
  AlertCircle,
  BarChart3,
  MessageSquare,
  Target,
  ArrowRight,
  Trash2,
  Plus,
  User,
  Hash,
  TrendingUp,
  Smile,
  FileDown,
  Link,
  CheckSquare,
  Save,
  MoreHorizontal,
  Filter,
  Search,
  ExternalLink,
} from 'lucide-react';
import {
  ActionItem,
  MeetingSummary,
  FollowUpEmail,
  EmailTone,
  formatSummaryAsText,
  formatSummaryAsMarkdown,
  generateMeetingSummary,
  generateFollowUpEmail,
} from '../lib/meeting-summary';

// ============================================
// TYPES & INTERFACES
// ============================================

interface TranscriptSegment {
  speaker: string;
  text: string;
  timestamp: Date;
}

interface Participant {
  name: string;
  email: string;
}

export interface PostMeetingAutomationProps {
  meetingId: string;
  transcript: TranscriptSegment[];
  participants: Participant[];
  meetingDuration: number;
  onGenerateSummary?: () => Promise<{ summary: string; keyPoints: string[]; decisions: string[] }>;
  onSendFollowUp?: (emailContent: string, recipients: string[]) => Promise<void>;
  onExportNotes?: (format: 'pdf' | 'clipboard') => void;
  onSaveActionItems?: (items: ActionItem[]) => Promise<void>;
  onSyncToCRM?: (data: { summary: MeetingSummary; actionItems: ActionItem[] }) => Promise<void>;
  aiApiKey?: string;
  className?: string;
}

type TabId = 'summary' | 'actions' | 'email' | 'export' | 'analytics';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function PostMeetingAutomation({
  meetingId,
  transcript,
  participants,
  meetingDuration,
  onGenerateSummary,
  onSendFollowUp,
  onExportNotes,
  onSaveActionItems,
  onSyncToCRM,
  aiApiKey,
  className = '',
}: PostMeetingAutomationProps) {
  // Active tab state
  const [activeTab, setActiveTab] = useState<TabId>('summary');

  // Processing states
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Data states
  const [summary, setSummary] = useState<MeetingSummary | null>(null);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [email, setEmail] = useState<FollowUpEmail | null>(null);

  // UI states
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Helper to show notifications
  const showNotification = useCallback((type: Notification['type'], message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  }, []);

  // Generate meeting summary
  const handleGenerateSummary = useCallback(async () => {
    setIsGeneratingSummary(true);
    try {
      let result: MeetingSummary;

      if (onGenerateSummary) {
        // Use custom generator if provided
        const customResult = await onGenerateSummary();
        result = {
          id: meetingId,
          overview: customResult.summary,
          keyPoints: customResult.keyPoints,
          decisions: customResult.decisions,
          actionItems: [],
          openQuestions: [],
          nextSteps: [],
          generatedAt: new Date(),
          format: 'executive',
        };
      } else {
        // Use default generator
        const transcriptText = transcript.map(t => `[${t.speaker}]: ${t.text}`).join('\n');
        result = await generateMeetingSummary(transcriptText, {
          format: 'executive',
          aiApiKey,
        });
      }

      setSummary(result);
      setActionItems(result.actionItems || []);
      showNotification('success', 'Meeting summary generated successfully!');
    } catch (error) {
      showNotification('error', 'Failed to generate summary. Please try again.');
      console.error('Summary generation error:', error);
    } finally {
      setIsGeneratingSummary(false);
    }
  }, [meetingId, transcript, onGenerateSummary, aiApiKey, showNotification]);

  // Auto-generate summary on mount if transcript exists
  useEffect(() => {
    if (transcript.length > 0 && !summary && !isGeneratingSummary) {
      handleGenerateSummary();
    }
  }, [transcript, summary, isGeneratingSummary, handleGenerateSummary]);

  // Tab configuration
  const tabs = useMemo(() => [
    { id: 'summary' as TabId, label: 'AI Summary', icon: Sparkles, count: summary ? 1 : 0 },
    { id: 'actions' as TabId, label: 'Action Items', icon: ListTodo, count: actionItems.length },
    { id: 'email' as TabId, label: 'Follow-up Email', icon: Mail, count: email ? 1 : 0 },
    { id: 'export' as TabId, label: 'Export', icon: Download },
    { id: 'analytics' as TabId, label: 'Analytics', icon: BarChart3 },
  ], [summary, actionItems.length, email]);

  return (
    <div className={`bg-gray-50 min-h-full ${className}`}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Post-Meeting Automation</h1>
            <p className="text-sm text-gray-500 mt-1">
              Meeting ID: <span className="font-mono text-gray-700">{meetingId}</span>
              {' • '}
              <span className="flex items-center gap-1 inline-flex">
                <Clock className="w-3.5 h-3.5" />
                {formatDuration(meetingDuration)}
              </span>
              {' • '}
              <span className="flex items-center gap-1 inline-flex">
                <Users className="w-3.5 h-3.5" />
                {participants.length} participants
              </span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            {!summary && (
              <button
                onClick={handleGenerateSummary}
                disabled={isGeneratingSummary}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-indigo-200 transition-all disabled:opacity-50"
              >
                {isGeneratingSummary ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Summary
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 mt-6 -mb-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-medium transition-all relative ${
                activeTab === tab.id
                  ? 'text-indigo-600 bg-indigo-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                  activeTab === tab.id ? 'bg-indigo-200 text-indigo-700' : 'bg-gray-200 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              )}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'summary' && (
            <SummaryTab
              key="summary"
              summary={summary}
              isGenerating={isGeneratingSummary}
              onGenerate={handleGenerateSummary}
              onUpdate={setSummary}
            />
          )}
          {activeTab === 'actions' && (
            <ActionItemsTab
              key="actions"
              actionItems={actionItems}
              participants={participants}
              onUpdate={setActionItems}
              onSave={onSaveActionItems}
              showNotification={showNotification}
            />
          )}
          {activeTab === 'email' && (
            <EmailTab
              key="email"
              summary={summary}
              participants={participants}
              email={email}
              setEmail={setEmail}
              isSending={isSendingEmail}
              setIsSending={setIsSendingEmail}
              onSend={onSendFollowUp}
              showNotification={showNotification}
              aiApiKey={aiApiKey}
            />
          )}
          {activeTab === 'export' && (
            <ExportTab
              key="export"
              summary={summary}
              actionItems={actionItems}
              transcript={transcript}
              isExporting={isExporting}
              setIsExporting={setIsExporting}
              onExport={onExportNotes}
              showNotification={showNotification}
            />
          )}
          {activeTab === 'analytics' && (
            <AnalyticsTab
              key="analytics"
              transcript={transcript}
              meetingDuration={meetingDuration}
              participants={participants}
              summary={summary}
              actionItems={actionItems}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Notifications */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        <AnimatePresence>
          {notifications.map((notification) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100 }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg ${
                notification.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' :
                notification.type === 'error' ? 'bg-red-50 border border-red-200 text-red-800' :
                'bg-blue-50 border border-blue-200 text-blue-800'
              }`}
            >
              {notification.type === 'success' && <Check className="w-5 h-5" />}
              {notification.type === 'error' && <AlertCircle className="w-5 h-5" />}
              {notification.type === 'info' && <MessageSquare className="w-5 h-5" />}
              <span className="text-sm font-medium">{notification.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ============================================
// TAB COMPONENTS
// ============================================

// --- Summary Tab ---
interface SummaryTabProps {
  summary: MeetingSummary | null;
  isGenerating: boolean;
  onGenerate: () => void;
  onUpdate: (summary: MeetingSummary) => void;
}

function SummaryTab({ summary, isGenerating, onGenerate, onUpdate }: SummaryTabProps) {
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editIndex, setEditIndex] = useState<number>(-1);

  const startEditing = useCallback((section: string, value: string, index: number = -1) => {
    setEditingSection(section);
    setEditValue(value);
    setEditIndex(index);
  }, []);

  const saveEdit = useCallback(() => {
    if (!editingSection || !summary) return;

    const updated = { ...summary };
    if (editingSection === 'overview') {
      updated.overview = editValue;
    } else if (editingSection === 'keyPoints' && editIndex >= 0) {
      updated.keyPoints = [...summary.keyPoints];
      updated.keyPoints[editIndex] = editValue;
    } else if (editingSection === 'decisions' && editIndex >= 0) {
      updated.decisions = [...summary.decisions];
      updated.decisions[editIndex] = editValue;
    } else if (editingSection === 'nextSteps' && editIndex >= 0) {
      updated.nextSteps = [...summary.nextSteps];
      updated.nextSteps[editIndex] = editValue;
    }

    onUpdate(updated);
    setEditingSection(null);
    setEditIndex(-1);
  }, [editingSection, editValue, editIndex, summary, onUpdate]);

  if (isGenerating) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex flex-col items-center justify-center py-20"
      >
        <div className="relative">
          <motion.div
            className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center"
            animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Sparkles className="w-10 h-10 text-white" />
          </motion.div>
          <motion.div
            className="absolute -bottom-1 -right-1 w-8 h-8 bg-white rounded-full shadow flex items-center justify-center"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <Loader2 className="w-5 h-5 text-indigo-600" />
          </motion.div>
        </div>
        <h3 className="mt-6 text-lg font-semibold text-gray-900">Generating AI Summary...</h3>
        <p className="text-gray-500 mt-1">Analyzing transcript and extracting key insights</p>

        {/* Progress steps */}
        <div className="mt-8 flex items-center gap-4">
          {['Reading transcript', 'Extracting key points', 'Identifying decisions', 'Formatting summary'].map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <motion.div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  i < 2 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                }`}
                animate={i === 2 ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                {i < 2 ? <Check className="w-4 h-4" /> : i + 1}
              </motion.div>
              <span className={`text-sm ${i < 2 ? 'text-green-600' : 'text-gray-500'}`}>{step}</span>
            </div>
          ))}
        </div>
      </motion.div>
    );
  }

  if (!summary) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex flex-col items-center justify-center py-20"
      >
        <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center">
          <FileText className="w-10 h-10 text-gray-400" />
        </div>
        <h3 className="mt-6 text-lg font-semibold text-gray-900">No Summary Generated Yet</h3>
        <p className="text-gray-500 mt-1 max-w-md text-center">
          Generate an AI-powered summary of your meeting to extract key points, decisions, and action items.
        </p>
        <button
          onClick={onGenerate}
          className="mt-6 flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
        >
          <Sparkles className="w-5 h-5" />
          Generate Summary
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      {/* Overview Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Executive Summary</h3>
              <p className="text-sm text-gray-500">AI-generated overview of the meeting</p>
            </div>
          </div>
          <button
            onClick={() => startEditing('overview', summary.overview)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          {editingSection === 'overview' ? (
            <div className="space-y-3">
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                rows={4}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setEditingSection(null)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <p className="text-gray-700 leading-relaxed">{summary.overview}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Key Discussion Points */}
        <SummarySectionCard
          title="Key Discussion Points"
          icon={MessageSquare}
          iconColor="text-blue-500"
          iconBg="bg-blue-50"
          items={summary.keyPoints}
          editingSection={editingSection}
          editIndex={editIndex}
          editValue={editValue}
          onStartEdit={(value, index) => startEditing('keyPoints', value, index)}
          onSave={saveEdit}
          onCancel={() => setEditingSection(null)}
          onChange={setEditValue}
          onDelete={(index) => {
            const updated = { ...summary, keyPoints: summary.keyPoints.filter((_, i) => i !== index) };
            onUpdate(updated);
          }}
          bulletColor="bg-blue-500"
        />

        {/* Decisions Made */}
        <SummarySectionCard
          title="Decisions Made"
          icon={Target}
          iconColor="text-purple-500"
          iconBg="bg-purple-50"
          items={summary.decisions}
          editingSection={editingSection}
          editIndex={editIndex}
          editValue={editValue}
          onStartEdit={(value, index) => startEditing('decisions', value, index)}
          onSave={saveEdit}
          onCancel={() => setEditingSection(null)}
          onChange={setEditValue}
          onDelete={(index) => {
            const updated = { ...summary, decisions: summary.decisions.filter((_, i) => i !== index) };
            onUpdate(updated);
          }}
          iconElement={<CheckCircle className="w-4 h-4 text-purple-500" />}
        />

        {/* Next Steps */}
        <SummarySectionCard
          title="Topics for Next Meeting"
          icon={ArrowRight}
          iconColor="text-teal-500"
          iconBg="bg-teal-50"
          items={summary.nextSteps}
          editingSection={editingSection}
          editIndex={editIndex}
          editValue={editValue}
          onStartEdit={(value, index) => startEditing('nextSteps', value, index)}
          onSave={saveEdit}
          onCancel={() => setEditingSection(null)}
          onChange={setEditValue}
          onDelete={(index) => {
            const updated = { ...summary, nextSteps: summary.nextSteps.filter((_, i) => i !== index) };
            onUpdate(updated);
          }}
          numbered
        />
      </div>
    </motion.div>
  );
}

// --- Action Items Tab ---
interface ActionItemsTabProps {
  actionItems: ActionItem[];
  participants: Participant[];
  onUpdate: (items: ActionItem[]) => void;
  onSave?: (items: ActionItem[]) => Promise<void>;
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void;
}

function ActionItemsTab({ actionItems, participants, onUpdate, onSave, showNotification }: ActionItemsTabProps) {
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newTask, setNewTask] = useState('');
  const [newOwner, setNewOwner] = useState('');
  const [newPriority, setNewPriority] = useState<ActionItem['priority']>('medium');
  const [newDueDate, setNewDueDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const filteredItems = useMemo(() => {
    return actionItems.filter(item => {
      if (filter !== 'all' && item.priority !== filter) return false;
      if (searchQuery && !item.task.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [actionItems, filter, searchQuery]);

  const addActionItem = useCallback(() => {
    if (!newTask.trim()) return;

    const newItem: ActionItem = {
      task: newTask.trim(),
      owner: newOwner || undefined,
      priority: newPriority,
      dueDate: newDueDate || undefined,
    };

    onUpdate([...actionItems, newItem]);
    setNewTask('');
    setNewOwner('');
    setNewPriority('medium');
    setNewDueDate('');
    setIsAdding(false);
    showNotification('success', 'Action item added');
  }, [newTask, newOwner, newPriority, newDueDate, actionItems, onUpdate, showNotification]);

  const updateItem = useCallback((index: number, updates: Partial<ActionItem>) => {
    const updated = actionItems.map((item, i) => i === index ? { ...item, ...updates } : item);
    onUpdate(updated);
  }, [actionItems, onUpdate]);

  const deleteItem = useCallback((index: number) => {
    onUpdate(actionItems.filter((_, i) => i !== index));
    showNotification('info', 'Action item removed');
  }, [actionItems, onUpdate, showNotification]);

  const handleSave = useCallback(async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      await onSave(actionItems);
      showNotification('success', 'Action items saved successfully');
    } catch (error) {
      showNotification('error', 'Failed to save action items');
    } finally {
      setIsSaving(false);
    }
  }, [onSave, actionItems, showNotification]);

  const priorityColors = {
    high: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100' },
    medium: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100' },
    low: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', badge: 'bg-green-100' },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Filter */}
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1">
            {(['all', 'high', 'medium', 'low'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setFilter(p)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === p
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {p === 'all' ? 'All' : p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </button>
          {onSave && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Total Tasks"
          value={actionItems.length}
          icon={ListTodo}
          color="indigo"
        />
        <StatCard
          label="High Priority"
          value={actionItems.filter(i => i.priority === 'high').length}
          icon={AlertCircle}
          color="red"
        />
        <StatCard
          label="With Owner"
          value={actionItems.filter(i => i.owner).length}
          icon={User}
          color="green"
        />
        <StatCard
          label="With Due Date"
          value={actionItems.filter(i => i.dueDate).length}
          icon={Calendar}
          color="blue"
        />
      </div>

      {/* Add New Action Item */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white border border-gray-200 rounded-2xl p-6"
          >
            <h4 className="font-medium text-gray-900 mb-4">Add New Action Item</h4>
            <div className="space-y-4">
              <input
                type="text"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder="Task description..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
              <div className="grid grid-cols-3 gap-4">
                <select
                  value={newOwner}
                  onChange={(e) => setNewOwner(e.target.value)}
                  className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                >
                  <option value="">Assign to...</option>
                  {participants.map((p) => (
                    <option key={p.email} value={p.name}>{p.name}</option>
                  ))}
                </select>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as ActionItem['priority'])}
                  className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                >
                  <option value="high">High Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="low">Low Priority</option>
                </select>
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={addActionItem}
                  disabled={!newTask.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  Add Action Item
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Items List */}
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 bg-white border border-gray-200 rounded-2xl">
            <CheckSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No action items found</p>
            <p className="text-sm text-gray-400 mt-1">
              {actionItems.length === 0 ? 'Add your first action item above' : 'Try adjusting your filters'}
            </p>
          </div>
        ) : (
          filteredItems.map((item, index) => {
            const colors = item.priority ? priorityColors[item.priority] : priorityColors.medium;
            const originalIndex = actionItems.indexOf(item);

            return (
              <motion.div
                key={originalIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`p-4 rounded-xl border ${colors.border} ${colors.bg} group`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-5 h-5 rounded border-2 border-gray-400/50" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 font-medium">{item.task}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-2">
                      {/* Owner */}
                      <select
                        value={item.owner || ''}
                        onChange={(e) => updateItem(originalIndex, { owner: e.target.value || undefined })}
                        className="text-xs px-2 py-1 bg-white/80 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Unassigned</option>
                        {participants.map((p) => (
                          <option key={p.email} value={p.name}>{p.name}</option>
                        ))}
                      </select>

                      {/* Due Date */}
                      <input
                        type="date"
                        value={item.dueDate || ''}
                        onChange={(e) => updateItem(originalIndex, { dueDate: e.target.value || undefined })}
                        className="text-xs px-2 py-1 bg-white/80 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />

                      {/* Priority */}
                      <select
                        value={item.priority || 'medium'}
                        onChange={(e) => updateItem(originalIndex, { priority: e.target.value as ActionItem['priority'] })}
                        className={`text-xs px-2 py-1 rounded-lg font-medium border-0 ${colors.badge} ${colors.text}`}
                      >
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteItem(originalIndex)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}

// --- Email Tab ---
interface EmailTabProps {
  summary: MeetingSummary | null;
  participants: Participant[];
  email: FollowUpEmail | null;
  setEmail: (email: FollowUpEmail | null) => void;
  isSending: boolean;
  setIsSending: (value: boolean) => void;
  onSend?: (emailContent: string, recipients: string[]) => Promise<void>;
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void;
  aiApiKey?: string;
}

function EmailTab({ summary, participants, email, setEmail, isSending, setIsSending, onSend, showNotification, aiApiKey }: EmailTabProps) {
  const [tone, setTone] = useState<EmailTone>('formal');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedBody, setEditedBody] = useState('');
  const [editedSubject, setEditedSubject] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>(participants.map(p => p.email));
  const [showRecipientDropdown, setShowRecipientDropdown] = useState(false);

  const generateEmail = useCallback(async () => {
    if (!summary) return;

    setIsGenerating(true);
    try {
      const generatedEmail = await generateFollowUpEmail(summary, {
        tone,
        includeActionItems: true,
        includeDecisions: true,
        includeNextSteps: true,
        recipientName: participants[0]?.name || 'Team',
        aiApiKey,
      });
      setEmail(generatedEmail);
      setEditedSubject(generatedEmail.subject);
      setEditedBody(generatedEmail.body);
      showNotification('success', 'Email generated successfully');
    } catch (error) {
      showNotification('error', 'Failed to generate email');
    } finally {
      setIsGenerating(false);
    }
  }, [summary, tone, participants, aiApiKey, setEmail, showNotification]);

  const handleSend = useCallback(async () => {
    if (!email || selectedRecipients.length === 0) return;

    setIsSending(true);
    try {
      const content = isEditing ? editedBody : email.body;
      if (onSend) {
        await onSend(content, selectedRecipients);
      }
      showNotification('success', 'Follow-up email sent successfully');
    } catch (error) {
      showNotification('error', 'Failed to send email');
    } finally {
      setIsSending(false);
    }
  }, [email, selectedRecipients, isEditing, editedBody, onSend, showNotification, setIsSending]);

  const copyToClipboard = useCallback(async () => {
    if (!email) return;
    const content = isEditing ? editedBody : email.body;
    await navigator.clipboard.writeText(`Subject: ${email.subject}\n\n${content}`);
    showNotification('success', 'Email copied to clipboard');
  }, [email, isEditing, editedBody, showNotification]);

  const toneConfig: Record<EmailTone, { label: string; emoji: string; description: string }> = {
    formal: { label: 'Formal', emoji: '👔', description: 'Professional and structured' },
    casual: { label: 'Casual', emoji: '👋', description: 'Relaxed but professional' },
    friendly: { label: 'Friendly', emoji: '😊', description: 'Warm and personable' },
  };

  if (!summary) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-20"
      >
        <Mail className="w-16 h-16 text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900">Generate Summary First</h3>
        <p className="text-gray-500 mt-1">Create a meeting summary to generate a follow-up email</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      {/* Email Composer Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="w-6 h-6" />
              <h3 className="font-semibold">Follow-up Email Composer</h3>
            </div>
            <div className="flex items-center gap-2">
              {!email ? (
                <button
                  onClick={generateEmail}
                  disabled={isGenerating}
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Generate Email
                </button>
              ) : (
                <button
                  onClick={() => {
                    setIsEditing(!isEditing);
                    if (!isEditing) {
                      setEditedSubject(email.subject);
                      setEditedBody(email.body);
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  {isEditing ? 'Done Editing' : 'Edit'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Email Configuration */}
        <div className="px-6 py-4 border-b border-gray-100 space-y-4">
          {/* Tone Selector */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-600">Tone:</span>
            <div className="flex items-center gap-2">
              {(['formal', 'casual', 'friendly'] as EmailTone[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTone(t)}
                  disabled={isGenerating}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    tone === t
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <span>{toneConfig[t].emoji}</span>
                  <span>{toneConfig[t].label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Recipients */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-600">To:</span>
            <div className="relative">
              <button
                onClick={() => setShowRecipientDropdown(!showRecipientDropdown)}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm transition-colors"
              >
                <span>{selectedRecipients.length} recipients</span>
                <ChevronDown className="w-4 h-4" />
              </button>

              <AnimatePresence>
                {showRecipientDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowRecipientDropdown(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute left-0 top-full mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-20"
                    >
                      {participants.map((p) => (
                        <label
                          key={p.email}
                          className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedRecipients.includes(p.email)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedRecipients([...selectedRecipients, p.email]);
                              } else {
                                setSelectedRecipients(selectedRecipients.filter(r => r !== p.email));
                              }
                            }}
                            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                          />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{p.name}</p>
                            <p className="text-xs text-gray-500">{p.email}</p>
                          </div>
                        </label>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Email Preview */}
        {isGenerating ? (
          <div className="p-12 text-center">
            <Loader2 className="w-10 h-10 text-indigo-500 mx-auto mb-4 animate-spin" />
            <p className="text-gray-600 font-medium">Generating personalized email...</p>
            <p className="text-sm text-gray-400 mt-1">Using AI to craft the perfect message</p>
          </div>
        ) : email ? (
          <div className="p-6 space-y-4">
            {/* Subject */}
            <div className="bg-gray-50 rounded-xl p-4">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Subject</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedSubject}
                  onChange={(e) => setEditedSubject(e.target.value)}
                  className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              ) : (
                <p className="mt-1 text-gray-900 font-medium">{email.subject}</p>
              )}
            </div>

            {/* Body */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Message</label>
              {isEditing ? (
                <textarea
                  value={editedBody}
                  onChange={(e) => setEditedBody(e.target.value)}
                  className="w-full mt-2 h-64 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm resize-none"
                />
              ) : (
                <div className="mt-2 prose prose-sm max-w-none whitespace-pre-wrap">
                  {(isEditing ? editedBody : email.body).split('\n').map((line, i) => (
                    <p key={i} className={line.startsWith('**') ? 'font-semibold text-gray-900' : 'text-gray-700'}>
                      {line.replace(/\*\*/g, '')}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-12 text-center">
            <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Click "Generate Email" to create a follow-up message</p>
          </div>
        )}

        {/* Actions */}
        {email && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
            <button
              onClick={generateEmail}
              disabled={isGenerating}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-xl text-sm font-medium transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Regenerate
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                <Copy className="w-4 h-4" />
                Copy
              </button>
              <button
                onClick={handleSend}
                disabled={isSending || selectedRecipients.length === 0}
                className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {isSending ? 'Sending...' : 'Send Email'}
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// --- Export Tab ---
interface ExportTabProps {
  summary: MeetingSummary | null;
  actionItems: ActionItem[];
  transcript: TranscriptSegment[];
  isExporting: boolean;
  setIsExporting: (value: boolean) => void;
  onExport?: (format: 'pdf' | 'clipboard') => void;
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void;
}

function ExportTab({ summary, actionItems, transcript, isExporting, setIsExporting, onExport, showNotification }: ExportTabProps) {
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'markdown' | 'json' | 'txt'>('pdf');

  const exportData = useCallback(() => {
    setIsExporting(true);

    setTimeout(() => {
      if (selectedFormat === 'pdf') {
        onExport?.('pdf');
      } else if (selectedFormat === 'markdown' && summary) {
        const content = formatSummaryAsMarkdown(summary);
        const blob = new Blob([content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `meeting-summary-${new Date().toISOString().split('T')[0]}.md`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (selectedFormat === 'txt' && summary) {
        const content = formatSummaryAsText(summary);
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `meeting-summary-${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (selectedFormat === 'json') {
        const content = JSON.stringify({ summary, actionItems, transcript }, null, 2);
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `meeting-data-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }

      setIsExporting(false);
      showNotification('success', `Meeting notes exported as ${selectedFormat.toUpperCase()}`);
    }, 1000);
  }, [selectedFormat, summary, actionItems, transcript, onExport, setIsExporting, showNotification]);

  const copyToClipboard = useCallback(async () => {
    if (!summary) return;
    const content = formatSummaryAsText(summary);
    await navigator.clipboard.writeText(content);
    onExport?.('clipboard');
    showNotification('success', 'Meeting notes copied to clipboard');
  }, [summary, onExport, showNotification]);

  const formats = [
    { id: 'pdf', label: 'PDF Document', description: 'Formatted PDF with all meeting details', icon: FileDown },
    { id: 'markdown', label: 'Markdown', description: 'Editable Markdown format', icon: FileText },
    { id: 'txt', label: 'Plain Text', description: 'Simple text format', icon: MessageSquare },
    { id: 'json', label: 'JSON', description: 'Machine-readable data format', icon: Hash },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      {/* Export Options */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Download className="w-5 h-5" />
          Export Meeting Notes
        </h3>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {formats.map((format) => (
            <button
              key={format.id}
              onClick={() => setSelectedFormat(format.id as typeof selectedFormat)}
              className={`flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                selectedFormat === format.id
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                selectedFormat === format.id ? 'bg-indigo-100' : 'bg-gray-100'
              }`}>
                <format.icon className={`w-6 h-6 ${selectedFormat === format.id ? 'text-indigo-600' : 'text-gray-600'}`} />
              </div>
              <div>
                <p className={`font-medium ${selectedFormat === format.id ? 'text-indigo-900' : 'text-gray-900'}`}>
                  {format.label}
                </p>
                <p className={`text-sm ${selectedFormat === format.id ? 'text-indigo-600' : 'text-gray-500'}`}>
                  {format.description}
                </p>
              </div>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportData}
            disabled={isExporting}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            {isExporting ? 'Exporting...' : `Export as ${selectedFormat.toUpperCase()}`}
          </button>
          <button
            onClick={copyToClipboard}
            disabled={!summary}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <Copy className="w-5 h-5" />
            Copy to Clipboard
          </button>
        </div>
      </div>

      {/* Sync to CRM */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Link className="w-5 h-5" />
          Sync to External Systems
        </h3>

        <div className="grid grid-cols-3 gap-4">
          <IntegrationCard
            name="Salesforce"
            description="Sync meeting notes to Salesforce"
            icon="💼"
            onClick={() => showNotification('info', 'Salesforce integration coming soon')}
          />
          <IntegrationCard
            name="HubSpot"
            description="Log meeting to HubSpot CRM"
            icon="🎯"
            onClick={() => showNotification('info', 'HubSpot integration coming soon')}
          />
          <IntegrationCard
            name="Notion"
            description="Export to Notion database"
            icon="📓"
            onClick={() => showNotification('info', 'Notion integration coming soon')}
          />
        </div>
      </div>

      {/* Preview */}
      {summary && (
        <div className="bg-gray-900 rounded-2xl p-6 text-gray-300">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Export Preview
          </h3>
          <div className="font-mono text-sm whitespace-pre-wrap max-h-64 overflow-y-auto">
            {formatSummaryAsText(summary).slice(0, 1000)}...
          </div>
        </div>
      )}
    </motion.div>
  );
}

// --- Analytics Tab ---
interface AnalyticsTabProps {
  transcript: TranscriptSegment[];
  meetingDuration: number;
  participants: Participant[];
  summary: MeetingSummary | null;
  actionItems: ActionItem[];
}

function AnalyticsTab({ transcript, meetingDuration, participants, summary, actionItems }: AnalyticsTabProps) {
  // Calculate analytics
  const analytics = useMemo(() => {
    const totalWords = transcript.reduce((acc, t) => acc + t.text.split(' ').length, 0);
    const speakerStats = transcript.reduce((acc, t) => {
      acc[t.speaker] = (acc[t.speaker] || 0) + t.text.split(' ').length;
      return acc;
    }, {} as Record<string, number>);

    const mostActiveSpeaker = Object.entries(speakerStats)
      .sort((a, b) => b[1] - a[1])[0];

    const topics = summary?.keyPoints.length || 0;
    const decisions = summary?.decisions.length || 0;
    const highPriorityActions = actionItems.filter(a => a.priority === 'high').length;

    // Simple sentiment estimation based on positive/negative words
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'best', 'happy', 'excited', 'agree', 'yes'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'worst', 'disappointed', 'problem', 'issue', 'concern', 'no', 'disagree'];

    const allText = transcript.map(t => t.text.toLowerCase()).join(' ');
    const positiveCount = positiveWords.filter(w => allText.includes(w)).length;
    const negativeCount = negativeWords.filter(w => allText.includes(w)).length;
    const sentiment = positiveCount > negativeCount ? 'positive' : negativeCount > positiveCount ? 'negative' : 'neutral';

    return {
      totalWords,
      wordsPerMinute: Math.round(totalWords / (meetingDuration / 60) || 0),
      speakerStats,
      mostActiveSpeaker: mostActiveSpeaker?.[0] || 'N/A',
      topics,
      decisions,
      actionItems: actionItems.length,
      highPriorityActions,
      sentiment,
      participation: Object.keys(speakerStats).length,
    };
  }, [transcript, meetingDuration, summary, actionItems]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      {/* Overview Stats */}
      <div className="grid grid-cols-4 gap-4">
        <AnalyticsCard
          label="Meeting Duration"
          value={formatDuration(meetingDuration)}
          subtext={`${analytics.wordsPerMinute} words/min`}
          icon={Clock}
          color="blue"
        />
        <AnalyticsCard
          label="Topics Covered"
          value={analytics.topics.toString()}
          subtext={`${analytics.decisions} decisions made`}
          icon={MessageSquare}
          color="purple"
        />
        <AnalyticsCard
          label="Action Items"
          value={analytics.actionItems.toString()}
          subtext={`${analytics.highPriorityActions} high priority`}
          icon={CheckSquare}
          color="green"
        />
        <AnalyticsCard
          label="Participation"
          value={`${analytics.participation}/${participants.length}`}
          subtext={`Most active: ${analytics.mostActiveSpeaker}`}
          icon={Users}
          color="orange"
        />
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-2 gap-6">
        {/* Speaking Time Distribution */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Speaking Distribution
          </h3>
          <div className="space-y-3">
            {Object.entries(analytics.speakerStats).map(([speaker, words]) => {
              const total = analytics.totalWords || 1;
              const percentage = Math.round((words / total) * 100);
              return (
                <div key={speaker}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">{speaker}</span>
                    <span className="text-gray-500">{percentage}% ({words} words)</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 1, delay: 0.2 }}
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sentiment Overview */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Meeting Sentiment
          </h3>
          <div className="flex items-center justify-center py-8">
            <div className="relative">
              <motion.div
                className={`w-32 h-32 rounded-full flex items-center justify-center ${
                  analytics.sentiment === 'positive' ? 'bg-green-100' :
                  analytics.sentiment === 'negative' ? 'bg-red-100' : 'bg-gray-100'
                }`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
              >
                {analytics.sentiment === 'positive' && <Smile className="w-16 h-16 text-green-500" />}
                {analytics.sentiment === 'negative' && <AlertCircle className="w-16 h-16 text-red-500" />}
                {analytics.sentiment === 'neutral' && <MessageSquare className="w-16 h-16 text-gray-500" />}
              </motion.div>
              <motion.div
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-white rounded-full shadow-md text-sm font-medium capitalize"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                {analytics.sentiment}
              </motion.div>
            </div>
          </div>
          <p className="text-center text-sm text-gray-500">
            Based on word analysis and tone indicators from the transcript
          </p>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Meeting Timeline
        </h3>
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
          <div className="space-y-6">
            {transcript.slice(0, 5).map((segment, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="relative pl-12"
              >
                <div className="absolute left-2 top-1.5 w-4 h-4 rounded-full bg-indigo-500 border-2 border-white shadow" />
                <div className="text-sm">
                  <span className="font-medium text-gray-900">{segment.speaker}</span>
                  <span className="text-gray-400 ml-2">{segment.timestamp.toLocaleTimeString()}</span>
                </div>
                <p className="text-gray-600 text-sm mt-1 line-clamp-2">{segment.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================

interface SummarySectionCardProps {
  title: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  items: string[];
  editingSection: string | null;
  editIndex: number;
  editValue: string;
  onStartEdit: (value: string, index: number) => void;
  onSave: () => void;
  onCancel: () => void;
  onChange: (value: string) => void;
  onDelete: (index: number) => void;
  bulletColor?: string;
  iconElement?: React.ReactNode;
  numbered?: boolean;
}

function SummarySectionCard({
  title,
  icon: Icon,
  iconColor,
  iconBg,
  items,
  editingSection,
  editIndex,
  editValue,
  onStartEdit,
  onSave,
  onCancel,
  onChange,
  onDelete,
  bulletColor = 'bg-gray-400',
  iconElement,
  numbered,
}: SummarySectionCardProps) {
  if (items.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <h3 className="font-semibold text-gray-900">{title}</h3>
      </div>

      <div className="p-6">
        <ul className="space-y-3">
          {items.map((item, index) => (
            <li key={index} className="group">
              {editingSection === title.toLowerCase().replace(/\s+/g, '') && editIndex === index ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => onChange(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onSave();
                      if (e.key === 'Escape') onCancel();
                    }}
                  />
                  <button onClick={onCancel} className="p-1.5 text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                  <button onClick={onSave} className="p-1.5 text-green-500 hover:text-green-600">
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-start gap-3 group/item">
                  {iconElement ? (
                    <span className="mt-0.5 flex-shrink-0">{iconElement}</span>
                  ) : numbered ? (
                    <span className={`w-6 h-6 rounded-full ${bulletColor} text-white text-xs font-medium flex items-center justify-center flex-shrink-0`}>
                      {index + 1}
                    </span>
                  ) : (
                    <span className={`w-2 h-2 rounded-full ${bulletColor} mt-2 flex-shrink-0`} />
                  )}
                  <span className="flex-1 text-gray-700 text-sm">{item}</span>
                  <div className="opacity-0 group-hover/item:opacity-100 flex items-center gap-1 transition-opacity">
                    <button
                      onClick={() => onStartEdit(item, index)}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDelete(index)}
                      className="p-1 text-gray-400 hover:text-red-500 rounded"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
}

function StatCard({ label, value, icon: Icon, color }: StatCardProps) {
  const colorClasses: Record<string, { bg: string; icon: string }> = {
    indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-600' },
    blue: { bg: 'bg-blue-50', icon: 'text-blue-600' },
    green: { bg: 'bg-green-50', icon: 'text-green-600' },
    red: { bg: 'bg-red-50', icon: 'text-red-600' },
    orange: { bg: 'bg-orange-50', icon: 'text-orange-600' },
    purple: { bg: 'bg-purple-50', icon: 'text-purple-600' },
  };

  const colors = colorClasses[color] || colorClasses.indigo;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${colors.icon}`} />
        </div>
      </div>
    </div>
  );
}

interface AnalyticsCardProps {
  label: string;
  value: string;
  subtext: string;
  icon: React.ElementType;
  color: string;
}

function AnalyticsCard({ label, value, subtext, icon: Icon, color }: AnalyticsCardProps) {
  const colorClasses: Record<string, { bg: string; text: string; icon: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-900', icon: 'text-blue-600' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-900', icon: 'text-purple-600' },
    green: { bg: 'bg-green-50', text: 'text-green-900', icon: 'text-green-600' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-900', icon: 'text-orange-600' },
  };

  const colors = colorClasses[color] || colorClasses.blue;

  return (
    <div className={`${colors.bg} rounded-2xl p-6`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm opacity-70">{label}</p>
          <p className={`text-2xl font-bold ${colors.text} mt-1`}>{value}</p>
          <p className="text-sm opacity-60 mt-1">{subtext}</p>
        </div>
        <Icon className={`w-8 h-8 ${colors.icon} opacity-50`} />
      </div>
    </div>
  );
}

interface IntegrationCardProps {
  name: string;
  description: string;
  icon: string;
  onClick: () => void;
}

function IntegrationCard({ name, description, icon, onClick }: IntegrationCardProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-start gap-4 p-4 rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all text-left"
    >
      <span className="text-3xl">{icon}</span>
      <div>
        <p className="font-medium text-gray-900">{name}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </button>
  );
}

// ============================================
// UTILITIES
// ============================================

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
