import { Anime, AnimeDetail, HomePageSections } from '../types/anime';
import {
  fetchAnimeDetailsAnimeWorld,
  fetchEpisodeVideoUrlAnimeWorld,
  fetchHomePageSectionsAnimeWorld,
  fetchLatestEpisodesAnimeWorld,
  PagedSearchResult,
  searchAnimeWorld,
  searchAnimeWorldAdvanced,
  searchAnimeWorldAdvancedWithMeta,
} from './animeWorldService';
import {
  fetchAnimeDetailsAnimeUnity,
  fetchEpisodeVideoUrlAnimeUnity,
  fetchHomePageSectionsAnimeUnity,
  fetchLatestEpisodesAnimeUnity,
  searchAnimeUnity,
  searchAnimeUnityAdvanced,
  searchAnimeUnityAdvancedWithMeta,
} from './animeUnityService';
import { AnimeProvider, getUserPreferences } from './userPreferences';

const getPreferredProvider = async (): Promise<AnimeProvider> => {
  const preferences = await getUserPreferences();
  return preferences.animeProvider;
};

const getProviderFromUrl = (url: string): AnimeProvider =>
  /animeunity\.so|vixcloud\.(?:co|ru)/i.test(url) ? 'animeunity' : 'animeworld';

export const searchAnimeAdvancedWithMeta = async (
  keyword: string,
  filtersQuery: string,
  page?: number,
): Promise<PagedSearchResult> => {
  const provider = await getPreferredProvider();
  return provider === 'animeunity'
    ? searchAnimeUnityAdvancedWithMeta(keyword, filtersQuery, page)
    : searchAnimeWorldAdvancedWithMeta(keyword, filtersQuery, page);
};

export const searchAnime = async (query: string): Promise<Anime[]> => {
  const provider = await getPreferredProvider();
  return provider === 'animeunity' ? searchAnimeUnity(query) : searchAnimeWorld(query);
};

export const searchAnimeAdvanced = async (
  keyword: string,
  filtersQuery: string,
  page?: number,
): Promise<Anime[]> => {
  const provider = await getPreferredProvider();
  return provider === 'animeunity'
    ? searchAnimeUnityAdvanced(keyword, filtersQuery, page)
    : searchAnimeWorldAdvanced(keyword, filtersQuery, page);
};

export const fetchHomePageSections = async (): Promise<HomePageSections> => {
  const provider = await getPreferredProvider();
  return provider === 'animeunity' ? fetchHomePageSectionsAnimeUnity() : fetchHomePageSectionsAnimeWorld();
};

export const fetchLatestEpisodes = async (): Promise<Anime[]> => {
  const provider = await getPreferredProvider();
  return provider === 'animeunity' ? fetchLatestEpisodesAnimeUnity() : fetchLatestEpisodesAnimeWorld();
};

export const fetchAnimeDetailsWithScraper = async (url: string): Promise<AnimeDetail | null> =>
  getProviderFromUrl(url) === 'animeunity'
    ? fetchAnimeDetailsAnimeUnity(url)
    : fetchAnimeDetailsAnimeWorld(url);

export const fetchEpisodeVideoUrl = async (url: string): Promise<string | null> =>
  getProviderFromUrl(url) === 'animeunity'
    ? fetchEpisodeVideoUrlAnimeUnity(url)
    : fetchEpisodeVideoUrlAnimeWorld(url);
