import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Link as LinkIcon,
  Copy,
  Check,
  Lock,
  Clock,
  Eye,
  MessageSquare,
  Edit3,
  QrCode,
  Mail,
  Send,
  Trash2,
  ExternalLink,
  Shield,
  Users,
  Sparkles,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';
import QRCode from 'qrcode';
import {
  generateGuestToken,
  getGuestTokensForBoard,
  deactivateGuestToken,
  getGuestShareUrl,
  getExpirationText,
  getPermissionLabel,
  getPermissionDescription,
  getExpirationOptionLabel,
  GuestToken,
  GuestPermission,
  ExpirationOption,
} from '../lib/guest-access';

interface QuickInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardId: string;
  boardName: string;
  currentUserId?: string;
}

export default function QuickInviteModal({
  isOpen,
  onClose,
  boardId,
  boardName,
  currentUserId,
}: QuickInviteModalProps) {
  // Existing links
  const [existingLinks, setExistingLinks] = useState<GuestToken[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // New link form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [permission, setPermission] = useState<GuestPermission>('comment');
  const [expiration, setExpiration] = useState<ExpirationOption>('7d');
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Email invite
  const [showEmailInvite, setShowEmailInvite] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [isSendingEmails, setIsSendingEmails] = useState(false);

  // Copy and QR states
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [qrCodeData, setQrCodeData] = useState<{ url: string; image: string } | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);

  // Newly created link for quick copy
  const [newlyCreatedLink, setNewlyCreatedLink] = useState<GuestToken | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);

  // Load existing links on open
  useEffect(() => {
    if (isOpen) {
      loadLinks();
    }
  }, [isOpen, boardId]);

  const loadLinks = async () => {
    setIsLoading(true);
    try {
      const links = await getGuestTokensForBoard(boardId);
      setExistingLinks(links.filter(l => l.isActive));
    } catch (err) {
      console.error('Failed to load links:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateLink = async () => {
    if (isCreating) return;
    setIsCreating(true);

    try {
      const newToken = await generateGuestToken(boardId, {
        permission,
        expiration,
        password: usePassword && password ? password : undefined,
      }, currentUserId);

      // Add to list and set as newly created
      setExistingLinks(prev => [newToken, ...prev]);
      setNewlyCreatedLink(newToken);

      // Reset form
      setShowCreateForm(false);
      setPassword('');
      setUsePassword(false);

      // Auto-copy to clipboard
      const url = getGuestShareUrl(newToken.token);
      try {
        await navigator.clipboard.writeText(url);
        setCopiedId(newToken.id);
        setTimeout(() => setCopiedId(null), 3000);
      } catch (err) {
        console.error('Failed to auto-copy:', err);
      }
    } catch (err) {
      console.error('Failed to create link:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyLink = async (token: GuestToken) => {
    const url = getGuestShareUrl(token.token);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(token.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleShowQR = async (token: GuestToken) => {
    const url = getGuestShareUrl(token.token);
    try {
      const qrImage = await QRCode.toDataURL(url, {
        width: 280,
        margin: 2,
        color: {
          dark: '#1e1e1e',
          light: '#ffffff',
        },
      });
      setQrCodeData({ url, image: qrImage });
      setShowQrModal(true);
    } catch (err) {
      console.error('Failed to generate QR code:', err);
    }
  };

  const handleDeactivate = async (tokenId: string) => {
    if (!confirm('Are you sure you want to deactivate this link? Anyone using it will lose access.')) {
      return;
    }

    try {
      await deactivateGuestToken(tokenId);
      setExistingLinks(prev => prev.filter(l => l.id !== tokenId));
      if (newlyCreatedLink?.id === tokenId) {
        setNewlyCreatedLink(null);
      }
    } catch (err) {
      console.error('Failed to deactivate link:', err);
    }
  };

  const handleSendEmails = async () => {
    if (!emailInput.trim()) return;

    setIsSendingEmails(true);

    try {
      // Parse comma-separated emails
      const emails = emailInput
        .split(',')
        .map(e => e.trim())
        .filter(e => e.includes('@'));

      if (emails.length === 0) {
        alert('Please enter valid email addresses');
        return;
      }

      // Create a new link for the email invite
      const token = await generateGuestToken(boardId, {
        permission,
        expiration,
        password: usePassword && password ? password : undefined,
      }, currentUserId);

      const shareUrl = getGuestShareUrl(token.token);

      // Compose mailto link
      const subject = encodeURIComponent(`You're invited to collaborate on "${boardName}"`);
      const body = encodeURIComponent(
        `Hi,\n\nYou've been invited to collaborate on a Strategic Canvas board.\n\n` +
        `Board: ${boardName}\n` +
        `Access Level: ${getPermissionLabel(permission)}\n\n` +
        `Click here to join: ${shareUrl}\n\n` +
        (password ? `Password: ${password}\n\n` : '') +
        `This link ${expiration === 'never' ? 'never expires' : `expires in ${getExpirationOptionLabel(expiration)}`}.\n\n` +
        `Best regards`
      );

      // Open mail client
      window.open(`mailto:${emails.join(',')}?subject=${subject}&body=${body}`, '_blank');

      // Add to existing links
      setExistingLinks(prev => [token, ...prev]);
      setNewlyCreatedLink(token);
      setEmailInput('');
      setShowEmailInvite(false);
    } catch (err) {
      console.error('Failed to send invites:', err);
    } finally {
      setIsSendingEmails(false);
    }
  };

  const getPermissionIcon = (perm: GuestPermission) => {
    switch (perm) {
      case 'view': return <Eye className="w-4 h-4" />;
      case 'comment': return <MessageSquare className="w-4 h-4" />;
      case 'edit': return <Edit3 className="w-4 h-4" />;
    }
  };

  const getPermissionColor = (perm: GuestPermission) => {
    switch (perm) {
      case 'view': return 'bg-gray-100 text-gray-700';
      case 'comment': return 'bg-blue-100 text-blue-700';
      case 'edit': return 'bg-green-100 text-green-700';
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          ref={modalRef}
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-navy-500 to-navy-600 flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Invite Guests</h2>
                  <p className="text-sm text-gray-500 truncate max-w-[200px]">{boardName}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setShowCreateForm(true);
                  setShowEmailInvite(false);
                }}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                  showCreateForm && !showEmailInvite
                    ? 'border-navy-500 bg-navy-50'
                    : 'border-gray-200 hover:border-navy-300 hover:bg-navy-50'
                }`}
              >
                <LinkIcon className="w-6 h-6 text-navy-700" />
                <span className="text-sm font-medium text-gray-900">Create Link</span>
              </button>
              <button
                onClick={() => {
                  setShowEmailInvite(true);
                  setShowCreateForm(true);
                }}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                  showEmailInvite
                    ? 'border-navy-500 bg-navy-50'
                    : 'border-gray-200 hover:border-navy-300 hover:bg-navy-50'
                }`}
              >
                <Mail className="w-6 h-6 text-navy-700" />
                <span className="text-sm font-medium text-gray-900">Email Invite</span>
              </button>
            </div>

            {/* Newly Created Link Banner */}
            <AnimatePresence>
              {newlyCreatedLink && !showCreateForm && (
                <motion.div
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-semibold text-green-800">Link Created!</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={getGuestShareUrl(newlyCreatedLink.token)}
                      className="flex-1 px-3 py-2 bg-white border border-green-200 rounded-lg text-sm text-gray-700 truncate"
                    />
                    <button
                      onClick={() => handleCopyLink(newlyCreatedLink)}
                      className={`p-2 rounded-lg transition-colors ${
                        copiedId === newlyCreatedLink.id
                          ? 'bg-green-500 text-white'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {copiedId === newlyCreatedLink.id ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleShowQR(newlyCreatedLink)}
                      className="p-2 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg transition-colors"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Create Form */}
            <AnimatePresence>
              {showCreateForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  {/* Email Input (if email mode) */}
                  {showEmailInvite && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email Addresses
                      </label>
                      <textarea
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        placeholder="Enter email addresses, separated by commas"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-500 resize-none"
                        rows={2}
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Example: john@example.com, jane@example.com
                      </p>
                    </div>
                  )}

                  {/* Permission Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Access Level
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['view', 'comment', 'edit'] as GuestPermission[]).map((perm) => (
                        <button
                          key={perm}
                          onClick={() => setPermission(perm)}
                          className={`p-3 rounded-xl border-2 transition-all ${
                            permission === perm
                              ? 'border-navy-500 bg-navy-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className={`w-8 h-8 mx-auto mb-1 rounded-lg flex items-center justify-center ${
                            permission === perm ? getPermissionColor(perm) : 'bg-gray-100 text-gray-500'
                          }`}>
                            {getPermissionIcon(perm)}
                          </div>
                          <p className={`text-xs font-medium ${
                            permission === perm ? 'text-navy-800' : 'text-gray-600'
                          }`}>
                            {getPermissionLabel(perm)}
                          </p>
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      {getPermissionDescription(permission)}
                    </p>
                  </div>

                  {/* Expiration Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Link Expires
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {(['1h', '24h', '7d', 'never'] as ExpirationOption[]).map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setExpiration(opt)}
                          className={`p-2.5 rounded-xl border-2 transition-all text-center ${
                            expiration === opt
                              ? 'border-navy-500 bg-navy-50 text-navy-800'
                              : 'border-gray-200 hover:border-gray-300 text-gray-600'
                          }`}
                        >
                          <span className="text-xs font-medium">
                            {getExpirationOptionLabel(opt)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Password Protection */}
                  <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">Password Protection</span>
                      </div>
                      <button
                        onClick={() => setUsePassword(!usePassword)}
                        className={`w-11 h-6 rounded-full transition-colors relative ${
                          usePassword ? 'bg-navy-500' : 'bg-gray-300'
                        }`}
                      >
                        <motion.div
                          animate={{ x: usePassword ? 20 : 2 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          className="w-5 h-5 bg-white rounded-full shadow-sm absolute top-0.5"
                        />
                      </button>
                    </div>
                    <AnimatePresence>
                      {usePassword && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                        >
                          <input
                            type="text"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter password"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Create Button */}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => {
                        setShowCreateForm(false);
                        setShowEmailInvite(false);
                      }}
                      className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    {showEmailInvite ? (
                      <button
                        onClick={handleSendEmails}
                        disabled={isSendingEmails || !emailInput.trim()}
                        className="flex-1 px-4 py-2.5 bg-navy-700 text-white rounded-xl font-medium hover:bg-navy-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Send className="w-4 h-4" />
                        {isSendingEmails ? 'Opening Mail...' : 'Send Invite'}
                      </button>
                    ) : (
                      <button
                        onClick={handleCreateLink}
                        disabled={isCreating}
                        className="flex-1 px-4 py-2.5 bg-navy-700 text-white rounded-xl font-medium hover:bg-navy-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <LinkIcon className="w-4 h-4" />
                        {isCreating ? 'Creating...' : 'Create Link'}
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Existing Links */}
            {!showCreateForm && existingLinks.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <LinkIcon className="w-4 h-4" />
                    Active Links ({existingLinks.length})
                  </h3>
                  <button
                    onClick={loadLinks}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Refresh"
                  >
                    <RefreshCw className={`w-4 h-4 text-gray-400 ${isLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                <div className="space-y-2">
                  {existingLinks.map((link) => (
                    <div
                      key={link.id}
                      className={`p-3 rounded-xl border transition-all ${
                        newlyCreatedLink?.id === link.id
                          ? 'bg-navy-50 border-navy-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getPermissionColor(link.permission)}`}>
                            {getPermissionIcon(link.permission)}
                            {getPermissionLabel(link.permission)}
                          </span>
                          {link.password && (
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
                              <Lock className="w-3 h-3" />
                              Protected
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock className="w-3 h-3" />
                          {getExpirationText(link.expiresAt)}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={getGuestShareUrl(link.token)}
                          className="flex-1 px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-600 truncate"
                        />
                        <button
                          onClick={() => handleCopyLink(link)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            copiedId === link.id
                              ? 'bg-green-100 text-green-600'
                              : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                          }`}
                          title="Copy link"
                        >
                          {copiedId === link.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => handleShowQR(link)}
                          className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors"
                          title="Show QR code"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                        </button>
                        <a
                          href={getGuestShareUrl(link.token)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors"
                          title="Open in new tab"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={() => handleDeactivate(link.id)}
                          className="p-1.5 bg-red-50 hover:bg-red-100 rounded-lg text-red-500 transition-colors"
                          title="Deactivate"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {link.useCount > 0 && (
                        <p className="text-xs text-gray-400 mt-2">
                          Used {link.useCount} time{link.useCount > 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {!showCreateForm && existingLinks.length === 0 && !isLoading && (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
                  <Users className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-sm font-medium text-gray-900 mb-1">No active invite links</h3>
                <p className="text-xs text-gray-500 mb-4">
                  Create a link to invite guests to collaborate on this board
                </p>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="px-4 py-2 bg-navy-700 text-white rounded-lg text-sm font-medium hover:bg-navy-800 transition-colors"
                >
                  Create Invite Link
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-500 text-center">
              Guests can access the board without creating an account
            </p>
          </div>
        </motion.div>
      </motion.div>

      {/* QR Code Modal */}
      <AnimatePresence>
        {showQrModal && qrCodeData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]"
            onClick={() => setShowQrModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 text-center max-w-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-gray-900 mb-4">Scan to Access</h3>
              <div className="bg-white p-4 rounded-xl shadow-inner border border-gray-100">
                <img
                  src={qrCodeData.image}
                  alt="QR Code"
                  className="mx-auto"
                />
              </div>
              <p className="text-sm text-gray-500 mt-4 mb-2">
                Scan this QR code to open the board
              </p>
              <p className="text-xs text-gray-400 break-all px-2">
                {qrCodeData.url}
              </p>
              <button
                onClick={() => setShowQrModal(false)}
                className="mt-4 px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
