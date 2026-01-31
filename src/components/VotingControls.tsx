/**
 * VotingControls Component
 *
 * Provides anonymous voting functionality for sticky notes like Miro/Lucidspark.
 * Features:
 * - Vote count badge on sticky notes
 * - "+1" button to add a vote
 * - Visual indicator when user has voted
 * - Support for anonymous voting mode
 * - Multi-vote support (configurable max votes per person)
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThumbsUp, Check } from 'lucide-react';

export interface VotingSettings {
  enabled: boolean;
  anonymous: boolean;
  maxVotesPerPerson: number | 'unlimited';
  hideCountsUntilReveal: boolean;
  isRevealed: boolean;
  isLocked: boolean;
}

interface VotingControlsProps {
  nodeId: string;
  votes: number;
  votedBy: string[];
  currentUserId: string;
  settings: VotingSettings;
  totalUserVotes: number; // How many votes this user has cast across all nodes
  onVote: (nodeId: string) => void;
  onUnvote: (nodeId: string) => void;
  compact?: boolean;
}

export const VotingControls: React.FC<VotingControlsProps> = ({
  nodeId,
  votes,
  votedBy,
  currentUserId,
  settings,
  totalUserVotes,
  onVote,
  onUnvote,
  compact = false
}) => {
  // Check if current user has voted on this node
  const userVoteCount = votedBy.filter(id => id === currentUserId).length;
  const hasVoted = userVoteCount > 0;

  // Check if user can still vote
  const canVote = settings.maxVotesPerPerson === 'unlimited' ||
                  totalUserVotes < settings.maxVotesPerPerson;

  // Check if voting is allowed
  const votingAllowed = settings.enabled && !settings.isLocked;

  // Should we show the vote count?
  const showCount = settings.isRevealed || !settings.hideCountsUntilReveal;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!votingAllowed) return;

    if (hasVoted) {
      onUnvote(nodeId);
    } else if (canVote) {
      onVote(nodeId);
    }
  };

  if (!settings.enabled) {
    return null;
  }

  // Compact mode - just the badge (for non-selected sticky notes)
  if (compact) {
    return (
      <AnimatePresence>
        {votes > 0 && showCount && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className={`absolute -top-2 -right-2 min-w-[24px] h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-lg border-2 border-white z-30 ${
              hasVoted
                ? 'bg-indigo-500 text-white'
                : 'bg-gray-700 text-white'
            }`}
          >
            <motion.span
              key={votes}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              className="px-1.5"
            >
              {votes}
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Full controls - badge + vote button (for selected sticky notes or hover)
  return (
    <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-30">
      {/* Vote count badge */}
      <AnimatePresence>
        {showCount && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className={`min-w-[28px] h-7 rounded-full flex items-center justify-center text-sm font-bold shadow-lg border-2 border-white ${
              hasVoted
                ? 'bg-indigo-500 text-white'
                : votes > 0
                  ? 'bg-gray-700 text-white'
                  : 'bg-gray-200 text-gray-500'
            }`}
          >
            <motion.span
              key={votes}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              className="px-2"
            >
              {votes}
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vote button */}
      {votingAllowed && (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleClick}
          disabled={!hasVoted && !canVote}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold shadow-lg border-2 border-white transition-colors ${
            hasVoted
              ? 'bg-indigo-500 text-white hover:bg-indigo-600'
              : canVote
                ? 'bg-white text-gray-700 hover:bg-indigo-50 hover:text-indigo-600'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
          title={
            hasVoted
              ? 'Click to remove vote'
              : canVote
                ? 'Click to vote'
                : `You've used all ${settings.maxVotesPerPerson} votes`
          }
        >
          {hasVoted ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Voted</span>
            </>
          ) : (
            <>
              <ThumbsUp className="w-3.5 h-3.5" />
              <span>+1</span>
            </>
          )}
        </motion.button>
      )}

      {/* Locked indicator */}
      {settings.isLocked && (
        <div className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
          Voting closed
        </div>
      )}
    </div>
  );
};

/**
 * Vote Badge Component
 * A minimal badge showing vote count, used on nodes when not selected
 */
interface VoteBadgeProps {
  votes: number;
  hasVoted: boolean;
  showCount: boolean;
}

export const VoteBadge: React.FC<VoteBadgeProps> = ({ votes, hasVoted, showCount }) => {
  if (votes === 0 || !showCount) return null;

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`absolute -top-2 -right-2 min-w-[22px] h-[22px] rounded-full flex items-center justify-center text-[11px] font-bold shadow-md border-2 border-white z-30 ${
        hasVoted
          ? 'bg-indigo-500 text-white'
          : 'bg-gray-600 text-white'
      }`}
    >
      <motion.span
        key={votes}
        initial={{ scale: 1.4 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 15 }}
      >
        {votes}
      </motion.span>
    </motion.div>
  );
};

export default VotingControls;
