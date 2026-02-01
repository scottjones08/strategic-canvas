/**
 * ThemeToggle Component
 *
 * A beautiful animated toggle switch for dark mode with:
 * - Sun/Moon icons with smooth transition animations
 * - Matches the app's premium design language
 * - Compact design suitable for toolbar placement
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Monitor } from 'lucide-react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeToggleProps {
  /** Whether dark mode is currently active */
  isDark: boolean;
  /** The current theme setting */
  theme?: Theme;
  /** Toggle between light and dark mode */
  onToggle: () => void;
  /** Set a specific theme */
  onSetTheme?: (theme: Theme) => void;
  /** Whether to show system option */
  showSystemOption?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional className */
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  isDark,
  theme = isDark ? 'dark' : 'light',
  onToggle,
  onSetTheme,
  showSystemOption = false,
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  // Simple toggle button (default)
  if (!showSystemOption) {
    return (
      <button
        onClick={onToggle}
        className={`
          relative ${sizeClasses[size]} rounded-xl
          bg-white dark:bg-gray-800
          border border-gray-200 dark:border-gray-700
          hover:bg-gray-50 dark:hover:bg-gray-700
          shadow-sm hover:shadow-md
          transition-all duration-200
          flex items-center justify-center
          group
          ${className}
        `}
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        <AnimatePresence mode="wait">
          {isDark ? (
            <motion.div
              key="moon"
              initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <Moon className={`${iconSizes[size]} text-navy-500`} />
            </motion.div>
          ) : (
            <motion.div
              key="sun"
              initial={{ opacity: 0, rotate: 90, scale: 0.5 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: -90, scale: 0.5 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <Sun className={`${iconSizes[size]} text-amber-500`} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hover glow effect */}
        <div
          className={`
            absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100
            transition-opacity duration-300 pointer-events-none
            ${isDark
              ? 'bg-gradient-to-br from-navy-500/10 to-navy-500/10'
              : 'bg-gradient-to-br from-amber-500/10 to-orange-500/10'
            }
          `}
        />
      </button>
    );
  }

  // Full theme selector with system option
  return (
    <div className={`flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl ${className}`}>
      {(['light', 'system', 'dark'] as Theme[]).map((t) => {
        const isActive = theme === t;
        const Icon = t === 'light' ? Sun : t === 'dark' ? Moon : Monitor;
        const iconColor = t === 'light' ? 'text-amber-500' : t === 'dark' ? 'text-navy-500' : 'text-gray-500';

        return (
          <button
            key={t}
            onClick={() => onSetTheme?.(t)}
            className={`
              relative p-2 rounded-lg transition-all duration-200
              ${isActive
                ? 'bg-white dark:bg-gray-700 shadow-sm'
                : 'hover:bg-gray-200 dark:hover:bg-gray-700'
              }
            `}
            title={`${t.charAt(0).toUpperCase() + t.slice(1)} theme`}
            aria-label={`${t} theme`}
            aria-pressed={isActive}
          >
            <Icon className={`w-4 h-4 ${isActive ? iconColor : 'text-gray-400'}`} />
          </button>
        );
      })}
    </div>
  );
};

/**
 * ThemeToggleSwitch Component
 *
 * A track-style toggle switch for dark mode
 */
export const ThemeToggleSwitch: React.FC<{
  isDark: boolean;
  onToggle: () => void;
  className?: string;
}> = ({ isDark, onToggle, className = '' }) => {
  return (
    <button
      onClick={onToggle}
      className={`
        relative w-14 h-7 rounded-full p-0.5
        transition-colors duration-300
        ${isDark
          ? 'bg-navy-700'
          : 'bg-gray-300'
        }
        ${className}
      `}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      role="switch"
      aria-checked={isDark}
    >
      <motion.div
        className="w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center"
        animate={{ x: isDark ? 26 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      >
        <AnimatePresence mode="wait">
          {isDark ? (
            <motion.div
              key="moon"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.15 }}
            >
              <Moon className="w-3.5 h-3.5 text-navy-700" />
            </motion.div>
          ) : (
            <motion.div
              key="sun"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.15 }}
            >
              <Sun className="w-3.5 h-3.5 text-amber-500" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </button>
  );
};

export default ThemeToggle;
