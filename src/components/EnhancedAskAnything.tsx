/**
 * Enhanced Ask Anything — Intelligence & Insights (Phase 2)
 *
 * NEW component (does not modify AskAnythingPanel.tsx)
 *
 * Features:
 * - Natural language queries across ALL canvas history
 *   (board transcripts, sticky notes/text, comments, meeting summaries when provided)
 * - Decision-oriented queries: "What decisions did we make about X?"
 * - Source citations (which board/meeting, which node, when)
 * - Suggested questions based on recent activity
 * - Conversation memory within a session
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  X,
  Sparkles,
  Send,
  Search,
  Loader2,
  FileText,
  MessageSquare,
  Calendar,
  Quote,
  Copy,
  Check,
  RotateCcw,
  Lightbulb,
  Tag,
} from 'lucide-react';

import type { Board, VisualNode, SavedTranscript } from '../types/board';

// ============================================
// TYPES
// ============================================

export interface EnhancedAskAnythingMeeting {
  id: string;
  title: string;
  date: Date;
  transcript: Array<{ speaker: string; text: string; timestamp: Date }>;
  summary?: string;
}

export type EnhancedSourceKind =
  | 'board_node'
  | 'board_comment'
  | 'board_transcript'
  | 'meeting_transcript'
  | 'meeting_summary';

export interface EnhancedSourceCitation {
  kind: EnhancedSourceKind;
  title: string; // board or meeting title
  when?: Date;
  excerpt: string;
  score: number;
  // identifiers
  boardId?: string;
  boardName?: string;
  nodeId?: string;
  nodeType?: string;
  meetingId?: string;
  speaker?: string;
}

export interface EnhancedAskAnythingMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
  citations?: EnhancedSourceCitation[];
}

export interface EnhancedAskAnythingProps {
  isOpen: boolean;
  onClose: () => void;

  /**
   * Boards include the full canvas history (visualNodes + optional transcripts).
   * This is the primary data source for “ALL canvas history”.
   */
  boards: Board[];

  /** Optional: external meeting objects (if your app keeps them separately) */
  meetings?: EnhancedAskAnythingMeeting[];

  userName?: string;
}

// ============================================
// SEARCH ENGINE (lightweight local RAG)
// ============================================

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
  'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
  'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your',
  'his', 'its', 'our', 'their', 'what', 'which', 'who', 'when', 'where', 'why', 'how',
  'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor',
  'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'now',
]);

function id(): string {
  return Math.random().toString(36).slice(2, 11);
}

function formatDate(d: Date | undefined): string {
  if (!d) return 'Unknown date';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(d: Date | undefined): string {
  if (!d) return '';
  return new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));
}

