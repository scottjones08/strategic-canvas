/**
 * Shape Recognition Library
 *
 * Analyzes hand-drawn strokes and identifies geometric shapes.
 * Uses simple heuristics based on aspect ratio, circularity, and angle analysis.
 */

export interface Point {
  x: number;
  y: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type RecognizedShapeType = 'circle' | 'rectangle' | 'triangle' | 'line' | 'arrow' | 'freehand';

export interface RecognizedShape {
  type: RecognizedShapeType;
  bounds: BoundingBox;
  confidence: number;
  // Additional properties for specific shapes
  isHorizontal?: boolean; // For lines/arrows
  isVertical?: boolean;   // For lines/arrows
  arrowDirection?: 'left' | 'right' | 'up' | 'down'; // For arrows
}

// Minimum number of points required for shape recognition
const MIN_POINTS = 5;

// Threshold for considering a shape closed (as percentage of perimeter)
const CLOSURE_THRESHOLD = 0.15;

// Confidence thresholds
const CIRCLE_CONFIDENCE_THRESHOLD = 0.65;
const RECTANGLE_CONFIDENCE_THRESHOLD = 0.6;
const TRIANGLE_CONFIDENCE_THRESHOLD = 0.55;
const LINE_CONFIDENCE_THRESHOLD = 0.85;

/**
 * Calculate the bounding box of a set of points
 */
export function getBoundingBox(points: Point[]): BoundingBox {
  if (points.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}

/**
 * Calculate the distance between two points
 */
function distance(p1: Point, p2: Point): number {
  return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
}

/**
 * Calculate the total path length of a stroke
 */
function getPathLength(points: Point[]): number {
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    length += distance(points[i - 1], points[i]);
  }
  return length;
}

/**
 * Calculate the centroid of a set of points
 */
function getCentroid(points: Point[]): Point {
  const sum = points.reduce(
    (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
    { x: 0, y: 0 }
  );
  return {
    x: sum.x / points.length,
    y: sum.y / points.length
  };
}

/**
 * Check if a stroke is closed (start and end points are close)
 */
function isClosed(points: Point[], pathLength: number): boolean {
  if (points.length < 3) return false;
  const startEndDist = distance(points[0], points[points.length - 1]);
  return startEndDist < pathLength * CLOSURE_THRESHOLD;
}

/**
 * Calculate circularity: ratio of area to perimeter squared
 * A perfect circle has circularity of 1/(4*pi) ~ 0.079
 */
function calculateCircularity(points: Point[]): number {
  const bounds = getBoundingBox(points);
  const pathLength = getPathLength(points);

  // Approximate area using bounding box
  const area = bounds.width * bounds.height;

  // Circularity formula: 4 * pi * area / perimeter^2
  const circularity = (4 * Math.PI * area) / (pathLength ** 2);

  return circularity;
}

/**
 * Check if points form a circular pattern by analyzing distance from centroid
 */
function analyzeCirclePattern(points: Point[]): { isCircle: boolean; confidence: number } {
  const centroid = getCentroid(points);
  const bounds = getBoundingBox(points);

  // Expected radius based on bounding box
  const expectedRadius = (bounds.width + bounds.height) / 4;

  // Calculate variance of distances from centroid
  const distances = points.map(p => distance(p, centroid));
  const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
  const variance = distances.reduce((acc, d) => acc + (d - avgDistance) ** 2, 0) / distances.length;
  const stdDev = Math.sqrt(variance);

  // Coefficient of variation (lower is better for circle)
  const cv = stdDev / avgDistance;

  // Aspect ratio check (circle should have ~1:1 ratio)
  const aspectRatio = Math.min(bounds.width, bounds.height) / Math.max(bounds.width, bounds.height);

  // Combine metrics for confidence
  const cvScore = Math.max(0, 1 - cv * 2);
  const aspectScore = aspectRatio;

  const confidence = (cvScore * 0.6 + aspectScore * 0.4);

  return {
    isCircle: confidence > CIRCLE_CONFIDENCE_THRESHOLD,
    confidence
  };
}

/**
 * Find corners in a stroke by detecting significant direction changes
 */
function findCorners(points: Point[]): Point[] {
  const corners: Point[] = [];
  const windowSize = Math.max(3, Math.floor(points.length / 20));
  const angleThreshold = Math.PI / 4; // 45 degrees

  if (points.length < windowSize * 2 + 1) {
    return [points[0], points[points.length - 1]];
  }

  // Always include start point
  corners.push(points[0]);

  for (let i = windowSize; i < points.length - windowSize; i++) {
    // Calculate direction before and after this point
    const prevDir = Math.atan2(
      points[i].y - points[i - windowSize].y,
      points[i].x - points[i - windowSize].x
    );
    const nextDir = Math.atan2(
      points[i + windowSize].y - points[i].y,
      points[i + windowSize].x - points[i].x
    );

    // Calculate angle difference
    let angleDiff = Math.abs(nextDir - prevDir);
    if (angleDiff > Math.PI) {
      angleDiff = 2 * Math.PI - angleDiff;
    }

    if (angleDiff > angleThreshold) {
      // Check if this is a local maximum (peak corner detection)
      const isLocalMax = corners.length === 0 ||
        distance(points[i], corners[corners.length - 1]) > points.length / 10;

      if (isLocalMax) {
        corners.push(points[i]);
      }
    }
  }

  // Always include end point
  corners.push(points[points.length - 1]);

  return corners;
}

/**
 * Analyze if the stroke forms a rectangle
 */
function analyzeRectangle(points: Point[], corners: Point[]): { isRectangle: boolean; confidence: number } {
  const bounds = getBoundingBox(points);

  // Need 4-5 corners for a rectangle (5 if closed)
  if (corners.length < 4 || corners.length > 6) {
    return { isRectangle: false, confidence: 0 };
  }

  // Check if corners are near the bounding box corners
  const boxCorners = [
    { x: bounds.x, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
    { x: bounds.x, y: bounds.y + bounds.height }
  ];

  const tolerance = Math.max(bounds.width, bounds.height) * 0.2;
  let matchedCorners = 0;

  for (const boxCorner of boxCorners) {
    for (const corner of corners) {
      if (distance(corner, boxCorner) < tolerance) {
        matchedCorners++;
        break;
      }
    }
  }

  // Check angles between consecutive corners (should be ~90 degrees)
  let rightAngleCount = 0;
  for (let i = 1; i < corners.length - 1; i++) {
    const v1 = { x: corners[i].x - corners[i - 1].x, y: corners[i].y - corners[i - 1].y };
    const v2 = { x: corners[i + 1].x - corners[i].x, y: corners[i + 1].y - corners[i].y };

    // Dot product divided by magnitudes gives cosine of angle
    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x ** 2 + v1.y ** 2);
    const mag2 = Math.sqrt(v2.x ** 2 + v2.y ** 2);

    if (mag1 > 0 && mag2 > 0) {
      const cosAngle = dot / (mag1 * mag2);
      // Right angle has cos ~= 0
      if (Math.abs(cosAngle) < 0.3) {
        rightAngleCount++;
      }
    }
  }

  const cornerScore = matchedCorners / 4;
  const angleScore = rightAngleCount / Math.max(1, corners.length - 2);

  const confidence = cornerScore * 0.5 + angleScore * 0.5;

  return {
    isRectangle: confidence > RECTANGLE_CONFIDENCE_THRESHOLD,
    confidence
  };
}

/**
 * Analyze if the stroke forms a triangle
 */
function analyzeTriangle(points: Point[], corners: Point[]): { isTriangle: boolean; confidence: number } {
  // Need 3-4 corners for a triangle (4 if closed)
  if (corners.length < 3 || corners.length > 5) {
    return { isTriangle: false, confidence: 0 };
  }

  // Take first 3 significant corners
  const mainCorners = corners.slice(0, 3);

  // Check that all sides have reasonable length (not too short)
  const side1 = distance(mainCorners[0], mainCorners[1]);
  const side2 = distance(mainCorners[1], mainCorners[2]);
  const side3 = distance(mainCorners[2], mainCorners[0]);

  const perimeter = side1 + side2 + side3;
  const minSide = Math.min(side1, side2, side3);

  // Each side should be at least 15% of perimeter
  const sideRatio = minSide / perimeter;
  const sideScore = sideRatio > 0.15 ? 1 : sideRatio / 0.15;

  // Check closure
  const pathLength = getPathLength(points);
  const closureScore = isClosed(points, pathLength) ? 1 : 0.5;

  const confidence = sideScore * 0.6 + closureScore * 0.4;

  return {
    isTriangle: confidence > TRIANGLE_CONFIDENCE_THRESHOLD && corners.length >= 3,
    confidence
  };
}

/**
 * Analyze if the stroke is a straight line
 */
function analyzeLine(points: Point[]): { isLine: boolean; confidence: number; isHorizontal: boolean; isVertical: boolean } {
  if (points.length < 2) {
    return { isLine: false, confidence: 0, isHorizontal: false, isVertical: false };
  }

  const bounds = getBoundingBox(points);
  const pathLength = getPathLength(points);

  // Direct distance from start to end
  const directDist = distance(points[0], points[points.length - 1]);

  // Ratio of direct distance to path length (1 = perfect line)
  const straightness = directDist / pathLength;

  // Check aspect ratio for orientation
  const aspectRatio = bounds.width / bounds.height;
  const isHorizontal = aspectRatio > 3;
  const isVertical = aspectRatio < 1/3;

  const confidence = straightness;

  return {
    isLine: straightness > LINE_CONFIDENCE_THRESHOLD,
    confidence,
    isHorizontal,
    isVertical
  };
}

/**
 * Check if a line stroke looks like an arrow
 */
function analyzeArrow(points: Point[]): { isArrow: boolean; direction: 'left' | 'right' | 'up' | 'down' | null; confidence: number } {
  if (points.length < 10) {
    return { isArrow: false, direction: null, confidence: 0 };
  }

  const lineAnalysis = analyzeLine(points);

  if (!lineAnalysis.isLine || lineAnalysis.confidence < 0.7) {
    return { isArrow: false, direction: null, confidence: 0 };
  }

  // Check for direction change at the end (arrowhead)
  const endPoints = points.slice(-Math.floor(points.length * 0.2));
  const mainPoints = points.slice(0, Math.floor(points.length * 0.8));

  // Calculate main direction
  const mainStart = mainPoints[0];
  const mainEnd = mainPoints[mainPoints.length - 1];
  const mainAngle = Math.atan2(mainEnd.y - mainStart.y, mainEnd.x - mainStart.x);

  // Check for significant direction changes in the end portion
  let hasArrowHead = false;
  const angleThreshold = Math.PI / 6; // 30 degrees

  for (let i = 1; i < endPoints.length; i++) {
    const segmentAngle = Math.atan2(
      endPoints[i].y - endPoints[i - 1].y,
      endPoints[i].x - endPoints[i - 1].x
    );

    let angleDiff = Math.abs(segmentAngle - mainAngle);
    if (angleDiff > Math.PI) {
      angleDiff = 2 * Math.PI - angleDiff;
    }

    if (angleDiff > angleThreshold) {
      hasArrowHead = true;
      break;
    }
  }

  // Determine direction
  let direction: 'left' | 'right' | 'up' | 'down' | null = null;
  const dx = mainEnd.x - mainStart.x;
  const dy = mainEnd.y - mainStart.y;

  if (Math.abs(dx) > Math.abs(dy)) {
    direction = dx > 0 ? 'right' : 'left';
  } else {
    direction = dy > 0 ? 'down' : 'up';
  }

  return {
    isArrow: hasArrowHead,
    direction,
    confidence: hasArrowHead ? lineAnalysis.confidence * 0.9 : 0
  };
}

/**
 * Main shape recognition function
 *
 * Analyzes a set of points and returns the detected shape
 */
export function recognizeShape(points: Point[]): RecognizedShape {
  if (!points || points.length < MIN_POINTS) {
    return {
      type: 'freehand',
      bounds: getBoundingBox(points || []),
      confidence: 0
    };
  }

  const bounds = getBoundingBox(points);
  const pathLength = getPathLength(points);
  const closed = isClosed(points, pathLength);

  // Check for line/arrow first (non-closed shapes)
  const lineAnalysis = analyzeLine(points);
  if (lineAnalysis.isLine) {
    const arrowAnalysis = analyzeArrow(points);
    if (arrowAnalysis.isArrow) {
      return {
        type: 'arrow',
        bounds,
        confidence: arrowAnalysis.confidence,
        isHorizontal: lineAnalysis.isHorizontal,
        isVertical: lineAnalysis.isVertical,
        arrowDirection: arrowAnalysis.direction || undefined
      };
    }
    return {
      type: 'line',
      bounds,
      confidence: lineAnalysis.confidence,
      isHorizontal: lineAnalysis.isHorizontal,
      isVertical: lineAnalysis.isVertical
    };
  }

  // For closed shapes, analyze different possibilities
  if (closed || pathLength > 0) {
    // Check for circle
    const circleAnalysis = analyzeCirclePattern(points);

    // Find corners for polygon detection
    const corners = findCorners(points);

    // Check for rectangle
    const rectangleAnalysis = analyzeRectangle(points, corners);

    // Check for triangle
    const triangleAnalysis = analyzeTriangle(points, corners);

    // Return the shape with highest confidence
    const shapes: Array<{ type: RecognizedShapeType; confidence: number }> = [];

    if (circleAnalysis.isCircle) {
      shapes.push({ type: 'circle', confidence: circleAnalysis.confidence });
    }
    if (rectangleAnalysis.isRectangle) {
      shapes.push({ type: 'rectangle', confidence: rectangleAnalysis.confidence });
    }
    if (triangleAnalysis.isTriangle) {
      shapes.push({ type: 'triangle', confidence: triangleAnalysis.confidence });
    }

    if (shapes.length > 0) {
      const best = shapes.reduce((a, b) => a.confidence > b.confidence ? a : b);
      return {
        type: best.type,
        bounds,
        confidence: best.confidence
      };
    }
  }

  // Default to freehand
  return {
    type: 'freehand',
    bounds,
    confidence: 1
  };
}

/**
 * Smooth a set of points using bezier curve interpolation
 * Returns control points for SVG path rendering
 */
export function smoothPoints(points: Point[], tension: number = 0.3): string {
  if (points.length < 2) {
    return '';
  }

  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    // Calculate control points
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  return path;
}

/**
 * Simplify a set of points by removing points that are too close together
 * Uses the Ramer-Douglas-Peucker algorithm
 */
export function simplifyPoints(points: Point[], epsilon: number = 2): Point[] {
  if (points.length < 3) {
    return points;
  }

  // Find the point with the maximum distance from the line between start and end
  const start = points[0];
  const end = points[points.length - 1];

  let maxDist = 0;
  let maxIndex = 0;

  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], start, end);
    if (dist > maxDist) {
      maxDist = dist;
      maxIndex = i;
    }
  }

  // If max distance is greater than epsilon, recursively simplify
  if (maxDist > epsilon) {
    const left = simplifyPoints(points.slice(0, maxIndex + 1), epsilon);
    const right = simplifyPoints(points.slice(maxIndex), epsilon);

    // Combine results (remove duplicate point at the junction)
    return [...left.slice(0, -1), ...right];
  }

  // Otherwise, return just the endpoints
  return [start, end];
}

