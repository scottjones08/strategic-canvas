import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, MicOff, Sparkles, Target, Clock, Rocket, Share2, ChevronRight, CheckCircle, Users, FileText, Mail, Link2, 
  User, UserPlus, Settings, LogOut, Plus, Trash2, Edit2, Save, ChevronDown, Eye, EyeOff, MessageSquare, RefreshCw,
  Lock, Wand2, Copy, ExternalLink, Shield, Edit3, Download, FileDown, Volume2, VolumeX, Brain, Activity, Wifi, WifiOff, Globe, Printer
} from 'lucide-react';

// Types
interface User {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  color: string;
  personalNotes: string;
  privateNotes: PrivateNote[];
  lastActive: Date;
  preferences: UserPreferences;
  cursor?: { x: number; y: number };
}

interface PrivateNote {
  id: string;
  content: string;
  type: 'note' | 'question' | 'followup';
  phase?: string;
  createdAt: Date;
  isResolved: boolean;
  aiSuggested: boolean;
}

interface UserPreferences {
  autoTranscribe: boolean;
  notifications: boolean;
  theme: 'light' | 'dark';
}

interface Board {
  id: string;
  name: string;
  ownerId: string;
  sharedWith: string[];
  visualNodes: VisualNode[];
  createdAt: Date;
  updatedAt: Date;
  magicLink?: string;
  magicLinkPermissions: 'view' | 'edit';
}

interface VisualNode {
  id: string;
  type: 'opportunity' | 'risk' | 'action' | 'milestone';
  x: number;
  y: number;
  content: string;
  enrichedContent: string;
  phase: string;
  createdBy: string;
}

interface MeetingPhase {
  id: string;
  name: string;
  subtitle: string;
  icon: string;
  duration: number;
  prompts: string[];
}

// Constants
const TEAM_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
const MAGIC_LINK_BASE = 'https://strategic-canvas.app/join';

const MEETING_PHASES = [
  { id: 'intro', name: 'Introduction', subtitle: 'Understanding your business', icon: '👋', duration: 15, prompts: ['Tell me about your business', 'What does success look like?', 'What are you most proud of?'] },
  { id: 'discovery', name: 'Discovery', subtitle: 'Current state & challenges', icon: '🔍', duration: 20, prompts: ['Walk me through your workflow', 'Where are bottlenecks?', 'What tools do you use today?'] },
  { id: 'opportunities', name: 'Opportunities', subtitle: 'Growth possibilities', icon: '💡', duration: 25, prompts: ['Top 3 opportunities?', 'What would doubling revenue look like?', 'What holds you back?'] },
  { id: 'risk', name: 'Risk Analysis', subtitle: 'Competitors & market risks', icon: '🛡️', duration: 20, prompts: ['Who are your main competitors?', 'What market risks exist?', 'What keeps you up at night?'] },
  { id: 'strategy', name: 'Strategy', subtitle: 'Building action plan', icon: '🎯', duration: 20, prompts: ['What\'s the first thing we should tackle?', 'What resources do you have available?', 'How will you measure success?'] },
  { id: 'next-steps', name: 'Next Steps', subtitle: 'Committing to action', icon: '🚀', duration: 10, prompts: ['What\'s your commitment for this week?', 'When should we follow up?', 'Any final thoughts or concerns?'] }
];

const generateMagicLink = (boardId: string): { link: string; code: string } => {
  const code = Math.random().toString(36).substring(2, 10).toUpperCase();
  const link = `${MAGIC_LINK_BASE}/${boardId}/${code}`;
  return { link, code };
};

const generateAIQuestions = (phase: string): PrivateNote[] => {
  const baseQuestions: Record<string, string[]> = {
    intro: ['What inspired you to start your business?', 'Describe your ideal customer in detail', 'What\'s the biggest win you\'ve had recently?'],
    discovery: ['Walk me through a typical day in your business', 'Where do you feel like you\'re wasting the most time?', 'What systems have you tried before?'],
    opportunities: ['If you could wave a magic wand and change one thing, what would it be?', 'What would a successful 12-month look like for you?', 'What\'s preventing you from scaling now?'],
    risk: ['What\'s your biggest competitor doing right?', 'What happens if you do nothing for the next 6 months?', 'What\'s the biggest threat to your business model?'],
    strategy: ['What\'s the lowest-hanging fruit we could tackle first?', 'What resources can we realistically commit?', 'Who will be the key stakeholders?'],
    'next-steps': ['What\'s the one thing you want to accomplish by next week?', 'Can we schedule the kickoff call for early next week?', 'What\'s your preferred communication method?']
  };
  const questions = baseQuestions[phase] || baseQuestions.intro;
  return questions.map((content, i) => ({
    id: `ai-${Date.now()}-${i}`,
    content,
    type: 'question' as const,
    phase,
    createdAt: new Date(),
    isResolved: false,
    aiSuggested: true
  }));
};

