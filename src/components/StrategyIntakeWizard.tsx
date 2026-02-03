/**
 * Strategy Intake Wizard — Multi-step questionnaire for new boards
 * 
 * Features:
 * - Multi-step form wizard
 * - Business type, goals, challenges, timeline, team size, budget
 * - Auto-populate canvas with relevant frameworks (SWOT, OKRs, Porter's 5 Forces, Business Model Canvas)
 * - Pre-filled sticky notes with prompts based on intake answers
 */

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Building2,
  Target,
  AlertTriangle,
  Calendar,
  Users,
  DollarSign,
  CheckCircle,
  Lightbulb,
  LayoutGrid,
  Loader2,
  ArrowRight,
  Zap,
} from 'lucide-react';
import type { Board, VisualNode } from '../types/board';

// ============================================
// TYPES
// ============================================

export interface StrategyIntakeWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateBoard: (board: Partial<Board> & { name: string; visualNodes: VisualNode[] }) => void;
}

interface IntakeData {
  businessType: string;
  businessName: string;
  industry: string;
  stage: string;
  goals: string[];
  customGoal: string;
  challenges: string[];
  customChallenge: string;
  timeline: string;
  teamSize: string;
  budget: string;
  frameworks: string[];
}

type WizardStep = 'business' | 'goals' | 'challenges' | 'logistics' | 'frameworks' | 'generating';

// ============================================
// CONSTANTS
// ============================================

const BUSINESS_TYPES = [
  { id: 'startup', label: 'Startup', icon: '🚀', description: 'Early-stage company' },
  { id: 'smb', label: 'Small Business', icon: '🏪', description: 'Established small business' },
  { id: 'enterprise', label: 'Enterprise', icon: '🏢', description: 'Large corporation' },
  { id: 'agency', label: 'Agency / Consulting', icon: '💼', description: 'Service provider' },
  { id: 'nonprofit', label: 'Nonprofit', icon: '🤝', description: 'Nonprofit organization' },
  { id: 'personal', label: 'Personal Project', icon: '👤', description: 'Individual project' },
];

const INDUSTRIES = [
  'Technology', 'Healthcare', 'Finance', 'Education', 'Retail', 'Manufacturing',
  'Real Estate', 'Marketing', 'Legal', 'Food & Beverage', 'Energy', 'Other',
];

const STAGES = [
  { id: 'idea', label: 'Idea Stage' },
  { id: 'mvp', label: 'MVP / Beta' },
  { id: 'growth', label: 'Growth Phase' },
  { id: 'scale', label: 'Scaling' },
  { id: 'mature', label: 'Mature Business' },
  { id: 'pivot', label: 'Pivoting / Restructuring' },
];

const GOAL_OPTIONS = [
  'Increase revenue',
  'Reduce costs',
  'Enter new markets',
  'Launch new product',
  'Improve customer retention',
  'Build team / hire talent',
  'Raise funding',
  'Improve operations',
  'Digital transformation',
  'Brand building',
  'Strategic partnerships',
  'Exit / acquisition prep',
];

const CHALLENGE_OPTIONS = [
  'Limited budget',
  'Talent shortage',
  'Market competition',
  'Customer acquisition',
  'Product-market fit',
  'Scaling operations',
  'Technical debt',
  'Regulatory compliance',
  'Team alignment',
  'Decision-making speed',
  'Data & analytics',
  'Innovation stagnation',
];

const TIMELINE_OPTIONS = [
  { id: '1month', label: '1 Month', description: 'Quick sprint' },
  { id: '3months', label: '3 Months', description: 'One quarter' },
  { id: '6months', label: '6 Months', description: 'Half year' },
  { id: '1year', label: '1 Year', description: 'Annual planning' },
  { id: '3years', label: '3+ Years', description: 'Long-term vision' },
];

const TEAM_SIZES = [
  { id: '1', label: 'Solo' },
  { id: '2-5', label: '2-5 people' },
  { id: '6-20', label: '6-20 people' },
  { id: '21-50', label: '21-50 people' },
  { id: '50+', label: '50+ people' },
];

