// Snippets API client for Mission Control integration
// Falls back to localStorage if API is unavailable

import type { CodeSnippet, CreateSnippetInput, UpdateSnippetInput } from '../types/snippets';

const MISSION_CONTROL_API = 'http://localhost:3001/api/v1';
const LOCAL_STORAGE_KEY = 'strategic_canvas_snippets';

// Check if Mission Control API is available
async function isApiAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${MISSION_CONTROL_API}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

// LocalStorage helpers
function getLocalSnippets(): CodeSnippet[] {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveLocalSnippets(snippets: CodeSnippet[]): void {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(snippets));
}

function generateId(): string {
  return `snippet_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

// API Methods
export async function fetchSnippets(): Promise<CodeSnippet[]> {
  const apiAvailable = await isApiAvailable();
  
  if (apiAvailable) {
    try {
      const response = await fetch(`${MISSION_CONTROL_API}/snippets`);
      if (response.ok) {
        const data = await response.json();
        // Sync to localStorage for offline access
        saveLocalSnippets(data);
        return data;
      }
    } catch (error) {
      console.warn('API fetch failed, falling back to localStorage:', error);
    }
  }
  
  return getLocalSnippets();
}

export async function fetchSnippet(id: string): Promise<CodeSnippet | null> {
  const apiAvailable = await isApiAvailable();
  
  if (apiAvailable) {
    try {
      const response = await fetch(`${MISSION_CONTROL_API}/snippets/${id}`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn('API fetch failed, falling back to localStorage:', error);
    }
  }
  
  const snippets = getLocalSnippets();
  return snippets.find((s) => s.id === id) || null;
}

export async function createSnippet(input: CreateSnippetInput): Promise<CodeSnippet> {
  const apiAvailable = await isApiAvailable();
  const now = new Date().toISOString();
  
  if (apiAvailable) {
    try {
      const response = await fetch(`${MISSION_CONTROL_API}/snippets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (response.ok) {
        const snippet = await response.json();
        // Update localStorage
        const snippets = getLocalSnippets();
        snippets.push(snippet);
        saveLocalSnippets(snippets);
        return snippet;
      }
    } catch (error) {
      console.warn('API create failed, falling back to localStorage:', error);
    }
  }
  
  // LocalStorage fallback
  const snippet: CodeSnippet = {
    id: generateId(),
    ...input,
    createdAt: now,
    updatedAt: now,
  };
  
  const snippets = getLocalSnippets();
  snippets.push(snippet);
  saveLocalSnippets(snippets);
  
  return snippet;
}

export async function updateSnippet(input: UpdateSnippetInput): Promise<CodeSnippet | null> {
  const apiAvailable = await isApiAvailable();
  const now = new Date().toISOString();
  
  if (apiAvailable) {
    try {
      const response = await fetch(`${MISSION_CONTROL_API}/snippets/${input.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (response.ok) {
        const snippet = await response.json();
        // Update localStorage
        const snippets = getLocalSnippets();
        const index = snippets.findIndex((s) => s.id === input.id);
        if (index !== -1) {
          snippets[index] = snippet;
          saveLocalSnippets(snippets);
        }
        return snippet;
      }
    } catch (error) {
      console.warn('API update failed, falling back to localStorage:', error);
    }
  }
  
  // LocalStorage fallback
  const snippets = getLocalSnippets();
  const index = snippets.findIndex((s) => s.id === input.id);
  
  if (index === -1) return null;
  
  const updatedSnippet: CodeSnippet = {
    ...snippets[index],
    ...input,
    updatedAt: now,
  };
  
  snippets[index] = updatedSnippet;
  saveLocalSnippets(snippets);
  
  return updatedSnippet;
}

export async function deleteSnippet(id: string): Promise<boolean> {
  const apiAvailable = await isApiAvailable();
  
  if (apiAvailable) {
    try {
      const response = await fetch(`${MISSION_CONTROL_API}/snippets/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        // Update localStorage
        const snippets = getLocalSnippets();
        const filtered = snippets.filter((s) => s.id !== id);
        saveLocalSnippets(filtered);
        return true;
      }
    } catch (error) {
      console.warn('API delete failed, falling back to localStorage:', error);
    }
  }
  
  // LocalStorage fallback
  const snippets = getLocalSnippets();
  const filtered = snippets.filter((s) => s.id !== id);
  
  if (filtered.length === snippets.length) return false;
  
  saveLocalSnippets(filtered);
  return true;
}

export async function searchSnippets(query: string): Promise<CodeSnippet[]> {
  const snippets = await fetchSnippets();
  const lowerQuery = query.toLowerCase();
  
  return snippets.filter((snippet) =>
    snippet.title.toLowerCase().includes(lowerQuery) ||
    snippet.description.toLowerCase().includes(lowerQuery) ||
    snippet.code.toLowerCase().includes(lowerQuery) ||
    snippet.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)) ||
    snippet.language.toLowerCase().includes(lowerQuery)
  );
}

export async function getSnippetsByTag(tag: string): Promise<CodeSnippet[]> {
  const snippets = await fetchSnippets();
  return snippets.filter((snippet) =>
    snippet.tags.some((t) => t.toLowerCase() === tag.toLowerCase())
  );
}

export async function getSnippetsByLanguage(language: string): Promise<CodeSnippet[]> {
  const snippets = await fetchSnippets();
  return snippets.filter((snippet) =>
    snippet.language.toLowerCase() === language.toLowerCase()
  );
}

// Get all unique tags from snippets
export async function getAllTags(): Promise<string[]> {
  const snippets = await fetchSnippets();
  const tagSet = new Set<string>();
  
  snippets.forEach((snippet) => {
    snippet.tags.forEach((tag) => tagSet.add(tag));
  });
  
  return Array.from(tagSet).sort();
}

// Check API connection status
export async function checkApiStatus(): Promise<{ connected: boolean; message: string }> {
  const available = await isApiAvailable();
  return {
    connected: available,
    message: available
      ? 'Connected to Mission Control API'
      : 'Using local storage (Mission Control API unavailable)',
  };
}
