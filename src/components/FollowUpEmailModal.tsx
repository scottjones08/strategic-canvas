/**
 * Follow-up Email Modal Component
 * Draft and customize follow-up emails from meeting summaries
 * Features: tone selector, editable subject/body, copy/email client integration
 */

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  X,
  Copy,
  ExternalLink,
  Check,
  ChevronDown,
  Edit2,
  RefreshCw,
  Loader2,
  User,
  Users,
  Calendar,
  ListTodo,
  MessageSquare,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import {
  MeetingSummary,
  FollowUpEmail,
  EmailTone,
  EmailOptions,
  generateFollowUpEmail,
  copyEmailToClipboard,
  openInMailClient,
} from '../lib/meeting-summary';

interface FollowUpEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: MeetingSummary;
  aiApiKey?: string;
  onEmailGenerated?: (email: FollowUpEmail) => void;
  defaultRecipientName?: string;
  defaultSenderName?: string;
  defaultMeetingTitle?: string;
}

export default function FollowUpEmailModal({
  isOpen,
  onClose,
  summary,
  aiApiKey,
  onEmailGenerated,
  defaultRecipientName = 'Team',
  defaultSenderName,
  defaultMeetingTitle,
}: FollowUpEmailModalProps) {
  const [email, setEmail] = useState<FollowUpEmail | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Options state
  const [tone, setTone] = useState<EmailTone>('formal');
  const [includeActionItems, setIncludeActionItems] = useState(true);
  const [includeDecisions, setIncludeDecisions] = useState(true);
  const [includeNextSteps, setIncludeNextSteps] = useState(true);
  const [recipientName, setRecipientName] = useState(defaultRecipientName);
  const [senderName, setSenderName] = useState(defaultSenderName || '');
  const [meetingTitle, setMeetingTitle] = useState(defaultMeetingTitle || 'our meeting');
  const [nextMeetingDate, setNextMeetingDate] = useState('');

  // Editing state
  const [isEditingSubject, setIsEditingSubject] = useState(false);
  const [isEditingBody, setIsEditingBody] = useState(false);
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');

  const [showToneMenu, setShowToneMenu] = useState(false);
  const [showOptionsPanel, setShowOptionsPanel] = useState(false);

  // Tone labels and emojis
  const toneConfig: Record<EmailTone, { label: string; emoji: string; description: string }> = {
    formal: { label: 'Formal', emoji: '👔', description: 'Professional and structured' },
    casual: { label: 'Casual', emoji: '👋', description: 'Relaxed but professional' },
    friendly: { label: 'Friendly', emoji: '😊', description: 'Warm and personable' },
  };

  // Generate email
  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const options: EmailOptions & { aiApiKey?: string } = {
        tone,
        includeActionItems,
        includeDecisions,
        includeNextSteps,
        recipientName,
        senderName: senderName || undefined,
        meetingTitle,
        nextMeetingDate: nextMeetingDate || undefined,
        aiApiKey,
      };

      const generatedEmail = await generateFollowUpEmail(summary, options);
      setEmail(generatedEmail);
      setEditSubject(generatedEmail.subject);
      setEditBody(generatedEmail.body);
      onEmailGenerated?.(generatedEmail);
    } catch (err: any) {
      setError(err.message || 'Failed to generate email');
    } finally {
      setIsGenerating(false);
    }
  }, [summary, tone, includeActionItems, includeDecisions, includeNextSteps, recipientName, senderName, meetingTitle, nextMeetingDate, aiApiKey, onEmailGenerated]);

  // Generate on first open
  useEffect(() => {
    if (isOpen && !email && !isGenerating) {
      handleGenerate();
    }
  }, [isOpen, email, isGenerating, handleGenerate]);

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Reset editing states
      setIsEditingSubject(false);
      setIsEditingBody(false);
    }
  }, [isOpen]);

  // Save subject edit
  const saveSubjectEdit = useCallback(() => {
    if (email) {
      setEmail({ ...email, subject: editSubject });
    }
    setIsEditingSubject(false);
  }, [email, editSubject]);

  // Save body edit
  const saveBodyEdit = useCallback(() => {
    if (email) {
      setEmail({ ...email, body: editBody });
    }
    setIsEditingBody(false);
  }, [email, editBody]);

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    if (email) {
      await copyEmailToClipboard(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [email]);

  // Open in mail client
  const handleOpenInMailClient = useCallback(() => {
    if (email) {
      openInMailClient(email);
    }
  }, [email]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative w-full max-w-3xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-navy-500 to-navy-500 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="w-6 h-6" />
              <h2 className="text-lg font-semibold">Draft Follow-up Email</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Options Panel */}
          <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-wrap">
                {/* Tone selector */}
                <div className="relative">
                  <button
                    onClick={() => setShowToneMenu(!showToneMenu)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm hover:border-gray-300 transition-colors"
                  >
                    <span>{toneConfig[tone].emoji}</span>
                    <span className="font-medium">{toneConfig[tone].label}</span>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>

                  <AnimatePresence>
                    {showToneMenu && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowToneMenu(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute left-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-20"
                        >
                          {(['formal', 'casual', 'friendly'] as EmailTone[]).map((t) => (
                            <button
                              key={t}
                              onClick={() => {
                                setTone(t);
                                setShowToneMenu(false);
                              }}
                              className={`w-full px-4 py-2 text-left flex items-center gap-3 ${
                                tone === t ? 'bg-navy-50' : 'hover:bg-gray-50'
                              }`}
                            >
                              <span className="text-xl">{toneConfig[t].emoji}</span>
                              <div>
                                <p className={`text-sm font-medium ${tone === t ? 'text-navy-800' : 'text-gray-800'}`}>
                                  {toneConfig[t].label}
                                </p>
                                <p className="text-xs text-gray-500">{toneConfig[t].description}</p>
                              </div>
                              {tone === t && <Check className="w-4 h-4 text-navy-700 ml-auto" />}
                            </button>
                          ))}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>

                {/* Include toggles */}
                <div className="flex items-center gap-2">
                  <ToggleChip
                    active={includeActionItems}
                    onClick={() => setIncludeActionItems(!includeActionItems)}
                    icon={<ListTodo className="w-3.5 h-3.5" />}
                    label="Actions"
                    count={summary.actionItems.length}
                  />
                  <ToggleChip
                    active={includeDecisions}
                    onClick={() => setIncludeDecisions(!includeDecisions)}
                    icon={<Check className="w-3.5 h-3.5" />}
                    label="Decisions"
                    count={summary.decisions.length}
                  />
                  <ToggleChip
                    active={includeNextSteps}
                    onClick={() => setIncludeNextSteps(!includeNextSteps)}
                    icon={<ArrowRight className="w-3.5 h-3.5" />}
                    label="Next Steps"
                    count={summary.nextSteps.length}
                  />
                </div>
              </div>

              {/* More options button */}
              <button
                onClick={() => setShowOptionsPanel(!showOptionsPanel)}
                className="text-sm text-navy-700 hover:text-navy-800 font-medium"
              >
                {showOptionsPanel ? 'Hide options' : 'More options'}
              </button>
            </div>

            {/* Expanded options */}
            <AnimatePresence>
              {showOptionsPanel && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-4 grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        <User className="w-3 h-3 inline mr-1" />
                        Recipient Name
                      </label>
                      <input
                        type="text"
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        placeholder="Team"
                        className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        <Users className="w-3 h-3 inline mr-1" />
                        Sender Name
                      </label>
                      <input
                        type="text"
                        value={senderName}
                        onChange={(e) => setSenderName(e.target.value)}
                        placeholder="Your name"
                        className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        <MessageSquare className="w-3 h-3 inline mr-1" />
                        Meeting Title
                      </label>
                      <input
                        type="text"
                        value={meetingTitle}
                        onChange={(e) => setMeetingTitle(e.target.value)}
                        placeholder="Project kickoff"
                        className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        <Calendar className="w-3 h-3 inline mr-1" />
                        Next Meeting (optional)
                      </label>
                      <input
                        type="text"
                        value={nextMeetingDate}
                        onChange={(e) => setNextMeetingDate(e.target.value)}
                        placeholder="e.g., Friday at 2pm"
                        className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Email Preview */}
          <div className="flex-1 overflow-y-auto p-6">
            {isGenerating ? (
              <div className="py-12 text-center">
                <Loader2 className="w-10 h-10 text-navy-500 mx-auto mb-4 animate-spin" />
                <p className="text-gray-600 font-medium">Generating email...</p>
                <p className="text-sm text-gray-400 mt-1">
                  {aiApiKey ? 'Using AI for personalized content' : 'Creating from template'}
                </p>
              </div>
            ) : error ? (
              <div className="py-12 text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <X className="w-6 h-6 text-red-500" />
                </div>
                <p className="text-red-600 font-medium">{error}</p>
                <button
                  onClick={handleGenerate}
                  className="mt-4 px-4 py-2 bg-navy-700 text-white rounded-lg text-sm font-medium hover:bg-navy-800"
                >
                  Try Again
                </button>
              </div>
            ) : email ? (
              <div className="space-y-4">
                {/* Subject Line */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Subject
                    </label>
                    {!isEditingSubject && (
                      <button
                        onClick={() => {
                          setEditSubject(email.subject);
                          setIsEditingSubject(true);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {isEditingSubject ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editSubject}
                        onChange={(e) => setEditSubject(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500"
                        autoFocus
                      />
                      <button
                        onClick={() => setIsEditingSubject(false)}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <button
                        onClick={saveSubjectEdit}
                        className="p-2 text-green-500 hover:text-green-600 rounded-lg"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <p className="text-gray-900 font-medium">{email.subject}</p>
                  )}
                </div>

                {/* Email Body */}
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Email Body
                    </label>
                    {!isEditingBody && (
                      <button
                        onClick={() => {
                          setEditBody(email.body);
                          setIsEditingBody(true);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {isEditingBody ? (
                    <div className="space-y-2">
                      <textarea
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                        className="w-full h-64 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 font-mono text-sm resize-none"
                        autoFocus
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setIsEditingBody(false)}
                          className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={saveBodyEdit}
                          className="px-3 py-1.5 text-sm bg-navy-700 text-white rounded-lg hover:bg-navy-800"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="prose prose-sm max-w-none">
                      {email.body.split('\n').map((line, i) => {
                        // Handle markdown-style bold
                        if (line.startsWith('**') && line.endsWith('**')) {
                          return (
                            <p key={i} className="font-semibold text-gray-900 mb-1">
                              {line.replace(/\*\*/g, '')}
                            </p>
                          );
                        }
                        // Handle bullet points
                        if (line.startsWith('•')) {
                          return (
                            <p key={i} className="text-gray-700 pl-4 mb-1">
                              {line}
                            </p>
                          );
                        }
                        // Empty lines
                        if (!line.trim()) {
                          return <br key={i} />;
                        }
                        // Regular text
                        return (
                          <p key={i} className="text-gray-700 mb-1">
                            {line}
                          </p>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* AI indicator */}
                {aiApiKey && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Sparkles className="w-3.5 h-3.5 text-navy-500" />
                    <span>Generated with AI assistance</span>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Footer Actions */}
          {email && !isGenerating && (
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <button
                onClick={handleGenerate}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Regenerate
              </button>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleCopy}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    copied
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy to Clipboard'}
                </button>

                <button
                  onClick={handleOpenInMailClient}
                  className="flex items-center gap-2 px-4 py-2 bg-navy-700 text-white rounded-lg text-sm font-medium hover:bg-navy-800 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open in Mail Client
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================

interface ToggleChipProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count?: number;
}

function ToggleChip({ active, onClick, icon, label, count }: ToggleChipProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
        active
          ? 'bg-navy-100 text-navy-800 border border-navy-200'
          : 'bg-gray-100 text-gray-500 border border-transparent hover:bg-gray-200'
      }`}
    >
      {icon}
      <span>{label}</span>
      {count !== undefined && count > 0 && (
        <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
          active ? 'bg-navy-200' : 'bg-gray-200'
        }`}>
          {count}
        </span>
      )}
    </button>
  );
}
