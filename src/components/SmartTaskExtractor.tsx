/**
 * Smart Task Extractor Component
 * 
 * AI-powered task extraction from sticky notes and meeting transcripts.
 * Features:
 * - "Extract Actions" button on any text source
 * - AI parses text → structured tasks with owner, deadline, priority
 * - Tasks panel in sidebar with status tracking (todo/in-progress/done)
 * - Task assignment notifications
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  ListTodo,
  Plus,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  User,
  Calendar,
  Flag,
  Edit3,
  Trash2,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  Filter,
  Search,
  Sparkles,
  Target,
  Mail,
  Bell,
  Copy,
  MoreHorizontal,
  StickyNote,
  FileText,
  Tag,
  TrendingUp,
} from 'lucide-react';
import {
  extractTasks,
  extractTasksFromText,
  type ExtractedTask,
  type TaskPriority,
  type TaskCategory,
} from '../lib/ai-task-extraction';

// ============================================================================
// Types
// ============================================================================

export type TaskStatus = 'todo' | 'in-progress' | 'done';

export interface SmartTask {
  id: string;
  text: string;
  assignee?: string;
  dueDate?: Date;
  priority: TaskPriority;
  category: TaskCategory;
  status: TaskStatus;
  source: 'sticky-note' | 'transcript' | 'manual';
  sourceId?: string;
  sourceText?: string;
  confidence: number;
  createdAt: Date;
  completedAt?: Date;
  tags: string[];
  notified: boolean;
}

export interface SmartTaskExtractorProps {
  /** Text to extract tasks from */
  sourceText?: string;
  /** Source type */
  sourceType?: 'sticky-note' | 'transcript' | 'manual';
  /** Source element ID (sticky note ID, etc.) */
  sourceId?: string;
  /** Known participants for assignee detection */
  participants?: string[];
  /** Existing tasks list */
  tasks?: SmartTask[];
  /** Called when tasks are extracted and confirmed */
  onTasksExtracted?: (tasks: SmartTask[]) => void;
  /** Called when a task status changes */
  onTaskUpdate?: (task: SmartTask) => void;
  /** Called when a task is deleted */
  onTaskDelete?: (taskId: string) => void;
  /** Called when user wants to push a task to canvas as sticky note */
  onPushToCanvas?: (task: SmartTask) => void;
  /** Called to send notification for task assignment */
  onNotifyAssignee?: (task: SmartTask) => void;
  /** AI API key for enhanced extraction */
  aiApiKey?: string;
  /** Mode: 'extract' for extraction button, 'panel' for task management sidebar */
  mode?: 'extract' | 'panel';
  /** Show as compact extract button only */
  compact?: boolean;
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

