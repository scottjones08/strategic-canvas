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
import { ArrowLeft, Users, Share2, MoreHorizontal, Maximize2 } from 'lucide-react';
import type { Board, VisualNode } from '../types/board';
import type { ConnectorPath, Waypoint } from '../lib/connector-engine';
import { EnterpriseCanvas, EnterpriseCanvasRef } from './EnterpriseCanvas';
import { EnterpriseToolbar, ToolType, ShapeType } from './EnterpriseToolbar';
import { createConnectorPath, nodeToConnectorPath } from '../lib/connector-engine';

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
  onOpenShare
}) => {
  // Refs
  const canvasRef = useRef<EnterpriseCanvasRef>(null);
  
  // State
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [gridEnabled, setGridEnabled] = useState(true);
  const [gridSnap, setGridSnap] = useState(false);
  const [showMinimap, setShowMinimap] = useState(true);
  const [facilitatorMode, setFacilitatorMode] = useState(false);
  
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
    const baseNode = {
      id: generateId(),
      type,
      x,
      y,
      width: 200,
      height: 150,
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
    // Only add on direct canvas clicks (not on existing nodes)
    if (e.target !== e.currentTarget) return;
    
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
      default:
        setSelectedNodeIds([]);
    }
  }, [activeTool, toolOptions, handleAddNode]);
  
  // Tool change handler
  const handleToolChange = useCallback((tool: ToolType, options?: { shapeType?: ShapeType; color?: string }) => {
    setActiveTool(tool);
    if (options) {
      setToolOptions(prev => ({ ...prev, ...options }));
    }
  }, []);
  
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

  return (
    <div className="flex flex-col h-full flex-1 bg-gray-50">
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
        {/* Enterprise Canvas */}
        <EnterpriseCanvas
          ref={canvasRef}
          nodes={nodes}
          selectedNodeIds={selectedNodeIds}
          onSelectNodes={handleSelectNodes}
          onUpdateNodes={handleUpdateNodes}
          onDeleteNodes={handleDeleteNodes}
          onCanvasClick={handleCanvasClick}
          gridEnabled={gridEnabled}
          gridSnap={gridSnap}
          showGrid={true}
        >
          {/* Render non-connector nodes */}
          {nodes
            .filter(n => !(n.type === 'connector' && n.connectorFrom && n.connectorTo))
            .map(node => (
              <NodeComponent
                key={node.id}
                node={node}
                isSelected={selectedNodeIds.includes(node.id)}
                zoom={1}
                onSelect={() => handleSelectNodes([node.id])}
                onUpdate={(updates) => {
                  const newNodes = nodes.map(n => 
                    n.id === node.id ? { ...n, ...updates } : n
                  );
                  handleUpdateNodes(newNodes);
                }}
                onDelete={() => handleDeleteNodes([node.id])}
              />
            ))}
        </EnterpriseCanvas>
        
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
          onOpenShare={onOpenShare || (() => {})}
          onOpenTimer={() => {}}
          participantCount={participantCount}
          facilitatorMode={facilitatorMode}
          onToggleFacilitatorMode={() => setFacilitatorMode(!facilitatorMode)}
          boardName={board.name}
          onBoardNameChange={(name) => onUpdateBoard({ name })}
        />
      </div>
    </div>
  );
};

// Simple node component for the enterprise view
interface NodeComponentProps {
  node: VisualNode;
  isSelected: boolean;
  zoom: number;
  onSelect: () => void;
  onUpdate: (updates: Partial<VisualNode>) => void;
  onDelete: () => void;
}

const NodeComponent: React.FC<NodeComponentProps> = ({
  node,
  isSelected,
  onSelect,
  onUpdate,
  onDelete
}) => {
  const handleDragEnd = (_: any, info: any) => {
    onUpdate({
      x: node.x + info.offset.x,
      y: node.y + info.offset.y
    });
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

  return (
    <motion.div
      drag
      dragMomentum={false}
      onDragEnd={handleDragEnd}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ 
        scale: 1, 
        opacity: 1,
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height
      }}
      whileHover={{ scale: 1.02 }}
      className={`absolute ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}
      style={{
        cursor: 'grab',
        zIndex: isSelected ? 100 : 10
      }}
    >
      {renderContent()}
      
      {/* Selection handles */}
      {isSelected && (
        <>
          <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-indigo-500 rounded-sm cursor-nw-resize" />
          <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-indigo-500 rounded-sm cursor-ne-resize" />
          <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-indigo-500 rounded-sm cursor-sw-resize" />
          <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-indigo-500 rounded-sm cursor-se-resize" />
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

export default EnterpriseMeetingView;
