/**
 * Content Exporter — Turn canvas strategy items into stakeholder updates
 * 
 * Features:
 * - Export as stakeholder email (formatted HTML)
 * - Board deck slide summary (markdown)
 * - Newsletter/blog post draft
 * - Template selection (executive summary, team update, board report)
 * - Copy to clipboard or download
 */

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Download,
  Copy,
  Check,
  Mail,
  FileText,
  Presentation,
  Newspaper,
  ChevronRight,
  Sparkles,
  Target,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  Users,
  Zap,
  Edit3,
  Eye,
} from 'lucide-react';
import type { Board, VisualNode } from '../types/board';

// ============================================
// TYPES
// ============================================

export interface ContentExporterProps {
  isOpen: boolean;
  onClose: () => void;
  board: Board;
}

type ExportFormat = 'email' | 'slides' | 'newsletter' | 'custom';
type TemplateType = 'executive_summary' | 'team_update' | 'board_report' | 'investor_update';
type ViewMode = 'configure' | 'preview';

interface ExportConfig {
  format: ExportFormat;
  template: TemplateType;
  includeMetrics: boolean;
  includeDecisions: boolean;
  includeActionItems: boolean;
  includeRisks: boolean;
  includeTimeline: boolean;
  tone: 'formal' | 'casual' | 'concise';
}

interface ExtractedContent {
  title: string;
  date: string;
  decisions: string[];
  actionItems: string[];
  risks: string[];
  opportunities: string[];
  keyPoints: string[];
  metrics: { label: string; value: string }[];
  totalItems: number;
  completedItems: number;
}

// ============================================
// CONTENT EXTRACTION
// ============================================

function extractBoardContent(board: Board): ExtractedContent {
  const nodes = board.visualNodes || [];
  const decisions: string[] = [];
  const actionItems: string[] = [];
  const risks: string[] = [];
  const opportunities: string[] = [];
  const keyPoints: string[] = [];
  let completedItems = 0;

  for (const node of nodes) {
    const content = (node.content || '').trim();
    if (!content) continue;

    const contentLower = content.toLowerCase();
    const isCompleted = contentLower.includes('✅') || contentLower.includes('[done]') || contentLower.includes('[completed]');

    if (isCompleted) completedItems++;

    if (node.type === 'risk' || contentLower.includes('risk:') || contentLower.includes('⚠️')) {
      risks.push(content.replace(/^(risk:|⚠️)\s*/i, ''));
    } else if (node.type === 'opportunity' || contentLower.includes('opportunity:') || contentLower.includes('💡')) {
      opportunities.push(content.replace(/^(opportunity:|💡)\s*/i, ''));
    } else if (node.type === 'action' || contentLower.includes('action:') || contentLower.includes('todo:') || contentLower.includes('☐')) {
      actionItems.push(content.replace(/^(action:|todo:|☐)\s*/i, ''));
    } else if (
      contentLower.includes('decision:') ||
      contentLower.includes('decided') ||
      contentLower.includes('approved') ||
      contentLower.includes('📌')
    ) {
      decisions.push(content.replace(/^(decision:|📌)\s*/i, ''));
    } else if (node.type === 'sticky' || node.type === 'text') {
      if (content.length > 10) {
        keyPoints.push(content);
      }
    }
  }

  const strategyNodes = nodes.filter(n => ['sticky', 'opportunity', 'risk', 'action', 'frame', 'text'].includes(n.type));

  return {
    title: board.name,
    date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    decisions: decisions.slice(0, 10),
    actionItems: actionItems.slice(0, 15),
    risks: risks.slice(0, 8),
    opportunities: opportunities.slice(0, 8),
    keyPoints: keyPoints.slice(0, 10),
    metrics: [
      { label: 'Total Items', value: String(strategyNodes.length) },
      { label: 'Completed', value: String(completedItems) },
      { label: 'Decisions', value: String(decisions.length) },
      { label: 'Open Risks', value: String(risks.length) },
    ],
    totalItems: strategyNodes.length,
    completedItems,
  };
}

