/**
 * Enhanced Connector Component
 * 
 * Features:
 * - Draggable control points (waypoints)
 * - Multiple routing styles
 * - Visual feedback for selection
 * - Double-click to add new waypoints
 * - Drag waypoints to reposition
 * - Better styling options
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Plus, Minus, Move, GitBranch, MousePointer2 } from 'lucide-react';
import type { Waypoint, ConnectorPath, Point } from '../lib/connector-engine';
import {
  generatePath,
  addWaypoint,
  removeWaypoint,
  updateWaypoint,
  getPointOnPath,
  distance,
  getNearestEdgePoint
} from '../lib/connector-engine';

interface EnhancedConnectorProps {
  id: string;
  path: ConnectorPath;
  isSelected: boolean;
  fromNode?: { x: number; y: number; width: number; height: number };
  toNode?: { x: number; y: number; width: number; height: number };
  zoom: number;
  onUpdate: (path: ConnectorPath) => void;
  onDelete: () => void;
  onSelect: () => void;
  readOnly?: boolean;
}

// Generate unique ID
const generateId = () => `wp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const EnhancedConnector: React.FC<EnhancedConnectorProps> = ({
  id,
  path,
  isSelected,
  fromNode,
  toNode,
  zoom,
  onUpdate,
  onDelete,
  onSelect,
  readOnly = false
}) => {
  const [draggingWaypoint, setDraggingWaypoint] = useState<string | null>(null);
  const [hoveredWaypoint, setHoveredWaypoint] = useState<string | null>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [showToolbar, setShowToolbar] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; waypoint: Waypoint } | null>(null);

  // Generate SVG path
  const pathD = generatePath(path);
  
  // Calculate path bounds for hit testing
  const pathBounds = React.useMemo(() => {
    if (path.waypoints.length < 2) return null;
    const xs = path.waypoints.map(wp => wp.x);
    const ys = path.waypoints.map(wp => wp.y);
    return {
      minX: Math.min(...xs) - 30,
      maxX: Math.max(...xs) + 30,
      minY: Math.min(...ys) - 30,
      maxY: Math.max(...ys) + 30,
      width: Math.max(...xs) - Math.min(...xs) + 60,
      height: Math.max(...ys) - Math.min(...ys) + 60
    };
  }, [path.waypoints]);

  // Get arrow marker color - improved color detection
  const getArrowMarker = (color: string) => {
    const colorMap: Record<string, string> = {
      '#6b7280': 'gray',
      '#9ca3af': 'gray',
      '#3b82f6': 'blue',
      '#6366f1': 'blue',
      '#22c55e': 'green',
      '#10b981': 'green',
      '#ef4444': 'red',
      '#f87171': 'red',
      '#8b5cf6': 'purple',
      '#a78bfa': 'purple',
      '#f97316': 'orange',
      '#fb923c': 'orange',
      '#14b8a6': 'teal',
      '#2dd4bf': 'teal',
      '#ec4899': 'pink',
      '#f472b6': 'pink'
    };
    
    // Check for exact match first
    if (colorMap[color]) {
      return `url(#arrowhead-${colorMap[color]}-${id})`;
    }
    
    // Check for partial match
    for (const [hex, name] of Object.entries(colorMap)) {
      if (color.toLowerCase().includes(hex.toLowerCase()) || color.toLowerCase().includes(name.toLowerCase())) {
        return `url(#arrowhead-${name}-${id})`;
      }
    }
    return `url(#arrowhead-gray-${id})`;
  };

  // Handle path click
  const handlePathClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
    setShowToolbar(true);
  }, [onSelect]);

  // Handle double-click to add waypoint
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (readOnly || !svgRef.current || !pathBounds) return;

    e.stopPropagation();

    const rect = svgRef.current.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / zoom + pathBounds.minX;
    const clickY = (e.clientY - rect.top) / zoom + pathBounds.minY;

    // Find the nearest segment on the path
    let nearestSegment = 0;
    let minDist = Infinity;

    for (let i = 0; i < path.waypoints.length - 1; i++) {
      const p1 = path.waypoints[i];
      const p2 = path.waypoints[i + 1];

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.sqrt(dx * dx + dy * dy);

      if (len === 0) continue;

      const t = Math.max(0, Math.min(1, ((clickX - p1.x) * dx + (clickY - p1.y) * dy) / (len * len)));
      const projX = p1.x + t * dx;
      const projY = p1.y + t * dy;

      const dist = Math.sqrt((clickX - projX) ** 2 + (clickY - projY) ** 2);

      if (dist < minDist) {
        minDist = dist;
        nearestSegment = i;
      }
    }

    const newPath = addWaypoint(path, nearestSegment + 1, { x: clickX, y: clickY });
    onUpdate(newPath);
  }, [path, zoom, onUpdate, readOnly, pathBounds]);

  // Handle waypoint drag start
  const handleWaypointMouseDown = useCallback((e: React.MouseEvent, waypoint: Waypoint) => {
    if (readOnly) return;
    e.stopPropagation();
    
    setDraggingWaypoint(waypoint.id);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      waypoint
    };
  }, [readOnly]);

  // Handle mouse move for dragging
  useEffect(() => {
    if (!draggingWaypoint || !dragStartRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      const start = dragStartRef.current!;
      const dx = (e.clientX - start.x) / zoom;
      const dy = (e.clientY - start.y) / zoom;
      
      const newPath = updateWaypoint(path, draggingWaypoint, {
        x: start.waypoint.x + dx,
        y: start.waypoint.y + dy
      });
      
      onUpdate(newPath);
    };

    const handleMouseUp = () => {
      setDraggingWaypoint(null);
      dragStartRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingWaypoint, path, zoom, onUpdate]);

  // Handle context menu
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  }, []);

  // Delete waypoint
  const handleDeleteWaypoint = useCallback((waypointId: string) => {
    const waypoint = path.waypoints.find(wp => wp.id === waypointId);
    if (waypoint?.type === 'start' || waypoint?.type === 'end') return;
    
    const newPath = removeWaypoint(path, waypointId);
    onUpdate(newPath);
  }, [path, onUpdate]);

  // Change path style
  const handleStyleChange = useCallback((style: ConnectorPath['style']) => {
    onUpdate({ ...path, style });
  }, [path, onUpdate]);

  // Get label position (midpoint of path)
  const labelPoint = getPointOnPath(path, 0.5);

  // Hide toolbar when not selected
  useEffect(() => {
    if (!isSelected) {
      setShowToolbar(false);
    }
  }, [isSelected]);

  if (!pathBounds) return null;

  // Calculate stroke dash array based on style
  const getStrokeDashArray = () => {
    switch (path.strokeStyle) {
      case 'dashed': return '8,6';
      case 'dotted': return '2,6';
      default: return undefined;
    }
  };

  return (
    <>
      <svg
        ref={svgRef}
        className="absolute pointer-events-none overflow-visible"
        style={{
          left: pathBounds.minX,
          top: pathBounds.minY,
          width: pathBounds.width,
          height: pathBounds.height,
          pointerEvents: 'auto',
          cursor: isSelected ? 'move' : 'pointer',
          zIndex: isSelected ? 50 : 5
        }}
        onClick={handlePathClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
      >
        <defs>
          {/* Arrow markers for each color */}
          {[
            { id: `arrowhead-gray-${id}`, fill: '#6b7280' },
            { id: `arrowhead-blue-${id}`, fill: '#3b82f6' },
            { id: `arrowhead-green-${id}`, fill: '#22c55e' },
            { id: `arrowhead-red-${id}`, fill: '#ef4444' },
            { id: `arrowhead-purple-${id}`, fill: '#8b5cf6' },
            { id: `arrowhead-orange-${id}`, fill: '#f97316' },
            { id: `arrowhead-teal-${id}`, fill: '#14b8a6' },
            { id: `arrowhead-pink-${id}`, fill: '#ec4899' }
          ].map(marker => (
            <marker
              key={marker.id}
              id={marker.id}
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M0,0 L0,6 L9,3 z" fill={marker.fill} />
            </marker>
          ))}
        </defs>

        {/* Translate all path content to account for SVG positioning */}
        <g transform={`translate(${-pathBounds.minX}, ${-pathBounds.minY})`}>
          {/* Invisible wider path for easier clicking */}
          <path
            d={pathD}
            fill="none"
            stroke="transparent"
            strokeWidth="25"
            className="cursor-pointer"
          />

          {/* Shadow path */}
          <path
            d={pathD}
            fill="none"
            stroke="rgba(0,0,0,0.15)"
            strokeWidth={(path.strokeWidth || 2) + 3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Main visible path */}
          <path
            d={pathD}
            fill="none"
            stroke={path.color}
            strokeWidth={path.strokeWidth || 2}
            strokeDasharray={getStrokeDashArray()}
            strokeLinecap="round"
            strokeLinejoin="round"
            markerStart={path.arrowStart ? getArrowMarker(path.color) : undefined}
            markerEnd={path.arrowEnd ? getArrowMarker(path.color) : undefined}
            style={{
              filter: isSelected ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' : 'none'
            }}
          />
        </g>

        {/* Waypoints - visible when selected or hovered */}
        <AnimatePresence>
          {(isSelected || showToolbar) && !readOnly && (
            <g>
              {path.waypoints.map((waypoint, index) => (
                <motion.g
                  key={waypoint.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  {/* Waypoint handle */}
                  <circle
                    cx={waypoint.x - pathBounds.minX}
                    cy={waypoint.y - pathBounds.minY}
                    r={waypoint.type === 'control' ? 8 : 10}
                    fill={waypoint.type === 'control' ? 'white' : path.color}
                    stroke={waypoint.type === 'control' ? path.color : 'white'}
                    strokeWidth={3}
                    style={{
                      cursor: waypoint.type === 'control' ? 'move' : 'default',
                      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
                    }}
                    className={`transition-all ${
                      draggingWaypoint === waypoint.id ? 'scale-125' : ''
                    }`}
                    onMouseDown={(e) => handleWaypointMouseDown(e, waypoint)}
                    onMouseEnter={() => setHoveredWaypoint(waypoint.id)}
                    onMouseLeave={() => setHoveredWaypoint(null)}
                  />
                  
                  {/* Delete button for control points */}
                  {waypoint.type === 'control' && hoveredWaypoint === waypoint.id && (
                    <g
                      transform={`translate(${waypoint.x - pathBounds.minX + 14}, ${waypoint.y - pathBounds.minY - 14})`}
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteWaypoint(waypoint.id);
                      }}
                    >
                      <circle r="10" fill="#ef4444" stroke="white" strokeWidth="2" />
                      <text
                        x="0"
                        y="1"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="white"
                        fontSize="12"
                        fontWeight="bold"
                      >
                        ×
                      </text>
                    </g>
                  )}
                </motion.g>
              ))}
            </g>
          )}
        </AnimatePresence>
      </svg>

      {/* Label overlay */}
      {labelPoint && (
        <div
          className="absolute pointer-events-auto"
          style={{
            left: labelPoint.x - 60,
            top: labelPoint.y - 15,
            zIndex: isSelected ? 100 : 10
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="text"
            value={path.label || ''}
            onChange={(e) => onUpdate({ ...path, label: e.target.value })}
            placeholder="Label..."
            className={`w-28 text-center text-xs px-2 py-1.5 rounded-lg border bg-white/95 backdrop-blur-sm shadow-sm transition-all ${
              isSelected || path.label
                ? 'opacity-100 border-gray-300'
                : 'opacity-0 hover:opacity-100 border-transparent'
            }`}
            style={{ color: path.color }}
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
          />
        </div>
      )}

      {/* Connector Toolbar (when selected) */}
      <AnimatePresence>
        {isSelected && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="fixed bg-white rounded-xl shadow-xl border border-gray-200 p-2 flex items-center gap-1 pointer-events-auto z-[200] flex-wrap max-w-[90vw]"
            style={{
              left: labelPoint ? Math.min(labelPoint.x - 140, window.innerWidth - 300) : 20,
              top: labelPoint ? labelPoint.y + 40 : 20,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Style buttons */}
            <button
              onClick={() => handleStyleChange('straight')}
              className={`p-2 rounded-lg ${path.style === 'straight' ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-gray-100 text-gray-600'}`}
              title="Straight line"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleStyleChange('curved')}
              className={`p-2 rounded-lg ${path.style === 'curved' ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-gray-100 text-gray-600'}`}
              title="Curved"
            >
              <GitBranch className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleStyleChange('orthogonal')}
              className={`p-2 rounded-lg ${path.style === 'orthogonal' ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-gray-100 text-gray-600'}`}
              title="Orthogonal"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4 L4 20 L20 20" />
              </svg>
            </button>
            <button
              onClick={() => handleStyleChange('stepped')}
              className={`p-2 rounded-lg ${path.style === 'stepped' ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-gray-100 text-gray-600'}`}
              title="Stepped"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4 L4 12 L12 12 L12 20 L20 20" />
              </svg>
            </button>
            
            <div className="w-px h-6 bg-gray-200 mx-1" />
            
            {/* Line style */}
            <button
              onClick={() => onUpdate({ ...path, strokeStyle: 'solid' })}
              className={`p-2 rounded-lg ${path.strokeStyle === 'solid' || !path.strokeStyle ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
              title="Solid"
            >
              <div className="w-4 h-0.5 bg-gray-600" />
            </button>
            <button
              onClick={() => onUpdate({ ...path, strokeStyle: 'dashed' })}
              className={`p-2 rounded-lg ${path.strokeStyle === 'dashed' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
              title="Dashed"
            >
              <div className="w-4 h-0.5 border-t-2 border-dashed border-gray-600" />
            </button>
            <button
              onClick={() => onUpdate({ ...path, strokeStyle: 'dotted' })}
              className={`p-2 rounded-lg ${path.strokeStyle === 'dotted' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
              title="Dotted"
            >
              <div className="w-4 h-0.5 border-t-2 border-dotted border-gray-600" />
            </button>
            
            <div className="w-px h-6 bg-gray-200 mx-1" />
            
            {/* Arrow toggles */}
            <button
              onClick={() => onUpdate({ ...path, arrowStart: !path.arrowStart })}
              className={`p-2 rounded-lg ${path.arrowStart ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-gray-100 text-gray-600'}`}
              title="Arrow at start"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 4 L4 12 L12 20" />
              </svg>
            </button>
            <button
              onClick={() => onUpdate({ ...path, arrowEnd: !path.arrowEnd })}
              className={`p-2 rounded-lg ${path.arrowEnd !== false ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-gray-100 text-gray-600'}`}
              title="Arrow at end"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 4 L20 12 L12 20" />
              </svg>
            </button>
            
            <div className="w-px h-6 bg-gray-200 mx-1" />
            
            {/* Color picker */}
            {['#6b7280', '#3b82f6', '#22c55e', '#ef4444', '#8b5cf6', '#f97316'].map(color => (
              <button
                key={color}
                onClick={() => onUpdate({ ...path, color })}
                className={`w-5 h-5 rounded-full hover:ring-2 ${path.color === color ? 'ring-2 ring-offset-1 ring-indigo-500' : ''}`}
                style={{ backgroundColor: color }}
              />
            ))}
            
            <div className="w-px h-6 bg-gray-200 mx-1" />
            
            {/* Delete */}
            <button
              onClick={onDelete}
              className="p-2 rounded-lg hover:bg-red-100 text-red-500"
              title="Delete connector"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Context Menu */}
      <AnimatePresence>
        {showContextMenu && (
          <>
            <div
              className="fixed inset-0 z-[9998]"
              onClick={() => setShowContextMenu(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed bg-white rounded-xl shadow-xl border border-gray-200 py-1 z-[9999] min-w-[180px]"
              style={{ 
                left: Math.min(contextMenuPos.x, window.innerWidth - 200), 
                top: Math.min(contextMenuPos.y, window.innerHeight - 250) 
              }}
            >
              <div className="px-3 py-2 text-xs font-medium text-gray-400 border-b border-gray-100">
                Connector Options
              </div>
              <button
                onClick={() => {
                  onUpdate({ ...path, arrowStart: !path.arrowStart });
                  setShowContextMenu(false);
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                {path.arrowStart ? '✓ ' : ''} Arrow at start
              </button>
              <button
                onClick={() => {
                  onUpdate({ ...path, arrowEnd: !path.arrowEnd });
                  setShowContextMenu(false);
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                {path.arrowEnd !== false ? '✓ ' : ''} Arrow at end
              </button>
              <div className="h-px bg-gray-200 my-1" />
              <button
                onClick={() => {
                  const midIndex = Math.floor(path.waypoints.length / 2);
                  const prev = path.waypoints[midIndex - 1];
                  const next = path.waypoints[midIndex];
                  const newPoint = {
                    x: (prev.x + next.x) / 2 + 50,
                    y: (prev.y + next.y) / 2
                  };
                  const newPath = addWaypoint(path, midIndex, newPoint);
                  onUpdate(newPath);
                  setShowContextMenu(false);
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add control point
              </button>
              <div className="h-px bg-gray-200 my-1" />
              <button
                onClick={() => {
                  onDelete();
                  setShowContextMenu(false);
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Delete connector
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default EnhancedConnector;
