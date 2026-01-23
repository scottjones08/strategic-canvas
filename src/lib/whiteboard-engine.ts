import type { Whiteboard, WhiteboardNode, Connector, BusinessTemplate, STATUS_COLORS, NodeType, NodeStatus } from '@/types/whiteboard';
import { BUSINESS_TEMPLATES } from '@/types/whiteboard';

const STORAGE_KEY = 'fan_consulting_whiteboards';

export class WhiteboardEngine {
  private whiteboards: Map<string, Whiteboard> = new Map();
  private currentWhiteboard: Whiteboard | null = null;

  constructor() {
    this.loadFromStorage();
  }

  // Create new whiteboard
  createWhiteboard(name: string, description?: string, template?: string): Whiteboard {
    const id = `wb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const whiteboard: Whiteboard = {
      id,
      name,
      description,
      nodes: [],
      connectors: [],
      viewState: { zoom: 1, panX: 0, panY: 0 },
      template: template as any,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      owner: 'user_1',
      isPublic: false
    };

    // Apply template if specified
    if (template && template !== 'blank') {
      const templateConfig = BUSINESS_TEMPLATES.find(t => t.id === template);
      if (templateConfig) {
        whiteboard.nodes = this.applyTemplate(templateConfig);
      }
    }

    this.whiteboards.set(id, whiteboard);
    this.saveToStorage();
    return whiteboard;
  }

  private applyTemplate(template: BusinessTemplate): WhiteboardNode[] {
    return template.nodes.map((node, index) => ({
      id: `node_${Date.now()}_${index}`,
      type: node.type || 'sticky',
      status: node.status || 'note',
      x: node.x || 100 + (index * 50),
      y: node.y || 100 + (index * 30),
      width: node.width || 200,
      height: node.height || 150,
      title: node.title || '',
      content: node.content || '',
      tags: node.tags || [],
      color: node.color || '#f3f4f6',
      textColor: node.textColor || '#374151',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'user_1',
      priority: node.priority,
      confidence: node.confidence,
      estimatedValue: node.estimatedValue
    }));
  }

  // Get whiteboard by ID
  getWhiteboard(id: string): Whiteboard | undefined {
    return this.whiteboards.get(id);
  }

  // Get all whiteboards
  getAllWhiteboards(): Whiteboard[] {
    return Array.from(this.whiteboards.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  // Update whiteboard
  updateWhiteboard(id: string, updates: Partial<Whiteboard>): Whiteboard | undefined {
    const whiteboard = this.whiteboards.get(id);
    if (!whiteboard) return undefined;

    const updated = { ...whiteboard, ...updates, updatedAt: new Date().toISOString() };
    this.whiteboards.set(id, updated);
    this.saveToStorage();
    return updated;
  }

  // Add node
  addNode(whiteboardId: string, node: Omit<WhiteboardNode, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>): WhiteboardNode {
    const whiteboard = this.whiteboards.get(whiteboardId);
    if (!whiteboard) throw new Error('Whiteboard not found');

    const newNode: WhiteboardNode = {
      ...node,
      id: `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'user_1'
    };

