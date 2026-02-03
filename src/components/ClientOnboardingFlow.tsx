/**
 * Client Onboarding Flow Component
 * 
 * Enhanced first-run experience for new users with:
 * - Interactive welcome wizard
 * - Use-case selection to customize dashboard
 * - Feature tour highlights
 * - Sample board preview with pre-filled content
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ArrowRight,
  ArrowLeft,
  Check,
  Sparkles,
  Target,
  Users,
  BarChart3,
  Calendar,
  MessageSquare,
  Brain,
  Mic,
  Search,
  Layout,
  FileText,
  Zap,
  Rocket,
  Building2,
  TrendingUp,
  ListTodo,
  Lightbulb,
  Play,
  Star,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface ClientOnboardingFlowProps {
  isOpen: boolean;
  onComplete: (preferences: OnboardingPreferences) => void;
  onSkip: () => void;
}

interface OnboardingPreferences {
  useCase: string;
  teamSize: string;
  features: string[];
  industry?: string;
}

type StepId = 'welcome' | 'use-case' | 'team-size' | 'features' | 'tour' | 'sample' | 'ready';

interface Step {
  id: StepId;
  title: string;
  subtitle?: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const STEPS: Step[] = [
  { id: 'welcome', title: 'Welcome' },
  { id: 'use-case', title: 'Your Goal' },
  { id: 'team-size', title: 'Team' },
  { id: 'features', title: 'Features' },
  { id: 'tour', title: 'Tour' },
  { id: 'sample', title: 'Sample' },
  { id: 'ready', title: 'Ready!' },
];

const USE_CASES = [
  { id: 'strategy', label: 'Strategic Planning', icon: Target, description: 'OKRs, roadmaps, and long-term planning', color: 'from-blue-500 to-cyan-500' },
  { id: 'meetings', label: 'Meeting Management', icon: Mic, description: 'Capture, summarize, and track action items', color: 'from-purple-500 to-pink-500' },
  { id: 'consulting', label: 'Client Consulting', icon: Building2, description: 'Presentations, scorecards, and client deliverables', color: 'from-amber-500 to-orange-500' },
  { id: 'brainstorm', label: 'Brainstorming', icon: Lightbulb, description: 'Ideation, mind mapping, and collaboration', color: 'from-green-500 to-emerald-500' },
  { id: 'project', label: 'Project Tracking', icon: ListTodo, description: 'Tasks, milestones, and team alignment', color: 'from-red-500 to-rose-500' },
  { id: 'analysis', label: 'Data Analysis', icon: BarChart3, description: 'Research, insights, and decision frameworks', color: 'from-indigo-500 to-violet-500' },
];

const TEAM_SIZES = [
  { id: 'solo', label: 'Just me', icon: '🧑', description: 'Personal productivity' },
  { id: 'small', label: '2-5 people', icon: '👥', description: 'Small team' },
  { id: 'medium', label: '6-20 people', icon: '🏢', description: 'Growing team' },
  { id: 'large', label: '20+ people', icon: '🏙️', description: 'Enterprise' },
];

const FEATURE_OPTIONS = [
  { id: 'meeting-capture', label: 'Meeting Capture', icon: Mic, description: 'Record and transcribe meetings' },
  { id: 'ask-anything', label: 'Ask Anything AI', icon: Brain, description: 'AI-powered insights from your data' },
  { id: 'templates', label: 'Templates Library', icon: Layout, description: 'Pre-built strategy frameworks' },
  { id: 'scorecards', label: 'Scorecards', icon: BarChart3, description: 'Track KPIs and metrics' },
  { id: 'collaboration', label: 'Real-time Collaboration', icon: Users, description: 'Work together live' },
  { id: 'integrations', label: 'Integrations', icon: Zap, description: 'Connect Slack, Notion, & more' },
  { id: 'documents', label: 'Document Portal', icon: FileText, description: 'Organize and share files' },
  { id: 'calendar', label: 'Calendar Sync', icon: Calendar, description: 'Manage meetings and deadlines' },
];

const TOUR_FEATURES = [
  {
    title: 'Meeting Capture & AI Summary',
    description: 'Record any meeting, get instant AI-generated summaries with action items, decisions, and key takeaways.',
    icon: Mic,
    color: 'from-purple-500 to-pink-500',
    preview: '🎙️ "Record" → AI generates summary → Action items extracted → Assigned to team',
  },
  {
    title: 'Ask Anything Panel',
    description: 'Query your entire workspace with natural language. Ask about decisions, find documents, or generate insights.',
    icon: Brain,
    color: 'from-blue-500 to-cyan-500',
    preview: '💬 "What decisions did we make about Q3 pricing?" → Instant AI answer with sources',
  },
  {
    title: 'Templates & Frameworks',
    description: 'Start with proven strategy templates — SWOT, OKRs, Business Model Canvas, and 30+ more.',
    icon: Layout,
    color: 'from-amber-500 to-orange-500',
    preview: '📋 Choose template → Customize → Collaborate → Present',
  },
  {
    title: 'Scorecards & KPIs',
    description: 'Track what matters with visual scorecards. Set targets, monitor progress, and share with stakeholders.',
    icon: TrendingUp,
    color: 'from-green-500 to-emerald-500',
    preview: '📊 Define metrics → Set targets → Auto-track → Visual dashboard',
  },
];

// ── Sub-components ───────────────────────────────────────────────────────────

const ProgressBar: React.FC<{ currentStep: number; totalSteps: number }> = ({ currentStep, totalSteps }) => (
  <div className="flex items-center gap-1.5">
    {Array.from({ length: totalSteps }).map((_, i) => (
      <div
        key={i}
        className={`h-1.5 rounded-full transition-all duration-300 ${
          i <= currentStep
            ? 'bg-blue-500 w-8'
            : 'bg-gray-200 dark:bg-gray-600 w-4'
        }`}
      />
    ))}
  </div>
);

const SampleBoardPreview: React.FC = () => (
  <div className="bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-800 dark:to-gray-700 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-1.5">
      <Star className="w-3.5 h-3.5 text-amber-500" />
      Sample Board: Q1 Strategy Planning
    </div>
    <div className="grid grid-cols-3 gap-2">
      {/* Sticky notes preview */}
      {[
        { color: 'bg-yellow-200 dark:bg-yellow-300', text: '🎯 Revenue target: $2M ARR', label: 'Goal' },
        { color: 'bg-blue-200 dark:bg-blue-300', text: '📊 Launch enterprise tier', label: 'Initiative' },
        { color: 'bg-green-200 dark:bg-green-300', text: '✅ Hire 3 engineers', label: 'Action' },
        { color: 'bg-pink-200 dark:bg-pink-300', text: '⚠️ Competitor launched V2', label: 'Risk' },
        { color: 'bg-purple-200 dark:bg-purple-300', text: '💡 Partner with agencies', label: 'Idea' },
        { color: 'bg-orange-200 dark:bg-orange-300', text: '📅 Board review: Feb 15', label: 'Deadline' },
      ].map((note, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.1 }}
          className={`${note.color} rounded-lg p-2.5 text-xs text-gray-800 shadow-sm`}
        >
          <div className="text-[10px] font-bold text-gray-600 mb-1">{note.label}</div>
          {note.text}
        </motion.div>
      ))}
    </div>
    <div className="mt-3 flex items-center gap-2">
      <div className="flex -space-x-2">
        {['bg-blue-400', 'bg-green-400', 'bg-purple-400'].map((c, i) => (
          <div key={i} className={`w-6 h-6 rounded-full ${c} border-2 border-white dark:border-gray-700 flex items-center justify-center text-[10px] text-white font-medium`}>
            {['SJ', 'AK', 'ML'][i]}
          </div>
        ))}
      </div>
      <span className="text-[10px] text-gray-500">3 collaborators • Last edited 2m ago</span>
    </div>
  </div>
);

