import { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Plus, Trash2, Move, Mic, MicOff, Volume2, Play, Pause, RefreshCw,
  Sparkles, Users, Clock, Target, Zap, MessageSquare, CheckCircle,
  ZoomIn, ZoomOut, Download, Upload, Link2, ArrowRight, ChevronRight, X
} from 'lucide-react';
import type { Whiteboard, WhiteboardNode, NodeStatus } from './types/whiteboard';
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

interface MeetingSession {
  id: string;
  name: string;
  clientName: string;
  startTime: string;
  status: 'active' | 'paused' | 'completed';
  contextLog: ContextEntry[];
  opportunities: string[];
  actionItems: string[];
  decisions: string[];
}

interface ContextEntry {
  id: string;
  timestamp: string;
  type: 'topic' | 'opportunity' | 'risk' | 'decision' | 'action' | 'note';
  content: string;
  speaker: 'client' | 'scott';
  relatedNodeId?: string;
  tags: string[];
}

const CLIENT_ONBOARDING_PHASES = [
  { name: 'Introduction', duration: 15, prompts: ['Business background', 'Current challenges', 'Goals'] },
  { name: 'Discovery', duration: 20, prompts: ['Current workflows', 'Tools & systems', 'Time sinks'] },
  { name: 'Opportunities', duration: 20, prompts: ['Top opportunities', 'Estimated values', 'Risks'] },
  { name: 'Next Steps', duration: 15, prompts: ['First priorities', 'Available resources', 'Follow-up schedule'] }
];

