// Board Templates Library - Premium Edition
// World-class templates with Mural-quality aesthetics
// Pre-made templates for strategic planning and collaboration

export type TemplateCategory = 'strategy' | 'agile' | 'design' | 'meeting' | 'planning';

export interface TemplateNode {
  id?: string;
  type: 'sticky' | 'frame' | 'text' | 'shape' | 'opportunity' | 'risk' | 'action';
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  color: string;
  fontSize?: number;
  shapeType?: 'rectangle' | 'circle' | 'triangle' | 'diamond';
  textStyle?: 'heading' | 'paragraph' | 'body';
  borderWidth?: number;
  borderColor?: string;
  borderRadius?: number;
  rotation?: number;
  locked?: boolean;
  votes?: number;
  votedBy?: string[];
  createdBy?: string;
  comments?: { id: string; userId: string; content: string; timestamp: Date }[];
  zIndex?: number;
  gradient?: string;
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  opacity?: number;
}

export interface BoardTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  icon: string;
  thumbnail?: string;
  tags: string[];
  nodes: TemplateNode[];
  connectors?: TemplateConnector[];
}

export interface TemplateConnector {
  fromNodeIndex: number;
  toNodeIndex: number;
  style: 'solid' | 'dashed' | 'dotted';
  color: string;
  animated?: boolean;
  curveStyle?: 'straight' | 'curved' | 'elbow';
  label?: string;
}

// ============================================================================
// PREMIUM COLOR PALETTE - Mural-inspired
// ============================================================================

export const TEMPLATE_COLORS = {
  // Vibrant Greens - growth, success, positive
  green: {
    light: '#d1fae5',
    medium: '#6ee7b7',
    dark: '#10b981',
    text: '#065f46',
    gradient: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
    glow: 'rgba(16, 185, 129, 0.3)',
  },
  // Warm Yellows - ideas, energy, caution
  yellow: {
    light: '#fef3c7',
    medium: '#fcd34d',
    dark: '#f59e0b',
    text: '#92400e',
    gradient: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
    glow: 'rgba(245, 158, 11, 0.3)',
  },
  // Cool Blues - trust, stability, information
  blue: {
    light: '#dbeafe',
    medium: '#93c5fd',
    dark: '#3b82f6',
    text: '#1e40af',
    gradient: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
    glow: 'rgba(59, 130, 246, 0.3)',
  },
  // Bold Reds - urgency, risk, important
  red: {
    light: '#fee2e2',
    medium: '#fca5a5',
    dark: '#ef4444',
    text: '#991b1b',
    gradient: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
    glow: 'rgba(239, 68, 68, 0.3)',
  },
  // Rich Purples - creativity, premium
  purple: {
    light: '#f3e8ff',
    medium: '#c4b5fd',
    dark: '#8b5cf6',
    text: '#5b21b6',
    gradient: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)',
    glow: 'rgba(139, 92, 246, 0.3)',
  },
  // Soft Pinks - empathy, human-centered
  pink: {
    light: '#fce7f3',
    medium: '#f9a8d4',
    dark: '#ec4899',
    text: '#9d174d',
    gradient: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)',
    glow: 'rgba(236, 72, 153, 0.3)',
  },
  // Neutral Grays - balance, foundation
  gray: {
    light: '#f8fafc',
    medium: '#e2e8f0',
    dark: '#64748b',
    text: '#1e293b',
    gradient: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
    glow: 'rgba(100, 116, 139, 0.2)',
  },
  // Fresh Teals - action, progress
  teal: {
    light: '#ccfbf1',
    medium: '#5eead4',
    dark: '#14b8a6',
    text: '#115e59',
    gradient: 'linear-gradient(135deg, #ccfbf1 0%, #99f6e4 100%)',
    glow: 'rgba(20, 184, 166, 0.3)',
  },
  // Deep Indigos - insight, depth
  indigo: {
    light: '#e0e7ff',
    medium: '#a5b4fc',
    dark: '#6366f1',
    text: '#3730a3',
    gradient: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
    glow: 'rgba(99, 102, 241, 0.3)',
  },
  // Energetic Oranges - enthusiasm, creativity
  orange: {
    light: '#ffedd5',
    medium: '#fdba74',
    dark: '#f97316',
    text: '#9a3412',
    gradient: 'linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%)',
    glow: 'rgba(249, 115, 22, 0.3)',
  },
  // Premium Slate - sophisticated, modern
  slate: {
    light: '#f1f5f9',
    medium: '#cbd5e1',
    dark: '#475569',
    text: '#0f172a',
    gradient: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
    glow: 'rgba(71, 85, 105, 0.2)',
  },
  // Accent colors for special elements
  coral: {
    light: '#fff1f2',
    medium: '#fda4af',
    dark: '#f43f5e',
    text: '#9f1239',
    gradient: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)',
    glow: 'rgba(244, 63, 94, 0.3)',
  },
  // Cyan for fresh highlights
  cyan: {
    light: '#cffafe',
    medium: '#67e8f9',
    dark: '#06b6d4',
    text: '#155e75',
    gradient: 'linear-gradient(135deg, #cffafe 0%, #a5f3fc 100%)',
    glow: 'rgba(6, 182, 212, 0.3)',
  },
};

// Premium gradient presets
export const PREMIUM_GRADIENTS = {
  sunrise: 'linear-gradient(135deg, #fef3c7 0%, #fce7f3 50%, #e0e7ff 100%)',
  ocean: 'linear-gradient(135deg, #cffafe 0%, #dbeafe 50%, #e0e7ff 100%)',
  forest: 'linear-gradient(135deg, #d1fae5 0%, #ccfbf1 50%, #cffafe 100%)',
  sunset: 'linear-gradient(135deg, #ffedd5 0%, #fee2e2 50%, #fce7f3 100%)',
  aurora: 'linear-gradient(135deg, #e0e7ff 0%, #f3e8ff 50%, #fce7f3 100%)',
  midnight: 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)',
};

// ============================================================================
// TEMPLATE DEFINITIONS - Premium Redesign
// ============================================================================

