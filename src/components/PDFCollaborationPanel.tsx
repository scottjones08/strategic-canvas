// PDFCollaborationPanel.tsx - Real-time collaboration and comment threads
// Supports @mentions, reactions, thread resolution, and live presence

import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  X,
  Send,
  Check,
  CheckCheck,
  // MoreHorizontal,
  // Smile,
  // AtSign,
  Reply,
  // Trash2,
  // Edit2,
  // Pin,
  // Clock,
  Filter,
  SortAsc,
  ChevronDown,
  ChevronUp,
  Users,
  // Circle,
  // User,
} from 'lucide-react';
import type { AnnotationThread, ThreadComment } from '../lib/pdf-enterprise-utils';
import { extractMentions } from '../lib/pdf-enterprise-utils';

interface PDFCollaborationPanelProps {
  threads: AnnotationThread[];
  currentUserId: string;
  currentPage: number;
  onAddThread: (thread: Omit<AnnotationThread, 'id' | 'createdAt' | 'updatedAt' | 'comments'>, comment: string) => void;
  onAddComment: (threadId: string, comment: Omit<ThreadComment, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onEditComment: (threadId: string, commentId: string, content: string) => void;
  onDeleteComment: (threadId: string, commentId: string) => void;
  onResolveThread: (threadId: string) => void;
  onReopenThread: (threadId: string) => void;
  onDeleteThread: (threadId: string) => void;
  onReactToComment: (threadId: string, commentId: string, emoji: string) => void;
  onGoToThread: (thread: AnnotationThread) => void;
  onClose: () => void;
  isOpen: boolean;
  collaborators: Array<{
    id: string;
    name: string;
    avatar?: string;
    color: string;
    online: boolean;
    currentPage?: number;
  }>;
  mentionableUsers: Array<{
    id: string;
    name: string;
    avatar?: string;
  }>;
}

type FilterOption = 'all' | 'open' | 'resolved' | 'current-page' | 'mentions';
type SortOption = 'newest' | 'oldest' | 'page';

const QUICK_REACTIONS = ['👍', '❤️', '😊', '🎉', '🤔', '👀'];

interface ThreadItemProps {
  thread: AnnotationThread;
  currentUserId: string;
  onAddComment: (comment: string, mentions: string[]) => void;
  onEditComment: (commentId: string, content: string) => void;
  onDeleteComment: (commentId: string) => void;
  onResolve: () => void;
  onReopen: () => void;
  onDelete: () => void;
  onReact: (commentId: string, emoji: string) => void;
  onGoTo: () => void;
  mentionableUsers: Array<{ id: string; name: string; avatar?: string }>;
}

const ThreadItem: React.FC<ThreadItemProps> = ({
  thread,
  currentUserId,
  // currentUserId,
  onAddComment,
  onEditComment,
  onDeleteComment,
  onResolve,
  onReopen,
  onDelete,
  onReact,
  onGoTo,
  mentionableUsers,
}) => {
  const [isExpanded, setIsExpanded] = useState(!thread.resolved);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmitReply = () => {
    if (!replyText.trim()) return;
    const mentions = extractMentions(replyText);
    onAddComment(replyText, mentions);
    setReplyText('');
    setShowReplyInput(false);
  };

  const handleMentionSelect = (user: { id: string; name: string }) => {
    const cursorPosition = inputRef.current?.selectionStart || replyText.length;
    const beforeCursor = replyText.substring(0, cursorPosition);
    const afterCursor = replyText.substring(cursorPosition);
    const lastAtIndex = beforeCursor.lastIndexOf('@');
    
    const newText = beforeCursor.substring(0, lastAtIndex) + `@${user.name} ` + afterCursor;
    setReplyText(newText);
    setShowMentions(false);
    inputRef.current?.focus();
  };

  const handleInputChange = (value: string) => {
    setReplyText(value);
    
    // Check for @ mentions
    const cursorPosition = inputRef.current?.selectionStart || value.length;
    const beforeCursor = value.substring(0, cursorPosition);
    const lastAtIndex = beforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1 && !beforeCursor.substring(lastAtIndex).includes(' ')) {
      const search = beforeCursor.substring(lastAtIndex + 1);
      setMentionSearch(search);
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  const filteredMentionUsers = mentionableUsers.filter(u =>
    u.name.toLowerCase().includes(mentionSearch.toLowerCase())
  );

  const firstComment = thread.comments[0];
  const replies = thread.comments.slice(1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        rounded-lg border transition-colors
        ${thread.resolved 
          ? 'bg-green-50/50 border-green-200' 
          : 'bg-white border-gray-200'
        }
      `}
    >
      {/* Thread Header */}
      <div
        className="flex items-start gap-2 p-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs">
              {firstComment?.authorName?.[0]?.toUpperCase() || 'U'}
            </div>
            <span className="font-medium text-sm text-gray-800">
              {firstComment?.authorName || 'Unknown'}
            </span>
            <span className="text-xs text-gray-400">
              Page {thread.pageNumber}
            </span>
            {thread.resolved && (
              <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1">
                <CheckCheck size={10} />
                Resolved
              </span>
            )}
          </div>
          <p className="text-sm text-gray-700 line-clamp-2">
            {formatCommentWithMentions(firstComment?.content || '')}
          </p>
          {thread.anchor?.text && (
            <p className="text-xs text-gray-400 mt-1 italic border-l-2 border-gray-200 pl-2 truncate">
              "{thread.anchor.text}"
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {replies.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Reply size={12} />
              {replies.length}
            </span>
          )}
          {isExpanded ? (
            <ChevronUp size={16} className="text-gray-400" />
          ) : (
            <ChevronDown size={16} className="text-gray-400" />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {/* Replies */}
            {replies.length > 0 && (
              <div className="px-3 pb-2 space-y-2">
                {replies.map((comment) => (
                  <div
                    key={comment.id}
                    className="ml-6 pl-3 border-l-2 border-gray-200"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-gray-700">
                        {comment.authorName}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatRelativeTime(comment.createdAt)}
                      </span>
                      {comment.edited && (
                        <span className="text-xs text-gray-400">(edited)</span>
                      )}
                    </div>
                    
                    {editingCommentId === comment.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="w-full p-2 border border-gray-200 rounded text-sm resize-none"
                          rows={2}
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              onEditComment(comment.id, editText);
                              setEditingCommentId(null);
                            }}
                            className="px-2 py-1 bg-blue-500 text-white text-xs rounded"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingCommentId(null)}
                            className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-gray-700">
                          {formatCommentWithMentions(comment.content)}
                        </p>
                        
                        {/* Reactions */}
                        {comment.reactions && comment.reactions.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {comment.reactions.map((reaction, i) => (
                              <button
                                key={i}
                                onClick={() => onReact(comment.id, reaction.emoji)}
                                className={`
                                  flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs
                                  ${reaction.users.includes(currentUserId)
                                    ? 'bg-blue-100 border border-blue-300'
                                    : 'bg-gray-100 border border-gray-200 hover:bg-gray-200'
                                  }
                                `}
                              >
                                {reaction.emoji}
                                <span className="text-gray-600">{reaction.users.length}</span>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Comment Actions */}
                        {comment.authorId === currentUserId && (
                          <div className="flex gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                setEditingCommentId(comment.id);
                                setEditText(comment.content);
                              }}
                              className="text-xs text-gray-400 hover:text-gray-600"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => onDeleteComment(comment.id)}
                              className="text-xs text-gray-400 hover:text-red-600"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                        
                        {/* Quick Reactions */}
                        <div className="flex gap-1 mt-1">
                          {QUICK_REACTIONS.slice(0, 3).map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => onReact(comment.id, emoji)}
                              className="p-1 hover:bg-gray-100 rounded text-xs"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Reply Input */}
            {!thread.resolved && (
              <div className="p-3 border-t border-gray-100">
                {showReplyInput ? (
                  <div className="relative">
                    <textarea
                      ref={inputRef}
                      value={replyText}
                      onChange={(e) => handleInputChange(e.target.value)}
                      placeholder={`Reply... (use @ to mention)`}
                      className="w-full p-2 pr-20 border border-gray-200 rounded-lg text-sm resize-none"
                      rows={2}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                          handleSubmitReply();
                        }
                      }}
                    />
                    
                    {/* Mention Autocomplete */}
                    <AnimatePresence>
                      {showMentions && filteredMentionUsers.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute bottom-full left-0 mb-1 w-full max-h-40 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg"
                        >
                          {filteredMentionUsers.map((user) => (
                            <button
                              key={user.id}
                              onClick={() => handleMentionSelect(user)}
                              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 text-left"
                            >
                              <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs">
                                {user.avatar ? (
                                  <img src={user.avatar} alt="" className="w-full h-full rounded-full" />
                                ) : (
                                  user.name[0].toUpperCase()
                                )}
                              </div>
                              <span className="text-sm">{user.name}</span>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                    
                    <div className="absolute bottom-2 right-2 flex gap-1">
                      <button
                        onClick={() => setShowReplyInput(false)}
                        className="p-1.5 text-gray-400 hover:bg-gray-100 rounded"
                      >
                        <X size={14} />
                      </button>
                      <button
                        onClick={handleSubmitReply}
                        disabled={!replyText.trim()}
                        className="p-1.5 text-blue-500 hover:bg-blue-50 rounded disabled:opacity-50"
                      >
                        <Send size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowReplyInput(true)}
                    className="w-full text-left px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 rounded-lg"
                  >
                    Reply...
                  </button>
                )}
              </div>
            )}

            {/* Thread Actions */}
            <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 bg-gray-50/50">
              <button
                onClick={onGoTo}
                className="text-xs text-blue-600 hover:underline"
              >
                Go to comment
              </button>
              <div className="flex gap-2">
                {thread.resolved ? (
                  <button
                    onClick={onReopen}
                    className="text-xs text-gray-600 hover:text-gray-800"
                  >
                    Reopen
                  </button>
                ) : (
                  <button
                    onClick={onResolve}
                    className="text-xs text-green-600 hover:text-green-800 flex items-center gap-1"
                  >
                    <Check size={12} />
                    Resolve
                  </button>
                )}
                {firstComment?.authorId === currentUserId && (
                  <button
                    onClick={onDelete}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export const PDFCollaborationPanel: React.FC<PDFCollaborationPanelProps> = ({
  threads,
  currentUserId,
  // currentUserId,
  currentPage,
  // onAddThread,
  onAddComment,
  onEditComment,
  onDeleteComment,
  onResolveThread,
  onReopenThread,
  onDeleteThread,
  onReactToComment,
  onGoToThread,
  onClose,
  isOpen,
  collaborators,
  mentionableUsers,
}) => {
  const [filter, setFilter] = useState<FilterOption>('all');
  const [sort, setSort] = useState<SortOption>('newest');
  const [showFilters, setShowFilters] = useState(false);

  // Filter and sort threads
  const filteredThreads = useMemo(() => {
    let result = [...threads];
    
    // Apply filter
    switch (filter) {
      case 'open':
        result = result.filter(t => !t.resolved);
        break;
      case 'resolved':
        result = result.filter(t => t.resolved);
        break;
      case 'current-page':
        result = result.filter(t => t.pageNumber === currentPage);
        break;
      case 'mentions':
        result = result.filter(t => 
          t.comments.some(c => 
            c.mentions?.includes(currentUserId) || 
            c.content.includes(`@${currentUserId}`)
          )
        );
        break;
    }
    
    // Apply sort
    switch (sort) {
      case 'newest':
        result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        break;
      case 'oldest':
        result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case 'page':
        result.sort((a, b) => a.pageNumber - b.pageNumber);
        break;
    }
    
    return result;
  }, [threads, filter, sort, currentPage, currentUserId, currentUserId]);

  const onlineCollaborators = collaborators.filter(c => c.online);
  const openThreads = threads.filter(t => !t.resolved).length;

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 360, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      className="h-full bg-white border-l border-gray-200 flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <MessageSquare size={18} className="text-gray-600" />
          <h3 className="font-medium text-gray-700">Comments</h3>
          {openThreads > 0 && (
            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
              {openThreads} open
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <X size={18} />
        </button>
      </div>

      {/* Online Collaborators */}
      {onlineCollaborators.length > 0 && (
        <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-gray-500" />
            <span className="text-xs text-gray-500">Online now:</span>
            <div className="flex -space-x-2">
              {onlineCollaborators.slice(0, 5).map((c) => (
                <div
                  key={c.id}
                  className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[10px] text-white"
                  style={{ backgroundColor: c.color }}
                  title={`${c.name}${c.currentPage ? ` (page ${c.currentPage})` : ''}`}
                >
                  {c.avatar ? (
                    <img src={c.avatar} alt="" className="w-full h-full rounded-full" />
                  ) : (
                    c.name[0].toUpperCase()
                  )}
                </div>
              ))}
              {onlineCollaborators.length > 5 && (
                <div className="w-6 h-6 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-[10px] text-gray-600">
                  +{onlineCollaborators.length - 5}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="px-3 py-2 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                filter !== 'all' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Filter size={12} />
              {filter === 'all' ? 'All' : filter.replace('-', ' ')}
              <ChevronDown size={12} />
            </button>
            <button
              onClick={() => setSort(s => s === 'newest' ? 'oldest' : s === 'oldest' ? 'page' : 'newest')}
              className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs text-gray-600 hover:bg-gray-200"
            >
              <SortAsc size={12} />
              {sort}
            </button>
          </div>
          <span className="text-xs text-gray-400">
            {filteredThreads.length} {filteredThreads.length === 1 ? 'thread' : 'threads'}
          </span>
        </div>

        {/* Filter Options */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="flex flex-wrap gap-1 mt-2"
            >
              {(['all', 'open', 'resolved', 'current-page', 'mentions'] as FilterOption[]).map((f) => (
                <button
                  key={f}
                  onClick={() => {
                    setFilter(f);
                    setShowFilters(false);
                  }}
                  className={`px-2 py-1 rounded text-xs transition-colors ${
                    filter === f 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {f === 'current-page' ? 'This Page' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Threads List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {filteredThreads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 p-4">
            <MessageSquare size={48} className="mb-3 opacity-30" />
            <p className="text-sm text-center">No comments yet</p>
            <p className="text-xs text-center mt-1">
              Click on the document to add a comment
            </p>
          </div>
        ) : (
          filteredThreads.map((thread) => (
            <ThreadItem
              key={thread.id}
              thread={thread}
              currentUserId={currentUserId}
              onAddComment={(content, mentions) => 
                onAddComment(thread.id, {
                  threadId: thread.id,
                  authorId: currentUserId,
                  authorName: currentUserId,
                  content,
                  mentions,
                })
              }
              onEditComment={(commentId, content) => onEditComment(thread.id, commentId, content)}
              onDeleteComment={(commentId) => onDeleteComment(thread.id, commentId)}
              onResolve={() => onResolveThread(thread.id)}
              onReopen={() => onReopenThread(thread.id)}
              onDelete={() => onDeleteThread(thread.id)}
              onReact={(commentId, emoji) => onReactToComment(thread.id, commentId, emoji)}
              onGoTo={() => onGoToThread(thread)}
              mentionableUsers={mentionableUsers}
            />
          ))
        )}
      </div>
    </motion.div>
  );
};

// Helper functions
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 7) {
    return new Date(date).toLocaleDateString();
  } else if (days > 0) {
    return `${days}d ago`;
  } else if (hours > 0) {
    return `${hours}h ago`;
  } else if (minutes > 0) {
    return `${minutes}m ago`;
  } else {
    return 'Just now';
  }
}

function formatCommentWithMentions(content: string): React.ReactNode {
  const parts = content.split(/(@\w+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      return (
        <span key={i} className="text-blue-600 font-medium">
          {part}
        </span>
      );
    }
    return part;
  });
}

export default PDFCollaborationPanel;
