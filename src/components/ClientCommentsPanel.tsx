import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  X,
  Check,
  CheckCheck,
  Search,
  MapPin,
  Clock,
  ChevronRight,
  Inbox,
} from 'lucide-react';
import { ClientComment, formatCommentDate } from '../lib/client-portal';

interface ClientCommentsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  comments: ClientComment[];
  onSelectComment: (comment: ClientComment) => void;
  onResolveComment: (commentId: string) => void;
  isOwner: boolean;
}

type FilterType = 'all' | 'unresolved' | 'resolved';

export default function ClientCommentsPanel({
  isOpen,
  onClose,
  comments,
  onSelectComment,
  onResolveComment,
  isOwner,
}: ClientCommentsPanelProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter only top-level comments (not replies)
  const topLevelComments = comments.filter((c) => !c.parentId);

  // Apply filters
  const filteredComments = topLevelComments
    .filter((c) => {
      if (filter === 'unresolved') return !c.resolved;
      if (filter === 'resolved') return c.resolved;
      return true;
    })
    .filter((c) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        c.content.toLowerCase().includes(query) ||
        c.authorName.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Stats
  const totalComments = topLevelComments.length;
  const unresolvedCount = topLevelComments.filter((c) => !c.resolved).length;
  const resolvedCount = topLevelComments.filter((c) => c.resolved).length;

  // Get reply count for a comment
  const getReplyCount = (commentId: string) => {
    return comments.filter((c) => c.parentId === commentId).length;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: 320, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 320, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed right-0 top-0 h-screen w-80 bg-white border-l border-gray-200 shadow-2xl z-40 flex flex-col"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-white">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Comments</h2>
                <p className="text-xs text-gray-500">{totalComments} total</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Stats */}
          <div className="px-4 py-3 border-b border-gray-100 flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All ({totalComments})
            </button>
            <button
              onClick={() => setFilter('unresolved')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                filter === 'unresolved'
                  ? 'bg-amber-500 text-white'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              Open ({unresolvedCount})
            </button>
            <button
              onClick={() => setFilter('resolved')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                filter === 'resolved'
                  ? 'bg-green-500 text-white'
                  : 'bg-green-50 text-green-700 hover:bg-green-100'
              }`}
            >
              Done ({resolvedCount})
            </button>
          </div>

          {/* Search */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search comments..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
              />
            </div>
          </div>

          {/* Comments list */}
          <div className="flex-1 overflow-y-auto">
            {filteredComments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <Inbox className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm font-medium">No comments found</p>
                <p className="text-xs">
                  {filter !== 'all'
                    ? 'Try changing your filter'
                    : 'Click on the board to add one'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredComments.map((comment) => {
                  const replyCount = getReplyCount(comment.id);
                  return (
                    <motion.button
                      key={comment.id}
                      whileHover={{ backgroundColor: 'rgba(0,0,0,0.02)' }}
                      onClick={() => onSelectComment(comment)}
                      className="w-full p-4 text-left transition-colors group"
                    >
                      <div className="flex items-start gap-3">
                        {/* Status indicator */}
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            comment.resolved
                              ? 'bg-green-100 text-green-600'
                              : 'bg-amber-100 text-amber-600'
                          }`}
                        >
                          {comment.resolved ? (
                            <CheckCheck className="w-4 h-4" />
                          ) : (
                            <MessageCircle className="w-4 h-4" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900 text-sm truncate">
                              {comment.authorName}
                            </span>
                            {comment.resolved && (
                              <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] font-medium rounded">
                                Resolved
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                            {comment.content}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatCommentDate(comment.createdAt)}
                            </span>
                            {replyCount > 0 && (
                              <span className="flex items-center gap-1">
                                <MessageCircle className="w-3 h-3" />
                                {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              ({Math.round(comment.position.x)}, {Math.round(comment.position.y)})
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {isOwner && !comment.resolved && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onResolveComment(comment.id);
                              }}
                              className="p-1.5 hover:bg-green-100 rounded text-green-600"
                              title="Mark as resolved"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                          <ChevronRight className="w-4 h-4 text-gray-300" />
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {isOwner && unresolvedCount > 0 && (
            <div className="px-4 py-3 border-t border-gray-100 bg-amber-50">
              <p className="text-sm text-amber-700">
                <span className="font-semibold">{unresolvedCount}</span> comment
                {unresolvedCount !== 1 && 's'} pending review
              </p>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
