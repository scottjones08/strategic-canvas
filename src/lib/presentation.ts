// Presentation utilities for Fan Canvas
import type { VisualNode, Board } from '../types/board';

export interface Slide {
  id: string;
  frame: VisualNode;
  title: string;
  order: number;
  containedNodes: VisualNode[];
  notes?: string;
}

export interface SlideViewport {
  x: number;
  y: number;
  zoom: number;
  width: number;
  height: number;
}

export interface SlideTransition {
  fromViewport: SlideViewport;
  toViewport: SlideViewport;
  duration: number;
  easing: string;
}

// Extract frames as slides from a board
// Orders frames left-to-right, then top-to-bottom
export function extractSlidesFromBoard(board: Board): Slide[] {
  const frames = board.visualNodes.filter(n => n.type === 'frame');
  
  // Sort frames: left-to-right, then top-to-bottom
  const sortedFrames = [...frames].sort((a, b) => {
    // Group by row (within 100px vertical tolerance)
    const rowA = Math.floor(a.y / 100);
    const rowB = Math.floor(b.y / 100);
    
    if (rowA !== rowB) {
      return rowA - rowB;
    }
    
    // Within same row, sort by x position
    return a.x - b.x;
  });
  
  return sortedFrames.map((frame, index) => {
    // Find nodes contained within this frame
    const containedNodes = board.visualNodes.filter(node => {
      if (node.id === frame.id || node.type === 'frame') return false;
      
      // Check if node center is within frame bounds
      const nodeCenterX = node.x + node.width / 2;
      const nodeCenterY = node.y + node.height / 2;
      
      return (
        nodeCenterX >= frame.x &&
        nodeCenterX <= frame.x + frame.width &&
        nodeCenterY >= frame.y &&
        nodeCenterY <= frame.y + frame.height
      );
    });
    
    // Extract title from frame content (first line)
    const title = frame.content?.split('\n')[0] || `Slide ${index + 1}`;
    
    return {
      id: frame.id,
      frame,
      title,
      order: index,
      containedNodes,
      notes: frame.content?.split('\n').slice(1).join('\n') || ''
    };
  });
}

// Calculate optimal viewport to display a slide
export function getSlideViewport(
  slide: Slide,
  containerWidth: number,
  containerHeight: number,
  padding: number = 60
): SlideViewport {
  const frame = slide.frame;
  
  // Calculate the zoom level to fit the frame with padding
  const availableWidth = containerWidth - padding * 2;
  const availableHeight = containerHeight - padding * 2;
  
  const scaleX = availableWidth / frame.width;
  const scaleY = availableHeight / frame.height;
  
  // Use the smaller scale to ensure the frame fits completely
  const zoom = Math.min(scaleX, scaleY, 1.5); // Cap at 1.5x zoom
  
  // Calculate center position
  const centerX = frame.x + frame.width / 2;
  const centerY = frame.y + frame.height / 2;
  
  // Calculate pan offset to center the frame
  const x = containerWidth / 2 - centerX * zoom;
  const y = containerHeight / 2 - centerY * zoom;
  
  return {
    x,
    y,
    zoom,
    width: frame.width,
    height: frame.height
  };
}

// Generate animation parameters for slide transitions
export function getSlideTransition(
  from: SlideViewport | null,
  to: SlideViewport,
  duration: number = 600
): SlideTransition {
  const defaultFrom: SlideViewport = {
    x: to.x,
    y: to.y + 100,
    zoom: to.zoom * 0.9,
    width: to.width,
    height: to.height
  };
  
  return {
    fromViewport: from || defaultFrom,
    toViewport: to,
    duration,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
  };
}

// Reorder slides manually
export function reorderSlides(slides: Slide[], fromIndex: number, toIndex: number): Slide[] {
  const result = [...slides];
  const [moved] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, moved);
  
  // Update order numbers
  return result.map((slide, index) => ({
    ...slide,
    order: index
  }));
}

// Format time for presenter view
export function formatPresentationTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Get slide thumbnail bounds (for minimap/overview)
export function getSlideThumbnailBounds(slides: Slide[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
} {
  if (slides.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }
  
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  slides.forEach(slide => {
    minX = Math.min(minX, slide.frame.x);
    minY = Math.min(minY, slide.frame.y);
    maxX = Math.max(maxX, slide.frame.x + slide.frame.width);
    maxY = Math.max(maxY, slide.frame.y + slide.frame.height);
  });
  
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY
  };
}

// Calculate node color contrast for text visibility
export function getContrastColor(bgColor: string): string {
  // Remove # if present
  const hex = bgColor.replace('#', '');
  
  // Parse RGB values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  return luminance > 0.5 ? '#1f2937' : '#ffffff';
}
