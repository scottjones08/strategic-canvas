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
  ChevronRight,
  Sparkles,
  Star,
  Zap,
  Grid3X3
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

// Category icon mapping with Lucide icons
const categoryIcons: Record<TemplateCategory, typeof Layout> = {
  strategy: BarChart3,
  agile: RotateCcw,
  design: Lightbulb,
  meeting: Calendar,
  planning: Users,
};

// Premium category colors for filter buttons
const categoryButtonColors: Record<TemplateCategory, { active: string; inactive: string }> = {
  strategy: { 
    active: 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-200', 
    inactive: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100' 
  },
  agile: { 
    active: 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-200', 
    inactive: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' 
  },
  design: { 
    active: 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-lg shadow-pink-200', 
    inactive: 'bg-pink-50 text-pink-700 hover:bg-pink-100' 
  },
  meeting: { 
    active: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-200', 
    inactive: 'bg-blue-50 text-blue-700 hover:bg-blue-100' 
  },
  planning: { 
    active: 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-200', 
    inactive: 'bg-purple-50 text-purple-700 hover:bg-purple-100' 
  },
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

    if (selectedCategory !== 'all') {
      results = getTemplatesByCategory(selectedCategory);
    }

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
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Premium Header */}
          <div className="relative px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            {/* Decorative background pattern */}
            <div className="absolute inset-0 opacity-30">
              <div 
                className="absolute inset-0"
                style={{
                  backgroundImage: `radial-gradient(circle at 2px 2px, #cbd5e1 1px, transparent 0)`,
                  backgroundSize: '24px 24px',
                }}
              />
            </div>
            
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-4">
                {previewTemplate ? (
                  <motion.button
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    onClick={handleClosePreview}
                    className="p-2.5 hover:bg-slate-100 rounded-xl transition-all duration-200"
                  >
                    <ArrowLeft className="w-5 h-5 text-slate-600" />
                  </motion.button>
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                )}
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">
                    {previewTemplate ? previewTemplate.name : 'Template Library'}
                  </h2>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {previewTemplate 
                      ? previewTemplate.description 
                      : 'Premium templates to accelerate your work'}
                  </p>
                </div>
              </div>
              
              <button
                onClick={onClose}
                className="p-2.5 hover:bg-slate-100 rounded-xl transition-all duration-200"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
          </div>

          {/* Preview Mode */}
          {previewTemplate ? (
            <div className="flex-1 overflow-hidden flex flex-col">
              {/* Large Preview with premium background */}
              <div className="flex-1 p-6 bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 flex items-center justify-center overflow-auto relative">
                {/* Decorative grid pattern */}
                <div 
                  className="absolute inset-0 opacity-30"
                  style={{
                    backgroundImage: `radial-gradient(circle at 1px 1px, #94a3b8 1px, transparent 0)`,
                    backgroundSize: '20px 20px',
                  }}
                />
                
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-full overflow-auto"
                >
                  <TemplateThumbnail 
                    template={previewTemplate} 
                    width={900} 
                    height={550} 
                  />
                </motion.div>
              </div>

              {/* Preview Footer */}
              <div className="px-6 py-4 border-t border-slate-100 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center shadow-sm">
                      <span className="text-3xl">{previewTemplate.icon}</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-slate-800">{previewTemplate.name}</h3>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {previewTemplate.tags.map((tag, index) => (
                          <span 
                            key={index}
                            className="inline-flex px-2.5 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full"
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
                      className="px-5 py-2.5 text-slate-700 font-medium rounded-xl hover:bg-slate-100 transition-all duration-200"
                    >
                      Back
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        onSelectTemplate(previewTemplate);
                        onClose();
                      }}
                      className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-xl shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 transition-all duration-200"
                    >
                      <Zap className="w-4 h-4" />
                      Use Template
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Search and Filters */}
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 space-y-4">
                {/* Premium Search Bar */}
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search templates by name, tag, or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 shadow-sm placeholder:text-slate-400"
                  />
                </div>

                {/* Category Filters with premium styling */}
                <div className="flex items-center gap-2 flex-wrap">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedCategory('all')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                      selectedCategory === 'all'
                        ? 'bg-gradient-to-r from-slate-700 to-slate-800 text-white shadow-lg shadow-slate-200'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <Grid3X3 className="w-4 h-4" />
                    All Templates
                  </motion.button>
                  
                  {categories.map((category) => {
                    const info = getCategoryInfo(category);
                    const Icon = categoryIcons[category];
                    const colors = categoryButtonColors[category];
                    
                    return (
                      <motion.button
                        key={category}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedCategory(category)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                          selectedCategory === category ? colors.active : colors.inactive
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {info.label}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Template Grid */}
              <div className="flex-1 overflow-auto p-6 bg-gradient-to-b from-white to-slate-50">
                {filteredTemplates.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-16"
                  >
                    <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                      <Search className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-800 mb-2">No templates found</h3>
                    <p className="text-slate-500">Try adjusting your search or filter criteria</p>
                  </motion.div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Premium Blank Canvas Option */}
                    <motion.div
                      whileHover={{ y: -6, boxShadow: '0 20px 40px -15px rgba(0,0,0,0.1)' }}
                      onClick={() => setSelectedTemplate({ 
                        id: 'blank', 
                        name: 'Blank Canvas', 
                        description: 'Start fresh with an empty board',
                        category: 'planning',
                        icon: '✨',
                        tags: ['blank', 'empty', 'custom'],
                        nodes: []
                      })}
                      className={`relative bg-gradient-to-br from-slate-50 via-white to-slate-100 rounded-2xl border-2 border-dashed overflow-hidden cursor-pointer transition-all duration-300 p-6 flex flex-col items-center justify-center min-h-[300px] ${
                        selectedTemplate?.id === 'blank'
                          ? 'border-indigo-500 ring-2 ring-indigo-200 shadow-xl'
                          : 'border-slate-300 hover:border-slate-400'
                      }`}
                    >
                      {/* Decorative pattern */}
                      <div 
                        className="absolute inset-0 opacity-20"
                        style={{
                          backgroundImage: `radial-gradient(circle at 2px 2px, #94a3b8 1px, transparent 0)`,
                          backgroundSize: '16px 16px',
                        }}
                      />
                      
                      <motion.div 
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        className="relative w-20 h-20 bg-gradient-to-br from-white to-slate-100 rounded-3xl shadow-lg flex items-center justify-center mb-4 border border-slate-200"
                      >
                        <Plus className="w-10 h-10 text-slate-400" />
                      </motion.div>
                      
                      <h3 className="relative font-bold text-lg text-slate-800">Blank Canvas</h3>
                      <p className="relative text-sm text-slate-500 mt-1.5 text-center">Start from scratch with complete freedom</p>
                      
                      {selectedTemplate?.id === 'blank' && (
                        <motion.div 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute top-4 right-4 w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg"
                        >
                          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </motion.div>
                      )}
                    </motion.div>

                    {/* Template Cards */}
                    {filteredTemplates.map((template, index) => (
                      <motion.div
                        key={template.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <TemplateCard
                          template={template}
                          onSelect={handleSelectTemplate}
                          onPreview={handlePreview}
                          isSelected={selectedTemplate?.id === template.id}
                        />
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Premium Footer */}
              <div className="px-6 py-4 border-t border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-sm text-slate-500">
                      <Star className="w-4 h-4 text-amber-400" />
                      <span>{filteredTemplates.length} premium template{filteredTemplates.length !== 1 ? 's' : ''}</span>
                    </div>
                    {selectedTemplate && (
                      <motion.span 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2 text-sm text-indigo-600 font-medium bg-indigo-50 px-3 py-1 rounded-full"
                      >
                        <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                        Selected: {selectedTemplate.name}
                      </motion.span>
                    )}
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={onClose}
                      className="px-5 py-2.5 text-slate-700 font-medium rounded-xl hover:bg-slate-100 transition-all duration-200"
                    >
                      Cancel
                    </button>
                    <motion.button
                      whileHover={{ scale: selectedTemplate ? 1.02 : 1 }}
                      whileTap={{ scale: selectedTemplate ? 0.98 : 1 }}
                      onClick={handleUseTemplate}
                      disabled={!selectedTemplate}
                      className={`flex items-center gap-2 px-6 py-2.5 font-semibold rounded-xl transition-all duration-200 ${
                        selectedTemplate
                          ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {selectedTemplate ? (
                        <>
                          <Zap className="w-4 h-4" />
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
