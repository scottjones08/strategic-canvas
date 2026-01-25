// Board Templates Library
// Pre-made templates for common strategic planning and collaboration scenarios

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
  rotation?: number;
  locked?: boolean;
  votes?: number;
  votedBy?: string[];
  createdBy?: string;
  comments?: { id: string; userId: string; content: string; timestamp: Date }[];
  zIndex?: number;
}

export interface BoardTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  icon: string; // Emoji or icon name
  thumbnail?: string;
  tags: string[];
  nodes: TemplateNode[];
}

// Color palette for templates
export const TEMPLATE_COLORS = {
  // Greens - positive, strengths, opportunities
  green: {
    light: '#dcfce7',
    medium: '#86efac',
    dark: '#22c55e',
    text: '#166534',
  },
  // Yellows - warnings, improvements, ideas
  yellow: {
    light: '#fef3c7',
    medium: '#fde047',
    dark: '#eab308',
    text: '#854d0e',
  },
  // Blues - information, planning, considerations
  blue: {
    light: '#dbeafe',
    medium: '#93c5fd',
    dark: '#3b82f6',
    text: '#1e40af',
  },
  // Reds - threats, risks, issues
  red: {
    light: '#fee2e2',
    medium: '#fca5a5',
    dark: '#ef4444',
    text: '#991b1b',
  },
  // Purples - creative, special sections
  purple: {
    light: '#f3e8ff',
    medium: '#c4b5fd',
    dark: '#8b5cf6',
    text: '#5b21b6',
  },
  // Pinks - customer focus, relationships
  pink: {
    light: '#fce7f3',
    medium: '#f9a8d4',
    dark: '#ec4899',
    text: '#9d174d',
  },
  // Grays - neutral sections
  gray: {
    light: '#f3f4f6',
    medium: '#d1d5db',
    dark: '#6b7280',
    text: '#374151',
  },
  // Teals - action items
  teal: {
    light: '#ccfbf1',
    medium: '#5eead4',
    dark: '#14b8a6',
    text: '#115e59',
  },
  // Indigo - key highlights
  indigo: {
    light: '#e0e7ff',
    medium: '#a5b4fc',
    dark: '#6366f1',
    text: '#3730a3',
  },
  // Orange - energy, urgency
  orange: {
    light: '#ffedd5',
    medium: '#fdba74',
    dark: '#f97316',
    text: '#9a3412',
  },
};

// ============================================================================
// TEMPLATE DEFINITIONS
// ============================================================================

// 1. SWOT Analysis Template
const swotAnalysisTemplate: BoardTemplate = {
  id: 'swot-analysis',
  name: 'SWOT Analysis',
  description: '4 quadrant strategic planning framework for analyzing Strengths, Weaknesses, Opportunities, and Threats',
  category: 'strategy',
  icon: '📊',
  tags: ['strategy', 'analysis', 'planning', 'competitive'],
  nodes: [
    // Title
    {
      type: 'text',
      x: 460,
      y: 20,
      width: 300,
      height: 50,
      content: 'SWOT Analysis',
      color: 'transparent',
      fontSize: 36,
      textStyle: 'heading',
    },
    // Subtitle
    {
      type: 'text',
      x: 400,
      y: 70,
      width: 420,
      height: 30,
      content: 'Strategic Planning Framework',
      color: 'transparent',
      fontSize: 16,
      textStyle: 'paragraph',
    },
    // Strengths (Top-Left - Green)
    {
      type: 'frame',
      x: 100,
      y: 120,
      width: 400,
      height: 350,
      content: '💪 STRENGTHS\n\nInternal positive factors\n\n• What do we do well?\n• What unique resources do we have?\n• What advantages do we have?\n• What do others see as our strengths?',
      color: TEMPLATE_COLORS.green.light,
    },
    // Weaknesses (Top-Right - Yellow)
    {
      type: 'frame',
      x: 520,
      y: 120,
      width: 400,
      height: 350,
      content: '⚠️ WEAKNESSES\n\nInternal negative factors\n\n• What could we improve?\n• Where do we lack resources?\n• What are others likely to see as weaknesses?\n• What factors lose us sales?',
      color: TEMPLATE_COLORS.yellow.light,
    },
    // Opportunities (Bottom-Left - Blue)
    {
      type: 'frame',
      x: 100,
      y: 490,
      width: 400,
      height: 350,
      content: '🚀 OPPORTUNITIES\n\nExternal positive factors\n\n• What trends can we leverage?\n• What gaps can we fill?\n• What new markets can we enter?\n• How can we turn strengths into opportunities?',
      color: TEMPLATE_COLORS.blue.light,
    },
    // Threats (Bottom-Right - Red)
    {
      type: 'frame',
      x: 520,
      y: 490,
      width: 400,
      height: 350,
      content: '⛔ THREATS\n\nExternal negative factors\n\n• What obstacles do we face?\n• What is the competition doing?\n• Are there changing regulations?\n• Could any weakness seriously threaten us?',
      color: TEMPLATE_COLORS.red.light,
    },
    // Center label
    {
      type: 'shape',
      shapeType: 'circle',
      x: 440,
      y: 410,
      width: 140,
      height: 140,
      content: 'SWOT',
      color: TEMPLATE_COLORS.indigo.light,
    },
  ],
};

