/**
 * useTimer Hook
 *
 * A powerful timer hook for facilitation sessions with:
 * - Start, pause, resume, and reset functionality
 * - Sound notifications
 * - Callback support for timer events
 */

import { useState, useRef, useCallback, useEffect } from 'react';

export interface TimerState {
  /** Total duration in seconds */
  totalDuration: number;
  /** Time remaining in seconds */
  timeRemaining: number;
  /** Whether the timer is currently running */
  isRunning: boolean;
  /** Whether the timer is paused */
  isPaused: boolean;
  /** Whether the timer has finished */
  isFinished: boolean;
  /** Whether we're in the warning period (last 10 seconds) */
  isWarning: boolean;
  /** Progress from 0 to 1 */
  progress: number;
}

export interface UseTimerOptions {
  /** Callback when timer completes */
  onComplete?: () => void;
  /** Callback when entering warning period */
  onWarning?: () => void;
  /** Callback on each tick */
  onTick?: (timeRemaining: number) => void;
  /** Warning threshold in seconds (default: 10) */
  warningThreshold?: number;
  /** Enable tick sound in warning period */
  enableTickSound?: boolean;
  /** Enable completion sound */
  enableCompletionSound?: boolean;
}

export interface UseTimerReturn extends TimerState {
  /** Start timer with specified duration in seconds */
  startTimer: (seconds: number) => void;
  /** Pause the timer */
  pauseTimer: () => void;
  /** Resume a paused timer */
  resumeTimer: () => void;
  /** Reset the timer to initial state */
  resetTimer: () => void;
  /** Set a new duration (resets timer) */
  setDuration: (seconds: number) => void;
  /** Add time to the current timer */
  addTime: (seconds: number) => void;
}

// Simple audio context for sound effects
const createAudioContext = () => {
  if (typeof window === 'undefined') return null;
  try {
    return new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  } catch {
    return null;
  }
};

const playTone = (
  audioContext: AudioContext | null,
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume: number = 0.3
) => {
  if (!audioContext) return;

  try {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);

    // Fade out
    gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  } catch {
    // Silently fail if audio context is not available
  }
};

export const useTimer = (options: UseTimerOptions = {}): UseTimerReturn => {
  const {
    onComplete,
    onWarning,
    onTick,
    warningThreshold = 10,
    enableTickSound = true,
    enableCompletionSound = true,
  } = options;

  const [totalDuration, setTotalDuration] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const hasWarnedRef = useRef(false);
  const lastTickTimeRef = useRef<number>(0);

  // Initialize audio context on first user interaction
  const ensureAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = createAudioContext();
    }
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  // Play tick sound
  const playTickSound = useCallback(() => {
    if (!enableTickSound) return;
    const ctx = ensureAudioContext();
    playTone(ctx, 800, 0.1, 'sine', 0.2);
  }, [enableTickSound, ensureAudioContext]);

  // Play completion sound (celebratory chime)
  const playCompletionSound = useCallback(() => {
    if (!enableCompletionSound) return;
    const ctx = ensureAudioContext();

    // Play a pleasant completion melody
    setTimeout(() => playTone(ctx, 523.25, 0.15, 'sine', 0.4), 0);    // C5
    setTimeout(() => playTone(ctx, 659.25, 0.15, 'sine', 0.4), 150);  // E5
    setTimeout(() => playTone(ctx, 783.99, 0.3, 'sine', 0.4), 300);   // G5
    setTimeout(() => playTone(ctx, 1046.5, 0.5, 'sine', 0.3), 450);   // C6
  }, [enableCompletionSound, ensureAudioContext]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Main timer logic
  useEffect(() => {
    if (isRunning && !isPaused && timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          const newTime = prev - 1;

          // Check if entering warning period
          if (newTime === warningThreshold && !hasWarnedRef.current) {
            hasWarnedRef.current = true;
            onWarning?.();
          }

          // Play tick sound in warning period
          if (newTime <= warningThreshold && newTime > 0) {
            const now = Date.now();
            if (now - lastTickTimeRef.current >= 900) {
              playTickSound();
              lastTickTimeRef.current = now;
            }
          }

          // Call onTick callback
          onTick?.(newTime);

          // Check if timer finished
          if (newTime <= 0) {
            setIsRunning(false);
            setIsFinished(true);
            playCompletionSound();
            onComplete?.();
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
            }
            return 0;
          }

          return newTime;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, isPaused, timeRemaining, warningThreshold, onComplete, onWarning, onTick, playTickSound, playCompletionSound]);

  // Computed values
  const isWarning = timeRemaining > 0 && timeRemaining <= warningThreshold;
  const progress = totalDuration > 0 ? (totalDuration - timeRemaining) / totalDuration : 0;

  const startTimer = useCallback((seconds: number) => {
    ensureAudioContext();
    setTotalDuration(seconds);
    setTimeRemaining(seconds);
    setIsRunning(true);
    setIsPaused(false);
    setIsFinished(false);
    hasWarnedRef.current = false;
  }, [ensureAudioContext]);

  const pauseTimer = useCallback(() => {
    setIsPaused(true);
    setIsRunning(false);
  }, []);

  const resumeTimer = useCallback(() => {
    if (timeRemaining > 0) {
      setIsPaused(false);
      setIsRunning(true);
    }
  }, [timeRemaining]);

  const resetTimer = useCallback(() => {
    setTimeRemaining(totalDuration);
    setIsRunning(false);
    setIsPaused(false);
    setIsFinished(false);
    hasWarnedRef.current = false;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, [totalDuration]);

  const setDuration = useCallback((seconds: number) => {
    setTotalDuration(seconds);
    setTimeRemaining(seconds);
    setIsRunning(false);
    setIsPaused(false);
    setIsFinished(false);
    hasWarnedRef.current = false;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, []);

  const addTime = useCallback((seconds: number) => {
    setTimeRemaining((prev) => {
      const newTime = prev + seconds;
      return newTime > 0 ? newTime : 0;
    });
    setTotalDuration((prev) => prev + seconds);
    if (isFinished) {
      setIsFinished(false);
    }
  }, [isFinished]);

  return {
    totalDuration,
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
  };
};

export default useTimer;
