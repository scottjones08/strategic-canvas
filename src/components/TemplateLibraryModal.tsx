import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Search, 
  Layout, 
  BarChart3, 
  RotateCcw, 
  Users, 
  Calendar, 
  Lightbulb,
  Plus,
  ArrowLeft,
  ChevronRight
} from 'lucide-react';
import { 
  BOARD_TEMPLATES, 
  BoardTemplate, 
  TemplateCategory,
  getAllCategories,
  getCategoryInfo,
  searchTemplates,
  getTemplatesByCategory
} from '../lib/board-templates';
import TemplateCard, { TemplateThumbnail } from './TemplateCard';

interface TemplateLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: BoardTemplate) => void;
}

// Category icon mapping
const categoryIcons: Record<TemplateCategory, typeof Layout> = {
  strategy: BarChart3,
  agile: RotateCcw,
  design: Lightbulb,
  meeting: Calendar,
  planning: Users,
};

export default function TemplateLibraryModal({ 
  isOpen, 
  onClose, 
  onSelectTemplate 
}: TemplateLibraryModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');
  const [previewTemplate, setPreviewTemplate] = useState<BoardTemplate | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<BoardTemplate | null>(null);

  // Filter templates based on search and category
  const filteredTemplates = useMemo(() => {
    let results = BOARD_TEMPLATES;

    // Filter by category first
    if (selectedCategory !== 'all') {
      results = getTemplatesByCategory(selectedCategory);
    }

    // Then filter by search query
    if (searchQuery.trim()) {
      const searchResults = searchTemplates(searchQuery);
      results = results.filter(t => searchResults.includes(t));
    }

    return results;
  }, [searchQuery, selectedCategory]);

  const categories = getAllCategories();

  const handleSelectTemplate = (template: BoardTemplate) => {
    setSelectedTemplate(template);
  };

  const handleUseTemplate = () => {
    if (selectedTemplate) {
      onSelectTemplate(selectedTemplate);
      onClose();
      setSelectedTemplate(null);
      setSearchQuery('');
      setSelectedCategory('all');
    }
  };

  const handlePreview = (template: BoardTemplate) => {
    setPreviewTemplate(template);
  };

  const handleClosePreview = () => {
    setPreviewTemplate(null);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] overflow-hidden flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              {previewTemplate ? (
                <button
                  onClick={handleClosePreview}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
              ) : (
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Layout className="w-5 h-5 text-white" />
                </div>
              )}
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {previewTemplate ? previewTemplate.name : 'Template Library'}
                </h2>
                <p className="text-sm text-gray-500">
                  {previewTemplate 
                    ? previewTemplate.description 
                    : 'Choose a template to jumpstart your board'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Preview Mode */}
          {previewTemplate ? (
            <div className="flex-1 overflow-hidden flex flex-col">
              {/* Large Preview */}
              <div className="flex-1 p-6 bg-gray-50 flex items-center justify-center overflow-auto">
                <div className="bg-white rounded-xl shadow-lg p-4 max-w-full overflow-auto">
                  <TemplateThumbnail 
                    template={previewTemplate} 
                    width={800} 
                    height={500} 
                  />
                </div>
              </div>

              {/* Preview Footer */}
              <div className="px-6 py-4 border-t border-gray-100 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">{previewTemplate.icon}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900">{previewTemplate.name}</h3>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {previewTemplate.tags.map((tag, index) => (
                          <span 
                            key={index}
                            className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleClosePreview}
                      className="px-4 py-2 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      Back to Templates
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        onSelectTemplate(previewTemplate);
                        onClose();
                      }}
                      className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Use This Template
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Search and Filters */}
              <div className="px-6 py-4 border-b border-gray-100 space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search templates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>

                {/* Category Filters */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                      selectedCategory === 'all'
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    All Templates
                  </button>
                  {categories.map((category) => {
                    const info = getCategoryInfo(category);
                    const Icon = categoryIcons[category];
                    return (
                      <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                          selectedCategory === category
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {info.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Template Grid */}
              <div className="flex-1 overflow-auto p-6">
                {filteredTemplates.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Search className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No templates found</h3>
                    <p className="text-gray-500">Try adjusting your search or filter</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Blank Canvas Option */}
                    <motion.div
                      whileHover={{ y: -4, boxShadow: '0 10px 40px -10px rgba(0,0,0,0.15)' }}
                      onClick={() => setSelectedTemplate({ 
                        id: 'blank', 
                        name: 'Blank Canvas', 
                        description: 'Start with an empty board',
                        category: 'planning',
                        icon: '📄',
                        tags: ['blank', 'empty', 'custom'],
                        nodes: []
                      })}
                      className={`bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border-2 border-dashed overflow-hidden cursor-pointer transition-all p-6 flex flex-col items-center justify-center min-h-[280px] ${
                        selectedTemplate?.id === 'blank'
                          ? 'border-indigo-500 ring-2 ring-indigo-200'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4">
                        <Plus className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="font-semibold text-gray-900">Blank Canvas</h3>
                      <p className="text-sm text-gray-500 mt-1 text-center">Start from scratch with an empty board</p>
                      {selectedTemplate?.id === 'blank' && (
                        <div className="absolute top-3 right-3 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </motion.div>

                    {/* Template Cards */}
                    {filteredTemplates.map((template) => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        onSelect={handleSelectTemplate}
                        onPreview={handlePreview}
                        isSelected={selectedTemplate?.id === template.id}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Footer with Selection */}
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''} available
                    {selectedTemplate && (
                      <span className="ml-2 text-indigo-600 font-medium">
                        • Selected: {selectedTemplate.name}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={onClose}
                      className="px-4 py-2 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <motion.button
                      whileHover={{ scale: selectedTemplate ? 1.02 : 1 }}
                      whileTap={{ scale: selectedTemplate ? 0.98 : 1 }}
                      onClick={handleUseTemplate}
                      disabled={!selectedTemplate}
                      className={`flex items-center gap-2 px-6 py-2 font-medium rounded-lg transition-all ${
                        selectedTemplate
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {selectedTemplate ? (
                        <>
                          Use Template
                          <ChevronRight className="w-4 h-4" />
                        </>
                      ) : (
                        'Select a template'
                      )}
                    </motion.button>
                  </div>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