// 2. Business Model Canvas Template
const businessModelCanvasTemplate: BoardTemplate = {
  id: 'business-model-canvas',
  name: 'Business Model Canvas',
  description: '9 building blocks to describe, design, challenge, and pivot your business model',
  category: 'strategy',
  icon: '🏢',
  tags: ['business', 'model', 'startup', 'strategy', 'value proposition'],
  nodes: [
    // Title
    {
      type: 'text',
      x: 400,
      y: 10,
      width: 400,
      height: 50,
      content: 'Business Model Canvas',
      color: 'transparent',
      fontSize: 32,
      textStyle: 'heading',
    },
    // Key Partners (Far Left)
    {
      type: 'frame',
      x: 50,
      y: 80,
      width: 220,
      height: 340,
      content: '🤝 KEY PARTNERS\n\nWho are our key partners?\nWho are our key suppliers?\nWhich key resources are we acquiring from partners?\nWhich key activities do partners perform?',
      color: TEMPLATE_COLORS.indigo.light,
    },
    // Key Activities (Second column top)
    {
      type: 'frame',
      x: 280,
      y: 80,
      width: 220,
      height: 165,
      content: '⚙️ KEY ACTIVITIES\n\nWhat key activities does our value proposition require?\nOur distribution channels?\nCustomer relationships?\nRevenue streams?',
      color: TEMPLATE_COLORS.blue.light,
    },
    // Key Resources (Second column bottom)
    {
      type: 'frame',
      x: 280,
      y: 255,
      width: 220,
      height: 165,
      content: '📦 KEY RESOURCES\n\nWhat key resources does our value proposition require?\nOur distribution channels?\nCustomer relationships?\nRevenue streams?',
      color: TEMPLATE_COLORS.blue.light,
    },
    // Value Propositions (Center)
    {
      type: 'frame',
      x: 510,
      y: 80,
      width: 220,
      height: 340,
      content: '💎 VALUE PROPOSITIONS\n\nWhat value do we deliver to the customer?\nWhich customer problems are we helping to solve?\nWhat bundles of products and services are we offering?\nWhich customer needs are we satisfying?',
      color: TEMPLATE_COLORS.yellow.light,
    },
    // Customer Relationships (Fourth column top)
    {
      type: 'frame',
      x: 740,
      y: 80,
      width: 220,
      height: 165,
      content: '💬 CUSTOMER RELATIONSHIPS\n\nWhat type of relationship does each customer segment expect?\nWhich ones have we established?\nHow costly are they?',
      color: TEMPLATE_COLORS.green.light,
    },
    // Channels (Fourth column bottom)
    {
      type: 'frame',
      x: 740,
      y: 255,
      width: 220,
      height: 165,
      content: '📣 CHANNELS\n\nThrough which channels do our customer segments want to be reached?\nHow do we reach them now?\nHow are our channels integrated?',
      color: TEMPLATE_COLORS.green.light,
    },
    // Customer Segments (Far Right)
    {
      type: 'frame',
      x: 970,
      y: 80,
      width: 220,
      height: 340,
      content: '👥 CUSTOMER SEGMENTS\n\nFor whom are we creating value?\nWho are our most important customers?\n\n• Mass Market\n• Niche Market\n• Segmented\n• Diversified',
      color: TEMPLATE_COLORS.pink.light,
    },
    // Cost Structure (Bottom Left)
    {
      type: 'frame',
      x: 50,
      y: 440,
      width: 560,
      height: 160,
      content: '💰 COST STRUCTURE\n\nWhat are the most important costs inherent in our business model?\nWhich key resources are most expensive?\nWhich key activities are most expensive?\n\n• Cost-driven  • Value-driven  • Fixed costs  • Variable costs  • Economies of scale',
      color: TEMPLATE_COLORS.red.light,
    },
    // Revenue Streams (Bottom Right)
    {
      type: 'frame',
      x: 630,
      y: 440,
      width: 560,
      height: 160,
      content: '💵 REVENUE STREAMS\n\nFor what value are our customers really willing to pay?\nFor what do they currently pay?\nHow are they currently paying?\nHow would they prefer to pay?\n\n• Asset sale  • Usage fee  • Subscription  • Licensing  • Advertising',
      color: TEMPLATE_COLORS.teal.light,
    },
  ],
};