function jaccard(a: string, b: string): number {
  const A = new Set(tokenize(a));
  const B = new Set(tokenize(b));
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

function score(query: string, text: string): number {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  const exactBonus = t.includes(q) && q.length > 5 ? 0.25 : 0;
  const sim = jaccard(query, text);

  // Small boost for decision language when query mentions decisions
  const decisionBoost =
    /\b(decision|decided|approve|approved|agreed|alignment|choose|chosen)\b/i.test(query) &&
    /\b(decision|decided|approve|approved|agreed|📌|🔒)\b/i.test(text)
      ? 0.15
      : 0;

  return Math.min(1, exactBonus + sim * 0.75 + decisionBoost);
}

function extractTopic(query: string): string {
  return query
    .replace(/^(what|when|which|who|how|why)\s+/i, '')
    .replace(/\b(did|do|does|was|were|have|has|had)\b\s+/i, '')
    .replace(/\b(we|team|you|i)\b\s+/i, '')
    .replace(/[?!.]$/g, '')
    .trim();
}

function buildCitationsFromBoards(query: string, boards: Board[]): EnhancedSourceCitation[] {
  const citations: EnhancedSourceCitation[] = [];

  for (const b of boards) {
    // nodes
    for (const n of b.visualNodes || []) {
      const content = (n.content || '').trim();
      if (!content) continue;
      const s = score(query, content);
      if (s > 0.12) {
        citations.push({
          kind: 'board_node',
          title: b.name,
          when: n.meetingTimestamp ? new Date(n.meetingTimestamp) : (b.lastActivity ? new Date(b.lastActivity) : b.createdAt ? new Date(b.createdAt) : undefined),
          excerpt: content,
          score: s,
          boardId: b.id,
          boardName: b.name,
          nodeId: n.id,
          nodeType: n.type,
          speaker: n.createdBy,
        });
      }

      // comments
      for (const c of n.comments || []) {
        const cText = (c.content || '').trim();
        if (!cText) continue;
        const cs = score(query, cText);
        if (cs > 0.12) {
          citations.push({
            kind: 'board_comment',
            title: b.name,
            when: c.timestamp ? new Date(c.timestamp) : undefined,
            excerpt: cText,
            score: cs,
            boardId: b.id,
            boardName: b.name,
            nodeId: n.id,
            nodeType: 'comment',
            speaker: c.userId,
          });
        }
      }
    }

    // board transcripts (SavedTranscript)
    for (const t of (b.transcripts || []) as SavedTranscript[]) {
      for (const entry of t.entries || []) {
        const text = `${entry.speaker}: ${entry.text}`;
        const s = score(query, text);
        if (s > 0.14) {
          citations.push({
            kind: 'board_transcript',
            title: b.name,
            when: entry.timestamp ? new Date(entry.timestamp) : (t.startedAt ? new Date(t.startedAt) : undefined),
            excerpt: text,
            score: s,
            boardId: b.id,
            boardName: b.name,
            nodeId: t.id,
            nodeType: 'transcript',
            speaker: entry.speaker,
          });
        }
      }
    }
  }

  citations.sort((a, b) => b.score - a.score);
  return citations.slice(0, 18);
}

function buildCitationsFromMeetings(query: string, meetings: EnhancedAskAnythingMeeting[]): EnhancedSourceCitation[] {
  const citations: EnhancedSourceCitation[] = [];

  for (const m of meetings) {
    // transcript
    for (const seg of m.transcript || []) {
      const text = `${seg.speaker}: ${seg.text}`;
      const s = score(query, text);
      if (s > 0.14) {
        citations.push({
          kind: 'meeting_transcript',
          title: m.title,
          when: seg.timestamp ? new Date(seg.timestamp) : m.date,
          excerpt: text,
          score: s,
          meetingId: m.id,
          speaker: seg.speaker,
        });
      }
    }

    // summary
    if (m.summary) {
      const s = score(query, m.summary);
      if (s > 0.14) {
        citations.push({
          kind: 'meeting_summary',
          title: m.title,
          when: m.date,
          excerpt: m.summary,
          score: s,
          meetingId: m.id,
        });
      }
    }
  }

  citations.sort((a, b) => b.score - a.score);
  return citations.slice(0, 12);
}

function synthesizeAnswer(query: string, citations: EnhancedSourceCitation[], memory: EnhancedAskAnythingMessage[]): string {
  if (citations.length === 0) {
    return `I couldn't find anything about “${query}” in your canvas history. Try a narrower topic or include a keyword that appears on the board.`;
  }

  const topic = extractTopic(query);
  const top = citations.slice(0, 6);

  // Detect “decisions” style query
  const wantsDecisions = /\b(decision|decisions|decided|approved|agreed)\b/i.test(query);

  // Lightweight memory: if this looks like a follow-up, prepend context from last assistant message.
  const lastAssistant = [...memory].reverse().find((m) => m.role === 'assistant');
  const isFollowUp = memory.length > 0 && query.trim().split(/\s+/).length <= 5;

  let header = wantsDecisions
    ? `Here are the decisions I found related to **${topic}** across your canvas history:`
    : `Here’s what I found about **${topic}** across your canvas history:`;

  if (isFollowUp && lastAssistant) {
    header = `Following up on our last answer, here’s what I found about **${topic}**:`;
  }

  // Extract “decision-like” lines when asked
  const decisionLines = (c: EnhancedSourceCitation) => {
    const t = c.excerpt;
    const lines = t.split(/\n|\.|;|\u2022/).map((x) => x.trim()).filter(Boolean);
    const picks = lines.filter((x) => /\b(decision|decided|approved|agreed|go with|we will|we're going to)\b/i.test(x) || /📌|🔒/.test(x));
    return (picks.length > 0 ? picks : lines).slice(0, 2);
  };

  const bullets = top
    .flatMap((c) => {
      const lines = wantsDecisions ? decisionLines(c) : [c.excerpt];
      return lines.map((line) => {
        const trimmed = line.length > 180 ? line.slice(0, 180) + '…' : line;
        const place = c.boardName ? `📋 ${c.boardName}` : `🎙️ ${c.title}`;
        const when = c.when ? `${formatDate(c.when)}` : 'Unknown date';
        return `• ${trimmed}\n  — ${place} · ${when}`;
      });
    })
    .slice(0, 8)
    .join('\n\n');

  return `${header}\n\n${bullets}`;
}

// ============================================
// SUGGESTIONS
// ============================================

function generateSuggestions(boards: Board[], meetings?: EnhancedAskAnythingMeeting[]): string[] {
  const suggestions: string[] = [];

  // Recent activity from nodes
  const recentNodes: Array<{ boardName: string; content: string; when: number }> = [];
  for (const b of boards) {
    for (const n of b.visualNodes || []) {
      const c = (n.content || '').trim();
      if (!c) continue;
      const when = n.meetingTimestamp || (b.lastActivity ? new Date(b.lastActivity).getTime() : 0);
      recentNodes.push({ boardName: b.name, content: c, when: when || 0 });
    }
  }
  recentNodes.sort((a, b) => (b.when || 0) - (a.when || 0));

  const recentText = recentNodes.slice(0, 25).map((n) => n.content).join(' ');
  const tokens = tokenize(recentText);
  const freq = new Map<string, number>();
  for (const t of tokens) freq.set(t, (freq.get(t) || 0) + 1);
  const topKeywords = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k)
    .filter((k) => k.length > 3)
    .slice(0, 4);

  // Pattern-based suggestions
  suggestions.push('What decisions did we make this week?');
  suggestions.push('What are the top risks on our active boards?');

  if (topKeywords[0]) {
    suggestions.push(`What decisions did we make about ${topKeywords[0]}?`);
    suggestions.push(`Summarize everything related to ${topKeywords[0]}.`);
  }

  const decisionHeavyBoards = boards
    .map((b) => {
      const d = (b.visualNodes || []).filter((n) => /\b(decision|decided|approved|agreed)\b/i.test(n.content || '') || /📌|🔒/.test(n.content || '')).length;
      return { name: b.name, count: d };
    })
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 2);

  for (const b of decisionHeavyBoards) {
    suggestions.push(`What decisions did we make on “${b.name}”?`);
  }

  const meeting = meetings && meetings.length > 0 ? meetings[meetings.length - 1] : undefined;
  if (meeting) {
    suggestions.push(`Summarize the ${meeting.title} meeting.`);
  }

  return [...new Set(suggestions)].slice(0, 6);
}

// ============================================
// UI
// ============================================

const CitationBadge: React.FC<{ c: EnhancedSourceCitation }> = ({ c }) => {
  const label =
    c.kind === 'board_node' ? 'Node' :
    c.kind === 'board_comment' ? 'Comment' :
    c.kind === 'board_transcript' ? 'Transcript' :
    c.kind === 'meeting_summary' ? 'Summary' : 'Meeting';

  return (
    <div className="flex items-start gap-2 p-2 rounded-lg bg-white border border-gray-100">
      <div className="mt-0.5 text-gray-400">
        {c.kind.includes('transcript') ? <MessageSquare className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-gray-700 truncate">{c.boardName ? `📋 ${c.boardName}` : `🎙️ ${c.title}`}</span>
          <span className="text-[10px] text-gray-400">•</span>
          <span className="text-[10px] text-gray-500">{label}</span>
        </div>
        <div className="text-[11px] text-gray-600 mt-0.5 line-clamp-2">{c.excerpt}</div>
        <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-2">
          <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(c.when)}</span>
          {c.speaker && <span className="inline-flex items-center gap-1"><Quote className="w-3 h-3" />{c.speaker}</span>}
        </div>
      </div>
    </div>
  );
};

export const EnhancedAskAnything: React.FC<EnhancedAskAnythingProps> = ({
  isOpen,
  onClose,
  boards,
  meetings = [],
  userName = 'You',
}) => {
  const [messages, setMessages] = useState<EnhancedAskAnythingMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const suggestions = useMemo(() => generateSuggestions(boards, meetings), [boards, meetings]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleClear = useCallback(() => {
    setMessages([]);
  }, []);

  const handleCopy = useCallback(async (content: string, mid: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(mid);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const runQuery = useCallback(async () => {
    const q = input.trim();
    if (!q || isLoading) return;

    const userMsg: EnhancedAskAnythingMessage = {
      id: id(),
      role: 'user',
      content: q,
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Simulate compute latency (keeps UI responsive and consistent with other AI panels)
    await new Promise((r) => setTimeout(r, 450));

    const boardCitations = buildCitationsFromBoards(q, boards);
    const meetingCitations = meetings.length ? buildCitationsFromMeetings(q, meetings) : [];

    const citations = [...boardCitations, ...meetingCitations]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    const answer = synthesizeAnswer(q, citations, [...messages, userMsg]);

    const assistantMsg: EnhancedAskAnythingMessage = {
      id: id(),
      role: 'assistant',
      content: answer,
      createdAt: new Date(),
      citations,
    };

    setMessages((prev) => [...prev, assistantMsg]);
    setIsLoading(false);
  }, [input, isLoading, boards, meetings, messages]);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      runQuery();
    }
  }, [runQuery]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 520, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 520, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className="fixed right-0 top-0 h-screen w-[520px] bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 text-lg">Enhanced Ask Anything</h2>
              <p className="text-xs text-gray-500">
                <span className="inline-flex items-center gap-1"><Tag className="w-3 h-3" />{boards.length} boards</span>
                {meetings.length > 0 ? <span> • {meetings.length} meetings</span> : null}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={handleClear}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Clear"
              >
                <RotateCcw className="w-4 h-4 text-gray-400" />
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto bg-gray-50/50">
          {messages.length === 0 ? (
            <div className="p-6">
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Search className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-sm font-semibold text-gray-900">Query across all canvas history</h3>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Ask about decisions, risks, goals, or anything discussed in transcripts, summaries, sticky notes, and comments.
                </p>
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-semibold text-gray-700">Suggested</span>
                  </div>
                  <div className="space-y-2">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          setInput(s);
                          inputRef.current?.focus();
                        }}
                        className="w-full text-left p-3 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-sm text-gray-700 transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {messages.map((m) => {
                const isUser = m.role === 'user';
                return (
                  <div key={m.id} className={isUser ? 'flex justify-end' : 'flex gap-3'}>
                    {!isUser && (
                      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                    )}

                    <div className={isUser ? 'max-w-[85%]' : 'flex-1 min-w-0'}>
                      <div
                        className={
                          isUser
                            ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white px-4 py-3 rounded-2xl rounded-tr-sm shadow-lg shadow-indigo-500/10'
                            : 'bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm'
                        }
                      >
                        <div className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</div>
                        <div className={isUser ? 'text-[10px] text-white/60 mt-1 text-right' : 'text-[10px] text-gray-400 mt-1 flex items-center justify-between'}>
                          <span>{formatTime(m.createdAt)}</span>
                          {!isUser && (
                            <button
                              onClick={() => handleCopy(m.content, m.id)}
                              className="inline-flex items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors"
                              title="Copy"
                            >
                              {copiedId === m.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                              <span className="text-[10px]">{copiedId === m.id ? 'Copied' : 'Copy'}</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* citations */}
                      {!isUser && (m.citations?.length || 0) > 0 && (
                        <div className="mt-2">
                          <div className="text-[11px] font-semibold text-gray-500 mb-2">Sources</div>
                          <div className="space-y-2">
                            {m.citations!.slice(0, 6).map((c, idx) => (
                              <CitationBadge key={`${m.id}-${idx}`} c={c} />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-2 text-sm text-gray-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Searching across boards…
                  </div>
                </div>
              )}

              <div ref={endRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-100 bg-white">
          {input === '' && messages.length > 0 && (
            <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
              {suggestions.slice(0, 3).map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setInput(s);
                    inputRef.current?.focus();
                  }}
                  className="flex-shrink-0 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-xs text-gray-600 transition-colors whitespace-nowrap"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={`Ask about decisions, goals, risks… (as ${userName})`}
                className="w-full px-4 py-3 pr-10 bg-gray-100 border-0 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none min-h-[48px] max-h-[120px]"
                rows={1}
                disabled={isLoading}
              />
              {input && (
                <button
                  onClick={() => setInput('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full transition-colors"
                  title="Clear"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>
            <button
              onClick={runQuery}
              disabled={!input.trim() || isLoading}
              className="p-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg hover:shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none transition-all"
              title="Send"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-[10px] text-gray-400 text-center mt-2">Press Enter to send, Shift+Enter for a new line</p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default EnhancedAskAnything;
