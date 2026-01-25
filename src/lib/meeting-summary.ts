/**
 * Meeting Summary & Follow-up Email Generator
 * AI-powered analysis of meeting transcripts to generate structured summaries
 * and professional follow-up emails
 */

import { FullTranscript, formatDuration } from './transcription';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface ActionItem {
  task: string;
  owner?: string;
  dueDate?: string;
  priority?: 'high' | 'medium' | 'low';
}

export interface MeetingSummary {
  id: string;
  overview: string;
  keyPoints: string[];
  decisions: string[];
  actionItems: ActionItem[];
  openQuestions: string[];
  nextSteps: string[];
  generatedAt: Date;
  format: SummaryFormat;
  transcriptId?: string;
  duration?: number;
  participants?: string[];
}

export type SummaryFormat = 'executive' | 'detailed' | 'actions-only';

export interface FollowUpEmail {
  subject: string;
  body: string;
  tone: EmailTone;
  meetingDate?: string;
  recipients?: string[];
}

export type EmailTone = 'formal' | 'casual' | 'friendly';

export interface SummaryOptions {
  format?: SummaryFormat;
  maxKeyPoints?: number;
  extractOwners?: boolean;
  clientName?: string;
  boardName?: string;
}

export interface EmailOptions {
  tone?: EmailTone;
  includeActionItems?: boolean;
  includeDecisions?: boolean;
  includeNextSteps?: boolean;
  recipientName?: string;
  senderName?: string;
  meetingTitle?: string;
  nextMeetingDate?: string;
}

// ============================================
// AI PROMPTS
// ============================================

const SUMMARY_PROMPT = `Analyze this meeting transcript and create a structured summary.

TRANSCRIPT:
{transcript}

Generate a JSON response with the following structure:
{
  "overview": "2-3 sentences capturing the essence of the meeting",
  "keyPoints": ["Array of key discussion points (bullet points, 5-10 items)"],
  "decisions": ["Array of specific conclusions/decisions reached"],
  "actionItems": [
    {"task": "Task description", "owner": "Person's name if mentioned", "dueDate": "Date if mentioned"}
  ],
  "openQuestions": ["Unresolved items or parking lot topics"],
  "nextSteps": ["What happens after this meeting"]
}

Guidelines:
- Be concise but comprehensive
- Use professional language
- For action items, extract owner names when clearly mentioned (e.g., "John will...", "I'll handle...", "Team should...")
- Format: {format}
- If format is "executive", keep everything brief (2-3 items per section max)
- If format is "detailed", include more comprehensive notes
- If format is "actions-only", focus primarily on action items and next steps

Return ONLY valid JSON, no other text.`;

const EMAIL_PROMPT = `Write a professional follow-up email based on this meeting summary.

MEETING SUMMARY:
Overview: {overview}
Key Points: {keyPoints}
Decisions Made: {decisions}
Action Items: {actionItems}
Next Steps: {nextSteps}

REQUIREMENTS:
- Tone: {tone}
- Include action items: {includeActionItems}
- Include decisions: {includeDecisions}
- Recipient name: {recipientName}
- Sender name: {senderName}
- Meeting title: {meetingTitle}
{nextMeetingNote}

Generate a JSON response:
{
  "subject": "Clear, professional subject line",
  "body": "Full email body with proper greeting and sign-off"
}

The email should:
- Thank attendees for their time (briefly)
- Recap key points briefly
- List action items with owners if requested
- Mention next steps or follow-up meeting
- Be concise and actionable
- Match the requested tone ({tone}):
  - formal: Professional and structured
  - casual: Relaxed but still professional
  - friendly: Warm and personable

Return ONLY valid JSON, no other text.`;

// ============================================
// LOCAL EXTRACTION (Pattern-based, no AI needed)
// ============================================

/**
 * Extract action items using pattern matching
 */
