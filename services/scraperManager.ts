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

export const searchAnimeAdvancedWithMeta = async (
  keyword: string,
  filtersQuery: string,
  page?: number,
): Promise<PagedSearchResult> => searchAnimeWorldAdvancedWithMeta(keyword, filtersQuery, page);

export const searchAnime = async (query: string): Promise<Anime[]> => searchAnimeWorld(query);

export const searchAnimeAdvanced = async (
  keyword: string,
  filtersQuery: string,
  page?: number,
): Promise<Anime[]> => searchAnimeWorldAdvanced(keyword, filtersQuery, page);

export const fetchHomePageSections = async (): Promise<HomePageSections> => fetchHomePageSectionsAnimeWorld();

export const fetchLatestEpisodes = async (): Promise<Anime[]> => fetchLatestEpisodesAnimeWorld();

export const fetchAnimeDetailsWithScraper = async (url: string): Promise<AnimeDetail | null> => fetchAnimeDetailsAnimeWorld(url);

export const fetchEpisodeVideoUrl = async (url: string): Promise<string | null> => fetchEpisodeVideoUrlAnimeWorld(url);