// ============================================
// TEMPLATE GENERATORS
// ============================================

function generateEmailHTML(content: ExtractedContent, config: ExportConfig, template: TemplateType): string {
  const completionPct = content.totalItems > 0 ? Math.round((content.completedItems / content.totalItems) * 100) : 0;

  const greeting = template === 'executive_summary' ? 'Dear Leadership Team,' :
    template === 'board_report' ? 'Dear Board Members,' :
    template === 'investor_update' ? 'Dear Investors,' : 'Hi Team,';

  const subject = template === 'executive_summary' ? `Executive Summary: ${content.title}` :
    template === 'board_report' ? `Board Report: ${content.title} — ${content.date}` :
    template === 'investor_update' ? `Investor Update: ${content.title}` :
    `Strategy Update: ${content.title}`;

  let html = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; color: #1a1a2e;">`;
  html += `<h1 style="font-size: 22px; font-weight: 700; margin-bottom: 4px; color: #1a1a2e;">${subject}</h1>`;
  html += `<p style="color: #64748b; font-size: 14px; margin-bottom: 24px;">${content.date}</p>`;
  html += `<p style="font-size: 15px; line-height: 1.6; color: #334155;">${greeting}</p>`;

  if (config.includeMetrics) {
    html += `<p style="font-size: 15px; line-height: 1.6; color: #334155;">Here's a quick snapshot of our strategic progress:</p>`;
    html += `<table style="width: 100%; border-collapse: collapse; margin: 16px 0;">`;
    html += `<tr>`;
    for (const m of content.metrics) {
      html += `<td style="text-align: center; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
        <div style="font-size: 24px; font-weight: 700; color: #6366f1;">${m.value}</div>
        <div style="font-size: 12px; color: #64748b; margin-top: 4px;">${m.label}</div>
      </td>`;
    }
    html += `</tr></table>`;
    html += `<div style="background: #f0f9ff; border-left: 4px solid #6366f1; padding: 12px 16px; margin: 16px 0; border-radius: 0 8px 8px 0;">
      <span style="font-size: 14px; color: #334155;">Overall progress: <strong>${completionPct}% complete</strong></span>
    </div>`;
  }

  if (config.includeDecisions && content.decisions.length > 0) {
    html += `<h2 style="font-size: 16px; font-weight: 600; color: #1a1a2e; margin-top: 24px; margin-bottom: 8px;">📌 Key Decisions</h2>`;
    html += `<ul style="padding-left: 20px; line-height: 1.8; color: #334155;">`;
    for (const d of content.decisions) {
      html += `<li style="margin-bottom: 4px;">${d}</li>`;
    }
    html += `</ul>`;
  }

  if (config.includeActionItems && content.actionItems.length > 0) {
    html += `<h2 style="font-size: 16px; font-weight: 600; color: #1a1a2e; margin-top: 24px; margin-bottom: 8px;">✅ Action Items</h2>`;
    html += `<ul style="padding-left: 20px; line-height: 1.8; color: #334155;">`;
    for (const a of content.actionItems) {
      html += `<li style="margin-bottom: 4px;">${a}</li>`;
    }
    html += `</ul>`;
  }

  if (config.includeRisks && content.risks.length > 0) {
    html += `<h2 style="font-size: 16px; font-weight: 600; color: #1a1a2e; margin-top: 24px; margin-bottom: 8px;">⚠️ Risks & Concerns</h2>`;
    html += `<ul style="padding-left: 20px; line-height: 1.8; color: #334155;">`;
    for (const r of content.risks) {
      html += `<li style="margin-bottom: 4px;">${r}</li>`;
    }
    html += `</ul>`;
  }

  if (content.opportunities.length > 0) {
    html += `<h2 style="font-size: 16px; font-weight: 600; color: #1a1a2e; margin-top: 24px; margin-bottom: 8px;">💡 Opportunities</h2>`;
    html += `<ul style="padding-left: 20px; line-height: 1.8; color: #334155;">`;
    for (const o of content.opportunities) {
      html += `<li style="margin-bottom: 4px;">${o}</li>`;
    }
    html += `</ul>`;
  }

  html += `<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />`;
  html += `<p style="font-size: 13px; color: #94a3b8;">Generated from ${content.title} · Strategic Canvas</p>`;
  html += `</div>`;

  return html;
}

