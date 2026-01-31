/**
 * Sentiment Analysis Module
 * 
 * Provides real-time sentiment analysis for meeting transcripts with support for:
 * - Sentiment scoring (positive/neutral/negative)
 * - Keyword-based analysis with context modifiers
 * - Speaker-level sentiment tracking
 * - Topic-based sentiment association
 * - Emotion detection
 */

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

/**
 * Emotion types that can be detected in text
 */
export type Emotion = 
  | 'excited' 
  | 'confused' 
  | 'concerned' 
  | 'satisfied' 
  | 'frustrated' 
  | 'interested' 
  | 'hesitant';

/**
 * Sentiment classification labels
 */
export type SentimentLabel = 'positive' | 'neutral' | 'negative';

/**
 * Intensity level of sentiment
 */
export type SentimentIntensity = 'mild' | 'moderate' | 'strong';

/**
 * Result of sentiment analysis for a single text segment
 */
export interface SentimentResult {
  /** Classification label */
  label: SentimentLabel;
  /** Sentiment score from -1 (negative) to 1 (positive) */
  score: number;
  /** Confidence in the classification (0-1) */
  confidence: number;
  /** Intensity of the sentiment */
  intensity: SentimentIntensity;
  /** Detected emotions in the text */
  emotions: Emotion[];
  /** Keywords that influenced the sentiment */
  keywords: string[];
}

/**
 * Transcript entry for meeting analysis
 */
export interface TranscriptEntry {
  /** Speaker identifier */
  speaker: string;
  /** Spoken text */
  text: string;
  /** Timestamp of the entry */
  timestamp: Date;
}

/**
 * Comprehensive sentiment analysis result for an entire meeting
 */
export interface MeetingSentimentAnalysis {
  /** Overall meeting sentiment */
  overall: SentimentResult;
  /** Sentiment breakdown by speaker */
  bySpeaker: Record<string, SentimentResult>;
  /** Timeline of sentiment changes */
  timeline: Array<{ timestamp: Date; sentiment: SentimentResult; speaker: string }>;
  /** Detected concerns from the meeting */
  concerns: string[];
  /** Positive highlights from the meeting */
  highlights: string[];
  /** Topic-based sentiment analysis */
  byTopic?: Record<string, SentimentResult>;
}

/**
 * Sentiment stream controller
 */
export interface SentimentStream {
  /** Process new text and trigger update callback */
  processText: (text: string) => void;
  /** Get current accumulated sentiment */
  getCurrentSentiment: () => SentimentResult;
  /** Reset the stream state */
  reset: () => void;
}

// =============================================================================
// KEYWORD DICTIONARIES
// =============================================================================

/**
 * Positive sentiment keywords with their base weights
 */
const POSITIVE_KEYWORDS: Record<string, number> = {
  // General positive
  great: 0.8,
  excellent: 0.9,
  good: 0.6,
  amazing: 0.9,
  awesome: 0.9,
  fantastic: 0.9,
  wonderful: 0.9,
  perfect: 1.0,
  outstanding: 0.9,
  superb: 0.9,
  brilliant: 0.8,
  exceptional: 0.9,
  marvelous: 0.8,
  splendid: 0.8,
  
  // Emotional positive
  excited: 0.85,
  happy: 0.8,
  pleased: 0.7,
  delighted: 0.85,
  thrilled: 0.9,
  glad: 0.6,
  joyful: 0.85,
  love: 0.9,
  loving: 0.85,
  appreciate: 0.7,
  grateful: 0.75,
  
  // Agreement/Approval
  agree: 0.5,
  yes: 0.4,
  absolutely: 0.6,
  definitely: 0.5,
  sure: 0.4,
  right: 0.3,
  correct: 0.4,
  
  // Success/Progress
  success: 0.8,
  successful: 0.8,
  achieve: 0.7,
  accomplished: 0.8,
  progress: 0.6,
  improved: 0.7,
  better: 0.6,
  best: 0.8,
  win: 0.7,
  winning: 0.8,
  
  // Quality
  quality: 0.5,
  efficient: 0.6,
  effective: 0.6,
  smooth: 0.5,
  easy: 0.5,
  clear: 0.4,
  
  // Interest/Engagement
  interested: 0.6,
  fascinating: 0.7,
  impressive: 0.75,
  promising: 0.7,
  opportunity: 0.5,
  potential: 0.5,
};