export default function MeetingCompanion() {
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
  const [showMeetingPanel, setShowMeetingPanel] = useState(true);
  const [newWbName, setNewWbName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('blank');
  
  // Meeting Session State
  const [activeSession, setActiveSession] = useState<MeetingSession | null>(null);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [liveContext, setLiveContext] = useState<ContextEntry[]>([]);
  const [quickCapture, setQuickCapture] = useState('');
  const [clientName, setClientName] = useState('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const sessionTimerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    setWhiteboards(whiteboardEngine.getAllWhiteboards());
  }, []);

  useEffect(() => {
    if (activeSession?.status === 'active') {
      sessionTimerRef.current = setInterval(() => setElapsedTime(t => t + 1), 1000);
    }
    return () => { if (sessionTimerRef.current) clearInterval(sessionTimerRef.current); };
  }, [activeSession?.status]);

  useEffect(() => {
    if (isRecording) {
      const updateLevel = () => {
        if (mediaRecorderRef.current?.stream) {
          const audioContext = new AudioContext();
          const source = audioContext.createMediaStreamSource(mediaRecorderRef.current.stream);
          const analyser = audioContext.createAnalyser();
          source.connect(analyser);
          analyser.fftSize = 256;
          const data = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(data);
          setAudioLevel(data.reduce((a, b) => a + b) / data.length / 255);
          audioContext.close();
        }
        animationRef.current = requestAnimationFrame(updateLevel);
      };
      animationRef.current = requestAnimationFrame(updateLevel);
    } else {
      setAudioLevel(0);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    }
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [isRecording]);

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const createWhiteboard = () => {
    if (!newWbName.trim()) return;
    const wb = whiteboardEngine.createWhiteboard(newWbName, undefined, selectedTemplate);
    setWhiteboards(whiteboardEngine.getAllWhiteboards());
    setCurrentWb(wb);
    setShowCreateModal(false);
    setNewWbName('');
  };

  const startMeetingSession = () => {
    if (!currentWb || !clientName) return;
    const session: MeetingSession = {
      id: `session-${Date.now()}`,
      name: 'Discovery Session',
      clientName,
      startTime: new Date().toISOString(),
      status: 'active',
      contextLog: [],
      opportunities: [],
      actionItems: [],
      decisions: []
    };
    setActiveSession(session);
    setElapsedTime(0);
    setLiveContext([]);
    setCurrentPhase(0);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = e => e.data.size > 0 && chunksRef.current.push(e.data);
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (e) { console.error('Failed to start recording:', e); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      setIsRecording(false);
    }
  };

  const addContextEntry = (type: ContextEntry['type'], content: string, speaker: ContextEntry['speaker'] = 'client') => {
    if (!currentWb || !activeSession) return;
    const entry: ContextEntry = { id: `ctx-${Date.now()}`, timestamp: new Date().toISOString(), type, content, speaker, tags: [] };
    const updated = { ...activeSession, contextLog: [...activeSession.contextLog, entry] };
    
    if (type === 'opportunity') updated.opportunities.push(content);
    if (type === 'action') updated.actionItems.push(content);
    if (type === 'decision') updated.decisions.push(content);
    
    setActiveSession(updated);
    setLiveContext(prev => [entry, ...prev]);
    
    // Auto-create node
    if ((type === 'opportunity' || type === 'action' || type === 'risk') && currentWb) {
      const status = type === 'opportunity' ? 'opportunity' : type === 'risk' ? 'risk' : 'task';
      const node = whiteboardEngine.addNode(currentWb.id, {
        type: 'card', status,
        x: 100 + Math.random() * 400, y: 100 + Math.random() * 300,
        width: 240, height: 120,
        title: content.slice(0, 35),
        content,
        tags: [],
        color: STATUS_COLORS[status].bg,
        textColor: STATUS_COLORS[status].text
      });
      entry.relatedNodeId = node.id;
      setCurrentWb(whiteboardEngine.getWhiteboard(currentWb.id)!);
    }
  };

  const handleQuickCapture = () => {
    if (!quickCapture.trim()) return;
    addContextEntry('note', quickCapture, 'client');
    setQuickCapture('');
  };

  const generateOpportunityMap = () => {
    if (!currentWb) return;
    const opps = currentWb.nodes.filter(n => n.status === 'opportunity');
    const tasks = currentWb.nodes.filter(n => n.status === 'task');
    
    opps.forEach(opp => {
      tasks.forEach(task => {
        const exists = currentWb.connectors.some(c => c.fromNodeId === opp.id && c.toNodeId === task.id);
        if (!exists && (opp.title.toLowerCase().split(' ').some(w => w.length > 3 && task.title.toLowerCase().includes(w)))) {
          whiteboardEngine.addConnector(currentWb.id, { fromNodeId: opp.id, toNodeId: task.id, style: 'dashed', color: '#10b981' });
        }
      });
    });
    setCurrentWb(whiteboardEngine.getWhiteboard(currentWb.id)!);
  };

  const loadBoard = (wb: Whiteboard) => {
    setCurrentWb(wb);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const exportBoard = () => {
    if (!currentWb) return;
    const data = whiteboardEngine.exportWhiteboard(currentWb.id);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentWb.name.replace(/\s+/g, '-')}-meeting.json`;
    a.click();
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Target className="w-8 h-8 text-purple-500" />
              Meeting Companion
            </h1>
            {currentWb && <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">{currentWb.name}</span>}
            
            {activeSession && (
              <div className="flex items-center gap-3 ml-4 pl-4 border-l border-gray-200">
                <div className={`w-2 h-2 rounded-full ${activeSession.status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                <span className="text-sm font-medium text-gray-700">{activeSession.clientName}</span>
                <span className="text-sm text-gray-500 font-mono">{formatTime(elapsedTime)}</span>
                <span className={`px-2 py-0.5 rounded text-xs ${activeSession.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{activeSession.status.toUpperCase()}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {!currentWb && <button onClick={() => setShowCreateModal(true)} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"><Plus className="w-4 h-4" /> New Meeting</button>}
            
            {currentWb && (
              <>
                <button onClick={() => setShowMeetingPanel(!showMeetingPanel)} className={`px-3 py-2 rounded-lg flex items-center gap-2 ${showMeetingPanel ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                  <Users className="w-4 h-4" /> Meeting Panel
                </button>
                
                <button onClick={isRecording ? stopRecording : startRecording} className={`px-4 py-2 rounded-lg flex items-center gap-2 ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'}`}>
                  {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  {isRecording ? 'Stop' : 'Record'}
                </button>
                
                {isRecording && (
                  <div className="flex items-center gap-1 px-3 py-2 bg-gray-100 rounded-lg">
                    <Volume2 className="w-4 h-4 text-gray-500" />
                    <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-green-400 to-red-500 transition-all" style={{ width: `${audioLevel * 100}%` }} />
                    </div>
                  </div>
                )}
                
                <div className="w-px h-6 bg-gray-200 mx-2" />
                
                <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="p-2 hover:bg-gray-100 rounded-lg"><ZoomIn className="w-5 h-5" /></button>
                <span className="text-sm text-gray-500">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="p-2 hover:bg-gray-100 rounded-lg"><ZoomOut className="w-5 h-5" /></button>
                
                <div className="w-px h-6 bg-gray-200 mx-2" />
                
                <button onClick={generateOpportunityMap} className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2">
                  <Link2 className="w-4 h-4" /> Map Connections
                </button>
                
                <button onClick={exportBoard} className="p-2 hover:bg-gray-100 rounded-lg"><Download className="w-5 h-5" /></button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Sidebar */}
        {!currentWb && (
          <div className="w-80 bg-white border-r border-gray-200 p-4">
            <h2 className="font-medium text-gray-900 mb-4">Active Meetings</h2>
            <div className="space-y-2 mb-6">
              {whiteboards.map(wb => (
                <button key={wb.id} onClick={() => loadBoard(wb)} className="w-full p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg">
                  <p className="font-medium text-gray-900">{wb.name}</p>
                  <p className="text-sm text-gray-500">{wb.nodes.length} items • {new Date(wb.updatedAt).toLocaleDateString()}</p>
                </button>
              ))}
            </div>
            
            <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100">
              <h3 className="font-medium text-purple-900 mb-3 flex items-center gap-2"><Zap className="w-5 h-5" /> New Client Onboarding</h3>
              <input type="text" placeholder="Client name" value={clientName} onChange={e => setClientName(e.target.value)} className="w-full px-3 py-2 border border-purple-200 rounded-lg text-sm mb-2" />
              <button onClick={startMeetingSession} disabled={!clientName} className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm">Start Discovery Session</button>
            </div>
          </div>
        )}

        {/* Meeting Panel */}
        {currentWb && showMeetingPanel && (
          <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900 flex items-center gap-2"><Users className="w-5 h-5" /> Meeting Context</h3>
                {activeSession && <button onClick={() => setActiveSession(s => s ? { ...s, status: s.status === 'active' ? 'paused' : 'active' } : null)} className="p-1 hover:bg-gray-100 rounded">{activeSession.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}</button>}
              </div>
              
              {activeSession && (
                <div className="space-y-2">
                  {CLIENT_ONBOARDING_PHASES.map((phase, idx) => (
                    <div key={phase.name} className={`p-2 rounded-lg ${idx === currentPhase ? 'bg-purple-100 border border-purple-300' : idx < currentPhase ? 'bg-green-50' : 'bg-gray-50'}`}>
                      <div className="flex items-center gap-2">
                        {idx < currentPhase ? <CheckCircle className="w-4 h-4 text-green-500" /> : idx === currentPhase ? <Clock className="w-4 h-4 text-purple-500" /> : <div className="w-4 h-4 rounded-full border-2 border-gray-300" />}
                        <span className="text-sm font-medium">{phase.name}</span>
                        <span className="text-xs text-gray-500 ml-auto">{phase.duration}m</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center gap-2 mb-2"><Zap className="w-4 h-4 text-yellow-500" /><span className="text-sm font-medium">Quick Capture</span></div>
              <textarea value={quickCapture} onChange={e => setQuickCapture(e.target.value)} placeholder="Type key points..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-2" rows={2} />
              <div className="flex gap-2">
                <button onClick={() => addContextEntry('opportunity', quickCapture, 'client')} className="flex-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Opportunity</button>
                <button onClick={() => addContextEntry('risk', quickCapture, 'client')} className="flex-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs">Risk</button>
                <button onClick={() => addContextEntry('action', quickCapture, 'scott')} className="flex-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">Action</button>
                <button onClick={handleQuickCapture} className="px-3 py-1 bg-purple-600 text-white rounded text-xs">Add</button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Live Context ({liveContext.length})</h4>
              <div className="space-y-2">
                {liveContext.map(entry => (
                  <div key={entry.id} className={`p-2 rounded-lg text-sm ${
                    entry.type === 'opportunity' ? 'bg-green-50 border border-green-200' :
                    entry.type === 'risk' ? 'bg-red-50 border border-red-200' :
                    entry.type === 'action' ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 border border-gray-200'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${entry.type === 'opportunity' ? 'bg-green-200 text-green-800' : entry.type === 'risk' ? 'bg-red-200 text-red-800' : entry.type === 'action' ? 'bg-blue-200 text-blue-800' : 'bg-gray-200 text-gray-600'}`}>{entry.type.toUpperCase()}</span>
                      <span className="text-xs text-gray-500">{entry.speaker === 'client' ? 'Client' : 'Scott'}</span>
                      <span className="text-xs text-gray-400 ml-auto">{new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-gray-700">{entry.content}</p>
                  </div>
                ))}
              </div>
            </div>
            
            {activeSession && (
              <div className="p-4 bg-gray-50 border-t border-gray-200">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-green-100 rounded-lg"><p className="text-lg font-bold text-green-700">{activeSession.opportunities.length}</p><p className="text-xs text-green-600">Opportunities</p></div>
                  <div className="p-2 bg-blue-100 rounded-lg"><p className="text-lg font-bold text-blue-700">{activeSession.actionItems.length}</p><p className="text-xs text-blue-600">Actions</p></div>
                  <div className="p-2 bg-purple-100 rounded-lg"><p className="text-lg font-bold text-purple-700">{activeSession.decisions.length}</p><p className="text-xs text-purple-600">Decisions</p></div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Canvas */}
        {currentWb && (
          <>
            <div className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto">
              <h3 className="font-medium text-gray-900 mb-3">Add Node</h3>
              <div className="space-y-2 mb-6">
                {STATUS_OPTIONS.map(status => (
                  <button key={status.id} onClick={() => { if (!currentWb) return; const node = whiteboardEngine.addNode(currentWb.id, { type: 'card', status, x: 200 + Math.random() * 200, y: 200 + Math.random() * 200, width: 220, height: 140, title: `New ${status.label}`, content: '', tags: [], color: STATUS_COLORS[status].bg, textColor: STATUS_COLORS[status].text }); setCurrentWb(whiteboardEngine.getWhiteboard(currentWb.id)!); setSelectedNode(node); }} className="w-full p-2 text-left flex items-center gap-2 hover:bg-gray-100 rounded-lg">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }} /><span className="text-sm">{status.label}</span>
                  </button>
                ))}
              </div>
              
              <div className="p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-100">
                <h4 className="font-medium text-green-900 mb-2 flex items-center gap-2"><ArrowRight className="w-4 h-4" /> Auto-Link</h4>
                <p className="text-xs text-green-700 mb-2">Connect opportunities → tasks automatically</p>
                <button onClick={generateOpportunityMap} className="w-full px-3 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600">Generate Map</button>
              </div>
            </div>

            <div ref={canvasRef} className="flex-1 relative overflow-hidden" style={{ backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)', backgroundSize: `${20 * zoom}px ${20 * zoom}px` }} onClick={() => setSelectedNode(null)}>
              <div className="absolute inset-0" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}>
                {currentWb.connectors.map(conn => { const from = currentWb.nodes.find(n => n.id === conn.fromNodeId); const to = currentWb.nodes.find(n => n.id === conn.toNodeId); if (!from || !to) return null; return (<svg key={conn.id} className="absolute pointer-events-none" style={{ overflow: 'visible' }}><line x1={from.x + from.width/2} y1={from.y + from.height/2} x2={to.x + to.width/2} y2={to.y + to.height/2} stroke={conn.color} strokeWidth={2} strokeDasharray={conn.style === 'dashed' ? '8,4' : 'none'} /></svg>); })}
                {currentWb.nodes.map(node => { const colors = STATUS_COLORS[node.status]; const isSel = selectedNode?.id === node.id; return (
                  <div key={node.id} className="absolute cursor-move" style={{ left: node.x, top: node.y, width: node.width, height: node.height, backgroundColor: node.color, color: node.textColor, border: `2px solid ${isSel ? '#8b5cf6' : colors.border}`, borderRadius: '8px', boxShadow: isSel ? '0 0 0 4px rgba(139, 92, 246, 0.2)' : '0 2px 8px rgba(0,0,0,0.1)', padding: '12px' }} onMouseDown={(e) => { e.stopPropagation(); const rect = (e.target as HTMLElement).getBoundingClientRect(); setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top }); setIsDragging(true); setSelectedNode(node); }}>
                    <div className="flex items-start justify-between mb-2"><p className="font-medium">{node.title}</p>{node.priority && <span className={`text-xs px-1.5 py-0.5 rounded ${node.priority === 'high' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>{node.priority}</span>}</div>
                    {node.content && <p className="text-sm opacity-80">{node.content}</p>}
                    {isSel && <div className="absolute -top-3 -right-3 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center"><div className="w-2 h-2 bg-white rounded-full" /></div>}
                  </div>
                );})}
              </div>
            </div>
          </>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-[400px]">
            <h2 className="text-xl font-bold text-gray-900 mb-4">New Meeting</h2>
            <div className="space-y-4">
              <div><label className="text-sm text-gray-500 mb-1 block">Meeting Name</label><input type="text" value={newWbName} onChange={e => setNewWbName(e.target.value)} placeholder="Client Discovery" className="w-full px-4 py-2 border border-gray-200 rounded-lg" autoFocus /></div>
              <div><label className="text-sm text-gray-500 mb-1 block">Template</label><select value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-lg">{BUSINESS_TEMPLATES.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}</select></div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowCreateModal(false)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Cancel</button>
              <button onClick={createWhiteboard} disabled={!newWbName.trim()} className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