// 1. SWOT Analysis Template - Premium Edition
const swotAnalysisTemplate: BoardTemplate = {
  id: 'swot-analysis',
  name: 'SWOT Analysis',
  description: 'Strategic 4-quadrant framework for analyzing Strengths, Weaknesses, Opportunities, and Threats',
  category: 'strategy',
  icon: '📊',
  tags: ['strategy', 'analysis', 'planning', 'competitive'],
  nodes: [
    // Premium Title with gradient background
    {
      type: 'frame',
      x: 380,
      y: 20,
      width: 320,
      height: 80,
      content: '📊 SWOT ANALYSIS\nStrategic Planning Framework',
      color: TEMPLATE_COLORS.indigo.light,
      borderRadius: 20,
      shadow: 'lg',
      fontSize: 24,
      textStyle: 'heading',
    },
    // Internal Factors Label
    {
      type: 'text',
      x: 60,
      y: 115,
      width: 120,
      height: 30,
      content: 'INTERNAL',
      color: 'transparent',
      fontSize: 12,
      textStyle: 'paragraph',
    },
    // External Factors Label
    {
      type: 'text',
      x: 60,
      y: 505,
      width: 120,
      height: 30,
      content: 'EXTERNAL',
      color: 'transparent',
      fontSize: 12,
      textStyle: 'paragraph',
    },
    // Helpful Label
    {
      type: 'text',
      x: 280,
      y: 115,
      width: 200,
      height: 25,
      content: '✅ HELPFUL',
      color: 'transparent',
      fontSize: 12,
      textStyle: 'paragraph',
    },
    // Harmful Label
    {
      type: 'text',
      x: 600,
      y: 115,
      width: 200,
      height: 25,
      content: '⚠️ HARMFUL',
      color: 'transparent',
      fontSize: 12,
      textStyle: 'paragraph',
    },
    // Strengths (Top-Left - Green with gradient)
    {
      type: 'frame',
      x: 100,
      y: 140,
      width: 380,
      height: 340,
      content: '💪 STRENGTHS\n\nInternal positive attributes\n\n• What unique advantages do we have?\n• What do we do better than others?\n• What resources can we access?\n• What do stakeholders see as strengths?',
      color: TEMPLATE_COLORS.green.light,
      borderRadius: 24,
      borderColor: TEMPLATE_COLORS.green.medium,
      borderWidth: 3,
      shadow: 'md',
    },
    // Weaknesses (Top-Right - Coral/Red)
    {
      type: 'frame',
      x: 500,
      y: 140,
      width: 380,
      height: 340,
      content: '🔧 WEAKNESSES\n\nInternal challenges to address\n\n• What could we improve?\n• Where do we lack resources?\n• What do competitors do better?\n• What factors lose us opportunities?',
      color: TEMPLATE_COLORS.coral.light,
      borderRadius: 24,
      borderColor: TEMPLATE_COLORS.coral.medium,
      borderWidth: 3,
      shadow: 'md',
    },
    // Opportunities (Bottom-Left - Blue)
    {
      type: 'frame',
      x: 100,
      y: 500,
      width: 380,
      height: 340,
      content: '🚀 OPPORTUNITIES\n\nExternal factors to leverage\n\n• What trends can we capitalize on?\n• What market gaps can we fill?\n• What new technologies can we use?\n• What partnerships could benefit us?',
      color: TEMPLATE_COLORS.blue.light,
      borderRadius: 24,
      borderColor: TEMPLATE_COLORS.blue.medium,
      borderWidth: 3,
      shadow: 'md',
    },
    // Threats (Bottom-Right - Orange/Amber)
    {
      type: 'frame',
      x: 500,
      y: 500,
      width: 380,
      height: 340,
      content: '⚡ THREATS\n\nExternal risks to mitigate\n\n• What obstacles do we face?\n• What are competitors doing?\n• What regulations might affect us?\n• What economic factors pose risks?',
      color: TEMPLATE_COLORS.orange.light,
      borderRadius: 24,
      borderColor: TEMPLATE_COLORS.orange.medium,
      borderWidth: 3,
      shadow: 'md',
    },
    // Center focal point
    {
      type: 'shape',
      shapeType: 'circle',
      x: 420,
      y: 420,
      width: 140,
      height: 140,
      content: '🎯\nFOCUS',
      color: TEMPLATE_COLORS.purple.light,
      borderColor: TEMPLATE_COLORS.purple.dark,
      borderWidth: 4,
      shadow: 'xl',
    },
    // Sample sticky notes
    {
      type: 'sticky',
      x: 130,
      y: 280,
      width: 150,
      height: 90,
      content: 'Strong brand recognition',
      color: '#bbf7d0',
      borderRadius: 12,
      shadow: 'sm',
    },
    {
      type: 'sticky',
      x: 530,
      y: 280,
      width: 150,
      height: 90,
      content: 'Limited market reach',
      color: '#fecdd3',
      borderRadius: 12,
      shadow: 'sm',
    },
  ],
};

// 2. Business Model Canvas Template - Premium Edition
const businessModelCanvasTemplate: BoardTemplate = {
  id: 'business-model-canvas',
  name: 'Business Model Canvas',
  description: '9 building blocks to design, challenge, and innovate your business model',
  category: 'strategy',
  icon: '🏢',
  tags: ['business', 'model', 'startup', 'strategy', 'value proposition'],
  nodes: [
    // Premium Title Banner
    {
      type: 'frame',
      x: 400,
      y: 15,
      width: 440,
      height: 60,
      content: '🏢 BUSINESS MODEL CANVAS',
      color: TEMPLATE_COLORS.slate.light,
      borderRadius: 16,
      shadow: 'lg',
      fontSize: 24,
      textStyle: 'heading',
    },
    // Key Partners (Far Left)
    {
      type: 'frame',
      x: 30,
      y: 90,
      width: 210,
      height: 350,
      content: '🤝 KEY PARTNERS\n\nStrategic alliances\n\n• Who are our key partners?\n• Which resources do we acquire from partners?\n• Which activities do partners perform?',
      color: TEMPLATE_COLORS.indigo.light,
      borderRadius: 20,
      borderColor: TEMPLATE_COLORS.indigo.medium,
      borderWidth: 2,
      shadow: 'md',
    },
    // Key Activities (Second column top)
    {
      type: 'frame',
      x: 250,
      y: 90,
      width: 210,
      height: 170,
      content: '⚙️ KEY ACTIVITIES\n\nCore operations\n\n• Production\n• Problem solving\n• Platform/Network',
      color: TEMPLATE_COLORS.cyan.light,
      borderRadius: 20,
      borderColor: TEMPLATE_COLORS.cyan.medium,
      borderWidth: 2,
      shadow: 'md',
    },
    // Key Resources (Second column bottom)
    {
      type: 'frame',
      x: 250,
      y: 270,
      width: 210,
      height: 170,
      content: '📦 KEY RESOURCES\n\nStrategic assets\n\n• Physical\n• Intellectual\n• Human\n• Financial',
      color: TEMPLATE_COLORS.blue.light,
      borderRadius: 20,
      borderColor: TEMPLATE_COLORS.blue.medium,
      borderWidth: 2,
      shadow: 'md',
    },
    // Value Propositions (Center - Featured)
    {
      type: 'frame',
      x: 470,
      y: 90,
      width: 230,
      height: 350,
      content: '💎 VALUE PROPOSITIONS\n\nThe promise of value\n\n• What value do we deliver?\n• Which problems do we solve?\n• What needs do we satisfy?\n• What bundles do we offer?',
      color: TEMPLATE_COLORS.yellow.light,
      borderRadius: 20,
      borderColor: TEMPLATE_COLORS.yellow.dark,
      borderWidth: 3,
      shadow: 'lg',
    },
    // Customer Relationships (Fourth column top)
    {
      type: 'frame',
      x: 710,
      y: 90,
      width: 210,
      height: 170,
      content: '💬 RELATIONSHIPS\n\nCustomer connections\n\n• Personal assistance\n• Self-service\n• Communities',
      color: TEMPLATE_COLORS.green.light,
      borderRadius: 20,
      borderColor: TEMPLATE_COLORS.green.medium,
      borderWidth: 2,
      shadow: 'md',
    },
    // Channels (Fourth column bottom)
    {
      type: 'frame',
      x: 710,
      y: 270,
      width: 210,
      height: 170,
      content: '📣 CHANNELS\n\nHow we reach customers\n\n• Awareness\n• Evaluation\n• Purchase\n• Delivery',
      color: TEMPLATE_COLORS.teal.light,
      borderRadius: 20,
      borderColor: TEMPLATE_COLORS.teal.medium,
      borderWidth: 2,
      shadow: 'md',
    },
    // Customer Segments (Far Right)
    {
      type: 'frame',
      x: 930,
      y: 90,
      width: 210,
      height: 350,
      content: '👥 CUSTOMER SEGMENTS\n\nWho we serve\n\n• Mass market\n• Niche market\n• Segmented\n• Diversified\n• Multi-sided',
      color: TEMPLATE_COLORS.pink.light,
      borderRadius: 20,
      borderColor: TEMPLATE_COLORS.pink.medium,
      borderWidth: 2,
      shadow: 'md',
    },
    // Cost Structure (Bottom Left)
    {
      type: 'frame',
      x: 30,
      y: 460,
      width: 540,
      height: 150,
      content: '💰 COST STRUCTURE\n\nMost important costs in your business model\n\n• Cost-driven  • Value-driven  • Fixed costs  • Variable costs  • Economies of scale  • Economies of scope',
      color: TEMPLATE_COLORS.coral.light,
      borderRadius: 20,
      borderColor: TEMPLATE_COLORS.coral.medium,
      borderWidth: 2,
      shadow: 'md',
    },
    // Revenue Streams (Bottom Right)
    {
      type: 'frame',
      x: 590,
      y: 460,
      width: 550,
      height: 150,
      content: '💵 REVENUE STREAMS\n\nHow customers pay for value delivered\n\n• Asset sale  • Usage fee  • Subscription  • Licensing  • Brokerage  • Advertising',
      color: TEMPLATE_COLORS.green.light,
      borderRadius: 20,
      borderColor: TEMPLATE_COLORS.green.dark,
      borderWidth: 2,
      shadow: 'md',
    },
  ],
};

