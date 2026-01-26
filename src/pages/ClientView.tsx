import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  MessageCircle,
  Lock,
  X,
  Send,
  AlertCircle,
  Eye,
  Target,
  Loader2,
} from 'lucide-react';
import {
  ShareLink,
  ClientComment,
  getShareLinkByTokenAsync,
  validateShareLink,
  recordView,
  loadClientComments,
  createClientComment,
  toggleCommentResolved,
  addComment as addClientComment,
  getBoardForShareLink,
} from '../lib/client-portal';
import ClientCommentPin from '../components/ClientCommentPin';
import ClientCommentsPanel from '../components/ClientCommentsPanel';

// Note: Board loading now uses getBoardForShareLink which fetches from Supabase

interface Board {
  id: string;
  name: string;
  visualNodes: any[];
  zoom: number;
  panX: number;
  panY: number;
}

export default function ClientView() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  // State
  const [shareLink, setShareLink] = useState<ShareLink | null>(null);
  const [board, setBoard] = useState<Board | null>(null);
  const [comments, setComments] = useState<ClientComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // View state
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0, panX: 0, panY: 0 });

  // Guest name - load from localStorage if previously saved
  const savedGuestName = localStorage.getItem('fan-canvas-guest-name') || '';
  const savedGuestEmail = localStorage.getItem('fan-canvas-guest-email') || '';

  // Comment state
  const [showCommentPanel, setShowCommentPanel] = useState(false);
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [newCommentPos, setNewCommentPos] = useState<{ x: number; y: number } | null>(null);
  const [newCommentContent, setNewCommentContent] = useState('');
  const [newCommentName, setNewCommentName] = useState(savedGuestName);
  const [newCommentEmail, setNewCommentEmail] = useState(savedGuestEmail);
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  // Load share link and board
  useEffect(() => {
    async function loadShareLinkAndBoard() {
      if (!token) {
        setError('Invalid share link');
        setLoading(false);
        return;
      }

      // Fetch share link from Supabase (or localStorage fallback)
      const link = await getShareLinkByTokenAsync(token);
      if (!link) {
        setError('Share link not found');
        setLoading(false);
        return;
      }

      // Check if password is required
      if (link.password) {
        setNeedsPassword(true);
        setShareLink(link);
        setLoading(false);
        return;
      }

      // Validate link
      const validation = validateShareLink(link);
      if (!validation.valid) {
        setError(validation.error || 'Invalid share link');
        setLoading(false);
        return;
      }

      // For 'edit' permission, redirect to full collaboration mode
      if (link.permissions === 'edit') {
        // Redirect to join page with board ID for full real-time collaboration
        // Pass client name if available so it pre-fills the name field
        const nameParam = link.clientName ? `&name=${encodeURIComponent(link.clientName)}` : '';
        navigate(`/join?board=${link.boardId}&from=share${nameParam}`);
        return;
      }

      // Load the board
      await loadBoardData(link);
    }

    loadShareLinkAndBoard();
  }, [token, navigate]);

  const loadBoardData = async (link: ShareLink) => {
    // Fetch board from Supabase (or localStorage fallback)
    const targetBoard = await getBoardForShareLink(link.boardId);

    if (!targetBoard) {
      setError('Board not found');
      setLoading(false);
      return;
    }

    // Record the view
    recordView(link.id);

    setShareLink(link);
    setBoard(targetBoard);
    setZoom(targetBoard.zoom || 1);
    setPanX(targetBoard.panX || 0);
    setPanY(targetBoard.panY || 0);

    // Load comments for this board
    const allComments = loadClientComments();
    setComments(allComments.filter((c) => c.boardId === link.boardId));

    setLoading(false);
  };

  const handlePasswordSubmit = async () => {
    if (!shareLink || !password) return;

    const validation = validateShareLink(shareLink, password);
    if (!validation.valid) {
      setPasswordError(validation.error || 'Invalid password');
      return;
    }

    setNeedsPassword(false);
    setPasswordError('');
    await loadBoardData(shareLink);
  };

  // Canvas interactions
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom((z) => Math.min(Math.max(z * delta, 0.1), 5));
    } else {
      setPanX((x) => x - e.deltaX);
      setPanY((y) => y - e.deltaY);
    }
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      // Middle click or shift+click for panning
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY, panX, panY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setPanX(panStart.panX + dx);
      setPanY(panStart.panY + dy);
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Touch handlers for mobile panning
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      // Single touch for panning (when not adding comment)
      if (!isAddingComment) {
        setIsPanning(true);
        setPanStart({ x: e.touches[0].clientX, y: e.touches[0].clientY, panX, panY });
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isPanning && e.touches.length === 1) {
      const dx = e.touches[0].clientX - panStart.x;
      const dy = e.touches[0].clientY - panStart.y;
      setPanX(panStart.panX + dx);
      setPanY(panStart.panY + dy);
    }
  };

  const handleTouchEnd = () => {
    setIsPanning(false);
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (isPanning) return;

    // If clicking outside any element and can comment, start adding comment
    if (shareLink?.permissions === 'comment' && isAddingComment) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const x = (e.clientX - rect.left - panX) / zoom;
        const y = (e.clientY - rect.top - panY) / zoom;
        setNewCommentPos({ x, y });
        setTimeout(() => commentInputRef.current?.focus(), 100);
      }
    }
  };

  const handleAddComment = () => {
    if (!newCommentPos || !newCommentContent.trim() || !newCommentName.trim() || !shareLink || !board) return;

    // Save name and email to localStorage for future use
    localStorage.setItem('fan-canvas-guest-name', newCommentName.trim());
    if (newCommentEmail) {
      localStorage.setItem('fan-canvas-guest-email', newCommentEmail);
    }

    const comment = createClientComment(
      board.id,
      shareLink.id,
      newCommentPos,
      newCommentContent.trim(),
      newCommentName.trim(),
      newCommentEmail || undefined
    );

    addClientComment(comment);
    setComments((prev) => [...prev, comment]);
    setNewCommentPos(null);
    setNewCommentContent('');
    setIsAddingComment(false);
  };

  const handleReplyToComment = (parentId: string, content: string, authorName: string, authorEmail?: string) => {
    if (!shareLink || !board) return;

    const parentComment = comments.find((c) => c.id === parentId);
    if (!parentComment) return;

    const reply = createClientComment(
      board.id,
      shareLink.id,
      parentComment.position, // Same position as parent
      content,
      authorName,
      authorEmail,
      parentId
    );

    addClientComment(reply);
    setComments((prev) => [...prev, reply]);
  };

  const handleResolveComment = (commentId: string) => {
    // Only owner can resolve (we don't have owner check in client view, so this is disabled)
    toggleCommentResolved(commentId, 'owner');
    setComments(loadClientComments().filter((c) => c.boardId === board?.id));
  };

  const handleDeleteComment = (_commentId: string) => {
    // Not implemented for client view - only owner can delete
  };

  const handleSelectComment = (comment: ClientComment) => {
    setSelectedCommentId(comment.id);
    // Pan to the comment location
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (canvasRect) {
      const targetX = -comment.position.x * zoom + canvasRect.width / 2;
      const targetY = -comment.position.y * zoom + canvasRect.height / 2;
      setPanX(targetX);
      setPanY(targetY);
    }
  };

  // Get connector lines (arrows between nodes)
  const connectorLines = board?.visualNodes
    .filter((n: any) => n.type === 'connector' && n.connectorFrom && n.connectorTo)
    .map((conn: any) => {
      const fromNode = board?.visualNodes.find((n: any) => n.id === conn.connectorFrom);
      const toNode = board?.visualNodes.find((n: any) => n.id === conn.connectorTo);
      if (!fromNode || !toNode) return null;
      return {
        id: conn.id,
        x1: fromNode.x + fromNode.width / 2,
        y1: fromNode.y + fromNode.height / 2,
        x2: toNode.x + toNode.width / 2,
        y2: toNode.y + toNode.height / 2,
        color: conn.color,
        style: conn.connectorStyle
      };
    })
    .filter(Boolean) || [];

  // Render helpers
  const renderNode = (node: any) => {
    const isFrame = node.type === 'frame';
    const isText = node.type === 'text';
    const isShape = node.type === 'shape';
    const isConnector = node.type === 'connector';

    // Skip connectors that have from/to - they're rendered as SVG paths
    if (isConnector && node.connectorFrom && node.connectorTo) {
      return null;
    }

    const getShapeStyles = () => {
      if (!isShape) return {};
      switch (node.shapeType) {
        case 'circle': return { borderRadius: '50%' };
        case 'triangle': return { clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' };
        case 'diamond': return { clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' };
        default: return { borderRadius: '8px' };
      }
    };

    // Standalone connector (not connected to nodes)
    if (isConnector) {
      return (
        <div
          key={node.id}
          className="absolute"
          style={{
            left: node.x,
            top: node.y,
            width: node.width,
            height: node.height,
          }}
        >
          <svg className="w-full h-full" viewBox={`0 0 ${node.width} ${node.height}`}>
            <defs>
              <marker id={`arrow-${node.id}`} markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill={node.color || '#6b7280'} />
              </marker>
            </defs>
            <line
              x1="0"
              y1={node.height / 2}
              x2={node.width - 10}
              y2={node.height / 2}
              stroke={node.color || '#6b7280'}
              strokeWidth="3"
              strokeDasharray={node.connectorStyle === 'dashed' ? '10,6' : node.connectorStyle === 'dotted' ? '3,6' : 'none'}
              markerEnd={`url(#arrow-${node.id})`}
            />
          </svg>
        </div>
      );
    }

    return (
      <div
        key={node.id}
        className={`absolute ${isFrame ? 'rounded-2xl border-2 border-dashed' : isText ? '' : 'rounded-xl shadow-lg'}`}
        style={{
          left: node.x,
          top: node.y,
          width: node.width,
          height: node.height,
          backgroundColor: isFrame ? `${node.color}80` : isText ? 'transparent' : node.color,
          borderColor: isFrame ? node.color : undefined,
          zIndex: isFrame ? 1 : 10,
          ...getShapeStyles(),
        }}
      >
        <div className={`h-full ${isFrame ? 'p-3' : isText ? '' : 'p-3'} overflow-hidden`}>
          {isFrame ? (
            <>
              <p className="text-sm font-bold text-gray-700 mb-1">{node.content.split('\n')[0]}</p>
              <p className="text-xs text-gray-600 whitespace-pre-wrap">{node.content.split('\n').slice(1).join('\n')}</p>
            </>
          ) : isText ? (
            <p className="text-gray-900 font-medium" style={{ fontSize: node.fontSize || 24 }}>
              {node.content}
            </p>
          ) : isShape ? (
            <div className="w-full h-full flex items-center justify-center">
              <p className="text-sm text-gray-700 text-center">{node.content}</p>
            </div>
          ) : node.type === 'youtube' && node.mediaUrl ? (
            <iframe
              src={node.mediaUrl}
              className="w-full h-full rounded-lg"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : node.type === 'image' && node.mediaUrl ? (
            <img src={node.mediaUrl} alt="" className="w-full h-full object-cover rounded-lg" />
          ) : (
            <>
              <p className="text-xs font-semibold text-gray-600 capitalize mb-1">{node.type}</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{node.content}</p>
            </>
          )}
        </div>
      </div>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading board...</p>
        </div>
      </div>
    );
  }

  // Password required
  if (needsPassword) {
    return (
      <div className="h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md"
        >
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-amber-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Password Protected</h1>
            <p className="text-gray-500 mt-2">This board requires a password to view</p>
          </div>

          <div className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                placeholder="Enter password"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
              {passwordError && (
                <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {passwordError}
                </p>
              )}
            </div>
            <button
              onClick={handlePasswordSubmit}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
            >
              View Board
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center"
        >
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-500 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
          >
            Go Home
          </button>
        </motion.div>
      </div>
    );
  }

  // Main view
  return (
    <div className="h-screen bg-gray-100 flex flex-col overflow-hidden">
      {/* Header - responsive */}
      <header className="h-12 sm:h-14 bg-white border-b border-gray-200 flex items-center justify-between px-2 sm:px-4 z-30">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          {shareLink?.companyBranding?.logo ? (
            <img
              src={shareLink.companyBranding.logo}
              alt=""
              className="w-6 h-6 sm:w-8 sm:h-8 object-contain flex-shrink-0"
            />
          ) : (
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Target className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="font-semibold text-gray-900 text-xs sm:text-sm truncate">{board?.name}</h1>
            {shareLink?.companyBranding?.name && (
              <p className="text-[10px] sm:text-xs text-gray-500 truncate hidden sm:block">
                Shared by {shareLink.companyBranding.name}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {/* Permission badge - icon only on mobile */}
          <span className={`p-1.5 sm:px-3 sm:py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
            shareLink?.permissions === 'comment'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-600'
          }`}>
            {shareLink?.permissions === 'comment' ? (
              <>
                <MessageCircle className="w-3 h-3" />
                <span className="hidden sm:inline">Can Comment</span>
              </>
            ) : (
              <>
                <Eye className="w-3 h-3" />
                <span className="hidden sm:inline">View Only</span>
              </>
            )}
          </span>

          {/* Zoom controls - simplified on mobile */}
          <div className="flex items-center gap-0.5 sm:gap-1 bg-gray-100 rounded-lg p-0.5 sm:p-1">
            <button
              onClick={() => setZoom((z) => Math.max(z * 0.8, 0.1))}
              className="p-1 sm:p-1.5 hover:bg-white active:bg-white rounded transition-colors"
            >
              <ZoomOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600" />
            </button>
            <span className="text-[10px] sm:text-xs font-medium text-gray-600 w-8 sm:w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(z * 1.2, 5))}
              className="p-1 sm:p-1.5 hover:bg-white active:bg-white rounded transition-colors"
            >
              <ZoomIn className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600" />
            </button>
            <button
              onClick={() => {
                setZoom(1);
                setPanX(0);
                setPanY(0);
              }}
              className="p-1 sm:p-1.5 hover:bg-white active:bg-white rounded transition-colors hidden sm:block"
            >
              <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600" />
            </button>
          </div>

          {/* Comments panel toggle */}
          {shareLink?.permissions === 'comment' && (
            <button
              onClick={() => setShowCommentPanel(!showCommentPanel)}
              className={`flex items-center gap-1 sm:gap-2 p-1.5 sm:px-3 sm:py-2 rounded-lg transition-colors ${
                showCommentPanel
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm font-medium">{comments.filter(c => !c.parentId).length}</span>
            </button>
          )}
        </div>
      </header>

      {/* Canvas area */}
      <div className="flex-1 relative overflow-hidden touch-none">
        {/* Canvas */}
        <div
          ref={canvasRef}
          className={`absolute inset-0 ${isPanning ? 'cursor-grabbing' : isAddingComment ? 'cursor-crosshair' : 'cursor-grab'}`}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={handleCanvasClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Grid background */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
              backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
              backgroundPosition: `${panX}px ${panY}px`,
            }}
          />

          {/* SVG Layer for Connector Arrows */}
          <svg
            className="absolute inset-0 pointer-events-none"
            style={{
              transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
              transformOrigin: 'top left',
              overflow: 'visible'
            }}
          >
            <defs>
              {/* Arrow markers with different colors */}
              <marker id="arrowhead-gray" markerWidth="12" markerHeight="8" refX="10" refY="4" orient="auto">
                <path d="M0,0 L12,4 L0,8 L3,4 Z" fill="#6b7280" />
              </marker>
              <marker id="arrowhead-blue" markerWidth="12" markerHeight="8" refX="10" refY="4" orient="auto">
                <path d="M0,0 L12,4 L0,8 L3,4 Z" fill="#3b82f6" />
              </marker>
              <marker id="arrowhead-green" markerWidth="12" markerHeight="8" refX="10" refY="4" orient="auto">
                <path d="M0,0 L12,4 L0,8 L3,4 Z" fill="#22c55e" />
              </marker>
              <marker id="arrowhead-red" markerWidth="12" markerHeight="8" refX="10" refY="4" orient="auto">
                <path d="M0,0 L12,4 L0,8 L3,4 Z" fill="#ef4444" />
              </marker>
              <marker id="arrowhead-purple" markerWidth="12" markerHeight="8" refX="10" refY="4" orient="auto">
                <path d="M0,0 L12,4 L0,8 L3,4 Z" fill="#8b5cf6" />
              </marker>
              <marker id="arrowhead-orange" markerWidth="12" markerHeight="8" refX="10" refY="4" orient="auto">
                <path d="M0,0 L12,4 L0,8 L3,4 Z" fill="#f97316" />
              </marker>
            </defs>
            {/* Connector lines with arrows - curved bezier paths */}
            {connectorLines.map((line: any) => {
              // Calculate control points for smooth bezier curve
              const dx = line.x2 - line.x1;
              const dy = line.y2 - line.y1;
              const distance = Math.sqrt(dx * dx + dy * dy);

              // Determine curve direction based on relative positions
              const isHorizontal = Math.abs(dx) > Math.abs(dy);
              const curveStrength = Math.min(distance * 0.4, 100);

              let cx1, cy1, cx2, cy2;
              if (isHorizontal) {
                cx1 = line.x1 + curveStrength;
                cy1 = line.y1;
                cx2 = line.x2 - curveStrength;
                cy2 = line.y2;
              } else {
                cx1 = line.x1;
                cy1 = line.y1 + (dy > 0 ? curveStrength : -curveStrength);
                cx2 = line.x2;
                cy2 = line.y2 + (dy > 0 ? -curveStrength : curveStrength);
              }

              const pathD = `M ${line.x1} ${line.y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${line.x2} ${line.y2}`;

              // Get arrow color marker
              const getMarker = (color: string) => {
                if (color?.includes('3b82f6') || color?.includes('blue')) return 'url(#arrowhead-blue)';
                if (color?.includes('22c55e') || color?.includes('green')) return 'url(#arrowhead-green)';
                if (color?.includes('ef4444') || color?.includes('red')) return 'url(#arrowhead-red)';
                if (color?.includes('8b5cf6') || color?.includes('purple')) return 'url(#arrowhead-purple)';
                if (color?.includes('f97316') || color?.includes('orange')) return 'url(#arrowhead-orange)';
                return 'url(#arrowhead-gray)';
              };

              return (
                <g key={line.id}>
                  {/* Shadow path */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="rgba(0,0,0,0.08)"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                  {/* Main curved path */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={line.color || '#6b7280'}
                    strokeWidth="2"
                    strokeDasharray={line.style === 'dashed' ? '8,4' : line.style === 'dotted' ? '2,4' : undefined}
                    strokeLinecap="round"
                    markerEnd={getMarker(line.color)}
                  />
                </g>
              );
            })}
          </svg>

          {/* Content layer */}
          <div
            className="absolute"
            style={{
              transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
              transformOrigin: '0 0',
            }}
          >
            {/* Render all nodes */}
            {board?.visualNodes.map((node) => renderNode(node))}

            {/* Render comment pins */}
            {comments
              .filter((c) => !c.parentId)
              .map((comment) => (
                <ClientCommentPin
                  key={comment.id}
                  comment={comment}
                  allComments={comments}
                  isOwner={false}
                  zoom={zoom}
                  onReply={handleReplyToComment}
                  onResolve={handleResolveComment}
                  onDelete={handleDeleteComment}
                  onSelect={setSelectedCommentId}
                  isSelected={selectedCommentId === comment.id}
                />
              ))}
          </div>
        </div>

        {/* New comment input overlay - responsive */}
        <AnimatePresence>
          {newCommentPos && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed sm:absolute bg-white rounded-xl shadow-2xl border border-gray-200 p-3 sm:p-4 w-[calc(100%-2rem)] sm:w-80 z-50 left-4 right-4 bottom-4 sm:left-auto sm:right-auto sm:bottom-auto"
              style={{
                ...(typeof window !== 'undefined' && window.innerWidth >= 640 ? {
                  left: newCommentPos.x * zoom + panX + 20,
                  top: newCommentPos.y * zoom + panY,
                } : {})
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Add Comment</h3>
                <button
                  onClick={() => {
                    setNewCommentPos(null);
                    setIsAddingComment(false);
                  }}
                  className="p-1.5 hover:bg-gray-100 active:bg-gray-100 rounded"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              <div className="space-y-2 sm:space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCommentName}
                    onChange={(e) => setNewCommentName(e.target.value)}
                    placeholder="Your name *"
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <input
                  type="email"
                  value={newCommentEmail}
                  onChange={(e) => setNewCommentEmail(e.target.value)}
                  placeholder="Email (optional)"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <textarea
                  ref={commentInputRef}
                  value={newCommentContent}
                  onChange={(e) => setNewCommentContent(e.target.value)}
                  placeholder="Write your comment..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
                  rows={3}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      handleAddComment();
                    }
                  }}
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setNewCommentPos(null);
                      setIsAddingComment(false);
                    }}
                    className="px-3 sm:px-4 py-2 text-gray-600 hover:bg-gray-100 active:bg-gray-100 rounded-lg text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddComment}
                    disabled={!newCommentContent.trim() || !newCommentName.trim()}
                    className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 active:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                    <span className="hidden sm:inline">Post Comment</span>
                    <span className="sm:hidden">Post</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating add comment button - responsive */}
        {shareLink?.permissions === 'comment' && !isAddingComment && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsAddingComment(true)}
            className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 flex items-center gap-2 p-3 sm:px-5 sm:py-3 bg-amber-500 text-white rounded-full shadow-lg hover:bg-amber-600 active:bg-amber-600 transition-colors z-40"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="font-medium hidden sm:inline">Add Comment</span>
          </motion.button>
        )}

        {/* Comment mode indicator - responsive */}
        <AnimatePresence>
          {isAddingComment && !newCommentPos && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-4 left-4 right-4 sm:bottom-6 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-5 py-3 bg-amber-500 text-white rounded-full shadow-lg z-40"
            >
              <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse flex-shrink-0" />
              <span className="font-medium text-sm sm:text-base">Tap anywhere to add a comment</span>
              <button
                onClick={() => setIsAddingComment(false)}
                className="p-1 hover:bg-amber-600 active:bg-amber-600 rounded-full flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Comments panel */}
        <ClientCommentsPanel
          isOpen={showCommentPanel}
          onClose={() => setShowCommentPanel(false)}
          comments={comments}
          onSelectComment={handleSelectComment}
          onResolveComment={handleResolveComment}
          isOwner={false}
        />
      </div>
    </div>
  );
}
