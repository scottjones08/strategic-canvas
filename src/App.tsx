import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, MicOff, Sparkles, Target, Clock, Rocket, ChevronRight, CheckCircle, Users, FileText, Mail, Link2, 
  User, UserPlus, Settings, LogOut, Plus, Trash2, Edit2, Save, ChevronDown, Eye, EyeOff, MessageSquare, RefreshCw,
  Lock, Wand2, Copy, ExternalLink, Shield, Edit3, Download, FileDown, Brain, Activity, Printer, Search, Folder,
  Home, Layout, Star, MoreHorizontal, X, Check, FolderPlus, Search as SearchIcon, AutoSave
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
  isFavorite?: boolean;
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

// Board Sidebar
const BoardSidebar = ({ 
  boards, currentBoard, onSelectBoard, onCreateBoard, onDeleteBoard, onToggleFavorite,
  searchQuery, onSearchChange, searchResults, onSearchResultClick
}: { 
  boards: Board[]; currentBoard: Board; 
  onSelectBoard: (id: string) => void; onCreateBoard: () => void; 
  onDeleteBoard: (id: string) => void; onToggleFavorite: (id: string) => void;
  searchQuery: string; onSearchChange: (q: string) => void;
  searchResults: { boardId: string; boardName: string; node: VisualNode }[];
  onSearchResultClick: (boardId: string) => void;
}) => {
  const [showCreate, setShowCreate] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [showBoards, setShowBoards] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const favoriteBoards = boards.filter(b => b.isFavorite);
  const recentBoards = boards.filter(b => !b.isFavorite);

  return (
    <motion.div 
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className={`bg-white/10 backdrop-blur-xl rounded-2xl p-4 flex flex-col ${isCollapsed ? 'w-16' : 'w-64'}`}
    >
      <div className="flex items-center justify-between mb-4">
        <motion.button onClick={() => setIsCollapsed(!isCollapsed)} whileHover={{ scale: 1.05 }} className="p-2 bg-white/10 rounded-lg">
          <Layout className="w-5 h-5" />
        </motion.button>
        {!isCollapsed && (
          <motion.button onClick={() => setShowCreate(true)} whileHover={{ scale: 1.05 }} className="p-2 bg-primary-500 rounded-lg">
            <Plus className="w-5 h-5 text-white" />
          </motion.button>
        )}
      </div>

      {!isCollapsed && (
        <>
          <div className="mb-4">
            <div className="relative">
              <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search all boards..."
                className="w-full pl-10 pr-4 py-2 bg-white/10 rounded-xl text-sm placeholder-gray-400"
              />
            </div>
            
            {searchResults.length > 0 && (
              <div className="mt-2 bg-gray-900 rounded-xl p-2 max-h-48 overflow-y-auto">
                {searchResults.map((result, i) => (
                  <motion.div 
                    key={i}
                    onClick={() => onSearchResultClick(result.boardId)}
                    whileHover={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                    className="p-2 rounded-lg cursor-pointer"
                  >
                    <p className="text-xs text-gray-400">{result.boardName}</p>
                    <p className="text-sm text-white truncate">{result.node.content}</p>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2 flex-1 overflow-y-auto">
            {favoriteBoards.length > 0 && (
              <>
                <button onClick={() => setShowBoards(!showBoards)} className="flex items-center gap-2 text-xs text-gray-400 hover:text-white w-full">
                  <Star className="w-4 h-4 text-amber-400" /> Favorites
                </button>
                {favoriteBoards.map(board => (
                  <BoardItem key={board.id} board={board} isActive={board.id === currentBoard.id} onSelect={onSelectBoard} onToggleFavorite={onToggleFavorite} onDelete={onDeleteBoard} />
                ))}
              </>
            )}

            <button onClick={() => setShowBoards(!showBoards)} className="flex items-center gap-2 text-xs text-gray-400 hover:text-white w-full mt-4">
              <Folder className="w-4 h-4" /> All Boards
            </button>
            {recentBoards.map(board => (
              <BoardItem key={board.id} board={board} isActive={board.id === currentBoard.id} onSelect={onSelectBoard} onToggleFavorite={onToggleFavorite} onDelete={onDeleteBoard} />
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-400 mt-4 pt-4 border-t border-white/10">
            <AutoSave className="w-4 h-4" />
            <span>Auto-saving</span>
          </div>
        </>
      )}

      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white rounded-2xl p-6 w-80" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-4 text-gray-900 flex items-center gap-2"><FolderPlus className="w-5 h-5" /> New Board</h3>
              <input 
                type="text"
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                placeholder="Board name..."
                className="w-full px-4 py-2 border border-gray-200 rounded-xl mb-4"
                autoFocus
              />
              <div className="flex gap-2">
                <button onClick={() => setShowCreate(false)} className="flex-1 py-2 bg-gray-100 rounded-xl text-gray-600">Cancel</button>
                <button 
                  onClick={() => { if (newBoardName) { onCreateBoard(newBoardName); setNewBoardName(''); setShowCreate(false); }}} 
                  disabled={!newBoardName}
                  className="flex-1 py-2 bg-primary-500 text-white rounded-xl disabled:opacity-50"
                >
                  Create
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const BoardItem = ({ board, isActive, onSelect, onToggleFavorite, onDelete }: { board: Board; isActive: boolean; onSelect: (id: string) => void; onToggleFavorite: (id: string) => void; onDelete: (id: string) => void; }) => (
  <motion.div 
    onClick={() => onSelect(board.id)}
    whileHover={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
    className={`p-2 rounded-lg cursor-pointer flex items-center gap-2 ${isActive ? 'bg-primary-500/20' : ''}`}
  >
    <Folder className="w-4 h-4 text-gray-400" />
    <span className="flex-1 text-sm truncate">{board.name}</span>
    <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(board.id); }}>
      <Star className={`w-4 h-4 ${board.isFavorite ? 'text-amber-400 fill-amber-400' : 'text-gray-400'}`} />
    </button>
  </motion.div>
);

const AutoSaveIndicator = ({ saved, saving }: { saved: boolean; saving: boolean }) => (
  <div className="flex items-center gap-2 text-sm">
    <motion.div animate={{ opacity: saving ? 1 : 0.5 }} className="flex items-center gap-1">
      <RefreshCw className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} />
      <span className="text-gray-400">{saving ? 'Saving...' : 'All changes saved'}</span>
    </motion.div>
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: saved ? 1 : 0 }} className="flex items-center gap-1 text-green-400">
      <Check className="w-4 h-4" />
      <span>Saved</span>
    </motion.div>
  </div>
);

const PDFExportModal = ({ board, onClose }: { board: Board; onClose: () => void; }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'summary' | 'detailed' | 'presentation'>('summary');

  const handleExport = async () => {
    setIsExporting(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const exportContent = `STRATEGIC CANVAS - ${board.name}
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
Generated by Strategic Canvas`.trim();

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
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'summary', label: 'Summary' },
              { id: 'detailed', label: 'Detailed' },
              { id: 'presentation', label: 'Presentation' }
            ].map(fmt => (
              <motion.button key={fmt.id} onClick={() => setExportFormat(fmt.id as typeof exportFormat)} whileHover={{ scale: 1.02 }} className={`p-3 rounded-xl border-2 ${exportFormat === fmt.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200'}`}>
                <p className="font-medium text-sm">{fmt.label}</p>
              </motion.button>
            ))}
          </div>
        </div>

        <div className="p-6 border-t flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-gray-100 rounded-xl font-medium">Cancel</button>
          <motion.button onClick={handleExport} disabled={isExporting} whileHover={{ scale: 1.02 }} className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-medium flex items-center justify-center gap-2">
            {isExporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {isExporting ? 'Generating...' : 'Export'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const MagicLinkModal = ({ board, onClose, onRegenerate }: { board: Board; onClose: () => void; onRegenerate: () => void; }) => {
  const [copied, setCopied] = useState(false);
  const magicLink = board.magicLink || generateMagicLink(board.id).link;
  const handleCopy = async () => { await navigator.clipboard.writeText(magicLink); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white rounded-3xl max-w-lg w-full overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-primary-500 to-purple-500 p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><Link2 className="w-5 h-5" /></div>
            <h2 className="text-xl font-bold">Share Board</h2>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex gap-2">
            <input type="text" readOnly value={magicLink} className="flex-1 px-4 py-3 bg-gray-50 rounded-xl text-sm font-mono" />
            <motion.button onClick={handleCopy} whileHover={{ scale: 1.05 }} className={`px-4 py-2 rounded-xl flex items-center gap-2 ${copied ? 'bg-green-500 text-white' : 'bg-gray-100'}`}>
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </motion.button>
          </div>
        </div>

        <div className="p-6 border-t flex gap-3">
          <motion.button onClick={onRegenerate} whileHover={{ scale: 1.02 }} className="flex-1 py-3 bg-gray-100 rounded-xl font-medium">Regenerate</motion.button>
          <motion.button onClick={onClose} whileHover={{ scale: 1.02 }} className="flex-1 py-3 bg-gradient-to-r from-primary-500 to-purple-500 text-white rounded-xl font-medium">Done</motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

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
                  <button key={type} onClick={() => setNoteType(type)} className={`px-3 py-1 rounded-full text-xs capitalize ${noteType === type ? 'bg-primary-100 text-primary-700' : 'bg-gray-100'}`}>{type}</button>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="text" value={newNote} onChange={(e) => setNewNote(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddNote()} placeholder="Add note..." className="flex-1 px-3 py-2 bg-gray-50 rounded-lg text-sm" />
                <motion.button onClick={handleAddNote} whileHover={{ scale: 1.05 }} className="p-2 bg-primary-500 text-white rounded-lg"><Plus className="w-5 h-5" /></motion.button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-96">
              {unresolvedNotes.map(note => (
                <motion.div key={note.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`p-3 rounded-xl ${note.type === 'question' ? 'bg-purple-50' : note.type === 'followup' ? 'bg-amber-50' : 'bg-gray-50'}`}>
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {note.aiSuggested && <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full flex items-center gap-1"><Sparkles className="w-3 h-3" /> AI</span>}
                        <span className="text-xs px-2 py-0.5 bg-gray-200 rounded-full capitalize">{note.type}</span>
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
                <div><label className="text-sm text-gray-600 mb-1 block">Role</label><select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value as User['role'] })} className="w-full px-4 py-2 border border-gray-200 rounded-xl"><option value="member">Member</option><option value="admin">Admin</option></select></div>
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

export default function MeetingCompanion() {
  const [currentUser, setCurrentUser] = useState<User>({
    id: '1', name: 'Scott Jones', email: 'scott@example.com', role: 'owner', color: '#10b981',
    personalNotes: '', privateNotes: [], lastActive: new Date(), preferences: { autoTranscribe: true, notifications: true, theme: 'dark' }
  });

  const [users, setUsers] = useState<User[]>([currentUser]);
  const [boards, setBoards] = useState<Board[]>([
    { id: 'board-1', name: 'Q1 Strategy Planning', ownerId: '1', sharedWith: ['1'], visualNodes: [], createdAt: new Date(), updatedAt: new Date(), isFavorite: true },
    { id: 'board-2', name: 'Client Onboarding - Acme Corp', ownerId: '1', sharedWith: ['1'], visualNodes: [], createdAt: new Date(), updatedAt: new Date() },
  ]);
  const [currentBoardId, setCurrentBoardId] = useState('board-1');
  const [showMagicLink, setShowMagicLink] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [sessionStart, setSessionStart] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [autoSaveState, setAutoSaveState] = useState({ saved: false, saving: false });

  const currentBoard = boards.find(b => b.id === currentBoardId) || boards[0];

  useEffect(() => {
    if (sessionStart) {
      const interval = setInterval(() => setElapsedTime(Math.floor((Date.now() - sessionStart.getTime()) / 1000)), 1000);
      return () => clearInterval(interval);
    }
  }, [sessionStart]);

  useEffect(() => {
    const savedBoards = localStorage.getItem('strategic-canvas-boards');
    if (savedBoards) {
      try {
        const parsed = JSON.parse(savedBoards);
        if (parsed.length > 0) setBoards(parsed);
      } catch (e) { console.log('Could not load saved boards'); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('strategic-canvas-boards', JSON.stringify(boards));
  }, [boards]);

  const formatTime = (s: number) => Math.floor(s / 60) + ':' + (s % 60).toString().padStart(2, '0');
  const startSession = () => { setSessionStart(new Date()); setCurrentPhase(0); setShowOnboarding(false); };

  const handleAddUser = (user: Omit<User, 'id' | 'lastActive' | 'privateNotes'>) => {
    const newUser = { ...user, id: Date.now().toString(), lastActive: new Date(), privateNotes: [] };
    setUsers(prev => [...prev, newUser]);
  };

  const handleAddPrivateNote = (note: Omit<PrivateNote, 'id' | 'createdAt'>) => {
    const newNote = { ...note, id: `note-${Date.now()}`, createdAt: new Date() };
    setCurrentUser(prev => ({ ...prev, privateNotes: [...(prev.privateNotes || []), newNote] }));
  };

  const handleToggleNoteResolve = (noteId: string) => {
    const updatedNotes = currentUser.privateNotes?.map(n => n.id === noteId ? { ...n, isResolved: !n.isResolved } : n) || [];
    setCurrentUser(prev => ({ ...prev, privateNotes: updatedNotes }));
  };

  const handleRegenerateLink = () => {
    const { link } = generateMagicLink(currentBoard.id);
    setBoards(prev => prev.map(b => b.id === currentBoard.id ? { ...b, magicLink: link } : b));
  };

  const handleLogout = () => { setShowOnboarding(true); setSessionStart(null); };

  const handleCreateBoard = (name: string) => {
    const newBoard: Board = {
      id: `board-${Date.now()}`,
      name,
      ownerId: currentUser.id,
      sharedWith: [currentUser.id],
      visualNodes: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      magicLinkPermissions: 'edit'
    };
    setBoards(prev => [...prev, newBoard]);
    setCurrentBoardId(newBoard.id);
  };

  const handleDeleteBoard = (id: string) => {
    if (boards.length > 1) {
      setBoards(prev => prev.filter(b => b.id !== id));
      if (currentBoardId === id) setCurrentBoardId(boards[0].id);
    }
  };

  const handleToggleFavorite = (id: string) => {
    setBoards(prev => prev.map(b => b.id === id ? { ...b, isFavorite: !b.isFavorite } : b));
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const searchResults = searchQuery ? boards.flatMap(board => 
    board.visualNodes
      .filter(node => node.content.toLowerCase().includes(searchQuery.toLowerCase()))
      .map(node => ({ boardId: board.id, boardName: board.name, node }))
  ) : [];

  if (showOnboarding || !sessionStart) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900 flex items-center justify-center p-6">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div key={i} className="absolute rounded-full bg-purple-500/20 blur-sm"
              style={{ left: Math.random() * 100 + '%', top: Math.random() * 100 + '%', width: Math.random() * 8 + 2, height: Math.random() * 8 + 2 }}
              animate={{ y: [0, -100, 0], opacity: [0, 0.5, 0] }}
              transition={{ duration: Math.random() * 20 + 20, repeat: Infinity }}
            />
          ))}
        </div>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white/10 backdrop-blur-2xl rounded-3xl p-8 max-w-lg w-full">
          <div className="text-center mb-8">
            <motion.div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-primary-400 to-purple-500 rounded-2xl flex items-center justify-center" animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 4, repeat: Infinity }}>
              <Rocket className="w-10 h-10 text-white" />
            </motion.div>
            <h1 className="text-3xl font-bold mb-2">Strategic Canvas</h1>
            <p className="text-gray-400">AI-powered business planning</p>
          </div>
          <div className="space-y-4">
            <div className="p-4 bg-white/5 rounded-xl flex items-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-medium" style={{ backgroundColor: currentUser.color }}>{currentUser.name.charAt(0).toUpperCase()}</div>
              <div><p className="font-medium">{currentUser.name}</p><p className="text-sm text-gray-400">{currentUser.email}</p></div>
            </div>
            <motion.button onClick={startSession} whileTap={{ scale: 0.98 }} className="w-full py-4 bg-gradient-to-r from-primary-500 to-purple-500 rounded-xl font-semibold shadow-lg flex items-center justify-center gap-2"><Sparkles className="w-5 h-5" /> Start Session</motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900 overflow-hidden">
      <AnimatePresence>
        {showMagicLink && <MagicLinkModal board={currentBoard} onClose={() => setShowMagicLink(false)} onRegenerate={handleRegenerateLink} />}
        {showExport && <PDFExportModal board={currentBoard} onClose={() => setShowExport(false)} />}
      </AnimatePresence>

      <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="relative z-20 px-6 py-4">
        <div className="max-w-full mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <motion.div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-purple-500 rounded-xl flex items-center justify-center" whileHover={{ scale: 1.1, rotate: 5 }}><Target className="w-6 h-6 text-white" /></motion.div>
              <div>
                <h1 className="text-xl font-bold">{currentBoard.name}</h1>
                <div className="flex items-center gap-2 text-sm text-gray-400"><Clock className="w-4 h-4" /><span>{formatTime(elapsedTime)}</span><span>•</span><span>{MEETING_PHASES[currentPhase].name}</span></div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <AutoSaveIndicator saved={autoSaveState.saved} saving={autoSaveState.saving} />
              <motion.button onClick={() => setShowExport(true)} whileHover={{ scale: 1.05 }} className="px-4 py-2 bg-white/10 rounded-xl flex items-center gap-2"><Download className="w-4 h-4" /> Export</motion.button>
              <motion.button onClick={() => setShowMagicLink(true)} whileHover={{ scale: 1.05 }} className="px-4 py-2 bg-white/10 rounded-xl flex items-center gap-2"><Link2 className="w-4 h-4" /> Share</motion.button>
            </div>
          </div>
          
          <div className="flex items-center gap-2 px-4 py-3 bg-white/10 backdrop-blur-xl rounded-2xl overflow-x-auto">
            {MEETING_PHASES.map((phase, index) => (
              <div key={phase.id} className="flex items-center">
                <motion.button onClick={() => setCurrentPhase(index)} whileHover={{ scale: 1.05 }} className={`px-4 py-2 rounded-xl transition-all ${index === currentPhase ? 'bg-gradient-to-r from-primary-500 to-purple-500 text-white' : 'bg-white/5 text-gray-400'}`}>
                  <span className="text-lg mr-2">{phase.icon}</span>
                  <span className="hidden md:inline font-medium text-sm">{phase.name}</span>
                </motion.button>
                {index < MEETING_PHASES.length - 1 && <div className="w-8 h-0.5 mx-2 bg-white/10" />}
              </div>
            ))}
          </div>
        </div>
      </motion.header>

      <div className="relative z-10 flex-1 p-6">
        <div className="max-w-full mx-auto">
          <div className="grid lg:grid-cols-5 gap-6">
            <BoardSidebar 
              boards={boards} 
              currentBoard={currentBoard}
              onSelectBoard={setCurrentBoardId}
              onCreateBoard={handleCreateBoard}
              onDeleteBoard={handleDeleteBoard}
              onToggleFavorite={handleToggleFavorite}
              searchQuery={searchQuery}
              onSearchChange={handleSearch}
              searchResults={searchResults}
              onSearchResultClick={setCurrentBoardId}
            />
            <div className="lg:col-span-4 space-y-6">
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-white/10 backdrop-blur-xl rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{MEETING_PHASES[currentPhase].icon}</span>
                  <div><h2 className="text-xl font-bold">{MEETING_PHASES[currentPhase].name}</h2><p className="text-sm text-gray-400">{MEETING_PHASES[currentPhase].subtitle}</p></div>
                </div>
                <div className="space-y-3">
                  {MEETING_PHASES[currentPhase].prompts.map((prompt, i) => (
                    <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.1 }} className="flex items-start gap-2 text-sm">
                      <ChevronRight className="w-4 h-4 text-primary-400 mt-0.5" /><span className="text-gray-300">{prompt}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
              
              <PrivateNotesPanel user={currentUser} onAddNote={handleAddPrivateNote} onToggleResolve={handleToggleNoteResolve} currentPhase={MEETING_PHASES[currentPhase].id} />
              
              <UserManagement users={users} currentUser={currentUser} onAddUser={handleAddUser} onLogout={handleLogout} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}