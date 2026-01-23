import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, MicOff, Sparkles, Target, Clock, Brain, 
  Rocket, Download, ChevronRight, X, ArrowRight, CheckCircle
} from 'lucide-react';

// Types
interface ContextEntry {
  id: string;
  timestamp: string;
  type: 'opportunity' | 'risk' | 'idea' | 'action' | 'milestone';
  content: string;
  speaker: 'client' | 'host';
  enrichedContent?: string;
}

interface VisualNode {
  id: string;
  type: 'opportunity' | 'risk' | 'action' | 'milestone';
  x: number;
  y: number;
  content: string;
  enrichedContent: string;
  phase: string;
}

interface MeetingPhase {
  id: string;
  name: string;
  subtitle: string;
  icon: string;
  duration: number;
  prompts: string[];
}

const MEETING_PHASES: MeetingPhase[] = [
  { id: 'intro', name: 'Introduction', subtitle: 'Understanding your business', icon: '👋', duration: 15, prompts: ['Tell me about your business', 'What does success look like?', 'What are you most proud of?'] },
  { id: 'discovery', name: 'Discovery', subtitle: 'Current state & challenges', icon: '🔍', duration: 20, prompts: ['Walk me through your workflow', 'Where are bottlenecks?', 'What tools do you use?'] },
  { id: 'opportunities', name: 'Opportunities', subtitle: 'Growth possibilities', icon: '💡', duration: 25, prompts: ['Top 3 opportunities?', 'Doubling revenue?', 'What holds you back?'] },
  { id: 'strategy', name: 'Strategy', subtitle: 'Building action plan', icon: '🎯', duration: 20, prompts: ['First priority?', 'Available resources?', 'Success metrics?'] },
  { id: 'next-steps', name: 'Next Steps', subtitle: 'Committing to action', icon: '🚀', duration: 10, prompts: ['This week commitment?', 'Follow up date?', 'Final thoughts?'] }
];

// Animated Background
const FloatingParticles = () => {
  const particles = Array.from({ length: 25 }, (_, i) => ({
    id: i, x: Math.random() * 100, y: Math.random() * 100,
    size: Math.random() * 6 + 2, duration: Math.random() * 30 + 20, delay: Math.random() * 5
  }));
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div key={p.id} className="absolute rounded-full bg-gradient-to-r from-primary-400/30 to-purple-500/30 blur-sm"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size }}
          animate={{ y: [0, -150, 0], opacity: [0, 0.6, 0] }}
          transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: "linear" }}
        />
      ))}
    </div>
  );
};

// Animated Icons
const OpportunityIcon = () => (
  <svg viewBox="0 0 60 60" className="w-full h-full"><defs><linearGradient id="og" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#10b981"/><stop offset="100%" stopColor="#34d399"/></linearGradient></defs>
    <motion.circle cx="30" cy="30" r="25" fill="url(#og)" initial={{ scale: 0 }} animate={{ scale: [0, 1.1, 1] }} transition={{ duration: 0.5 }}/>
    <motion.path d="M20 30 L27 37 L40 22" stroke="white" strokeWidth="3" fill="none" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.3, delay: 0.3 }}/>
  </svg>
);

const RiskIcon = () => (
  <svg viewBox="0 0 60 60" className="w-full h-full"><defs><linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#ef4444"/><stop offset="100%" stopColor="#f87171"/></linearGradient></defs>
    <motion.polygon points="30,5 55,50 5,50" fill="url(#rg)" initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ duration: 0.5, type: "spring" }}/>
    <motion.text x="30" y="42" textAnchor="middle" fill="white" fontSize="24" fontWeight="bold">!</motion.text>
  </svg>
);

