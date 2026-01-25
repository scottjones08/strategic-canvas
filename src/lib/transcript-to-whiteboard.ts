/**
 * Transcript to Whiteboard - AI-powered extraction of whiteboard objects from transcripts
 * Analyzes meeting transcripts and generates sticky notes, action items, etc.
 */

import { FullTranscript, TranscriptSegment } from './transcription';

// ============================================
// TYPES
// ============================================

export type WhiteboardCategory = 'idea' | 'action' | 'question' | 'decision' | 'risk' | 'opportunity';

export interface WhiteboardObject {
  id: string;
  type: 'sticky' | 'action' | 'opportunity' | 'risk' | 'frame';
  content: string;
  color: string;
  category: WhiteboardCategory;
  speaker?: string;
  speakerLabel?: string;
  timestamp?: number;
  confidence: number;
  source: string; // Original text snippet
}

export interface ExtractionResult {
  objects: WhiteboardObject[];
  summary?: string;
  topics?: string[];
  participants?: string[];
}

// ============================================
// CATEGORY CONFIGURATION
// ============================================

export const CATEGORY_CONFIG: Record<WhiteboardCategory, {
  nodeType: 'sticky' | 'action' | 'opportunity' | 'risk';
  color: string;
  icon: string;
  label: string;
  keywords: string[];
}> = {
  idea: {
    nodeType: 'sticky',
    color: '#fef3c7', // Yellow
    icon: '💡',
    label: 'Idea',
    keywords: ['idea', 'think', 'could', 'maybe', 'suggest', 'what if', 'consider', 'perhaps', 'might', 'possibility', 'concept', 'thought'],
  },
  action: {
    nodeType: 'action',
    color: '#dcfce7', // Green
    icon: '✅',
    label: 'Action Item',
    keywords: ['will', 'should', 'need to', 'must', 'have to', 'action', 'task', 'todo', 'follow up', 'schedule', 'send', 'create', 'build', 'implement', 'let\'s', 'going to'],
  },
  question: {
    nodeType: 'sticky',
    color: '#dbeafe', // Blue
    icon: '❓',
    label: 'Question',
    keywords: ['?', 'how', 'what', 'why', 'when', 'where', 'who', 'which', 'wonder', 'curious', 'unclear', 'understand'],
  },
  decision: {
    nodeType: 'sticky',
    color: '#f3e8ff', // Purple
    icon: '🎯',
    label: 'Decision',
    keywords: ['decided', 'agreed', 'confirmed', 'approved', 'chosen', 'selected', 'will go with', 'the plan is', 'we\'re going', 'conclusion', 'final'],
  },
  risk: {
    nodeType: 'risk',
    color: '#fee2e2', // Red
    icon: '⚠️',
    label: 'Risk/Concern',
    keywords: ['risk', 'concern', 'worry', 'problem', 'issue', 'challenge', 'difficult', 'obstacle', 'blocker', 'danger', 'warning', 'careful', 'might fail'],
  },
  opportunity: {
    nodeType: 'opportunity',
    color: '#d1fae5', // Teal/Green
    icon: '🚀',
    label: 'Opportunity',
    keywords: ['opportunity', 'potential', 'could be great', 'advantage', 'benefit', 'upside', 'growth', 'expand', 'improve', 'optimize', 'leverage'],
  },
};

// ============================================
// LOCAL EXTRACTION (Pattern-based, no AI needed)
// ============================================

/**
 * Extract whiteboard objects using keyword patterns (no AI required)
 */
