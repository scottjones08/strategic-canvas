/**
 * Ask Anything Panel - RAG (Retrieval Augmented Generation) System
 *
 * A comprehensive question-answering system that allows users to query
 * all past meeting data using natural language. Features include:
 *
 * - Chat interface with message history
 * - Semantic search across meeting transcripts
 * - Source citations with meeting context
 * - Answer synthesis from multiple meetings
 * - Smart query understanding (who said what, when, action items, etc.)
 * - Conversation memory for follow-up questions
 * - Confidence scoring and "I don't know" handling
 *
 * @example
 * ```tsx
 * <AskAnythingPanel
 *   isOpen={showAskPanel}
 *   onClose={() => setShowAskPanel(false)}
 *   meetings={meetings}
 *   aiApiKey={process.env.VITE_AI_API_KEY}
 * />
 * ```
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Send,
  Sparkles,
  Search,
  Loader2,
  MessageSquare,
  Calendar,
  User,
  FileText,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Target,
  ListTodo,
  AlertCircle,
  CheckCircle,
  Clock,
  Hash,
  MoreHorizontal,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  HelpCircle,
  BarChart3,
} from 'lucide-react';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface Meeting {
  id: string;
  title: string;
  date: Date;
  transcript: Array<{
    speaker: string;
    text: string;
    timestamp: Date;
  }>;
  summary?: string;
  actionItems?: string[];
}

export interface MessageSource {
  meetingId: string;
  title: string;
  date: Date;
  excerpt: string;
  speaker?: string;
  relevanceScore: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: MessageSource[];
  timestamp: Date;
  confidence?: number;
  queryType?: QueryType;
  isError?: boolean;
}

export type QueryType =
  | 'what_said'
  | 'when_discussed'
  | 'action_items'
  | 'summarize'
  | 'concerns'
  | 'general'
  | 'follow_up';

export interface SearchResult {
  meeting: Meeting;
  segments: Array<{
    speaker: string;
    text: string;
    timestamp: Date;
    relevanceScore: number;
  }>;
  overallRelevance: number;
}

export interface CanvasSource {
  boardId: string;
  boardName: string;
  nodeId: string;
  nodeType: string;
  content: string;
  createdBy: string;
  relevanceScore: number;
}

export interface BoardSearchData {
  id: string;
  name: string;
  visualNodes: Array<{
    id: string;
    type: string;
    content: string;
    createdBy: string;
    comments: Array<{ id: string; userId: string; content: string; timestamp: Date }>;
  }>;
  transcripts?: Array<{
    id: string;
    entries: Array<{ speaker: string; text: string; timestamp: number }>;
    startedAt: Date;
    endedAt: Date;
  }>;
}

export interface AskAnythingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  meetings: Meeting[];
  /** All boards for cross-board search */
  boards?: BoardSearchData[];
  aiApiKey?: string;
  aiModel?: 'claude' | 'openai';
  userName?: string;
}

// ============================================
// CONSTANTS
// ============================================

const SUGGESTED_QUESTIONS = [
  { text: 'What did John say about the budget?', type: 'what_said' as QueryType },
  { text: 'When did we last discuss the product roadmap?', type: 'when_discussed' as QueryType },
  { text: 'What action items are pending for Sarah?', type: 'action_items' as QueryType },
  { text: 'Summarize all meetings about the Q4 launch', type: 'summarize' as QueryType },
  { text: 'What concerns has the team raised about the timeline?', type: 'concerns' as QueryType },
  { text: 'What decisions were made in the last 3 meetings?', type: 'general' as QueryType },
];

const QUERY_PATTERNS: Record<QueryType, RegExp[]> = {
  what_said: [
    /what did (\w+) say about/i,
    /what (?:did|was) (\w+) (?:say|mention|discuss) (?:about|regarding)/i,
    /(?:quotes?|statements?) from (\w+)/i,
    /(\w+)(?:'s)? (?:opinion|thoughts?|view) on/i,
  ],
  when_discussed: [
    /when (?:did|was) (?:we|the team) (?:discuss|talk about|cover)/i,
    /last time (?:we|the team) (?:discussed|talked about)/i,
    /which meeting (?:covered|discussed|had)/i,
    /find (?:discussions?|mentions?|references?) (?:to|about)/i,
  ],
  action_items: [
    /what action items? (?:are )?(?:pending|outstanding|open|assigned)/i,
    /what (?:tasks?|action items?) (?:does?|for|assigned to) (\w+)/i,
    /(\w+)(?:'s)? (?:todo|to-do|tasks|action items)/i,
    /what (?:do|does) (\w+) (?:need|have) to do/i,
  ],
  summarize: [
    /summarize all meetings? (?:about|on|regarding)/i,
    /give me a summary of/i,
    /what (?:have|has) (?:we|the team) (?:discussed|decided) about/i,
    /overview of (?:all )?(?:the )?meetings? (?:about|on)/i,
  ],
  concerns: [
    /what concerns? (?:has|have) (\w+)/i,
    /(?:problems?|issues?|challenges?|risks?) (?:raised|mentioned|discussed)/i,
    /(?:worried|concerned) about/i,
    /(?:red flags?|warning signs?|blockers?)/i,
  ],
  follow_up: [
    /(?:tell me more|elaborate|explain) (?:about|on)/i,
    /what else (?:did|was)/i,
    /(?:and|what about) (?:the |those |other )/i,
  ],
  general: [
    /.*/,
  ],
};

// Common words to ignore in search
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
  'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
  'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your',
  'his', 'her', 'its', 'our', 'their', 'what', 'which', 'who', 'when', 'where', 'why', 'how',
  'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor',
  'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'now',
]);

// ============================================
// UTILITY FUNCTIONS
// ============================================

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

// ============================================
// SEARCH & RAG ENGINE
// ============================================

/**
 * Tokenize text into searchable terms
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

/**
 * Calculate semantic similarity between two texts (0-1 scale)
 */