// Real-time Collaboration Indicator
const CollaboratorsView = ({ users, currentUser }: { users: User[]; currentUser: User }) => {
  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {users.slice(0, 4).map(user => (
          <motion.div key={user.id} initial={{ scale: 0 }} animate={{ scale: 1 }} className="relative">
            <div className="w-8 h-8 rounded-full border-2 border-gray-900 flex items-center justify-center text-white text-xs font-medium" style={{ backgroundColor: user.color }} title={user.name}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900" />
          </motion.div>
        ))}
      </div>
      <span className="text-xs text-green-400 flex items-center gap-1">
        <Activity className="w-3 h-3" />
        {users.length} active
      </span>
    </div>
  );
};

// PDF Export Modal
const PDFExportModal = ({ board, onClose }: { board: Board; onClose: () => void; }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'summary' | 'detailed' | 'presentation'>('summary');

  const handleExport = async () => {
    setIsExporting(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const exportContent = `
STRATEGIC CANVAS - ${board.name}
================================
Generated: ${new Date().toLocaleDateString()}

SECTIONS
--------

1. OPPORTUNITIES
${board.visualNodes.filter(n => n.type === 'opportunity').map(n => `- ${n.content}`).join('\n') || 'None captured'}

2. RISKS
${board.visualNodes.filter(n => n.type === 'risk').map(n => `- ${n.content}`).join('\n') || 'None captured'}

3. ACTION ITEMS
${board.visualNodes.filter(n => n.type === 'action').map(n => `- ${n.content}`).join('\n') || 'None captured'}

---
Generated by Strategic Canvas
    `.trim();

    const blob = new Blob([exportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${board.name.replace(/\s+/g, '-')}-export.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    setIsExporting(false);
    onClose();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><Printer className="w-5 h-5" /></div>
            <h2 className="text-xl font-bold">Export to PDF</h2>
          </div>
          <p className="text-white/80 text-sm">Generate a professional document for your client</p>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">Export Format</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'summary', label: 'Summary', desc: 'Key points only' },
                { id: 'detailed', label: 'Detailed', desc: 'Full analysis' },
                { id: 'presentation', label: 'Presentation', desc: 'Client-ready' }
              ].map(fmt => (
                <motion.button key={fmt.id} onClick={() => setExportFormat(fmt.id as typeof exportFormat)} whileHover={{ scale: 1.02 }} className={`p-3 rounded-xl border-2 ${exportFormat === fmt.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200'}`}>
                  <p className="font-medium text-sm">{fmt.label}</p>
                  <p className="text-xs text-gray-500">{fmt.desc}</p>
                </motion.button>
              ))}
            </div>
          </div>

          <div className="p-4 bg-blue-50 rounded-xl flex items-start gap-3">
            <FileDown className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-800">Ready to export</p>
              <p className="text-xs text-blue-600 mt-1">Your board will be formatted as a professional document.</p>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-gray-100 rounded-xl text-gray-700 font-medium">Cancel</button>
          <motion.button onClick={handleExport} disabled={isExporting} whileHover={{ scale: isExporting ? 1 : 1.02 }} whileTap={{ scale: isExporting ? 1 : 0.98 }} className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50">
            {isExporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {isExporting ? 'Generating...' : 'Export'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// AI Transcription Panel
const TranscriptionPanel = ({ isRecording, onToggleRecording, transcription, onTranscriptionUpdate, useWhisper }: { isRecording: boolean; onToggleRecording: () => void; transcription: string; onTranscriptionUpdate: (text: string) => void; useWhisper: boolean; }) => {
  const [audioLevel, setAudioLevel] = useState(0);
  const [whisperStatus, setWhisperStatus] = useState<'idle' | 'recording' | 'processing'>('idle');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (isRecording && 'webkitSpeechRecognition' in window) {
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onresult = (event: any) => {
        const last = event.results.length - 1;
        const transcript = event.results[last][0].transcript;
        onTranscriptionUpdate(transcription + ' ' + transcript);
      };
      recognitionRef.current = recognition;
      recognition.start();
    }
    return () => { if (recognitionRef.current) recognitionRef.current.stop(); };
  }, [isRecording]);

  useEffect(() => {
    if (isRecording) {
      const interval = setInterval(() => setAudioLevel(Math.random() * 0.5 + 0.1), 100);
      return () => clearInterval(interval);
    }
  }, [isRecording]);

  const simulateWhisperTranscription = () => {
    setWhisperStatus('processing');
    setTimeout(() => {
      setWhisperStatus('idle');
      onTranscriptionUpdate(transcription + ' [Whisper: High-accuracy transcription enabled] ');
    }, 2000);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white/10 backdrop-blur-xl rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-600'}`}>
            {isRecording ? <Mic className="w-5 h-5 text-white" /> : <MicOff className="w-5 h-5 text-gray-400" />}
          </div>
          <div>
            <h3 className="font-medium">Voice Transcription</h3>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              {useWhisper ? <span className="flex items-center gap-1 text-purple-400"><Brain className="w-3 h-3" /> OpenAI Whisper</span> : <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> Web Speech API</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {useWhisper && (
            <motion.button onClick={simulateWhisperTranscription} whileHover={{ scale: 1.05 }} className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-lg text-sm flex items-center gap-1">
              <Brain className="w-3 h-3" /> Test
            </motion.button>
          )}
          <motion.button onClick={onToggleRecording} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className={`px-4 py-2 rounded-xl ${isRecording ? 'bg-red-500' : 'bg-primary-500'} text-white font-medium`}>
            {isRecording ? 'Stop' : 'Start Recording'}
          </motion.button>
        </div>
      </div>

      {isRecording && (
        <div className="mb-4">
          <div className="flex items-center gap-1 h-8">
            {Array.from({ length: 20 }).map((_, i) => (
              <motion.div key={i} animate={{ height: isRecording ? [`${Math.random() * 60 + 20}%`, `${Math.random() * 80 + 20}%`] : '20%' }} transition={{ duration: 0.1, repeat: Infinity, repeatType: 'reverse' }} className="flex-1 rounded-full bg-green-500" />
            ))}
          </div>
        </div>
      )}

      <div className="bg-gray-900/50 rounded-xl p-4 min-h-[120px] max-h-[200px] overflow-y-auto">
        {transcription ? <p className="text-sm text-gray-300 whitespace-pre-wrap">{transcription}</p> : <p className="text-sm text-gray-500 italic">Start recording to capture conversation...</p>}
      </div>

      {useWhisper && (
        <div className="mt-4 p-3 bg-purple-500/10 rounded-xl flex items-start gap-2">
          <Brain className="w-4 h-4 text-purple-400 mt-0.5" />
          <div className="text-xs text-purple-300">
            <p className="font-medium">OpenAI Whisper Integration</p>
            <p className="mt-1 opacity-75">Add OpenAI API key for production-grade transcription with speaker detection.</p>
          </div>
        </div>
      )}
    </motion.div>
  );
};

// Magic Link Modal
const MagicLinkModal = ({ board, onClose, onRegenerate }: { board: Board; onClose: () => void; onRegenerate: () => void; }) => {
  const [copied, setCopied] = useState(false);
  const [permissions, setPermissions] = useState<Board['magicLinkPermissions']>(board.magicLinkPermissions);
  const [expiryDays, setExpiryDays] = useState(7);
  const magicLink = board.magicLink || generateMagicLink(board.id).link;
  
  const handleCopy = async () => { await navigator.clipboard.writeText(magicLink); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-primary-500 to-purple-500 p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><Link2 className="w-5 h-5" /></div>
            <h2 className="text-xl font-bold">Share Board</h2>
          </div>
          <p className="text-white/80 text-sm">Generate a magic link to share without signup</p>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">Magic Link</label>
            <div className="flex gap-2">
              <input type="text" readOnly value={magicLink} className="flex-1 px-4 py-3 bg-gray-50 rounded-xl text-sm font-mono text-gray-600" />
              <motion.button onClick={handleCopy} whileHover={{ scale: 1.05 }} className={`px-4 py-2 rounded-xl flex items-center gap-2 ${copied ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-700'}`}>
                {copied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                {copied ? 'Copied!' : 'Copy'}
              </motion.button>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">Access Level</label>
            <div className="grid grid-cols-2 gap-3">
              <motion.button onClick={() => setPermissions('view')} whileHover={{ scale: 1.02 }} className={`p-4 rounded-xl border-2 ${permissions === 'view' ? 'border-primary-500 bg-primary-50' : 'border-gray-200'}`}>
                <EyeOff className="w-5 h-5 mb-2 text-gray-600" />
                <p className="font-medium text-sm">View Only</p>
              </motion.button>
              <motion.button onClick={() => setPermissions('edit')} whileHover={{ scale: 1.02 }} className={`p-4 rounded-xl border-2 ${permissions === 'edit' ? 'border-primary-500 bg-primary-50' : 'border-gray-200'}`}>
                <Edit3 className="w-5 h-5 mb-2 text-primary-600" />
                <p className="font-medium text-sm">Full Access</p>
              </motion.button>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">Link Expiration</label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 7, 30, 0].map(days => (
                <motion.button key={days} onClick={() => setExpiryDays(days)} whileHover={{ scale: 1.05 }} className={`p-3 rounded-xl text-sm ${expiryDays === days ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-700'}`}>
                  {days === 0 ? 'Never' : `${days}d`}
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 flex gap-3">
          <motion.button onClick={onRegenerate} whileHover={{ scale: 1.02 }} className="flex-1 py-3 bg-gray-100 rounded-xl text-gray-700 font-medium flex items-center justify-center gap-2"><RefreshCw className="w-4 h-4" /> Regenerate</motion.button>
          <motion.button onClick={onClose} whileHover={{ scale: 1.02 }} className="flex-1 py-3 bg-gradient-to-r from-primary-500 to-purple-500 text-white rounded-xl font-medium">Done</motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Private Notes Panel
const PrivateNotesPanel = ({ user, onAddNote, onToggleResolve, currentPhase }: { user: User; onAddNote: (note: Omit<PrivateNote, 'id' | 'createdAt'>) => void; onToggleResolve: (id: string) => void; currentPhase: string; }) => {
  const [showPanel, setShowPanel] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [noteType, setNoteType] = useState<PrivateNote['type']>('note');
  const [isGenerating, setIsGenerating] = useState(false);
  const unresolvedNotes = (user.privateNotes || []).filter(n => !n.isResolved);

  const handleGenerateQuestions = () => {
    setIsGenerating(true);
    setTimeout(() => { generateAIQuestions(currentPhase).forEach(note => onAddNote(note)); setIsGenerating(false); }, 1500);
  };

  const handleAddNote = () => { if (newNote.trim()) { onAddNote({ content: newNote, type: noteType, phase: currentPhase, isResolved: false, aiSuggested: false }); setNewNote(''); } };

  return (
    <div className="relative">
      <motion.button onClick={() => setShowPanel(!showPanel)} whileHover={{ scale: 1.05 }} className={`px-4 py-2 rounded-xl flex items-center gap-2 ${showPanel ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-white/10'}`}>
        <Lock className="w-4 h-4" />
        Private Notes
        {unresolvedNotes.length > 0 && <span className="w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center">{unresolvedNotes.length}</span>}
      </motion.button>

      <AnimatePresence>
        {showPanel && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="absolute right-0 top-12 w-96 bg-white rounded-2xl shadow-2xl overflow-hidden z-50 max-h-[80vh] flex flex-col">
            <div className="p-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2"><Lock className="w-4 h-4" /> Private Notes</h3>
                <motion.button onClick={handleGenerateQuestions} disabled={isGenerating} whileHover={{ scale: 1.05 }} className="px-3 py-1 bg-white/20 rounded-lg text-sm flex items-center gap-1">
                  {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                  AI Suggest
                </motion.button>
              </div>
            </div>

            <div className="p-4 border-b border-gray-100">
              <div className="flex gap-2 mb-2">
                {(['note', 'question', 'followup'] as const).map(type => (
                  <button key={type} onClick={() => setNoteType(type)} className={`px-3 py-1 rounded-full text-xs capitalize ${noteType === type ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'}`}>{type}</button>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="text" value={newNote} onChange={(e) => setNewNote(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddNote()} placeholder="Add note..." className="flex-1 px-3 py-2 bg-gray-50 rounded-lg text-sm" />
                <motion.button onClick={handleAddNote} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="p-2 bg-primary-500 text-white rounded-lg"><Plus className="w-5 h-5" /></motion.button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-96">
              {unresolvedNotes.map(note => (
                <motion.div key={note.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`p-3 rounded-xl ${note.type === 'question' ? 'bg-purple-50' : note.type === 'followup' ? 'bg-amber-50' : 'bg-gray-50'}`}>
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {note.aiSuggested && <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full flex items-center gap-1"><Sparkles className="w-3 h-3" /> AI</span>}
                        <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full capitalize">{note.type}</span>
                      </div>
                      <p className="text-sm text-gray-800">{note.content}</p>
                    </div>
                    <motion.button onClick={() => onToggleResolve(note.id)} whileHover={{ scale: 1.1 }} className="p-1 text-green-500"><CheckCircle className="w-4 h-4" /></motion.button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// User Management
const UserManagement = ({ users, currentUser, onAddUser, onLogout }: { users: User[]; currentUser: User; onAddUser: (user: Omit<User, 'id' | 'lastActive' | 'privateNotes'>) => void; onLogout: () => void; }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'member' as User['role'] });
  const availableColors = TEAM_COLORS.filter(c => !users.some(u => u.color === c));

  return (
    <div className="relative">
      <motion.button onClick={() => setShowDropdown(!showDropdown)} whileHover={{ scale: 1.05 }} className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-xl">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium" style={{ backgroundColor: currentUser.color }}>{currentUser.name.charAt(0).toUpperCase()}</div>
        <span className="hidden md:block text-sm font-medium">{currentUser.name}</span>
        <ChevronDown className="w-4 h-4" />
      </motion.button>

      <AnimatePresence>
        {showDropdown && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl overflow-hidden z-50">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-medium" style={{ backgroundColor: currentUser.color }}>{currentUser.name.charAt(0).toUpperCase()}</div>
                <div>
                  <p className="font-medium text-gray-900">{currentUser.name}</p>
                  <p className="text-sm text-gray-500">{currentUser.email}</p>
                  <span className="text-xs px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full capitalize">{currentUser.role}</span>
                </div>
              </div>
            </div>

            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900 flex items-center gap-2"><Users className="w-4 h-4" /> Team ({users.length})</h4>
                <motion.button onClick={() => setShowInvite(true)} whileHover={{ scale: 1.05 }} className="p-1 bg-primary-100 text-primary-600 rounded-lg"><Plus className="w-4 h-4" /></motion.button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {users.map(user => (
                  <div key={user.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium" style={{ backgroundColor: user.color }}>{user.name.charAt(0).toUpperCase()}</div>
                    <div className="flex-1"><p className="text-sm font-medium text-gray-900 truncate">{user.name}</p></div>
                    <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full capitalize">{user.role}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 space-y-2">
              <motion.button onClick={() => setShowDropdown(false)} whileHover={{ scale: 1.02 }} className="w-full py-2 bg-gray-100 rounded-xl text-sm font-medium text-gray-700 flex items-center justify-center gap-2"><Settings className="w-4 h-4" /> Settings</motion.button>
              <motion.button onClick={onLogout} whileHover={{ scale: 1.02 }} className="w-full py-2 bg-red-50 rounded-xl text-sm font-medium text-red-600 flex items-center justify-center gap-2"><LogOut className="w-4 h-4" /> Sign Out</motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showInvite && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowInvite(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white rounded-2xl p-6 w-96" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-bold mb-4 text-gray-900 flex items-center gap-2"><UserPlus className="w-5 h-5" /> Invite Team Member</h3>
              <div className="space-y-4">
                <div><label className="text-sm text-gray-600 mb-1 block">Name</label><input type="text" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl" /></div>
                <div><label className="text-sm text-gray-600 mb-1 block">Email</label><input type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl" /></div>
                <div><label className="text-sm text-gray-600 mb-1 block">Role</label><select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value as User['role'] })} className="w-full px-4 py-2 border border-gray-200 rounded-xl"><option value="member">Member</option><option value="admin">Admin</option><option value="viewer">Viewer</option></select></div>
                <div className="flex gap-2">
                  <button onClick={() => setShowInvite(false)} className="flex-1 py-2 bg-gray-100 rounded-xl text-gray-600">Cancel</button>
                  <button onClick={() => { if (newUser.name && newUser.email) { onAddUser({ ...newUser, color: availableColors[0] }); setNewUser({ name: '', email: '', role: 'member' }); setShowInvite(false); }}} disabled={!newUser.name || !newUser.email} className="flex-1 py-2 bg-primary-500 text-white rounded-xl disabled:opacity-50">Send Invite</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Main App
export default function MeetingCompanion() {
  const [currentUser, setCurrentUser] = useState<User