function extractActionItemsLocal(text: string): ActionItem[] {
  const actionItems: ActionItem[] = [];
  const seenTasks = new Set<string>();

  // Patterns for action items with potential owners
  const patterns = [
    // "I'll/I will..." patterns
    {
      regex: /\b(I(?:'ll| will| am going to))\s+([^.!?]+[.!?]?)/gi,
      ownerHint: 'current speaker',
    },
    // "Name will..." patterns
    {
      regex: /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:will|should|needs to|has to|is going to)\s+([^.!?]+[.!?]?)/g,
      ownerFromMatch: true,
    },
    // "We need to/should..." patterns
    {
      regex: /\b(?:we|team)\s+(?:need to|should|must|have to|will)\s+([^.!?]+[.!?]?)/gi,
      ownerHint: 'Team',
    },
    // "Let's..." patterns
    {
      regex: /\blet(?:'s|us)\s+([^.!?]+[.!?]?)/gi,
      ownerHint: 'Team',
    },
    // "Action item:" patterns
    {
      regex: /\baction\s*(?:item)?[:\s]+([^.!?\n]+)/gi,
      ownerHint: undefined,
    },
    // "TODO:" patterns
    {
      regex: /\btodo[:\s]+([^.!?\n]+)/gi,
      ownerHint: undefined,
    },
    // "Follow up on/with..." patterns
    {
      regex: /\bfollow\s*up\s+(?:on|with|about)\s+([^.!?]+[.!?]?)/gi,
      ownerHint: undefined,
    },
    // "Schedule..." patterns
    {
      regex: /\bschedule\s+([^.!?]+[.!?]?)/gi,
      ownerHint: undefined,
    },
    // "Send/Create/Build/Implement..." patterns
    {
      regex: /\b(?:send|create|build|implement|prepare|draft|review|update|fix)\s+([^.!?]+[.!?]?)/gi,
      ownerHint: undefined,
    },
  ];

  patterns.forEach(({ regex, ownerHint, ownerFromMatch }) => {
    let match;
    const regexCopy = new RegExp(regex.source, regex.flags);
    
    while ((match = regexCopy.exec(text)) !== null) {
      let task: string;
      let owner: string | undefined = ownerHint;

      if (ownerFromMatch && match[1] && match[2]) {
        owner = match[1];
        task = match[2].trim();
      } else {
        task = (match[2] || match[1] || '').trim();
      }

      // Clean up the task
      task = task
        .replace(/^(?:to|that|the)\s+/i, '')
        .replace(/[.!?]+$/, '')
        .trim();

      // Skip very short or duplicate tasks
      if (task.length > 10 && task.length < 200) {
        const taskKey = task.toLowerCase().substring(0, 40);
        if (!seenTasks.has(taskKey)) {
          seenTasks.add(taskKey);
          actionItems.push({
            task: task.charAt(0).toUpperCase() + task.slice(1),
            owner: owner === 'current speaker' ? undefined : owner,
          });
        }
      }
    }
  });

  // Extract due dates if mentioned
  const datePatterns = [
    /\bby\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/gi,
    /\bby\s+(next week|end of (?:week|month|day)|tomorrow|today)/gi,
    /\bby\s+(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/g,
    /\bdue\s+(?:on\s+)?(\w+\s+\d{1,2}(?:st|nd|rd|th)?)/gi,
  ];

  actionItems.forEach((item, index) => {
    datePatterns.forEach(pattern => {
      const match = item.task.match(pattern);
      if (match) {
        actionItems[index].dueDate = match[1];
        // Remove the date from the task text
        actionItems[index].task = item.task.replace(pattern, '').trim();
      }
    });
  });

  return actionItems.slice(0, 15); // Limit to 15 items
}

/**
 * Extract questions from transcript
 */
function extractQuestions(text: string): string[] {
  const questions: string[] = [];
  const seenQuestions = new Set<string>();

  // Find sentences ending with ?
  const questionMatches = text.match(/[^.!?]*\?/g) || [];
  
  questionMatches.forEach(q => {
    const cleaned = q.trim();
    if (cleaned.length > 15 && cleaned.length < 200) {
      const key = cleaned.toLowerCase().substring(0, 40);
      if (!seenQuestions.has(key)) {
        seenQuestions.add(key);
        questions.push(cleaned);
      }
    }
  });

  // Look for "wondering about", "unclear about", etc.
  const wonderPatterns = [
    /(?:wondering|curious|unclear)\s+(?:about|if|whether)\s+([^.!?]+)/gi,
    /(?:don't|do not)\s+(?:know|understand)\s+([^.!?]+)/gi,
    /need(?:s)?\s+(?:to\s+)?clarif(?:y|ication)\s+(?:on|about)?\s*([^.!?]+)/gi,
  ];

  wonderPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const question = match[1].trim();
      if (question.length > 10 && question.length < 150) {
        const key = question.toLowerCase().substring(0, 40);
        if (!seenQuestions.has(key)) {
          seenQuestions.add(key);
          questions.push(question.charAt(0).toUpperCase() + question.slice(1) + '?');
        }
      }
    }
  });

  return questions.slice(0, 10);
}

/**
 * Extract decisions from transcript
 */
function extractDecisions(text: string): string[] {
  const decisions: string[] = [];
  const seenDecisions = new Set<string>();

  const decisionPatterns = [
    /\b(?:we(?:'ve)?|team)\s+(?:decided|agreed|confirmed|approved)\s+(?:to\s+)?([^.!?]+)/gi,
    /\bthe\s+(?:decision|plan|conclusion)\s+is\s+(?:to\s+)?([^.!?]+)/gi,
    /\b(?:going\s+)?(?:with|forward\s+with)\s+([^.!?]+)/gi,
    /\bfinal(?:ly)?\s+(?:decided|chose|selected)\s+([^.!?]+)/gi,
    /\bit(?:'s| is)\s+(?:settled|decided|confirmed)[:\s]+([^.!?]+)/gi,
  ];

  decisionPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const decision = match[1].trim();
      if (decision.length > 10 && decision.length < 200) {
        const key = decision.toLowerCase().substring(0, 40);
        if (!seenDecisions.has(key)) {
          seenDecisions.add(key);
          decisions.push(decision.charAt(0).toUpperCase() + decision.slice(1));
        }
      }
    }
  });

  return decisions.slice(0, 10);
}

/**
 * Extract key points from transcript
 */
function extractKeyPoints(text: string): string[] {
  const keyPoints: string[] = [];
  const seenPoints = new Set<string>();

  // Look for emphasis words and important statements
  const emphasisPatterns = [
    /\b(?:important(?:ly)?|key|main|critical|essential|crucial)\s+(?:point|thing|issue|aspect|factor)?\s*(?:is|was|are)?\s*:?\s*([^.!?]+)/gi,
    /\bthe\s+(?:main|key|primary|core)\s+(?:issue|point|concern|topic|focus)\s+(?:is|was)\s+([^.!?]+)/gi,
    /\bhighlight(?:s|ed)?\s+(?:that\s+)?([^.!?]+)/gi,
    /\bnote(?:d)?\s+that\s+([^.!?]+)/gi,
    /\bdiscussed\s+([^.!?]+)/gi,
  ];

  emphasisPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const point = match[1].trim();
      if (point.length > 15 && point.length < 200) {
        const key = point.toLowerCase().substring(0, 40);
        if (!seenPoints.has(key)) {
          seenPoints.add(key);
          keyPoints.push(point.charAt(0).toUpperCase() + point.slice(1));
        }
      }
    }
  });

  // If we didn't find many emphasized points, extract topic sentences
  if (keyPoints.length < 3) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 30);
    const topicWords = ['discussed', 'talked about', 'mentioned', 'brought up', 'reviewed', 'went over', 'covered', 'addressed'];
    
    sentences.forEach(sentence => {
      const lower = sentence.toLowerCase();
      if (topicWords.some(word => lower.includes(word))) {
        const cleaned = sentence.trim();
        if (cleaned.length > 20 && cleaned.length < 200) {
          const key = cleaned.toLowerCase().substring(0, 40);
          if (!seenPoints.has(key)) {
            seenPoints.add(key);
            keyPoints.push(cleaned.charAt(0).toUpperCase() + cleaned.slice(1));
          }
        }
      }
    });
  }

  return keyPoints.slice(0, 10);
}

