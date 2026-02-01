/**
 * LoadingFallback - Beautiful loading states for lazy-loaded components
 * Provides skeleton loaders and animated spinners that match the app design language
 */

import { motion } from 'framer-motion';
import { FileText, Presentation, Library, Layout, Mic, Users, Settings } from 'lucide-react';

export type LoadingFallbackType =
  | 'pdf'
  | 'documents'
  | 'transcription'
  | 'template'
  | 'presentation'
  | 'office'
  | 'facilitator'
  | 'asset'
  | 'default';

interface LoadingFallbackProps {
  type?: LoadingFallbackType;
  message?: string;
  fullScreen?: boolean;
}

// Animated spinner component
const Spinner = ({ size = 40, color = 'indigo' }: { size?: number; color?: string }) => (
  <motion.div
    className={`rounded-full border-4 border-${color}-100 border-t-${color}-500`}
    style={{ width: size, height: size }}
    animate={{ rotate: 360 }}
    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
  />
);

// Pulse animation for skeleton elements
const pulseAnimation = {
  initial: { opacity: 0.5 },
  animate: {
    opacity: [0.5, 0.8, 0.5],
    transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
  }
};

// Icon mapping for different types
const typeIcons: Record<LoadingFallbackType, typeof FileText> = {
  pdf: FileText,
  documents: FileText,
  transcription: Mic,
  template: Layout,
  presentation: Presentation,
  office: FileText,
  facilitator: Users,
  asset: Library,
  default: Settings,
};

// Messages for different types
const typeMessages: Record<LoadingFallbackType, string> = {
  pdf: 'Loading PDF Editor...',
  documents: 'Loading Documents...',
  transcription: 'Loading Transcription...',
  template: 'Loading Templates...',
  presentation: 'Preparing Presentation...',
  office: 'Loading Document Viewer...',
  facilitator: 'Loading Facilitator Tools...',
  asset: 'Loading Asset Library...',
  default: 'Loading...',
};

// PDF Editor skeleton
const PDFSkeleton = () => (
  <div className="flex h-full">
    {/* Thumbnails sidebar */}
    <div className="w-48 bg-gray-100 border-r border-gray-200 p-4 space-y-3">
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="w-full aspect-[3/4] bg-gray-200 rounded-lg"
          {...pulseAnimation}
          style={{ animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </div>
    {/* Main content area */}
    <div className="flex-1 flex flex-col">
      {/* Toolbar */}
      <div className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-3">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="w-8 h-8 bg-gray-200 rounded"
            {...pulseAnimation}
          />
        ))}
      </div>
      {/* PDF area */}
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <motion.div
          className="w-[600px] h-[800px] max-w-[90%] max-h-[90%] bg-white shadow-xl rounded-lg"
          {...pulseAnimation}
        />
      </div>
    </div>
  </div>
);

// Documents view skeleton
const DocumentsSkeleton = () => (
  <div className="p-6 space-y-6">
    {/* Header */}
    <div className="flex items-center justify-between">
      <motion.div className="w-48 h-8 bg-gray-200 rounded" {...pulseAnimation} />
      <motion.div className="w-32 h-10 bg-navy-100 rounded-lg" {...pulseAnimation} />
    </div>
    {/* Search bar */}
    <motion.div className="w-full h-12 bg-gray-100 rounded-xl" {...pulseAnimation} />
    {/* Document grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="bg-white border border-gray-200 rounded-xl p-4 space-y-3"
          {...pulseAnimation}
          style={{ animationDelay: `${i * 0.1}s` }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded" />
            <div className="flex-1 space-y-2">
              <div className="w-3/4 h-4 bg-gray-200 rounded" />
              <div className="w-1/2 h-3 bg-gray-100 rounded" />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  </div>
);

// Transcription panel skeleton
const TranscriptionSkeleton = () => (
  <div className="flex flex-col h-full bg-white rounded-2xl overflow-hidden">
    {/* Header */}
    <div className="p-4 border-b border-gray-100">
      <div className="flex items-center justify-between">
        <motion.div className="w-32 h-6 bg-gray-200 rounded" {...pulseAnimation} />
        <motion.div className="w-24 h-8 bg-navy-100 rounded-lg" {...pulseAnimation} />
      </div>
    </div>
    {/* Transcript entries */}
    <div className="flex-1 p-4 space-y-4">
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="space-y-2"
          {...pulseAnimation}
          style={{ animationDelay: `${i * 0.15}s` }}
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-navy-100 rounded-full" />
            <div className="w-24 h-4 bg-gray-200 rounded" />
            <div className="w-16 h-3 bg-gray-100 rounded" />
          </div>
          <div className="ml-10 space-y-1">
            <div className="w-full h-4 bg-gray-100 rounded" />
            <div className="w-3/4 h-4 bg-gray-100 rounded" />
          </div>
        </motion.div>
      ))}
    </div>
    {/* Controls */}
    <div className="p-4 border-t border-gray-100">
      <motion.div className="w-full h-12 bg-navy-100 rounded-xl" {...pulseAnimation} />
    </div>
  </div>
);

