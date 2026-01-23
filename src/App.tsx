import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Sparkles, Target, Clock, Search, Rocket, Download, ChevronRight, ArrowRight, CheckCircle, Users, Crosshair, Maximize2 } from 'lucide-react';

interface ContextEntry {
  id: string;
  timestamp: string;
  type: 'opportunity' | 'risk' | 'action' | 'milestone';
  content: string;
  speaker: 'host';
  enrichedContent?: string;
}

interface VisualNode {
  id: string;
  type: 'opportunity' | 'risk' | 'action' | 'milestone' | 'competitor' | 'swot';
  x: number;
  y: number;
  content: string;
  enrichedContent: string;
  phase: string;
  expanded?: boolean;
  competitors?: any[];
  swotData?: any;
}

interface MeetingPhase {
  id: string;
  name: string;
  subtitle: string;
  icon: string;
  prompts: string[];
}

const MEETING_PHASES = [
  { id: 'intro', name: 'Introduction', subtitle: 'Understanding your business', icon: '👋', prompts: ['Tell me about your business', 'What does success look like?'] },
  { id: 'discovery', name: 'Discovery', subtitle: 'Current state & challenges', icon: '🔍', prompts: ['Walk me through your workflow', 'Where are bottlenecks?'] },
  { id: 'opportunities', name: 'Opportunities', subtitle: 'Growth possibilities', icon: '💡', prompts: ['Top 3 opportunities?', 'What holds you back?'] },
  { id: 'risk', name: 'Risk Analysis', subtitle: 'Competitors & market risks', icon: '🛡️', prompts: ['Who are your main competitors?', 'What market risks exist?'] },
  { id: 'strategy', name: 'Strategy', subtitle: 'Building action plan', icon: '🎯', prompts: ['First priority?', 'Available resources?'] },
  { id: 'next-steps', name: 'Next Steps', subtitle: 'Committing to action', icon: '🚀', prompts: ['This week commitment?', 'Follow up date?'] }
];

const FloatingParticles = () => {
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i, x: Math.random() * 100, y: Math.random() * 100,
    size: Math.random() * 8 + 2, duration: Math.random() * 30 + 20
  }));
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div key={p.id} className="absolute rounded-full blur-sm"
          style={{ left: p.x + '%', top: p.y + '%', width: p.size, height: p.size, background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)' }}
          animate={{ y: [0, -200, 0], opacity: [0, 0.5, 0] }}
          transition={{ duration: p.duration, repeat: Infinity, ease: "linear" }}
        />
      ))}
    </div>
  );
};

const OpportunityIcon = () => (
  <svg viewBox="0 0 60 60" className="w-full h-full"><defs><linearGradient id="og" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#10b981"/><stop offset="100%" stopColor="#34d399"/></linearGradient></defs>
    <motion.circle cx="30" cy="30" r="25" fill="url(#og)" initial={{ scale: 0 }} animate={{ scale: [0, 1.1, 1] }} transition={{ duration: 0.5 }}/>
    <motion.path d="M20 30 L27 37 L40 22" stroke="white" strokeWidth="3" fill="none" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.3, delay: 0.3 }}/>
  </svg>
);

const CompetitorIcon = () => (
  <svg viewBox="0 0 60 60" className="w-full h-full"><defs><linearGradient id="cg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#f59e0b"/><stop offset="100%" stopColor="#fbbf24"/></linearGradient></defs>
    <motion.rect x="8" y="8" width="44" height="44" rx="8" fill="url(#cg)" initial={{ scale: 0 }} animate={{ scale: [0, 1.1, 1] }} transition={{ duration: 0.4 }}/>
    <motion.path d="M18 22 L42 22 M18 30 L35 30 M18 38 L28 38" stroke="white" strokeWidth="3" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} />
  </svg>
);

const SWOTIcon = () => (
  <svg viewBox="0 0 60 60" className="w-full h-full"><defs><linearGradient id="sg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#8b5cf6"/><stop offset="100%" stopColor="#a78bfa"/></linearGradient></defs>
    <motion.rect x="5" y="5" width="50" height="50" rx="4" fill="url(#sg)" initial={{ scale: 0 }} animate={{ scale: [0, 1.1, 1] }} transition={{ duration: 0.5 }}/>
    <motion.path d="M30 15 L30 45 M15 30 L45 30" stroke="white" strokeWidth="3" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} />
  </svg>
);

