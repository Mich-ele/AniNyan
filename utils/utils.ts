/**
 * Extracts a unique anime identifier from its URL.
 * This is used as a key for caching watched episodes.
 * e.g., 'https://www.animesaturn.cx/anime/one-piece' -> 'one-piece'
 * @param url - The full URL of the anime details page.
 * @returns The anime ID string or null if the URL is invalid.
 */
export const getAnimeIdFromUrl = (url: string): string | null => {
  if (!url) return null;
  try {
    // Split the URL by '/' and get the last part
    const parts = url.split('/');
    const lastPart = parts.pop(); // Get the last segment, which might be empty if URL ends with /
    // If the last part was empty, get the one before it
    const animeId = lastPart || parts.pop();
    return animeId || null;
  } catch (error) {
    console.error('Failed to extract anime ID from URL:', url, error);
    return null;
  }
};
