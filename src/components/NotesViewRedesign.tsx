// NotesView Redesign - Grouped by Client → Board → Notes
// Modern UI with collapsible sections and beautiful design

import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, Plus, Search, FileText, Trash2, Link as LinkIcon, 
  Layout, ExternalLink, Check, Bold, Italic, Underline,
  List, ListOrdered, Quote, Code,
  ChevronRight, Building2, Layers,
  Clock, Grid3X3, List as ListView,
  Heading1, Heading2, Sparkles
} from 'lucide-react';

// Board type - matches the main app's Board interface
interface Board {
  id: string;
  name: string;
  ownerId: string;
  zoom: number;
  panX: number;
  panY: number;
  clientId?: string;
  visualNodes: any[];
  createdAt: Date;
  status?: 'active' | 'completed' | 'archived';
}

interface Client {
  id: string;
  name: string;
  color: string;
  logo_url?: string | null;
}

interface ProjectNote {
  id: string;
  title: string;
  content: string;
  icon: string;
  parentId: string | null;
  clientId?: string;
  linkedBoardIds: string[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface NotesViewProps {
  boards: Board[];
  onOpenBoard: (board: Board) => void;
  notes: ProjectNote[];
  onUpdateNotes: (notes: ProjectNote[]) => void;
  clients: Client[];
}

const generateId = () => Math.random().toString(36).substring(2, 11);

// Group notes by client and board
interface GroupedNotes {
  ungrouped: ProjectNote[];
  byClient: {
    client: Client | null;
    boards: {
      board: Board | null;
      notes: ProjectNote[];
    }[];
    unlinkedNotes: ProjectNote[];
  }[];
}

export const NotesViewRedesigned: React.FC<NotesViewProps> = ({ 
  boards, 
  onOpenBoard, 
  notes, 
  onUpdateNotes,
  clients 
}) => {
  const [selectedNote, setSelectedNote] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showLinkBoardModal, setShowLinkBoardModal] = useState(false);
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set(['ungrouped', ...clients.map(c => c.id)]));
  const [expandedBoards, setExpandedBoards] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'tree' | 'grid'>('tree');
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'title'>('updated');
  const editorRef = useRef<HTMLDivElement>(null);

  const selectedNoteData = notes.find(n => n.id === selectedNote);

  // Group and filter notes
  const groupedNotes = useMemo((): GroupedNotes => {
    const filtered = notes.filter(n => 
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // Sort notes
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'updated') return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      if (sortBy === 'created') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return a.title.localeCompare(b.title);
    });

    const result: GroupedNotes = {
      ungrouped: [],
      byClient: []
    };

    // Group by client
    const clientMap = new Map<string, { 
      client: Client | null; 
      notesByBoard: Map<string, ProjectNote[]>;
      unlinked: ProjectNote[];
    }>();

    sorted.forEach(note => {
      const derivedClientId = note.clientId || (note.linkedBoardIds.length > 0 
        ? boards.find(b => note.linkedBoardIds.includes(b.id))?.clientId 
        : undefined);

      if (!derivedClientId) {
        if (note.linkedBoardIds.length === 0) {
          result.ungrouped.push(note);
        } else {
          // Has board but no client
          if (!clientMap.has('no-client')) {
            clientMap.set('no-client', { client: null, notesByBoard: new Map(), unlinked: [] });
          }
          const group = clientMap.get('no-client')!;
          note.linkedBoardIds.forEach(boardId => {
            if (!group.notesByBoard.has(boardId)) {
              group.notesByBoard.set(boardId, []);
            }
            group.notesByBoard.get(boardId)!.push(note);
          });
        }
        return;
      }

      if (!clientMap.has(derivedClientId)) {
        const client = clients.find(c => c.id === derivedClientId) || null;
        clientMap.set(derivedClientId, { client, notesByBoard: new Map(), unlinked: [] });
      }

      const group = clientMap.get(derivedClientId)!;
      
      if (note.linkedBoardIds.length === 0) {
        group.unlinked.push(note);
      } else {
        note.linkedBoardIds.forEach(boardId => {
          if (!group.notesByBoard.has(boardId)) {
            group.notesByBoard.set(boardId, []);
          }
          group.notesByBoard.get(boardId)!.push(note);
        });
      }
    });

