/**
 * AI Task Extraction Utility
 * 
 * Provides intelligent task extraction from meeting transcripts using
 * pattern-based detection and optional OpenAI GPT-4 integration for
 * advanced natural language understanding.
 * 
 * @module ai-task-extraction
 */

// Simple UUID generator (no external dependency)
function generateId(): string {
  return 'task-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Represents a single utterance in a meeting transcript
 */
export interface TranscriptSegment {
  speaker: string;
  text: string;
  timestamp: Date;
}

/**
 * Priority levels for extracted tasks
 */
export type TaskPriority = 'high' | 'medium' | 'low';

/**
 * Task categories for auto-classification
 */
export type TaskCategory = 
  | 'follow-up' 
  | 'research' 
  | 'document' 
  | 'review' 
  | 'decision' 
  | 'other';

/**
 * Extracted task with metadata
 */
export interface ExtractedTask {
  /** Unique identifier for the task */
  id: string;
  /** Cleaned task description */
  text: string;
  /** Assigned person (if detected) */
  assignee?: string;
  /** Due date (if extracted) */
  dueDate?: Date;
  /** Priority level */
  priority: TaskPriority;
  /** Auto-assigned category */
  category: TaskCategory;
  /** Confidence score (0-1) */
  confidence: number;
  /** Original source text */
  sourceText: string;
  /** Speaker who mentioned the task */
  speaker: string;
  /** When the task was mentioned */
  timestamp: Date;
}

/**
 * Options for task extraction
 */
export interface ExtractionOptions {
  /** Use OpenAI API for advanced extraction */
  useAI?: boolean;
  /** OpenAI API key (required if useAI is true) */
  apiKey?: string;
  /** Known participants for better assignee detection */
  knownParticipants?: string[];
  /** Minimum confidence threshold (0-1) */
  minConfidence?: number;
  /** Context window size (sentences before/after) */
  contextWindow?: number;
}

/**
 * Internal pattern match result
 */
interface PatternMatch {
  text: string;
  startIndex: number;
  endIndex: number;
  pattern: string;
  confidence: number;
}

// ============================================================================
// Pattern Definitions
// ============================================================================

/**
 * Patterns that indicate a task or action item
 * Organized by confidence level (higher = more certain it's a task)
 */
const TASK_PATTERNS: Array<{ pattern: RegExp; confidence: number; type: string }> = [
  // High confidence - explicit action items
  { pattern: /\b(action item|action item:|todo:|todo\s|task:|task\s)\s*(.+?)(?=\.|$|;|\n)/i, confidence: 0.95, type: 'explicit' },
  { pattern: /\b(need to|needs to|needed to)\s+(.+?)(?=\.|$|;|\n)/i, confidence: 0.9, type: 'obligation' },
  { pattern: /\b(will|ll|shall)\s+(.+?)(?=\.|$|;|\n)/i, confidence: 0.85, type: 'commitment' },
  { pattern: /\b(going to|gonna)\s+(.+?)(?=\.|$|;|\n)/i, confidence: 0.85, type: 'intent' },
  { pattern: /\b(should|ought to|must|have to|has to)\s+(.+?)(?=\.|$|;|\n)/i, confidence: 0.8, type: 'recommendation' },
  
  // Medium confidence - collaborative language
  { pattern: /\b(let's|lets)\s+(.+?)(?=\.|$|;|\n)/i, confidence: 0.75, type: 'collaborative' },
  { pattern: /\b(can you|could you|would you|will you)\s+(.+?)(?=\.|$|\?|;|\n)/i, confidence: 0.75, type: 'request' },
  { pattern: /\b(remind me to|remind us to|don'?t forget to)\s+(.+?)(?=\.|$|;|\n)/i, confidence: 0.8, type: 'reminder' },
  { pattern: /\b(make sure to|be sure to|ensure that)\s+(.+?)(?=\.|$|;|\n)/i, confidence: 0.75, type: 'emphasis' },
  
  // Lower confidence - suggestions and ideas
  { pattern: /\b(we could|we should|we need|we might want to)\s+(.+?)(?=\.|$|;|\n)/i, confidence: 0.65, type: 'suggestion' },
  { pattern: /\b(i'?ll|i will|i am going to)\s+(.+?)(?=\.|$|;|\n)/i, confidence: 0.7, type: 'personal_commitment' },
  { pattern: /\b(follow up|follow-up)\s+(?:on|with)?\s*(.+?)(?=\.|$|;|\n)/i, confidence: 0.8, type: 'followup' },
  { pattern: /\b(schedule|set up|arrange|plan)\s+(?:a|an|the)?\s*(.+?)(?=\.|$|;|\n)/i, confidence: 0.7, type: 'planning' },
];

/**
 * Patterns that indicate a question (false positives)
 */
const QUESTION_PATTERNS: RegExp[] = [
  /\b(do you|does anyone|can someone|would anyone|has anyone)\s/i,
  /\b(what|where|when|why|how|who|which)\s/i,
  /\?\s*$/,
  /\b(wondering if|curious if|asking if)\s/i,
];

/**
 * Patterns for hypothetical statements (false positives)
 */
const HYPOTHETICAL_PATTERNS: RegExp[] = [
  /\b(if|when|in case|suppose|assuming|maybe|perhaps)\s/i,
  /\b(might|could possibly|would potentially)\s/i,
  /\b(just thinking|just wondering)\s/i,
];

/**
 * Priority indicators
 */
const PRIORITY_PATTERNS: Record<TaskPriority, RegExp[]> = {
  high: [
    /\b(urgent|asap|a\.s\.a\.p\.|critical|crucial|imperative|immediately|right away|top priority)\b/i,
    /\b(end of day|eod|by today|by noon)\b/i,
    /\b(blocking|blocked|blocking issue)\b/i,
  ],
  medium: [
    /\b(important|priority|needed soon|this week|timely)\b/i,
    /\b(should get to|try to|aim to)\b/i,
  ],
  low: [
    /\b(when you get a chance|whenever|no rush|not urgent|low priority|someday|eventually)\b/i,
    /\b(nice to have|if time permits|if possible)\b/i,
  ],
};

/**
 * Category patterns for auto-classification
 */
const CATEGORY_PATTERNS: Record<TaskCategory, RegExp[]> = {
  'follow-up': [
    /\b(follow up|follow-up|followup|check back|get back to|reach out to|contact)\b/i,
    /\b(schedule|set up a meeting|book a call|arrange a time)\b/i,
    /\b(send|email|call|message|ping)\s+(?:them|him|her|everyone|the team)\b/i,
  ],
  'research': [
    /\b(research|look into|investigate|find out|learn about|explore|check out|read up on)\b/i,
    /\b(analyze|evaluate|assess|compare options|get quotes|get estimates)\b/i,
    /\b(gather information|collect data|do some digging)\b/i,
  ],
  'document': [
    /\b(write|draft|create|prepare|compile|put together)\s+(?:a|an|the)?\s*(doc|document|report|proposal|spec|specification|brief|memo|email|note)\b/i,
    /\b(documentation|docs|readme|wiki|guide|manual)\b/i,
    /\b(update|revise|edit|proofread)\s+(?:the|a|an)?\s*(doc|document|report|spec)\b/i,
  ],
  'review': [
    /\b(review|go over|look at|take a look|check|audit|inspect)\b/i,
    /\b(approve|sign off on|give feedback on|provide input on)\b/i,
    /\b(PR|pull request|code review|design review)\b/i,
  ],
  'decision': [
    /\b(decide|decision|make a call|choose|select|pick|finalize|confirm|approve)\b/i,
    /\b(figure out|determine|resolve|settle on|agree on|align on)\b/i,
  ],
  'other': [],
};

/**
 * Due date extraction patterns
 */
const DUE_DATE_PATTERNS: Array<{ pattern: RegExp; parser: (match: RegExpMatchArray, baseDate: Date) => Date | null }> = [
  // Specific days of week
  {
    pattern: /\b(by\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
    parser: (match, baseDate) => {
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const targetDay = days.indexOf(match[2].toLowerCase());
      if (targetDay === -1) return null;
      
      const date = new Date(baseDate);
      const currentDay = date.getDay();
      let daysUntil = targetDay - currentDay;
      if (daysUntil <= 0) daysUntil += 7; // Next week
      date.setDate(date.getDate() + daysUntil);
      date.setHours(17, 0, 0, 0); // End of business day
      return date;
    }
  },
  // Tomorrow
  {
    pattern: /\b(by\s+)?tomorrow\b/i,
    parser: (_, baseDate) => {
      const date = new Date(baseDate);
      date.setDate(date.getDate() + 1);
      date.setHours(17, 0, 0, 0);
      return date;
    }
  },
  // Next week
  {
    pattern: /\b(next week|by next week)\b/i,
    parser: (_, baseDate) => {
      const date = new Date(baseDate);
      date.setDate(date.getDate() + 7);
      date.setHours(17, 0, 0, 0);
      return date;
    }
  },
  // This week
  {
    pattern: /\b(this week|by end of week|eow|by friday)\b/i,
    parser: (_, baseDate) => {
      const date = new Date(baseDate);
      const daysUntilFriday = 5 - date.getDay();
      if (daysUntilFriday >= 0) {
        date.setDate(date.getDate() + daysUntilFriday);
      } else {
        date.setDate(date.getDate() + daysUntilFriday + 7);
      }
      date.setHours(17, 0, 0, 0);
      return date;
    }
  },
  // End of day
  {
    pattern: /\b(by\s+)?(end of day|eod|by close of business|cob)\b/i,
    parser: (_, baseDate) => {
      const date = new Date(baseDate);
      date.setHours(17, 0, 0, 0);
      return date;
    }
  },
  // Next month
  {
    pattern: /\b(next month|by next month)\b/i,
    parser: (_, baseDate) => {
      const date = new Date(baseDate);
      date.setMonth(date.getMonth() + 1);
      date.setDate(1);
      date.setHours(17, 0, 0, 0);
      return date;
    }
  },
  // Specific date formats (e.g., "by Jan 15", "by 1/15", "by January 15th")
  {
    pattern: /\b(by\s+)?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*(\d{1,2})(?:st|nd|rd|th)?\b/i,
    parser: (match, baseDate) => {
      const months: Record<string, number> = {
        jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
        jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
      };
      const month = months[match[2].toLowerCase().slice(0, 3)];
      const day = parseInt(match[3], 10);
      
      if (month === undefined || isNaN(day)) return null;
      
      const date = new Date(baseDate);
      date.setMonth(month);
      date.setDate(day);
      date.setHours(17, 0, 0, 0);
      
      // If date has passed, assume next year
      if (date < baseDate) {
        date.setFullYear(date.getFullYear() + 1);
      }
      
      return date;
    }
  },
  // Numeric date format (MM/DD or MM/DD/YY)
  {
    pattern: /\b(by\s+)?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/,
    parser: (match, baseDate) => {
      const month = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      const year = match[4] ? parseInt(match[4], 10) : baseDate.getFullYear();
      
      if (isNaN(month) || isNaN(day)) return null;
      
      const fullYear = year < 100 ? (year < 50 ? 2000 + year : 1900 + year) : year;
      
      const date = new Date(fullYear, month, day, 17, 0, 0, 0);
      return date;
    }
  },
  // In X days/weeks
  {
    pattern: /\b(in\s+(\d+)\s+(day|days|week|weeks))\b/i,
    parser: (match, baseDate) => {
      const amount = parseInt(match[2], 10);
      const unit = match[3].toLowerCase();
      
      const date = new Date(baseDate);
      if (unit.startsWith('week')) {
        date.setDate(date.getDate() + amount * 7);
      } else {
        date.setDate(date.getDate() + amount);
      }
      date.setHours(17, 0, 0, 0);
      return date;
    }
  },
];

/**
 * Common name patterns for assignee extraction
 */
const NAME_INDICATORS = [
  /^([A-Z][a-z]+)\s+(will|is going to|needs to|should|can|could)/,
  /\b([A-Z][a-z]+)\s+(?:and|&)\s+([A-Z][a-z]+)\s+(will|are going to|need to|should)/,
  /\b(assign\s+(?:this|it)\s+to|give\s+(?:this|it)\s+to|pass\s+(?:this|it)\s+to)\s+([A-Z][a-z]+)/i,
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generates a unique ID for tasks
 */
function generateTaskId(): string {
  return `task_${generateId().slice(0, 8)}`;
}

/**
 * Checks if text appears to be a question
 */
function isQuestion(text: string): boolean {
  return QUESTION_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * Checks if text appears to be hypothetical
 */
function isHypothetical(text: string): boolean {
  return HYPOTHETICAL_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * Cleans and normalizes extracted task text
 */
function cleanTaskText(text: string): string {
  return text
    .replace(/^[,\s]+|[,\s]+$/g, '') // Trim punctuation/spaces
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/^\w/, c => c.toUpperCase()) // Capitalize first letter
    .trim();
}

/**
 * Calculates text similarity using Jaccard index
 */
function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

/**
 * Deduplicates tasks based on similarity
 */
function deduplicateTasks(tasks: ExtractedTask[], threshold = 0.7): ExtractedTask[] {
  const unique: ExtractedTask[] = [];
  
  for (const task of tasks) {
    const isDuplicate = unique.some(existing => 
      calculateSimilarity(task.text, existing.text) >= threshold
    );
    
    if (!isDuplicate) {
      unique.push(task);
    }
  }
  
  return unique;
}

// ============================================================================
// Extraction Functions
// ============================================================================

/**
 * Extracts the due date from text
 * 
 * @param text - The text to analyze
 * @returns Date object if found, null otherwise
 * 
 * @example
 * ```typescript
 * extractDueDate("We need to finish this by Friday");
 * // Returns Date for next Friday at 5 PM
 * 
 * extractDueDate("Let's meet tomorrow");
 * // Returns Date for tomorrow at 5 PM
 * ```
 */
export function extractDueDate(text: string): Date | null {
  const baseDate = new Date();
  
  for (const { pattern, parser } of DUE_DATE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const date = parser(match, baseDate);
      if (date && !isNaN(date.getTime())) {
        return date;
      }
    }
  }
  
  return null;
}

/**
 * Extracts the assignee from text
 * 
 * Uses known participants list for better accuracy, but also attempts
 * to detect names using common patterns.
 * 
 * @param text - The text to analyze
 * @param knownParticipants - Array of known participant names
 * @returns Assignee name if found, null otherwise
 * 
 * @example
 * ```typescript
 * extractAssignee("John will handle the report", ["John", "Sarah"]);
 * // Returns "John"
 * 
 * extractAssignee("We should ask Sarah to review", ["John", "Sarah"]);
 * // Returns "Sarah"
 * ```
 */
export function extractAssignee(
  text: string,
  knownParticipants: string[] = []
): string | null {
  const normalizedText = text.toLowerCase();
  
  // First check known participants
  for (const participant of knownParticipants) {
    const normalizedName = participant.toLowerCase();
    // Look for name at start or after common verbs/prepositions
    const patterns = [
      new RegExp(`^${normalizedName}\\b`, 'i'),
      new RegExp(`\\b${normalizedName}\\s+(?:will|is|can|should|needs to)`, 'i'),
      new RegExp(`(?:assign|give|pass)(?:\\s+this)?(?:\\s+to)?\\s+${normalizedName}\\b`, 'i'),
      new RegExp(`(?:ask|have|get)\\s+${normalizedName}\\s+(?:to|for)`, 'i'),
    ];
    
    for (const pattern of patterns) {
      if (pattern.test(normalizedText)) {
        return participant;
      }
    }
  }
  
  // Try pattern-based name extraction
  for (const pattern of NAME_INDICATORS) {
    const match = text.match(pattern);
    if (match) {
      // Return the first capitalized name found
      for (const group of match.slice(1)) {
        if (group && /^[A-Z][a-z]+$/.test(group)) {
          return group;
        }
      }
    }
  }
  
  // Look for "I will/I'm going to" patterns (self-assignment)
  if (/\b(i'll|i will|i'm going to|i am going to)\b/i.test(text)) {
    return null; // Will be set from speaker context
  }
  
  return null;
}

/**
 * Extracts priority level from text
 * 
 * @param text - The text to analyze
 * @returns Priority level ('high', 'medium', or 'low')
 * 
 * @example
 * ```typescript
 * extractPriority("This is urgent and needs to be done ASAP");
 * // Returns 'high'
 * 
 * extractPriority("When you get a chance, review this");
 * // Returns 'low'
 * ```
 */
export function extractPriority(text: string): TaskPriority {
  const normalizedText = text.toLowerCase();
  
  // Check high priority first
  for (const pattern of PRIORITY_PATTERNS.high) {
    if (pattern.test(normalizedText)) {
      return 'high';
    }
  }
  
  // Check low priority
  for (const pattern of PRIORITY_PATTERNS.low) {
    if (pattern.test(normalizedText)) {
      return 'low';
    }
  }
  
  // Check medium priority
  for (const pattern of PRIORITY_PATTERNS.medium) {
    if (pattern.test(normalizedText)) {
      return 'medium';
    }
  }
  
  // Default to medium
  return 'medium';
}

/**
 * Auto-categorizes a task based on its text content
 * 
 * @param text - The task text
 * @returns Task category
 */
function categorizeTask(text: string): TaskCategory {
  const normalizedText = text.toLowerCase();
  
  const scores: Record<TaskCategory, number> = {
    'follow-up': 0,
    'research': 0,
    'document': 0,
    'review': 0,
    'decision': 0,
    'other': 0.1, // Small base score
  };
  
  // Score each category
  for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(normalizedText)) {
        scores[category as TaskCategory] += 1;
      }
    }
  }
  
  // Return category with highest score
  return (Object.entries(scores)
    .sort((a, b) => b[1] - a[1])[0][0] as TaskCategory);
}

/**
 * Adjusts confidence based on context
 */
function adjustConfidence(
  baseConfidence: number,
  text: string,
  context: string[] = []
): number {
  let adjusted = baseConfidence;
  
  // Penalize questions
  if (isQuestion(text)) {
    adjusted -= 0.3;
  }
  
  // Penalize hypotheticals
  if (isHypothetical(text)) {
    adjusted -= 0.2;
  }
  
  // Boost if clear deadline mentioned
  if (extractDueDate(text)) {
    adjusted += 0.05;
  }
  
  // Boost if assignee mentioned
  if (extractAssignee(text)) {
    adjusted += 0.05;
  }
  
  // Boost if priority mentioned
  if (extractPriority(text) !== 'medium') {
    adjusted += 0.05;
  }
  
  // Check context for confirmation
  const fullContext = context.join(' ').toLowerCase();
  if (/\b(agreed|yes|sounds good|will do|on it|got it)\b/.test(fullContext)) {
    adjusted += 0.1;
  }
  
  // Clamp to 0-1 range
  return Math.max(0, Math.min(1, adjusted));
}

/**
 * Extracts tasks from a single text utterance
 * 
 * Uses pattern matching to identify task-indicating phrases and
 * extracts relevant metadata (assignee, due date, priority, category).
 * 
 * @param text - The text to analyze
 * @param speaker - The speaker's name
 * @param knownParticipants - Array of known meeting participants
 * @param context - Surrounding text for context
 * @returns Array of extracted tasks
 * 
 * @example
 * ```typescript
 * extractTasksFromText(
 *   "I'll need to finish the report by Friday",
 *   "John",
 *   ["John", "Sarah"]
 * );
 * // Returns task with assignee "John", due date next Friday
 * ```
 */
export function extractTasksFromText(
  text: string,
  speaker: string,
  knownParticipants: string[] = [],
  context: string[] = []
): ExtractedTask[] {
  const tasks: ExtractedTask[] = [];
  const normalizedText = text.trim();
  
  // Skip very short texts
  if (normalizedText.length < 10) {
    return tasks;
  }
  
  for (const { pattern, confidence, type } of TASK_PATTERNS) {
    // Create a copy of the pattern to match globally
    const globalPattern = new RegExp(pattern.source, 'gi');
    let match;
    
    while ((match = globalPattern.exec(normalizedText)) !== null) {
      // Extract the task text (usually the second capture group)
      let taskText = match[2] || match[1] || match[0];
      
      // Clean up the extracted text
      taskText = cleanTaskText(taskText);
      
      // Skip if too short or looks like a false positive
      if (taskText.length < 5 || isQuestion(taskText)) {
        continue;
      }
      
      // Adjust confidence based on context
      const finalConfidence = adjustConfidence(confidence, text, context);
      
      // Extract metadata
      const assignee = extractAssignee(text, knownParticipants) || 
        (type === 'personal_commitment' ? speaker : undefined);
      const dueDate = extractDueDate(text);
      const priority = extractPriority(text);
      const category = categorizeTask(taskText);
      
      const task: ExtractedTask = {
        id: generateTaskId(),
        text: taskText,
        assignee,
        dueDate: dueDate || undefined,
        priority,
        category,
        confidence: finalConfidence,
        sourceText: text,
        speaker,
        timestamp: new Date(),
      };
      
      tasks.push(task);
    }
  }
  
  return tasks;
}

/**
 * Extracts tasks from a full transcript using local pattern matching
 * 
 * @param transcript - Array of transcript segments
 * @param knownParticipants - Array of known participant names
 * @param contextWindow - Number of surrounding segments for context
 * @returns Array of extracted tasks
 */
function extractTasksLocal(
  transcript: TranscriptSegment[],
  knownParticipants: string[] = [],
  contextWindow = 2
): ExtractedTask[] {
  const allTasks: ExtractedTask[] = [];
  
  for (let i = 0; i < transcript.length; i++) {
    const segment = transcript[i];
    
    // Get context (surrounding segments from same or other speakers)
    const contextStart = Math.max(0, i - contextWindow);
    const contextEnd = Math.min(transcript.length, i + contextWindow + 1);
    const context = transcript
      .slice(contextStart, contextEnd)
      .filter((_, idx) => idx + contextStart !== i)
      .map(s => s.text);
    
    const tasks = extractTasksFromText(
      segment.text,
      segment.speaker,
      knownParticipants,
      context
    );
    
    // Update timestamps from segment
    for (const task of tasks) {
      task.timestamp = segment.timestamp;
    }
    
    allTasks.push(...tasks);
  }
  
  return deduplicateTasks(allTasks);
}

// ============================================================================
// OpenAI Integration
// ============================================================================

/**
 * OpenAI function schema for task extraction
 */
const TASK_EXTRACTION_FUNCTION = {
  name: 'extract_tasks',
  description: 'Extract action items and tasks from meeting transcript segments',
  parameters: {
    type: 'object',
    properties: {
      tasks: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'Clean, actionable task description',
            },
            assignee: {
              type: 'string',
              description: 'Person assigned to the task (if mentioned)',
            },
            dueDate: {
              type: 'string',
              description: 'Due date in ISO 8601 format (if mentioned)',
            },
            priority: {
              type: 'string',
              enum: ['high', 'medium', 'low'],
              description: 'Task priority based on urgency indicators',
            },
            category: {
              type: 'string',
              enum: ['follow-up', 'research', 'document', 'review', 'decision', 'other'],
              description: 'Task category',
            },
            confidence: {
              type: 'number',
              description: 'Confidence score from 0 to 1',
            },
            sourceIndices: {
              type: 'array',
              items: { type: 'integer' },
              description: 'Indices of transcript segments this task was extracted from',
            },
          },
          required: ['text', 'priority', 'category', 'confidence', 'sourceIndices'],
        },
      },
    },
    required: ['tasks'],
  },
};

/**
 * Extracts tasks using OpenAI GPT-4
 * 
 * @param transcript - Array of transcript segments
 * @param apiKey - OpenAI API key
 * @returns Array of extracted tasks
 */
async function extractTasksWithAI(
  transcript: TranscriptSegment[],
  apiKey: string
): Promise<ExtractedTask[]> {
  // Dynamically import OpenAI to avoid dependency issues
  let OpenAI: any;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const module = require('openai');
    OpenAI = module.default || module.OpenAI;
  } catch {
    throw new Error(
      'OpenAI package not installed. Install with: npm install openai'
    );
  }
  
  const openai = new OpenAI({ apiKey });
  
  // Format transcript for the prompt
  const formattedTranscript = transcript
    .map((s, i) => `[${i}] ${s.speaker} (${s.timestamp.toISOString()}): ${s.text}`)
    .join('\n');
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: `You are an intelligent task extraction assistant. Analyze the meeting transcript and extract all actionable tasks, action items, and commitments.

Guidelines:
- Extract clear, actionable task descriptions
- Identify who is responsible for each task
- Extract any mentioned due dates
- Assign priority based on urgency words (urgent, ASAP, critical = high; nice to have, eventually = low)
- Categorize each task appropriately
- Only include tasks with confidence >= 0.6
- Avoid extracting questions or hypothetical statements as tasks`,
      },
      {
        role: 'user',
        content: `Extract tasks from this meeting transcript:\n\n${formattedTranscript}`,
      },
    ],
    functions: [TASK_EXTRACTION_FUNCTION],
    function_call: { name: 'extract_tasks' },
    temperature: 0.3,
  });
  
  const functionCall = response.choices[0]?.message?.function_call;
  if (!functionCall?.arguments) {
    return [];
  }
  
  try {
    const result = JSON.parse(functionCall.arguments);
    const tasks: ExtractedTask[] = [];
    
    for (const taskData of result.tasks || []) {
      // Get the earliest timestamp from source segments
      const sourceTimestamps = taskData.sourceIndices
        .map((i: number) => transcript[i]?.timestamp)
        .filter(Boolean);
      
      const earliestTimestamp = sourceTimestamps.length > 0
        ? new Date(Math.min(...sourceTimestamps.map((d: Date) => d.getTime())))
        : new Date();
      
      // Get speakers from source segments
      const speakers = [...new Set(
        taskData.sourceIndices
          .map((i: number) => transcript[i]?.speaker)
          .filter(Boolean)
      )];
      
      const task: ExtractedTask = {
        id: generateTaskId(),
        text: taskData.text,
        assignee: taskData.assignee,
        dueDate: taskData.dueDate ? new Date(taskData.dueDate) : undefined,
        priority: taskData.priority,
        category: taskData.category,
        confidence: taskData.confidence,
        sourceText: taskData.sourceIndices
          .map((i: number) => transcript[i]?.text)
          .join(' '),
        speaker: speakers.join(', ') || 'Unknown',
        timestamp: earliestTimestamp,
      };
      
      tasks.push(task);
    }
    
    return deduplicateTasks(tasks);
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    return [];
  }
}