// 3. Sprint Retrospective Template
const sprintRetroTemplate: BoardTemplate = {
  id: 'sprint-retrospective',
  name: 'Sprint Retrospective',
  description: 'Agile team reflection on what went well, what needs improvement, and action items',
  category: 'agile',
  icon: '🔄',
  tags: ['agile', 'scrum', 'retrospective', 'team', 'improvement'],
  nodes: [
    // Title
    {
      type: 'text',
      x: 400,
      y: 15,
      width: 400,
      height: 50,
      content: 'Sprint Retrospective',
      color: 'transparent',
      fontSize: 36,
      textStyle: 'heading',
    },
    // Sprint info
    {
      type: 'text',
      x: 430,
      y: 65,
      width: 340,
      height: 25,
      content: 'Sprint #__ | Date: ___________',
      color: 'transparent',
      fontSize: 14,
      textStyle: 'paragraph',
    },
    // What Went Well (Green)
    {
      type: 'frame',
      x: 50,
      y: 110,
      width: 380,
      height: 450,
      content: '😊 WHAT WENT WELL\n\nCelebrate your wins!\n\nAdd sticky notes for:\n• Successes\n• Things to keep doing\n• Positive surprises\n• Team achievements',
      color: TEMPLATE_COLORS.green.light,
    },
    // What Didn't Go Well (Red)
    {
      type: 'frame',
      x: 450,
      y: 110,
      width: 380,
      height: 450,
      content: '😟 WHAT DIDN\'T GO WELL\n\nIdentify challenges honestly\n\nAdd sticky notes for:\n• Obstacles encountered\n• Frustrations\n• Missed goals\n• Communication issues',
      color: TEMPLATE_COLORS.red.light,
    },
    // Action Items (Blue)
    {
      type: 'frame',
      x: 850,
      y: 110,
      width: 380,
      height: 350,
      content: '✅ ACTION ITEMS\n\nCommitments for next sprint\n\nFor each action:\n• Specific & measurable\n• Assign an owner\n• Set a deadline',
      color: TEMPLATE_COLORS.blue.light,
    },
    // Kudos Section (Yellow)
    {
      type: 'frame',
      x: 850,
      y: 480,
      width: 380,
      height: 150,
      content: '🌟 KUDOS\n\nRecognize team members!\n\nGive shoutouts to people who helped, went above and beyond, or made a difference.',
      color: TEMPLATE_COLORS.yellow.light,
    },
    // Sample sticky notes
    {
      type: 'sticky',
      x: 70,
      y: 280,
      width: 160,
      height: 100,
      content: 'Great team collaboration on feature X',
      color: '#bbf7d0',
    },
    {
      type: 'sticky',
      x: 470,
      y: 280,
      width: 160,
      height: 100,
      content: 'Deployment process took too long',
      color: '#fecaca',
    },
    {
      type: 'sticky',
      x: 870,
      y: 280,
      width: 160,
      height: 100,
      content: 'Automate deployment - @John - By Friday',
      color: '#bfdbfe',
    },
  ],
};

