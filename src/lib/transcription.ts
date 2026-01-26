/**
 * Professional Voice Transcription Service with Speaker Diarization
 * Supports AssemblyAI for high-quality transcription with speaker identification
 * Falls back to Web Speech API when no API key is configured
 */

// ============================================
// TYPES & INTERFACES
// ============================================

export interface TranscriptionConfig {
  apiKey: string;
  enableDiarization: boolean;
  languageCode?: string;
  speakersExpected?: number;
  punctuate?: boolean;
  formatText?: boolean;
}

export interface Speaker {
  id: string;
  label: string;
  color: string;
  customName?: string;
}

export interface TranscriptSegment {
  id: string;
  speaker: string;
  speakerLabel: string;
  text: string;
  startTime: number; // milliseconds
  endTime: number; // milliseconds
  confidence: number;
  words?: TranscriptWord[];
}

export interface TranscriptWord {
  text: string;
  startTime: number;
  endTime: number;
  confidence: number;
  speaker?: string;
}

export interface FullTranscript {
  id: string;
  segments: TranscriptSegment[];
  speakers: Speaker[];
  duration: number; // milliseconds
  createdAt: Date;
  audioUrl?: string;
  status: 'processing' | 'completed' | 'error';
  error?: string;
  rawResponse?: any;
}

export interface TranscriptNote {
  id: string;
  title: string;
  content: string;
  boardId: string;
  clientId?: string;
  transcript: FullTranscript;
  actionItems: string[];
  createdAt: Date;
}

export interface TranscriptionSession {
  id: string;
  status: 'connecting' | 'connected' | 'recording' | 'stopped' | 'error';
  transcript: FullTranscript;
  start: () => void;
  stop: () => Promise<FullTranscript>;
  pause: () => void;
  resume: () => void;
  onSegment: (callback: (segment: TranscriptSegment) => void) => void;
  onStatusChange: (callback: (status: TranscriptionSession['status']) => void) => void;
  onError: (callback: (error: Error) => void) => void;
}

// ============================================
// SPEAKER COLORS
// ============================================

const SPEAKER_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // orange
  '#6366f1', // indigo
];

export function getSpeakerColor(speakerIndex: number): string {
  return SPEAKER_COLORS[speakerIndex % SPEAKER_COLORS.length];
}

// ============================================
// ASSEMBLYAI API FUNCTIONS
// ============================================

const ASSEMBLYAI_API_URL = 'https://api.assemblyai.com/v2';
const SUPABASE_FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL + '/functions/v1';

// Streaming auth response from edge function
interface StreamingAuth {
  token?: string;
  streaming_url?: string;
  error?: string;
  fallback?: string;
}

/**
 * Get authentication for real-time streaming
 * Uses Supabase Edge Function to proxy the request (avoids CORS)
 * Returns token and correct WebSocket URL for Universal-Streaming
 */
export async function getRealtimeToken(_apiKey?: string): Promise<StreamingAuth> {
  const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/assemblyai-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to get realtime token' }));
    throw new Error(error.error || `Failed to get realtime token: ${response.status}`);
  }

  return response.json();
}

/**
 * Upload audio file to AssemblyAI and get upload URL
 */