const ActionIcon = () => (
  <svg viewBox="0 0 60 60" className="w-full h-full"><defs><linearGradient id="ag" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#3b82f6"/><stop offset="100%" stopColor="#60a5fa"/></linearGradient></defs>
    <motion.rect x="8" y="8" width="44" height="44" rx="8" fill="url(#ag)" initial={{ scale: 0 }} animate={{ scale: [0, 1.1, 1] }} transition={{ duration: 0.4 }}/>
    <motion.line x1="18" y1="22" x2="42" y2="22" stroke="white" strokeWidth="3" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}/>
    <motion.line x1="18" y1="30" x2="35" y2="30" stroke="white" strokeWidth="3" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.1 }}/>
    <motion.line x1="18" y1="38" x2="28" y2="38" stroke="white" strokeWidth="3" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.2 }}/>
  </svg>
);

const MilestoneIcon = () => (
  <svg viewBox="0 0 60 60" className="w-full h-full"><defs><linearGradient id="mg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#8b5cf6"/><stop offset="100%" stopColor="#a78bfa"/></linearGradient></defs>
    <motion.path d="M30 5 L50 15 L50 40 C50 50 30 55 30 55 C30 55 10 50 10 40 L10 15 Z" fill="url(#mg)" initial={{ scale: 0 }} animate={{ scale: [0, 1.1, 1] }} transition={{ duration: 0.5 }}/>
    <motion.rect x="22" y="25" width="16" height="20" fill="white" rx="2" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.3 }}/>
  </svg>
);

// Animated Node Card
const AnimatedNode = ({ node, index }: { node: VisualNode; index: number }) => {
  const colors: Record<string, string> = {
    opportunity: 'from-green-500/90 to-emerald-600/90',
    risk: 'from-red-500/90 to-red-600/90',
    action: 'from-blue-500/90 to-blue-600/90',
    milestone: 'from-purple-500/90 to-purple-600/90'
  };
  const icons: Record<string, JSX.Element> = { opportunity: <OpportunityIcon />, risk: <RiskIcon />, action: <ActionIcon />, milestone: <MilestoneIcon /> };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0, y: 100, rotate: -5 }}
      animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
      transition={{ duration: 0.8, delay: index * 0.15, type: "spring", stiffness: 150, damping: 15 }}
      whileHover={{ scale: 1.05, y: -8 }}
      className={`absolute cursor-pointer rounded-2xl p-5 bg-gradient-to-br ${colors[node.type]} text-white shadow-2xl backdrop-blur-xl overflow-hidden`}
      style={{ left: node.x, top: node.y, width: '300px' }}
    >
      <div className="absolute inset-0 opacity-20"><div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '15px 15px' }} /></div>
      <motion.div className="absolute inset-0 rounded-2xl" animate={{ boxShadow: ['inset 0 0 0 2px rgba(255,255,255,0.2)', 'inset 0 0 0 2px rgba(255,255,255,0.4)', 'inset 0 0 0 2px rgba(255,255,255,0.2)'] }} transition={{ duration: 2, repeat: Infinity }} />
      <div className="relative z-10 flex gap-4">
        <div className="w-14 h-14 flex-shrink-0">{icons[node.type]}</div>
        <div className="flex-1 min-w-0">
          <motion.div className="text-xs uppercase tracking-wider opacity-80 mb-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>{node.type}</motion.div>
          <h3 className="font-semibold text-lg leading-tight mb-2">{node.content}</h3>
          <p className="text-sm opacity-90">{node.enrichedContent}</p>
        </div>
      </div>
      <motion.div className="absolute -right-1 -bottom-1 w-6 h-6 bg-white/30 rounded-full" animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 2, repeat: Infinity }} />
    </motion.div>
  );
};

// Progress Flow
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
            <span className="hidden sm:block font-medium text-sm">{phase.name}</span>
            {isCompleted && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center"><CheckCircle className="w-2.5 h-2.5 text-white" /></motion.div>}
            {isCurrent && <motion.div className="absolute inset-0 rounded-xl border-2 border-white/30" animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity }} />}
          </motion.button>
          {index < phases.length - 1 && <motion.div className={`w-6 sm:w-10 h-0.5 mx-1 sm:mx-2 ${isCompleted ? 'bg-green-500' : 'bg-white/10'}`} />}
        </div>
      );
    })}
  </div>
);

