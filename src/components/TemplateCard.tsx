import { motion } from 'framer-motion';
import { Eye, LayoutGrid } from 'lucide-react';
import { BoardTemplate, getCategoryInfo, TEMPLATE_COLORS } from '../lib/board-templates';

interface TemplateCardProps {
  template: BoardTemplate;
  onSelect: (template: BoardTemplate) => void;
  onPreview?: (template: BoardTemplate) => void;
  isSelected?: boolean;
  compact?: boolean;
}

/**
 * Premium color mapping for SVG rendering
 */
const getNodeColor = (color: string): string => {
  if (color === 'transparent' || !color) return 'none';
  return color;
};

/**
 * Get accent color based on template category
 */
const getCategoryAccentColor = (category: string): string => {
  const accents: Record<string, string> = {
    strategy: TEMPLATE_COLORS.indigo.dark,
    agile: TEMPLATE_COLORS.green.dark,
    design: TEMPLATE_COLORS.pink.dark,
    meeting: TEMPLATE_COLORS.blue.dark,
    planning: TEMPLATE_COLORS.purple.dark,
  };
  return accents[category] || TEMPLATE_COLORS.slate.dark;
};

/**
 * Premium mini preview of template nodes with enhanced styling
 */
function TemplateThumbnail({ 
  template, 
  width = 200, 
  height = 120 
}: { 
  template: BoardTemplate; 
  width?: number; 
  height?: number 
}) {
  const nodes = template.nodes;
  if (nodes.length === 0) {
    return (
      <div 
        className="relative overflow-hidden rounded-xl"
        style={{ width, height }}
      >
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200" />
        
        {/* Pattern overlay */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, #94a3b8 1px, transparent 0)`,
            backgroundSize: '16px 16px',
          }}
        />
        
        {/* Icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl drop-shadow-md">{template.icon}</span>
        </div>
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
  
  const padding = 20;
  const scale = Math.min(
    (width - padding * 2) / contentWidth,
    (height - padding * 2) / contentHeight
  );

  const accentColor = getCategoryAccentColor(template.category);

  return (
    <div 
      className="relative overflow-hidden rounded-xl"
      style={{ width, height }}
    >
      {/* Premium gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-100" />
      
      {/* Subtle grid pattern */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, ${accentColor}22 1px, transparent 0)`,
          backgroundSize: '12px 12px',
        }}
      />
      
      {/* SVG Canvas */}
      <svg 
        width={width} 
        height={height} 
        className="absolute inset-0"
        style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.05))' }}
      >
        <defs>
          {/* Premium gradient definitions */}
          <linearGradient id={`grad-${template.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={accentColor} stopOpacity="0.1" />
            <stop offset="100%" stopColor={accentColor} stopOpacity="0.05" />
          </linearGradient>
          
          {/* Drop shadow filter */}
          <filter id={`shadow-${template.id}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.1" />
          </filter>
        </defs>
        
        <g transform={`translate(${padding}, ${padding}) scale(${scale})`}>
          <g transform={`translate(${-minX}, ${-minY})`}>
            {nodes.map((node, index) => {
              const fillColor = getNodeColor(node.color);
              const strokeColor = node.borderColor || (node.color === 'transparent' ? 'none' : '#e5e7eb');
              const borderRadius = node.borderRadius ?? (node.type === 'sticky' ? 8 : node.type === 'frame' ? 12 : 4);
              
              // Circle shape
              if (node.type === 'shape' && node.shapeType === 'circle') {
                const cx = node.x + node.width / 2;
                const cy = node.y + node.height / 2;
                const rx = node.width / 2;
                const ry = node.height / 2;
                return (
                  <g key={index} filter={`url(#shadow-${template.id})`}>
                    <ellipse
                      cx={cx}
                      cy={cy}
                      rx={rx}
                      ry={ry}
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth={Math.max(1, (node.borderWidth || 1) / scale)}
                    />
                  </g>
                );
              }

              // Diamond shape
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
                  <g key={index} filter={`url(#shadow-${template.id})`}>
                    <polygon
                      points={points}
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth={Math.max(1, (node.borderWidth || 1) / scale)}
                    />
                  </g>
                );
              }

              // Default: rounded rectangle
              return (
                <g key={index} filter={`url(#shadow-${template.id})`}>
                  <rect
                    x={node.x}
                    y={node.y}
                    width={node.width}
                    height={node.height}
                    rx={Math.min(borderRadius, node.width / 4, node.height / 4)}
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={Math.max(0.5, (node.borderWidth || 1) / scale)}
                  />
                </g>
              );
            })}
          </g>
        </g>
      </svg>
      
      {/* Subtle corner accent */}
      <div 
        className="absolute top-0 right-0 w-16 h-16 opacity-20"
        style={{
          background: `radial-gradient(circle at 100% 0%, ${accentColor}, transparent 70%)`,
        }}
      />
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

  // Premium category color mapping
  const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
    indigo: { 
      bg: 'bg-gradient-to-r from-navy-50 to-navy-100', 
      text: 'text-navy-800', 
      border: 'border-navy-200' 
    },
    green: { 
      bg: 'bg-gradient-to-r from-emerald-50 to-emerald-100', 
      text: 'text-emerald-700', 
      border: 'border-emerald-200' 
    },
    pink: { 
      bg: 'bg-gradient-to-r from-pink-50 to-pink-100', 
      text: 'text-pink-700', 
      border: 'border-pink-200' 
    },
    blue: { 
      bg: 'bg-gradient-to-r from-blue-50 to-blue-100', 
      text: 'text-blue-700', 
      border: 'border-blue-200' 
    },
    purple: { 
      bg: 'bg-gradient-to-r from-navy-50 to-navy-100', 
      text: 'text-navy-700', 
      border: 'border-navy-200' 
    },
  };

  const colors = categoryColors[categoryInfo.color] || categoryColors.indigo;

  // Compact card variant
  if (compact) {
    return (
      <motion.button
        onClick={() => onSelect(template)}
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        className={`w-full p-4 rounded-2xl border-2 transition-all duration-300 text-left backdrop-blur-sm ${
          isSelected 
            ? 'border-navy-500 bg-gradient-to-br from-navy-50 to-navy-50 shadow-lg shadow-navy-200/50' 
            : 'border-slate-200 hover:border-slate-300 bg-white/80 hover:bg-white hover:shadow-md'
        }`}
      >
        <div className="flex items-center gap-4">
          {/* Premium icon container */}
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors.bg} shadow-sm`}>
            <span className="text-2xl">{template.icon}</span>
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-800 truncate">{template.name}</p>
            <p className="text-xs text-slate-500 truncate mt-0.5">{template.description}</p>
          </div>
          
          {isSelected && (
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-6 h-6 bg-gradient-to-br from-navy-500 to-navy-600 rounded-full flex items-center justify-center shadow-md"
            >
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </motion.div>
          )}
        </div>
      </motion.button>
    );
  }

  // Full card variant
  return (
    <motion.div
      whileHover={{ y: -6, boxShadow: '0 20px 40px -15px rgba(0,0,0,0.15)' }}
      className={`bg-white rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 ${
        isSelected 
          ? 'ring-2 ring-navy-500 ring-offset-2 shadow-xl shadow-navy-200/50' 
          : 'border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-lg'
      }`}
      onClick={() => onSelect(template)}
    >
      {/* Thumbnail Preview with premium styling */}
      <div className="relative group">
        <TemplateThumbnail template={template} width={280} height={160} />
        
        {/* Hover overlay with preview button */}
        {onPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/40 to-transparent flex items-end justify-center pb-4"
          >
            <motion.button
              initial={{ y: 10, opacity: 0 }}
              whileHover={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.05 }}
              onClick={(e) => {
                e.stopPropagation();
                onPreview(template);
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-white/95 backdrop-blur-sm rounded-xl text-slate-800 font-medium shadow-lg hover:bg-white transition-all duration-200"
            >
              <Eye className="w-4 h-4" />
              Preview
            </motion.button>
          </motion.div>
        )}

        {/* Premium category badge */}
        <div className="absolute top-3 left-3">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${colors.bg} ${colors.text} border ${colors.border} shadow-sm backdrop-blur-sm`}>
            {categoryInfo.emoji} {categoryInfo.label}
          </span>
        </div>

        {/* Node count badge */}
        <div className="absolute top-3 right-3">
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-lg text-xs font-medium text-slate-600 shadow-sm">
            <LayoutGrid className="w-3 h-3" />
            {template.nodes.length}
          </span>
        </div>

        {/* Selected indicator */}
        {isSelected && (
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute bottom-3 right-3"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-navy-500 to-navy-600 rounded-full flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </motion.div>
        )}
      </div>

      {/* Content section */}
      <div className="p-4 bg-gradient-to-b from-white to-slate-50/50">
        <div className="flex items-start gap-3">
          {/* Icon with premium styling */}
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${colors.bg} shadow-sm`}>
            <span className="text-xl">{template.icon}</span>
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-800 truncate">{template.name}</h3>
            <p className="text-sm text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">{template.description}</p>
          </div>
        </div>

        {/* Tags with premium styling */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {template.tags.slice(0, 3).map((tag, index) => (
            <span 
              key={index}
              className="inline-flex items-center px-2.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs rounded-full transition-colors duration-200"
            >
              {tag}
            </span>
          ))}
          {template.tags.length > 3 && (
            <span className="inline-flex items-center px-2 py-0.5 text-slate-400 text-xs">
              +{template.tags.length - 3}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Export the thumbnail component for use elsewhere
export { TemplateThumbnail };