/**
 * Negative sentiment keywords with their base weights
 */
const NEGATIVE_KEYWORDS: Record<string, number> = {
  // Concern/Worry
  concerned: 0.7,
  worried: 0.75,
  worry: 0.7,
  anxious: 0.7,
  nervous: 0.6,
  uneasy: 0.65,
  afraid: 0.75,
  scared: 0.8,
  
  // Problems/Issues
  problem: 0.7,
  problems: 0.7,
  issue: 0.6,
  issues: 0.6,
  trouble: 0.7,
  difficult: 0.6,
  difficulty: 0.6,
  hard: 0.5,
  challenge: 0.5,
  challenging: 0.55,
  obstacle: 0.6,
  barrier: 0.6,
  
  // Disappointment
  disappointed: 0.75,
  disappointing: 0.7,
  frustrated: 0.8,
  frustration: 0.8,
  upset: 0.7,
  annoyed: 0.65,
  irritated: 0.65,
  angry: 0.85,
  mad: 0.8,
  
  // Negative states
  bad: 0.6,
  terrible: 0.9,
  awful: 0.85,
  horrible: 0.9,
  worst: 1.0,
  poor: 0.7,
  inadequate: 0.75,
  insufficient: 0.7,
  lacking: 0.6,
  missing: 0.5,
  
  // Failure/Setback
  fail: 0.8,
  failed: 0.8,
  failure: 0.85,
  mistake: 0.7,
  error: 0.6,
  wrong: 0.6,
  delay: 0.5,
  delayed: 0.55,
  blocked: 0.6,
  stuck: 0.6,
  
  // Uncertainty/Doubt
  doubt: 0.6,
  uncertain: 0.5,
  unsure: 0.5,
  confused: 0.6,
  confusing: 0.55,
  unclear: 0.5,
  complicated: 0.5,
  complex: 0.4,
  
  // Rejection/Disagreement
  disagree: 0.5,
  no: 0.3,
  never: 0.5,
  cannot: 0.4,
  cant: 0.4,
  impossible: 0.7,
  reject: 0.7,
  deny: 0.6,
  refuse: 0.6,
};

/**
 * Context modifiers that affect keyword weights
 */
const MODIFIERS: Record<string, { multiplier: number; scope: number }> = {
  // Intensifiers (increase following sentiment)
  very: { multiplier: 1.5, scope: 2 },
  extremely: { multiplier: 2.0, scope: 2 },
  incredibly: { multiplier: 1.8, scope: 2 },
  really: { multiplier: 1.4, scope: 2 },
  quite: { multiplier: 1.3, scope: 2 },
  pretty: { multiplier: 1.2, scope: 2 },
  so: { multiplier: 1.5, scope: 2 },
  totally: { multiplier: 1.6, scope: 2 },
  completely: { multiplier: 1.6, scope: 2 },
  absolutely: { multiplier: 1.7, scope: 2 },
  highly: { multiplier: 1.5, scope: 2 },
  deeply: { multiplier: 1.5, scope: 2 },
  strongly: { multiplier: 1.6, scope: 2 },
  
  // Diminishers (decrease following sentiment)
  slightly: { multiplier: 0.5, scope: 2 },
  somewhat: { multiplier: 0.6, scope: 2 },
  a: { multiplier: 0.7, scope: 1 }, // "a bit"
  bit: { multiplier: 0.6, scope: 1 },
  little: { multiplier: 0.5, scope: 2 },
  kind: { multiplier: 0.7, scope: 2 }, // "kind of"
  of: { multiplier: 0.7, scope: 1 },
  sort: { multiplier: 0.7, scope: 2 }, // "sort of"
  fairly: { multiplier: 0.7, scope: 2 },
  relatively: { multiplier: 0.7, scope: 2 },
  
  // Negators (flip sentiment)
  not: { multiplier: -1, scope: 3 },
  no: { multiplier: -1, scope: 2 },
  never: { multiplier: -1, scope: 3 },
  neither: { multiplier: -1, scope: 2 },
  nor: { multiplier: -1, scope: 2 },
  without: { multiplier: -0.8, scope: 3 },
  isnt: { multiplier: -1, scope: 2 },
  isntt: { multiplier: -1, scope: 2 },
  arent: { multiplier: -1, scope: 2 },
  dont: { multiplier: -1, scope: 2 },
  doesnt: { multiplier: -1, scope: 2 },
  didnt: { multiplier: -1, scope: 2 },
  wasnt: { multiplier: -1, scope: 2 },
  werent: { multiplier: -1, scope: 2 },
  cant: { multiplier: -1, scope: 2 },
  cannot: { multiplier: -1, scope: 2 },
  couldnt: { multiplier: -1, scope: 2 },
  wouldnt: { multiplier: -1, scope: 2 },
  shouldnt: { multiplier: -1, scope: 2 },
  wont: { multiplier: -1, scope: 2 },
};