// 3. Sprint Retrospective Template - Premium Edition
const sprintRetroTemplate: BoardTemplate = {
  id: 'sprint-retrospective',
  name: 'Sprint Retrospective',
  description: 'Agile team reflection: celebrate wins, address challenges, commit to improvements',
  category: 'agile',
  icon: '🔄',
  tags: ['agile', 'scrum', 'retrospective', 'team', 'improvement'],
  nodes: [
    // Premium Header
    {
      type: 'frame',
      x: 400,
      y: 15,
      width: 420,
      height: 70,
      content: '🔄 SPRINT RETROSPECTIVE\nSprint #__ | Team: ____________',
      color: TEMPLATE_COLORS.purple.light,
      borderRadius: 20,
      shadow: 'lg',
      fontSize: 20,
      textStyle: 'heading',
    },
    // Date/Time Info Badge
    {
      type: 'frame',
      x: 860,
      y: 25,
      width: 200,
      height: 50,
      content: '📅 Date: _________',
      color: TEMPLATE_COLORS.slate.light,
      borderRadius: 12,
      shadow: 'sm',
    },
    // What Went Well (Green)
    {
      type: 'frame',
      x: 50,
      y: 110,
      width: 360,
      height: 480,
      content: '🎉 WENT WELL\n\nCelebrate your wins!\n\nAdd sticky notes for:\n• Successes & achievements\n• Great collaboration moments\n• Processes that worked\n• Positive surprises',
      color: TEMPLATE_COLORS.green.light,
      borderRadius: 24,
      borderColor: TEMPLATE_COLORS.green.dark,
      borderWidth: 3,
      shadow: 'md',
    },
    // What Didn't Go Well (Coral)
    {
      type: 'frame',
      x: 430,
      y: 110,
      width: 360,
      height: 480,
      content: '🔧 NEEDS IMPROVEMENT\n\nBe constructive!\n\nAdd sticky notes for:\n• Obstacles encountered\n• Process friction points\n• Communication gaps\n• Missed expectations',
      color: TEMPLATE_COLORS.coral.light,
      borderRadius: 24,
      borderColor: TEMPLATE_COLORS.coral.dark,
      borderWidth: 3,
      shadow: 'md',
    },
    // Action Items (Blue)
    {
      type: 'frame',
      x: 810,
      y: 110,
      width: 360,
      height: 340,
      content: '✅ ACTION ITEMS\n\nCommitments for next sprint\n\nFormat each action as:\n• Specific & measurable\n• Owner assigned\n• Deadline set\n• Definition of done',
      color: TEMPLATE_COLORS.blue.light,
      borderRadius: 24,
      borderColor: TEMPLATE_COLORS.blue.dark,
      borderWidth: 3,
      shadow: 'md',
    },
    // Kudos Section (Yellow)
    {
      type: 'frame',
      x: 810,
      y: 470,
      width: 360,
      height: 180,
      content: '⭐ SHOUTOUTS\n\nRecognize teammates!\n\nWho went above and beyond? Who helped unblock you?',
      color: TEMPLATE_COLORS.yellow.light,
      borderRadius: 24,
      borderColor: TEMPLATE_COLORS.yellow.dark,
      borderWidth: 3,
      shadow: 'md',
    },
    // Sample sticky notes with improved design
    {
      type: 'sticky',
      x: 80,
      y: 280,
      width: 160,
      height: 100,
      content: '🚀 Deployed feature X ahead of schedule!',
      color: '#a7f3d0',
      borderRadius: 16,
      shadow: 'md',
    },
    {
      type: 'sticky',
      x: 230,
      y: 350,
      width: 160,
      height: 100,
      content: '💬 Great daily standups this sprint',
      color: '#86efac',
      borderRadius: 16,
      shadow: 'md',
    },
    {
      type: 'sticky',
      x: 460,
      y: 280,
      width: 160,
      height: 100,
      content: '⏰ Deployment took too long',
      color: '#fecdd3',
      borderRadius: 16,
      shadow: 'md',
    },
    {
      type: 'sticky',
      x: 840,
      y: 260,
      width: 160,
      height: 100,
      content: '🔄 Automate deployment\n\n@Dev - By Friday',
      color: '#bfdbfe',
      borderRadius: 16,
      shadow: 'md',
    },
    // Mood Check
    {
      type: 'frame',
      x: 50,
      y: 610,
      width: 740,
      height: 80,
      content: '💭 TEAM MOOD: Rate the sprint 1-5 → ⭐ __  | Energy level: 🔋 __ | Confidence: 📈 __',
      color: TEMPLATE_COLORS.purple.light,
      borderRadius: 16,
      shadow: 'sm',
    },
  ],
};