// 4. User Journey Map Template
const userJourneyMapTemplate: BoardTemplate = {
  id: 'user-journey-map',
  name: 'User Journey Map',
  description: 'Map the customer experience across all touchpoints from awareness to advocacy',
  category: 'design',
  icon: '🗺️',
  tags: ['ux', 'design', 'customer', 'journey', 'experience', 'touchpoints'],
  nodes: [
    // Title
    {
      type: 'text',
      x: 450,
      y: 10,
      width: 350,
      height: 45,
      content: 'User Journey Map',
      color: 'transparent',
      fontSize: 32,
      textStyle: 'heading',
    },
    // Persona info
    {
      type: 'frame',
      x: 50,
      y: 70,
      width: 180,
      height: 80,
      content: '👤 PERSONA\n\nName: ___________\nRole: ___________',
      color: TEMPLATE_COLORS.purple.light,
    },
    // Stages Header Row
    {
      type: 'frame',
      x: 250,
      y: 70,
      width: 200,
      height: 80,
      content: '1️⃣ AWARENESS\n\nDiscovery phase',
      color: TEMPLATE_COLORS.blue.light,
    },
    {
      type: 'frame',
      x: 460,
      y: 70,
      width: 200,
      height: 80,
      content: '2️⃣ CONSIDERATION\n\nEvaluation phase',
      color: TEMPLATE_COLORS.indigo.light,
    },
    {
      type: 'frame',
      x: 670,
      y: 70,
      width: 200,
      height: 80,
      content: '3️⃣ DECISION\n\nPurchase phase',
      color: TEMPLATE_COLORS.yellow.light,
    },
    {
      type: 'frame',
      x: 880,
      y: 70,
      width: 200,
      height: 80,
      content: '4️⃣ RETENTION\n\nUsage phase',
      color: TEMPLATE_COLORS.green.light,
    },
    {
      type: 'frame',
      x: 1090,
      y: 70,
      width: 200,
      height: 80,
      content: '5️⃣ ADVOCACY\n\nLoyalty phase',
      color: TEMPLATE_COLORS.pink.light,
    },
    // Row Labels
    {
      type: 'text',
      x: 50,
      y: 170,
      width: 180,
      height: 30,
      content: '🎬 ACTIONS',
      color: 'transparent',
      fontSize: 14,
    },
    {
      type: 'text',
      x: 50,
      y: 270,
      width: 180,
      height: 30,
      content: '💭 THOUGHTS',
      color: 'transparent',
      fontSize: 14,
    },
    {
      type: 'text',
      x: 50,
      y: 370,
      width: 180,
      height: 30,
      content: '😀 EMOTIONS',
      color: 'transparent',
      fontSize: 14,
    },
    {
      type: 'text',
      x: 50,
      y: 470,
      width: 180,
      height: 30,
      content: '😣 PAIN POINTS',
      color: 'transparent',
      fontSize: 14,
    },
    {
      type: 'text',
      x: 50,
      y: 570,
      width: 180,
      height: 30,
      content: '💡 OPPORTUNITIES',
      color: 'transparent',
      fontSize: 14,
    },
    // Grid Rows
    {
      type: 'frame',
      x: 250,
      y: 160,
      width: 1040,
      height: 90,
      content: '',
      color: TEMPLATE_COLORS.gray.light,
    },
    {
      type: 'frame',
      x: 250,
      y: 260,
      width: 1040,
      height: 90,
      content: '',
      color: '#ffffff',
    },
    {
      type: 'frame',
      x: 250,
      y: 360,
      width: 1040,
      height: 90,
      content: '',
      color: TEMPLATE_COLORS.gray.light,
    },
    {
      type: 'frame',
      x: 250,
      y: 460,
      width: 1040,
      height: 90,
      content: '',
      color: TEMPLATE_COLORS.red.light,
    },
    {
      type: 'frame',
      x: 250,
      y: 560,
      width: 1040,
      height: 90,
      content: '',
      color: TEMPLATE_COLORS.yellow.light,
    },
  ],
};

// 5. Lean Canvas Template
const leanCanvasTemplate: BoardTemplate = {
  id: 'lean-canvas',
  name: 'Lean Canvas',
  description: '1-page business plan template adapted for startups and lean methodology',
  category: 'strategy',
  icon: '🚀',
  tags: ['startup', 'lean', 'business', 'plan', 'mvp'],
  nodes: [
    // Title
    {
      type: 'text',
      x: 450,
      y: 10,
      width: 300,
      height: 50,
      content: 'Lean Canvas',
      color: 'transparent',
      fontSize: 36,
      textStyle: 'heading',
    },
    // Problem (Left column)
    {
      type: 'frame',
      x: 50,
      y: 80,
      width: 240,
      height: 220,
      content: '❓ PROBLEM\n\nTop 3 problems:\n\n1. _________________\n\n2. _________________\n\n3. _________________',
      color: TEMPLATE_COLORS.red.light,
    },
    // Existing Alternatives
    {
      type: 'frame',
      x: 50,
      y: 310,
      width: 240,
      height: 120,
      content: '📋 EXISTING ALTERNATIVES\n\nHow are these problems solved today?',
      color: TEMPLATE_COLORS.orange.light,
    },
    // Solution
    {
      type: 'frame',
      x: 300,
      y: 80,
      width: 240,
      height: 170,
      content: '💡 SOLUTION\n\nTop 3 features:\n\n1. _________________\n\n2. _________________\n\n3. _________________',
      color: TEMPLATE_COLORS.green.light,
    },
    // Key Metrics
    {
      type: 'frame',
      x: 300,
      y: 260,
      width: 240,
      height: 170,
      content: '📊 KEY METRICS\n\nKey activities you measure:\n\n• Acquisition\n• Activation\n• Retention\n• Revenue\n• Referral',
      color: TEMPLATE_COLORS.blue.light,
    },
    // Unique Value Proposition (Center)
    {
      type: 'frame',
      x: 550,
      y: 80,
      width: 240,
      height: 170,
      content: '⭐ UNIQUE VALUE PROPOSITION\n\nSingle, clear, compelling message that states why you are different and worth buying.\n\n"We help X do Y by Z"',
      color: TEMPLATE_COLORS.yellow.light,
    },
    // High-Level Concept
    {
      type: 'frame',
      x: 550,
      y: 260,
      width: 240,
      height: 100,
      content: '🎯 HIGH-LEVEL CONCEPT\n\n"X for Y"\nExample: "YouTube for Cats"',
      color: TEMPLATE_COLORS.purple.light,
    },
    // Unfair Advantage
    {
      type: 'frame',
      x: 550,
      y: 370,
      width: 240,
      height: 110,
      content: '🏆 UNFAIR ADVANTAGE\n\nCan\'t be easily copied or bought:\n• Insider info\n• Right team\n• Network effects',
      color: TEMPLATE_COLORS.pink.light,
    },
    // Channels
    {
      type: 'frame',
      x: 800,
      y: 80,
      width: 240,
      height: 170,
      content: '📣 CHANNELS\n\nPath to customers:\n\n• Content marketing\n• SEO/SEM\n• Social media\n• Email\n• Partnerships',
      color: TEMPLATE_COLORS.teal.light,
    },
    // Customer Segments
    {
      type: 'frame',
      x: 800,
      y: 260,
      width: 240,
      height: 170,
      content: '👥 CUSTOMER SEGMENTS\n\nTarget customers:\n\n• Early adopters: _______\n• Main market: _______',
      color: TEMPLATE_COLORS.indigo.light,
    },
    // Early Adopters
    {
      type: 'frame',
      x: 1050,
      y: 80,
      width: 180,
      height: 350,
      content: '🎪 EARLY ADOPTERS\n\nCharacteristics of your ideal first customers:\n\n• Have the problem\n• Know they have it\n• Have tried to solve it\n• Can afford a solution',
      color: TEMPLATE_COLORS.gray.light,
    },
    // Cost Structure (Bottom Left)
    {
      type: 'frame',
      x: 50,
      y: 450,
      width: 585,
      height: 150,
      content: '💰 COST STRUCTURE\n\n• Customer acquisition costs\n• Distribution costs\n• Hosting\n• People\n• etc.',
      color: TEMPLATE_COLORS.red.light,
    },
    // Revenue Streams (Bottom Right)
    {
      type: 'frame',
      x: 645,
      y: 450,
      width: 585,
      height: 150,
      content: '💵 REVENUE STREAMS\n\n• Revenue Model\n• Lifetime Value\n• Revenue per customer\n• Gross Margin',
      color: TEMPLATE_COLORS.green.light,
    },
  ],
};