export async function uploadAudioToAssemblyAI(
  file: File | Blob,
  apiKey: string
): Promise<string> {
  const response = await fetch(`${ASSEMBLYAI_API_URL}/upload`, {
    method: 'POST',
    headers: {
      'Authorization': apiKey,
      'Content-Type': 'application/octet-stream',
    },
    body: file,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to upload audio');
  }

  const data = await response.json();
  return data.upload_url;
}

/**
 * Request transcription from AssemblyAI
 */
export async function requestTranscription(
  audioUrl: string,
  config: TranscriptionConfig
): Promise<string> {
  const requestBody: any = {
    audio_url: audioUrl,
    speaker_labels: config.enableDiarization,
    punctuate: config.punctuate ?? true,
    format_text: config.formatText ?? true,
  };

  if (config.languageCode) {
    requestBody.language_code = config.languageCode;
  }

  if (config.speakersExpected) {
    requestBody.speakers_expected = config.speakersExpected;
  }

  const response = await fetch(`${ASSEMBLYAI_API_URL}/transcript`, {
    method: 'POST',
    headers: {
      'Authorization': config.apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to request transcription');
  }

  const data = await response.json();
  return data.id;
}

/**
 * Poll for transcription completion
 */
export async function getTranscriptionResult(
  transcriptId: string,
  apiKey: string
): Promise<any> {
  const response = await fetch(`${ASSEMBLYAI_API_URL}/transcript/${transcriptId}`, {
    headers: {
      'Authorization': apiKey,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get transcription');
  }

  return response.json();
}

/**
 * Wait for transcription to complete with polling
 */
export async function waitForTranscription(
  transcriptId: string,
  apiKey: string,
  onProgress?: (status: string) => void,
  pollInterval = 3000,
  maxWaitTime = 300000 // 5 minutes
): Promise<any> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    const result = await getTranscriptionResult(transcriptId, apiKey);
    
    if (onProgress) {
      onProgress(result.status);
    }

    if (result.status === 'completed') {
      return result;
    }

    if (result.status === 'error') {
      throw new Error(result.error || 'Transcription failed');
    }

    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error('Transcription timed out');
}

// ============================================
// MAIN TRANSCRIPTION FUNCTIONS
// ============================================

/**
 * Transcribe an uploaded audio file using AssemblyAI
 */
export async function transcribeAudioFile(
  file: File,
  config: TranscriptionConfig,
  onProgress?: (status: string, message: string) => void
): Promise<FullTranscript> {
  const transcriptId = generateId();

  try {
    // Upload audio
    onProgress?.('uploading', 'Uploading audio file...');
    const uploadUrl = await uploadAudioToAssemblyAI(file, config.apiKey);

    // Request transcription
    onProgress?.('processing', 'Starting transcription...');
    const jobId = await requestTranscription(uploadUrl, config);

    // Wait for completion
    const result = await waitForTranscription(
      jobId,
      config.apiKey,
      (status) => onProgress?.(status, `Transcription ${status}...`)
    );

    // Parse result into our format
    onProgress?.('completed', 'Transcription complete!');
    return parseAssemblyAIResult(result, transcriptId);

  } catch (error: any) {
    return {
      id: transcriptId,
      segments: [],
      speakers: [],
      duration: 0,
      createdAt: new Date(),
      status: 'error',
      error: error.message,
    };
  }
}

/**
 * Parse AssemblyAI result into our FullTranscript format
 */
function parseAssemblyAIResult(result: any, transcriptId: string): FullTranscript {
  const speakers = new Map<string, Speaker>();
  const segments: TranscriptSegment[] = [];

  if (result.utterances && result.utterances.length > 0) {
    // Use speaker-separated utterances
    result.utterances.forEach((utterance: any, index: number) => {
      const speakerId = utterance.speaker;
      
      if (!speakers.has(speakerId)) {
        const speakerIndex = speakers.size;
        speakers.set(speakerId, {
          id: speakerId,
          label: `Speaker ${String.fromCharCode(65 + speakerIndex)}`,
          color: getSpeakerColor(speakerIndex),
        });
      }

      const speaker = speakers.get(speakerId)!;

      segments.push({
        id: `${transcriptId}-${index}`,
        speaker: speakerId,
        speakerLabel: speaker.label,
        text: utterance.text,
        startTime: utterance.start,
        endTime: utterance.end,
        confidence: utterance.confidence,
        words: utterance.words?.map((w: any) => ({
          text: w.text,
          startTime: w.start,
          endTime: w.end,
          confidence: w.confidence,
          speaker: speakerId,
        })),
      });
    });
  } else if (result.words && result.words.length > 0) {
    // Fall back to word-level data
    let currentSpeaker = 'A';
    let currentSegment: TranscriptSegment | null = null;
    let segmentIndex = 0;

    result.words.forEach((word: any) => {
      const speakerId = word.speaker || currentSpeaker;
      
      if (!speakers.has(speakerId)) {
        const speakerIndex = speakers.size;
        speakers.set(speakerId, {
          id: speakerId,
          label: `Speaker ${String.fromCharCode(65 + speakerIndex)}`,
          color: getSpeakerColor(speakerIndex),
        });
      }

      if (!currentSegment || currentSegment.speaker !== speakerId) {
        if (currentSegment) {
          segments.push(currentSegment);
        }
        currentSegment = {
          id: `${transcriptId}-${segmentIndex++}`,
          speaker: speakerId,
          speakerLabel: speakers.get(speakerId)!.label,
          text: word.text,
          startTime: word.start,
          endTime: word.end,
          confidence: word.confidence,
          words: [{ text: word.text, startTime: word.start, endTime: word.end, confidence: word.confidence, speaker: speakerId }],
        };
      } else {
        currentSegment.text += ' ' + word.text;
        currentSegment.endTime = word.end;
        currentSegment.words?.push({ text: word.text, startTime: word.start, endTime: word.end, confidence: word.confidence, speaker: speakerId });
      }

      currentSpeaker = speakerId;
    });

    if (currentSegment) {
      segments.push(currentSegment);
    }
  } else if (result.text) {
    // No speaker info, single segment
    speakers.set('A', {
      id: 'A',
      label: 'Speaker A',
      color: getSpeakerColor(0),
    });

    segments.push({
      id: `${transcriptId}-0`,
      speaker: 'A',
      speakerLabel: 'Speaker A',
      text: result.text,
      startTime: 0,
      endTime: result.audio_duration * 1000,
      confidence: result.confidence || 0.95,
    });
  }

  return {
    id: transcriptId,
    segments,
    speakers: Array.from(speakers.values()),
    duration: result.audio_duration * 1000,
    createdAt: new Date(),
    audioUrl: result.audio_url,
    status: 'completed',
    rawResponse: result,
  };
}

// ============================================
// REAL-TIME TRANSCRIPTION (AssemblyAI)
// ============================================

/**
 * Start a real-time transcription session using AssemblyAI
 */
export function startRealtimeTranscription(
  config: TranscriptionConfig
): TranscriptionSession {
  const sessionId = generateId();
  const transcript: FullTranscript = {
    id: sessionId,
    segments: [],
    speakers: [{ id: 'A', label: 'Speaker A', color: getSpeakerColor(0) }],
    duration: 0,
    createdAt: new Date(),
    status: 'processing',
  };

  let socket: WebSocket | null = null;
  // Note: We use ScriptProcessorNode for raw PCM capture instead of MediaRecorder
  let audioContext: AudioContext | null = null;
  let stream: MediaStream | null = null;
  let status: TranscriptionSession['status'] = 'connecting';
  let startTime = Date.now();

  const segmentCallbacks: ((segment: TranscriptSegment) => void)[] = [];
  const statusCallbacks: ((status: TranscriptionSession['status']) => void)[] = [];
  const errorCallbacks: ((error: Error) => void)[] = [];

  const setStatus = (newStatus: TranscriptionSession['status']) => {
    status = newStatus;
    statusCallbacks.forEach(cb => cb(newStatus));
  };

  const handleError = (error: Error) => {
    setStatus('error');
    errorCallbacks.forEach(cb => cb(error));
  };

  const session: TranscriptionSession = {
    id: sessionId,
    status: 'connecting',
    transcript,

    start: async () => {
      try {
        // Get microphone access
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: { 
            sampleRate: 16000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
          } 
        });

        // Create audio context for resampling
        audioContext = new AudioContext({ sampleRate: 16000 });

        // Get authentication for real-time streaming
        setStatus('connecting');
        let streamingAuth: StreamingAuth;
        try {
          streamingAuth = await getRealtimeToken(config.apiKey);
        } catch (tokenError: any) {
          handleError(new Error(`Failed to authenticate: ${tokenError.message}`));
          return;
        }

        // Check if streaming is available or need to fallback
        if (streamingAuth.fallback === 'use_file_upload') {
          handleError(new Error('Real-time streaming not available. Please use file upload for transcription.'));
          return;
        }

        if (!streamingAuth.token || !streamingAuth.streaming_url) {
          handleError(new Error('Failed to get streaming credentials'));
          return;
        }

        // Connect to AssemblyAI Universal-Streaming v3 WebSocket
        // URL format: wss://streaming.assemblyai.com/v3/ws?token=...&sample_rate=16000
        const socketUrl = `${streamingAuth.streaming_url}?token=${encodeURIComponent(streamingAuth.token)}&sample_rate=16000&encoding=pcm_s16le&format_turns=true`;
        socket = new WebSocket(socketUrl);

        socket.onopen = () => {
          setStatus('connected');
          startTime = Date.now();
          
          // Start recording and sending audio
          startAudioCapture();
        };

        socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            
            // Handle v3 Begin event (session started)
            if (message.type === 'Begin') {
              console.log('Streaming session started:', message.id);
              return;
            }

            // Handle v3 Turn event (transcription)
            if (message.type === 'Turn' && message.transcript) {
              // Only process end_of_turn or formatted turns for cleaner output
              if (message.end_of_turn || message.turn_is_formatted) {
                const segment: TranscriptSegment = {
                  id: `${sessionId}-${transcript.segments.length}`,
                  speaker: 'A',
                  speakerLabel: 'Speaker A',
                  text: message.transcript,
                  startTime: message.words?.[0]?.start || 0,
                  endTime: message.words?.[message.words.length - 1]?.end || 0,
                  confidence: message.words?.[0]?.confidence || 0.9,
                  words: message.words?.filter((w: any) => w.word_is_final).map((w: any) => ({
                    text: w.text,
                    startTime: w.start,
                    endTime: w.end,
                    confidence: w.confidence,
                  })),
                };

                transcript.segments.push(segment);
                transcript.duration = Date.now() - startTime;
                segmentCallbacks.forEach(cb => cb(segment));
              }
              return;
            }

            // Handle v3 Termination event
            if (message.type === 'Termination') {
              console.log('Streaming session terminated');
              return;
            }

            // Handle error messages
            if (message.error) {
              console.error('AssemblyAI error:', message.error);
              handleError(new Error(message.error));
              return;
            }

            // Handle legacy format (FinalTranscript) for backwards compatibility
            if (message.message_type === 'FinalTranscript' && message.text) {
              const segment: TranscriptSegment = {
                id: `${sessionId}-${transcript.segments.length}`,
                speaker: 'A',
                speakerLabel: 'Speaker A',
                text: message.text,
                startTime: message.audio_start,
                endTime: message.audio_end,
                confidence: message.confidence,
                words: message.words?.map((w: any) => ({
                  text: w.text,
                  startTime: w.start,
                  endTime: w.end,
                  confidence: w.confidence,
                })),
              };

              transcript.segments.push(segment);
              transcript.duration = Date.now() - startTime;
              segmentCallbacks.forEach(cb => cb(segment));
            }
          } catch (e) {
            console.error('Failed to parse WebSocket message:', e);
          }
        };

        socket.onerror = () => {
          handleError(new Error('WebSocket connection error'));
        };

        socket.onclose = () => {
          if (status === 'recording') {
            setStatus('stopped');
          }
        };

        setStatus('recording');

      } catch (error: any) {
        handleError(error);
      }
    },

    stop: async () => {
      try {
        // Stop audio processing nodes
        const audioNodes = (session as any)._audioNodes;
        if (audioNodes) {
          audioNodes.scriptNode?.disconnect();
          audioNodes.source?.disconnect();
        }

        // Close WebSocket - send terminate for v3
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ terminate_session: true }));
          socket.close();
        }

        // Stop audio stream
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }

        // Close audio context
        if (audioContext) {
          await audioContext.close();
        }

        transcript.duration = Date.now() - startTime;
        transcript.status = 'completed';
        setStatus('stopped');

        return transcript;
      } catch (error: any) {
        handleError(error);
        throw error;
      }
    },

    pause: () => {
      // ScriptProcessorNode doesn't support pause, but we can mute by not sending
      // For now, pause is a no-op for real-time streaming
      console.log('Pause not supported in real-time streaming mode');
    },

    resume: () => {
      // Resume is a no-op for real-time streaming
      console.log('Resume not supported in real-time streaming mode');
    },

    onSegment: (callback) => {
      segmentCallbacks.push(callback);
    },

    onStatusChange: (callback) => {
      statusCallbacks.push(callback);
    },

    onError: (callback) => {
      errorCallbacks.push(callback);
    },
  };

  // Helper function to start audio capture with raw PCM
  function startAudioCapture() {
    if (!stream || !socket || !audioContext) return;

    // AssemblyAI Universal-Streaming v3 requires raw PCM audio (pcm_s16le)
    // We use ScriptProcessorNode to capture raw audio samples and convert to PCM
    const source = audioContext.createMediaStreamSource(stream);
    const bufferSize = 4096;
    const scriptNode = audioContext.createScriptProcessor(bufferSize, 1, 1);
    
    scriptNode.onaudioprocess = (event) => {
      if (socket?.readyState !== WebSocket.OPEN) return;
      
      const inputData = event.inputBuffer.getChannelData(0);
      
      // Convert float32 samples to int16 PCM
      const pcmData = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        // Clamp and convert to 16-bit signed integer
        const s = Math.max(-1, Math.min(1, inputData[i]));
        pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      
      // Convert to base64 for JSON transmission
      const uint8Array = new Uint8Array(pcmData.buffer);
      let binary = '';
      for (let i = 0; i < uint8Array.length; i++) {
        binary += String.fromCharCode(uint8Array[i]);
      }
      const base64 = btoa(binary);
      
      // Send as AssemblyAI v3 expects
      socket.send(JSON.stringify({ audio_data: base64 }));
    };
    
    source.connect(scriptNode);
    scriptNode.connect(audioContext.destination);
    
    // Store for cleanup (using mediaRecorder variable for backwards compat)
    (session as any)._audioNodes = { source, scriptNode };
  }

  return session;
}

