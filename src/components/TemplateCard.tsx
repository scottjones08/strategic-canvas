import { motion } from 'framer-motion';
import { Eye } from 'lucide-react';
import { BoardTemplate, getCategoryInfo } from '../lib/board-templates';

interface TemplateCardProps {
  template: BoardTemplate;
  onSelect: (template: BoardTemplate) => void;
  onPreview?: (template: BoardTemplate) => void;
  isSelected?: boolean;
  compact?: boolean;
}

/**
 * Renders a mini preview of the template nodes
 */
function TemplateThumbnail({ template, width = 200, height = 120 }: { template: BoardTemplate; width?: number; height?: number }) {
  // Calculate bounds of all nodes to scale appropriately
  const nodes = template.nodes;
  if (nodes.length === 0) {
    return (
      <div 
        className="bg-gray-100 rounded-lg flex items-center justify-center text-gray-400"
        style={{ width, height }}
      >
        <span className="text-3xl">{template.icon}</span>
      </div>
    );
  }

  // Find the bounding box of all nodes
  let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
  nodes.forEach(node => {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x + node.width);
    maxY = Math.max(maxY, node.y + node.height);
  });

  const contentWidth = maxX - minX;
  const contentHeight = maxY - minY;
  
  // Add some padding
  const padding = 20;
  const scale = Math.min(
    (width - padding * 2) / contentWidth,
    (height - padding * 2) / contentHeight
  );

  return (
    <div 
      className="bg-gray-50 rounded-lg overflow-hidden relative"
      style={{ width, height }}
    >
      <svg width={width} height={height} className="absolute inset-0">
        <g transform={`translate(${padding}, ${padding}) scale(${scale})`}>
          <g transform={`translate(${-minX}, ${-minY})`}>
            {nodes.map((node, index) => {
              const fillColor = node.color === 'transparent' ? 'none' : node.color;
              const strokeColor = node.borderColor || (node.color === 'transparent' ? 'none' : '#e5e7eb');
              
              if (node.type === 'shape' && node.shapeType === 'circle') {
                const cx = node.x + node.width / 2;
                const cy = node.y + node.height / 2;
                const rx = node.width / 2;
                const ry = node.height / 2;
                return (
                  <ellipse
                    key={index}
                    cx={cx}
                    cy={cy}
                    rx={rx}
                    ry={ry}
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={1 / scale}
                  />
                );
              }

              if (node.type === 'shape' && node.shapeType === 'diamond') {
                const cx = node.x + node.width / 2;
                const cy = node.y + node.height / 2;
                const points = [
                  `${cx},${node.y}`,
                  `${node.x + node.width},${cy}`,
                  `${cx},${node.y + node.height}`,
                  `${node.x},${cy}`,
                ].join(' ');
                return (
                  <polygon
                    key={index}
                    points={points}
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={1 / scale}
                  />
                );
              }

              // Default: rectangle (frame, sticky, text, etc.)
              return (
                <rect
                  key={index}
                  x={node.x}
                  y={node.y}
                  width={node.width}
                  height={node.height}
                  rx={node.type === 'sticky' ? 4 : 8}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={1 / scale}
                />
              );
            })}
          </g>
        </g>
      </svg>
    </div>
  );
}

export default function TemplateCard({ 
  template, 
  onSelect, 
  onPreview,
  isSelected = false,
  compact = false 
}: TemplateCardProps) {
  const categoryInfo = getCategoryInfo(template.category);

  const categoryColors: Record<string, string> = {
    indigo: 'bg-indigo-100 text-indigo-700',
    green: 'bg-green-100 text-green-700',
    pink: 'bg-pink-100 text-pink-700',
    blue: 'bg-blue-100 text-blue-700',
    purple: 'bg-purple-100 text-purple-700',
  };

  if (compact) {
    return (
      <motion.button
        onClick={() => onSelect(template)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`w-full p-3 rounded-xl border-2 transition-all text-left ${
          isSelected 
            ? 'border-indigo-500 bg-indigo-50' 
            : 'border-gray-200 hover:border-gray-300 bg-white'
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{template.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate">{template.name}</p>
            <p className="text-xs text-gray-500 truncate">{template.description}</p>
          </div>
          {isSelected && (
            <div className="w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
        </div>
      </motion.button>
    );
  }

  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: '0 10px 40px -10px rgba(0,0,0,0.15)' }}
      className={`bg-white rounded-2xl border-2 overflow-hidden cursor-pointer transition-all ${
        isSelected 
          ? 'border-indigo-500 ring-2 ring-indigo-200' 
          : 'border-gray-100 hover:border-gray-200'
      }`}
      onClick={() => onSelect(template)}
    >
      {/* Thumbnail Preview */}
      <div className="relative group">
        <TemplateThumbnail template={template} width={280} height={160} />
        
        {/* Overlay on hover */}
        {onPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            className="absolute inset-0 bg-black/40 flex items-center justify-center"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPreview(template);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg text-gray-900 font-medium shadow-lg hover:bg-gray-50 transition-colors"
            >
              <Eye className="w-4 h-4" />
              Preview
            </button>
          </motion.div>
        )}

        {/* Category Badge */}
        <div className="absolute top-2 left-2">
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${categoryColors[categoryInfo.color]}`}>
            {categoryInfo.emoji} {categoryInfo.label}
          </span>
        </div>

        {/* Selected Indicator */}
        {isSelected && (
          <div className="absolute top-2 right-2">
            <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center shadow-lg">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">{template.icon}</span>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{template.name}</h3>
            <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{template.description}</p>
          </div>
        </div>

        {/* Tags */}
        <div className="mt-3 flex flex-wrap gap-1">
          {template.tags.slice(0, 3).map((tag, index) => (
            <span 
              key={index}
              className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
            >
              {tag}
            </span>
          ))}
          {template.tags.length > 3 && (
            <span className="inline-block px-2 py-0.5 text-gray-400 text-xs">
              +{template.tags.length - 3} more
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Export the thumbnail component for use elsewhere
export { TemplateThumbnail };
