import AsyncStorage from '@react-native-async-storage/async-storage';
import { Anime, AnimeDetail } from '../types/anime';

const WATCHED_EPISODES_PREFIX = 'watched_episodes_';
const ANIME_DETAILS_PREFIX = 'anime_details_';
const WATCHLIST_PREFIX = 'watchlist_';

// Helper to get all keys with a specific prefix
const getKeysWithPrefix = async (prefix: string) => {
  const allKeys = await AsyncStorage.getAllKeys();
  return allKeys.filter(key => key.startsWith(prefix));
};

// Get watched episodes for a single anime
export const getWatchedEpisodes = async (animeId: string): Promise<Set<number>> => {
  try {
    const jsonValue = await AsyncStorage.getItem(`${WATCHED_EPISODES_PREFIX}${animeId}`);
    return jsonValue != null ? new Set(JSON.parse(jsonValue)) : new Set();
  } catch (e) {
    console.error('Failed to fetch watched episodes from cache.', e);
    return new Set();
  }
};

// Add a watched episode for an anime
export const addWatchedEpisode = async (anime: AnimeDetail, episodeNumber: number): Promise<void> => {
  try {
    const animeId = anime.id;
    const watchedEpisodes = await getWatchedEpisodes(animeId);
    watchedEpisodes.add(episodeNumber);
    const jsonValue = JSON.stringify(Array.from(watchedEpisodes));
    await AsyncStorage.setItem(`${WATCHED_EPISODES_PREFIX}${animeId}`, jsonValue);
    
    // Also cache anime details for the continue watching list
    const detailsToCache = {
      id: anime.id,
      title: anime.title,
      image: anime.image,
      url: anime.url,
      existEpisodes: anime.existEpisodes,
    };
    await AsyncStorage.setItem(`${ANIME_DETAILS_PREFIX}${animeId}`, JSON.stringify(detailsToCache));

  } catch (e) {
    console.error('Failed to add watched episode to cache.', e);
  }
};

// Remove a watched episode for an anime
export const removeWatchedEpisode = async (animeId: string, episodeNumber: number): Promise<void> => {
  try {
    const watchedEpisodes = await getWatchedEpisodes(animeId);
    watchedEpisodes.delete(episodeNumber);

    // If the list of watched episodes is now empty, remove the anime details as well
    if (watchedEpisodes.size === 0) {
      await AsyncStorage.removeItem(`${ANIME_DETAILS_PREFIX}${animeId}`);
    }

    const jsonValue = JSON.stringify(Array.from(watchedEpisodes));
    await AsyncStorage.setItem(`${WATCHED_EPISODES_PREFIX}${animeId}`, jsonValue);
  } catch (e) {
    console.error('Failed to remove watched episode from cache.', e);
  }
};

// Get list of animes to continue watching
export const getContinueWatchingList = async (): Promise<{ anime: Anime; nextEpisode: number }[]> => {
  try {
    const animeDetailKeys = await getKeysWithPrefix(ANIME_DETAILS_PREFIX);
    const continueWatchingList = [];

    for (const key of animeDetailKeys) {
      const animeId = key.replace(ANIME_DETAILS_PREFIX, '');
      const [detailsJson, watchedEpisodes] = await Promise.all([
        AsyncStorage.getItem(key),
        getWatchedEpisodes(animeId),
      ]);

      if (detailsJson) {
        const anime: Anime = JSON.parse(detailsJson);
        const lastWatched = Math.max(0, ...Array.from(watchedEpisodes));
        const nextEpisode = lastWatched + 1;

        if (anime.existEpisodes && nextEpisode <= anime.existEpisodes) {
          continueWatchingList.push({ anime, nextEpisode });
        }
      }
    }

    return continueWatchingList.sort((a, b) => a.anime.title.localeCompare(b.anime.title));
  } catch (e) {
    console.error('Failed to get continue watching list.', e);
    return [];
  }
};

// Check if an anime is in the watchlist
export const isAnimeInWatchlist = async (animeId: string): Promise<boolean> => {
  try {
    const item = await AsyncStorage.getItem(`${WATCHLIST_PREFIX}${animeId}`);
    return item !== null;
  } catch (e) {
    console.error('Failed to check watchlist.', e);
    return false;
  }
};

// Add an anime to the watchlist
export const addToWatchlist = async (anime: AnimeDetail): Promise<void> => {
  try {
    const jsonValue = JSON.stringify(anime);
    await AsyncStorage.setItem(`${WATCHLIST_PREFIX}${anime.id}`, jsonValue);
  } catch (e) {
    console.error('Failed to add to watchlist.', e);
  }
};

// Remove an anime from the watchlist
export const removeFromWatchlist = async (animeId: string): Promise<void> => {
  try {
    await AsyncStorage.removeItem(`${WATCHLIST_PREFIX}${animeId}`);
  } catch (e) {
    console.error('Failed to remove from watchlist.', e);
  }
};

// Get all anime from the watchlist
export const getWatchlist = async (): Promise<AnimeDetail[]> => {
  try {
    const watchlistKeys = await getKeysWithPrefix(WATCHLIST_PREFIX);
    const watchlistItems = await AsyncStorage.multiGet(watchlistKeys);
    const watchlist = watchlistItems.map(([key, value]) => JSON.parse(value!));
    return watchlist.sort((a, b) => a.title.localeCompare(b.title));
  } catch (e) {
    console.error('Failed to fetch watchlist.', e);
    return [];
  }
};