// ============================================
// WEB SPEECH API FALLBACK
// ============================================

/**
 * Create a transcription session using Web Speech API (fallback)
 */
export function startWebSpeechTranscription(): TranscriptionSession {
  const sessionId = generateId();
  const transcript: FullTranscript = {
    id: sessionId,
    segments: [],
    speakers: [{ id: 'user', label: 'You', color: getSpeakerColor(0) }],
    duration: 0,
    createdAt: new Date(),
    status: 'processing',
  };

  let recognition: any = null;
  let currentStatus: TranscriptionSession['status'] = 'connecting';
  let startTime = Date.now();
  let isRecording = false;

  const segmentCallbacks: ((segment: TranscriptSegment) => void)[] = [];
  const statusCallbacks: ((status: TranscriptionSession['status']) => void)[] = [];
  const errorCallbacks: ((error: Error) => void)[] = [];

  const setStatus = (newStatus: TranscriptionSession['status']) => {
    currentStatus = newStatus;
    statusCallbacks.forEach(cb => cb(newStatus));
  };

  const handleError = (error: Error) => {
    setStatus('error');
    errorCallbacks.forEach(cb => cb(error));
  };

  const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;

  if (!SpeechRecognition) {
    const session: TranscriptionSession = {
      id: sessionId,
      status: 'error',
      transcript,
      start: () => handleError(new Error('Speech recognition not supported')),
      stop: async () => transcript,
      pause: () => {},
      resume: () => {},
      onSegment: () => {},
      onStatusChange: () => {},
      onError: (cb) => cb(new Error('Speech recognition not supported')),
    };
    return session;
  }

  const session: TranscriptionSession = {
    id: sessionId,
    get status() { return currentStatus; },
    transcript,

    start: () => {
      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setStatus('recording');
        startTime = Date.now();
        isRecording = true;
      };

      recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            const segment: TranscriptSegment = {
              id: `${sessionId}-${transcript.segments.length}`,
              speaker: 'user',
              speakerLabel: 'You',
              text: result[0].transcript,
              startTime: Date.now() - startTime,
              endTime: Date.now() - startTime,
              confidence: result[0].confidence || 0.9,
            };

            transcript.segments.push(segment);
            transcript.duration = Date.now() - startTime;
            segmentCallbacks.forEach(cb => cb(segment));
          }
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error !== 'no-speech') {
          handleError(new Error(event.error));
        }
      };

      recognition.onend = () => {
        if (isRecording) {
          // Restart if still supposed to be recording
          try {
            recognition.start();
          } catch (e) {}
        } else {
          setStatus('stopped');
        }
      };

      try {
        recognition.start();
        setStatus('connected');
      } catch (error: any) {
        handleError(error);
      }
    },

    stop: async () => {
      isRecording = false;
      if (recognition) {
        recognition.stop();
      }
      transcript.duration = Date.now() - startTime;
      transcript.status = 'completed';
      setStatus('stopped');
      return transcript;
    },

    pause: () => {
      if (recognition) {
        recognition.stop();
      }
    },

    resume: () => {
      if (recognition) {
        try {
          recognition.start();
        } catch (e) {}
      }
    },

    onSegment: (callback) => {
      segmentCallbacks.push(callback);
    },

    onStatusChange: (callback) => {
      statusCallbacks.push(callback);
    },

    onError: (callback) => {
      errorCallbacks.push(callback);
    },
  };

  return session;
}