    // Convert map to array
    clientMap.forEach((group, _clientId) => {
      const boardsArray: { board: Board | null; notes: ProjectNote[] }[] = [];
      group.notesByBoard.forEach((notes, boardId) => {
        const board = boards.find(b => b.id === boardId) || null;
        boardsArray.push({ board, notes: [...new Set(notes)] }); // Dedupe
      });
      
      result.byClient.push({
        client: group.client,
        boards: boardsArray.sort((a, b) => (a.board?.name || '').localeCompare(b.board?.name || '')),
        unlinkedNotes: group.unlinked
      });
    });

    // Sort clients alphabetically
    result.byClient.sort((a, b) => {
      if (!a.client) return 1;
      if (!b.client) return -1;
      return a.client.name.localeCompare(b.client.name);
    });

    return result;
  }, [notes, searchQuery, sortBy, clients, boards]);

  const toggleClient = (clientId: string) => {
    const newExpanded = new Set(expandedClients);
    if (newExpanded.has(clientId)) {
      newExpanded.delete(clientId);
    } else {
      newExpanded.add(clientId);
    }
    setExpandedClients(newExpanded);
  };

  const toggleBoard = (boardId: string) => {
    const newExpanded = new Set(expandedBoards);
    if (newExpanded.has(boardId)) {
      newExpanded.delete(boardId);
    } else {
      newExpanded.add(boardId);
    }
    setExpandedBoards(newExpanded);
  };

  const handleCreateNote = (clientId?: string, boardId?: string) => {
    const newNote: ProjectNote = {
      id: generateId(),
      title: 'Untitled',
      content: '',
      icon: '📄',
      parentId: null,
      clientId,
      linkedBoardIds: boardId ? [boardId] : [],
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    onUpdateNotes([newNote, ...notes]);
    setSelectedNote(newNote.id);
    setEditingContent('');
  };

  const handleUpdateNote = (id: string, updates: Partial<ProjectNote>) => {
    onUpdateNotes(notes.map(n => n.id === id ? { ...n, ...updates, updatedAt: new Date() } : n));
  };

  const handleDeleteNote = (id: string) => {
    onUpdateNotes(notes.filter(n => n.id !== id));
    if (selectedNote === id) {
      setSelectedNote(null);
      setEditingContent('');
    }
  };

  const handleLinkBoard = (boardId: string) => {
    if (selectedNoteData) {
      const board = boards.find(b => b.id === boardId);
      const newLinkedIds = selectedNoteData.linkedBoardIds.includes(boardId)
        ? selectedNoteData.linkedBoardIds.filter(id => id !== boardId)
        : [...selectedNoteData.linkedBoardIds, boardId];
      
      // Also update clientId if linking to a board with a client
      const updates: Partial<ProjectNote> = { linkedBoardIds: newLinkedIds };
      if (board?.clientId && !selectedNoteData.clientId) {
        updates.clientId = board.clientId;
      }
      
      handleUpdateNote(selectedNoteData.id, updates);
    }
  };

  // Formatting
  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const formatToolbar = [
    { icon: Bold, command: 'bold', title: 'Bold' },
    { icon: Italic, command: 'italic', title: 'Italic' },
    { icon: Underline, command: 'underline', title: 'Underline' },
    { type: 'divider' },
    { icon: Heading1, command: 'formatBlock', value: 'h1', title: 'Heading 1' },
    { icon: Heading2, command: 'formatBlock', value: 'h2', title: 'Heading 2' },
    { type: 'divider' },
    { icon: List, command: 'insertUnorderedList', title: 'Bullet List' },
    { icon: ListOrdered, command: 'insertOrderedList', title: 'Numbered List' },
    { type: 'divider' },
    { icon: Quote, command: 'formatBlock', value: 'blockquote', title: 'Quote' },
    { icon: Code, command: 'formatBlock', value: 'pre', title: 'Code' },
    { icon: LinkIcon, command: 'createLink', title: 'Link' },
  ];

  // Note card component
  const NoteCard = ({ note, compact = false }: { note: ProjectNote; compact?: boolean }) => (
    <motion.button
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => { setSelectedNote(note.id); setEditingContent(note.content); }}
      className={`w-full text-left transition-all ${
        selectedNote === note.id 
          ? 'bg-navy-50 ring-2 ring-navy-500' 
          : 'bg-white hover:bg-gray-50 border border-gray-100 hover:border-gray-200'
      } ${compact ? 'p-2 rounded-lg' : 'p-3 rounded-xl shadow-sm'}`}
    >
      <div className="flex items-start gap-2">
        <span className={compact ? 'text-base' : 'text-lg'}>{note.icon}</span>
        <div className="flex-1 min-w-0">
          <p className={`font-medium truncate ${compact ? 'text-xs' : 'text-sm'} text-gray-900`}>
            {note.title || 'Untitled'}
          </p>
          {!compact && (
            <p className="text-xs text-gray-500 truncate mt-0.5" 
               dangerouslySetInnerHTML={{ __html: note.content.replace(/<[^>]+>/g, ' ').slice(0, 60) || 'No content' }} 
            />
          )}
        </div>
        {!compact && (
          <span className="text-[10px] text-gray-400 whitespace-nowrap">
            {new Date(note.updatedAt).toLocaleDateString()}
          </span>
        )}
      </div>
      {!compact && note.tags.length > 0 && (
        <div className="flex gap-1 mt-2 flex-wrap">
          {note.tags.slice(0, 3).map(tag => (
            <span key={tag} className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px]">
              #{tag}
            </span>
          ))}
        </div>
      )}
    </motion.button>
  );

  // Section header component
  const SectionHeader = ({ 
    icon: Icon, 
    title, 
    count, 
    color, 
    expanded, 
    onToggle,
    onAdd,
    logo
  }: { 
    icon: any; 
    title: string; 
    count: number; 
    color?: string;
    expanded: boolean;
    onToggle: () => void;
    onAdd?: () => void;
    logo?: string | null;
  }) => (
    <div className="flex items-center gap-2 py-2 px-1 group">
      <button onClick={onToggle} className="flex items-center gap-2 flex-1 hover:bg-gray-100 rounded-lg p-1 -m-1">
        <motion.div animate={{ rotate: expanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </motion.div>
        {logo ? (
          <img src={logo} alt="" className="w-5 h-5 rounded object-cover" />
        ) : (
          <div className="w-5 h-5 rounded flex items-center justify-center" style={{ backgroundColor: color || '#e5e7eb' }}>
            <Icon className="w-3 h-3 text-white" />
          </div>
        )}
        <span className="font-medium text-sm text-gray-700">{title}</span>
        <span className="text-xs text-gray-400 bg-gray-100 px-1.5 rounded">{count}</span>
      </button>
      {onAdd && (
        <button 
          onClick={onAdd}
          className="p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-200 rounded transition-all"
          title="Add note"
        >
          <Plus className="w-4 h-4 text-gray-500" />
        </button>
      )}
    </div>
  );

  return (
    <div className="flex-1 flex flex-col sm:flex-row bg-gradient-to-br from-gray-50 to-white">
      {/* Sidebar - Notes Tree */}
      <div className="w-full sm:w-72 md:w-80 border-b sm:border-b-0 sm:border-r border-gray-200 flex flex-col bg-white/80 backdrop-blur-sm max-h-[40vh] sm:max-h-none overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4 pl-10 sm:pl-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-navy-500 to-navy-600 flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">Notes</h2>
                <p className="text-[10px] text-gray-500">{notes.length} total</p>
              </div>
            </div>
            <button 
              onClick={() => handleCreateNote()} 
              className="p-2 bg-navy-50 hover:bg-navy-100 rounded-lg transition-colors"
              title="New Note"
            >
              <Plus className="w-4 h-4 text-navy-700" />
            </button>
          </div>
          
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          {/* View & Sort */}
          <div className="flex items-center gap-2 mt-3">
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <button 
                onClick={() => setViewMode('tree')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'tree' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
              >
                <ListView className="w-3.5 h-3.5 text-gray-600" />
              </button>
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
              >
                <Grid3X3 className="w-3.5 h-3.5 text-gray-600" />
              </button>
            </div>
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="flex-1 text-xs bg-gray-100 border-0 rounded-lg py-1.5 px-2 focus:ring-2 focus:ring-navy-500"
            >
              <option value="updated">Recently Updated</option>
              <option value="created">Recently Created</option>
              <option value="title">Alphabetical</option>
            </select>
          </div>
        </div>

        {/* Notes Tree */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {/* Ungrouped Notes */}
          {groupedNotes.ungrouped.length > 0 && (
            <div className="mb-4">
              <SectionHeader 
                icon={FileText}
                title="Ungrouped"
                count={groupedNotes.ungrouped.length}
                color="#9ca3af"
                expanded={expandedClients.has('ungrouped')}
                onToggle={() => toggleClient('ungrouped')}
                onAdd={() => handleCreateNote()}
              />
              <AnimatePresence>
                {expandedClients.has('ungrouped') && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="pl-6 space-y-1 overflow-hidden"
                  >
                    {groupedNotes.ungrouped.map(note => (
                      <NoteCard key={note.id} note={note} compact={viewMode === 'tree'} />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* By Client */}
          {groupedNotes.byClient.map((clientGroup) => {
            const groupClientId = clientGroup.client?.id || 'no-client';
            const isExpanded = expandedClients.has(groupClientId);
            const totalNotes = clientGroup.boards.reduce((acc, b) => acc + b.notes.length, 0) + clientGroup.unlinkedNotes.length;

            return (
              <div key={groupClientId} className="mb-2">
                <SectionHeader 
                  icon={clientGroup.client ? Building2 : Layers}
                  title={clientGroup.client?.name || 'No Client'}
                  count={totalNotes}
                  color={clientGroup.client?.color || '#6b7280'}
                  logo={clientGroup.client?.logo_url}
                  expanded={isExpanded}
                  onToggle={() => toggleClient(groupClientId)}
                  onAdd={() => handleCreateNote(clientGroup.client?.id)}
                />
                
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="pl-4 overflow-hidden"
                    >
                      {/* Boards under client */}
                      {clientGroup.boards.map(({ board, notes: boardNotes }) => {
                        const boardId = board?.id || 'no-board';
                        const isBoardExpanded = expandedBoards.has(boardId) || boardNotes.length <= 3;

                        return (
                          <div key={boardId} className="mb-1">
                            <div className="flex items-center gap-1.5 py-1 px-1 group">
                              <button 
                                onClick={() => toggleBoard(boardId)} 
                                className="flex items-center gap-1.5 flex-1 hover:bg-gray-100 rounded p-0.5 -m-0.5"
                              >
                                <motion.div animate={{ rotate: isBoardExpanded ? 90 : 0 }}>
                                  <ChevronRight className="w-3 h-3 text-gray-300" />
                                </motion.div>
                                <Layout className="w-3.5 h-3.5 text-gray-400" />
                                <span className="text-xs text-gray-600 truncate">{board?.name || 'Unknown Board'}</span>
                                <span className="text-[10px] text-gray-400">({boardNotes.length})</span>
                              </button>
                              {board && (
                                <button 
                                  onClick={() => onOpenBoard(board)}
                                  className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-gray-200 rounded"
                                  title="Open board"
                                >
                                  <ExternalLink className="w-3 h-3 text-gray-400" />
                                </button>
                              )}
                              <button 
                                onClick={() => handleCreateNote(clientGroup.client?.id, board?.id)}
                                className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-gray-200 rounded"
                                title="Add note to board"
                              >
                                <Plus className="w-3 h-3 text-gray-400" />
                              </button>
                            </div>
                            
                            <AnimatePresence>
                              {isBoardExpanded && (
                                <motion.div 
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="pl-5 space-y-1 overflow-hidden"
                                >
                                  {boardNotes.map(note => (
                                    <NoteCard key={note.id} note={note} compact />
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}

                      {/* Unlinked notes under client */}
                      {clientGroup.unlinkedNotes.length > 0 && (
                        <div className="mb-1">
                          <div className="flex items-center gap-1.5 py-1 px-1 text-xs text-gray-400">
                            <FileText className="w-3 h-3" />
                            <span>Unlinked ({clientGroup.unlinkedNotes.length})</span>
                          </div>
                          <div className="pl-5 space-y-1">
                            {clientGroup.unlinkedNotes.map(note => (
                              <NoteCard key={note.id} note={note} compact />
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}

          {/* Empty state */}
          {notes.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-navy-100 to-navy-100 flex items-center justify-center">
                <BookOpen className="w-8 h-8 text-navy-400" />
              </div>
              <p className="font-medium text-gray-700 mb-1">No notes yet</p>
              <p className="text-sm text-gray-400 mb-4">Create your first note to get started</p>
              <button 
                onClick={() => handleCreateNote()}
                className="px-4 py-2 bg-navy-700 text-white rounded-lg text-sm hover:bg-navy-800 transition-colors"
              >
                <Plus className="w-4 h-4 inline mr-1" />
                Create Note
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Note Editor */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedNoteData ? (
          <>
            {/* Editor Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center gap-3 flex-1">
                <button 
                  className="text-2xl hover:bg-gray-100 p-2 rounded-xl transition-colors"
                  title="Change icon"
                >
                  {selectedNoteData.icon}
                </button>
                <input
                  type="text"
                  value={selectedNoteData.title}
                  onChange={(e) => handleUpdateNote(selectedNoteData.id, { title: e.target.value })}
                  className="text-2xl font-bold text-gray-900 bg-transparent border-none focus:outline-none flex-1 placeholder-gray-300"
                  placeholder="Untitled"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowLinkBoardModal(true)}
                  className="px-3 py-1.5 text-sm bg-navy-50 text-navy-800 rounded-lg hover:bg-navy-100 flex items-center gap-2 transition-colors"
                >
                  <LinkIcon className="w-4 h-4" />
                  Link Board
                </button>
                <button
                  onClick={() => handleDeleteNote(selectedNoteData.id)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Breadcrumb / Context */}
            <div className="px-4 py-2 border-b border-gray-50 flex items-center gap-2 text-xs text-gray-500 bg-gray-50/50">
              {selectedNoteData.clientId && (
                <>
                  <Building2 className="w-3 h-3" />
                  <span>{clients.find(c => c.id === selectedNoteData.clientId)?.name || 'Unknown'}</span>
                  <ChevronRight className="w-3 h-3" />
                </>
              )}
              {selectedNoteData.linkedBoardIds.length > 0 && (
                <>
                  <Layout className="w-3 h-3" />
                  {selectedNoteData.linkedBoardIds.map((boardId, i) => {
                    const board = boards.find(b => b.id === boardId);
                    return (
                      <span key={boardId}>
                        <button 
                          onClick={() => board && onOpenBoard(board)}
                          className="hover:text-navy-700 hover:underline"
                        >
                          {board?.name || 'Unknown'}
                        </button>
                        {i < selectedNoteData.linkedBoardIds.length - 1 && ', '}
                      </span>
                    );
                  })}
                </>
              )}
              {!selectedNoteData.clientId && selectedNoteData.linkedBoardIds.length === 0 && (
                <span className="italic text-gray-400">Not linked to any client or board</span>
              )}
              <span className="ml-auto flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Updated {new Date(selectedNoteData.updatedAt).toLocaleDateString()}
              </span>
            </div>

            {/* Formatting Toolbar */}
            <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-1 bg-white sticky top-0 z-10">
              {formatToolbar.map((tool, i) => {
                if ('type' in tool && tool.type === 'divider') {
                  return <div key={i} className="w-px h-5 bg-gray-200 mx-1" />;
                }
                if ('icon' in tool && tool.icon) {
                  const IconComponent = tool.icon;
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        if (tool.command === 'createLink') {
                          const url = prompt('Enter URL:');
                          if (url) execCommand(tool.command, url);
                        } else {
                          execCommand(tool.command, 'value' in tool ? tool.value : undefined);
                        }
                      }}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title={tool.title}
                    >
                      <IconComponent className="w-4 h-4 text-gray-600" />
                    </button>
                  );
                }
                return null;
              })}
            </div>

            {/* Content Editor */}
            <div className="flex-1 p-6 overflow-y-auto">
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={(e) => {
                  const content = (e.target as HTMLDivElement).innerHTML;
                  setEditingContent(content);
                  handleUpdateNote(selectedNoteData.id, { content });
                }}
                dangerouslySetInnerHTML={{ __html: editingContent }}
                className="prose prose-sm max-w-none min-h-[400px] focus:outline-none 
                  [&>h1]:text-3xl [&>h1]:font-bold [&>h1]:mb-4 [&>h1]:text-gray-900
                  [&>h2]:text-xl [&>h2]:font-semibold [&>h2]:mb-3 [&>h2]:text-gray-800
                  [&>p]:mb-3 [&>p]:text-gray-700 [&>p]:leading-relaxed
                  [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:mb-3
                  [&>ol]:list-decimal [&>ol]:pl-6 [&>ol]:mb-3
                  [&>blockquote]:border-l-4 [&>blockquote]:border-navy-300 [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:text-gray-600 [&>blockquote]:bg-navy-50/50 [&>blockquote]:py-2 [&>blockquote]:rounded-r
                  [&>pre]:bg-gray-900 [&>pre]:text-gray-100 [&>pre]:p-4 [&>pre]:rounded-xl [&>pre]:text-sm [&>pre]:overflow-x-auto"
                data-placeholder="Start writing... Use the toolbar above for formatting."
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-sm">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-navy-500 to-navy-600 flex items-center justify-center shadow-lg shadow-navy-200">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Project Notes</h2>
              <p className="text-gray-500 mb-6">
                Organize notes by client and board. Link notes to your canvas boards for seamless context.
              </p>
              <button 
                onClick={() => handleCreateNote()}
                className="px-6 py-3 bg-gradient-to-r from-navy-700 to-navy-600 text-white rounded-xl hover:from-navy-800 hover:to-navy-700 transition-all shadow-lg shadow-navy-200 flex items-center gap-2 mx-auto"
              >
                <Plus className="w-5 h-5" />
                Create Note
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Link Board Modal */}
      <AnimatePresence>
        {showLinkBoardModal && selectedNoteData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowLinkBoardModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[80vh] overflow-hidden flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold text-gray-900 mb-2">Link to Boards</h2>
              <p className="text-sm text-gray-500 mb-4">Select boards to link with this note. The note will appear under the board's client.</p>
              
              {/* Group boards by client */}
              <div className="flex-1 overflow-y-auto space-y-4">
                {/* Boards without clients */}
                {boards.filter(b => !b.clientId).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase mb-2">No Client</p>
                    <div className="space-y-1">
                      {boards.filter(b => !b.clientId).map(board => (
                        <button
                          key={board.id}
                          onClick={() => handleLinkBoard(board.id)}
                          className={`w-full p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                            selectedNoteData.linkedBoardIds.includes(board.id)
                              ? 'border-navy-500 bg-navy-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            selectedNoteData.linkedBoardIds.includes(board.id) ? 'bg-navy-500' : 'bg-gray-100'
                          }`}>
                            {selectedNoteData.linkedBoardIds.includes(board.id) ? (
                              <Check className="w-4 h-4 text-white" />
                            ) : (
                              <Layout className="w-4 h-4 text-gray-500" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 text-sm">{board.name}</p>
                            <p className="text-xs text-gray-500">{board.visualNodes.length} elements</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Boards by client */}
                {clients.map(client => {
                  const clientBoards = boards.filter(b => b.clientId === client.id);
                  if (clientBoards.length === 0) return null;
                  
                  return (
                    <div key={client.id}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: client.color }} />
                        <p className="text-xs font-semibold text-gray-600 uppercase">{client.name}</p>
                      </div>
                      <div className="space-y-1">
                        {clientBoards.map(board => (
                          <button
                            key={board.id}
                            onClick={() => handleLinkBoard(board.id)}
                            className={`w-full p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                              selectedNoteData.linkedBoardIds.includes(board.id)
                                ? 'border-navy-500 bg-navy-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              selectedNoteData.linkedBoardIds.includes(board.id) ? 'bg-navy-500' : 'bg-gray-100'
                            }`}>
                              {selectedNoteData.linkedBoardIds.includes(board.id) ? (
                                <Check className="w-4 h-4 text-white" />
                              ) : (
                                <Layout className="w-4 h-4 text-gray-500" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 text-sm">{board.name}</p>
                              <p className="text-xs text-gray-500">{board.visualNodes.length} elements</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <button
                onClick={() => setShowLinkBoardModal(false)}
                className="mt-4 w-full py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-medium transition-colors"
              >
                Done
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotesViewRedesigned;