// Quick Capture
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
      <AnimatePresence>{recording && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-4 p-3 bg-red-500/20 rounded-xl flex items-center gap-2"><motion.div className="w-3 h-3 bg-red-500 rounded-full" animate={{ scale: [1, 1.3, 1] }} /><span className="text-red-300 font-medium">Recording in progress...</span></motion.div>}</AnimatePresence>
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">{types.map((type) => (<motion.button key={type.id} onClick={() => setSelectedType(type.id)} whileTap={{ scale: 0.95 }} className={`flex-shrink-0 px-4 py-2 rounded-xl flex flex-col items-center gap-1 ${selectedType === type.id ? `${type.color} text-white shadow-lg` : 'bg-white/5 text-gray-400'}`}><span>{type.icon}</span><span className="text-xs font-medium">{type.label}</span></motion.button>))}</div>
      <div className="flex gap-3">
        <input type="text" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} placeholder="Capture insights..." className="flex-1 px-4 py-3 bg-white/10 rounded-xl border-0 focus:ring-2 focus:ring-primary-500 outline-none placeholder-gray-400" />
        <motion.button onClick={handleSubmit} whileTap={{ scale: 0.95 }} className="px-6 py-3 bg-gradient-to-r from-primary-500 to-purple-500 rounded-xl font-medium shadow-lg flex items-center gap-2"><Sparkles className="w-4 h-4" />Capture</motion.button>
      </div>
    </motion.div>
  );
};

