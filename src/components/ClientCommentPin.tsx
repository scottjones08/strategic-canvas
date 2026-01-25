import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  X,
  Send,
  Check,
  CheckCheck,
  MoreVertical,
  Trash2,
  Reply,
  User,
} from 'lucide-react';
import { ClientComment, formatCommentDate, getReplies } from '../lib/client-portal';

interface ClientCommentPinProps {
  comment: ClientComment;
  allComments: ClientComment[]; // Used for context, may be utilized in future
  isOwner: boolean;
  zoom: number;
  onReply: (parentId: string, content: string, authorName: string, authorEmail?: string) => void;
  onResolve: (commentId: string) => void;
  onDelete: (commentId: string) => void;
  onSelect?: (commentId: string) => void;
  isSelected?: boolean;
}

export default function ClientCommentPin({
  comment,
  allComments: _allComments, // Reserved for future use
  isOwner,
  zoom,
  onReply,
  onResolve,
  onDelete,
  onSelect,
  isSelected = false,
}: ClientCommentPinProps) {
  const [isExpanded, setIsExpanded] = useState(isSelected);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [replyName, setReplyName] = useState('');
  const [replyEmail, setReplyEmail] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const replies = getReplies(comment.id).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  useEffect(() => {
    setIsExpanded(isSelected);
  }, [isSelected]);

  useEffect(() => {
    if (showReplyForm && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [showReplyForm]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);

  const handleSubmitReply = () => {
    if (!replyContent.trim() || !replyName.trim()) return;
    onReply(comment.id, replyContent.trim(), replyName.trim(), replyEmail || undefined);
    setReplyContent('');
    setShowReplyForm(false);
  };

  const pinSize = Math.max(32, 40 / zoom);

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="absolute"
      style={{
        left: comment.position.x,
        top: comment.position.y,
        zIndex: isExpanded ? 1000 : 100,
      }}
    >
      {/* Pin marker */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={(e) => {
          e.stopPropagation();
          setIsExpanded(!isExpanded);
          onSelect?.(comment.id);
        }}
        className={`relative flex items-center justify-center rounded-full shadow-lg border-2 transition-all ${
          comment.resolved
            ? 'bg-green-500 border-green-600'
            : 'bg-amber-500 border-amber-600'
        }`}
        style={{ width: pinSize, height: pinSize }}
      >
        <MessageCircle className="w-4 h-4 text-white" />
        {replies.length > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white font-bold flex items-center justify-center">
            {replies.length + 1}
          </span>
        )}
        {comment.resolved && (
          <span className="absolute -bottom-1 -right-1">
            <CheckCheck className="w-3 h-3 text-green-700" />
          </span>
        )}
      </motion.button>

      {/* Expanded comment card */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute left-10 top-0 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`px-3 py-2 flex items-center justify-between ${
              comment.resolved ? 'bg-green-50' : 'bg-amber-50'
            }`}>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="w-4 h-4 text-gray-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{comment.authorName}</p>
                  <p className="text-[10px] text-gray-500">{formatCommentDate(comment.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {comment.resolved && (
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-medium rounded-full">
                    Resolved
                  </span>
                )}
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-1 hover:bg-black/10 rounded"
                  >
                    <MoreVertical className="w-4 h-4 text-gray-500" />
                  </button>
                  {showMenu && (
                    <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50 min-w-[140px]">
                      {isOwner && (
                        <button
                          onClick={() => { onResolve(comment.id); setShowMenu(false); }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                        >
                          <Check className="w-4 h-4" />
                          {comment.resolved ? 'Unresolve' : 'Resolve'}
                        </button>
                      )}
                      {isOwner && (
                        <button
                          onClick={() => { onDelete(comment.id); setShowMenu(false); }}
                          className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-1 hover:bg-black/10 rounded"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Main comment content */}
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
            </div>

            {/* Replies */}
            {replies.length > 0 && (
              <div className="max-h-48 overflow-y-auto border-b border-gray-100">
                {replies.map((reply) => (
                  <div key={reply.id} className="px-3 py-2 bg-gray-50 border-b border-gray-100 last:border-b-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center">
                        <User className="w-3 h-3 text-gray-500" />
                      </div>
                      <span className="text-xs font-medium text-gray-700">{reply.authorName}</span>
                      <span className="text-[10px] text-gray-400">{formatCommentDate(reply.createdAt)}</span>
                    </div>
                    <p className="text-xs text-gray-600 pl-7 whitespace-pre-wrap">{reply.content}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Reply form */}
            {showReplyForm ? (
              <div className="p-3 space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={replyName}
                    onChange={(e) => setReplyName(e.target.value)}
                    placeholder="Your name *"
                    className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <input
                    type="email"
                    value={replyEmail}
                    onChange={(e) => setReplyEmail(e.target.value)}
                    placeholder="Email (optional)"
                    className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <textarea
                  ref={textareaRef}
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write a reply..."
                  className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
                  rows={2}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      handleSubmitReply();
                    }
                  }}
                />
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setShowReplyForm(false)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitReply}
                    disabled={!replyContent.trim() || !replyName.trim()}
                    className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 text-white text-xs font-medium rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-3 h-3" />
                    Reply
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowReplyForm(true)}
                className="w-full px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 flex items-center justify-center gap-2"
              >
                <Reply className="w-4 h-4" />
                Reply to this comment
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