function calculateSimilarity(text1: string, text2: string): number {
  const tokens1 = new Set(tokenize(text1));
  const tokens2 = new Set(tokenize(text2));

  if (tokens1.size === 0 || tokens2.size === 0) return 0;

  const intersection = new Set([...tokens1].filter((x) => tokens2.has(x)));
  const union = new Set([...tokens1, ...tokens2]);

  return intersection.size / union.size;
}

/**
 * Calculate weighted relevance score
 */
function calculateRelevance(
  query: string,
  text: string,
  speaker?: string,
  queryType?: QueryType
): number {
  const queryTokens = tokenize(query);
  const textTokens = tokenize(text);

  if (queryTokens.length === 0 || textTokens.length === 0) return 0;

  // Exact phrase match bonus
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  let exactMatchBonus = 0;
  if (textLower.includes(queryLower)) {
    exactMatchBonus = 0.3;
  }

  // Token overlap score
  const matchingTokens = queryTokens.filter((token) =>
    textTokens.some((t) => t.includes(token) || token.includes(t))
  );
  const overlapScore = matchingTokens.length / queryTokens.length;

  // Semantic similarity
  const semanticScore = calculateSimilarity(query, text);

  // Speaker match bonus for "what did X say" queries
  let speakerBonus = 0;
  if (queryType === 'what_said' && speaker) {
    const speakerPattern = new RegExp(speaker, 'i');
    if (speakerPattern.test(query)) {
      speakerBonus = 0.2;
    }
  }

  // Recency bonus (handled at meeting level)
  const tfIdfScore = matchingTokens.reduce((acc, token) => {
    const count = textTokens.filter((t) => t === token).length;
    return acc + count / textTokens.length;
  }, 0);

  return Math.min(
    1,
    exactMatchBonus + overlapScore * 0.3 + semanticScore * 0.3 + speakerBonus + tfIdfScore * 0.2
  );
}

/**
 * Extract speaker name from query (for "what did X say" queries)
 */
function extractSpeakerFromQuery(query: string): string | undefined {
  for (const pattern of QUERY_PATTERNS.what_said) {
    const match = query.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return undefined;
}

/**
 * Extract topic from query
 */
function extractTopicFromQuery(query: string): string {
  // Remove question words and common prefixes
  let topic = query
    .replace(/^(what|when|which|who|how|why|where|is|are|did|do|does)\s+/i, '')
    .replace(/^(did|was|were|have|has|had)\s+/i, '')
    .replace(/^(we|you|they|i|it)\s+/i, '')
    .replace(/\s+(say|said|mention|discuss|talk|about|regarding)\s+/gi, ' ')
    .replace(/[?.,!]$/, '')
    .trim();

  return topic;
}

/**
 * Detect query type from natural language
 */
function detectQueryType(query: string, conversationHistory: Message[]): QueryType {
  // Check for follow-up patterns first if there's history
  if (conversationHistory.length > 0) {
    for (const pattern of QUERY_PATTERNS.follow_up) {
      if (pattern.test(query)) {
        return 'follow_up';
      }
    }

    // Single word or very short queries are likely follow-ups
    if (query.split(' ').length <= 3) {
      return 'follow_up';
    }
  }

  // Check other patterns
  for (const [type, patterns] of Object.entries(QUERY_PATTERNS)) {
    if (type === 'general' || type === 'follow_up') continue;
    for (const pattern of patterns) {
      if (pattern.test(query)) {
        return type as QueryType;
      }
    }
  }

  return 'general';
}

/**
 * Search across all meetings for relevant content
 */
function searchMeetings(
  query: string,
  meetings: Meeting[],
  queryType: QueryType
): SearchResult[] {
  const results: SearchResult[] = [];
  const targetSpeaker = extractSpeakerFromQuery(query);

  for (const meeting of meetings) {
    const matchingSegments: SearchResult['segments'] = [];

    for (const segment of meeting.transcript) {
      // For "what did X say" queries, filter by speaker
      if (queryType === 'what_said' && targetSpeaker) {
        const speakerMatch =
          segment.speaker.toLowerCase().includes(targetSpeaker.toLowerCase()) ||
          targetSpeaker.toLowerCase().includes(segment.speaker.toLowerCase());
        if (!speakerMatch) continue;
      }

      const relevance = calculateRelevance(query, segment.text, segment.speaker, queryType);

      if (relevance > 0.15) {
        matchingSegments.push({
          speaker: segment.speaker,
          text: segment.text,
          timestamp: segment.timestamp,
          relevanceScore: relevance,
        });
      }
    }

    // Sort segments by relevance
    matchingSegments.sort((a, b) => b.relevanceScore - a.relevanceScore);

    if (matchingSegments.length > 0) {
      // Calculate overall relevance with recency bonus
      const avgRelevance =
        matchingSegments.reduce((sum, s) => sum + s.relevanceScore, 0) /
        matchingSegments.length;
      const recencyBonus = calculateRecencyBonus(meeting.date);

      results.push({
        meeting,
        segments: matchingSegments.slice(0, 5), // Top 5 segments per meeting
        overallRelevance: avgRelevance * (1 + recencyBonus),
      });
    }
  }

  // Sort by overall relevance
  results.sort((a, b) => b.overallRelevance - a.overallRelevance);
  return results.slice(0, 5); // Top 5 meetings
}

/**
 * Calculate recency bonus (0-0.2 scale)
 */
function calculateRecencyBonus(date: Date): number {
  const daysAgo = (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24);
  if (daysAgo < 7) return 0.2;
  if (daysAgo < 30) return 0.1;
  if (daysAgo < 90) return 0.05;
  return 0;
}

/**
 * Extract action items for a specific person
 */
function extractActionItemsForPerson(
  person: string,
  meetings: Meeting[]
): Array<{ meeting: Meeting; item: string }> {
  const items: Array<{ meeting: Meeting; item: string }> = [];
  const personLower = person.toLowerCase();

  for (const meeting of meetings) {
    if (!meeting.actionItems) continue;

    for (const item of meeting.actionItems) {
      const itemLower = item.toLowerCase();
      // Check if person is mentioned in the action item
      if (
        itemLower.includes(personLower) ||
        itemLower.includes(`${personLower} will`) ||
        itemLower.includes(`${personLower} to`) ||
        itemLower.includes(`${personLower} should`)
      ) {
        items.push({ meeting, item });
      }
    }

    // Also search transcript for action item patterns
    for (const segment of meeting.transcript) {
      const actionPatterns = [
        new RegExp(`${personLower} (?:will|needs? to|should|is going to|has to) ([^.]+)`, 'i'),
        new RegExp(`(?:assign|give|task)(?:ed|ing)? (?:to )?${personLower}:? ([^.]+)`, 'i'),
      ];

      for (const pattern of actionPatterns) {
        const match = segment.text.match(pattern);
        if (match && match[1]) {
          const actionText = match[1].trim();
          if (actionText.length > 10 && !items.some((i) => i.item.includes(actionText))) {
            items.push({ meeting, item: `${segment.speaker}: ${actionText}` });
          }
        }
      }
    }
  }

  return items;
}

// ============================================
// ANSWER GENERATION
// ============================================

/**
 * Generate answer based on search results and query type
 */
function generateAnswer(
  query: string,
  queryType: QueryType,
  searchResults: SearchResult[],
  conversationHistory: Message[],
  meetings: Meeting[]
): { content: string; sources: MessageSource[]; confidence: number } {
  // Handle "I don't know" case
  if (searchResults.length === 0) {
    const fallbackResponses = [
      `I couldn't find any information about "${query}" in your meeting history.`,
      `I don't see any discussions about that topic in the available meetings.`,
      `No relevant information found for "${query}". Try rephrasing or asking about a different topic.`,
    ];
    return {
      content: fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)],
      sources: [],
      confidence: 0,
    };
  }

  // Handle follow-up queries
  if (queryType === 'follow_up' && conversationHistory.length > 0) {
    return generateFollowUpAnswer(query, searchResults, conversationHistory);
  }

  // Handle specific query types
  switch (queryType) {
    case 'what_said':
      return generateWhatSaidAnswer(query, searchResults);
    case 'when_discussed':
      return generateWhenDiscussedAnswer(query, searchResults);
    case 'action_items':
      return generateActionItemsAnswer(query, meetings);
    case 'summarize':
      return generateSummaryAnswer(query, searchResults);
    case 'concerns':
      return generateConcernsAnswer(query, searchResults);
    default:
      return generateGeneralAnswer(query, searchResults);
  }
}

