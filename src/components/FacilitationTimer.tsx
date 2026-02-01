/**
 * FacilitationTimer Component
 *
 * A beautiful, draggable floating timer for facilitation sessions.
 * Features:
 * - Large, readable time display (MM:SS)
 * - Preset buttons (1, 2, 5, 10 min, custom)
 * - Play/Pause/Reset controls
 * - Sound notifications
 * - Visual pulse when time is almost up
 * - Circular progress indicator
 * - Draggable panel
 * - Minimize to badge option
 * - Optional "visible to all" mode
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Minimize2,
  Maximize2,
  Users,
  Clock,
  Plus,
  Minus,
  Volume2,
  VolumeX,
  GripHorizontal,
  Check,
} from 'lucide-react';
import { useTimer } from '../hooks/useTimer';

interface FacilitationTimerProps {
  isOpen: boolean;
  onClose: () => void;
  /** Callback when timer visibility changes for participants */
  onVisibilityChange?: (visibleToAll: boolean) => void;
}

const PRESET_TIMES = [
  { label: '1 min', seconds: 60 },
  { label: '2 min', seconds: 120 },
  { label: '5 min', seconds: 300 },
  { label: '10 min', seconds: 600 },
];

const formatTime = (seconds: number): { minutes: string; secs: string } => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return {
    minutes: mins.toString().padStart(2, '0'),
    secs: secs.toString().padStart(2, '0'),
  };
};