/**
 * Generate overview from transcript (local, simple version)
 */
function generateOverviewLocal(transcript: FullTranscript, options?: SummaryOptions): string {
  const duration = formatDuration(transcript.duration);
  const speakers = transcript.speakers.map(s => s.customName || s.label).join(', ');
  const segmentCount = transcript.segments.length;
  
  // Get total text for topic extraction
  const totalText = transcript.segments.map(s => s.text).join(' ');
  
  // Extract main topics
  const topicIndicators = totalText.match(/\b(?:about|regarding|discussing|topic|focus on|covering)\s+([^.!?]+)/gi) || [];
  const mainTopic = topicIndicators[0]?.replace(/^(?:about|regarding|discussing|topic|focus on|covering)\s+/i, '') || 'various topics';

  return `This ${duration} meeting with ${transcript.speakers.length} participant${transcript.speakers.length > 1 ? 's' : ''} (${speakers}) covered ${mainTopic}. The discussion included ${segmentCount} exchanges${options?.clientName ? ` related to ${options.clientName}` : ''}.`;
}

/**
 * Extract next steps from transcript
 */
function extractNextSteps(text: string): string[] {
  const nextSteps: string[] = [];
  const seenSteps = new Set<string>();

  const nextStepPatterns = [
    /\bnext\s+step(?:s)?(?:\s+(?:is|are|will be))?\s*:?\s*([^.!?]+)/gi,
    /\bmoving\s+forward,?\s+(?:we\s+)?(?:will|should|need to)?\s*([^.!?]+)/gi,
    /\bafter\s+this\s+(?:meeting|call),?\s+([^.!?]+)/gi,
    /\bfollow(?:ing)?(?:\s+up)?\s+(?:this|the meeting),?\s+([^.!?]+)/gi,
    /\bnext\s+(?:week|month|time),?\s+(?:we(?:'ll)?\s+)?([^.!?]+)/gi,
    /\bplan\s+(?:is\s+)?to\s+([^.!?]+)/gi,
  ];

  nextStepPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const step = match[1].trim();
      if (step.length > 10 && step.length < 200) {
        const key = step.toLowerCase().substring(0, 40);
        if (!seenSteps.has(key)) {
          seenSteps.add(key);
          nextSteps.push(step.charAt(0).toUpperCase() + step.slice(1));
        }
      }
    }
  });

  return nextSteps.slice(0, 5);
}