const BUDGET_OPTIONS = [
  { id: 'bootstrap', label: 'Bootstrap', description: 'Minimal budget' },
  { id: 'small', label: '$1K - $10K', description: 'Small budget' },
  { id: 'medium', label: '$10K - $100K', description: 'Medium budget' },
  { id: 'large', label: '$100K+', description: 'Significant investment' },
  { id: 'na', label: 'N/A', description: 'Not applicable' },
];

const FRAMEWORK_OPTIONS = [
  { id: 'swot', label: 'SWOT Analysis', description: 'Strengths, Weaknesses, Opportunities, Threats', icon: '📊' },
  { id: 'okrs', label: 'OKRs', description: 'Objectives & Key Results', icon: '🎯' },
  { id: 'porters', label: "Porter's 5 Forces", description: 'Competitive analysis framework', icon: '⚔️' },
  { id: 'bmc', label: 'Business Model Canvas', description: '9-block business model', icon: '📋' },
  { id: 'lean', label: 'Lean Canvas', description: 'Startup-focused model', icon: '🚀' },
  { id: 'pestel', label: 'PESTEL Analysis', description: 'Macro environment factors', icon: '🌍' },
];

const STEPS: { id: WizardStep; label: string; icon: React.ReactNode }[] = [
  { id: 'business', label: 'Business', icon: <Building2 className="w-4 h-4" /> },
  { id: 'goals', label: 'Goals', icon: <Target className="w-4 h-4" /> },
  { id: 'challenges', label: 'Challenges', icon: <AlertTriangle className="w-4 h-4" /> },
  { id: 'logistics', label: 'Logistics', icon: <Calendar className="w-4 h-4" /> },
  { id: 'frameworks', label: 'Frameworks', icon: <LayoutGrid className="w-4 h-4" /> },
];

// ============================================
// FRAMEWORK GENERATORS
// ============================================

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function createStickyNode(
  x: number,
  y: number,
  content: string,
  color: string,
  width = 200,
  height = 150
): VisualNode {
  return {
    id: generateId(),
    type: 'sticky',
    x,
    y,
    width,
    height,
    content,
    color,
    rotation: 0,
    locked: false,
    votes: 0,
    votedBy: [],
    createdBy: 'system',
    comments: [],
    zIndex: 1,
  };
}

function createFrameNode(
  x: number,
  y: number,
  content: string,
  color: string,
  width = 450,
  height = 500
): VisualNode {
  return {
    id: generateId(),
    type: 'frame',
    x,
    y,
    width,
    height,
    content,
    color,
    rotation: 0,
    locked: true,
    votes: 0,
    votedBy: [],
    createdBy: 'system',
    comments: [],
    zIndex: 0,
  };
}

function createTextNode(
  x: number,
  y: number,
  content: string,
  fontSize = 24
): VisualNode {
  return {
    id: generateId(),
    type: 'text',
    x,
    y,
    width: 400,
    height: 60,
    content,
    color: '#1a1a2e',
    rotation: 0,
    locked: false,
    votes: 0,
    votedBy: [],
    createdBy: 'system',
    comments: [],
    textStyle: 'heading',
    fontSize,
    zIndex: 2,
  };
}