// 6. Meeting Notes Template
const meetingNotesTemplate: BoardTemplate = {
  id: 'meeting-notes',
  name: 'Meeting Notes',
  description: 'Structured template for capturing meeting discussions, decisions, and action items',
  category: 'meeting',
  icon: '📝',
  tags: ['meeting', 'notes', 'agenda', 'action items', 'minutes'],
  nodes: [
    // Title
    {
      type: 'text',
      x: 450,
      y: 15,
      width: 300,
      height: 50,
      content: 'Meeting Notes',
      color: 'transparent',
      fontSize: 36,
      textStyle: 'heading',
    },
    // Meeting Info
    {
      type: 'frame',
      x: 50,
      y: 80,
      width: 350,
      height: 150,
      content: '📅 MEETING INFO\n\nDate: _______________\nTime: _______________\nLocation: ___________\nFacilitator: _________',
      color: TEMPLATE_COLORS.blue.light,
    },
    // Attendees
    {
      type: 'frame',
      x: 420,
      y: 80,
      width: 350,
      height: 150,
      content: '👥 ATTENDEES\n\n• _______________\n• _______________\n• _______________\n• _______________',
      color: TEMPLATE_COLORS.purple.light,
    },
    // Purpose/Objective
    {
      type: 'frame',
      x: 790,
      y: 80,
      width: 350,
      height: 150,
      content: '🎯 PURPOSE / OBJECTIVE\n\nWhat do we want to achieve in this meeting?\n\n________________________',
      color: TEMPLATE_COLORS.yellow.light,
    },
    // Agenda
    {
      type: 'frame',
      x: 50,
      y: 250,
      width: 550,
      height: 200,
      content: '📋 AGENDA\n\n1. Topic (time) - Owner\n\n2. Topic (time) - Owner\n\n3. Topic (time) - Owner\n\n4. Wrap-up & Next Steps',
      color: TEMPLATE_COLORS.gray.light,
    },
    // Discussion Notes
    {
      type: 'frame',
      x: 620,
      y: 250,
      width: 520,
      height: 200,
      content: '💬 DISCUSSION NOTES\n\nKey points discussed:\n\n•\n\n•\n\n•',
      color: '#ffffff',
      borderWidth: 2,
      borderColor: TEMPLATE_COLORS.gray.medium,
    },
    // Decisions Made
    {
      type: 'frame',
      x: 50,
      y: 470,
      width: 370,
      height: 180,
      content: '✅ DECISIONS MADE\n\nAgreed outcomes:\n\n1.\n\n2.\n\n3.',
      color: TEMPLATE_COLORS.green.light,
    },
    // Action Items
    {
      type: 'frame',
      x: 440,
      y: 470,
      width: 370,
      height: 180,
      content: '📌 ACTION ITEMS\n\nWho / What / When:\n\n1. ___ / ___ / ___\n\n2. ___ / ___ / ___\n\n3. ___ / ___ / ___',
      color: TEMPLATE_COLORS.orange.light,
    },
    // Next Steps
    {
      type: 'frame',
      x: 830,
      y: 470,
      width: 310,
      height: 180,
      content: '➡️ NEXT STEPS\n\n• Next meeting date:\n\n• Follow-up items:\n\n• Parking lot items:',
      color: TEMPLATE_COLORS.teal.light,
    },
  ],
};