// ============================================
// MAIN FUNCTIONS
// ============================================

/**
 * Generate meeting summary from transcript
 * Uses local pattern matching if no AI API key is provided
 */
export async function generateMeetingSummary(
  transcript: string | FullTranscript,
  options?: SummaryOptions & { aiApiKey?: string; aiModel?: 'claude' | 'openai' }
): Promise<MeetingSummary> {
  const format = options?.format || 'executive';
  const summaryId = generateId();

  // If it's a string transcript, create basic structure
  let fullTranscript: FullTranscript;
  let transcriptText: string;

  if (typeof transcript === 'string') {
    transcriptText = transcript;
    fullTranscript = {
      id: summaryId,
      segments: [{ id: '1', speaker: 'unknown', speakerLabel: 'Unknown', text: transcript, startTime: 0, endTime: 0, confidence: 1 }],
      speakers: [{ id: 'unknown', label: 'Unknown', color: '#6b7280' }],
      duration: 0,
      createdAt: new Date(),
      status: 'completed',
    };
  } else {
    fullTranscript = transcript;
    transcriptText = transcript.segments.map(s => {
      const speaker = s.speakerLabel || 'Unknown';
      return `[${speaker}]: ${s.text}`;
    }).join('\n');
  }

  // Try AI extraction if key is provided
  if (options?.aiApiKey) {
    try {
      const aiSummary = await generateSummaryWithAI(transcriptText, format, options.aiApiKey, options.aiModel);
      if (aiSummary) {
        return {
          ...aiSummary,
          id: summaryId,
          generatedAt: new Date(),
          format,
          transcriptId: fullTranscript.id,
          duration: fullTranscript.duration,
          participants: fullTranscript.speakers.map(s => s.customName || s.label),
        };
      }
    } catch (error) {
      console.error('AI summary generation failed, falling back to local extraction:', error);
    }
  }

  // Local pattern-based extraction
  const actionItems = extractActionItemsLocal(transcriptText);
  const decisions = extractDecisions(transcriptText);
  const keyPoints = extractKeyPoints(transcriptText);
  const openQuestions = extractQuestions(transcriptText);
  const nextSteps = extractNextSteps(transcriptText);
  const overview = generateOverviewLocal(fullTranscript, options);

  // Apply format limits
  const limits = format === 'executive' 
    ? { keyPoints: 3, decisions: 3, actionItems: 5, questions: 3, nextSteps: 3 }
    : format === 'actions-only'
    ? { keyPoints: 0, decisions: 2, actionItems: 15, questions: 0, nextSteps: 5 }
    : { keyPoints: 10, decisions: 10, actionItems: 15, questions: 10, nextSteps: 5 };

  return {
    id: summaryId,
    overview,
    keyPoints: keyPoints.slice(0, limits.keyPoints),
    decisions: decisions.slice(0, limits.decisions),
    actionItems: actionItems.slice(0, limits.actionItems),
    openQuestions: openQuestions.slice(0, limits.questions),
    nextSteps: nextSteps.slice(0, limits.nextSteps),
    generatedAt: new Date(),
    format,
    transcriptId: fullTranscript.id,
    duration: fullTranscript.duration,
    participants: fullTranscript.speakers.map(s => s.customName || s.label),
  };
}