// ============================================
// FORMATTING FUNCTIONS
// ============================================

/**
 * Format transcript as plain text
 */
export function formatTranscriptAsText(transcript: FullTranscript): string {
  if (transcript.segments.length === 0) {
    return 'No transcript available.';
  }

  return transcript.segments
    .map(segment => {
      const time = formatTimestamp(segment.startTime);
      const speaker = segment.speakerLabel || 'Unknown';
      return `[${time}] ${speaker}: ${segment.text}`;
    })
    .join('\n\n');
}

/**
 * Format transcript as Markdown
 */
export function formatTranscriptAsMarkdown(transcript: FullTranscript): string {
  if (transcript.segments.length === 0) {
    return '*No transcript available.*';
  }

  const header = `# Transcript\n\n**Duration:** ${formatDuration(transcript.duration)}\n**Date:** ${transcript.createdAt.toLocaleString()}\n**Speakers:** ${transcript.speakers.map(s => s.customName || s.label).join(', ')}\n\n---\n\n`;

  const content = transcript.segments
    .map(segment => {
      const time = formatTimestamp(segment.startTime);
      const speaker = segment.speakerLabel || 'Unknown';
      return `**[${time}] ${speaker}:**\n${segment.text}`;
    })
    .join('\n\n');

  return header + content;
}

