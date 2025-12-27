import { ExternalLink } from "lucide-react";

interface InstagramLinkProps {
  handle: string | null | undefined;
  className?: string;
  showIcon?: boolean;
}

export function InstagramLink({ handle, className = "", showIcon = true }: InstagramLinkProps) {
  if (!handle) return null;

  // Clean handle - remove @ if present
  const cleanHandle = handle.startsWith("@") ? handle.slice(1) : handle;
  const displayHandle = `@${cleanHandle}`;
  const url = `https://instagram.com/${cleanHandle}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 text-primary hover:text-primary/80 hover:underline transition-colors ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {displayHandle}
      {showIcon && <ExternalLink className="h-3 w-3" />}
    </a>
  );
}