function generateWhatSaidAnswer(
  query: string,
  searchResults: SearchResult[]
): { content: string; sources: MessageSource[]; confidence: number } {
  const speaker = extractSpeakerFromQuery(query);
  const topic = extractTopicFromQuery(query);
  const sources: MessageSource[] = [];
  const quotes: string[] = [];

  for (const result of searchResults.slice(0, 3)) {
    for (const segment of result.segments.slice(0, 2)) {
      quotes.push(`"${segment.text}"`);
      sources.push({
        meetingId: result.meeting.id,
        title: result.meeting.title,
        date: result.meeting.date,
        excerpt: segment.text,
        speaker: segment.speaker,
        relevanceScore: segment.relevanceScore,
      });
    }
  }

  const uniqueMeetings = [...new Set(sources.map((s) => s.title))];
  const meetingContext =
    uniqueMeetings.length === 1
      ? `the ${uniqueMeetings[0]} meeting`
      : `${uniqueMeetings.length} meetings`;

  const content = speaker
    ? `Based on ${meetingContext}, here's what ${speaker} said about **${topic}**:\n\n${quotes
        .slice(0, 4)
        .map((q) => `• ${q}`)
        .join('\n\n')}`
    : `Here's what was discussed about **${topic}** in ${meetingContext}:\n\n${quotes
        .slice(0, 4)
        .map((q) => `• ${q}`)
        .join('\n\n')}`;

  const avgConfidence =
    sources.reduce((sum, s) => sum + s.relevanceScore, 0) / sources.length;

  return { content, sources, confidence: avgConfidence };
}

function generateWhenDiscussedAnswer(
  query: string,
  searchResults: SearchResult[]
): { content: string; sources: MessageSource[]; confidence: number } {
  const topic = extractTopicFromQuery(query);
  const sources: MessageSource[] = [];
  const discussions: string[] = [];

  // Sort by date (most recent first)
  const sortedResults = [...searchResults].sort(
    (a, b) => new Date(b.meeting.date).getTime() - new Date(a.meeting.date).getTime()
  );

  for (const result of sortedResults.slice(0, 3)) {
    const mostRelevant = result.segments[0];
    discussions.push(
      `• **${result.meeting.title}** (${formatDate(result.meeting.date)}) - ${
        mostRelevant.speaker
      } mentioned: "${mostRelevant.text.substring(0, 100)}${
        mostRelevant.text.length > 100 ? '...' : ''
      }"`
    );
    sources.push({
      meetingId: result.meeting.id,
      title: result.meeting.title,
      date: result.meeting.date,
      excerpt: mostRelevant.text,
      speaker: mostRelevant.speaker,
      relevanceScore: mostRelevant.relevanceScore,
    });
  }

  const content =
    discussions.length === 1
      ? `**${topic}** was discussed ${getRelativeTime(sortedResults[0].meeting.date)} in:\n\n${discussions[0]}`
      : `**${topic}** was discussed in ${discussions.length} meetings:\n\n${discussions.join(
          '\n\n'
        )}`;

  return { content, sources, confidence: 0.8 };
}

