import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  Table,
  LinkIcon,
  ExternalLink,
  FolderOpen,
  UserCircle,
  Mail,
  Phone,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignStartVertical,
  Wand2,
  Shuffle,
  MicIcon,
  StopCircleIcon,
  Share,
  Cloud,
  Menu,
} from 'lucide-react';
import QRCode from 'qrcode';
import { supabase, organizationsApi, boardsApi, notesApi, isSupabaseConfigured } from './lib/supabase';
// TranscriptionPanel is now integrated into UnifiedLeftPanel
import TranscriptToWhiteboardModal, { VisualNodeInput } from './components/TranscriptToWhiteboardModal';
import { FullTranscript } from './lib/transcription';
import { CollaborationOverlay, UserPresenceList } from './components';
import { useCollaboration } from './hooks/useCollaboration';
import { useAuthOptional } from './hooks/useAuth';
import UnifiedLeftPanel from './components/UnifiedLeftPanel';
import type { ParticipantActivity } from './components/UnifiedLeftPanel';
// Note: getUserColor and getUserInitials available from realtime-collaboration if needed
import ShareBoardModal from './components/ShareBoardModal';
import ClientCommentsPanel from './components/ClientCommentsPanel';
import { getCommentsForBoard, ClientComment, toggleCommentResolved } from './lib/client-portal';
import FacilitatorTools from './components/FacilitatorTools';
import AssetLibrary from './components/AssetLibrary';
import type { AssetInsertPayload } from './components/AssetLibrary';
import NotesViewRedesigned from './components/NotesViewRedesign';
import DocumentsView from './components/DocumentsView';
import PDFEditor from './components/PDFEditor';
import { documentsApi, uploadDocumentFile, getDocumentShareUrl } from './lib/documents-api';
import type { ClientDocument } from './components/DocumentsView';
import type { PDFAnnotation, PDFComment } from './lib/pdf-utils';

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
  clientId?: string;
  linkedNoteIds?: string[];
}

interface VisualNode {
  id: string;
  type: 'sticky' | 'frame' | 'opportunity' | 'risk' | 'action' | 'youtube' | 'image' | 'bucket' | 'text' | 'shape' | 'connector' | 'mindmap' | 'drawing' | 'comment' | 'table' | 'linklist';
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
  connectorLabel?: string;
  connectorCurve?: number; // 0-1, controls bezier curve amount
  connectorControlPoint?: { x: number; y: number }; // Custom control point for manual curve adjustment
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
  originalWidth?: number;
  originalHeight?: number;
  // Text formatting
  textAlign?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  // Reactions
  reactions?: { emoji: string; userIds: string[] }[];
  // Table properties
  tableData?: { rows: string[][]; headers?: string[] };
  // Link list properties
  links?: { id: string; title: string; url: string; description?: string }[];
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

type ViewType = 'dashboard' | 'meeting' | 'notes' | 'documents' | 'clients';

// Collaboration types
interface UserPresence {
  id: string;
  name: string;
  color: string;
  cursorX: number;
  cursorY: number;
  cursor?: { x: number; y: number } | null;
  activeNodeId?: string | null;
  lastSeen: Date;
  isOnline?: boolean;
}

interface HistoryEntry {
  nodes: VisualNode[];
  timestamp: Date;
  action: string;
  userId?: string;
}

// Client interface (maps to fan_consulting organizations table)
interface Client {
  id: string;
  name: string;
  slug: string;
  company?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  logo_url?: string | null;
  website?: string | null;
  industry?: string | null;
  color: string;
  status: 'active' | 'inactive' | 'prospect';
  createdAt: Date;
  notes?: string;
}

// Generate a color from organization id/name for visual consistency
const generateClientColor = (id: string): string => {
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash = hash & hash;
  }
  return colors[Math.abs(hash) % colors.length];
};

// Project Note interface
interface ProjectNote {
  id: string;
  title: string;
  content: string; // Rich HTML content
  icon: string;
  parentId: string | null;
  clientId?: string;
  linkedBoardIds: string[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
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

// Template categories for organization
type TemplateCategory = 'strategy' | 'design' | 'agile' | 'meetings' | 'planning' | 'research' | 'workflow';

interface BoardTemplate {
  id: string;
  name: string;
  icon: typeof Layout;
  description: string;
  category: TemplateCategory;
  nodes: any[];
}

const BOARD_TEMPLATES: BoardTemplate[] = [
  // === BLANK ===
  { id: 'blank', name: 'Blank Canvas', icon: Layout, description: 'Start from scratch', category: 'planning', nodes: [] },
  
  // === STRATEGY & PLANNING ===
  { id: 'swot', name: 'SWOT Analysis', icon: BarChart3, description: 'Strategic planning framework', category: 'strategy', nodes: [
    { type: 'text', x: 350, y: 50, width: 300, height: 60, content: 'SWOT Analysis', fontSize: 32, color: 'transparent' },
    { type: 'frame', x: 50, y: 130, width: 400, height: 350, content: '💪 STRENGTHS\n\nWhat do we do well?\nWhat unique resources do we have?', color: '#dcfce7' },
    { type: 'frame', x: 470, y: 130, width: 400, height: 350, content: '⚠️ WEAKNESSES\n\nWhat could we improve?\nWhere do we lack resources?', color: '#fef3c7' },
    { type: 'frame', x: 50, y: 500, width: 400, height: 350, content: '🚀 OPPORTUNITIES\n\nWhat trends can we leverage?\nWhat gaps can we fill?', color: '#dbeafe' },
    { type: 'frame', x: 470, y: 500, width: 400, height: 350, content: '⛔ THREATS\n\nWhat obstacles do we face?\nWhat is the competition doing?', color: '#fce7f3' },
  ]},
  
  { id: 'business-model', name: 'Business Model Canvas', icon: LayoutDashboard, description: 'Visualize your business model', category: 'strategy', nodes: [
    { type: 'text', x: 350, y: 50, width: 400, height: 60, content: 'Business Model Canvas', fontSize: 32, color: 'transparent' },
    { type: 'frame', x: 50, y: 130, width: 200, height: 250, content: '🤝 Key Partners\n\nWho are our key partners & suppliers?', color: '#e0e7ff' },
    { type: 'frame', x: 260, y: 130, width: 200, height: 120, content: '⚙️ Key Activities\n\nWhat do we do?', color: '#dbeafe' },
    { type: 'frame', x: 260, y: 260, width: 200, height: 120, content: '📦 Key Resources\n\nWhat do we need?', color: '#dbeafe' },
    { type: 'frame', x: 470, y: 130, width: 200, height: 250, content: '💎 Value Propositions\n\nWhat value do we deliver?', color: '#fef3c7' },
    { type: 'frame', x: 680, y: 130, width: 200, height: 120, content: '💬 Customer Relationships\n\nHow do we interact?', color: '#dcfce7' },
    { type: 'frame', x: 680, y: 260, width: 200, height: 120, content: '📣 Channels\n\nHow do we reach them?', color: '#dcfce7' },
    { type: 'frame', x: 890, y: 130, width: 200, height: 250, content: '👥 Customer Segments\n\nWho do we serve?', color: '#fce7f3' },
    { type: 'frame', x: 50, y: 400, width: 440, height: 120, content: '💰 Cost Structure\n\nWhat are the major costs?', color: '#fee2e2' },
    { type: 'frame', x: 500, y: 400, width: 440, height: 120, content: '💵 Revenue Streams\n\nHow do we earn money?', color: '#d1fae5' },
  ]},

  { id: 'okr', name: 'OKR Planning', icon: Target, description: 'Objectives & Key Results', category: 'strategy', nodes: [
    { type: 'text', x: 350, y: 50, width: 300, height: 60, content: 'OKR Planning', fontSize: 32, color: 'transparent' },
    { type: 'frame', x: 50, y: 130, width: 900, height: 200, content: '🎯 OBJECTIVE 1\n\nDescribe your ambitious, qualitative goal', color: '#dbeafe' },
    { type: 'sticky', x: 70, y: 210, width: 180, height: 100, content: 'Key Result 1.1\n\nMeasurable outcome', color: '#fef3c7' },
    { type: 'sticky', x: 270, y: 210, width: 180, height: 100, content: 'Key Result 1.2\n\nMeasurable outcome', color: '#fef3c7' },
    { type: 'sticky', x: 470, y: 210, width: 180, height: 100, content: 'Key Result 1.3\n\nMeasurable outcome', color: '#fef3c7' },
    { type: 'frame', x: 50, y: 350, width: 900, height: 200, content: '🎯 OBJECTIVE 2\n\nDescribe your ambitious, qualitative goal', color: '#dcfce7' },
    { type: 'frame', x: 50, y: 570, width: 900, height: 200, content: '🎯 OBJECTIVE 3\n\nDescribe your ambitious, qualitative goal', color: '#f3e8ff' },
  ]},

  // === WORKFLOW & PROCESS ===
  { id: 'workflow', name: 'Workflow Diagram', icon: GitBranch, description: 'Map process flows', category: 'workflow', nodes: [
    { type: 'text', x: 350, y: 10, width: 300, height: 40, content: 'Workflow Diagram', fontSize: 28, color: 'transparent' },
    // Flow Key Legend
    { type: 'frame', x: 30, y: 70, width: 150, height: 400, content: 'Flow Key', color: '#f9fafb' },
    { type: 'shape', shapeType: 'rectangle', x: 50, y: 120, width: 80, height: 40, content: 'Process', color: '#fef3c7' },
    { type: 'shape', shapeType: 'diamond', x: 50, y: 180, width: 60, height: 60, content: 'Decision', color: '#dbeafe' },
    { type: 'shape', shapeType: 'circle', x: 50, y: 260, width: 50, height: 50, content: 'Start/End', color: '#fbbf24' },
    { type: 'shape', shapeType: 'rectangle', x: 50, y: 330, width: 80, height: 40, content: 'Data', color: '#a5f3fc' },
    // Main workflow area
    { type: 'frame', x: 200, y: 70, width: 800, height: 500, content: 'Visualization', color: '#ffffff' },
    // Start
    { type: 'shape', shapeType: 'circle', x: 250, y: 250, width: 60, height: 60, content: 'Start', color: '#22c55e' },
    // Process steps
    { type: 'shape', shapeType: 'rectangle', x: 360, y: 240, width: 120, height: 60, content: 'Step 1\nProcess', color: '#fef3c7' },
    { type: 'shape', shapeType: 'rectangle', x: 530, y: 240, width: 120, height: 60, content: 'Step 2\nProcess', color: '#fce7f3' },
    // Decision diamond
    { type: 'shape', shapeType: 'diamond', x: 700, y: 230, width: 80, height: 80, content: 'Decision?', color: '#dbeafe' },
    // Branches
    { type: 'shape', shapeType: 'rectangle', x: 700, y: 350, width: 120, height: 60, content: 'Yes Path', color: '#dcfce7' },
    { type: 'shape', shapeType: 'rectangle', x: 850, y: 240, width: 100, height: 60, content: 'No Path', color: '#fee2e2' },
    // End
    { type: 'shape', shapeType: 'circle', x: 720, y: 450, width: 60, height: 60, content: 'End', color: '#ef4444' },
  ]},

  { id: 'user-journey', name: 'User Journey Map', icon: Users, description: 'Map customer experience', category: 'design', nodes: [
    { type: 'text', x: 400, y: 10, width: 300, height: 40, content: 'User Journey Map', fontSize: 28, color: 'transparent' },
    // Phases
    { type: 'frame', x: 50, y: 70, width: 200, height: 80, content: '1️⃣ AWARENESS', color: '#dbeafe' },
    { type: 'frame', x: 260, y: 70, width: 200, height: 80, content: '2️⃣ CONSIDERATION', color: '#e0e7ff' },
    { type: 'frame', x: 470, y: 70, width: 200, height: 80, content: '3️⃣ DECISION', color: '#fef3c7' },
    { type: 'frame', x: 680, y: 70, width: 200, height: 80, content: '4️⃣ RETENTION', color: '#dcfce7' },
    { type: 'frame', x: 890, y: 70, width: 200, height: 80, content: '5️⃣ ADVOCACY', color: '#fce7f3' },
    // Row labels
    { type: 'text', x: 10, y: 170, width: 120, height: 30, content: '👤 Actions', fontSize: 14, color: 'transparent' },
    { type: 'text', x: 10, y: 270, width: 120, height: 30, content: '💭 Thoughts', fontSize: 14, color: 'transparent' },
    { type: 'text', x: 10, y: 370, width: 120, height: 30, content: '😀 Emotions', fontSize: 14, color: 'transparent' },
    { type: 'text', x: 10, y: 470, width: 120, height: 30, content: '⚡ Touchpoints', fontSize: 14, color: 'transparent' },
    { type: 'text', x: 10, y: 570, width: 120, height: 30, content: '💡 Opportunities', fontSize: 14, color: 'transparent' },
    // Grid frames
    { type: 'frame', x: 130, y: 160, width: 980, height: 100, content: '', color: '#f9fafb' },
    { type: 'frame', x: 130, y: 260, width: 980, height: 100, content: '', color: '#ffffff' },
    { type: 'frame', x: 130, y: 360, width: 980, height: 100, content: '', color: '#f9fafb' },
    { type: 'frame', x: 130, y: 460, width: 980, height: 100, content: '', color: '#ffffff' },
    { type: 'frame', x: 130, y: 560, width: 980, height: 100, content: '', color: '#fef3c7' },
  ]},

  { id: 'process-map', name: 'Process Map', icon: GitBranch, description: 'Document business processes', category: 'workflow', nodes: [
    { type: 'text', x: 400, y: 10, width: 250, height: 40, content: 'Process Map', fontSize: 28, color: 'transparent' },
    { type: 'frame', x: 50, y: 70, width: 300, height: 150, content: '📥 INPUTS\n\nWhat triggers this process?\nWhat do we need to start?', color: '#dbeafe' },
    { type: 'frame', x: 380, y: 70, width: 400, height: 400, content: '⚙️ PROCESS STEPS\n\n1. First step\n2. Second step\n3. Third step\n4. Fourth step', color: '#fef3c7' },
    { type: 'frame', x: 810, y: 70, width: 300, height: 150, content: '📤 OUTPUTS\n\nWhat are the deliverables?\nWhat is the end result?', color: '#dcfce7' },
    { type: 'frame', x: 50, y: 240, width: 300, height: 150, content: '👥 ROLES\n\nWho is responsible?\nWho is accountable?', color: '#f3e8ff' },
    { type: 'frame', x: 810, y: 240, width: 300, height: 150, content: '📊 METRICS\n\nHow do we measure success?\nWhat are the KPIs?', color: '#fce7f3' },
    { type: 'frame', x: 50, y: 410, width: 400, height: 150, content: '⚠️ RISKS & ISSUES\n\nWhat could go wrong?\nWhat are the bottlenecks?', color: '#fee2e2' },
    { type: 'frame', x: 480, y: 410, width: 400, height: 150, content: '💡 IMPROVEMENTS\n\nHow can we optimize?\nWhat can be automated?', color: '#d1fae5' },
  ]},

  // === BRAINSTORMING & IDEATION ===
  { id: 'brainstorm', name: 'Brainstorming', icon: Lightbulb, description: 'Generate and organize ideas', category: 'design', nodes: [
    { type: 'text', x: 400, y: 10, width: 300, height: 40, content: 'Brainstorming Session', fontSize: 28, color: 'transparent' },
    { type: 'frame', x: 50, y: 70, width: 350, height: 550, content: '💡 IDEAS\n\nCapture all ideas here.\nNo judgment, quantity over quality!', color: '#fef3c7' },
    { type: 'frame', x: 420, y: 70, width: 350, height: 550, content: '❓ QUESTIONS\n\nWhat do we need to explore?\nWhat assumptions to validate?', color: '#f3e8ff' },
    { type: 'frame', x: 790, y: 70, width: 350, height: 550, content: '✅ ACTIONS\n\nNext steps and owners.\nPrioritized by impact.', color: '#dcfce7' },
  ]},

  { id: 'mind-map', name: 'Mind Map', icon: GitBranch, description: 'Visual thinking & connections', category: 'design', nodes: [
    { type: 'text', x: 450, y: 250, width: 200, height: 50, content: 'Central Topic', fontSize: 24, color: 'transparent' },
    { type: 'shape', shapeType: 'circle', x: 450, y: 300, width: 150, height: 150, content: '🧠\nMain Idea', color: '#8b5cf6' },
    { type: 'shape', shapeType: 'circle', x: 200, y: 150, width: 120, height: 120, content: 'Branch 1', color: '#3b82f6' },
    { type: 'shape', shapeType: 'circle', x: 650, y: 100, width: 120, height: 120, content: 'Branch 2', color: '#10b981' },
    { type: 'shape', shapeType: 'circle', x: 750, y: 350, width: 120, height: 120, content: 'Branch 3', color: '#f59e0b' },
    { type: 'shape', shapeType: 'circle', x: 600, y: 550, width: 120, height: 120, content: 'Branch 4', color: '#ef4444' },
    { type: 'shape', shapeType: 'circle', x: 250, y: 500, width: 120, height: 120, content: 'Branch 5', color: '#ec4899' },
    { type: 'shape', shapeType: 'circle', x: 100, y: 300, width: 120, height: 120, content: 'Branch 6', color: '#06b6d4' },
  ]},

  { id: 'affinity', name: 'Affinity Diagram', icon: Lightbulb, description: 'Group ideas by themes', category: 'design', nodes: [
    { type: 'text', x: 350, y: 10, width: 400, height: 40, content: 'Affinity Diagram', fontSize: 28, color: 'transparent' },
    { type: 'frame', x: 50, y: 70, width: 250, height: 400, content: '🔵 Theme 1\n\nGroup related ideas here', color: '#dbeafe' },
    { type: 'frame', x: 320, y: 70, width: 250, height: 400, content: '🟢 Theme 2\n\nGroup related ideas here', color: '#dcfce7' },
    { type: 'frame', x: 590, y: 70, width: 250, height: 400, content: '🟡 Theme 3\n\nGroup related ideas here', color: '#fef3c7' },
    { type: 'frame', x: 860, y: 70, width: 250, height: 400, content: '🟣 Theme 4\n\nGroup related ideas here', color: '#f3e8ff' },
    { type: 'frame', x: 50, y: 490, width: 1060, height: 150, content: '📥 UNSORTED IDEAS\n\nDrag ideas from here to themes above', color: '#f9fafb' },
    { type: 'sticky', x: 70, y: 540, width: 150, height: 80, content: 'Idea 1', color: '#fef3c7' },
    { type: 'sticky', x: 240, y: 540, width: 150, height: 80, content: 'Idea 2', color: '#fef3c7' },
    { type: 'sticky', x: 410, y: 540, width: 150, height: 80, content: 'Idea 3', color: '#fef3c7' },
  ]},

  // === AGILE & PROJECT MANAGEMENT ===
  { id: 'kanban', name: 'Kanban Board', icon: FolderKanban, description: 'Track work progress', category: 'agile', nodes: [
    { type: 'text', x: 450, y: 50, width: 300, height: 60, content: 'Kanban Board', fontSize: 32, color: 'transparent' },
    { type: 'frame', x: 50, y: 130, width: 280, height: 600, content: '📋 BACKLOG\n\nTasks waiting to start', color: '#f3f4f6' },
    { type: 'frame', x: 350, y: 130, width: 280, height: 600, content: '📝 TO DO\n\nReady to work on', color: '#f3e8ff' },
    { type: 'frame', x: 650, y: 130, width: 280, height: 600, content: '🔄 IN PROGRESS\n\nCurrently being worked on', color: '#dbeafe' },
    { type: 'frame', x: 950, y: 130, width: 280, height: 600, content: '✅ DONE\n\nCompleted tasks', color: '#dcfce7' },
  ]},

  { id: 'sprint-planning', name: 'Sprint Planning', icon: Timer, description: 'Plan your sprint', category: 'agile', nodes: [
    { type: 'text', x: 400, y: 10, width: 300, height: 40, content: 'Sprint Planning', fontSize: 28, color: 'transparent' },
    { type: 'frame', x: 50, y: 70, width: 400, height: 200, content: '🎯 SPRINT GOAL\n\nWhat do we want to achieve this sprint?', color: '#dbeafe' },
    { type: 'frame', x: 470, y: 70, width: 300, height: 200, content: '📊 CAPACITY\n\nTeam: \nDays: \nVelocity: ', color: '#f3e8ff' },
    { type: 'frame', x: 790, y: 70, width: 300, height: 200, content: '⚠️ RISKS\n\nWhat might block us?', color: '#fee2e2' },
    { type: 'frame', x: 50, y: 290, width: 1040, height: 350, content: '📋 SPRINT BACKLOG\n\nUser stories and tasks for this sprint', color: '#fef3c7' },
    { type: 'sticky', x: 70, y: 350, width: 200, height: 100, content: 'User Story 1\n\nAs a user, I want...', color: '#ffffff' },
    { type: 'sticky', x: 290, y: 350, width: 200, height: 100, content: 'User Story 2\n\nAs a user, I want...', color: '#ffffff' },
    { type: 'sticky', x: 510, y: 350, width: 200, height: 100, content: 'User Story 3\n\nAs a user, I want...', color: '#ffffff' },
  ]},

  { id: 'retrospective', name: 'Sprint Retrospective', icon: RotateCcw, description: 'Team reflection & improvement', category: 'agile', nodes: [
    { type: 'text', x: 350, y: 10, width: 350, height: 40, content: 'Sprint Retrospective', fontSize: 28, color: 'transparent' },
    { type: 'frame', x: 50, y: 70, width: 350, height: 450, content: '😊 WHAT WENT WELL\n\nCelebrate successes!', color: '#dcfce7' },
    { type: 'frame', x: 420, y: 70, width: 350, height: 450, content: '😟 WHAT DIDN\'T GO WELL\n\nIdentify challenges', color: '#fee2e2' },
    { type: 'frame', x: 790, y: 70, width: 350, height: 450, content: '💡 IDEAS FOR IMPROVEMENT\n\nHow can we do better?', color: '#dbeafe' },
    { type: 'frame', x: 50, y: 540, width: 1090, height: 150, content: '✅ ACTION ITEMS\n\nConmmitments for next sprint', color: '#fef3c7' },
  ]},

  // === MEETINGS ===
  { id: 'meeting-agenda', name: 'Meeting Agenda', icon: Calendar, description: 'Structure your meeting', category: 'meetings', nodes: [
    { type: 'text', x: 400, y: 10, width: 250, height: 40, content: 'Meeting Agenda', fontSize: 28, color: 'transparent' },
    { type: 'frame', x: 50, y: 70, width: 400, height: 120, content: '📅 MEETING INFO\n\nDate: \nTime: \nAttendees: ', color: '#dbeafe' },
    { type: 'frame', x: 470, y: 70, width: 400, height: 120, content: '🎯 OBJECTIVES\n\nWhat do we want to achieve?', color: '#dcfce7' },
    { type: 'frame', x: 50, y: 210, width: 820, height: 300, content: '📋 AGENDA ITEMS\n\n1. Topic (5 min) - Owner\n2. Topic (10 min) - Owner\n3. Topic (15 min) - Owner\n4. Wrap-up (5 min)', color: '#fef3c7' },
    { type: 'frame', x: 50, y: 530, width: 400, height: 150, content: '📝 NOTES & DECISIONS\n\nCapture key points', color: '#f3e8ff' },
    { type: 'frame', x: 470, y: 530, width: 400, height: 150, content: '✅ ACTION ITEMS\n\nWho / What / When', color: '#fee2e2' },
  ]},

  { id: 'standup', name: 'Daily Standup', icon: Users, description: 'Quick team sync', category: 'meetings', nodes: [
    { type: 'text', x: 400, y: 10, width: 250, height: 40, content: 'Daily Standup', fontSize: 28, color: 'transparent' },
    { type: 'frame', x: 50, y: 70, width: 350, height: 500, content: '✅ YESTERDAY\n\nWhat did you complete?', color: '#dcfce7' },
    { type: 'frame', x: 420, y: 70, width: 350, height: 500, content: '📋 TODAY\n\nWhat will you work on?', color: '#dbeafe' },
    { type: 'frame', x: 790, y: 70, width: 350, height: 500, content: '🚧 BLOCKERS\n\nWhat\'s in your way?', color: '#fee2e2' },
  ]},

  // === RESEARCH & ANALYSIS ===
  { id: 'client-research', name: 'Client Research', icon: Globe, description: 'Research client & market', category: 'research', nodes: [
    { type: 'text', x: 400, y: 10, width: 300, height: 40, content: 'Client Research', fontSize: 28, color: 'transparent' },
    { type: 'frame', x: 50, y: 70, width: 450, height: 280, content: '🌐 COMPANY OVERVIEW\n\nMission/Vision:\nIndustry:\nSize:\nLocation:', color: '#dbeafe' },
    { type: 'frame', x: 520, y: 70, width: 450, height: 280, content: '🎯 VALUE PROPOSITION\n\nWhat problems do they solve?\nWhat makes them unique?', color: '#dcfce7' },
    { type: 'frame', x: 50, y: 370, width: 300, height: 250, content: '👥 TARGET AUDIENCE\n\nWho are their customers?\nDemographics?', color: '#fef3c7' },
    { type: 'frame', x: 370, y: 370, width: 300, height: 250, content: '⚔️ COMPETITORS\n\nWho else is in this space?\nDifferentiators?', color: '#fce7f3' },
    { type: 'frame', x: 690, y: 370, width: 280, height: 250, content: '💡 OPPORTUNITIES\n\nHow can we help them?\nQuick wins?', color: '#f3e8ff' },
  ]},

  { id: 'pestle', name: 'PESTLE Analysis', icon: BarChart3, description: 'Macro environment analysis', category: 'research', nodes: [
    { type: 'text', x: 400, y: 10, width: 300, height: 40, content: 'PESTLE Analysis', fontSize: 28, color: 'transparent' },
    { type: 'frame', x: 50, y: 70, width: 350, height: 250, content: '🏛️ POLITICAL\n\nGovernment policies\nTax regulations\nTrade restrictions', color: '#dbeafe' },
    { type: 'frame', x: 420, y: 70, width: 350, height: 250, content: '💰 ECONOMIC\n\nEconomic growth\nInterest rates\nInflation', color: '#dcfce7' },
    { type: 'frame', x: 790, y: 70, width: 350, height: 250, content: '👥 SOCIAL\n\nDemographics\nCultural trends\nLifestyle changes', color: '#fef3c7' },
    { type: 'frame', x: 50, y: 340, width: 350, height: 250, content: '💻 TECHNOLOGICAL\n\nNew technologies\nAutomation\nR&D activity', color: '#f3e8ff' },
    { type: 'frame', x: 420, y: 340, width: 350, height: 250, content: '⚖️ LEGAL\n\nEmployment law\nHealth & safety\nProduct regulations', color: '#fce7f3' },
    { type: 'frame', x: 790, y: 340, width: 350, height: 250, content: '🌍 ENVIRONMENTAL\n\nClimate change\nSustainability\nEnvironmental regulations', color: '#d1fae5' },
  ]},

  { id: 'empathy-map', name: 'Empathy Map', icon: Users, description: 'Understand your user', category: 'design', nodes: [
    { type: 'text', x: 400, y: 10, width: 250, height: 40, content: 'Empathy Map', fontSize: 28, color: 'transparent' },
    { type: 'shape', shapeType: 'circle', x: 450, y: 280, width: 150, height: 150, content: '👤\nUser', color: '#e0e7ff' },
    { type: 'frame', x: 300, y: 70, width: 400, height: 180, content: '👀 SEES\n\nWhat does the user see in their environment?', color: '#dbeafe' },
    { type: 'frame', x: 50, y: 200, width: 220, height: 200, content: '👂 HEARS\n\nWhat do friends, colleagues say?', color: '#dcfce7' },
    { type: 'frame', x: 730, y: 200, width: 220, height: 200, content: '💬 SAYS & DOES\n\nAttitude in public, behavior', color: '#fef3c7' },
    { type: 'frame', x: 300, y: 450, width: 400, height: 180, content: '🧠 THINKS & FEELS\n\nWhat really matters? Worries & aspirations?', color: '#f3e8ff' },
    { type: 'frame', x: 50, y: 420, width: 220, height: 150, content: '😣 PAINS\n\nFears, frustrations, obstacles', color: '#fee2e2' },
    { type: 'frame', x: 730, y: 420, width: 220, height: 150, content: '🎯 GAINS\n\nWants, needs, success measures', color: '#d1fae5' },
  ]},

  // === PLANNING ===  
  { id: 'project-charter', name: 'Project Charter', icon: FileText, description: 'Define project scope', category: 'planning', nodes: [
    { type: 'text', x: 400, y: 10, width: 250, height: 40, content: 'Project Charter', fontSize: 28, color: 'transparent' },
    { type: 'frame', x: 50, y: 70, width: 500, height: 150, content: '📋 PROJECT NAME & DESCRIPTION\n\nWhat is this project about?', color: '#dbeafe' },
    { type: 'frame', x: 570, y: 70, width: 400, height: 150, content: '🎯 OBJECTIVES\n\nWhat do we want to achieve?', color: '#dcfce7' },
    { type: 'frame', x: 50, y: 240, width: 300, height: 150, content: '✅ IN SCOPE\n\nWhat\'s included', color: '#d1fae5' },
    { type: 'frame', x: 370, y: 240, width: 300, height: 150, content: '❌ OUT OF SCOPE\n\nWhat\'s excluded', color: '#fee2e2' },
    { type: 'frame', x: 690, y: 240, width: 280, height: 150, content: '👥 STAKEHOLDERS\n\nWho\'s involved?', color: '#f3e8ff' },
    { type: 'frame', x: 50, y: 410, width: 300, height: 150, content: '📅 TIMELINE\n\nKey milestones', color: '#fef3c7' },
    { type: 'frame', x: 370, y: 410, width: 300, height: 150, content: '💰 BUDGET\n\nResources needed', color: '#fce7f3' },
    { type: 'frame', x: 690, y: 410, width: 280, height: 150, content: '⚠️ RISKS\n\nWhat could go wrong?', color: '#fee2e2' },
    { type: 'frame', x: 50, y: 580, width: 920, height: 100, content: '📈 SUCCESS CRITERIA\n\nHow do we know we succeeded?', color: '#e0e7ff' },
  ]},

  { id: 'roadmap', name: 'Product Roadmap', icon: TrendingUp, description: 'Plan product evolution', category: 'planning', nodes: [
    { type: 'text', x: 350, y: 50, width: 350, height: 60, content: 'Product Roadmap', fontSize: 32, color: 'transparent' },
    // Timeline headers
    { type: 'frame', x: 200, y: 130, width: 250, height: 60, content: 'Q1 2024', color: '#dbeafe' },
    { type: 'frame', x: 460, y: 130, width: 250, height: 60, content: 'Q2 2024', color: '#dcfce7' },
    { type: 'frame', x: 720, y: 130, width: 250, height: 60, content: 'Q3 2024', color: '#fef3c7' },
    { type: 'frame', x: 980, y: 130, width: 250, height: 60, content: 'Q4 2024', color: '#f3e8ff' },
    // Theme rows
    { type: 'text', x: 50, y: 210, width: 140, height: 30, content: '🚀 Features', fontSize: 14, color: 'transparent' },
    { type: 'frame', x: 200, y: 200, width: 1030, height: 120, content: '', color: '#f9fafb' },
    { type: 'text', x: 50, y: 340, width: 140, height: 30, content: '🔧 Tech Debt', fontSize: 14, color: 'transparent' },
    { type: 'frame', x: 200, y: 330, width: 1030, height: 120, content: '', color: '#ffffff' },
    { type: 'text', x: 50, y: 470, width: 140, height: 30, content: '📊 Analytics', fontSize: 14, color: 'transparent' },
    { type: 'frame', x: 200, y: 460, width: 1030, height: 120, content: '', color: '#f9fafb' },
    // Sample items
    { type: 'sticky', x: 220, y: 220, width: 180, height: 80, content: 'Feature A\nLaunch MVP', color: '#dbeafe' },
    { type: 'sticky', x: 480, y: 220, width: 180, height: 80, content: 'Feature B\nUser feedback', color: '#dcfce7' },
  ]},
];

const generateId = () => crypto.randomUUID();

// Sidebar Component
const Sidebar = ({
  currentView,
  onViewChange,
  isCollapsed,
  onToggleCollapse,
  userName,
  isGuest = false,
  userRole = 'Owner',
  isMobileOpen = false,
  onMobileClose
}: {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  userName: string;
  isGuest?: boolean;
  userRole?: string;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}) => {
  const navItems = [
    { id: 'dashboard' as ViewType, label: 'Dashboard', icon: LayoutDashboard, description: 'All boards & progress' },
    { id: 'meeting' as ViewType, label: 'Whiteboard', icon: FolderKanban, description: 'Active whiteboard' },
    { id: 'notes' as ViewType, label: 'Notes', icon: BookOpen, description: 'Notion-style docs' },
    { id: 'documents' as ViewType, label: 'Documents', icon: FileText, description: 'PDF documents' },
    { id: 'clients' as ViewType, label: 'Clients', icon: Building2, description: 'Client management' },
  ];

  const handleNavClick = (view: ViewType) => {
    onViewChange(view);
    onMobileClose?.(); // Close sidebar on mobile after navigation
  };

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="sm:hidden fixed inset-0 bg-black/50 z-40"
            onClick={onMobileClose}
          />
        )}
      </AnimatePresence>
      
