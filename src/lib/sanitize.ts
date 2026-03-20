/**
 * HTML Sanitization utility
 * Wraps DOMPurify to prevent XSS from user-generated HTML content
 */
import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content, removing dangerous tags/attributes (scripts, onerror, etc.)
 * Safe for use with dangerouslySetInnerHTML
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    USE_PROFILES: { html: true },
    ALLOWED_TAGS: [
      'b', 'i', 'em', 'strong', 'u', 's', 'a', 'p', 'br', 'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code',
      'table', 'thead', 'tbody', 'tr', 'th', 'td', 'div', 'span', 'img',
      'hr', 'sub', 'sup', 'mark', 'details', 'summary',
    ],
    ALLOWED_ATTR: [
      'href', 'target', 'rel', 'src', 'alt', 'title', 'class', 'style',
      'width', 'height', 'colspan', 'rowspan',
    ],
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * Strip ALL HTML tags — returns plain text only
 */
export function stripHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [] });
}