/**
 * Generate follow-up email from meeting summary
 */
export async function generateFollowUpEmail(
  summary: MeetingSummary,
  options?: EmailOptions & { aiApiKey?: string; aiModel?: 'claude' | 'openai' }
): Promise<FollowUpEmail> {
  const tone = options?.tone || 'formal';
  const includeActionItems = options?.includeActionItems !== false;
  const includeDecisions = options?.includeDecisions !== false;
  const includeNextSteps = options?.includeNextSteps !== false;

  // Try AI generation if key is provided
  if (options?.aiApiKey) {
    try {
      const aiEmail = await generateEmailWithAI(summary, { 
        ...options, 
        tone, 
        includeActionItems,
        aiApiKey: options.aiApiKey,
      });
      if (aiEmail) {
        return aiEmail;
      }
    } catch (error) {
      console.error('AI email generation failed, falling back to template:', error);
    }
  }

  // Template-based email generation
  return generateEmailFromTemplate(summary, {
    tone,
    includeActionItems,
    includeDecisions,
    includeNextSteps,
    recipientName: options?.recipientName,
    senderName: options?.senderName,
    meetingTitle: options?.meetingTitle,
    nextMeetingDate: options?.nextMeetingDate,
  });
}

// ============================================
// AI-POWERED GENERATION
// ============================================

/**
 * Generate summary using AI
 */
async function generateSummaryWithAI(
  transcriptText: string,
  format: SummaryFormat,
  apiKey: string,
  model: 'claude' | 'openai' = 'claude'
): Promise<Omit<MeetingSummary, 'id' | 'generatedAt' | 'format' | 'transcriptId' | 'duration' | 'participants'> | null> {
  const prompt = SUMMARY_PROMPT
    .replace('{transcript}', transcriptText.substring(0, 15000)) // Limit input size
    .replace('{format}', format);

  try {
    const response = model === 'claude'
      ? await callClaudeAPI(prompt, apiKey)
      : await callOpenAIAPI(prompt, apiKey);

    const parsed = parseJSONResponse(response);
    if (parsed) {
      return {
        overview: parsed.overview || '',
        keyPoints: parsed.keyPoints || [],
        decisions: parsed.decisions || [],
        actionItems: (parsed.actionItems || []).map((item: any) => ({
          task: item.task || item,
          owner: item.owner,
          dueDate: item.dueDate,
        })),
        openQuestions: parsed.openQuestions || [],
        nextSteps: parsed.nextSteps || [],
      };
    }
  } catch (error) {
    console.error('AI summary generation error:', error);
  }

  return null;
}

/**
 * Generate email using AI
 */