/**
 * Emotion detection patterns
 */
const EMOTION_PATTERNS: Record<Emotion, string[]> = {
  excited: [
    'excited', 'thrilled', 'enthusiastic', 'eager', 'can\'t wait',
    'looking forward', 'pumped', 'psyched', 'stoked', 'hyped',
    'great opportunity', 'amazing chance', 'fantastic news'
  ],
  confused: [
    'confused', 'confusing', 'don\'t understand', 'not sure',
    'unclear', 'puzzled', 'lost', 'what do you mean',
    'could you clarify', 'i don\'t get', 'doesn\'t make sense'
  ],
  concerned: [
    'concerned', 'worried', 'worry', 'anxious', 'nervous',
    'uneasy', 'apprehensive', 'hesitant about', 'risk',
    'potential problem', 'not confident', 'doubts about'
  ],
  satisfied: [
    'satisfied', 'happy with', 'pleased', 'content', 'good with',
    'works for me', 'acceptable', 'meets expectations',
    'exactly what', 'perfect for', 'love it', 'great job'
  ],
  frustrated: [
    'frustrated', 'frustrating', 'annoyed', 'irritated', 'fed up',
    'sick of', 'tired of', 'again and again', 'keeps happening',
    'never works', 'always a problem', 'waste of time'
  ],
  interested: [
    'interested', 'curious', 'intrigued', 'fascinated', 'tell me more',
    'would like to know', 'how does that work', 'interesting',
    'worth exploring', 'worth considering', 'sounds good'
  ],
  hesitant: [
    'hesitant', 'reluctant', 'not sure', 'maybe', 'perhaps',
    'need to think', 'let me consider', 'on the fence',
    'have reservations', 'not convinced', 'skeptical'
  ],
};

/**
 * Topic keywords for topic-based analysis
 */
const TOPIC_KEYWORDS: Record<string, string[]> = {
  budget: ['budget', 'cost', 'costs', 'expensive', 'cheap', 'price', 'pricing', 'money', 'funding', 'financial'],
  timeline: ['timeline', 'deadline', 'schedule', 'date', 'dates', 'delay', 'urgent', 'priority', 'time'],
  quality: ['quality', 'standard', 'standards', 'bug', 'bugs', 'issue', 'error', 'test', 'testing'],
  team: ['team', 'resources', 'staff', 'people', 'personnel', 'hiring', 'capacity', 'workload'],
  technology: ['technology', 'tech', 'system', 'software', 'hardware', 'tool', 'platform', 'integration'],
  security: ['security', 'secure', 'privacy', 'data protection', 'compliance', 'risk', 'vulnerability'],
  design: ['design', 'ui', 'ux', 'interface', 'user experience', 'visual', 'look', 'feel'],
  performance: ['performance', 'speed', 'fast', 'slow', 'optimization', 'efficiency', 'scale'],
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Tokenize text into words (lowercase, remove punctuation)
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s']/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 0);
}

/**
 * Calculate intensity based on sentiment score magnitude
 */
function calculateIntensity(score: number): SentimentIntensity {
  const absScore = Math.abs(score);
  if (absScore < 0.3) return 'mild';
  if (absScore < 0.6) return 'moderate';
  return 'strong';
}

/**
 * Calculate confidence based on keyword matches and score magnitude
 */