export const FacilitationTimer: React.FC<FacilitationTimerProps> = ({
  isOpen,
  onClose,
  onVisibilityChange,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [visibleToAll, setVisibleToAll] = useState(false);
  const [customMinutes, setCustomMinutes] = useState(3);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const dragControls = useDragControls();
  const constraintsRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const {
    timeRemaining,
    isRunning,
    isPaused,
    isFinished,
    isWarning,
    progress,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    setDuration,
    addTime,
    totalDuration,
  } = useTimer({
    enableTickSound: soundEnabled,
    enableCompletionSound: soundEnabled,
    onComplete: () => {
      // Timer finished - could trigger additional effects here
    },
  });

  const { minutes, secs } = formatTime(timeRemaining);

  // Handle visibility toggle
  const handleVisibilityToggle = useCallback(() => {
    const newValue = !visibleToAll;
    setVisibleToAll(newValue);
    onVisibilityChange?.(newValue);
  }, [visibleToAll, onVisibilityChange]);

  // Handle preset time selection
  const handlePresetSelect = useCallback(
    (seconds: number) => {
      setDuration(seconds);
      setShowCustomInput(false);
    },
    [setDuration]
  );

  // Handle custom time set
  const handleCustomTimeSet = useCallback(() => {
    if (customMinutes > 0) {
      setDuration(customMinutes * 60);
      setShowCustomInput(false);
    }
  }, [customMinutes, setDuration]);

  // Handle play/pause toggle
  const handlePlayPause = useCallback(() => {
    if (isRunning) {
      pauseTimer();
    } else if (isPaused) {
      resumeTimer();
    } else if (timeRemaining > 0) {
      resumeTimer();
    } else if (totalDuration > 0) {
      startTimer(totalDuration);
    }
  }, [isRunning, isPaused, timeRemaining, totalDuration, pauseTimer, resumeTimer, startTimer]);

  // Calculate progress ring dimensions
  const ringSize = isMinimized ? 48 : 180;
  const strokeWidth = isMinimized ? 4 : 8;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === ' ' && !showCustomInput) {
        e.preventDefault();
        handlePlayPause();
      } else if (e.key === 'r' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        resetTimer();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handlePlayPause, resetTimer, showCustomInput]);

  if (!isOpen) return null;

  return (
    <>
      {/* Drag constraints container */}
      <div
        ref={constraintsRef}
        className="fixed inset-0 pointer-events-none z-[199]"
      />

      <AnimatePresence mode="wait">
        {isMinimized ? (
          // Minimized Badge View
          <motion.div
            key="minimized"
            ref={panelRef}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            drag
            dragControls={dragControls}
            dragMomentum={false}
            dragConstraints={constraintsRef}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={() => setIsDragging(false)}
            className={`
              fixed bottom-24 right-4 z-[200] pointer-events-auto cursor-grab active:cursor-grabbing
              ${isWarning ? 'animate-pulse' : ''}
              ${isFinished ? 'animate-bounce' : ''}
            `}
          >
            <motion.div
              className={`
                relative flex items-center gap-2 px-3 py-2 rounded-full shadow-lg border
                ${
                  isFinished
                    ? 'bg-green-500 border-green-400 text-white'
                    : isWarning
                    ? 'bg-red-500 border-red-400 text-white'
                    : isRunning
                    ? 'bg-navy-500 border-navy-400 text-white'
                    : 'bg-white/95 border-gray-200 text-gray-800'
                }
                backdrop-blur-sm
              `}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsMinimized(false)}
            >
              {/* Mini Progress Ring */}
              <div className="relative w-10 h-10 flex items-center justify-center">
                <svg
                  className="absolute inset-0 -rotate-90"
                  width={40}
                  height={40}
                >
                  <circle
                    cx={20}
                    cy={20}
                    r={16}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={3}
                    strokeOpacity={0.2}
                  />
                  <circle
                    cx={20}
                    cy={20}
                    r={16}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={3}
                    strokeDasharray={2 * Math.PI * 16}
                    strokeDashoffset={2 * Math.PI * 16 * (1 - progress)}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-linear"
                  />
                </svg>
                <Clock className="w-4 h-4" />
              </div>

              {/* Time Display */}
              <span className="font-mono font-bold text-lg tabular-nums">
                {minutes}:{secs}
              </span>

              {/* Expand Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMinimized(false);
                }}
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </motion.div>
          </motion.div>
        ) : (
          // Full Timer Panel
          <motion.div
            key="expanded"
            ref={panelRef}
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            drag
            dragControls={dragControls}
            dragMomentum={false}
            dragConstraints={constraintsRef}
            dragListener={false}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={() => setIsDragging(false)}
            className={`
              fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[200] pointer-events-auto
              ${isDragging ? 'cursor-grabbing' : ''}
            `}
          >
            <div
              className={`
                relative w-80 bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200/50
                overflow-hidden
                ${isWarning && isRunning ? 'ring-4 ring-red-500/50 ring-offset-2' : ''}
                ${isFinished ? 'ring-4 ring-green-500/50 ring-offset-2' : ''}
              `}
            >
              {/* Warning/Completion Overlay */}
              <AnimatePresence>
                {isWarning && isRunning && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0.1, 0.2, 0.1] }}
                    exit={{ opacity: 0 }}
                    transition={{ repeat: Infinity, duration: 1 }}
                    className="absolute inset-0 bg-red-500 pointer-events-none z-0"
                  />
                )}
                {isFinished && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-green-500 pointer-events-none z-0"
                  />
                )}
              </AnimatePresence>

              {/* Drag Handle Header */}
              <div
                onPointerDown={(e) => dragControls.start(e)}
                className="relative flex items-center justify-between px-4 py-3 bg-gray-50/80 border-b border-gray-100 cursor-grab active:cursor-grabbing z-10"
              >
                <div className="flex items-center gap-2 text-gray-600">
                  <GripHorizontal className="w-4 h-4" />
                  <span className="text-sm font-medium">Facilitation Timer</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      soundEnabled
                        ? 'text-gray-600 hover:bg-gray-200'
                        : 'text-gray-400 hover:bg-gray-200'
                    }`}
                    title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
                  >
                    {soundEnabled ? (
                      <Volume2 className="w-4 h-4" />
                    ) : (
                      <VolumeX className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => setIsMinimized(true)}
                    className="p-1.5 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                    title="Minimize"
                  >
                    <Minimize2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={onClose}
                    className="p-1.5 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                    title="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Timer Display */}
              <div className="relative px-6 py-8 z-10">
                {/* Progress Ring and Time */}
                <div className="flex flex-col items-center">
                  <div className="relative">
                    {/* Background Ring */}
                    <svg
                      className="transform -rotate-90"
                      width={ringSize}
                      height={ringSize}
                    >
                      <circle
                        cx={ringSize / 2}
                        cy={ringSize / 2}
                        r={radius}
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth={strokeWidth}
                      />
                      {/* Progress Ring */}
                      <motion.circle
                        cx={ringSize / 2}
                        cy={ringSize / 2}
                        r={radius}
                        fill="none"
                        stroke={
                          isFinished
                            ? '#22c55e'
                            : isWarning
                            ? '#ef4444'
                            : '#6366f1'
                        }
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        className="transition-all duration-1000 ease-linear"
                      />
                    </svg>

                    {/* Time Display Inside Ring */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <motion.div
                        className={`font-mono font-bold tabular-nums ${
                          isFinished
                            ? 'text-green-600'
                            : isWarning
                            ? 'text-red-600'
                            : 'text-gray-900'
                        }`}
                        style={{ fontSize: isMinimized ? '1.5rem' : '3rem' }}
                        animate={
                          isWarning && isRunning
                            ? { scale: [1, 1.05, 1] }
                            : { scale: 1 }
                        }
                        transition={
                          isWarning && isRunning
                            ? { repeat: Infinity, duration: 1 }
                            : {}
                        }
                      >
                        {minutes}:{secs}
                      </motion.div>
                      {isFinished && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-1 text-green-600 text-sm font-medium"
                        >
                          <Check className="w-4 h-4" />
                          Time's up!
                        </motion.div>
                      )}
                    </div>
                  </div>

                  {/* Add/Remove Time Buttons (when running or paused) */}
                  {(isRunning || isPaused) && timeRemaining > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 mt-4"
                    >
                      <button
                        onClick={() => addTime(-30)}
                        disabled={timeRemaining <= 30}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                        30s
                      </button>
                      <button
                        onClick={() => addTime(60)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        1m
                      </button>
                    </motion.div>
                  )}
                </div>

                {/* Preset Time Buttons */}
                <div className="mt-6">
                  <div className="grid grid-cols-4 gap-2">
                    {PRESET_TIMES.map((preset) => (
                      <button
                        key={preset.seconds}
                        onClick={() => handlePresetSelect(preset.seconds)}
                        disabled={isRunning}
                        className={`
                          py-2.5 px-2 text-sm font-medium rounded-xl transition-all
                          ${
                            totalDuration === preset.seconds && !isRunning
                              ? 'bg-navy-100 text-navy-800 ring-2 ring-navy-500'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }
                          ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  {/* Custom Time Button/Input */}
                  <div className="mt-2">
                    {showCustomInput ? (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2"
                      >
                        <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-xl">
                          <input
                            type="number"
                            min="1"
                            max="120"
                            value={customMinutes}
                            onChange={(e) =>
                              setCustomMinutes(
                                Math.max(1, Math.min(120, parseInt(e.target.value) || 1))
                              )
                            }
                            className="w-16 bg-transparent text-center font-mono font-semibold text-gray-900 outline-none"
                            autoFocus
                          />
                          <span className="text-sm text-gray-500">minutes</span>
                        </div>
                        <button
                          onClick={handleCustomTimeSet}
                          className="px-4 py-2 bg-navy-700 text-white rounded-xl font-medium hover:bg-navy-800 transition-colors"
                        >
                          Set
                        </button>
                        <button
                          onClick={() => setShowCustomInput(false)}
                          className="p-2 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </motion.div>
                    ) : (
                      <button
                        onClick={() => setShowCustomInput(true)}
                        disabled={isRunning}
                        className={`
                          w-full py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors
                          ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                      >
                        Custom time...
                      </button>
                    )}
                  </div>
                </div>

                {/* Control Buttons */}
                <div className="flex items-center justify-center gap-3 mt-6">
                  {/* Reset Button */}
                  <button
                    onClick={resetTimer}
                    disabled={totalDuration === 0}
                    className="p-3 text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors"
                    title="Reset (Ctrl+R)"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>

                  {/* Play/Pause Button */}
                  <motion.button
                    onClick={handlePlayPause}
                    disabled={totalDuration === 0 && !isRunning}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`
                      p-5 rounded-2xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed
                      ${
                        isRunning
                          ? 'bg-amber-500 hover:bg-amber-600 text-white'
                          : isFinished
                          ? 'bg-green-500 hover:bg-green-600 text-white'
                          : 'bg-navy-700 hover:bg-navy-800 text-white'
                      }
                    `}
                    title={isRunning ? 'Pause (Space)' : 'Start (Space)'}
                  >
                    {isRunning ? (
                      <Pause className="w-7 h-7" />
                    ) : (
                      <Play className="w-7 h-7 ml-0.5" />
                    )}
                  </motion.button>

                  {/* Visibility Toggle */}
                  <button
                    onClick={handleVisibilityToggle}
                    className={`
                      p-3 rounded-xl transition-all
                      ${
                        visibleToAll
                          ? 'bg-navy-100 text-navy-800 ring-2 ring-navy-500'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }
                    `}
                    title={
                      visibleToAll
                        ? 'Visible to all participants'
                        : 'Only visible to you'
                    }
                  >
                    <Users className="w-5 h-5" />
                  </button>
                </div>

                {/* Visibility Label */}
                <div className="mt-4 text-center">
                  <span
                    className={`text-xs font-medium ${
                      visibleToAll ? 'text-navy-700' : 'text-gray-500'
                    }`}
                  >
                    {visibleToAll
                      ? 'Visible to all participants'
                      : 'Only visible to you'}
                  </span>
                </div>
              </div>

              {/* Keyboard Shortcuts Hint */}
              <div className="px-6 py-3 bg-gray-50/80 border-t border-gray-100 z-10">
                <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
                  <span>
                    <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-600 font-mono">
                      Space
                    </kbd>{' '}
                    Play/Pause
                  </span>
                  <span>
                    <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-600 font-mono">
                      Esc
                    </kbd>{' '}
                    Close
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default FacilitationTimer;