// Template library skeleton
const TemplateSkeleton = () => (
  <div className="p-6 space-y-6">
    {/* Header */}
    <div className="flex items-center justify-between">
      <motion.div className="w-40 h-8 bg-gray-200 rounded" {...pulseAnimation} />
      <motion.div className="w-64 h-10 bg-gray-100 rounded-xl" {...pulseAnimation} />
    </div>
    {/* Categories */}
    <div className="flex gap-2">
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="w-24 h-8 bg-gray-100 rounded-full"
          {...pulseAnimation}
          style={{ animationDelay: `${i * 0.05}s` }}
        />
      ))}
    </div>
    {/* Template cards */}
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="bg-white border border-gray-200 rounded-xl overflow-hidden"
          {...pulseAnimation}
          style={{ animationDelay: `${i * 0.08}s` }}
        >
          <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200" />
          <div className="p-4 space-y-2">
            <div className="w-3/4 h-5 bg-gray-200 rounded" />
            <div className="w-full h-3 bg-gray-100 rounded" />
          </div>
        </motion.div>
      ))}
    </div>
  </div>
);

// Presentation mode skeleton
const PresentationSkeleton = () => (
  <div className="fixed inset-0 bg-gray-900 flex flex-col items-center justify-center">
    <motion.div
      className="w-[80%] max-w-[1200px] aspect-video bg-gray-800 rounded-2xl shadow-2xl"
      {...pulseAnimation}
    />
    <div className="absolute bottom-8 flex items-center gap-4">
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="w-12 h-12 bg-gray-700 rounded-full"
          {...pulseAnimation}
          style={{ animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </div>
  </div>
);

// Generic component skeleton
const GenericSkeleton = () => (
  <div className="p-6 space-y-4">
    <motion.div className="w-48 h-8 bg-gray-200 rounded" {...pulseAnimation} />
    <motion.div className="w-full h-12 bg-gray-100 rounded-xl" {...pulseAnimation} />
    <div className="grid grid-cols-2 gap-4">
      {[...Array(4)].map((_, i) => (
        <motion.div
          key={i}
          className="h-32 bg-gray-100 rounded-xl"
          {...pulseAnimation}
          style={{ animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </div>
  </div>
);

// Skeleton mapping
const skeletonComponents: Record<LoadingFallbackType, React.FC> = {
  pdf: PDFSkeleton,
  documents: DocumentsSkeleton,
  transcription: TranscriptionSkeleton,
  template: TemplateSkeleton,
  presentation: PresentationSkeleton,
  office: PDFSkeleton,
  facilitator: GenericSkeleton,
  asset: GenericSkeleton,
  default: GenericSkeleton,
};

/**
 * LoadingFallback component - Shows beautiful loading states for lazy-loaded components
 */
export const LoadingFallback: React.FC<LoadingFallbackProps> = ({
  type = 'default',
  message,
  fullScreen = false
}) => {
  const Icon = typeIcons[type];
  const displayMessage = message || typeMessages[type];
  const SkeletonComponent = skeletonComponents[type];

  // Full screen centered loading
  if (fullScreen || type === 'presentation') {
    return (
      <div className="fixed inset-0 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="relative">
            <motion.div
              className="w-16 h-16 rounded-2xl bg-gradient-to-br from-navy-500 to-navy-600 flex items-center justify-center shadow-lg shadow-navy-200"
              animate={{
                scale: [1, 1.05, 1],
                rotate: [0, 2, -2, 0]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Icon className="w-8 h-8 text-white" />
            </motion.div>
            <motion.div
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white shadow flex items-center justify-center"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <div className="w-4 h-4 rounded-full border-2 border-navy-100 border-t-navy-500" />
            </motion.div>
          </div>
          <motion.p
            className="text-gray-600 font-medium"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {displayMessage}
          </motion.p>
        </motion.div>
      </div>
    );
  }

  // Skeleton loading with contextual UI
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full h-full min-h-[200px] bg-gray-50 overflow-hidden"
    >
      <SkeletonComponent />
      {/* Loading indicator overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/90 backdrop-blur-sm rounded-2xl px-6 py-4 shadow-xl flex items-center gap-3"
        >
          <motion.div
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-navy-500 to-navy-600 flex items-center justify-center"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Icon className="w-5 h-5 text-white" />
          </motion.div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-700">{displayMessage}</span>
            <motion.div
              className="h-1 bg-gray-200 rounded-full overflow-hidden mt-1"
              style={{ width: 100 }}
            >
              <motion.div
                className="h-full bg-gradient-to-r from-navy-500 to-navy-500 rounded-full"
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                style={{ width: '50%' }}
              />
            </motion.div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

// Minimal spinner for inline use
export const InlineLoader: React.FC<{ message?: string; size?: 'sm' | 'md' | 'lg' }> = ({
  message = 'Loading...',
  size = 'md'
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-3',
  };

  return (
    <div className="flex items-center gap-2">
      <motion.div
        className={`${sizeClasses[size]} rounded-full border-navy-100 border-t-navy-500`}
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      />
      <span className="text-sm text-gray-600">{message}</span>
    </div>
  );
};

export default LoadingFallback;