// 4. User Journey Map Template - Premium Edition
const userJourneyMapTemplate: BoardTemplate = {
  id: 'user-journey-map',
  name: 'User Journey Map',
  description: 'Map the complete customer experience across all touchpoints and emotional states',
  category: 'design',
  icon: '🗺️',
  tags: ['ux', 'design', 'customer', 'journey', 'experience', 'touchpoints'],
  nodes: [
    // Premium Title
    {
      type: 'frame',
      x: 500,
      y: 10,
      width: 350,
      height: 60,
      content: '🗺️ USER JOURNEY MAP',
      color: TEMPLATE_COLORS.indigo.light,
      borderRadius: 16,
      shadow: 'lg',
      fontSize: 24,
      textStyle: 'heading',
    },
    // Persona Card
    {
      type: 'frame',
      x: 40,
      y: 80,
      width: 200,
      height: 100,
      content: '👤 PERSONA\n\nName: ___________\nRole: ___________\nGoal: ___________',
      color: TEMPLATE_COLORS.purple.light,
      borderRadius: 20,
      borderColor: TEMPLATE_COLORS.purple.dark,
      borderWidth: 3,
      shadow: 'lg',
    },
    // Scenario Card
    {
      type: 'frame',
      x: 40,
      y: 190,
      width: 200,
      height: 80,
      content: '📋 SCENARIO\n\n_______________',
      color: TEMPLATE_COLORS.slate.light,
      borderRadius: 16,
      shadow: 'sm',
    },
    // Stage 1 - Awareness
    {
      type: 'frame',
      x: 260,
      y: 80,
      width: 180,
      height: 100,
      content: '1️⃣ AWARENESS\n\n💡 Discovery\nFirst contact',
      color: TEMPLATE_COLORS.blue.light,
      borderRadius: 20,
      borderColor: TEMPLATE_COLORS.blue.dark,
      borderWidth: 2,
      shadow: 'md',
    },
    // Stage 2 - Consideration
    {
      type: 'frame',
      x: 460,
      y: 80,
      width: 180,
      height: 100,
      content: '2️⃣ CONSIDERATION\n\n🔍 Research\nEvaluation',
      color: TEMPLATE_COLORS.indigo.light,
      borderRadius: 20,
      borderColor: TEMPLATE_COLORS.indigo.dark,
      borderWidth: 2,
      shadow: 'md',
    },
    // Stage 3 - Decision
    {
      type: 'frame',
      x: 660,
      y: 80,
      width: 180,
      height: 100,
      content: '3️⃣ DECISION\n\n💳 Purchase\nConversion',
      color: TEMPLATE_COLORS.yellow.light,
      borderRadius: 20,
      borderColor: TEMPLATE_COLORS.yellow.dark,
      borderWidth: 2,
      shadow: 'md',
    },
    // Stage 4 - Retention
    {
      type: 'frame',
      x: 860,
      y: 80,
      width: 180,
      height: 100,
      content: '4️⃣ RETENTION\n\n🔄 Usage\nEngagement',
      color: TEMPLATE_COLORS.green.light,
      borderRadius: 20,
      borderColor: TEMPLATE_COLORS.green.dark,
      borderWidth: 2,
      shadow: 'md',
    },
    // Stage 5 - Advocacy
    {
      type: 'frame',
      x: 1060,
      y: 80,
      width: 180,
      height: 100,
      content: '5️⃣ ADVOCACY\n\n❤️ Loyalty\nReferral',
      color: TEMPLATE_COLORS.pink.light,
      borderRadius: 20,
      borderColor: TEMPLATE_COLORS.pink.dark,
      borderWidth: 2,
      shadow: 'md',
    },
    // Row Labels with icons
    {
      type: 'frame',
      x: 40,
      y: 200,
      width: 200,
      height: 50,
      content: '🎬 USER ACTIONS',
      color: TEMPLATE_COLORS.slate.light,
      borderRadius: 12,
      fontSize: 14,
    },
    {
      type: 'frame',
      x: 40,
      y: 290,
      width: 200,
      height: 50,
      content: '💭 THOUGHTS',
      color: TEMPLATE_COLORS.slate.light,
      borderRadius: 12,
      fontSize: 14,
    },
    {
      type: 'frame',
      x: 40,
      y: 380,
      width: 200,
      height: 50,
      content: '😀 EMOTIONS',
      color: TEMPLATE_COLORS.slate.light,
      borderRadius: 12,
      fontSize: 14,
    },
    {
      type: 'frame',
      x: 40,
      y: 470,
      width: 200,
      height: 50,
      content: '😣 PAIN POINTS',
      color: TEMPLATE_COLORS.coral.light,
      borderRadius: 12,
      fontSize: 14,
    },
    {
      type: 'frame',
      x: 40,
      y: 560,
      width: 200,
      height: 50,
      content: '💡 OPPORTUNITIES',
      color: TEMPLATE_COLORS.green.light,
      borderRadius: 12,
      fontSize: 14,
    },
    // Grid Rows (Actions)
    {
      type: 'frame',
      x: 260,
      y: 200,
      width: 980,
      height: 80,
      content: '',
      color: '#f8fafc',
      borderRadius: 12,
      borderColor: '#e2e8f0',
      borderWidth: 1,
    },
    // Grid Rows (Thoughts)
    {
      type: 'frame',
      x: 260,
      y: 290,
      width: 980,
      height: 80,
      content: '',
      color: '#ffffff',
      borderRadius: 12,
      borderColor: '#e2e8f0',
      borderWidth: 1,
    },
    // Grid Rows (Emotions)
    {
      type: 'frame',
      x: 260,
      y: 380,
      width: 980,
      height: 80,
      content: '',
      color: '#f8fafc',
      borderRadius: 12,
      borderColor: '#e2e8f0',
      borderWidth: 1,
    },
    // Grid Rows (Pain Points)
    {
      type: 'frame',
      x: 260,
      y: 470,
      width: 980,
      height: 80,
      content: '',
      color: TEMPLATE_COLORS.coral.light,
      borderRadius: 12,
      opacity: 0.5,
    },
    // Grid Rows (Opportunities)
    {
      type: 'frame',
      x: 260,
      y: 560,
      width: 980,
      height: 80,
      content: '',
      color: TEMPLATE_COLORS.green.light,
      borderRadius: 12,
      opacity: 0.5,
    },
    // Emotion curve indicator
    {
      type: 'frame',
      x: 40,
      y: 660,
      width: 1200,
      height: 60,
      content: '📈 EMOTION CURVE: Plot the emotional highs and lows across the journey →  😊 ━━━ 😐 ━━━ 😟',
      color: TEMPLATE_COLORS.purple.light,
      borderRadius: 16,
      shadow: 'sm',
    },
  ],
};

// 5. Lean Canvas Template - Premium Edition
const leanCanvasTemplate: BoardTemplate = {
  id: 'lean-canvas',
  name: 'Lean Canvas',
  description: '1-page business plan for startups with lean methodology and rapid iteration focus',
  category: 'strategy',
  icon: '🚀',
  tags: ['startup', 'lean', 'business', 'plan', 'mvp'],
  nodes: [
    // Premium Title
    {
      type: 'frame',
      x: 460,
      y: 10,
      width: 320,
      height: 60,
      content: '🚀 LEAN CANVAS',
      color: TEMPLATE_COLORS.purple.light,
      borderRadius: 16,
      shadow: 'lg',
      fontSize: 28,
      textStyle: 'heading',
    },
    // Problem (Left column)
    {
      type: 'frame',
      x: 40,
      y: 85,
      width: 230,
      height: 200,
      content: '❓ PROBLEM\n\nTop 3 problems:\n\n1. ________________\n\n2. ________________\n\n3. ________________',
      color: TEMPLATE_COLORS.coral.light,
      borderRadius: 20,
      borderColor: TEMPLATE_COLORS.coral.dark,
      borderWidth: 2,
      shadow: 'md',
    },
    // Existing Alternatives
    {
      type: 'frame',
      x: 40,
      y: 295,
      width: 230,
      height: 120,
      content: '📋 ALTERNATIVES\n\nHow these are solved today:',
      color: TEMPLATE_COLORS.orange.light,
      borderRadius: 20,
      borderColor: TEMPLATE_COLORS.orange.medium,
      borderWidth: 2,
      shadow: 'md',
    },
    // Solution
    {
      type: 'frame',
      x: 280,
      y: 85,
      width: 230,
      height: 160,
      content: '💡 SOLUTION\n\nTop 3 features:\n\n1. ________________\n\n2. ________________\n\n3. ________________',
      color: TEMPLATE_COLORS.green.light,
      borderRadius: 20,
      borderColor: TEMPLATE_COLORS.green.dark,
      borderWidth: 2,
      shadow: 'md',
    },
    // Key Metrics
    {
      type: 'frame',
      x: 280,
      y: 255,
      width: 230,
      height: 160,
      content: '📊 KEY METRICS\n\nPirate metrics (AARRR):\n• Acquisition\n• Activation\n• Retention\n• Revenue\n• Referral',
      color: TEMPLATE_COLORS.blue.light,
      borderRadius: 20,
      borderColor: TEMPLATE_COLORS.blue.dark,
      borderWidth: 2,
      shadow: 'md',
    },
    // Unique Value Proposition (Center - Featured)
    {
      type: 'frame',
      x: 520,
      y: 85,
      width: 240,
      height: 160,
      content: '⭐ UNIQUE VALUE PROP\n\nSingle, clear message:\n\n"We help [X] do [Y]\nby doing [Z]"',
      color: TEMPLATE_COLORS.yellow.light,
      borderRadius: 20,
      borderColor: TEMPLATE_COLORS.yellow.dark,
      borderWidth: 3,
      shadow: 'lg',
    },
    // High-Level Concept
    {
      type: 'frame',
      x: 520,
      y: 255,
      width: 240,
      height: 80,
      content: '🎯 HIGH-LEVEL CONCEPT\n\n"X for Y" pitch',
      color: TEMPLATE_COLORS.indigo.light,
      borderRadius: 16,
      shadow: 'sm',
    },
    // Unfair Advantage
    {
      type: 'frame',
      x: 520,
      y: 345,
      width: 240,
      height: 100,
      content: '🏆 UNFAIR ADVANTAGE\n\nCan\'t be easily copied:\n• Inside knowledge\n• Dream team\n• Network effects',
      color: TEMPLATE_COLORS.purple.light,
      borderRadius: 20,
      borderColor: TEMPLATE_COLORS.purple.medium,
      borderWidth: 2,
      shadow: 'md',
    },
    // Channels
    {
      type: 'frame',
      x: 770,
      y: 85,
      width: 230,
      height: 160,
      content: '📣 CHANNELS\n\nPath to customers:\n\n• Content / SEO\n• Social media\n• Partnerships\n• Paid ads',
      color: TEMPLATE_COLORS.teal.light,
      borderRadius: 20,
      borderColor: TEMPLATE_COLORS.teal.dark,
      borderWidth: 2,
      shadow: 'md',
    },
    // Customer Segments
    {
      type: 'frame',
      x: 770,
      y: 255,
      width: 230,
      height: 160,
      content: '👥 CUSTOMER SEGMENTS\n\nTarget customers:\n\n• Early adopters:\n• Main market:',
      color: TEMPLATE_COLORS.pink.light,
      borderRadius: 20,
      borderColor: TEMPLATE_COLORS.pink.dark,
      borderWidth: 2,
      shadow: 'md',
    },
    // Early Adopters Box
    {
      type: 'frame',
      x: 1010,
      y: 85,
      width: 180,
      height: 330,
      content: '🎪 EARLY ADOPTERS\n\nIdeal first customers:\n\n✓ Have the problem\n✓ Know they have it\n✓ Actively seeking\n✓ Can afford solution\n✓ Easy to reach',
      color: TEMPLATE_COLORS.cyan.light,
      borderRadius: 20,
      borderColor: TEMPLATE_COLORS.cyan.medium,
      borderWidth: 2,
      shadow: 'md',
    },
    // Cost Structure (Bottom Left)
    {
      type: 'frame',
      x: 40,
      y: 435,
      width: 575,
      height: 140,
      content: '💰 COST STRUCTURE\n\n• Customer acquisition costs (CAC)  • Development costs  • Hosting & infrastructure\n• People & operations  • Marketing spend',
      color: TEMPLATE_COLORS.coral.light,
      borderRadius: 20,
      borderColor: TEMPLATE_COLORS.coral.medium,
      borderWidth: 2,
      shadow: 'md',
    },
    // Revenue Streams (Bottom Right)
    {
      type: 'frame',
      x: 625,
      y: 435,
      width: 565,
      height: 140,
      content: '💵 REVENUE STREAMS\n\n• Revenue model  • Lifetime value (LTV)  • Pricing strategy\n• Revenue per customer  • Gross margin target',
      color: TEMPLATE_COLORS.green.light,
      borderRadius: 20,
      borderColor: TEMPLATE_COLORS.green.dark,
      borderWidth: 2,
      shadow: 'md',
    },
  ],
};