// Live Context Stream
const LiveContextStream = ({ entries }: { entries: ContextEntry[] }) => (
  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-white/10 backdrop-blur-xl rounded-2xl overflow-hidden">
    <div className="p-4 border-b border-white/10 flex items-center gap-2"><Brain className="w-5 h-5 text-primary-400" /><h3 className="font-semibold">Live Insights</h3><motion.div className="ml-auto w-2 h-2 bg-green-500 rounded-full" animate={{ scale: [1, 1.5, 1] }} /></div>
    <div className="max-h-80 overflow-y-auto">
      <AnimatePresence mode="popLayout">
        {entries.map((entry) => (
          <motion.div key={entry.id} layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className={`p-4 border-b border-white/5 ${entry.type === 'opportunity' ? 'bg-green-500/10' : entry.type === 'risk' ? 'bg-red-500/10' : entry.type === 'action' ? 'bg-blue-500/10' : 'bg-white/5'}`}>
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${entry.type === 'opportunity' ? 'bg-green-500/20' : entry.type === 'risk' ? 'bg-red-500/20' : entry.type === 'action' ? 'bg-blue-500/20' : 'bg-white/10'}`}>{entry.type === 'opportunity' ? '💡' : entry.type === 'risk' ? '⚠️' : entry.type === 'action' ? '✅' : '🎯'}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1"><span className={`text-xs px-2 py-0.5 rounded-full ${entry.type === 'opportunity' ? 'bg-green-500/30 text-green-300' : entry.type === 'risk' ? 'bg-red-500/30 text-red-300' : 'bg-blue-500/30 text-blue-300'}`}>{entry.type.toUpperCase()}</span><span className="text-xs text-gray-400">{new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
                <p className="text-white">{entry.content}</p>
                {entry.enrichedContent && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-gray-400 mt-2 italic">✨ {entry.enrichedContent}</motion.p>}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      {entries.length === 0 && <div className="p-8 text-center text-gray-400"><Brain className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>Start capturing insights</p></div>}
    </div>
  </motion.div>
);

// Main Component
export default function MeetingCompanion() {
  const [currentPhase, setCurrentPhase] = useState(0);
  const [completedPhases, setCompletedPhases] = useState<number[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [contextEntries, setContextEntries] = useState<ContextEntry[]>([]);
  const [visualNodes, setVisualNodes] = useState<VisualNode[]>([]);
  const [clientName, setClientName] = useState('');
  const [sessionStart, setSessionStart] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(true);
  
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

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const startSession = () => { if (!clientName.trim()) return; setSessionStart(new Date()); setCurrentPhase(0); setCompletedPhases([]); setContextEntries([]); setVisualNodes([]); setShowOnboarding(false); };
  const startRecording = async () => { try { const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); mediaRecorderRef.current = new MediaRecorder(stream); mediaRecorderRef.current.start(); setIsRecording(true); } catch (e) { console.error('Failed:', e); } };
  const stopRecording = () => { if (mediaRecorderRef.current && isRecording) { mediaRecorderRef.current.stop(); mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop()); setIsRecording(false); } };

  const enrichments: Record<string, string[]> = {
    opportunity: ['Strategic priority for Q1.', 'Aligns with automation goals.', 'Could significantly impact revenue.'],
    risk: ['Mitigation recommended.', 'Early detection minimizes impact.', 'Proactive monitoring required.'],
    action: ['Supports implementation.', 'First sprint completion.', 'Assignee to be determined.'],
    milestone: ['Marks key progress.', 'Unlocks capabilities.', 'On track for Q2.']
  };

  const enrichContent = (type: string, content: string) => { const opts = enrichments[type] || []; return opts[Math.floor(Math.random() * opts.length)] || ''; };

  const captureInsight = (content: string, type: string) => {
    const entry: ContextEntry = { id: `ctx-${Date.now()}`, timestamp: new Date().toISOString(), type: type as ContextEntry['type'], content, speaker: 'host', enrichedContent: enrichContent(type, content) };
    setContextEntries(prev => [entry, ...prev]);
    
    const node: VisualNode = { id: `node-${Date.now()}`, type: type as VisualNode['type'], x: 100 + Math.random() * 500, y: 100 + Math.random() * 200, content, enrichedContent: entry.enrichedContent || '', phase: MEETING_PHASES[currentPhase].name };
    setVisualNodes(prev => [...prev, node]);
    
    if (type === 'opportunity') {
      setTimeout(() => { setVisualNodes(prev => [...prev, { ...node, id: `${node.id}-a`, type: 'action', x: node.x + 80, y: node.y + 60, content: `Implement: ${content.slice(0, 40)}...`, enrichedContent: enrichments.action[0] }]); }, 600);
      setTimeout(() => { setVisualNodes(prev => [...prev, { ...node, id: `${node.id}-b`, type: 'milestone', x: node.x - 40, y: node.y + 120, content: `Complete: ${content.slice(0, 35)} by Q2`, enrichedContent: enrichments.milestone[0] }]); }, 900);
    }
  };

  const nextPhase = () => { if (!completedPhases.includes(currentPhase)) setCompletedPhases(prev => [...prev, currentPhase]); if (currentPhase < MEETING_PHASES.length - 1) setCurrentPhase(p => p + 1); };
  const prevPhase = () => { if (currentPhase > 0) setCurrentPhase(p => p - 1); };

  const stats = { opportunities: contextEntries.filter(e => e.type === 'opportunity').length, risks: contextEntries.filter(e => e.type === 'risk').length, actions: contextEntries.filter(e => e.type === 'action').length, milestones: contextEntries.filter(e => e.type === 'milestone').length };

  // Onboarding Screen
  if (showOnboarding || !sessionStart) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900 flex items-center justify-center p-6">
        <FloatingParticles />
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white/10 backdrop-blur-2xl rounded-3xl p-8 max-w-lg w-full relative z-10">
          <div className="text-center mb-8">
            <motion.div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-primary-400 to-purple-500 rounded-2xl flex items-center justify-center" animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 4, repeat: Infinity }}>
              <Rocket className="w-10 h-10 text-white" />
            </motion.div>
            <h1 className="text-3xl font-bold mb-2">Meeting Companion</h1>
            <p className="text-gray-400">AI-powered strategic planning sessions</p>
          </div>
          <div className="space-y-4">
            <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Enter client name..." className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-center placeholder-gray-400" />
            <motion.button onClick={startSession} disabled={!clientName.trim()} whileTap={{ scale: 0.98 }} className="w-full py-4 bg-gradient-to-r from-primary-500 to-purple-500 rounded-xl font-semibold shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"><Sparkles className="w-5 h-5" />Start Strategic Session</motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Main Session View
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
                <div className="flex items-center gap-2 text-sm text-gray-400"><Clock className="w-4 h-4" /><span>{formatTime(elapsedTime)}</span><span>•</span><span>{MEETING_PHASES[currentPhase].name}</span></div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <motion.button onClick={isRecording ? stopRecording : startRecording} whileTap={{ scale: 0.95 }} className={`px-4 py-2 rounded-xl flex items-center gap-2 ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gradient-to-r from-primary-500 to-purple-500'}`}>{isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}{isRecording ? 'Stop' : 'Record'}</motion.button>
              {isRecording && <div className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-xl"><div className="w-6 h-6 bg-gradient-to-r from-green-400 to-red-500 rounded-full" style={{ transform: `scale(${0.5 + audioLevel * 0.8})` }} /></div>}
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
                <div className="space-y-3">{MEETING_PHASES[currentPhase].prompts.map((prompt, i) => (<motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} className="flex items-start gap-2 text-sm"><ChevronRight className="w-4 h-4 text-primary-400 mt-0.5 flex-shrink-0" /><span className="text-gray-300">{prompt}</span></motion.div>))}</div>
                <div className="flex gap-2 mt-6">
                  <motion.button onClick={prevPhase} disabled={currentPhase === 0} whileTap={{ scale: 0.95 }} className="flex-1 py-2 bg-white/10 rounded-xl disabled:opacity-30">Previous</motion.button>
                  <motion.button onClick={nextPhase} whileTap={{ scale: 0.95 }} className="flex-1 py-2 bg-gradient-to-r from-primary-500 to-purple-500 rounded-xl flex items-center justify-center gap-2">Next<ArrowRight className="w-4 h-4" /></motion.button>
                </div>
              </motion.div>
              <QuickCapture onCapture={captureInsight} recording={isRecording} />
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Opportunities', value: stats.opportunities, icon: '💡' },
                  { label: 'Risks', value: stats.risks, icon: '⚠️' },
                  { label: 'Actions', value: stats.actions, icon: '✅' },
                  { label: 'Milestones', value: stats.milestones, icon: '🎯' },
                ].map((stat) => (<motion.div key={stat.label} whileHover={{ scale: 1.05 }} className="p-3 bg-white/5 rounded-xl"><div className="flex items-center gap-2 mb-1"><span className="text-lg">{stat.icon}</span><span className="text-xs text-gray-400">{stat.label}</span></div><p className="text-2xl font-bold">{stat.value}</p></motion.div>))}
              </motion.div>
            </div>
            
            <div className="lg:col-span-2 relative">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-purple-500/5 backdrop-blur-3xl rounded-3xl border border-white/10 overflow-hidden">
                <AnimatePresence>{visualNodes.map((node, i) => (<AnimatedNode key={node.id} node={node} index={i} />))}</AnimatePresence>
                {visualNodes.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center text-gray-400">
                      <Brain className="w-16 h-16 mx-auto mb-4 opacity-30" />
                      <p className="text-lg">Start capturing insights to build your strategy map</p>
                      <p className="text-sm mt-2">Use the quick capture panel or speak during the meeting</p>
                    </motion.div>
                  </div>
                )}
              </motion.div>
            </div>
            
            <div className="lg:col-span-1">
              <LiveContextStream entries={contextEntries} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
