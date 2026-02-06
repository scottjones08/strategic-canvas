/**
 * React Hook for Professional Voice Transcription
 * Manages transcription state, recording, and file uploads
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  TranscriptionConfig,
  TranscriptionSession,
  FullTranscript,
  TranscriptSegment,
  startRealtimeTranscription,
  startWebSpeechTranscription,
  transcribeAudioFile,
  saveTranscript,
  loadTranscriptionConfig,
  saveTranscriptionConfig,
  updateSpeakerName,
  mergeSpeakers,
  formatTranscriptAsText,
  formatTranscriptAsMarkdown,
  formatTranscriptAsHTML,
  formatTranscriptAsJSON,
  extractActionItems,
} from '../lib/transcription';

export interface UseTranscriptionOptions {
  autoSave?: boolean;
  onTranscriptComplete?: (transcript: FullTranscript) => void;
  onSegmentAdded?: (segment: TranscriptSegment) => void;
  onError?: (error: Error) => void;
}

export interface UseTranscriptionReturn {
  // State
  isRecording: boolean;
  isPaused: boolean;
  isProcessing: boolean;
  transcript: FullTranscript | null;
  currentSegment: TranscriptSegment | null;
  interimText: string;
  error: string | null;
  duration: number;
  
  // Config
  config: TranscriptionConfig | null;
  isConfigured: boolean;
  
  // Actions
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<FullTranscript | null>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  uploadAudio: (file: File, onProgress?: (status: string, message: string) => void) => Promise<FullTranscript | null>;
  
  // Transcript manipulation
  updateSpeaker: (speakerId: string, newName: string) => void;
  mergeSpeakersWith: (speakerIdToRemove: string, speakerIdToKeep: string) => void;
  clearTranscript: () => void;
  
  // Export
  exportAsText: () => string;
  exportAsMarkdown: () => string;
  exportAsHTML: () => string;
  exportAsJSON: () => string;
  getActionItems: () => string[];
  
  // Config management
  updateConfig: (config: Partial<TranscriptionConfig>) => void;
}

const DEFAULT_CONFIG: TranscriptionConfig = {
  apiKey: '',
  enableDiarization: true,
  languageCode: 'en',
  punctuate: true,
  formatText: true,
};

export function useTranscription(options: UseTranscriptionOptions = {}): UseTranscriptionReturn {
  const { autoSave = true, onTranscriptComplete, onSegmentAdded, onError } = options;
  
  // State
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState<FullTranscript | null>(null);
  const [currentSegment, setCurrentSegment] = useState<TranscriptSegment | null>(null);
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [config, setConfig] = useState<TranscriptionConfig | null>(null);
  
  // Refs
  const sessionRef = useRef<TranscriptionSession | null>(null);
  const durationIntervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  
  // Load config on mount
  useEffect(() => {
    const savedConfig = loadTranscriptionConfig();
    setConfig({ ...DEFAULT_CONFIG, ...savedConfig });
  }, []);
  
  // Check if properly configured
  const isConfigured = config?.apiKey ? config.apiKey.length > 10 : false;
  
  // Update duration timer
  useEffect(() => {
    if (isRecording && !isPaused) {
      durationIntervalRef.current = window.setInterval(() => {
        setDuration(Date.now() - startTimeRef.current);
      }, 100);
    } else if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [isRecording, isPaused]);
  
  // Start recording
  const startRecording = useCallback(async () => {
    // Clean up any existing session first to prevent duplicates
    if (sessionRef.current) {
      try {
        await sessionRef.current.stop();
      } catch (e) {
        // Ignore errors from stopping previous session
      }
      sessionRef.current = null;
    }
    
    try {
      setError(null);
      setInterimText('');
      setDuration(0);
      startTimeRef.current = Date.now();
      
      // Initialize transcript
      const newTranscript: FullTranscript = {
        id: Math.random().toString(36).substring(2, 11),
        segments: [],
        speakers: [],
        duration: 0,
        createdAt: new Date(),
        status: 'processing',
      };
      setTranscript(newTranscript);
      
      // Create session based on config
      let session: TranscriptionSession;
      
      if (isConfigured && config) {
        // Use AssemblyAI for real-time transcription
        session = startRealtimeTranscription(config);
      } else {
        // Fall back to Web Speech API
        session = startWebSpeechTranscription();
      }
      
      // Set up event handlers
      session.onSegment((segment) => {
        setTranscript(prev => {
          if (!prev) return prev;
          // Prevent duplicate segments by checking if segment ID already exists
          if (prev.segments.some(s => s.id === segment.id)) {
            return prev; // Don't add duplicate
          }
          const updated = {
            ...prev,
            segments: [...prev.segments, segment],
            speakers: updateSpeakersFromSegment(prev.speakers, segment),
          };
          return updated;
        });
        setCurrentSegment(segment);
        setInterimText('');
        onSegmentAdded?.(segment);
      });
      
      session.onStatusChange((status) => {
        if (status === 'recording') {
          setIsRecording(true);
        } else if (status === 'stopped') {
          setIsRecording(false);
          setIsPaused(false);
        } else if (status === 'error') {
          setIsRecording(false);
          setIsPaused(false);
        }
      });
      
      session.onError((err) => {
        setError(err.message);
        setIsRecording(false);
        onError?.(err);
      });
      
      sessionRef.current = session;
      session.start();
      
    } catch (err: any) {
      setError(err.message);
      onError?.(err);
    }
  }, [config, isConfigured, onSegmentAdded, onError]);
  
  // Stop recording
  const stopRecording = useCallback(async () => {
    if (!sessionRef.current) return null;
    
    try {
      const finalTranscript = await sessionRef.current.stop();
      
      // Update local state
      setTranscript(prev => {
        const updated = {
          ...prev,
          ...finalTranscript,
          status: 'completed' as const,
        };
        
        // Auto-save if enabled
        if (autoSave) {
          saveTranscript(updated);
        }
        
        return updated;
      });
      
      setIsRecording(false);
      setIsPaused(false);
      sessionRef.current = null;
      
      onTranscriptComplete?.(finalTranscript);
      return finalTranscript;
      
    } catch (err: any) {
      setError(err.message);
      onError?.(err);
      return null;
    }
  }, [autoSave, onTranscriptComplete, onError]);
  
  // Pause recording
  const pauseRecording = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.pause();
      setIsPaused(true);
    }
  }, []);
  
  // Resume recording
  const resumeRecording = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.resume();
      setIsPaused(false);
    }
  }, []);
  
  // Upload and transcribe audio file
  const uploadAudio = useCallback(async (
    file: File,
    onProgress?: (status: string, message: string) => void
  ) => {
    if (!config?.apiKey) {
      setError('API key not configured. Please add your AssemblyAI API key in settings.');
      return null;
    }
    
    try {
      setIsProcessing(true);
      setError(null);
      
      const result = await transcribeAudioFile(file, config, onProgress);
      
      setTranscript(result);
      
      if (result.status === 'error') {
        setError(result.error || 'Transcription failed');
        onError?.(new Error(result.error));
      } else {
        if (autoSave) {
          saveTranscript(result);
        }
        onTranscriptComplete?.(result);
      }
      
      return result;
      
    } catch (err: any) {
      setError(err.message);
      onError?.(err);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [config, autoSave, onTranscriptComplete, onError]);
  
  // Update speaker name
  const updateSpeaker = useCallback((speakerId: string, newName: string) => {
    setTranscript(prev => {
      if (!prev) return prev;
      return updateSpeakerName(prev, speakerId, newName);
    });
  }, []);
  
  // Merge speakers
  const mergeSpeakersWith = useCallback((speakerIdToRemove: string, speakerIdToKeep: string) => {
    setTranscript(prev => {
      if (!prev) return prev;
      return mergeSpeakers(prev, speakerIdToRemove, speakerIdToKeep);
    });
  }, []);
  
  // Clear transcript
  const clearTranscript = useCallback(() => {
    setTranscript(null);
    setCurrentSegment(null);
    setInterimText('');
    setDuration(0);
    setError(null);
  }, []);
  
  // Export functions
  const exportAsText = useCallback(() => {
    return transcript ? formatTranscriptAsText(transcript) : '';
  }, [transcript]);
  
  const exportAsMarkdown = useCallback(() => {
    return transcript ? formatTranscriptAsMarkdown(transcript) : '';
  }, [transcript]);
  
  const exportAsHTML = useCallback(() => {
    return transcript ? formatTranscriptAsHTML(transcript) : '';
  }, [transcript]);
  
  const exportAsJSON = useCallback(() => {
    return transcript ? formatTranscriptAsJSON(transcript) : '';
  }, [transcript]);
  
  const getActionItems = useCallback(() => {
    return transcript ? extractActionItems(transcript) : [];
  }, [transcript]);
  
  // Update config
  const updateConfig = useCallback((updates: Partial<TranscriptionConfig>) => {
    setConfig(prev => {
      const updated = { ...prev, ...updates } as TranscriptionConfig;
      saveTranscriptionConfig(updated);
      return updated;
    });
  }, []);
  
  return {
    // State
    isRecording,
    isPaused,
    isProcessing,
    transcript,
    currentSegment,
    interimText,
    error,
    duration,
    
    // Config
    config,
    isConfigured,
    
    // Actions
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    uploadAudio,
    
    // Transcript manipulation
    updateSpeaker,
    mergeSpeakersWith,
    clearTranscript,
    
    // Export
    exportAsText,
    exportAsMarkdown,
    exportAsHTML,
    exportAsJSON,
    getActionItems,
    
    // Config management
    updateConfig,
  };
}

// Helper to update speakers list from new segment
function updateSpeakersFromSegment(
  speakers: FullTranscript['speakers'],
  segment: TranscriptSegment
): FullTranscript['speakers'] {
  const existingSpeaker = speakers.find(s => s.id === segment.speaker);
  if (existingSpeaker) {
    return speakers;
  }
  
  const SPEAKER_COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  ];
  
  return [
    ...speakers,
    {
      id: segment.speaker,
      label: segment.speakerLabel || `Speaker ${String.fromCharCode(65 + speakers.length)}`,
      color: SPEAKER_COLORS[speakers.length % SPEAKER_COLORS.length],
    },
  ];
}

export default useTranscription;