function generateSlideMarkdown(content: ExtractedContent, config: ExportConfig): string {
  const completionPct = content.totalItems > 0 ? Math.round((content.completedItems / content.totalItems) * 100) : 0;

  let md = `# ${content.title}\n`;
  md += `### Strategic Update — ${content.date}\n\n`;
  md += `---\n\n`;

  if (config.includeMetrics) {
    md += `## 📊 Key Metrics\n\n`;
    md += `| Metric | Value |\n|--------|-------|\n`;
    for (const m of content.metrics) {
      md += `| ${m.label} | **${m.value}** |\n`;
    }
    md += `| Completion | **${completionPct}%** |\n`;
    md += `\n---\n\n`;
  }

  if (config.includeDecisions && content.decisions.length > 0) {
    md += `## 📌 Key Decisions\n\n`;
    for (const d of content.decisions) {
      md += `- ${d}\n`;
    }
    md += `\n---\n\n`;
  }

  if (config.includeActionItems && content.actionItems.length > 0) {
    md += `## ✅ Action Items\n\n`;
    for (const a of content.actionItems) {
      md += `- [ ] ${a}\n`;
    }
    md += `\n---\n\n`;
  }

  if (config.includeRisks && content.risks.length > 0) {
    md += `## ⚠️ Risks\n\n`;
    for (const r of content.risks) {
      md += `- ${r}\n`;
    }
    md += `\n---\n\n`;
  }

  if (content.opportunities.length > 0) {
    md += `## 💡 Opportunities\n\n`;
    for (const o of content.opportunities) {
      md += `- ${o}\n`;
    }
    md += `\n---\n\n`;
  }

  md += `## 🔮 Next Steps\n\n`;
  md += `- Review priorities for the upcoming sprint\n`;
  md += `- Address identified risks\n`;
  md += `- Follow up on pending action items\n\n`;
  md += `---\n\n`;
  md += `*Generated from ${content.title} · Strategic Canvas*\n`;

  return md;
}

function generateNewsletter(content: ExtractedContent, config: ExportConfig): string {
  const completionPct = content.totalItems > 0 ? Math.round((content.completedItems / content.totalItems) * 100) : 0;

  let text = `# ${content.title} — Strategy Update\n\n`;
  text += `*${content.date}*\n\n`;

  text += `## The Big Picture\n\n`;
  text += `We're ${completionPct}% through our current strategic cycle with ${content.metrics[0]?.value || '0'} items tracked across our canvas. `;

  if (content.decisions.length > 0) {
    text += `This period, we've made **${content.decisions.length} key decision${content.decisions.length > 1 ? 's' : ''}** `;
    text += `that shape our direction forward.\n\n`;
  } else {
    text += `The team continues to make progress on our strategic initiatives.\n\n`;
  }

  if (content.decisions.length > 0) {
    text += `## What We've Decided\n\n`;
    for (const d of content.decisions.slice(0, 5)) {
      text += `→ ${d}\n\n`;
    }
  }

  if (content.keyPoints.length > 0) {
    text += `## Key Highlights\n\n`;
    for (const p of content.keyPoints.slice(0, 5)) {
      text += `- ${p}\n`;
    }
    text += `\n`;
  }

  if (config.includeRisks && content.risks.length > 0) {
    text += `## On Our Radar\n\n`;
    for (const r of content.risks.slice(0, 3)) {
      text += `⚡ ${r}\n\n`;
    }
  }

  if (content.opportunities.length > 0) {
    text += `## Opportunities Ahead\n\n`;
    for (const o of content.opportunities.slice(0, 3)) {
      text += `💡 ${o}\n\n`;
    }
  }

  text += `---\n\n`;
  text += `*This update was generated from our strategic planning canvas. For the full interactive view, visit the Strategic Canvas workspace.*\n`;

  return text;
}

