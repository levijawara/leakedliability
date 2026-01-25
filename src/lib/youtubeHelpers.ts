/**
 * Formats a YouTube view count to a human-readable string
 * Examples:
 * - 1234 -> "1,234"
 * - 1234567 -> "1.2M"
 * - 1234567890 -> "1.2B"
 */
export function formatFullViewCount(count: number): string {
  if (count < 1000) {
    return count.toString();
  }
  
  if (count < 1_000_000) {
    return (count / 1000).toFixed(1) + 'K';
  }
  
  if (count < 1_000_000_000) {
    return (count / 1_000_000).toFixed(1) + 'M';
  }
  
  return (count / 1_000_000_000).toFixed(1) + 'B';
}