/**
 * Format transcript as HTML for notes
 */
export function formatTranscriptAsHTML(transcript: FullTranscript): string {
  if (transcript.segments.length === 0) {
    return '<p><em>No transcript available.</em></p>';
  }

  const speakerColorMap = new Map(transcript.speakers.map(s => [s.id, s.color]));

  const header = `
    <div style="margin-bottom: 1rem; padding: 1rem; background: #f5f5f5; border-radius: 8px;">
      <strong>Duration:</strong> ${formatDuration(transcript.duration)}<br>
      <strong>Date:</strong> ${transcript.createdAt.toLocaleString()}<br>
      <strong>Speakers:</strong> ${transcript.speakers.map(s => `<span style="color: ${s.color}; font-weight: 600;">${s.customName || s.label}</span>`).join(', ')}
    </div>
  `;

  const content = transcript.segments
    .map(segment => {
      const time = formatTimestamp(segment.startTime);
      const speaker = segment.speakerLabel || 'Unknown';
      const color = speakerColorMap.get(segment.speaker) || '#6b7280';
      return `
        <div style="margin-bottom: 1rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
            <span style="font-size: 0.75rem; color: #9ca3af;">${time}</span>
            <span style="font-weight: 600; color: ${color};">${speaker}:</span>
          </div>
          <p style="margin: 0; padding-left: 1rem;">${segment.text}</p>
        </div>
      `;
    })
    .join('');

  return header + content;
}