async function generateEmailWithAI(
  summary: MeetingSummary,
  options: EmailOptions & { aiApiKey: string; aiModel?: 'claude' | 'openai' }
): Promise<FollowUpEmail | null> {
  const prompt = EMAIL_PROMPT
    .replace('{overview}', summary.overview)
    .replace('{keyPoints}', summary.keyPoints.join('\n- ') || 'No specific key points recorded')
    .replace('{decisions}', summary.decisions.join('\n- ') || 'No specific decisions recorded')
    .replace('{actionItems}', summary.actionItems.map(a => `${a.task}${a.owner ? ` - ${a.owner}` : ''}`).join('\n- ') || 'No action items')
    .replace('{nextSteps}', summary.nextSteps.join('\n- ') || 'No specific next steps')
    .replace('{tone}', options.tone || 'formal')
    .replace('{includeActionItems}', options.includeActionItems !== false ? 'yes' : 'no')
    .replace('{includeDecisions}', options.includeDecisions !== false ? 'yes' : 'no')
    .replace('{recipientName}', options.recipientName || 'Team')
    .replace('{senderName}', options.senderName || 'Your name')
    .replace('{meetingTitle}', options.meetingTitle || 'our recent meeting')
    .replace('{nextMeetingNote}', options.nextMeetingDate 
      ? `- Next meeting scheduled for: ${options.nextMeetingDate}`
      : '');

  try {
    const response = options.aiModel === 'openai'
      ? await callOpenAIAPI(prompt, options.aiApiKey)
      : await callClaudeAPI(prompt, options.aiApiKey);

    const parsed = parseJSONResponse(response);
    if (parsed && parsed.subject && parsed.body) {
      return {
        subject: parsed.subject,
        body: parsed.body,
        tone: options.tone || 'formal',
        meetingDate: summary.generatedAt?.toLocaleDateString(),
      };
    }
  } catch (error) {
    console.error('AI email generation error:', error);
  }

  return null;
}

// ============================================
// TEMPLATE-BASED EMAIL GENERATION
// ============================================

function generateEmailFromTemplate(
  summary: MeetingSummary,
  options: EmailOptions
): FollowUpEmail {
  const tone: EmailTone = options.tone || 'formal';
  const { includeActionItems, includeDecisions, includeNextSteps, recipientName, senderName, meetingTitle, nextMeetingDate } = options;
  const meetingDate = summary.generatedAt?.toLocaleDateString() || new Date().toLocaleDateString();

  // Greetings based on tone
  const greetings = {
    formal: `Dear ${recipientName || 'Team'},`,
    casual: `Hi ${recipientName || 'everyone'},`,
    friendly: `Hey ${recipientName || 'team'}! 👋`,
  };

  // Opening based on tone
  const openings = {
    formal: `Thank you for taking the time to attend ${meetingTitle || 'our meeting'} on ${meetingDate}. I wanted to follow up with a summary of our discussion.`,
    casual: `Thanks for the great meeting${meetingTitle ? ` about ${meetingTitle}` : ''} today! Here's a quick recap of what we covered.`,
    friendly: `It was great chatting with you${meetingTitle ? ` about ${meetingTitle}` : ''}! Here's a quick summary so we're all on the same page.`,
  };

  // Closings based on tone
  const closings = {
    formal: `Please do not hesitate to reach out if you have any questions or concerns.\n\nBest regards,\n${senderName || '[Your Name]'}`,
    casual: `Let me know if you have any questions!\n\nThanks,\n${senderName || '[Your Name]'}`,
    friendly: `Feel free to ping me if anything's unclear! Looking forward to our next chat. 😊\n\nCheers,\n${senderName || '[Your Name]'}`,
  };

  let body = `${greetings[tone]}\n\n${openings[tone]}\n\n`;

  // Overview
  body += `**Meeting Overview:**\n${summary.overview}\n\n`;

  // Decisions
  if (includeDecisions && summary.decisions.length > 0) {
    body += `**Key Decisions:**\n`;
    summary.decisions.forEach(d => {
      body += `• ${d}\n`;
    });
    body += '\n';
  }

  // Action Items
  if (includeActionItems && summary.actionItems.length > 0) {
    body += `**Action Items:**\n`;
    summary.actionItems.forEach(item => {
      const owner = item.owner ? ` (${item.owner})` : '';
      const due = item.dueDate ? ` - Due: ${item.dueDate}` : '';
      body += `• ${item.task}${owner}${due}\n`;
    });
    body += '\n';
  }

  // Next Steps
  if (includeNextSteps && summary.nextSteps.length > 0) {
    body += `**Next Steps:**\n`;
    summary.nextSteps.forEach(step => {
      body += `• ${step}\n`;
    });
    body += '\n';
  }

  // Next meeting date
  if (nextMeetingDate) {
    body += `**Next Meeting:** ${nextMeetingDate}\n\n`;
  }

  // Closing
  body += closings[tone];

  // Subject line
  const subjectPrefixes = {
    formal: 'Meeting Follow-up: ',
    casual: 'Quick Recap: ',
    friendly: '📋 Notes from ',
  };

  const subject = `${subjectPrefixes[tone]}${meetingTitle || `Meeting on ${meetingDate}`}`;

  return {
    subject,
    body,
    tone,
    meetingDate,
  };
}