const formatDate = (date?: Date): string => {
  if (!date) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const isOverdue = (task: SmartTask): boolean => {
  if (!task.dueDate || task.status === 'done') return false;
  return new Date(task.dueDate) < new Date();
};

const getPriorityBadge = (priority: TaskPriority) => {
  const styles = {
    high: 'bg-red-100 text-red-700 border-red-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    low: 'bg-blue-100 text-blue-700 border-blue-200',
  };
  return styles[priority];
};

const getCategoryBadge = (category: TaskCategory) => {
  const styles: Record<TaskCategory, string> = {
    'follow-up': 'bg-purple-100 text-purple-700',
    'research': 'bg-cyan-100 text-cyan-700',
    'document': 'bg-emerald-100 text-emerald-700',
    'review': 'bg-orange-100 text-orange-700',
    'decision': 'bg-indigo-100 text-indigo-700',
    'other': 'bg-gray-100 text-gray-700',
  };
  return styles[category];
};

const statusOrder: Record<TaskStatus, number> = { 'todo': 0, 'in-progress': 1, 'done': 2 };

function convertExtractedToSmart(
  extracted: ExtractedTask,
  source: 'sticky-note' | 'transcript' | 'manual',
  sourceId?: string,
): SmartTask {
  return {
    id: extracted.id,
    text: extracted.text,
    assignee: extracted.assignee,
    dueDate: extracted.dueDate || undefined,
    priority: extracted.priority,
    category: extracted.category,
    status: 'todo',
    source,
    sourceId,
    sourceText: extracted.sourceText,
    confidence: extracted.confidence,
    createdAt: new Date(),
    tags: [],
    notified: false,
  };
}

// ============================================================================
// Extract Button Component (compact mode)
// ============================================================================

function ExtractButton({
  sourceText,
  sourceType = 'sticky-note',
  sourceId,
  participants = [],
  onTasksExtracted,
  aiApiKey,
  compact = false,
}: Pick<SmartTaskExtractorProps, 'sourceText' | 'sourceType' | 'sourceId' | 'participants' | 'onTasksExtracted' | 'aiApiKey' | 'compact'>) {
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedTasks, setExtractedTasks] = useState<SmartTask[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const handleExtract = useCallback(async () => {
    if (!sourceText?.trim()) return;

    setIsExtracting(true);
    try {
      const segments = [{ speaker: 'User', text: sourceText, timestamp: new Date() }];
      const extracted = await extractTasks(segments, {
        useAI: !!aiApiKey,
        apiKey: aiApiKey,
        knownParticipants: participants,
        minConfidence: 0.4,
      });

      const smartTasks = extracted.map(t =>
        convertExtractedToSmart(t, sourceType || 'sticky-note', sourceId)
      );

      setExtractedTasks(smartTasks);
      setShowPreview(true);
    } catch (err) {
      console.error('Task extraction failed:', err);
    } finally {
      setIsExtracting(false);
    }
  }, [sourceText, sourceType, sourceId, participants, aiApiKey]);

  const handleConfirm = useCallback(() => {
    if (extractedTasks.length > 0) {
      onTasksExtracted?.(extractedTasks);
    }
    setShowPreview(false);
    setExtractedTasks([]);
  }, [extractedTasks, onTasksExtracted]);

  const handleRemoveTask = useCallback((taskId: string) => {
    setExtractedTasks(prev => prev.filter(t => t.id !== taskId));
  }, []);

  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={handleExtract}
          disabled={isExtracting || !sourceText?.trim()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-navy-700 text-white text-xs font-medium rounded-lg hover:bg-navy-800 transition-colors disabled:opacity-50"
          title="Extract action items"
        >
          {isExtracting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Zap className="w-3.5 h-3.5" />
          )}
          Extract Actions
        </button>

        {/* Preview popup */}
        <AnimatePresence>
          {showPreview && extractedTasks.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute z-50 top-full mt-2 right-0 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
            >
              <div className="p-3 bg-navy-50 border-b border-navy-100">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-navy-800">
                    Found {extractedTasks.length} task{extractedTasks.length > 1 ? 's' : ''}
                  </span>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="p-1 hover:bg-navy-100 rounded"
                  >
                    <X className="w-4 h-4 text-navy-600" />
                  </button>
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto p-2 space-y-2">
                {extractedTasks.map(task => (
                  <div key={task.id} className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800">{task.text}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${getPriorityBadge(task.priority)}`}>
                          {task.priority}
                        </span>
                        {task.assignee && (
                          <span className="text-[10px] text-gray-500">→ {task.assignee}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveTask(task.id)}
                      className="p-1 text-gray-400 hover:text-red-500 rounded"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="p-2 border-t border-gray-100 flex justify-end gap-2">
                <button
                  onClick={() => { setShowPreview(false); setExtractedTasks([]); }}
                  className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  className="px-3 py-1.5 text-xs bg-navy-700 text-white rounded-lg hover:bg-navy-800"
                >
                  Add {extractedTasks.length} task{extractedTasks.length > 1 ? 's' : ''}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {showPreview && extractedTasks.length === 0 && !isExtracting && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute z-50 top-full mt-2 right-0 w-64 bg-white rounded-xl shadow-lg border border-gray-200 p-4 text-center"
          >
            <p className="text-sm text-gray-500">No action items found in this text.</p>
            <button
              onClick={() => setShowPreview(false)}
              className="mt-2 text-xs text-gray-400 hover:text-gray-600"
            >
              Close
            </button>
          </motion.div>
        )}
      </div>
    );
  }

  return null;
}

// ============================================================================
// Task Panel Component (sidebar mode)
// ============================================================================

function TaskPanel({
  tasks = [],
  participants = [],
  onTaskUpdate,
  onTaskDelete,
  onPushToCanvas,
  onNotifyAssignee,
  onTasksExtracted,
}: Pick<SmartTaskExtractorProps, 'tasks' | 'participants' | 'onTaskUpdate' | 'onTaskDelete' | 'onPushToCanvas' | 'onNotifyAssignee' | 'onTasksExtracted'>) {
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [manualTaskText, setManualTaskText] = useState('');
  const [showAssigneeFor, setShowAssigneeFor] = useState<string | null>(null);

  // Filtered & sorted tasks
  const filteredTasks = useMemo(() => {
    let result = [...(tasks || [])];

    if (filterStatus !== 'all') {
      result = result.filter(t => t.status === filterStatus);
    }
    if (filterPriority !== 'all') {
      result = result.filter(t => t.priority === filterPriority);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.text.toLowerCase().includes(q) ||
        t.assignee?.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      );
    }

    // Sort: overdue first, then by status, then by priority
    result.sort((a, b) => {
      if (isOverdue(a) && !isOverdue(b)) return -1;
      if (!isOverdue(a) && isOverdue(b)) return 1;
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;
      const priorityOrder: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    return result;
  }, [tasks, filterStatus, filterPriority, searchQuery]);

  // Stats
  const stats = useMemo(() => ({
    total: (tasks || []).length,
    todo: (tasks || []).filter(t => t.status === 'todo').length,
    inProgress: (tasks || []).filter(t => t.status === 'in-progress').length,
    done: (tasks || []).filter(t => t.status === 'done').length,
    overdue: (tasks || []).filter(t => isOverdue(t)).length,
  }), [tasks]);

  const cycleStatus = useCallback((task: SmartTask) => {
    const nextStatus: Record<TaskStatus, TaskStatus> = {
      'todo': 'in-progress',
      'in-progress': 'done',
      'done': 'todo',
    };
    const updated: SmartTask = {
      ...task,
      status: nextStatus[task.status],
      completedAt: nextStatus[task.status] === 'done' ? new Date() : undefined,
    };
    onTaskUpdate?.(updated);
  }, [onTaskUpdate]);

  const handleAddManualTask = useCallback(() => {
    if (!manualTaskText.trim()) return;
    const task: SmartTask = {
      id: `task-manual-${Date.now()}`,
      text: manualTaskText.trim(),
      priority: 'medium',
      category: 'other',
      status: 'todo',
      source: 'manual',
      confidence: 1,
      createdAt: new Date(),
      tags: [],
      notified: false,
    };
    onTasksExtracted?.([task]);
    setManualTaskText('');
  }, [manualTaskText, onTasksExtracted]);

  const handleEditSave = useCallback((task: SmartTask) => {
    if (editText.trim()) {
      onTaskUpdate?.({ ...task, text: editText.trim() });
    }
    setEditingTask(null);
    setEditText('');
  }, [editText, onTaskUpdate]);

  const handleAssign = useCallback((task: SmartTask, assignee: string) => {
    onTaskUpdate?.({ ...task, assignee });
    setShowAssigneeFor(null);
  }, [onTaskUpdate]);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex-shrink-0 p-4 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ListTodo className="w-5 h-5 text-navy-700" />
            <h2 className="font-bold text-gray-900">Tasks</h2>
            <span className="px-2 py-0.5 bg-navy-100 text-navy-700 rounded-full text-xs font-medium">
              {stats.total}
            </span>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg transition-colors ${showFilters ? 'bg-navy-100 text-navy-700' : 'text-gray-400 hover:bg-gray-100'}`}
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>

        {/* Status pills */}
        <div className="flex gap-2">
          {stats.overdue > 0 && (
            <span className="px-2 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-medium">
              {stats.overdue} overdue
            </span>
          )}
          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs">
            {stats.todo} todo
          </span>
          <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs">
            {stats.inProgress} active
          </span>
          <span className="px-2 py-1 bg-green-50 text-green-600 rounded-lg text-xs">
            {stats.done} done
          </span>
        </div>

        {/* Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mt-3 space-y-2"
            >
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search tasks..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-200"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value as TaskStatus | 'all')}
                  className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white"
                >
                  <option value="all">All Status</option>
                  <option value="todo">To Do</option>
                  <option value="in-progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
                <select
                  value={filterPriority}
                  onChange={e => setFilterPriority(e.target.value as TaskPriority | 'all')}
                  className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white"
                >
                  <option value="all">All Priority</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Quick Add */}
      <div className="flex-shrink-0 p-3 bg-white border-b border-gray-100">
        <div className="flex gap-2">
          <input
            type="text"
            value={manualTaskText}
            onChange={e => setManualTaskText(e.target.value)}
            placeholder="Add a task..."
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-200"
            onKeyDown={e => { if (e.key === 'Enter') handleAddManualTask(); }}
          />
          <button
            onClick={handleAddManualTask}
            disabled={!manualTaskText.trim()}
            className="px-3 py-2 bg-navy-700 text-white rounded-lg hover:bg-navy-800 transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12">
            <ListTodo className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No tasks yet</p>
            <p className="text-sm text-gray-400 mt-1">
              {tasks && tasks.length > 0
                ? 'Try adjusting your filters'
                : 'Extract tasks from notes or add manually'}
            </p>
          </div>
        ) : (
          filteredTasks.map((task, index) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className={`group p-3 rounded-xl border transition-all ${
                task.status === 'done'
                  ? 'bg-gray-50 border-gray-200 opacity-60'
                  : isOverdue(task)
                  ? 'bg-red-50 border-red-200'
                  : 'bg-white border-gray-200 hover:border-navy-200 hover:shadow-sm'
              }`}
            >
              {editingTask === task.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-200 rounded resize-none"
                    rows={2}
                    autoFocus
                  />
                  <div className="flex justify-end gap-1">
                    <button onClick={() => setEditingTask(null)} className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded">Cancel</button>
                    <button onClick={() => handleEditSave(task)} className="px-2 py-1 text-xs bg-navy-700 text-white rounded">Save</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start gap-3">
                    {/* Status toggle */}
                    <button
                      onClick={() => cycleStatus(task)}
                      className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                        task.status === 'done'
                          ? 'bg-green-500 border-green-500'
                          : task.status === 'in-progress'
                          ? 'bg-blue-500 border-blue-500'
                          : 'border-gray-300 hover:border-navy-500'
                      }`}
                      title={`Status: ${task.status} (click to change)`}
                    >
                      {task.status === 'done' && <Check className="w-3 h-3 text-white" />}
                      {task.status === 'in-progress' && <TrendingUp className="w-3 h-3 text-white" />}
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                        {task.text}
                      </p>

                      {/* Metadata */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${getPriorityBadge(task.priority)}`}>
                          {task.priority}
                        </span>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${getCategoryBadge(task.category)}`}>
                          {task.category}
                        </span>

                        {task.assignee ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-navy-50 text-navy-700 rounded-full text-[10px]">
                            <User className="w-2.5 h-2.5" />
                            {task.assignee}
                          </span>
                        ) : (
                          <button
                            onClick={() => setShowAssigneeFor(task.id)}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 text-gray-500 hover:text-navy-700 rounded-full text-[10px] transition-colors"
                          >
                            <User className="w-2.5 h-2.5" />
                            Assign
                          </button>
                        )}

                        {task.dueDate && (
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] ${
                            isOverdue(task) ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            <Calendar className="w-2.5 h-2.5" />
                            {formatDate(task.dueDate)}
                          </span>
                        )}

                        {task.source !== 'manual' && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded-full text-[10px]">
                            {task.source === 'sticky-note' ? <StickyNote className="w-2.5 h-2.5" /> : <FileText className="w-2.5 h-2.5" />}
                            {task.source === 'sticky-note' ? 'Note' : 'Transcript'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setEditingTask(task.id); setEditText(task.text); }}
                        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                        title="Edit"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      {onPushToCanvas && (
                        <button
                          onClick={() => onPushToCanvas(task)}
                          className="p-1 text-gray-400 hover:text-navy-600 hover:bg-navy-50 rounded"
                          title="Push to canvas"
                        >
                          <StickyNote className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onNotifyAssignee && task.assignee && !task.notified && (
                        <button
                          onClick={() => onNotifyAssignee(task)}
                          className="p-1 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded"
                          title="Notify assignee"
                        >
                          <Bell className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => onTaskDelete?.(task.id)}
                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Assignee selector */}
                  <AnimatePresence>
                    {showAssigneeFor === task.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden mt-2 pt-2 border-t border-gray-100"
                      >
                        <div className="flex flex-wrap gap-1">
                          {participants.map(p => (
                            <button
                              key={p}
                              onClick={() => handleAssign(task, p)}
                              className="px-2 py-1 text-xs bg-gray-100 hover:bg-navy-100 hover:text-navy-700 rounded-lg transition-colors"
                            >
                              {p}
                            </button>
                          ))}
                          <button
                            onClick={() => setShowAssigneeFor(null)}
                            className="px-2 py-1 text-xs text-gray-400 hover:text-gray-600"
                          >
                            Cancel
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </motion.div>
          ))
        )}
      </div>

      {/* Progress bar */}
      {stats.total > 0 && (
        <div className="flex-shrink-0 p-3 bg-white border-t border-gray-200">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-gray-500">Progress</span>
            <span className="text-xs font-medium text-gray-700">
              {stats.done}/{stats.total} completed
            </span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${(stats.done / stats.total) * 100}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function SmartTaskExtractor(props: SmartTaskExtractorProps) {
  const { mode = 'extract', compact = false } = props;

  if (mode === 'extract' || compact) {
    return <ExtractButton {...props} compact={compact || mode === 'extract'} />;
  }

  return <TaskPanel {...props} />;
}

export { ExtractButton, TaskPanel };