// 7. Brainstorm Template
const brainstormTemplate: BoardTemplate = {
  id: 'brainstorm',
  name: 'Brainstorm',
  description: 'Radial brainstorming template with central topic and idea clusters for voting',
  category: 'design',
  icon: '💡',
  tags: ['brainstorm', 'ideas', 'creativity', 'ideation', 'voting'],
  nodes: [
    // Title
    {
      type: 'text',
      x: 500,
      y: 10,
      width: 250,
      height: 50,
      content: 'Brainstorm',
      color: 'transparent',
      fontSize: 36,
      textStyle: 'heading',
    },
    // Instructions
    {
      type: 'text',
      x: 380,
      y: 55,
      width: 500,
      height: 30,
      content: '💡 Generate ideas • 🗳️ Vote with dots • ⭐ Discuss top picks',
      color: 'transparent',
      fontSize: 14,
    },
    // Central Topic
    {
      type: 'shape',
      shapeType: 'circle',
      x: 490,
      y: 280,
      width: 200,
      height: 200,
      content: '🧠\n\nCENTRAL\nTOPIC\n\nWhat are we solving?',
      color: TEMPLATE_COLORS.purple.light,
    },
    // Cluster 1 - Top
    {
      type: 'frame',
      x: 450,
      y: 90,
      width: 280,
      height: 160,
      content: '💭 Idea Cluster 1\n\nAdd related ideas here',
      color: TEMPLATE_COLORS.blue.light,
    },
    // Cluster 2 - Top Right
    {
      type: 'frame',
      x: 750,
      y: 180,
      width: 280,
      height: 160,
      content: '💭 Idea Cluster 2\n\nAdd related ideas here',
      color: TEMPLATE_COLORS.green.light,
    },
    // Cluster 3 - Right
    {
      type: 'frame',
      x: 750,
      y: 380,
      width: 280,
      height: 160,
      content: '💭 Idea Cluster 3\n\nAdd related ideas here',
      color: TEMPLATE_COLORS.yellow.light,
    },
    // Cluster 4 - Bottom Right
    {
      type: 'frame',
      x: 650,
      y: 560,
      width: 280,
      height: 160,
      content: '💭 Idea Cluster 4\n\nAdd related ideas here',
      color: TEMPLATE_COLORS.orange.light,
    },
    // Cluster 5 - Bottom Left
    {
      type: 'frame',
      x: 250,
      y: 560,
      width: 280,
      height: 160,
      content: '💭 Idea Cluster 5\n\nAdd related ideas here',
      color: TEMPLATE_COLORS.pink.light,
    },
    // Cluster 6 - Left
    {
      type: 'frame',
      x: 150,
      y: 380,
      width: 280,
      height: 160,
      content: '💭 Idea Cluster 6\n\nAdd related ideas here',
      color: TEMPLATE_COLORS.teal.light,
    },
    // Cluster 7 - Top Left
    {
      type: 'frame',
      x: 150,
      y: 180,
      width: 280,
      height: 160,
      content: '💭 Idea Cluster 7\n\nAdd related ideas here',
      color: TEMPLATE_COLORS.indigo.light,
    },
    // Sample sticky notes with vote counts
    {
      type: 'sticky',
      x: 470,
      y: 120,
      width: 120,
      height: 80,
      content: 'Idea A\n\n🔵🔵🔵',
      color: '#93c5fd',
    },
    {
      type: 'sticky',
      x: 770,
      y: 210,
      width: 120,
      height: 80,
      content: 'Idea B\n\n🔵🔵',
      color: '#86efac',
    },
    // Top Picks Area
    {
      type: 'frame',
      x: 1080,
      y: 100,
      width: 180,
      height: 600,
      content: '⭐ TOP PICKS\n\nMove winning ideas here\n\n\n\n\n\n\n\n\nMost votes:\n1.\n2.\n3.',
      color: TEMPLATE_COLORS.yellow.light,
    },
  ],
};