// ── Main Component ───────────────────────────────────────────────────────────

export const ClientOnboardingFlow: React.FC<ClientOnboardingFlowProps> = ({ isOpen, onComplete, onSkip }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [selectedUseCase, setSelectedUseCase] = useState<string>('');
  const [selectedTeamSize, setSelectedTeamSize] = useState<string>('');
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [tourIndex, setTourIndex] = useState(0);

  const currentStep = STEPS[currentStepIndex];

  const handleNext = useCallback(() => {
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  }, [currentStepIndex]);

  const handlePrev = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  }, [currentStepIndex]);

  const handleFeatureToggle = useCallback((featureId: string) => {
    setSelectedFeatures((prev) =>
      prev.includes(featureId)
        ? prev.filter((f) => f !== featureId)
        : [...prev, featureId]
    );
  }, []);

  const handleComplete = useCallback(() => {
    onComplete({
      useCase: selectedUseCase,
      teamSize: selectedTeamSize,
      features: selectedFeatures,
    });
  }, [onComplete, selectedUseCase, selectedTeamSize, selectedFeatures]);

  const canProceed = useCallback(() => {
    switch (currentStep.id) {
      case 'use-case': return selectedUseCase !== '';
      case 'team-size': return selectedTeamSize !== '';
      default: return true;
    }
  }, [currentStep.id, selectedUseCase, selectedTeamSize]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 30 }}
          transition={{ type: 'spring', duration: 0.6 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
            <ProgressBar currentStep={currentStepIndex} totalSteps={STEPS.length} />
            <button
              onClick={onSkip}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              Skip tour
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {/* Welcome Step */}
                {currentStep.id === 'welcome' && (
                  <div className="text-center space-y-4">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', delay: 0.2 }}
                      className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg"
                    >
                      <Rocket className="w-10 h-10 text-white" />
                    </motion.div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Welcome to Strategic Canvas!
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                      Let&apos;s personalize your experience in 60 seconds. We&apos;ll set up your workspace 
                      based on how you plan to use it.
                    </p>
                    <div className="flex items-center justify-center gap-6 pt-4 text-sm text-gray-400">
                      <span className="flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-amber-500" /> AI-Powered</span>
                      <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-blue-500" /> Collaborative</span>
                      <span className="flex items-center gap-1.5"><Zap className="w-4 h-4 text-green-500" /> Fast Setup</span>
                    </div>
                  </div>
                )}

                {/* Use Case Step */}
                {currentStep.id === 'use-case' && (
                  <div className="space-y-4">
                    <div className="text-center mb-6">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        What will you use Strategic Canvas for?
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        We&apos;ll customize your dashboard and suggest relevant templates.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {USE_CASES.map((uc) => (
                        <button
                          key={uc.id}
                          onClick={() => setSelectedUseCase(uc.id)}
                          className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                            selectedUseCase === uc.id
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                          }`}
                        >
                          {selectedUseCase === uc.id && (
                            <div className="absolute top-2 right-2">
                              <Check className="w-4 h-4 text-blue-500" />
                            </div>
                          )}
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${uc.color} flex items-center justify-center mb-2`}>
                            <uc.icon className="w-4 h-4 text-white" />
                          </div>
                          <h3 className="font-semibold text-sm text-gray-900 dark:text-white">{uc.label}</h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{uc.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Team Size Step */}
                {currentStep.id === 'team-size' && (
                  <div className="space-y-4">
                    <div className="text-center mb-6">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        How big is your team?
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        We&apos;ll optimize collaboration features for your team size.
                      </p>
                    </div>
                    <div className="space-y-2">
                      {TEAM_SIZES.map((ts) => (
                        <button
                          key={ts.id}
                          onClick={() => setSelectedTeamSize(ts.id)}
                          className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                            selectedTeamSize === ts.id
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                          }`}
                        >
                          <span className="text-2xl">{ts.icon}</span>
                          <div className="flex-1">
                            <h3 className="font-semibold text-sm text-gray-900 dark:text-white">{ts.label}</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{ts.description}</p>
                          </div>
                          {selectedTeamSize === ts.id && (
                            <Check className="w-5 h-5 text-blue-500" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Feature Selection Step */}
                {currentStep.id === 'features' && (
                  <div className="space-y-4">
                    <div className="text-center mb-6">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        Which features interest you most?
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Select all that apply — you can always change these later.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {FEATURE_OPTIONS.map((f) => (
                        <button
                          key={f.id}
                          onClick={() => handleFeatureToggle(f.id)}
                          className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                            selectedFeatures.includes(f.id)
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            selectedFeatures.includes(f.id)
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                          }`}>
                            <f.icon className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="font-medium text-xs text-gray-900 dark:text-white">{f.label}</h3>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400">{f.description}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Feature Tour Step */}
                {currentStep.id === 'tour' && (
                  <div className="space-y-4">
                    <div className="text-center mb-4">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        Key Features Tour
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Here&apos;s what makes Strategic Canvas powerful.
                      </p>
                    </div>
                    <div className="space-y-3">
                      {TOUR_FEATURES.map((feature, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className={`p-4 rounded-xl border border-gray-200 dark:border-gray-600 ${
                            tourIndex === i ? 'ring-2 ring-blue-500 bg-blue-50/50 dark:bg-blue-900/10' : ''
                          }`}
                          onClick={() => setTourIndex(i)}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center flex-shrink-0`}>
                              <feature.icon className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-sm text-gray-900 dark:text-white">{feature.title}</h3>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{feature.description}</p>
                              {tourIndex === i && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  className="mt-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs text-gray-600 dark:text-gray-300 font-mono"
                                >
                                  {feature.preview}
                                </motion.div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sample Board Step */}
                {currentStep.id === 'sample' && (
                  <div className="space-y-4">
                    <div className="text-center mb-4">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        Your Sample Board
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        We&apos;ve created a sample board to help you see the value immediately.
                      </p>
                    </div>
                    <SampleBoardPreview />
                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
                      <div className="flex items-start gap-2">
                        <Lightbulb className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="text-sm font-medium text-amber-800 dark:text-amber-300">Pro Tip</h4>
                          <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                            This sample board shows a typical strategy session. Edit it, duplicate it, 
                            or delete it and start fresh — it&apos;s yours to explore!
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Ready Step */}
                {currentStep.id === 'ready' && (
                  <div className="text-center space-y-4">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', delay: 0.2 }}
                      className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-lg"
                    >
                      <Check className="w-10 h-10 text-white" />
                    </motion.div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      You&apos;re all set!
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                      Your workspace has been customized based on your preferences. 
                      Start creating and collaborating right away!
                    </p>
                    <div className="grid grid-cols-3 gap-3 pt-4 max-w-sm mx-auto">
                      {[
                        { label: 'Create Board', icon: Layout },
                        { label: 'Start Meeting', icon: Mic },
                        { label: 'Browse Templates', icon: FileText },
                      ].map((action, i) => (
                        <div
                          key={i}
                          className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700 text-center"
                        >
                          <action.icon className="w-5 h-5 mx-auto mb-1 text-blue-500" />
                          <span className="text-[10px] font-medium text-gray-600 dark:text-gray-300">{action.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer Navigation */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
            <button
              onClick={handlePrev}
              disabled={currentStepIndex === 0}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <span className="text-xs text-gray-400">
              {currentStepIndex + 1} of {STEPS.length}
            </span>

            {currentStep.id === 'ready' ? (
              <button
                onClick={handleComplete}
                className="flex items-center gap-1.5 px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-lg transition-all shadow-md hover:shadow-lg"
              >
                <Play className="w-4 h-4" />
                Get Started
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ClientOnboardingFlow;