// 6. Meeting Notes Template - Premium Edition
const meetingNotesTemplate: BoardTemplate = {
  id: 'meeting-notes',
  name: 'Meeting Notes',
  description: 'Structured template for capturing decisions, discussions, and action items',
  category: 'meeting',
  icon: '📝',
  tags: ['meeting', 'notes', 'agenda', 'action items', 'minutes'],
  nodes: [
    // Premium Header
    {
      type: 'frame',
      x: 420,
      y: 15,
      width: 360,
      height: 60,
      content: '📝 MEETING NOTES',
      color: TEMPLATE_COLORS.blue.light,
      borderRadius: 16,
      shadow: 'lg',
      fontSize: 28,
      textStyle: 'heading',
    },
    // Meeting Info Card
    {
      type: 'frame',
      x: 40,
      y: 90,
      width: 320,
      height: 140,
      content: '📅 MEETING INFO\n\nDate: _______________\nTime: _______________\nLocation: ___________\nFacilitator: _________',
      color: TEMPLATE_COLORS.blue.light,
      borderRadius: 20,
      borderColor: TEMPLATE_COLORS.blue.dark,
      borderWidth: 2,
      shadow: 'md',
    },
    // Attendees Card
    {
      type: 'frame',
      x: 380,
      y: 90,
      width: 320,
      height: 140,
      content: '👥 ATTENDEES\n\n✓ _______________\n✓ _______________\n✓ _______________\n✓ _______________',
      color: TEMPLATE_COLORS.purple.light,
      borderRadius: 20,
      borderColor: TEMPLATE_COLORS.purple.dark,
      borderWidth: 2,
      shadow: 'md',
    },
    // Purpose/Objective Card
    {
      type: 'frame',
      x: 720,
      y: 90,
      width: 380,
      height: 140,
      content: '🎯 PURPOSE / OBJECTIVE\n\nWhat do we want to achieve?\n\n________________________________',
      color: TEMPLATE_COLORS.yellow.light,
      borderRadius: 20,
      borderColor: TEMPLATE_COLORS.yellow.dark,
      borderWidth: 3,
      shadow: 'lg',
    },
    // Agenda Section
    {
      type: 'frame',
      x: 40,
      y: 250,
      width: 520,
      height: 200,
      content: '📋 AGENDA\n\n1. _________________ (__ min) - @_____\n\n2. _________________ (__ min) - @_____\n\n3. _________________ (__ min) - @_____\n\n4. Wrap-up & Next Steps (5 min)',
      color: TEMPLATE_COLORS.slate.light,
      borderRadius: 20,
      borderColor: TEMPLATE_COLORS.slate.medium,
      borderWidth: 2,
      shadow: 'md',
    },
    // Discussion Notes
    {
      type: 'frame',
      x: 580,
      y: 250,
      width: 520,
      height: 200,
      content: '💬 DISCUSSION NOTES\n\nKey points discussed:\n\n•\n\n•\n\n•',
      color: '#ffffff',
      borderRadius: 20,
      borderColor: TEMPLATE_COLORS.gray.medium,
      borderWidth: 2,
      shadow: 'md',
    },
    // Decisions Made
    {
      type: 'frame',
      x: 40,
      y: 470,
      width: 350,
      height: 180,
      content: '✅ DECISIONS MADE\n\nAgreed outcomes:\n\n1. _______________________\n\n2. _______________________\n\n3. _______________________',
      color: TEMPLATE_COLORS.green.light,
      borderRadius: 20,
      borderColor: TEMPLATE_COLORS.green.dark,
      borderWidth: 2,
      shadow: 'md',
    },
    // Action Items
    {
      type: 'frame',
      x: 410,
      y: 470,
      width: 350,
      height: 180,
      content: '📌 ACTION ITEMS\n\nWho / What / When:\n\n1. @___ / _______ / ___\n\n2. @___ / _______ / ___\n\n3. @___ / _______ / ___',
      color: TEMPLATE_COLORS.orange.light,
      borderRadius: 20,
      borderColor: TEMPLATE_COLORS.orange.dark,
      borderWidth: 3,
      shadow: 'lg',
    },
    // Next Steps
    {
      type: 'frame',
      x: 780,
      y: 470,
      width: 320,
      height: 180,
      content: '➡️ NEXT STEPS\n\n📅 Next meeting: _______\n\n⏳ Follow-ups pending:\n\n🅿️ Parking lot items:',
      color: TEMPLATE_COLORS.teal.light,
      borderRadius: 20,
      borderColor: TEMPLATE_COLORS.teal.dark,
      borderWidth: 2,
      shadow: 'md',
    },
  ],
};