export function extractWithPatterns(transcript: FullTranscript): ExtractionResult {
  const objects: WhiteboardObject[] = [];
  const seenContent = new Set<string>();

  // Process each segment
  transcript.segments.forEach((segment) => {
    const text = segment.text.trim();
    if (text.length < 10) return; // Skip very short segments

    // Check each category
    for (const [category, config] of Object.entries(CATEGORY_CONFIG)) {
      const lowerText = text.toLowerCase();
      const matchedKeywords = config.keywords.filter(kw => lowerText.includes(kw));
      
      if (matchedKeywords.length > 0) {
        // Calculate confidence based on keyword matches
        const confidence = Math.min(0.9, 0.5 + matchedKeywords.length * 0.15);
        
        // Extract the relevant part (sentence containing keywords)
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
        
        sentences.forEach(sentence => {
          const sentenceLower = sentence.toLowerCase();
          const hasKeyword = matchedKeywords.some(kw => sentenceLower.includes(kw));
          
          if (hasKeyword) {
            const cleanContent = sentence.trim();
            const contentKey = cleanContent.toLowerCase().substring(0, 50);
            
            // Avoid duplicates
            if (!seenContent.has(contentKey)) {
              seenContent.add(contentKey);
              
              objects.push({
                id: generateId(),
                type: config.nodeType,
                content: cleanContent,
                color: config.color,
                category: category as WhiteboardCategory,
                speaker: segment.speaker,
                speakerLabel: segment.speakerLabel,
                timestamp: segment.startTime,
                confidence,
                source: text,
              });
            }
          }
        });
      }
    }
  });

  // Deduplicate and sort by confidence
  const uniqueObjects = deduplicateObjects(objects);
  uniqueObjects.sort((a, b) => b.confidence - a.confidence);

  // Extract unique speakers
  const participants = [...new Set(transcript.speakers.map(s => s.customName || s.label))];

  return {
    objects: uniqueObjects,
    participants,
  };
}

// ============================================
// AI-POWERED EXTRACTION
// ============================================

const AI_EXTRACTION_PROMPT = `Analyze this meeting transcript and extract key items for a visual whiteboard.

For each item, provide:
- category: one of "idea", "action", "question", "decision", "risk", "opportunity"
- content: a clear, concise summary (1-2 sentences max)
- confidence: 0.0-1.0 how confident you are this is correctly categorized
- speaker: who said it (if identifiable)

Categories explained:
- idea: Creative thoughts, suggestions, possibilities
- action: Tasks, to-dos, commitments to do something
- question: Unanswered questions, things to explore
- decision: Confirmed decisions, agreements made
- risk: Concerns, potential problems, challenges
- opportunity: Potential benefits, growth areas, advantages

Return JSON array of objects. Maximum 15-20 items, prioritize the most important.

TRANSCRIPT:
{transcript}

Return only valid JSON array, no other text.`;

/**
 * Extract whiteboard objects using AI (Claude/OpenAI)
 */
export async function extractWithAI(
  transcript: FullTranscript,
  apiKey?: string,
  model: 'claude' | 'openai' = 'claude'
): Promise<ExtractionResult> {
  // Format transcript for AI
  const transcriptText = formatTranscriptForAI(transcript);
  
  if (!apiKey) {
    console.warn('No AI API key provided, falling back to pattern extraction');
    return extractWithPatterns(transcript);
  }

  try {
    const prompt = AI_EXTRACTION_PROMPT.replace('{transcript}', transcriptText);
    
    let response: any;
    
    if (model === 'claude') {
      response = await callClaudeAPI(prompt, apiKey);
    } else {
      response = await callOpenAIAPI(prompt, apiKey);
    }

    // Parse AI response
    const items = parseAIResponse(response);
    
    // Convert to WhiteboardObjects
    const objects: WhiteboardObject[] = items.map((item: any) => {
      const category = item.category as WhiteboardCategory;
      const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.idea;
      
      return {
        id: generateId(),
        type: config.nodeType,
        content: item.content,
        color: config.color,
        category,
        speaker: item.speaker,
        speakerLabel: item.speaker,
        confidence: item.confidence || 0.8,
        source: item.source || '',
      };
    });

    return {
      objects,
      participants: [...new Set(transcript.speakers.map(s => s.customName || s.label))],
    };

  } catch (error) {
    console.error('AI extraction failed, falling back to patterns:', error);
    return extractWithPatterns(transcript);
  }
}

/**
 * Call Claude API
 */
async function callClaudeAPI(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

/**
 * Call OpenAI API
 */
async function callOpenAIAPI(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * Parse AI response (handles various JSON formats)
 */
function parseAIResponse(response: string): any[] {
  // Try to extract JSON from response
  const jsonMatch = response.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error('Failed to parse AI response JSON:', e);
    }
  }
  return [];
}

