import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Code2,
  Plus,
  Search,
  Copy,
  Check,
  Pencil,
  Trash2,
  Tag,
  FileText,
  Filter,
  Cloud,
  CloudOff,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  FileCode,
  BookOpen,
  X,
  Layers,
  Globe,
  Settings,
  Download,
  Package,
  Folder,
} from 'lucide-react';
import { useSnippets, useApiStatus } from '../hooks/useSnippets';
import type { CodeSnippet, CreateSnippetInput } from '../types/snippets';
import { LANGUAGE_OPTIONS, getTagColor } from '../types/snippets';

// Documentation data for reports
const COMPONENTS_DATA = [
  { name: 'App', path: 'src/App.tsx', type: 'page' as const, description: 'Main application with whiteboard canvas' },
  { name: 'CodeSnippetsView', path: 'src/components/CodeSnippetsView.tsx', type: 'component' as const, description: 'Code snippets management view' },
  { name: 'Sidebar', path: 'src/App.tsx (inline)', type: 'component' as const, description: 'Navigation sidebar' },
  { name: 'DashboardView', path: 'src/App.tsx (inline)', type: 'component' as const, description: 'Board dashboard view' },
  { name: 'NotesViewRedesigned', path: 'src/components/NotesViewRedesign.tsx', type: 'component' as const, description: 'Notion-style notes view' },
  { name: 'DocumentsView', path: 'src/components/DocumentsView.tsx', type: 'component' as const, description: 'Document management' },
  { name: 'PDFEditor', path: 'src/components/PDFEditor.tsx', type: 'component' as const, description: 'PDF annotation editor' },
  { name: 'FacilitatorTools', path: 'src/components/FacilitatorTools.tsx', type: 'component' as const, description: 'Meeting facilitation tools' },
  { name: 'AssetLibrary', path: 'src/components/AssetLibrary.tsx', type: 'component' as const, description: 'Asset management library' },
  
  { name: 'useSnippets', path: 'src/hooks/useSnippets.ts', type: 'hook' as const, description: 'Snippets CRUD operations' },
  { name: 'useAuth', path: 'src/hooks/useAuth.ts', type: 'hook' as const, description: 'Authentication hook' },
  { name: 'useCollaboration', path: 'src/hooks/useCollaboration.ts', type: 'hook' as const, description: 'Real-time collaboration' },
  { name: 'useDocuments', path: 'src/hooks/useDocuments.ts', type: 'hook' as const, description: 'Document management' },
  { name: 'useTranscription', path: 'src/hooks/useTranscription.ts', type: 'hook' as const, description: 'Audio transcription' },
  
  { name: 'snippets-api', path: 'src/lib/snippets-api.ts', type: 'lib' as const, description: 'Snippets API client' },
  { name: 'supabase', path: 'src/lib/supabase.ts', type: 'lib' as const, description: 'Supabase client' },
  { name: 'ai-features', path: 'src/lib/ai-features.ts', type: 'lib' as const, description: 'AI-powered features' },
  { name: 'transcription', path: 'src/lib/transcription.ts', type: 'lib' as const, description: 'Transcription utilities' },
];

const API_ENDPOINTS = [
  { method: 'GET' as const, path: '/api/v1/snippets', description: 'List all code snippets' },
  { method: 'POST' as const, path: '/api/v1/snippets', description: 'Create a new snippet' },
  { method: 'GET' as const, path: '/api/v1/snippets/:id', description: 'Get snippet by ID' },
  { method: 'PUT' as const, path: '/api/v1/snippets/:id', description: 'Update snippet' },
  { method: 'DELETE' as const, path: '/api/v1/snippets/:id', description: 'Delete snippet' },
  { method: 'GET' as const, path: '/api/v1/health', description: 'API health check' },
  { method: 'GET' as const, path: '/rest/v1/boards', description: 'List boards (Supabase)' },
  { method: 'GET' as const, path: '/rest/v1/organizations', description: 'List organizations (Supabase)' },
  { method: 'GET' as const, path: '/rest/v1/notes', description: 'List notes (Supabase)' },
  { method: 'GET' as const, path: '/rest/v1/documents', description: 'List documents (Supabase)' },
];

const CONFIG_DATA = [
  { key: 'VITE_SUPABASE_URL', value: '***', source: 'env' as const },
  { key: 'VITE_SUPABASE_ANON_KEY', value: '***', source: 'env' as const },
  { key: 'MISSION_CONTROL_API', value: 'http://localhost:3001/api/v1', source: 'config' as const },
  { key: 'name', value: 'fan-canvas', source: 'package.json' as const },
  { key: 'version', value: '1.0.0', source: 'package.json' as const },
];

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-green-100 text-green-700',
  POST: 'bg-blue-100 text-blue-700',
  PUT: 'bg-yellow-100 text-yellow-700',
  DELETE: 'bg-red-100 text-red-700',
  PATCH: 'bg-purple-100 text-purple-700',
};