// 7. Brainstorm Template - Premium Edition
const brainstormTemplate: BoardTemplate = {
  id: 'brainstorm',
  name: 'Brainstorm',
  description: 'Creative ideation with radial clustering, dot voting, and idea ranking',
  category: 'design',
  icon: '💡',
  tags: ['brainstorm', 'ideas', 'creativity', 'ideation', 'voting'],
  nodes: [
    // Premium Title
    {
      type: 'frame',
      x: 480,
      y: 10,
      width: 280,
      height: 55,
      content: '💡 BRAINSTORM',
      color: TEMPLATE_COLORS.yellow.light,
      borderRadius: 16,
      shadow: 'lg',
      fontSize: 28,
      textStyle: 'heading',
    },
    // Instructions Badge
    {
      type: 'frame',
      x: 370,
      y: 70,
      width: 500,
      height: 35,
      content: '🧠 Generate → 🗳️ Vote with dots → ⭐ Discuss winners',
      color: TEMPLATE_COLORS.slate.light,
      borderRadius: 10,
      fontSize: 14,
    },
    // Central Topic - Premium focal point
    {
      type: 'shape',
      shapeType: 'circle',
      x: 500,
      y: 310,
      width: 180,
      height: 180,
      content: '🎯\n\nCENTRAL\nQUESTION\n\nHow might we...?',
      color: TEMPLATE_COLORS.purple.light,
      borderColor: TEMPLATE_COLORS.purple.dark,
      borderWidth: 4,
      shadow: 'xl',
    },
    // Cluster 1 - Top
    {
      type: 'frame',
      x: 440,
      y: 120,
      width: 300,
      height: 160,
      content: '💭 CATEGORY 1\n\n_______________\n\nDrop ideas here →',
      color: TEMPLATE_COLORS.blue.light,
      borderRadius: 24,
      borderColor: TEMPLATE_COLORS.blue.medium,
      borderWidth: 2,
      shadow: 'md',
    },
    // Cluster 2 - Top Right
    {
      type: 'frame',
      x: 780,
      y: 200,
      width: 280,
      height: 160,
      content: '💭 CATEGORY 2\n\n_______________\n\nDrop ideas here →',
      color: TEMPLATE_COLORS.green.light,
      borderRadius: 24,
      borderColor: TEMPLATE_COLORS.green.medium,
      borderWidth: 2,
      shadow: 'md',
    },
    // Cluster 3 - Right
    {
      type: 'frame',
      x: 780,
      y: 400,
      width: 280,
      height: 160,
      content: '💭 CATEGORY 3\n\n_______________\n\nDrop ideas here →',
      color: TEMPLATE_COLORS.yellow.light,
      borderRadius: 24,
      borderColor: TEMPLATE_COLORS.yellow.medium,
      borderWidth: 2,
      shadow: 'md',
    },
    // Cluster 4 - Bottom Right
    {
      type: 'frame',
      x: 680,
      y: 580,
      width: 280,
      height: 160,
      content: '💭 CATEGORY 4\n\n_______________\n\nDrop ideas here →',
      color: TEMPLATE_COLORS.orange.light,
      borderRadius: 24,
      borderColor: TEMPLATE_COLORS.orange.medium,
      borderWidth: 2,
      shadow: 'md',
    },
    // Cluster 5 - Bottom Left
    {
      type: 'frame',
      x: 230,
      y: 580,
      width: 280,
      height: 160,
      content: '💭 CATEGORY 5\n\n_______________\n\nDrop ideas here →',
      color: TEMPLATE_COLORS.pink.light,
      borderRadius: 24,
      borderColor: TEMPLATE_COLORS.pink.medium,
      borderWidth: 2,
      shadow: 'md',
    },
    // Cluster 6 - Left
    {
      type: 'frame',
      x: 130,
      y: 400,
      width: 280,
      height: 160,
      content: '💭 CATEGORY 6\n\n_______________\n\nDrop ideas here →',
      color: TEMPLATE_COLORS.teal.light,
      borderRadius: 24,
      borderColor: TEMPLATE_COLORS.teal.medium,
      borderWidth: 2,
      shadow: 'md',
    },
    // Cluster 7 - Top Left
    {
      type: 'frame',
      x: 130,
      y: 200,
      width: 280,
      height: 160,
      content: '💭 CATEGORY 7\n\n_______________\n\nDrop ideas here →',
      color: TEMPLATE_COLORS.indigo.light,
      borderRadius: 24,
      borderColor: TEMPLATE_COLORS.indigo.medium,
      borderWidth: 2,
      shadow: 'md',
    },
    // Sample sticky notes with votes
    {
      type: 'sticky',
      x: 460,
      y: 145,
      width: 140,
      height: 90,
      content: 'AI-powered search\n\n🔵🔵🔵',
      color: '#93c5fd',
      borderRadius: 14,
      shadow: 'md',
    },
    {
      type: 'sticky',
      x: 800,
      y: 230,
      width: 140,
      height: 90,
      content: 'Mobile-first design\n\n🔵🔵',
      color: '#86efac',
      borderRadius: 14,
      shadow: 'md',
    },
    // Top Picks Area - Premium
    {
      type: 'frame',
      x: 1100,
      y: 120,
      width: 200,
      height: 620,
      content: '⭐ TOP PICKS\n\nWinning ideas\n\n──────────\n\n🥇 1st:\n\n\n🥈 2nd:\n\n\n🥉 3rd:\n\n\n──────────\n\nTotal votes cast:\n\n___',
      color: TEMPLATE_COLORS.yellow.light,
      borderRadius: 24,
      borderColor: TEMPLATE_COLORS.yellow.dark,
      borderWidth: 3,
      shadow: 'lg',
    },
  ],
};