    whiteboard.nodes.push(newNode);
    whiteboard.updatedAt = new Date().toISOString();
    this.saveToStorage();
    return newNode;
  }

  // Update node
  updateNode(whiteboardId: string, nodeId: string, updates: Partial<WhiteboardNode>): WhiteboardNode | undefined {
    const whiteboard = this.whiteboards.get(whiteboardId);
    if (!whiteboard) return undefined;

    const nodeIndex = whiteboard.nodes.findIndex(n => n.id === nodeId);
    if (nodeIndex === -1) return undefined;

    whiteboard.nodes[nodeIndex] = {
      ...whiteboard.nodes[nodeIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    whiteboard.updatedAt = new Date().toISOString();
    this.saveToStorage();
    return whiteboard.nodes[nodeIndex];
  }

  // Delete node
  deleteNode(whiteboardId: string, nodeId: string): boolean {
    const whiteboard = this.whiteboards.get(whiteboardId);
    if (!whiteboard) return false;

    whiteboard.nodes = whiteboard.nodes.filter(n => n.id !== nodeId);
    whiteboard.connectors = whiteboard.connectors.filter(
      c => c.fromNodeId !== nodeId && c.toNodeId !== nodeId
    );
    whiteboard.updatedAt = new Date().toISOString();
    this.saveToStorage();
    return true;
  }

  // Add connector
  addConnector(whiteboardId: string, connector: Omit<Connector, 'id'>): Connector {
    const whiteboard = this.whiteboards.get(whiteboardId);
    if (!whiteboard) throw new Error('Whiteboard not found');

    const newConnector: Connector = {
      ...connector,
      id: `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    whiteboard.connectors.push(newConnector);
    whiteboard.updatedAt = new Date().toISOString();
    this.saveToStorage();
    return newConnector;
  }

  // Delete connector
  deleteConnector(whiteboardId: string, connectorId: string): boolean {
    const whiteboard = this.whiteboards.get(whiteboardId);
    if (!whiteboard) return false;

    whiteboard.connectors = whiteboard.connectors.filter(c => c.id !== connectorId);
    whiteboard.updatedAt = new Date().toISOString();
    this.saveToStorage();
    return true;
  }

  // Get templates
  getTemplates(): BusinessTemplate[] {
    return BUSINESS_TEMPLATES;
  }

  // Analyze with AI (simulated)
  async analyzeWhiteboard(whiteboardId: string): Promise<{
    insights: string[];
    recommendations: string[];
    riskFactors: string[];
    opportunities: string[];
  }> {
    const whiteboard = this.whiteboards.get(whiteboardId);
    if (!whiteboard) throw new Error('Whiteboard not found');

    const opportunities = whiteboard.nodes.filter(n => n.status === 'opportunity');
    const risks = whiteboard.nodes.filter(n => n.status === 'risk');
    const ideas = whiteboard.nodes.filter(n => n.status === 'idea');
    const tasks = whiteboard.nodes.filter(n => n.status === 'task');

    // Simulated AI analysis
    return {
      insights: [
        `You have ${opportunities.length} opportunities identified`,
        `${risks.length} risks need attention`,
        `${ideas.length} ideas worth exploring`,
        `${tasks.length} tasks pending`,
        opportunities.length > risks.length ? 'Positive outlook - more opportunities than risks' : 'Consider risk mitigation strategies'
      ],
      recommendations: [
        'Prioritize high-impact, low-effort opportunities first',
        'Address critical risks before scaling',
        'Break down large ideas into actionable tasks',
        'Set milestones for tracking progress',
        'Review and update this board weekly'
      ],
      riskFactors: risks.map(r => r.title),
      opportunities: opportunities.map(o => o.title)
    };
  }

  // Export whiteboard
  exportWhiteboard(whiteboardId: string): string {
    const whiteboard = this.whiteboards.get(whiteboardId);
    if (!whiteboard) throw new Error('Whiteboard not found');
    return JSON.stringify(whiteboard, null, 2);
  }

  // Import whiteboard
  importWhiteboard(data: string): Whiteboard {
    const imported = JSON.parse(data) as Whiteboard;
    imported.id = `wb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    imported.createdAt = new Date().toISOString();
    imported.updatedAt = new Date().toISOString();
    this.whiteboards.set(imported.id, imported);
    this.saveToStorage();
    return imported;
  }

  // Delete whiteboard
  deleteWhiteboard(id: string): boolean {
    const deleted = this.whiteboards.delete(id);
    if (deleted) {
      this.saveToStorage();
    }
    return deleted;
  }

  // Storage
  private saveToStorage(): void {
    const data = JSON.stringify(Array.from(this.whiteboards.entries()));
    localStorage.setItem(STORAGE_KEY, data);
  }

  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const entries = JSON.parse(data) as [string, Whiteboard][];
        this.whiteboards = new Map(entries);
      }
    } catch (error) {
      console.error('Failed to load whiteboards:', error);
    }
  }
}

export const whiteboardEngine = new WhiteboardEngine();
