import { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Plus, Trash2, Move, Type, StickyNote, Kanban, Brain, BarChart3, 
  GripVertical, ZoomIn, ZoomOut, Download, Upload, Sparkles,
  ChevronRight, ChevronDown, X, Lightbulb, CheckCircle, AlertTriangle,
  TrendingUp, Flag
} from 'lucide-react';
import type { Whiteboard, WhiteboardNode, Connector, BusinessTemplate, NodeType, NodeStatus } from './types/whiteboard';
import { whiteboardEngine, BUSINESS_TEMPLATES } from './lib/whiteboard-engine';
import { STATUS_COLORS } from './types/whiteboard';

const STATUS_OPTIONS: { id: NodeStatus; label: string; color: string }[] = [
  { id: 'opportunity', label: 'Opportunity', color: '#10b981' },
  { id: 'risk', label: 'Risk', color: '#ef4444' },
  { id: 'idea', label: 'Idea', color: '#f59e0b' },
  { id: 'task', label: 'Task', color: '#3b82f6' },
  { id: 'milestone', label: 'Milestone', color: '#8b5cf6' },
  { id: 'note', label: 'Note', color: '#6b7280' },
];

function FlagIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-8m0-4.5a3 3 0 013-3h9a3 3 0 013 3v8.5m-9-4.5h-9m9 4.5h-9m9-4.5V9m0 4.5h-9" /></svg>;
}

