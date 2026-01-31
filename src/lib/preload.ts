/**
 * Preloading utilities for lazy-loaded chunks
 * Helps improve perceived performance by loading chunks before they're needed
 */

// Track which chunks have been preloaded to avoid duplicate requests
const preloadedChunks = new Set<string>();

/**
 * Preload a lazy-loaded component chunk
 * @param importFn - The dynamic import function (e.g., () => import('./Component'))
 * @param chunkName - Optional name for tracking (for debugging)
 */
export const preloadComponent = async (
  importFn: () => Promise<unknown>,
  chunkName?: string
): Promise<void> => {
  const key = chunkName || importFn.toString();

  if (preloadedChunks.has(key)) {
    return;
  }

  preloadedChunks.add(key);

  try {
    await importFn();
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Preload] Successfully preloaded: ${chunkName || 'component'}`);
    }
  } catch (error) {
    // Remove from set so it can be retried
    preloadedChunks.delete(key);
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[Preload] Failed to preload: ${chunkName || 'component'}`, error);
    }
  }
};

/**
 * Preload PDF-related components
 * Call this when user is likely to open a PDF (e.g., hovering over document)
 */
export const preloadPDFComponents = (): void => {
  preloadComponent(() => import('../components/PDFEditor'), 'PDFEditor');
};

/**
 * Preload document-related components
 * Call this when user navigates toward documents section
 */
export const preloadDocumentComponents = (): void => {
  preloadComponent(() => import('../components/DocumentsView'), 'DocumentsView');
  preloadComponent(() => import('../components/NotesViewRedesign'), 'NotesView');
};

/**
 * Preload presentation-related components
 * Call this when user shows interest in presentation features
 */
export const preloadPresentationComponents = (): void => {
  preloadComponent(() => import('../components/PresentationMode'), 'PresentationMode');
  preloadComponent(() => import('../components/SlideOrderPanel'), 'SlideOrderPanel');
};

/**
 * Preload transcription-related components
 * Call this when user shows interest in transcription features
 */
export const preloadTranscriptionComponents = (): void => {
  preloadComponent(() => import('../components/TranscriptToWhiteboardModal'), 'TranscriptToWhiteboardModal');
};

/**
 * Preload facilitator tools
 * Call this when user is likely a meeting facilitator
 */
export const preloadFacilitatorComponents = (): void => {
  preloadComponent(() => import('../components/FacilitatorTools'), 'FacilitatorTools');
  preloadComponent(() => import('../components/AssetLibrary'), 'AssetLibrary');
};

/**
 * Higher-order function to create a hover preloader
 * Returns event handlers that can be spread onto elements
 *
 * @example
 * const preloadHandlers = createHoverPreloader(preloadPDFComponents);
 * <button {...preloadHandlers}>Open PDF</button>
 */
export const createHoverPreloader = (
  preloadFn: () => void,
  delay = 150
): {
  onMouseEnter: () => void;
  onFocus: () => void;
} => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const startPreload = () => {
    if (timeoutId) return;
    timeoutId = setTimeout(() => {
      preloadFn();
      timeoutId = null;
    }, delay);
  };

  return {
    onMouseEnter: startPreload,
    onFocus: startPreload,
  };
};

/**
 * Preload on idle - uses requestIdleCallback to preload during browser idle time
 * @param preloadFn - Function to preload components
 * @param timeout - Maximum time to wait for idle (default 2000ms)
 */
export const preloadOnIdle = (preloadFn: () => void, timeout = 2000): void => {
  if ('requestIdleCallback' in window) {
    (window as Window & { requestIdleCallback: (cb: () => void, opts: { timeout: number }) => number }).requestIdleCallback(
      preloadFn,
      { timeout }
    );
  } else {
    // Fallback for Safari and older browsers
    setTimeout(preloadFn, 100);
  }
};

/**
 * Preload components based on likely next user actions
 * Call this after the app has loaded and is idle
 */
export const preloadLikelyNextComponents = (): void => {
  // Use idle time to preload commonly used components
  preloadOnIdle(() => {
    // Preload presentation mode - commonly used
    preloadPresentationComponents();
  }, 3000);

  preloadOnIdle(() => {
    // Preload facilitator tools after a delay
    preloadFacilitatorComponents();
  }, 5000);
};

export default {
  preloadComponent,
  preloadPDFComponents,
  preloadDocumentComponents,
  preloadPresentationComponents,
  preloadTranscriptionComponents,
  preloadFacilitatorComponents,
  createHoverPreloader,
  preloadOnIdle,
  preloadLikelyNextComponents,
};
