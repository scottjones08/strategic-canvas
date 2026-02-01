/**
 * AssetLibrary Component
 * 
 * A modal/drawer with tabs for searching and inserting visual assets:
 * - Unsplash: Search and insert high-quality images
 * - GIPHY: Search and insert animated GIFs
 * - Icons: Search and insert icons via Iconify API
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Search,
  Image,
  Smile,
  Sparkles,
  Loader2,
  ExternalLink,
  Download,
  Check,
  AlertCircle,
  Palette,
  Grid3X3,
  LayoutGrid,
} from 'lucide-react';

// API Configuration
const UNSPLASH_BASE_URL = 'https://api.unsplash.com';
const GIPHY_BASE_URL = 'https://api.giphy.com/v1/gifs';
const ICONIFY_BASE_URL = 'https://api.iconify.design';

// Types
interface UnsplashImage {
  id: string;
  urls: {
    thumb: string;
    small: string;
    regular: string;
    full: string;
  };
  alt_description: string;
  user: {
    name: string;
    links: { html: string };
  };
  width: number;
  height: number;
  color: string;
}

interface GiphyGif {
  id: string;
  title: string;
  images: {
    fixed_height: { url: string; width: string; height: string };
    original: { url: string; width: string; height: string };
    preview_gif: { url: string };
  };
  user?: { display_name: string };
}

interface IconifySearchResult {
  icons: string[];
  total: number;
}

interface AssetInsertPayload {
  type: 'image' | 'gif' | 'icon';
  url: string;
  thumbnail?: string;
  width: number;
  height: number;
  title: string;
  attribution?: string;
  color?: string;
}

interface AssetLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertAsset: (asset: AssetInsertPayload) => void;
}

type TabType = 'unsplash' | 'giphy' | 'icons';

// Popular icon collections for quick access
const ICON_COLLECTIONS = [
  { prefix: 'lucide', name: 'Lucide' },
  { prefix: 'heroicons', name: 'Heroicons' },
  { prefix: 'mdi', name: 'Material Design' },
  { prefix: 'ph', name: 'Phosphor' },
  { prefix: 'tabler', name: 'Tabler' },
  { prefix: 'fluent', name: 'Fluent' },
];

// Icon colors for SVG icons
const ICON_COLORS = [
  '#000000', // Black
  '#4B5563', // Gray
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
];

export default function AssetLibrary({
  isOpen,
  onClose,
  onInsertAsset,
}: AssetLibraryProps) {
  // State
  const [activeTab, setActiveTab] = useState<TabType>('unsplash');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Results state
  const [unsplashResults, setUnsplashResults] = useState<UnsplashImage[]>([]);
  const [giphyResults, setGiphyResults] = useState<GiphyGif[]>([]);
  const [iconResults, setIconResults] = useState<string[]>([]);
  const [selectedIconCollection, setSelectedIconCollection] = useState('lucide');
  const [selectedIconColor, setSelectedIconColor] = useState('#000000');

  // Pagination
  const [unsplashPage, setUnsplashPage] = useState(1);
  const [giphyOffset, setGiphyOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Recently inserted
  const [recentlyInserted, setRecentlyInserted] = useState<string[]>([]);

  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get API keys from environment
  const unsplashKey = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;
  const giphyKey = import.meta.env.VITE_GIPHY_API_KEY;

  // Focus search on open
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen, activeTab]);

  // Reset state when tab changes
  useEffect(() => {
    setSearchQuery('');
    setError(null);
    setUnsplashResults([]);
    setGiphyResults([]);
    setIconResults([]);
    setUnsplashPage(1);
    setGiphyOffset(0);
    setHasMore(true);
  }, [activeTab]);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!searchQuery.trim()) {
      setUnsplashResults([]);
      setGiphyResults([]);
      setIconResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      if (activeTab === 'unsplash') {
        searchUnsplash(searchQuery, 1);
      } else if (activeTab === 'giphy') {
        searchGiphy(searchQuery, 0);
      } else if (activeTab === 'icons') {
        searchIcons(searchQuery);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, activeTab, selectedIconCollection]);

  // Unsplash search
  const searchUnsplash = useCallback(async (query: string, page: number) => {
    if (!unsplashKey) {
      setError('Unsplash API key not configured. Add VITE_UNSPLASH_ACCESS_KEY to your .env file.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${UNSPLASH_BASE_URL}/search/photos?query=${encodeURIComponent(query)}&page=${page}&per_page=20`,
        {
          headers: {
            Authorization: `Client-ID ${unsplashKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Unsplash API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (page === 1) {
        setUnsplashResults(data.results);
      } else {
        setUnsplashResults(prev => [...prev, ...data.results]);
      }
      
      setUnsplashPage(page);
      setHasMore(data.total_pages > page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search Unsplash');
    } finally {
      setIsLoading(false);
    }
  }, [unsplashKey]);

  // GIPHY search
  const searchGiphy = useCallback(async (query: string, offset: number) => {
    if (!giphyKey) {
      setError('GIPHY API key not configured. Add VITE_GIPHY_API_KEY to your .env file.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${GIPHY_BASE_URL}/search?api_key=${giphyKey}&q=${encodeURIComponent(query)}&limit=20&offset=${offset}&rating=g`
      );

      if (!response.ok) {
        throw new Error(`GIPHY API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (offset === 0) {
        setGiphyResults(data.data);
      } else {
        setGiphyResults(prev => [...prev, ...data.data]);
      }
      
      setGiphyOffset(offset);
      setHasMore(data.pagination.total_count > offset + data.data.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search GIPHY');
    } finally {
      setIsLoading(false);
    }
  }, [giphyKey]);

  // Iconify search
  const searchIcons = useCallback(async (query: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Search within the selected collection
      const response = await fetch(
        `${ICONIFY_BASE_URL}/search?query=${encodeURIComponent(query)}&prefix=${selectedIconCollection}&limit=48`
      );

      if (!response.ok) {
        throw new Error(`Iconify API error: ${response.status}`);
      }

      const data: IconifySearchResult = await response.json();
      setIconResults(data.icons || []);
      setHasMore(false); // Iconify doesn't paginate the same way
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search icons');
    } finally {
      setIsLoading(false);
    }
  }, [selectedIconCollection]);

  // Load more handlers
  const loadMoreUnsplash = () => {
    if (!isLoading && hasMore && searchQuery) {
      searchUnsplash(searchQuery, unsplashPage + 1);
    }
  };

  const loadMoreGiphy = () => {
    if (!isLoading && hasMore && searchQuery) {
      searchGiphy(searchQuery, giphyOffset + 20);
    }
  };

  // Insert handlers
  const handleInsertUnsplash = (image: UnsplashImage) => {
    const asset: AssetInsertPayload = {
      type: 'image',
      url: image.urls.regular,
      thumbnail: image.urls.small,
      width: Math.min(image.width, 600),
      height: Math.min(image.height, 400),
      title: image.alt_description || 'Unsplash Image',
      attribution: `Photo by ${image.user.name} on Unsplash`,
      color: image.color,
    };
    
    onInsertAsset(asset);
    setRecentlyInserted(prev => [image.id, ...prev.slice(0, 9)]);
  };

  const handleInsertGiphy = (gif: GiphyGif) => {
    const width = parseInt(gif.images.fixed_height.width, 10);
    const height = parseInt(gif.images.fixed_height.height, 10);
    
    const asset: AssetInsertPayload = {
      type: 'gif',
      url: gif.images.original.url,
      thumbnail: gif.images.preview_gif.url,
      width: Math.min(width, 400),
      height: Math.min(height, 300),
      title: gif.title || 'GIF',
      attribution: gif.user?.display_name ? `By ${gif.user.display_name}` : 'GIPHY',
    };
    
    onInsertAsset(asset);
    setRecentlyInserted(prev => [gif.id, ...prev.slice(0, 9)]);
  };

  const handleInsertIcon = async (iconName: string) => {
    try {
      // Fetch the SVG from Iconify
      const [prefix, name] = iconName.includes(':') 
        ? iconName.split(':') 
        : [selectedIconCollection, iconName];
      
      const response = await fetch(
        `${ICONIFY_BASE_URL}/${prefix}/${name}.svg?color=${encodeURIComponent(selectedIconColor)}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch icon');
      }
      
      const svgText = await response.text();
      
      // Create a data URL for the SVG
      const svgBase64 = btoa(unescape(encodeURIComponent(svgText)));
      const dataUrl = `data:image/svg+xml;base64,${svgBase64}`;
      
      const asset: AssetInsertPayload = {
        type: 'icon',
        url: dataUrl,
        width: 80,
        height: 80,
        title: name,
        color: selectedIconColor,
      };
      
      onInsertAsset(asset);
      setRecentlyInserted(prev => [iconName, ...prev.slice(0, 9)]);
    } catch (err) {
      setError('Failed to insert icon');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[200] p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-navy-600 rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Asset Library</h2>
                <p className="text-sm text-gray-500">Search and insert images, GIFs, and icons</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            {[
              { id: 'unsplash' as TabType, label: 'Photos', icon: Image, color: 'indigo' },
              { id: 'giphy' as TabType, label: 'GIFs', icon: Smile, color: 'green' },
              { id: 'icons' as TabType, label: 'Icons', icon: Grid3X3, color: 'purple' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-6 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                  activeTab === tab.id
                    ? `text-${tab.color}-700 border-b-2 border-${tab.color}-600 bg-${tab.color}-50`
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search & Filters */}
          <div className="px-6 py-4 border-b border-gray-100 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={`Search ${activeTab === 'unsplash' ? 'photos' : activeTab === 'giphy' ? 'GIFs' : 'icons'}...`}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent transition-all"
              />
              {isLoading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-500 animate-spin" />
              )}
            </div>

            {/* Icon-specific filters */}
            {activeTab === 'icons' && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4 text-gray-400" />
                  <select
                    value={selectedIconCollection}
                    onChange={e => setSelectedIconCollection(e.target.value)}
                    className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
                  >
                    {ICON_COLLECTIONS.map(col => (
                      <option key={col.prefix} value={col.prefix}>
                        {col.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-gray-400" />
                  <div className="flex gap-1">
                    {ICON_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => setSelectedIconColor(color)}
                        className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                          selectedIconColor === color ? 'border-gray-800 scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Error display */}
          {error && (
            <div className="mx-6 mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Results Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Empty state */}
            {!searchQuery && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">
                  Search for {activeTab === 'unsplash' ? 'photos' : activeTab === 'giphy' ? 'GIFs' : 'icons'}
                </h3>
                <p className="text-gray-500 text-sm">
                  {activeTab === 'unsplash' && 'High-quality images from Unsplash'}
                  {activeTab === 'giphy' && 'Animated GIFs to make your board fun'}
                  {activeTab === 'icons' && 'Thousands of icons from popular collections'}
                </p>
              </div>
            )}

            {/* Unsplash Results */}
            {activeTab === 'unsplash' && unsplashResults.length > 0 && (
              <>
                <div className="grid grid-cols-3 gap-4">
                  {unsplashResults.map(image => (
                    <motion.button
                      key={image.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleInsertUnsplash(image)}
                      className="relative aspect-[4/3] rounded-xl overflow-hidden group bg-gray-100"
                      style={{ backgroundColor: image.color }}
                    >
                      <img
                        src={image.urls.small}
                        alt={image.alt_description || ''}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="absolute bottom-2 left-2 right-2">
                          <p className="text-white text-xs truncate">
                            📷 {image.user.name}
                          </p>
                        </div>
                        <div className="absolute top-2 right-2">
                          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg">
                            <Download className="w-4 h-4 text-navy-700" />
                          </div>
                        </div>
                      </div>
                      {recentlyInserted.includes(image.id) && (
                        <div className="absolute top-2 left-2 px-2 py-1 bg-green-500 text-white text-xs rounded-full flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Added
                        </div>
                      )}
                    </motion.button>
                  ))}
                </div>

                {hasMore && (
                  <div className="mt-6 text-center">
                    <button
                      onClick={loadMoreUnsplash}
                      disabled={isLoading}
                      className="px-6 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium text-gray-700 disabled:opacity-50"
                    >
                      {isLoading ? 'Loading...' : 'Load More'}
                    </button>
                  </div>
                )}
              </>
            )}

            {/* GIPHY Results */}
            {activeTab === 'giphy' && giphyResults.length > 0 && (
              <>
                <div className="grid grid-cols-3 gap-4">
                  {giphyResults.map(gif => (
                    <motion.button
                      key={gif.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleInsertGiphy(gif)}
                      className="relative aspect-video rounded-xl overflow-hidden group bg-gray-900"
                    >
                      <img
                        src={gif.images.fixed_height.url}
                        alt={gif.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="absolute bottom-2 left-2 right-2">
                          <p className="text-white text-xs truncate">
                            {gif.title || 'GIF'}
                          </p>
                        </div>
                        <div className="absolute top-2 right-2">
                          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg">
                            <Download className="w-4 h-4 text-green-600" />
                          </div>
                        </div>
                      </div>
                      {recentlyInserted.includes(gif.id) && (
                        <div className="absolute top-2 left-2 px-2 py-1 bg-green-500 text-white text-xs rounded-full flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Added
                        </div>
                      )}
                    </motion.button>
                  ))}
                </div>

                {hasMore && (
                  <div className="mt-6 text-center">
                    <button
                      onClick={loadMoreGiphy}
                      disabled={isLoading}
                      className="px-6 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium text-gray-700 disabled:opacity-50"
                    >
                      {isLoading ? 'Loading...' : 'Load More'}
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Icon Results */}
            {activeTab === 'icons' && iconResults.length > 0 && (
              <div className="grid grid-cols-8 gap-3">
                {iconResults.map(iconName => (
                  <motion.button
                    key={iconName}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleInsertIcon(iconName)}
                    className={`aspect-square rounded-xl border-2 flex items-center justify-center p-3 transition-all hover:shadow-lg ${
                      recentlyInserted.includes(iconName)
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-navy-300 bg-white'
                    }`}
                    title={iconName}
                  >
                    <img
                      src={`${ICONIFY_BASE_URL}/${iconName}.svg?color=${encodeURIComponent(selectedIconColor)}`}
                      alt={iconName}
                      className="w-8 h-8"
                      loading="lazy"
                    />
                  </motion.button>
                ))}
              </div>
            )}

            {/* No results */}
            {searchQuery && !isLoading && (
              (activeTab === 'unsplash' && unsplashResults.length === 0) ||
              (activeTab === 'giphy' && giphyResults.length === 0) ||
              (activeTab === 'icons' && iconResults.length === 0)
            ) && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No results found</h3>
                <p className="text-gray-500 text-sm">
                  Try a different search term
                </p>
              </div>
            )}
          </div>

          {/* Footer with attributions */}
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs text-gray-400">
              {activeTab === 'unsplash' && (
                <a
                  href="https://unsplash.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-gray-600"
                >
                  Powered by Unsplash
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {activeTab === 'giphy' && (
                <a
                  href="https://giphy.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-gray-600"
                >
                  Powered by GIPHY
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {activeTab === 'icons' && (
                <a
                  href="https://iconify.design"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-gray-600"
                >
                  Powered by Iconify
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <p className="text-xs text-gray-400">
              Click any item to add it to your canvas
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Export types
export type { AssetLibraryProps, AssetInsertPayload };
