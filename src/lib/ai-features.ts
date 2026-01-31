/**
 * AI Features for Strategic Canvas
 *
 * Mock/simulated AI functionality for:
 * - Generating sticky notes from prompts
 * - Clustering stickies by theme
 * - Summarizing board content
 * - Expanding ideas with alternatives
 *
 * These functions simulate AI behavior using pattern matching and templates.
 * Can be connected to real AI APIs (OpenAI, Claude, etc.) later.
 */

import type { VisualNode } from '../types/board';

// Simulated delay to make it feel more "AI-like"
const simulateDelay = (ms: number = 800) => new Promise(resolve => setTimeout(resolve, ms));

// Theme/category keywords for clustering
const THEME_KEYWORDS: Record<string, string[]> = {
  'Marketing': ['marketing', 'brand', 'campaign', 'social', 'content', 'seo', 'ads', 'promotion', 'awareness', 'engagement', 'audience', 'viral', 'influencer'],
  'Product': ['product', 'feature', 'design', 'user', 'ux', 'ui', 'interface', 'experience', 'prototype', 'mvp', 'roadmap', 'backlog'],
  'Technology': ['tech', 'code', 'api', 'database', 'cloud', 'server', 'security', 'integration', 'automation', 'ai', 'machine learning', 'software'],
  'Finance': ['budget', 'cost', 'revenue', 'profit', 'investment', 'roi', 'pricing', 'sales', 'money', 'funding', 'financial'],
  'Operations': ['process', 'workflow', 'efficiency', 'optimize', 'scale', 'logistics', 'supply', 'delivery', 'operations', 'management'],
  'People': ['team', 'hire', 'culture', 'training', 'talent', 'hr', 'employee', 'collaboration', 'communication', 'leadership'],
  'Strategy': ['strategy', 'goal', 'vision', 'mission', 'objective', 'plan', 'growth', 'market', 'competitive', 'advantage'],
  'Customer': ['customer', 'client', 'feedback', 'support', 'satisfaction', 'retention', 'loyalty', 'service', 'experience'],
  'Risk': ['risk', 'challenge', 'problem', 'issue', 'concern', 'threat', 'weakness', 'obstacle', 'barrier'],
  'Opportunity': ['opportunity', 'potential', 'growth', 'expand', 'new', 'innovation', 'idea', 'possibility', 'chance']
};

// Templates for generating ideas based on topic categories
const IDEA_TEMPLATES: Record<string, string[]> = {
  'marketing': [
    'Launch a social media campaign targeting {audience}',
    'Create engaging video content showcasing {topic}',
    'Partner with influencers in the {niche} space',
    'Develop a content series about {topic}',
    'Run A/B tests on email subject lines',
    'Build a referral program with incentives',
    'Host a virtual event or webinar',
    'Create interactive quizzes for engagement',
    'Leverage user-generated content',
    'Optimize landing pages for conversion'
  ],
  'product': [
    'Add {feature} to improve user experience',
    'Simplify the onboarding flow',
    'Implement personalization features',
    'Create mobile-first design updates',
    'Add collaboration features for teams',
    'Build integration with popular tools',
    'Improve accessibility standards',
    'Add real-time sync capabilities',
    'Create templates for common use cases',
    'Implement AI-powered suggestions'
  ],
  'strategy': [
    'Expand into {market} market segment',
    'Develop strategic partnerships',
    'Create a freemium tier to drive adoption',
    'Focus on enterprise customers',
    'Build a community around the product',
    'Invest in thought leadership content',
    'Explore international expansion',
    'Develop vertical-specific solutions',
    'Create a partner ecosystem',
    'Focus on customer success metrics'
  ],
  'brainstorm': [
    'What if we approached this differently?',
    'Consider the opposite perspective',
    'How would a competitor solve this?',
    'What would delight users most?',
    'What is the simplest solution?',
    'How can we automate this?',
    'What data do we need to decide?',
    'Who should we talk to about this?',
    'What are we assuming?',
    'What would 10x growth require?'
  ],
  'default': [
    'Explore new approaches to {topic}',
    'Research best practices in {topic}',
    'Gather team input on {topic}',
    'Create a pilot program for {topic}',
    'Measure and iterate on {topic}',
    'Document learnings about {topic}',
    'Build a case study around {topic}',
    'Set clear success metrics for {topic}',
    'Identify quick wins in {topic}',
    'Plan long-term strategy for {topic}'
  ]
};