/**
 * Calculate perpendicular distance from a point to a line
 */
function perpendicularDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;

  // Line length squared
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    // Start and end are the same point
    return distance(point, lineStart);
  }

  // Calculate projection of point onto line
  const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lenSq;

  if (t < 0) {
    return distance(point, lineStart);
  }
  if (t > 1) {
    return distance(point, lineEnd);
  }

  // Closest point on line
  const closest = {
    x: lineStart.x + t * dx,
    y: lineStart.y + t * dy
  };

  return distance(point, closest);
}

/**
 * Create an SVG path string from a recognized shape
 */
export function shapeToSvgPath(shape: RecognizedShape): string {
  const { type, bounds } = shape;
  const { x, y, width, height } = bounds;

  switch (type) {
    case 'circle': {
      const cx = x + width / 2;
      const cy = y + height / 2;
      const rx = width / 2;
      const ry = height / 2;
      // SVG ellipse as path
      return `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy}`;
    }

    case 'rectangle':
      return `M ${x} ${y} L ${x + width} ${y} L ${x + width} ${y + height} L ${x} ${y + height} Z`;

    case 'triangle': {
      const midX = x + width / 2;
      return `M ${midX} ${y} L ${x + width} ${y + height} L ${x} ${y + height} Z`;
    }

    case 'line':
      return `M ${x} ${y + height / 2} L ${x + width} ${y + height / 2}`;

    case 'arrow': {
      const lineY = y + height / 2;
      const arrowSize = Math.min(20, width * 0.15);
      return `M ${x} ${lineY} L ${x + width - arrowSize} ${lineY} M ${x + width - arrowSize} ${lineY - arrowSize/2} L ${x + width} ${lineY} L ${x + width - arrowSize} ${lineY + arrowSize/2}`;
    }

    default:
      return '';
  }
}