// ============================================
// LAYOUT GENERATION
// ============================================

export interface LayoutConfig {
  startX: number;
  startY: number;
  nodeWidth: number;
  nodeHeight: number;
  horizontalGap: number;
  verticalGap: number;
  maxColumns: number;
  groupByCategory: boolean;
}

const DEFAULT_LAYOUT: LayoutConfig = {
  startX: 100,
  startY: 100,
  nodeWidth: 200,
  nodeHeight: 150,
  horizontalGap: 30,
  verticalGap: 30,
  maxColumns: 4,
  groupByCategory: true,
};

/**
 * Generate positions for whiteboard objects
 */
export function generateLayout(
  objects: WhiteboardObject[],
  config: Partial<LayoutConfig> = {}
): Array<WhiteboardObject & { x: number; y: number; width: number; height: number }> {
  const layout = { ...DEFAULT_LAYOUT, ...config };
  
  if (layout.groupByCategory) {
    return layoutByCategory(objects, layout);
  } else {
    return layoutGrid(objects, layout);
  }
}

/**
 * Layout objects in a simple grid
 */
function layoutGrid(
  objects: WhiteboardObject[],
  layout: LayoutConfig
): Array<WhiteboardObject & { x: number; y: number; width: number; height: number }> {
  return objects.map((obj, index) => {
    const col = index % layout.maxColumns;
    const row = Math.floor(index / layout.maxColumns);
    
    return {
      ...obj,
      x: layout.startX + col * (layout.nodeWidth + layout.horizontalGap),
      y: layout.startY + row * (layout.nodeHeight + layout.verticalGap),
      width: layout.nodeWidth,
      height: layout.nodeHeight,
    };
  });
}

/**
 * Layout objects grouped by category with frames
 */
function layoutByCategory(
  objects: WhiteboardObject[],
  layout: LayoutConfig
): Array<WhiteboardObject & { x: number; y: number; width: number; height: number }> {
  const result: Array<WhiteboardObject & { x: number; y: number; width: number; height: number }> = [];
  
  // Group by category
  const grouped = new Map<WhiteboardCategory, WhiteboardObject[]>();
  objects.forEach(obj => {
    const existing = grouped.get(obj.category) || [];
    existing.push(obj);
    grouped.set(obj.category, existing);
  });

  // Category order for layout
  const categoryOrder: WhiteboardCategory[] = ['decision', 'action', 'idea', 'opportunity', 'question', 'risk'];
  
  let currentY = layout.startY;
  
  categoryOrder.forEach(category => {
    const items = grouped.get(category);
    if (!items || items.length === 0) return;
    
    const config = CATEGORY_CONFIG[category];
    const frameWidth = Math.min(items.length, layout.maxColumns) * (layout.nodeWidth + layout.horizontalGap) + layout.horizontalGap;
    const frameRows = Math.ceil(items.length / layout.maxColumns);
    const frameHeight = frameRows * (layout.nodeHeight + layout.verticalGap) + 80; // Extra for title
    
    // Add category frame
    result.push({
      id: generateId(),
      type: 'frame',
      content: `${config.icon} ${config.label}s`,
      color: config.color,
      category,
      confidence: 1,
      source: '',
      x: layout.startX - layout.horizontalGap,
      y: currentY - 50,
      width: frameWidth,
      height: frameHeight,
    });
    
    // Add items within frame
    items.forEach((obj, index) => {
      const col = index % layout.maxColumns;
      const row = Math.floor(index / layout.maxColumns);
      
      result.push({
        ...obj,
        x: layout.startX + col * (layout.nodeWidth + layout.horizontalGap),
        y: currentY + row * (layout.nodeHeight + layout.verticalGap),
        width: layout.nodeWidth,
        height: layout.nodeHeight,
      });
    });
    
    currentY += frameHeight + layout.verticalGap * 2;
  });
  
  return result;
}

// ============================================
// UTILITIES
// ============================================

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

/**
 * Format transcript for AI consumption
 */