// Sentiment/tone keywords
const SENTIMENT_KEYWORDS = {
  positive: ['great', 'excellent', 'amazing', 'love', 'awesome', 'fantastic', 'perfect', 'best', 'wonderful', 'excited'],
  negative: ['problem', 'issue', 'bad', 'worst', 'hate', 'terrible', 'frustrating', 'difficult', 'challenge', 'risk'],
  neutral: ['consider', 'evaluate', 'analyze', 'review', 'discuss', 'explore', 'research', 'plan', 'assess']
};

/**
 * Generate sticky note content from a prompt
 */
export interface GeneratedSticky {
  content: string;
  suggestedColor: string;
  category?: string;
}

export async function generateStickies(prompt: string, count: number = 5): Promise<GeneratedSticky[]> {
  await simulateDelay(1000 + Math.random() * 500);

  const promptLower = prompt.toLowerCase();
  const results: GeneratedSticky[] = [];

  // Determine category from prompt
  let category = 'default';
  if (promptLower.includes('market') || promptLower.includes('brand') || promptLower.includes('campaign')) {
    category = 'marketing';
  } else if (promptLower.includes('product') || promptLower.includes('feature') || promptLower.includes('design')) {
    category = 'product';
  } else if (promptLower.includes('strateg') || promptLower.includes('grow') || promptLower.includes('expand')) {
    category = 'strategy';
  } else if (promptLower.includes('brainstorm') || promptLower.includes('idea') || promptLower.includes('think')) {
    category = 'brainstorm';
  }

  const templates = IDEA_TEMPLATES[category] || IDEA_TEMPLATES.default;
  const usedIndices = new Set<number>();

  // Extract topic from prompt for template substitution
  const topic = extractTopic(prompt);

  // Color palette for generated stickies
  const colors = [
    '#fef3c7', // Yellow
    '#dbeafe', // Blue
    '#dcfce7', // Green
    '#fce7f3', // Pink
    '#f3e8ff', // Purple
    '#ffedd5', // Orange
    '#ccfbf1', // Teal
    '#fee2e2', // Red
  ];

  for (let i = 0; i < Math.min(count, templates.length); i++) {
    // Pick a random unused template
    let idx: number;
    do {
      idx = Math.floor(Math.random() * templates.length);
    } while (usedIndices.has(idx) && usedIndices.size < templates.length);
    usedIndices.add(idx);

    let content = templates[idx];
    // Replace placeholders
    content = content.replace('{topic}', topic);
    content = content.replace('{feature}', topic);
    content = content.replace('{audience}', 'target audience');
    content = content.replace('{niche}', topic);
    content = content.replace('{market}', 'new');

    results.push({
      content,
      suggestedColor: colors[i % colors.length],
      category: category.charAt(0).toUpperCase() + category.slice(1)
    });
  }

  return results;
}

/**
 * Extract the main topic from a prompt
 */
function extractTopic(prompt: string): string {
  // Remove common words and extract key topic
  const stopWords = ['a', 'an', 'the', 'for', 'to', 'of', 'in', 'on', 'with', 'about', 'ideas', 'brainstorm', 'generate', 'create', 'make', 'some', 'me', 'give', 'suggest', 'help'];
  const words = prompt.toLowerCase().split(/\s+/).filter(w => !stopWords.includes(w) && w.length > 2);
  return words.slice(0, 2).join(' ') || 'this topic';
}

/**
 * Cluster sticky notes by theme/sentiment
 */
export interface StickyCluster {
  label: string;
  description: string;
  nodeIds: string[];
  suggestedColor: string;
  sentiment: 'positive' | 'negative' | 'neutral';
}

