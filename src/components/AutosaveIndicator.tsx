// AutosaveIndicator.tsx - Visual indicator for autosave status
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cloud, CloudOff, Loader2, Check, AlertCircle } from 'lucide-react';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'offline';

interface AutosaveIndicatorProps {
  status: SaveStatus;
  lastSaved?: Date | null;
  errorMessage?: string;
  className?: string;
  compact?: boolean;
}

export const AutosaveIndicator: React.FC<AutosaveIndicatorProps> = ({
  status,
  lastSaved,
  errorMessage,
  className = '',
  compact = false,
}) => {
  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'saving':
        return {
          icon: <Loader2 className="w-4 h-4 animate-spin" />,
          text: 'Saving...',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
        };
      case 'saved':
        return {
          icon: <Check className="w-4 h-4" />,
          text: lastSaved ? `Saved ${formatTime(lastSaved)}` : 'Saved',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-4 h-4" />,
          text: errorMessage || 'Save failed',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
        };
      case 'offline':
        return {
          icon: <CloudOff className="w-4 h-4" />,
          text: 'Offline - saved locally',
          color: 'text-amber-600',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200',
        };
      default:
        return {
          icon: <Cloud className="w-4 h-4" />,
          text: lastSaved ? `Last saved ${formatTime(lastSaved)}` : '',
          color: 'text-gray-400',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
        };
    }
  };

  const config = getStatusConfig();

  if (compact) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={status}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className={`flex items-center gap-1.5 ${config.color} ${className}`}
          title={config.text}
        >
          {config.icon}
          {status === 'saving' && (
            <span className="text-xs font-medium">Saving...</span>
          )}
          {status === 'saved' && (
            <motion.span
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{ delay: 2, duration: 0.5 }}
              className="text-xs font-medium"
            >
              Saved ✓
            </motion.span>
          )}
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {(status !== 'idle' || lastSaved) && (
        <motion.div
          key={status}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={`
            flex items-center gap-2 px-3 py-1.5 rounded-lg border
            ${config.bgColor} ${config.borderColor} ${config.color}
            ${className}
          `}
        >
          {config.icon}
          <span className="text-xs font-medium">{config.text}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AutosaveIndicator;