function calculateConfidence(
  score: number,
  matchedKeywords: string[],
  wordCount: number
): number {
  const baseConfidence = Math.min(matchedKeywords.length * 0.2, 0.8);
  const scoreConfidence = Math.abs(score) * 0.2;
  const lengthFactor = Math.min(wordCount / 10, 1) * 0.1;
  return Math.min(baseConfidence + scoreConfidence + lengthFactor, 1);
}

/**
 * Determine sentiment label from score
 */
function getLabel(score: number): SentimentLabel {
  if (score > 0.1) return 'positive';
  if (score < -0.1) return 'negative';
  return 'neutral';
}

/**
 * Check if negation applies to a keyword at a given position
 */
function getNegationMultiplier(
  tokens: string[],
  keywordIndex: number
): { multiplier: number; applied: boolean } {
  const lookbackStart = Math.max(0, keywordIndex - 3);
  
  for (let i = keywordIndex - 1; i >= lookbackStart; i--) {
    const token = tokens[i];
    const modifier = MODIFIERS[token];
    
    if (modifier && modifier.multiplier < 0) {
      // Check if this negator is within scope
      if (keywordIndex - i <= modifier.scope) {
        return { multiplier: modifier.multiplier, applied: true };
      }
    }
  }
  
  return { multiplier: 1, applied: false };
}

/**
 * Get intensity multiplier from context
 */
function getIntensityMultiplier(
  tokens: string[],
  keywordIndex: number
): number {
  const lookbackStart = Math.max(0, keywordIndex - 2);
  let multiplier = 1;
  
  for (let i = keywordIndex - 1; i >= lookbackStart; i--) {
    const token = tokens[i];
    const modifier = MODIFIERS[token];
    
    if (modifier && modifier.multiplier > 0) {
      if (keywordIndex - i <= modifier.scope) {
        multiplier *= modifier.multiplier;
      }
    }
  }
  
  return multiplier;
}

// =============================================================================
// MAIN ANALYSIS FUNCTIONS
// =============================================================================

/**
 * Analyze sentiment of a single text segment
 * 
 * Uses keyword-based analysis with context modifiers (intensifiers, diminishers, negators)
 * to determine sentiment label, score, confidence, intensity, and emotions.
 * 
 * @param text - The text to analyze
 * @returns SentimentResult with comprehensive analysis
 * 
 * @example
 * ```typescript
 * const result = analyzeSentiment("This is a great opportunity!");
 * // { label: 'positive', score: 0.8, confidence: 0.6, intensity: 'strong', emotions: ['excited'], keywords: ['great'] }
 * ```
 */
export function analyzeSentiment(text: string): SentimentResult {
  if (!text || text.trim().length === 0) {
    return {
      label: 'neutral',
      score: 0,
      confidence: 0,
      intensity: 'mild',
      emotions: [],
      keywords: [],
    };
  }

  const tokens = tokenize(text);
  let totalScore = 0;
  const matchedKeywords: string[] = [];

  // Analyze each token for sentiment keywords
  tokens.forEach((token, index) => {
    let weight = 0;
    let isNegative = false;

    // Check positive keywords
    if (POSITIVE_KEYWORDS[token]) {
      weight = POSITIVE_KEYWORDS[token];
    }
    // Check negative keywords
    else if (NEGATIVE_KEYWORDS[token]) {
      weight = NEGATIVE_KEYWORDS[token];
      isNegative = true;
    }

    if (weight !== 0) {
      matchedKeywords.push(token);

      // Apply negation
      const { multiplier: negMultiplier } = getNegationMultiplier(tokens, index);
      
      // Apply intensity modifiers
      const intensityMult = getIntensityMultiplier(tokens, index);
      
      // Calculate final weight
      let finalWeight = weight * intensityMult;
      if (negMultiplier < 0) {
        finalWeight = -finalWeight; // Flip sentiment
      }
      
      // Apply negative sign if it was a negative keyword (before negation)
      if (isNegative && negMultiplier > 0) {
        finalWeight = -finalWeight;
      }

      totalScore += finalWeight;
    }
  });

  // Normalize score to -1 to 1 range
  const normalizationFactor = Math.max(tokens.length * 0.1, 1);
  const normalizedScore = Math.max(-1, Math.min(1, totalScore / normalizationFactor));

  // Detect emotions
  const emotions = detectEmotions(text);

  return {
    label: getLabel(normalizedScore),
    score: normalizedScore,
    confidence: calculateConfidence(normalizedScore, matchedKeywords, tokens.length),
    intensity: calculateIntensity(normalizedScore),
    emotions,
    keywords: matchedKeywords,
  };
}