/**
 * Format transcript as JSON for export
 */
export function formatTranscriptAsJSON(transcript: FullTranscript): string {
  return JSON.stringify({
    id: transcript.id,
    createdAt: transcript.createdAt.toISOString(),
    duration: transcript.duration,
    speakers: transcript.speakers,
    segments: transcript.segments,
  }, null, 2);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  return `${minutes}m ${seconds}s`;
}

/**
 * Extract action items from transcript using simple patterns
 */
export function extractActionItems(transcript: FullTranscript): string[] {
  const actionPatterns = [
    /I('ll| will) (\w+.{10,60})/gi,
    /let's (\w+.{10,60})/gi,
    /we (should|need to|must|have to) (\w+.{10,60})/gi,
    /action item[:\s]+(.{10,100})/gi,
    /TODO[:\s]+(.{10,100})/gi,
    /follow up[:\s]+(.{10,100})/gi,
    /schedule (.{10,80})/gi,
  ];

  const actions: string[] = [];
  const fullText = transcript.segments.map(s => s.text).join(' ');

  actionPatterns.forEach(pattern => {
    const matches = fullText.matchAll(pattern);
    for (const match of matches) {
      const action = match[match.length - 1].trim();
      if (action && action.length > 10) {
        actions.push(action.charAt(0).toUpperCase() + action.slice(1));
      }
    }
  });

  // Remove duplicates
  return [...new Set(actions)].slice(0, 10);
}

/**
 * Update speaker names in transcript
 */
export function updateSpeakerName(
  transcript: FullTranscript,
  speakerId: string,
  newName: string
): FullTranscript {
  const updatedSpeakers = transcript.speakers.map(s =>
    s.id === speakerId ? { ...s, customName: newName, label: newName } : s
  );

  const updatedSegments = transcript.segments.map(s =>
    s.speaker === speakerId ? { ...s, speakerLabel: newName } : s
  );

  return {
    ...transcript,
    speakers: updatedSpeakers,
    segments: updatedSegments,
  };
}

/**
 * Merge two speakers (when diarization incorrectly split one person)
 */
export function mergeSpeakers(
  transcript: FullTranscript,
  speakerIdToRemove: string,
  speakerIdToKeep: string
): FullTranscript {
  const keepSpeaker = transcript.speakers.find(s => s.id === speakerIdToKeep);
  if (!keepSpeaker) return transcript;

  const updatedSpeakers = transcript.speakers.filter(s => s.id !== speakerIdToRemove);

  const updatedSegments = transcript.segments.map(s =>
    s.speaker === speakerIdToRemove
      ? { ...s, speaker: speakerIdToKeep, speakerLabel: keepSpeaker.customName || keepSpeaker.label }
      : s
  );

  return {
    ...transcript,
    speakers: updatedSpeakers,
    segments: updatedSegments,
  };
}

// ============================================
// STORAGE FUNCTIONS
// ============================================

const STORAGE_KEY_PREFIX = 'transcript_';
const CONFIG_STORAGE_KEY = 'transcription_config';

/**
 * Save transcript to localStorage
 */
export function saveTranscript(transcript: FullTranscript): void {
  try {
    localStorage.setItem(
      `${STORAGE_KEY_PREFIX}${transcript.id}`,
      JSON.stringify(transcript)
    );
  } catch (e) {
    console.error('Failed to save transcript:', e);
  }
}

/**
 * Load transcript from localStorage
 */
export function loadTranscript(id: string): FullTranscript | null {
  try {
    const data = localStorage.getItem(`${STORAGE_KEY_PREFIX}${id}`);
    if (data) {
      const transcript = JSON.parse(data);
      transcript.createdAt = new Date(transcript.createdAt);
      return transcript;
    }
  } catch (e) {
    console.error('Failed to load transcript:', e);
  }
  return null;
}

/**
 * List all saved transcripts
 */
export function listSavedTranscripts(): FullTranscript[] {
  const transcripts: FullTranscript[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_KEY_PREFIX)) {
      const transcript = loadTranscript(key.replace(STORAGE_KEY_PREFIX, ''));
      if (transcript) {
        transcripts.push(transcript);
      }
    }
  }

  return transcripts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Delete transcript from localStorage
 */