function generateActionItemsAnswer(
  query: string,
  meetings: Meeting[]
): { content: string; sources: MessageSource[]; confidence: number } {
  // Extract person from query
  const personMatch = query.match(/(?:for|assigned to|does|has|pending for)\s+(\w+)/i);
  const person = personMatch ? personMatch[1] : null;

  const sources: MessageSource[] = [];

  if (person) {
    const actionItems = extractActionItemsForPerson(person, meetings);

    if (actionItems.length === 0) {
      return {
        content: `I couldn't find any specific action items for **${person}** in the meeting history.`,
        sources: [],
        confidence: 0.3,
      };
    }

    const items = actionItems.slice(0, 6).map(({ meeting, item }) => {
      sources.push({
        meetingId: meeting.id,
        title: meeting.title,
        date: meeting.date,
        excerpt: item,
        relevanceScore: 0.8,
      });
      return `• **${item}** (from ${meeting.title}, ${formatDate(meeting.date)})`;
    });

    const content = `Here are the action items I found for **${person}**:\n\n${items.join(
      '\n\n'
    )}`;

    return { content, sources, confidence: 0.85 };
  } else {
    // General action items query
    const allItems: Array<{ meeting: Meeting; item: string }> = [];

    for (const meeting of meetings) {
      if (meeting.actionItems) {
        meeting.actionItems.forEach((item) => allItems.push({ meeting, item }));
      }
    }

    if (allItems.length === 0) {
      return {
        content:
          "I couldn't find any documented action items in the meeting history. You might want to check if action items were recorded in the meeting summaries.",
        sources: [],
        confidence: 0.2,
      };
    }

    // Sort by date (most recent first)
    allItems.sort(
      (a, b) => new Date(b.meeting.date).getTime() - new Date(a.meeting.date).getTime()
    );

    const recentItems = allItems.slice(0, 8).map(({ meeting, item }) => {
      sources.push({
        meetingId: meeting.id,
        title: meeting.title,
        date: meeting.date,
        excerpt: item,
        relevanceScore: 0.75,
      });
      return `• **${item}** (${meeting.title})`;
    });

    const content = `Here are the most recent action items from your meetings:\n\n${recentItems.join(
      '\n\n'
    )}`;

    return { content, sources, confidence: 0.8 };
  }
}

function generateSummaryAnswer(
  query: string,
  searchResults: SearchResult[]
): { content: string; sources: MessageSource[]; confidence: number } {
  const topic = extractTopicFromQuery(query);
  const sources: MessageSource[] = [];

  const meetingCount = searchResults.length;
  const allMeetings = searchResults.map((r) => r.meeting);

  // Collect key points
  const keyPoints: string[] = [];
  const decisions: string[] = [];

  for (const result of searchResults.slice(0, 3)) {
    if (result.meeting.summary) {
      // Extract key points from summary
      const summary = result.meeting.summary;
      const sentences = summary.split(/[.!?]+/).filter((s) => s.trim().length > 20);
      keyPoints.push(...sentences.slice(0, 2));
    }

    // Look for decision patterns in segments
    for (const segment of result.segments.slice(0, 3)) {
      const text = segment.text.toLowerCase();
      if (
        text.includes('decided') ||
        text.includes('decision') ||
        text.includes('agreed') ||
        text.includes('conclusion') ||
        text.includes('going with')
      ) {
        decisions.push(segment.text);
      }
      sources.push({
        meetingId: result.meeting.id,
        title: result.meeting.title,
        date: result.meeting.date,
        excerpt: segment.text,
        speaker: segment.speaker,
        relevanceScore: segment.relevanceScore,
      });
    }
  }

  let content = `Based on ${meetingCount} meeting${
    meetingCount > 1 ? 's' : ''
  } discussing **${topic}**:\n\n`;

  if (keyPoints.length > 0) {
    content += `**Key Discussion Points:**\n${keyPoints
      .slice(0, 5)
      .map((p) => `• ${p.trim()}`)
      .join('\n')}\n\n`;
  }

  if (decisions.length > 0) {
    content += `**Decisions Made:**\n${decisions
      .slice(0, 3)
      .map((d) => `• ${d}`)
      .join('\n')}`;
  }

  if (keyPoints.length === 0 && decisions.length === 0) {
    content += `The meetings covered various aspects of **${topic}**. Here are some relevant excerpts:\n\n${searchResults[0].segments
      .slice(0, 3)
      .map((s) => `• "${s.text}"`)
      .join('\n\n')}`;
  }

  return { content, sources, confidence: 0.75 };
}