// 8. Project Kickoff Template - Premium Edition
const projectKickoffTemplate: BoardTemplate = {
  id: 'project-kickoff',
  name: 'Project Kickoff',
  description: 'Comprehensive project launch with goals, scope, team alignment, and risk planning',
  category: 'planning',
  icon: '🚀',
  tags: ['project', 'kickoff', 'planning', 'team', 'scope', 'risks'],
  nodes: [
    // Premium Title Banner
    {
      type: 'frame',
      x: 420,
      y: 10,
      width: 400,
      height: 65,
      content: '🚀 PROJECT KICKOFF',
      color: TEMPLATE_COLORS.indigo.light,
      borderRadius: 18,
      shadow: 'lg',
      fontSize: 32,
      textStyle: 'heading',
    },
    // Project Name Card
    {
      type: 'frame',
      x: 40,
      y: 90,
      width: 460,
      height: 100,
      content: '📋 PROJECT NAME\n\n___________________________________\n\nBrief: _______________________________',
      color: TEMPLATE_COLORS.blue.light,
      borderRadius: 20,
      borderColor: TEMPLATE_COLORS.blue.dark,
      borderWidth: 2,
      shadow: 'md',
    },
    // Sponsor Card
    {
      type: 'frame',
      x: 520,
      y: 90,
      width: 280,
      height: 100,
      content: '👤 PROJECT SPONSOR\n\nName: _______________\nRole: _______________',
      color: TEMPLATE_COLORS.purple.light,
      borderRadius: 20,
      borderColor: TEMPLATE_COLORS.purple.dark,
      borderWidth: 2,
      shadow: 'md',
    },
    // Timeline Card
    {
      type: 'frame',
      x: 820,
      y: 90,
      width: 320,
      height: 100,
      content: '📅 TIMELINE\n\nStart: ___________  |  End: ___________\nDuration: _______ weeks',
      color: TEMPLATE_COLORS.teal.light,
      borderRadius: 20,
      borderColor: TEMPLATE_COLORS.teal.dark,
      borderWidth: 2,
      shadow: 'md',
    },
    // Goals & Objectives
    {
      type: 'frame',
      x: 40,
      y: 210,
      width: 380,
      height: 200,
      content: '🎯 GOALS & OBJECTIVES\n\nWhat success looks like:\n\n1. _________________________\n\n2. _________________________\n\n3. _________________________',
      color: TEMPLATE_COLORS.green.light,
      borderRadius: 24,
      borderColor: TEMPLATE_COLORS.green.dark,
      borderWidth: 3,
      shadow: 'lg',
    },
    // In Scope
    {
      type: 'frame',
      x: 440,
      y: 210,
      width: 340,
      height: 200,
      content: '✅ IN SCOPE\n\nDeliverables included:\n\n•\n\n•\n\n•',
      color: TEMPLATE_COLORS.cyan.light,
      borderRadius: 20,
      borderColor: TEMPLATE_COLORS.cyan.medium,
      borderWidth: 2,
      shadow: 'md',
    },
    // Out of Scope
    {
      type: 'frame',
      x: 800,
      y: 210,
      width: 340,
      height: 200,
      content: '❌ OUT OF SCOPE\n\nNot in this project:\n\n•\n\n•\n\n•',
      color: TEMPLATE_COLORS.coral.light,
      borderRadius: 20,
      borderColor: TEMPLATE_COLORS.coral.medium,
      borderWidth: 2,
      shadow: 'md',
    },
    // Team Section
    {
      type: 'frame',
      x: 40,
      y: 430,
      width: 320,
      height: 200,
      content: '👥 CORE TEAM\n\n🎖️ PM: _____________\n💻 Tech Lead: ________\n🎨 Designer: _________\n⚙️ Developer: ________\n📊 Stakeholder: _______',
      color: TEMPLATE_COLORS.indigo.light,
      borderRadius: 20,
      borderColor: TEMPLATE_COLORS.indigo.dark,
      borderWidth: 2,
      shadow: 'md',
    },
    // Key Milestones
    {
      type: 'frame',
      x: 380,
      y: 430,
      width: 400,
      height: 200,
      content: '🏁 KEY MILESTONES\n\n📍 Discovery complete: _______ (___)\n\n📍 Design approved: _______ (___)\n\n📍 Dev complete: _______ (___)\n\n🚀 Launch: ____________ (___)',
      color: TEMPLATE_COLORS.yellow.light,
      borderRadius: 20,
      borderColor: TEMPLATE_COLORS.yellow.dark,
      borderWidth: 3,
      shadow: 'lg',
    },
    // Risks
    {
      type: 'frame',
      x: 800,
      y: 430,
      width: 340,
      height: 200,
      content: '⚠️ RISKS & MITIGATIONS\n\n🔴 High: _____________\n    → Mitigation: _______\n\n🟡 Medium: ___________\n\n🟢 Low: ______________',
      color: TEMPLATE_COLORS.orange.light,
      borderRadius: 20,
      borderColor: TEMPLATE_COLORS.orange.dark,
      borderWidth: 2,
      shadow: 'md',
    },
    // Success Criteria
    {
      type: 'frame',
      x: 40,
      y: 650,
      width: 540,
      height: 100,
      content: '🏆 SUCCESS CRITERIA\n\nHow do we know we\'ve succeeded?  •  KPI 1: ______  •  KPI 2: ______  •  KPI 3: ______',
      color: TEMPLATE_COLORS.pink.light,
      borderRadius: 20,
      borderColor: TEMPLATE_COLORS.pink.dark,
      borderWidth: 2,
      shadow: 'md',
    },
    // Communication Plan
    {
      type: 'frame',
      x: 600,
      y: 650,
      width: 540,
      height: 100,
      content: '📢 COMMUNICATION PLAN\n\n• Status updates: _________ (frequency)  • Standups: _________ (time)  • Channel: _________',
      color: TEMPLATE_COLORS.blue.light,
      borderRadius: 20,
      borderColor: TEMPLATE_COLORS.blue.dark,
      borderWidth: 2,
      shadow: 'md',
    },
  ],
};

// 9. Kanban Board Template - Premium Edition
const kanbanBoardTemplate: BoardTemplate = {
  id: 'kanban-board',
  name: 'Kanban Board',
  description: 'Visual workflow management with WIP limits and task tracking',
  category: 'agile',
  icon: '📊',
  tags: ['kanban', 'agile', 'tasks', 'workflow', 'project management'],
  nodes: [
    // Premium Title
    {
      type: 'frame',
      x: 520,
      y: 15,
      width: 280,
      height: 55,
      content: '📊 KANBAN BOARD',
      color: TEMPLATE_COLORS.slate.light,
      borderRadius: 16,
      shadow: 'lg',
      fontSize: 26,
      textStyle: 'heading',
    },
    // Backlog Column
    {
      type: 'frame',
      x: 40,
      y: 90,
      width: 260,
      height: 600,
      content: '📋 BACKLOG\n\nWaiting to start\n\nWIP: ∞',
      color: TEMPLATE_COLORS.slate.light,
      borderRadius: 20,
      borderColor: TEMPLATE_COLORS.slate.medium,
      borderWidth: 2,
      shadow: 'md',
    },
    // To Do Column
    {
      type: 'frame',
      x: 320,
      y: 90,
      width: 260,
      height: 600,
      content: '📝 TO DO\n\nReady to start\n\nWIP: 5',
      color: TEMPLATE_COLORS.purple.light,
      borderRadius: 20,
      borderColor: TEMPLATE_COLORS.purple.dark,
      borderWidth: 2,
      shadow: 'md',
    },
    // In Progress Column
    {
      type: 'frame',
      x: 600,
      y: 90,
      width: 260,
      height: 600,
      content: '🔄 IN PROGRESS\n\nActively working\n\nWIP: 3',
      color: TEMPLATE_COLORS.blue.light,
      borderRadius: 20,
      borderColor: TEMPLATE_COLORS.blue.dark,
      borderWidth: 3,
      shadow: 'lg',
    },
    // Review Column
    {
      type: 'frame',
      x: 880,
      y: 90,
      width: 260,
      height: 600,
      content: '👀 REVIEW\n\nAwaiting feedback\n\nWIP: 3',
      color: TEMPLATE_COLORS.yellow.light,
      borderRadius: 20,
      borderColor: TEMPLATE_COLORS.yellow.dark,
      borderWidth: 2,
      shadow: 'md',
    },
    // Done Column
    {
      type: 'frame',
      x: 1160,
      y: 90,
      width: 260,
      height: 600,
      content: '✅ DONE\n\nCompleted 🎉\n\n──────────',
      color: TEMPLATE_COLORS.green.light,
      borderRadius: 20,
      borderColor: TEMPLATE_COLORS.green.dark,
      borderWidth: 2,
      shadow: 'md',
    },
    // Sample task cards with improved design
    {
      type: 'sticky',
      x: 60,
      y: 180,
      width: 220,
      height: 90,
      content: '🏷️ Feature\n\nTask name here\n\n👤 Assignee',
      color: '#ffffff',
      borderRadius: 14,
      borderColor: TEMPLATE_COLORS.slate.medium,
      borderWidth: 1,
      shadow: 'md',
    },
    {
      type: 'sticky',
      x: 60,
      y: 290,
      width: 220,
      height: 90,
      content: '🐛 Bug\n\nFix login issue\n\n👤 Dev',
      color: '#fef2f2',
      borderRadius: 14,
      borderColor: TEMPLATE_COLORS.coral.medium,
      borderWidth: 1,
      shadow: 'md',
    },
    {
      type: 'sticky',
      x: 620,
      y: 180,
      width: 220,
      height: 90,
      content: '🎨 Design\n\nUI mockups\n\n👤 Designer',
      color: '#faf5ff',
      borderRadius: 14,
      borderColor: TEMPLATE_COLORS.purple.medium,
      borderWidth: 1,
      shadow: 'md',
    },
    // Sprint Info Badge
    {
      type: 'frame',
      x: 40,
      y: 710,
      width: 1380,
      height: 50,
      content: '📈 SPRINT PROGRESS: █████████░░░░░░░░░░░ 45%  |  ⏰ 5 days remaining  |  🎯 Sprint Goal: ___________________',
      color: TEMPLATE_COLORS.indigo.light,
      borderRadius: 14,
      shadow: 'sm',
    },
  ],
};

