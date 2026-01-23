import { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Plus, Trash2, Move, Type, StickyNote, Kanban, Brain, BarChart3, 
  GripVertical, ZoomIn, ZoomOut, Download, Upload, Sparkles,
  Lightbulb, CheckCircle, AlertTriangle,
  TrendingUp, Flag, Mic, MicOff, Volume2, VolumeX,
  Play, Pause, RefreshCw
} from 'lucide-react';
import type { Whiteboard, WhiteboardNode, Connector, NodeType, NodeStatus } from './types/whiteboard';
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

export default function StrategicCanvas() {
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
  
  // Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [useWebSpeech, setUseWebSpeech] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    setWhiteboards(whiteboardEngine.getAllWhiteboards());
  }, []);

  // Audio level monitoring
  useEffect(() => {
    if (isRecording) {
      const updateLevel = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
          const audioContext = new AudioContext();
          const source = audioContext.createMediaStreamSource(mediaRecorderRef.current.stream);
          const analyser = audioContext.createAnalyser();
          source.connect(analyser);
          analyser.fftSize = 256;
          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(average / 255);
          audioContext.close();
        }
        animationRef.current = requestAnimationFrame(updateLevel);
      };
      animationRef.current = requestAnimationFrame(updateLevel);
    } else {
      setAudioLevel(0);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isRecording]);

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
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Voice Recording Functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      // Fallback to Web Speech API
      startWebSpeechRecording();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      transcribeAudio();
    }
  };

  const startWebSpeechRecording = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      
      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }
        setTranscription(finalTranscript || interimTranscript);
      };

      recognition.start();
      setUseWebSpeech(true);
      setIsRecording(true);
      
      // Store recognition for stopping
      (window as any).speechRecognition = recognition;
    } else {
      alert('Speech recognition not supported in this browser');
    }
  };

  const stopWebSpeechRecording = () => {
    if ((window as any).speechRecognition) {
      (window as any).speechRecognition.stop();
      setUseWebSpeech(false);
      setIsRecording(false);
      if (transcription) {
        processVoiceInput(transcription);
      }
    }
  };

  const transcribeAudio = async () => {
    setIsTranscribing(true);
    const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
    
    try {
      // Using OpenAI Whisper API (you'd need an API key)
      // For demo, we'll simulate transcription
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulated transcription based on what user might say
      const simulatedTranscription = generateSimulatedTranscription();
      setTranscription(simulatedTranscription);
      
      // Process the voice input
      await processVoiceInput(simulatedTranscription);
    } catch (error) {
      console.error('Transcription failed:', error);
    } finally {
      setIsTranscribing(false);
    }
  };

  const generateSimulatedTranscription = (): string => {
    // This simulates what AI transcription would return
    // In production, this would be real Whisper output
    return `I want to build an AI consulting business targeting small businesses with $5-10 million in revenue. 
Key opportunities include automating their workflows with AI agents, building custom software solutions, and providing strategic consulting.
Main risks are competition from established players like ServiceTitan and pricing pressure from budget-conscious clients.
For revenue, we'll offer retainers at $5-15K per month, implementation projects at $25-50K, and training workshops at $2-5K.
Our first milestone should be signing 10 clients to reach $75K monthly recurring revenue.`;
  };

  const processVoiceInput = async (text: string) => {
    if (!currentWb) return;

    // AI-powered analysis to extract structured data from voice
    const lines = text.split(/[.!?\n]+/).filter(line => line.trim().length > 5);
    
    for (const line of lines) {
      const lower = line.toLowerCase();
      let status: NodeStatus = 'note';
      
      if (lower.includes('opportunity') || lower.includes('targeting') || lower.includes('offer')) {
        status = 'opportunity';
      } else if (lower.includes('risk') || lower.includes('competition') || lower.includes('pressure') || lower.includes('concern')) {
        status = 'risk';
      } else if (lower.includes('want') || lower.includes('build') || lower.includes('create')) {
        status = 'idea';
      } else if (lower.includes('milestone') || lower.includes('first') || lower.includes('reach')) {
        status = 'milestone';
      } else if (lower.includes('retainer') || lower.includes('project') || lower.includes('revenue')) {
        status = 'task';
      }

      // Extract priority
      let priority: 'high' | 'medium' | 'low' = 'medium';
      if (lower.includes('first') || lower.includes('key') || lower.includes('main')) {
        priority = 'high';
      } else if (lower.includes('secondary') || lower.includes('later')) {
        priority = 'low';
      }

      // Extract value if mentioned
      let estimatedValue: number | undefined;
      const dollarMatch = line.match(/\$[\d,]+K?/);
      if (dollarMatch) {
        const valueStr = dollarMatch[0].replace(/[$,K]/g, '');
        estimatedValue = parseFloat(valueStr) * 1000;
      }

      const newNode = whiteboardEngine.addNode(currentWb.id, {
        type: 'card',
        status,
        x: 100 + Math.random() * 400,
        y: 100 + Math.random() * 300,
        width: 240,
        height: 120 + Math.random() * 80,
        title: extractTitle(line),
        content: line.trim(),
        tags: extractTags(lower),
        color: STATUS_COLORS[status].bg,
        textColor: STATUS_COLORS[status].text,
        priority,
        estimatedValue,
        aiSuggestions: [`Voice-sourced from: "${line.slice(0, 50)}..."`]
      });
    }

    setCurrentWb(whiteboardEngine.getWhiteboard(currentWb.id)!);
  };

  const extractTitle = (line: string): string => {
    // Extract first meaningful phrase as title
    const words = line.split(' ');
    if (words.length > 3) {
      return words.slice(0, 5).join(' ') + '...';
    }
    return line.slice(0, 30);
  };

  const extractTags = (text: string): string[] => {
    const tags: string[] = [];
    const tagMap: Record<string, string[]> = {
      'consulting': ['consulting', 'advisory'],
      'ai': ['ai', 'automation', 'agent'],
      'revenue': ['revenue', 'pricing', 'retainer'],
      'clients': ['client', 'customer', 'business'],
      'software': ['software', 'solution', 'platform'],
      'training': ['training', 'workshop', 'education']
    };

    for (const [tag, keywords] of Object.entries(tagMap)) {
      if (keywords.some(kw => text.includes(kw))) {
        tags.push(tag);
      }
    }
    return tags;
  };

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
      {/* Header */}
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
            
            {currentWb && (
              <>
                {/* Voice Recording Button */}
                <button
                  onClick={isRecording ? (useWebSpeech ? stopWebSpeechRecording : stopRecording) : startRecording}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                    isRecording 
                      ? 'bg-red-500 text-white animate-pulse' 
                      : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90'
                  }`}
                >
                  {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  {isRecording ? 'Stop Recording' : 'Voice Input'}
                </button>

                {/* Audio Level Indicator */}
                {isRecording && (
                  <div className="flex items-center gap-1 px-3 py-2 bg-gray-100 rounded-lg">
                    <Volume2 className="w-4 h-4 text-gray-500" />
                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-green-400 to-red-500 transition-all"
                        style={{ width: `${audioLevel * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {isTranscribing && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Transcribing...
                  </div>
                )}

                <div className="w-px h-6 bg-gray-200 mx-2" />

                <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="p-2 hover:bg-gray-100 rounded-lg"><ZoomIn className="w-5 h-5" /></button>
                <span className="text-sm text-gray-500">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="p-2 hover:bg-gray-100 rounded-lg"><ZoomOut className="w-5 h-5" /></button>
                
                <div className="w-px h-6 bg-gray-200 mx-2" />
                
                <button onClick={runAIAnalysis} className="px-3 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:opacity-90 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> AI Analyze
                </button>
                
                <button onClick={exportBoard} className="p-2 hover:bg-gray-100 rounded-lg" title="Export">
                  <Download className="w-5 h-5" />
                </button>
                
                <button onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.accept = '.json'; input.onchange = (e: any) => { const file = e.target.files[0]; const reader = new FileReader(); reader.onload = (ev: any) => { const wb = whiteboardEngine.importWhiteboard(ev.target?.result); setWhiteboards(whiteboardEngine.getAllWhiteboards()); setCurrentWb(wb); }; reader.readAsText(file); }; input.click(); }} className="p-2 hover:bg-gray-100 rounded-lg" title="Import">
                  <Upload className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Transcription Preview */}
      {transcription && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-medium text-purple-700">Voice Input:</span>
              <span className="text-sm text-gray-600 flex-1 truncate">{transcription}</span>
            </div>
            <button onClick={() => setTranscription('')} className="p-1 hover:bg-purple-100 rounded">
              <X className="w-4 h-4 text-purple-500" />
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 flex">
        {/* Sidebar */}
        {!currentWb && (
          <div className="w-80 bg-white border-r border-gray-200 p-4">
            <h2 className="font-medium text-gray-900 mb-4">Your Whiteboards</h2>
            <div className="space-y-2">
              {whiteboards.map(wb => (
                <button key={wb.id} onClick={() => loadBoard(wb)} className="w-full p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg">
                  <p className="font-medium text-gray-900">{wb.name}</p>
                  <p className="text-sm text-gray-500">{wb.nodes.length} items • {new Date(wb.updatedAt).toLocaleDateString()}</p>
                </button>
              ))}
            </div>

            <h3 className="font-medium text-gray-900 mt-6 mb-3">Templates</h3>
            <div className="space-y-2">
              {BUSINESS_TEMPLATES.map(template => (
                <button key={template.id} onClick={() => { setSelectedTemplate(template.id); setShowCreateModal(true); }} className="w-full p-3 text-left bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 rounded-lg border border-purple-100">
                  <p className="font-medium text-gray-900">{template.name}</p>
                  <p className="text-xs text-gray-500">{template.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Canvas */}
        {currentWb && (
          <>
            {/* Node Toolbar */}
            <div className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto">
              <h3 className="font-medium text-gray-900 mb-3">Add Node</h3>
              <div className="space-y-2 mb-6">
                {STATUS_OPTIONS.map(status => (
                  <button key={status.id} onClick={() => addNode(status.id)} className="w-full p-2 text-left flex items-center gap-2 hover:bg-gray-100 rounded-lg">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }} />
                    <span className="text-sm">{status.label}</span>
                  </button>
                ))}
              </div>

              {/* Voice Quick Actions */}
              <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-100 mb-6">
                <h4 className="font-medium text-purple-900 mb-2 flex items-center gap-2">
                  <Mic className="w-4 h-4" /> Voice Tips
                </h4>
                <ul className="text-xs text-purple-700 space-y-1">
                  <li>• "Our main opportunity is..."</li>
                  <li>• "Key risk is..."</li>
                  <li>• "I want to build..."</li>
                  <li>• "First milestone: reach $75K"</li>
                  <li>• "Revenue will be $10K/month"</li>
                </ul>
              </div>

              {selectedNode && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="font-medium text-gray-900 mb-3">Edit Node</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Title</label>
                      <input type="text" value={selectedNode.title} onChange={(e) => updateNode({ title: e.target.value })} className="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Content</label>
                      <textarea value={selectedNode.content} onChange={(e) => updateNode({ content: e.target.value })} rows={3} className="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Priority</label>
                      <select value={selectedNode.priority || 'medium'} onChange={(e) => updateNode({ priority: e.target.value as any })} className="w-full px-2 py-1 border border-gray-200 rounded text-sm">
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                    {selectedNode.aiSuggestions && selectedNode.aiSuggestions.length > 0 && (
                      <div className="p-2 bg-purple-50 rounded-lg">
                        <p className="text-xs text-purple-600 font-medium mb-1">AI Suggestions</p>
                        <ul className="text-xs text-purple-700">
                          {selectedNode.aiSuggestions.map((s, i) => <li key={i}>• {s}</li>)}
                        </ul>
                      </div>
                    )}
                    <button onClick={deleteNode} className="w-full p-2 text-red-600 hover:bg-red-50 rounded-lg flex items-center justify-center gap-2">
                      <Trash2 className="w-4 h-4" /> Delete Node
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Main Canvas Area */}
            <div ref={canvasRef} className="flex-1 relative overflow-hidden" style={{ backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)', backgroundSize: `${20 * zoom}px ${20 * zoom}px', backgroundPosition: `${pan.x}px ${pan.y}px` }} onClick={handleCanvasClick}>
              <div className="absolute inset-0" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}>
                {/* Connectors */}
                {currentWb.connectors.map(connector => {
                  const fromNode = currentWb.nodes.find(n => n.id === connector.fromNodeId);
                  const toNode = currentWb.nodes.find(n => n.id === connector.toNodeId);
                  if (!fromNode || !toNode) return null;
                  const x1 = fromNode.x + fromNode.width / 2;
                  const y1 = fromNode.y + fromNode.height / 2;
                  const x2 = toNode.x + toNode.width / 2;
                  const y2 = toNode.y + toNode.height / 2;
                  return (<svg key={connector.id} className="absolute pointer-events-none" style={{ overflow: 'visible' }}><line x1={x1} y1={y1} x2={x2} y2={y2} stroke={connector.color} strokeWidth={2} /></svg>);
                })}

                {/* Nodes */}
                {currentWb.nodes.map(node => {
                  const colors = STATUS_COLORS[node.status];
                  const isSelected = selectedNode?.id === node.id;
                  return (
                    <div key={node.id} className="whiteboard-node absolute cursor-move" style={{ left: node.x, top: node.y, width: node.width, height: node.height, backgroundColor: node.color, color: node.textColor, border: `2px solid ${isSelected ? '#8b5cf6' : colors.border}`, borderRadius: '8px', boxShadow: isSelected ? '0 0 0 4px rgba(139, 92, 246, 0.2)' : '0 2px 8px rgba(0,0,0,0.1)', padding: '12px', display: 'flex', flexDirection: 'column' }} onMouseDown={(e) => handleNodeMouseDown(e, node)}>
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-medium">{node.title}</p>
                      {node.priority && (<span className={`text-xs px-1.5 py-0.5 rounded ${node.priority === 'high' ? 'bg-red-500 text-white' : node.priority === 'medium' ? 'bg-yellow-500 text-white' : 'bg-green-500 text-white'}`}>{node.priority}</span>)}
                    </div>
                    {node.content && <p className="text-sm opacity-80">{node.content}</p>}
                    {node.estimatedValue && (<div className="mt-2 text-xs font-medium text-green-600">${(node.estimatedValue / 1000).toFixed(0)}K</div>)}
                    {node.aiSuggestions && node.aiSuggestions.length > 0 && (<div className="mt-2 flex items-center gap-1 text-xs text-purple-500"><Sparkles className="w-3 h-3" /> AI-generated</div>)}
                    {isSelected && <div className="absolute -top-3 -right-3 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center"><GripVertical className="w-4 h-4 text-white" /></div>}
                  </div>
                );
                })}
              </div>

              {/* AI Analysis Panel */}
              {showAI && aiAnalysis && (
                <div className="absolute top-4 right-4 w-80 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden max-h-[80vh] overflow-y-auto">
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4 text-white">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium flex items-center gap-2"><Sparkles className="w-5 h-5" /> AI Insights</h3>
                      <button onClick={() => setShowAI(false)} className="p-1 hover:bg-white/20 rounded"><X className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <div className="p-4 space-y-4">
                    <div><h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-yellow-500" /> Key Insights</h4><ul className="text-sm text-gray-600 space-y-1">{aiAnalysis.insights.map((insight: string, i: number) => (<li key={i} className="flex items-start gap-2"><span className="text-purple-500 mt-0.5">•</span>{insight}</li>))}</ul></div>
                    <div><h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Recommendations</h4><ul className="text-sm text-gray-600 space-y-1">{aiAnalysis.recommendations.map((rec: string, i: number) => (<li key={i} className="flex items-start gap-2"><span className="text-green-500 mt-0.5">→</span>{rec}</li>))}</ul></div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 bg-green-50 rounded-lg"><p className="text-xs text-green-600 font-medium">{aiAnalysis.opportunities.length} Opportunities</p></div>
                      <div className="p-2 bg-red-50 rounded-lg"><p className="text-xs text-red-600 font-medium">{aiAnalysis.riskFactors.length} Risks</p></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-[400px]">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Create Whiteboard</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500 mb-1 block">Name</label>
                <input type="text" value={newWbName} onChange={(e) => setNewWbName(e.target.value)} placeholder="My Strategic Plan" className="w-full px-4 py-2 border border-gray-200 rounded-lg" autoFocus />
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-1 block">Template</label>
                <select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-lg">
                  <option value="blank">Blank Canvas</option>
                  {BUSINESS_TEMPLATES.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}
                </select>
              </div>
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