interface CodeSnippetsViewProps {
  className?: string;
}

export default function CodeSnippetsView({ className = '' }: CodeSnippetsViewProps) {
  const {
    snippets,
    allTags,
    isLoading,
    refetch,
    createSnippet,
    updateSnippet,
    deleteSnippet,
  } = useSnippets();
  
  const apiStatus = useApiStatus();
  
  const [activeTab, setActiveTab] = useState<'snippets' | 'reports'>('snippets');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingSnippet, setEditingSnippet] = useState<CodeSnippet | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['components']);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formLanguage, setFormLanguage] = useState('typescript');
  const [formTags, setFormTags] = useState('');

  // Filtered snippets
  const filteredSnippets = useMemo(() => {
    return snippets.filter((snippet) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          snippet.title.toLowerCase().includes(query) ||
          snippet.description.toLowerCase().includes(query) ||
          snippet.code.toLowerCase().includes(query) ||
          snippet.tags.some((tag) => tag.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }
      if (selectedLanguage !== 'all' && snippet.language !== selectedLanguage) return false;
      if (selectedTag !== 'all' && !snippet.tags.includes(selectedTag)) return false;
      return true;
    });
  }, [snippets, searchQuery, selectedLanguage, selectedTag]);

  // Copy to clipboard
  const copyToClipboard = async (text: string, id: string, asMarkdown = false) => {
    const content = asMarkdown
      ? `\`\`\`${snippets.find((s) => s.id === id)?.language || ''}\n${text}\n\`\`\``
      : text;
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy snippet:', error);
    }
  };

  // Open editor
  const openNewEditor = () => {
    setEditingSnippet(null);
    setFormTitle('');
    setFormDescription('');
    setFormCode('');
    setFormLanguage('typescript');
    setFormTags('');
    setIsEditorOpen(true);
  };

  const openEditEditor = (snippet: CodeSnippet) => {
    setEditingSnippet(snippet);
    setFormTitle(snippet.title);
    setFormDescription(snippet.description);
    setFormCode(snippet.code);
    setFormLanguage(snippet.language);
    setFormTags(snippet.tags.join(', '));
    setIsEditorOpen(true);
  };

  // Save snippet
  const handleSave = async () => {
    const tags = formTags.split(',').map((t) => t.trim()).filter(Boolean);
    const input: CreateSnippetInput = {
      title: formTitle,
      description: formDescription,
      code: formCode,
      language: formLanguage,
      tags,
    };

    setIsSaving(true);
    try {
      if (editingSnippet) {
        await updateSnippet({ id: editingSnippet.id, ...input });
      } else {
        await createSnippet(input);
      }
      setIsEditorOpen(false);
    } catch (error) {
      console.error('Failed to save snippet:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete snippet
  const handleDelete = async (id: string) => {
    try {
      await deleteSnippet(id);
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete snippet:', error);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    );
  };

  // Generate markdown report
  const generateMarkdown = () => {
    let md = `# Strategic Canvas - Documentation Report\n\n`;
    md += `*Generated: ${new Date().toLocaleString()}*\n\n`;

    const groups: Record<string, typeof COMPONENTS_DATA> = { page: [], component: [], hook: [], lib: [] };
    COMPONENTS_DATA.forEach((item) => groups[item.type].push(item));

    md += `## Components & Modules\n\n`;
    Object.entries(groups).forEach(([type, items]) => {
      if (items.length === 0) return;
      md += `### ${type.charAt(0).toUpperCase() + type.slice(1)}s\n\n`;
      md += `| Name | Path | Description |\n|------|------|-------------|\n`;
      items.forEach((item) => {
        md += `| ${item.name} | \`${item.path}\` | ${item.description} |\n`;
      });
      md += `\n`;
    });

    md += `## API Endpoints\n\n| Method | Path | Description |\n|--------|------|-------------|\n`;
    API_ENDPOINTS.forEach((e) => {
      md += `| ${e.method} | \`${e.path}\` | ${e.description} |\n`;
    });

    md += `\n## Configuration\n\n| Key | Source |\n|-----|--------|\n`;
    CONFIG_DATA.forEach((c) => {
      md += `| ${c.key} | ${c.source} |\n`;
    });

    return md;
  };

  const [copiedMd, setCopiedMd] = useState(false);
  const copyMarkdown = async () => {
    await navigator.clipboard.writeText(generateMarkdown());
    setCopiedMd(true);
    setTimeout(() => setCopiedMd(false), 2000);
  };

  const downloadMarkdown = () => {
    const blob = new Blob([generateMarkdown()], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `strategic_canvas_docs_${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Group components by type for reports
  const groupedComponents = useMemo(() => {
    const groups: Record<string, typeof COMPONENTS_DATA> = { page: [], component: [], hook: [], lib: [] };
    COMPONENTS_DATA.forEach((item) => groups[item.type].push(item));
    return groups;
  }, []);

  return (
    <div className={`h-full bg-gray-50 overflow-auto ${className}`}>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Code2 className="h-7 w-7 text-navy-600" />
              Code Snippets
            </h1>
            <p className="text-gray-500 mt-1">Save, organize, and reuse code snippets</p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
              apiStatus.connected ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
            }`}>
              {apiStatus.connected ? <Cloud className="h-3.5 w-3.5" /> : <CloudOff className="h-3.5 w-3.5" />}
              {apiStatus.connected ? 'Synced' : 'Local'}
            </div>
            <button
              onClick={() => refetch()}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              onClick={openNewEditor}
              className="flex items-center gap-2 px-4 py-2 bg-navy-600 text-white rounded-lg hover:bg-navy-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Snippet
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('snippets')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'snippets'
                ? 'bg-white text-navy-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileCode className="h-4 w-4" />
            Snippets
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'reports'
                ? 'bg-white text-navy-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            Reports
          </button>
        </div>

        {/* Snippets Tab */}
        {activeTab === 'snippets' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search snippets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent"
                />
              </div>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500"
              >
                <option value="all">All Languages</option>
                {LANGUAGE_OPTIONS.map((lang) => (
                  <option key={lang.value} value={lang.value}>{lang.label}</option>
                ))}
              </select>
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500"
              >
                <option value="all">All Tags</option>
                {allTags.map((tag) => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>

            {/* Snippets Grid */}
            {isLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
                    <div className="h-5 bg-gray-200 rounded w-2/3 mb-3" />
                    <div className="h-4 bg-gray-200 rounded w-full mb-4" />
                    <div className="h-24 bg-gray-100 rounded" />
                  </div>
                ))}
              </div>
            ) : filteredSnippets.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-gray-300" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">No snippets found</h3>
                <p className="mt-2 text-gray-500">
                  {searchQuery || selectedLanguage !== 'all' || selectedTag !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Create your first code snippet to get started'}
                </p>
                <button
                  onClick={openNewEditor}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-navy-600 text-white rounded-lg hover:bg-navy-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Create Snippet
                </button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredSnippets.map((snippet) => (
                  <motion.div
                    key={snippet.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-shadow overflow-hidden"
                  >
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-gray-900 truncate flex-1">{snippet.title}</h3>
                        <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                          {snippet.language}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 line-clamp-2 mb-3">{snippet.description}</p>
                      
                      <div className="relative">
                        <pre className="p-3 bg-gray-50 rounded-lg text-xs font-mono overflow-hidden max-h-28">
                          <code className="line-clamp-4">{snippet.code}</code>
                        </pre>
                        <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-gray-50 to-transparent pointer-events-none" />
                      </div>

                      {snippet.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {snippet.tags.slice(0, 4).map((tag) => (
                            <span key={tag} className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${getTagColor(tag)}`}>
                              {tag}
                            </span>
                          ))}
                          {snippet.tags.length > 4 && (
                            <span className="px-2 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-600 rounded-full">
                              +{snippet.tags.length - 4}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 px-3 py-2 border-t border-gray-100 bg-gray-50">
                      <button
                        onClick={() => copyToClipboard(snippet.code, snippet.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-sm text-gray-600 hover:bg-white rounded-lg transition-colors"
                      >
                        {copiedId === snippet.id ? (
                          <><Check className="h-4 w-4 text-green-600" /> Copied!</>
                        ) : (
                          <><Copy className="h-4 w-4" /> Copy</>
                        )}
                      </button>
                      <button
                        onClick={() => copyToClipboard(snippet.code, snippet.id, true)}
                        className="p-1.5 text-gray-500 hover:bg-white rounded-lg transition-colors"
                        title="Copy as Markdown"
                      >
                        <FileText className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openEditEditor(snippet)}
                        className="p-1.5 text-gray-500 hover:bg-white rounded-lg transition-colors"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(snippet.id)}
                        className="p-1.5 text-red-500 hover:bg-white rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <FileCode className="h-5 w-5 text-navy-600" />
                  Auto-Generated Documentation
                </h2>
                <p className="text-sm text-gray-500 mt-1">Overview of components, API endpoints, and configuration</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyMarkdown}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {copiedMd ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  {copiedMd ? 'Copied!' : 'Copy MD'}
                </button>
                <button
                  onClick={downloadMarkdown}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Export
                </button>
              </div>
            </div>

            {/* Components Section */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => toggleSection('components')}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-navy-100 rounded-lg">
                    <Layers className="h-5 w-5 text-navy-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900">Components & Modules</h3>
                    <p className="text-sm text-gray-500">{COMPONENTS_DATA.length} items</p>
                  </div>
                </div>
                {expandedSections.includes('components') ? (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                )}
              </button>
              <AnimatePresence>
                {expandedSections.includes('components') && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-gray-100"
                  >
                    <div className="p-4 space-y-4">
                      {Object.entries(groupedComponents).map(([type, items]) => (
                        items.length > 0 && (
                          <div key={type}>
                            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                              {type}s ({items.length})
                            </h4>
                            <div className="space-y-1">
                              {items.map((item) => (
                                <div key={item.path} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                                  <Folder className="h-4 w-4 text-gray-400" />
                                  <span className="font-medium text-sm text-gray-900">{item.name}</span>
                                  <span className="text-xs text-gray-400 flex-1 truncate">{item.path}</span>
                                  <span className="text-xs text-gray-500 hidden sm:block">{item.description}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* API Section */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => toggleSection('api')}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Globe className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900">API Endpoints</h3>
                    <p className="text-sm text-gray-500">{API_ENDPOINTS.length} endpoints</p>
                  </div>
                </div>
                {expandedSections.includes('api') ? (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                )}
              </button>
              <AnimatePresence>
                {expandedSections.includes('api') && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-gray-100"
                  >
                    <div className="p-4 space-y-1">
                      {API_ENDPOINTS.map((endpoint, i) => (
                        <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                          <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded ${METHOD_COLORS[endpoint.method]}`}>
                            {endpoint.method}
                          </span>
                          <code className="text-sm font-mono flex-1">{endpoint.path}</code>
                          <span className="text-xs text-gray-500 hidden sm:block">{endpoint.description}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Config Section */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => toggleSection('config')}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Settings className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900">Configuration Summary</h3>
                    <p className="text-sm text-gray-500">{CONFIG_DATA.length} settings</p>
                  </div>
                </div>
                {expandedSections.includes('config') ? (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                )}
              </button>
              <AnimatePresence>
                {expandedSections.includes('config') && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-gray-100"
                  >
                    <div className="p-4 space-y-1">
                      {CONFIG_DATA.map((config, i) => (
                        <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                          <code className="text-sm font-mono font-semibold flex-1">{config.key}</code>
                          <span className="px-2 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-600 rounded">
                            {config.source}
                          </span>
                          <code className="text-sm font-mono text-gray-400">{config.value}</code>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      {/* Editor Modal */}
      <AnimatePresence>
        {isEditorOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setIsEditorOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {editingSnippet ? 'Edit Snippet' : 'Create New Snippet'}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {editingSnippet ? 'Update your code snippet details' : 'Save a reusable code snippet'}
                  </p>
                </div>
                <button
                  onClick={() => setIsEditorOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    placeholder="e.g., React useDebounce Hook"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input
                    type="text"
                    placeholder="Brief description of what this snippet does"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                    <select
                      value={formLanguage}
                      onChange={(e) => setFormLanguage(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500"
                    >
                      {LANGUAGE_OPTIONS.map((lang) => (
                        <option key={lang.value} value={lang.value}>{lang.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
                    <input
                      type="text"
                      placeholder="e.g., react, hook, utility"
                      value={formTags}
                      onChange={(e) => setFormTags(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                  <textarea
                    placeholder="Paste your code here..."
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full h-64 px-3 py-2 font-mono text-sm border border-gray-200 rounded-lg bg-gray-50 resize-none focus:outline-none focus:ring-2 focus:ring-navy-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-100 bg-gray-50">
                <button
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!formTitle.trim() || !formCode.trim() || isSaving}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-navy-600 hover:bg-navy-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <><RefreshCw className="h-4 w-4 animate-spin" /> Saving...</>
                  ) : editingSnippet ? (
                    'Update Snippet'
                  ) : (
                    'Create Snippet'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-md p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-semibold text-gray-900">Delete Snippet?</h2>
              <p className="text-sm text-gray-500 mt-2">
                This action cannot be undone. The snippet will be permanently deleted.
              </p>
              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