// 10. Empathy Map Template - Premium Edition
const empathyMapTemplate: BoardTemplate = {
  id: 'empathy-map',
  name: 'Empathy Map',
  description: 'Deep user understanding through exploring what they think, feel, say, and do',
  category: 'design',
  icon: '❤️',
  tags: ['ux', 'design', 'user research', 'persona', 'empathy'],
  nodes: [
    // Premium Title
    {
      type: 'frame',
      x: 480,
      y: 10,
      width: 280,
      height: 55,
      content: '❤️ EMPATHY MAP',
      color: TEMPLATE_COLORS.pink.light,
      borderRadius: 16,
      shadow: 'lg',
      fontSize: 28,
      textStyle: 'heading',
    },
    // User at center - Premium focal point
    {
      type: 'shape',
      shapeType: 'circle',
      x: 500,
      y: 340,
      width: 200,
      height: 200,
      content: '👤\n\nUSER\n\nName: _______\nRole: _______\nGoal: _______',
      color: TEMPLATE_COLORS.purple.light,
      borderColor: TEMPLATE_COLORS.purple.dark,
      borderWidth: 4,
      shadow: 'xl',
    },
    // THINKS (Top Center)
    {
      type: 'frame',
      x: 350,
      y: 80,
      width: 540,
      height: 220,
      content: '🧠 THINKS & FEELS\n\nWhat really matters to them?\nWhat occupies their thinking?\nWhat worries and aspirations?\n\nBeliefs & values:\n•\n•\n\nWorries & fears:\n•\n•',
      color: TEMPLATE_COLORS.blue.light,
      borderRadius: 24,
      borderColor: TEMPLATE_COLORS.blue.dark,
      borderWidth: 3,
      shadow: 'lg',
    },
    // SEES (Right)
    {
      type: 'frame',
      x: 760,
      y: 320,
      width: 340,
      height: 260,
      content: '👀 SEES\n\nWhat is their environment?\nWhat do they see daily?\nWhat do friends do?\nWhat offers do they see?\n\n•\n\n•\n\n•',
      color: TEMPLATE_COLORS.green.light,
      borderRadius: 24,
      borderColor: TEMPLATE_COLORS.green.dark,
      borderWidth: 2,
      shadow: 'md',
    },
    // SAYS & DOES (Bottom Center)
    {
      type: 'frame',
      x: 350,
      y: 590,
      width: 540,
      height: 180,
      content: '🗣️ SAYS & DOES\n\nWhat do they say to others? What is their attitude? What could they be doing?\nHow do they behave publicly?\n\n•                                            •                                            •',
      color: TEMPLATE_COLORS.yellow.light,
      borderRadius: 24,
      borderColor: TEMPLATE_COLORS.yellow.dark,
      borderWidth: 2,
      shadow: 'md',
    },
    // HEARS (Left)
    {
      type: 'frame',
      x: 140,
      y: 320,
      width: 340,
      height: 260,
      content: '👂 HEARS\n\nWhat do friends say?\nWhat does boss say?\nWhat do influencers say?\nHow do they get information?\n\n•\n\n•\n\n•',
      color: TEMPLATE_COLORS.teal.light,
      borderRadius: 24,
      borderColor: TEMPLATE_COLORS.teal.dark,
      borderWidth: 2,
      shadow: 'md',
    },
    // PAINS (Bottom Left)
    {
      type: 'frame',
      x: 140,
      y: 600,
      width: 190,
      height: 180,
      content: '😣 PAINS\n\nFears\nFrustrations\nObstacles\n\n•\n•\n•',
      color: TEMPLATE_COLORS.coral.light,
      borderRadius: 20,
      borderColor: TEMPLATE_COLORS.coral.dark,
      borderWidth: 2,
      shadow: 'md',
    },
    // GAINS (Bottom Right)
    {
      type: 'frame',
      x: 910,
      y: 600,
      width: 190,
      height: 180,
      content: '🎯 GAINS\n\nWants/Needs\nSuccess measures\nGoals\n\n•\n•\n•',
      color: TEMPLATE_COLORS.green.light,
      borderRadius: 20,
      borderColor: TEMPLATE_COLORS.green.dark,
      borderWidth: 2,
      shadow: 'md',
    },
  ],
};

// ============================================================================
// EXPORT ALL TEMPLATES
// ============================================================================

export const BOARD_TEMPLATES: BoardTemplate[] = [
  swotAnalysisTemplate,
  businessModelCanvasTemplate,
  sprintRetroTemplate,
  userJourneyMapTemplate,
  leanCanvasTemplate,
  meetingNotesTemplate,
  brainstormTemplate,
  projectKickoffTemplate,
  kanbanBoardTemplate,
  empathyMapTemplate,
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate a unique ID for nodes
 */
const generateId = (): string => {
  return Math.random().toString(36).substring(2, 11);
};

/**
 * Get a template by its ID
 */
export function getTemplateById(templateId: string): BoardTemplate | undefined {
  return BOARD_TEMPLATES.find(t => t.id === templateId);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: TemplateCategory): BoardTemplate[] {
  return BOARD_TEMPLATES.filter(t => t.category === category);
}

/**
 * Search templates by name or tags
 */
export function searchTemplates(query: string): BoardTemplate[] {
  const lowercaseQuery = query.toLowerCase();
  return BOARD_TEMPLATES.filter(t => 
    t.name.toLowerCase().includes(lowercaseQuery) ||
    t.description.toLowerCase().includes(lowercaseQuery) ||
    t.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
  );
}

/**
 * Create a board from a template
 * Returns nodes with proper IDs and default values
 */
export function createNodesFromTemplate(templateId: string, ownerId: string = 'default'): TemplateNode[] {
  const template = getTemplateById(templateId);
  if (!template) {
    return [];
  }

  return template.nodes.map(node => ({
    ...node,
    id: generateId(),
    rotation: node.rotation ?? 0,
    locked: node.locked ?? false,
    votes: node.votes ?? 0,
    votedBy: node.votedBy ?? [],
    createdBy: node.createdBy ?? ownerId,
    comments: node.comments ?? [],
    zIndex: node.zIndex ?? 0,
    borderRadius: node.borderRadius ?? (node.type === 'sticky' ? 12 : node.type === 'frame' ? 16 : 0),
    shadow: node.shadow ?? 'sm',
  }));
}

/**
 * Get all unique categories from templates
 */
export function getAllCategories(): TemplateCategory[] {
  const categories = new Set(BOARD_TEMPLATES.map(t => t.category));
  return Array.from(categories);
}

/**
 * Get category display info
 */
export function getCategoryInfo(category: TemplateCategory): { label: string; emoji: string; color: string } {
  const categoryMap: Record<TemplateCategory, { label: string; emoji: string; color: string }> = {
    strategy: { label: 'Strategy', emoji: '📊', color: 'indigo' },
    agile: { label: 'Agile', emoji: '🔄', color: 'green' },
    design: { label: 'Design', emoji: '🎨', color: 'pink' },
    meeting: { label: 'Meeting', emoji: '📝', color: 'blue' },
    planning: { label: 'Planning', emoji: '📅', color: 'purple' },
  };
  return categoryMap[category];
}

// Export types for use in components
export type { TemplateCategory as BoardTemplateCategory };
