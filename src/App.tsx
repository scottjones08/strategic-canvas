import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target,
  FileText,
  Plus,
  Check,
  CheckCircle,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Share2,
  Mic,
  StopCircle,
  ListTodo,
  Lightbulb,
  AlertCircle,
  CheckSquare,
  LayoutDashboard,
  FolderKanban,
  Settings,
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  TrendingUp,
  Calendar,
  BarChart3,
  ArrowRight,
  Save,
  Layout,
  X,
  GripVertical,
  Youtube,
  Image,
  QrCode,
  Upload,
  Inbox,
  Sparkles,
  MessageSquare,
  Globe,
  Type,
  Circle,
  Square,
  Triangle,
  Minus,
  MoreVertical,
  Trash2,
  Link,
  ChevronDown,
  ChevronUp,
  Undo2,
  Redo2,
  History,
  Bold,
  Italic,
  List,
  ListOrdered,
  Pencil,
  Send,
  Brain,
  GitBranch,
  Languages,
  SpellCheck,
  RefreshCw,
  Loader2,
  PenLine,
  Move,
  BookOpen,
  Building2,
  Timer,
  Play,
  Pause,
  Search,
  RotateCcw,
  Lock,
  Unlock,
  Download,
  Map,
  Grid3X3,
  MessageCircle,
  Presentation,
  Copy,
} from 'lucide-react';
import QRCode from 'qrcode';

// Types
interface Board {
  id: string;
  name: string;
  ownerId: string;
  visualNodes: VisualNode[];
  createdAt: Date;
  zoom: number;
  panX: number;
  panY: number;
  status?: 'active' | 'completed' | 'archived';
  progress?: number;
  lastActivity?: Date;
  participants?: number;
  transcripts?: SavedTranscript[];
  uploadBucketId?: string;
}

interface VisualNode {
  id: string;
  type: 'sticky' | 'frame' | 'opportunity' | 'risk' | 'action' | 'youtube' | 'image' | 'bucket' | 'text' | 'shape' | 'connector' | 'mindmap' | 'drawing' | 'comment';
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  color: string;
  rotation: number;
  locked: boolean;
  votes: number;
  votedBy: string[];
  createdBy: string;
  comments: { id: string; userId: string; content: string; timestamp: Date }[];
  meetingTimestamp?: number;
  mediaUrl?: string;
  bucketId?: string;
  bucketImages?: string[];
  shapeType?: 'rectangle' | 'circle' | 'triangle' | 'diamond';
  textStyle?: 'heading' | 'paragraph' | 'body';
  fontSize?: number;
  borderWidth?: number;
  borderColor?: string;
  connectorFrom?: string;
  connectorTo?: string;
  connectorStyle?: 'solid' | 'dashed' | 'dotted';
  groupId?: string;
  zIndex?: number;
  // Mind map properties
  parentNodeId?: string;
  isRootNode?: boolean;
  mindmapId?: string;
  // Drawing properties
  paths?: { points: { x: number; y: number }[]; color: string; width: number }[];
  strokeColor?: string;
  strokeWidth?: number;
  // Reactions
  reactions?: { emoji: string; userIds: string[] }[];
}

interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
  generatedNodes?: { content: string; color: string }[];
}

interface TranscriptEntry {
  id: string;
  speaker: string;
  text: string;
  timestamp: number;
}

interface SavedTranscript {
  id: string;
  entries: TranscriptEntry[];
  startedAt: Date;
  endedAt: Date;
  duration: number;
}

interface ParsedItem {
  id: string;
  type: 'idea' | 'action' | 'question' | 'decision' | 'risk';
  content: string;
  confidence: number;
  timestamp: number;
}

interface ActionItem {
  id: string;
  content: string;
  priority: 'high' | 'medium' | 'low';
  isComplete: boolean;
  timestamp: number;
  assigneeId?: string;
}

type ViewType = 'dashboard' | 'meeting' | 'notes' | 'clients';

// Collaboration types
interface UserPresence {
  id: string;
  name: string;
  color: string;
  cursorX: number;
  cursorY: number;
  lastSeen: Date;
}

interface HistoryEntry {
  nodes: VisualNode[];
  timestamp: Date;
  action: string;
  userId?: string;
}

// Constants
const GRID_SIZE = 20;
const PARTICIPANTS = [
  { id: '1', name: 'Scott Jones', color: '#10b981' },
  { id: '2', name: 'Partner 1', color: '#3b82f6' },
  { id: '3', name: 'Partner 2', color: '#ef4444' },
  { id: '4', name: 'Partner 3', color: '#f59e0b' },
];

const NODE_COLORS = ['#fef3c7', '#fce7f3', '#dbeafe', '#d1fae5', '#f3e8ff', '#fee2e1'];

const SAMPLE_BOARDS: Board[] = [
  { id: '1', name: 'Q1 Strategy Planning', ownerId: '1', visualNodes: [], createdAt: new Date('2024-01-15'), zoom: 1, panX: 0, panY: 0, status: 'active', progress: 65, lastActivity: new Date(), participants: 4 },
  { id: '2', name: 'Product Roadmap Review', ownerId: '1', visualNodes: [], createdAt: new Date('2024-01-10'), zoom: 1, panX: 0, panY: 0, status: 'active', progress: 40, lastActivity: new Date(Date.now() - 86400000), participants: 3 },
  { id: '3', name: 'Team Retrospective', ownerId: '1', visualNodes: [], createdAt: new Date('2024-01-05'), zoom: 1, panX: 0, panY: 0, status: 'completed', progress: 100, lastActivity: new Date(Date.now() - 172800000), participants: 6 },
];

const BOARD_TEMPLATES = [
  { id: 'blank', name: 'Blank Canvas', icon: Layout, description: 'Start from scratch', nodes: [] },
  { id: 'swot', name: 'SWOT Analysis', icon: BarChart3, description: 'Strategic planning', nodes: [
    { type: 'frame', x: 50, y: 50, width: 400, height: 350, content: '💪 STRENGTHS', color: '#dcfce7' },
    { type: 'frame', x: 470, y: 50, width: 400, height: 350, content: '⚠️ WEAKNESSES', color: '#fef3c7' },
    { type: 'frame', x: 50, y: 420, width: 400, height: 350, content: '🚀 OPPORTUNITIES', color: '#dbeafe' },
    { type: 'frame', x: 470, y: 420, width: 400, height: 350, content: '⛔ THREATS', color: '#fce7f3' },
  ]},
  { id: 'brainstorm', name: 'Brainstorming', icon: Lightbulb, description: 'Generate ideas', nodes: [
    { type: 'frame', x: 50, y: 50, width: 350, height: 550, content: '💡 IDEAS', color: '#fef3c7' },
    { type: 'frame', x: 420, y: 50, width: 350, height: 550, content: '❓ QUESTIONS', color: '#f3e8ff' },
    { type: 'frame', x: 790, y: 50, width: 350, height: 550, content: '✅ ACTIONS', color: '#dcfce7' },
  ]},
  { id: 'kanban', name: 'Kanban Board', icon: FolderKanban, description: 'Track progress', nodes: [
    { type: 'frame', x: 50, y: 50, width: 280, height: 600, content: '📋 TO DO', color: '#f3e8ff' },
    { type: 'frame', x: 350, y: 50, width: 280, height: 600, content: '🔄 IN PROGRESS', color: '#dbeafe' },
    { type: 'frame', x: 650, y: 50, width: 280, height: 600, content: '✅ DONE', color: '#dcfce7' },
  ]},
  { id: 'client-research', name: 'Client Research', icon: Globe, description: 'Research client website', nodes: [
    { type: 'frame', x: 50, y: 50, width: 450, height: 300, content: '🌐 COMPANY OVERVIEW', color: '#dbeafe' },
    { type: 'frame', x: 520, y: 50, width: 450, height: 300, content: '🎯 VALUE PROPOSITION', color: '#dcfce7' },
    { type: 'frame', x: 50, y: 370, width: 300, height: 250, content: '👥 TARGET AUDIENCE', color: '#fef3c7' },
    { type: 'frame', x: 370, y: 370, width: 300, height: 250, content: '⚔️ COMPETITORS', color: '#fce7f3' },
    { type: 'frame', x: 690, y: 370, width: 280, height: 250, content: '💡 OPPORTUNITIES', color: '#f3e8ff' },
  ]},
];

const generateId = () => Math.random().toString(36).substring(2, 11);