// ============================================
// API HELPERS
// ============================================

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

function parseJSONResponse(response: string): any | null {
  // Try to extract JSON from response
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error('Failed to parse JSON response:', e);
    }
  }
  return null;
}

// ============================================
// UTILITIES
// ============================================

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

/**
 * Format summary as plain text
 */
export function formatSummaryAsText(summary: MeetingSummary): string {
  let text = `MEETING SUMMARY\n`;
  text += `Generated: ${summary.generatedAt.toLocaleString()}\n`;
  text += `Format: ${summary.format}\n`;
  if (summary.participants?.length) {
    text += `Participants: ${summary.participants.join(', ')}\n`;
  }
  text += `\n---\n\n`;

  text += `OVERVIEW\n${summary.overview}\n\n`;

  if (summary.keyPoints.length > 0) {
    text += `KEY POINTS\n`;
    summary.keyPoints.forEach(point => {
      text += `• ${point}\n`;
    });
    text += '\n';
  }

  if (summary.decisions.length > 0) {
    text += `DECISIONS\n`;
    summary.decisions.forEach(decision => {
      text += `• ${decision}\n`;
    });
    text += '\n';
  }

  if (summary.actionItems.length > 0) {
    text += `ACTION ITEMS\n`;
    summary.actionItems.forEach(item => {
      const owner = item.owner ? ` [${item.owner}]` : '';
      const due = item.dueDate ? ` (Due: ${item.dueDate})` : '';
      text += `• ${item.task}${owner}${due}\n`;
    });
    text += '\n';
  }

  if (summary.openQuestions.length > 0) {
    text += `OPEN QUESTIONS\n`;
    summary.openQuestions.forEach(question => {
      text += `• ${question}\n`;
    });
    text += '\n';
  }

  if (summary.nextSteps.length > 0) {
    text += `NEXT STEPS\n`;
    summary.nextSteps.forEach(step => {
      text += `• ${step}\n`;
    });
  }

  return text;
}

/**
 * Format summary as Markdown
 */
export function formatSummaryAsMarkdown(summary: MeetingSummary): string {
  let md = `# Meeting Summary\n\n`;
  md += `*Generated: ${summary.generatedAt.toLocaleString()}*\n`;
  if (summary.participants?.length) {
    md += `*Participants: ${summary.participants.join(', ')}*\n`;
  }
  md += `\n---\n\n`;

  md += `## Overview\n${summary.overview}\n\n`;

  if (summary.keyPoints.length > 0) {
    md += `## Key Discussion Points\n`;
    summary.keyPoints.forEach(point => {
      md += `- ${point}\n`;
    });
    md += '\n';
  }

  if (summary.decisions.length > 0) {
    md += `## Decisions Made\n`;
    summary.decisions.forEach(decision => {
      md += `- ✅ ${decision}\n`;
    });
    md += '\n';
  }

  if (summary.actionItems.length > 0) {
    md += `## Action Items\n`;
    md += `| Task | Owner | Due Date |\n`;
    md += `|------|-------|----------|\n`;
    summary.actionItems.forEach(item => {
      md += `| ${item.task} | ${item.owner || '-'} | ${item.dueDate || '-'} |\n`;
    });
    md += '\n';
  }

  if (summary.openQuestions.length > 0) {
    md += `## Open Questions\n`;
    summary.openQuestions.forEach(question => {
      md += `- ❓ ${question}\n`;
    });
    md += '\n';
  }

  if (summary.nextSteps.length > 0) {
    md += `## Next Steps\n`;
    summary.nextSteps.forEach((step, i) => {
      md += `${i + 1}. ${step}\n`;
    });
  }

  return md;
}

/**
 * Copy email to clipboard
 */
export async function copyEmailToClipboard(email: FollowUpEmail): Promise<void> {
  const text = `Subject: ${email.subject}\n\n${email.body}`;
  await navigator.clipboard.writeText(text);
}

/**
 * Open email in default mail client
 */
export function openInMailClient(email: FollowUpEmail, recipients?: string[]): void {
  const to = recipients?.join(',') || '';
  const subject = encodeURIComponent(email.subject);
  const body = encodeURIComponent(email.body);
  
  window.open(`mailto:${to}?subject=${subject}&body=${body}`, '_blank');
}