export async function clusterStickies(nodes: VisualNode[]): Promise<StickyCluster[]> {
  await simulateDelay(1200 + Math.random() * 600);

  // Filter to only sticky notes and text nodes with content
  const contentNodes = nodes.filter(n =>
    (n.type === 'sticky' || n.type === 'text') && n.content && n.content.trim().length > 0
  );

  if (contentNodes.length === 0) {
    return [];
  }

  // Group nodes by detected theme
  const themeGroups: Record<string, string[]> = {};
  const nodeSentiments: Record<string, 'positive' | 'negative' | 'neutral'> = {};

  contentNodes.forEach(node => {
    const contentLower = node.content.toLowerCase();

    // Detect sentiment
    let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
    if (SENTIMENT_KEYWORDS.positive.some(kw => contentLower.includes(kw))) {
      sentiment = 'positive';
    } else if (SENTIMENT_KEYWORDS.negative.some(kw => contentLower.includes(kw))) {
      sentiment = 'negative';
    }
    nodeSentiments[node.id] = sentiment;

    // Find matching theme
    let matchedTheme = 'General Ideas';
    let maxMatches = 0;

    for (const [theme, keywords] of Object.entries(THEME_KEYWORDS)) {
      const matches = keywords.filter(kw => contentLower.includes(kw)).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        matchedTheme = theme;
      }
    }

    if (!themeGroups[matchedTheme]) {
      themeGroups[matchedTheme] = [];
    }
    themeGroups[matchedTheme].push(node.id);
  });

  // Convert to clusters
  const clusterColors: Record<string, string> = {
    'Marketing': '#fce7f3',
    'Product': '#dbeafe',
    'Technology': '#f3e8ff',
    'Finance': '#dcfce7',
    'Operations': '#ffedd5',
    'People': '#fef3c7',
    'Strategy': '#ccfbf1',
    'Customer': '#fee2e2',
    'Risk': '#fee2e2',
    'Opportunity': '#dcfce7',
    'General Ideas': '#f3f4f6'
  };

  const clusterDescriptions: Record<string, string> = {
    'Marketing': 'Ideas related to marketing, branding, and promotion',
    'Product': 'Product features, design, and user experience',
    'Technology': 'Technical implementation and infrastructure',
    'Finance': 'Budget, costs, and financial considerations',
    'Operations': 'Processes, workflows, and efficiency',
    'People': 'Team, culture, and collaboration',
    'Strategy': 'Goals, planning, and growth',
    'Customer': 'Customer experience and satisfaction',
    'Risk': 'Challenges, risks, and concerns',
    'Opportunity': 'Growth opportunities and potential',
    'General Ideas': 'Miscellaneous ideas and thoughts'
  };

  const clusters: StickyCluster[] = [];

  for (const [theme, nodeIds] of Object.entries(themeGroups)) {
    if (nodeIds.length > 0) {
      // Determine overall sentiment for cluster
      const sentiments = nodeIds.map(id => nodeSentiments[id]);
      const sentimentCounts = {
        positive: sentiments.filter(s => s === 'positive').length,
        negative: sentiments.filter(s => s === 'negative').length,
        neutral: sentiments.filter(s => s === 'neutral').length
      };

      let clusterSentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
      if (sentimentCounts.positive > sentimentCounts.negative && sentimentCounts.positive > sentimentCounts.neutral) {
        clusterSentiment = 'positive';
      } else if (sentimentCounts.negative > sentimentCounts.positive && sentimentCounts.negative > sentimentCounts.neutral) {
        clusterSentiment = 'negative';
      }

      clusters.push({
        label: theme,
        description: clusterDescriptions[theme] || `Ideas related to ${theme.toLowerCase()}`,
        nodeIds,
        suggestedColor: clusterColors[theme] || '#f3f4f6',
        sentiment: clusterSentiment
      });
    }
  }

  // Sort by number of items (largest first)
  clusters.sort((a, b) => b.nodeIds.length - a.nodeIds.length);

  return clusters;
}

/**
 * Summarize all content on the board
 */
export interface BoardSummary {
  overview: string;
  keyThemes: string[];
  itemCounts: Record<string, number>;
  topItems: string[];
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  suggestions: string[];
}