function generateConcernsAnswer(
  query: string,
  searchResults: SearchResult[]
): { content: string; sources: MessageSource[]; confidence: number } {
  const sources: MessageSource[] = [];
  const concerns: string[] = [];

  const concernPatterns = [
    /(?:worried|concerned|concern) (?:about|that)/i,
    /(?:problem|issue|challenge|risk|blocker)/i,
    /(?:not sure|uncertain|unclear|don'?t know)/i,
    /(?:difficult|hard|struggle|struggling)/i,
  ];

  for (const result of searchResults.slice(0, 4)) {
    for (const segment of result.segments) {
      if (concernPatterns.some((p) => p.test(segment.text))) {
        concerns.push(
          `• **${segment.speaker}** (${result.meeting.title}): "${segment.text}"`
        );
        sources.push({
          meetingId: result.meeting.id,
          title: result.meeting.title,
          date: result.meeting.date,
          excerpt: segment.text,
          speaker: segment.speaker,
          relevanceScore: segment.relevanceScore,
        });
      }
    }
  }

  if (concerns.length === 0) {
    return {
      content:
        "I couldn't find any specific concerns raised in the meetings. The discussions about this topic seem to be positive or neutral.",
      sources: [],
      confidence: 0.4,
    };
  }

  const content = `Here are the concerns that were raised:\n\n${concerns
    .slice(0, 6)
    .join('\n\n')}`;

  return { content, sources, confidence: 0.75 };
}

function generateGeneralAnswer(
  query: string,
  searchResults: SearchResult[]
): { content: string; sources: MessageSource[]; confidence: number } {
  const sources: MessageSource[] = [];
  const excerpts: string[] = [];
  const mentionedMeetings = new Set<string>();

  for (const result of searchResults.slice(0, 3)) {
    mentionedMeetings.add(result.meeting.title);
    for (const segment of result.segments.slice(0, 2)) {
      excerpts.push(
        `• **${segment.speaker}** (${result.meeting.title}): "${segment.text}"`
      );
      sources.push({
        meetingId: result.meeting.id,
        title: result.meeting.title,
        date: result.meeting.date,
        excerpt: segment.text,
        speaker: segment.speaker,
        relevanceScore: segment.relevanceScore,
      });
    }
  }

  const meetingList = Array.from(mentionedMeetings);
  const meetingContext =
    meetingList.length === 1
      ? meetingList[0]
      : `${meetingList.length} different meetings`;

  const content = `Based on ${meetingContext}, here's what I found:\n\n${excerpts.join(
    '\n\n'
  )}`;

  const avgConfidence =
    sources.reduce((sum, s) => sum + s.relevanceScore, 0) / sources.length;

  return { content, sources, confidence: avgConfidence };
}

function generateFollowUpAnswer(
  query: string,
  searchResults: SearchResult[],
  conversationHistory: Message[]
): { content: string; sources: MessageSource[]; confidence: number } {
  // Get context from previous messages
  const lastUserMessage = conversationHistory
    .slice()
    .reverse()
    .find((m) => m.role === 'user');

  if (lastUserMessage) {
    // Combine with previous query
    const combinedQuery = `${lastUserMessage.content} ${query}`;
    return generateGeneralAnswer(combinedQuery, searchResults);
  }

  return generateGeneralAnswer(query, searchResults);
}

// ============================================
// CROSS-BOARD SEARCH
// ============================================

/**
 * Search across all board canvas content (sticky notes, text nodes, comments)
 */
function searchBoardContent(
  query: string,
  boards: BoardSearchData[]
): CanvasSource[] {
  const results: CanvasSource[] = [];
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return results;

  for (const board of boards) {
    for (const node of board.visualNodes) {
      const content = (node.content || '').trim();
      if (!content || content.length < 5) continue;

      const relevance = calculateRelevance(query, content, undefined, 'general');
      if (relevance > 0.12) {
        results.push({
          boardId: board.id,
          boardName: board.name,
          nodeId: node.id,
          nodeType: node.type,
          content,
          createdBy: node.createdBy || 'Unknown',
          relevanceScore: relevance,
        });
      }

      // Also search comments on the node
      for (const comment of (node.comments || [])) {
        const commentRelevance = calculateRelevance(query, comment.content, undefined, 'general');
        if (commentRelevance > 0.12) {
          results.push({
            boardId: board.id,
            boardName: board.name,
            nodeId: node.id,
            nodeType: 'comment',
            content: comment.content,
            createdBy: comment.userId || 'Unknown',
            relevanceScore: commentRelevance,
          });
        }
      }
    }

    // Search board transcripts
    if (board.transcripts) {
      for (const transcript of board.transcripts) {
        for (const entry of transcript.entries) {
          const relevance = calculateRelevance(query, entry.text, entry.speaker, 'general');
          if (relevance > 0.12) {
            results.push({
              boardId: board.id,
              boardName: board.name,
              nodeId: transcript.id,
              nodeType: 'transcript',
              content: `${entry.speaker}: ${entry.text}`,
              createdBy: entry.speaker,
              relevanceScore: relevance,
            });
          }
        }
      }
    }
  }

  results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  return results.slice(0, 15);
}

/**
 * Generate cross-board answer combining meeting and canvas data
 */
function generateCrossBoardAnswer(
  query: string,
  queryType: QueryType,
  meetingResults: SearchResult[],
  canvasResults: CanvasSource[]
): { content: string; sources: MessageSource[]; canvasSources: CanvasSource[]; confidence: number } {
  const sources: MessageSource[] = [];
  const usedCanvasSources = canvasResults.slice(0, 5);

  // Build meeting sources
  for (const result of meetingResults.slice(0, 3)) {
    for (const segment of result.segments.slice(0, 2)) {
      sources.push({
        meetingId: result.meeting.id,
        title: result.meeting.title,
        date: result.meeting.date,
        excerpt: segment.text,
        speaker: segment.speaker,
        relevanceScore: segment.relevanceScore,
      });
    }
  }

  let content = '';

  // Combine meeting and canvas results
  if (meetingResults.length === 0 && canvasResults.length === 0) {
    return {
      content: `I couldn't find any information about "${query}" across your meetings or canvas boards.`,
      sources: [],
      canvasSources: [],
      confidence: 0,
    };
  }

  const topic = extractTopicFromQuery(query);

  if (canvasResults.length > 0) {
    const boardNames = [...new Set(canvasResults.map(c => c.boardName))];
    content += `Found relevant content across **${boardNames.length} board${boardNames.length > 1 ? 's' : ''}**`;
    if (meetingResults.length > 0) {
      content += ` and **${meetingResults.length} meeting${meetingResults.length > 1 ? 's' : ''}**`;
    }
    content += `:\n\n`;

    // Canvas excerpts
    content += `**📋 From Canvas Boards:**\n`;
    for (const cs of usedCanvasSources.slice(0, 4)) {
      const typeLabel = cs.nodeType === 'sticky' ? '📌' : cs.nodeType === 'transcript' ? '🎙️' : cs.nodeType === 'comment' ? '💬' : '📄';
      const excerpt = cs.content.length > 120 ? cs.content.substring(0, 120) + '...' : cs.content;
      content += `• ${typeLabel} **${cs.boardName}**: "${excerpt}"\n`;
    }
  }

  if (meetingResults.length > 0) {
    if (canvasResults.length > 0) content += `\n`;
    content += `**🎙️ From Meetings:**\n`;
    for (const result of meetingResults.slice(0, 3)) {
      const seg = result.segments[0];
      if (seg) {
        const excerpt = seg.text.length > 120 ? seg.text.substring(0, 120) + '...' : seg.text;
        content += `• **${result.meeting.title}** (${formatDate(result.meeting.date)}): "${excerpt}"\n`;
      }
    }
  }

  const totalSources = sources.length + usedCanvasSources.length;
  const avgConfidence = totalSources > 0
    ? (sources.reduce((s, x) => s + x.relevanceScore, 0) + usedCanvasSources.reduce((s, x) => s + x.relevanceScore, 0)) / totalSources
    : 0;

  return { content, sources, canvasSources: usedCanvasSources, confidence: avgConfidence };
}

/**
 * Generate suggested questions based on recent board activity
 */
function generateDynamicSuggestions(
  boards: BoardSearchData[],
  meetings: Meeting[]
): Array<{ text: string; type: QueryType }> {
  const suggestions: Array<{ text: string; type: QueryType }> = [];

  // From boards — look at recent content
  for (const board of boards.slice(0, 3)) {
    const decisions = board.visualNodes.filter(n => {
      const c = (n.content || '').toLowerCase();
      return c.includes('decision') || c.includes('decided') || c.includes('📌');
    });
    if (decisions.length > 0) {
      suggestions.push({
        text: `What decisions were made on "${board.name}"?`,
        type: 'general',
      });
    }

    const risks = board.visualNodes.filter(n => n.type === 'risk');
    if (risks.length > 0) {
      suggestions.push({
        text: `What are the risks on "${board.name}"?`,
        type: 'concerns',
      });
    }

    const actions = board.visualNodes.filter(n => n.type === 'action');
    if (actions.length > 0) {
      suggestions.push({
        text: `What action items are pending on "${board.name}"?`,
        type: 'action_items',
      });
    }
  }

  // From meetings
  if (meetings.length > 0) {
    const recentMeeting = meetings[meetings.length - 1];
    if (recentMeeting) {
      suggestions.push({
        text: `Summarize the ${recentMeeting.title} meeting`,
        type: 'summarize',
      });
    }
  }

  // Fill with defaults if needed
  if (suggestions.length < 4) {
    suggestions.push(
      { text: 'What decisions did we make about the roadmap?', type: 'general' as QueryType },
      { text: 'Show me all action items across boards', type: 'action_items' as QueryType },
      { text: 'What concerns has the team raised?', type: 'concerns' as QueryType },
    );
  }

  return suggestions.slice(0, 6);
}

// ============================================
// MAIN COMPONENT
// ============================================

export const AskAnythingPanel: React.FC<AskAnythingPanelProps> = ({
  isOpen,
  onClose,
  meetings,
  boards = [],
  aiApiKey,
  aiModel = 'claude',
  userName = 'You',
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Reset state when closed
  useEffect(() => {
    if (!isOpen) {
      // Don't reset messages immediately to allow for smooth animation
    }
  }, [isOpen]);

    // Dynamic suggestions based on board activity
  const dynamicSuggestions = useMemo(
    () => generateDynamicSuggestions(boards, meetings),
    [boards, meetings]
  );

  const handleSend = useCallback(async () => {
    const query = inputValue.trim();
    if (!query || isLoading) return;

    // Add user message
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: query,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Simulate async processing
      await new Promise((resolve) => setTimeout(resolve, 800));

      const conversationHistory = [...messages, userMessage];

      // Detect query type
      const queryType = detectQueryType(query, conversationHistory);

      // Search meetings
      const searchResults = searchMeetings(query, meetings, queryType);

      // Search across all boards (cross-board intelligence)
      const canvasResults = boards.length > 0 ? searchBoardContent(query, boards) : [];

      let content: string;
      let sources: MessageSource[];
      let confidence: number;

      if (canvasResults.length > 0) {
        // Use cross-board answer generation when we have canvas results
        const crossBoardAnswer = generateCrossBoardAnswer(query, queryType, searchResults, canvasResults);
        content = crossBoardAnswer.content;
        sources = crossBoardAnswer.sources;
        confidence = crossBoardAnswer.confidence;

        // Append canvas source references as meeting-like sources for display
        for (const cs of crossBoardAnswer.canvasSources.slice(0, 3)) {
          sources.push({
            meetingId: cs.boardId,
            title: `📋 ${cs.boardName}`,
            date: new Date(),
            excerpt: cs.content.substring(0, 200),
            speaker: cs.createdBy,
            relevanceScore: cs.relevanceScore,
          });
        }
      } else {
        // Fallback to meeting-only search
        const answer = generateAnswer(query, queryType, searchResults, conversationHistory, meetings);
        content = answer.content;
        sources = answer.sources;
        confidence = answer.confidence;
      }

      // Add assistant message
      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content,
        sources,
        timestamp: new Date(),
        confidence,
        queryType,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('AskAnything error:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: 'assistant',
          content: 'Sorry — something went wrong while generating that answer. Please try again.',
          timestamp: new Date(),
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, isLoading, meetings, messages, boards]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleSuggestedQuestion = useCallback((question: string) => {
    setInputValue(question);
    inputRef.current?.focus();
  }, []);

  const toggleSourceExpansion = useCallback((messageId: string) => {
    setExpandedSources((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  }, []);

  const copyMessage = useCallback(async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (error) {
      console.error('Failed to copy message:', error);
    }
  }, []);

  const clearConversation = useCallback(() => {
    setMessages([]);
    setExpandedSources(new Set());
  }, []);

  const stats = useMemo(() => {
    return {
      totalMeetings: meetings.length,
      totalTranscripts: meetings.reduce((sum, m) => sum + m.transcript.length, 0),
      dateRange:
        meetings.length > 0
          ? {
              earliest: new Date(Math.min(...meetings.map((m) => new Date(m.date).getTime()))),
              latest: new Date(Math.max(...meetings.map((m) => new Date(m.date).getTime()))),
            }
          : null,
    };
  }, [meetings]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 480, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 480, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed right-0 top-0 h-screen w-[480px] bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-primary-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-purple rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/25">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 text-lg">Ask Anything</h2>
              <p className="text-xs text-gray-500">
                {stats.totalMeetings} meetings • {stats.totalTranscripts.toLocaleString()} segments
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={clearConversation}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Clear conversation"
              >
                <RotateCcw className="w-4 h-4 text-gray-400" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto bg-gray-50/50">
          {messages.length === 0 ? (
            <EmptyState
              stats={stats}
              onQuestionClick={handleSuggestedQuestion}
              meetings={meetings}
              dynamicSuggestions={dynamicSuggestions}
            />
          ) : (
            <div className="p-4 space-y-4">
              {messages.map((message, index) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isLast={index === messages.length - 1}
                  isExpanded={expandedSources.has(message.id)}
                  onToggleSources={() => toggleSourceExpansion(message.id)}
                  onCopy={() => copyMessage(message.content, message.id)}
                  isCopied={copiedMessageId === message.id}
                  userName={userName}
                />
              ))}
              {isLoading && <LoadingIndicator />}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-gray-100 bg-white">
          {/* Quick suggestions when input is empty */}
          {inputValue === '' && messages.length > 0 && (
            <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
              {dynamicSuggestions.slice(0, 3).map((q) => (
                <button
                  key={q.text}
                  onClick={() => handleSuggestedQuestion(q.text)}
                  className="flex-shrink-0 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-xs text-gray-600 transition-colors whitespace-nowrap"
                >
                  {q.text}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your meetings..."
                className="w-full px-4 py-3 pr-10 bg-gray-100 border-0 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 resize-none min-h-[48px] max-h-[120px]"
                rows={1}
                disabled={isLoading}
                style={{ height: 'auto' }}
              />
              {inputValue && (
                <button
                  onClick={() => setInputValue('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              className="p-3 bg-gradient-to-r from-primary-600 to-accent-purple text-white rounded-xl hover:shadow-lg hover:shadow-primary-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none transition-all"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-[10px] text-gray-400 text-center mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

// ============================================
// SUB-COMPONENTS
// ============================================

interface EmptyStateProps {
  stats: {
    totalMeetings: number;
    totalTranscripts: number;
    dateRange: { earliest: Date; latest: Date } | null;
  };
  onQuestionClick: (question: string) => void;
  meetings: Meeting[];
  dynamicSuggestions: Array<{ text: string; type: QueryType }>;
}

const EmptyState: React.FC<EmptyStateProps> = ({ stats, onQuestionClick, meetings, dynamicSuggestions }) => {
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);

  // Get unique speakers from all meetings
  const speakers = useMemo(() => {
    const speakerSet = new Set<string>();
    meetings.forEach((m) => {
      m.transcript.forEach((t) => speakerSet.add(t.speaker));
    });
    return Array.from(speakerSet).slice(0, 5);
  }, [meetings]);

  return (
    <div className="h-full flex flex-col p-6">
      {/* Welcome Card */}
      <div className="bg-gradient-to-br from-primary-500 to-accent-purple rounded-2xl p-6 text-white mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5" />
          <h3 className="font-semibold">Ask Anything About Your Meetings</h3>
        </div>
        <p className="text-sm text-white/80 leading-relaxed">
          I can search across all {stats.totalMeetings} meetings with{' '}
          {stats.totalTranscripts.toLocaleString()} transcript segments to help you find
          information, quotes, decisions, and more.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 text-primary-600 mb-1">
            <FileText className="w-4 h-4" />
            <span className="text-2xl font-bold">{stats.totalMeetings}</span>
          </div>
          <p className="text-xs text-gray-500">Total Meetings</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 text-accent-green mb-1">
            <Hash className="w-4 h-4" />
            <span className="text-2xl font-bold">{stats.totalTranscripts.toLocaleString()}</span>
          </div>
          <p className="text-xs text-gray-500">Transcript Segments</p>
        </div>
      </div>

      {/* Suggested Questions */}
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          <h4 className="font-medium text-gray-900 text-sm">Try asking</h4>
        </div>

        <div className="space-y-2">
          {dynamicSuggestions.slice(0, showAllSuggestions ? undefined : 4).map((q) => (
            <SuggestedQuestionButton
              key={q.text}
              question={q.text}
              type={q.type}
              onClick={() => onQuestionClick(q.text)}
            />
          ))}
        </div>

        {!showAllSuggestions && (
          <button
            onClick={() => setShowAllSuggestions(true)}
            className="w-full mt-3 py-2 text-xs text-primary-600 hover:text-primary-700 font-medium"
          >
            Show more suggestions
          </button>
        )}

        {/* Quick speaker filters */}
        {speakers.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <User className="w-4 h-4 text-accent-blue" />
              <h4 className="font-medium text-gray-900 text-sm">People in your meetings</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {speakers.map((speaker) => (
                <button
                  key={speaker}
                  onClick={() => onQuestionClick(`What did ${speaker} say?`)}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-xs text-gray-700 transition-colors"
                >
                  {speaker}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface SuggestedQuestionButtonProps {
  question: string;
  type: QueryType;
  onClick: () => void;
}

const SuggestedQuestionButton: React.FC<SuggestedQuestionButtonProps> = ({
  question,
  type,
  onClick,
}) => {
  const icons: Record<QueryType, React.ReactNode> = {
    what_said: <MessageSquare className="w-3.5 h-3.5 text-accent-blue" />,
    when_discussed: <Clock className="w-3.5 h-3.5 text-accent-green" />,
    action_items: <ListTodo className="w-3.5 h-3.5 text-accent-purple" />,
    summarize: <FileText className="w-3.5 h-3.5 text-amber-500" />,
    concerns: <AlertCircle className="w-3.5 h-3.5 text-red-500" />,
    general: <Search className="w-3.5 h-3.5 text-gray-500" />,
    follow_up: <MoreHorizontal className="w-3.5 h-3.5 text-gray-500" />,
  };

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-xl hover:border-primary-300 hover:shadow-sm transition-all text-left group"
    >
      <span className="flex-shrink-0">{icons[type]}</span>
      <span className="text-sm text-gray-700 group-hover:text-gray-900">{question}</span>
    </button>
  );
};

interface MessageBubbleProps {
  message: Message;
  isLast: boolean;
  isExpanded: boolean;
  onToggleSources: () => void;
  onCopy: () => void;
  isCopied: boolean;
  userName: string;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isLast,
  isExpanded,
  onToggleSources,
  onCopy,
  isCopied,
  userName,
}) => {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="flex justify-end"
      >
        <div className="max-w-[85%] bg-gradient-to-br from-primary-600 to-accent-purple text-white px-4 py-3 rounded-2xl rounded-tr-sm shadow-lg shadow-primary-500/10">
          <p className="text-sm leading-relaxed">{message.content}</p>
          <p className="text-[10px] text-white/60 mt-1 text-right">{formatTime(message.timestamp)}</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3"
    >
      {/* AI Avatar */}
      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-primary-500 to-accent-purple rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20">
        <Sparkles className="w-4 h-4 text-white" />
      </div>

      {/* Message Content */}
      <div className="flex-1 min-w-0">
        <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm shadow-sm p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-primary-600">AI Assistant</span>
            {message.confidence !== undefined && (
              <ConfidenceBadge confidence={message.confidence} />
            )}
          </div>

          {/* Content */}
          <div className="prose prose-sm max-w-none">
            <FormattedContent content={message.content} />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
            <button
              onClick={onCopy}
              className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            >
              {isCopied ? (
                <>
                  <Check className="w-3 h-3" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  Copy
                </>
              )}
            </button>
            {message.sources && message.sources.length > 0 && (
              <button
                onClick={onToggleSources}
                className="flex items-center gap-1 px-2 py-1 text-xs text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-md transition-colors"
              >
                <FileText className="w-3 h-3" />
                {message.sources.length} source{message.sources.length > 1 ? 's' : ''}
                {isExpanded ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Sources Panel */}
        <AnimatePresence>
          {isExpanded && message.sources && message.sources.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 space-y-2 overflow-hidden"
            >
              {message.sources.map((source, index) => (
                <SourceCard key={`${source.meetingId}-${index}`} source={source} index={index} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

interface FormattedContentProps {
  content: string;
}

const FormattedContent: React.FC<FormattedContentProps> = ({ content }) => {
  // Parse markdown-like formatting
  const parts = content.split(/(\*\*.*?\*\*|• .*|\n\n)/g);

  return (
    <div className="text-sm text-gray-800 leading-relaxed space-y-2">
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          // Bold text
          return (
            <span key={index} className="font-semibold text-gray-900">
              {part.slice(2, -2)}
            </span>
          );
        }
        if (part.startsWith('• ')) {
          // Bullet point
          return (
            <div key={index} className="flex gap-2">
              <span className="text-primary-500 mt-1.5">•</span>
              <span>{part.slice(2)}</span>
            </div>
          );
        }
        if (part === '\n\n') {
          // Paragraph break
          return <div key={index} className="h-2" />;
        }
        // Regular text
        return <span key={index}>{part}</span>;
      })}
    </div>
  );
};

interface ConfidenceBadgeProps {
  confidence: number;
}

const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({ confidence }) => {
  let colorClass = 'bg-gray-100 text-gray-600';
  let label = 'Low confidence';

  if (confidence >= 0.8) {
    colorClass = 'bg-green-100 text-green-700';
    label = 'High confidence';
  } else if (confidence >= 0.5) {
    colorClass = 'bg-amber-100 text-amber-700';
    label = 'Medium confidence';
  }

  return (
    <div className="flex items-center gap-1">
      <div className={`w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden`}>
        <div
          className={`h-full ${
            confidence >= 0.8 ? 'bg-green-500' : confidence >= 0.5 ? 'bg-amber-500' : 'bg-gray-400'
          }`}
          style={{ width: `${confidence * 100}%` }}
        />
      </div>
    </div>
  );
};

interface SourceCardProps {
  source: MessageSource;
  index: number;
}

const SourceCard: React.FC<SourceCardProps> = ({ source, index }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 bg-primary-50 rounded-lg flex items-center justify-center">
          <FileText className="w-4 h-4 text-primary-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm text-gray-900 truncate">{source.title}</span>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs text-gray-500">{formatDate(source.date)}</span>
          </div>
          {source.speaker && (
            <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
              <User className="w-3 h-3" />
              <span>{source.speaker}</span>
            </div>
          )}
          <p className="text-sm text-gray-600 line-clamp-2 italic">"{source.excerpt}"</p>
        </div>
      </div>
    </motion.div>
  );
};

const LoadingIndicator: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex gap-3"
    >
      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-primary-500 to-accent-purple rounded-xl flex items-center justify-center">
        <Sparkles className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 bg-white border border-gray-100 rounded-2xl rounded-tl-sm shadow-sm p-4">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-primary-500 animate-spin" />
          <span className="text-sm text-gray-600">Searching across meetings...</span>
        </div>
        <div className="mt-2 flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-primary-400 rounded-full"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
};

// ============================================
// EXPORTS
// ============================================

export default AskAnythingPanel;

// Types are already exported above as 'export interface'
// Additional exports can be added here if needed