function generateSWOT(data: IntakeData): VisualNode[] {
  const nodes: VisualNode[] = [];
  const baseX = 50;
  const baseY = 100;
  const frameW = 400;
  const frameH = 400;
  const gap = 30;

  // Title
  nodes.push(createTextNode(baseX, baseY - 70, '📊 SWOT Analysis', 28));

  // Strengths frame
  nodes.push(createFrameNode(baseX, baseY, 'Strengths', '#dcfce7', frameW, frameH));
  const strengthPrompts = data.businessType === 'startup'
    ? ['Core team expertise', 'Unique technology/IP', 'First-mover advantage', 'Lean & agile']
    : ['Market position', 'Brand reputation', 'Key resources', 'Competitive advantages'];
  strengthPrompts.forEach((p, i) => {
    nodes.push(createStickyNode(baseX + 20 + (i % 2) * 190, baseY + 50 + Math.floor(i / 2) * 170, `💪 ${p}`, '#bbf7d0', 170, 140));
  });

  // Weaknesses frame
  nodes.push(createFrameNode(baseX + frameW + gap, baseY, 'Weaknesses', '#fef9c3', frameW, frameH));
  const weaknessPrompts = data.challenges.slice(0, 4).map(c => `⚡ ${c}`);
  if (weaknessPrompts.length < 2) weaknessPrompts.push('⚡ What internal gaps exist?', '⚡ Where do we fall short?');
  weaknessPrompts.forEach((p, i) => {
    nodes.push(createStickyNode(baseX + frameW + gap + 20 + (i % 2) * 190, baseY + 50 + Math.floor(i / 2) * 170, p, '#fef08a', 170, 140));
  });

  // Opportunities frame
  nodes.push(createFrameNode(baseX, baseY + frameH + gap, 'Opportunities', '#dbeafe', frameW, frameH));
  const opportunityPrompts = data.goals.slice(0, 4).map(g => `💡 ${g}`);
  if (opportunityPrompts.length < 2) opportunityPrompts.push('💡 New market opportunities', '💡 Emerging trends');
  opportunityPrompts.forEach((p, i) => {
    nodes.push(createStickyNode(baseX + 20 + (i % 2) * 190, baseY + frameH + gap + 50 + Math.floor(i / 2) * 170, p, '#bfdbfe', 170, 140));
  });

  // Threats frame
  nodes.push(createFrameNode(baseX + frameW + gap, baseY + frameH + gap, 'Threats', '#fecaca', frameW, frameH));
  const threatPrompts = ['🔴 Market competition', '🔴 Regulatory changes', '🔴 Economic downturn', '🔴 Technology disruption'];
  threatPrompts.forEach((p, i) => {
    nodes.push(createStickyNode(baseX + frameW + gap + 20 + (i % 2) * 190, baseY + frameH + gap + 50 + Math.floor(i / 2) * 170, p, '#fca5a5', 170, 140));
  });

  return nodes;
}

function generateOKRs(data: IntakeData): VisualNode[] {
  const nodes: VisualNode[] = [];
  const baseX = 950;
  const baseY = 100;

  nodes.push(createTextNode(baseX, baseY - 70, '🎯 OKRs — Objectives & Key Results', 28));

  const objectives = data.goals.slice(0, 3);
  if (objectives.length === 0) objectives.push('Define primary objective');

  objectives.forEach((goal, oi) => {
    const yOff = baseY + oi * 350;

    // Objective frame
    nodes.push(createFrameNode(baseX, yOff, `Objective ${oi + 1}: ${goal}`, '#ede9fe', 850, 300));

    // Key Results
    const krs = [
      `KR1: Define measurable target for "${goal}"`,
      `KR2: Set milestone checkpoint`,
      `KR3: Track completion metric`,
    ];
    krs.forEach((kr, ki) => {
      nodes.push(createStickyNode(baseX + 20 + ki * 270, yOff + 60, kr, '#c4b5fd', 250, 120));
    });

    // Action items
    nodes.push(createStickyNode(baseX + 20, yOff + 200, `☐ Action: First step toward "${goal}"`, '#e9d5ff', 400, 80));
  });

  return nodes;
}

function generatePorters(data: IntakeData): VisualNode[] {
  const nodes: VisualNode[] = [];
  const baseX = 50;
  const baseY = 950;

  nodes.push(createTextNode(baseX, baseY - 70, "⚔️ Porter's Five Forces", 28));

  const forces = [
    { name: 'Competitive Rivalry', color: '#fecaca', prompt: `How intense is competition in ${data.industry || 'your industry'}?`, x: 300, y: 0 },
    { name: 'Supplier Power', color: '#fed7aa', prompt: 'How much bargaining power do suppliers have?', x: 0, y: 250 },
    { name: 'Buyer Power', color: '#fef08a', prompt: 'How much bargaining power do customers have?', x: 600, y: 250 },
    { name: 'Threat of Substitution', color: '#bbf7d0', prompt: 'How easily can customers switch to alternatives?', x: 0, y: 500 },
    { name: 'Threat of New Entry', color: '#bfdbfe', prompt: 'How easy is it for new competitors to enter?', x: 600, y: 500 },
  ];

  forces.forEach(({ name, color, prompt, x, y }) => {
    nodes.push(createFrameNode(baseX + x, baseY + y, name, color, 280, 220));
    nodes.push(createStickyNode(baseX + x + 20, baseY + y + 50, prompt, color, 240, 120));
  });

  return nodes;
}