export async function summarizeBoard(nodes: VisualNode[]): Promise<BoardSummary> {
  await simulateDelay(1500 + Math.random() * 500);

  // Count items by type
  const itemCounts: Record<string, number> = {};
  nodes.forEach(node => {
    itemCounts[node.type] = (itemCounts[node.type] || 0) + 1;
  });

  // Get content nodes
  const contentNodes = nodes.filter(n =>
    (n.type === 'sticky' || n.type === 'text' || n.type === 'mindmap') &&
    n.content && n.content.trim().length > 0
  );

  // Extract key themes
  const allContent = contentNodes.map(n => n.content.toLowerCase()).join(' ');
  const keyThemes: string[] = [];

  for (const [theme, keywords] of Object.entries(THEME_KEYWORDS)) {
    if (keywords.some(kw => allContent.includes(kw))) {
      keyThemes.push(theme);
    }
  }

  // Get top items (by votes or first few)
  const sortedByVotes = [...contentNodes].sort((a, b) => (b.votes || 0) - (a.votes || 0));
  const topItems = sortedByVotes.slice(0, 5).map(n => n.content);

  // Analyze overall sentiment
  let positiveCount = 0;
  let negativeCount = 0;

  contentNodes.forEach(node => {
    const contentLower = node.content.toLowerCase();
    if (SENTIMENT_KEYWORDS.positive.some(kw => contentLower.includes(kw))) {
      positiveCount++;
    }
    if (SENTIMENT_KEYWORDS.negative.some(kw => contentLower.includes(kw))) {
      negativeCount++;
    }
  });

  let sentiment: 'positive' | 'negative' | 'neutral' | 'mixed' = 'neutral';
  if (positiveCount > 0 && negativeCount > 0) {
    sentiment = 'mixed';
  } else if (positiveCount > negativeCount) {
    sentiment = 'positive';
  } else if (negativeCount > positiveCount) {
    sentiment = 'negative';
  }

  // Generate overview
  const totalItems = nodes.length;
  const stickyCount = itemCounts['sticky'] || 0;

  let overview = `This board contains ${totalItems} items`;
  if (stickyCount > 0) {
    overview += ` including ${stickyCount} sticky notes`;
  }
  if (keyThemes.length > 0) {
    overview += `. Main themes include ${keyThemes.slice(0, 3).join(', ')}`;
  }
  overview += '.';

  // Generate suggestions
  const suggestions: string[] = [];

  if (stickyCount < 5) {
    suggestions.push('Consider adding more ideas to explore the topic further');
  }
  if (keyThemes.length === 1) {
    suggestions.push('Try exploring related themes for a broader perspective');
  }
  if (sentiment === 'negative') {
    suggestions.push('Many items focus on challenges - consider balancing with opportunities');
  }
  if (!itemCounts['connector']) {
    suggestions.push('Use connectors to show relationships between ideas');
  }
  if (!itemCounts['frame']) {
    suggestions.push('Group related items using frames for better organization');
  }
  if (contentNodes.length > 10 && keyThemes.length > 3) {
    suggestions.push('Consider clustering similar ideas together');
  }

  return {
    overview,
    keyThemes: keyThemes.slice(0, 5),
    itemCounts,
    topItems,
    sentiment,
    suggestions: suggestions.slice(0, 4)
  };
}

/**
 * Expand an idea with alternative angles and related concepts
 */
export interface ExpandedIdea {
  original: string;
  alternatives: string[];
  questions: string[];
  relatedConcepts: string[];
}

