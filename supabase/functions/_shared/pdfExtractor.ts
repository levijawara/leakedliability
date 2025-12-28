/**
 * Shared PDF Extractor Module
 * Unified PDF text extraction for both parse-queue and parse-call-sheet
 */

// Import PDF.js with Deno-compatible CDN - using consistent version
import { getDocument, GlobalWorkerOptions } from "https://esm.sh/pdfjs-dist@4.4.168/build/pdf.min.mjs";

// Disable worker since we're in a serverless environment
GlobalWorkerOptions.workerSrc = "";

export interface PDFExtractionResult {
  text: string;
  pageCount: number;
  charCount: number;
  isScanned: boolean;
  hasText: boolean;
  errors: string[];
}

/**
 * Extract text from PDF using pdfjs
 */
export async function extractTextFromPdf(pdfBytes: Uint8Array): Promise<PDFExtractionResult> {
  console.log("[pdfExtractor] Starting PDF text extraction...");
  
  const errors: string[] = [];
  
  // Verify PDF.js is loaded correctly
  if (typeof getDocument !== "function") {
    console.error("[pdfExtractor] PDF.js getDocument not available");
    throw new Error("PDF.js library not loaded correctly");
  }
  
  console.log("[pdfExtractor] PDF.js library loaded successfully");
  
  try {
    const loadingTask = getDocument({ data: pdfBytes });
    const pdf = await loadingTask.promise;
    
    const pageCount = pdf.numPages;
    console.log(`[pdfExtractor] Document loaded, ${pageCount} pages`);
    
    let fullText = "";
    let totalChars = 0;
    
    for (let i = 1; i <= pageCount; i++) {
      try {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        const pageText = textContent.items
          .map((item: unknown) => {
            const textItem = item as { str?: string };
            return textItem.str || "";
          })
          .join(" ");
        
        const pageChars = pageText.length;
        totalChars += pageChars;
        fullText += `\n--- PAGE ${i} ---\n${pageText}`;
        
        console.log(`[pdfExtractor] Page ${i}/${pageCount}: ${pageChars} chars`);
      } catch (pageError: unknown) {
        const message = pageError instanceof Error ? pageError.message : "Unknown error";
        console.warn(`[pdfExtractor] Error on page ${i}: ${message}`);
        errors.push(`Page ${i}: ${message}`);
        // Continue processing other pages
      }
    }
    
    const charCount = fullText.trim().length;
    const isScanned = charCount < 100 && pageCount > 0;
    const hasText = charCount >= 50;
    
    console.log(`[pdfExtractor] Extraction complete: ${charCount} chars, ${pageCount} pages`);
    console.log(`[pdfExtractor] isScanned: ${isScanned}, hasText: ${hasText}`);
    
    return {
      text: fullText.trim(),
      pageCount,
      charCount,
      isScanned,
      hasText,
      errors,
    };
  } catch (error: unknown) {
    console.error("[pdfExtractor] PDF extraction error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    
    // Provide helpful error messages
    if (message.includes("Invalid PDF structure") || message.includes("Invalid XRef")) {
      throw new Error("PDF file is corrupted or invalid");
    }
    if (message.includes("password")) {
      throw new Error("PDF is password-protected");
    }
    
    throw new Error(`Failed to extract PDF text: ${message}`);
  }
}

/**
 * Extract text from any file type
 */
export async function extractTextFromFile(
  fileData: Blob,
  fileName: string
): Promise<{ text: string; pageCount: number; isScanned: boolean }> {
  const lowerName = fileName.toLowerCase();
  
  // Handle text-based files
  if (lowerName.endsWith(".txt") || lowerName.endsWith(".csv")) {
    const text = await fileData.text();
    console.log(`[pdfExtractor] Text file extracted: ${text.length} chars`);
    return { text, pageCount: 1, isScanned: false };
  }
  
  // Handle PDF files
  if (lowerName.endsWith(".pdf")) {
    console.log("[pdfExtractor] Processing as PDF...");
    const pdfBytes = new Uint8Array(await fileData.arrayBuffer());
    const result = await extractTextFromPdf(pdfBytes);
    
    if (!result.hasText) {
      throw new Error("PDF has no extractable text (may be scanned/image-based)");
    }
    
    return {
      text: result.text,
      pageCount: result.pageCount,
      isScanned: result.isScanned,
    };
  }
  
  // Try to read as text for other file types
  const text = await fileData.text();
  console.log(`[pdfExtractor] Other file type extracted: ${text.length} chars`);
  return { text, pageCount: 1, isScanned: false };
}

/**
 * Compute content hash for deduplication
 */
export async function computeContentHash(content: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', content.buffer as ArrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
