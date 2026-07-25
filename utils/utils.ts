export const getAnimeIdFromUrl = (url: string): string | null => {
  if (!url) return null;
  try {
    const parts = url.split('/');
    const lastPart = parts.pop();
    const animeId = lastPart || parts.pop();
    return animeId || null;
  } catch (error) {
    console.error('Failed to extract anime ID from URL:', url, error);
    return null;
  }
};