export async function expandIdea(content: string): Promise<ExpandedIdea> {
  await simulateDelay(900 + Math.random() * 400);

  const contentLower = content.toLowerCase();

  // Generate alternative phrasings
  const alternatives: string[] = [];

  // Perspective shifts
  if (contentLower.includes('increase') || contentLower.includes('grow')) {
    alternatives.push(content.replace(/increase|grow/gi, 'optimize'));
    alternatives.push(content.replace(/increase|grow/gi, 'maximize'));
  }
  if (contentLower.includes('reduce') || contentLower.includes('decrease')) {
    alternatives.push(content.replace(/reduce|decrease/gi, 'eliminate'));
    alternatives.push(content.replace(/reduce|decrease/gi, 'minimize'));
  }

  // Add generic alternatives
  alternatives.push(`What if we approached "${content}" differently?`);
  alternatives.push(`Reverse approach: What's the opposite of "${content}"?`);
  alternatives.push(`Simplified version: What's the core of "${content}"?`);

  // Generate probing questions
  const questions = [
    `What would success look like for "${content}"?`,
    `What resources are needed for "${content}"?`,
    `Who should be involved in "${content}"?`,
    `What are the potential risks of "${content}"?`,
    `How would we measure progress on "${content}"?`,
    `What's the first step for "${content}"?`
  ];

  // Generate related concepts
  const relatedConcepts: string[] = [];

  // Find related themes
  for (const [theme, keywords] of Object.entries(THEME_KEYWORDS)) {
    if (keywords.some(kw => contentLower.includes(kw))) {
      relatedConcepts.push(`${theme} implications`);
      relatedConcepts.push(`${theme} metrics`);
    }
  }

  // Add generic related concepts
  relatedConcepts.push('Implementation timeline');
  relatedConcepts.push('Resource requirements');
  relatedConcepts.push('Success criteria');
  relatedConcepts.push('Stakeholder impact');

  return {
    original: content,
    alternatives: alternatives.slice(0, 4),
    questions: questions.slice(0, 4),
    relatedConcepts: relatedConcepts.slice(0, 4)
  };
}

/**
 * Suggest connections between nodes
 */
export interface SuggestedConnection {
  fromId: string;
  toId: string;
  reason: string;
  strength: 'strong' | 'moderate' | 'weak';
}

export async function suggestConnections(nodes: VisualNode[]): Promise<SuggestedConnection[]> {
  await simulateDelay(1000 + Math.random() * 500);

  const contentNodes = nodes.filter(n =>
    (n.type === 'sticky' || n.type === 'text' || n.type === 'mindmap') &&
    n.content && n.content.trim().length > 0
  );

  const suggestions: SuggestedConnection[] = [];

  // Compare each pair of nodes for similarity
  for (let i = 0; i < contentNodes.length; i++) {
    for (let j = i + 1; j < contentNodes.length; j++) {
      const nodeA = contentNodes[i];
      const nodeB = contentNodes[j];

      const contentA = nodeA.content.toLowerCase();
      const contentB = nodeB.content.toLowerCase();

      // Check for shared keywords
      const wordsA = new Set(contentA.split(/\s+/).filter(w => w.length > 3));
      const wordsB = new Set(contentB.split(/\s+/).filter(w => w.length > 3));

      const sharedWords = [...wordsA].filter(w => wordsB.has(w));

      // Check for theme connections
      let sharedThemes: string[] = [];
      for (const [theme, keywords] of Object.entries(THEME_KEYWORDS)) {
        const aHasTheme = keywords.some(kw => contentA.includes(kw));
        const bHasTheme = keywords.some(kw => contentB.includes(kw));
        if (aHasTheme && bHasTheme) {
          sharedThemes.push(theme);
        }
      }

      if (sharedWords.length >= 2 || sharedThemes.length >= 1) {
        let strength: 'strong' | 'moderate' | 'weak' = 'weak';
        let reason = 'Related concepts';

        if (sharedWords.length >= 3) {
          strength = 'strong';
          reason = `Share key terms: ${sharedWords.slice(0, 2).join(', ')}`;
        } else if (sharedWords.length >= 2 || sharedThemes.length >= 2) {
          strength = 'moderate';
          reason = sharedThemes.length > 0 ? `Both relate to ${sharedThemes[0]}` : 'Similar concepts';
        } else if (sharedThemes.length === 1) {
          reason = `Both relate to ${sharedThemes[0]}`;
        }

        suggestions.push({
          fromId: nodeA.id,
          toId: nodeB.id,
          reason,
          strength
        });
      }
    }
  }

  // Sort by strength and limit results
  const strengthOrder = { strong: 0, moderate: 1, weak: 2 };
  suggestions.sort((a, b) => strengthOrder[a.strength] - strengthOrder[b.strength]);

  return suggestions.slice(0, 10);
}