export function deleteTranscript(id: string): void {
  localStorage.removeItem(`${STORAGE_KEY_PREFIX}${id}`);
}

/**
 * Save transcription config
 */
export function saveTranscriptionConfig(config: Partial<TranscriptionConfig>): void {
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save config:', e);
  }
}

/**
 * Load transcription config
 * Checks localStorage first, then falls back to environment variable
 */
export function loadTranscriptionConfig(): Partial<TranscriptionConfig> | null {
  try {
    const data = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (data) {
      const config = JSON.parse(data);
      // If no API key in localStorage, check env variable
      if (!config.apiKey) {
        const envKey = import.meta.env.VITE_ASSEMBLYAI_API_KEY;
        if (envKey) {
          config.apiKey = envKey;
        }
      }
      return config;
    }
    // No localStorage config, check for env variable
    const envKey = import.meta.env.VITE_ASSEMBLYAI_API_KEY;
    if (envKey) {
      return {
        apiKey: envKey,
        enableDiarization: true,
        punctuate: true,
        formatText: true,
      };
    }
  } catch (e) {
    console.error('Failed to load config:', e);
  }
  return null;
}

/**
 * Check if AssemblyAI API key is configured
 * Checks both localStorage and environment variable
 */
export function isAssemblyAIConfigured(): boolean {
  const config = loadTranscriptionConfig();
  if (config?.apiKey && config.apiKey.length > 10) {
    return true;
  }
  // Also check env variable directly
  const envKey = import.meta.env.VITE_ASSEMBLYAI_API_KEY;
  return !!(envKey && envKey.length > 10);
}
