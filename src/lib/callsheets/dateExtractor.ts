// Extract dates from call sheet text content

/**
 * Common date patterns found in call sheets
 */
const DATE_PATTERNS = [
  // MM/DD/YYYY or MM-DD-YYYY
  /\b(0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12]\d|3[01])[\/\-](20\d{2})\b/g,
  
  // YYYY-MM-DD (ISO format)
  /\b(20\d{2})-(0?[1-9]|1[0-2])-(0?[1-9]|[12]\d|3[01])\b/g,
  
  // Month DD, YYYY
  /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(0?[1-9]|[12]\d|3[01]),?\s+(20\d{2})\b/gi,
  
  // Mon DD, YYYY (abbreviated)
  /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+(0?[1-9]|[12]\d|3[01]),?\s+(20\d{2})\b/gi,
  
  // DD Month YYYY
  /\b(0?[1-9]|[12]\d|3[01])\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})\b/gi,
];

/**
 * Month name to number mapping
 */
const MONTH_MAP: Record<string, number> = {
  january: 1, jan: 1,
  february: 2, feb: 2,
  march: 3, mar: 3,
  april: 4, apr: 4,
  may: 5,
  june: 6, jun: 6,
  july: 7, jul: 7,
  august: 8, aug: 8,
  september: 9, sep: 9, sept: 9,
  october: 10, oct: 10,
  november: 11, nov: 11,
  december: 12, dec: 12,
};

export interface ExtractedDate {
  date: Date;
  original: string;
  format: string;
  confidence: number;
}

/**
 * Parse a date string into a Date object
 */
function parseDate(match: string): Date | null {
  // Try ISO format first
  const isoMatch = match.match(/^(20\d{2})-(0?[1-9]|1[0-2])-(0?[1-9]|[12]\d|3[01])$/);
  if (isoMatch) {
    return new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
  }
  
  // Try MM/DD/YYYY or MM-DD-YYYY
  const usMatch = match.match(/^(0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12]\d|3[01])[\/\-](20\d{2})$/);
  if (usMatch) {
    return new Date(parseInt(usMatch[3]), parseInt(usMatch[1]) - 1, parseInt(usMatch[2]));
  }
  
  // Try Month DD, YYYY
  const monthMatch = match.match(/^(\w+)\.?\s+(0?[1-9]|[12]\d|3[01]),?\s+(20\d{2})$/i);
  if (monthMatch) {
    const month = MONTH_MAP[monthMatch[1].toLowerCase()];
    if (month) {
      return new Date(parseInt(monthMatch[3]), month - 1, parseInt(monthMatch[2]));
    }
  }
  
  // Try DD Month YYYY
  const dayFirstMatch = match.match(/^(0?[1-9]|[12]\d|3[01])\s+(\w+)\s+(20\d{2})$/i);
  if (dayFirstMatch) {
    const month = MONTH_MAP[dayFirstMatch[2].toLowerCase()];
    if (month) {
      return new Date(parseInt(dayFirstMatch[3]), month - 1, parseInt(dayFirstMatch[1]));
    }
  }
  
  return null;
}

/**
 * Extract all dates from text content
 */
export function extractDates(text: string): ExtractedDate[] {
  const dates: ExtractedDate[] = [];
  const seen = new Set<string>();
  
  for (const pattern of DATE_PATTERNS) {
    let match;
    // Reset regex lastIndex
    pattern.lastIndex = 0;
    
    while ((match = pattern.exec(text)) !== null) {
      const original = match[0];
      if (seen.has(original)) continue;
      seen.add(original);
      
      const date = parseDate(original);
      if (date && !isNaN(date.getTime())) {
        // Validate date is reasonable (not in far future or past)
        const now = new Date();
        const yearDiff = Math.abs(date.getFullYear() - now.getFullYear());
        
        if (yearDiff <= 5) {
          dates.push({
            date,
            original,
            format: detectFormat(original),
            confidence: calculateConfidence(original, text),
          });
        }
      }
    }
  }
  
  // Sort by confidence descending
  return dates.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Detect the date format used
 */
function detectFormat(dateStr: string): string {
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(dateStr)) return 'ISO';
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) return 'US-SLASH';
  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(dateStr)) return 'US-DASH';
  if (/^[A-Za-z]+\.?\s+\d{1,2},?\s+\d{4}$/i.test(dateStr)) return 'LONG';
  if (/^\d{1,2}\s+[A-Za-z]+\s+\d{4}$/i.test(dateStr)) return 'DAY-FIRST';
  return 'UNKNOWN';
}

/**
 * Calculate confidence score for a date extraction
 */
function calculateConfidence(dateStr: string, fullText: string): number {
  let confidence = 0.5;
  
  // Check for nearby context keywords
  const contextPatterns = [
    { pattern: /call\s*sheet/i, boost: 0.2 },
    { pattern: /shooting\s*date/i, boost: 0.3 },
    { pattern: /production\s*date/i, boost: 0.2 },
    { pattern: /day\s*\d+/i, boost: 0.15 },
    { pattern: /shoot\s*day/i, boost: 0.2 },
  ];
  
  // Find the position of the date in the text
  const datePos = fullText.indexOf(dateStr);
  if (datePos >= 0) {
    // Look at surrounding context (100 chars before and after)
    const contextStart = Math.max(0, datePos - 100);
    const contextEnd = Math.min(fullText.length, datePos + dateStr.length + 100);
    const context = fullText.slice(contextStart, contextEnd);
    
    for (const { pattern, boost } of contextPatterns) {
      if (pattern.test(context)) {
        confidence += boost;
      }
    }
  }
  
  // Prefer dates at the top of the document
  const relativePosition = datePos / fullText.length;
  if (relativePosition < 0.2) confidence += 0.1;
  
  return Math.min(1, confidence);
}

/**
 * Get the most likely production date from text
 */
export function getPrimaryDate(text: string): ExtractedDate | null {
  const dates = extractDates(text);
  return dates.length > 0 ? dates[0] : null;
}

/**
 * Format a date for display
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