// Sidebar Component
const Sidebar = ({
  currentView,
  onViewChange,
  isCollapsed,
  onToggleCollapse,
  userName
}: {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  userName: string;
}) => {
  const navItems = [
    { id: 'dashboard' as ViewType, label: 'Dashboard', icon: LayoutDashboard, description: 'All boards & progress' },
    { id: 'meeting' as ViewType, label: 'Whiteboard', icon: FolderKanban, description: 'Active whiteboard' },
    { id: 'notes' as ViewType, label: 'Notes', icon: BookOpen, description: 'Notion-style docs' },
    { id: 'clients' as ViewType, label: 'Clients', icon: Building2, description: 'Client management' },
  ];

  return (
    <motion.nav
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className={`h-screen bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'}`}
    >
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Target className="w-5 h-5 text-white" />
          </div>
          {!isCollapsed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 min-w-0">
              <h1 className="font-bold text-gray-900">Fan WorkShop</h1>
              <p className="text-xs text-gray-500">Collaborative Whiteboard</p>
            </motion.div>
          )}
        </div>
      </div>

      <div className="flex-1 px-3 py-4 space-y-1">
        <p className={`text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 ${isCollapsed ? 'text-center' : 'px-3'}`}>
          {isCollapsed ? '•' : 'Navigation'}
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <motion.button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative ${
                isActive ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
              {!isCollapsed && (
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className={`text-xs ${isActive ? 'text-indigo-500' : 'text-gray-400'}`}>{item.description}</p>
                </div>
              )}
              {isActive && <motion.div layoutId="activeNav" className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-600 rounded-r-full" />}
            </motion.button>
          );
        })}
      </div>

      <div className="border-t border-gray-100 p-3 space-y-2">
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-all">
          <Settings className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span className="text-sm">Settings</span>}
        </button>
        <div className={`flex items-center gap-3 p-2 rounded-xl bg-gray-50 ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
            {userName.charAt(0).toUpperCase()}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
              <p className="text-xs text-gray-500">Owner</p>
            </div>
          )}
        </div>
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all"
        >
          {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          {!isCollapsed && <span className="text-sm">Collapse</span>}
        </button>
      </div>
    </motion.nav>
  );
};

// Dashboard View
const DashboardView = ({ boards, onOpenBoard, onCreateBoard }: { boards: Board[]; onOpenBoard: (board: Board) => void; onCreateBoard: (name: string, template: string) => void }) => {
  const [showNewBoardModal, setShowNewBoardModal] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('blank');
  const activeBoards = boards.filter(b => b.status === 'active');
  const completedBoards = boards.filter(b => b.status === 'completed');
  const totalProgress = boards.length > 0 ? Math.round(boards.reduce((acc, b) => acc + (b.progress || 0), 0) / boards.length) : 0;

  const handleCreateBoard = () => {
    if (!newBoardName.trim()) return;
    onCreateBoard(newBoardName, selectedTemplate);
    setNewBoardName('');
    setSelectedTemplate('blank');
    setShowNewBoardModal(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'completed': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex-1 overflow-auto bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Monitor all your strategic planning boards</p>
        </div>

        <div className="grid grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Total Boards', value: boards.length, icon: FolderKanban, color: 'indigo' },
            { label: 'Active Projects', value: activeBoards.length, icon: TrendingUp, color: 'green' },
            { label: 'Completed', value: completedBoards.length, icon: CheckCircle, color: 'blue' },
            { label: 'Avg Progress', value: `${totalProgress}%`, icon: BarChart3, color: 'purple' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 bg-${stat.color}-100 rounded-xl flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="flex gap-4">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setShowNewBoardModal(true)} className="flex items-center gap-3 px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium shadow-lg shadow-indigo-200">
              <Plus className="w-5 h-5" /> New Board
            </motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => alert('Schedule meeting coming soon! For now, create a board and start a recording session.')} className="flex items-center gap-3 px-6 py-3 bg-white text-gray-700 rounded-xl font-medium border border-gray-200">
              <Calendar className="w-5 h-5" /> Schedule Meeting
            </motion.button>
          </div>
        </div>

        {showNewBoardModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowNewBoardModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white rounded-2xl p-6 w-[550px] max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Create New Board</h2>
                <button onClick={() => setShowNewBoardModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Board Name</label>
                  <input type="text" value={newBoardName} onChange={(e) => setNewBoardName(e.target.value)} placeholder="e.g., Q2 Strategy Planning" className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" autoFocus />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Choose a Template</label>
                  <div className="grid grid-cols-2 gap-3">
                    {BOARD_TEMPLATES.map(t => (
                      <button key={t.id} onClick={() => setSelectedTemplate(t.id)} className={`p-4 rounded-xl border-2 text-left transition-all ${selectedTemplate === t.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <div className="flex items-center gap-3 mb-2">
                          <t.icon className={`w-5 h-5 ${selectedTemplate === t.id ? 'text-indigo-600' : 'text-gray-500'}`} />
                          <span className={`font-medium ${selectedTemplate === t.id ? 'text-indigo-900' : 'text-gray-900'}`}>{t.name}</span>
                        </div>
                        <p className="text-xs text-gray-500">{t.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <motion.button whileHover={{ scale: 1.02 }} onClick={handleCreateBoard} disabled={!newBoardName.trim()} className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed">Create Board</motion.button>
                  <motion.button whileHover={{ scale: 1.02 }} onClick={() => setShowNewBoardModal(false)} className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium">Cancel</motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">All Boards</h2>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Board Name</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Status</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Progress</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Participants</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Last Activity</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {boards.map((board, index) => (
                  <motion.tr
                    key={board.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg flex items-center justify-center">
                          <FolderKanban className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{board.name}</p>
                          <p className="text-xs text-gray-500">Created {formatDate(board.createdAt)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(board.status || 'active')}`}>
                        {board.status || 'active'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${board.progress || 0}%` }} />
                        </div>
                        <span className="text-sm font-medium text-gray-700">{board.progress || 0}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-700">{board.participants || 1}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{formatDate(board.lastActivity || board.createdAt)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onOpenBoard(board)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100"
                      >
                        Open <ArrowRight className="w-4 h-4" />
                      </motion.button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// Sticky Note Component
const StickyNote = ({ node, isSelected, onSelect, onUpdate, onVote, onDelete, onDuplicate, onStartConnector, onAddMindmapChild, onAISparkle, onReact, zoom, selectedCount = 1, isDrawingMode = false }: {
  node: VisualNode;
  isSelected: boolean;
  onSelect: (e?: React.MouseEvent) => void;
  onUpdate: (updates: Partial<VisualNode>) => void;
  onVote: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onStartConnector: (nodeId: string) => void;
  onAddMindmapChild?: (nodeId: string) => void;
  onAISparkle?: (position: { x: number; y: number }) => void;
  onReact?: (emoji: string) => void;
  zoom: number;
  selectedCount?: number;
  isDrawingMode?: boolean;
}) => {
  const [isResizing, setIsResizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const isFrame = node.type === 'frame';
  const REACTION_EMOJIS = ['👍', '❤️', '🎉', '🔥', '💡', '⭐'];

  const handleResizeStart = (e: React.MouseEvent, direction: string) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = node.width;
    const startHeight = node.height;
    const startNodeX = node.x;
    const startNodeY = node.y;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = (moveEvent.clientX - startX) / zoom;
      const deltaY = (moveEvent.clientY - startY) / zoom;
      let newWidth = startWidth, newHeight = startHeight, newX = startNodeX, newY = startNodeY;
      if (direction.includes('e')) newWidth = Math.max(100, startWidth + deltaX);
      if (direction.includes('w')) { newWidth = Math.max(100, startWidth - deltaX); newX = startNodeX + deltaX; }
      if (direction.includes('s')) newHeight = Math.max(80, startHeight + deltaY);
      if (direction.includes('n')) { newHeight = Math.max(80, startHeight - deltaY); newY = startNodeY + deltaY; }
      onUpdate({ width: newWidth, height: newHeight, x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const typeIcons: Record<string, string> = { opportunity: '💡', risk: '⚠️', action: '✅', sticky: '📝', frame: '📋', youtube: '🎬', image: '🖼️', bucket: '📥', text: '📝', shape: '⬜', connector: '➡️', comment: '💬', mindmap: '🧠' };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
    onSelect();
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
    onSelect();
  };

  const isShape = node.type === 'shape';
  const isText = node.type === 'text';
  const isConnector = node.type === 'connector';
  const isComment = node.type === 'comment';
  void node.type; // _isMindmap check handled by type === 'mindmap' inline
  const hasTextContent = !['youtube', 'image', 'bucket', 'shape', 'connector', 'comment'].includes(node.type);
  const [commentExpanded, setCommentExpanded] = useState(false);

  // Text formatting functions
  const addBulletPoint = () => {
    const content = node.content || '';
    const lines = content.split('\n');
    const lastLine = lines[lines.length - 1];
    if (!lastLine.startsWith('• ')) {
      if (lastLine.trim() === '') {
        lines[lines.length - 1] = '• ';
      } else {
        lines.push('• ');
      }
    }
    onUpdate({ content: lines.join('\n') });
  };

  const addNumberedPoint = () => {
    const content = node.content || '';
    const lines = content.split('\n');
    const numberedLines = lines.filter(l => /^\d+\.\s/.test(l));
    const nextNum = numberedLines.length + 1;
    const lastLine = lines[lines.length - 1];
    if (lastLine.trim() === '') {
      lines[lines.length - 1] = `${nextNum}. `;
    } else {
      lines.push(`${nextNum}. `);
    }
    onUpdate({ content: lines.join('\n') });
  };

  const toggleBold = () => {
    const content = node.content || '';
    // Simple bold toggle - wrap/unwrap with **
    if (content.startsWith('**') && content.endsWith('**')) {
      onUpdate({ content: content.slice(2, -2) });
    } else {
      onUpdate({ content: `**${content}**` });
    }
  };

  const toggleItalic = () => {
    const content = node.content || '';
    // Simple italic toggle - wrap/unwrap with *
    if (content.startsWith('*') && content.endsWith('*') && !content.startsWith('**')) {
      onUpdate({ content: content.slice(1, -1) });
    } else {
      onUpdate({ content: `*${content}*` });
    }
  };

  const getShapeStyles = () => {
    if (!isShape) return {};
    switch (node.shapeType) {
      case 'circle': return { borderRadius: '50%' };
      case 'triangle': return { clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' };
      case 'diamond': return { clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' };
      default: return { borderRadius: '8px' };
    }
  };

  return (
    <>
    <motion.div
      initial={{ scale: 0.9, opacity: 0, x: node.x, y: node.y }}
      animate={{ scale: 1, opacity: 1, x: node.x, y: node.y, rotate: node.rotation, boxShadow: isDragging ? '0 25px 50px -12px rgba(0, 0, 0, 0.25)' : isFrame || isText || isConnector ? 'none' : '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
      transition={isDragging ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 30 }}
      whileHover={{ scale: isSelected || isDragging ? 1 : 1.02, zIndex: 50 }}
      className={`absolute ${isDrawingMode ? 'pointer-events-none' : 'pointer-events-auto'} ${isResizing ? '' : 'cursor-grab active:cursor-grabbing'} ${isFrame ? 'rounded-2xl border-2 border-dashed' : isText ? '' : isConnector ? '' : 'rounded-xl'} ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}
      style={{ width: node.width, height: node.height, backgroundColor: isFrame ? `${node.color}80` : isText ? 'transparent' : node.color, borderColor: isFrame ? node.color : undefined, zIndex: isDragging ? 1000 : isSelected ? 100 : isFrame ? 1 : 10, ...getShapeStyles() }}
      onClick={(e) => onSelect(e)}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      drag={!isResizing && !isDrawingMode && !node.locked}
      dragMomentum={false}
      dragElastic={0}
      dragTransition={{ power: 0, timeConstant: 0 }}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={(_, info) => { setIsDragging(false); if (!isResizing) onUpdate({ x: node.x + info.offset.x / zoom, y: node.y + info.offset.y / zoom }); }}
    >
      {!isFrame && (
        <>
          <div className="absolute -top-3 -right-3 flex items-center gap-1 z-10">
            <button onClick={(e) => { e.stopPropagation(); setShowReactions(!showReactions); }} className="w-7 h-7 bg-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform border border-gray-200" title="Add reaction">
              <span className="text-xs">😊</span>
            </button>
            <button onClick={(e) => { e.stopPropagation(); onVote(); }} className="w-7 h-7 bg-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform border border-gray-200">
              <span className="text-xs">👍</span>
              {node.votes > 0 && <span className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-indigo-600 text-white text-[10px] rounded-full flex items-center justify-center font-medium">{node.votes}</span>}
            </button>
          </div>
          {showReactions && (
            <div className="absolute -top-12 right-0 bg-white rounded-xl shadow-xl border border-gray-200 p-1.5 flex gap-1 z-20" onClick={(e) => e.stopPropagation()}>
              {REACTION_EMOJIS.map(emoji => (
                <button key={emoji} onClick={() => { onReact?.(emoji); setShowReactions(false); }} className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-sm hover:scale-125 transition-transform">{emoji}</button>
              ))}
            </div>
          )}
          {isSelected && onAISparkle && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                onAISparkle({ x: rect.right + 10, y: rect.top });
              }}
              className="absolute -top-3 -left-3 w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform z-10 border-2 border-white"
              title="AI Actions"
            >
              <Sparkles className="w-4 h-4 text-white" />
            </button>
          )}
          {/* Reactions display */}
          {node.reactions && node.reactions.length > 0 && (
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white rounded-full shadow-md border border-gray-200 px-2 py-0.5 flex gap-1 z-10">
              {node.reactions.map(r => (
                <span key={r.emoji} className="text-xs flex items-center gap-0.5">
                  {r.emoji}<span className="text-[10px] text-gray-500">{r.userIds.length}</span>
                </span>
              ))}
            </div>
          )}
        </>
      )}

      <div className={`h-full overflow-hidden ${isFrame ? 'p-3 flex flex-col' : node.type === 'youtube' || node.type === 'image' || node.type === 'bucket' ? '' : 'p-3'}`}>
        {isFrame && (
          <>
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-200/50">
              <GripVertical className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-bold text-gray-700">{node.content.split('\n')[0]}</span>
            </div>
            <div className="flex-1 text-xs text-gray-500 whitespace-pre-wrap">{node.content.split('\n').slice(1).join('\n')}</div>
          </>
        )}

        {node.type === 'youtube' && node.mediaUrl && (
          <div className="w-full h-full rounded-xl overflow-hidden relative group">
            <iframe src={node.mediaUrl} className="w-full h-full pointer-events-none" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title="YouTube video" />
            <div className="absolute inset-0 bg-transparent group-hover:bg-black/10 transition-colors flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 bg-white/90 px-3 py-2 rounded-lg text-xs font-medium text-gray-700 shadow-lg transition-opacity">
                <GripVertical className="w-4 h-4 inline mr-1" />Drag to move • Double-click for options
              </div>
            </div>
          </div>
        )}

        {node.type === 'image' && node.mediaUrl && (
          <div className="w-full h-full rounded-xl overflow-hidden">
            <img src={node.mediaUrl} alt={node.content || 'Embedded image'} className="w-full h-full object-cover" />
          </div>
        )}

        {node.type === 'bucket' && (
          <div className="p-3 h-full flex flex-col">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-200">
              <Inbox className="w-4 h-4 text-indigo-500" />
              <span className="text-sm font-bold text-gray-700">Upload Bucket</span>
            </div>
            {node.bucketImages && node.bucketImages.length > 0 ? (
              <div className="flex-1 grid grid-cols-2 gap-2 overflow-auto">
                {node.bucketImages.map((img, idx) => (
                  <div key={idx} className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                    <img src={img} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">Scan QR to upload</p>
                </div>
              </div>
            )}
          </div>
        )}

        {isShape && (
          <div className="w-full h-full flex items-center justify-center p-2">
            <textarea
              value={node.content}
              onChange={(e) => onUpdate({ content: e.target.value })}
              onClick={(e) => e.stopPropagation()}
              className="w-full h-full bg-transparent resize-none border-none outline-none text-gray-700 text-sm font-medium text-center placeholder-gray-400"
              placeholder="Click to add text"
              style={{ textAlign: 'center', display: 'flex', alignItems: 'center' }}
            />
          </div>
        )}

        {isText && (
          <textarea
            value={node.content}
            onChange={(e) => onUpdate({ content: e.target.value })}
            onClick={(e) => e.stopPropagation()}
            className="w-full h-full bg-transparent resize-none border-none outline-none text-gray-900 font-medium placeholder-gray-400"
            placeholder="Type here..."
            style={{ fontSize: node.fontSize || 24 }}
          />
        )}

        {isConnector && (
          <div className="w-full h-1 rounded-full" style={{ backgroundColor: node.color, borderStyle: node.connectorStyle || 'solid' }} />
        )}

        {isComment && (
          <div 
            className="w-full h-full flex items-center justify-center cursor-pointer"
            onClick={(e) => { e.stopPropagation(); setCommentExpanded(!commentExpanded); }}
          >
            {!commentExpanded ? (
              <div className="w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center shadow-lg border-2 border-amber-500">
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
            ) : (
              <div className="absolute left-10 top-0 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 p-3 z-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-600">Comment</span>
                  <button onClick={(e) => { e.stopPropagation(); setCommentExpanded(false); }} className="p-1 hover:bg-gray-100 rounded">
                    <X className="w-3 h-3 text-gray-400" />
                  </button>
                </div>
                <textarea
                  value={node.content}
                  onChange={(e) => onUpdate({ content: e.target.value })}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full h-24 bg-gray-50 rounded-lg p-2 text-sm resize-none border border-gray-200 outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="Add your comment..."
                />
              </div>
            )}
          </div>
        )}

        {!isFrame && node.type !== 'youtube' && node.type !== 'image' && node.type !== 'bucket' && !isShape && !isText && !isConnector && !isComment && (
          <>
            <div className="flex items-center gap-1 mb-2">
              <span>{typeIcons[node.type] || '📝'}</span>
              <span className="text-xs font-semibold text-gray-600 capitalize">{node.type}</span>
            </div>
            <textarea
              value={node.content}
              onChange={(e) => onUpdate({ content: e.target.value })}
              onClick={(e) => e.stopPropagation()}
              className="w-full bg-transparent resize-none border-none outline-none text-gray-800 text-sm font-medium placeholder-gray-500"
              placeholder="Type here..."
              style={{ height: 'calc(100% - 30px)' }}
            />
          </>
        )}
      </div>

      {isSelected && (
        <>
          <div onMouseDown={(e) => handleResizeStart(e, 'se')} className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-white border-2 border-indigo-500 rounded-sm cursor-se-resize z-20 hover:bg-indigo-100" />
          <div onMouseDown={(e) => handleResizeStart(e, 'sw')} className="absolute -bottom-1.5 -left-1.5 w-4 h-4 bg-white border-2 border-indigo-500 rounded-sm cursor-sw-resize z-20 hover:bg-indigo-100" />
          <div onMouseDown={(e) => handleResizeStart(e, 'ne')} className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-white border-2 border-indigo-500 rounded-sm cursor-ne-resize z-20 hover:bg-indigo-100" />
          <div onMouseDown={(e) => handleResizeStart(e, 'nw')} className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-white border-2 border-indigo-500 rounded-sm cursor-nw-resize z-20 hover:bg-indigo-100" />
          {selectedCount > 1 && (
            <div className="absolute -top-6 -right-2 bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-full font-medium shadow-lg z-30">
              {selectedCount} selected
            </div>
          )}
          {node.locked && (
            <div className="absolute -top-6 -left-2 bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full font-medium shadow-lg z-30 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Locked
            </div>
          )}
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-lg border border-gray-200 flex items-center gap-1 p-1 z-30">
            {hasTextContent && (
              <>
                <button onClick={toggleBold} className="p-1.5 hover:bg-gray-100 rounded" title="Bold"><Bold className="w-4 h-4 text-gray-500" /></button>
                <button onClick={toggleItalic} className="p-1.5 hover:bg-gray-100 rounded" title="Italic"><Italic className="w-4 h-4 text-gray-500" /></button>
                <button onClick={addBulletPoint} className="p-1.5 hover:bg-gray-100 rounded" title="Bullet list"><List className="w-4 h-4 text-gray-500" /></button>
                <button onClick={addNumberedPoint} className="p-1.5 hover:bg-gray-100 rounded" title="Numbered list"><ListOrdered className="w-4 h-4 text-gray-500" /></button>
                <div className="w-px h-5 bg-gray-200 mx-1" />
              </>
            )}
            <button onClick={() => onUpdate({ color: '#fef3c7' })} className="w-6 h-6 rounded bg-yellow-100 hover:ring-2 ring-gray-300" title="Yellow" />
            <button onClick={() => onUpdate({ color: '#dbeafe' })} className="w-6 h-6 rounded bg-blue-100 hover:ring-2 ring-gray-300" title="Blue" />
            <button onClick={() => onUpdate({ color: '#dcfce7' })} className="w-6 h-6 rounded bg-green-100 hover:ring-2 ring-gray-300" title="Green" />
            <button onClick={() => onUpdate({ color: '#fce7f3' })} className="w-6 h-6 rounded bg-pink-100 hover:ring-2 ring-gray-300" title="Pink" />
            <button onClick={() => onUpdate({ color: '#f3e8ff' })} className="w-6 h-6 rounded bg-purple-100 hover:ring-2 ring-gray-300" title="Purple" />
            <div className="w-px h-5 bg-gray-200 mx-1" />
            <button onClick={() => onUpdate({ locked: !node.locked })} className="p-1.5 hover:bg-gray-100 rounded" title={node.locked ? 'Unlock' : 'Lock'}><Link className="w-4 h-4 text-gray-500" /></button>
            <button className="p-1.5 hover:bg-gray-100 rounded" title="More options"><MoreVertical className="w-4 h-4 text-gray-500" /></button>
          </div>
        </>
      )}
    </motion.div>

    {showContextMenu && (
      <>
        <div className="fixed inset-0 z-[9998]" onClick={() => setShowContextMenu(false)} />
        <div className="fixed bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-[9999] w-56" style={{ left: contextMenuPos.x, top: contextMenuPos.y }} onClick={(e) => e.stopPropagation()}>
        <div className="px-3 py-2 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Colors</p>
          <div className="flex gap-1.5">
            {['#fef3c7', '#fce7f3', '#dbeafe', '#d1fae5', '#f3e8ff', '#fee2e2', '#ffffff'].map(color => (
              <button key={color} onClick={() => { onUpdate({ color }); setShowContextMenu(false); }} className={`w-6 h-6 rounded-lg border-2 ${node.color === color ? 'border-indigo-500' : 'border-gray-200'} hover:scale-110 transition-transform`} style={{ backgroundColor: color }} />
            ))}
          </div>
        </div>
        {hasTextContent && (
          <div className="px-3 py-2 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Formatting</p>
            <div className="flex gap-1">
              <button onClick={() => { toggleBold(); }} className="p-2 hover:bg-gray-100 rounded-lg" title="Bold"><Bold className="w-4 h-4 text-gray-600" /></button>
              <button onClick={() => { toggleItalic(); }} className="p-2 hover:bg-gray-100 rounded-lg" title="Italic"><Italic className="w-4 h-4 text-gray-600" /></button>
              <button onClick={() => { addBulletPoint(); }} className="p-2 hover:bg-gray-100 rounded-lg" title="Bullet list"><List className="w-4 h-4 text-gray-600" /></button>
              <button onClick={() => { addNumberedPoint(); }} className="p-2 hover:bg-gray-100 rounded-lg" title="Numbered list"><ListOrdered className="w-4 h-4 text-gray-600" /></button>
            </div>
          </div>
        )}
        <button onClick={() => { onUpdate({ locked: !node.locked }); setShowContextMenu(false); }} className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-100 flex items-center gap-3">{node.locked ? <Unlock className="w-4 h-4 text-gray-500" /> : <Lock className="w-4 h-4 text-gray-500" />}{node.locked ? 'Unlock Element' : 'Lock Element'}</button>
        <button onClick={() => { onDuplicate(); setShowContextMenu(false); }} className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-100 flex items-center gap-3"><FileText className="w-4 h-4 text-gray-500" />Duplicate</button>
        <button onClick={() => { onStartConnector(node.id); setShowContextMenu(false); }} className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-100 flex items-center gap-3"><Minus className="w-4 h-4 text-gray-500" />Connect to...</button>
        {node.type === 'mindmap' && onAddMindmapChild && (
          <button onClick={() => { onAddMindmapChild(node.id); setShowContextMenu(false); }} className="w-full px-4 py-2.5 text-left text-sm hover:bg-purple-50 text-purple-700 flex items-center gap-3"><GitBranch className="w-4 h-4" />Add Child Node</button>
        )}
        <div className="h-px bg-gray-200 my-1" />
        <button onClick={() => { onDelete(); setShowContextMenu(false); }} className="w-full px-4 py-2.5 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-3"><Trash2 className="w-4 h-4" />Delete</button>
      </div>
      </>
    )}
    </>
  );
};

// Infinite Canvas
const InfiniteCanvas = ({ board, onUpdateBoard, onUpdateWithHistory, selectedNodeIds, onSelectNodes, onCanvasDoubleClick, isDrawingMode, isPanMode, drawingColor, drawingWidth, onAddMindmapChild, onAISparkle, gridSnap, showMinimap, otherUsers }: {
  board: Board;
  onUpdateBoard: (updates: Partial<Board>) => void;
  onUpdateWithHistory: (updates: Partial<Board>, action: string) => void;
  selectedNodeIds: string[];
  onSelectNodes: (ids: string[], toggle?: boolean) => void;
  onCanvasDoubleClick?: (x: number, y: number) => void;
  isDrawingMode?: boolean;
  isPanMode?: boolean;
  drawingColor?: string;
  drawingWidth?: number;
  onAddMindmapChild?: (parentNodeId: string) => void;
  onAISparkle?: (position: { x: number; y: number }) => void;
  gridSnap?: boolean;
  showMinimap?: boolean;
  otherUsers?: UserPresence[];
}) => {
  const [zoom, setZoom] = useState(board.zoom || 1);
  const [panX, setPanX] = useState(board.panX || 0);
  const [panY, setPanY] = useState(board.panY || 0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0, panX: 0, panY: 0 });
  const [spacePressed, setSpacePressed] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  
  // Lasso selection state
  const [isLassoing, setIsLassoing] = useState(false);
  const [lassoStart, setLassoStart] = useState<{ x: number; y: number } | null>(null);
  const [lassoEnd, setLassoEnd] = useState<{ x: number; y: number } | null>(null);
  
  // Alignment guides
  const [alignmentGuides, setAlignmentGuides] = useState<{ type: 'vertical' | 'horizontal'; position: number }[]>([]);
  
  // Snap to grid helper (used by alignment guides)
  // @ts-expect-error - Will be used when connecting to node drag
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _snapToGrid = useCallback((value: number) => {
    if (!gridSnap) return value;
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
  }, [gridSnap]);
  
  // Calculate alignment guides when dragging (TODO: connect to node drag)
  // @ts-expect-error - Will be used when connecting to node drag
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _calculateAlignmentGuides = useCallback((draggedNode: VisualNode, newX: number, newY: number) => {
    if (!gridSnap) {
      setAlignmentGuides([]);
      return { x: newX, y: newY };
    }
    
    const guides: { type: 'vertical' | 'horizontal'; position: number }[] = [];
    const SNAP_THRESHOLD = 8;
    let snappedX = newX;
    let snappedY = newY;
    
    const draggedCenterX = newX + draggedNode.width / 2;
    const draggedCenterY = newY + draggedNode.height / 2;
    const draggedRight = newX + draggedNode.width;
    const draggedBottom = newY + draggedNode.height;
    
    board.visualNodes.filter(n => n.id !== draggedNode.id && n.type !== 'connector' && n.type !== 'drawing').forEach(node => {
      const nodeCenterX = node.x + node.width / 2;
      const nodeCenterY = node.y + node.height / 2;
      const nodeRight = node.x + node.width;
      const nodeBottom = node.y + node.height;
      
      // Left edge alignment
      if (Math.abs(newX - node.x) < SNAP_THRESHOLD) {
        snappedX = node.x;
        guides.push({ type: 'vertical', position: node.x * zoom + panX });
      }
      // Right edge alignment
      if (Math.abs(draggedRight - nodeRight) < SNAP_THRESHOLD) {
        snappedX = nodeRight - draggedNode.width;
        guides.push({ type: 'vertical', position: nodeRight * zoom + panX });
      }
      // Center X alignment
      if (Math.abs(draggedCenterX - nodeCenterX) < SNAP_THRESHOLD) {
        snappedX = nodeCenterX - draggedNode.width / 2;
        guides.push({ type: 'vertical', position: nodeCenterX * zoom + panX });
      }
      
      // Top edge alignment
      if (Math.abs(newY - node.y) < SNAP_THRESHOLD) {
        snappedY = node.y;
        guides.push({ type: 'horizontal', position: node.y * zoom + panY });
      }
      // Bottom edge alignment
      if (Math.abs(draggedBottom - nodeBottom) < SNAP_THRESHOLD) {
        snappedY = nodeBottom - draggedNode.height;
        guides.push({ type: 'horizontal', position: nodeBottom * zoom + panY });
      }
      // Center Y alignment
      if (Math.abs(draggedCenterY - nodeCenterY) < SNAP_THRESHOLD) {
        snappedY = nodeCenterY - draggedNode.height / 2;
        guides.push({ type: 'horizontal', position: nodeCenterY * zoom + panY });
      }
    });
    
    setAlignmentGuides(guides);
    return { x: snappedX, y: snappedY };
  }, [board.visualNodes, gridSnap, zoom, panX, panY]);
  
  // Clear alignment guides when not dragging
  const clearAlignmentGuides = useCallback(() => {
    setAlignmentGuides([]);
  }, []);

  // Handle spacebar for pan mode (only when not typing in inputs)
  useEffect(() => {
    const isTypingElement = (element: Element | null): boolean => {
      if (!element) return false;
      const tagName = element.tagName.toLowerCase();
      if (tagName === 'input' || tagName === 'textarea') return true;
      if (element.getAttribute('contenteditable') === 'true') return true;
      return false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture shortcuts if user is typing in an input/textarea
      if (isTypingElement(document.activeElement)) return;

      // Space for panning
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setSpacePressed(true);
      }
      // Delete or Backspace to delete selected nodes
      if ((e.code === 'Delete' || e.code === 'Backspace') && selectedNodeIds.length > 0) {
        e.preventDefault();
        onUpdateWithHistory({ visualNodes: board.visualNodes.filter(n => !selectedNodeIds.includes(n.id)) }, 'Delete elements');
        onSelectNodes([]);
      }
      // Cmd/Ctrl + D to duplicate
      if ((e.metaKey || e.ctrlKey) && e.code === 'KeyD' && selectedNodeIds.length > 0) {
        e.preventDefault();
        const duplicatedNodes = board.visualNodes
          .filter(n => selectedNodeIds.includes(n.id))
          .map(n => ({ ...n, id: generateId(), x: n.x + 20, y: n.y + 20 }));
        onUpdateWithHistory({ visualNodes: [...board.visualNodes, ...duplicatedNodes] }, 'Duplicate elements');
        onSelectNodes(duplicatedNodes.map(n => n.id));
      }
      // + or = to zoom in
      if ((e.code === 'Equal' || e.code === 'NumpadAdd') && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setZoom(z => Math.min(z * 1.2, 5));
      }
      // - to zoom out
      if ((e.code === 'Minus' || e.code === 'NumpadSubtract') && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setZoom(z => Math.max(z * 0.8, 0.1));
      }
      // 0 to reset zoom
      if (e.code === 'Digit0' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setZoom(1);
        setPanX(0);
        setPanY(0);
      }
      // Escape to deselect all
      if (e.code === 'Escape') {
        e.preventDefault();
        onSelectNodes([]);
        setConnectingFrom(null);
      }
      // Arrow keys for panning (MURAL-style)
      const PAN_STEP = e.shiftKey ? 100 : 50; // Shift for faster panning
      if (e.code === 'ArrowUp') {
        e.preventDefault();
        setPanY(y => y + PAN_STEP);
      }
      if (e.code === 'ArrowDown') {
        e.preventDefault();
        setPanY(y => y - PAN_STEP);
      }
      if (e.code === 'ArrowLeft') {
        e.preventDefault();
        setPanX(x => x + PAN_STEP);
      }
      if (e.code === 'ArrowRight') {
        e.preventDefault();
        setPanX(x => x - PAN_STEP);
      }
      // Cmd/Ctrl + A to select all
      if ((e.metaKey || e.ctrlKey) && e.code === 'KeyA') {
        e.preventDefault();
        onSelectNodes(board.visualNodes.filter(n => n.type !== 'connector' && n.type !== 'drawing').map(n => n.id));
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpacePressed(false);
        setIsPanning(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedNodeIds, board.visualNodes, onUpdateWithHistory, onSelectNodes]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.metaKey || e.ctrlKey) {
      e.preventDefault();
      setZoom(z => Math.min(Math.max(z * (e.deltaY > 0 ? 0.9 : 1.1), 0.1), 5));
    } else {
      setPanX(x => x - e.deltaX);
      setPanY(y => y - e.deltaY);
    }
  }, []);

  useEffect(() => { onUpdateBoard({ zoom, panX, panY }); }, [zoom, panX, panY]);

  const handleDelete = useCallback((nodeId: string) => {
    onUpdateWithHistory({ visualNodes: board.visualNodes.filter(n => n.id !== nodeId) }, 'Delete element');
    onSelectNodes([]);
  }, [board.visualNodes, onUpdateWithHistory, onSelectNodes]);

  const handleDuplicate = useCallback((node: VisualNode) => {
    const newNode: VisualNode = { ...node, id: generateId(), x: node.x + 20, y: node.y + 20 };
    onUpdateWithHistory({ visualNodes: [...board.visualNodes, newNode] }, 'Duplicate element');
  }, [board.visualNodes, onUpdateWithHistory]);

  const handleStartConnector = useCallback((nodeId: string) => {
    if (connectingFrom === null) {
      setConnectingFrom(nodeId);
    } else if (connectingFrom !== nodeId) {
      // Create a visual connector line between the two nodes
      const fromNode = board.visualNodes.find(n => n.id === connectingFrom);
      const toNode = board.visualNodes.find(n => n.id === nodeId);
      if (fromNode && toNode) {
        const connectorNode: VisualNode = {
          id: generateId(),
          type: 'connector',
          x: Math.min(fromNode.x, toNode.x),
          y: Math.min(fromNode.y, toNode.y),
          width: Math.abs(toNode.x - fromNode.x) + 100,
          height: Math.abs(toNode.y - fromNode.y) + 100,
          content: '',
          color: '#6b7280',
          rotation: 0,
          locked: false,
          votes: 0,
          votedBy: [],
          createdBy: 'user',
          comments: [],
          connectorFrom: connectingFrom,
          connectorTo: nodeId,
          connectorStyle: 'solid'
        };
        onUpdateWithHistory({ visualNodes: [...board.visualNodes, connectorNode] }, 'Connect elements');
      }
      setConnectingFrom(null);
    }
  }, [connectingFrom, board.visualNodes, onUpdateWithHistory]);

  // Drawing handlers
  const getCanvasPoint = useCallback((e: React.MouseEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - panX) / zoom,
      y: (e.clientY - rect.top - panY) / zoom
    };
  }, [panX, panY, zoom]);

  // Combined mouse down handler for panning and drawing
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Middle mouse button (button === 1), space+click, or isPanMode for panning
    if (e.button === 1 || spacePressed || (isPanMode && e.button === 0)) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY, panX, panY });
      return;
    }

    // Drawing mode
    if (isDrawingMode && e.button === 0) {
      e.preventDefault();
      e.stopPropagation();
      setIsDrawing(true);
      const point = getCanvasPoint(e);
      setCurrentPath([point]);
      return;
    }
    
    // Lasso selection with shift+click (only in select mode)
    if (e.shiftKey && e.button === 0 && !isDrawingMode && !isPanMode) {
      e.preventDefault();
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        setIsLassoing(true);
        setLassoStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        setLassoEnd({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }
    }
  }, [isDrawingMode, isPanMode, getCanvasPoint, spacePressed, panX, panY]);

  // Combined mouse move handler
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // Panning
    if (isPanning) {
      e.preventDefault();
      const deltaX = e.clientX - panStart.x;
      const deltaY = e.clientY - panStart.y;
      setPanX(panStart.panX + deltaX);
      setPanY(panStart.panY + deltaY);
      return;
    }

    // Drawing
    if (isDrawing && isDrawingMode) {
      e.preventDefault();
      const point = getCanvasPoint(e);
      setCurrentPath(prev => [...prev, point]);
      return;
    }
    
    // Lasso selection
    if (isLassoing && lassoStart) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        setLassoEnd({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }
    }
  }, [isPanning, panStart, isDrawing, isDrawingMode, getCanvasPoint, isLassoing, lassoStart]);

  // Combined mouse up handler
  const handleMouseUp = useCallback(() => {
    // Clear alignment guides
    clearAlignmentGuides();
    
    if (isPanning) {
      setIsPanning(false);
      return;
    }
    
    // Complete lasso selection
    if (isLassoing && lassoStart && lassoEnd) {
      const left = Math.min(lassoStart.x, lassoEnd.x);
      const top = Math.min(lassoStart.y, lassoEnd.y);
      const right = Math.max(lassoStart.x, lassoEnd.x);
      const bottom = Math.max(lassoStart.y, lassoEnd.y);
      
      // Convert screen coordinates to canvas coordinates
      const canvasLeft = (left - panX) / zoom;
      const canvasTop = (top - panY) / zoom;
      const canvasRight = (right - panX) / zoom;
      const canvasBottom = (bottom - panY) / zoom;
      
      // Find all nodes that intersect with the selection rectangle
      const selectedIds = board.visualNodes
        .filter(n => n.type !== 'connector' && n.type !== 'drawing')
        .filter(n => {
          return n.x < canvasRight && n.x + n.width > canvasLeft &&
                 n.y < canvasBottom && n.y + n.height > canvasTop;
        })
        .map(n => n.id);
      
      if (selectedIds.length > 0) {
        onSelectNodes(selectedIds);
      }
      
      setIsLassoing(false);
      setLassoStart(null);
      setLassoEnd(null);
      return;
    }

    if (!isDrawing || currentPath.length < 2) {
      setIsDrawing(false);
      setCurrentPath([]);
      return;
    }

    // Calculate bounding box
    const minX = Math.min(...currentPath.map(p => p.x));
    const minY = Math.min(...currentPath.map(p => p.y));
    const maxX = Math.max(...currentPath.map(p => p.x));
    const maxY = Math.max(...currentPath.map(p => p.y));

    // Normalize points relative to bounding box
    const normalizedPoints = currentPath.map(p => ({ x: p.x - minX, y: p.y - minY }));

    const drawingNode: VisualNode = {
      id: generateId(),
      type: 'drawing',
      x: minX,
      y: minY,
      width: Math.max(maxX - minX, 10),
      height: Math.max(maxY - minY, 10),
      content: '',
      color: drawingColor || '#3b82f6',
      rotation: 0,
      locked: false,
      votes: 0,
      votedBy: [],
      createdBy: 'user',
      comments: [],
      paths: [{ points: normalizedPoints, color: drawingColor || '#3b82f6', width: drawingWidth || 3 }],
      strokeColor: drawingColor || '#3b82f6',
      strokeWidth: drawingWidth || 3
    };

    onUpdateWithHistory({ visualNodes: [...board.visualNodes, drawingNode] }, 'Draw');
    setIsDrawing(false);
    setCurrentPath([]);
  }, [isPanning, isDrawing, currentPath, drawingColor, drawingWidth, board.visualNodes, onUpdateWithHistory, isLassoing, lassoStart, lassoEnd, panX, panY, zoom, onSelectNodes, clearAlignmentGuides]);

  // Get connector lines
  const connectorLines = board.visualNodes.filter(n => n.type === 'connector' && n.connectorFrom && n.connectorTo).map(conn => {
    const fromNode = board.visualNodes.find(n => n.id === conn.connectorFrom);
    const toNode = board.visualNodes.find(n => n.id === conn.connectorTo);
    if (!fromNode || !toNode) return null;
    return {
      id: conn.id,
      x1: fromNode.x + fromNode.width / 2,
      y1: fromNode.y + fromNode.height / 2,
      x2: toNode.x + toNode.width / 2,
      y2: toNode.y + toNode.height / 2,
      color: conn.color,
      style: conn.connectorStyle
    };
  }).filter(Boolean);

  return (
    <div
      ref={canvasRef}
      className={`relative flex-1 overflow-hidden bg-gray-100 ${isDrawingMode ? 'cursor-crosshair' : isPanning ? 'cursor-grabbing' : isPanMode || spacePressed ? 'cursor-grab' : 'cursor-default'}`}
      onWheel={handleWheel}
      onClick={() => { if (!isDrawingMode) { onSelectNodes([]); setConnectingFrom(null); } }}
      onDoubleClick={(e) => {
        if (onCanvasDoubleClick && !isDrawingMode) {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = (e.clientX - rect.left - panX) / zoom;
          const y = (e.clientY - rect.top - panY) / zoom;
          onCanvasDoubleClick(x, y);
        }
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)', backgroundSize: `${20 * zoom}px ${20 * zoom}px`, backgroundPosition: `${panX}px ${panY}px` }} />

      {/* SVG Layer for Connectors and Drawings */}
      <svg className="absolute inset-0 pointer-events-none" style={{ transform: `translate(${panX}px, ${panY}px) scale(${zoom})`, transformOrigin: 'top left' }}>
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
          </marker>
        </defs>
        {/* Connector lines */}
        {connectorLines.map((line: any) => (
          <line key={line.id} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} stroke={line.color || '#6b7280'} strokeWidth="2" strokeDasharray={line.style === 'dashed' ? '8,4' : line.style === 'dotted' ? '2,4' : 'none'} markerEnd="url(#arrowhead)" />
        ))}
        {/* Mind map connections */}
        {board.visualNodes.filter(n => n.type === 'mindmap' && n.parentNodeId).map(childNode => {
          const parentNode = board.visualNodes.find(n => n.id === childNode.parentNodeId);
          if (!parentNode) return null;
          const startX = parentNode.x + parentNode.width / 2;
          const startY = parentNode.y + parentNode.height / 2;
          const endX = childNode.x + childNode.width / 2;
          const endY = childNode.y + childNode.height / 2;
          const midX = (startX + endX) / 2;
          return (
            <path
              key={`mindmap-conn-${childNode.id}`}
              d={`M ${startX} ${startY} Q ${midX} ${startY} ${midX} ${(startY + endY) / 2} Q ${midX} ${endY} ${endX} ${endY}`}
              stroke={parentNode.color || '#8b5cf6'}
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
              opacity="0.6"
            />
          );
        })}
        {/* Existing drawings */}
        {board.visualNodes.filter(n => n.type === 'drawing' && n.paths).map(drawing => (
          <g key={drawing.id} transform={`translate(${drawing.x}, ${drawing.y})`}>
            {drawing.paths?.map((path, pathIndex) => (
              <path
                key={pathIndex}
                d={path.points.reduce((acc, point, i) => i === 0 ? `M ${point.x} ${point.y}` : `${acc} L ${point.x} ${point.y}`, '')}
                stroke={path.color}
                strokeWidth={path.width}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          </g>
        ))}
        {/* Current drawing in progress */}
        {isDrawing && currentPath.length > 1 && (
          <path
            d={currentPath.reduce((acc, point, i) => i === 0 ? `M ${point.x} ${point.y}` : `${acc} L ${point.x} ${point.y}`, '')}
            stroke={drawingColor || '#3b82f6'}
            strokeWidth={drawingWidth || 3}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>

      {/* Drawing Mode Indicator */}
      {isDrawingMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg z-50 flex items-center gap-2">
          <Pencil className="w-4 h-4" />
          Drawing mode active • Draw on canvas
        </div>
      )}

      {/* Pan Mode Indicator */}
      {(spacePressed || isPanMode) && !isDrawingMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-gray-700 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg z-50 flex items-center gap-2">
          <Move className="w-4 h-4" />
          Pan mode • Drag to move canvas
        </div>
      )}

      {/* Connecting Mode Indicator */}
      {connectingFrom && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg z-50 flex items-center gap-2">
          <Minus className="w-4 h-4" />
          Click another element to connect • <button onClick={() => setConnectingFrom(null)} className="underline">Cancel</button>
        </div>
      )}

      <motion.div className="absolute origin-top-left pointer-events-none" style={{ transform: `translate(${panX}px, ${panY}px) scale(${zoom})` }}>
        <AnimatePresence>
          {board.visualNodes.filter(n => n.type !== 'connector' && n.type !== 'drawing').map(node => (
            <StickyNote
              key={node.id}
              node={node}
              isSelected={selectedNodeIds.includes(node.id) || connectingFrom === node.id}
              onSelect={(e?: React.MouseEvent) => {
                if (connectingFrom && connectingFrom !== node.id) {
                  handleStartConnector(node.id);
                } else if (e?.shiftKey) {
                  // Toggle selection with shift-click
                  if (selectedNodeIds.includes(node.id)) {
                    onSelectNodes(selectedNodeIds.filter(id => id !== node.id));
                  } else {
                    onSelectNodes([...selectedNodeIds, node.id]);
                  }
                } else {
                  onSelectNodes([node.id]);
                }
              }}
              onUpdate={(updates) => {
                // Update all selected nodes if this node is selected and multiple are selected
                if (selectedNodeIds.includes(node.id) && selectedNodeIds.length > 1 && (updates.x !== undefined || updates.y !== undefined)) {
                  const deltaX = updates.x !== undefined ? updates.x - node.x : 0;
                  const deltaY = updates.y !== undefined ? updates.y - node.y : 0;
                  onUpdateWithHistory({
                    visualNodes: board.visualNodes.map(n =>
                      selectedNodeIds.includes(n.id)
                        ? { ...n, x: n.x + deltaX, y: n.y + deltaY }
                        : n
                    )
                  }, 'Move elements');
                } else {
                  onUpdateWithHistory({ visualNodes: board.visualNodes.map(n => n.id === node.id ? { ...n, ...updates } : n) }, 'Edit element');
                }
              }}
              onVote={() => onUpdateWithHistory({ visualNodes: board.visualNodes.map(n => n.id === node.id ? { ...n, votes: n.votes + 1 } : n) }, 'Vote')}
              onDelete={() => {
                // Delete all selected nodes if multiple are selected
                if (selectedNodeIds.length > 1 && selectedNodeIds.includes(node.id)) {
                  onUpdateWithHistory({ visualNodes: board.visualNodes.filter(n => !selectedNodeIds.includes(n.id)) }, 'Delete elements');
                  onSelectNodes([]);
                } else {
                  handleDelete(node.id);
                }
              }}
              onDuplicate={() => handleDuplicate(node)}
              onStartConnector={handleStartConnector}
              onAddMindmapChild={onAddMindmapChild}
              onAISparkle={onAISparkle}
              onReact={(emoji) => {
                const currentReactions = node.reactions || [];
                const existingReaction = currentReactions.find(r => r.emoji === emoji);
                let newReactions;
                if (existingReaction) {
                  if (existingReaction.userIds.includes('1')) {
                    newReactions = currentReactions.map(r => r.emoji === emoji ? { ...r, userIds: r.userIds.filter(id => id !== '1') } : r).filter(r => r.userIds.length > 0);
                  } else {
                    newReactions = currentReactions.map(r => r.emoji === emoji ? { ...r, userIds: [...r.userIds, '1'] } : r);
                  }
                } else {
                  newReactions = [...currentReactions, { emoji, userIds: ['1'] }];
                }
                onUpdateWithHistory({ visualNodes: board.visualNodes.map(n => n.id === node.id ? { ...n, reactions: newReactions } : n) }, 'React');
              }}
              zoom={zoom}
              selectedCount={selectedNodeIds.length}
              isDrawingMode={isDrawingMode}
            />
          ))}
        </AnimatePresence>
      </motion.div>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-lg p-2 flex items-center gap-2 border border-gray-200 z-30">
        <button onClick={() => setZoom(z => Math.max(z * 0.8, 0.1))} className="p-2 hover:bg-gray-100 rounded-lg" title="Zoom out (-)"><ZoomOut className="w-4 h-4 text-gray-600" /></button>
        <span className="text-sm font-medium w-16 text-center text-gray-700">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(z => Math.min(z * 1.2, 5))} className="p-2 hover:bg-gray-100 rounded-lg" title="Zoom in (+)"><ZoomIn className="w-4 h-4 text-gray-600" /></button>
        <div className="w-px h-6 bg-gray-200" />
        <button onClick={() => { setZoom(1); setPanX(0); setPanY(0); }} className="p-2 hover:bg-gray-100 rounded-lg" title="Reset view (0)"><Maximize2 className="w-4 h-4 text-gray-600" /></button>
        <button
          onClick={() => {
            const nodes = board.visualNodes.filter(n => n.type !== 'connector' && n.type !== 'drawing');
            if (nodes.length === 0) return;
            const minX = Math.min(...nodes.map(n => n.x));
            const maxX = Math.max(...nodes.map(n => n.x + n.width));
            const minY = Math.min(...nodes.map(n => n.y));
            const maxY = Math.max(...nodes.map(n => n.y + n.height));
            const contentWidth = maxX - minX + 100;
            const contentHeight = maxY - minY + 100;
            const viewWidth = canvasRef.current?.clientWidth || window.innerWidth;
            const viewHeight = canvasRef.current?.clientHeight || window.innerHeight;
            const newZoom = Math.min(viewWidth / contentWidth, viewHeight / contentHeight, 2);
            setZoom(newZoom);
            setPanX(-minX * newZoom + (viewWidth - contentWidth * newZoom) / 2 + 50 * newZoom);
            setPanY(-minY * newZoom + (viewHeight - contentHeight * newZoom) / 2 + 50 * newZoom);
          }}
          className="p-2 hover:bg-gray-100 rounded-lg"
          title="Fit all content"
        >
          <Minimize2 className="w-4 h-4 text-gray-600" />
        </button>
      </div>
      {/* Keyboard shortcuts hint */}
      <div className="absolute bottom-4 left-4 text-xs text-gray-400 z-30 space-y-0.5">
        <div><span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">V</span> select • <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">H</span> pan tool • <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">B</span> draw</div>
        <div><span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">Space</span>+drag or <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">↑↓←→</span> pan • <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">Shift</span>+arrows faster</div>
      </div>
      
      {/* Lasso Selection */}
      <LassoSelection isActive={isLassoing} startPoint={lassoStart} currentPoint={lassoEnd} />
      
      {/* Alignment Guides */}
      <AlignmentGuides guides={alignmentGuides} />
      
      {/* Minimap */}
      {showMinimap && (
        <Minimap 
          nodes={board.visualNodes}
          zoom={zoom}
          panX={panX}
          panY={panY}
          canvasWidth={canvasRef.current?.clientWidth || 800}
          canvasHeight={canvasRef.current?.clientHeight || 600}
          onPan={(x, y) => { setPanX(x); setPanY(y); }}
        />
      )}
      
      {/* Other Users' Cursors */}
      {otherUsers?.map(user => (
        <UserCursor key={user.id} user={user} />
      ))}
    </div>
  );
};

// Minimap Component
const Minimap = ({ 
  nodes, 
  zoom, 
  panX, 
  panY, 
  canvasWidth, 
  canvasHeight,
  onPan 
}: { 
  nodes: VisualNode[]; 
  zoom: number; 
  panX: number; 
  panY: number; 
  canvasWidth: number;
  canvasHeight: number;
  onPan: (x: number, y: number) => void;
}) => {
  const minimapRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Calculate bounds of all nodes
  const bounds = nodes.length > 0 ? {
    minX: Math.min(...nodes.map(n => n.x)) - 100,
    maxX: Math.max(...nodes.map(n => n.x + n.width)) + 100,
    minY: Math.min(...nodes.map(n => n.y)) - 100,
    maxY: Math.max(...nodes.map(n => n.y + n.height)) + 100,
  } : { minX: 0, maxX: 1000, minY: 0, maxY: 1000 };
  
  const contentWidth = bounds.maxX - bounds.minX;
  const contentHeight = bounds.maxY - bounds.minY;
  const minimapWidth = 180;
  const minimapHeight = 120;
  const scale = Math.min(minimapWidth / contentWidth, minimapHeight / contentHeight);
  
  // Viewport rectangle
  const viewportWidth = (canvasWidth / zoom) * scale;
  const viewportHeight = (canvasHeight / zoom) * scale;
  const viewportX = ((-panX / zoom) - bounds.minX) * scale;
  const viewportY = ((-panY / zoom) - bounds.minY) * scale;

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    handleMouseMove(e);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging && e.type !== 'mousedown') return;
    if (!minimapRef.current) return;
    
    const rect = minimapRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Convert minimap coordinates to canvas coordinates
    const canvasX = (x / scale) + bounds.minX;
    const canvasY = (y / scale) + bounds.minY;
    
    // Center the viewport on click position
    const newPanX = -(canvasX - (canvasWidth / zoom / 2)) * zoom;
    const newPanY = -(canvasY - (canvasHeight / zoom / 2)) * zoom;
    
    onPan(newPanX, newPanY);
  };

  const handleMouseUp = () => setIsDragging(false);

  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseUp = () => setIsDragging(false);
      window.addEventListener('mouseup', handleGlobalMouseUp);
      return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }
  }, [isDragging]);

  return (
    <div 
      ref={minimapRef}
      className="absolute bottom-20 right-4 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-2 z-40 cursor-crosshair"
      style={{ width: minimapWidth + 16, height: minimapHeight + 16 }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="absolute top-1 left-2 text-[10px] font-medium text-gray-400 flex items-center gap-1">
        <Map className="w-3 h-3" /> Minimap
      </div>
      <svg width={minimapWidth} height={minimapHeight} className="mt-3">
        {/* Grid background */}
        <rect x="0" y="0" width={minimapWidth} height={minimapHeight} fill="#f9fafb" rx="4" />
        
        {/* Nodes */}
        {nodes.filter(n => n.type !== 'connector' && n.type !== 'drawing').map(node => (
          <rect
            key={node.id}
            x={(node.x - bounds.minX) * scale}
            y={(node.y - bounds.minY) * scale}
            width={Math.max(node.width * scale, 2)}
            height={Math.max(node.height * scale, 2)}
            fill={node.color || '#dbeafe'}
            stroke="#6b7280"
            strokeWidth="0.5"
            rx="1"
            opacity="0.8"
          />
        ))}
        
        {/* Viewport indicator */}
        <rect
          x={Math.max(0, viewportX)}
          y={Math.max(0, viewportY)}
          width={Math.min(viewportWidth, minimapWidth - viewportX)}
          height={Math.min(viewportHeight, minimapHeight - viewportY)}
          fill="rgba(99, 102, 241, 0.1)"
          stroke="#6366f1"
          strokeWidth="2"
          rx="2"
        />
      </svg>
    </div>
  );
};

// Lasso Selection Component
const LassoSelection = ({
  isActive,
  startPoint,
  currentPoint
}: {
  isActive: boolean;
  startPoint: { x: number; y: number } | null;
  currentPoint: { x: number; y: number } | null;
}) => {
  if (!isActive || !startPoint || !currentPoint) return null;
  
  const left = Math.min(startPoint.x, currentPoint.x);
  const top = Math.min(startPoint.y, currentPoint.y);
  const width = Math.abs(currentPoint.x - startPoint.x);
  const height = Math.abs(currentPoint.y - startPoint.y);
  
  return (
    <div
      className="absolute pointer-events-none border-2 border-indigo-500 bg-indigo-500/10 z-50"
      style={{ left, top, width, height }}
    />
  );
};

// Alignment Guides Component
const AlignmentGuides = ({
  guides
}: {
  guides: { type: 'vertical' | 'horizontal'; position: number }[];
}) => {
  return (
    <>
      {guides.map((guide, i) => (
        <div
          key={i}
          className="absolute pointer-events-none z-40"
          style={guide.type === 'vertical' 
            ? { left: guide.position, top: 0, bottom: 0, width: 1, background: '#ef4444' }
            : { top: guide.position, left: 0, right: 0, height: 1, background: '#ef4444' }
          }
        />
      ))}
    </>
  );
};

// Presentation Mode Component
const PresentationMode = ({
  isOpen,
  frames,
  currentFrameIndex,
  onClose,
  onNext,
  onPrev,
  onGoTo
}: {
  isOpen: boolean;
  frames: VisualNode[];
  currentFrameIndex: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  onGoTo: (index: number) => void;
}) => {
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' || e.key === ' ') onNext();
      if (e.key === 'ArrowLeft') onPrev();
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onNext, onPrev]);

  if (!isOpen) return null;
  
  const currentFrame = frames[currentFrameIndex];
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-gray-900 z-[100] flex flex-col"
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-b from-black/50 to-transparent z-10">
        <div className="flex items-center gap-4">
          <h2 className="text-white text-xl font-bold">{currentFrame?.content || 'Untitled Frame'}</h2>
          <span className="text-white/60 text-sm">{currentFrameIndex + 1} / {frames.length}</span>
        </div>
        <button onClick={onClose} className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg">
          <X className="w-6 h-6" />
        </button>
      </div>
      
      {/* Frame content area */}
      <div className="flex-1 flex items-center justify-center p-20">
        {currentFrame && (
          <motion.div
            key={currentFrame.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl p-8 max-w-4xl"
            style={{ backgroundColor: currentFrame.color || '#ffffff' }}
          >
            <h1 className="text-4xl font-bold text-gray-900 mb-4">{currentFrame.content}</h1>
          </motion.div>
        )}
      </div>
      
      {/* Navigation */}
      <div className="absolute bottom-0 left-0 right-0 p-4 flex items-center justify-center gap-4 bg-gradient-to-t from-black/50 to-transparent">
        <button 
          onClick={onPrev} 
          disabled={currentFrameIndex === 0}
          className="p-3 text-white bg-white/10 hover:bg-white/20 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        
        <div className="flex gap-2">
          {frames.map((_, i) => (
            <button
              key={i}
              onClick={() => onGoTo(i)}
              className={`w-3 h-3 rounded-full transition-all ${i === currentFrameIndex ? 'bg-white scale-125' : 'bg-white/40 hover:bg-white/60'}`}
            />
          ))}
        </div>
        
        <button 
          onClick={onNext}
          disabled={currentFrameIndex === frames.length - 1}
          className="p-3 text-white bg-white/10 hover:bg-white/20 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
      
      {/* Keyboard hints */}
      <div className="absolute bottom-4 left-4 text-white/40 text-xs">
        <span className="bg-white/10 px-2 py-1 rounded">←</span> / <span className="bg-white/10 px-2 py-1 rounded">→</span> navigate • <span className="bg-white/10 px-2 py-1 rounded">Esc</span> exit
      </div>
    </motion.div>
  );
};

// Version History Panel
const VersionHistoryPanel = ({
  isOpen,
  history,
  currentIndex,
  onClose,
  onRestore
}: {
  isOpen: boolean;
  history: HistoryEntry[];
  currentIndex: number;
  onClose: () => void;
  onRestore: (index: number) => void;
}) => {
  if (!isOpen) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="absolute top-4 right-4 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-[500px] overflow-hidden flex flex-col"
    >
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-gray-900">Version History</h3>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2">
        {history.slice().reverse().map((entry, reversedIndex) => {
          const actualIndex = history.length - 1 - reversedIndex;
          const isCurrentVersion = actualIndex === currentIndex;
          
          return (
            <div
              key={reversedIndex}
              className={`p-3 rounded-lg mb-1 cursor-pointer transition-all ${
                isCurrentVersion 
                  ? 'bg-indigo-50 border-2 border-indigo-200' 
                  : 'hover:bg-gray-50 border-2 border-transparent'
              }`}
              onClick={() => !isCurrentVersion && onRestore(actualIndex)}
            >
              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium ${isCurrentVersion ? 'text-indigo-700' : 'text-gray-700'}`}>
                  {entry.action}
                </span>
                {isCurrentVersion && (
                  <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">Current</span>
                )}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {new Date(entry.timestamp).toLocaleTimeString()} • {entry.nodes.length} elements
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

// User Cursor Component (for collaboration)
const UserCursor = ({ user }: { user: UserPresence }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0 }}
      className="absolute pointer-events-none z-50"
      style={{ left: user.cursorX, top: user.cursorY }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill={user.color}>
        <path d="M5 3l14 7-7 1.5L10.5 19 5 3z" stroke="white" strokeWidth="1.5" />
      </svg>
      <div 
        className="absolute left-5 top-5 px-2 py-1 rounded-md text-xs font-medium text-white whitespace-nowrap"
        style={{ backgroundColor: user.color }}
      >
        {user.name}
      </div>
    </motion.div>
  );
};

// Export Modal Component
const ExportModal = ({
  isOpen,
  onClose,
  onExport
}: {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: 'png' | 'svg' | 'pdf' | 'json') => void;
}) => {
  if (!isOpen) return null;
  
  const formats = [
    { id: 'png' as const, name: 'PNG Image', icon: Image, desc: 'High-quality raster image' },
    { id: 'svg' as const, name: 'SVG Vector', icon: Copy, desc: 'Scalable vector graphics' },
    { id: 'pdf' as const, name: 'PDF Document', icon: FileText, desc: 'Print-ready document' },
    { id: 'json' as const, name: 'JSON Data', icon: Download, desc: 'Backup & restore data' },
  ];
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-[90] flex items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-2xl p-6 w-96"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Export Canvas</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        
        <div className="space-y-2">
          {formats.map(format => (
            <button
              key={format.id}
              onClick={() => { onExport(format.id); onClose(); }}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all group"
            >
              <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-indigo-100">
                <format.icon className="w-5 h-5 text-gray-600 group-hover:text-indigo-600" />
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900">{format.name}</p>
                <p className="text-xs text-gray-500">{format.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

// Transcript Panel
const TranscriptPanel = ({
  transcript, isRecording, onToggleRecording, currentSpeaker, onSpeakerChange, onAddNote, isMinimized, onToggleMinimize, savedTranscripts: _savedTranscripts
}: {
  transcript: TranscriptEntry[];
  isRecording: boolean;
  onToggleRecording: () => void;
  currentSpeaker: string;
  onSpeakerChange: (id: string) => void;
  onAddNote: (text: string) => void;
  isMinimized: boolean;
  onToggleMinimize: () => void;
  savedTranscripts: SavedTranscript[];
}) => {
  const [interimText, setInterimText] = useState('');
  const recognitionRef = useRef<any>(null);
  const lastProcessedRef = useRef<number>(-1);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (isRecording && SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal && i > lastProcessedRef.current) {
            finalTranscript += result[0].transcript;
            lastProcessedRef.current = i;
          } else if (!result.isFinal) {
            interimTranscript += result[0].transcript;
          }
        }
        if (finalTranscript.trim()) { onAddNote(finalTranscript.trim()); setInterimText(''); }
        else setInterimText(interimTranscript);
      };

      recognition.onend = () => {
        if (isRecording && recognitionRef.current) {
          setTimeout(() => { try { recognitionRef.current?.start(); } catch (e) {} }, 100);
        }
      };

      recognitionRef.current = recognition;
      lastProcessedRef.current = -1;
      try { recognition.start(); } catch (e) {}
    }
    return () => { try { recognitionRef.current?.stop(); } catch (e) {} recognitionRef.current = null; setInterimText(''); };
  }, [isRecording, onAddNote]);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [transcript, interimText]);

  if (isMinimized) {
    return (
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute right-4 top-4 z-40">
        <motion.button whileHover={{ scale: 1.05 }} onClick={onToggleMinimize} className="flex items-center gap-3 px-4 py-3 bg-white rounded-2xl shadow-lg border border-gray-200">
          <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-300'}`} />
          <span className="font-medium text-gray-700">Transcript</span>
          <span className="text-sm text-gray-500">({transcript.length})</span>
          <Maximize2 className="w-4 h-4 text-gray-400" />
        </motion.button>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ x: 400, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="absolute right-4 top-4 w-96 bg-white rounded-2xl shadow-2xl overflow-hidden z-40 max-h-[calc(100vh-200px)] flex flex-col border border-gray-200">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5" />
          <h3 className="font-semibold">Live Transcript</h3>
        </div>
        <div className="flex items-center gap-2">
          <motion.button whileHover={{ scale: 1.1 }} onClick={onToggleMinimize} className="p-2 bg-white/20 rounded-lg hover:bg-white/30">
            <Minimize2 className="w-4 h-4 text-white" />
          </motion.button>
          <select value={currentSpeaker} onChange={(e) => onSpeakerChange(e.target.value)} className="px-3 py-1 bg-white/20 rounded-lg text-sm text-white border-none outline-none">
            {PARTICIPANTS.map(p => <option key={p.id} value={p.id} className="text-gray-900">{p.name}</option>)}
          </select>
          <motion.button whileHover={{ scale: 1.1 }} onClick={onToggleRecording} className={`w-12 h-12 rounded-full flex items-center justify-center ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-white/20'}`}>
            {isRecording ? <StopCircle className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
          </motion.button>
        </div>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {transcript.map((entry) => {
            const speaker = PARTICIPANTS.find(p => p.id === entry.speaker);
            return (
              <motion.div key={entry.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0" style={{ backgroundColor: speaker?.color || '#6b7280' }}>
                  {speaker?.name.charAt(0) || '?'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm text-gray-900">{speaker?.name || 'Unknown'}</span>
                    <span className="text-xs text-gray-400">{Math.floor(entry.timestamp / 60)}:{(entry.timestamp % 60).toString().padStart(2, '0')}</span>
                  </div>
                  <p className="text-sm text-gray-700">{entry.text}</p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {interimText && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.7 }} className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-200 flex-shrink-0 flex items-center justify-center">
              <Mic className="w-4 h-4 text-indigo-600 animate-pulse" />
            </div>
            <p className="text-sm text-gray-500 italic flex-1">{interimText}...</p>
          </motion.div>
        )}
        {transcript.length === 0 && !interimText && (
          <div className="text-center py-12 text-gray-500">
            <Mic className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Click record to start</p>
            <p className="text-sm text-gray-400 mt-1">Speak clearly into your microphone</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Parsed Items Panel
const ParsedItemsPanel = ({ items, onAddItem, onDismissItem, onAddAll, isVisible }: {
  items: ParsedItem[];
  onAddItem: (item: ParsedItem) => void;
  onDismissItem: (id: string) => void;
  onAddAll: () => void;
  isVisible: boolean;
}) => {
  if (!isVisible || items.length === 0) return null;

  const typeConfig: Record<ParsedItem['type'], { icon: typeof Lightbulb; color: string; label: string }> = {
    idea: { icon: Lightbulb, color: 'text-yellow-600 bg-yellow-100', label: 'Idea' },
    action: { icon: CheckSquare, color: 'text-green-600 bg-green-100', label: 'Action' },
    question: { icon: MessageSquare, color: 'text-blue-600 bg-blue-100', label: 'Question' },
    decision: { icon: Check, color: 'text-purple-600 bg-purple-100', label: 'Decision' },
    risk: { icon: AlertCircle, color: 'text-red-600 bg-red-100', label: 'Risk' },
  };

  return (
    <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="absolute bottom-24 right-4 w-96 bg-white rounded-2xl shadow-2xl overflow-hidden z-40 border border-gray-200">
      <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            <h3 className="font-semibold">Suggested Items ({items.length})</h3>
          </div>
          <motion.button whileHover={{ scale: 1.05 }} onClick={onAddAll} className="px-3 py-1 bg-white/20 rounded-lg text-sm font-medium hover:bg-white/30">
            Add All
          </motion.button>
        </div>
      </div>
      <div className="max-h-64 overflow-y-auto p-3 space-y-2">
        {items.map(item => {
          const config = typeConfig[item.type];
          const Icon = config.icon;
          return (
            <motion.div key={item.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl group">
              <div className={`p-2 rounded-lg ${config.color}`}><Icon className="w-4 h-4" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.color}`}>{config.label}</span>
                  <span className="text-xs text-gray-400">{Math.round(item.confidence * 100)}%</span>
                </div>
                <p className="text-sm text-gray-700 line-clamp-2">{item.content}</p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <motion.button whileHover={{ scale: 1.1 }} onClick={() => onAddItem(item)} className="p-1.5 bg-green-100 text-green-600 rounded-lg hover:bg-green-200">
                  <Plus className="w-4 h-4" />
                </motion.button>
                <motion.button whileHover={{ scale: 1.1 }} onClick={() => onDismissItem(item.id)} className="p-1.5 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200">
                  <X className="w-4 h-4" />
                </motion.button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

// Template Modal
const TemplateModal = ({ isOpen, onClose, onSelectTemplate }: { isOpen: boolean; onClose: () => void; onSelectTemplate: (template: typeof BOARD_TEMPLATES[0]) => void }) => {
  if (!isOpen) return null;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white rounded-2xl p-6 w-[600px] max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Choose a Template</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {BOARD_TEMPLATES.map(template => {
            const Icon = template.icon;
            return (
              <motion.button key={template.id} whileHover={{ scale: 1.02 }} onClick={() => { onSelectTemplate(template); onClose(); }} className="flex items-start gap-4 p-4 rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 text-left">
                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0"><Icon className="w-6 h-6 text-indigo-600" /></div>
                <div><p className="font-semibold text-gray-900">{template.name}</p><p className="text-sm text-gray-500">{template.description}</p></div>
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
};

// Media Modal
const MediaModal = ({ type, onClose, onEmbed }: { type: 'youtube' | 'image'; onClose: () => void; onEmbed: (url: string, mediaType: 'youtube' | 'image') => void }) => {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    if (preview) {
      onEmbed(preview, 'image');
      onClose();
      return;
    }
    if (!url.trim()) { setError('Please enter a URL or upload a file'); return; }
    if (type === 'youtube') {
      const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
      if (!match) { setError('Invalid YouTube URL'); return; }
      onEmbed(`https://www.youtube.com/embed/${match[1]}`, 'youtube');
    } else {
      onEmbed(url, 'image');
    }
    onClose();
  };

  const handleFileChange = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileChange(file);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white rounded-2xl p-6 w-[500px]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {type === 'youtube' ? <Youtube className="w-6 h-6 text-red-500" /> : <Image className="w-6 h-6 text-indigo-500" />}
            <h2 className="text-xl font-bold text-gray-900">{type === 'youtube' ? 'Embed YouTube Video' : 'Embed Image'}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <div className="space-y-4">
          {type === 'image' && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-gray-400'}`}
            >
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])} />
              {preview ? (
                <div className="space-y-3">
                  <img src={preview} alt="Preview" className="max-h-40 mx-auto rounded-lg" />
                  <p className="text-sm text-gray-500">Click or drag to replace</p>
                </div>
              ) : (
                <>
                  <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                  <p className="font-medium text-gray-700">Drop an image here or click to browse</p>
                  <p className="text-sm text-gray-500 mt-1">PNG, JPG, GIF up to 10MB</p>
                </>
              )}
            </div>
          )}
          <div className="relative">
            {type === 'image' && <div className="flex items-center gap-3 my-4"><div className="flex-1 h-px bg-gray-200" /><span className="text-sm text-gray-500">or paste URL</span><div className="flex-1 h-px bg-gray-200" /></div>}
            <label className="block text-sm font-medium text-gray-700 mb-2">{type === 'youtube' ? 'YouTube URL' : 'Image URL'}</label>
            <input type="text" value={url} onChange={(e) => { setUrl(e.target.value); setError(''); setPreview(null); }} placeholder={type === 'youtube' ? 'https://www.youtube.com/watch?v=...' : 'https://example.com/image.jpg'} className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          </div>
          <div className="flex gap-3">
            <motion.button whileHover={{ scale: 1.02 }} onClick={handleSubmit} className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl font-medium">Embed</motion.button>
            <motion.button whileHover={{ scale: 1.02 }} onClick={onClose} className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium">Cancel</motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// QR Code Modal
const QRCodeModal = ({ boardId, onClose, onCreateBucket }: { boardId: string; onClose: () => void; onCreateBucket: (bucketId: string) => void }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [bucketId] = useState(() => generateId());
  const uploadUrl = `${window.location.origin}/upload/${boardId}/${bucketId}`;

  useEffect(() => {
    QRCode.toDataURL(uploadUrl, { width: 256, margin: 2, color: { dark: '#000000', light: '#ffffff' } }).then(setQrCodeUrl).catch(console.error);
  }, [uploadUrl]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white rounded-2xl p-6 w-[450px]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3"><QrCode className="w-6 h-6 text-indigo-500" /><h2 className="text-xl font-bold text-gray-900">Photo Upload QR Code</h2></div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <div className="text-center space-y-4">
          {qrCodeUrl ? <div className="bg-gray-50 rounded-2xl p-6 inline-block"><img src={qrCodeUrl} alt="QR Code" className="w-48 h-48 mx-auto" /></div> : <div className="w-48 h-48 bg-gray-100 rounded-2xl animate-pulse mx-auto" />}
          <div className="text-left bg-indigo-50 rounded-xl p-4">
            <h3 className="font-semibold text-indigo-900 mb-2 flex items-center gap-2"><Sparkles className="w-4 h-4" />How it works</h3>
            <ol className="text-sm text-indigo-700 space-y-1">
              <li>1. Scan this QR code with your phone</li>
              <li>2. Take a photo of a whiteboard or document</li>
              <li>3. Upload it - no login required!</li>
              <li>4. The image appears in your bucket on the board</li>
            </ol>
          </div>
          <motion.button whileHover={{ scale: 1.02 }} onClick={() => { onCreateBucket(bucketId); onClose(); }} className="w-full px-4 py-3 bg-indigo-600 text-white rounded-xl font-medium flex items-center justify-center gap-2">
            <Inbox className="w-5 h-5" />Add Bucket to Board
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Action Items Panel
const ActionItemsPanel = ({ actionItems, onToggleComplete, onAddAction, onAssignUser, isMinimized, onToggleMinimize }: { actionItems: ActionItem[]; onToggleComplete: (id: string) => void; onAddAction: (content: string) => void; onAssignUser: (id: string, assigneeId: string | undefined) => void; isMinimized: boolean; onToggleMinimize: () => void }) => {
  const [newAction, setNewAction] = useState('');
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState<string | null>(null);
  const pendingCount = actionItems.filter(a => !a.isComplete).length;

  if (isMinimized) {
    return (
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute right-4 bottom-4 z-40">
        <motion.button whileHover={{ scale: 1.05 }} onClick={onToggleMinimize} className="flex items-center gap-3 px-4 py-3 bg-white rounded-2xl shadow-lg border border-gray-200">
          <ListTodo className="w-5 h-5 text-indigo-600" />
          <span className="font-medium text-gray-700">Actions</span>
          {pendingCount > 0 && <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">{pendingCount}</span>}
          <ChevronUp className="w-4 h-4 text-gray-400" />
        </motion.button>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="absolute right-4 bottom-4 w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-40 max-h-[400px] flex flex-col">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-t-2xl">
        <div className="flex items-center gap-3">
          <ListTodo className="w-5 h-5" />
          <h3 className="font-semibold">Action Items</h3>
          {pendingCount > 0 && <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs font-medium">{pendingCount} pending</span>}
        </div>
        <motion.button whileHover={{ scale: 1.1 }} onClick={onToggleMinimize} className="p-1.5 bg-white/20 rounded-lg hover:bg-white/30">
          <ChevronDown className="w-4 h-4" />
        </motion.button>
      </div>
      <div className="p-4 flex-1 overflow-hidden flex flex-col">
        <div className="flex gap-2 mb-3">
          <input type="text" value={newAction} onChange={(e) => setNewAction(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && newAction.trim()) { onAddAction(newAction); setNewAction(''); }}} placeholder="Add action item..." className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <motion.button whileHover={{ scale: 1.05 }} onClick={() => { if (newAction.trim()) { onAddAction(newAction); setNewAction(''); }}} className="px-3 py-2 bg-indigo-600 text-white rounded-xl"><Plus className="w-4 h-4" /></motion.button>
        </div>
        <div className="space-y-2 flex-1 overflow-y-auto">
          <AnimatePresence>
            {actionItems.map(item => {
              const assignee = PARTICIPANTS.find(p => p.id === item.assigneeId);
              return (
                <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex items-start gap-3 p-3 rounded-xl ${item.isComplete ? 'bg-gray-50' : 'bg-white border border-gray-200'}`}>
                  <motion.button whileHover={{ scale: 1.1 }} onClick={() => onToggleComplete(item.id)} className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${item.isComplete ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>{item.isComplete && <Check className="w-3 h-3 text-white" />}</motion.button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${item.isComplete ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{item.content}</p>
                    <div className="flex items-center gap-2 mt-1.5 relative">
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowAssigneeDropdown(showAssigneeDropdown === item.id ? null : item.id); }}
                        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        {assignee ? (
                          <>
                            <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-medium" style={{ backgroundColor: assignee.color }}>{assignee.name.charAt(0)}</div>
                            <span>{assignee.name}</span>
                          </>
                        ) : (
                          <>
                            <Users className="w-4 h-4" />
                            <span>Assign</span>
                          </>
                        )}
                      </button>
                      {showAssigneeDropdown === item.id && (
                        <div className="absolute left-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 w-40">
                          <button onClick={() => { onAssignUser(item.id, undefined); setShowAssigneeDropdown(null); }} className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 text-gray-500">Unassigned</button>
                          {PARTICIPANTS.map(p => (
                            <button key={p.id} onClick={() => { onAssignUser(item.id, p.id); setShowAssigneeDropdown(null); }} className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 flex items-center gap-2">
                              <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-medium" style={{ backgroundColor: p.color }}>{p.name.charAt(0)}</div>
                              <span className="text-gray-700">{p.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {actionItems.length === 0 && <div className="text-center py-6 text-gray-400"><ListTodo className="w-6 h-6 mx-auto mb-2 opacity-40" /><p className="text-xs">No action items yet</p></div>}
        </div>
      </div>
    </motion.div>
  );
};

// Timer Component for facilitation
const FacilitationTimer = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [timeLeft, setTimeLeft] = useState(5 * 60); // 5 minutes default
  const [isRunning, setIsRunning] = useState(false);
  const [presetMinutes, setPresetMinutes] = useState(5);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (timeLeft === 0) {
      setIsRunning(false);
      // Play a sound or show notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Timer Complete!', { body: 'Time is up!' });
      }
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const setPreset = (minutes: number) => {
    setPresetMinutes(minutes);
    setTimeLeft(minutes * 60);
    setIsRunning(false);
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      className="absolute top-20 right-4 bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 z-50 w-64"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Timer className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-gray-800">Timer</h3>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-400" /></button>
      </div>

      <div className={`text-5xl font-mono font-bold text-center py-6 rounded-xl mb-4 ${timeLeft === 0 ? 'bg-red-50 text-red-600 animate-pulse' : timeLeft < 60 ? 'bg-orange-50 text-orange-600' : 'bg-gray-50 text-gray-800'}`}>
        {formatTime(timeLeft)}
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setIsRunning(!isRunning)} className={`flex-1 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 ${isRunning ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
          {isRunning ? <><Pause className="w-4 h-4" />Pause</> : <><Play className="w-4 h-4" />Start</>}
        </button>
        <button onClick={() => setTimeLeft(presetMinutes * 60)} className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200">
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      <div className="flex gap-1.5">
        {[1, 3, 5, 10, 15].map(mins => (
          <button key={mins} onClick={() => setPreset(mins)} className={`flex-1 py-2 rounded-lg text-xs font-medium ${presetMinutes === mins ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>{mins}m</button>
        ))}
      </div>
    </motion.div>
  );
};

// AI Chat Panel
const AIChatPanel = ({
  isOpen,
  onClose,
  messages,
  onSendMessage,
  onAcceptSuggestions,
  onRetrySuggestions,
  selectedNodes,
  isLoading
}: {
  isOpen: boolean;
  onClose: () => void;
  messages: AIMessage[];
  onSendMessage: (message: string) => void;
  onAcceptSuggestions: (nodes: { content: string; color: string }[]) => void;
  onRetrySuggestions: () => void;
  selectedNodes: VisualNode[];
  isLoading: boolean;
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      className="absolute right-4 top-4 w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 flex flex-col max-h-[calc(100vh-120px)]"
    >
      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-t-2xl">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5" />
          <span className="font-semibold">Fan AI</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {selectedNodes.length > 0 && (
        <div className="px-4 py-2 bg-purple-50 border-b border-purple-100 text-xs text-purple-700">
          <span className="font-medium">{selectedNodes.length} element{selectedNodes.length > 1 ? 's' : ''} selected</span>
          {selectedNodes.length === 1 && selectedNodes[0].content && (
            <p className="truncate mt-1 text-purple-600">"{selectedNodes[0].content.substring(0, 50)}..."</p>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[200px]">
        {messages.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <Sparkles className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p className="text-sm font-medium">How can I help?</p>
            <p className="text-xs mt-1">Select elements and ask me to generate ideas, rewrite, translate, and more.</p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
              {msg.isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Generating...</span>
                </div>
              ) : (
                <>
                  <p className="text-sm">{msg.content}</p>
                  {msg.generatedNodes && msg.generatedNodes.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-medium opacity-70">Generated ideas:</p>
                      {msg.generatedNodes.map((node, idx) => (
                        <div key={idx} className="p-2 rounded-lg text-xs" style={{ backgroundColor: node.color }}>
                          {node.content}
                        </div>
                      ))}
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => onAcceptSuggestions(msg.generatedNodes!)}
                          className="flex-1 py-1.5 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600 flex items-center justify-center gap-1"
                        >
                          <Check className="w-3 h-3" /> Accept
                        </button>
                        <button
                          onClick={onRetrySuggestions}
                          className="flex-1 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-300 flex items-center justify-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" /> Try again
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-gray-100">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="What would you like to ask?"
            className="flex-1 px-4 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={isLoading}
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="p-2.5 bg-indigo-600 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

// AI Sparkle Menu (appears on selected elements)
const AISparkleMenu = ({
  onAction,
  position
}: {
  onAction: (action: string) => void;
  position: { x: number; y: number };
}) => {
  const actions = [
    { id: 'generate', label: 'Generate ideas', icon: Lightbulb, color: 'text-yellow-500' },
    { id: 'rewrite', label: 'Rewrite', icon: PenLine, color: 'text-blue-500' },
    { id: 'translate', label: 'Translate', icon: Languages, color: 'text-green-500' },
    { id: 'spelling', label: 'Fix grammar & spelling', icon: SpellCheck, color: 'text-purple-500' },
    { id: 'summarize', label: 'Summarize', icon: FileText, color: 'text-orange-500' },
    { id: 'mindmap', label: 'Create mind map', icon: GitBranch, color: 'text-indigo-500' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -10 }}
      className="fixed bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-[9999] w-56"
      style={{ left: position.x, top: position.y }}
    >
      <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-purple-500" />
        <span className="text-sm font-semibold text-gray-700">AI Actions</span>
      </div>
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={() => onAction(action.id)}
          className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-3 transition-colors"
        >
          <action.icon className={`w-4 h-4 ${action.color}`} />
          <span className="text-gray-700">{action.label}</span>
        </button>
      ))}
    </motion.div>
  );
};

// Meeting View
const MeetingView = ({ board, onUpdateBoard, onBack }: { board: Board; onUpdateBoard: (updates: Partial<Board>) => void; onBack: () => void }) => {
  const [currentUser] = useState({ id: '1', name: 'Scott Jones', color: '#10b981' });
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingStartTime, setRecordingStartTime] = useState<Date | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [savedTranscripts, setSavedTranscripts] = useState<SavedTranscript[]>(board.transcripts || []);
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [showMediaModal, setShowMediaModal] = useState<'youtube' | 'image' | 'qr' | null>(null);
  const [currentSpeaker, setCurrentSpeaker] = useState('1');
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [isTranscriptMinimized, setIsTranscriptMinimized] = useState(false);
  const [isActionsMinimized, setIsActionsMinimized] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [activePicker, setActivePicker] = useState<string | null>(null);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [isPanMode, setIsPanMode] = useState(false);
  const [drawingColor, setDrawingColor] = useState('#3b82f6');
  const [drawingWidth, setDrawingWidth] = useState(3);
  const [showDrawingPanel, setShowDrawingPanel] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [showAIMenu, setShowAIMenu] = useState(false);
  const [aiMenuPosition, setAiMenuPosition] = useState({ x: 0, y: 0 });
  const [saved, setSaved] = useState(false);
  const [history, setHistory] = useState<{ nodes: VisualNode[]; timestamp: Date; action: string }[]>([{ nodes: board.visualNodes, timestamp: new Date(), action: 'Initial' }]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [showTimer, setShowTimer] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const timerRef = useRef<NodeJS.Timeout>();
  
  // New feature states
  const [gridSnap, setGridSnap] = useState(false);
  const [showMinimap, setShowMinimap] = useState(true);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [presentationFrameIndex, setPresentationFrameIndex] = useState(0);
  const [otherUsers, _setOtherUsers] = useState<UserPresence[]>([]); // TODO: connect to Supabase Realtime
  
  // Get frames for presentation
  const frames = board.visualNodes.filter(n => n.type === 'frame');
  
  // Export handler
  const handleExport = useCallback(async (format: 'png' | 'svg' | 'pdf' | 'json') => {
    if (format === 'json') {
      const data = JSON.stringify({ board, exportedAt: new Date().toISOString() }, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${board.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
    
    // For PNG/SVG/PDF, we'd need html2canvas or similar
    // For now, show a placeholder message
    alert(`${format.toUpperCase()} export requires html2canvas library. JSON export works!`);
  }, [board]);
  
  // Version history restore
  const handleRestoreVersion = useCallback((index: number) => {
    setHistoryIndex(index);
    onUpdateBoard({ visualNodes: history[index].nodes });
    setShowVersionHistory(false);
  }, [history, onUpdateBoard]);

  // Search functionality
  const searchResults = searchQuery.trim() ? board.visualNodes.filter(n => n.content.toLowerCase().includes(searchQuery.toLowerCase())) : [];

  const addToHistory = useCallback((nodes: VisualNode[], action: string) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push({ nodes: JSON.parse(JSON.stringify(nodes)), timestamp: new Date(), action });
      return newHistory.slice(-50); // Keep last 50 actions
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      onUpdateBoard({ visualNodes: history[newIndex].nodes });
    }
  }, [historyIndex, history, onUpdateBoard]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      onUpdateBoard({ visualNodes: history[newIndex].nodes });
    }
  }, [historyIndex, history, onUpdateBoard]);

  const handleUpdateBoardWithHistory = useCallback((updates: Partial<Board>, action: string = 'Update') => {
    if (updates.visualNodes) {
      addToHistory(updates.visualNodes, action);
    }
    onUpdateBoard(updates);
  }, [onUpdateBoard, addToHistory]);

  useEffect(() => {
    if (isRecording) timerRef.current = setInterval(() => setRecordingDuration(d => d + 1), 1000);
    else if (timerRef.current) clearInterval(timerRef.current);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRecording]);

  // Tool keyboard shortcuts (V for select, H for pan)
  useEffect(() => {
    const isTypingElement = (element: Element | null): boolean => {
      if (!element) return false;
      const tagName = element.tagName.toLowerCase();
      if (tagName === 'input' || tagName === 'textarea') return true;
      if (element.getAttribute('contenteditable') === 'true') return true;
      return false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTypingElement(document.activeElement)) return;
      
      // V for select tool
      if (e.code === 'KeyV' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setIsPanMode(false);
        setIsDrawingMode(false);
        setShowDrawingPanel(false);
      }
      // H for pan/hand tool
      if (e.code === 'KeyH' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setIsPanMode(true);
        setIsDrawingMode(false);
        setShowDrawingPanel(false);
      }
      // B or P for pen/draw tool
      if ((e.code === 'KeyB' || e.code === 'KeyP') && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setIsDrawingMode(true);
        setIsPanMode(false);
        setShowDrawingPanel(true);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleToggleRecording = useCallback(() => {
    if (!isRecording) {
      setIsRecording(true);
      setRecordingDuration(0);
      setRecordingStartTime(new Date());
      setTranscript([]);
    } else {
      setIsRecording(false);
      if (transcript.length > 0 && recordingStartTime) {
        const savedTranscript: SavedTranscript = { id: generateId(), entries: transcript, startedAt: recordingStartTime, endedAt: new Date(), duration: recordingDuration };
        const newSavedTranscripts = [...savedTranscripts, savedTranscript];
        setSavedTranscripts(newSavedTranscripts);
        localStorage.setItem(`board-transcripts-${board.id}`, JSON.stringify(newSavedTranscripts));
        onUpdateBoard({ transcripts: newSavedTranscripts });
      }
    }
  }, [isRecording, transcript, recordingStartTime, recordingDuration, savedTranscripts, board.id, onUpdateBoard]);

  const handleAddTranscript = useCallback((text: string) => {
    if (!text.trim()) return;
    const entry = { id: generateId(), speaker: currentSpeaker, text: text.trim(), timestamp: recordingDuration };
    setTranscript(prev => [...prev, entry]);

    const lower = text.toLowerCase();
    let itemType: ParsedItem['type'] = 'idea';
    let confidence = 0.5;

    if (lower.includes('should') || lower.includes('need to') || lower.includes('action') || lower.includes('will') || lower.includes('let\'s') || lower.includes('must')) { itemType = 'action'; confidence = 0.8; }
    else if (lower.includes('?') || lower.includes('how do') || lower.includes('what if') || lower.includes('why')) { itemType = 'question'; confidence = 0.9; }
    else if (lower.includes('risk') || lower.includes('concern') || lower.includes('worry') || lower.includes('problem')) { itemType = 'risk'; confidence = 0.85; }
    else if (lower.includes('decided') || lower.includes('agreed') || lower.includes('we will') || lower.includes('the plan is')) { itemType = 'decision'; confidence = 0.85; }
    else if (lower.includes('idea') || lower.includes('could') || lower.includes('maybe') || lower.includes('suggest')) { itemType = 'idea'; confidence = 0.7; }

    if (confidence >= 0.7 && text.trim().length > 10) {
      setParsedItems(prev => [...prev, { id: generateId(), type: itemType, content: text.trim(), confidence, timestamp: recordingDuration }]);
    }
  }, [currentSpeaker, recordingDuration]);

  const handleAddParsedItemToBoard = useCallback((item: ParsedItem) => {
    const typeColors: Record<ParsedItem['type'], { bg: string; nodeType: VisualNode['type'] }> = {
      idea: { bg: '#fef3c7', nodeType: 'opportunity' },
      action: { bg: '#d1fae5', nodeType: 'action' },
      question: { bg: '#dbeafe', nodeType: 'sticky' },
      decision: { bg: '#dcfce7', nodeType: 'sticky' },
      risk: { bg: '#fce7f3', nodeType: 'risk' },
    };
    const config = typeColors[item.type];
    const newNode: VisualNode = { id: generateId(), type: config.nodeType, x: 200 + Math.random() * 300, y: 100 + Math.random() * 200, width: 200, height: 150, content: item.content, color: config.bg, rotation: Math.random() * 6 - 3, locked: false, votes: 0, votedBy: [], createdBy: currentUser.id, comments: [], meetingTimestamp: item.timestamp };
    handleUpdateBoardWithHistory({ visualNodes: [...board.visualNodes, newNode] }, 'Add parsed item');
    setParsedItems(prev => prev.filter(p => p.id !== item.id));
  }, [currentUser.id, board, handleUpdateBoardWithHistory]);

  const handleAddAllParsedItems = useCallback(() => { parsedItems.forEach(item => handleAddParsedItemToBoard(item)); }, [parsedItems, handleAddParsedItemToBoard]);

  // AI Handlers
  const getSelectedNodesContent = useCallback(() => {
    return board.visualNodes.filter(n => selectedNodeIds.includes(n.id));
  }, [board.visualNodes, selectedNodeIds]);

  const simulateAIResponse = useCallback((prompt: string, selectedContent: string): { content: string; nodes?: { content: string; color: string }[] } => {
    // Simulate AI responses based on the prompt and context
    const lowerPrompt = prompt.toLowerCase();

    if (lowerPrompt.includes('generate') || lowerPrompt.includes('ideas') || lowerPrompt.includes('brainstorm')) {
      const baseIdeas = selectedContent ? [
        `Expand ${selectedContent.substring(0, 30)}... with digital marketing`,
        `Partner with influencers for ${selectedContent.substring(0, 20)}...`,
        `Create workshop series about ${selectedContent.substring(0, 20)}...`,
        `Develop online course for ${selectedContent.substring(0, 20)}...`,
        `Host community events around ${selectedContent.substring(0, 20)}...`,
      ] : [
        'Research target audience demographics',
        'Create content marketing strategy',
        'Develop partnership opportunities',
        'Build community engagement plan',
        'Design feedback collection system',
      ];
      return {
        content: `I've generated ${baseIdeas.length} ideas based on your input. Review them below:`,
        nodes: baseIdeas.map(idea => ({ content: idea, color: '#dbeafe' }))
      };
    }

    if (lowerPrompt.includes('mind map') || lowerPrompt.includes('mindmap')) {
      const topic = selectedContent || 'Main Topic';
      return {
        content: `I'll create a mind map starting from "${topic.substring(0, 30)}...". Here are the branches:`,
        nodes: [
          { content: `Strategy for ${topic.substring(0, 15)}...`, color: '#d1fae5' },
          { content: `Resources needed`, color: '#fef3c7' },
          { content: `Timeline & milestones`, color: '#fce7f3' },
          { content: `Key stakeholders`, color: '#dbeafe' },
          { content: `Success metrics`, color: '#f3e8ff' },
        ]
      };
    }

    if (lowerPrompt.includes('rewrite') || lowerPrompt.includes('improve')) {
      return {
        content: selectedContent
          ? `Here's a refined version: "${selectedContent.charAt(0).toUpperCase() + selectedContent.slice(1).toLowerCase()} - enhanced for clarity and impact."`
          : 'Please select some content first, then I can help rewrite it.',
        nodes: selectedContent ? [{ content: `${selectedContent} (improved version with better clarity)`, color: '#d1fae5' }] : undefined
      };
    }

    if (lowerPrompt.includes('translate')) {
      return {
        content: selectedContent
          ? 'Here\'s the translation (Spanish): ' + selectedContent.split(' ').map(w => w + 'o').join(' ')
          : 'Please select text to translate.',
      };
    }

    if (lowerPrompt.includes('summarize')) {
      return {
        content: selectedContent
          ? `Summary: ${selectedContent.substring(0, 50)}... (Key points extracted and condensed)`
          : 'Please select content to summarize.',
      };
    }

    return {
      content: `I understand you want to "${prompt}". ${selectedContent ? `Based on the selected content "${selectedContent.substring(0, 30)}...", ` : ''}I can help with generating ideas, creating mind maps, rewriting, translating, or summarizing. What would you like me to do?`
    };
  }, []);

  const handleAISendMessage = useCallback((message: string) => {
    const selectedNodes = getSelectedNodesContent();
    const selectedContent = selectedNodes.map(n => n.content).join(' ').trim();

    // Add user message
    const userMsg: AIMessage = {
      id: generateId(),
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    setAiMessages(prev => [...prev, userMsg]);
    setAiLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const response = simulateAIResponse(message, selectedContent);
      const aiMsg: AIMessage = {
        id: generateId(),
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        generatedNodes: response.nodes
      };
      setAiMessages(prev => [...prev, aiMsg]);
      setAiLoading(false);
    }, 1500);
  }, [getSelectedNodesContent, simulateAIResponse]);

  const handleAIAcceptSuggestions = useCallback((nodes: { content: string; color: string }[]) => {
    const selectedNodes = getSelectedNodesContent();
    const baseX = selectedNodes.length > 0 ? Math.max(...selectedNodes.map(n => n.x)) + 250 : 400;
    const baseY = selectedNodes.length > 0 ? selectedNodes[0].y : 200;

    const newNodes: VisualNode[] = nodes.map((node, index) => ({
      id: generateId(),
      type: 'sticky' as const,
      x: baseX,
      y: baseY + (index * 170),
      width: 200,
      height: 150,
      content: node.content,
      color: node.color,
      rotation: Math.random() * 4 - 2,
      locked: false,
      votes: 0,
      votedBy: [],
      createdBy: currentUser.id,
      comments: [],
      // Connect to parent if mind map
      parentNodeId: selectedNodes.length === 1 ? selectedNodes[0].id : undefined
    }));

    handleUpdateBoardWithHistory({ visualNodes: [...board.visualNodes, ...newNodes] }, 'AI generated nodes');

    // Add confirmation message
    const confirmMsg: AIMessage = {
      id: generateId(),
      role: 'assistant',
      content: `Added ${nodes.length} items to the board.`,
      timestamp: new Date()
    };
    setAiMessages(prev => [...prev, confirmMsg]);
  }, [getSelectedNodesContent, currentUser.id, board.visualNodes, handleUpdateBoardWithHistory]);

  const handleAIRetrySuggestions = useCallback(() => {
    const lastUserMessage = [...aiMessages].reverse().find(m => m.role === 'user');
    if (lastUserMessage) {
      handleAISendMessage(lastUserMessage.content + ' (try different approach)');
    }
  }, [aiMessages, handleAISendMessage]);

  const handleAISparkle = useCallback((position: { x: number; y: number }) => {
    setAiMenuPosition(position);
    setShowAIMenu(true);
  }, []);

  const handleAIAction = useCallback((action: string) => {
    setShowAIMenu(false);
    setShowAIPanel(true);

    const actionMessages: Record<string, string> = {
      'generate': 'Generate 5 new ideas based on the selected content',
      'rewrite': 'Rewrite and improve the selected content',
      'translate': 'Translate the selected content to Spanish',
      'spelling': 'Fix grammar and spelling in the selected content',
      'summarize': 'Summarize the selected content',
      'mindmap': 'Create a mind map from the selected content'
    };

    handleAISendMessage(actionMessages[action] || action);
  }, [handleAISendMessage]);

  const handleEmbedMedia = useCallback((url: string, mediaType: 'youtube' | 'image') => {
    const newNode: VisualNode = { id: generateId(), type: mediaType, x: 300 + Math.random() * 200, y: 200 + Math.random() * 200, width: mediaType === 'youtube' ? 400 : 300, height: mediaType === 'youtube' ? 225 : 300, content: '', color: '#ffffff', rotation: 0, locked: false, votes: 0, votedBy: [], createdBy: currentUser.id, comments: [], mediaUrl: url };
    handleUpdateBoardWithHistory({ visualNodes: [...board.visualNodes, newNode] }, `Add ${mediaType}`);
  }, [currentUser.id, board, handleUpdateBoardWithHistory]);

  const handleCreateBucket = useCallback((bucketId: string) => {
    const newNode: VisualNode = { id: generateId(), type: 'bucket', x: 300 + Math.random() * 200, y: 200 + Math.random() * 200, width: 300, height: 300, content: 'Photo Bucket', color: '#f0f9ff', rotation: 0, locked: false, votes: 0, votedBy: [], createdBy: currentUser.id, comments: [], bucketId, bucketImages: [] };
    handleUpdateBoardWithHistory({ visualNodes: [...board.visualNodes, newNode], uploadBucketId: bucketId }, 'Add photo bucket');
  }, [currentUser.id, board, handleUpdateBoardWithHistory]);

  const handleAddMindmapChild = useCallback((parentNodeId: string) => {
    const parentNode = board.visualNodes.find(n => n.id === parentNodeId);
    if (!parentNode) return;

    // Count existing children to position the new one
    const existingChildren = board.visualNodes.filter(n => n.parentNodeId === parentNodeId);
    const childCount = existingChildren.length;

    // Calculate position based on parent and child count (spread children out)
    const angle = (childCount * 45 - 90) * (Math.PI / 180); // Start from top, spread at 45 degree intervals
    const distance = 200;
    const newX = parentNode.x + parentNode.width / 2 + Math.cos(angle) * distance - 70;
    const newY = parentNode.y + parentNode.height / 2 + Math.sin(angle) * distance - 25;

    const childNode: VisualNode = {
      id: generateId(),
      type: 'mindmap',
      x: newX,
      y: newY,
      width: 140,
      height: 50,
      content: 'New idea',
      color: parentNode.color || '#8b5cf6',
      rotation: 0,
      locked: false,
      votes: 0,
      votedBy: [],
      createdBy: currentUser.id,
      comments: [],
      parentNodeId,
      mindmapId: parentNode.mindmapId || parentNode.id
    };

    handleUpdateBoardWithHistory({ visualNodes: [...board.visualNodes, childNode] }, 'Add mind map child');
  }, [board.visualNodes, currentUser.id, handleUpdateBoardWithHistory]);

  const handleAddNode = (type: string, options?: { color?: string; shape?: 'square' | 'rectangle' | 'circle'; x?: number; y?: number }) => {
    // Calculate center of visible viewport
    const viewportCenterX = (-board.panX + window.innerWidth / 2) / (board.zoom || 1);
    const viewportCenterY = (-board.panY + window.innerHeight / 2) / (board.zoom || 1);
    const defaultX = viewportCenterX - 100 + Math.random() * 50;
    const defaultY = viewportCenterY - 100 + Math.random() * 50;
    const { color = NODE_COLORS[Math.floor(Math.random() * NODE_COLORS.length)], shape = 'square', x = defaultX, y = defaultY } = options || {};
    const isRectangle = shape === 'rectangle';
    const newNode: VisualNode = {
      id: generateId(),
      type: type as VisualNode['type'],
      x,
      y,
      width: isRectangle ? 280 : 200,
      height: isRectangle ? 140 : 200,
      content: '',
      color,
      rotation: 0,
      locked: false,
      votes: 0,
      votedBy: [],
      createdBy: currentUser.id,
      comments: []
    };
    handleUpdateBoardWithHistory({ visualNodes: [...board.visualNodes, newNode] }, `Add ${type}`);
    setActivePicker(null);
  };

  const handleSelectTemplate = (template: typeof BOARD_TEMPLATES[0]) => {
    const templateNodes: VisualNode[] = template.nodes.map((node) => ({ id: generateId(), type: node.type as VisualNode['type'], x: node.x, y: node.y, width: node.width, height: node.height, content: node.content, color: node.color, rotation: 0, locked: false, votes: 0, votedBy: [], createdBy: currentUser.id, comments: [] }));
    handleUpdateBoardWithHistory({ visualNodes: [...board.visualNodes, ...templateNodes] }, `Apply ${template.name}`);
  };

  const handleSave = () => { localStorage.setItem(`board-${board.id}`, JSON.stringify(board)); setSaved(true); setTimeout(() => setSaved(false), 2000); };

  const handleAddAction = useCallback((content: string) => { setActionItems(prev => [...prev, { id: generateId(), content, priority: 'medium', isComplete: false, timestamp: recordingDuration }]); }, [recordingDuration]);
  const handleToggleActionComplete = useCallback((id: string) => { setActionItems(prev => prev.map(a => a.id === id ? { ...a, isComplete: !a.isComplete } : a)); }, []);
  const handleAssignUser = useCallback((id: string, assigneeId: string | undefined) => { setActionItems(prev => prev.map(a => a.id === id ? { ...a, assigneeId } : a)); }, []);

  return (
    <div className="flex-1 flex flex-col bg-gray-100 overflow-hidden">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <motion.button whileHover={{ scale: 1.05 }} onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronLeft className="w-5 h-5 text-gray-600" /></motion.button>
          <div><h1 className="font-bold text-gray-900">{board.name}</h1><span className="text-sm text-gray-500">Whiteboard</span></div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-3 px-4 py-2 rounded-full ${isRecording ? 'bg-red-500' : 'bg-gray-200'}`}>
            <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: isRecording ? 1 : 0, repeat: isRecording ? Infinity : 0 }} className={`w-3 h-3 rounded-full ${isRecording ? 'bg-white' : 'bg-gray-400'}`} />
            {isRecording && <span className="text-white font-mono font-medium">{Math.floor(recordingDuration / 60).toString().padStart(2, '0')}:{(recordingDuration % 60).toString().padStart(2, '0')}</span>}
          </div>
          <div className="flex -space-x-2">{PARTICIPANTS.slice(0, 4).map(p => <div key={p.id} className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-medium shadow-sm" style={{ backgroundColor: p.color }}>{p.name.charAt(0)}</div>)}</div>
          <div className="w-px h-8 bg-gray-200" />
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            <motion.button whileHover={{ scale: 1.05 }} onClick={handleUndo} disabled={historyIndex <= 0} className={`p-2 rounded-lg ${historyIndex <= 0 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white'}`} title="Undo"><Undo2 className="w-4 h-4 text-gray-600" /></motion.button>
            <motion.button whileHover={{ scale: 1.05 }} onClick={handleRedo} disabled={historyIndex >= history.length - 1} className={`p-2 rounded-lg ${historyIndex >= history.length - 1 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white'}`} title="Redo"><Redo2 className="w-4 h-4 text-gray-600" /></motion.button>
            <motion.button whileHover={{ scale: 1.05 }} onClick={() => setShowHistoryPanel(!showHistoryPanel)} className={`p-2 rounded-lg ${showHistoryPanel ? 'bg-white' : 'hover:bg-white'}`} title="History"><History className="w-4 h-4 text-gray-600" /></motion.button>
          </div>
          <motion.button whileHover={{ scale: 1.05 }} onClick={() => setShowSearch(!showSearch)} className={`p-2 rounded-xl ${showSearch ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`} title="Search board"><Search className="w-4 h-4" /></motion.button>
          <motion.button whileHover={{ scale: 1.05 }} onClick={() => setShowTimer(!showTimer)} className={`p-2 rounded-xl ${showTimer ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`} title="Timer"><Timer className="w-4 h-4" /></motion.button>
          <motion.button whileHover={{ scale: 1.05 }} onClick={() => setShowTemplateModal(true)} className="px-3 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-gray-200"><Layout className="w-4 h-4" />Templates</motion.button>
          <motion.button whileHover={{ scale: 1.05 }} onClick={handleSave} className={`px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-2 ${saved ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}{saved ? 'Saved!' : 'Save'}</motion.button>
          <motion.button whileHover={{ scale: 1.05 }} onClick={() => setShowAIPanel(!showAIPanel)} className={`px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-2 ${showAIPanel ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}><Brain className="w-4 h-4" />AI Assistant</motion.button>
          <motion.button whileHover={{ scale: 1.05 }} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium flex items-center gap-2 shadow-lg shadow-indigo-200"><Share2 className="w-4 h-4" />Share</motion.button>
        </div>
      </header>

      <div className="flex-1 flex relative" onClick={() => activePicker && setActivePicker(null)}>
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="absolute left-4 top-4 flex flex-col gap-2 z-30 max-h-[calc(100vh-180px)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent pr-1" onClick={(e) => e.stopPropagation()}>
          <div className="bg-white rounded-2xl shadow-lg p-2 flex flex-col gap-1 border border-gray-200 relative">
            <p className="text-[10px] font-semibold text-gray-400 uppercase px-2 py-1">Notes</p>
            {[{ id: 'sticky', icon: FileText, label: 'Sticky Note', hasPicker: true }, { id: 'frame', icon: Layout, label: 'Frame' }, { id: 'opportunity', icon: Lightbulb, label: 'Opportunity', hasPicker: true }, { id: 'risk', icon: AlertCircle, label: 'Risk', hasPicker: true }, { id: 'action', icon: CheckSquare, label: 'Action', hasPicker: true }].map(tool => (
              <div key={tool.id} className="relative">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  onClick={() => tool.hasPicker ? setActivePicker(activePicker === tool.id ? null : tool.id) : handleAddNode(tool.id)}
                  className={`p-3 hover:bg-gray-100 rounded-xl group relative w-full ${activePicker === tool.id ? 'bg-indigo-50 ring-2 ring-indigo-500' : ''}`}
                  title={tool.label}
                >
                  <tool.icon className="w-5 h-5 text-gray-700" />
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">{tool.label}</div>
                </motion.button>
                <AnimatePresence>
                  {activePicker === tool.id && (
                    <motion.div
                      initial={{ opacity: 0, x: -10, scale: 0.95 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -10, scale: 0.95 }}
                      className="absolute left-full ml-2 top-0 bg-white rounded-xl shadow-2xl border border-gray-200 p-3 z-50 w-64"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-gray-800">{tool.label}</span>
                        <button onClick={() => setActivePicker(null)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-400" /></button>
                      </div>
                      <p className="text-xs text-gray-500 mb-3">Choose shape and color</p>
                      <div className="flex gap-2 mb-3">
                        {[
                          { shape: 'square' as const, icon: '⬜', label: 'Square' },
                          { shape: 'rectangle' as const, icon: '▭', label: 'Rectangle' },
                          { shape: 'circle' as const, icon: '⚪', label: 'Circle' }
                        ].map(s => (
                          <button
                            key={s.shape}
                            onClick={() => handleAddNode(tool.id, { shape: s.shape })}
                            className="flex-1 p-2 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-indigo-300 transition-colors text-center"
                            title={s.label}
                          >
                            <span className="text-lg">{s.icon}</span>
                            <p className="text-[10px] text-gray-500 mt-1">{s.label}</p>
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-5 gap-1.5">
                        {['#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b',
                          '#d1fae5', '#a7f3d0', '#6ee7b7', '#34d399', '#10b981',
                          '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6',
                          '#fce7f3', '#fbcfe8', '#f9a8d4', '#f472b6', '#ec4899',
                          '#f3e8ff', '#e9d5ff', '#d8b4fe', '#c084fc', '#a855f7',
                          '#ffffff', '#f3f4f6', '#e5e7eb', '#d1d5db', '#9ca3af'
                        ].map(color => (
                          <button
                            key={color}
                            onClick={() => handleAddNode(tool.id, { color })}
                            className="w-9 h-9 rounded-lg border-2 border-gray-200 hover:border-indigo-500 hover:scale-110 transition-all"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-2 flex flex-col gap-1 border border-gray-200">
            <p className="text-[10px] font-semibold text-gray-400 uppercase px-2 py-1">Shapes</p>
            {[{ id: 'shape-rect', icon: Square, label: 'Rectangle', shapeType: 'rectangle' }, { id: 'shape-circle', icon: Circle, label: 'Circle', shapeType: 'circle' }, { id: 'shape-triangle', icon: Triangle, label: 'Triangle', shapeType: 'triangle' }].map(tool => (
              <motion.button key={tool.id} whileHover={{ scale: 1.1 }} onClick={() => { const node: VisualNode = { id: generateId(), type: 'shape', shapeType: tool.shapeType as any, x: 300 + Math.random() * 100, y: 300 + Math.random() * 100, width: 150, height: 150, content: '', color: '#dbeafe', rotation: 0, locked: false, votes: 0, votedBy: [], createdBy: currentUser.id, comments: [] }; handleUpdateBoardWithHistory({ visualNodes: [...board.visualNodes, node] }, `Add ${tool.label}`); }} className="p-3 hover:bg-gray-100 rounded-xl group relative" title={tool.label}>
                <tool.icon className="w-5 h-5 text-gray-700" />
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">{tool.label}</div>
              </motion.button>
            ))}
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-2 flex flex-col gap-1 border border-gray-200">
            <p className="text-[10px] font-semibold text-gray-400 uppercase px-2 py-1">Text & Lines</p>
            <motion.button whileHover={{ scale: 1.1 }} onClick={() => { const node: VisualNode = { id: generateId(), type: 'text', textStyle: 'heading', x: 300 + Math.random() * 100, y: 300 + Math.random() * 100, width: 300, height: 60, content: 'Heading', color: 'transparent', rotation: 0, locked: false, votes: 0, votedBy: [], createdBy: currentUser.id, comments: [], fontSize: 24 }; handleUpdateBoardWithHistory({ visualNodes: [...board.visualNodes, node] }, 'Add text'); }} className="p-3 hover:bg-gray-100 rounded-xl group relative"><Type className="w-5 h-5 text-gray-700" /><div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">Text / Heading</div></motion.button>
            <motion.button whileHover={{ scale: 1.1 }} onClick={() => { const node: VisualNode = { id: generateId(), type: 'connector', x: 300 + Math.random() * 100, y: 300 + Math.random() * 100, width: 200, height: 4, content: '', color: '#6b7280', rotation: 0, locked: false, votes: 0, votedBy: [], createdBy: currentUser.id, comments: [], connectorStyle: 'solid' }; handleUpdateBoardWithHistory({ visualNodes: [...board.visualNodes, node] }, 'Add connector'); }} className="p-3 hover:bg-gray-100 rounded-xl group relative"><Minus className="w-5 h-5 text-gray-700" /><div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">Connector Line</div></motion.button>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-2 flex flex-col gap-1 border border-gray-200">
            <p className="text-[10px] font-semibold text-gray-400 uppercase px-2 py-1">Media</p>
            <motion.button whileHover={{ scale: 1.1 }} onClick={() => setShowMediaModal('youtube')} className="p-3 hover:bg-gray-100 rounded-xl group relative"><Youtube className="w-5 h-5 text-red-500" /><div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">YouTube Video</div></motion.button>
            <motion.button whileHover={{ scale: 1.1 }} onClick={() => setShowMediaModal('image')} className="p-3 hover:bg-gray-100 rounded-xl group relative"><Image className="w-5 h-5 text-indigo-500" /><div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">Embed Image</div></motion.button>
            <motion.button whileHover={{ scale: 1.1 }} onClick={() => setShowMediaModal('qr')} className="p-3 hover:bg-gray-100 rounded-xl group relative"><QrCode className="w-5 h-5 text-green-500" /><div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">QR Photo Upload</div></motion.button>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-2 flex flex-col gap-1 border border-gray-200">
            <p className="text-[10px] font-semibold text-gray-400 uppercase px-2 py-1">Tools</p>
            <motion.button
              whileHover={{ scale: 1.1 }}
              onClick={() => { setIsPanMode(false); setIsDrawingMode(false); setShowDrawingPanel(false); }}
              className={`p-3 rounded-xl group relative ${!isPanMode && !isDrawingMode ? 'bg-indigo-100 ring-2 ring-indigo-500' : 'hover:bg-gray-100'}`}
              title="Select (V)"
            >
              <svg className={`w-5 h-5 ${!isPanMode && !isDrawingMode ? 'text-indigo-600' : 'text-gray-700'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
                <path d="M13 13l6 6" />
              </svg>
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">Select (V)</div>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              onClick={() => { setIsPanMode(!isPanMode); setIsDrawingMode(false); setShowDrawingPanel(false); }}
              className={`p-3 rounded-xl group relative ${isPanMode ? 'bg-gray-200 ring-2 ring-gray-500' : 'hover:bg-gray-100'}`}
              title="Pan (H)"
            >
              <Move className={`w-5 h-5 ${isPanMode ? 'text-gray-700' : 'text-gray-700'}`} />
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">Pan / Hand (H)</div>
            </motion.button>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-2 flex flex-col gap-1 border border-gray-200 relative">
            <p className="text-[10px] font-semibold text-gray-400 uppercase px-2 py-1">Draw</p>
            <motion.button
              whileHover={{ scale: 1.1 }}
              onClick={() => { setIsDrawingMode(!isDrawingMode); setIsPanMode(false); setShowDrawingPanel(!isDrawingMode); }}
              className={`p-3 rounded-xl group relative ${isDrawingMode ? 'bg-blue-100 ring-2 ring-blue-500' : 'hover:bg-gray-100'}`}
              title="Draw"
            >
              <Pencil className={`w-5 h-5 ${isDrawingMode ? 'text-blue-600' : 'text-gray-700'}`} />
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">Draw</div>
            </motion.button>
            <AnimatePresence>
              {showDrawingPanel && (
                <motion.div
                  initial={{ opacity: 0, x: -10, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -10, scale: 0.95 }}
                  className="absolute left-full ml-2 top-0 bg-white rounded-xl shadow-2xl border border-gray-200 p-3 z-50 w-56"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-gray-800">Drawing Options</span>
                    <button onClick={() => setShowDrawingPanel(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-400" /></button>
                  </div>
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-2">Stroke Color</p>
                    <div className="grid grid-cols-6 gap-1.5">
                      {['#000000', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
                        '#6b7280', '#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa'].map(color => (
                        <button
                          key={color}
                          onClick={() => setDrawingColor(color)}
                          className={`w-7 h-7 rounded-lg border-2 ${drawingColor === color ? 'border-gray-800 ring-2 ring-offset-1 ring-gray-400' : 'border-gray-200'} hover:scale-110 transition-all`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-2">Stroke Width</p>
                    <div className="flex gap-2">
                      {[2, 4, 6, 8].map(width => (
                        <button
                          key={width}
                          onClick={() => setDrawingWidth(width)}
                          className={`flex-1 p-2 rounded-lg border ${drawingWidth === width ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
                        >
                          <div className="flex justify-center items-center h-4">
                            <div className="rounded-full bg-gray-800" style={{ width: '100%', height: width }} />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => { setIsDrawingMode(false); setShowDrawingPanel(false); }}
                    className="w-full py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700"
                  >
                    Done Drawing
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-2 flex flex-col gap-1 border border-gray-200">
            <p className="text-[10px] font-semibold text-gray-400 uppercase px-2 py-1">Mind Map</p>
            <motion.button
              whileHover={{ scale: 1.1 }}
              onClick={() => {
                const mindmapId = generateId();
                const rootNode: VisualNode = {
                  id: generateId(),
                  type: 'mindmap',
                  x: 400,
                  y: 300,
                  width: 160,
                  height: 60,
                  content: 'Central Topic',
                  color: '#8b5cf6',
                  rotation: 0,
                  locked: false,
                  votes: 0,
                  votedBy: [],
                  createdBy: currentUser.id,
                  comments: [],
                  isRootNode: true,
                  mindmapId
                };
                handleUpdateBoardWithHistory({ visualNodes: [...board.visualNodes, rootNode] }, 'Add mind map');
              }}
              className="p-3 hover:bg-gray-100 rounded-xl group relative"
              title="Mind Map"
            >
              <GitBranch className="w-5 h-5 text-purple-600" />
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">Create Mind Map</div>
            </motion.button>
          </div>
          
          {/* Comment/Annotation Tool */}
          <div className="bg-white rounded-2xl shadow-lg p-2 flex flex-col gap-1 border border-gray-200">
            <p className="text-[10px] font-semibold text-gray-400 uppercase px-2 py-1">Annotate</p>
            <motion.button
              whileHover={{ scale: 1.1 }}
              onClick={() => {
                const node: VisualNode = {
                  id: generateId(),
                  type: 'comment',
                  x: 300 + Math.random() * 100,
                  y: 300 + Math.random() * 100,
                  width: 32,
                  height: 32,
                  content: 'Add your comment here...',
                  color: '#fbbf24',
                  rotation: 0,
                  locked: false,
                  votes: 0,
                  votedBy: [],
                  createdBy: currentUser.id,
                  comments: []
                };
                handleUpdateBoardWithHistory({ visualNodes: [...board.visualNodes, node] }, 'Add comment');
              }}
              className="p-3 hover:bg-gray-100 rounded-xl group relative"
              title="Comment"
            >
              <MessageCircle className="w-5 h-5 text-amber-500" />
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">Add Comment</div>
            </motion.button>
          </div>
          
          {/* View Options */}
          <div className="bg-white rounded-2xl shadow-lg p-2 flex flex-col gap-1 border border-gray-200">
            <p className="text-[10px] font-semibold text-gray-400 uppercase px-2 py-1">View</p>
            <motion.button
              whileHover={{ scale: 1.1 }}
              onClick={() => setGridSnap(!gridSnap)}
              className={`p-3 rounded-xl group relative ${gridSnap ? 'bg-green-100 ring-2 ring-green-500' : 'hover:bg-gray-100'}`}
              title="Grid Snap"
            >
              <Grid3X3 className={`w-5 h-5 ${gridSnap ? 'text-green-600' : 'text-gray-700'}`} />
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">Grid Snap {gridSnap ? 'ON' : 'OFF'}</div>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              onClick={() => setShowMinimap(!showMinimap)}
              className={`p-3 rounded-xl group relative ${showMinimap ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
              title="Minimap"
            >
              <Map className={`w-5 h-5 ${showMinimap ? 'text-blue-600' : 'text-gray-700'}`} />
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">Minimap {showMinimap ? 'ON' : 'OFF'}</div>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              onClick={() => setShowVersionHistory(!showVersionHistory)}
              className={`p-3 rounded-xl group relative ${showVersionHistory ? 'bg-indigo-100' : 'hover:bg-gray-100'}`}
              title="Version History"
            >
              <History className={`w-5 h-5 ${showVersionHistory ? 'text-indigo-600' : 'text-gray-700'}`} />
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">Version History</div>
            </motion.button>
          </div>
          
          {/* Actions */}
          <div className="bg-white rounded-2xl shadow-lg p-2 flex flex-col gap-1 border border-gray-200">
            <p className="text-[10px] font-semibold text-gray-400 uppercase px-2 py-1">Actions</p>
            <motion.button
              whileHover={{ scale: 1.1 }}
              onClick={() => setShowExportModal(true)}
              className="p-3 hover:bg-gray-100 rounded-xl group relative"
              title="Export"
            >
              <Download className="w-5 h-5 text-gray-700" />
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">Export Canvas</div>
            </motion.button>
            {frames.length > 0 && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                onClick={() => { setIsPresentationMode(true); setPresentationFrameIndex(0); }}
                className="p-3 hover:bg-gray-100 rounded-xl group relative"
                title="Present"
              >
                <Presentation className="w-5 h-5 text-gray-700" />
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">Present ({frames.length} frames)</div>
              </motion.button>
            )}
          </div>
        </motion.div>

        <ParsedItemsPanel items={parsedItems} onAddItem={handleAddParsedItemToBoard} onDismissItem={(id) => setParsedItems(prev => prev.filter(p => p.id !== id))} onAddAll={handleAddAllParsedItems} isVisible={!isTranscriptMinimized} />

        <TranscriptPanel transcript={transcript} isRecording={isRecording} onToggleRecording={handleToggleRecording} currentSpeaker={currentSpeaker} onSpeakerChange={setCurrentSpeaker} onAddNote={handleAddTranscript} isMinimized={isTranscriptMinimized} onToggleMinimize={() => setIsTranscriptMinimized(!isTranscriptMinimized)} savedTranscripts={savedTranscripts} />

        <ActionItemsPanel actionItems={actionItems} onToggleComplete={handleToggleActionComplete} onAddAction={handleAddAction} onAssignUser={handleAssignUser} isMinimized={isActionsMinimized} onToggleMinimize={() => setIsActionsMinimized(!isActionsMinimized)} />

        {/* Timer */}
        <AnimatePresence>
          {showTimer && <FacilitationTimer isOpen={showTimer} onClose={() => setShowTimer(false)} />}
        </AnimatePresence>

        {/* Search Panel */}
        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-20 left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 w-96"
            >
              <div className="p-3 border-b border-gray-200 flex items-center gap-2">
                <Search className="w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search board content..."
                  className="flex-1 bg-transparent border-none outline-none text-sm text-gray-900 placeholder-gray-500"
                  autoFocus
                />
                <button onClick={() => { setShowSearch(false); setSearchQuery(''); }} className="p-1 hover:bg-gray-100 rounded-lg">
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
              {searchQuery.trim() && (
                <div className="max-h-64 overflow-y-auto p-2">
                  {searchResults.length > 0 ? (
                    searchResults.map(node => (
                      <button
                        key={node.id}
                        onClick={() => {
                          setSelectedNodeIds([node.id]);
                          setShowSearch(false);
                          setSearchQuery('');
                        }}
                        className="w-full text-left p-2 hover:bg-gray-50 rounded-lg flex items-center gap-2"
                      >
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: node.color }} />
                        <span className="text-sm text-gray-700 truncate flex-1">{node.content || `${node.type} element`}</span>
                        <span className="text-xs text-gray-400 capitalize">{node.type}</span>
                      </button>
                    ))
                  ) : (
                    <div className="p-4 text-center text-gray-400 text-sm">No results found</div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showHistoryPanel && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="absolute right-4 top-20 w-72 bg-white rounded-2xl shadow-xl border border-gray-200 z-40 overflow-hidden"
            >
              <div className="p-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-gray-600" />
                  <span className="font-medium text-gray-800 text-sm">History</span>
                </div>
                <button onClick={() => setShowHistoryPanel(false)} className="p-1 hover:bg-gray-200 rounded-lg">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {history.map((entry, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setHistoryIndex(index);
                      onUpdateBoard({ visualNodes: entry.nodes });
                    }}
                    className={`w-full p-3 text-left hover:bg-gray-50 border-b border-gray-100 transition-colors ${index === historyIndex ? 'bg-indigo-50 border-l-2 border-l-indigo-500' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-sm ${index === historyIndex ? 'font-medium text-indigo-700' : 'text-gray-700'}`}>{entry.action}</span>
                      {index === historyIndex && <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">Current</span>}
                    </div>
                    <span className="text-xs text-gray-400">{entry.timestamp.toLocaleTimeString()}</span>
                  </button>
                ))}
                {history.length === 0 && (
                  <div className="p-4 text-center text-gray-400 text-sm">No history yet</div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <InfiniteCanvas
          board={board}
          onUpdateBoard={onUpdateBoard}
          onUpdateWithHistory={handleUpdateBoardWithHistory}
          selectedNodeIds={selectedNodeIds}
          onSelectNodes={(ids) => setSelectedNodeIds(ids)}
          onCanvasDoubleClick={(x, y) => handleAddNode('sticky', { x: x - 100, y: y - 100, color: '#fef3c7' })}
          isDrawingMode={isDrawingMode}
          isPanMode={isPanMode}
          drawingColor={drawingColor}
          drawingWidth={drawingWidth}
          onAddMindmapChild={handleAddMindmapChild}
          onAISparkle={handleAISparkle}
          gridSnap={gridSnap}
          showMinimap={showMinimap}
          otherUsers={otherUsers}
        />

        <AnimatePresence>
          {showAIPanel && (
            <AIChatPanel
              isOpen={showAIPanel}
              onClose={() => setShowAIPanel(false)}
              messages={aiMessages}
              onSendMessage={handleAISendMessage}
              onAcceptSuggestions={handleAIAcceptSuggestions}
              onRetrySuggestions={handleAIRetrySuggestions}
              selectedNodes={getSelectedNodesContent()}
              isLoading={aiLoading}
            />
          )}
          {showAIMenu && (
            <>
              <div className="fixed inset-0 z-[9998]" onClick={() => setShowAIMenu(false)} />
              <AISparkleMenu
                onAction={handleAIAction}
                position={aiMenuPosition}
              />
            </>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showTemplateModal && <TemplateModal isOpen={showTemplateModal} onClose={() => setShowTemplateModal(false)} onSelectTemplate={handleSelectTemplate} />}
        {showMediaModal === 'youtube' && <MediaModal type="youtube" onClose={() => setShowMediaModal(null)} onEmbed={handleEmbedMedia} />}
        {showMediaModal === 'image' && <MediaModal type="image" onClose={() => setShowMediaModal(null)} onEmbed={handleEmbedMedia} />}
        {showMediaModal === 'qr' && <QRCodeModal boardId={board.id} onClose={() => setShowMediaModal(null)} onCreateBucket={handleCreateBucket} />}
        {showExportModal && <ExportModal isOpen={showExportModal} onClose={() => setShowExportModal(false)} onExport={handleExport} />}
        {isPresentationMode && (
          <PresentationMode
            isOpen={isPresentationMode}
            frames={frames}
            currentFrameIndex={presentationFrameIndex}
            onClose={() => setIsPresentationMode(false)}
            onNext={() => setPresentationFrameIndex(i => Math.min(i + 1, frames.length - 1))}
            onPrev={() => setPresentationFrameIndex(i => Math.max(i - 1, 0))}
            onGoTo={setPresentationFrameIndex}
          />
        )}
      </AnimatePresence>
      
      {/* Version History Panel */}
      <AnimatePresence>
        {showVersionHistory && (
          <VersionHistoryPanel
            isOpen={showVersionHistory}
            history={history as HistoryEntry[]}
            currentIndex={historyIndex}
            onClose={() => setShowVersionHistory(false)}
            onRestore={handleRestoreVersion}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Notes View (Notion-style)
const NotesView = () => {
  const [notes, setNotes] = useState<{ id: string; title: string; content: string; icon: string; parentId: string | null; updatedAt: Date }[]>([
    { id: '1', title: 'Project Overview', content: 'This is a comprehensive overview of the project goals and objectives.', icon: '📋', parentId: null, updatedAt: new Date() },
    { id: '2', title: 'Meeting Notes', content: 'Notes from our latest team meeting discussing project milestones.', icon: '📝', parentId: null, updatedAt: new Date(Date.now() - 86400000) },
    { id: '3', title: 'Research Findings', content: 'Key insights from market research and competitor analysis.', icon: '🔍', parentId: null, updatedAt: new Date(Date.now() - 172800000) },
  ]);
  const [selectedNote, setSelectedNote] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');

  const selectedNoteData = notes.find(n => n.id === selectedNote);

  const handleCreateNote = () => {
    const newNote = {
      id: generateId(),
      title: 'Untitled',
      content: '',
      icon: '📄',
      parentId: null,
      updatedAt: new Date()
    };
    setNotes(prev => [newNote, ...prev]);
    setSelectedNote(newNote.id);
    setEditingContent('');
  };

  const handleUpdateNote = (id: string, updates: Partial<typeof notes[0]>) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates, updatedAt: new Date() } : n));
  };

  return (
    <div className="flex-1 flex bg-white">
      {/* Notes Sidebar */}
      <div className="w-72 border-r border-gray-200 flex flex-col bg-gray-50">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Notes</h2>
            <button onClick={handleCreateNote} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
              <Plus className="w-4 h-4 text-gray-600" />
            </button>
          </div>
          <div className="relative">
            <input type="text" placeholder="Search notes..." className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <FileText className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {notes.map(note => (
            <button
              key={note.id}
              onClick={() => { setSelectedNote(note.id); setEditingContent(note.content); }}
              className={`w-full text-left p-3 rounded-lg mb-1 transition-colors ${selectedNote === note.id ? 'bg-indigo-100 text-indigo-900' : 'hover:bg-gray-100'}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span>{note.icon}</span>
                <span className="font-medium text-sm truncate">{note.title}</span>
              </div>
              <p className="text-xs text-gray-500 truncate">{note.content || 'No content'}</p>
              <p className="text-[10px] text-gray-400 mt-1">{note.updatedAt.toLocaleDateString()}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Note Editor */}
      <div className="flex-1 flex flex-col">
        {selectedNoteData ? (
          <>
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <button className="text-3xl hover:bg-gray-100 p-2 rounded-lg">{selectedNoteData.icon}</button>
                <input
                  type="text"
                  value={selectedNoteData.title}
                  onChange={(e) => handleUpdateNote(selectedNoteData.id, { title: e.target.value })}
                  className="text-3xl font-bold text-gray-900 bg-transparent border-none focus:outline-none flex-1"
                  placeholder="Untitled"
                />
              </div>
            </div>
            <div className="flex-1 p-6 overflow-y-auto">
              <textarea
                value={editingContent}
                onChange={(e) => { setEditingContent(e.target.value); handleUpdateNote(selectedNoteData.id, { content: e.target.value }); }}
                className="w-full h-full text-gray-700 bg-transparent border-none resize-none focus:outline-none text-lg leading-relaxed"
                placeholder="Start writing..."
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">Select a note or create a new one</p>
              <button onClick={handleCreateNote} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                Create Note
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Clients View
const ClientsView = () => {
  const [clients, setClients] = useState<{ id: string; name: string; industry: string; logo: string; status: string; lastActivity: Date }[]>([
    { id: '1', name: 'Acme Corporation', industry: 'Technology', logo: 'A', status: 'active', lastActivity: new Date() },
    { id: '2', name: 'Global Industries', industry: 'Manufacturing', logo: 'G', status: 'active', lastActivity: new Date(Date.now() - 86400000) },
    { id: '3', name: 'StartUp Hub', industry: 'Consulting', logo: 'S', status: 'inactive', lastActivity: new Date(Date.now() - 604800000) },
  ]);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Client data is used for future detail view
  const _selectedClientData = clients.find(c => c.id === selectedClient);
  void _selectedClientData; // Suppress unused warning

  const handleAddClient = (name: string, industry: string) => {
    const newClient = {
      id: generateId(),
      name,
      industry,
      logo: name.charAt(0).toUpperCase(),
      status: 'active',
      lastActivity: new Date()
    };
    setClients(prev => [...prev, newClient]);
    setShowAddModal(false);
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
            <p className="text-sm text-gray-500">Manage your client relationships</p>
          </div>
          <button onClick={() => setShowAddModal(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Client
          </button>
        </div>
      </header>

      <div className="flex-1 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map(client => (
            <motion.div
              key={client.id}
              whileHover={{ scale: 1.02 }}
              onClick={() => setSelectedClient(client.id)}
              className={`bg-white rounded-xl p-5 shadow-sm border cursor-pointer transition-all ${selectedClient === client.id ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                  {client.logo}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{client.name}</h3>
                  <p className="text-sm text-gray-500">{client.industry}</p>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${client.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {client.status}
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Last activity: {client.lastActivity.toLocaleDateString()}</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Add Client Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Client</h2>
              <form onSubmit={(e) => { e.preventDefault(); const form = e.target as HTMLFormElement; handleAddClient((form.elements.namedItem('name') as HTMLInputElement).value, (form.elements.namedItem('industry') as HTMLInputElement).value); }}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
                  <input name="name" type="text" required className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Enter client name" />
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                  <input name="industry" type="text" required className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Enter industry" />
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
                  <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">Add Client</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Main App
export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [boards, setBoards] = useState<Board[]>(SAMPLE_BOARDS);
  const [activeBoard, setActiveBoard] = useState<Board | null>(null);

  const handleOpenBoard = (board: Board) => { setActiveBoard(board); setCurrentView('meeting'); };
  const handleUpdateBoard = (updates: Partial<Board>) => {
    if (activeBoard) {
      const updatedBoard = { ...activeBoard, ...updates };
      setActiveBoard(updatedBoard);
      setBoards(prev => prev.map(b => b.id === activeBoard.id ? updatedBoard : b));
    }
  };
  const handleBackToDashboard = () => { setCurrentView('dashboard'); setActiveBoard(null); };

  const handleCreateBoard = (name: string, templateId: string) => {
    const template = BOARD_TEMPLATES.find(t => t.id === templateId);
    const newBoard: Board = {
      id: generateId(),
      name,
      ownerId: '1',
      visualNodes: template?.nodes?.map((n: any, i: number) => ({
        id: generateId(),
        type: n.type || 'sticky',
        x: n.x || 100 + i * 50,
        y: n.y || 100,
        width: n.width || 200,
        height: n.height || 150,
        content: n.content || '',
        color: n.color || '#fef3c7',
        rotation: 0,
        locked: false,
        votes: 0,
        votedBy: [],
        createdBy: '1',
        comments: [],
      })) || [],
      createdAt: new Date(),
      zoom: 1,
      panX: 0,
      panY: 0,
      status: 'active',
      progress: 0,
      lastActivity: new Date(),
      participants: 1,
    };
    setBoards(prev => [...prev, newBoard]);
    setActiveBoard(newBoard);
    setCurrentView('meeting');
  };

  const handleViewChange = (view: ViewType) => {
    if (view === 'meeting') {
      if (activeBoard) {
        setCurrentView('meeting');
      } else if (boards.length > 0) {
        const lastActiveBoard = boards.find(b => b.status === 'active') || boards[0];
        setActiveBoard(lastActiveBoard);
        setCurrentView('meeting');
      } else {
        handleCreateBoard('New Board', 'blank');
      }
    } else {
      setCurrentView(view);
      setActiveBoard(null);
    }
  };

  return (
    <div className="h-screen flex bg-gray-50 overflow-hidden">
      <Sidebar currentView={currentView} onViewChange={handleViewChange} isCollapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} userName="Scott Jones" />
      {currentView === 'dashboard' && <DashboardView boards={boards} onOpenBoard={handleOpenBoard} onCreateBoard={handleCreateBoard} />}
      {currentView === 'meeting' && activeBoard && <MeetingView board={activeBoard} onUpdateBoard={handleUpdateBoard} onBack={handleBackToDashboard} />}
      {currentView === 'notes' && <NotesView />}
      {currentView === 'clients' && <ClientsView />}
    </div>
  );
}