function generateBMC(data: IntakeData): VisualNode[] {
  const nodes: VisualNode[] = [];
  const baseX = 950;
  const baseY = 950;

  nodes.push(createTextNode(baseX, baseY - 70, '📋 Business Model Canvas', 28));

  const blocks = [
    { name: 'Key Partners', prompt: 'Who are your key partners and suppliers?', col: 0, row: 0 },
    { name: 'Key Activities', prompt: 'What key activities does your value proposition require?', col: 1, row: 0 },
    { name: 'Key Resources', prompt: `What key resources do you need? (Team: ${data.teamSize})`, col: 1, row: 1 },
    { name: 'Value Propositions', prompt: `Core value for ${data.industry || 'customers'}`, col: 2, row: 0, h: 2 },
    { name: 'Customer Relationships', prompt: 'How do you get, keep, and grow customers?', col: 3, row: 0 },
    { name: 'Channels', prompt: 'How do you reach your customer segments?', col: 3, row: 1 },
    { name: 'Customer Segments', prompt: 'Who are your most important customers?', col: 4, row: 0, h: 2 },
    { name: 'Cost Structure', prompt: `Budget: ${data.budget || 'TBD'} — What are the biggest costs?`, col: 0, row: 2, w: 2.5 },
    { name: 'Revenue Streams', prompt: data.goals.includes('Increase revenue') ? 'Revenue growth targets?' : 'How does the business make money?', col: 2.5, row: 2, w: 2.5 },
  ];

  const cellW = 220;
  const cellH = 200;
  const gap = 10;

  blocks.forEach(({ name, prompt, col, row, w, h }) => {
    const fw = (w || 1) * cellW + ((w || 1) - 1) * gap;
    const fh = (h || 1) * cellH + ((h || 1) - 1) * gap;
    const fx = baseX + col * (cellW + gap);
    const fy = baseY + row * (cellH + gap);
    nodes.push(createFrameNode(fx, fy, name, '#f3f4f6', fw, fh));
    nodes.push(createStickyNode(fx + 10, fy + 40, prompt, '#e0e7ff', Math.min(fw - 20, 200), 100));
  });

  return nodes;
}

function generateLeanCanvas(data: IntakeData): VisualNode[] {
  const nodes: VisualNode[] = [];
  const baseX = 50;
  const baseY = 1700;

  nodes.push(createTextNode(baseX, baseY - 70, '🚀 Lean Canvas', 28));

  const blocks = [
    { name: 'Problem', prompt: data.challenges.slice(0, 2).join(', ') || 'Top 3 problems', col: 0, row: 0 },
    { name: 'Solution', prompt: 'Top 3 features solving these problems', col: 1, row: 0 },
    { name: 'Unique Value Prop', prompt: 'Single, clear message that states why you are different', col: 2, row: 0, h: 2 },
    { name: 'Unfair Advantage', prompt: "What can't be easily copied or bought?", col: 3, row: 0 },
    { name: 'Customer Segments', prompt: 'Target customers and early adopters', col: 4, row: 0 },
    { name: 'Existing Alternatives', prompt: 'How do customers solve this today?', col: 0, row: 1 },
    { name: 'Key Metrics', prompt: 'Key numbers that tell you how the business is doing', col: 1, row: 1 },
    { name: 'High-Level Concept', prompt: 'X for Y analogy', col: 3, row: 1 },
    { name: 'Channels', prompt: 'Path to customers', col: 4, row: 1 },
    { name: 'Cost Structure', prompt: `Budget: ${data.budget || 'TBD'}`, col: 0, row: 2, w: 2.5 },
    { name: 'Revenue Streams', prompt: 'Revenue model and pricing', col: 2.5, row: 2, w: 2.5 },
  ];

  const cellW = 220;
  const cellH = 200;
  const gap = 10;

  blocks.forEach(({ name, prompt, col, row, w, h }) => {
    const fw = (w || 1) * cellW + ((w || 1) - 1) * gap;
    const fh = (h || 1) * cellH + ((h || 1) - 1) * gap;
    const fx = baseX + col * (cellW + gap);
    const fy = baseY + row * (cellH + gap);
    nodes.push(createFrameNode(fx, fy, name, '#fdf4ff', fw, fh));
    nodes.push(createStickyNode(fx + 10, fy + 40, prompt, '#f5d0fe', Math.min(fw - 20, 200), 100));
  });

  return nodes;
}

