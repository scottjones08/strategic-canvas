import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Link,
  Copy,
  Check,
  Lock,
  Calendar,
  Eye,
  MessageSquare,
  QrCode,
  Trash2,
  ExternalLink,
  Clock,
  Users,
  RefreshCw,
  Shield,
  Edit3,
  Wifi,
  Building2,
} from 'lucide-react';
import QRCode from 'qrcode';
import {
  ShareLink,
  ShareLinkOptions,
  generateShareLink,
  loadShareLinks,
  saveShareLinks,
  getShareLinksForBoardAsync,
  deactivateShareLink,
  getShareUrl,
  saveShareLinkToSupabase,
} from '../lib/client-portal';

interface ShareBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardId: string;
  boardName: string;
  companyName?: string;
  companyLogo?: string;
  isConnected?: boolean;
  connectedUsers?: { id: string; name: string; color: string }[];
}

export default function ShareBoardModal({
  isOpen,
  onClose,
  boardId,
  boardName,
  companyName = 'Fan Consulting',
  companyLogo,
  isConnected = false,
  connectedUsers = [],
}: ShareBoardModalProps) {
  const [existingLinks, setExistingLinks] = useState<ShareLink[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Form state
  const [clientName, setClientName] = useState('');
  const [permissions, setPermissions] = useState<'view' | 'comment' | 'edit'>('comment');
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [useExpiration, setUseExpiration] = useState(false);
  const [expirationDays, setExpirationDays] = useState(30);
  const [useBranding, setUseBranding] = useState(true);

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadLinks();
    }
  }, [isOpen, boardId]);

  const loadLinks = async () => {
    const links = await getShareLinksForBoardAsync(boardId);
    setExistingLinks(links.filter(l => l.isActive));
  };

  const handleCreateLink = async () => {
    if (isCreating) return;
    setIsCreating(true);

    try {
      const options: ShareLinkOptions = {
        clientName: clientName || undefined,
        permissions,
        password: usePassword && password ? password : undefined,
        expiresInDays: useExpiration ? expirationDays : undefined,
        companyBranding: useBranding
          ? { name: companyName, logo: companyLogo }
          : undefined,
      };

      const newLink = generateShareLink(boardId, options);

      // Save to Supabase first
      try {
        await saveShareLinkToSupabase(newLink);
      } catch (err) {
        console.error('Error saving to Supabase:', err);
      }

      // Also save to localStorage as fallback
      const allLinks = loadShareLinks();
      allLinks.push(newLink);
      saveShareLinks(allLinks);

      // Immediately add to existing links so user can copy right away
      setExistingLinks(prev => [...prev, newLink]);

      // Reset form
      setClientName('');
      setPassword('');
      setUsePassword(false);
      setUseExpiration(false);
      setShowCreateForm(false);
      
      // Also copy to clipboard automatically
      const url = getShareUrl(newLink.token);
      try {
        await navigator.clipboard.writeText(url);
        setCopiedId(newLink.id);
        setTimeout(() => setCopiedId(null), 3000);
      } catch (err) {
        console.error('Failed to auto-copy:', err);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyLink = async (link: ShareLink) => {
    const url = getShareUrl(link.token);
    await navigator.clipboard.writeText(url);
    setCopiedId(link.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleShowQR = async (link: ShareLink) => {
    const url = getShareUrl(link.token);
    try {
      const qr = await QRCode.toDataURL(url, { width: 300, margin: 2 });
      setQrCodeUrl(qr);
      setShowQrModal(true);
    } catch (err) {
      console.error('Failed to generate QR code:', err);
    }
  };

  const handleDeactivate = (linkId: string) => {
    if (confirm('Are you sure you want to deactivate this share link?')) {
      deactivateShareLink(linkId);
      loadLinks();
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatExpiry = (date?: Date) => {
    if (!date) return 'Never';
    const d = new Date(date);
    const now = new Date();
    const daysLeft = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) return 'Expired';
    if (daysLeft === 0) return 'Today';
    if (daysLeft === 1) return '1 day left';
    return `${daysLeft} days left`;
  };

  const getPermissionLabel = (perm: string) => {
    switch (perm) {
      case 'view': return 'Viewing';
      case 'comment': return 'Commenting';
      case 'edit': return 'Full Collaboration';
      default: return perm;
    }
  };

  const getPermissionBadgeColor = (perm: string) => {
    switch (perm) {
      case 'view': return 'bg-gray-100 text-gray-600';
      case 'comment': return 'bg-blue-100 text-blue-700';
      case 'edit': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-600';
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
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Share Board</h2>
              <p className="text-sm text-gray-500">{boardName}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Connection Status */}
            <div className={`flex items-center gap-2 px-4 py-3 rounded-xl ${isConnected ? 'bg-green-50' : 'bg-blue-50'}`}>
              {isConnected ? (
                <>
                  <Wifi className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-700">Connected - Real-time sync active</span>
                  {connectedUsers.length > 0 && (
                    <span className="ml-auto text-xs text-green-600">{connectedUsers.length + 1} online</span>
                  )}
                </>
              ) : (
                <>
                  <Wifi className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700">Local Mode - Changes saved to browser</span>
                </>
              )}
            </div>

            {/* Existing links */}
            {existingLinks.length > 0 && !showCreateForm && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Link className="w-4 h-4" />
                  Active Share Links ({existingLinks.length})
                </h3>
                {existingLinks.map((link) => (
                  <div
                    key={link.id}
                    className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900">
                          {link.clientName || 'Anonymous Link'}
                        </span>
                        {link.password && (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
                            <Lock className="w-3 h-3" />
                            Protected
                          </span>
                        )}
                        <span className={`px-2 py-0.5 text-xs rounded-full ${getPermissionBadgeColor(link.permissions)}`}>
                          {getPermissionLabel(link.permissions)}
                        </span>
                        {link.companyBranding && (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-navy-100 text-navy-700 text-xs rounded-full">
                            <Building2 className="w-3 h-3" />
                            Branded
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Created {formatDate(link.createdAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatExpiry(link.expiresAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {link.views} views
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={getShareUrl(link.token)}
                        className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 truncate"
                      />
                      <button
                        onClick={() => handleCopyLink(link)}
                        className={`p-2 rounded-lg transition-colors ${
                          copiedId === link.id
                            ? 'bg-green-100 text-green-600'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                        }`}
                        title="Copy link"
                      >
                        {copiedId === link.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleShowQR(link)}
                        className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors"
                        title="Show QR code"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                      <a
                        href={getShareUrl(link.token)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors"
                        title="Open in new tab"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => handleDeactivate(link.id)}
                        className="p-2 bg-red-50 hover:bg-red-100 rounded-lg text-red-600 transition-colors"
                        title="Deactivate link"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Create new link form */}
            {showCreateForm ? (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700">Create New Share Link</h3>

                {/* Client name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client/Recipient Name (optional)
                  </label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="e.g., Acme Corp, John Smith"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-500"
                  />
                </div>

                {/* Permissions - 3 options */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Access Level
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setPermissions('view')}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        permissions === 'view'
                          ? 'border-navy-500 bg-navy-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Eye className={`w-5 h-5 mx-auto mb-1 ${permissions === 'view' ? 'text-navy-700' : 'text-gray-400'}`} />
                      <p className={`text-xs font-medium ${permissions === 'view' ? 'text-navy-800' : 'text-gray-600'}`}>
                        Viewing
                      </p>
                    </button>
                    <button
                      onClick={() => setPermissions('comment')}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        permissions === 'comment'
                          ? 'border-navy-500 bg-navy-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <MessageSquare className={`w-5 h-5 mx-auto mb-1 ${permissions === 'comment' ? 'text-navy-700' : 'text-gray-400'}`} />
                      <p className={`text-xs font-medium ${permissions === 'comment' ? 'text-navy-800' : 'text-gray-600'}`}>
                        Commenting
                      </p>
                    </button>
                    <button
                      onClick={() => setPermissions('edit')}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        permissions === 'edit'
                          ? 'border-navy-500 bg-navy-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Edit3 className={`w-5 h-5 mx-auto mb-1 ${permissions === 'edit' ? 'text-navy-700' : 'text-gray-400'}`} />
                      <p className={`text-xs font-medium ${permissions === 'edit' ? 'text-navy-800' : 'text-gray-600'}`}>
                        Full Collab
                      </p>
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    {permissions === 'view' && 'Can view the board but cannot make changes or comments'}
                    {permissions === 'comment' && 'Can view and leave comments/feedback on the board'}
                    {permissions === 'edit' && 'Can view, comment, and edit the board in real-time'}
                  </p>
                </div>

                {/* Password protection */}
                <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Password Protection</span>
                    </div>
                    <button
                      onClick={() => setUsePassword(!usePassword)}
                      className={`w-10 h-6 rounded-full transition-colors ${
                        usePassword ? 'bg-navy-500' : 'bg-gray-300'
                      }`}
                    >
                      <motion.div
                        animate={{ x: usePassword ? 16 : 2 }}
                        className="w-5 h-5 bg-white rounded-full shadow-sm"
                      />
                    </button>
                  </div>
                  {usePassword && (
                    <input
                      type="text"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
                    />
                  )}
                </div>

                {/* Expiration */}
                <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Link Expiration</span>
                    </div>
                    <button
                      onClick={() => setUseExpiration(!useExpiration)}
                      className={`w-10 h-6 rounded-full transition-colors ${
                        useExpiration ? 'bg-navy-500' : 'bg-gray-300'
                      }`}
                    >
                      <motion.div
                        animate={{ x: useExpiration ? 16 : 2 }}
                        className="w-5 h-5 bg-white rounded-full shadow-sm"
                      />
                    </button>
                  </div>
                  {useExpiration && (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={expirationDays}
                        onChange={(e) => setExpirationDays(Math.max(1, parseInt(e.target.value) || 1))}
                        min={1}
                        max={365}
                        className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
                      />
                      <span className="text-sm text-gray-500">days</span>
                    </div>
                  )}
                </div>

                {/* Company branding */}
                <div className="p-4 bg-gray-50 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Show Company Branding</span>
                    </div>
                    <button
                      onClick={() => setUseBranding(!useBranding)}
                      className={`w-10 h-6 rounded-full transition-colors ${
                        useBranding ? 'bg-navy-500' : 'bg-gray-300'
                      }`}
                    >
                      <motion.div
                        animate={{ x: useBranding ? 16 : 2 }}
                        className="w-5 h-5 bg-white rounded-full shadow-sm"
                      />
                    </button>
                  </div>
                  {useBranding && (
                    <p className="text-xs text-gray-400">
                      Displays "<span className="font-medium">{companyName}</span>" header on the client view
                    </p>
                  )}
                </div>

                {/* Form actions */}
                <div className="flex gap-3 pt-2 border-t border-gray-100 mt-4">
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateLink}
                    disabled={isCreating}
                    className="flex-1 px-4 py-2.5 bg-navy-700 text-white rounded-xl font-medium hover:bg-navy-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Link className="w-4 h-4" />
                    {isCreating ? 'Creating...' : 'Create Link'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowCreateForm(true)}
                className="w-full p-4 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 hover:border-navy-300 hover:text-navy-700 hover:bg-navy-50 transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                Create New Share Link
              </button>
            )}

            {/* Connected Users Section (if any) */}
            {connectedUsers.length > 0 && (
              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4" />
                  Currently Online ({connectedUsers.length + 1})
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 bg-navy-50 rounded-xl">
                    <div className="w-8 h-8 bg-navy-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
                      Y
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">You</p>
                      <p className="text-xs text-gray-500">Owner</p>
                    </div>
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  </div>
                  {connectedUsers.map(user => (
                    <div key={user.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium text-sm"
                        style={{ backgroundColor: user.color }}
                      >
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-500">Collaborator</p>
                      </div>
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* QR Code Modal */}
      {showQrModal && qrCodeUrl && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]"
          onClick={() => setShowQrModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="bg-white rounded-2xl p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900 mb-4">Scan to Access Board</h3>
            <img src={qrCodeUrl} alt="QR Code" className="mx-auto rounded-lg shadow-lg" />
            <p className="text-sm text-gray-500 mt-4">
              Scan this QR code to access the board
            </p>
            <button
              onClick={() => setShowQrModal(false)}
              className="mt-4 px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </motion.div>
        </motion.div>
      )}
    </>
  );
}
