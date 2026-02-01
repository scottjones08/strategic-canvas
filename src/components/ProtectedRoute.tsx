/**
 * ProtectedRoute Component
 * Wraps routes that require authentication
 * Matches fan_consulting's auth guard pattern
 * Also allows guest collaborators with valid session
 */

import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { motion } from 'framer-motion';
import { Loader2, ShieldX, AlertTriangle } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireFanWorksTeam?: boolean;
  requireAdmin?: boolean;
  allowedRoles?: ('admin' | 'member' | 'viewer')[];
}

// Check if user has a valid guest collaborator session
function hasGuestCollaboratorSession(): boolean {
  try {
    const collabUser = localStorage.getItem('fan-canvas-collab-user');
    if (!collabUser) return false;
    const parsed = JSON.parse(collabUser);
    // Check if session is less than 24 hours old
    const joinedAt = new Date(parsed.joinedAt);
    const now = new Date();
    const hoursSinceJoin = (now.getTime() - joinedAt.getTime()) / (1000 * 60 * 60);
    return hoursSinceJoin < 24 && !!parsed.name;
  } catch {
    return false;
  }
}

// Check if user is in demo mode (clicked "Continue with Demo")
function isDemoMode(): boolean {
  return localStorage.getItem('strategic-canvas-demo-mode') === 'true';
}

export default function ProtectedRoute({
  children,
  requireFanWorksTeam = false,
  requireAdmin = false,
  allowedRoles,
}: ProtectedRouteProps) {
  const { user, session, loading, isFanWorksTeam, isAdmin } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Check for guest collaborator access or demo mode
  const collaboratorName = searchParams.get('collaborator');
  const boardId = searchParams.get('board');
  const isGuestCollaborator = (collaboratorName && boardId) || hasGuestCollaboratorSession();
  const isDemo = isDemoMode();

  // Show loading state while checking auth (but not for guest collaborators or demo mode)
  if (loading && !isGuestCollaborator && !isDemo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-16 h-16 bg-navy-100 rounded-2xl flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-navy-700 animate-spin" />
          </div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </motion.div>
      </div>
    );
  }

  // Allow guest collaborators through (they have limited access via URL params)
  if (isGuestCollaborator) {
    return <>{children}</>;
  }

  // Allow demo mode through (localStorage flag set by "Continue with Demo" button)
  if (isDemo) {
    return <>{children}</>;
  }

  // No session - redirect to login
  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user account is deactivated (only if is_active field exists and is explicitly false)
  if (user && user.is_active === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldX className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Deactivated</h2>
          <p className="text-gray-600 mb-6">
            Your account has been deactivated. Please contact your administrator for assistance.
          </p>
          <button
            onClick={() => window.location.href = '/login'}
            className="px-6 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors"
          >
            Return to Login
          </button>
        </motion.div>
      </div>
    );
  }

  // Check Fan Works Team requirement
  if (requireFanWorksTeam && !isFanWorksTeam) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h2>
          <p className="text-gray-600 mb-6">
            This area is restricted to Fan Works team members only.
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-3 bg-navy-700 text-white rounded-xl font-medium hover:bg-navy-800 transition-colors"
          >
            Go to Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  // Check admin requirement
  if (requireAdmin && !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Admin Access Required</h2>
          <p className="text-gray-600 mb-6">
            You need administrator privileges to access this area.
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-3 bg-navy-700 text-white rounded-xl font-medium hover:bg-navy-800 transition-colors"
          >
            Go to Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  // Check allowed roles
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Insufficient Permissions</h2>
          <p className="text-gray-600 mb-6">
            Your role doesn't have access to this area.
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-3 bg-navy-700 text-white rounded-xl font-medium hover:bg-navy-800 transition-colors"
          >
            Go to Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  // All checks passed - render children
  return <>{children}</>;
}