      <motion.nav
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className={`
          h-screen bg-white border-r border-gray-200 flex flex-col transition-all duration-300
          fixed sm:relative z-50
          ${isCollapsed ? 'sm:w-16' : 'sm:w-64'}
          ${isMobileOpen ? 'translate-x-0 w-72' : '-translate-x-full sm:translate-x-0 w-72 sm:w-auto'}
        `}
      >
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Target className="w-5 h-5 text-white" />
          </div>
          {(!isCollapsed || isMobileOpen) && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 min-w-0">
              <h1 className="font-bold text-gray-900">Fan Canvas</h1>
              <p className="text-xs text-gray-500">Collaborative Whiteboard</p>
            </motion.div>
          )}
          {/* Mobile close button */}
          {isMobileOpen && (
            <button onClick={onMobileClose} className="sm:hidden p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 px-3 py-4 space-y-1">
        <p className={`text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 ${isCollapsed && !isMobileOpen ? 'text-center' : 'px-3'}`}>
          {isCollapsed && !isMobileOpen ? '•' : 'Navigation'}
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <motion.button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative ${
                isActive ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
              {(!isCollapsed || isMobileOpen) && (
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
          {(!isCollapsed || isMobileOpen) && <span className="text-sm">Settings</span>}
        </button>
        <div className={`flex items-center gap-3 p-2 rounded-xl bg-gray-50 ${isCollapsed && !isMobileOpen ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
            {userName.charAt(0).toUpperCase()}
          </div>
          {(!isCollapsed || isMobileOpen) && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
              <p className="text-xs text-gray-500">{isGuest ? userRole : 'Owner'}</p>
            </div>
          )}
        </div>
        {/* Collapse button - desktop only */}
        <button
          onClick={onToggleCollapse}
          className="hidden sm:flex w-full items-center justify-center gap-2 px-3 py-2 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all"
        >
          {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          {!isCollapsed && <span className="text-sm">Collapse</span>}
        </button>
      </div>
    </motion.nav>
    </>
  );
};

// Dashboard View
const DashboardView = ({ boards, onOpenBoard, onCreateBoard, onDeleteBoard, clients, onAddClient, isLoadingClients, onSyncToCloud }: {
  boards: Board[];
  onOpenBoard: (board: Board) => void;
  onCreateBoard: (name: string, template: string, clientId: string) => Promise<void>;
  onDeleteBoard: (boardId: string) => void;
  clients: Client[];
  onAddClient: (client: Partial<Client>) => Promise<void>;
  isLoadingClients: boolean;
  onSyncToCloud: () => Promise<number>;
}) => {
  const [showNewBoardModal, setShowNewBoardModal] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('blank');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientWebsite, setNewClientWebsite] = useState('');
  const [newClientIndustry, setNewClientIndustry] = useState('');
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [isCreatingBoard, setIsCreatingBoard] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const activeBoards = boards.filter(b => b.status === 'active');
  const completedBoards = boards.filter(b => b.status === 'completed');
  const totalProgress = boards.length > 0 ? Math.round(boards.reduce((acc, b) => acc + (b.progress || 0), 0) / boards.length) : 0;

  const handleCreateBoard = async () => {
    if (!newBoardName.trim() || !selectedClientId || isCreatingBoard) return;
    setIsCreatingBoard(true);
    try {
      // Wait for board to be created in Supabase before closing modal
      await onCreateBoard(newBoardName, selectedTemplate, selectedClientId);
      setNewBoardName('');
      setSelectedTemplate('blank');
      setSelectedClientId('');
      setShowNewBoardModal(false);
    } finally {
      setIsCreatingBoard(false);
    }
  };

  const handleCreateNewClient = async () => {
    if (!newClientName.trim()) return;
    setIsCreatingClient(true);
    try {
      await onAddClient({
        name: newClientName,
        website: newClientWebsite || undefined,
        industry: newClientIndustry || undefined
      });
      setNewClientName('');
      setNewClientWebsite('');
      setNewClientIndustry('');
      setShowNewClientForm(false);
    } catch (error) {
      console.error('Failed to create client:', error);
    } finally {
      setIsCreatingClient(false);
    }
  };

  const getClientName = (clientId: string | undefined) => {
    if (!clientId) return 'No Client';
    const client = clients.find(c => c.id === clientId);
    return client?.name || 'Unknown Client';
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
    <div className="flex-1 overflow-auto bg-gray-50 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header - add left padding on mobile for menu button */}
        <div className="mb-6 sm:mb-8 pl-12 sm:pl-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-600">Monitor all your strategic planning boards</p>
        </div>

        {/* Stats Grid - 2 cols on mobile, 4 on desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
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
              className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100"
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 bg-${stat.color}-100 rounded-lg sm:rounded-xl flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 sm:w-6 sm:h-6 text-${stat.color}-600`} />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs sm:text-sm text-gray-500">{stat.label}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mb-6 sm:mb-8">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Quick Actions</h2>
          <div className="flex gap-2 sm:gap-4 flex-wrap">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setShowNewBoardModal(true)} className="flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2.5 sm:py-3 bg-indigo-600 text-white rounded-xl text-sm sm:text-base font-medium shadow-lg shadow-indigo-200">
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" /> <span className="hidden sm:inline">New</span> Board
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.02 }} 
              whileTap={{ scale: 0.98 }} 
              onClick={async () => {
                setIsSyncing(true);
                setSyncResult(null);
                try {
                  const count = await onSyncToCloud();
                  setSyncResult(`✅ Synced ${count} boards to cloud`);
                  setTimeout(() => setSyncResult(null), 3000);
                } catch (err) {
                  setSyncResult('❌ Sync failed');
                  setTimeout(() => setSyncResult(null), 3000);
                }
                setIsSyncing(false);
              }}
              disabled={isSyncing}
              className="flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2.5 sm:py-3 bg-emerald-600 text-white rounded-xl text-sm sm:text-base font-medium shadow-lg shadow-emerald-200 disabled:opacity-50"
            >
              {isSyncing ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> : <Cloud className="w-4 h-4 sm:w-5 sm:h-5" />}
              {isSyncing ? 'Syncing...' : <><span className="hidden sm:inline">Sync to</span> Cloud</>}
            </motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => alert('Schedule meeting coming soon! For now, create a board and start a recording session.')} className="hidden sm:flex items-center gap-3 px-6 py-3 bg-white text-gray-700 rounded-xl font-medium border border-gray-200">
              <Calendar className="w-5 h-5" /> Schedule Meeting
            </motion.button>
          </div>
          {syncResult && (
            <motion.p 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="mt-3 text-sm font-medium text-gray-700"
            >
              {syncResult}
            </motion.p>
          )}
        </div>

        {showNewBoardModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowNewBoardModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white rounded-2xl p-6 w-[550px] max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Create New Board</h2>
                <button onClick={() => setShowNewBoardModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
              </div>
              <div className="space-y-4">
                {/* Client Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Client *</label>
                  {!showNewClientForm ? (
                    <div className="space-y-2">
                      {isLoadingClients ? (
                        <div className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-400 bg-gray-50">
                          Loading clients...
                        </div>
                      ) : (
                        <select
                          value={selectedClientId}
                          onChange={(e) => setSelectedClientId(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">Choose a client...</option>
                          {clients.map(client => (
                            <option key={client.id} value={client.id}>{client.name}</option>
                          ))}
                        </select>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowNewClientForm(true)}
                        className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" /> Add New Client
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">New Client</span>
                        <button onClick={() => setShowNewClientForm(false)} className="text-gray-400 hover:text-gray-600">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={newClientName}
                        onChange={(e) => setNewClientName(e.target.value)}
                        placeholder="Client name *"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                      <input
                        type="text"
                        value={newClientWebsite}
                        onChange={(e) => setNewClientWebsite(e.target.value)}
                        placeholder="Website (optional)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                      <input
                        type="text"
                        value={newClientIndustry}
                        onChange={(e) => setNewClientIndustry(e.target.value)}
                        placeholder="Industry (optional)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                      <button
                        onClick={handleCreateNewClient}
                        disabled={!newClientName.trim() || isCreatingClient}
                        className="w-full px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                      >
                        {isCreatingClient ? 'Creating...' : 'Create Client'}
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Board Name *</label>
                  <input type="text" value={newBoardName} onChange={(e) => setNewBoardName(e.target.value)} placeholder="e.g., Q2 Strategy Planning" className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Choose a Template</label>
                  <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto">
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
                <div className="flex gap-3 pt-4 mt-2 border-t border-gray-100">
                  <motion.button whileHover={{ scale: 1.02 }} onClick={handleCreateBoard} disabled={!newBoardName.trim() || !selectedClientId || isCreatingBoard} className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed">{isCreatingBoard ? 'Creating...' : 'Create Board'}</motion.button>
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
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Client</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Status</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Progress</th>
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
                    onClick={() => onOpenBoard(board)}
                    className="border-b border-gray-50 hover:bg-indigo-50 transition-colors cursor-pointer"
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
                      <span className="text-sm text-gray-700">{getClientName(board.clientId)}</span>
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
                      <div className="flex items-center justify-end gap-2">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={(e) => { e.stopPropagation(); onOpenBoard(board); }}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100"
                        >
                          Open <ArrowRight className="w-4 h-4" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Are you sure you want to delete "${board.name}"? This cannot be undone.`)) {
                              onDeleteBoard(board.id);
                            }
                          }}
                          className="inline-flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100"
                          title="Delete board"
                        >
                          <Trash2 className="w-4 h-4" />
                        </motion.button>
                      </div>
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
const StickyNote = ({ node, isSelected, onSelect, onUpdate, onDelete, onDuplicate, onStartConnector, onAddMindmapChild, onAISparkle, zoom, selectedCount = 1, isDrawingMode = false, onContextMenuOpen, connectingFrom }: {
  node: VisualNode;
  isSelected: boolean;
  onSelect: (e?: React.MouseEvent) => void;
  onUpdate: (updates: Partial<VisualNode>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onStartConnector: (nodeId: string) => void;
  onAddMindmapChild?: (nodeId: string) => void;
  onAISparkle?: (position: { x: number; y: number }) => void;
  zoom: number;
  selectedCount?: number;
  isDrawingMode?: boolean;
  onContextMenuOpen?: () => void;
  connectingFrom?: string | null;
}) => {
  const [isResizing, setIsResizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [isEditingText, setIsEditingText] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isFrame = node.type === 'frame';

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

  // Handle Enter key for bullet/numbered list continuation
  const handleListKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, currentContent: string, updateContent: (newContent: string) => void) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      const textarea = e.currentTarget;
      const cursorPos = textarea.selectionStart;
      const textBeforeCursor = currentContent.slice(0, cursorPos);
      const textAfterCursor = currentContent.slice(cursorPos);

      // Find the current line
      const lastNewlineIndex = textBeforeCursor.lastIndexOf('\n');
      const currentLine = textBeforeCursor.slice(lastNewlineIndex + 1);

      // Check for bullet patterns: "- ", "• ", "* "
      const bulletMatch = currentLine.match(/^(\s*)([-•*])\s/);
      if (bulletMatch) {
        // If current line is just the bullet with no content, remove it
        if (currentLine.trim() === bulletMatch[2]) {
          e.preventDefault();
          const newContent = textBeforeCursor.slice(0, lastNewlineIndex + 1) + textAfterCursor;
          updateContent(newContent);
          // Set cursor position after state update
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = lastNewlineIndex + 1;
          }, 0);
          return;
        }
        e.preventDefault();
        const indent = bulletMatch[1];
        const bullet = bulletMatch[2];
        const newContent = textBeforeCursor + '\n' + indent + bullet + ' ' + textAfterCursor;
        updateContent(newContent);
        // Set cursor position after the new bullet
        const newCursorPos = cursorPos + 1 + indent.length + bullet.length + 1;
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = newCursorPos;
        }, 0);
        return;
      }

      // Check for numbered list pattern: "1. ", "2. ", etc.
      const numberMatch = currentLine.match(/^(\s*)(\d+)\.\s/);
      if (numberMatch) {
        // If current line is just the number with no content, remove it
        if (currentLine.trim() === numberMatch[2] + '.') {
          e.preventDefault();
          const newContent = textBeforeCursor.slice(0, lastNewlineIndex + 1) + textAfterCursor;
          updateContent(newContent);
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = lastNewlineIndex + 1;
          }, 0);
          return;
        }
        e.preventDefault();
        const indent = numberMatch[1];
        const nextNumber = parseInt(numberMatch[2]) + 1;
        const newContent = textBeforeCursor + '\n' + indent + nextNumber + '. ' + textAfterCursor;
        updateContent(newContent);
        // Set cursor position after the new number
        const newCursorPos = cursorPos + 1 + indent.length + String(nextNumber).length + 2;
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = newCursorPos;
        }, 0);
        return;
      }
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Position menu ensuring it stays on screen
    const menuWidth = 280;
    const menuHeight = 500;
    const x = Math.min(e.clientX, window.innerWidth - menuWidth - 20);
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 20);
    setContextMenuPos({ x: Math.max(10, x), y: Math.max(10, y) });
    setShowContextMenu(true);
    onSelect();
    onContextMenuOpen?.(); // Switch to select mode
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Position menu ensuring it stays on screen
    const menuWidth = 280;
    const menuHeight = 500;
    const x = Math.min(e.clientX, window.innerWidth - menuWidth - 20);
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 20);
    setContextMenuPos({ x: Math.max(10, x), y: Math.max(10, y) });
    setShowContextMenu(true);
    onSelect();
    onContextMenuOpen?.(); // Switch to select mode
  };

  // Handle menu drag
  const handleMenuDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startMenuX = contextMenuPos.x;
    const startMenuY = contextMenuPos.y;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      const newX = Math.max(10, Math.min(window.innerWidth - 280, startMenuX + deltaX));
      const newY = Math.max(10, Math.min(window.innerHeight - 100, startMenuY + deltaY));
      setContextMenuPos({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Close menu on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showContextMenu) {
        setShowContextMenu(false);
      }
    };
    if (showContextMenu) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [showContextMenu]);

  const isShape = node.type === 'shape';
  const isText = node.type === 'text';
  const isConnector = node.type === 'connector';
  const isComment = node.type === 'comment';
  void node.type; // _isMindmap check handled by type === 'mindmap' inline
  const hasTextContent = !['youtube', 'image', 'bucket', 'connector', 'comment'].includes(node.type);
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
      animate={{ scale: 1, opacity: 1, x: node.x, y: node.y, rotate: node.rotation, boxShadow: isDragging ? '0 25px 50px -12px rgba(0, 0, 0, 0.25)' : isFrame || isText || isConnector || node.type === 'drawing' ? 'none' : '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
      transition={isDragging ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 30 }}
      whileHover={{ scale: isSelected || isDragging ? 1 : 1.02, zIndex: 50 }}
      className={`absolute group ${isDrawingMode ? 'pointer-events-none' : 'pointer-events-auto'} ${isResizing ? '' : 'cursor-grab active:cursor-grabbing'} ${isFrame ? 'rounded-2xl border-2 border-dashed' : isText || isConnector || node.type === 'drawing' ? '' : 'rounded-xl'} ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}
      style={{ width: node.width, height: node.height, backgroundColor: isFrame ? `${node.color}80` : isText || isConnector || node.type === 'drawing' ? 'transparent' : node.color, borderColor: isFrame ? node.color : undefined, zIndex: isDragging ? 1000 : isSelected ? 100 : (node.zIndex ?? (isFrame ? 1 : 10)), ...getShapeStyles() }}
      onClick={(e) => { e.stopPropagation(); onSelect(e); }}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      drag={!isResizing && !isDrawingMode && !node.locked && !connectingFrom}
      dragMomentum={false}
      dragElastic={0}
      dragTransition={{ power: 0, timeConstant: 0 }}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={(_, info) => { setIsDragging(false); if (!isResizing) onUpdate({ x: node.x + info.offset.x / zoom, y: node.y + info.offset.y / zoom }); }}
    >
      {!isFrame && !isConnector && node.type !== 'drawing' && (
        <>
          {isSelected && onAISparkle && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                onAISparkle({ x: rect.right + 10, y: rect.top });
              }}
              className="absolute top-1/2 -left-5 -translate-y-1/2 w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform z-30 border-2 border-white"
              title="AI Actions"
            >
              <Sparkles className="w-4 h-4 text-white" />
            </button>
          )}
          {/* Connection handle - right side */}
          {!node.locked && !connectingFrom && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onStartConnector(node.id);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2
                         w-8 h-8 rounded-full bg-white border-2 border-gray-300
                         flex items-center justify-center opacity-0 group-hover:opacity-100
                         hover:border-indigo-500 hover:bg-indigo-100 hover:scale-110
                         transition-all z-[60] cursor-crosshair shadow-md"
              title="Click to connect to another element"
            >
              <ArrowRight className="w-4 h-4 text-indigo-500" />
            </button>
          )}
        </>
      )}

      <div className={`h-full overflow-hidden ${isFrame ? 'p-3 flex flex-col' : node.type === 'youtube' || node.type === 'image' || node.type === 'bucket' ? '' : 'p-3'}`}>
        {isFrame && (
          <>
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-200/50">
              <GripVertical className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={node.content.split('\n')[0]}
                onChange={(e) => {
                  const lines = node.content.split('\n');
                  lines[0] = e.target.value;
                  onUpdate({ content: lines.join('\n') });
                }}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 text-sm font-bold text-gray-700 bg-transparent border-none outline-none"
                placeholder="Frame title..."
              />
            </div>
            <textarea
              value={node.content.split('\n').slice(1).join('\n')}
              onChange={(e) => {
                const title = node.content.split('\n')[0];
                onUpdate({ content: title + '\n' + e.target.value });
              }}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                const descContent = node.content.split('\n').slice(1).join('\n');
                handleListKeyDown(e, descContent, (newContent) => {
                  const title = node.content.split('\n')[0];
                  onUpdate({ content: title + '\n' + newContent });
                });
              }}
              className="flex-1 text-xs text-gray-600 bg-transparent border-none outline-none resize-none w-full"
              placeholder="Add notes..."
            />
          </>
        )}

        {node.type === 'youtube' && node.mediaUrl && (
          <div className="w-full h-full rounded-xl overflow-hidden relative group">
            <iframe
              src={node.mediaUrl}
              className="w-full h-full"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="YouTube video"
              style={{ pointerEvents: isSelected ? 'auto' : 'none' }}
            />
            {!isSelected && (
              <div className="absolute inset-0 bg-transparent hover:bg-black/5 transition-colors flex items-center justify-center cursor-grab">
                <div className="opacity-0 group-hover:opacity-100 bg-white/90 px-3 py-2 rounded-lg text-xs font-medium text-gray-700 shadow-lg transition-opacity">
                  Click to select • Then interact with video
                </div>
              </div>
            )}
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
              onFocus={() => setIsEditingText(true)}
              onBlur={() => setTimeout(() => setIsEditingText(false), 200)}
              className="w-full h-full bg-transparent resize-none border-none outline-none text-gray-700 font-medium text-center placeholder-gray-400"
              placeholder="Click to add text"
              style={{ 
                textAlign: node.textAlign || 'center', 
                fontSize: node.fontSize || 14,
                fontWeight: node.fontWeight || 'normal',
                fontStyle: node.fontStyle || 'normal'
              }}
            />
          </div>
        )}
        
        {/* Floating text toolbar when editing shapes */}
        <AnimatePresence>
          {isShape && isEditingText && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute -bottom-12 left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-xl border border-gray-200 flex items-center gap-0.5 p-1 z-[200]"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.preventDefault()}
            >
              {/* Font size */}
              <button 
                onMouseDown={(e) => { e.preventDefault(); onUpdate({ fontSize: Math.max(10, (node.fontSize || 14) - 2) }); }}
                className="p-1.5 hover:bg-gray-100 rounded text-xs font-bold text-gray-500" 
                title="Decrease font"
              >A-</button>
              <span className="text-[10px] text-gray-400 w-5 text-center">{node.fontSize || 14}</span>
              <button 
                onMouseDown={(e) => { e.preventDefault(); onUpdate({ fontSize: Math.min(48, (node.fontSize || 14) + 2) }); }}
                className="p-1.5 hover:bg-gray-100 rounded text-sm font-bold text-gray-500" 
                title="Increase font"
              >A+</button>
              <div className="w-px h-4 bg-gray-200 mx-0.5" />
              {/* Bold / Italic */}
              <button 
                onMouseDown={(e) => { e.preventDefault(); onUpdate({ fontWeight: node.fontWeight === 'bold' ? 'normal' : 'bold' }); }}
                className={`p-1.5 hover:bg-gray-100 rounded ${node.fontWeight === 'bold' ? 'bg-gray-200' : ''}`}
                title="Bold"
              ><Bold className="w-3.5 h-3.5 text-gray-500" /></button>
              <button 
                onMouseDown={(e) => { e.preventDefault(); onUpdate({ fontStyle: node.fontStyle === 'italic' ? 'normal' : 'italic' }); }}
                className={`p-1.5 hover:bg-gray-100 rounded ${node.fontStyle === 'italic' ? 'bg-gray-200' : ''}`}
                title="Italic"
              ><Italic className="w-3.5 h-3.5 text-gray-500" /></button>
              <div className="w-px h-4 bg-gray-200 mx-0.5" />
              {/* Colors */}
              <button onMouseDown={(e) => { e.preventDefault(); onUpdate({ color: '#fef3c7' }); }} className="w-5 h-5 rounded bg-yellow-100 hover:ring-2 ring-gray-300" title="Yellow" />
              <button onMouseDown={(e) => { e.preventDefault(); onUpdate({ color: '#dbeafe' }); }} className="w-5 h-5 rounded bg-blue-100 hover:ring-2 ring-gray-300" title="Blue" />
              <button onMouseDown={(e) => { e.preventDefault(); onUpdate({ color: '#dcfce7' }); }} className="w-5 h-5 rounded bg-green-100 hover:ring-2 ring-gray-300" title="Green" />
              <button onMouseDown={(e) => { e.preventDefault(); onUpdate({ color: '#fce7f3' }); }} className="w-5 h-5 rounded bg-pink-100 hover:ring-2 ring-gray-300" title="Pink" />
              <button onMouseDown={(e) => { e.preventDefault(); onUpdate({ color: '#f3e8ff' }); }} className="w-5 h-5 rounded bg-purple-100 hover:ring-2 ring-gray-300" title="Purple" />
            </motion.div>
          )}
        </AnimatePresence>

        {isText && (
          <textarea
            value={node.content}
            onChange={(e) => onUpdate({ content: e.target.value })}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => handleListKeyDown(e, node.content, (newContent) => onUpdate({ content: newContent }))}
            className="w-full h-full bg-transparent resize-none border-none outline-none text-gray-900 font-medium placeholder-gray-400"
            placeholder="Type here..."
            style={{ fontSize: node.fontSize || 24 }}
          />
        )}

        {isConnector && !node.connectorFrom && !node.connectorTo && (
          <svg className="w-full h-full" viewBox={`0 0 ${node.width} ${node.height}`} preserveAspectRatio="none">
            <defs>
              <marker id={`arrow-${node.id}`} markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill={node.color || '#6b7280'} />
              </marker>
            </defs>
            <line
              x1="0"
              y1={node.height / 2}
              x2={node.width - 10}
              y2={node.height / 2}
              stroke={node.color || '#6b7280'}
              strokeWidth="3"
              strokeDasharray={node.connectorStyle === 'dashed' ? '10,6' : node.connectorStyle === 'dotted' ? '3,6' : 'none'}
              markerEnd={`url(#arrow-${node.id})`}
            />
          </svg>
        )}

        {/* Drawing - render SVG path that scales with the node */}
        {node.type === 'drawing' && node.paths && (
          <svg
            className="w-full h-full"
            viewBox={`0 0 ${node.originalWidth || node.width} ${node.originalHeight || node.height}`}
            preserveAspectRatio="xMidYMid meet"
            style={{ overflow: 'visible' }}
          >
            {node.paths.map((path, pathIndex) => {
              // Scale stroke width based on resize ratio to maintain visual appearance
              const scaleX = node.width / (node.originalWidth || node.width);
              const scaleY = node.height / (node.originalHeight || node.height);
              const avgScale = (scaleX + scaleY) / 2;
              const scaledStrokeWidth = (path.width || 3) / avgScale;
              return (
                <path
                  key={pathIndex}
                  d={path.points.reduce((acc: string, point: { x: number; y: number }, i: number) =>
                    i === 0 ? `M ${point.x} ${point.y}` : `${acc} L ${point.x} ${point.y}`, ''
                  )}
                  stroke={path.color || '#3b82f6'}
                  strokeWidth={scaledStrokeWidth}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              );
            })}
          </svg>
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

        {node.type === 'table' && node.tableData && (
          <div className="p-3 h-full flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
              <Table className="w-4 h-4 text-blue-500" />
              <input
                type="text"
                value={node.content}
                onChange={(e) => onUpdate({ content: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 font-semibold text-sm text-gray-700 bg-transparent border-none outline-none"
                placeholder="Table name"
              />
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    {node.tableData.headers?.map((header, i) => (
                      <th key={i} className="border border-gray-200 bg-gray-50 px-2 py-1.5 text-left font-medium text-gray-600">
                        <input
                          type="text"
                          value={header}
                          onChange={(e) => {
                            const newHeaders = [...(node.tableData?.headers || [])];
                            newHeaders[i] = e.target.value;
                            onUpdate({ tableData: { ...node.tableData!, headers: newHeaders } });
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full bg-transparent border-none outline-none"
                        />
                      </th>
                    ))}
                    <th className="border border-gray-200 bg-gray-50 px-1 py-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const newHeaders = [...(node.tableData?.headers || []), 'New'];
                          const newRows = node.tableData?.rows.map(row => [...row, '']) || [];
                          onUpdate({ tableData: { headers: newHeaders, rows: newRows } });
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {node.tableData.rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className="border border-gray-200 px-2 py-1">
                          <input
                            type="text"
                            value={cell}
                            onChange={(e) => {
                              const newRows = [...node.tableData!.rows];
                              newRows[rowIndex] = [...newRows[rowIndex]];
                              newRows[rowIndex][cellIndex] = e.target.value;
                              onUpdate({ tableData: { ...node.tableData!, rows: newRows } });
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full bg-transparent border-none outline-none text-gray-700"
                          />
                        </td>
                      ))}
                      <td className="border border-gray-200 px-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const newRows = node.tableData?.rows.filter((_, i) => i !== rowIndex) || [];
                            onUpdate({ tableData: { ...node.tableData!, rows: newRows } });
                          }}
                          className="text-red-300 hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const newRow = Array(node.tableData?.headers?.length || 3).fill('');
                  onUpdate({ tableData: { ...node.tableData!, rows: [...(node.tableData?.rows || []), newRow] } });
                }}
                className="w-full mt-2 py-1 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded border border-dashed border-gray-200 flex items-center justify-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Row
              </button>
            </div>
          </div>
        )}

        {node.type === 'linklist' && (
          <div className="p-3 h-full flex flex-col rounded-xl overflow-hidden" style={{ backgroundColor: node.color }}>
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-200/50">
              <LinkIcon className="w-4 h-4 text-green-600" />
              <input
                type="text"
                value={node.content}
                onChange={(e) => onUpdate({ content: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 font-semibold text-sm text-gray-700 bg-transparent border-none outline-none"
                placeholder="List title"
              />
            </div>
            <div className="flex-1 overflow-auto space-y-1.5">
              {node.links?.map((link, i) => (
                <div key={link.id} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-100 group">
                  <ExternalLink className="w-3 h-3 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={link.title}
                      onChange={(e) => {
                        const newLinks = [...(node.links || [])];
                        newLinks[i] = { ...newLinks[i], title: e.target.value };
                        onUpdate({ links: newLinks });
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full text-xs font-medium text-gray-700 bg-transparent border-none outline-none truncate"
                      placeholder="Link title"
                    />
                    <input
                      type="url"
                      value={link.url}
                      onChange={(e) => {
                        const newLinks = [...(node.links || [])];
                        newLinks[i] = { ...newLinks[i], url: e.target.value };
                        onUpdate({ links: newLinks });
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full text-[10px] text-blue-500 bg-transparent border-none outline-none truncate"
                      placeholder="https://..."
                    />
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1 hover:bg-gray-100 rounded text-blue-500"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdate({ links: node.links?.filter((_, idx) => idx !== i) });
                      }}
                      className="p-1 hover:bg-red-50 rounded text-red-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const newLink = { id: generateId(), title: 'New Link', url: '', description: '' };
                  onUpdate({ links: [...(node.links || []), newLink] });
                }}
                className="w-full py-1.5 text-xs text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded border border-dashed border-gray-300 flex items-center justify-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Link
              </button>
            </div>
          </div>
        )}

        {!isFrame && node.type !== 'youtube' && node.type !== 'image' && node.type !== 'bucket' && !isShape && !isText && !isConnector && !isComment && (
          <>
            {/* Only show type label for non-sticky notes */}
            {node.type !== 'sticky' && (
              <div className="flex items-center gap-1 mb-2">
                <span>{typeIcons[node.type] || '📝'}</span>
                <span className="text-xs font-semibold text-gray-600 capitalize">{node.type}</span>
              </div>
            )}
            <div 
              className={`w-full flex flex-col ${
                node.verticalAlign === 'bottom' ? 'justify-end' : 
                node.verticalAlign === 'top' ? 'justify-start' : 
                'justify-center'
              }`}
              style={{ height: node.type === 'sticky' ? '100%' : 'calc(100% - 30px)' }}
            >
              <textarea
                ref={textareaRef}
                value={node.content}
                onChange={(e) => onUpdate({ content: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                onFocus={() => setIsEditingText(true)}
                onBlur={() => setTimeout(() => setIsEditingText(false), 200)}
                onKeyDown={(e) => handleListKeyDown(e, node.content, (newContent) => onUpdate({ content: newContent }))}
                className="w-full bg-transparent resize-none border-none outline-none text-gray-800 placeholder-gray-500"
                placeholder="Type here..."
                style={{ 
                  fontSize: node.fontSize || 14,
                  fontWeight: node.fontWeight || 'normal',
                  fontStyle: node.fontStyle || 'normal',
                  textAlign: node.textAlign || 'center',
                  height: 'auto',
                  minHeight: '1.5em',
                  maxHeight: '100%'
                }}
                rows={Math.max(1, node.content.split('\n').length)}
              />
              
              {/* Floating text toolbar when editing */}
              <AnimatePresence>
                {isEditingText && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute -bottom-12 left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-xl border border-gray-200 flex items-center gap-0.5 p-1 z-[200]"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    {/* Font size */}
                    <button 
                      onMouseDown={(e) => { e.preventDefault(); onUpdate({ fontSize: Math.max(10, (node.fontSize || 14) - 2) }); }}
                      className="p-1.5 hover:bg-gray-100 rounded text-xs font-bold text-gray-500" 
                      title="Decrease font"
                    >A-</button>
                    <span className="text-[10px] text-gray-400 w-5 text-center">{node.fontSize || 14}</span>
                    <button 
                      onMouseDown={(e) => { e.preventDefault(); onUpdate({ fontSize: Math.min(48, (node.fontSize || 14) + 2) }); }}
                      className="p-1.5 hover:bg-gray-100 rounded text-sm font-bold text-gray-500" 
                      title="Increase font"
                    >A+</button>
                    <div className="w-px h-4 bg-gray-200 mx-0.5" />
                    {/* Bold / Italic */}
                    <button 
                      onMouseDown={(e) => { e.preventDefault(); onUpdate({ fontWeight: node.fontWeight === 'bold' ? 'normal' : 'bold' }); }}
                      className={`p-1.5 hover:bg-gray-100 rounded ${node.fontWeight === 'bold' ? 'bg-gray-200' : ''}`}
                      title="Bold"
                    ><Bold className="w-3.5 h-3.5 text-gray-500" /></button>
                    <button 
                      onMouseDown={(e) => { e.preventDefault(); onUpdate({ fontStyle: node.fontStyle === 'italic' ? 'normal' : 'italic' }); }}
                      className={`p-1.5 hover:bg-gray-100 rounded ${node.fontStyle === 'italic' ? 'bg-gray-200' : ''}`}
                      title="Italic"
                    ><Italic className="w-3.5 h-3.5 text-gray-500" /></button>
                    <div className="w-px h-4 bg-gray-200 mx-0.5" />
                    {/* Alignment */}
                    <button 
                      onMouseDown={(e) => { e.preventDefault(); onUpdate({ textAlign: 'left' }); }}
                      className={`p-1.5 hover:bg-gray-100 rounded ${node.textAlign === 'left' ? 'bg-gray-200' : ''}`}
                      title="Left"
                    ><AlignLeft className="w-3.5 h-3.5 text-gray-500" /></button>
                    <button 
                      onMouseDown={(e) => { e.preventDefault(); onUpdate({ textAlign: 'center' }); }}
                      className={`p-1.5 hover:bg-gray-100 rounded ${(!node.textAlign || node.textAlign === 'center') ? 'bg-gray-200' : ''}`}
                      title="Center"
                    ><AlignCenter className="w-3.5 h-3.5 text-gray-500" /></button>
                    <button 
                      onMouseDown={(e) => { e.preventDefault(); onUpdate({ textAlign: 'right' }); }}
                      className={`p-1.5 hover:bg-gray-100 rounded ${node.textAlign === 'right' ? 'bg-gray-200' : ''}`}
                      title="Right"
                    ><AlignRight className="w-3.5 h-3.5 text-gray-500" /></button>
                    <div className="w-px h-4 bg-gray-200 mx-0.5" />
                    {/* Vertical alignment */}
                    <button 
                      onMouseDown={(e) => { e.preventDefault(); onUpdate({ verticalAlign: 'top' }); }}
                      className={`p-1.5 hover:bg-gray-100 rounded ${node.verticalAlign === 'top' ? 'bg-gray-200' : ''}`}
                      title="Top"
                    ><ChevronUp className="w-3.5 h-3.5 text-gray-500" /></button>
                    <button 
                      onMouseDown={(e) => { e.preventDefault(); onUpdate({ verticalAlign: 'middle' }); }}
                      className={`p-1.5 hover:bg-gray-100 rounded ${(!node.verticalAlign || node.verticalAlign === 'middle') ? 'bg-gray-200' : ''}`}
                      title="Middle"
                    ><Minus className="w-3.5 h-3.5 text-gray-500" /></button>
                    <button 
                      onMouseDown={(e) => { e.preventDefault(); onUpdate({ verticalAlign: 'bottom' }); }}
                      className={`p-1.5 hover:bg-gray-100 rounded ${node.verticalAlign === 'bottom' ? 'bg-gray-200' : ''}`}
                      title="Bottom"
                    ><ChevronDown className="w-3.5 h-3.5 text-gray-500" /></button>
                    <div className="w-px h-4 bg-gray-200 mx-0.5" />
                    {/* Colors */}
                    <button onMouseDown={(e) => { e.preventDefault(); onUpdate({ color: '#fef3c7' }); }} className="w-5 h-5 rounded bg-yellow-100 hover:ring-2 ring-gray-300" title="Yellow" />
                    <button onMouseDown={(e) => { e.preventDefault(); onUpdate({ color: '#dbeafe' }); }} className="w-5 h-5 rounded bg-blue-100 hover:ring-2 ring-gray-300" title="Blue" />
                    <button onMouseDown={(e) => { e.preventDefault(); onUpdate({ color: '#dcfce7' }); }} className="w-5 h-5 rounded bg-green-100 hover:ring-2 ring-gray-300" title="Green" />
                    <button onMouseDown={(e) => { e.preventDefault(); onUpdate({ color: '#fce7f3' }); }} className="w-5 h-5 rounded bg-pink-100 hover:ring-2 ring-gray-300" title="Pink" />
                    <button onMouseDown={(e) => { e.preventDefault(); onUpdate({ color: '#f3e8ff' }); }} className="w-5 h-5 rounded bg-purple-100 hover:ring-2 ring-gray-300" title="Purple" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
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
                {/* Font size controls */}
                <button 
                  onClick={() => onUpdate({ fontSize: Math.max(10, (node.fontSize || 14) - 2) })} 
                  className="p-1.5 hover:bg-gray-100 rounded" 
                  title="Decrease font size"
                >
                  <span className="text-xs font-bold text-gray-500">A-</span>
                </button>
                <span className="text-xs text-gray-500 w-6 text-center">{node.fontSize || 14}</span>
                <button 
                  onClick={() => onUpdate({ fontSize: Math.min(48, (node.fontSize || 14) + 2) })} 
                  className="p-1.5 hover:bg-gray-100 rounded" 
                  title="Increase font size"
                >
                  <span className="text-sm font-bold text-gray-500">A+</span>
                </button>
                <div className="w-px h-5 bg-gray-200 mx-1" />
                {/* Text formatting */}
                <button 
                  onClick={() => onUpdate({ fontWeight: node.fontWeight === 'bold' ? 'normal' : 'bold' })} 
                  className={`p-1.5 hover:bg-gray-100 rounded ${node.fontWeight === 'bold' ? 'bg-gray-200' : ''}`} 
                  title="Bold"
                >
                  <Bold className="w-4 h-4 text-gray-500" />
                </button>
                <button 
                  onClick={() => onUpdate({ fontStyle: node.fontStyle === 'italic' ? 'normal' : 'italic' })} 
                  className={`p-1.5 hover:bg-gray-100 rounded ${node.fontStyle === 'italic' ? 'bg-gray-200' : ''}`} 
                  title="Italic"
                >
                  <Italic className="w-4 h-4 text-gray-500" />
                </button>
                <div className="w-px h-5 bg-gray-200 mx-1" />
                {/* Text alignment */}
                <button 
                  onClick={() => onUpdate({ textAlign: 'left' })} 
                  className={`p-1.5 hover:bg-gray-100 rounded ${node.textAlign === 'left' ? 'bg-gray-200' : ''}`} 
                  title="Align left"
                >
                  <AlignLeft className="w-4 h-4 text-gray-500" />
                </button>
                <button 
                  onClick={() => onUpdate({ textAlign: 'center' })} 
                  className={`p-1.5 hover:bg-gray-100 rounded ${(!node.textAlign || node.textAlign === 'center') ? 'bg-gray-200' : ''}`} 
                  title="Align center"
                >
                  <AlignCenter className="w-4 h-4 text-gray-500" />
                </button>
                <button 
                  onClick={() => onUpdate({ textAlign: 'right' })} 
                  className={`p-1.5 hover:bg-gray-100 rounded ${node.textAlign === 'right' ? 'bg-gray-200' : ''}`} 
                  title="Align right"
                >
                  <AlignRight className="w-4 h-4 text-gray-500" />
                </button>
                <div className="w-px h-5 bg-gray-200 mx-1" />
                {/* Vertical alignment */}
                <button 
                  onClick={() => onUpdate({ verticalAlign: 'top' })} 
                  className={`p-1.5 hover:bg-gray-100 rounded ${node.verticalAlign === 'top' ? 'bg-gray-200' : ''}`} 
                  title="Align top"
                >
                  <ChevronUp className="w-4 h-4 text-gray-500" />
                </button>
                <button 
                  onClick={() => onUpdate({ verticalAlign: 'middle' })} 
                  className={`p-1.5 hover:bg-gray-100 rounded ${(!node.verticalAlign || node.verticalAlign === 'middle') ? 'bg-gray-200' : ''}`} 
                  title="Align middle"
                >
                  <Minus className="w-4 h-4 text-gray-500" />
                </button>
                <button 
                  onClick={() => onUpdate({ verticalAlign: 'bottom' })} 
                  className={`p-1.5 hover:bg-gray-100 rounded ${node.verticalAlign === 'bottom' ? 'bg-gray-200' : ''}`} 
                  title="Align bottom"
                >
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                </button>
                <div className="w-px h-5 bg-gray-200 mx-1" />
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
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setShowMoreOptions(!showMoreOptions); }}
                className={`p-1.5 hover:bg-gray-100 rounded ${showMoreOptions ? 'bg-gray-100' : ''}`}
                title="More options"
              >
                <MoreVertical className="w-4 h-4 text-gray-500" />
              </button>
              {showMoreOptions && (
                <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-[300] min-w-[160px]">
                  <button
                    onClick={(e) => { e.stopPropagation(); onDuplicate(); setShowMoreOptions(false); }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4" /> Duplicate
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onStartConnector(node.id); setShowMoreOptions(false); }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                  >
                    <ArrowRight className="w-4 h-4" /> Connect to...
                  </button>
                  <div className="h-px bg-gray-200 my-1" />
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(); setShowMoreOptions(false); }}
                    className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Highlight when this node is the connection source */}
      {connectingFrom === node.id && (
        <div className="absolute inset-0 border-2 border-indigo-500 rounded-lg
                        pointer-events-none animate-pulse z-50" />
      )}

      {/* Show connection target indicator on other nodes */}
      {connectingFrom && connectingFrom !== node.id && !isFrame && !isConnector && node.type !== 'drawing' && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onStartConnector(node.id);
          }}
          onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
          onMouseUp={(e) => { e.stopPropagation(); }}
          className="absolute inset-[-2px] border-3 border-dashed border-indigo-500
                     rounded-xl cursor-pointer hover:bg-indigo-200/40
                     flex items-center justify-center pointer-events-auto"
          style={{ zIndex: 9999, backgroundColor: 'rgba(99, 102, 241, 0.15)' }}
        >
          <div className="bg-indigo-600 text-white rounded-full p-3 shadow-xl animate-pulse">
            <ArrowRight className="w-6 h-6" />
          </div>
        </div>
      )}
    </motion.div>

    {showContextMenu && (
      <>
        <div
          className="fixed inset-0 z-[99998] pointer-events-auto"
          onClick={() => setShowContextMenu(false)}
          onMouseDown={(e) => { e.stopPropagation(); setShowContextMenu(false); }}
        />
        <div
          className="fixed bg-white rounded-2xl shadow-2xl border border-gray-200 z-[99999] w-64 max-h-[70vh] overflow-hidden pointer-events-auto cursor-default flex flex-col"
          style={{
            left: contextMenuPos.x,
            top: contextMenuPos.y,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)'
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Draggable Header */}
          <div
            className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200 cursor-grab active:cursor-grabbing select-none rounded-t-2xl"
            onMouseDown={handleMenuDragStart}
          >
            <div className="flex items-center gap-2">
              <GripVertical className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-medium text-gray-600">Properties</span>
            </div>
            <button
              onClick={() => setShowContextMenu(false)}
              className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="overflow-y-auto py-1">
          {/* Colors Section */}
          <div className="px-3 py-2 border-b border-gray-100">
            <div className="flex gap-1.5">
              {['#fef3c7', '#fce7f3', '#dbeafe', '#d1fae5', '#f3e8ff', '#fee2e2', '#e0e7ff', '#ffffff'].map(color => (
                <button key={color} onClick={() => { onUpdate({ color }); setShowContextMenu(false); }} className={`w-6 h-6 rounded-full border-2 ${node.color === color ? 'border-indigo-500 scale-110' : 'border-gray-200'} hover:scale-110 transition-all`} style={{ backgroundColor: color }} />
              ))}
            </div>
          </div>
          
          {/* Arrange Section */}
          <div className="py-1 border-b border-gray-100">
            <button onClick={() => { onUpdate({ zIndex: 999 }); setShowContextMenu(false); }} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-3">
              <ChevronUp className="w-4 h-4 text-gray-400" />
              <span>Bring to front</span>
            </button>
            <button onClick={() => { onUpdate({ zIndex: 1 }); setShowContextMenu(false); }} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-3">
              <ChevronDown className="w-4 h-4 text-gray-400" />
              <span>Send to back</span>
            </button>
          </div>
          
          {/* Actions Section */}
          <div className="py-1 border-b border-gray-100">
            <button onClick={() => { onDuplicate(); setShowContextMenu(false); }} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-3">
              <Copy className="w-4 h-4 text-gray-400" />
              <span>Duplicate</span>
            </button>
            <button onClick={() => { onUpdate({ locked: !node.locked }); setShowContextMenu(false); }} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-3">
              {node.locked ? <Unlock className="w-4 h-4 text-gray-400" /> : <Lock className="w-4 h-4 text-gray-400" />}
              <span>{node.locked ? 'Unlock' : 'Lock'}</span>
              {node.locked && <span className="ml-auto text-xs text-amber-500">🔒</span>}
            </button>
            {node.type === 'mindmap' && onAddMindmapChild && (
              <button onClick={() => { onAddMindmapChild(node.id); setShowContextMenu(false); }} className="w-full px-4 py-2 text-left text-sm hover:bg-purple-50 flex items-center gap-3 text-purple-700">
                <GitBranch className="w-4 h-4" />
                <span>Add child node</span>
              </button>
            )}
          </div>
          
          {/* Connect Section */}
          <div className="py-1 border-b border-gray-100">
            <button onClick={() => { onStartConnector(node.id); setShowContextMenu(false); }} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-3">
              <Minus className="w-4 h-4 text-gray-400" />
              <span>Connect to...</span>
            </button>
          </div>
          
          {/* Text Formatting (if applicable) */}
          {hasTextContent && (
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="text-[10px] font-semibold text-gray-400 uppercase mb-2">Format</p>
              <div className="flex gap-1">
                <button onClick={() => { toggleBold(); }} className="p-2 hover:bg-gray-100 rounded-lg flex-1" title="Bold"><Bold className="w-4 h-4 text-gray-600 mx-auto" /></button>
                <button onClick={() => { toggleItalic(); }} className="p-2 hover:bg-gray-100 rounded-lg flex-1" title="Italic"><Italic className="w-4 h-4 text-gray-600 mx-auto" /></button>
                <button onClick={() => { addBulletPoint(); }} className="p-2 hover:bg-gray-100 rounded-lg flex-1" title="Bullet list"><List className="w-4 h-4 text-gray-600 mx-auto" /></button>
                <button onClick={() => { addNumberedPoint(); }} className="p-2 hover:bg-gray-100 rounded-lg flex-1" title="Numbered list"><ListOrdered className="w-4 h-4 text-gray-600 mx-auto" /></button>
              </div>
            </div>
          )}
          
          {/* Copy/Download Section */}
          <div className="py-1 border-b border-gray-100">
            <button onClick={() => { navigator.clipboard.writeText(node.content); setShowContextMenu(false); }} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-3">
              <FileText className="w-4 h-4 text-gray-400" />
              <span>Copy as text</span>
            </button>
          </div>
          
          {/* Delete */}
          <div className="py-1">
            <button onClick={() => { onDelete(); setShowContextMenu(false); }} className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-3">
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </button>
          </div>
          </div>{/* End Scrollable Content */}
        </div>
      </>
    )}
    </>
  );
};

// Infinite Canvas
const InfiniteCanvas = ({ board, onUpdateBoard, onUpdateWithHistory, selectedNodeIds, onSelectNodes, onCanvasDoubleClick, isDrawingMode, isPanMode, drawingColor, drawingWidth, onAddMindmapChild, onAISparkle, gridSnap, showMinimap, otherUsers, onDisablePanMode, onDropMedia, onCursorMove, editingNodes: _editingNodes, showCursors = true, onSetPanMode, onSetSelectMode }: {
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
  onDisablePanMode?: () => void;
  onDropMedia?: (file: File, x: number, y: number) => void;
  onCursorMove?: (cursor: { x: number; y: number } | null) => void;
  editingNodes?: Map<string, { userId: string; userName: string; color: string }>;
  showCursors?: boolean;
  onSetPanMode?: () => void;
  onSetSelectMode?: () => void;
}) => {
  const [zoom, setZoom] = useState(board.zoom || 1);
  const [panX, setPanX] = useState(board.panX || 0);
  const [panY, setPanY] = useState(board.panY || 0);
  const [isDrawing, setIsDrawing] = useState(false);
  const isDrawingRef = useRef(false); // Synchronous ref for immediate access
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const currentPathRef = useRef<{ x: number; y: number }[]>([]); // Synchronous ref
  const [drawingTick, setDrawingTick] = useState(0); // Force re-render for real-time drawing
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0, panX: 0, panY: 0 });
  const [spacePressed, setSpacePressed] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  
  // Build cursor map for collaboration overlay
  const cursorMap = useMemo(() => {
    const entries: [string, { x: number; y: number; name: string; color: string }][] = [];
    if (otherUsers) {
      otherUsers.forEach(u => {
        // Only include users who have an active cursor position
        const cursorX = u.cursor?.x ?? u.cursorX;
        const cursorY = u.cursor?.y ?? u.cursorY;
        if (cursorX !== undefined && cursorY !== undefined && u.isOnline) {
          entries.push([u.id, {
            x: cursorX,
            y: cursorY,
            name: u.name,
            color: u.color
          }]);
        }
      });
    }
    return new globalThis.Map(entries);
  }, [otherUsers]);
  
  // Lasso selection state
  const [isLassoing, setIsLassoing] = useState(false);
  const [lassoStart, setLassoStart] = useState<{ x: number; y: number } | null>(null);
  const [lassoEnd, setLassoEnd] = useState<{ x: number; y: number } | null>(null);

  // Drag and drop state for media
  const [isDragOver, setIsDragOver] = useState(false);

  // Alignment guides
  const [alignmentGuides, setAlignmentGuides] = useState<{ type: 'vertical' | 'horizontal'; position: number }[]>([]);
  
  // Touch gesture state for mobile
  const touchStartRef = useRef<{ x: number; y: number; panX: number; panY: number; touches: number; distance?: number } | null>(null);
  
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
    
    board.visualNodes.filter(n => n.id !== draggedNode.id && n.type !== 'connector').forEach(node => {
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
        onSelectNodes(board.visualNodes.filter(n => !(n.type === 'connector' && n.connectorFrom && n.connectorTo)).map(n => n.id));
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
        const connectorId = generateId();
        const connectorNode: VisualNode = {
          id: connectorId,
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
        // Auto-select the new connector to show the editor
        onSelectNodes([connectorId]);
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
      const point = getCanvasPoint(e);
      // Use refs for synchronous updates - state updates are async
      isDrawingRef.current = true;
      currentPathRef.current = [point];
      setIsDrawing(true);
      setCurrentPath([point]);
      return;
    }
    
    // Box selection with click+drag on empty canvas (or shift+click anywhere)
    // Only start if clicking directly on canvas (not on a node)
    if (e.button === 0 && !isDrawingMode && !isPanMode && !spacePressed) {
      const target = e.target as HTMLElement;
      const isClickOnCanvas = target === canvasRef.current || target.classList.contains('canvas-background');
      if (e.shiftKey || isClickOnCanvas) {
        e.preventDefault();
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          setIsLassoing(true);
          setLassoStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
          setLassoEnd({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }
      }
    }
  }, [isDrawingMode, isPanMode, getCanvasPoint, spacePressed, panX, panY]);

  // Combined mouse move handler
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // Broadcast cursor position for collaboration (throttled by the hook)
    if (onCursorMove) {
      const point = getCanvasPoint(e);
      onCursorMove(point);
    }
    
    // Panning
    if (isPanning) {
      e.preventDefault();
      const deltaX = e.clientX - panStart.x;
      const deltaY = e.clientY - panStart.y;
      setPanX(panStart.panX + deltaX);
      setPanY(panStart.panY + deltaY);
      return;
    }

    // Drawing - use ref for synchronous check since state updates are async
    if ((isDrawingRef.current || isDrawing) && isDrawingMode) {
      e.preventDefault();
      const point = getCanvasPoint(e);
      // Update ref and force re-render with tick
      currentPathRef.current = [...currentPathRef.current, point];
      setDrawingTick(t => t + 1); // Force immediate re-render
      return;
    }
    
    // Lasso selection
    if (isLassoing && lassoStart) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        setLassoEnd({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }
    }
  }, [isPanning, panStart, isDrawing, isDrawingMode, getCanvasPoint, isLassoing, lassoStart, onCursorMove]);

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
        .filter(n => !(n.type === 'connector' && n.connectorFrom && n.connectorTo))
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

    // Use ref for synchronous check - get path from ref for most up-to-date data
    const pathToUse = currentPathRef.current.length > 0 ? currentPathRef.current : currentPath;
    const wasDrawing = isDrawingRef.current || isDrawing;

    if (!wasDrawing || pathToUse.length < 2) {
      isDrawingRef.current = false;
      currentPathRef.current = [];
      setIsDrawing(false);
      setCurrentPath([]);
      return;
    }

    // Calculate bounding box
    const minX = Math.min(...pathToUse.map(p => p.x));
    const minY = Math.min(...pathToUse.map(p => p.y));
    const maxX = Math.max(...pathToUse.map(p => p.x));
    const maxY = Math.max(...pathToUse.map(p => p.y));

    // Normalize points relative to bounding box
    const normalizedPoints = pathToUse.map(p => ({ x: p.x - minX, y: p.y - minY }));

    const originalWidth = Math.max(maxX - minX, 10);
    const originalHeight = Math.max(maxY - minY, 10);
    const drawingNode: VisualNode = {
      id: generateId(),
      type: 'drawing',
      x: minX,
      y: minY,
      width: originalWidth,
      height: originalHeight,
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
      strokeWidth: drawingWidth || 3,
      originalWidth,
      originalHeight
    };

    onUpdateWithHistory({ visualNodes: [...board.visualNodes, drawingNode] }, 'Draw');
    // Reset both refs and state
    isDrawingRef.current = false;
    currentPathRef.current = [];
    setIsDrawing(false);
    setCurrentPath([]);
  }, [isPanning, isDrawing, currentPath, drawingColor, drawingWidth, board.visualNodes, onUpdateWithHistory, isLassoing, lassoStart, lassoEnd, panX, panY, zoom, onSelectNodes, clearAlignmentGuides]);

  // Touch handlers for mobile pan and pinch-to-zoom
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      // Single finger - pan
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        panX,
        panY,
        touches: 1
      };
    } else if (e.touches.length === 2) {
      // Two fingers - pinch to zoom
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      touchStartRef.current = {
        x: midX,
        y: midY,
        panX,
        panY,
        touches: 2,
        distance
      };
    }
  }, [panX, panY]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    e.preventDefault(); // Prevent browser scroll/zoom
    
    if (e.touches.length === 1 && touchStartRef.current.touches === 1) {
      // Single finger pan
      const dx = e.touches[0].clientX - touchStartRef.current.x;
      const dy = e.touches[0].clientY - touchStartRef.current.y;
      setPanX(touchStartRef.current.panX + dx);
      setPanY(touchStartRef.current.panY + dy);
    } else if (e.touches.length === 2 && touchStartRef.current.touches === 2 && touchStartRef.current.distance) {
      // Pinch to zoom
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const scale = distance / touchStartRef.current.distance;
      const newZoom = Math.min(Math.max(zoom * scale, 0.1), 5);
      
      // Zoom toward pinch center
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const canvasX = midX - rect.left;
        const canvasY = midY - rect.top;
        const worldX = (canvasX - panX) / zoom;
        const worldY = (canvasY - panY) / zoom;
        setPanX(canvasX - worldX * newZoom);
        setPanY(canvasY - worldY * newZoom);
      }
      setZoom(newZoom);
      
      // Update reference for smooth continuous pinch
      touchStartRef.current.distance = distance;
    }
  }, [zoom, panX, panY]);

  const handleTouchEnd = useCallback(() => {
    touchStartRef.current = null;
  }, []);

  // Drag and drop handlers for media files
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const mediaFile = files.find(f => f.type.startsWith('image/') || f.type.startsWith('video/'));

    if (mediaFile && onDropMedia) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const x = (e.clientX - rect.left - panX) / zoom;
        const y = (e.clientY - rect.top - panY) / zoom;
        onDropMedia(mediaFile, x, y);
      }
    }
  }, [onDropMedia, panX, panY, zoom]);

  // Helper function to find intersection point of line with rectangle edge
  const getEdgeIntersection = (
    centerX: number, centerY: number, // center of the rectangle
    width: number, height: number, // size of the rectangle
    targetX: number, targetY: number, // point we're drawing line to/from
    padding: number = 8 // padding from edge for arrow visibility
  ) => {
    const dx = targetX - centerX;
    const dy = targetY - centerY;
    
    if (dx === 0 && dy === 0) return { x: centerX, y: centerY };
    
    const halfW = width / 2 + padding;
    const halfH = height / 2 + padding;
    
    // Calculate intersection with each edge and find the closest one
    const scaleX = Math.abs(dx) > 0 ? halfW / Math.abs(dx) : Infinity;
    const scaleY = Math.abs(dy) > 0 ? halfH / Math.abs(dy) : Infinity;
    const scale = Math.min(scaleX, scaleY);
    
    return {
      x: centerX + dx * scale,
      y: centerY + dy * scale
    };
  };

  // Get connector lines
  const allConnectors = board.visualNodes.filter(n => n.type === 'connector');
  const connectorLines = allConnectors.filter(n => n.connectorFrom && n.connectorTo).map(conn => {
    const fromNode = board.visualNodes.find(n => n.id === conn.connectorFrom);
    const toNode = board.visualNodes.find(n => n.id === conn.connectorTo);
    if (!fromNode || !toNode) {
      console.log('Connector has invalid node refs:', conn.id, { from: conn.connectorFrom, to: conn.connectorTo });
      return null;
    }
    
    // Get center points
    const fromCenterX = fromNode.x + fromNode.width / 2;
    const fromCenterY = fromNode.y + fromNode.height / 2;
    const toCenterX = toNode.x + toNode.width / 2;
    const toCenterY = toNode.y + toNode.height / 2;
    
    // Calculate edge intersection points so arrows stop at the edge, not center
    const startPoint = getEdgeIntersection(fromCenterX, fromCenterY, fromNode.width, fromNode.height, toCenterX, toCenterY);
    const endPoint = getEdgeIntersection(toCenterX, toCenterY, toNode.width, toNode.height, fromCenterX, fromCenterY);
    
    // Calculate midpoint for label positioning
    const midX = (startPoint.x + endPoint.x) / 2;
    const midY = (startPoint.y + endPoint.y) / 2;
    
    return {
      id: conn.id,
      x1: startPoint.x,
      y1: startPoint.y,
      x2: endPoint.x,
      y2: endPoint.y,
      midX,
      midY,
      color: conn.color,
      style: conn.connectorStyle,
      label: conn.connectorLabel,
      controlPoint: conn.connectorControlPoint
    };
  }).filter(Boolean);

  // Debug: Log connector status
  if (allConnectors.length > 0 || connectorLines.length > 0) {
    console.log('Connectors:', { total: allConnectors.length, rendered: connectorLines.length, lines: connectorLines });
  }

  return (
    <div
      ref={canvasRef}
      className={`relative flex-1 overflow-hidden bg-gray-100 ${isDragOver ? 'ring-4 ring-inset ring-indigo-500 bg-indigo-50' : ''} ${isDrawingMode ? 'cursor-crosshair' : isPanning ? 'cursor-grabbing' : isPanMode || spacePressed ? 'cursor-grab' : 'cursor-default'}`}
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
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* Grid Background - show dots or lines based on gridSnap */}
      <div 
        className="absolute inset-0 pointer-events-none transition-opacity" 
        style={{ 
          backgroundImage: gridSnap 
            ? `linear-gradient(to right, #e5e7eb 1px, transparent 1px), linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)` 
            : 'radial-gradient(circle, #d1d5db 1px, transparent 1px)', 
          backgroundSize: `${GRID_SIZE * zoom}px ${GRID_SIZE * zoom}px`, 
          backgroundPosition: `${panX}px ${panY}px`,
          opacity: gridSnap ? 0.8 : 1
        }} 
      />

      {/* SVG Layer for Connectors and Drawings */}
      <svg className="absolute inset-0 pointer-events-none" style={{ transform: `translate(${panX}px, ${panY}px) scale(${zoom})`, transformOrigin: 'top left', overflow: 'visible' }}>
        <defs>
          {/* Arrow markers with different colors */}
          <marker id="arrowhead-gray" markerWidth="12" markerHeight="8" refX="10" refY="4" orient="auto">
            <path d="M0,0 L12,4 L0,8 L3,4 Z" fill="#6b7280" />
          </marker>
          <marker id="arrowhead-blue" markerWidth="12" markerHeight="8" refX="10" refY="4" orient="auto">
            <path d="M0,0 L12,4 L0,8 L3,4 Z" fill="#3b82f6" />
          </marker>
          <marker id="arrowhead-green" markerWidth="12" markerHeight="8" refX="10" refY="4" orient="auto">
            <path d="M0,0 L12,4 L0,8 L3,4 Z" fill="#22c55e" />
          </marker>
          <marker id="arrowhead-red" markerWidth="12" markerHeight="8" refX="10" refY="4" orient="auto">
            <path d="M0,0 L12,4 L0,8 L3,4 Z" fill="#ef4444" />
          </marker>
          <marker id="arrowhead-purple" markerWidth="12" markerHeight="8" refX="10" refY="4" orient="auto">
            <path d="M0,0 L12,4 L0,8 L3,4 Z" fill="#8b5cf6" />
          </marker>
          <marker id="arrowhead-orange" markerWidth="12" markerHeight="8" refX="10" refY="4" orient="auto">
            <path d="M0,0 L12,4 L0,8 L3,4 Z" fill="#f97316" />
          </marker>
          <marker id="arrowhead-teal" markerWidth="12" markerHeight="8" refX="10" refY="4" orient="auto">
            <path d="M0,0 L12,4 L0,8 L3,4 Z" fill="#14b8a6" />
          </marker>
          <marker id="arrowhead-pink" markerWidth="12" markerHeight="8" refX="10" refY="4" orient="auto">
            <path d="M0,0 L12,4 L0,8 L3,4 Z" fill="#ec4899" />
          </marker>
        </defs>
        {/* Connector lines with arrows - curved bezier paths */}
        {connectorLines.map((line: any) => {
          // Calculate control points for smooth bezier curve
          const dx = line.x2 - line.x1;
          const dy = line.y2 - line.y1;
          const distance = Math.sqrt(dx * dx + dy * dy);

          // Determine curve direction based on relative positions
          const isHorizontal = Math.abs(dx) > Math.abs(dy);
          const curveStrength = Math.min(distance * 0.4, 100);

          let cx1, cy1, cx2, cy2;
          if (isHorizontal) {
            // Horizontal flow - control points extend in the direction of travel
            // cx1 moves away from start in the direction of dx
            // cx2 moves back from end in the direction opposite to dx (so arrow points correctly)
            cx1 = line.x1 + (dx > 0 ? curveStrength : -curveStrength);
            cy1 = line.y1;
            cx2 = line.x2 + (dx > 0 ? -curveStrength : curveStrength);
            cy2 = line.y2;
          } else {
            // Vertical flow - control points extend in the direction of travel
            cx1 = line.x1;
            cy1 = line.y1 + (dy > 0 ? curveStrength : -curveStrength);
            cx2 = line.x2;
            cy2 = line.y2 + (dy > 0 ? -curveStrength : curveStrength);
          }

          const pathD = `M ${line.x1} ${line.y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${line.x2} ${line.y2}`;

          // Get arrow color marker
          const getMarker = (color: string) => {
            if (color?.includes('3b82f6') || color?.includes('blue')) return 'url(#arrowhead-blue)';
            if (color?.includes('22c55e') || color?.includes('green')) return 'url(#arrowhead-green)';
            if (color?.includes('ef4444') || color?.includes('red')) return 'url(#arrowhead-red)';
            if (color?.includes('8b5cf6') || color?.includes('purple')) return 'url(#arrowhead-purple)';
            if (color?.includes('f97316') || color?.includes('orange')) return 'url(#arrowhead-orange)';
            if (color?.includes('14b8a6') || color?.includes('teal')) return 'url(#arrowhead-teal)';
            if (color?.includes('ec4899') || color?.includes('pink')) return 'url(#arrowhead-pink)';
            return 'url(#arrowhead-gray)';
          };

          // Label position is calculated in the overlay div below

          return (
            <g key={line.id}>
              {/* Shadow path */}
              <path
                d={pathD}
                fill="none"
                stroke="rgba(0,0,0,0.08)"
                strokeWidth="4"
                strokeLinecap="round"
              />
              {/* Main curved path */}
              <path
                d={pathD}
                fill="none"
                stroke={line.color || '#6b7280'}
                strokeWidth="2"
                strokeDasharray={line.style === 'dashed' ? '8,4' : line.style === 'dotted' ? '2,4' : undefined}
                strokeLinecap="round"
                markerEnd={getMarker(line.color)}
              />
              {/* Label is rendered in the overlay div below for interactivity */}
            </g>
          );
        })}
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
        {/* Current drawing in progress - use refs for real-time feedback */}
        {isDrawingRef.current && currentPathRef.current.length > 0 && (
          <path
            key={`drawing-${drawingTick}`}
            d={currentPathRef.current.reduce((acc, point, i) => i === 0 ? `M ${point.x} ${point.y}` : `${acc} L ${point.x} ${point.y}`, '')}
            stroke={drawingColor || '#3b82f6'}
            strokeWidth={drawingWidth || 3}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>

      {/* Connector interactive overlays for labels and handles */}
      <div className="absolute inset-0 pointer-events-none" style={{ transform: `translate(${panX}px, ${panY}px) scale(${zoom})`, transformOrigin: 'top left' }}>
        {connectorLines.map((line: any) => {
          const connector = board.visualNodes.find(n => n.id === line.id);
          const isConnectorSelected = selectedNodeIds.includes(line.id);
          
          return (
            <div key={`connector-overlay-${line.id}`}>
              {/* Clickable area along the connector path for selection */}
              <div
                className="absolute pointer-events-auto cursor-pointer"
                style={{
                  left: Math.min(line.x1, line.x2) - 10,
                  top: Math.min(line.y1, line.y2) - 10,
                  width: Math.abs(line.x2 - line.x1) + 20,
                  height: Math.abs(line.y2 - line.y1) + 20,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectNodes([line.id]);
                }}
              />
              
              {/* Label input at midpoint */}
              <div
                className="absolute pointer-events-auto"
                style={{
                  left: line.midX - 50,
                  top: line.midY - 12,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="text"
                  value={connector?.connectorLabel || ''}
                  onChange={(e) => {
                    onUpdateWithHistory({
                      visualNodes: board.visualNodes.map(n => 
                        n.id === line.id ? { ...n, connectorLabel: e.target.value } : n
                      )
                    }, 'Update connector label');
                  }}
                  placeholder="Label..."
                  className={`w-24 text-center text-xs px-2 py-1 rounded border bg-white/90 backdrop-blur-sm transition-all ${
                    isConnectorSelected || connector?.connectorLabel 
                      ? 'opacity-100 border-gray-300' 
                      : 'opacity-0 hover:opacity-100 border-transparent'
                  }`}
                  style={{ color: line.color || '#6b7280' }}
                />
              </div>
              
              {/* Control handles when selected */}
              {isConnectorSelected && (
                <>
                  {/* Start handle */}
                  <div
                    className="absolute w-3 h-3 bg-indigo-500 rounded-full border-2 border-white shadow-md pointer-events-auto cursor-move"
                    style={{
                      left: line.x1 - 6,
                      top: line.y1 - 6,
                    }}
                    title="Start point"
                  />
                  {/* End handle */}
                  <div
                    className="absolute w-3 h-3 bg-indigo-500 rounded-full border-2 border-white shadow-md pointer-events-auto cursor-move"
                    style={{
                      left: line.x2 - 6,
                      top: line.y2 - 6,
                    }}
                    title="End point"
                  />
                  {/* Midpoint control for curve */}
                  <div
                    className="absolute w-4 h-4 bg-white border-2 border-indigo-500 rounded-full shadow-md pointer-events-auto cursor-move flex items-center justify-center"
                    style={{
                      left: line.midX - 8,
                      top: line.midY - 8,
                    }}
                    title="Drag to adjust curve"
                  >
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                  </div>
                  
                  {/* Connector toolbar */}
                  <div
                    className="absolute bg-white rounded-lg shadow-lg border border-gray-200 p-1.5 flex items-center gap-1 pointer-events-auto"
                    style={{
                      left: line.midX - 160,
                      top: line.midY + 20,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Line style */}
                    <button
                      onClick={() => onUpdateWithHistory({
                        visualNodes: board.visualNodes.map(n => 
                          n.id === line.id ? { ...n, connectorStyle: 'solid' } : n
                        )
                      }, 'Solid line')}
                      className={`p-1.5 rounded ${connector?.connectorStyle !== 'dashed' && connector?.connectorStyle !== 'dotted' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                      title="Solid"
                    >
                      <Minus className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => onUpdateWithHistory({
                        visualNodes: board.visualNodes.map(n => 
                          n.id === line.id ? { ...n, connectorStyle: 'dashed' } : n
                        )
                      }, 'Dashed line')}
                      className={`p-1.5 rounded ${connector?.connectorStyle === 'dashed' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                      title="Dashed"
                    >
                      <span className="text-xs font-mono text-gray-600">- -</span>
                    </button>
                    <button
                      onClick={() => onUpdateWithHistory({
                        visualNodes: board.visualNodes.map(n => 
                          n.id === line.id ? { ...n, connectorStyle: 'dotted' } : n
                        )
                      }, 'Dotted line')}
                      className={`p-1.5 rounded ${connector?.connectorStyle === 'dotted' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                      title="Dotted"
                    >
                      <span className="text-xs font-mono text-gray-600">···</span>
                    </button>
                    <div className="w-px h-5 bg-gray-200" />
                    {/* Colors */}
                    <button onClick={() => onUpdateWithHistory({ visualNodes: board.visualNodes.map(n => n.id === line.id ? { ...n, color: '#6b7280' } : n) }, 'Gray')} className={`w-5 h-5 rounded bg-gray-500 hover:ring-2 ring-gray-300 ${connector?.color === '#6b7280' ? 'ring-2 ring-indigo-500' : ''}`} title="Gray" />
                    <button onClick={() => onUpdateWithHistory({ visualNodes: board.visualNodes.map(n => n.id === line.id ? { ...n, color: '#3b82f6' } : n) }, 'Blue')} className={`w-5 h-5 rounded bg-blue-500 hover:ring-2 ring-gray-300 ${connector?.color === '#3b82f6' ? 'ring-2 ring-indigo-500' : ''}`} title="Blue" />
                    <button onClick={() => onUpdateWithHistory({ visualNodes: board.visualNodes.map(n => n.id === line.id ? { ...n, color: '#22c55e' } : n) }, 'Green')} className={`w-5 h-5 rounded bg-green-500 hover:ring-2 ring-gray-300 ${connector?.color === '#22c55e' ? 'ring-2 ring-indigo-500' : ''}`} title="Green" />
                    <button onClick={() => onUpdateWithHistory({ visualNodes: board.visualNodes.map(n => n.id === line.id ? { ...n, color: '#ef4444' } : n) }, 'Red')} className={`w-5 h-5 rounded bg-red-500 hover:ring-2 ring-gray-300 ${connector?.color === '#ef4444' ? 'ring-2 ring-indigo-500' : ''}`} title="Red" />
                    <button onClick={() => onUpdateWithHistory({ visualNodes: board.visualNodes.map(n => n.id === line.id ? { ...n, color: '#8b5cf6' } : n) }, 'Purple')} className={`w-5 h-5 rounded bg-purple-500 hover:ring-2 ring-gray-300 ${connector?.color === '#8b5cf6' ? 'ring-2 ring-indigo-500' : ''}`} title="Purple" />
                    <button onClick={() => onUpdateWithHistory({ visualNodes: board.visualNodes.map(n => n.id === line.id ? { ...n, color: '#f97316' } : n) }, 'Orange')} className={`w-5 h-5 rounded bg-orange-500 hover:ring-2 ring-gray-300 ${connector?.color === '#f97316' ? 'ring-2 ring-indigo-500' : ''}`} title="Orange" />
                    <button onClick={() => onUpdateWithHistory({ visualNodes: board.visualNodes.map(n => n.id === line.id ? { ...n, color: '#14b8a6' } : n) }, 'Teal')} className={`w-5 h-5 rounded bg-teal-500 hover:ring-2 ring-gray-300 ${connector?.color === '#14b8a6' ? 'ring-2 ring-indigo-500' : ''}`} title="Teal" />
                    <button onClick={() => onUpdateWithHistory({ visualNodes: board.visualNodes.map(n => n.id === line.id ? { ...n, color: '#ec4899' } : n) }, 'Pink')} className={`w-5 h-5 rounded bg-pink-500 hover:ring-2 ring-gray-300 ${connector?.color === '#ec4899' ? 'ring-2 ring-indigo-500' : ''}`} title="Pink" />
                    <div className="w-px h-5 bg-gray-200" />
                    {/* Delete */}
                    <button
                      onClick={() => {
                        onUpdateWithHistory({ visualNodes: board.visualNodes.filter(n => n.id !== line.id) }, 'Delete connector');
                        onSelectNodes([]);
                      }}
                      className="p-1.5 rounded hover:bg-red-100"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Selection Rectangle (Marquee) */}
      {isLassoing && lassoStart && lassoEnd && (
        <div
          className="absolute border-2 border-indigo-500 bg-indigo-500/10 pointer-events-none z-40"
          style={{
            left: Math.min(lassoStart.x, lassoEnd.x),
            top: Math.min(lassoStart.y, lassoEnd.y),
            width: Math.abs(lassoEnd.x - lassoStart.x),
            height: Math.abs(lassoEnd.y - lassoStart.y),
          }}
        />
      )}

      {/* Drop Zone Indicator */}
      {isDragOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-indigo-500/10 pointer-events-none z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center border-2 border-dashed border-indigo-500">
            <Upload className="w-12 h-12 text-indigo-500 mx-auto mb-3" />
            <p className="text-lg font-semibold text-gray-800">Drop image or video here</p>
            <p className="text-sm text-gray-500 mt-1">Supported: JPG, PNG, GIF, MP4, WebM</p>
          </div>
        </div>
      )}

      {/* Drawing Mode Indicator */}
      {isDrawingMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg z-50 flex items-center gap-2 pointer-events-none">
          <Pencil className="w-4 h-4" />
          Drawing mode active • Draw on canvas
        </div>
      )}

      {/* Pan Mode Indicator */}
      {(spacePressed || isPanMode) && !isDrawingMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-gray-700 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg z-50 flex items-center gap-2 pointer-events-none">
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

      {/* Multi-Selection Toolbar */}
      {selectedNodeIds.length > 1 && !isLassoing && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-4 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-xl border border-gray-200 px-2 py-1.5 flex items-center gap-1 z-50"
        >
          <span className="px-2 text-sm font-medium text-gray-600">{selectedNodeIds.length} selected</span>
          <div className="w-px h-6 bg-gray-200" />
          <button
            onClick={() => {
              // Group move - already handled by drag
            }}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 hover:text-gray-900 transition-colors"
            title="Drag to move all"
          >
            <Move className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              // Duplicate selected nodes
              const newNodes = board.visualNodes
                .filter(n => selectedNodeIds.includes(n.id))
                .map(n => ({
                  ...n,
                  id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  x: n.x + 20,
                  y: n.y + 20
                }));
              onUpdateWithHistory({ visualNodes: [...board.visualNodes, ...newNodes] }, 'Duplicate elements');
              onSelectNodes(newNodes.map(n => n.id));
            }}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 hover:text-gray-900 transition-colors"
            title="Duplicate (Ctrl+D)"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              // Align left
              const minX = Math.min(...board.visualNodes.filter(n => selectedNodeIds.includes(n.id)).map(n => n.x));
              onUpdateWithHistory({
                visualNodes: board.visualNodes.map(n => 
                  selectedNodeIds.includes(n.id) ? { ...n, x: minX } : n
                )
              }, 'Align left');
            }}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 hover:text-gray-900 transition-colors"
            title="Align left"
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              // Align center horizontally
              const nodes = board.visualNodes.filter(n => selectedNodeIds.includes(n.id));
              const centerX = nodes.reduce((acc, n) => acc + n.x + n.width / 2, 0) / nodes.length;
              onUpdateWithHistory({
                visualNodes: board.visualNodes.map(n => 
                  selectedNodeIds.includes(n.id) ? { ...n, x: centerX - n.width / 2 } : n
                )
              }, 'Align center');
            }}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 hover:text-gray-900 transition-colors"
            title="Align center"
          >
            <AlignCenter className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              // Align top
              const minY = Math.min(...board.visualNodes.filter(n => selectedNodeIds.includes(n.id)).map(n => n.y));
              onUpdateWithHistory({
                visualNodes: board.visualNodes.map(n => 
                  selectedNodeIds.includes(n.id) ? { ...n, y: minY } : n
                )
              }, 'Align top');
            }}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 hover:text-gray-900 transition-colors"
            title="Align top"
          >
            <AlignStartVertical className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-gray-200" />
          <button
            onClick={() => {
              onUpdateWithHistory({ visualNodes: board.visualNodes.filter(n => !selectedNodeIds.includes(n.id)) }, 'Delete elements');
              onSelectNodes([]);
            }}
            className="p-2 hover:bg-red-100 rounded-lg text-red-500 hover:text-red-700 transition-colors"
            title="Delete (Del)"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onSelectNodes([])}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
            title="Deselect all"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      <motion.div className="absolute origin-top-left pointer-events-none" style={{ transform: `translate(${panX}px, ${panY}px) scale(${zoom})` }}>
        <AnimatePresence>
          {board.visualNodes.filter(n => !(n.type === 'connector' && n.connectorFrom && n.connectorTo)).map(node => (
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
              zoom={zoom}
              selectedCount={selectedNodeIds.length}
              isDrawingMode={isDrawingMode}
              onContextMenuOpen={onDisablePanMode}
              connectingFrom={connectingFrom}
            />
          ))}
        </AnimatePresence>
      </motion.div>
      <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 bg-white/95 sm:bg-white backdrop-blur-sm sm:backdrop-blur-none rounded-xl shadow-lg p-1.5 sm:p-2 flex items-center gap-1 border border-gray-200 z-30">
        {/* Select/Pan Tools - desktop only */}
        {onSetSelectMode && (
          <button 
            onClick={onSetSelectMode} 
            className={`hidden sm:block p-2 rounded-lg transition-colors ${!isPanMode && !isDrawingMode ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-gray-100 text-gray-600'}`} 
            title="Select (V)"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
              <path d="M13 13l6 6" />
            </svg>
          </button>
        )}
        {onSetPanMode && (
          <button 
            onClick={onSetPanMode} 
            className={`hidden sm:block p-2 rounded-lg transition-colors ${isPanMode ? 'bg-gray-200 text-gray-700' : 'hover:bg-gray-100 text-gray-600'}`} 
            title="Pan (H)"
          >
            <Move className="w-4 h-4" />
          </button>
        )}
        {(onSetSelectMode || onSetPanMode) && <div className="hidden sm:block w-px h-6 bg-gray-200 mx-1" />}
        {/* Zoom Controls */}
        <button onClick={() => setZoom(z => Math.max(z * 0.8, 0.1))} className="p-2 active:bg-gray-100 sm:hover:bg-gray-100 rounded-lg text-gray-600" title="Zoom out (-)"><ZoomOut className="w-4 h-4" /></button>
        <span className="text-xs sm:text-sm font-medium w-10 sm:w-14 text-center text-gray-700">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(z => Math.min(z * 1.2, 5))} className="p-2 active:bg-gray-100 sm:hover:bg-gray-100 rounded-lg text-gray-600" title="Zoom in (+)"><ZoomIn className="w-4 h-4" /></button>
        <div className="w-px h-5 sm:h-6 bg-gray-200 mx-0.5 sm:mx-1" />
        <button onClick={() => { setZoom(1); setPanX(0); setPanY(0); }} className="p-2 active:bg-gray-100 sm:hover:bg-gray-100 rounded-lg text-gray-600" title="Reset view (0)"><Maximize2 className="w-4 h-4" /></button>
        <button
          onClick={() => {
            const nodes = board.visualNodes.filter(n => !(n.type === 'connector' && n.connectorFrom && n.connectorTo));
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
          className="hidden sm:block p-2 hover:bg-gray-100 rounded-lg text-gray-600"
          title="Fit all content"
        >
          <Minimize2 className="w-4 h-4" />
        </button>
      </div>
      {/* Keyboard shortcuts hint - desktop only */}
      <div className="hidden sm:block absolute bottom-4 left-4 text-xs text-gray-400 z-30 space-y-0.5">
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
      
      {/* Other Users' Cursors - Enhanced Collaboration Overlay */}
      <CollaborationOverlay
        cursors={cursorMap}
        zoom={zoom}
        panX={panX}
        panY={panY}
        showCursors={showCursors}
      />
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
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // Calculate bounds of all nodes (with minimum size for empty canvas)
  const bounds = nodes.length > 0 ? {
    minX: Math.min(...nodes.map(n => n.x)) - 200,
    maxX: Math.max(...nodes.map(n => n.x + n.width)) + 200,
    minY: Math.min(...nodes.map(n => n.y)) - 200,
    maxY: Math.max(...nodes.map(n => n.y + n.height)) + 200,
  } : { minX: -500, maxX: 1500, minY: -500, maxY: 1500 };
  
  const contentWidth = Math.max(bounds.maxX - bounds.minX, 1000);
  const contentHeight = Math.max(bounds.maxY - bounds.minY, 800);
  const minimapWidth = 200;
  const minimapHeight = 140;
  const scale = Math.min(minimapWidth / contentWidth, minimapHeight / contentHeight, 0.15);
  
  // Viewport rectangle position and size
  const viewportWidth = Math.max((canvasWidth / zoom) * scale, 10);
  const viewportHeight = Math.max((canvasHeight / zoom) * scale, 10);
  const viewportX = ((-panX / zoom) - bounds.minX) * scale;
  const viewportY = ((-panY / zoom) - bounds.minY) * scale;

  const handleViewportMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    // Calculate offset from viewport center
    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      setDragOffset({
        x: mouseX - viewportX - viewportWidth / 2,
        y: mouseY - viewportY - viewportHeight / 2
      });
    }
  };

  const handleMinimapClick = (e: React.MouseEvent) => {
    if (isDragging) return;
    if (!svgRef.current) return;
    
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Convert minimap coordinates to canvas coordinates and center viewport there
    const canvasX = (x / scale) + bounds.minX;
    const canvasY = (y / scale) + bounds.minY;
    
    const newPanX = -(canvasX - (canvasWidth / zoom / 2)) * zoom;
    const newPanY = -(canvasY - (canvasHeight / zoom / 2)) * zoom;
    
    onPan(newPanX, newPanY);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !svgRef.current) return;
    
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - dragOffset.x;
    const mouseY = e.clientY - rect.top - dragOffset.y;
    
    // Convert to canvas coordinates (viewport center)
    const canvasX = (mouseX / scale) + bounds.minX;
    const canvasY = (mouseY / scale) + bounds.minY;
    
    const newPanX = -(canvasX - (canvasWidth / zoom / 2)) * zoom;
    const newPanY = -(canvasY - (canvasHeight / zoom / 2)) * zoom;
    
    onPan(newPanX, newPanY);
  }, [isDragging, dragOffset, scale, bounds, canvasWidth, canvasHeight, zoom, onPan]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div 
      ref={minimapRef}
      className="absolute bottom-20 right-4 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-2 z-40"
      style={{ width: minimapWidth + 16, height: minimapHeight + 32 }}
    >
      <div className="flex items-center justify-between mb-1 px-1">
        <span className="text-[10px] font-medium text-gray-400 flex items-center gap-1">
          <Map className="w-3 h-3" /> Minimap
        </span>
        <span className="text-[9px] text-gray-300">Drag viewport to pan</span>
      </div>
      <svg 
        ref={svgRef}
        width={minimapWidth} 
        height={minimapHeight} 
        className="cursor-pointer rounded"
        onClick={handleMinimapClick}
      >
        {/* Grid background */}
        <rect x="0" y="0" width={minimapWidth} height={minimapHeight} fill="#f3f4f6" rx="4" />
        
        {/* Grid lines */}
        {Array.from({ length: 10 }).map((_, i) => (
          <g key={i}>
            <line x1={i * minimapWidth / 10} y1="0" x2={i * minimapWidth / 10} y2={minimapHeight} stroke="#e5e7eb" strokeWidth="0.5" />
            <line x1="0" y1={i * minimapHeight / 10} x2={minimapWidth} y2={i * minimapHeight / 10} stroke="#e5e7eb" strokeWidth="0.5" />
          </g>
        ))}
        
        {/* Nodes */}
        {nodes.filter(n => !(n.type === 'connector' && n.connectorFrom && n.connectorTo)).map(node => (
          <rect
            key={node.id}
            x={(node.x - bounds.minX) * scale}
            y={(node.y - bounds.minY) * scale}
            width={Math.max(node.width * scale, 3)}
            height={Math.max(node.height * scale, 3)}
            fill={node.color || '#dbeafe'}
            stroke="#9ca3af"
            strokeWidth="0.5"
            rx="1"
          />
        ))}
        
        {/* Viewport indicator - draggable */}
        <rect
          x={viewportX}
          y={viewportY}
          width={viewportWidth}
          height={viewportHeight}
          fill="rgba(99, 102, 241, 0.15)"
          stroke="#6366f1"
          strokeWidth="2"
          rx="3"
          className={`cursor-grab ${isDragging ? 'cursor-grabbing' : ''}`}
          style={{ pointerEvents: 'all' }}
          onMouseDown={handleViewportMouseDown}
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

// Presentation Mode Components - Imported from separate files
import { PresentationMode } from './components/PresentationMode';
import { SlideOrderPanel } from './components/SlideOrderPanel';
import { extractSlidesFromBoard } from './lib/presentation';

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

// Note: UserCursor component replaced by CollaborationOverlay which provides
// enhanced cursor rendering with smooth animations and name labels

// Voice to Sticky Component
const VoiceToSticky = ({
  isOpen,
  onClose,
  onCreateSticky
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreateSticky: (content: string) => void;
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const recognitionRef = useRef<any>(null);
  
  useEffect(() => {
    // Check for Web Speech API support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      
      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          }
        }
        if (finalTranscript) {
          setTranscript(prev => prev + ' ' + finalTranscript);
        }
      };
      
      recognitionRef.current.onerror = (event: any) => {
        setError(`Speech recognition error: ${event.error}`);
        setIsListening(false);
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);
  
  const toggleListening = () => {
    if (!recognitionRef.current) {
      setError('Speech recognition not supported in this browser');
      return;
    }
    
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setTranscript('');
      setError('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  };
  
  const handleCreate = () => {
    if (transcript.trim()) {
      onCreateSticky(transcript.trim());
      setTranscript('');
      onClose();
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-2xl p-6 w-[400px]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <MicIcon className="w-5 h-5 text-indigo-600" />
            Voice to Sticky
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        
        {/* Microphone Button */}
        <div className="flex flex-col items-center py-6">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleListening}
            className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
              isListening 
                ? 'bg-red-500 text-white animate-pulse' 
                : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
            }`}
          >
            {isListening ? (
              <StopCircleIcon className="w-12 h-12" />
            ) : (
              <MicIcon className="w-12 h-12" />
            )}
          </motion.button>
          <p className="text-sm text-gray-500 mt-4">
            {isListening ? 'Listening... Click to stop' : 'Click to start speaking'}
          </p>
        </div>
        
        {/* Transcript */}
        {transcript && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Transcript</label>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              className="w-full h-32 p-3 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Your speech will appear here..."
            />
          </div>
        )}
        
        {error && (
          <p className="text-sm text-red-500 mb-4">{error}</p>
        )}
        
        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!transcript.trim()}
            className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Sticky
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// AI Clustering & Ideas Component  
const AIToolsPanel = ({
  isOpen,
  onClose,
  nodes,
  onClusterNodes,
  onGenerateIdeas,
  onAutoGroup
}: {
  isOpen: boolean;
  onClose: () => void;
  nodes: VisualNode[];
  onClusterNodes: (clusters: { name: string; nodeIds: string[] }[]) => void;
  onGenerateIdeas: (ideas: string[]) => void;
  onAutoGroup: () => void;
}) => {
  const [activeTab, setActiveTab] = useState<'cluster' | 'generate' | 'group'>('cluster');
  const [ideaPrompt, setIdeaPrompt] = useState('');
  const [ideaCount, setIdeaCount] = useState(5);
  const [isProcessing, setIsProcessing] = useState(false);
  const [generatedIdeas, setGeneratedIdeas] = useState<string[]>([]);
  
  const stickyNotes = nodes.filter(n => n.type === 'sticky' && n.content.trim());
  
  // Simple clustering based on word similarity
  const handleCluster = () => {
    setIsProcessing(true);
    
    // Simple keyword-based clustering
    const keywords: Record<string, string[]> = {};
    stickyNotes.forEach(note => {
      const words = note.content.toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word.length > 4) { // Only consider words > 4 chars
          if (!keywords[word]) keywords[word] = [];
          keywords[word].push(note.id);
        }
      });
    });
    
    // Find clusters (words that appear in multiple notes)
    const clusters: { name: string; nodeIds: string[] }[] = [];
    Object.entries(keywords)
      .filter(([_, ids]) => ids.length > 1)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 5)
      .forEach(([word, ids]) => {
        clusters.push({ name: word.charAt(0).toUpperCase() + word.slice(1), nodeIds: [...new Set(ids)] });
      });
    
    setTimeout(() => {
      onClusterNodes(clusters);
      setIsProcessing(false);
    }, 1000);
  };
  
  // Generate ideas based on existing content
  const handleGenerateIdeas = () => {
    setIsProcessing(true);
    
    // Extract themes from existing notes
    const existingContent = stickyNotes.map(n => n.content).join(' ');
    const words = existingContent.toLowerCase().split(/\s+/).filter(w => w.length > 4);
    const uniqueWords = [...new Set(words)].slice(0, 10);
    
    // Generate simple ideas based on prompt and existing content
    const templates = [
      `What if we ${ideaPrompt || 'improved'} using ${uniqueWords[0] || 'technology'}?`,
      `Consider ${ideaPrompt || 'exploring'} from a ${uniqueWords[1] || 'customer'} perspective`,
      `How might we combine ${uniqueWords[2] || 'ideas'} with ${uniqueWords[3] || 'innovation'}?`,
      `${ideaPrompt || 'New approach'}: Focus on ${uniqueWords[4] || 'value'}`,
      `Experiment with ${uniqueWords[5] || 'different'} ${ideaPrompt || 'methods'}`,
      `Challenge: ${ideaPrompt || 'Rethink'} the ${uniqueWords[6] || 'process'}`,
      `Opportunity: ${uniqueWords[7] || 'Leverage'} ${ideaPrompt || 'strengths'}`,
    ];
    
    const ideas = templates.slice(0, ideaCount);
    
    setTimeout(() => {
      setGeneratedIdeas(ideas);
      setIsProcessing(false);
    }, 1500);
  };
  
  const handleAddIdeas = () => {
    onGenerateIdeas(generatedIdeas);
    setGeneratedIdeas([]);
    onClose();
  };
  
  if (!isOpen) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="absolute top-4 right-4 w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden"
    >
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold text-gray-900">AI Tools</h3>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        {[
          { id: 'cluster', label: 'Cluster', icon: Shuffle },
          { id: 'generate', label: 'Generate', icon: Lightbulb },
          { id: 'group', label: 'Auto-Group', icon: Layout },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
              activeTab === tab.id 
                ? 'text-purple-700 border-b-2 border-purple-600 bg-purple-50' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>
      
      <div className="p-4">
        {activeTab === 'cluster' && (
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Find patterns and group similar sticky notes automatically based on content.
            </p>
            <div className="bg-gray-50 rounded-xl p-3 mb-4">
              <p className="text-xs text-gray-500">Analyzing {stickyNotes.length} sticky notes</p>
            </div>
            <button
              onClick={handleCluster}
              disabled={isProcessing || stickyNotes.length < 2}
              className="w-full py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shuffle className="w-4 h-4" />}
              {isProcessing ? 'Analyzing...' : 'Find Clusters'}
            </button>
          </div>
        )}
        
        {activeTab === 'generate' && (
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Generate new ideas based on your current content and a prompt.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Idea prompt (optional)</label>
              <input
                type="text"
                value={ideaPrompt}
                onChange={(e) => setIdeaPrompt(e.target.value)}
                placeholder="e.g., improve customer experience"
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Number of ideas: {ideaCount}</label>
              <input
                type="range"
                min="3"
                max="10"
                value={ideaCount}
                onChange={(e) => setIdeaCount(Number(e.target.value))}
                className="w-full"
              />
            </div>
            
            {generatedIdeas.length > 0 && (
              <div className="mb-4 space-y-2">
                <label className="block text-sm font-medium text-gray-700">Generated Ideas</label>
                {generatedIdeas.map((idea, i) => (
                  <div key={i} className="p-3 bg-yellow-50 rounded-lg text-sm text-gray-700 border border-yellow-200">
                    💡 {idea}
                  </div>
                ))}
                <button
                  onClick={handleAddIdeas}
                  className="w-full py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 font-medium flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add All to Canvas
                </button>
              </div>
            )}
            
            <button
              onClick={handleGenerateIdeas}
              disabled={isProcessing}
              className="w-full py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lightbulb className="w-4 h-4" />}
              {isProcessing ? 'Generating...' : 'Generate Ideas'}
            </button>
          </div>
        )}
        
        {activeTab === 'group' && (
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Automatically organize ungrouped sticky notes into themed frames based on content similarity.
            </p>
            <div className="bg-gray-50 rounded-xl p-3 mb-4">
              <p className="text-xs text-gray-500">{stickyNotes.length} sticky notes will be analyzed</p>
            </div>
            <button
              onClick={() => { setIsProcessing(true); setTimeout(() => { onAutoGroup(); setIsProcessing(false); onClose(); }, 1500); }}
              disabled={isProcessing || stickyNotes.length < 3}
              className="w-full py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layout className="w-4 h-4" />}
              {isProcessing ? 'Grouping...' : 'Auto-Group Notes'}
            </button>
          </div>
        )}
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

// Transcript Panel (Legacy - kept for backward compatibility but disabled)
// @ts-ignore - Kept for backward compatibility
const _TranscriptPanel = ({
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
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  if (!isOpen) return null;
  
  const categories: { id: TemplateCategory | 'all'; label: string; icon: string }[] = [
    { id: 'all', label: 'All Templates', icon: '📚' },
    { id: 'strategy', label: 'Strategy', icon: '🎯' },
    { id: 'design', label: 'Design & Ideation', icon: '💡' },
    { id: 'workflow', label: 'Workflow & Process', icon: '⚙️' },
    { id: 'agile', label: 'Agile & Scrum', icon: '🔄' },
    { id: 'meetings', label: 'Meetings', icon: '👥' },
    { id: 'research', label: 'Research', icon: '🔍' },
    { id: 'planning', label: 'Planning', icon: '📋' },
  ];
  
  const filteredTemplates = BOARD_TEMPLATES.filter(t => {
    const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCategoryColor = (category: TemplateCategory): string => {
    const colors: Record<TemplateCategory, string> = {
      strategy: 'bg-blue-100 text-blue-700',
      design: 'bg-purple-100 text-purple-700',
      workflow: 'bg-amber-100 text-amber-700',
      agile: 'bg-green-100 text-green-700',
      meetings: 'bg-pink-100 text-pink-700',
      research: 'bg-cyan-100 text-cyan-700',
      planning: 'bg-indigo-100 text-indigo-700',
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000]" onClick={onClose}>
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white rounded-2xl w-[900px] max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Template Gallery</h2>
              <p className="text-sm text-gray-500">Choose a template to jumpstart your whiteboard session</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
        
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Categories */}
          <div className="w-56 border-r border-gray-100 p-4 bg-gray-50 overflow-y-auto">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-3">Categories</p>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`w-full text-left px-3 py-2 rounded-lg mb-1 flex items-center gap-2 transition-all ${
                  selectedCategory === cat.id 
                    ? 'bg-indigo-100 text-indigo-700 font-medium' 
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <span>{cat.icon}</span>
                <span className="text-sm">{cat.label}</span>
                {cat.id !== 'all' && (
                  <span className="ml-auto text-xs text-gray-400">
                    {BOARD_TEMPLATES.filter(t => t.category === cat.id).length}
                  </span>
                )}
              </button>
            ))}
          </div>
          
          {/* Templates Grid */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">{filteredTemplates.length} templates</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {filteredTemplates.map(template => {
                const Icon = template.icon;
                return (
                  <motion.button 
                    key={template.id} 
                    whileHover={{ scale: 1.02, y: -2 }} 
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { onSelectTemplate(template); onClose(); }} 
                    className="flex flex-col items-start p-4 rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-lg text-left bg-white transition-all"
                  >
                    <div className="flex items-start gap-3 w-full mb-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Icon className="w-6 h-6 text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{template.name}</p>
                        <p className="text-xs text-gray-500 line-clamp-2">{template.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getCategoryColor(template.category)}`}>
                        {template.category}
                      </span>
                      <span className="text-[10px] text-gray-400 ml-auto">
                        {template.nodes.length} elements
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
            
            {filteredTemplates.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <Layout className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No templates found</p>
                <p className="text-sm">Try adjusting your search or category</p>
              </div>
            )}
          </div>
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

// Action Items Panel (Legacy - now part of UnifiedSidebar)
// @ts-ignore - Kept for potential future use
const _ActionItemsPanel = ({ actionItems, onToggleComplete, onAddAction, onAssignUser, isMinimized, onToggleMinimize }: { actionItems: ActionItem[]; onToggleComplete: (id: string) => void; onAddAction: (content: string) => void; onAssignUser: (id: string, assigneeId: string | undefined) => void; isMinimized: boolean; onToggleMinimize: () => void }) => {
  const [newAction, setNewAction] = useState('');
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState<string | null>(null);
  const pendingCount = actionItems.filter(a => !a.isComplete).length;
  const completedCount = actionItems.filter(a => a.isComplete).length;

  // Minimized view - compact pill that stacks below transcript
  if (isMinimized) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="absolute right-4 top-[72px] z-[99]"
      >
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onToggleMinimize}
          className="flex items-center gap-2.5 px-4 py-2.5 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/80 hover:bg-white hover:shadow-xl transition-all"
        >
          <div className="relative flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-100">
            <ListTodo className="w-3.5 h-3.5 text-emerald-600" />
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </div>
          <div className="flex flex-col items-start">
            <span className="text-sm font-semibold text-gray-800 leading-tight">Actions</span>
            <span className="text-xs text-gray-500 leading-tight">
              {pendingCount > 0 ? `${pendingCount} pending` : completedCount > 0 ? `${completedCount} done` : 'Add tasks'}
            </span>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400 ml-1" />
        </motion.button>
      </motion.div>
    );
  }

  // Expanded view - positioned below transcript pill
  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -20, opacity: 0 }}
      className="absolute right-4 top-[72px] w-[360px] bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/80 z-[99] max-h-[380px] flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="p-3.5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <ListTodo className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Action Items</h3>
            <p className="text-xs text-white/80">
              {pendingCount > 0 ? `${pendingCount} pending` : 'All done!'}
              {completedCount > 0 && ` · ${completedCount} completed`}
            </p>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onToggleMinimize}
          className="p-1.5 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
        >
          <ChevronUp className="w-4 h-4" />
        </motion.button>
      </div>

      {/* Add new action */}
      <div className="p-3 border-b border-gray-100 bg-gray-50/50">
        <div className="flex gap-2">
          <input
            type="text"
            value={newAction}
            onChange={(e) => setNewAction(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && newAction.trim()) { onAddAction(newAction); setNewAction(''); }}}
            placeholder="Add new action item..."
            className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { if (newAction.trim()) { onAddAction(newAction); setNewAction(''); }}}
            className="px-3 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </motion.button>
        </div>
      </div>

      {/* Action items list */}
      <div className="flex-1 overflow-y-auto p-2">
        <AnimatePresence mode="popLayout">
          {actionItems.map(item => {
            const assignee = PARTICIPANTS.find(p => p.id === item.assigneeId);
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                layout
                className={`flex items-start gap-3 p-3 rounded-xl mb-2 transition-colors ${
                  item.isComplete
                    ? 'bg-gray-50/80'
                    : 'bg-white border border-gray-100 shadow-sm hover:shadow-md'
                }`}
              >
                <motion.button
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onToggleComplete(item.id)}
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                    item.isComplete
                      ? 'bg-emerald-500 border-emerald-500'
                      : 'border-gray-300 hover:border-emerald-400'
                  }`}
                >
                  {item.isComplete && <Check className="w-3 h-3 text-white" />}
                </motion.button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-snug ${item.isComplete ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                    {item.content}
                  </p>
                  <div className="flex items-center gap-2 mt-2 relative">
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowAssigneeDropdown(showAssigneeDropdown === item.id ? null : item.id); }}
                      className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md transition-colors ${
                        assignee
                          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {assignee ? (
                        <>
                          <div className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] font-bold" style={{ backgroundColor: assignee.color }}>{assignee.name.charAt(0)}</div>
                          <span>{assignee.name}</span>
                        </>
                      ) : (
                        <>
                          <Users className="w-3.5 h-3.5" />
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
                          className="absolute left-0 top-full mt-1 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-[150] w-36"
                        >
                          <button onClick={() => { onAssignUser(item.id, undefined); setShowAssigneeDropdown(null); }} className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 text-gray-500">Unassigned</button>
                          {PARTICIPANTS.map(p => (
                            <button key={p.id} onClick={() => { onAssignUser(item.id, p.id); setShowAssigneeDropdown(null); }} className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 flex items-center gap-2">
                              <div className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] font-bold" style={{ backgroundColor: p.color }}>{p.name.charAt(0)}</div>
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
          <div className="text-center py-8 text-gray-400">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <ListTodo className="w-6 h-6 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-500">No action items yet</p>
            <p className="text-xs mt-1">Add your first task above</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Timer Component for facilitation - positioned at top center for visibility
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
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -50, opacity: 0 }}
      className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/80 p-4 z-[200] w-72"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isRunning ? 'bg-orange-100' : 'bg-indigo-100'}`}>
            <Timer className={`w-4 h-4 ${isRunning ? 'text-orange-600' : 'text-indigo-600'}`} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 text-sm">Session Timer</h3>
            <p className="text-xs text-gray-500">{isRunning ? 'Running' : 'Paused'}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Timer display */}
      <div className={`text-5xl font-mono font-bold text-center py-5 rounded-xl mb-3 transition-colors ${
        timeLeft === 0 ? 'bg-red-50 text-red-600 animate-pulse' :
        timeLeft < 60 ? 'bg-orange-50 text-orange-600' :
        isRunning ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-50 text-gray-800'
      }`}>
        {formatTime(timeLeft)}
      </div>

      {/* Controls */}
      <div className="flex gap-2 mb-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsRunning(!isRunning)}
          className={`flex-1 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors ${
            isRunning ? 'bg-orange-500 text-white hover:bg-orange-600' : 'bg-emerald-500 text-white hover:bg-emerald-600'
          }`}
        >
          {isRunning ? <><Pause className="w-4 h-4" />Pause</> : <><Play className="w-4 h-4" />Start</>}
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setTimeLeft(presetMinutes * 60)}
          className="p-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </motion.button>
      </div>

      {/* Presets */}
      <div className="flex gap-1.5">
        {[1, 3, 5, 10, 15].map(mins => (
          <button
            key={mins}
            onClick={() => setPreset(mins)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
              presetMinutes === mins
                ? 'bg-indigo-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {mins}m
          </button>
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
      className="absolute right-4 top-4 w-[380px] bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/80 z-[150] flex flex-col max-h-[calc(100vh-120px)]"
    >
      {/* Header with gradient */}
      <div className="p-3.5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-t-2xl">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <span className="font-semibold text-sm">Fan AI Assistant</span>
            <p className="text-xs text-white/70">Powered by AI</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Selected nodes indicator */}
      {selectedNodes.length > 0 && (
        <div className="px-4 py-2.5 bg-purple-50/80 border-b border-purple-100/50 text-xs text-purple-700 flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-purple-200 flex items-center justify-center text-purple-700 font-bold text-[10px]">
            {selectedNodes.length}
          </div>
          <div>
            <span className="font-medium">element{selectedNodes.length > 1 ? 's' : ''} selected</span>
            {selectedNodes.length === 1 && selectedNodes[0].content && (
              <p className="truncate text-purple-500 mt-0.5">"{selectedNodes[0].content.substring(0, 40)}..."</p>
            )}
          </div>
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
const MeetingView = ({ board, onUpdateBoard, onBack, onCreateAISummary, onCreateTranscriptNote }: {
  board: Board;
  onUpdateBoard: (updates: Partial<Board>) => void;
  onBack: () => void;
  onCreateAISummary?: (boardId: string, boardName: string, summary: string) => void;
  onCreateTranscriptNote?: (boardId: string, boardName: string, transcriptContent: string, startTime: Date, endTime: Date) => void;
}) => {
  // Get authenticated user (if logged in)
  const auth = useAuthOptional();
  const authUserName = auth?.user?.full_name;
  const authLoading = auth?.loading ?? true; // Assume loading if no auth context
  const isAuthenticated = auth?.isAuthenticated ?? false;

  // Check if user is a guest collaborator
  const isGuestCollaborator = (() => {
    try {
      const collabUser = localStorage.getItem('fan-canvas-collab-user');
      if (!collabUser) return false;
      const parsed = JSON.parse(collabUser);
      const joinedAt = new Date(parsed.joinedAt);
      const hoursSinceJoin = (Date.now() - joinedAt.getTime()) / (1000 * 60 * 60);
      return hoursSinceJoin < 24 && !!parsed.name;
    } catch {
      return false;
    }
  })();

  // User state - for guests, use their collaborator name; for logged-in users, use auth name; fallback to localStorage
  const [currentUser, setCurrentUser] = useState(() => {
    // Check for guest collaborator first
    if (isGuestCollaborator) {
      const guestName = localStorage.getItem('fan-canvas-guest-name') || 'Guest';
      const savedColor = localStorage.getItem('fan-canvas-user-color');
      return {
        id: `guest-${Math.random().toString(36).substr(2, 9)}`,
        name: guestName,
        color: savedColor || `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`,
        isGuest: true
      };
    }
    // Regular user - prefer localStorage first (auth may not be loaded yet)
    const savedName = localStorage.getItem('fan-canvas-user-name');
    const savedColor = localStorage.getItem('fan-canvas-user-color');
    return {
      id: '1',
      name: savedName || 'Guest',
      color: savedColor || `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`,
      isGuest: false
    };
  });
  // Start with prompt hidden - we'll show it only after auth finishes loading and user is not authenticated
  const [isEditingUserName, setIsEditingUserName] = useState(false);
  const [editingUserNameValue, setEditingUserNameValue] = useState(currentUser.name);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingStartTime, setRecordingStartTime] = useState<Date | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  // Load saved transcripts from localStorage first, then fall back to board.transcripts
  const [savedTranscripts, setSavedTranscripts] = useState<SavedTranscript[]>(() => {
    try {
      const stored = localStorage.getItem(`board-transcripts-${board.id}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error loading saved transcripts from localStorage:', e);
    }
    return board.transcripts || [];
  });
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [showMediaModal, setShowMediaModal] = useState<'youtube' | 'image' | 'qr' | null>(null);
  const [_currentSpeaker, _setCurrentSpeaker] = useState('1');
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [isTranscriptMinimized, _setIsTranscriptMinimized] = useState(true);
  const [_isActionsMinimized, _setIsActionsMinimized] = useState(true);
  const [_sidebarCollapsed, _setSidebarCollapsed] = useState(false); // Legacy - now handled by ParticipantsPanel
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
  const [showMobileToolbar, setShowMobileToolbar] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(board.name);
  const timerRef = useRef<NodeJS.Timeout>();
  const nameInputRef = useRef<HTMLInputElement>(null);

  // New feature states
  const [gridSnap, setGridSnap] = useState(false);
  const [showMinimap, setShowMinimap] = useState(true);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [presentationFrameIndex, setPresentationFrameIndex] = useState(0);
  const [showSlideOrderPanel, setShowSlideOrderPanel] = useState(false);
  const [excludedSlides, setExcludedSlides] = useState<Set<string>>(new Set());
  const [slideOrder, setSlideOrder] = useState<string[]>([]);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showClientCommentsPanel, setShowClientCommentsPanel] = useState(false);
  const [clientComments, setClientComments] = useState<ClientComment[]>([]);
  const [showParticipantsPanel, _setShowParticipantsPanel] = useState(true); // Panel always visible for now
  const [showCursorsToggle, setShowCursorsToggle] = useState(true);
  const [followingUserId, setFollowingUserId] = useState<string | null>(null);
  const [recentActivity, setRecentActivity] = useState<ParticipantActivity[]>([]);
  const [_selectedClientCommentId, setSelectedClientCommentId] = useState<string | null>(null);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showAITools, setShowAITools] = useState(false);
  const [showAssetLibrary, setShowAssetLibrary] = useState(false);
  const [showFacilitatorTools, setShowFacilitatorTools] = useState(false);
  const [showTranscriptToWhiteboardModal, setShowTranscriptToWhiteboardModal] = useState(false);
  const [currentTranscriptForWhiteboard, setCurrentTranscriptForWhiteboard] = useState<FullTranscript | null>(null);
  
  // Generate a stable user ID for this session
  const [sessionUserId] = useState(() => `user-${Math.random().toString(36).substr(2, 9)}`);

  // Save user name to localStorage and update state
  const handleSaveUserName = useCallback((name: string) => {
    const trimmedName = name.trim() || 'Guest';
    localStorage.setItem('fan-canvas-user-name', trimmedName);
    localStorage.setItem('fan-canvas-user-color', currentUser.color);
    setCurrentUser(prev => ({ ...prev, name: trimmedName }));
    setIsEditingUserName(false);
  }, [currentUser.color]);

  // Handle auth state changes - update user name or show prompt
  useEffect(() => {
    // Don't do anything while auth is still loading
    if (authLoading) return;
    
    if (isGuestCollaborator) {
      // Guest collaborators don't need the prompt
      setIsEditingUserName(false);
      return;
    }
    
    if (isAuthenticated && authUserName) {
      // User is logged in - use their name and hide prompt
      setCurrentUser(prev => ({ ...prev, name: authUserName }));
      setIsEditingUserName(false);
      setEditingUserNameValue(authUserName);
    } else if (!localStorage.getItem('fan-canvas-user-name')) {
      // Not logged in and no saved name - show the prompt
      setIsEditingUserName(true);
    }
  }, [authLoading, isAuthenticated, authUserName, isGuestCollaborator]);
  
  // Real-time collaboration using the new hook
  const {
    isConnected,
    users: collaborationUsers,
    currentUser: collabCurrentUser,
    cursors: _cursors, // Available for future use
    broadcastCursor,
    editingNodes,
    startEditing: _startEditing, // Available for node editing integration
    stopEditing: _stopEditing, // Available for node editing integration
    broadcastNodeChange
  } = useCollaboration({
    boardId: board.id,
    userId: sessionUserId,
    userName: currentUser.name,
    userColor: currentUser.color,
    enabled: !!supabase,
    onNodeChange: (change) => {
      // Another user updated the board
      if (change.type === 'update' || change.type === 'add' || change.type === 'delete') {
        if (change.data?.nodes) {
          onUpdateBoard({ visualNodes: change.data.nodes });
        }
      }
    }
  });
  
  // Convert collaboration users to the old format for backward compatibility
  const otherUsers: UserPresence[] = collaborationUsers.map(u => ({
    id: u.id,
    name: u.name,
    color: u.color,
    cursorX: u.cursor?.x ?? 0,
    cursorY: u.cursor?.y ?? 0,
    cursor: u.cursor,
    activeNodeId: u.activeNodeId,
    lastSeen: u.lastSeen,
    isOnline: u.isOnline
  }));
  
  // Track user joins/leaves for activity feed
  const prevUsersRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const currentUserIds = new Set(collaborationUsers.map(u => u.id));
    
    // Check for new users (joined)
    collaborationUsers.forEach(user => {
      if (!prevUsersRef.current.has(user.id)) {
        setRecentActivity(prev => [{
          userId: user.id,
          type: 'joined' as const,
          timestamp: new Date(),
        }, ...prev].slice(0, 50));
      }
    });
    
    // Check for users who left
    prevUsersRef.current.forEach(userId => {
      if (!currentUserIds.has(userId)) {
        setRecentActivity(prev => [{
          userId,
          type: 'left' as const,
          timestamp: new Date(),
        }, ...prev].slice(0, 50));
        
        // Stop following if the user we're following left
        if (followingUserId === userId) {
          setFollowingUserId(null);
        }
      }
    });
    
    prevUsersRef.current = currentUserIds;
  }, [collaborationUsers, followingUserId]);
  
  // Follow user viewport - pan to their cursor position
  useEffect(() => {
    if (followingUserId) {
      const followedUser = collaborationUsers.find(u => u.id === followingUserId);
      if (followedUser?.cursor) {
        // Smoothly pan to followed user's position
        const targetPanX = -followedUser.cursor.x * (board.zoom || 1) + window.innerWidth / 2;
        const targetPanY = -followedUser.cursor.y * (board.zoom || 1) + window.innerHeight / 2;
        onUpdateBoard({ panX: targetPanX, panY: targetPanY });
      }
    }
  }, [followingUserId, collaborationUsers, board.zoom, onUpdateBoard]);
  
  // Refs for handlers that will be defined later
  const addNodesRef = useRef<(nodes: VisualNode[], action: string) => void>(() => {});
  
  // Get frames for presentation
  const frames = board.visualNodes.filter(n => n.type === 'frame');
  
  // Load client comments for this board
  useEffect(() => {
    const comments = getCommentsForBoard(board.id);
    setClientComments(comments);
  }, [board.id]);
  
  // Handle resolving client comments
  const handleResolveClientComment = useCallback((commentId: string) => {
    toggleCommentResolved(commentId, currentUser.name);
    setClientComments(getCommentsForBoard(board.id));
  }, [board.id, currentUser.name]);
  
  // Handle selecting a client comment (pan to location)
  const handleSelectClientComment = useCallback((comment: ClientComment) => {
    setSelectedClientCommentId(comment.id);
    // Pan to the comment location - this would need to integrate with the canvas
    // For now just select it
  }, []);
  
  // Generate AI Summary from board content
  const generateAISummary = useCallback(() => {
    const nodes = board.visualNodes;
    if (nodes.length === 0) return null;
    
    // Categorize ALL nodes by type (include empty ones in count, filter content for display)
    const allStickyNotes = nodes.filter(n => n.type === 'sticky');
    const allOpportunities = nodes.filter(n => n.type === 'opportunity');
    const allRisks = nodes.filter(n => n.type === 'risk');
    const allActions = nodes.filter(n => n.type === 'action');
    const allFrames = nodes.filter(n => n.type === 'frame');
    const allMindmaps = nodes.filter(n => n.type === 'mindmap');
    const allTables = nodes.filter(n => n.type === 'table');
    const allLinks = nodes.filter(n => n.type === 'linklist');
    const allText = nodes.filter(n => n.type === 'text');
    const allShapes = nodes.filter(n => n.type === 'shape');
    const allComments = nodes.filter(n => n.type === 'comment');
    
    // Get nodes with actual content for detailed sections
    const stickyWithContent = allStickyNotes.filter(n => n.content && n.content.trim());
    const opportunitiesWithContent = allOpportunities.filter(n => n.content && n.content.trim());
    const risksWithContent = allRisks.filter(n => n.content && n.content.trim());
    const actionsWithContent = allActions.filter(n => n.content && n.content.trim());
    const framesWithContent = allFrames.filter(n => n.content && n.content.trim());
    const mindmapsWithContent = allMindmaps.filter(n => n.content && n.content.trim());
    const tablesWithData = allTables.filter(n => n.tableData);
    const linksWithData = allLinks.filter(n => n.links && n.links.length > 0);
    const textWithContent = allText.filter(n => n.content && n.content.trim());
    const shapesWithContent = allShapes.filter(n => n.content && n.content.trim());
    const commentsWithContent = allComments.filter(n => n.content && n.content.trim());
    
    // Collect ALL text content from the board for the summary
    const allContentItems: { type: string; content: string; color?: string }[] = [];
    
    nodes.forEach(node => {
      if (node.content && node.content.trim()) {
        allContentItems.push({ 
          type: node.type, 
          content: node.content.trim(),
          color: node.color 
        });
      }
      // Also extract table data
      if (node.type === 'table' && node.tableData) {
        node.tableData.rows.forEach(row => {
          row.forEach(cell => {
            if (cell && cell.trim()) {
              allContentItems.push({ type: 'table-cell', content: cell.trim() });
            }
          });
        });
      }
      // Extract link titles
      if (node.type === 'linklist' && node.links) {
        node.links.forEach(link => {
          if (link.title) {
            allContentItems.push({ type: 'link', content: `${link.title}: ${link.url}` });
          }
        });
      }
    });
    
    // Build structured summary HTML
    let summaryHTML = `<h1>🤖 AI Summary Notes</h1>
<p><em>Auto-generated from whiteboard: <strong>${board.name}</strong></em></p>
<p><em>Generated: ${new Date().toLocaleString()}</em></p>
<hr/>`;

    // Executive Summary with actual content overview
    const totalContentItems = allContentItems.length;
    summaryHTML += `<h2>📋 Executive Summary</h2>
<p>This whiteboard contains <strong>${nodes.length}</strong> elements with <strong>${totalContentItems}</strong> pieces of content.</p>
<p>Breakdown: ${allStickyNotes.length} sticky notes, ${allOpportunities.length} opportunities, ${allRisks.length} risks, ${allActions.length} action items, ${allFrames.length} frames, ${allMindmaps.length} mind map nodes, ${allTables.length} tables, ${allText.length} text blocks.</p>`;

    // ALL CONTENT - The main summary of everything
    if (allContentItems.length > 0) {
      summaryHTML += `<h2>📝 Complete Content Summary</h2>
<p>All text content extracted from the whiteboard:</p>`;
      
      // Group by type for organized display
      const contentByType: Record<string, string[]> = {};
      allContentItems.forEach(item => {
        if (!contentByType[item.type]) contentByType[item.type] = [];
        contentByType[item.type].push(item.content);
      });
      
      Object.entries(contentByType).forEach(([type, contents]) => {
        const typeLabels: Record<string, string> = {
          'sticky': '📌 Sticky Notes',
          'opportunity': '💡 Opportunities', 
          'risk': '⚠️ Risks',
          'action': '✅ Actions',
          'frame': '🗂️ Frames',
          'mindmap': '🧠 Mind Map',
          'text': '📝 Text',
          'shape': '⬜ Shapes',
          'comment': '💬 Comments',
          'table-cell': '📊 Table Data',
          'link': '🔗 Links'
        };
        const label = typeLabels[type] || type;
        summaryHTML += `<h3>${label}</h3><ul>`;
        contents.forEach(c => {
          // Clean and format content
          const cleanContent = c.replace(/\n/g, ' ').replace(/\s+/g, ' ');
          summaryHTML += `<li>${cleanContent}</li>`;
        });
        summaryHTML += `</ul>`;
      });
    }

    // Key Themes from Frames
    if (framesWithContent.length > 0) {
      summaryHTML += `<h2>🗂️ Key Themes & Sections</h2><ul>`;
      framesWithContent.forEach(f => {
        const title = f.content.split('\n')[0];
        const rest = f.content.split('\n').slice(1).join(' ').trim();
        summaryHTML += `<li><strong>${title}</strong>${rest ? `: ${rest}` : ''}</li>`;
      });
      summaryHTML += `</ul>`;
    }

    // Detailed Sticky Notes
    if (stickyWithContent.length > 0) {
      summaryHTML += `<h2>💭 Sticky Notes Detail</h2><ul>`;
      stickyWithContent.forEach(n => {
        const content = n.content.replace(/\n/g, ' ');
        summaryHTML += `<li>${content}</li>`;
      });
      summaryHTML += `</ul>`;
    }

    // Opportunities
    if (opportunitiesWithContent.length > 0) {
      summaryHTML += `<h2>💡 Opportunities Identified</h2><ul>`;
      opportunitiesWithContent.forEach(n => {
        summaryHTML += `<li>${n.content.replace(/\n/g, ' ')}</li>`;
      });
      summaryHTML += `</ul>`;
    }

    // Risks
    if (risksWithContent.length > 0) {
      summaryHTML += `<h2>⚠️ Risks & Concerns</h2><ul>`;
      risksWithContent.forEach(n => {
        summaryHTML += `<li>${n.content.replace(/\n/g, ' ')}</li>`;
      });
      summaryHTML += `</ul>`;
    }

    // Action Items
    if (actionsWithContent.length > 0) {
      summaryHTML += `<h2>✅ Action Items</h2><ol>`;
      actionsWithContent.forEach(n => {
        summaryHTML += `<li>${n.content.replace(/\n/g, ' ')}</li>`;
      });
      summaryHTML += `</ol>`;
    }

    // Mind Maps
    if (mindmapsWithContent.length > 0) {
      const rootMindmaps = mindmapsWithContent.filter(n => n.isRootNode);
      if (rootMindmaps.length > 0) {
        summaryHTML += `<h2>🧠 Mind Map Topics</h2><ul>`;
        rootMindmaps.forEach(n => {
          summaryHTML += `<li><strong>${n.content}</strong>`;
          const children = mindmapsWithContent.filter(m => m.parentNodeId === n.id);
          if (children.length > 0) {
            summaryHTML += `<ul>`;
            children.forEach(c => {
              summaryHTML += `<li>${c.content}</li>`;
            });
            summaryHTML += `</ul>`;
          }
          summaryHTML += `</li>`;
        });
        summaryHTML += `</ul>`;
      }
    }

    // Text blocks
    if (textWithContent.length > 0) {
      summaryHTML += `<h2>📝 Text Blocks</h2><ul>`;
      textWithContent.forEach(n => {
        summaryHTML += `<li>${n.content.replace(/\n/g, ' ')}</li>`;
      });
      summaryHTML += `</ul>`;
    }

    // Shapes with text
    if (shapesWithContent.length > 0) {
      summaryHTML += `<h2>⬜ Shapes with Labels</h2><ul>`;
      shapesWithContent.forEach(n => {
        summaryHTML += `<li>${n.content.replace(/\n/g, ' ')}</li>`;
      });
      summaryHTML += `</ul>`;
    }

    // Comments
    if (commentsWithContent.length > 0) {
      summaryHTML += `<h2>💬 Comments & Annotations</h2><ul>`;
      commentsWithContent.forEach(n => {
        summaryHTML += `<li>${n.content.replace(/\n/g, ' ')}</li>`;
      });
      summaryHTML += `</ul>`;
    }

    // Tables with full data
    if (tablesWithData.length > 0) {
      summaryHTML += `<h2>📊 Data Tables</h2>`;
      tablesWithData.forEach(t => {
        summaryHTML += `<h3>${t.content || 'Untitled Table'}</h3>`;
        if (t.tableData) {
          summaryHTML += `<table style="width:100%;border-collapse:collapse;margin:1rem 0;">`;
          if (t.tableData.headers) {
            summaryHTML += `<tr>`;
            t.tableData.headers.forEach(h => {
              summaryHTML += `<th style="border:1px solid #e5e7eb;padding:8px;background:#f9fafb;">${h}</th>`;
            });
            summaryHTML += `</tr>`;
          }
          t.tableData.rows.forEach(row => {
            summaryHTML += `<tr>`;
            row.forEach(cell => {
              summaryHTML += `<td style="border:1px solid #e5e7eb;padding:8px;">${cell}</td>`;
            });
            summaryHTML += `</tr>`;
          });
          summaryHTML += `</table>`;
        }
      });
    }

    // Links
    if (linksWithData.length > 0) {
      summaryHTML += `<h2>🔗 Resources & Links</h2><ul>`;
      linksWithData.forEach(l => {
        l.links?.forEach(link => {
          summaryHTML += `<li><a href="${link.url}" target="_blank">${link.title}</a>${link.description ? ` - ${link.description}` : ''}</li>`;
        });
      });
      summaryHTML += `</ul>`;
    }

    // Statistics
    summaryHTML += `<hr/><h2>📈 Session Statistics</h2>
<table style="width:100%;border-collapse:collapse;">
<tr><td style="padding:4px;"><strong>Total Elements:</strong></td><td style="padding:4px;">${nodes.length}</td></tr>
<tr><td style="padding:4px;"><strong>Content Items:</strong></td><td style="padding:4px;">${totalContentItems}</td></tr>
<tr><td style="padding:4px;"><strong>Sticky Notes:</strong></td><td style="padding:4px;">${allStickyNotes.length} (${stickyWithContent.length} with content)</td></tr>
<tr><td style="padding:4px;"><strong>Opportunities:</strong></td><td style="padding:4px;">${allOpportunities.length}</td></tr>
<tr><td style="padding:4px;"><strong>Risks:</strong></td><td style="padding:4px;">${allRisks.length}</td></tr>
<tr><td style="padding:4px;"><strong>Action Items:</strong></td><td style="padding:4px;">${allActions.length}</td></tr>
<tr><td style="padding:4px;"><strong>Frames/Sections:</strong></td><td style="padding:4px;">${allFrames.length}</td></tr>
<tr><td style="padding:4px;"><strong>Mind Map Nodes:</strong></td><td style="padding:4px;">${allMindmaps.length}</td></tr>
<tr><td style="padding:4px;"><strong>Text Blocks:</strong></td><td style="padding:4px;">${allText.length}</td></tr>
<tr><td style="padding:4px;"><strong>Tables:</strong></td><td style="padding:4px;">${allTables.length}</td></tr>
<tr><td style="padding:4px;"><strong>Comments:</strong></td><td style="padding:4px;">${allComments.length}</td></tr>
</table>`;

    return summaryHTML;
  }, [board]);
  
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
      // Broadcast to other collaborators for real-time sync
      broadcastNodeChange({
        type: 'update',
        nodeId: 'all',
        data: { nodes: updates.visualNodes }
      });
    }
    onUpdateBoard(updates);
  }, [onUpdateBoard, addToHistory, broadcastNodeChange]);

  // Update the ref so other handlers can use it
  useEffect(() => {
    addNodesRef.current = (newNodes: VisualNode[], action: string) => {
      handleUpdateBoardWithHistory({ visualNodes: [...board.visualNodes, ...newNodes] }, action);
    };
  }, [handleUpdateBoardWithHistory, board.visualNodes]);

  // AI clustering handler
  const handleClusterNodes = useCallback((clusters: { name: string; nodeIds: string[] }[]) => {
    const newNodes: VisualNode[] = clusters.map((cluster, index) => ({
      id: generateId(),
      type: 'frame' as const,
      x: 1200 + (index % 2) * 450,
      y: 50 + Math.floor(index / 2) * 400,
      width: 400,
      height: 350,
      content: `🏷️ ${cluster.name}`,
      color: NODE_COLORS[index % NODE_COLORS.length],
      rotation: 0,
      locked: false,
      votes: 0,
      votedBy: [],
      createdBy: currentUser.id,
      comments: []
    }));
    addNodesRef.current(newNodes, 'AI Cluster');
  }, [currentUser.id]);
  
  // AI idea generator handler
  const handleGenerateIdeas = useCallback((ideas: string[]) => {
    const viewportCenterX = (-board.panX + window.innerWidth / 2) / (board.zoom || 1);
    const viewportCenterY = (-board.panY + window.innerHeight / 2) / (board.zoom || 1);
    
    const newNodes: VisualNode[] = ideas.map((idea, index) => ({
      id: generateId(),
      type: 'sticky' as const,
      x: viewportCenterX - 100 + (index % 3) * 220,
      y: viewportCenterY + Math.floor(index / 3) * 150,
      width: 200,
      height: 120,
      content: idea,
      color: '#fef3c7',
      rotation: 0,
      locked: false,
      votes: 0,
      votedBy: [],
      createdBy: currentUser.id,
      comments: []
    }));
    addNodesRef.current(newNodes, 'AI Ideas');
  }, [board.panX, board.panY, board.zoom, currentUser.id]);
  
  // Auto-group handler
  const handleAutoGroup = useCallback(() => {
    const stickyNotes = board.visualNodes.filter(n => n.type === 'sticky' && n.content.trim());
    if (stickyNotes.length < 3) return;
    
    const groupSize = 4;
    const groupCount = Math.ceil(stickyNotes.length / groupSize);
    
    const newNodes: VisualNode[] = Array.from({ length: groupCount }, (_, index) => ({
      id: generateId(),
      type: 'frame' as const,
      x: 100 + (index % 3) * 450,
      y: 100 + Math.floor(index / 3) * 400,
      width: 420,
      height: 350,
      content: `Group ${index + 1}`,
      color: NODE_COLORS[index % NODE_COLORS.length],
      rotation: 0,
      locked: false,
      votes: 0,
      votedBy: [],
      createdBy: currentUser.id,
      comments: []
    }));
    addNodesRef.current(newNodes, 'Auto-Group');
  }, [board.visualNodes, currentUser.id]);
  
  // Voice to sticky handler
  const handleVoiceToSticky = useCallback((content: string) => {
    const viewportCenterX = (-board.panX + window.innerWidth / 2) / (board.zoom || 1);
    const viewportCenterY = (-board.panY + window.innerHeight / 2) / (board.zoom || 1);
    
    const newNode: VisualNode = {
      id: generateId(),
      type: 'sticky',
      x: viewportCenterX - 100,
      y: viewportCenterY - 60,
      width: 200,
      height: 120,
      content: content,
      color: '#dbeafe',
      rotation: 0,
      locked: false,
      votes: 0,
      votedBy: [],
      createdBy: currentUser.id,
      comments: []
    };
    addNodesRef.current([newNode], 'Voice Note');
  }, [board.panX, board.panY, board.zoom, currentUser.id]);

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

  // Legacy recording toggle - now handled by UnifiedLeftPanel's internal useTranscription hook
  // @ts-ignore - Keeping for potential future use
  const _handleToggleRecording = useCallback(() => {
    if (!isRecording) {
      setIsRecording(true);
      setRecordingDuration(0);
      setRecordingStartTime(new Date());
      setTranscript([]);
    } else {
      setIsRecording(false);
      const endTime = new Date();
      if (transcript.length > 0 && recordingStartTime) {
        const savedTranscript: SavedTranscript = { id: generateId(), entries: transcript, startedAt: recordingStartTime, endedAt: endTime, duration: recordingDuration };
        const newSavedTranscripts = [...savedTranscripts, savedTranscript];
        setSavedTranscripts(newSavedTranscripts);
        localStorage.setItem(`board-transcripts-${board.id}`, JSON.stringify(newSavedTranscripts));
        onUpdateBoard({ transcripts: newSavedTranscripts });

        // Create a note with the full transcript
        if (onCreateTranscriptNote) {
          const transcriptContent = transcript.map(entry => {
            const speaker = PARTICIPANTS.find(p => p.id === entry.speaker);
            const timeStamp = `${Math.floor(entry.timestamp / 60)}:${(entry.timestamp % 60).toString().padStart(2, '0')}`;
            return `[${timeStamp}] ${speaker?.name || 'Unknown'}: ${entry.text}`;
          }).join('\n');
          onCreateTranscriptNote(board.id, board.name, transcriptContent, recordingStartTime, endTime);
        }
      }
    }
  }, [isRecording, transcript, recordingStartTime, recordingDuration, savedTranscripts, board.id, board.name, onUpdateBoard, onCreateTranscriptNote]);

  // @ts-ignore - Kept for legacy transcript handling
  const _handleAddTranscript = useCallback((text: string) => {
    if (!text.trim()) return;
    const entry = { id: generateId(), speaker: _currentSpeaker, text: text.trim(), timestamp: recordingDuration };
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
  }, [_currentSpeaker, recordingDuration]);

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

  // Handle dropped media files (images and videos)
  const handleDropMedia = useCallback((file: File, x: number, y: number) => {
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (!isVideo && !isImage) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const newNode: VisualNode = {
        id: generateId(),
        type: isVideo ? 'youtube' : 'image', // Using 'youtube' type for video since it handles media
        x: x - (isVideo ? 200 : 150), // Center the node on drop position
        y: y - (isVideo ? 112 : 150),
        width: isVideo ? 400 : 300,
        height: isVideo ? 225 : 300,
        content: file.name,
        color: '#ffffff',
        rotation: 0,
        locked: false,
        votes: 0,
        votedBy: [],
        createdBy: currentUser.id,
        comments: [],
        mediaUrl: dataUrl
      };
      handleUpdateBoardWithHistory({ visualNodes: [...board.visualNodes, newNode] }, `Add ${isVideo ? 'video' : 'image'}`);
    };
    reader.readAsDataURL(file);
  }, [currentUser.id, board.visualNodes, handleUpdateBoardWithHistory]);

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

  const handleSave = useCallback(() => {
    localStorage.setItem(`board-${board.id}`, JSON.stringify(board));
    setSaved(true);
    
    // Generate AI Summary and create note
    if (onCreateAISummary && board.visualNodes.length > 0) {
      setIsGeneratingSummary(true);
      // Simulate slight delay for "AI processing" feel
      setTimeout(() => {
        const summary = generateAISummary();
        if (summary) {
          onCreateAISummary(board.id, board.name, summary);
        }
        setIsGeneratingSummary(false);
      }, 500);
    }
    
    setTimeout(() => setSaved(false), 2000);
  }, [board, onCreateAISummary, generateAISummary]);

  const handleAddAction = useCallback((content: string) => { setActionItems(prev => [...prev, { id: generateId(), content, priority: 'medium', isComplete: false, timestamp: recordingDuration }]); }, [recordingDuration]);
  const handleToggleActionComplete = useCallback((id: string) => { setActionItems(prev => prev.map(a => a.id === id ? { ...a, isComplete: !a.isComplete } : a)); }, []);
  const handleAssignUser = useCallback((id: string, assigneeId: string | undefined) => { setActionItems(prev => prev.map(a => a.id === id ? { ...a, assigneeId } : a)); }, []);

  // Saved transcripts handlers
  const handleSaveTranscript = useCallback((transcript: SavedTranscript) => {
    const newTranscripts = [...savedTranscripts, transcript];
    setSavedTranscripts(newTranscripts);
    localStorage.setItem(`board-transcripts-${board.id}`, JSON.stringify(newTranscripts));
  }, [savedTranscripts, board.id]);

  const handleDeleteTranscript = useCallback((id: string) => {
    const newTranscripts = savedTranscripts.filter(t => t.id !== id);
    setSavedTranscripts(newTranscripts);
    localStorage.setItem(`board-transcripts-${board.id}`, JSON.stringify(newTranscripts));
  }, [savedTranscripts, board.id]);

  const handleLoadTranscript = useCallback((transcript: SavedTranscript) => {
    // The UnifiedLeftPanel handles displaying the loaded transcript
    console.log('Loaded transcript:', transcript.id, 'duration:', transcript.duration);
  }, []);

  return (
    <div className="flex-1 flex flex-col bg-gray-100 overflow-hidden">
      {/* User Name Modal - shown to new users */}
      <AnimatePresence>
        {isEditingUserName && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[20000]"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-96 shadow-2xl"
            >
              <h2 className="text-xl font-bold text-gray-900 mb-2">Welcome to Fan Canvas!</h2>
              <p className="text-sm text-gray-500 mb-4">Enter your name so collaborators can identify you.</p>
              <input
                type="text"
                value={editingUserNameValue}
                onChange={(e) => setEditingUserNameValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveUserName(editingUserNameValue); }}
                placeholder="Your name..."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={() => handleSaveUserName(editingUserNameValue)}
                  className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
                >
                  Join Board
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-3 text-center">Your name will be visible to other collaborators</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="bg-white border-b border-gray-200 px-2 sm:px-4 py-2 sm:py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <motion.button whileHover={{ scale: 1.05 }} onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg flex-shrink-0"><ChevronLeft className="w-5 h-5 text-gray-600" /></motion.button>
          <div className="min-w-0">
            {isEditingName ? (
              <input
                ref={nameInputRef}
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onBlur={() => {
                  if (editedName.trim() && editedName !== board.name) {
                    onUpdateBoard({ name: editedName.trim() });
                  } else {
                    setEditedName(board.name);
                  }
                  setIsEditingName(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (editedName.trim() && editedName !== board.name) {
                      onUpdateBoard({ name: editedName.trim() });
                    }
                    setIsEditingName(false);
                  } else if (e.key === 'Escape') {
                    setEditedName(board.name);
                    setIsEditingName(false);
                  }
                }}
                className="font-bold text-gray-900 bg-white border border-indigo-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full max-w-[200px]"
                autoFocus
              />
            ) : (
              <h1
                className="font-bold text-gray-900 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded-lg transition-colors flex items-center gap-2 group text-sm sm:text-base truncate"
                onClick={() => {
                  setIsEditingName(true);
                  setEditedName(board.name);
                }}
                title="Click to rename"
              >
                <span className="truncate">{board.name}</span>
                <Pencil className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </h1>
            )}
            <span className="text-xs sm:text-sm text-gray-500 hidden sm:block">Whiteboard</span>
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-3">
          {/* Recording indicator - always visible */}
          <div className={`flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-1.5 sm:py-2 rounded-full ${isRecording ? 'bg-red-500' : 'bg-gray-200'}`}>
            <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: isRecording ? 1 : 0, repeat: isRecording ? Infinity : 0 }} className={`w-2.5 sm:w-3 h-2.5 sm:h-3 rounded-full ${isRecording ? 'bg-white' : 'bg-gray-400'}`} />
            {isRecording && <span className="text-white font-mono font-medium text-xs sm:text-sm">{Math.floor(recordingDuration / 60).toString().padStart(2, '0')}:{(recordingDuration % 60).toString().padStart(2, '0')}</span>}
          </div>
          {/* Real-time User Presence - hidden on mobile */}
          <div className="hidden sm:block">
            <UserPresenceList
              users={collaborationUsers}
              currentUser={collabCurrentUser}
              isConnected={isConnected}
              editingNodes={editingNodes}
              onFollowUser={(userId) => {
                // TODO: Pan to user's cursor position
                console.log('Follow user:', userId);
              }}
            />
          </div>
          <div className="hidden sm:block w-px h-8 bg-gray-200" />
          {/* Undo/Redo - always visible */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            <motion.button whileHover={{ scale: 1.05 }} onClick={handleUndo} disabled={historyIndex <= 0} className={`p-1.5 sm:p-2 rounded-lg ${historyIndex <= 0 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white'}`} title="Undo"><Undo2 className="w-4 h-4 text-gray-600" /></motion.button>
            <motion.button whileHover={{ scale: 1.05 }} onClick={handleRedo} disabled={historyIndex >= history.length - 1} className={`p-1.5 sm:p-2 rounded-lg ${historyIndex >= history.length - 1 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white'}`} title="Redo"><Redo2 className="w-4 h-4 text-gray-600" /></motion.button>
            <motion.button whileHover={{ scale: 1.05 }} onClick={() => setShowHistoryPanel(!showHistoryPanel)} className={`hidden sm:block p-2 rounded-lg ${showHistoryPanel ? 'bg-white' : 'hover:bg-white'}`} title="History"><History className="w-4 h-4 text-gray-600" /></motion.button>
          </div>
          {/* Desktop-only buttons */}
          <motion.button whileHover={{ scale: 1.05 }} onClick={() => setShowSearch(!showSearch)} className={`hidden sm:block p-2 rounded-xl ${showSearch ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`} title="Search board"><Search className="w-4 h-4" /></motion.button>
          <motion.button whileHover={{ scale: 1.05 }} onClick={() => setShowTimer(!showTimer)} className={`hidden sm:block p-2 rounded-xl ${showTimer ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`} title="Timer"><Timer className="w-4 h-4" /></motion.button>
          <motion.button whileHover={{ scale: 1.05 }} onClick={() => setShowTemplateModal(true)} className="hidden sm:flex px-3 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium items-center gap-2 hover:bg-gray-200"><Layout className="w-4 h-4" />Templates</motion.button>
          {/* Save button - always visible but compact on mobile */}
          <motion.button 
            whileHover={{ scale: 1.05 }} 
            onClick={handleSave} 
            disabled={isGeneratingSummary}
            className={`p-2 sm:px-3 sm:py-2 rounded-xl text-sm font-medium flex items-center gap-2 ${
              isGeneratingSummary ? 'bg-purple-100 text-purple-700' :
              saved ? 'bg-green-100 text-green-700' : 
              'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {isGeneratingSummary ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <Check className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">{isGeneratingSummary ? 'Generating...' : saved ? 'Saved!' : 'Save'}</span>
          </motion.button>
          {/* AI button - icon only on mobile */}
          <motion.button whileHover={{ scale: 1.05 }} onClick={() => setShowAIPanel(!showAIPanel)} className={`p-2 sm:px-3 sm:py-2 rounded-xl text-sm font-medium flex items-center gap-2 ${showAIPanel ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}><Brain className="w-4 h-4" /><span className="hidden sm:inline">AI Assistant</span></motion.button>
          {/* Client Comments Button - hidden on mobile */}
          {clientComments.length > 0 && (
            <motion.button 
              whileHover={{ scale: 1.05 }} 
              onClick={() => setShowClientCommentsPanel(!showClientCommentsPanel)} 
              className={`hidden sm:flex px-3 py-2 rounded-xl text-sm font-medium items-center gap-2 relative ${showClientCommentsPanel ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}
            >
              <MessageCircle className="w-4 h-4" />
              Client Comments
              {clientComments.filter(c => !c.resolved && !c.parentId).length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {clientComments.filter(c => !c.resolved && !c.parentId).length}
                </span>
              )}
            </motion.button>
          )}
          {/* Share button - icon only on mobile */}
          <motion.button whileHover={{ scale: 1.05 }} onClick={() => setShowShareModal(true)} className="p-2 sm:px-4 sm:py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium flex items-center gap-2 shadow-lg shadow-indigo-200"><Share2 className="w-4 h-4" /><span className="hidden sm:inline">Share</span></motion.button>
        </div>
      </header>

      <div className="flex-1 flex relative overflow-hidden" onClick={() => { activePicker && setActivePicker(null); showMobileToolbar && setShowMobileToolbar(false); }}>
        {/* Mobile FAB to open toolbar - positioned inside canvas */}
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileTap={{ scale: 0.95 }}
          onClick={(e) => { e.stopPropagation(); setShowMobileToolbar(!showMobileToolbar); }}
          className="sm:hidden absolute left-3 bottom-3 z-[110] w-12 h-12 bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-300 flex items-center justify-center touch-manipulation"
        >
          {showMobileToolbar ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
        </motion.button>

        {/* Toolbar - hidden on mobile unless showMobileToolbar, always visible on desktop */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }} 
          animate={{ y: 0, opacity: 1 }} 
          className={`absolute left-2 sm:left-4 bottom-16 sm:bottom-auto sm:top-4 flex flex-col gap-2 z-[100] max-h-[50vh] sm:max-h-[calc(100vh-180px)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent pr-1 ${showMobileToolbar ? 'flex' : 'hidden sm:flex'}`} 
          onClick={(e) => e.stopPropagation()}
        >
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
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className="fixed left-20 top-24 bg-white rounded-xl shadow-2xl border border-gray-200 p-3 z-[200] w-64"
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
            <motion.button whileHover={{ scale: 1.1 }} onClick={() => { const nodeId = generateId(); const node: VisualNode = { id: nodeId, type: 'connector', x: 300 + Math.random() * 100, y: 300 + Math.random() * 100, width: 200, height: 4, content: '', color: '#6b7280', rotation: 0, locked: false, votes: 0, votedBy: [], createdBy: currentUser.id, comments: [], connectorStyle: 'solid' }; handleUpdateBoardWithHistory({ visualNodes: [...board.visualNodes, node] }, 'Add connector'); setSelectedNodeIds([nodeId]); }} className="p-3 hover:bg-gray-100 rounded-xl group relative"><Minus className="w-5 h-5 text-gray-700" /><div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">Connector Line</div></motion.button>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-2 flex flex-col gap-1 border border-gray-200">
            <p className="text-[10px] font-semibold text-gray-400 uppercase px-2 py-1">Media</p>
            <motion.button whileHover={{ scale: 1.1 }} onClick={() => setShowMediaModal('youtube')} className="p-3 hover:bg-gray-100 rounded-xl group relative"><Youtube className="w-5 h-5 text-red-500" /><div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">YouTube Video</div></motion.button>
            <motion.button whileHover={{ scale: 1.1 }} onClick={() => setShowMediaModal('image')} className="p-3 hover:bg-gray-100 rounded-xl group relative"><Image className="w-5 h-5 text-indigo-500" /><div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">Embed Image</div></motion.button>
            <motion.button whileHover={{ scale: 1.1 }} onClick={() => setShowMediaModal('qr')} className="p-3 hover:bg-gray-100 rounded-xl group relative"><QrCode className="w-5 h-5 text-green-500" /><div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">QR Photo Upload</div></motion.button>
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
          
          {/* Tables & Lists */}
          <div className="bg-white rounded-2xl shadow-lg p-2 flex flex-col gap-1 border border-gray-200">
            <p className="text-[10px] font-semibold text-gray-400 uppercase px-2 py-1">Data</p>
            <motion.button
              whileHover={{ scale: 1.1 }}
              onClick={() => {
                const viewportCenterX = (-board.panX + window.innerWidth / 2) / (board.zoom || 1);
                const viewportCenterY = (-board.panY + window.innerHeight / 2) / (board.zoom || 1);
                const node: VisualNode = {
                  id: generateId(),
                  type: 'table',
                  x: viewportCenterX - 200,
                  y: viewportCenterY - 100,
                  width: 400,
                  height: 200,
                  content: 'Data Table',
                  color: '#ffffff',
                  rotation: 0,
                  locked: false,
                  votes: 0,
                  votedBy: [],
                  createdBy: currentUser.id,
                  comments: [],
                  tableData: {
                    headers: ['Column 1', 'Column 2', 'Column 3'],
                    rows: [
                      ['Data 1', 'Data 2', 'Data 3'],
                      ['Data 4', 'Data 5', 'Data 6'],
                    ]
                  }
                };
                handleUpdateBoardWithHistory({ visualNodes: [...board.visualNodes, node] }, 'Add table');
              }}
              className="p-3 hover:bg-gray-100 rounded-xl group relative"
              title="Table"
            >
              <Table className="w-5 h-5 text-blue-600" />
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">Add Table</div>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              onClick={() => {
                const viewportCenterX = (-board.panX + window.innerWidth / 2) / (board.zoom || 1);
                const viewportCenterY = (-board.panY + window.innerHeight / 2) / (board.zoom || 1);
                const node: VisualNode = {
                  id: generateId(),
                  type: 'linklist',
                  x: viewportCenterX - 150,
                  y: viewportCenterY - 100,
                  width: 300,
                  height: 200,
                  content: 'Resources',
                  color: '#f0fdf4',
                  rotation: 0,
                  locked: false,
                  votes: 0,
                  votedBy: [],
                  createdBy: currentUser.id,
                  comments: [],
                  links: [
                    { id: generateId(), title: 'Example Link', url: 'https://example.com', description: 'Click to open' },
                  ]
                };
                handleUpdateBoardWithHistory({ visualNodes: [...board.visualNodes, node] }, 'Add link list');
              }}
              className="p-3 hover:bg-gray-100 rounded-xl group relative"
              title="Link List"
            >
              <LinkIcon className="w-5 h-5 text-green-600" />
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">Add Link List</div>
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
          
          {/* Collaboration */}
          <div className="bg-white rounded-2xl shadow-lg p-2 flex flex-col gap-1 border border-gray-200">
            <p className="text-[10px] font-semibold text-gray-400 uppercase px-2 py-1">Collaborate</p>
            <motion.button
              whileHover={{ scale: 1.1 }}
              onClick={() => setShowShareModal(true)}
              className={`p-3 rounded-xl group relative ${isConnected ? 'bg-green-50' : 'hover:bg-gray-100'}`}
              title="Share"
            >
              <Share className={`w-5 h-5 ${isConnected ? 'text-green-600' : 'text-gray-700'}`} />
              {isConnected && <span className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full"></span>}
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">Share & Collaborate {isConnected ? '(Live)' : ''}</div>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              onClick={() => setShowVoiceModal(true)}
              className="p-3 hover:bg-gray-100 rounded-xl group relative"
              title="Voice"
            >
              <MicIcon className="w-5 h-5 text-gray-700" />
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">Voice to Sticky</div>
            </motion.button>
          </div>
          
          {/* AI Tools */}
          <div className="bg-white rounded-2xl shadow-lg p-2 flex flex-col gap-1 border border-gray-200">
            <p className="text-[10px] font-semibold text-gray-400 uppercase px-2 py-1">AI</p>
            <motion.button
              whileHover={{ scale: 1.1 }}
              onClick={() => setShowAITools(!showAITools)}
              className={`p-3 rounded-xl group relative ${showAITools ? 'bg-purple-100 ring-2 ring-purple-500' : 'hover:bg-gray-100'}`}
              title="AI Tools"
            >
              <Wand2 className={`w-5 h-5 ${showAITools ? 'text-purple-600' : 'text-gray-700'}`} />
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">AI Tools</div>
            </motion.button>
          </div>

          {/* Assets & Facilitator */}
          <div className="bg-white rounded-2xl shadow-lg p-2 flex flex-col gap-1 border border-gray-200">
            <p className="text-[10px] font-semibold text-gray-400 uppercase px-2 py-1">Assets</p>
            <motion.button
              whileHover={{ scale: 1.1 }}
              onClick={() => setShowAssetLibrary(true)}
              className="p-3 hover:bg-gray-100 rounded-xl group relative"
              title="Asset Library"
            >
              <Image className="w-5 h-5 text-gray-700" />
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">Images, GIFs & Icons</div>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              onClick={() => setShowFacilitatorTools(!showFacilitatorTools)}
              className={`p-3 rounded-xl group relative ${showFacilitatorTools ? 'bg-indigo-100 ring-2 ring-indigo-500' : 'hover:bg-gray-100'}`}
              title="Facilitator Tools"
            >
              <Users className="w-5 h-5 ${showFacilitatorTools ? 'text-indigo-600' : 'text-gray-700'}" />
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">Facilitator Tools</div>
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
              <>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  onClick={() => { setIsPresentationMode(true); setPresentationFrameIndex(0); }}
                  className="p-3 hover:bg-gray-100 rounded-xl group relative"
                  title="Present"
                >
                  <Presentation className="w-5 h-5 text-gray-700" />
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">Present ({frames.length} frames)</div>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  onClick={() => setShowSlideOrderPanel(true)}
                  className="p-3 hover:bg-gray-100 rounded-xl group relative"
                  title="Slide Order"
                >
                  <ListOrdered className="w-5 h-5 text-gray-700" />
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">Slide Order & Settings</div>
                </motion.button>
              </>
            )}
          </div>
        </motion.div>

        <ParsedItemsPanel items={parsedItems} onAddItem={handleAddParsedItemToBoard} onDismissItem={(id) => setParsedItems(prev => prev.filter(p => p.id !== id))} onAddAll={handleAddAllParsedItems} isVisible={!isTranscriptMinimized} />

        {/* Transcription is now integrated into UnifiedLeftPanel */}

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

        {/* History is now part of ParticipantsPanel tabs */}

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
          onDisablePanMode={() => { setIsPanMode(false); setIsDrawingMode(false); }}
          onDropMedia={handleDropMedia}
          onCursorMove={broadcastCursor}
          editingNodes={editingNodes}
          showCursors={showCursorsToggle}
          onSetPanMode={() => { setIsPanMode(true); setIsDrawingMode(false); setShowDrawingPanel(false); }}
          onSetSelectMode={() => { setIsPanMode(false); setIsDrawingMode(false); setShowDrawingPanel(false); }}
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
            board={board}
            isOpen={isPresentationMode}
            onExit={() => setIsPresentationMode(false)}
            startSlide={presentationFrameIndex}
          />
        )}
      </AnimatePresence>
      
      {/* Slide Order Panel */}
      <SlideOrderPanel
        slides={extractSlidesFromBoard(board)}
        excludedSlides={excludedSlides}
        currentSlide={presentationFrameIndex}
        onReorder={(fromIndex, toIndex) => {
          const newOrder = [...slideOrder];
          const [removed] = newOrder.splice(fromIndex, 1);
          newOrder.splice(toIndex, 0, removed);
          setSlideOrder(newOrder);
        }}
        onToggleExclusion={(slideId) => {
          setExcludedSlides(prev => {
            const next = new Set(prev);
            if (next.has(slideId)) {
              next.delete(slideId);
            } else {
              next.add(slideId);
            }
            return next;
          });
        }}
        onReset={() => {
          setSlideOrder([]);
          setExcludedSlides(new Set());
        }}
        onClose={() => setShowSlideOrderPanel(false)}
        onStartPresentation={(slideIndex) => {
          setPresentationFrameIndex(slideIndex);
          setIsPresentationMode(true);
          setShowSlideOrderPanel(false);
        }}
        isOpen={showSlideOrderPanel}
      />
      
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
        {showShareModal && (
          <ShareBoardModal
            isOpen={showShareModal}
            onClose={() => setShowShareModal(false)}
            boardId={board.id}
            boardName={board.name}
            companyName="Fan Consulting"
            isConnected={isConnected}
            connectedUsers={otherUsers}
          />
        )}
        {showVoiceModal && (
          <VoiceToSticky
            isOpen={showVoiceModal}
            onClose={() => setShowVoiceModal(false)}
            onCreateSticky={handleVoiceToSticky}
          />
        )}
      </AnimatePresence>

      {/* Asset Library Modal */}
      <AssetLibrary
        isOpen={showAssetLibrary}
        onClose={() => setShowAssetLibrary(false)}
        onInsertAsset={(asset: AssetInsertPayload) => {
          const newNode: VisualNode = {
            id: `node-${Date.now()}`,
            type: 'image',
            x: window.innerWidth / 2 - (board.panX || 0),
            y: window.innerHeight / 2 - (board.panY || 0),
            width: asset.width || 200,
            height: asset.height || 200,
            content: asset.url,
            color: '#ffffff',
            locked: false,
            rotation: 0,
            votes: 0,
            votedBy: [],
            createdBy: sessionUserId,
            comments: [],
          };
          onUpdateBoard({
            visualNodes: [...board.visualNodes, newNode],
          });
          setShowAssetLibrary(false);
        }}
      />

      {/* Facilitator Tools */}
      {showFacilitatorTools && (
        <FacilitatorTools
          channel={null}
          isConnected={isConnected}
          isFacilitator={true}
          viewport={{
            zoom: board.zoom || 1,
            panX: board.panX || 0,
            panY: board.panY || 0,
          }}
          onViewportChange={(viewport) => {
            onUpdateBoard({
              panX: viewport.panX,
              panY: viewport.panY,
              zoom: viewport.zoom,
            });
          }}
          participantCount={collaborationUsers.length}
        />
      )}
      
      {/* Client Comments Panel */}
      <ClientCommentsPanel
        isOpen={showClientCommentsPanel}
        onClose={() => setShowClientCommentsPanel(false)}
        comments={clientComments}
        onSelectComment={handleSelectClientComment}
        onResolveComment={handleResolveClientComment}
        isOwner={true}
      />
      
      {/* Unified Left Panel - combines Transcript, People, Actions, History */}
      {showParticipantsPanel && (
        <UnifiedLeftPanel
          // People props
          users={collaborationUsers}
          currentUser={collabCurrentUser}
          isConnected={isConnected}
          editingNodes={editingNodes}
          showCursors={showCursorsToggle}
          onToggleCursors={() => setShowCursorsToggle(!showCursorsToggle)}
          onFollowUser={(userId) => {
            setFollowingUserId(userId);
            if (userId) {
              const user = collaborationUsers.find(u => u.id === userId);
              if (user?.cursor) {
                onUpdateBoard({
                  panX: -user.cursor.x * (board.zoom || 1) + window.innerWidth / 2,
                  panY: -user.cursor.y * (board.zoom || 1) + window.innerHeight / 2,
                });
              }
            }
          }}
          followingUserId={followingUserId}
          shareUrl={`${window.location.origin}/join?board=${board.id}`}
          onInvite={() => setShowShareModal(true)}
          recentActivity={recentActivity}
          onEditUserName={() => setIsEditingUserName(true)}
          // Transcript props (professional features)
          boardId={board.id}
          boardName={board.name}
          clientId={board.clientId}
          onCreateNote={(title, content, _actionItems) => {
            if (onCreateTranscriptNote) {
              onCreateTranscriptNote(board.id, title, content, new Date(), new Date());
            }
          }}
          onGenerateWhiteboard={(transcriptData) => {
            setCurrentTranscriptForWhiteboard(transcriptData);
            setShowTranscriptToWhiteboardModal(true);
          }}
          autoSaveToNotes={true}
          // Saved transcripts props
          savedTranscripts={savedTranscripts}
          onSaveTranscript={handleSaveTranscript}
          onDeleteTranscript={handleDeleteTranscript}
          onLoadTranscript={handleLoadTranscript}
          // Action items props
          actionItems={actionItems}
          onToggleActionComplete={handleToggleActionComplete}
          onAddAction={handleAddAction}
          onAssignUser={handleAssignUser}
          participants={PARTICIPANTS}
          // History props
          history={history}
          currentHistoryIndex={historyIndex}
          onRestoreHistory={(index) => {
            setHistoryIndex(index);
            onUpdateBoard({ visualNodes: history[index].nodes });
          }}
        />
      )}
      
      {/* AI Tools Panel */}
      <AnimatePresence>
        {showAITools && (
          <AIToolsPanel
            isOpen={showAITools}
            onClose={() => setShowAITools(false)}
            nodes={board.visualNodes}
            onClusterNodes={handleClusterNodes}
            onGenerateIdeas={handleGenerateIdeas}
            onAutoGroup={handleAutoGroup}
          />
        )}
      </AnimatePresence>
      
      {/* Transcript to Whiteboard Modal */}
      {showTranscriptToWhiteboardModal && currentTranscriptForWhiteboard && (
        <TranscriptToWhiteboardModal
          isOpen={showTranscriptToWhiteboardModal}
          onClose={() => {
            setShowTranscriptToWhiteboardModal(false);
            setCurrentTranscriptForWhiteboard(null);
          }}
          transcript={currentTranscriptForWhiteboard}
          onAddNodes={(nodes: VisualNodeInput[]) => {
            // Calculate viewport center for positioning
            const viewportCenterX = (-board.panX + window.innerWidth / 2) / (board.zoom || 1);
            const viewportCenterY = (-board.panY + window.innerHeight / 2) / (board.zoom || 1);
            
            // Convert VisualNodeInput to VisualNode with proper defaults
            const visualNodes: VisualNode[] = nodes.map((node: VisualNodeInput) => ({
              ...node,
              // Offset positions relative to viewport center
              x: viewportCenterX + node.x - 100,
              y: viewportCenterY + node.y - 100,
              createdBy: currentUser.id,
            }));
            
            handleUpdateBoardWithHistory(
              { visualNodes: [...board.visualNodes, ...visualNodes] },
              `Add ${nodes.length} items from transcript`
            );
          }}
          startPosition={{ x: 0, y: 0 }}
        />
      )}
    </div>
  );
};
// Clients View
const ClientsView = ({ boards, onOpenBoard, clients, onClientsChange }: {
  boards: Board[];
  onOpenBoard: (board: Board) => void;
  clients: Client[];
  onClientsChange: (clients: Client[]) => void;
}) => {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'prospect'>('all');
  const [isLoading, setIsLoading] = useState(false);

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const clientBoards = selectedClientId ? boards.filter(b => b.clientId === selectedClientId) : [];

  const filteredClients = clients.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.company?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || c.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const handleAddClient = async (data: Partial<Client>) => {
    setIsLoading(true);
    try {
      // Save to fan_consulting database
      const org = await organizationsApi.create({
        name: data.name || 'New Client',
        website: data.website || undefined,
        industry: data.industry || undefined
      });

      // Convert to Client format and add to local state
      const newClient: Client = {
        id: org.id,
        name: org.name,
        slug: org.slug,
        company: org.name,
        logo_url: org.logo_url,
        website: org.website,
        industry: org.industry,
        color: generateClientColor(org.id),
        status: 'active',
        createdAt: new Date(org.created_at),
        notes: ''
      };
      onClientsChange([...clients, newClient]);
      setShowAddModal(false);
    } catch (error) {
      console.error('Failed to create client:', error);
      alert('Failed to create client. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateClient = (id: string, updates: Partial<Client>) => {
    onClientsChange(clients.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const getBoardCountForClient = (clientId: string) => boards.filter(b => b.clientId === clientId).length;

  return (
    <div className="flex-1 flex bg-gray-50">
      {/* Clients List */}
      <div className={`${selectedClientId ? 'w-80' : 'flex-1'} border-r border-gray-200 bg-white flex flex-col transition-all`}>
        <header className="border-b border-gray-200 px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Clients</h1>
              <p className="text-xs text-gray-500">{clients.length} total</p>
            </div>
            <button onClick={() => setShowAddModal(true)} className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search clients..."
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex gap-1 mt-3">
            {(['all', 'active', 'inactive', 'prospect'] as const).map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filterStatus === status ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredClients.map(client => (
            <motion.div
              key={client.id}
              whileHover={{ scale: 1.01 }}
              onClick={() => setSelectedClientId(client.id)}
              className={`p-3 rounded-xl cursor-pointer transition-all ${selectedClientId === client.id ? 'bg-indigo-50 border-2 border-indigo-200' : 'bg-white border border-gray-100 hover:border-gray-200 hover:shadow-sm'}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: client.color }}>
                  {client.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 text-sm truncate">{client.name}</h3>
                  <p className="text-xs text-gray-500 truncate">{client.company}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${client.status === 'active' ? 'bg-green-100 text-green-700' : client.status === 'prospect' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                    {client.status}
                  </span>
                  <span className="text-[10px] text-gray-400">{getBoardCountForClient(client.id)} boards</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Client Detail View */}
      {selectedClient && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={() => setSelectedClientId(null)} className="p-2 hover:bg-gray-100 rounded-lg lg:hidden">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl" style={{ backgroundColor: selectedClient.color }}>
                  {selectedClient.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedClient.name}</h2>
                  <p className="text-sm text-gray-500">{selectedClient.company}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={selectedClient.status}
                  onChange={(e) => handleUpdateClient(selectedClient.id, { status: e.target.value as Client['status'] })}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border-0 ${selectedClient.status === 'active' ? 'bg-green-100 text-green-700' : selectedClient.status === 'prospect' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="prospect">Prospect</option>
                </select>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-6">
            {/* Contact Info */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <UserCircle className="w-4 h-4 text-gray-400" />
                Contact Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-sm text-gray-900">{selectedClient.email || 'Not set'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Phone</p>
                    <p className="text-sm text-gray-900">{selectedClient.phone || 'Not set'}</p>
                  </div>
                </div>
              </div>
              {selectedClient.notes && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-1">Notes</p>
                  <p className="text-sm text-gray-700">{selectedClient.notes}</p>
                </div>
              )}
            </div>

            {/* Client Boards */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <FolderKanban className="w-4 h-4 text-gray-400" />
                  Boards ({clientBoards.length})
                </h3>
                <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
                  <Plus className="w-4 h-4" /> New Board
                </button>
              </div>
              
              {clientBoards.length > 0 ? (
                <div className="space-y-2">
                  {clientBoards.map(board => (
                    <motion.div
                      key={board.id}
                      whileHover={{ scale: 1.01 }}
                      onClick={() => onOpenBoard(board)}
                      className="p-3 rounded-lg border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/50 cursor-pointer transition-all flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${board.status === 'active' ? 'bg-green-100' : board.status === 'completed' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                          <Layout className={`w-4 h-4 ${board.status === 'active' ? 'text-green-600' : board.status === 'completed' ? 'text-blue-600' : 'text-gray-600'}`} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{board.name}</p>
                          <p className="text-xs text-gray-500">{board.visualNodes.length} elements • {board.progress || 0}% complete</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${board.status === 'active' ? 'bg-green-100 text-green-700' : board.status === 'completed' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                          {board.status}
                        </span>
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <FolderOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No boards assigned to this client</p>
                  <button className="mt-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium">Create first board</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Client Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Client</h2>
              <form onSubmit={(e) => { 
                e.preventDefault(); 
                const form = e.target as HTMLFormElement;
                handleAddClient({
                  name: (form.elements.namedItem('name') as HTMLInputElement).value,
                  company: (form.elements.namedItem('company') as HTMLInputElement).value,
                  email: (form.elements.namedItem('email') as HTMLInputElement).value,
                  phone: (form.elements.namedItem('phone') as HTMLInputElement).value,
                });
              }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Client Name *</label>
                    <input name="name" type="text" required className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Enter client name" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                    <input name="company" type="text" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Company name" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input name="email" type="email" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="email@example.com" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input name="phone" type="tel" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="555-0100" />
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button type="button" onClick={() => setShowAddModal(false)} disabled={isLoading} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50">Cancel</button>
                  <button type="submit" disabled={isLoading} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50">
                    {isLoading ? 'Adding...' : 'Add Client'}
                  </button>
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  
  // Swipe to open sidebar on mobile
  const touchStartX = useRef<number | null>(null);
  
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      // Only track swipes from left edge (first 30px)
      if (e.touches[0].clientX < 30) {
        touchStartX.current = e.touches[0].clientX;
      }
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      if (touchStartX.current === null) return;
      const diff = e.touches[0].clientX - touchStartX.current;
      // If swiped right more than 50px, open sidebar
      if (diff > 50 && !mobileSidebarOpen) {
        setMobileSidebarOpen(true);
        touchStartX.current = null;
      }
    };
    
    const handleTouchEnd = () => {
      touchStartX.current = null;
    };
    
    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [mobileSidebarOpen]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [activeBoard, setActiveBoard] = useState<Board | null>(null);
  const [notes, setNotes] = useState<ProjectNote[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true);
  const [activeDocument, setActiveDocument] = useState<ClientDocument | null>(null);
  const [showPDFEditor, setShowPDFEditor] = useState(false);
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [supabaseConnected, setSupabaseConnected] = useState(false);
  const [supabaseTablesExist, setSupabaseTablesExist] = useState(true); // Assume true, set false on first error

  // Check if current user is a guest collaborator
  const guestCollaboratorInfo = useMemo(() => {
    try {
      const collabUser = localStorage.getItem('fan-canvas-collab-user');
      if (!collabUser) return null;
      const parsed = JSON.parse(collabUser);
      const joinedAt = new Date(parsed.joinedAt);
      const hoursSinceJoin = (Date.now() - joinedAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceJoin < 24 && parsed.name) {
        return {
          name: parsed.name,
          isGuest: true,
          role: 'Collaborator'
        };
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  // Fetch clients from fan_consulting database on mount, fallback to localStorage
  useEffect(() => {
    let isMounted = true;

    // Helper to check if error is an abort error
    const isAbortError = (error: unknown): boolean => {
      if (!error) return false;
      if (error instanceof Error) {
        return error.name === 'AbortError' ||
               (error.message?.includes('aborted') ?? false) ||
               (error.message?.includes('signal') ?? false);
      }
      return false;
    };

    const loadClientsFromLocalStorage = () => {
      const savedClients = localStorage.getItem('fan-canvas-clients');
      if (savedClients) {
        try {
          const parsed = JSON.parse(savedClients);
          if (isMounted) {
            setClients(parsed.map((c: any) => ({
              ...c,
              createdAt: new Date(c.createdAt)
            })));
          }
        } catch (e) {
          console.error('Failed to parse saved clients:', e);
        }
      }
    };

    const fetchClients = async () => {
      // First load from localStorage immediately for fast UI
      loadClientsFromLocalStorage();

      // Then try to fetch from Supabase
      if (isSupabaseConfigured()) {
        try {
          const orgs = await organizationsApi.getAll();
          if (!isMounted) return;

          const mappedClients: Client[] = orgs.map(org => ({
            id: org.id,
            name: org.name,
            slug: org.slug,
            company: org.name,
            logo_url: org.logo_url,
            website: org.website,
            industry: org.industry,
            color: generateClientColor(org.id),
            status: 'active' as const,
            createdAt: new Date(org.created_at),
            notes: ''
          }));
          if (isMounted) {
            setClients(mappedClients);
            setSupabaseConnected(true);
            // Also save to localStorage as backup
            localStorage.setItem('fan-canvas-clients', JSON.stringify(mappedClients));
          }
        } catch (error) {
          // Silently handle abort errors
          if (!isAbortError(error)) {
            console.error('Failed to fetch clients from Supabase:', error);
          }
          // Already loaded from localStorage above
        }
      } else {
        console.log('Supabase not configured, using localStorage');
      }
      if (isMounted) {
        setIsLoadingClients(false);
      }
    };

    // Set a timeout to ensure loading completes even if fetch hangs
    const loadingTimeout = setTimeout(() => {
      if (isMounted) {
        setIsLoadingClients(false);
      }
    }, 3000);

    fetchClients();

    return () => {
      isMounted = false;
      clearTimeout(loadingTimeout);
    };
  }, []);

  const handleOpenBoard = (board: Board) => { setActiveBoard(board); setCurrentView('meeting'); };

  // Auto-save to localStorage and Supabase whenever board updates
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleUpdateBoard = (updates: Partial<Board>) => {
    if (activeBoard) {
      const updatedBoard = { ...activeBoard, ...updates, lastActivity: new Date() };
      setActiveBoard(updatedBoard);
      setBoards(prev => {
        const newBoards = prev.map(b => b.id === activeBoard.id ? updatedBoard : b);
        // Auto-save with debounce
        if (autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current);
        }
        autoSaveTimeoutRef.current = setTimeout(async () => {
          // Save to localStorage
          localStorage.setItem('fan-canvas-boards', JSON.stringify(newBoards));
          console.log('Auto-saved board to localStorage:', updatedBoard.name);

          // Save to Supabase if configured and tables exist
          if (isSupabaseConfigured() && supabaseTablesExist) {
            try {
              await boardsApi.update(updatedBoard.id, {
                name: updatedBoard.name,
                visual_nodes: updatedBoard.visualNodes,
                zoom: updatedBoard.zoom || 1,
                pan_x: updatedBoard.panX || 0,
                pan_y: updatedBoard.panY || 0,
                last_activity: new Date().toISOString()
              });
              console.log('Auto-saved board to Supabase:', updatedBoard.name);
            } catch (error: any) {
              // Check if table doesn't exist (PGRST205 error)
              if (error?.code === 'PGRST205') {
                console.warn('Supabase tables not set up. Run database/supabase_setup.sql in your Supabase SQL Editor.');
                setSupabaseTablesExist(false);
              } else {
                console.error('Failed to save board to Supabase:', error);
              }
            }
          }
        }, 500);
        return newBoards;
      });
    }
  };

  // Load boards from Supabase (primary) and localStorage (fallback) on mount
  const boardsLoadedRef = useRef(false);
  useEffect(() => {
    if (boardsLoadedRef.current) return; // Only load once
    boardsLoadedRef.current = true;

    const loadBoards = async () => {
      // Try to load from Supabase first
      if (isSupabaseConfigured()) {
        try {
          console.log('Loading boards from Supabase...');
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
          
          const response = await fetch(`${supabaseUrl}/rest/v1/canvas_boards?order=last_activity.desc`, {
            method: 'GET',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
            }
          });
          
          if (response.ok) {
            const supabaseBoards = await response.json();
            if (supabaseBoards && supabaseBoards.length > 0) {
              const convertedBoards = supabaseBoards.map((b: any) => ({
                id: b.id,
                name: b.name,
                ownerId: b.owner_id || '',
                clientId: b.organization_id || undefined,
                visualNodes: b.visual_nodes || [],
                createdAt: new Date(b.created_at),
                zoom: b.zoom || 1,
                panX: b.pan_x || 0,
                panY: b.pan_y || 0,
                status: b.status || 'active',
                progress: b.progress || 0,
                lastActivity: b.last_activity ? new Date(b.last_activity) : new Date(),
                participants: 1
              }));
              setBoards(convertedBoards);
              // Also save to localStorage as cache
              localStorage.setItem('fan-canvas-boards', JSON.stringify(convertedBoards));
              console.log('Loaded', convertedBoards.length, 'boards from Supabase');
              return;
            }
          }
        } catch (err) {
          console.error('Failed to load boards from Supabase:', err);
        }
      }

      // Fallback to localStorage
      const savedBoards = localStorage.getItem('fan-canvas-boards');
      if (savedBoards) {
        try {
          const parsed = JSON.parse(savedBoards);
          // Clean up orphan connectors (connectors referencing non-existent nodes)
          const cleanedBoards = parsed.map((b: any) => {
            const nodeIds = new Set(b.visualNodes?.map((n: any) => n.id) || []);
            const cleanedNodes = b.visualNodes?.filter((n: any) => {
              // Keep non-connectors
              if (n.type !== 'connector') return true;
              // Keep connectors without from/to (standalone lines)
              if (!n.connectorFrom && !n.connectorTo) return true;
              // Only keep connectors where both referenced nodes exist
              return nodeIds.has(n.connectorFrom) && nodeIds.has(n.connectorTo);
            }) || [];
            return {
              ...b,
              visualNodes: cleanedNodes,
              createdAt: new Date(b.createdAt),
              lastActivity: b.lastActivity ? new Date(b.lastActivity) : new Date()
            };
          });
          setBoards(cleanedBoards);
          // Save cleaned boards back to localStorage
          localStorage.setItem('fan-canvas-boards', JSON.stringify(cleanedBoards));
          console.log('Loaded boards from localStorage (cleaned orphan connectors)');

          // Sync localStorage boards to Supabase for sharing
          if (isSupabaseConfigured()) {
            console.log('Syncing', cleanedBoards.length, 'boards to Supabase...');
            cleanedBoards.forEach(async (board: Board) => {
              try {
                // Try to create or update the board in Supabase
                const existingBoard = await boardsApi.getById(board.id);
                if (existingBoard) {
                  // Update existing board
                  await boardsApi.update(board.id, {
                    name: board.name,
                    visual_nodes: board.visualNodes,
                    zoom: board.zoom || 1,
                    pan_x: board.panX || 0,
                    pan_y: board.panY || 0,
                    last_activity: new Date().toISOString()
                  });
                  console.log('Updated board in Supabase:', board.name);
                } else {
                  // Create new board in Supabase
                  await boardsApi.create({
                    id: board.id,
                    name: board.name,
                    owner_id: board.ownerId || '1',
                    organization_id: board.clientId || null,
                    visual_nodes: board.visualNodes,
                    zoom: board.zoom || 1,
                    pan_x: board.panX || 0,
                    pan_y: board.panY || 0,
                    status: (board.status === 'completed' ? 'archived' : board.status || 'active') as 'active' | 'archived' | 'template',
                    progress: board.progress || 0,
                    last_activity: new Date().toISOString()
                  });
                  console.log('Synced board to Supabase:', board.name);
                }
              } catch (error: any) {
                if (error?.code === 'PGRST205') {
                  console.warn('Supabase tables not set up. Run database/supabase_setup.sql');
                } else if (error?.code !== '23505') { // Ignore duplicate key errors
                  console.error('Failed to sync board to Supabase:', board.name, error);
                }
              }
            });
          }
        } catch (e) {
          console.error('Failed to load saved boards:', e);
        }
      }
    };

    loadBoards();
  }, []);

  // Check for board URL parameter and auto-load that board
  const boardParamHandledRef = useRef(false);
  const [sharedBoardError, setSharedBoardError] = useState<string | null>(null);

  useEffect(() => {
    if (boardParamHandledRef.current) return;

    const boardId = searchParams.get('board');
    const collaborator = searchParams.get('collaborator');

    if (!boardId) return;

    // Wait for initial board load to complete
    if (!boardsLoadedRef.current) {
      return; // Effect will re-run when boards change
    }

    const loadBoard = async () => {
      // Store collaborator name if provided
      if (collaborator) {
        localStorage.setItem('fan-canvas-guest-name', collaborator);
        localStorage.setItem('fan-canvas-collab-user', JSON.stringify({
          name: collaborator,
          joinedAt: new Date().toISOString()
        }));
      }

      // For collaborators, ALWAYS fetch from Supabase to get latest data
      // This ensures shared boards show the same content
      if (collaborator && isSupabaseConfigured()) {
        try {
          console.log('Collaborator joining - fetching latest from Supabase:', boardId);
          const supabaseBoard = await boardsApi.getById(boardId);
          if (supabaseBoard) {
            const board: Board = {
              id: supabaseBoard.id,
              name: supabaseBoard.name,
              ownerId: supabaseBoard.owner_id || '',
              visualNodes: supabaseBoard.visual_nodes || [],
              createdAt: new Date(supabaseBoard.created_at),
              zoom: supabaseBoard.zoom || 1,
              panX: supabaseBoard.pan_x || 0,
              panY: supabaseBoard.pan_y || 0,
              status: supabaseBoard.status as 'active' | 'completed' | 'archived' || 'active',
              progress: supabaseBoard.progress || 0,
              lastActivity: supabaseBoard.last_activity ? new Date(supabaseBoard.last_activity) : new Date(),
              clientId: supabaseBoard.organization_id || undefined
            };
            console.log('Loaded shared board from Supabase for collaborator:', board.name, 'nodes:', board.visualNodes.length);
            boardParamHandledRef.current = true;
            // Add to local boards list so it persists during session
            setBoards(prev => {
              const exists = prev.find(b => b.id === board.id);
              if (exists) {
                return prev.map(b => b.id === board.id ? board : b);
              }
              return [...prev, board];
            });
            setActiveBoard(board);
            setCurrentView('meeting');
            setSearchParams({});
            return;
          }
        } catch (err) {
          console.error('Failed to fetch board from Supabase:', err);
        }
      }

      // For non-collaborators, try to find the board locally first
      const localBoard = boards.find(b => b.id === boardId);
      if (localBoard) {
        console.log('Auto-loading board from localStorage:', localBoard.name);
        boardParamHandledRef.current = true;
        setActiveBoard(localBoard);
        setCurrentView('meeting');
        setSearchParams({});
        return;
      }

      // If not found locally, try to fetch from Supabase
      if (isSupabaseConfigured()) {
        try {
          console.log('Board not found locally, fetching from Supabase:', boardId);
          const supabaseBoard = await boardsApi.getById(boardId);
          if (supabaseBoard) {
            // Convert Supabase board to our Board format
            const board: Board = {
              id: supabaseBoard.id,
              name: supabaseBoard.name,
              ownerId: supabaseBoard.owner_id || '',
              visualNodes: supabaseBoard.visual_nodes || [],
              createdAt: new Date(supabaseBoard.created_at),
              zoom: supabaseBoard.zoom || 1,
              panX: supabaseBoard.pan_x || 0,
              panY: supabaseBoard.pan_y || 0,
              status: supabaseBoard.status as 'active' | 'completed' | 'archived' || 'active',
              progress: supabaseBoard.progress || 0,
              lastActivity: supabaseBoard.last_activity ? new Date(supabaseBoard.last_activity) : new Date(),
              clientId: supabaseBoard.organization_id || undefined
            };

            console.log('Loaded shared board from Supabase:', board.name);
            boardParamHandledRef.current = true;
            // Add to local boards array
            setBoards(prev => [...prev, board]);
            setActiveBoard(board);
            setCurrentView('meeting');
            setSearchParams({});
            return;
          }
        } catch (error) {
          console.error('Failed to fetch board from Supabase:', error);
        }
      }

      // Board not found anywhere - show error
      console.warn('Board not found for ID:', boardId);
      boardParamHandledRef.current = true;
      setSharedBoardError(`Board "${boardId}" was not found. It may have been deleted or the link is invalid.`);
      setSearchParams({});
    };

    loadBoard();
  }, [boards, searchParams, setSearchParams]);

  // Load notes from localStorage on mount (only once)
  const notesLoadedRef = useRef(false);
  useEffect(() => {
    if (notesLoadedRef.current) return; // Only load once
    notesLoadedRef.current = true;

    const savedNotes = localStorage.getItem('fan-canvas-notes');
    if (savedNotes) {
      try {
        const parsed = JSON.parse(savedNotes);
        setNotes(parsed.map((n: any) => ({
          ...n,
          createdAt: new Date(n.createdAt),
          updatedAt: n.updatedAt ? new Date(n.updatedAt) : new Date()
        })));
        console.log('Loaded notes from localStorage');
      } catch (e) {
        console.error('Failed to load saved notes:', e);
      }
    }
  }, []);

  // Auto-save notes to localStorage and Supabase whenever notes change
  const notesAutoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (notes.length === 0) return;

    if (notesAutoSaveTimeoutRef.current) {
      clearTimeout(notesAutoSaveTimeoutRef.current);
    }

    notesAutoSaveTimeoutRef.current = setTimeout(async () => {
      // Save to localStorage
      localStorage.setItem('fan-canvas-notes', JSON.stringify(notes));
      console.log('Auto-saved notes to localStorage');

      // Save to Supabase if configured and tables exist
      if (isSupabaseConfigured() && supabaseTablesExist) {
        try {
          // For each note, upsert to Supabase
          for (const note of notes) {
            const supabaseNote = {
              id: note.id,
              title: note.title,
              content: note.content || '',
              icon: note.icon || '📝',
              parent_id: note.parentId || null,
              sort_order: 0,
              tags: note.tags || [],
              is_ai_generated: note.tags?.includes('ai-summary') || note.tags?.includes('auto-generated') || false,
              source_board_id: note.linkedBoardIds?.[0] || null,
              owner_id: null,
              organization_id: null
            };

            try {
              await notesApi.update(note.id, supabaseNote);
            } catch (updateError: any) {
              // Check if table doesn't exist
              if (updateError?.code === 'PGRST205') {
                console.warn('Supabase tables not set up. Run database/supabase_setup.sql in your Supabase SQL Editor.');
                setSupabaseTablesExist(false);
                break;
              }
              // If update fails (note doesn't exist), try to create
              try {
                await notesApi.create(supabaseNote);
              } catch (createError: any) {
                if (createError?.code === 'PGRST205') {
                  console.warn('Supabase tables not set up. Run database/supabase_setup.sql in your Supabase SQL Editor.');
                  setSupabaseTablesExist(false);
                  break;
                }
                console.error('Failed to save note to Supabase:', createError);
              }
            }
          }
          if (supabaseTablesExist) {
            console.log('Auto-saved notes to Supabase');
          }
        } catch (error: any) {
          if (error?.code === 'PGRST205') {
            console.warn('Supabase tables not set up. Run database/supabase_setup.sql in your Supabase SQL Editor.');
            setSupabaseTablesExist(false);
          } else {
            console.error('Failed to save notes to Supabase:', error);
          }
        }
      }
    }, 1000);
  }, [notes]);

  const handleBackToDashboard = () => { setCurrentView('dashboard'); setActiveBoard(null); };
  
  // Handler for creating AI summary notes from whiteboard
  const handleCreateAISummary = useCallback((boardId: string, boardName: string, summaryContent: string) => {
    // Check if an AI summary note already exists for this board
    const existingNoteIndex = notes.findIndex(n => 
      n.linkedBoardIds.includes(boardId) && n.title.includes('AI Summary')
    );
    
    if (existingNoteIndex >= 0) {
      // Update existing note
      setNotes(prev => prev.map((n, i) => 
        i === existingNoteIndex 
          ? { ...n, content: summaryContent, updatedAt: new Date() }
          : n
      ));
    } else {
      // Create new AI summary note
      const newNote: ProjectNote = {
        id: generateId(),
        title: `${boardName} - AI Summary`,
        content: summaryContent,
        icon: '🤖',
        parentId: null,
        linkedBoardIds: [boardId],
        tags: ['ai-summary', 'auto-generated'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setNotes(prev => [newNote, ...prev]);
      
      // Also update the board to link to this note
      setBoards(prev => prev.map(b => 
        b.id === boardId 
          ? { ...b, linkedNoteIds: [...(b.linkedNoteIds || []), newNote.id] }
          : b
      ));
    }
  }, [notes]);

  // Handler for creating transcript notes from recordings
  // Supports both legacy format (raw text) and new format (pre-formatted HTML)
  const handleCreateTranscriptNote = useCallback((boardId: string, titleOrBoardName: string, transcriptContent: string, startTime: Date, endTime: Date) => {
    const formatDate = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const formatTime = (date: Date) => date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000 / 60);

    // Check if content is already HTML (from new TranscriptionPanel)
    const isPreFormattedHTML = transcriptContent.includes('<div') || transcriptContent.includes('<p') || transcriptContent.includes('<h');
    
    let noteContent: string;
    let noteTitle: string;
    
    if (isPreFormattedHTML) {
      // New format: content is already formatted HTML, title is the actual title
      noteContent = `<h2>🎙️ Meeting Transcript</h2>
<p><strong>Date:</strong> ${formatDate(new Date())}</p>
<hr/>
${transcriptContent}`;
      noteTitle = titleOrBoardName;
    } else {
      // Legacy format: content is raw text, titleOrBoardName is board name
      noteContent = `<h2>Recording Session</h2>
<p><strong>Date:</strong> ${formatDate(startTime)}</p>
<p><strong>Time:</strong> ${formatTime(startTime)} - ${formatTime(endTime)} (${duration} min)</p>
<p><strong>Board:</strong> ${titleOrBoardName}</p>
<hr/>
<h3>Full Transcript</h3>
<pre style="white-space: pre-wrap; font-family: inherit; background: #f5f5f5; padding: 12px; border-radius: 8px;">${transcriptContent}</pre>`;
      noteTitle = `${titleOrBoardName} - Transcript ${formatDate(startTime)}`;
    }

    const newNote: ProjectNote = {
      id: generateId(),
      title: noteTitle,
      content: noteContent,
      icon: '🎙️',
      parentId: null,
      linkedBoardIds: [boardId],
      tags: ['transcript', 'recording', 'diarization'],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setNotes(prev => [newNote, ...prev]);

    // Also update the board to link to this note
    setBoards(prev => prev.map(b =>
      b.id === boardId
        ? { ...b, linkedNoteIds: [...(b.linkedNoteIds || []), newNote.id] }
        : b
    ));
  }, []);

  const handleCreateBoard = async (name: string, templateId: string, clientId: string) => {
    const template = BOARD_TEMPLATES.find(t => t.id === templateId);
    const newBoard: Board = {
      id: generateId(),
      name,
      ownerId: '1',
      clientId,
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
    // Save to Supabase FIRST if configured - this ensures share links work immediately
    if (isSupabaseConfigured()) {
      try {
        console.log('Creating board in Supabase:', newBoard.name, newBoard.id);
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Supabase timeout after 10s')), 10000)
        );
        await Promise.race([
          boardsApi.create({
            id: newBoard.id,
            name: newBoard.name,
            owner_id: newBoard.ownerId || '1',
            organization_id: clientId || null,
            visual_nodes: newBoard.visualNodes,
            zoom: newBoard.zoom || 1,
            pan_x: newBoard.panX || 0,
            pan_y: newBoard.panY || 0,
            status: 'active',
            progress: newBoard.progress || 0,
            last_activity: new Date().toISOString()
          }),
          timeoutPromise
        ]);
        console.log('✅ SUCCESS: Board created in Supabase:', newBoard.name, newBoard.id);
        setSupabaseTablesExist(true);
      } catch (error: any) {
        console.error('❌ FAILED to create board in Supabase:', error?.message || error?.code || error);
        // Don't block - board will still be created locally
        if (error?.code === 'PGRST205') {
          console.warn('Supabase tables not set up. Run database/supabase_setup.sql');
          setSupabaseTablesExist(false);
        }
      }
    } else {
      console.warn('⚠️ Supabase not configured - board only saved locally, share links will not work');
    }

    // Save to localStorage
    setBoards(prev => {
      const updated = [...prev, newBoard];
      localStorage.setItem('fan-canvas-boards', JSON.stringify(updated));
      return updated;
    });
    setActiveBoard(newBoard);
    setCurrentView('meeting');
  };

  const handleDeleteBoard = async (boardId: string) => {
    // If we're viewing this board, go back to dashboard
    if (activeBoard?.id === boardId) {
      setActiveBoard(null);
      setCurrentView('dashboard');
    }

    // Remove from local state
    setBoards(prev => {
      const updated = prev.filter(b => b.id !== boardId);
      // Save to localStorage
      localStorage.setItem('fan-canvas-boards', JSON.stringify(updated));
      return updated;
    });

    // Delete from Supabase if configured
    if (isSupabaseConfigured() && supabaseTablesExist) {
      try {
        await boardsApi.delete(boardId);
        console.log('Deleted board from Supabase:', boardId);
      } catch (error: any) {
        if (error?.code === 'PGRST205') {
          console.warn('Supabase tables not set up');
          setSupabaseTablesExist(false);
        } else {
          console.error('Failed to delete board from Supabase:', error);
        }
      }
    }
  };

  // Sync all local boards to Supabase
  const handleSyncToCloud = async (): Promise<number> => {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured');
    }

    let synced = 0;
    for (const board of boards) {
      try {
        // Check if exists
        const existing = await boardsApi.getById(board.id);
        if (existing) {
          // Update
          await boardsApi.update(board.id, {
            name: board.name,
            visual_nodes: board.visualNodes,
            zoom: board.zoom || 1,
            pan_x: board.panX || 0,
            pan_y: board.panY || 0,
            last_activity: new Date().toISOString()
          });
        } else {
          // Create
          await boardsApi.create({
            id: board.id,
            name: board.name,
            owner_id: board.ownerId || '1',
            organization_id: board.clientId || null,
            visual_nodes: board.visualNodes,
            zoom: board.zoom || 1,
            pan_x: board.panX || 0,
            pan_y: board.panY || 0,
            status: 'active',
            progress: board.progress || 0,
            last_activity: new Date().toISOString()
          });
        }
        synced++;
        console.log('✅ Synced:', board.name);
      } catch (err) {
        console.error('❌ Failed to sync:', board.name, err);
      }
    }
    return synced;
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
        // Switch to dashboard to create a new board (requires client selection)
        setCurrentView('dashboard');
      }
    } else {
      setCurrentView(view);
      setActiveBoard(null);
    }
  };

  const handleAddClient = async (data: Partial<Client>) => {
    const clientName = data.name || 'New Client';

    // If Supabase is configured, try to create in database
    if (isSupabaseConfigured() && supabaseConnected) {
      try {
        const org = await organizationsApi.create({
          name: clientName,
          website: data.website || undefined,
          industry: data.industry || undefined
        });

        const newClient: Client = {
          id: org.id,
          name: org.name,
          slug: org.slug,
          company: org.name,
          logo_url: org.logo_url,
          website: org.website,
          industry: org.industry,
          color: generateClientColor(org.id),
          status: 'active',
          createdAt: new Date(org.created_at),
          notes: ''
        };
        setClients(prev => {
          const updated = [...prev, newClient];
          localStorage.setItem('fan-canvas-clients', JSON.stringify(updated));
          return updated;
        });
        return;
      } catch (error) {
        console.error('Failed to create client in Supabase:', error);
        // Fall through to local-only creation
      }
    }

    // Create client locally (when Supabase not configured or failed)
    const newClient: Client = {
      id: crypto.randomUUID(),
      name: clientName,
      slug: clientName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      company: clientName,
      logo_url: null,
      website: data.website || null,
      industry: data.industry || null,
      color: generateClientColor(crypto.randomUUID()),
      status: 'active',
      createdAt: new Date(),
      notes: ''
    };
    setClients(prev => {
      const updated = [...prev, newClient];
      localStorage.setItem('fan-canvas-clients', JSON.stringify(updated));
      return updated;
    });
  };

  // ============================================
  // DOCUMENTS HANDLERS
  // ============================================

  // Load documents on mount
  useEffect(() => {
    const loadDocuments = async () => {
      setIsLoadingDocuments(true);
      try {
        const docs = await documentsApi.getAll();
        setDocuments(docs);
      } catch (error) {
        console.error('Error loading documents:', error);
      } finally {
        setIsLoadingDocuments(false);
      }
    };
    loadDocuments();
  }, []);

  // Handle document upload
  const handleDocumentUpload = useCallback(async (files: FileList, clientId?: string) => {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type !== 'application/pdf') continue;

      try {
        // Upload file
        const uploadResult = await uploadDocumentFile(file);
        if (!uploadResult) continue;

        // Create document record
        const newDoc = await documentsApi.create({
          name: file.name.replace(/\.pdf$/i, ''),
          fileUrl: uploadResult.url,
          fileSize: file.size,
          fileType: 'application/pdf',
          pageCount: 1, // Will be updated when PDF is loaded
          clientId,
        });

        if (newDoc) {
          setDocuments(prev => [newDoc, ...prev]);
        }
      } catch (error) {
        console.error('Error uploading document:', error);
      }
    }
  }, []);

  // Handle document delete
  const handleDocumentDelete = useCallback(async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    const success = await documentsApi.delete(documentId);
    if (success) {
      setDocuments(prev => prev.filter(d => d.id !== documentId));
      if (activeDocument?.id === documentId) {
        setActiveDocument(null);
        setShowPDFEditor(false);
      }
    }
  }, [activeDocument]);

  // Handle document rename
  const handleDocumentRename = useCallback(async (documentId: string, newName: string) => {
    const updated = await documentsApi.update(documentId, { name: newName });
    if (updated) {
      setDocuments(prev => prev.map(d => d.id === documentId ? updated : d));
    }
  }, []);

  // Handle document open
  const handleDocumentOpen = useCallback((document: ClientDocument) => {
    setActiveDocument(document);
    setShowPDFEditor(true);
  }, []);

  // Handle document share
  const handleDocumentShare = useCallback((document: ClientDocument) => {
    // This would open a share modal similar to ShareBoardModal
    console.log('Share document:', document);
    // For now, just copy a basic URL to clipboard
    if (document.shareToken) {
      const url = getDocumentShareUrl(document.shareToken);
      navigator.clipboard.writeText(url);
      alert('Share link copied to clipboard!');
    } else {
      alert('Share functionality coming soon!');
    }
  }, []);

  // Handle document download
  const handleDocumentDownload = useCallback((document: ClientDocument) => {
    const a = window.document.createElement('a');
    a.href = document.fileUrl;
    a.download = `${document.name}.pdf`;
    a.click();
  }, []);

  // Handle document save (annotations)
  const handleDocumentSave = useCallback(async (data: { annotations: PDFAnnotation[]; comments: PDFComment[] }) => {
    if (!activeDocument) return;
    
    const success = await documentsApi.updateAnnotations(activeDocument.id, data.annotations);
    if (success) {
      setDocuments(prev => prev.map(d => 
        d.id === activeDocument.id 
          ? { ...d, annotations: data.annotations, comments: data.comments }
          : d
      ));
    }
  }, [activeDocument]);

  return (
    <div className="h-screen flex bg-gray-50 overflow-hidden">
      {/* Shared board error modal */}
      {sharedBoardError && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl p-8 max-w-md mx-4"
          >
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 text-center mb-2">Board Not Found</h2>
            <p className="text-gray-600 text-center mb-6">{sharedBoardError}</p>
            <button
              onClick={() => setSharedBoardError(null)}
              className="w-full px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
            >
              Go to Dashboard
            </button>
          </motion.div>
        </div>
      )}
      {/* Mobile menu button */}
      <button 
        onClick={() => setMobileSidebarOpen(true)}
        className="sm:hidden fixed top-4 left-4 z-30 p-2 bg-white rounded-xl shadow-lg border border-gray-200"
      >
        <Menu className="w-5 h-5 text-gray-600" />
      </button>
      
      <Sidebar 
        currentView={currentView} 
        onViewChange={handleViewChange} 
        isCollapsed={sidebarCollapsed} 
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} 
        userName={guestCollaboratorInfo?.name || 'Scott Jones'} 
        isGuest={!!guestCollaboratorInfo}
        userRole={guestCollaboratorInfo?.role || 'Owner'}
        isMobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />
      {currentView === 'dashboard' && (
        <DashboardView
          boards={boards}
          onOpenBoard={handleOpenBoard}
          onCreateBoard={handleCreateBoard}
          onDeleteBoard={handleDeleteBoard}
          clients={clients}
          onAddClient={handleAddClient}
          isLoadingClients={isLoadingClients}
          onSyncToCloud={handleSyncToCloud}
        />
      )}
      {currentView === 'meeting' && activeBoard && <MeetingView board={activeBoard} onUpdateBoard={handleUpdateBoard} onBack={handleBackToDashboard} onCreateAISummary={handleCreateAISummary} onCreateTranscriptNote={handleCreateTranscriptNote} />}
      {currentView === 'notes' && <NotesViewRedesigned boards={boards} onOpenBoard={handleOpenBoard} notes={notes} onUpdateNotes={setNotes} clients={clients} />}
      {currentView === 'documents' && (
        <DocumentsView
          documents={documents}
          clients={clients}
          onUpload={handleDocumentUpload}
          onDelete={handleDocumentDelete}
          onRename={handleDocumentRename}
          onOpen={handleDocumentOpen}
          onShare={handleDocumentShare}
          onDownload={handleDocumentDownload}
          isLoading={isLoadingDocuments}
        />
      )}
      {currentView === 'clients' && <ClientsView boards={boards} onOpenBoard={handleOpenBoard} clients={clients} onClientsChange={setClients} />}
      
      {/* PDF Editor Modal */}
      {showPDFEditor && activeDocument && (
        <div className="fixed inset-0 z-50 bg-white">
          <PDFEditor
            documentUrl={activeDocument.fileUrl}
            documentId={activeDocument.id}
            documentName={activeDocument.name}
            clientId={activeDocument.clientId}
            initialAnnotations={activeDocument.annotations}
            onSave={handleDocumentSave}
            onClose={() => {
              setShowPDFEditor(false);
              setActiveDocument(null);
            }}
            showToolbar={true}
            showThumbnails={true}
            showComments={true}
          />
        </div>
      )}
    </div>
  );
}