/**
 * Detect emotions in text
 * 
 * Uses pattern matching against emotion-specific keyword phrases
 * to identify emotional states expressed in the text.
 * 
 * @param text - The text to analyze for emotions
 * @returns Array of detected emotions
 * 
 * @example
 * ```typescript
 * const emotions = detectEmotions("I'm excited about this opportunity!");
 * // ['excited']
 * ```
 */
export function detectEmotions(text: string): Emotion[] {
  const lowerText = text.toLowerCase();
  const detectedEmotions: Emotion[] = [];

  for (const [emotion, patterns] of Object.entries(EMOTION_PATTERNS)) {
    for (const pattern of patterns) {
      if (lowerText.includes(pattern.toLowerCase())) {
        detectedEmotions.push(emotion as Emotion);
        break; // Only count each emotion once
      }
    }
  }

  return [...new Set(detectedEmotions)]; // Remove duplicates
}

/**
 * Analyze sentiment for an entire meeting transcript
 * 
 * Processes the complete meeting transcript to provide:
 * - Overall meeting sentiment
 * - Per-speaker sentiment analysis
 * - Timeline of sentiment changes
 * - Detected concerns and highlights
 * - Optional topic-based sentiment
 * 
 * @param transcript - Array of transcript entries with speaker, text, and timestamp
 * @returns Comprehensive meeting sentiment analysis
 * 
 * @example
 * ```typescript
 * const analysis = analyzeMeetingSentiment([
 *   { speaker: "Alice", text: "Great progress everyone!", timestamp: new Date() },
 *   { speaker: "Bob", text: "I'm concerned about the timeline", timestamp: new Date() },
 * ]);
 * ```
 */
