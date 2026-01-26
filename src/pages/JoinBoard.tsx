/**
 * JoinBoard Page
 * Public page for joining a board via collaboration link
 * Asks for name and allows viewing/collaborating without account
 */

import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Target, User, ArrowRight, Loader2 } from 'lucide-react';

export default function JoinBoard() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const boardId = searchParams.get('board');
  const [name, setName] = useState(() => {
    return localStorage.getItem('fan-canvas-guest-name') || '';
  });
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if board ID is provided
  useEffect(() => {
    if (!boardId) {
      setError('No board specified');
    }
  }, [boardId]);

  const handleJoin = async () => {
    if (!name.trim()) return;

    setIsJoining(true);

    // Save name for future use
    localStorage.setItem('fan-canvas-guest-name', name.trim());
    localStorage.setItem('fan-canvas-collab-user', JSON.stringify({
      name: name.trim(),
      joinedAt: new Date().toISOString()
    }));

    // Small delay for UX
    await new Promise(resolve => setTimeout(resolve, 500));

    // Navigate to the main app with board context
    // The app will load in "guest collaborator" mode
    navigate(`/?board=${boardId}&collaborator=${encodeURIComponent(name.trim())}`, { replace: true });
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full border border-white/20 text-center"
        >
          <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Target className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Invalid Link</h1>
          <p className="text-white/60 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-colors"
          >
            Go Home
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full border border-white/20"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Target className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Join Whiteboard</h1>
          <p className="text-white/60">
            You've been invited to collaborate on a whiteboard
          </p>
        </div>

        {/* Name Input */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              <User className="w-4 h-4 inline mr-1" />
              Your Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && name.trim()) {
                  handleJoin();
                }
              }}
            />
            <p className="text-xs text-white/40 mt-2">
              This name will be shown to other collaborators
            </p>
          </div>

          <button
            onClick={handleJoin}
            disabled={!name.trim() || isJoining}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isJoining ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Joining...
              </>
            ) : (
              <>
                Join Board
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-white/40 mt-6">
          No account required. Your changes will be synced in real-time.
        </p>
      </motion.div>
    </div>
  );
}
