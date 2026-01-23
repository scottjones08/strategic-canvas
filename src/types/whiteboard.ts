// Whiteboard Types

export type NodeType = 'sticky' | 'card' | 'connector' | 'text' | 'image' | 'kanban' | 'mindmap' | 'matrix';
export type NodeStatus = 'opportunity' | 'risk' | 'idea' | 'task' | 'milestone' | 'note';

export interface WhiteboardNode {
  id: string;
  type: NodeType;
  status: NodeStatus;
  
  // Position & Size
  x: number;
  y: number;
  width: number;
  height: number;
  
  // Content
  title: string;
  content: string;
  tags: string[];
  
  // Styling
  color: string;
  textColor: string;
  borderColor?: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  
  // AI Analysis
  aiSuggestions?: string[];
  priority?: 'high' | 'medium' | 'low';
  confidence?: number;
  estimatedValue?: number;
}

export interface Whiteboard {
  id: string;
  name: string;
  description?: string;
  
  // Canvas
  nodes: WhiteboardNode[];
  connectors: Connector[];
  
  // View State
  viewState: {
    zoom: number;
    panX: number;
    panY: number;
  };
  
  // Template
  template?: 'business-canvas' | 'swot' | 'opportunity-matrix' | 'mindmap' | 'kanban' | 'blank';
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  owner: string;
  isPublic: boolean;
}

export interface Connector {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  label?: string;
  style: 'solid' | 'dashed' | 'dotted';
  color: string;
}

export interface BusinessTemplate {
  id: string;
  name: string;
  description: string;
  category: 'planning' | 'strategy' | 'ideation' | 'review';
  nodes: Partial<WhiteboardNode>[];
  layout: 'freeform' | 'grid' | 'columns';
}

// Pre-built business planning templates
export const BUSINESS_TEMPLATES: BusinessTemplate[] = [
  {
    id: 'ai-consulting-canvas',
    name: 'AI Consulting Business Canvas',
    description: 'Complete business model canvas for your AI consulting company',
    category: 'planning',
    layout: 'grid',
    nodes: [
      // Value Propositions
      { type: 'sticky', status: 'idea', title: 'AI Agents', content: 'Build custom AI agents for businesses', x: 400, y: 100, width: 200, height: 150, color: '#fef3c7', textColor: '#92400e' },
      { type: 'sticky', status: 'idea', title: 'Automation', content: 'Automate business workflows', x: 400, y: 270, width: 200, height: 150, color: '#fef3c7', textColor: '#92400e' },
      { type: 'sticky', status: 'idea', title: 'Consulting', content: 'Strategic AI guidance', x: 400, y: 440, width: 200, height: 150, color: '#fef3c7', textColor: '#92400e' },
      
      // Target Markets
      { type: 'card', status: 'opportunity', title: 'Small Businesses', content: '$5-10M revenue companies without tech depts', x: 100, y: 100, width: 250, height: 200, color: '#d1fae5', textColor: '#065f46', priority: 'high' },
      { type: 'card', status: 'opportunity', title: 'Field Service', content: 'Plumbers, HVAC, Electricians', x: 100, y: 320, width: 250, height: 200, color: '#d1fae5', textColor: '#065f46', priority: 'high' },
      { type: 'card', status: 'opportunity', title: 'Medical Practices', content: 'Dental, Clinics, Healthcare', x: 100, y: 540, width: 250, height: 200, color: '#d1fae5', textColor: '#065f46', priority: 'medium' },
      
      // Risks
      { type: 'card', status: 'risk', title: 'Competition', content: 'Existing players like ServiceTitan', x: 650, y: 100, width: 200, height: 150, color: '#fee2e2', textColor: '#991b1b', priority: 'high' },
      { type: 'card', status: 'risk', title: 'Pricing Pressure', content: 'Clients may not afford premium', x: 650, y: 270, width: 200, height: 150, color: '#fee2e2', textColor: '#991b1b', priority: 'medium' },
      { type: 'card', status: 'risk', title: 'Tech Changes', content: 'AI evolves rapidly', x: 650, y: 440, width: 200, height: 150, color: '#fee2e2', textColor: '#991b1b', priority: 'medium' },
      
      // Revenue Streams
      { type: 'card', status: 'task', title: 'Retainer', content: '$5-15K/month per client', x: 900, y: 100, width: 180, height: 120, color: '#dbeafe', textColor: '#1e40af' },
      { type: 'card', status: 'task', title: 'Implementation', content: '$25-50K per project', x: 900, y: 240, width: 180, height: 120, color: '#dbeafe', textColor: '#1e40af' },
      { type: 'card', status: 'task', title: 'Training', content: '$2-5K per workshop', x: 900, y: 380, width: 180, height: 120, color: '#dbeafe', textColor: '#1e40af' },
      
      // Key Metrics
      { type: 'card', status: 'milestone', title: 'First 10 Clients', content: 'MRR: $75K', x: 900, y: 520, width: 180, height: 100, color: '#f3e8ff', textColor: '#6b21a8' },
    ]
  },
  {
    id: 'swot-analysis',
    name: 'SWOT Analysis',
    description: 'Strengths, Weaknesses, Opportunities, Threats matrix',
    category: 'strategy',
    layout: 'grid',
    nodes: []
  },
  {
    id: 'opportunity-matrix',
    name: 'Opportunity Matrix',
    description: 'Prioritize opportunities by impact and effort',
    category: 'ideation',
    layout: 'matrix',
    nodes: []
  },
  {
    id: 'mindmap',
    name: 'Business Mind Map',
    description: 'Visual brainstorm of business ideas',
    category: 'ideation',
    layout: 'mindmap',
    nodes: []
  },
  {
    id: 'kanban-planning',
    name: 'Project Kanban',
    description: 'Track business development tasks',
    category: 'planning',
    layout: 'columns',
    nodes: []
  }
];

export const STATUS_COLORS: Record<NodeStatus, { bg: string; text: string; border: string }> = {
  opportunity: { bg: '#d1fae5', text: '#065f46', border: '#10b981' },
  risk: { bg: '#fee2e2', text: '#991b1b', border: '#ef4444' },
  idea: { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' },
  task: { bg: '#dbeafe', text: '#1e40af', border: '#3b82f6' },
  milestone: { bg: '#f3e8ff', text: '#6b21a8', border: '#8b5cf6' },
  note: { bg: '#f3f4f6', text: '#374151', border: '#9ca3af' }
};
