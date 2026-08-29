import AsyncStorage from '@react-native-async-storage/async-storage';
import { Anime, AnimeDetail } from '../types/anime';
import { getAnimeEpisodeNumbers } from '../utils/episodeUtils';
import { getAnimeSourceFromUrl } from '../utils/utils';
const WATCHED_EPISODES_PREFIX = 'watched_episodes_';
const ANIME_DETAILS_PREFIX = 'anime_details_';
const WATCHLIST_PREFIX = 'watchlist_';
const getKeysWithPrefix = async (prefix: string) => {
  const allKeys = await AsyncStorage.getAllKeys();
  return allKeys.filter(key => key.startsWith(prefix));
};
export const getWatchedEpisodes = async (animeId: string): Promise<Set<number>> => {
  try {
    const jsonValue = await AsyncStorage.getItem(`${WATCHED_EPISODES_PREFIX}${animeId}`);
    return jsonValue != null ? new Set(JSON.parse(jsonValue)) : new Set();
  } catch (e) {
    console.error('Failed to fetch watched episodes from cache.', e);
    return new Set();
  }
};
export const addWatchedEpisode = async (anime: AnimeDetail, episodeNumber: number): Promise<void> => {
  try {
    const animeId = anime.id;
    const watchedEpisodes = await getWatchedEpisodes(animeId);
    watchedEpisodes.add(episodeNumber);
    const jsonValue = JSON.stringify(Array.from(watchedEpisodes));
    await AsyncStorage.setItem(`${WATCHED_EPISODES_PREFIX}${animeId}`, jsonValue);
    const detailsToCache = {
      id: anime.id,
      title: anime.title,
      image: anime.image,
      url: anime.url,
      existEpisodes: anime.existEpisodes,
      description: anime.description,
      genres: anime.genres,
      category: anime.category,
      audio: anime.audio,
      ratingText: anime.ratingText,
      viewsText: anime.viewsText,
      episodeList: anime.episodeList
    };
    await AsyncStorage.setItem(`${ANIME_DETAILS_PREFIX}${animeId}`, JSON.stringify(detailsToCache));
  } catch (e) {
    console.error('Failed to add watched episode to cache.', e);
  }
};
export const removeWatchedEpisode = async (animeId: string, episodeNumber: number): Promise<void> => {
  try {
    const watchedEpisodes = await getWatchedEpisodes(animeId);
    watchedEpisodes.delete(episodeNumber);
    if (watchedEpisodes.size === 0) {
      await AsyncStorage.removeItem(`${ANIME_DETAILS_PREFIX}${animeId}`);
    }
    const jsonValue = JSON.stringify(Array.from(watchedEpisodes));
    await AsyncStorage.setItem(`${WATCHED_EPISODES_PREFIX}${animeId}`, jsonValue);
  } catch (e) {
    console.error('Failed to remove watched episode from cache.', e);
  }
};
export const getContinueWatchingList = async (): Promise<{
  anime: Anime;
  nextEpisode: number;
}[]> => {
  try {
    const animeDetailKeys = await getKeysWithPrefix(ANIME_DETAILS_PREFIX);
    const continueWatchingList = [];
    for (const key of animeDetailKeys) {
      const animeId = key.replace(ANIME_DETAILS_PREFIX, '');
      const [detailsJson, watchedEpisodes] = await Promise.all([AsyncStorage.getItem(key), getWatchedEpisodes(animeId)]);
      if (detailsJson) {
        const anime = JSON.parse(detailsJson) as AnimeDetail;
        const episodeNumbers = getAnimeEpisodeNumbers(anime);
        const lastWatchedIndex = episodeNumbers.reduce(
          (latestIndex, episodeNumber, index) => watchedEpisodes.has(episodeNumber) ? index : latestIndex,
          -1,
        );
        const nextEpisode = episodeNumbers[lastWatchedIndex + 1];
        if (nextEpisode !== undefined) {
          continueWatchingList.push({
            anime,
            nextEpisode
          });
        }
      }
    }
    return continueWatchingList.sort((a, b) => a.anime.title.localeCompare(b.anime.title));
  } catch (e) {
    console.error('Failed to get continue watching list.', e);
    return [];
  }
};
export const isAnimeInWatchlist = async (animeId: string): Promise<boolean> => {
  try {
    const item = await AsyncStorage.getItem(`${WATCHLIST_PREFIX}${animeId}`);
    return item !== null;
  } catch (e) {
    console.error('Failed to check watchlist.', e);
    return false;
  }
};
export const addToWatchlist = async (anime: AnimeDetail): Promise<void> => {
  try {
    const jsonValue = JSON.stringify({
      ...anime,
      source: anime.source ?? getAnimeSourceFromUrl(anime.url),
    });
    await AsyncStorage.setItem(`${WATCHLIST_PREFIX}${anime.id}`, jsonValue);
  } catch (e) {
    console.error('Failed to add to watchlist.', e);
  }
};
export const removeFromWatchlist = async (animeId: string): Promise<void> => {
  try {
    await AsyncStorage.removeItem(`${WATCHLIST_PREFIX}${animeId}`);
  } catch (e) {
    console.error('Failed to remove from watchlist.', e);
  }
};
export const getWatchlist = async (): Promise<AnimeDetail[]> => {
  try {
    const watchlistKeys = await getKeysWithPrefix(WATCHLIST_PREFIX);
    const watchlistItems = await AsyncStorage.multiGet(watchlistKeys);
    const watchlist = watchlistItems.flatMap(([, value]) => {
      if (!value) return [];
      const anime = JSON.parse(value) as AnimeDetail;
      return [{
        ...anime,
        source: anime.source ?? getAnimeSourceFromUrl(anime.url),
      }];
    });
    return watchlist.sort((a, b) => a.title.localeCompare(b.title));
  } catch (e) {
    console.error('Failed to fetch watchlist.', e);
    return [];
  }
};