export function analyzeMeetingSentiment(
  transcript: TranscriptEntry[]
): MeetingSentimentAnalysis {
  if (!transcript || transcript.length === 0) {
    return {
      overall: {
        label: 'neutral',
        score: 0,
        confidence: 0,
        intensity: 'mild',
        emotions: [],
        keywords: [],
      },
      bySpeaker: {},
      timeline: [],
      concerns: [],
      highlights: [],
    };
  }

  // Analyze each entry
  const analyzedEntries = transcript.map(entry => ({
    ...entry,
    sentiment: analyzeSentiment(entry.text),
  }));

  // Calculate overall sentiment
  const totalScore = analyzedEntries.reduce(
    (sum, entry) => sum + entry.sentiment.score,
    0
  );
  const avgScore = totalScore / analyzedEntries.length;
  const overallEmotions = [
    ...new Set(analyzedEntries.flatMap(e => e.sentiment.emotions)),
  ];
  const allKeywords = [
    ...new Set(analyzedEntries.flatMap(e => e.sentiment.keywords)),
  ];

  const overall: SentimentResult = {
    label: getLabel(avgScore),
    score: avgScore,
    confidence: calculateConfidence(
      avgScore,
      allKeywords,
      analyzedEntries.length * 10
    ),
    intensity: calculateIntensity(avgScore),
    emotions: overallEmotions,
    keywords: allKeywords,
  };

  // Group by speaker
  const speakerScores: Record<
    string,
    { scores: number[]; emotions: Emotion[]; keywords: string[] }
  > = {};

  for (const entry of analyzedEntries) {
    const speaker = entry.speaker;
    if (!speakerScores[speaker]) {
      speakerScores[speaker] = { scores: [], emotions: [], keywords: [] };
    }
    speakerScores[speaker].scores.push(entry.sentiment.score);
    speakerScores[speaker].emotions.push(...entry.sentiment.emotions);
    speakerScores[speaker].keywords.push(...entry.sentiment.keywords);
  }

  const bySpeaker: Record<string, SentimentResult> = {};
  for (const [speaker, data] of Object.entries(speakerScores)) {
    const avgSpeakerScore =
      data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
    bySpeaker[speaker] = {
      label: getLabel(avgSpeakerScore),
      score: avgSpeakerScore,
      confidence: calculateConfidence(
        avgSpeakerScore,
        [...new Set(data.keywords)],
        data.scores.length * 5
      ),
      intensity: calculateIntensity(avgSpeakerScore),
      emotions: [...new Set(data.emotions)],
      keywords: [...new Set(data.keywords)],
    };
  }

  // Build timeline
  const timeline = analyzedEntries.map(entry => ({
    timestamp: entry.timestamp,
    sentiment: entry.sentiment,
    speaker: entry.speaker,
  }));

  // Detect concerns (negative sentiment entries with specific emotions)
  const concerns = analyzedEntries
    .filter(
      entry =>
        entry.sentiment.label === 'negative' &&
        (entry.sentiment.emotions.includes('concerned') ||
          entry.sentiment.emotions.includes('frustrated') ||
          entry.sentiment.intensity === 'strong')
    )
    .map(entry => `${entry.speaker}: ${entry.text}`);

  // Detect highlights (positive sentiment entries)
  const highlights = analyzedEntries
    .filter(
      entry =>
        entry.sentiment.label === 'positive' &&
        (entry.sentiment.intensity === 'moderate' ||
          entry.sentiment.intensity === 'strong')
    )
    .map(entry => `${entry.speaker}: ${entry.text}`);

  // Topic-based analysis
  const byTopic: Record<string, { scores: number[]; keywords: string[] }> = {};
  for (const entry of analyzedEntries) {
    const lowerText = entry.text.toLowerCase();
    for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
      if (keywords.some(kw => lowerText.includes(kw.toLowerCase()))) {
        if (!byTopic[topic]) {
          byTopic[topic] = { scores: [], keywords: [] };
        }
        byTopic[topic].scores.push(entry.sentiment.score);
        byTopic[topic].keywords.push(...entry.sentiment.keywords);
      }
    }
  }

  const byTopicResult: Record<string, SentimentResult> = {};
  for (const [topic, data] of Object.entries(byTopic)) {
    const avgTopicScore =
      data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
    byTopicResult[topic] = {
      label: getLabel(avgTopicScore),
      score: avgTopicScore,
      confidence: calculateConfidence(
        avgTopicScore,
        [...new Set(data.keywords)],
        data.scores.length * 5
      ),
      intensity: calculateIntensity(avgTopicScore),
      emotions: [],
      keywords: [...new Set(data.keywords)],
    };
  }

  return {
    overall,
    bySpeaker,
    timeline,
    concerns: [...new Set(concerns)],
    highlights: [...new Set(highlights)],
    byTopic: byTopicResult,
  };
}

/**
 * Create a real-time sentiment stream
 * 
 * Provides a streaming interface for analyzing sentiment as text arrives
 * in real-time. Useful for live meeting transcription analysis.
 * 
 * @param onUpdate - Callback function triggered when sentiment updates
 * @returns SentimentStream controller with processText, getCurrentSentiment, and reset methods
 * 
 * @example
 * ```typescript
 * const stream = createSentimentStream((sentiment) => {
 *   console.log('Current sentiment:', sentiment.label);
 * });
 * 
 * stream.processText("This is great!");
 * stream.processText("But I'm concerned about...");
 * ```
 */