function generatePESTEL(data: IntakeData): VisualNode[] {
  const nodes: VisualNode[] = [];
  const baseX = 950;
  const baseY = 1700;

  nodes.push(createTextNode(baseX, baseY - 70, '🌍 PESTEL Analysis', 28));

  const factors = [
    { name: 'Political', prompt: 'Government policies, trade, taxes affecting you', color: '#fecaca' },
    { name: 'Economic', prompt: `Economic factors (Budget: ${data.budget || 'TBD'})`, color: '#fed7aa' },
    { name: 'Social', prompt: 'Social trends, demographics, cultural factors', color: '#fef08a' },
    { name: 'Technological', prompt: 'Tech changes, innovation, automation', color: '#bbf7d0' },
    { name: 'Environmental', prompt: 'Environmental regulations, sustainability', color: '#bfdbfe' },
    { name: 'Legal', prompt: 'Legal requirements, regulations, compliance', color: '#e9d5ff' },
  ];

  factors.forEach(({ name, prompt, color }, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = baseX + col * 310;
    const y = baseY + row * 280;
    nodes.push(createFrameNode(x, y, name, color, 290, 250));
    nodes.push(createStickyNode(x + 20, y + 50, prompt, color, 250, 120));
  });

  return nodes;
}

function generateBoardFromIntake(data: IntakeData): { name: string; visualNodes: VisualNode[] } {
  let nodes: VisualNode[] = [];

  // Title node
  nodes.push(createTextNode(50, 20, `${data.businessName || 'Strategy'} — Strategic Canvas`, 32));

  for (const fw of data.frameworks) {
    switch (fw) {
      case 'swot':
        nodes = nodes.concat(generateSWOT(data));
        break;
      case 'okrs':
        nodes = nodes.concat(generateOKRs(data));
        break;
      case 'porters':
        nodes = nodes.concat(generatePorters(data));
        break;
      case 'bmc':
        nodes = nodes.concat(generateBMC(data));
        break;
      case 'lean':
        nodes = nodes.concat(generateLeanCanvas(data));
        break;
      case 'pestel':
        nodes = nodes.concat(generatePESTEL(data));
        break;
    }
  }

  // If no frameworks selected, create a basic strategy canvas
  if (data.frameworks.length === 0) {
    nodes = nodes.concat(generateSWOT(data));
    nodes = nodes.concat(generateOKRs(data));
  }

  return {
    name: `${data.businessName || data.businessType || 'New'} Strategy Board`,
    visualNodes: nodes,
  };
}

// ============================================
// STEP COMPONENTS
// ============================================

interface StepProps {
  data: IntakeData;
  onChange: (data: Partial<IntakeData>) => void;
}

