/**
 * Sound Effects Hook
 *
 * Optional sound effects for interactions.
 * Disabled by default, can be enabled in settings.
 * Uses Web Audio API for better performance.
 */

import { useCallback, useRef, useEffect, useState } from 'react';

// Sound types
export type SoundType =
  | 'click'
  | 'success'
  | 'error'
  | 'pop'
  | 'whoosh'
  | 'ding'
  | 'drop'
  | 'slide'
  | 'delete';

// Sound configuration
interface SoundConfig {
  enabled: boolean;
  volume: number; // 0-1
}

// Default configuration
const DEFAULT_CONFIG: SoundConfig = {
  enabled: false, // Disabled by default
  volume: 0.3,
};

// Local storage key
const SOUND_CONFIG_KEY = 'strategic-canvas-sounds';

// Load config from localStorage
const loadConfig = (): SoundConfig => {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  try {
    const stored = localStorage.getItem(SOUND_CONFIG_KEY);
    if (stored) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
    }
  } catch {
    // Ignore errors
  }
  return DEFAULT_CONFIG;
};

// Save config to localStorage
const saveConfig = (config: SoundConfig): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SOUND_CONFIG_KEY, JSON.stringify(config));
  } catch {
    // Ignore errors
  }
};

// Sound synthesizer using Web Audio API
class SoundSynthesizer {
  private audioContext: AudioContext | null = null;

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  playClick(volume: number): void {
    const ctx = this.getContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.setValueAtTime(800, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.05);

    gainNode.gain.setValueAtTime(volume * 0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.05);
  }

  playSuccess(volume: number): void {
    const ctx = this.getContext();
    const oscillator1 = ctx.createOscillator();
    const oscillator2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    oscillator2.frequency.setValueAtTime(659.25, ctx.currentTime); // E5

    gainNode.gain.setValueAtTime(volume * 0.2, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    oscillator1.start(ctx.currentTime);
    oscillator2.start(ctx.currentTime);
    oscillator1.stop(ctx.currentTime + 0.3);
    oscillator2.stop(ctx.currentTime + 0.3);
  }

  playError(volume: number): void {
    const ctx = this.getContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(200, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.15);

    gainNode.gain.setValueAtTime(volume * 0.2, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.15);
  }

  playPop(volume: number): void {
    const ctx = this.getContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.setValueAtTime(400, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.08);

    gainNode.gain.setValueAtTime(volume * 0.4, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.08);
  }

  playWhoosh(volume: number): void {
    const ctx = this.getContext();
    const noise = ctx.createBufferSource();
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < noiseBuffer.length; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1000, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(3000, ctx.currentTime + 0.1);
    filter.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.2);

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume * 0.15, ctx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    noise.start(ctx.currentTime);
    noise.stop(ctx.currentTime + 0.2);
  }

  playDing(volume: number): void {
    const ctx = this.getContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, ctx.currentTime); // A5

    gainNode.gain.setValueAtTime(volume * 0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.5);
  }

  playDrop(volume: number): void {
    const ctx = this.getContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.setValueAtTime(300, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.15);

    gainNode.gain.setValueAtTime(volume * 0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.15);
  }

  playSlide(volume: number): void {
    const ctx = this.getContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(400, ctx.currentTime);
    oscillator.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.1);

    gainNode.gain.setValueAtTime(volume * 0.15, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);
  }

  playDelete(volume: number): void {
    const ctx = this.getContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(600, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2);

    gainNode.gain.setValueAtTime(volume * 0.25, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.2);
  }

  play(type: SoundType, volume: number): void {
    switch (type) {
      case 'click':
        this.playClick(volume);
        break;
      case 'success':
        this.playSuccess(volume);
        break;
      case 'error':
        this.playError(volume);
        break;
      case 'pop':
        this.playPop(volume);
        break;
      case 'whoosh':
        this.playWhoosh(volume);
        break;
      case 'ding':
        this.playDing(volume);
        break;
      case 'drop':
        this.playDrop(volume);
        break;
      case 'slide':
        this.playSlide(volume);
        break;
      case 'delete':
        this.playDelete(volume);
        break;
    }
  }
}

// Singleton synthesizer
let synthesizer: SoundSynthesizer | null = null;

const getSynthesizer = (): SoundSynthesizer => {
  if (!synthesizer) {
    synthesizer = new SoundSynthesizer();
  }
  return synthesizer;
};

/**
 * Hook for playing sound effects
 */
export const useSoundEffects = () => {
  const [config, setConfig] = useState<SoundConfig>(DEFAULT_CONFIG);
  const configRef = useRef(config);

  // Load config on mount
  useEffect(() => {
    const loaded = loadConfig();
    setConfig(loaded);
    configRef.current = loaded;
  }, []);

  // Update ref when config changes
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  // Play a sound
  const playSound = useCallback((type: SoundType) => {
    const { enabled, volume } = configRef.current;
    if (!enabled || typeof window === 'undefined') return;

    try {
      getSynthesizer().play(type, volume);
    } catch (error) {
      // Silently fail - sounds are optional
      console.warn('Sound playback failed:', error);
    }
  }, []);

  // Toggle sound effects
  const toggleSounds = useCallback(() => {
    setConfig((prev) => {
      const newConfig = { ...prev, enabled: !prev.enabled };
      saveConfig(newConfig);
      return newConfig;
    });
  }, []);

  // Set volume
  const setVolume = useCallback((volume: number) => {
    setConfig((prev) => {
      const newConfig = { ...prev, volume: Math.max(0, Math.min(1, volume)) };
      saveConfig(newConfig);
      return newConfig;
    });
  }, []);

  // Enable/disable sounds
  const setSoundsEnabled = useCallback((enabled: boolean) => {
    setConfig((prev) => {
      const newConfig = { ...prev, enabled };
      saveConfig(newConfig);
      return newConfig;
    });
  }, []);

  return {
    playSound,
    toggleSounds,
    setVolume,
    setSoundsEnabled,
    soundsEnabled: config.enabled,
    volume: config.volume,
  };
};

// Context for sharing sound effects across components
import React, { createContext, useContext } from 'react';

interface SoundEffectsContextType {
  playSound: (type: SoundType) => void;
  toggleSounds: () => void;
  setVolume: (volume: number) => void;
  setSoundsEnabled: (enabled: boolean) => void;
  soundsEnabled: boolean;
  volume: number;
}

const SoundEffectsContext = createContext<SoundEffectsContextType | null>(null);

export const SoundEffectsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const soundEffects = useSoundEffects();

  return (
    <SoundEffectsContext.Provider value={soundEffects}>
      {children}
    </SoundEffectsContext.Provider>
  );
};

export const useSoundEffectsContext = (): SoundEffectsContextType => {
  const context = useContext(SoundEffectsContext);
  if (!context) {
    throw new Error('useSoundEffectsContext must be used within a SoundEffectsProvider');
  }
  return context;
};

export default useSoundEffects;
