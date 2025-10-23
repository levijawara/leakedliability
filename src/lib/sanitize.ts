import DOMPurify from "dompurify";

/**
 * Sanitizes HTML content to prevent XSS attacks
 * Strips all HTML tags by default for maximum security
 */
export function sanitizeHtml(input: string): string {
  if (!input) return "";
  
  // Strip all HTML tags for maximum security
  return DOMPurify.sanitize(input, { 
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });
}

/**
 * Sanitizes text input by trimming and removing potential XSS vectors
 * Use this for all user-generated text content
 */
export function sanitizeText(input: string): string {
  if (!input) return "";
  
  return sanitizeHtml(input.trim());
}
