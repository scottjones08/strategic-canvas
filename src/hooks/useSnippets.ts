// useSnippets hook for Code Snippets CRUD operations

import { useState, useEffect, useCallback } from 'react';
import {
  fetchSnippets,
  fetchSnippet,
  createSnippet,
  updateSnippet,
  deleteSnippet,
  searchSnippets,
  getAllTags,
  checkApiStatus,
} from '../lib/snippets-api';
import type { CodeSnippet, CreateSnippetInput, UpdateSnippetInput } from '../types/snippets';

export function useSnippets() {
  const [snippets, setSnippets] = useState<CodeSnippet[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch all snippets
  const loadSnippets = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [snippetsData, tagsData] = await Promise.all([
        fetchSnippets(),
        getAllTags(),
      ]);
      setSnippets(snippetsData);
      setAllTags(tagsData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load snippets'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSnippets();
  }, [loadSnippets]);

  // Create snippet
  const handleCreateSnippet = useCallback(async (input: CreateSnippetInput) => {
    try {
      const snippet = await createSnippet(input);
      setSnippets((prev) => [...prev, snippet]);
      try {
        const tags = await getAllTags();
        setAllTags(tags);
      } catch (err) {
        console.error('Failed to refresh tags:', err);
      }
      return snippet;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create snippet');
      setError(error);
      return null;
    }
  }, []);

  // Update snippet
  const handleUpdateSnippet = useCallback(async (input: UpdateSnippetInput) => {
    try {
      const snippet = await updateSnippet(input);
      if (snippet) {
        setSnippets((prev) =>
          prev.map((s) => (s.id === snippet.id ? snippet : s))
        );
        try {
          const tags = await getAllTags();
          setAllTags(tags);
        } catch (err) {
          console.error('Failed to refresh tags:', err);
        }
      }
      return snippet;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update snippet');
      setError(error);
      return null;
    }
  }, []);

  // Delete snippet
  const handleDeleteSnippet = useCallback(async (id: string) => {
    try {
      const success = await deleteSnippet(id);
      if (success) {
        setSnippets((prev) => prev.filter((s) => s.id !== id));
        try {
          const tags = await getAllTags();
          setAllTags(tags);
        } catch (err) {
          console.error('Failed to refresh tags:', err);
        }
      }
      return success;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete snippet');
      setError(error);
      return false;
    }
  }, []);

  return {
    snippets,
    allTags,
    isLoading,
    error,
    refetch: loadSnippets,
    createSnippet: handleCreateSnippet,
    updateSnippet: handleUpdateSnippet,
    deleteSnippet: handleDeleteSnippet,
  };
}

export function useSnippet(id: string | null) {
  const [snippet, setSnippet] = useState<CodeSnippet | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) {
      setSnippet(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    fetchSnippet(id)
      .then(setSnippet)
      .catch((err) => setError(err instanceof Error ? err : new Error('Failed to load snippet')))
      .finally(() => setIsLoading(false));
  }, [id]);

  return { snippet, isLoading, error };
}

export function useSnippetSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CodeSnippet[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const search = useCallback(async (searchQuery: string) => {
    setQuery(searchQuery);
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const found = await searchSnippets(searchQuery);
      setResults(found);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
  }, []);

  return {
    query,
    results,
    isSearching,
    search,
    clearSearch,
  };
}

export function useApiStatus() {
  const [status, setStatus] = useState<{ connected: boolean; message: string }>({
    connected: false,
    message: 'Checking connection...',
  });

  useEffect(() => {
    let isMounted = true;

    const refreshStatus = async () => {
      try {
        const nextStatus = await checkApiStatus();
        if (isMounted) {
          setStatus(nextStatus);
        }
      } catch (err) {
        if (isMounted) {
          setStatus({ connected: false, message: 'Connection check failed' });
        }
        console.error('API status check failed:', err);
      }
    };

    refreshStatus();
    
    // Recheck every 30 seconds
    const interval = setInterval(() => {
      refreshStatus();
    }, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return status;
}

export default useSnippets;