// 8. Project Kickoff Template
const projectKickoffTemplate: BoardTemplate = {
  id: 'project-kickoff',
  name: 'Project Kickoff',
  description: 'Comprehensive template for project kickoff meetings with goals, scope, team, and risks',
  category: 'planning',
  icon: '🚀',
  tags: ['project', 'kickoff', 'planning', 'team', 'scope', 'risks'],
  nodes: [
    // Title
    {
      type: 'text',
      x: 450,
      y: 10,
      width: 350,
      height: 55,
      content: 'Project Kickoff',
      color: 'transparent',
      fontSize: 40,
      textStyle: 'heading',
    },
    // Project Name
    {
      type: 'frame',
      x: 50,
      y: 80,
      width: 500,
      height: 100,
      content: '📋 PROJECT NAME\n\n___________________________________\n\nBrief Description: ___________________',
      color: TEMPLATE_COLORS.blue.light,
    },
    // Sponsor/Owner
    {
      type: 'frame',
      x: 570,
      y: 80,
      width: 300,
      height: 100,
      content: '👤 PROJECT SPONSOR\n\nName: _______________\nRole: _______________',
      color: TEMPLATE_COLORS.purple.light,
    },
    // Date/Duration
    {
      type: 'frame',
      x: 890,
      y: 80,
      width: 300,
      height: 100,
      content: '📅 TIMELINE\n\nStart: ___________\nEnd: ___________',
      color: TEMPLATE_COLORS.gray.light,
    },
    // Goals & Objectives
    {
      type: 'frame',
      x: 50,
      y: 200,
      width: 400,
      height: 200,
      content: '🎯 GOALS & OBJECTIVES\n\nWhat are we trying to achieve?\n\n1. ________________________\n\n2. ________________________\n\n3. ________________________',
      color: TEMPLATE_COLORS.green.light,
    },
    // Scope - In Scope
    {
      type: 'frame',
      x: 470,
      y: 200,
      width: 360,
      height: 200,
      content: '✅ IN SCOPE\n\nWhat\'s included:\n\n•\n\n•\n\n•',
      color: TEMPLATE_COLORS.teal.light,
    },
    // Scope - Out of Scope
    {
      type: 'frame',
      x: 850,
      y: 200,
      width: 340,
      height: 200,
      content: '❌ OUT OF SCOPE\n\nWhat\'s NOT included:\n\n•\n\n•\n\n•',
      color: TEMPLATE_COLORS.red.light,
    },
    // Team
    {
      type: 'frame',
      x: 50,
      y: 420,
      width: 350,
      height: 200,
      content: '👥 TEAM\n\nProject Manager: _________\nTech Lead: _________\nDesigner: _________\nDeveloper: _________\nStakeholder: _________',
      color: TEMPLATE_COLORS.indigo.light,
    },
    // Key Milestones
    {
      type: 'frame',
      x: 420,
      y: 420,
      width: 410,
      height: 200,
      content: '🏁 KEY MILESTONES\n\n📍 Milestone 1: _______ (Date: ___)\n\n📍 Milestone 2: _______ (Date: ___)\n\n📍 Milestone 3: _______ (Date: ___)\n\n📍 Launch: __________ (Date: ___)',
      color: TEMPLATE_COLORS.yellow.light,
    },
    // Risks
    {
      type: 'frame',
      x: 850,
      y: 420,
      width: 340,
      height: 200,
      content: '⚠️ RISKS\n\nPotential blockers:\n\n🔴 High: _____________\n\n🟡 Medium: ___________\n\n🟢 Low: ______________',
      color: TEMPLATE_COLORS.orange.light,
    },
    // Success Criteria
    {
      type: 'frame',
      x: 50,
      y: 640,
      width: 560,
      height: 120,
      content: '🏆 SUCCESS CRITERIA\n\nHow do we know we\'ve succeeded?\n\n•                                          •',
      color: TEMPLATE_COLORS.pink.light,
    },
    // Communication Plan
    {
      type: 'frame',
      x: 630,
      y: 640,
      width: 560,
      height: 120,
      content: '📢 COMMUNICATION\n\n• Status updates: _________ (frequency)\n• Stand-ups: _________ (time/day)\n• Slack channel: _________',
      color: TEMPLATE_COLORS.blue.light,
    },
  ],
};

// Additional helpful templates