export function createSentimentStream(
  onUpdate: (sentiment: SentimentResult) => void
): SentimentStream {
  let accumulatedText = '';
  let recentScores: number[] = [];
  const MAX_RECENT_SCORES = 10;

  return {
    processText: (text: string) => {
      // Analyze the new text
      const result = analyzeSentiment(text);
      
      // Update accumulated state
      accumulatedText += ' ' + text;
      recentScores.push(result.score);
      if (recentScores.length > MAX_RECENT_SCORES) {
        recentScores.shift();
      }

      // Calculate moving average for smoother updates
      const avgRecentScore =
        recentScores.reduce((a, b) => a + b, 0) / recentScores.length;

      // Create updated sentiment with moving average
      const updatedSentiment: SentimentResult = {
        ...result,
        score: avgRecentScore * 0.7 + result.score * 0.3, // Weight recent + current
        label: getLabel(avgRecentScore * 0.7 + result.score * 0.3),
        intensity: calculateIntensity(avgRecentScore * 0.7 + result.score * 0.3),
      };

      onUpdate(updatedSentiment);
    },

    getCurrentSentiment: (): SentimentResult => {
      if (!accumulatedText.trim()) {
        return {
          label: 'neutral',
          score: 0,
          confidence: 0,
          intensity: 'mild',
          emotions: [],
          keywords: [],
        };
      }
      return analyzeSentiment(accumulatedText);
    },

    reset: () => {
      accumulatedText = '';
      recentScores = [];
      onUpdate({
        label: 'neutral',
        score: 0,
        confidence: 0,
        intensity: 'mild',
        emotions: [],
        keywords: [],
      });
    },
  };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Detect sentiment shifts in a timeline
 * 
 * Analyzes sentiment changes over time to identify significant shifts
 * from positive to negative or vice versa.
 * 
 * @param timeline - Array of timeline entries with sentiment data
 * @param threshold - Minimum score change to consider a shift (default: 0.5)
 * @returns Array of detected shifts with timestamp and description
 */
export function detectSentimentShifts(
  timeline: Array<{ timestamp: Date; sentiment: SentimentResult; speaker: string }>,
  threshold = 0.5
): Array<{
  timestamp: Date;
  speaker: string;
  from: SentimentLabel;
  to: SentimentLabel;
  change: number;
}> {
  const shifts = [];
  
  for (let i = 1; i < timeline.length; i++) {
    const prev = timeline[i - 1].sentiment;
    const curr = timeline[i].sentiment;
    const change = Math.abs(curr.score - prev.score);
    
    if (change >= threshold && prev.label !== curr.label) {
      shifts.push({
        timestamp: timeline[i].timestamp,
        speaker: timeline[i].speaker,
        from: prev.label,
        to: curr.label,
        change,
      });
    }
  }
  
  return shifts;
}

/**
 * Get sentiment summary statistics
 * 
 * @param analysis - Meeting sentiment analysis result
 * @returns Summary statistics object
 */
export function getSentimentStats(analysis: MeetingSentimentAnalysis): {
  positiveRatio: number;
  negativeRatio: number;
  neutralRatio: number;
  avgConfidence: number;
  dominantEmotion: Emotion | null;
  concernCount: number;
  highlightCount: number;
} {
  const total = analysis.timeline.length;
  const positive = analysis.timeline.filter(t => t.sentiment.label === 'positive').length;
  const negative = analysis.timeline.filter(t => t.sentiment.label === 'negative').length;
  const neutral = analysis.timeline.filter(t => t.sentiment.label === 'neutral').length;
  
  const avgConfidence =
    analysis.timeline.reduce((sum, t) => sum + t.sentiment.confidence, 0) / total || 0;
  
  // Count emotions
  const emotionCounts: Record<string, number> = {};
  analysis.timeline.forEach(t => {
    t.sentiment.emotions.forEach(e => {
      emotionCounts[e] = (emotionCounts[e] || 0) + 1;
    });
  });
  
  const dominantEmotion = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as Emotion || null;
  
  return {
    positiveRatio: positive / total,
    negativeRatio: negative / total,
    neutralRatio: neutral / total,
    avgConfidence,
    dominantEmotion,
    concernCount: analysis.concerns.length,
    highlightCount: analysis.highlights.length,
  };
}

/**
 * Compare sentiment between two speakers
 * 
 * @param analysis - Meeting sentiment analysis result
 * @param speaker1 - First speaker name
 * @param speaker2 - Second speaker name
 * @returns Comparison result or null if speakers not found
 */
export function compareSpeakers(
  analysis: MeetingSentimentAnalysis,
  speaker1: string,
  speaker2: string
): {
  speaker1: SentimentResult;
  speaker2: SentimentResult;
  difference: number;
  morePositive: string;
} | null {
  const s1 = analysis.bySpeaker[speaker1];
  const s2 = analysis.bySpeaker[speaker2];
  
  if (!s1 || !s2) return null;
  
  const difference = Math.abs(s1.score - s2.score);
  const morePositive = s1.score > s2.score ? speaker1 : speaker2;
  
  return {
    speaker1: s1,
    speaker2: s2,
    difference,
    morePositive,
  };
}

// Default export for convenience
export default {
  analyzeSentiment,
  analyzeMeetingSentiment,
  createSentimentStream,
  detectEmotions,
  detectSentimentShifts,
  getSentimentStats,
  compareSpeakers,
};
