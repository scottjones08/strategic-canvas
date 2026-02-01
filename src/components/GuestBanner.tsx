import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  MessageSquare,
  Edit3,
  UserPlus,
  X,
  ChevronRight,
  Sparkles,
  Shield,
} from 'lucide-react';
import { GuestPermission, getPermissionLabel, clearGuestSession } from '../lib/guest-access';

interface GuestBannerProps {
  permission: GuestPermission;
  guestName?: string;
  boardName?: string;
  onSignUp?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export default function GuestBanner({
  permission,
  guestName,
  boardName,
  onSignUp,
  onDismiss,
  className = '',
}: GuestBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  if (isDismissed) return null;

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  const getPermissionIcon = () => {
    switch (permission) {
      case 'view':
        return <Eye className="w-4 h-4" />;
      case 'comment':
        return <MessageSquare className="w-4 h-4" />;
      case 'edit':
        return <Edit3 className="w-4 h-4" />;
    }
  };

  const getPermissionColor = () => {
    switch (permission) {
      case 'view':
        return 'from-gray-500 to-gray-600';
      case 'comment':
        return 'from-blue-500 to-blue-600';
      case 'edit':
        return 'from-green-500 to-emerald-600';
    }
  };

  const getBannerColor = () => {
    switch (permission) {
      case 'view':
        return 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200';
      case 'comment':
        return 'bg-gradient-to-r from-blue-50 to-navy-50 border-blue-200';
      case 'edit':
        return 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200';
    }
  };

  const getPermissionDetails = () => {
    switch (permission) {
      case 'view':
        return {
          title: 'View Only Access',
          description: 'You can view this board but cannot make changes.',
          capabilities: ['View all content', 'Zoom and pan around', 'See real-time updates'],
          restrictions: ['Cannot add or edit elements', 'Cannot leave comments', 'Cannot change settings'],
        };
      case 'comment':
        return {
          title: 'Comment Access',
          description: 'You can view and leave feedback on this board.',
          capabilities: ['View all content', 'Leave comments and feedback', 'React to elements'],
          restrictions: ['Cannot add or edit elements', 'Cannot move items', 'Cannot change settings'],
        };
      case 'edit':
        return {
          title: 'Full Edit Access',
          description: 'You have full collaboration access to this board.',
          capabilities: ['View all content', 'Add and edit elements', 'Move and resize items', 'Leave comments'],
          restrictions: ['Cannot change share settings', 'Cannot delete the board'],
        };
    }
  };

  const details = getPermissionDetails();

  return (
    <motion.div
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -60, opacity: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 ${className}`}
    >
      <div className={`border-b ${getBannerColor()} shadow-sm`}>
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            {/* Left: Status */}
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r ${getPermissionColor()} text-white text-sm font-medium shadow-sm`}>
                {getPermissionIcon()}
                <span>{getPermissionLabel(permission)}</span>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600">
                <span>
                  Viewing as <span className="font-medium">{guestName || 'Guest'}</span>
                </span>
                {boardName && (
                  <>
                    <span className="text-gray-300">|</span>
                    <span className="text-gray-500 truncate max-w-[200px]">{boardName}</span>
                  </>
                )}
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="hidden sm:flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-white/50 rounded-lg transition-colors"
              >
                <Shield className="w-4 h-4" />
                <span>Details</span>
              </button>

              {onSignUp && (
                <button
                  onClick={onSignUp}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-700 text-white text-sm font-medium rounded-lg hover:bg-navy-800 transition-colors shadow-sm"
                >
                  <UserPlus className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign up free</span>
                  <span className="sm:hidden">Sign up</span>
                </button>
              )}

              <button
                onClick={handleDismiss}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-lg transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Details Panel */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-white border-b border-gray-200 shadow-sm"
          >
            <div className="max-w-7xl mx-auto px-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Overview */}
                <div className="p-4 bg-gray-50 rounded-xl">
                  <h4 className="font-semibold text-gray-900 mb-1">{details.title}</h4>
                  <p className="text-sm text-gray-600">{details.description}</p>
                </div>

                {/* Can Do */}
                <div className="p-4 bg-green-50 rounded-xl">
                  <h4 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    You can
                  </h4>
                  <ul className="space-y-1">
                    {details.capabilities.map((cap, i) => (
                      <li key={i} className="text-sm text-green-700 flex items-center gap-2">
                        <ChevronRight className="w-3 h-3" />
                        {cap}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Restrictions */}
                <div className="p-4 bg-gray-50 rounded-xl">
                  <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Restrictions
                  </h4>
                  <ul className="space-y-1">
                    {details.restrictions.map((res, i) => (
                      <li key={i} className="text-sm text-gray-500 flex items-center gap-2">
                        <span className="w-3 h-3 flex items-center justify-center">-</span>
                        {res}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Upgrade CTA */}
              {onSignUp && (
                <div className="mt-4 p-4 bg-gradient-to-r from-navy-50 to-navy-50 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Want full access?</p>
                    <p className="text-sm text-gray-600">Create a free account to create your own boards and get full features.</p>
                  </div>
                  <button
                    onClick={onSignUp}
                    className="flex items-center gap-2 px-4 py-2 bg-navy-700 text-white text-sm font-medium rounded-lg hover:bg-navy-800 transition-colors whitespace-nowrap"
                  >
                    <UserPlus className="w-4 h-4" />
                    Sign up free
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/**
 * Compact version of the banner for inline use
 */
export function GuestBadge({
  permission,
  className = '',
}: {
  permission: GuestPermission;
  className?: string;
}) {
  const getPermissionIcon = () => {
    switch (permission) {
      case 'view':
        return <Eye className="w-3 h-3" />;
      case 'comment':
        return <MessageSquare className="w-3 h-3" />;
      case 'edit':
        return <Edit3 className="w-3 h-3" />;
    }
  };

  const getPermissionColor = () => {
    switch (permission) {
      case 'view':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'comment':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'edit':
        return 'bg-green-100 text-green-700 border-green-200';
    }
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getPermissionColor()} ${className}`}>
      {getPermissionIcon()}
      {getPermissionLabel(permission)}
    </span>
  );
}

/**
 * Floating guest indicator for bottom-right corner
 */
export function GuestFloatingIndicator({
  permission,
  guestName,
  onSignUp,
}: {
  permission: GuestPermission;
  guestName?: string;
  onSignUp?: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getPermissionColor = () => {
    switch (permission) {
      case 'view':
        return 'from-gray-500 to-gray-600';
      case 'comment':
        return 'from-blue-500 to-blue-600';
      case 'edit':
        return 'from-green-500 to-emerald-600';
    }
  };

  const getPermissionIcon = () => {
    switch (permission) {
      case 'view':
        return <Eye className="w-4 h-4" />;
      case 'comment':
        return <MessageSquare className="w-4 h-4" />;
      case 'edit':
        return <Edit3 className="w-4 h-4" />;
    }
  };

  return (
    <motion.div
      className="fixed bottom-4 right-4 z-40"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <AnimatePresence mode="wait">
        {isExpanded ? (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 w-64"
          >
            <div className="flex items-center justify-between mb-3">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white bg-gradient-to-r ${getPermissionColor()}`}>
                {getPermissionIcon()}
                {getPermissionLabel(permission)}
              </span>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Viewing as <span className="font-medium">{guestName || 'Guest'}</span>
            </p>
            {onSignUp && (
              <button
                onClick={onSignUp}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-navy-700 text-white text-sm font-medium rounded-xl hover:bg-navy-800 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                Sign up free
              </button>
            )}
          </motion.div>
        ) : (
          <motion.button
            key="collapsed"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={() => setIsExpanded(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-white text-sm font-medium shadow-lg bg-gradient-to-r ${getPermissionColor()} hover:shadow-xl transition-shadow`}
          >
            {getPermissionIcon()}
            <span>Guest ({getPermissionLabel(permission)})</span>
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