// 9. Kanban Board Template
const kanbanBoardTemplate: BoardTemplate = {
  id: 'kanban-board',
  name: 'Kanban Board',
  description: 'Visual task management with columns for tracking work progress',
  category: 'agile',
  icon: '📊',
  tags: ['kanban', 'agile', 'tasks', 'workflow', 'project management'],
  nodes: [
    // Title
    {
      type: 'text',
      x: 500,
      y: 15,
      width: 250,
      height: 50,
      content: 'Kanban Board',
      color: 'transparent',
      fontSize: 36,
      textStyle: 'heading',
    },
    // Backlog
    {
      type: 'frame',
      x: 50,
      y: 80,
      width: 280,
      height: 600,
      content: '📋 BACKLOG\n\nTasks waiting to be picked up',
      color: TEMPLATE_COLORS.gray.light,
    },
    // To Do
    {
      type: 'frame',
      x: 350,
      y: 80,
      width: 280,
      height: 600,
      content: '📝 TO DO\n\nReady to start',
      color: TEMPLATE_COLORS.purple.light,
    },
    // In Progress
    {
      type: 'frame',
      x: 650,
      y: 80,
      width: 280,
      height: 600,
      content: '🔄 IN PROGRESS\n\nWork in progress (WIP)',
      color: TEMPLATE_COLORS.blue.light,
    },
    // Review
    {
      type: 'frame',
      x: 950,
      y: 80,
      width: 280,
      height: 600,
      content: '👀 REVIEW\n\nAwaiting feedback',
      color: TEMPLATE_COLORS.yellow.light,
    },
    // Done
    {
      type: 'frame',
      x: 1250,
      y: 80,
      width: 280,
      height: 600,
      content: '✅ DONE\n\nCompleted tasks',
      color: TEMPLATE_COLORS.green.light,
    },
    // Sample cards
    {
      type: 'sticky',
      x: 70,
      y: 150,
      width: 240,
      height: 80,
      content: 'Task 1\n\n🏷️ Feature  👤 John',
      color: '#ffffff',
    },
    {
      type: 'sticky',
      x: 70,
      y: 250,
      width: 240,
      height: 80,
      content: 'Task 2\n\n🏷️ Bug  👤 Sarah',
      color: '#ffffff',
    },
  ],
};

// 10. Empathy Map Template
const empathyMapTemplate: BoardTemplate = {
  id: 'empathy-map',
  name: 'Empathy Map',
  description: 'Understand your users by exploring what they think, feel, say, and do',
  category: 'design',
  icon: '❤️',
  tags: ['ux', 'design', 'user research', 'persona', 'empathy'],
  nodes: [
    // Title
    {
      type: 'text',
      x: 480,
      y: 10,
      width: 250,
      height: 50,
      content: 'Empathy Map',
      color: 'transparent',
      fontSize: 36,
      textStyle: 'heading',
    },
    // User at center
    {
      type: 'shape',
      shapeType: 'circle',
      x: 510,
      y: 320,
      width: 180,
      height: 180,
      content: '👤\n\nUSER\n\nName:\nRole:',
      color: TEMPLATE_COLORS.purple.light,
    },
    // THINKS (Top)
    {
      type: 'frame',
      x: 350,
      y: 70,
      width: 500,
      height: 200,
      content: '🧠 THINKS\n\nWhat does the user think about?\nWhat occupies their mind?\nWhat are their beliefs?\nWhat matters most to them?',
      color: TEMPLATE_COLORS.blue.light,
    },
    // SEES (Right)
    {
      type: 'frame',
      x: 750,
      y: 280,
      width: 350,
      height: 260,
      content: '👀 SEES\n\nWhat does the user see in their environment?\nWhat do they watch/read?\nWhat\'s in their immediate surroundings?\nWhat offers do they see?',
      color: TEMPLATE_COLORS.green.light,
    },
    // DOES (Bottom)
    {
      type: 'frame',
      x: 350,
      y: 550,
      width: 500,
      height: 180,
      content: '🎬 SAYS & DOES\n\nWhat does the user say to others?\nWhat actions do they take?\nWhat is their public behavior?\nHow do they present themselves?',
      color: TEMPLATE_COLORS.yellow.light,
    },
    // HEARS (Left)
    {
      type: 'frame',
      x: 100,
      y: 280,
      width: 350,
      height: 260,
      content: '👂 HEARS\n\nWhat does the user hear from friends, colleagues, and influencers?\nWhat channels do they listen to?\nWhat are others saying about their problem?',
      color: TEMPLATE_COLORS.teal.light,
    },
    // PAINS (Bottom Left)
    {
      type: 'frame',
      x: 100,
      y: 560,
      width: 230,
      height: 180,
      content: '😣 PAINS\n\nFears\nFrustrations\nObstacles\nRisks',
      color: TEMPLATE_COLORS.red.light,
    },
    // GAINS (Bottom Right)
    {
      type: 'frame',
      x: 870,
      y: 560,
      width: 230,
      height: 180,
      content: '🎯 GAINS\n\nWants\nNeeds\nSuccess metrics\nGoals',
      color: TEMPLATE_COLORS.green.light,
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
