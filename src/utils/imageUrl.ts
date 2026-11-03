const UNSPLASH_PREFIX = 'https://images.unsplash.com/';

/**
 * Unsplash is unreachable from some Russian ISPs, so route its images through
 * the same-origin /images proxy (Vercel in production, Vite in development).
 */
export function resolveImageUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith(UNSPLASH_PREFIX)) {
    return `/images/${url.slice(UNSPLASH_PREFIX.length)}`;
  }
  return url;
}
