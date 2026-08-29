import type { AnimeSource } from '../types/anime';

export const getAnimeSourceFromUrl = (url: string): AnimeSource =>
  /animeunity\.so|vixcloud\.(?:co|ru)/i.test(url) ? 'animeunity' : 'animeworld';

export const getAnimeIdFromUrl = (url: string): string | null => {
  if (!url) return null;
  try {
    const parsedUrl = new URL(url);
    const parts = parsedUrl.pathname.split('/').filter(Boolean);
    if (parsedUrl.hostname.includes('animeunity.so')) {
      const animeIndex = parts.indexOf('anime');
      const animeSlug = animeIndex >= 0 ? parts[animeIndex + 1] : undefined;
      return animeSlug ? `animeunity:${animeSlug}` : null;
    }
    return parts.at(-1) || null;
  } catch {
    const parts = url.split('/').filter(Boolean);
    const animeIndex = parts.indexOf('anime');
    if (url.includes('animeunity.so') && animeIndex >= 0 && parts[animeIndex + 1]) {
      return `animeunity:${parts[animeIndex + 1]}`;
    }
    return parts.at(-1) || null;
  }
};
