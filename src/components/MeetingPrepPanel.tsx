/**
 * Meeting Prep Panel Component
 * Comprehensive pre-meeting preparation system for Strategic Canvas
 * Provides agenda generation, client briefing, templates, and checklists
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  Users,
  FileText,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Play,
  Plus,
  Minus,
  Edit2,
  Check,
  X,
  MessageSquare,
  History,
  Target,
  ListTodo,
  HelpCircle,
  Sparkles,
  Briefcase,
  TrendingUp,
  Shield,
  BookOpen,
  AlertCircle,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import MeetingCapturePanel from './MeetingCapturePanel';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface MeetingPrepPanelProps {
  boardId: string;
  participants: Array<{ id: string; name: string; role: string }>;
  previousMeetings?: Array<{
    id: string;
    date: Date;
    summary: string;
    actionItems: string[];
  }>;
  onStartMeeting: () => void;
  onGenerateAgenda: (template: string) => void;
  className?: string;
}

interface AgendaItem {
  id: string;
  title: string;
  duration: number;
  description?: string;
  questions?: string[];
  isEditable?: boolean;
}

interface MeetingTemplate {
  id: string;
  name: string;
  icon: typeof Briefcase;
  description: string;
  color: string;
  agenda: AgendaItem[];
  suggestedQuestions: string[];
}

interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  category: 'review' | 'documents' | 'actions' | 'research';
}

interface ClientNote {
  id: string;
  date: Date;
  content: string;
  category: 'preference' | 'concern' | 'milestone' | 'general';
}

// ============================================
// MEETING TEMPLATES
// ============================================

const MEETING_TEMPLATES: MeetingTemplate[] = [
  {
    id: 'discovery',
    name: 'Discovery Meeting',
    icon: Briefcase,
    description: 'Initial client consultation to understand needs and goals',
    color: 'blue',
    agenda: [
      { id: '1', title: 'Introductions & Ice Breaker', duration: 5, description: 'Welcome and establish rapport' },
      { id: '2', title: 'Current Situation Review', duration: 15, description: 'Understand current financial position' },
      { id: '3', title: 'Goals & Objectives', duration: 20, description: 'Short and long-term financial goals', questions: ['What are your top 3 financial priorities?', 'When do you hope to retire?'] },
      { id: '4', title: 'Risk Tolerance Assessment', duration: 10, description: 'Evaluate comfort with market volatility' },
      { id: '5', title: 'Timeline & Next Steps', duration: 10, description: 'Agree on process and schedule follow-up' },
    ],
    suggestedQuestions: [
      'What prompted you to seek financial advice now?',
      'Have you worked with an advisor before?',
      'What does financial success look like to you?',
      'Are there any major life changes on the horizon?',
    ],
  },
  {
    id: 'annual-review',
    name: 'Annual Review',
    icon: Calendar,
    description: 'Comprehensive yearly portfolio and goal review',
    color: 'green',
    agenda: [
      { id: '1', title: 'Year in Review', duration: 10, description: 'Highlights of the past year' },
      { id: '2', title: 'Portfolio Performance', duration: 15, description: 'Review returns vs benchmarks' },
      { id: '3', title: 'Goal Progress Check', duration: 15, description: 'Status of financial objectives', questions: ['Are you on track for retirement?', 'Any changes to college funding needs?'] },
      { id: '4', title: 'Life Changes Discussion', duration: 10, description: 'New circumstances affecting plan' },
      { id: '5', title: 'Strategy Adjustments', duration: 15, description: 'Rebalancing and allocation changes' },
      { id: '6', title: 'Goals for Next Year', duration: 10, description: 'Set new objectives and milestones' },
    ],
    suggestedQuestions: [
      'Have there been any significant changes in your life?',
      'How do you feel about your portfolio performance?',
      'Are there any new goals we should discuss?',
      'Has your risk tolerance changed?',
    ],
  },
  {
    id: 'investment-planning',
    name: 'Investment Planning',
    icon: TrendingUp,
    description: 'Focused discussion on investment strategy and allocation',
    color: 'indigo',
    agenda: [
      { id: '1', title: 'Investment Philosophy Alignment', duration: 10, description: 'Confirm approach and principles' },
      { id: '2', title: 'Market Review & Outlook', duration: 15, description: 'Current conditions and forecasts' },
      { id: '3', title: 'Asset Allocation Analysis', duration: 20, description: 'Current vs target allocation', questions: ['Should we rebalance now?', 'Any asset classes to consider?'] },
      { id: '4', title: 'New Opportunities', duration: 15, description: 'Products or strategies to consider' },
      { id: '5', title: 'Tax Efficiency Review', duration: 10, description: 'Loss harvesting and location optimization' },
    ],
    suggestedQuestions: [
      'How comfortable are you with current volatility?',
      'Are you interested in ESG or thematic investing?',
      'Should we consider tax-loss harvesting?',
      'Any liquidity needs we should plan for?',
    ],
  },
  {
    id: 'estate-planning',
    name: 'Estate Planning',
    icon: Shield,
    description: 'Legacy planning, trusts, and wealth transfer strategies',
    color: 'purple',
    agenda: [
      { id: '1', title: 'Estate Planning Goals', duration: 15, description: 'Review objectives and concerns' },
      { id: '2', title: 'Current Documents Review', duration: 10, description: 'Wills, trusts, powers of attorney', questions: ['When were documents last updated?', 'Do beneficiaries need review?'] },
      { id: '3', title: 'Beneficiary Analysis', duration: 15, description: 'Review all account beneficiaries' },
      { id: '4', title: 'Wealth Transfer Strategy', duration: 20, description: 'Gifting strategies and timing' },
      { id: '5', title: 'Action Items & Attorney Coordination', duration: 10, description: 'Next steps and timeline' },
    ],
    suggestedQuestions: [
      'Have there been any family changes (births, marriages, divorces)?',
      'Do you have specific charitable intentions?',
      'Are you concerned about estate taxes?',
      'Who should we involve in these discussions?',
    ],
  },
  {
    id: 'retirement-planning',
    name: 'Retirement Planning',
    icon: BookOpen,
    description: 'Retirement income strategies and distribution planning',
    color: 'amber',
    agenda: [
      { id: '1', title: 'Retirement Vision', duration: 15, description: 'Lifestyle goals and timeline' },
      { id: '2', title: 'Income Gap Analysis', duration: 20, description: 'Projected expenses vs income sources', questions: ['When will you claim Social Security?', 'Any pension considerations?'] },
      { id: '3', title: 'Distribution Strategy', duration: 15, description: 'Which accounts to draw from when' },
      { id: '4', title: 'Healthcare Planning', duration: 10, description: 'Medicare and long-term care' },
      { id: '5', title: 'Roth Conversion Analysis', duration: 10, description: 'Tax optimization opportunities' },
    ],
    suggestedQuestions: [
      'Have you thought about your desired retirement age?',
      'What does your ideal retirement look like?',
      'Are you concerned about healthcare costs?',
      'Should we consider Roth conversions?',
    ],
  },
  {
    id: 'tax-planning',
    name: 'Tax Planning',
    icon: FileText,
    description: 'Annual tax strategy and optimization review',
    color: 'teal',
    agenda: [
      { id: '1', title: 'Tax Return Review', duration: 15, description: 'Prior year highlights and changes' },
      { id: '2', title: 'Current Year Projection', duration: 20, description: 'Estimated tax liability', questions: ['Any significant income changes?', 'New deductions to consider?'] },
      { id: '3', title: 'Deduction Strategies', duration: 15, description: 'Bunching and timing opportunities' },
      { id: '4', title: 'Investment Tax Optimization', duration: 15, description: 'Tax-loss harvesting and location' },
      { id: '5', title: 'Year-End Action Plan', duration: 10, description: 'Items to complete before December 31' },
    ],
    suggestedQuestions: [
      'Have there been any major income changes this year?',
      'Are you maximizing tax-advantaged accounts?',
      'Should we consider charitable giving strategies?',
      'Any major expenses that might be deductible?',
    ],
  },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function getColorClasses(color: string): string {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    indigo: 'bg-navy-50 text-navy-700 border-navy-200',
    purple: 'bg-navy-50 text-navy-600 border-navy-200',
    amber: 'bg-amber-50 text-amber-600 border-amber-200',
    teal: 'bg-teal-50 text-teal-600 border-teal-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    pink: 'bg-pink-50 text-pink-600 border-pink-200',
  };
  return colorMap[color] || colorMap.blue;
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function MeetingPrepPanel({
  boardId,
  participants,
  previousMeetings = [],
  onStartMeeting,
  onGenerateAgenda,
  className = '',
}: MeetingPrepPanelProps) {
  // State
  const [selectedTemplate, setSelectedTemplate] = useState<MeetingTemplate>(MEETING_TEMPLATES[0]);
  const [agenda, setAgenda] = useState<AgendaItem[]>(MEETING_TEMPLATES[0].agenda);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { id: '1', label: 'Review previous meeting notes', checked: false, category: 'review' },
    { id: '2', label: 'Check action item completion status', checked: false, category: 'actions' },
    { id: '3', label: 'Prepare portfolio performance report', checked: false, category: 'documents' },
    { id: '4', label: "Review client's recent account activity", checked: false, category: 'review' },
    { id: '5', label: 'Update financial plan projections', checked: false, category: 'documents' },
    { id: '6', label: 'Research any new topics to discuss', checked: false, category: 'research' },
    { id: '7', label: 'Prepare presentation materials', checked: false, category: 'documents' },
    { id: '8', label: 'Confirm meeting technology working', checked: false, category: 'review' },
  ]);
  const [clientNotes, setClientNotes] = useState<ClientNote[]>([
    { id: '1', date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), content: 'Prefers detailed written summaries after meetings', category: 'preference' },
    { id: '2', date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), content: 'Concerned about market volatility - emphasize long-term strategy', category: 'concern' },
    { id: '3', date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), content: 'Daughter starting college in Fall 2025', category: 'milestone' },
  ]);
  
  // UI State
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    agenda: true,
    briefing: true,
    checklist: true,
    notes: false,
    capture: true,
  });
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
  const [editingAgendaItem, setEditingAgendaItem] = useState<string | null>(null);
  const [editAgendaValue, setEditAgendaValue] = useState('');
  const [editDurationValue, setEditDurationValue] = useState(0);
  const [newQuestion, setNewQuestion] = useState('');
  const [showAddQuestion, setShowAddQuestion] = useState<string | null>(null);

  // Derived values
  const totalDuration = useMemo(() => agenda.reduce((sum, item) => sum + item.duration, 0), [agenda]);
  const completedChecklistItems = checklist.filter(item => item.checked).length;
  const checklistProgress = (completedChecklistItems / checklist.length) * 100;

  // Handlers
  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  }, []);

  const handleTemplateChange = useCallback((template: MeetingTemplate) => {
    setSelectedTemplate(template);
    setAgenda(template.agenda);
    setShowTemplateDropdown(false);
    onGenerateAgenda(template.id);
  }, [onGenerateAgenda]);

  const toggleChecklistItem = useCallback((id: string) => {
    setChecklist(prev => prev.map(item =>
      item.id === id ? { ...item, checked: !item.checked } : item
    ));
  }, []);

  const addAgendaItem = useCallback(() => {
    const newItem: AgendaItem = {
      id: `custom-${Date.now()}`,
      title: 'New Agenda Item',
      duration: 10,
      isEditable: true,
    };
    setAgenda(prev => [...prev, newItem]);
  }, []);

  const removeAgendaItem = useCallback((id: string) => {
    setAgenda(prev => prev.filter(item => item.id !== id));
  }, []);

  const startEditingAgenda = useCallback((item: AgendaItem) => {
    setEditingAgendaItem(item.id);
    setEditAgendaValue(item.title);
    setEditDurationValue(item.duration);
  }, []);

  const saveAgendaEdit = useCallback(() => {
    if (!editingAgendaItem) return;
    setAgenda(prev => prev.map(item =>
      item.id === editingAgendaItem
        ? { ...item, title: editAgendaValue, duration: editDurationValue }
        : item
    ));
    setEditingAgendaItem(null);
  }, [editingAgendaItem, editAgendaValue, editDurationValue]);

  const cancelAgendaEdit = useCallback(() => {
    setEditingAgendaItem(null);
    setEditAgendaValue('');
    setEditDurationValue(0);
  }, []);

  const updateAgendaDuration = useCallback((id: string, delta: number) => {
    setAgenda(prev => prev.map(item =>
      item.id === id
        ? { ...item, duration: Math.max(5, item.duration + delta) }
        : item
    ));
  }, []);

  const addQuestion = useCallback((agendaItemId: string) => {
    if (!newQuestion.trim()) return;
    setAgenda(prev => prev.map(item =>
      item.id === agendaItemId
        ? { ...item, questions: [...(item.questions || []), newQuestion] }
        : item
    ));
    setNewQuestion('');
    setShowAddQuestion(null);
  }, [newQuestion]);

  const removeQuestion = useCallback((agendaItemId: string, questionIndex: number) => {
    setAgenda(prev => prev.map(item =>
      item.id === agendaItemId
        ? { ...item, questions: item.questions?.filter((_, i) => i !== questionIndex) }
        : item
    ));
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingAgendaItem) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          saveAgendaEdit();
        } else if (e.key === 'Escape') {
          cancelAgendaEdit();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingAgendaItem, saveAgendaEdit, cancelAgendaEdit]);

  // Get last meeting
  const lastMeeting = previousMeetings[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden flex flex-col max-h-[calc(100vh-2rem)]',
        className
      )}
    >
      {/* Header */}
      <div className="px-6 py-5 bg-gradient-to-r from-slate-50 to-white border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-navy-500 to-navy-600 flex items-center justify-center shadow-lg shadow-navy-200">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Pre-Meeting Prep</h1>
              <p className="text-sm text-gray-500">Board ID: {boardId}</p>
            </div>
          </div>
          
          {/* Start Meeting Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onStartMeeting}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-navy-700 to-navy-600 text-white rounded-xl font-semibold shadow-lg shadow-navy-200 hover:shadow-xl hover:shadow-navy-300 transition-all"
          >
            <Play className="w-5 h-5 fill-current" />
            Start Meeting
          </motion.button>
        </div>

        {/* Participants Summary */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">
              {participants.length} {participants.length === 1 ? 'Participant' : 'Participants'}
            </span>
          </div>
          <div className="flex -space-x-2">
            {participants.slice(0, 4).map((p, i) => (
              <div
                key={p.id}
                className="w-8 h-8 rounded-full bg-gradient-to-br from-navy-400 to-navy-500 border-2 border-white flex items-center justify-center text-white text-xs font-bold"
                style={{ zIndex: participants.length - i }}
                title={`${p.name} (${p.role})`}
              >
                {p.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
            ))}
            {participants.length > 4 && (
              <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-gray-600 text-xs font-bold">
                +{participants.length - 4}
              </div>
            )}
          </div>
          {lastMeeting && (
            <div className="flex items-center gap-2 text-sm text-gray-500 ml-auto">
              <History className="w-4 h-4" />
              Last meeting: {formatDate(lastMeeting.date)}
            </div>
          )}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Template Selector */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
            Meeting Template
          </label>
          <div className="relative">
            <button
              onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}
              className="w-full flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-xl hover:border-navy-300 transition-colors text-left"
            >
              <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', getColorClasses(selectedTemplate.color))}>
                <selectedTemplate.icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{selectedTemplate.name}</p>
                <p className="text-sm text-gray-500">{selectedTemplate.description}</p>
              </div>
              <ChevronDown className={cn('w-5 h-5 text-gray-400 transition-transform', showTemplateDropdown && 'rotate-180')} />
            </button>

            <AnimatePresence>
              {showTemplateDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowTemplateDropdown(false)} 
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute left-0 right-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-20"
                  >
                    {MEETING_TEMPLATES.map(template => (
                      <button
                        key={template.id}
                        onClick={() => handleTemplateChange(template)}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors',
                          selectedTemplate.id === template.id && 'bg-navy-50'
                        )}
                      >
                        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', getColorClasses(template.color))}>
                          <template.icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <p className={cn('font-semibold', selectedTemplate.id === template.id ? 'text-navy-800' : 'text-gray-900')}>
                            {template.name}
                          </p>
                          <p className="text-sm text-gray-500">{template.description}</p>
                        </div>
                        {selectedTemplate.id === template.id && <Check className="w-5 h-5 text-navy-700" />}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Meeting Agenda Section */}
        <div className="border-b border-gray-100">
          <button
            onClick={() => toggleSection('agenda')}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-navy-50 flex items-center justify-center">
                <ListTodo className="w-4 h-4 text-navy-700" />
              </div>
              <div className="text-left">
                <h2 className="font-semibold text-gray-900">Meeting Agenda</h2>
                <p className="text-sm text-gray-500">{agenda.length} items - {formatDuration(totalDuration)} total</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); addAgendaItem(); }}
                className="p-2 text-gray-400 hover:text-navy-700 hover:bg-navy-50 rounded-lg transition-colors"
                title="Add agenda item"
              >
                <Plus className="w-4 h-4" />
              </button>
              {expandedSections.agenda ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </div>
          </button>

          <AnimatePresence>
            {expandedSections.agenda && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-6 pb-4 space-y-3">
                  {agenda.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="group bg-gray-50 rounded-xl p-4 border border-gray-100 hover:border-navy-200 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-navy-100 text-navy-700 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                          {index + 1}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          {editingAgendaItem === item.id ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={editAgendaValue}
                                onChange={(e) => setEditAgendaValue(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
                                autoFocus
                              />
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500">Duration:</span>
                                <input
                                  type="number"
                                  value={editDurationValue}
                                  onChange={(e) => setEditDurationValue(parseInt(e.target.value) || 0)}
                                  className="w-20 px-2 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
                                  min={5}
                                  step={5}
                                />
                                <span className="text-sm text-gray-500">min</span>
                                <button onClick={saveAgendaEdit} className="p-1 text-green-600 hover:bg-green-50 rounded">
                                  <Check className="w-4 h-4" />
                                </button>
                                <button onClick={cancelAgendaEdit} className="p-1 text-red-600 hover:bg-red-50 rounded">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-start justify-between">
                                <div>
                                  <h3 className="font-medium text-gray-900">{item.title}</h3>
                                  {item.description && (
                                    <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => updateAgendaDuration(item.id, -5)}
                                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <span className="text-sm font-medium text-gray-600 w-12 text-center">{item.duration}m</span>
                                  <button
                                    onClick={() => updateAgendaDuration(item.id, 5)}
                                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => startEditingAgenda(item)}
                                    className="p-1 text-gray-400 hover:text-navy-700 hover:bg-navy-50 rounded ml-1"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => removeAgendaItem(item.id)}
                                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>

                              {/* Questions */}
                              {item.questions && item.questions.length > 0 && (
                                <div className="mt-3 space-y-1.5">
                                  {item.questions.map((question, qIndex) => (
                                    <div key={qIndex} className="flex items-start gap-2 group/question">
                                      <HelpCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                                      <span className="text-sm text-gray-600 flex-1">{question}</span>
                                      <button
                                        onClick={() => removeQuestion(item.id, qIndex)}
                                        className="opacity-0 group-hover/question:opacity-100 p-0.5 text-gray-400 hover:text-red-500 rounded transition-opacity"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Add Question */}
                              {showAddQuestion === item.id ? (
                                <div className="mt-3 flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={newQuestion}
                                    onChange={(e) => setNewQuestion(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') addQuestion(item.id); }}
                                    placeholder="Add a question..."
                                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
                                    autoFocus
                                  />
                                  <button onClick={() => addQuestion(item.id)} className="p-1 text-green-600 hover:bg-green-50 rounded">
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => { setShowAddQuestion(null); setNewQuestion(''); }} className="p-1 text-red-600 hover:bg-red-50 rounded">
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setShowAddQuestion(item.id)}
                                  className="mt-3 flex items-center gap-1.5 text-sm text-navy-700 hover:text-navy-800 font-medium"
                                >
                                  <Plus className="w-4 h-4" />
                                  Add Question
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {/* Suggested Questions */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      Suggested Questions
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedTemplate.suggestedQuestions.map((question, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            const firstItem = agenda[0];
                            if (firstItem) {
                              setAgenda(prev => prev.map(item =>
                                item.id === firstItem.id
                                  ? { ...item, questions: [...(item.questions || []), question] }
                                  : item
                              ));
                            }
                          }}
                          className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm text-gray-600 hover:border-navy-300 hover:text-navy-700 transition-colors"
                        >
                          + {question}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Client Briefing Section */}
        <div className="border-b border-gray-100">
          <button
            onClick={() => toggleSection('briefing')}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                <Briefcase className="w-4 h-4 text-green-600" />
              </div>
              <div className="text-left">
                <h2 className="font-semibold text-gray-900">Client Briefing</h2>
                <p className="text-sm text-gray-500">
                  {lastMeeting ? 'Previous meeting & action items' : 'No previous meetings'}
                </p>
              </div>
            </div>
            {expandedSections.briefing ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </button>

          <AnimatePresence>
            {expandedSections.briefing && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-6 pb-4 space-y-4">
                  {lastMeeting ? (
                    <>
                      {/* Last Meeting Summary */}
                      <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                        <div className="flex items-center gap-2 mb-2">
                          <History className="w-4 h-4 text-green-600" />
                          <span className="font-semibold text-green-800">Last Meeting</span>
                          <span className="text-sm text-green-600 ml-auto">{formatDate(lastMeeting.date)}</span>
                        </div>
                        <p className="text-sm text-green-700">{lastMeeting.summary}</p>
                      </div>

                      {/* Action Items from Last Meeting */}
                      {lastMeeting.actionItems.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <Target className="w-4 h-4 text-navy-500" />
                            Previous Action Items
                          </h4>
                          <div className="space-y-2">
                            {lastMeeting.actionItems.map((item, index) => (
                              <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                <CheckSquare className="w-4 h-4 text-gray-400 mt-0.5" />
                                <span className="text-sm text-gray-700">{item}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-6 bg-gray-50 rounded-xl">
                      <History className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No previous meetings found</p>
                      <p className="text-xs text-gray-400 mt-1">This appears to be your first meeting</p>
                    </div>
                  )}

                  {/* Client Notes */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-amber-500" />
                        Client Notes & Preferences
                      </h4>
                      <button
                        onClick={() => setExpandedSections(prev => ({ ...prev, notes: !prev.notes }))}
                        className="text-xs text-navy-700 hover:text-navy-800 font-medium"
                      >
                        {expandedSections.notes ? 'Hide' : 'Show All'}
                      </button>
                    </div>
                    <div className="space-y-2">
                      {clientNotes.slice(0, expandedSections.notes ? undefined : 3).map(note => (
                        <div
                          key={note.id}
                          className={cn(
                            'p-3 rounded-lg border text-sm',
                            note.category === 'preference' && 'bg-blue-50 border-blue-100 text-blue-700',
                            note.category === 'concern' && 'bg-red-50 border-red-100 text-red-700',
                            note.category === 'milestone' && 'bg-green-50 border-green-100 text-green-700',
                            note.category === 'general' && 'bg-gray-50 border-gray-100 text-gray-700',
                          )}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className={cn(
                              'text-xs font-medium px-2 py-0.5 rounded-full',
                              note.category === 'preference' && 'bg-blue-100 text-blue-700',
                              note.category === 'concern' && 'bg-red-100 text-red-700',
                              note.category === 'milestone' && 'bg-green-100 text-green-700',
                              note.category === 'general' && 'bg-gray-200 text-gray-700',
                            )}>
                              {note.category.charAt(0).toUpperCase() + note.category.slice(1)}
                            </span>
                            <span className="text-xs opacity-60">{formatDate(note.date)}</span>
                          </div>
                          {note.content}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Meeting Capture Section */}
        <div className="border-b border-gray-100">
          <button
            onClick={() => toggleSection('capture')}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-navy-50 flex items-center justify-center">
                <Shield className="w-4 h-4 text-navy-600" />
              </div>
              <div className="text-left">
                <h2 className="font-semibold text-gray-900">Meeting Capture</h2>
                <p className="text-sm text-gray-500">Auto-join Zoom, Teams, and Meet</p>
              </div>
            </div>
            {expandedSections.capture ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </button>

          <AnimatePresence>
            {expandedSections.capture && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-6 pb-6">
                  <MeetingCapturePanel onStartLocalCapture={onStartMeeting} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Pre-Meeting Checklist Section */}
        <div>
          <button
            onClick={() => toggleSection('checklist')}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                <CheckSquare className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-left">
                <h2 className="font-semibold text-gray-900">Pre-Meeting Checklist</h2>
                <p className="text-sm text-gray-500">
                  {completedChecklistItems} of {checklist.length} completed
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Progress Bar */}
              <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${checklistProgress}%` }}
                  className={cn(
                    'h-full rounded-full transition-colors',
                    checklistProgress === 100 ? 'bg-green-500' : 'bg-amber-500'
                  )}
                />
              </div>
              {expandedSections.checklist ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </div>
          </button>

          <AnimatePresence>
            {expandedSections.checklist && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-6 pb-4">
                  {(['review', 'documents', 'actions', 'research'] as const).map(category => {
                    const categoryItems = checklist.filter(item => item.category === category);
                    if (categoryItems.length === 0) return null;
                    
                    const categoryLabels: Record<string, string> = {
                      review: 'Review Previous Materials',
                      documents: 'Prepare Documents',
                      actions: 'Action Items',
                      research: 'Research & Preparation',
                    };
                    
                    const categoryIcons: Record<string, typeof History> = {
                      review: History,
                      documents: FileText,
                      actions: Target,
                      research: Sparkles,
                    };
                    
                    const Icon = categoryIcons[category];
                    
                    return (
                      <div key={category} className="mb-4 last:mb-0">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                          <Icon className="w-3.5 h-3.5" />
                          {categoryLabels[category]}
                        </h4>
                        <div className="space-y-2">
                          {categoryItems.map(item => (
                            <motion.label
                              key={item.id}
                              whileHover={{ x: 2 }}
                              className={cn(
                                'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors',
                                item.checked ? 'bg-green-50 border border-green-100' : 'bg-gray-50 border border-gray-100 hover:border-gray-200'
                              )}
                            >
                              <div className={cn(
                                'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                                item.checked ? 'bg-green-500 border-green-500' : 'border-gray-300'
                              )}>
                                {item.checked && <Check className="w-3.5 h-3.5 text-white" />}
                              </div>
                              <input
                                type="checkbox"
                                checked={item.checked}
                                onChange={() => toggleChecklistItem(item.id)}
                                className="sr-only"
                              />
                              <span className={cn(
                                'text-sm flex-1',
                                item.checked ? 'text-gray-500 line-through' : 'text-gray-700'
                              )}>
                                {item.label}
                              </span>
                            </motion.label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>Est. {formatDuration(totalDuration)}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4" />
              <span>{Math.round(checklistProgress)}% ready</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setAgenda(selectedTemplate.agenda);
                setChecklist(prev => prev.map(item => ({ ...item, checked: false })));
              }}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-medium transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Reset
            </button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onStartMeeting}
              className="flex items-center gap-2 px-5 py-2 bg-navy-700 text-white rounded-lg font-semibold hover:bg-navy-800 transition-colors shadow-md hover:shadow-lg"
            >
              <Play className="w-4 h-4 fill-current" />
              Start Meeting
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
