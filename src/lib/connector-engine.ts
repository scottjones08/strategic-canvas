/**
 * Enterprise Connector Engine
 * 
 * Features:
 * - Multiple control points (waypoints) for complex routing
 * - Orthogonal routing with automatic corner rounding
 * - Smart obstacle avoidance
 * - Multiple routing styles: straight, curved, orthogonal, stepped
 * - Auto-routing with pathfinding
 */

export interface Waypoint {
  x: number;
  y: number;
  id: string;
  type: 'start' | 'end' | 'control';
}

export interface ConnectorPath {
  waypoints: Waypoint[];
  style: 'straight' | 'curved' | 'orthogonal' | 'stepped';
  routing: 'direct' | 'avoid-obstacles' | 'smart';
  label?: string;
  color: string;
  strokeWidth: number;
  strokeStyle: 'solid' | 'dashed' | 'dotted';
  arrowStart: boolean;
  arrowEnd: boolean;
  cornerRadius: number;
}

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  id: string;
  padding?: number;
}

export interface Point {
  x: number;
  y: number;
}

// Generate unique ID
const generateId = () => `wp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

/**
 * Calculate distance between two points
 */
export const distance = (p1: Point, p2: Point): number => {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

/**
 * Calculate angle between two points in degrees
 */
export const angle = (p1: Point, p2: Point): number => {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);
};

/**
 * Get the nearest point on a rectangle edge from an external point
 */
export const getNearestEdgePoint = (
  rect: { x: number; y: number; width: number; height: number },
  fromPoint: Point,
  padding: number = 8
): Point => {
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;
  const dx = fromPoint.x - centerX;
  const dy = fromPoint.y - centerY;
  
  const halfW = rect.width / 2 + padding;
  const halfH = rect.height / 2 + padding;
  
  // Determine which edge is closest
  const scaleX = Math.abs(dx) > 0 ? halfW / Math.abs(dx) : Infinity;
  const scaleY = Math.abs(dy) > 0 ? halfH / Math.abs(dy) : Infinity;
  const scale = Math.min(scaleX, scaleY);
  
  return {
    x: centerX + dx * scale,
    y: centerY + dy * scale
  };
};

/**
 * Check if a line segment intersects with a rectangle
 */
export const lineIntersectsRect = (
  p1: Point,
  p2: Point,
  rect: Obstacle
): boolean => {
  const padding = rect.padding || 10;
  const rx = rect.x - padding;
  const ry = rect.y - padding;
  const rw = rect.width + padding * 2;
  const rh = rect.height + padding * 2;
  
  // Check if line intersects with any of the 4 edges of the rectangle
  const lines = [
    { p1: { x: rx, y: ry }, p2: { x: rx + rw, y: ry } }, // Top
    { p1: { x: rx + rw, y: ry }, p2: { x: rx + rw, y: ry + rh } }, // Right
    { p1: { x: rx + rw, y: ry + rh }, p2: { x: rx, y: ry + rh } }, // Bottom
    { p1: { x: rx, y: ry + rh }, p2: { x: rx, y: ry } }, // Left
  ];
  
  return lines.some(edge => lineIntersectsLine(p1, p2, edge.p1, edge.p2));
};

/**
 * Check if two line segments intersect
 */
const lineIntersectsLine = (
  p1: Point,
  p2: Point,
  p3: Point,
  p4: Point
): boolean => {
  const det = (p2.x - p1.x) * (p4.y - p3.y) - (p4.x - p3.x) * (p2.y - p1.y);
  if (det === 0) return false;
  
  const lambda = ((p4.y - p3.y) * (p4.x - p1.x) + (p3.x - p4.x) * (p4.y - p1.y)) / det;
  const gamma = ((p1.y - p2.y) * (p4.x - p1.x) + (p2.x - p1.x) * (p4.y - p1.y)) / det;
  
  return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
};

/**
 * Generate orthogonal path with waypoints
 */
export const generateOrthogonalPath = (
  start: Point,
  end: Point,
  waypoints: Point[] = [],
  cornerRadius: number = 10
): string => {
  const points = [start, ...waypoints, end];
  
  if (points.length < 2) return '';
  
  let path = `M ${points[0].x} ${points[0].y}`;
  
  for (let i = 1; i < points.length; i++) {
    const current = points[i];
    const prev = points[i - 1];
    
    if (i === 1) {
      // First segment - straight line
      path += ` L ${current.x} ${current.y}`;
    } else {
      // Subsequent segments - add corner rounding
      const prevPrev = points[i - 2];
      const isHorizontal = Math.abs(current.x - prev.x) > Math.abs(current.y - prev.y);
      const wasHorizontal = Math.abs(prev.x - prevPrev.x) > Math.abs(prev.y - prevPrev.y);
      
      if (isHorizontal !== wasHorizontal && cornerRadius > 0) {
        // Direction change - add rounded corner
        const r = Math.min(cornerRadius, distance(prev, current) / 2, distance(prevPrev, prev) / 2);
        
        if (wasHorizontal) {
          // Coming from horizontal
          const dirX = prev.x > prevPrev.x ? 1 : -1;
          const dirY = current.y > prev.y ? 1 : -1;
          path += ` L ${prev.x - r * dirX} ${prev.y}`;
          path += ` Q ${prev.x} ${prev.y} ${prev.x} ${prev.y + r * dirY}`;
        } else {
          // Coming from vertical
          const dirY = prev.y > prevPrev.y ? 1 : -1;
          const dirX = current.x > prev.x ? 1 : -1;
          path += ` L ${prev.x} ${prev.y - r * dirY}`;
          path += ` Q ${prev.x} ${prev.y} ${prev.x + r * dirX} ${prev.y}`;
        }
        path += ` L ${current.x} ${current.y}`;
      } else {
        path += ` L ${current.x} ${current.y}`;
      }
    }
  }
  
  return path;
};

/**
 * Generate curved bezier path through waypoints
 */
export const generateCurvedPath = (
  start: Point,
  end: Point,
  waypoints: Point[] = [],
  tension: number = 0.5
): string => {
  const points = [start, ...waypoints, end];
  
  if (points.length < 2) return '';
  if (points.length === 2) {
    // Simple quadratic curve for direct connection
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    const controlX = midX + (end.y - start.y) * 0.2;
    const controlY = midY - (end.x - start.x) * 0.2;
    return `M ${start.x} ${start.y} Q ${controlX} ${controlY} ${end.x} ${end.y}`;
  }
  
  // Cubic bezier through multiple points
  let path = `M ${points[0].x} ${points[0].y}`;
  
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    
    const cp1x = p1.x + (p2.x - p0.x) / 6 * tension;
    const cp1y = p1.y + (p2.y - p0.y) / 6 * tension;
    const cp2x = p2.x - (p3.x - p1.x) / 6 * tension;
    const cp2y = p2.y - (p3.y - p1.y) / 6 * tension;
    
    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  
  return path;
};

/**
 * Generate stepped path (horizontal then vertical)
 */
export const generateSteppedPath = (
  start: Point,
  end: Point,
  waypoints: Point[] = []
): string => {
  const points = [start, ...waypoints, end];
  
  if (points.length < 2) return '';
  
  let path = `M ${points[0].x} ${points[0].y}`;
  
  for (let i = 1; i < points.length; i++) {
    const current = points[i];
    const prev = points[i - 1];
    
    // Step: horizontal first, then vertical
    path += ` H ${current.x} V ${current.y}`;
  }
  
  return path;
};

/**
 * Generate path based on style
 */
export const generatePath = (
  pathConfig: ConnectorPath
): string => {
  const { waypoints, style, cornerRadius } = pathConfig;
  
  if (waypoints.length < 2) return '';
  
  const start = waypoints[0];
  const end = waypoints[waypoints.length - 1];
  const middlePoints = waypoints.slice(1, -1).map(wp => ({ x: wp.x, y: wp.y }));
  
  switch (style) {
    case 'orthogonal':
      return generateOrthogonalPath(start, end, middlePoints, cornerRadius);
    case 'curved':
      return generateCurvedPath(start, end, middlePoints);
    case 'stepped':
      return generateSteppedPath(start, end, middlePoints);
    case 'straight':
    default:
      // Straight lines through waypoints
      return `M ${start.x} ${start.y}` + middlePoints.map(p => ` L ${p.x} ${p.y}`).join('') + ` L ${end.x} ${end.y}`;
  }
};

/**
 * Find path around obstacles using A* pathfinding
 */
export const findPathAroundObstacles = (
  start: Point,
  end: Point,
  obstacles: Obstacle[],
  gridSize: number = 20
): Point[] => {
  // Simple implementation: add intermediate waypoints to avoid obstacles
  const waypoints: Point[] = [];
  let currentStart = start;
  
  // Check if direct path is clear
  const hasObstacle = obstacles.some(obs => lineIntersectsRect(start, end, obs));
  
  if (!hasObstacle) {
    return [];
  }
  
  // Find intersecting obstacles and route around them
  for (const obstacle of obstacles) {
    if (lineIntersectsRect(currentStart, end, obstacle)) {
      const padding = obstacle.padding || 20;
      
      // Determine best direction to route around
      const obsCenterX = obstacle.x + obstacle.width / 2;
      const obsCenterY = obstacle.y + obstacle.height / 2;
      
      const goRight = currentStart.x > obsCenterX;
      const goDown = currentStart.y > obsCenterY;
      
      // Create waypoint to go around obstacle
      const waypoint: Point = {
        x: goRight ? obstacle.x + obstacle.width + padding : obstacle.x - padding,
        y: goDown ? obstacle.y + obstacle.height + padding : obstacle.y - padding
      };
      
      // Add intermediate waypoint for orthogonal routing
      const intermediate: Point = {
        x: goRight ? obstacle.x + obstacle.width + padding : obstacle.x - padding,
        y: currentStart.y
      };
      
      waypoints.push(intermediate);
      waypoints.push(waypoint);
      currentStart = waypoint;
    }
  }
  
  return waypoints;
};

/**
 * Create default connector path between two nodes
 */
export const createConnectorPath = (
  fromNode: { x: number; y: number; width: number; height: number },
  toNode: { x: number; y: number; width: number; height: number },
  options: Partial<ConnectorPath> = {}
): ConnectorPath => {
  const fromCenter = { x: fromNode.x + fromNode.width / 2, y: fromNode.y + fromNode.height / 2 };
  const toCenter = { x: toNode.x + toNode.width / 2, y: toNode.y + toNode.height / 2 };
  
  // Calculate edge intersection points
  const startPoint = getNearestEdgePoint(fromNode, toCenter);
  const endPoint = getNearestEdgePoint(toNode, fromCenter);
  
  return {
    waypoints: [
      { x: startPoint.x, y: startPoint.y, id: generateId(), type: 'start' },
      { x: endPoint.x, y: endPoint.y, id: generateId(), type: 'end' }
    ],
    style: options.style || 'curved',
    routing: options.routing || 'direct',
    label: options.label,
    color: options.color || '#6b7280',
    strokeWidth: options.strokeWidth || 2,
    strokeStyle: options.strokeStyle || 'solid',
    arrowStart: options.arrowStart || false,
    arrowEnd: options.arrowEnd !== false, // Default true
    cornerRadius: options.cornerRadius || 10
  };
};

/**
 * Add a waypoint to an existing path
 */
export const addWaypoint = (
  path: ConnectorPath,
  index: number,
  point: Point
): ConnectorPath => {
  const newWaypoint: Waypoint = {
    x: point.x,
    y: point.y,
    id: generateId(),
    type: 'control'
  };
  
  const waypoints = [...path.waypoints];
  waypoints.splice(index, 0, newWaypoint);
  
  return { ...path, waypoints };
};

/**
 * Remove a waypoint from a path
 */
export const removeWaypoint = (
  path: ConnectorPath,
  waypointId: string
): ConnectorPath => {
  const waypoints = path.waypoints.filter(wp => wp.id !== waypointId);
  return { ...path, waypoints };
};

/**
 * Update a waypoint position
 */
export const updateWaypoint = (
  path: ConnectorPath,
  waypointId: string,
  point: Partial<Point>
): ConnectorPath => {
  const waypoints = path.waypoints.map(wp =>
    wp.id === waypointId ? { ...wp, ...point } : wp
  );
  return { ...path, waypoints };
};

/**
 * Get point on path at a given percentage (0-1)
 */
export const getPointOnPath = (
  path: ConnectorPath,
  t: number
): Point | null => {
  const waypoints = path.waypoints;
  if (waypoints.length < 2) return null;
  
  const totalSegments = waypoints.length - 1;
  const segmentT = t * totalSegments;
  const segmentIndex = Math.floor(segmentT);
  const localT = segmentT - segmentIndex;
  
  if (segmentIndex >= totalSegments) {
    return waypoints[waypoints.length - 1];
  }
  
  const p1 = waypoints[segmentIndex];
  const p2 = waypoints[segmentIndex + 1];
  
  return {
    x: p1.x + (p2.x - p1.x) * localT,
    y: p1.y + (p2.y - p1.y) * localT
  };
};

/**
 * Calculate path length
 */
export const getPathLength = (path: ConnectorPath): number => {
  const waypoints = path.waypoints;
  if (waypoints.length < 2) return 0;
  
  let length = 0;
  for (let i = 1; i < waypoints.length; i++) {
    length += distance(waypoints[i - 1], waypoints[i]);
  }
  return length;
};

/**
 * Auto-arrange waypoints for cleaner routing
 */
export const autoArrangeWaypoints = (
  path: ConnectorPath,
  obstacles: Obstacle[] = []
): ConnectorPath => {
  // For now, just ensure start and end are edge points
  // More sophisticated routing can be added later
  
  const waypoints = [...path.waypoints];
  
  // Keep start and end, remove unnecessary middle waypoints
  if (waypoints.length > 2) {
    // Check if we can simplify the path
    const simplified: Waypoint[] = [waypoints[0]];
    
    for (let i = 1; i < waypoints.length - 1; i++) {
      const prev = simplified[simplified.length - 1];
      const current = waypoints[i];
      const next = waypoints[i + 1];
      
      // Check if current waypoint is necessary (direction change)
      const dir1 = angle(prev, current);
      const dir2 = angle(current, next);
      
      // If significant direction change, keep the waypoint
      if (Math.abs(dir1 - dir2) > 5) {
        simplified.push(current);
      }
    }
    
    simplified.push(waypoints[waypoints.length - 1]);
    return { ...path, waypoints: simplified };
  }
  
  return path;
};

/**
 * Convert VisualNode connector to ConnectorPath
 * Always recalculates start/end points based on current node positions
 */
export const nodeToConnectorPath = (
  node: {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    connectorFrom?: string;
    connectorTo?: string;
    connectorStyle?: 'solid' | 'dashed' | 'dotted';
    connectorLabel?: string;
    connectorControlPoint?: { x: number; y: number };
    connectorWaypoints?: Waypoint[];
    color?: string;
  },
  fromNode?: { x: number; y: number; width: number; height: number },
  toNode?: { x: number; y: number; width: number; height: number }
): ConnectorPath | null => {
  if (!fromNode || !toNode) return null;
  
  const fromCenter = { x: fromNode.x + fromNode.width / 2, y: fromNode.y + fromNode.height / 2 };
  const toCenter = { x: toNode.x + toNode.width / 2, y: toNode.y + toNode.height / 2 };
  
  // Always recalculate start and end points based on current node positions
  const startPoint = getNearestEdgePoint(fromNode, toCenter);
  const endPoint = getNearestEdgePoint(toNode, fromCenter);
  
  // Build waypoints: start (recalculated) + any control points (preserved) + end (recalculated)
  const waypoints: Waypoint[] = [
    { 
      x: startPoint.x, 
      y: startPoint.y, 
      id: node.connectorWaypoints?.[0]?.id || generateId(), 
      type: 'start' 
    }
  ];
  
  // Preserve any user-defined control points (middle waypoints)
  if (node.connectorWaypoints && node.connectorWaypoints.length > 2) {
    // Add all middle waypoints (excluding first and last)
    for (let i = 1; i < node.connectorWaypoints.length - 1; i++) {
      waypoints.push(node.connectorWaypoints[i]);
    }
  } else if (node.connectorControlPoint) {
    // Legacy: use control point if exists
    waypoints.push({
      x: node.connectorControlPoint.x,
      y: node.connectorControlPoint.y,
      id: generateId(),
      type: 'control'
    });
  }
  
  // Always add end point based on current node position
  waypoints.push({
    x: endPoint.x,
    y: endPoint.y,
    id: node.connectorWaypoints?.[node.connectorWaypoints.length - 1]?.id || generateId(),
    type: 'end'
  });
  
  return {
    waypoints,
    style: 'curved',
    routing: 'direct',
    label: node.connectorLabel,
    color: node.color || '#6b7280',
    strokeWidth: 2,
    strokeStyle: node.connectorStyle || 'solid',
    arrowStart: false,
    arrowEnd: true,
    cornerRadius: 10
  };
};

export default {
  generatePath,
  createConnectorPath,
  addWaypoint,
  removeWaypoint,
  updateWaypoint,
  getPointOnPath,
  getPathLength,
  autoArrangeWaypoints,
  findPathAroundObstacles,
  nodeToConnectorPath,
  getNearestEdgePoint,
  lineIntersectsRect
};
