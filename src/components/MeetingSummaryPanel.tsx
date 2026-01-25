/**
 * Meeting Summary Panel Component
 * Displays generated meeting summaries with inline editing,
 * format toggle, export options, and follow-up email generation
 */

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  CheckCircle,
  HelpCircle,
  Target,
  ListTodo,
  ArrowRight,
  Copy,
  Download,
  Edit2,
  Check,
  X,
  ChevronDown,
  Loader2,
  Sparkles,
  Mail,
  RefreshCw,
  MessageSquare,
  AlertCircle,
  Clock,
  Users,
  Minimize2,
  Maximize2,
  Save,
} from 'lucide-react';
import {
  MeetingSummary,
  SummaryFormat,
  ActionItem,
  formatSummaryAsText,
  formatSummaryAsMarkdown,
} from '../lib/meeting-summary';

interface MeetingSummaryPanelProps {
  summary: MeetingSummary;
  onUpdate?: (summary: MeetingSummary) => void;
  onGenerateEmail?: () => void;
  onRegenerate?: (format: SummaryFormat) => void;
  onSaveToNotes?: (summary: MeetingSummary) => void;
  onClose?: () => void;
  isGenerating?: boolean;
  className?: string;
}

export default function MeetingSummaryPanel({
  summary,
  onUpdate,
  onGenerateEmail,
  onRegenerate,
  onSaveToNotes,
  onClose,
  isGenerating = false,
  className = '',
}: MeetingSummaryPanelProps) {
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editIndex, setEditIndex] = useState<number>(-1);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showFormatMenu, setShowFormatMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savedToNotes, setSavedToNotes] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Format labels
  const formatLabels: Record<SummaryFormat, string> = {
    executive: 'Executive Summary',
    detailed: 'Detailed Notes',
    'actions-only': 'Action Items Only',
  };

  // Start editing a section
  const startEditing = useCallback((section: string, value: string, index: number = -1) => {
    setEditingSection(section);
    setEditValue(value);
    setEditIndex(index);
  }, []);

  // Save edited section
  const saveEdit = useCallback(() => {
    if (!editingSection || !onUpdate) return;

    const updatedSummary = { ...summary };

    if (editingSection === 'overview') {
      updatedSummary.overview = editValue;
    } else if (editingSection === 'keyPoints' && editIndex >= 0) {
      updatedSummary.keyPoints = [...summary.keyPoints];
      updatedSummary.keyPoints[editIndex] = editValue;
    } else if (editingSection === 'decisions' && editIndex >= 0) {
      updatedSummary.decisions = [...summary.decisions];
      updatedSummary.decisions[editIndex] = editValue;
    } else if (editingSection === 'actionItems' && editIndex >= 0) {
      updatedSummary.actionItems = [...summary.actionItems];
      const currentItem = summary.actionItems[editIndex];
      // Parse "Task - Owner" format
      const parts = editValue.split(' - ');
      updatedSummary.actionItems[editIndex] = {
        ...currentItem,
        task: parts[0],
        owner: parts[1] || currentItem.owner,
      };
    } else if (editingSection === 'openQuestions' && editIndex >= 0) {
      updatedSummary.openQuestions = [...summary.openQuestions];
      updatedSummary.openQuestions[editIndex] = editValue;
    } else if (editingSection === 'nextSteps' && editIndex >= 0) {
      updatedSummary.nextSteps = [...summary.nextSteps];
      updatedSummary.nextSteps[editIndex] = editValue;
    }

    onUpdate(updatedSummary);
    cancelEdit();
  }, [editingSection, editValue, editIndex, summary, onUpdate]);

  // Cancel editing
  const cancelEdit = useCallback(() => {
    setEditingSection(null);
    setEditValue('');
    setEditIndex(-1);
  }, []);

  // Delete item from list
  const deleteItem = useCallback((section: string, index: number) => {
    if (!onUpdate) return;

    const updatedSummary = { ...summary };

    if (section === 'keyPoints') {
      updatedSummary.keyPoints = summary.keyPoints.filter((_, i) => i !== index);
    } else if (section === 'decisions') {
      updatedSummary.decisions = summary.decisions.filter((_, i) => i !== index);
    } else if (section === 'actionItems') {
      updatedSummary.actionItems = summary.actionItems.filter((_, i) => i !== index);
    } else if (section === 'openQuestions') {
      updatedSummary.openQuestions = summary.openQuestions.filter((_, i) => i !== index);
    } else if (section === 'nextSteps') {
      updatedSummary.nextSteps = summary.nextSteps.filter((_, i) => i !== index);
    }

    onUpdate(updatedSummary);
  }, [summary, onUpdate]);

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    const text = formatSummaryAsText(summary);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [summary]);

  // Export as file
  const handleExport = useCallback((format: 'text' | 'markdown' | 'json') => {
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
  }, [summary]);

  // Save to notes
  const handleSaveToNotes = useCallback(() => {
    if (onSaveToNotes) {
      onSaveToNotes(summary);
      setSavedToNotes(true);
      setTimeout(() => setSavedToNotes(false), 2000);
    }
  }, [summary, onSaveToNotes]);

  // Keyboard shortcuts for editing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingSection) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          saveEdit();
        } else if (e.key === 'Escape') {
          cancelEdit();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingSection, saveEdit, cancelEdit]);

  // Minimized view
  if (isMinimized) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden ${className}`}
      >
        <button
          onClick={() => setIsMinimized(false)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-indigo-600" />
            <span className="font-medium text-gray-900">Meeting Summary</span>
            <span className="text-sm text-gray-500">{formatLabels[summary.format]}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">
              {summary.actionItems.length} action items
            </span>
            <Maximize2 className="w-4 h-4 text-gray-400" />
          </div>
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={`bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6" />
            <div>
              <h2 className="font-semibold text-lg">Meeting Summary</h2>
              <div className="flex items-center gap-3 text-sm text-indigo-100">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {summary.generatedAt.toLocaleString()}
                </span>
                {summary.participants && summary.participants.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {summary.participants.length} participants
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
                <ChevronDown className="w-4 h-4" />
              </button>

              <AnimatePresence>
                {showFormatMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowFormatMenu(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-20"
                    >
                      {(['executive', 'detailed', 'actions-only'] as SummaryFormat[]).map((format) => (
                        <button
                          key={format}
                          onClick={() => {
                            onRegenerate?.(format);
                            setShowFormatMenu(false);
                          }}
                          className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${
                            summary.format === format
                              ? 'bg-indigo-50 text-indigo-700'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {summary.format === format && <Check className="w-4 h-4" />}
                          <span className={summary.format === format ? '' : 'ml-6'}>
                            {formatLabels[format]}
                          </span>
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Minimize button */}
            <button
              onClick={() => setIsMinimized(true)}
              className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
            >
              <Minimize2 className="w-4 h-4" />
            </button>

            {/* Close button */}
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Loading state */}
      {isGenerating && (
        <div className="px-6 py-8 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-10 h-10 text-indigo-500 mx-auto mb-3 animate-spin" />
            <p className="text-gray-600 font-medium">Analyzing transcript...</p>
            <p className="text-sm text-gray-400 mt-1">Extracting key insights</p>
          </div>
        </div>
      )}

      {/* Content */}
      {!isGenerating && (
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Overview */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              <h3 className="font-semibold text-gray-900">Overview</h3>
              {onUpdate && (
                <button
                  onClick={() => startEditing('overview', summary.overview)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
            </div>
            {editingSection === 'overview' ? (
              <div className="space-y-2">
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  rows={3}
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={cancelEdit}
                    className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveEdit}
                    className="px-3 py-1 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-gray-700 leading-relaxed">{summary.overview}</p>
            )}
          </section>

          {/* Key Points */}
          {summary.keyPoints.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-5 h-5 text-blue-500" />
                <h3 className="font-semibold text-gray-900">Key Discussion Points</h3>
              </div>
              <ul className="space-y-2">
                {summary.keyPoints.map((point, index) => (
                  <EditableListItem
                    key={index}
                    value={point}
                    isEditing={editingSection === 'keyPoints' && editIndex === index}
                    editValue={editValue}
                    onStartEdit={() => startEditing('keyPoints', point, index)}
                    onSave={saveEdit}
                    onCancel={cancelEdit}
                    onDelete={() => deleteItem('keyPoints', index)}
                    onChange={setEditValue}
                    canEdit={!!onUpdate}
                    bulletColor="bg-blue-500"
                  />
                ))}
              </ul>
            </section>
          )}

          {/* Decisions */}
          {summary.decisions.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5 text-purple-500" />
                <h3 className="font-semibold text-gray-900">Decisions Made</h3>
              </div>
              <ul className="space-y-2">
                {summary.decisions.map((decision, index) => (
                  <EditableListItem
                    key={index}
                    value={decision}
                    isEditing={editingSection === 'decisions' && editIndex === index}
                    editValue={editValue}
                    onStartEdit={() => startEditing('decisions', decision, index)}
                    onSave={saveEdit}
                    onCancel={cancelEdit}
                    onDelete={() => deleteItem('decisions', index)}
                    onChange={setEditValue}
                    canEdit={!!onUpdate}
                    bulletColor="bg-purple-500"
                    icon={<CheckCircle className="w-4 h-4 text-purple-500" />}
                  />
                ))}
              </ul>
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
              <ul className="space-y-2">
                {summary.actionItems.map((item, index) => (
                  <ActionItemRow
                    key={index}
                    item={item}
                    isEditing={editingSection === 'actionItems' && editIndex === index}
                    editValue={editValue}
                    onStartEdit={() => startEditing('actionItems', `${item.task}${item.owner ? ` - ${item.owner}` : ''}`, index)}
                    onSave={saveEdit}
                    onCancel={cancelEdit}
                    onDelete={() => deleteItem('actionItems', index)}
                    onChange={setEditValue}
                    canEdit={!!onUpdate}
                  />
                ))}
              </ul>
            </section>
          )}

          {/* Open Questions */}
          {summary.openQuestions.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-2">
                <HelpCircle className="w-5 h-5 text-amber-500" />
                <h3 className="font-semibold text-gray-900">Open Questions</h3>
              </div>
              <ul className="space-y-2">
                {summary.openQuestions.map((question, index) => (
                  <EditableListItem
                    key={index}
                    value={question}
                    isEditing={editingSection === 'openQuestions' && editIndex === index}
                    editValue={editValue}
                    onStartEdit={() => startEditing('openQuestions', question, index)}
                    onSave={saveEdit}
                    onCancel={cancelEdit}
                    onDelete={() => deleteItem('openQuestions', index)}
                    onChange={setEditValue}
                    canEdit={!!onUpdate}
                    bulletColor="bg-amber-500"
                    icon={<HelpCircle className="w-4 h-4 text-amber-500" />}
                  />
                ))}
              </ul>
            </section>
          )}

          {/* Next Steps */}
          {summary.nextSteps.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-2">
                <ArrowRight className="w-5 h-5 text-teal-500" />
                <h3 className="font-semibold text-gray-900">Next Steps</h3>
              </div>
              <ul className="space-y-2">
                {summary.nextSteps.map((step, index) => (
                  <EditableListItem
                    key={index}
                    value={step}
                    isEditing={editingSection === 'nextSteps' && editIndex === index}
                    editValue={editValue}
                    onStartEdit={() => startEditing('nextSteps', step, index)}
                    onSave={saveEdit}
                    onCancel={cancelEdit}
                    onDelete={() => deleteItem('nextSteps', index)}
                    onChange={setEditValue}
                    canEdit={!!onUpdate}
                    bulletColor="bg-teal-500"
                    index={index + 1}
                  />
                ))}
              </ul>
            </section>
          )}

          {/* Empty state */}
          {summary.keyPoints.length === 0 &&
            summary.decisions.length === 0 &&
            summary.actionItems.length === 0 &&
            summary.openQuestions.length === 0 &&
            summary.nextSteps.length === 0 && (
              <div className="py-8 text-center">
                <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No key items extracted from this transcript.</p>
                <p className="text-sm text-gray-400 mt-1">Try a longer or more detailed transcript.</p>
              </div>
            )}
        </div>
      )}

      {/* Footer actions */}
      {!isGenerating && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Copy button */}
              <button
                onClick={handleCopy}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  copied
                    ? 'bg-green-100 text-green-700'
                    : 'text-gray-600 hover:bg-gray-200'
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
                        className="absolute bottom-full left-0 mb-2 w-40 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-20"
                      >
                        <button
                          onClick={() => handleExport('text')}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                        >
                          Plain Text (.txt)
                        </button>
                        <button
                          onClick={() => handleExport('markdown')}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                        >
                          Markdown (.md)
                        </button>
                        <button
                          onClick={() => handleExport('json')}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                        >
                          JSON (.json)
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* Regenerate button */}
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
              {/* Save to Notes button */}
              {onSaveToNotes && (
                <button
                  onClick={handleSaveToNotes}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    savedToNotes
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {savedToNotes ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  {savedToNotes ? 'Saved!' : 'Save to Notes'}
                </button>
              )}

              {/* Generate Email button */}
              {onGenerateEmail && (
                <button
                  onClick={onGenerateEmail}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  Draft Follow-up Email
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================

interface EditableListItemProps {
  value: string;
  isEditing: boolean;
  editValue: string;
  onStartEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onChange: (value: string) => void;
  canEdit: boolean;
  bulletColor?: string;
  icon?: React.ReactNode;
  index?: number;
}

function EditableListItem({
  value,
  isEditing,
  editValue,
  onStartEdit,
  onSave,
  onCancel,
  onDelete,
  onChange,
  canEdit,
  bulletColor = 'bg-gray-400',
  icon,
  index,
}: EditableListItemProps) {
  if (isEditing) {
    return (
      <li className="flex items-start gap-2">
        <div className="flex-1">
          <input
            type="text"
            value={editValue}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            autoFocus
          />
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onCancel}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            onClick={onSave}
            className="p-1 text-green-500 hover:text-green-600 rounded"
          >
            <Check className="w-4 h-4" />
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-start gap-2 group">
      {icon ? (
        <span className="mt-0.5 flex-shrink-0">{icon}</span>
      ) : index !== undefined ? (
        <span className={`w-5 h-5 rounded-full ${bulletColor} text-white text-xs font-medium flex items-center justify-center flex-shrink-0`}>
          {index}
        </span>
      ) : (
        <span className={`w-2 h-2 rounded-full ${bulletColor} mt-2 flex-shrink-0`} />
      )}
      <span className="flex-1 text-gray-700 text-sm">{value}</span>
      {canEdit && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onStartEdit}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <Edit2 className="w-3 h-3" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 text-gray-400 hover:text-red-500 rounded"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </li>
  );
}

interface ActionItemRowProps {
  item: ActionItem;
  isEditing: boolean;
  editValue: string;
  onStartEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onChange: (value: string) => void;
  canEdit: boolean;
}

function ActionItemRow({
  item,
  isEditing,
  editValue,
  onStartEdit,
  onSave,
  onCancel,
  onDelete,
  onChange,
  canEdit,
}: ActionItemRowProps) {
  if (isEditing) {
    return (
      <li className="flex items-start gap-2">
        <div className="flex-1">
          <input
            type="text"
            value={editValue}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Task - Owner"
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            autoFocus
          />
          <p className="text-xs text-gray-400 mt-1">Format: Task description - Owner name</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onCancel}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            onClick={onSave}
            className="p-1 text-green-500 hover:text-green-600 rounded"
          >
            <Check className="w-4 h-4" />
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-start gap-3 p-2 rounded-lg bg-green-50 group">
      <div className="w-5 h-5 rounded border-2 border-green-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800">{item.task}</p>
        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
          {item.owner && (
            <span className="px-2 py-0.5 bg-white rounded-full">
              👤 {item.owner}
            </span>
          )}
          {item.dueDate && (
            <span className="px-2 py-0.5 bg-white rounded-full">
              📅 {item.dueDate}
            </span>
          )}
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
      {canEdit && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onStartEdit}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <Edit2 className="w-3 h-3" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 text-gray-400 hover:text-red-500 rounded"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </li>
  );
}
