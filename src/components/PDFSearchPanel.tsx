// PDFSearchPanel.tsx - Text search with highlighting for PDF documents
// Supports case-sensitive search, whole word, regex, and result navigation

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  ChevronUp,
  ChevronDown,
  Settings2,
  CaseSensitive,
  WholeWord,
  Regex,
  Loader2,
  FileText,
  // Highlighter,
} from 'lucide-react';
import type { SearchResult } from '../lib/pdf-enterprise-utils';

interface PDFSearchPanelProps {
  onSearch: (query: string, options: SearchOptions) => Promise<SearchResult[]>;
  onResultSelect: (result: SearchResult) => void;
  onClose: () => void;
  onHighlightResults?: (results: SearchResult[]) => void;
  isOpen: boolean;
  currentPage: number;
  totalPages: number;
}

export interface SearchOptions {
  caseSensitive: boolean;
  wholeWord: boolean;
  useRegex: boolean;
}

export const PDFSearchPanel: React.FC<PDFSearchPanelProps> = ({
  onSearch,
  onResultSelect,
  onClose,
  onHighlightResults,
  isOpen,
  // currentPage,
  // totalPages,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [options, setOptions] = useState<SearchOptions>({
    caseSensitive: false,
    wholeWord: false,
    useRegex: false,
  });
  const [searchError, setSearchError] = useState<string | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);
  
  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);
  
  // Perform search
  const performSearch = useCallback(async () => {
    if (!query.trim()) {
      setResults([]);
      onHighlightResults?.([]);
      return;
    }
    
    setIsSearching(true);
    setSearchError(null);
    
    try {
      const searchResults = await onSearch(query, options);
      setResults(searchResults);
      setCurrentResultIndex(0);
      onHighlightResults?.(searchResults);
      
      // Navigate to first result
      if (searchResults.length > 0) {
        onResultSelect(searchResults[0]);
      }
    } catch (error) {
      console.error('Search error:', error);
      if (options.useRegex) {
        setSearchError('Invalid regular expression');
      } else {
        setSearchError('Search failed');
      }
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [query, options, onSearch, onHighlightResults, onResultSelect]);
  
  // Search on enter or debounced input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        performSearch();
      } else {
        setResults([]);
        onHighlightResults?.([]);
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [query, options, performSearch, onHighlightResults]);
  
  // Navigate to previous result
  const goToPrevious = useCallback(() => {
    if (results.length === 0) return;
    
    const newIndex = currentResultIndex > 0 ? currentResultIndex - 1 : results.length - 1;
    setCurrentResultIndex(newIndex);
    onResultSelect(results[newIndex]);
    
    // Scroll result into view
    const element = document.getElementById(`search-result-${newIndex}`);
    element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [results, currentResultIndex, onResultSelect]);
  
  // Navigate to next result
  const goToNext = useCallback(() => {
    if (results.length === 0) return;
    
    const newIndex = currentResultIndex < results.length - 1 ? currentResultIndex + 1 : 0;
    setCurrentResultIndex(newIndex);
    onResultSelect(results[newIndex]);
    
    // Scroll result into view
    const element = document.getElementById(`search-result-${newIndex}`);
    element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [results, currentResultIndex, onResultSelect]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (e.key === 'Enter') {
        if (e.shiftKey) {
          goToPrevious();
        } else {
          goToNext();
        }
      }
      
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, goToNext, goToPrevious, onClose]);
  
  // Group results by page
  const groupedResults = results.reduce((acc, result, index) => {
    const page = result.pageNumber;
    if (!acc[page]) {
      acc[page] = [];
    }
    acc[page].push({ ...result, globalIndex: index });
    return acc;
  }, {} as Record<number, (SearchResult & { globalIndex: number })[]>);
  
  // Clear search
  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setCurrentResultIndex(0);
    setSearchError(null);
    onHighlightResults?.([]);
    inputRef.current?.focus();
  }, [onHighlightResults]);
  
  // Toggle option
  const toggleOption = useCallback((key: keyof SearchOptions) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="absolute top-0 right-4 w-96 bg-white rounded-b-lg shadow-xl border border-gray-200 z-50 overflow-hidden"
    >
      {/* Search Input */}
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search in document..."
              className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {query && (
              <button
                onClick={clearSearch}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
              >
                <X size={14} className="text-gray-400" />
              </button>
            )}
          </div>
          
          <button
            onClick={() => setShowOptions(!showOptions)}
            className={`p-2 rounded-lg transition-colors ${
              showOptions || options.caseSensitive || options.wholeWord || options.useRegex
                ? 'bg-blue-100 text-blue-600'
                : 'hover:bg-gray-100 text-gray-600'
            }`}
            title="Search options"
          >
            <Settings2 size={18} />
          </button>
          
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>
        
        {/* Search Options */}
        <AnimatePresence>
          {showOptions && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-2 flex flex-wrap gap-2"
            >
              <button
                onClick={() => toggleOption('caseSensitive')}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                  options.caseSensitive
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <CaseSensitive size={14} />
                Case Sensitive
              </button>
              <button
                onClick={() => toggleOption('wholeWord')}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                  options.wholeWord
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <WholeWord size={14} />
                Whole Word
              </button>
              <button
                onClick={() => toggleOption('useRegex')}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                  options.useRegex
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Regex size={14} />
                Regex
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Results Count & Navigation */}
        {query && !isSearching && !searchError && (
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {results.length === 0 ? (
                'No results found'
              ) : (
                <>
                  <span className="font-medium">{currentResultIndex + 1}</span>
                  {' of '}
                  <span className="font-medium">{results.length}</span>
                  {' results'}
                </>
              )}
            </span>
            
            {results.length > 0 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={goToPrevious}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  title="Previous (Shift+Enter)"
                >
                  <ChevronUp size={18} />
                </button>
                <button
                  onClick={goToNext}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  title="Next (Enter)"
                >
                  <ChevronDown size={18} />
                </button>
              </div>
            )}
          </div>
        )}
        
        {/* Loading State */}
        {isSearching && (
          <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
            <Loader2 size={14} className="animate-spin" />
            Searching...
          </div>
        )}
        
        {/* Error State */}
        {searchError && (
          <div className="mt-2 text-sm text-red-600">
            {searchError}
          </div>
        )}
      </div>
      
      {/* Results List */}
      {results.length > 0 && (
        <div
          ref={resultsContainerRef}
          className="max-h-80 overflow-y-auto"
        >
          {Object.entries(groupedResults).map(([page, pageResults]) => (
            <div key={page} className="border-b border-gray-100 last:border-0">
              <div className="px-3 py-1.5 bg-gray-50 sticky top-0 flex items-center gap-2">
                <FileText size={12} className="text-gray-400" />
                <span className="text-xs font-medium text-gray-500">
                  Page {page}
                </span>
                <span className="text-xs text-gray-400">
                  ({pageResults.length} {pageResults.length === 1 ? 'result' : 'results'})
                </span>
              </div>
              
              {pageResults.map((result) => (
                <button
                  key={result.globalIndex}
                  id={`search-result-${result.globalIndex}`}
                  onClick={() => {
                    setCurrentResultIndex(result.globalIndex);
                    onResultSelect(result);
                  }}
                  className={`w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors ${
                    currentResultIndex === result.globalIndex
                      ? 'bg-blue-100 border-l-2 border-blue-500'
                      : ''
                  }`}
                >
                  <p className="text-sm text-gray-700 line-clamp-2">
                    {highlightMatch(result.context, result.text, options.caseSensitive)}
                  </p>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
      
      {/* Empty State */}
      {!query && !isSearching && results.length === 0 && (
        <div className="p-6 text-center text-gray-500">
          <Search size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">Enter a search term to find text in the document</p>
          <p className="text-xs text-gray-400 mt-1">
            Press Enter to navigate through results
          </p>
        </div>
      )}
    </motion.div>
  );
};

// Helper to highlight matching text
function highlightMatch(context: string, match: string, caseSensitive: boolean): React.ReactNode {
  const regex = new RegExp(`(${escapeRegex(match)})`, caseSensitive ? 'g' : 'gi');
  const parts = context.split(regex);
  
  return parts.map((part, i) => {
    if (part.toLowerCase() === match.toLowerCase()) {
      return (
        <mark key={i} className="bg-yellow-200 text-yellow-900 px-0.5 rounded">
          {part}
        </mark>
      );
    }
    return part;
  });
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default PDFSearchPanel;
