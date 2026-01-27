/**
 * Enterprise Meeting View
 * 
 * This is the upgraded meeting view with enterprise-level features:
 * - Advanced connector routing with multiple control points
 * - Enterprise canvas with world-space coordinates
 * - Top toolbar like Mural
 * - Smart alignment guides
 * - Mobile-responsive touch interactions
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Users, Share2, MoreHorizontal, Maximize2, Map as MapIcon, Eye, EyeOff, Wifi, WifiOff, Youtube, Image, X, Upload, Table2, Plus, Inbox, Link as LinkIcon, ExternalLink, FolderOpen } from 'lucide-react';
import type { Board, VisualNode } from '../types/board';
import type { ConnectorPath, Waypoint } from '../lib/connector-engine';
import { EnterpriseCanvas, EnterpriseCanvasRef } from './EnterpriseCanvas';
import { EnterpriseToolbar, ToolType, ShapeType } from './EnterpriseToolbar';
import { FloatingPropertyPanel } from './FloatingPropertyPanel';
import { CollaborationOverlay } from './CollaborationOverlay';
import { UserPresenceList } from './UserPresenceList';
import ShareBoardModal from './ShareBoardModal';
import { createConnectorPath, nodeToConnectorPath } from '../lib/connector-engine';
import { 
  UserPresence, 
  getUserColor, 
  CollaborationManager,
  CollaborationCallbacks
} from '../lib/realtime-collaboration';

// Extended node with connector path
interface ExtendedVisualNode extends VisualNode {
  connectorPath?: ConnectorPath;
}

interface EnterpriseMeetingViewProps {
  board: Board;
  onUpdateBoard: (updates: Partial<Board>) => void;
  onBack: () => void;
  userName: string;
  userColor: string;
  participantCount?: number;
  onOpenShare?: () => void;
  userId?: string;
}

// Generate unique ID
const generateId = () => `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const EnterpriseMeetingView: React.FC<EnterpriseMeetingViewProps> = ({
  board,
  onUpdateBoard,
  onBack,
  userName,
  userColor,
  participantCount = 1,
  onOpenShare,
  userId = `user-${Date.now()}`
}) => {
  // Refs
  const canvasRef = useRef<EnterpriseCanvasRef>(null);
  const collaborationRef = useRef<CollaborationManager | null>(null);
  
  // State
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [gridEnabled, setGridEnabled] = useState(true);
  const [gridSnap, setGridSnap] = useState(false);
  const [showMinimap, setShowMinimap] = useState(true);
  const [facilitatorMode, setFacilitatorMode] = useState(false);
  const [showPropertyPanel, setShowPropertyPanel] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState<'youtube' | 'image' | null>(null);
  const [showCursors, setShowCursors] = useState(true);
  
  // Collaboration state
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [otherUsers, setOtherUsers] = useState<UserPresence[]>([]);
  const [cursors, setCursors] = useState<Map<string, { x: number; y: number; name: string; color: string }>>(new Map());
  const [editingNodes, setEditingNodes] = useState<Map<string, { userId: string; userName: string; color: string }>>(new Map());
  
  // Viewport state for minimap
  const [viewportState, setViewportState] = useState({ zoom: 1, panX: 0, panY: 0 });
  const [canvasSize, setCanvasSize] = useState({ width: 1000, height: 800 });
  
  // Connector tool state
  const [connectorStart, setConnectorStart] = useState<string | null>(null);
  
  // Current user info
  const currentUser = useMemo(() => ({
    id: userId,
    name: userName,
    color: userColor || getUserColor(userId)
  }), [userId, userName, userColor]);
  
  // Initialize collaboration
  useEffect(() => {
    if (!board.id) return;
    
    const callbacks: CollaborationCallbacks = {
      onUserJoin: (user) => {
        setOtherUsers(prev => {
          const filtered = prev.filter(u => u.id !== user.id);
          return [...filtered, user];
        });
      },
      onUserLeave: (leftUserId) => {
        setOtherUsers(prev => prev.filter(u => u.id !== leftUserId));
        setCursors(prev => {
          const next = new Map(prev);
          next.delete(leftUserId);
          return next;
        });
      },
      onCursorMove: (cursorUserId, cursor) => {
        // Find user from current otherUsers state
        setOtherUsers(currentUsers => {
          const user = currentUsers.find(u => u.id === cursorUserId);
          if (user) {
            setCursors(prev => {
              const next = new Map(prev);
              next.set(cursorUserId, { ...cursor, name: user.name, color: user.color });
              return next;
            });
          }
          return currentUsers;
        });
      },
      onPresenceSync: (users) => {
        setOtherUsers(users.filter(u => u.id !== userId));
      },
      onConnectionChange: (connected) => {
        setIsConnected(connected);
        if (!connected) {
          setConnectionError('Connection lost. Reconnecting...');
        } else {
          setConnectionError(null);
        }
      },
      onEditStart: (editUserId, nodeId) => {
        setOtherUsers(currentUsers => {
          const user = currentUsers.find(u => u.id === editUserId);
          if (user) {
            setEditingNodes(prev => {
              const next = new Map(prev);
              next.set(nodeId, { userId: editUserId, userName: user.name, color: user.color });
              return next;
            });
          }
          return currentUsers;
        });
      },
      onEditEnd: (editUserId, nodeId) => {
        setEditingNodes(prev => {
          const next = new Map(prev);
          if (next.get(nodeId)?.userId === editUserId) {
            next.delete(nodeId);
          }
          return next;
        });
      },
      onNodeChange: (change) => {
        // Handle remote node changes
        if (change.userId !== userId) {
          // Remote change - apply it
          // The board state is managed by the parent, so we don't need to do anything here
          // The parent will receive updates via Supabase subscription
        }
      }
    };
    
    // Create collaboration manager
    const manager = new CollaborationManager(board.id, userId, userName, userColor);
    collaborationRef.current = manager;
    manager.subscribe(callbacks);
    
    return () => {
      manager.unsubscribe();
      collaborationRef.current = null;
    };
  }, [board.id, userId, userName, userColor]);
  
  // Track cursor movement (throttled)
  const handleCursorMove = useCallback((e: React.MouseEvent) => {
    if (!collaborationRef.current || !canvasRef.current) return;
    
    const worldCoords = canvasRef.current.getWorldCoordinates(e.clientX, e.clientY);
    collaborationRef.current.broadcastCursor({ x: worldCoords.x, y: worldCoords.y });
  }, []);
  
  // Tool options
  const [toolOptions, setToolOptions] = useState<{
    shapeType?: ShapeType;
    color?: string;
  }>({});
  
  // History for undo/redo
  const [history, setHistory] = useState<VisualNode[][]>([board.visualNodes]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  // Derived state
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;
  
  const nodes = board.visualNodes;
  const selectedNodes = nodes.filter(n => selectedNodeIds.includes(n.id));
  
  // History management
  const pushHistory = useCallback((newNodes: VisualNode[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newNodes);
    // Limit history to 50 states
    if (newHistory.length > 50) {
      newHistory.shift();
    }
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);
  
  const handleUndo = useCallback(() => {
    if (canUndo) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      onUpdateBoard({ visualNodes: history[newIndex] });
    }
  }, [canUndo, history, historyIndex, onUpdateBoard]);
  
  const handleRedo = useCallback(() => {
    if (canRedo) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      onUpdateBoard({ visualNodes: history[newIndex] });
    }
  }, [canRedo, history, historyIndex, onUpdateBoard]);
  
  // Node operations
  const handleAddNode = useCallback((type: VisualNode['type'], x: number, y: number, options: any = {}) => {
    // Set default dimensions based on type
    let defaultWidth = 200;
    let defaultHeight = 150;
    
    if (type === 'youtube') {
      defaultWidth = 480;
      defaultHeight = 270;
    } else if (type === 'image') {
      defaultWidth = 300;
      defaultHeight = 200;
    }
    
    const baseNode = {
      id: generateId(),
      type,
      x,
      y,
      width: options.width || defaultWidth,
      height: options.height || defaultHeight,
      content: '',
      color: options.color || '#fef3c7',
      rotation: 0,
      locked: false,
      votes: 0,
      votedBy: [],
      createdBy: userName,
      comments: [],
      ...options
    };
    
    const newNodes = [...nodes, baseNode];
    onUpdateBoard({ visualNodes: newNodes });
    pushHistory(newNodes);
    
    // Select the new node
    setSelectedNodeIds([baseNode.id]);
  }, [nodes, userName, onUpdateBoard, pushHistory]);
  
  // Canvas click handler for adding nodes
  const handleCanvasClick = useCallback((worldX: number, worldY: number, e: React.MouseEvent) => {
    // worldX and worldY are already in world coordinates from EnterpriseCanvas
    switch (activeTool) {
      case 'sticky':
        handleAddNode('sticky', worldX - 100, worldY - 75, { 
          color: toolOptions.color || '#fef3c7',
          width: 200,
          height: 150
        });
        setActiveTool('select');
        break;
      case 'text':
        handleAddNode('text', worldX - 100, worldY - 25, {
          color: 'transparent',
          width: 200,
          height: 50,
          fontSize: 24
        });
        setActiveTool('select');
        break;
      case 'shape':
        handleAddNode('shape', worldX - 75, worldY - 75, {
          shapeType: toolOptions.shapeType || 'rectangle',
          color: toolOptions.color || '#dbeafe',
          width: 150,
          height: 150
        });
        setActiveTool('select');
        break;
      case 'frame':
        handleAddNode('frame', worldX - 200, worldY - 150, {
          color: '#f3f4f6',
          width: 400,
          height: 300
        });
        setActiveTool('select');
        break;
      case 'youtube':
        // YouTube tool opens modal, so clicking on canvas just opens the modal
        setShowMediaModal('youtube');
        break;
      case 'image':
        // Image tool opens modal, so clicking on canvas just opens the modal
        setShowMediaModal('image');
        break;
      case 'table':
        handleAddNode('table', worldX - 175, worldY - 100, {
          color: '#ffffff',
          width: 350,
          height: 200,
          content: 'Table',
          tableData: {
            headers: ['Column 1', 'Column 2', 'Column 3'],
            rows: [['', '', ''], ['', '', '']]
          }
        });
        setActiveTool('select');
        break;
      case 'bucket':
        handleAddNode('bucket', worldX - 150, worldY - 150, {
          color: '#f0f9ff',
          width: 300,
          height: 300,
          content: 'Photo Bucket',
          bucketId: generateId(),
          bucketImages: []
        });
        setActiveTool('select');
        break;
      case 'linklist':
        handleAddNode('linklist', worldX - 125, worldY - 100, {
          color: '#f0fdf4',
          width: 300,
          height: 200,
          content: 'Links',
          links: []
        });
        setActiveTool('select');
        break;
      case 'mindmap':
        handleAddNode('mindmap', worldX - 100, worldY - 40, {
          color: '#dbeafe',
          width: 200,
          height: 80,
          content: 'Central Idea',
          isRootNode: true
        });
        setActiveTool('select');
        break;
      default:
        setSelectedNodeIds([]);
    }
  }, [activeTool, toolOptions, handleAddNode]);
  
  // Double-click handler - create sticky note
  const handleCanvasDoubleClick = useCallback((worldX: number, worldY: number) => {
    handleAddNode('sticky', worldX - 100, worldY - 75, { 
      color: '#fef3c7',
      width: 200,
      height: 150
    });
  }, [handleAddNode]);
  
  // Tool change handler
  const handleToolChange = useCallback((tool: ToolType, options?: { shapeType?: ShapeType; color?: string }) => {
    setActiveTool(tool);
    if (options) {
      setToolOptions(prev => ({ ...prev, ...options }));
    }
    // Reset connector start when switching tools
    if (tool !== 'connector') {
      setConnectorStart(null);
    }
  }, []);
  
  // Handle media embedding (YouTube/Image)
  const handleEmbedMedia = useCallback((url: string, mediaType: 'youtube' | 'image') => {
    // Get canvas center or a reasonable default position
    const x = (canvasSize.width / 2) - (mediaType === 'youtube' ? 240 : 150);
    const y = (canvasSize.height / 2) - (mediaType === 'youtube' ? 135 : 100);
    
    handleAddNode(mediaType, x, y, {
      content: url,
      width: mediaType === 'youtube' ? 480 : 300,
      height: mediaType === 'youtube' ? 270 : 200,
      color: 'transparent'
    });
  }, [canvasSize, handleAddNode]);
  
  // Create connector between two nodes
  const createConnector = useCallback((fromId: string, toId: string) => {
    const connectorNode: VisualNode = {
      id: generateId(),
      type: 'connector',
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      content: '',
      color: '#6366f1',
      rotation: 0,
      locked: false,
      votes: 0,
      votedBy: [],
      createdBy: userName,
      comments: [],
      connectorFrom: fromId,
      connectorTo: toId,
      connectorWaypoints: []
    };
    const newNodes = [...nodes, connectorNode];
    onUpdateBoard({ visualNodes: newNodes });
    pushHistory(newNodes);
  }, [nodes, userName, onUpdateBoard, pushHistory]);
  
  // Handle node click for connector tool
  const handleNodeClickForConnector = useCallback((nodeId: string) => {
    if (activeTool !== 'connector') return;
    
    if (!connectorStart) {
      // First click - set start node
      setConnectorStart(nodeId);
    } else if (connectorStart !== nodeId) {
      // Second click - create connector
      createConnector(connectorStart, nodeId);
      setConnectorStart(null);
      setActiveTool('select');
    }
  }, [activeTool, connectorStart, createConnector]);
  
  // Node updates
  const handleUpdateNodes = useCallback((updatedNodes: VisualNode[]) => {
    onUpdateBoard({ visualNodes: updatedNodes });
    pushHistory(updatedNodes);
  }, [onUpdateBoard, pushHistory]);
  
  const handleDeleteNodes = useCallback((ids: string[]) => {
    const newNodes = nodes.filter(n => !ids.includes(n.id));
    onUpdateBoard({ visualNodes: newNodes });
    pushHistory(newNodes);
    setSelectedNodeIds([]);
  }, [nodes, onUpdateBoard, pushHistory]);
  
  // Selection
  const handleSelectNodes = useCallback((ids: string[], toggle?: boolean) => {
    if (toggle) {
      setSelectedNodeIds(prev => {
        const newSet = new Set(prev);
        ids.forEach(id => {
          if (newSet.has(id)) {
            newSet.delete(id);
          } else {
            newSet.add(id);
          }
        });
        return Array.from(newSet);
      });
    } else {
      setSelectedNodeIds(ids);
    }
  }, []);
  
  // Alignment operations
  const handleAlignLeft = useCallback(() => {
    if (selectedNodes.length < 2) return;
    const minX = Math.min(...selectedNodes.map(n => n.x));
    const newNodes = nodes.map(n => 
      selectedNodeIds.includes(n.id) ? { ...n, x: minX } : n
    );
    onUpdateBoard({ visualNodes: newNodes });
    pushHistory(newNodes);
  }, [selectedNodes, selectedNodeIds, nodes, onUpdateBoard, pushHistory]);
  
  const handleAlignCenter = useCallback(() => {
    if (selectedNodes.length < 2) return;
    const centerX = selectedNodes.reduce((acc, n) => acc + n.x + n.width / 2, 0) / selectedNodes.length;
    const newNodes = nodes.map(n => 
      selectedNodeIds.includes(n.id) ? { ...n, x: centerX - n.width / 2 } : n
    );
    onUpdateBoard({ visualNodes: newNodes });
    pushHistory(newNodes);
  }, [selectedNodes, selectedNodeIds, nodes, onUpdateBoard, pushHistory]);
  
  const handleAlignRight = useCallback(() => {
    if (selectedNodes.length < 2) return;
    const maxRight = Math.max(...selectedNodes.map(n => n.x + n.width));
    const newNodes = nodes.map(n => 
      selectedNodeIds.includes(n.id) ? { ...n, x: maxRight - n.width } : n
    );
    onUpdateBoard({ visualNodes: newNodes });
    pushHistory(newNodes);
  }, [selectedNodes, selectedNodeIds, nodes, onUpdateBoard, pushHistory]);
  
  const handleAlignTop = useCallback(() => {
    if (selectedNodes.length < 2) return;
    const minY = Math.min(...selectedNodes.map(n => n.y));
    const newNodes = nodes.map(n => 
      selectedNodeIds.includes(n.id) ? { ...n, y: minY } : n
    );
    onUpdateBoard({ visualNodes: newNodes });
    pushHistory(newNodes);
  }, [selectedNodes, selectedNodeIds, nodes, onUpdateBoard, pushHistory]);
  
  const handleAlignMiddle = useCallback(() => {
    if (selectedNodes.length < 2) return;
    const centerY = selectedNodes.reduce((acc, n) => acc + n.y + n.height / 2, 0) / selectedNodes.length;
    const newNodes = nodes.map(n => 
      selectedNodeIds.includes(n.id) ? { ...n, y: centerY - n.height / 2 } : n
    );
    onUpdateBoard({ visualNodes: newNodes });
    pushHistory(newNodes);
  }, [selectedNodes, selectedNodeIds, nodes, onUpdateBoard, pushHistory]);
  
  const handleAlignBottom = useCallback(() => {
    if (selectedNodes.length < 2) return;
    const maxBottom = Math.max(...selectedNodes.map(n => n.y + n.height));
    const newNodes = nodes.map(n => 
      selectedNodeIds.includes(n.id) ? { ...n, y: maxBottom - n.height } : n
    );
    onUpdateBoard({ visualNodes: newNodes });
    pushHistory(newNodes);
  }, [selectedNodes, selectedNodeIds, nodes, onUpdateBoard, pushHistory]);
  
  const handleDistributeHorizontal = useCallback(() => {
    if (selectedNodes.length < 3) return;
    const sorted = [...selectedNodes].sort((a, b) => a.x - b.x);
    const minX = sorted[0].x;
    const maxX = sorted[sorted.length - 1].x;
    const step = (maxX - minX) / (sorted.length - 1);
    
    const newNodes = nodes.map(n => {
      const index = sorted.findIndex(s => s.id === n.id);
      if (index === -1) return n;
      return { ...n, x: minX + step * index };
    });
    
    onUpdateBoard({ visualNodes: newNodes });
    pushHistory(newNodes);
  }, [selectedNodes, nodes, onUpdateBoard, pushHistory]);
  
  const handleDistributeVertical = useCallback(() => {
    if (selectedNodes.length < 3) return;
    const sorted = [...selectedNodes].sort((a, b) => a.y - b.y);
    const minY = sorted[0].y;
    const maxY = sorted[sorted.length - 1].y;
    const step = (maxY - minY) / (sorted.length - 1);
    
    const newNodes = nodes.map(n => {
      const index = sorted.findIndex(s => s.id === n.id);
      if (index === -1) return n;
      return { ...n, y: minY + step * index };
    });
    
    onUpdateBoard({ visualNodes: newNodes });
    pushHistory(newNodes);
  }, [selectedNodes, nodes, onUpdateBoard, pushHistory]);
  
  // Group operations
  const handleGroupSelected = useCallback(() => {
    if (selectedNodeIds.length < 2) return;
    const groupId = generateId();
    const newNodes = nodes.map(n => 
      selectedNodeIds.includes(n.id) ? { ...n, groupId } : n
    );
    onUpdateBoard({ visualNodes: newNodes });
    pushHistory(newNodes);
  }, [selectedNodeIds, nodes, onUpdateBoard, pushHistory]);
  
  const handleUngroupSelected = useCallback(() => {
    const newNodes = nodes.map(n => 
      selectedNodeIds.includes(n.id) ? { ...n, groupId: undefined } : n
    );
    onUpdateBoard({ visualNodes: newNodes });
    pushHistory(newNodes);
  }, [selectedNodeIds, nodes, onUpdateBoard, pushHistory]);
  
  // Duplicate
  const handleDuplicateSelected = useCallback(() => {
    if (selectedNodeIds.length === 0) return;
    const duplicated = nodes
      .filter(n => selectedNodeIds.includes(n.id))
      .map(n => ({
        ...n,
        id: generateId(),
        x: n.x + 20,
        y: n.y + 20
      }));
    const newNodes = [...nodes, ...duplicated];
    onUpdateBoard({ visualNodes: newNodes });
    pushHistory(newNodes);
    setSelectedNodeIds(duplicated.map(n => n.id));
  }, [selectedNodeIds, nodes, onUpdateBoard, pushHistory]);

  // Add mindmap child node
  const handleAddMindmapChild = useCallback((parentId: string) => {
    const parentNode = nodes.find(n => n.id === parentId);
    if (!parentNode) return;
    
    // Count existing children to position new child
    const existingChildren = nodes.filter(n => n.parentNodeId === parentId);
    const childIndex = existingChildren.length;
    
    // Position child below and slightly offset based on child count
    const offsetX = (childIndex % 3 - 1) * 120; // Spread horizontally
    const offsetY = 120 + Math.floor(childIndex / 3) * 100; // Stack rows
    
    const childNode: VisualNode = {
      id: generateId(),
      type: 'mindmap',
      x: parentNode.x + parentNode.width / 2 - 80 + offsetX,
      y: parentNode.y + parentNode.height + offsetY,
      width: 160,
      height: 60,
      content: 'New idea',
      color: '#e0e7ff', // Slightly lighter than parent
      rotation: 0,
      locked: false,
      votes: 0,
      votedBy: [],
      createdBy: userName,
      comments: [],
      parentNodeId: parentId,
      isRootNode: false
    };
    
    const newNodes = [...nodes, childNode];
    onUpdateBoard({ visualNodes: newNodes });
    pushHistory(newNodes);
    setSelectedNodeIds([childNode.id]);
  }, [nodes, userName, onUpdateBoard, pushHistory]);

  return (
    <div className="flex flex-col h-full flex-1 bg-gray-50" onMouseMove={handleCursorMove}>
      {/* Main Content - Full screen canvas */}
      <div className="flex-1 relative overflow-hidden">
        {/* Back button - positioned in top left */}
        <button
          onClick={onBack}
          className="absolute top-4 left-4 z-50 flex items-center gap-2 px-3 py-2 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="hidden sm:inline">Back</span>
        </button>
        
        {/* Connection status indicator */}
        <div className="absolute top-4 left-24 z-50 flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
            isConnected 
              ? 'bg-green-100 text-green-700' 
              : 'bg-yellow-100 text-yellow-700'
          }`}>
            {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isConnected ? 'Live' : 'Connecting...'}
          </div>
          {connectionError && (
            <div className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs">
              {connectionError}
            </div>
          )}
        </div>
        
        {/* User presence list - top right area */}
        <div className="absolute top-4 right-48 z-50">
          <UserPresenceList
            users={otherUsers}
            currentUser={currentUser}
            isConnected={isConnected}
            connectionError={connectionError}
            editingNodes={editingNodes}
          />
        </div>
        
        {/* Enterprise Canvas */}
        <EnterpriseCanvas
          ref={canvasRef}
          nodes={nodes}
          selectedNodeIds={selectedNodeIds}
          onSelectNodes={handleSelectNodes}
          onUpdateNodes={handleUpdateNodes}
          onDeleteNodes={handleDeleteNodes}
          onCanvasClick={handleCanvasClick}
          onCanvasDoubleClick={handleCanvasDoubleClick}
          onViewportChange={(vp) => {
            setViewportState(vp);
            // Also update canvas size
            const view = canvasRef.current?.getViewport();
            if (view) {
              setCanvasSize({ width: view.width, height: view.height });
            }
          }}
          activeTool={activeTool}
          gridEnabled={gridEnabled}
          gridSnap={gridSnap}
          showGrid={true}
        >
          {/* Render mindmap connector lines */}
          <svg 
            className="absolute inset-0 pointer-events-none" 
            style={{ overflow: 'visible', zIndex: 5 }}
          >
            {nodes.filter(n => n.type === 'mindmap' && n.parentNodeId).map(childNode => {
              const parentNode = nodes.find(n => n.id === childNode.parentNodeId);
              if (!parentNode) return null;
              
              // Calculate connection points (center of each node)
              const startX = parentNode.x + parentNode.width / 2;
              const startY = parentNode.y + parentNode.height / 2;
              const endX = childNode.x + childNode.width / 2;
              const endY = childNode.y + childNode.height / 2;
              
              // Create a curved path
              const midX = (startX + endX) / 2;
              
              return (
                <path
                  key={`mindmap-conn-${childNode.id}`}
                  d={`M ${startX} ${startY} Q ${midX} ${startY} ${midX} ${(startY + endY) / 2} Q ${midX} ${endY} ${endX} ${endY}`}
                  stroke={parentNode.color || '#8b5cf6'}
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                  opacity="0.6"
                />
              );
            })}
          </svg>
          
          {/* Render non-connector nodes */}
          {nodes
            .filter(n => !(n.type === 'connector' && n.connectorFrom && n.connectorTo))
            .map(node => (
              <NodeComponent
                key={node.id}
                node={node}
                isSelected={selectedNodeIds.includes(node.id)}
                isConnectorStart={connectorStart === node.id}
                isConnectorMode={activeTool === 'connector'}
                zoom={1}
                onSelect={() => {
                  if (activeTool === 'connector') {
                    handleNodeClickForConnector(node.id);
                  } else {
                    handleSelectNodes([node.id]);
                  }
                }}
                onUpdate={(updates) => {
                  const newNodes = nodes.map(n => 
                    n.id === node.id ? { ...n, ...updates } : n
                  );
                  handleUpdateNodes(newNodes);
                }}
                onDelete={() => handleDeleteNodes([node.id])}
                onAddMindmapChild={node.type === 'mindmap' ? handleAddMindmapChild : undefined}
              />
            ))}
        </EnterpriseCanvas>
        
        {/* Floating Property Panel for selected nodes */}
        {selectedNodeIds.length === 1 && nodes.find(n => n.id === selectedNodeIds[0]) && (
          <FloatingPropertyPanel
            node={nodes.find(n => n.id === selectedNodeIds[0])!}
            isOpen={true}
            onUpdate={(updates) => {
              const newNodes = nodes.map(n => 
                n.id === selectedNodeIds[0] ? { ...n, ...updates } : n
              );
              handleUpdateNodes(newNodes);
            }}
            onClose={() => setSelectedNodeIds([])}
            onDelete={() => handleDeleteNodes(selectedNodeIds)}
            onDuplicate={() => handleDuplicateSelected()}
            onBringToFront={() => {
              const node = nodes.find(n => n.id === selectedNodeIds[0]);
              if (node) {
                const newNodes = nodes.filter(n => n.id !== node.id);
                newNodes.push(node);
                handleUpdateNodes(newNodes);
              }
            }}
            onSendToBack={() => {
              const node = nodes.find(n => n.id === selectedNodeIds[0]);
              if (node) {
                const newNodes = nodes.filter(n => n.id !== node.id);
                newNodes.unshift(node);
                handleUpdateNodes(newNodes);
              }
            }}
            onLockToggle={() => {
              const node = nodes.find(n => n.id === selectedNodeIds[0]);
              if (node) {
                const newNodes = nodes.map(n => 
                  n.id === node.id ? { ...n, locked: !n.locked } : n
                );
                handleUpdateNodes(newNodes);
              }
            }}
          />
        )}
        
        {/* Enterprise Toolbar */}
        <EnterpriseToolbar
          activeTool={activeTool}
          onToolChange={handleToolChange}
          zoom={1}
          onZoomIn={() => canvasRef.current?.zoomIn()}
          onZoomOut={() => canvasRef.current?.zoomOut()}
          onResetView={() => canvasRef.current?.resetView()}
          onFitToContent={() => canvasRef.current?.fitToContent()}
          gridEnabled={gridEnabled}
          onToggleGrid={() => setGridEnabled(!gridEnabled)}
          gridSnap={gridSnap}
          onToggleSnap={() => setGridSnap(!gridSnap)}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={handleUndo}
          onRedo={handleRedo}
          selectedCount={selectedNodeIds.length}
          onAlignLeft={handleAlignLeft}
          onAlignCenter={handleAlignCenter}
          onAlignRight={handleAlignRight}
          onAlignTop={handleAlignTop}
          onAlignMiddle={handleAlignMiddle}
          onAlignBottom={handleAlignBottom}
          onDistributeHorizontal={handleDistributeHorizontal}
          onDistributeVertical={handleDistributeVertical}
          onDeleteSelected={() => handleDeleteNodes(selectedNodeIds)}
          onDuplicateSelected={handleDuplicateSelected}
          onGroupSelected={handleGroupSelected}
          onUngroupSelected={handleUngroupSelected}
          onStartPresentation={() => {}}
          onOpenShare={() => setShowShareModal(true)}
          onOpenTimer={() => {}}
          participantCount={participantCount}
          facilitatorMode={facilitatorMode}
          onToggleFacilitatorMode={() => setFacilitatorMode(!facilitatorMode)}
          boardName={board.name}
          onBoardNameChange={(name) => onUpdateBoard({ name })}
          onOpenMediaModal={(type) => setShowMediaModal(type)}
        />
        
        {/* Minimap */}
        {showMinimap && (
          <Minimap
            nodes={nodes}
            zoom={viewportState.zoom}
            panX={viewportState.panX}
            panY={viewportState.panY}
            canvasWidth={canvasSize.width}
            canvasHeight={canvasSize.height}
            onPan={(x, y) => canvasRef.current?.setPan(x, y)}
            onClose={() => setShowMinimap(false)}
          />
        )}
        
        {/* Minimap toggle button when hidden */}
        {!showMinimap && (
          <button
            onClick={() => setShowMinimap(true)}
            className="absolute bottom-4 right-4 z-40 flex items-center gap-2 px-3 py-2 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
          >
            <MapIcon className="w-4 h-4" />
            <span className="text-sm">Show Minimap</span>
          </button>
        )}
        
        {/* Collaboration Overlay - Live Cursors */}
        <CollaborationOverlay
          cursors={cursors}
          zoom={viewportState.zoom}
          panX={viewportState.panX}
          panY={viewportState.panY}
          showCursors={showCursors}
        />
      </div>
      
      {/* Share Board Modal */}
      <ShareBoardModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        boardId={board.id}
        boardName={board.name}
        isConnected={isConnected}
        connectedUsers={[currentUser, ...otherUsers.map(u => ({ id: u.id, name: u.name, color: u.color }))]}
      />
      
      {/* Media Modal (YouTube/Image) */}
      {showMediaModal && (
        <MediaModal
          type={showMediaModal}
          onClose={() => setShowMediaModal(null)}
          onEmbed={handleEmbedMedia}
        />
      )}
    </div>
  );
};

// Media Modal Component for YouTube and Image embedding
const MediaModal = ({ type, onClose, onEmbed }: { 
  type: 'youtube' | 'image'; 
  onClose: () => void; 
  onEmbed: (url: string, mediaType: 'youtube' | 'image') => void 
}) => {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    if (preview) {
      onEmbed(preview, 'image');
      onClose();
      return;
    }
    if (!url.trim()) { 
      setError('Please enter a URL or upload a file'); 
      return; 
    }
    if (type === 'youtube') {
      const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
      if (!match) { 
        setError('Invalid YouTube URL'); 
        return; 
      }
      onEmbed(`https://www.youtube.com/embed/${match[1]}`, 'youtube');
    } else {
      onEmbed(url, 'image');
    }
    onClose();
  };

  const handleFileChange = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileChange(file);
  };

  const handleDragOver = (e: React.DragEvent) => { 
    e.preventDefault(); 
    setIsDragging(true); 
  };
  
  const handleDragLeave = () => setIsDragging(false);

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" 
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9 }} 
        animate={{ scale: 1 }} 
        className="bg-white rounded-2xl p-6 w-[500px]" 
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {type === 'youtube' ? (
              <Youtube className="w-6 h-6 text-red-500" />
            ) : (
              <Image className="w-6 h-6 text-indigo-500" />
            )}
            <h2 className="text-xl font-bold text-gray-900">
              {type === 'youtube' ? 'Embed YouTube Video' : 'Embed Image'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        <div className="space-y-4">
          {type === 'image' && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input 
                ref={fileInputRef} 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])} 
              />
              {preview ? (
                <div className="space-y-3">
                  <img src={preview} alt="Preview" className="max-h-40 mx-auto rounded-lg" />
                  <p className="text-sm text-gray-500">Click or drag to replace</p>
                </div>
              ) : (
                <>
                  <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                  <p className="font-medium text-gray-700">Drop an image here or click to browse</p>
                  <p className="text-sm text-gray-500 mt-1">PNG, JPG, GIF up to 10MB</p>
                </>
              )}
            </div>
          )}
          
          <div className="relative">
            {type === 'image' && (
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-sm text-gray-500">or paste URL</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
            )}
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {type === 'youtube' ? 'YouTube URL' : 'Image URL'}
            </label>
            <input 
              type="text" 
              value={url} 
              onChange={(e) => { setUrl(e.target.value); setError(''); setPreview(null); }} 
              placeholder={type === 'youtube' ? 'https://www.youtube.com/watch?v=...' : 'https://example.com/image.jpg'} 
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" 
            />
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          </div>
          
          <div className="flex gap-3">
            <motion.button 
              whileHover={{ scale: 1.02 }} 
              onClick={handleSubmit} 
              className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl font-medium"
            >
              Embed
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.02 }} 
              onClick={onClose} 
              className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium"
            >
              Cancel
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Simple node component for the enterprise view
interface NodeComponentProps {
  node: VisualNode;
  isSelected: boolean;
  isConnectorStart?: boolean;
  isConnectorMode?: boolean;
  zoom: number;
  onSelect: () => void;
  onUpdate: (updates: Partial<VisualNode>) => void;
  onDelete: () => void;
  onAddMindmapChild?: (parentId: string) => void;
}