function formatTranscriptForAI(transcript: FullTranscript): string {
  return transcript.segments
    .map(seg => {
      const speaker = seg.speakerLabel || 'Unknown';
      const time = formatTimestamp(seg.startTime);
      return `[${time}] ${speaker}: ${seg.text}`;
    })
    .join('\n');
}

function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Remove duplicate/similar objects
 */
function deduplicateObjects(objects: WhiteboardObject[]): WhiteboardObject[] {
  const seen = new Map<string, WhiteboardObject>();
  
  objects.forEach(obj => {
    // Create a simplified key for comparison
    const key = obj.content.toLowerCase().substring(0, 40) + obj.category;
    
    if (!seen.has(key) || seen.get(key)!.confidence < obj.confidence) {
      seen.set(key, obj);
    }
  });
  
  return Array.from(seen.values());
}

// ============================================
// TRANSCRIPT ENTRY SUPPORT (Legacy)
// ============================================

export interface TranscriptEntry {
  id: string;
  speaker: string;
  text: string;
  timestamp: number;
}

/**
 * Convert legacy TranscriptEntry[] to FullTranscript format
 */
export function convertToFullTranscript(
  entries: TranscriptEntry[],
  participants: { id: string; name: string; color: string }[]
): FullTranscript {
  const speakerMap = new Map(participants.map(p => [p.id, p]));
  
  return {
    id: generateId(),
    segments: entries.map((entry, index) => ({
      id: `${entry.id}-${index}`,
      speaker: entry.speaker,
      speakerLabel: speakerMap.get(entry.speaker)?.name || 'Unknown',
      text: entry.text,
      startTime: entry.timestamp * 1000, // Convert seconds to ms
      endTime: entry.timestamp * 1000,
      confidence: 0.9,
    })),
    speakers: participants.map(p => ({
      id: p.id,
      label: p.name,
      color: p.color,
    })),
    duration: entries.length > 0 ? entries[entries.length - 1].timestamp * 1000 : 0,
    createdAt: new Date(),
    status: 'completed',
  };
}

/**
 * Extract from any transcript format
 */
export function extractFromAnyTranscript(
  transcript: FullTranscript | TranscriptEntry[],
  participants?: { id: string; name: string; color: string }[]
): ExtractionResult {
  let fullTranscript: FullTranscript;
  
  if (Array.isArray(transcript)) {
    fullTranscript = convertToFullTranscript(transcript, participants || []);
  } else {
    fullTranscript = transcript;
  }
  
  return extractWithPatterns(fullTranscript);
}

/**
 * Get transcript text and speaker map for extraction
 */
export function getTranscriptTextAndSpeakers(
  transcript: FullTranscript | TranscriptEntry[],
  options?: { includeTimestamps?: boolean; includeSpeakers?: boolean }
): { text: string; speakerMap: Map<number, string> } {
  const speakerMap = new Map<number, string>();
  
  // Handle FullTranscript
  if ('segments' in transcript && Array.isArray(transcript.segments)) {
    const segments = transcript.segments as TranscriptSegment[];
    let text = '';
    segments.forEach((segment) => {
      if (options?.includeSpeakers && segment.speakerLabel) {
        speakerMap.set(text.length, segment.speakerLabel);
        text += `[${segment.speakerLabel}]: `;
      }
      if (options?.includeTimestamps && segment.startTime !== undefined) {
        text += `(${formatTimestamp(segment.startTime)}) `;
      }
      text += segment.text + ' ';
    });
    return { text, speakerMap };
  }
  
  // Handle TranscriptEntry[] array
  if (Array.isArray(transcript)) {
    let text = '';
    (transcript as TranscriptEntry[]).forEach((entry) => {
      if (options?.includeSpeakers) {
        speakerMap.set(text.length, entry.speaker);
        text += `[${entry.speaker}]: `;
      }
      if (options?.includeTimestamps) {
        text += `(${formatTimestamp(entry.timestamp * 1000)}) `;
      }
      text += entry.text + ' ';
    });
    return { text, speakerMap };
  }
  
  return { text: '', speakerMap };
}
