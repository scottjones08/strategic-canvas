/**
 * FacilitatorTools Component
 * 
 * A toolbar for board owners/facilitators with:
 * - Summoning: Broadcast viewport to all participants
 * - Private Mode: Hide canvas during facilitator edits
 * - Timer: Countdown timer visible to all participants
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  EyeOff,
  Timer,
  Users,
  Megaphone,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  ChevronDown,
  Lock,
  Radio,
  Settings,
} from 'lucide-react';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Timer presets in minutes
const TIMER_PRESETS = [1, 2, 5, 10];

// Sound URL for timer completion (using a simple beep from a CDN)
const TIMER_SOUND_URL = 'https://cdn.freesound.org/previews/536/536420_4921277-lq.mp3';

interface FacilitatorToolsProps {
  channel: RealtimeChannel | null;
  isConnected: boolean;
  isFacilitator: boolean;
  viewport: { zoom: number; panX: number; panY: number };
  onViewportChange?: (viewport: { zoom: number; panX: number; panY: number }) => void;
  participantCount?: number;
}

interface TimerState {
  isRunning: boolean;
  remainingSeconds: number;
  totalSeconds: number;
}

interface FacilitatorBroadcast {
  type: 'summon' | 'private_mode' | 'timer';
  payload: any;
  timestamp: number;
}

export default function FacilitatorTools({
  channel,
  isConnected,
  isFacilitator,
  viewport,
  onViewportChange,
  participantCount = 0,
}: FacilitatorToolsProps) {
  // State
  const [isExpanded, setIsExpanded] = useState(false);
  const [privateMode, setPrivateMode] = useState(false);
  const [timer, setTimer] = useState<TimerState>({
    isRunning: false,
    remainingSeconds: 0,
    totalSeconds: 0,
  });
  const [customMinutes, setCustomMinutes] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastSummonTime, setLastSummonTime] = useState<number | null>(null);

  // Refs
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio(TIMER_SOUND_URL);
    audioRef.current.volume = 0.5;
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Timer tick effect
  useEffect(() => {
    if (timer.isRunning && timer.remainingSeconds > 0) {
      timerIntervalRef.current = setInterval(() => {
        setTimer(prev => {
          const newRemaining = prev.remainingSeconds - 1;
          if (newRemaining <= 0) {
            // Timer complete
            if (soundEnabled && audioRef.current) {
              audioRef.current.play().catch(console.error);
            }
            broadcastTimer({ isRunning: false, remainingSeconds: 0, totalSeconds: prev.totalSeconds });
            return { ...prev, isRunning: false, remainingSeconds: 0 };
          }
          return { ...prev, remainingSeconds: newRemaining };
        });
      }, 1000);
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [timer.isRunning, timer.remainingSeconds, soundEnabled]);

  // Broadcast functions
  const broadcastSummon = useCallback(() => {
    if (!channel || !isConnected) return;

    const broadcast: FacilitatorBroadcast = {
      type: 'summon',
      payload: viewport,
      timestamp: Date.now(),
    };

    channel.send({
      type: 'broadcast',
      event: 'facilitator_action',
      payload: broadcast,
    });

    setLastSummonTime(Date.now());
    setTimeout(() => setLastSummonTime(null), 2000);
  }, [channel, isConnected, viewport]);

  const broadcastPrivateMode = useCallback((enabled: boolean) => {
    if (!channel || !isConnected) return;

    const broadcast: FacilitatorBroadcast = {
      type: 'private_mode',
      payload: { enabled },
      timestamp: Date.now(),
    };

    channel.send({
      type: 'broadcast',
      event: 'facilitator_action',
      payload: broadcast,
    });
  }, [channel, isConnected]);

  const broadcastTimer = useCallback((timerState: TimerState) => {
    if (!channel || !isConnected) return;

    const broadcast: FacilitatorBroadcast = {
      type: 'timer',
      payload: timerState,
      timestamp: Date.now(),
    };

    channel.send({
      type: 'broadcast',
      event: 'facilitator_action',
      payload: broadcast,
    });
  }, [channel, isConnected]);

  // Listen for facilitator broadcasts (for non-facilitators)
  useEffect(() => {
    if (!channel || isFacilitator) return;

    const handleFacilitatorAction = ({ payload }: { payload: FacilitatorBroadcast }) => {
      switch (payload.type) {
        case 'summon':
          if (onViewportChange) {
            onViewportChange(payload.payload);
          }
          break;
        case 'private_mode':
          setPrivateMode(payload.payload.enabled);
          break;
        case 'timer':
          setTimer(payload.payload);
          if (payload.payload.remainingSeconds === 0 && !payload.payload.isRunning) {
            // Timer completed - play sound
            if (soundEnabled && audioRef.current) {
              audioRef.current.play().catch(console.error);
            }
          }
          break;
      }
    };

    channel.on('broadcast', { event: 'facilitator_action' }, handleFacilitatorAction);

    return () => {
      channel.unsubscribe();
    };
  }, [channel, isFacilitator, onViewportChange, soundEnabled]);

  // Handler functions
  const handleTogglePrivateMode = () => {
    const newState = !privateMode;
    setPrivateMode(newState);
    broadcastPrivateMode(newState);
  };

  const handleStartTimer = (minutes: number) => {
    const totalSeconds = minutes * 60;
    const newTimer: TimerState = {
      isRunning: true,
      remainingSeconds: totalSeconds,
      totalSeconds,
    };
    setTimer(newTimer);
    broadcastTimer(newTimer);
  };

  const handleToggleTimer = () => {
    const newTimer = { ...timer, isRunning: !timer.isRunning };
    setTimer(newTimer);
    broadcastTimer(newTimer);
  };

  const handleResetTimer = () => {
    const newTimer: TimerState = {
      isRunning: false,
      remainingSeconds: 0,
      totalSeconds: 0,
    };
    setTimer(newTimer);
    broadcastTimer(newTimer);
  };

  const handleCustomTimer = () => {
    const minutes = parseInt(customMinutes, 10);
    if (minutes > 0 && minutes <= 120) {
      handleStartTimer(minutes);
      setCustomMinutes('');
    }
  };

  // Format time display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage
  const timerProgress = timer.totalSeconds > 0
    ? ((timer.totalSeconds - timer.remainingSeconds) / timer.totalSeconds) * 100
    : 0;

  // If not facilitator but private mode is active, show overlay
  if (!isFacilitator && privateMode) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-gradient-to-br from-navy-900/95 to-navy-900/95 z-[1000] flex items-center justify-center"
      >
        <div className="text-center text-white">
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <Lock className="w-12 h-12" />
          </motion.div>
          <h2 className="text-2xl font-bold mb-2">Facilitator is Preparing...</h2>
          <p className="text-white/70 max-w-md">
            The board owner is making some changes. You'll be able to see the canvas again shortly.
          </p>

          {/* Show timer if active */}
          {timer.remainingSeconds > 0 && (
            <div className="mt-8 bg-white/10 rounded-2xl p-6 backdrop-blur-sm inline-block">
              <p className="text-sm text-white/60 mb-2">Time Remaining</p>
              <p className="text-5xl font-mono font-bold">{formatTime(timer.remainingSeconds)}</p>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // Non-facilitator timer display (when not in private mode)
  if (!isFacilitator && timer.remainingSeconds > 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed top-20 left-1/2 -translate-x-1/2 z-[100]"
      >
        <div className={`px-6 py-3 rounded-2xl shadow-lg backdrop-blur-sm flex items-center gap-4 ${
          timer.remainingSeconds <= 10 
            ? 'bg-red-500 text-white animate-pulse' 
            : 'bg-white/95 border border-gray-200'
        }`}>
          <Timer className={`w-5 h-5 ${timer.remainingSeconds <= 10 ? 'text-white' : 'text-navy-700'}`} />
          <span className={`text-2xl font-mono font-bold ${timer.remainingSeconds <= 10 ? 'text-white' : 'text-gray-900'}`}>
            {formatTime(timer.remainingSeconds)}
          </span>
          {timer.remainingSeconds <= 10 && (
            <span className="text-sm text-white/90">Almost done!</span>
          )}
        </div>
      </motion.div>
    );
  }

  // Facilitator toolbar (only shown to facilitators)
  if (!isFacilitator) return null;

  return (
    <div className="fixed top-20 right-4 z-[100]">
      {/* Main collapsed button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg transition-all ${
          isExpanded
            ? 'bg-navy-700 text-white'
            : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
        }`}
      >
        <Settings className="w-4 h-4" />
        <span className="text-sm font-medium">Facilitator</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </motion.button>

      {/* Expanded panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-14 right-0 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-navy-500 to-navy-500">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white">
                  <Users className="w-5 h-5" />
                  <span className="font-semibold">Facilitator Tools</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 bg-white/20 rounded-full">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-xs text-white">{participantCount} online</span>
                </div>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {/* Summon All */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-navy-700" />
                    <span className="text-sm font-medium text-gray-700">Summon All</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  Bring all participants to your current viewport
                </p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={broadcastSummon}
                  disabled={!isConnected}
                  className={`w-full py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
                    lastSummonTime
                      ? 'bg-green-100 text-green-700'
                      : 'bg-navy-700 text-white hover:bg-navy-800'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {lastSummonTime ? (
                    <>
                      <Radio className="w-4 h-4 animate-ping" />
                      Summoning...
                    </>
                  ) : (
                    <>
                      <Megaphone className="w-4 h-4" />
                      Summon to My View
                    </>
                  )}
                </motion.button>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-100" />

              {/* Private Mode */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {privateMode ? (
                      <EyeOff className="w-4 h-4 text-amber-600" />
                    ) : (
                      <Eye className="w-4 h-4 text-gray-600" />
                    )}
                    <span className="text-sm font-medium text-gray-700">Private Mode</span>
                  </div>
                  <button
                    onClick={handleTogglePrivateMode}
                    disabled={!isConnected}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      privateMode ? 'bg-amber-500' : 'bg-gray-200'
                    } disabled:opacity-50`}
                  >
                    <motion.div
                      animate={{ x: privateMode ? 24 : 2 }}
                      className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
                    />
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  {privateMode
                    ? 'Canvas hidden from participants. They see a "preparing" screen.'
                    : 'Participants can see the canvas normally.'}
                </p>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-100" />

              {/* Timer */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Timer className="w-4 h-4 text-navy-700" />
                    <span className="text-sm font-medium text-gray-700">Countdown Timer</span>
                  </div>
                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`p-1.5 rounded-lg ${soundEnabled ? 'bg-navy-100 text-navy-700' : 'bg-gray-100 text-gray-400'}`}
                    title={soundEnabled ? 'Sound enabled' : 'Sound disabled'}
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {timer.remainingSeconds > 0 ? (
                  /* Active timer display */
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-center mb-3">
                      <p className={`text-4xl font-mono font-bold ${
                        timer.remainingSeconds <= 10 ? 'text-red-500 animate-pulse' : 'text-gray-900'
                      }`}>
                        {formatTime(timer.remainingSeconds)}
                      </p>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
                      <motion.div
                        className={`h-full ${timer.remainingSeconds <= 10 ? 'bg-red-500' : 'bg-navy-500'}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${timerProgress}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>

                    {/* Timer controls */}
                    <div className="flex gap-2">
                      <button
                        onClick={handleToggleTimer}
                        className={`flex-1 py-2 rounded-lg font-medium flex items-center justify-center gap-2 ${
                          timer.isRunning
                            ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {timer.isRunning ? (
                          <>
                            <Pause className="w-4 h-4" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4" />
                            Resume
                          </>
                        )}
                      </button>
                      <button
                        onClick={handleResetTimer}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Timer presets */
                  <div>
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      {TIMER_PRESETS.map(minutes => (
                        <button
                          key={minutes}
                          onClick={() => handleStartTimer(minutes)}
                          disabled={!isConnected}
                          className="py-2 px-3 bg-gray-100 hover:bg-navy-100 text-gray-700 hover:text-navy-800 rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
                        >
                          {minutes}m
                        </button>
                      ))}
                    </div>
                    
                    {/* Custom time input */}
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={customMinutes}
                        onChange={e => setCustomMinutes(e.target.value)}
                        placeholder="Custom (min)"
                        min="1"
                        max="120"
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
                      />
                      <button
                        onClick={handleCustomTimer}
                        disabled={!customMinutes || !isConnected}
                        className="px-4 py-2 bg-navy-700 text-white rounded-lg hover:bg-navy-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <Play className="w-4 h-4" />
                        Start
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
              <p className="text-xs text-gray-400 text-center">
                {isConnected
                  ? 'Changes broadcast to all participants in real-time'
                  : 'Connect to enable facilitator features'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating timer indicator when collapsed but timer is active */}
      {!isExpanded && timer.remainingSeconds > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`mt-2 px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 ${
            timer.remainingSeconds <= 10
              ? 'bg-red-500 text-white animate-pulse'
              : 'bg-white border border-gray-200'
          }`}
        >
          <Timer className={`w-4 h-4 ${timer.remainingSeconds <= 10 ? 'text-white' : 'text-navy-700'}`} />
          <span className={`font-mono font-bold ${timer.remainingSeconds <= 10 ? 'text-white' : 'text-gray-900'}`}>
            {formatTime(timer.remainingSeconds)}
          </span>
        </motion.div>
      )}
    </div>
  );
}

// Export types for use in other components
export type { FacilitatorToolsProps, TimerState, FacilitatorBroadcast };