const BusinessStep: React.FC<StepProps> = ({ data, onChange }) => (
  <div className="space-y-6">
    <div>
      <label className="text-sm font-medium text-gray-700 mb-2 block">Business Name</label>
      <input
        type="text"
        value={data.businessName}
        onChange={(e) => onChange({ businessName: e.target.value })}
        placeholder="e.g., Acme Corp"
        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
      />
    </div>

    <div>
      <label className="text-sm font-medium text-gray-700 mb-3 block">Business Type</label>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {BUSINESS_TYPES.map((bt) => (
          <button
            key={bt.id}
            onClick={() => onChange({ businessType: bt.id })}
            className={`p-3 rounded-xl border-2 text-left transition-all ${
              data.businessType === bt.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="text-xl mb-1">{bt.icon}</div>
            <div className="text-sm font-medium text-gray-900">{bt.label}</div>
            <div className="text-xs text-gray-500">{bt.description}</div>
          </button>
        ))}
      </div>
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">Industry</label>
        <select
          value={data.industry}
          onChange={(e) => onChange({ industry: e.target.value })}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
        >
          <option value="">Select industry...</option>
          {INDUSTRIES.map((ind) => (
            <option key={ind} value={ind}>{ind}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">Stage</label>
        <select
          value={data.stage}
          onChange={(e) => onChange({ stage: e.target.value })}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
        >
          <option value="">Select stage...</option>
          {STAGES.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </div>
    </div>
  </div>
);

const GoalsStep: React.FC<StepProps> = ({ data, onChange }) => (
  <div className="space-y-4">
    <p className="text-sm text-gray-500">Select your primary strategic goals (pick up to 5).</p>
    <div className="grid grid-cols-2 gap-2">
      {GOAL_OPTIONS.map((goal) => {
        const selected = data.goals.includes(goal);
        return (
          <button
            key={goal}
            onClick={() => {
              if (selected) {
                onChange({ goals: data.goals.filter(g => g !== goal) });
              } else if (data.goals.length < 5) {
                onChange({ goals: [...data.goals, goal] });
              }
            }}
            className={`p-3 rounded-xl border-2 text-left text-sm transition-all ${
              selected ? 'border-indigo-500 bg-indigo-50 text-indigo-900' : 'border-gray-200 hover:border-gray-300 text-gray-700'
            }`}
          >
            <span className="mr-2">{selected ? '✓' : '○'}</span>
            {goal}
          </button>
        );
      })}
    </div>
    <input
      type="text"
      value={data.customGoal}
      onChange={(e) => onChange({ customGoal: e.target.value })}
      placeholder="Add a custom goal..."
      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
      onKeyDown={(e) => {
        if (e.key === 'Enter' && data.customGoal.trim()) {
          onChange({ goals: [...data.goals, data.customGoal.trim()], customGoal: '' });
        }
      }}
    />
  </div>
);

const ChallengesStep: React.FC<StepProps> = ({ data, onChange }) => (
  <div className="space-y-4">
    <p className="text-sm text-gray-500">What challenges are you facing? (Select all that apply)</p>
    <div className="grid grid-cols-2 gap-2">
      {CHALLENGE_OPTIONS.map((challenge) => {
        const selected = data.challenges.includes(challenge);
        return (
          <button
            key={challenge}
            onClick={() => {
              if (selected) {
                onChange({ challenges: data.challenges.filter(c => c !== challenge) });
              } else {
                onChange({ challenges: [...data.challenges, challenge] });
              }
            }}
            className={`p-3 rounded-xl border-2 text-left text-sm transition-all ${
              selected ? 'border-amber-500 bg-amber-50 text-amber-900' : 'border-gray-200 hover:border-gray-300 text-gray-700'
            }`}
          >
            <span className="mr-2">{selected ? '⚡' : '○'}</span>
            {challenge}
          </button>
        );
      })}
    </div>
    <input
      type="text"
      value={data.customChallenge}
      onChange={(e) => onChange({ customChallenge: e.target.value })}
      placeholder="Add a custom challenge..."
      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
      onKeyDown={(e) => {
        if (e.key === 'Enter' && data.customChallenge.trim()) {
          onChange({ challenges: [...data.challenges, data.customChallenge.trim()], customChallenge: '' });
        }
      }}
    />
  </div>
);

const LogisticsStep: React.FC<StepProps> = ({ data, onChange }) => (
  <div className="space-y-6">
    <div>
      <label className="text-sm font-medium text-gray-700 mb-3 block">Planning Timeline</label>
      <div className="flex flex-wrap gap-2">
        {TIMELINE_OPTIONS.map((t) => (
          <button
            key={t.id}
            onClick={() => onChange({ timeline: t.id })}
            className={`px-4 py-2.5 rounded-xl border-2 text-sm transition-all ${
              data.timeline === t.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="font-medium text-gray-900">{t.label}</div>
            <div className="text-xs text-gray-500">{t.description}</div>
          </button>
        ))}
      </div>
    </div>

    <div>
      <label className="text-sm font-medium text-gray-700 mb-3 block">Team Size</label>
      <div className="flex flex-wrap gap-2">
        {TEAM_SIZES.map((ts) => (
          <button
            key={ts.id}
            onClick={() => onChange({ teamSize: ts.id })}
            className={`px-4 py-2 rounded-xl border-2 text-sm transition-all ${
              data.teamSize === ts.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            {ts.label}
          </button>
        ))}
      </div>
    </div>

    <div>
      <label className="text-sm font-medium text-gray-700 mb-3 block">Budget Range</label>
      <div className="flex flex-wrap gap-2">
        {BUDGET_OPTIONS.map((b) => (
          <button
            key={b.id}
            onClick={() => onChange({ budget: b.id })}
            className={`px-4 py-2.5 rounded-xl border-2 text-sm transition-all ${
              data.budget === b.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="font-medium text-gray-900">{b.label}</div>
            <div className="text-xs text-gray-500">{b.description}</div>
          </button>
        ))}
      </div>
    </div>
  </div>
);

const FrameworksStep: React.FC<StepProps & { recommended: string[] }> = ({ data, onChange, recommended }) => (
  <div className="space-y-4">
    <p className="text-sm text-gray-500">Choose the strategic frameworks to pre-populate your canvas.</p>
    {recommended.length > 0 && (
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 flex items-start gap-2">
        <Sparkles className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-indigo-700">
          <strong>Recommended for you:</strong> Based on your inputs, we suggest{' '}
          {recommended.map((r, i) => (
            <span key={r}>
              <strong>{FRAMEWORK_OPTIONS.find(f => f.id === r)?.label}</strong>
              {i < recommended.length - 1 ? (i === recommended.length - 2 ? ' and ' : ', ') : ''}
            </span>
          ))}
        </div>
      </div>
    )}
    <div className="grid grid-cols-2 gap-3">
      {FRAMEWORK_OPTIONS.map((fw) => {
        const selected = data.frameworks.includes(fw.id);
        const isRecommended = recommended.includes(fw.id);
        return (
          <button
            key={fw.id}
            onClick={() => {
              if (selected) {
                onChange({ frameworks: data.frameworks.filter(f => f !== fw.id) });
              } else {
                onChange({ frameworks: [...data.frameworks, fw.id] });
              }
            }}
            className={`p-4 rounded-xl border-2 text-left transition-all relative ${
              selected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            {isRecommended && !selected && (
              <span className="absolute top-2 right-2 text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
                Recommended
              </span>
            )}
            <div className="text-xl mb-1">{fw.icon}</div>
            <div className="text-sm font-medium text-gray-900">{fw.label}</div>
            <div className="text-xs text-gray-500 mt-0.5">{fw.description}</div>
          </button>
        );
      })}
    </div>
  </div>
);

// ============================================
// MAIN COMPONENT
// ============================================

export const StrategyIntakeWizard: React.FC<StrategyIntakeWizardProps> = ({
  isOpen,
  onClose,
  onCreateBoard,
}) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>('business');
  const [data, setData] = useState<IntakeData>({
    businessType: '',
    businessName: '',
    industry: '',
    stage: '',
    goals: [],
    customGoal: '',
    challenges: [],
    customChallenge: '',
    timeline: '',
    teamSize: '',
    budget: '',
    frameworks: [],
  });

  const handleChange = useCallback((partial: Partial<IntakeData>) => {
    setData(prev => ({ ...prev, ...partial }));
  }, []);

  const stepIndex = STEPS.findIndex(s => s.id === currentStep);

  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 'business': return data.businessType !== '';
      case 'goals': return data.goals.length > 0;
      case 'challenges': return true; // Optional
      case 'logistics': return true; // Optional
      case 'frameworks': return true; // Will auto-select if empty
      default: return false;
    }
  }, [currentStep, data]);

  const recommendedFrameworks = useMemo(() => {
    const recs: string[] = [];
    // Always recommend SWOT
    recs.push('swot');
    // Startups get Lean Canvas
    if (data.businessType === 'startup' || data.stage === 'idea' || data.stage === 'mvp') {
      recs.push('lean');
    }
    // Goals-focused → OKRs
    if (data.goals.length > 0) recs.push('okrs');
    // Enterprise/mature → Porter's & BMC
    if (data.businessType === 'enterprise' || data.stage === 'mature' || data.stage === 'scale') {
      recs.push('porters');
      recs.push('bmc');
    }
    return [...new Set(recs)].slice(0, 3);
  }, [data]);

  const handleNext = useCallback(() => {
    const idx = STEPS.findIndex(s => s.id === currentStep);
    if (idx < STEPS.length - 1) {
      setCurrentStep(STEPS[idx + 1].id);
    }
  }, [currentStep]);

  const handleBack = useCallback(() => {
    const idx = STEPS.findIndex(s => s.id === currentStep);
    if (idx > 0) {
      setCurrentStep(STEPS[idx - 1].id);
    }
  }, [currentStep]);

  const handleGenerate = useCallback(() => {
    setCurrentStep('generating');

    // Auto-select recommended frameworks if none chosen
    const finalData = { ...data };
    if (finalData.frameworks.length === 0) {
      finalData.frameworks = recommendedFrameworks;
    }

    // Simulate generation delay
    setTimeout(() => {
      const result = generateBoardFromIntake(finalData);
      onCreateBoard({
        name: result.name,
        visualNodes: result.visualNodes,
        status: 'active',
        progress: 0,
      });
      onClose();
    }, 1500);
  }, [data, recommendedFrameworks, onCreateBoard, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Strategy Intake</h2>
                  <p className="text-xs text-gray-500">Answer a few questions to build your strategic canvas</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Progress Steps */}
            {currentStep !== 'generating' && (
              <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-2">
                  {STEPS.map((step, i) => (
                    <React.Fragment key={step.id}>
                      <button
                        onClick={() => i <= stepIndex && setCurrentStep(step.id)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                          step.id === currentStep
                            ? 'bg-indigo-100 text-indigo-700'
                            : i < stepIndex
                              ? 'bg-green-50 text-green-700 cursor-pointer'
                              : 'text-gray-400'
                        }`}
                      >
                        {i < stepIndex ? (
                          <CheckCircle className="w-3.5 h-3.5" />
                        ) : (
                          step.icon
                        )}
                        <span className="hidden sm:inline">{step.label}</span>
                      </button>
                      {i < STEPS.length - 1 && (
                        <ChevronRight className="w-3 h-3 text-gray-300 flex-shrink-0" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <AnimatePresence mode="wait">
                {currentStep === 'generating' ? (
                  <motion.div
                    key="generating"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-16"
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6"
                    >
                      <Sparkles className="w-8 h-8 text-white" />
                    </motion.div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Building Your Strategy Canvas</h3>
                    <p className="text-sm text-gray-500 text-center max-w-sm">
                      Generating frameworks and pre-filling prompts based on your inputs...
                    </p>
                    <div className="flex gap-1 mt-4">
                      {[0, 1, 2].map(i => (
                        <motion.div
                          key={i}
                          className="w-2 h-2 bg-indigo-400 rounded-full"
                          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                        />
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {currentStep === 'business' && 'Tell us about your business'}
                      {currentStep === 'goals' && 'What are your strategic goals?'}
                      {currentStep === 'challenges' && 'What challenges are you facing?'}
                      {currentStep === 'logistics' && 'Timeline & resources'}
                      {currentStep === 'frameworks' && 'Choose your frameworks'}
                    </h3>
                    <p className="text-sm text-gray-500 mb-6">
                      {currentStep === 'business' && "We'll tailor the canvas to your business context."}
                      {currentStep === 'goals' && "These will be mapped to OKRs and strategy frameworks."}
                      {currentStep === 'challenges' && "We'll map these to your SWOT weaknesses and risk analysis."}
                      {currentStep === 'logistics' && "Help us scope the right planning horizon."}
                      {currentStep === 'frameworks' && "Pick the strategic frameworks to include on your canvas."}
                    </p>

                    {currentStep === 'business' && <BusinessStep data={data} onChange={handleChange} />}
                    {currentStep === 'goals' && <GoalsStep data={data} onChange={handleChange} />}
                    {currentStep === 'challenges' && <ChallengesStep data={data} onChange={handleChange} />}
                    {currentStep === 'logistics' && <LogisticsStep data={data} onChange={handleChange} />}
                    {currentStep === 'frameworks' && <FrameworksStep data={data} onChange={handleChange} recommended={recommendedFrameworks} />}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            {currentStep !== 'generating' && (
              <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between bg-gray-50">
                <button
                  onClick={stepIndex > 0 ? handleBack : onClose}
                  className="flex items-center gap-1 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  {stepIndex > 0 ? 'Back' : 'Cancel'}
                </button>

                {stepIndex < STEPS.length - 1 ? (
                  <button
                    onClick={handleNext}
                    disabled={!canProceed}
                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleGenerate}
                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all"
                  >
                    <Zap className="w-4 h-4" />
                    Generate Canvas
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StrategyIntakeWizard;