// ============================================================================
// Main Export Functions
// ============================================================================

/**
 * Extracts tasks from a full meeting transcript
 * 
 * This is the primary extraction function that can use either local pattern
 * matching or OpenAI GPT-4 for advanced extraction. When useAI is enabled,
 * it will fall back to local extraction if the AI call fails.
 * 
 * @param transcript - Array of transcript segments with speaker, text, and timestamp
 * @param options - Extraction options including AI configuration
 * @returns Promise resolving to array of extracted tasks
 * 
 * @example
 * ```typescript
 * // Local pattern-based extraction
 * const tasks = await extractTasks(transcript);
 * 
 * // AI-powered extraction
 * const tasks = await extractTasks(transcript, {
 *   useAI: true,
 *   apiKey: process.env.OPENAI_API_KEY,
 *   knownParticipants: ['Alice', 'Bob', 'Charlie']
 * });
 * ```
 */
export async function extractTasks(
  transcript: TranscriptSegment[],
  options: ExtractionOptions = {}
): Promise<ExtractedTask[]> {
  const {
    useAI = false,
    apiKey,
    knownParticipants = [],
    minConfidence = 0.5,
    contextWindow = 2,
  } = options;
  
  // Validate transcript
  if (!Array.isArray(transcript) || transcript.length === 0) {
    return [];
  }
  
  // Try AI extraction if enabled
  if (useAI && apiKey) {
    try {
      const aiTasks = await extractTasksWithAI(transcript, apiKey);
      return aiTasks.filter(t => t.confidence >= minConfidence);
    } catch (error) {
      console.warn('AI extraction failed, falling back to local patterns:', error);
      // Fall through to local extraction
    }
  }
  
  // Use local pattern-based extraction
  const tasks = extractTasksLocal(transcript, knownParticipants, contextWindow);
  return tasks.filter(t => t.confidence >= minConfidence);
}

// Types are already exported at the top of the file