// ============================================
// MAIN COMPONENT
// ============================================

const FORMAT_OPTIONS: { id: ExportFormat; label: string; icon: React.ReactNode; description: string }[] = [
  { id: 'email', label: 'Stakeholder Email', icon: <Mail className="w-4 h-4" />, description: 'Formatted HTML email ready to send' },
  { id: 'slides', label: 'Slide Summary', icon: <Presentation className="w-4 h-4" />, description: 'Markdown for board deck slides' },
  { id: 'newsletter', label: 'Newsletter Draft', icon: <Newspaper className="w-4 h-4" />, description: 'Blog/newsletter post draft' },
];

const TEMPLATE_OPTIONS: { id: TemplateType; label: string; description: string }[] = [
  { id: 'executive_summary', label: 'Executive Summary', description: 'High-level overview for leadership' },
  { id: 'team_update', label: 'Team Update', description: 'Detailed update for the working team' },
  { id: 'board_report', label: 'Board Report', description: 'Formal report for board of directors' },
  { id: 'investor_update', label: 'Investor Update', description: 'Progress update for investors' },
];

export const ContentExporter: React.FC<ContentExporterProps> = ({
  isOpen,
  onClose,
  board,
}) => {
  const [config, setConfig] = useState<ExportConfig>({
    format: 'email',
    template: 'executive_summary',
    includeMetrics: true,
    includeDecisions: true,
    includeActionItems: true,
    includeRisks: true,
    includeTimeline: false,
    tone: 'formal',
  });
  const [viewMode, setViewMode] = useState<ViewMode>('configure');
  const [copied, setCopied] = useState(false);

  const extractedContent = useMemo(() => extractBoardContent(board), [board]);

  const generatedOutput = useMemo(() => {
    switch (config.format) {
      case 'email':
        return generateEmailHTML(extractedContent, config, config.template);
      case 'slides':
        return generateSlideMarkdown(extractedContent, config);
      case 'newsletter':
        return generateNewsletter(extractedContent, config);
      default:
        return '';
    }
  }, [extractedContent, config]);

  const handleCopy = useCallback(async () => {
    try {
      if (config.format === 'email') {
        // Copy as rich HTML
        const blob = new Blob([generatedOutput], { type: 'text/html' });
        const data = [new ClipboardItem({ 'text/html': blob, 'text/plain': new Blob([generatedOutput], { type: 'text/plain' }) })];
        await navigator.clipboard.write(data);
      } else {
        await navigator.clipboard.writeText(generatedOutput);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      await navigator.clipboard.writeText(generatedOutput);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [generatedOutput, config.format]);

  const handleDownload = useCallback(() => {
    const ext = config.format === 'email' ? 'html' : 'md';
    const mimeType = config.format === 'email' ? 'text/html' : 'text/markdown';
    const blob = new Blob([generatedOutput], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${board.name.replace(/\s+/g, '-').toLowerCase()}-update.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [generatedOutput, config.format, board.name]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Export as Update</h2>
                  <p className="text-xs text-gray-500">{board.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex bg-gray-100 rounded-lg p-0.5">
                  <button
                    onClick={() => setViewMode('configure')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === 'configure' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
                  >
                    <Edit3 className="w-3 h-3 inline mr-1" />Configure
                  </button>
                  <button
                    onClick={() => setViewMode('preview')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === 'preview' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
                  >
                    <Eye className="w-3 h-3 inline mr-1" />Preview
                  </button>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">
                {viewMode === 'configure' ? (
                  <motion.div
                    key="configure"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="p-6 space-y-6"
                  >
                    {/* Format Selection */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Export Format</h3>
                      <div className="grid grid-cols-3 gap-3">
                        {FORMAT_OPTIONS.map((opt) => (
                          <button
                            key={opt.id}
                            onClick={() => setConfig(c => ({ ...c, format: opt.id }))}
                            className={`p-3 rounded-xl border-2 text-left transition-all ${
                              config.format === opt.id
                                ? 'border-indigo-500 bg-indigo-50'
                                : 'border-gray-200 hover:border-gray-300 bg-white'
                            }`}
                          >
                            <div className={`mb-2 ${config.format === opt.id ? 'text-indigo-600' : 'text-gray-400'}`}>
                              {opt.icon}
                            </div>
                            <div className="text-sm font-medium text-gray-900">{opt.label}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{opt.description}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Template Selection (for email) */}
                    {config.format === 'email' && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">Template</h3>
                        <div className="grid grid-cols-2 gap-3">
                          {TEMPLATE_OPTIONS.map((opt) => (
                            <button
                              key={opt.id}
                              onClick={() => setConfig(c => ({ ...c, template: opt.id }))}
                              className={`p-3 rounded-xl border-2 text-left transition-all ${
                                config.template === opt.id
                                  ? 'border-indigo-500 bg-indigo-50'
                                  : 'border-gray-200 hover:border-gray-300 bg-white'
                              }`}
                            >
                              <div className="text-sm font-medium text-gray-900">{opt.label}</div>
                              <div className="text-xs text-gray-500 mt-0.5">{opt.description}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Content toggles */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Include Sections</h3>
                      <div className="space-y-2">
                        {[
                          { key: 'includeMetrics' as const, label: 'Key Metrics', icon: <TrendingUp className="w-4 h-4" /> },
                          { key: 'includeDecisions' as const, label: 'Decisions', icon: <Target className="w-4 h-4" /> },
                          { key: 'includeActionItems' as const, label: 'Action Items', icon: <CheckCircle className="w-4 h-4" /> },
                          { key: 'includeRisks' as const, label: 'Risks & Concerns', icon: <AlertCircle className="w-4 h-4" /> },
                        ].map(({ key, label, icon }) => (
                          <label key={key} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={config[key]}
                              onChange={(e) => setConfig(c => ({ ...c, [key]: e.target.checked }))}
                              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-gray-400">{icon}</span>
                            <span className="text-sm text-gray-700">{label}</span>
                            <span className="text-xs text-gray-400 ml-auto">
                              {key === 'includeDecisions' ? `${extractedContent.decisions.length} found` :
                               key === 'includeActionItems' ? `${extractedContent.actionItems.length} found` :
                               key === 'includeRisks' ? `${extractedContent.risks.length} found` : ''}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Quick stats */}
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Content Summary</div>
                      <div className="grid grid-cols-4 gap-3 text-center">
                        {extractedContent.metrics.map((m) => (
                          <div key={m.label}>
                            <div className="text-lg font-bold text-gray-900">{m.value}</div>
                            <div className="text-xs text-gray-500">{m.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="preview"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="p-6"
                  >
                    {config.format === 'email' ? (
                      <div
                        className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm"
                        dangerouslySetInnerHTML={{ __html: generatedOutput }}
                      />
                    ) : (
                      <pre className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-sm text-gray-800 whitespace-pre-wrap font-mono leading-relaxed overflow-auto max-h-[60vh]">
                        {generatedOutput}
                      </pre>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between bg-gray-50">
              <div className="text-xs text-gray-500">
                {config.format === 'email' ? 'HTML' : 'Markdown'} · {Math.round(generatedOutput.length / 1024 * 10) / 10} KB
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setViewMode(viewMode === 'configure' ? 'preview' : 'configure')}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  {viewMode === 'configure' ? 'Preview' : 'Back to Configure'}
                </button>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ContentExporter;