export default function App() {
  const [whiteboards, setWhiteboards] = useState<Whiteboard[]>([]);
  const [currentWb, setCurrentWb] = useState<Whiteboard | null>(null);
  const [selectedNode, setSelectedNode] = useState<WhiteboardNode | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showAI, setShowAI] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWbName, setNewWbName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('blank');
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setWhiteboards(whiteboardEngine.getAllWhiteboards());
  }, []);

  const createWhiteboard = () => {
    if (!newWbName.trim()) return;
    const wb = whiteboardEngine.createWhiteboard(newWbName, undefined, selectedTemplate);
    setWhiteboards(whiteboardEngine.getAllWhiteboards());
    setCurrentWb(wb);
    setShowCreateModal(false);
    setNewWbName('');
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      setSelectedNode(null);
    }
  };

  const handleNodeMouseDown = (e: React.MouseEvent, node: WhiteboardNode) => {
    e.stopPropagation();
    const rect = (e.target as HTMLElement).closest('.whiteboard-node')?.getBoundingClientRect();
    if (rect) {
      setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
    setIsDragging(true);
    setSelectedNode(node);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !selectedNode || !currentWb) return;
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;
    const newX = (e.clientX - canvasRect.left - pan.x) / zoom - dragOffset.x;
    const newY = (e.clientY - canvasRect.top - pan.y) / zoom - dragOffset.y;
    whiteboardEngine.updateNode(currentWb.id, selectedNode.id, { x: Math.max(0, newX), y: Math.max(0, newY) });
    setCurrentWb(whiteboardEngine.getWhiteboard(currentWb.id)!);
  }, [isDragging, selectedNode, currentWb, zoom, pan, dragOffset]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const addNode = (status: NodeStatus = 'note') => {
    if (!currentWb) return;
    const newNode = whiteboardEngine.addNode(currentWb.id, {
      type: 'card',
      status,
      x: 200 + Math.random() * 200,
      y: 200 + Math.random() * 200,
      width: 220,
      height: 160,
      title: status === 'opportunity' ? 'New Opportunity' : status === 'risk' ? 'New Risk' : status === 'idea' ? 'New Idea' : 'New Item',
      content: '',
      tags: [],
      color: STATUS_COLORS[status].bg,
      textColor: STATUS_COLORS[status].text
    });
    setCurrentWb(whiteboardEngine.getWhiteboard(currentWb.id)!);
    setSelectedNode(newNode);
  };

  const deleteNode = () => {
    if (!currentWb || !selectedNode) return;
    whiteboardEngine.deleteNode(currentWb.id, selectedNode.id);
    setCurrentWb(whiteboardEngine.getWhiteboard(currentWb.id)!);
    setSelectedNode(null);
  };

  const updateNode = (updates: Partial<WhiteboardNode>) => {
    if (!currentWb || !selectedNode) return;
    whiteboardEngine.updateNode(currentWb.id, selectedNode.id, updates);
    setCurrentWb(whiteboardEngine.getWhiteboard(currentWb.id)!);
    setSelectedNode(whiteboardEngine.getWhiteboard(currentWb.id)!.nodes.find(n => n.id === selectedNode.id)!);
  };

  const runAIAnalysis = async () => {
    if (!currentWb) return;
    setShowAI(true);
    const analysis = await whiteboardEngine.analyzeWhiteboard(currentWb.id);
    setAiAnalysis(analysis);
  };

  const exportBoard = () => {
    if (!currentWb) return;
    const data = whiteboardEngine.exportWhiteboard(currentWb.id);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentWb.name.replace(/\s+/g, '-')}-whiteboard.json`;
    a.click();
  };

  const loadBoard = (wb: Whiteboard) => {
    setCurrentWb(wb);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Brain className="w-8 h-8 text-purple-500" />
              Strategic Canvas
            </h1>
            {currentWb && <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">{currentWb.name}</span>}
          </div>
          <div className="flex items-center gap-2">
            {!currentWb && <button onClick={() => setShowCreateModal(true)} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"><Plus className="w-4 h-4" /> New Whiteboard</button>}
            {currentWb && (<><button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="p-2 hover:bg-gray-100 rounded-lg"><ZoomIn className="w-5 h-5" /></button><span className="text-sm text-gray-500">{Math.round(zoom * 100)}%</span><button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="p-2 hover:bg-gray-100 rounded-lg"><ZoomOut className="w-5 h-5" /></button><div className="w-px h-6 bg-gray-200 mx-2" /><button onClick={runAIAnalysis} className="px-3 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:opacity-90 flex items-center gap-2"><Sparkles className="w-4 h-4" /> AI Analyze</button><button onClick={exportBoard} className="p-2 hover:bg-gray-100 rounded-lg"><Download className="w-5 h-5" /></button><button onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.accept = '.json'; input.onchange = (e: any) => { const file = e.target.files[0]; const reader = new FileReader(); reader.onload = (ev: any) => { const wb = whiteboardEngine.importWhiteboard(ev.target?.result); setWhiteboards(whiteboardEngine.getAllWhiteboards()); setCurrentWb(wb); }; reader.readAsText(file); }; input.click(); }} className="p-2 hover:bg-gray-100 rounded-lg"><Upload className="w-5 h-5" /></button></>)}
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {!currentWb && (<div className="w-80 bg-white border-r border-gray-200 p-4"><h2 className="font-medium text-gray-900 mb-4">Your Whiteboards</h2><div className="space-y-2">{whiteboards.map(wb => (<button key={wb.id} onClick={() => loadBoard(wb)} className="w-full p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg"><p className="font-medium text-gray-900">{wb.name}</p><p className="text-sm text-gray-500">{wb.nodes.length} items</p></button>))}{whiteboards.length === 0 && (<div className="text-center py-8 text-gray-500"><Brain className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No whiteboards yet</p><button onClick={() => setShowCreateModal(true)} className="mt-3 text-purple-600 hover:text-purple-700">Create your first one</button></div>)}<h3 className="font-medium text-gray-900 mt-6 mb-3">Templates</h3><div className="space-y-2">{BUSINESS_TEMPLATES.map(template => (<button key={template.id} onClick={() => { setSelectedTemplate(template.id); setShowCreateModal(true); }} className="w-full p-3 text-left bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 rounded-lg border border-purple-100"><p className="font-medium text-gray-900">{template.name}</p><p className="text-xs text-gray-500">{template.description}</p></button>))}</div></div>)}

        {currentWb && (<><div className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto"><h3 className="font-medium text-gray-900 mb-3">Add Node</h3><div className="space-y-2 mb-6">{STATUS_OPTIONS.map(status => (<button key={status.id} onClick={() => addNode(status.id)} className="w-full p-2 text-left flex items-center gap-2 hover:bg-gray-100 rounded-lg"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }} /><span className="text-sm">{status.label}</span></button>))}</div>{selectedNode && (<div className="mt-6 pt-6 border-t border-gray-200"><h3 className="font-medium text-gray-900 mb-3">Edit Node</h3><div className="space-y-3"><div><label className="text-xs text-gray-500 block mb-1">Title</label><input type="text" value={selectedNode.title} onChange={(e) => updateNode({ title: e.target.value })} className="w-full px-2 py-1 border border-gray-200 rounded text-sm" /></div><div><label className="text-xs text-gray-500 block mb-1">Content</label><textarea value={selectedNode.content} onChange={(e) => updateNode({ content: e.target.value })} rows={3} className="w-full px-2 py-1 border border-gray-200 rounded text-sm" /></div><div><label className="text-xs text-gray-500 block mb-1">Priority</label><select value={selectedNode.priority || 'medium'} onChange={(e) => updateNode({ priority: e.target.value as any })} className="w-full px-2 py-1 border border-gray-200 rounded text-sm"><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></div><button onClick={deleteNode} className="w-full p-2 text-red-600 hover:bg-red-50 rounded-lg flex items-center justify-center gap-2"><Trash2 className="w-4 h-4" /> Delete</button></div></div>)}</div></>)}

        {currentWb && (<div ref={canvasRef} className="flex-1 relative overflow-hidden" style={{ backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)', backgroundSize: `${20 * zoom}px ${20 * zoom}px`, backgroundPosition: `${pan.x}px ${pan.y}px` }} onClick={handleCanvasClick}><div className="absolute inset-0" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}>{currentWb.connectors.map(connector => { const fromNode = currentWb.nodes.find(n => n.id === connector.fromNodeId); const toNode = currentWb.nodes.find(n => n.id === connector.toNodeId); if (!fromNode || !toNode) return null; const x1 = fromNode.x + fromNode.width / 2; const y1 = fromNode.y + fromNode.height / 2; const x2 = toNode.x + toNode.width / 2; const y2 = toNode.y + toNode.height / 2; return (<svg key={connector.id} className="absolute pointer-events-none" style={{ overflow: 'visible' }}><line x1={x1} y1={y1} x2={x2} y2={y2} stroke={connector.color} strokeWidth={2} /></svg>); })}{currentWb.nodes.map(node => { const colors = STATUS_COLORS[node.status]; const isSelected = selectedNode?.id === node.id; return (<div key={node.id} className="whiteboard-node absolute cursor-move" style={{ left: node.x, top: node.y, width: node.width, height: node.height, backgroundColor: node.color, color: node.textColor, border: `2px solid ${isSelected ? '#8b5cf6' : colors.border}`, borderRadius: '8px', boxShadow: isSelected ? '0 0 0 4px rgba(139, 92, 246, 0.2)' : '0 2px 8px rgba(0,0,0,0.1)', padding: '12px', display: 'flex', flexDirection: 'column' }} onMouseDown={(e) => handleNodeMouseDown(e, node)}><div className="flex items-start justify-between mb-2"><p className="font-medium">{node.title}</p>{node.priority && (<span className={`text-xs px-1.5 py-0.5 rounded ${node.priority === 'high' ? 'bg-red-500 text-white' : node.priority === 'medium' ? 'bg-yellow-500 text-white' : 'bg-green-500 text-white'}`}>{node.priority}</span>)}</div>{node.content && <p className="text-sm opacity-80">{node.content}</p>}{node.tags.length > 0 && (<div className="flex flex-wrap gap-1 mt-2">{node.tags.map((tag, i) => (<span key={i} className="text-xs px-1.5 py-0.5 bg-white/50 rounded">{tag}</span>))}</div>)}{isSelected && <div className="absolute -top-3 -right-3 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center"><GripVertical className="w-4 h-4 text-white" /></div>}</div>); })})}</div>{showAI && (<div className="absolute top-4 right-4 w-80 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden"><div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4 text-white"><div className="flex items-center justify-between"><h3 className="font-medium flex items-center gap-2"><Sparkles className="w-5 h-5" /> AI Insights</h3><button onClick={() => setShowAI(false)} className="p-1 hover:bg-white/20 rounded"><X className="w-4 h-4" /></button></div></div>{aiAnalysis ? (<div className="p-4 space-y-4 max-h-96 overflow-y-auto"><div><h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-yellow-500" /> Key Insights</h4><ul className="text-sm text-gray-600 space-y-1">{aiAnalysis.insights.map((insight: string, i: number) => (<li key={i} className="flex items-start gap-2"><span className="text-purple-500 mt-0.5">•</span>{insight}</li>))}</ul></div><div><h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Recommendations</h4><ul className="text-sm text-gray-600 space-y-1">{aiAnalysis.recommendations.map((rec: string, i: number) => (<li key={i} className="flex items-start gap-2"><span className="text-green-500 mt-0.5">→</span>{rec}</li>))}</ul></div><div className="grid grid-cols-2 gap-2"><div className="p-2 bg-green-50 rounded-lg"><p className="text-xs text-green-600 font-medium">{aiAnalysis.opportunities.length} Opportunities</p></div><div className="p-2 bg-red-50 rounded-lg"><p className="text-xs text-red-600 font-medium">{aiAnalysis.riskFactors.length} Risks</p></div></div></div>) : (<div className="p-4 text-center"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" /><p className="text-sm text-gray-500 mt-2">Analyzing...</p></div>)}</div>)}</div></>)}
      </div>

      {showCreateModal && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-white rounded-xl p-6 w-[400px]"><h2 className="text-xl font-bold text-gray-900 mb-4">Create Whiteboard</h2><div className="space-y-4"><div><label className="text-sm text-gray-500 mb-1 block">Name</label><input type="text" value={newWbName} onChange={(e) => setNewWbName(e.target.value)} placeholder="My Strategic Plan" className="w-full px-4 py-2 border border-gray-200 rounded-lg" autoFocus /></div><div><label className="text-sm text-gray-500 mb-1 block">Template</label><select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-lg"><option value="blank">Blank Canvas</option>{BUSINESS_TEMPLATES.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}</select></div></div><div className="flex gap-2 mt-6"><button onClick={() => setShowCreateModal(false)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Cancel</button><button onClick={createWhiteboard} disabled={!newWbName.trim()} className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">Create</button></div></div></div>)}
    </div>
  );
}