const NodeComponent: React.FC<NodeComponentProps> = ({
  node,
  isSelected,
  isConnectorStart = false,
  isConnectorMode = false,
  zoom,
  onSelect,
  onUpdate,
  onDelete,
  onAddMindmapChild
}) => {
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [startPos, setStartPos] = useState({ x: 0, y: 0, width: 0, height: 0, nodeX: 0, nodeY: 0 });
  
  const handleDragEnd = (_: any, info: any) => {
    if (!isResizing) {
      onUpdate({
        x: node.x + info.offset.x,
        y: node.y + info.offset.y
      });
    }
  };

  // Resize handlers
  const handleResizeStart = (e: React.MouseEvent, handle: string) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    setResizeHandle(handle);
    setStartPos({
      x: e.clientX,
      y: e.clientY,
      width: node.width,
      height: node.height,
      nodeX: node.x,
      nodeY: node.y
    });
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - e.clientX;
      const dy = moveEvent.clientY - e.clientY;
      
      let newWidth = node.width;
      let newHeight = node.height;
      let newX = node.x;
      let newY = node.y;
      
      // Min size
      const minSize = 50;
      
      switch (handle) {
        case 'se':
          newWidth = Math.max(minSize, startPos.width + dx);
          newHeight = Math.max(minSize, startPos.height + dy);
          break;
        case 'sw':
          newWidth = Math.max(minSize, startPos.width - dx);
          newHeight = Math.max(minSize, startPos.height + dy);
          newX = startPos.nodeX + (startPos.width - newWidth);
          break;
        case 'ne':
          newWidth = Math.max(minSize, startPos.width + dx);
          newHeight = Math.max(minSize, startPos.height - dy);
          newY = startPos.nodeY + (startPos.height - newHeight);
          break;
        case 'nw':
          newWidth = Math.max(minSize, startPos.width - dx);
          newHeight = Math.max(minSize, startPos.height - dy);
          newX = startPos.nodeX + (startPos.width - newWidth);
          newY = startPos.nodeY + (startPos.height - newHeight);
          break;
      }
      
      onUpdate({ width: newWidth, height: newHeight, x: newX, y: newY });
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      setResizeHandle(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const renderContent = () => {
    switch (node.type) {
      case 'sticky':
        return (
          <div 
            className="w-full h-full rounded-xl p-4 shadow-md"
            style={{ backgroundColor: node.color }}
          >
            <textarea
              value={node.content}
              onChange={(e) => onUpdate({ content: e.target.value })}
              className="w-full h-full bg-transparent resize-none border-none outline-none text-gray-800 placeholder-gray-500"
              placeholder="Type here..."
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        );
      
      case 'text':
        return (
          <textarea
            value={node.content}
            onChange={(e) => onUpdate({ content: e.target.value })}
            className="w-full h-full bg-transparent resize-none border-none outline-none text-gray-900 font-medium"
            style={{ fontSize: node.fontSize || 24 }}
            placeholder="Type here..."
            onClick={(e) => e.stopPropagation()}
          />
        );
      
      case 'shape':
        const shapeStyle = getShapeStyle(node.shapeType);
        return (
          <div 
            className="w-full h-full flex items-center justify-center"
            style={{
              backgroundColor: node.color,
              ...shapeStyle
            }}
          >
            <textarea
              value={node.content}
              onChange={(e) => onUpdate({ content: e.target.value })}
              className="w-full h-full bg-transparent resize-none border-none outline-none text-gray-700 text-center p-4"
              placeholder="Type here..."
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        );
      
      case 'frame':
        return (
          <div 
            className="w-full h-full rounded-2xl border-2 border-dashed p-4"
            style={{ 
              backgroundColor: `${node.color}40`,
              borderColor: node.color 
            }}
          >
            <input
              type="text"
              value={node.content}
              onChange={(e) => onUpdate({ content: e.target.value })}
              className="w-full bg-transparent border-none outline-none font-semibold text-gray-700"
              placeholder="Frame title..."
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        );
      
      case 'table':
        if (!node.tableData) {
          return (
            <div className="w-full h-full rounded-xl p-4 bg-white border border-gray-200 flex items-center justify-center text-gray-400">
              No table data
            </div>
          );
        }
        return (
          <div className="p-3 h-full flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
              <Table2 className="w-4 h-4 text-blue-500" />
              <input
                type="text"
                value={node.content}
                onChange={(e) => onUpdate({ content: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 font-semibold text-sm text-gray-700 bg-transparent border-none outline-none"
                placeholder="Table name"
              />
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    {node.tableData.headers?.map((header, i) => (
                      <th key={i} className="border border-gray-200 bg-gray-50 px-2 py-1.5 text-left font-medium text-gray-600">
                        <input
                          type="text"
                          value={header}
                          onChange={(e) => {
                            const newHeaders = [...(node.tableData?.headers || [])];
                            newHeaders[i] = e.target.value;
                            onUpdate({ tableData: { ...node.tableData!, headers: newHeaders } });
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full bg-transparent border-none outline-none"
                        />
                      </th>
                    ))}
                    <th className="border border-gray-200 bg-gray-50 px-1 py-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const newHeaders = [...(node.tableData?.headers || []), 'New'];
                          const newRows = node.tableData?.rows.map(row => [...row, '']) || [];
                          onUpdate({ tableData: { headers: newHeaders, rows: newRows } });
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {node.tableData.rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className="border border-gray-200 px-2 py-1">
                          <input
                            type="text"
                            value={cell}
                            onChange={(e) => {
                              const newRows = [...node.tableData!.rows];
                              newRows[rowIndex] = [...newRows[rowIndex]];
                              newRows[rowIndex][cellIndex] = e.target.value;
                              onUpdate({ tableData: { ...node.tableData!, rows: newRows } });
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full bg-transparent border-none outline-none text-gray-700"
                          />
                        </td>
                      ))}
                      <td className="border border-gray-200 px-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const newRows = node.tableData?.rows.filter((_, i) => i !== rowIndex) || [];
                            onUpdate({ tableData: { ...node.tableData!, rows: newRows } });
                          }}
                          className="text-red-300 hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const newRow = Array(node.tableData?.headers?.length || 3).fill('');
                  onUpdate({ tableData: { ...node.tableData!, rows: [...(node.tableData?.rows || []), newRow] } });
                }}
                className="w-full mt-2 py-1 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded border border-dashed border-gray-200 flex items-center justify-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Row
              </button>
            </div>
          </div>
        );
      
      case 'youtube':
        return (
          <div className="w-full h-full rounded-xl overflow-hidden shadow-lg bg-black">
            {node.content ? (
              <iframe
                src={node.content}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="YouTube video"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <div className="text-center text-gray-500">
                  <Youtube className="w-12 h-12 mx-auto mb-2 text-red-500" />
                  <p>No video URL</p>
                </div>
              </div>
            )}
          </div>
        );
      
      case 'image':
        return (
          <div className="w-full h-full rounded-xl overflow-hidden shadow-lg bg-gray-100">
            {node.content ? (
              <img
                src={node.content}
                alt="Embedded image"
                className="w-full h-full object-cover"
                draggable={false}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <Image className="w-12 h-12 mx-auto mb-2 text-indigo-500" />
                  <p>No image URL</p>
                </div>
              </div>
            )}
          </div>
        );
      
      case 'mindmap':
        return (
          <div 
            className="relative w-full h-full rounded-full p-4 shadow-md flex items-center justify-center"
            style={{ 
              backgroundColor: node.color,
              border: `2px solid ${node.isRootNode ? '#3b82f6' : '#93c5fd'}`
            }}
          >
            <textarea
              value={node.content}
              onChange={(e) => onUpdate({ content: e.target.value })}
              className="w-full h-full bg-transparent resize-none border-none outline-none text-gray-800 text-center flex items-center justify-center"
              style={{ textAlign: 'center' }}
              placeholder={node.isRootNode ? "Central Idea" : "Branch..."}
              onClick={(e) => e.stopPropagation()}
            />
            {/* Add child button - visible when selected */}
            {isSelected && onAddMindmapChild && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddMindmapChild(node.id);
                }}
                className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg transition-colors"
                title="Add child node"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>
        );
      
      case 'bucket':
        return (
          <div 
            className="w-full h-full rounded-xl p-3 flex flex-col border border-gray-200 shadow-sm"
            style={{ backgroundColor: node.color }}
          >
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-200">
              <FolderOpen className="w-4 h-4 text-indigo-500" />
              <input
                type="text"
                value={node.content}
                onChange={(e) => onUpdate({ content: e.target.value })}
                className="flex-1 text-sm font-bold text-gray-700 bg-transparent border-none outline-none"
                placeholder="Bucket title..."
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            {node.bucketImages && node.bucketImages.length > 0 ? (
              <div className="flex-1 grid grid-cols-2 gap-2 overflow-auto">
                {node.bucketImages.map((img: string, idx: number) => (
                  <div key={idx} className="aspect-square rounded-lg overflow-hidden bg-gray-100 relative group">
                    <img src={img} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const newImages = node.bucketImages?.filter((_: string, i: number) => i !== idx);
                        onUpdate({ bucketImages: newImages });
                      }}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div 
                className="flex-1 flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.multiple = true;
                  input.onchange = async (ev) => {
                    const files = (ev.target as HTMLInputElement).files;
                    if (files) {
                      const newImages: string[] = [];
                      for (const file of Array.from(files)) {
                        const reader = new FileReader();
                        const dataUrl = await new Promise<string>((resolve) => {
                          reader.onload = () => resolve(reader.result as string);
                          reader.readAsDataURL(file);
                        });
                        newImages.push(dataUrl);
                      }
                      onUpdate({ bucketImages: [...(node.bucketImages || []), ...newImages] });
                    }
                  };
                  input.click();
                }}
              >
                <div className="text-center">
                  <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">Click to upload images</p>
                </div>
              </div>
            )}
            {node.bucketImages && node.bucketImages.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.multiple = true;
                  input.onchange = async (ev) => {
                    const files = (ev.target as HTMLInputElement).files;
                    if (files) {
                      const newImages: string[] = [];
                      for (const file of Array.from(files)) {
                        const reader = new FileReader();
                        const dataUrl = await new Promise<string>((resolve) => {
                          reader.onload = () => resolve(reader.result as string);
                          reader.readAsDataURL(file);
                        });
                        newImages.push(dataUrl);
                      }
                      onUpdate({ bucketImages: [...(node.bucketImages || []), ...newImages] });
                    }
                  };
                  input.click();
                }}
                className="mt-2 w-full py-1.5 text-xs text-gray-500 hover:text-indigo-600 hover:bg-white/50 rounded border border-dashed border-gray-300 flex items-center justify-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Images
              </button>
            )}
          </div>
        );
      
      case 'linklist':
        return (
          <div 
            className="w-full h-full rounded-xl p-3 flex flex-col overflow-hidden border border-gray-200 shadow-sm"
            style={{ backgroundColor: node.color }}
          >
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-200/50">
              <LinkIcon className="w-4 h-4 text-green-600" />
              <input
                type="text"
                value={node.content}
                onChange={(e) => onUpdate({ content: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 font-semibold text-sm text-gray-700 bg-transparent border-none outline-none"
                placeholder="List title"
              />
            </div>
            <div className="flex-1 overflow-auto space-y-1.5">
              {node.links?.map((link: { id: string; title: string; url: string }, i: number) => (
                <div key={link.id} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-100 group">
                  <ExternalLink className="w-3 h-3 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={link.title}
                      onChange={(e) => {
                        const newLinks = [...(node.links || [])];
                        newLinks[i] = { ...newLinks[i], title: e.target.value };
                        onUpdate({ links: newLinks });
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full text-xs font-medium text-gray-700 bg-transparent border-none outline-none truncate"
                      placeholder="Link title"
                    />
                    <input
                      type="url"
                      value={link.url}
                      onChange={(e) => {
                        const newLinks = [...(node.links || [])];
                        newLinks[i] = { ...newLinks[i], url: e.target.value };
                        onUpdate({ links: newLinks });
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full text-[10px] text-blue-500 bg-transparent border-none outline-none truncate"
                      placeholder="https://..."
                    />
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1 hover:bg-gray-100 rounded text-blue-500"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdate({ links: node.links?.filter((_: { id: string; title: string; url: string }, idx: number) => idx !== i) });
                      }}
                      className="p-1 hover:bg-red-50 rounded text-red-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const newLink = { id: `link-${Date.now()}`, title: 'New Link', url: '' };
                  onUpdate({ links: [...(node.links || []), newLink] });
                }}
                className="w-full py-1.5 text-xs text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded border border-dashed border-gray-300 flex items-center justify-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Link
              </button>
            </div>
          </div>
        );
      
      default:
        return (
          <div 
            className="w-full h-full rounded-xl p-4 shadow-md"
            style={{ backgroundColor: node.color }}
          >
            <textarea
              value={node.content}
              onChange={(e) => onUpdate({ content: e.target.value })}
              className="w-full h-full bg-transparent resize-none border-none outline-none text-gray-800"
              placeholder="Type here..."
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        );
    }
  };

  // Determine border style for connector mode
  const getBorderClass = () => {
    if (isConnectorStart) return 'ring-2 ring-green-500 ring-offset-2';
    if (isConnectorMode) return 'ring-2 ring-dashed ring-indigo-300 ring-offset-1 hover:ring-indigo-500';
    if (isSelected) return 'ring-2 ring-indigo-500 ring-offset-2';
    return '';
  };

  return (
    <motion.div
      drag={!isResizing && !isConnectorMode}
      dragMomentum={false}
      onDragEnd={handleDragEnd}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ 
        scale: 1, 
        opacity: 1
      }}
      whileHover={!isResizing ? { scale: isConnectorMode ? 1.05 : 1.02 } : undefined}
      className={`absolute ${getBorderClass()}`}
      style={{
        left: node.x,
        top: node.y,
        width: node.width,
        height: node.height,
        cursor: isConnectorMode ? 'crosshair' : (isResizing ? 'default' : 'grab'),
        zIndex: isSelected ? 100 : 10
      }}
    >
      {renderContent()}
      
      {/* Selection handles with resize functionality */}
      {isSelected && (
        <>
          <div 
            className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-indigo-500 rounded-sm cursor-nw-resize hover:bg-indigo-100"
            onMouseDown={(e) => handleResizeStart(e, 'nw')}
          />
          <div 
            className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-indigo-500 rounded-sm cursor-ne-resize hover:bg-indigo-100"
            onMouseDown={(e) => handleResizeStart(e, 'ne')}
          />
          <div 
            className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-indigo-500 rounded-sm cursor-sw-resize hover:bg-indigo-100"
            onMouseDown={(e) => handleResizeStart(e, 'sw')}
          />
          <div 
            className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-indigo-500 rounded-sm cursor-se-resize hover:bg-indigo-100"
            onMouseDown={(e) => handleResizeStart(e, 'se')}
          />
        </>
      )}
    </motion.div>
  );
};

// Get shape style based on shape type
const getShapeStyle = (shapeType?: string): React.CSSProperties => {
  switch (shapeType) {
    case 'circle':
      return { borderRadius: '50%' };
    case 'triangle':
      return { clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' };
    case 'diamond':
      return { clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' };
    default:
      return { borderRadius: '8px' };
  }
};

// Minimap Component
interface MinimapProps {
  nodes: VisualNode[];
  zoom: number;
  panX: number;
  panY: number;
  canvasWidth: number;
  canvasHeight: number;
  onPan: (x: number, y: number) => void;
  onClose: () => void;
}

const Minimap: React.FC<MinimapProps> = ({
  nodes,
  zoom,
  panX,
  panY,
  canvasWidth,
  canvasHeight,
  onPan,
  onClose
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Calculate bounds of all nodes
  const bounds = nodes.length > 0 ? {
    minX: Math.min(...nodes.map(n => n.x)) - 200,
    maxX: Math.max(...nodes.map(n => n.x + n.width)) + 200,
    minY: Math.min(...nodes.map(n => n.y)) - 200,
    maxY: Math.max(...nodes.map(n => n.y + n.height)) + 200,
  } : { minX: -500, maxX: 1500, minY: -500, maxY: 1500 };

  const contentWidth = Math.max(bounds.maxX - bounds.minX, 1000);
  const contentHeight = Math.max(bounds.maxY - bounds.minY, 800);
  const minimapWidth = 200;
  const minimapHeight = 140;
  const scale = Math.min(minimapWidth / contentWidth, minimapHeight / contentHeight, 0.15);

  // Viewport rectangle
  const viewportWidth = Math.max((canvasWidth / zoom) * scale, 10);
  const viewportHeight = Math.max((canvasHeight / zoom) * scale, 10);
  const viewportX = ((-panX / zoom) - bounds.minX) * scale;
  const viewportY = ((-panY / zoom) - bounds.minY) * scale;

  const handleViewportMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      setDragOffset({
        x: mouseX - viewportX - viewportWidth / 2,
        y: mouseY - viewportY - viewportHeight / 2
      });
    }
  };

  const handleMinimapClick = (e: React.MouseEvent) => {
    if (isDragging) return;
    if (!svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const canvasX = (x / scale) + bounds.minX;
    const canvasY = (y / scale) + bounds.minY;

    const newPanX = -(canvasX - (canvasWidth / zoom / 2)) * zoom;
    const newPanY = -(canvasY - (canvasHeight / zoom / 2)) * zoom;

    onPan(newPanX, newPanY);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - dragOffset.x;
    const mouseY = e.clientY - rect.top - dragOffset.y;

    const canvasX = (mouseX / scale) + bounds.minX;
    const canvasY = (mouseY / scale) + bounds.minY;

    const newPanX = -(canvasX - (canvasWidth / zoom / 2)) * zoom;
    const newPanY = -(canvasY - (canvasHeight / zoom / 2)) * zoom;

    onPan(newPanX, newPanY);
  }, [isDragging, dragOffset, scale, bounds, canvasWidth, canvasHeight, zoom, onPan]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-2 z-40"
      style={{ width: minimapWidth + 16, height: minimapHeight + 40 }}
    >
      <div className="flex items-center justify-between mb-1 px-1">
        <span className="text-[10px] font-medium text-gray-500 flex items-center gap-1">
          <MapIcon className="w-3 h-3" /> Minimap
        </span>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 p-0.5"
        >
          <EyeOff className="w-3 h-3" />
        </button>
      </div>
      <svg
        ref={svgRef}
        width={minimapWidth}
        height={minimapHeight}
        className="cursor-pointer rounded"
        onClick={handleMinimapClick}
      >
        {/* Grid background */}
        <rect x="0" y="0" width={minimapWidth} height={minimapHeight} fill="#f3f4f6" rx="4" />

        {/* Grid lines */}
        {Array.from({ length: 10 }).map((_, i) => (
          <g key={i}>
            <line x1={i * minimapWidth / 10} y1="0" x2={i * minimapWidth / 10} y2={minimapHeight} stroke="#e5e7eb" strokeWidth="0.5" />
            <line x1="0" y1={i * minimapHeight / 10} x2={minimapWidth} y2={i * minimapHeight / 10} stroke="#e5e7eb" strokeWidth="0.5" />
          </g>
        ))}

        {/* Nodes */}
        {nodes.filter(n => !(n.type === 'connector' && n.connectorFrom && n.connectorTo)).map(node => (
          <rect
            key={node.id}
            x={(node.x - bounds.minX) * scale}
            y={(node.y - bounds.minY) * scale}
            width={Math.max(node.width * scale, 3)}
            height={Math.max(node.height * scale, 3)}
            fill={node.color || '#dbeafe'}
            stroke="#9ca3af"
            strokeWidth="0.5"
            rx="1"
          />
        ))}

        {/* Viewport indicator - draggable */}
        <rect
          x={viewportX}
          y={viewportY}
          width={viewportWidth}
          height={viewportHeight}
          fill="rgba(99, 102, 241, 0.15)"
          stroke="#6366f1"
          strokeWidth="2"
          rx="3"
          className={`cursor-grab ${isDragging ? 'cursor-grabbing' : ''}`}
          style={{ pointerEvents: 'all' }}
          onMouseDown={handleViewportMouseDown}
        />
      </svg>
      <div className="text-[9px] text-gray-400 text-center mt-1">
        {Math.round(zoom * 100)}% • Drag viewport to pan
      </div>
    </div>
  );
};

export default EnterpriseMeetingView;