const ExpandableNode = ({ node, index, onToggle }: { node: VisualNode; index: number; onToggle: () => void }) => {
  const colors: Record<string, string> = {
    opportunity: 'from-green-500/90 to-emerald-600/90',
    risk: 'from-red-500/90 to-rose-600/90',
    competitor: 'from-amber-500/90 to-orange-600/90',
    swot: 'from-purple-500/90 to-violet-600/90',
    action: 'from-blue-500/90 to-indigo-600/90',
    milestone: 'from-pink-500/90 to-rose-600/90',
  };
  const icons: Record<string, JSX.Element> = {
    opportunity: <OpportunityIcon />,
    competitor: <CompetitorIcon />,
    swot: <SWOTIcon />
  };
  const gradient = colors[node.type] || colors.opportunity;
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0, y: 100 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.8, delay: index * 0.1, type: "spring", stiffness: 150, damping: 15 }}
      whileHover={{ scale: 1.03, y: -5 }}
      onClick={onToggle}
      className={`absolute cursor-pointer rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-2xl backdrop-blur-xl`}
      style={{ left: node.x, top: node.y, width: node.expanded ? 420 : 300, minHeight: node.expanded ? 300 : 140 }}
    >
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 flex-shrink-0">{icons[node.type]}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs uppercase tracking-wider opacity-80">{node.type}</span>
              <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">{node.phase}</span>
            </div>
            <h3 className="font-semibold text-lg leading-tight mb-2">{node.content}</h3>
            <p className="text-sm opacity-90">{node.enrichedContent}</p>
          </div>
        </div>
        
        {node.expanded && node.competitors && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 pt-4 border-t border-white/20">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2"><Users className="w-4 h-4" /> Competitor Details</h4>
            {node.competitors.map((comp: any, i) => (
              <div key={i} className="p-2 bg-white/10 rounded-lg mb-2">
                <p className="font-medium text-sm">{comp.name}</p>
                <div className="flex gap-2 mt-1">
                  <span className="text-xs px-2 py-0.5 bg-green-500/30 rounded">{comp.strengths[0]}</span>
                  <span className="text-xs px-2 py-0.5 bg-red-500/30 rounded">{comp.weaknesses[0]}</span>
                </div>
              </div>
            ))}
          </motion.div>
        )}
        
        {node.expanded && node.swotData && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 pt-4 border-t border-white/20">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2"><Crosshair className="w-4 h-4" /> SWOT Breakdown</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(node.swotData).map(([key, items]) => (
                <div key={key} className="p-2 bg-white/10 rounded-lg"><p className="capitalize mb-1 opacity-70">{key}</p>{(items as string[]).slice(0, 2).map((item, i) => <p key={i} className="truncate">{item}</p>)}</div>
              ))}
            </div>
          </motion.div>
        )}
        
        <div className="flex items-center gap-2 mt-4">
          <motion.button onClick={(e) => { e.stopPropagation(); onToggle(); }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex-1 py-2 bg-white/20 rounded-lg text-sm">
            {node.expanded ? 'Collapse' : 'Expand'}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

const ProgressFlow = ({ phases, currentPhase, completedPhases, onPhaseClick }: { phases: MeetingPhase[], currentPhase: number, completedPhases: number[], onPhaseClick: (i: number) => void }) => (
  <div className="flex items-center justify-between px-4 py-3 bg-white/10 backdrop-blur-xl rounded-2xl overflow-x-auto">
    {phases.map((phase, index) => {
      const isCompleted = completedPhases.includes(index);
      const isCurrent = index === currentPhase;
      return (
        <div key={phase.id} className="flex items-center flex-shrink-0">
          <motion.button onClick={() => onPhaseClick(index)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            className={`relative flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
              isCurrent ? 'bg-gradient-to-r from-primary-500 to-purple-500 text-white shadow-lg' :
              isCompleted ? 'bg-green-500/20 text-green-300' : 'bg-white/5 text-gray-400'
            }`}
          >
            <span className="text-lg">{phase.icon}</span>
            <span className="hidden md:block font-medium text-sm">{phase.name}</span>
            {isCompleted && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center"><CheckCircle className="w-2.5 h-2.5 text-white" /></motion.div>}
          </motion.button>
          {index < phases.length - 1 && <motion.div className={`w-6 sm:w-10 h-0.5 mx-1 sm:mx-2 ${isCompleted ? 'bg-green-500' : 'bg-white/10'}`} />}
        </div>
      );
    })}
  </div>
);

const QuickCapture = ({ onCapture, recording }: { onCapture: (text: string, type: string) => void; recording: boolean }) => {
  const [text, setText] = useState('');
  const [selectedType, setSelectedType] = useState('opportunity');
  const types = [
    { id: 'opportunity', label: 'Opportunity', color: 'bg-green-500', icon: '💡' },
    { id: 'risk', label: 'Risk', color: 'bg-red-500', icon: '⚠️' },
    { id: 'action', label: 'Action', color: 'bg-blue-500', icon: '✅' },
    { id: 'milestone', label: 'Milestone', color: 'bg-purple-500', icon: '🎯' },
  ];
  const handleSubmit = () => { if (text.trim()) { onCapture(text, selectedType); setText(''); } };
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white/10 backdrop-blur-xl rounded-2xl p-6">
      {recording && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4 p-3 bg-red-500/20 rounded-xl flex items-center gap-2"><motion.div className="w-3 h-3 bg-red-500 rounded-full" animate={{ scale: [1, 1.3, 1] }} /><span className="text-red-300 font-medium">Recording...</span></motion.div>}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">{types.map((type) => (<motion.button key={type.id} onClick={() => setSelectedType(type.id)} whileTap={{ scale: 0.95 }} className={`flex-shrink-0 px-4 py-2 rounded-xl flex flex-col items-center gap-1 ${selectedType === type.id ? `${type.color} text-white shadow-lg` : 'bg-white/5 text-gray-400'}`}><span>{type.icon}</span><span className="text-xs font-medium">{type.label}</span></motion.button>))}</div>
      <div className="flex gap-3">
        <input type="text" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} placeholder="Capture insights..." className="flex-1 px-4 py-3 bg-white/10 rounded-xl border-0 focus:ring-2 focus:ring-primary-500 outline-none placeholder-gray-400" />
        <motion.button onClick={handleSubmit} whileTap={{ scale: 0.95 }} className="px-6 py-3 bg-gradient-to-r from-primary-500 to-purple-500 rounded-xl font-medium shadow-lg flex items-center gap-2"><Sparkles className="w-4 h-4" />Capture</motion.button>
      </div>
    </motion.div>
  );
};

export default function MeetingCompanion() {
  const [currentPhase, setCurrentPhase] = useState(0);
  const [completedPhases, setCompletedPhases] = useState<number[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [visualNodes, setVisualNodes] = useState<VisualNode[]>([]);
  const [clientName, setClientName] = useState('');
  const [sessionStart, setSessionStart] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (sessionStart) {
      const interval = setInterval(() => setElapsedTime(Math.floor((Date.now() - sessionStart.getTime()) / 1000)), 1000);
      return () => clearInterval(interval);
    }
  }, [sessionStart]);

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
    } else { setAudioLevel(0); if (animationRef.current) cancelAnimationFrame(animationRef.current); }
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [isRecording]);

  const formatTime = (s: number) => Math.floor(s / 60) + ':' + (s % 60).toString().padStart(2, '0');

  const startSession = () => { if (!clientName.trim()) return; setSessionStart(new Date()); setCurrentPhase(0); setCompletedPhases([]); setVisualNodes([]); setShowOnboarding(false); };
  const startRecording = async () => { try { const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); mediaRecorderRef.current = new MediaRecorder(stream); mediaRecorderRef.current.start(); setIsRecording(true); } catch (e) {} };
  const stopRecording = () => { if (mediaRecorderRef.current && isRecording) { mediaRecorderRef.current.stop(); mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop()); setIsRecording(false); } };

  const runCompetitorAnalysis = async () => {
    setIsAnalyzing(true);
    await new Promise(r => setTimeout(r, 2500));
    
    const competitors = [
      { name: 'ServiceTitan', strengths: ['Enterprise features', 'Large customer base'], weaknesses: ['Expensive', 'Complex onboarding'], marketShare: '35%', threat: 'high' },
      { name: 'Jobber', strengths: ['SMB focused', 'Easy to use'], weaknesses: ['Limited features', 'Basic reporting'], marketShare: '20%', threat: 'medium' },
      { name: 'Housecall Pro', strengths: ['Field service focus'], weaknesses: ['Dated UI'], marketShare: '15%', threat: 'medium' },
      { name: 'Method:CRM', strengths: ['CRM focused'], weaknesses: ['Steep learning'], marketShare: '10%', threat: 'low' },
    ];
    
    const swot = {
      strengths: ['AI-powered automation', 'Modern UX', 'Competitive pricing'],
      weaknesses: ['New to market', 'Limited recognition'],
      opportunities: ['SMB expansion', 'Integration ecosystem'],
      threats: ['Established players', 'Price wars']
    };
    
    const swotNode = { id: 'swot-' + Date.now(), type: 'swot' as const, x: 400, y: 150, content: 'SWOT Analysis', enrichedContent: 'Strategic assessment', phase: 'Risk Analysis', swotData: swot };
    setVisualNodes(prev => [...prev, swotNode]);
    
    competitors.forEach((comp, i) => {
      setTimeout(() => {
        const node = { id: 'comp-' + Date.now() + '-' + i, type: 'competitor' as const, x: 150 + (i % 2) * 320, y: 350 + Math.floor(i / 2) * 180, content: comp.name, enrichedContent: comp.marketShare + ' - ' + comp.threat + ' threat', phase: 'Risk Analysis', competitors: [comp] };
        setVisualNodes(prev => [...prev, node]);
      }, i * 300);
    });
    
    setIsAnalyzing(false);
  };

  const toggleNodeExpand = (nodeId: string) => {
    setVisualNodes(prev => prev.map(n => n.id === nodeId ? { ...n, expanded: !n.expanded } : n));
  };

  const captureInsight = (content: string, type: string) => {
    const node = { id: 'node-' + Date.now(), type: type as VisualNode['type'], x: 100 + Math.random() * 500, y: 100 + Math.random() * 200, content, enrichedContent: '', phase: MEETING_PHASES[currentPhase].name };
    setVisualNodes(prev => [...prev, node]);
  };

  const nextPhase = () => { if (!completedPhases.includes(currentPhase)) setCompletedPhases(prev => [...prev, currentPhase]); if (currentPhase < MEETING_PHASES.length - 1) setCurrentPhase(p => p + 1); };
  const prevPhase = () => { if (currentPhase > 0) setCurrentPhase(p => p - 1); };

  if (showOnboarding || !sessionStart) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900 flex items-center justify-center p-6">
        <FloatingParticles />
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white/10 backdrop-blur-2xl rounded-3xl p-8 max-w-lg w-full">
          <div className="text-center mb-8">
            <motion.div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-primary-400 to-purple-500 rounded-2xl flex items-center justify-center" animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 4, repeat: Infinity }}>
              <Rocket className="w-10 h-10 text-white" />
            </motion.div>
            <h1 className="text-3xl font-bold mb-2">Meeting Companion</h1>
            <p className="text-gray-400">AI-powered strategic planning with competitor analysis</p>
          </div>
          <div className="space-y-4">
            <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Enter client name..." className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-center placeholder-gray-400" />
            <motion.button onClick={startSession} disabled={!clientName.trim()} whileTap={{ scale: 0.98 }} className="w-full py-4 bg-gradient-to-r from-primary-500 to-purple-500 rounded-xl font-semibold shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"><Sparkles className="w-5 h-5" />Start Strategic Session</motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900 overflow-hidden">
      <FloatingParticles />
      <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="relative z-20 px-6 py-4">
        <div className="max-w-full mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <motion.div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-purple-500 rounded-xl flex items-center justify-center" whileHover={{ scale: 1.1, rotate: 5 }}><Target className="w-6 h-6 text-white" /></motion.div>
              <div>
                <h1 className="text-xl font-bold">{clientName} - Strategic Session</h1>
                <div className="flex items-center gap-2 text-sm text-gray-400"><Clock className="w-4 h-4" /><span>{formatTime(elapsedTime)}</span><span>-</span><span>{MEETING_PHASES[currentPhase].name}</span></div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <motion.button onClick={isRecording ? stopRecording : startRecording} whileTap={{ scale: 0.95 }} className={`px-4 py-2 rounded-xl flex items-center gap-2 ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gradient-to-r from-primary-500 to-purple-500'}`}>{isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}{isRecording ? 'Stop' : 'Record'}</motion.button>
              {isRecording && <div className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-xl"><div className="w-6 h-6 bg-gradient-to-r from-green-400 to-red-500 rounded-full" style={{ transform: 'scale(' + (0.5 + audioLevel * 0.8) + ')' }} /></div>}
              <motion.button whileTap={{ scale: 0.95 }} className="p-2 bg-white/10 rounded-xl"><Download className="w-5 h-5" /></motion.button>
            </div>
          </div>
          <ProgressFlow phases={MEETING_PHASES} currentPhase={currentPhase} completedPhases={completedPhases} onPhaseClick={setCurrentPhase} />
        </div>
      </motion.header>

      <div className="relative z-10 flex-1 p-6">
        <div className="max-w-full mx-auto h-full">
          <div className="grid lg:grid-cols-4 gap-6 h-full">
            <div className="lg:col-span-1 space-y-6">
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-gradient-to-br from-primary-500/20 to-purple-500/20 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                <div className="flex items-center gap-3 mb-4"><span className="text-3xl">{MEETING_PHASES[currentPhase].icon}</span><div><h2 className="text-xl font-bold">{MEETING_PHASES[currentPhase].name}</h2><p className="text-sm text-gray-400">{MEETING_PHASES[currentPhase].subtitle}</p></div></div>
                <div className="space-y-3">{MEETING_PHASES[currentPhase].prompts.map((prompt, i) => (<motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.1 }} className="flex items-start gap-2 text-sm"><ChevronRight className="w-4 h-4 text-primary-400 mt-0.5 flex-shrink-0" /><span className="text-gray-300">{prompt}</span></motion.div>))}</div>
                
                {MEETING_PHASES[currentPhase].id === 'risk' && (
                  <motion.button onClick={runCompetitorAnalysis} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} disabled={isAnalyzing} className="w-full mt-4 py-4 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 rounded-xl font-semibold shadow-lg flex items-center justify-center gap-2">
                    {isAnalyzing ? <motion.div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Search className="w-5 h-5" />}
                    {isAnalyzing ? 'Analyzing Market...' : 'AI Competitor Analysis'}
                  </motion.button>
                )}
                
                <div className="flex gap-2 mt-6">
                  <motion.button onClick={prevPhase} disabled={currentPhase === 0} whileTap={{ scale: 0.95 }} className="flex-1 py-2 bg-white/10 rounded-xl disabled:opacity-30">Previous</motion.button>
                  <motion.button onClick={nextPhase} whileTap={{ scale: 0.95 }} className="flex-1 py-2 bg-gradient-to-r from-primary-500 to-purple-500 rounded-xl flex items-center justify-center gap-2">Next<ArrowRight className="w-4 h-4" /></motion.button>
                </div>
              </motion.div>
              
              <QuickCapture onCapture={captureInsight} recording={isRecording} />
            </div>
            
            <div className="lg:col-span-3 relative">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-purple-500/5 backdrop-blur-3xl rounded-3xl border border-white/10 overflow-hidden">
                <AnimatePresence>{visualNodes.map((node, i) => (<ExpandableNode key={node.id} node={node} index={i} onToggle={() => toggleNodeExpand(node.id)} />))}</AnimatePresence>
                {visualNodes.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-gray-400">
                      <Search className="w-16 h-16 mx-auto mb-4 opacity-30" />
                      <p className="text-lg">Run competitor analysis or capture insights</p>
                    </motion.div>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
