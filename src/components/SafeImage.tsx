/**
 * Safe Image Component
 * 
 * Robust image component with error handling, timeouts, retries, and fallbacks.
 * Prevents broken images from breaking page layout or credibility.
 */

import { useState, useEffect, useRef } from "react";
import { ImageOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallbackText?: string;
  retryCount?: number;
  timeoutMs?: number;
  showLoader?: boolean;
  placeholderClassName?: string;
}

export function SafeImage({
  src,
  alt,
  fallbackText,
  retryCount = 3,
  timeoutMs = 10000, // 10 second timeout
  showLoader = true,
  placeholderClassName,
  className,
  onError,
  onLoad,
  ...props
}: SafeImageProps) {
  const [imageSrc, setImageSrc] = useState<string>(src);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [loadTimeout, setLoadTimeout] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reset state when src changes
  useEffect(() => {
    setImageSrc(src);
    setHasError(false);
    setIsLoading(true);
    setRetryAttempt(0);
    setLoadTimeout(false);

    // Preload image to improve performance
    if (src) {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        // Image is cached and ready
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        setIsLoading(false);
      };
      img.onerror = () => {
        // Preload failed, will be handled by main img element
      };
    }

    // Clear any existing timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

      // Set timeout for image load (only if preload doesn't complete)
      if (timeoutMs > 0) {
        timeoutRef.current = setTimeout(() => {
          // Check if still loading after timeout
          if (imgRef.current && !imgRef.current.complete) {
            setLoadTimeout(true);
            setIsLoading(false);
            handleImageError();
          }
        }, timeoutMs);
      }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [src, timeoutMs]);

  const handleImageError = () => {
    // Clear timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setIsLoading(false);

    // Try retry logic (only if not timed out)
    if (!loadTimeout && retryAttempt < retryCount) {
      const nextAttempt = retryAttempt + 1;
      setRetryAttempt(nextAttempt);

      // Retry with exponential backoff (1s, 2s, 4s)
      const delay = Math.pow(2, retryAttempt) * 1000;
      
      retryTimeoutRef.current = setTimeout(() => {
        // Force reload by adding cache-busting parameter
        const separator = imageSrc.includes('?') ? '&' : '?';
        setImageSrc(`${imageSrc}${separator}_retry=${nextAttempt}&_t=${Date.now()}`);
        setIsLoading(true);
        setHasError(false);
        setLoadTimeout(false);
      }, delay);
    } else {
      // All retries exhausted or timeout occurred
      setHasError(true);
    }

    // Call original onError if provided
    if (onError) {
      onError({} as React.SyntheticEvent<HTMLImageElement, Event>);
    }
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    // Clear timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setIsLoading(false);
    setHasError(false);
    setLoadTimeout(false);

    // Call original onLoad if provided
    if (onLoad) {
      onLoad(e);
    }
  };

  // Show error placeholder
  if (hasError) {
    return (
      <div
        className={cn(
          "w-full h-full flex flex-col items-center justify-center bg-muted/50 border border-border rounded-md",
          placeholderClassName
        )}
      >
        <ImageOff className="h-8 w-8 text-muted-foreground mb-2" />
        {fallbackText && (
          <p className="text-xs text-muted-foreground text-center px-2">
            {fallbackText}
          </p>
        )}
        {!fallbackText && (
          <p className="text-xs text-muted-foreground text-center px-2">
            Image unavailable
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* Loading overlay */}
      {isLoading && showLoader && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/30 rounded-md z-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Actual image */}
      <img
        ref={imgRef}
        src={imageSrc}
        alt={alt}
        className={cn(className, isLoading && "opacity-0")}
        onError={handleImageError}
        onLoad={handleImageLoad}
        loading="lazy"
        {...props}
      />
    </div>
  );
}

