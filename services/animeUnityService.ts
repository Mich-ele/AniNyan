import axios, { AxiosError } from 'axios';
import { parse } from 'node-html-parser';
import { Anime, AnimeDetail, CarouselItem, Episode, HomePageSections } from '../types/anime';
import { getAnimeIdFromUrl } from '../utils/utils';
import { PagedSearchResult } from './animeWorldService';
import { ANIMEUNITY_GENRES } from '../data/animeUnityFilters';
import {
  describeDiagnosticError,
  describeMediaUrl,
  playbackDiagnostic,
} from '../utils/playbackDiagnostics';

const ANIMEUNITY_BASE_URL = 'https://www.animeunity.so';
const PAGE_SIZE = 30;
const EPISODE_BATCH_SIZE = 120;
const userAgent = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36';

type AnimeUnityGenre = {
  id?: number;
  name?: string;
};

type AnimeUnityRecord = {
  id?: number | string;
  slug?: string;
  title?: string;
  title_it?: string;
  title_eng?: string;
  imageurl?: string;
  imageurl_cover?: string;
  type?: string;
  dub?: boolean | number;
  episodes_count?: number | string;
  status?: string;
  date?: string | number;
  score?: string | number;
  plot?: string;
  genres?: AnimeUnityGenre[];
  studio?: string;
  season?: string;
  duration?: string | number;
  episodes_length?: string | number;
};

type AnimeUnityEpisode = {
  id?: number | string;
  number?: number | string;
  file_name?: string;
  link?: string;
  anime?: AnimeUnityRecord;
};

type AnimeUnityEpisodeRange = {
  episodes: AnimeUnityEpisode[];
  totalEpisodes?: number;
};

type AnimeUnityEpisodeCollection = {
  episodeList: Episode[];
  totalEpisodes: number;
};

type AnimeUnityPageDetails = {
  genres: string[];
  info: Record<string, string>;
  relatedAnime: Anime[];
  embeddedEpisodes: AnimeUnityEpisode[];
};

type ArchiveFilters = {
  type: string | false;
  year: string | false;
  order: string | false;
  status: string | false;
  genres: AnimeUnityGenre[] | false;
  dubbed: 1 | false;
  season: string | false;
};

type ArchiveResponse = {
  records: AnimeUnityRecord[];
  total?: number;
};

const client = axios.create({
  baseURL: ANIMEUNITY_BASE_URL,
  timeout: 20000,
  withCredentials: true,
  headers: {
    'User-Agent': userAgent,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
  },
});

let csrfToken: string | null = null;
let csrfRequest: Promise<string> | null = null;
const recordCache = new Map<string, AnimeUnityRecord>();
let homeDataCache: { timestamp: number; data: AnimeUnityHomeData } | null = null;
let homeDataRequest: Promise<AnimeUnityHomeData> | null = null;

type AnimeUnityHomeData = {
  carousel: CarouselItem[];
  latestEpisodes: Anime[];
  latestAnime: Anime[];
};

const resolveUrl = (value?: string): string => {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `${ANIMEUNITY_BASE_URL}${value.startsWith('/') ? '' : '/'}${value}`;
};

const getTextValue = (value: unknown): string => String(value ?? '').trim();

const getCleanText = (value: unknown): string => getTextValue(value).replace(/\s+/g, ' ');

const getNumericValue = (value: unknown): number | undefined => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const getRecordTitle = (record: AnimeUnityRecord): string =>
  getTextValue(record.title || record.title_it || record.title_eng || record.slug || 'Anime');

const getRecordFragment = (record: AnimeUnityRecord): string => {
  const id = getTextValue(record.id);
  const slug = getTextValue(record.slug);
  return [id, slug].filter(Boolean).join('-');
};

const getAnimeUrl = (record: AnimeUnityRecord): string =>
  `${ANIMEUNITY_BASE_URL}/anime/${getRecordFragment(record)}`;

const mapRecordToAnime = (record: AnimeUnityRecord): Anime => {
  const url = getAnimeUrl(record);
  const fragment = getRecordFragment(record);
  if (fragment) recordCache.set(fragment, record);
  const type = getTextValue(record.type);
  const year = getNumericValue(record.date);
  const episodes = getNumericValue(record.episodes_count);
  const subtitle = [type, year ? String(year) : '', record.dub ? 'Dub ITA' : 'Sub ITA']
    .filter(Boolean)
    .join(' · ');

  return {
    id: getAnimeIdFromUrl(url) || `animeunity:${getRecordFragment(record)}`,
    title: getRecordTitle(record),
    image: resolveUrl(record.imageurl),
    url,
    subtitle,
    rating: getNumericValue(record.score),
    year,
    episodes,
    existEpisodes: episodes,
  };
};

const ensureCsrfToken = async (): Promise<string> => {
  if (csrfToken) return csrfToken;
  if (!csrfRequest) {
    csrfRequest = client.get('/archivio').then(response => {
      const html = typeof response.data === 'string' ? response.data : String(response.data ?? '');
      const token = html.match(/name=["']csrf-token["'][^>]*content=["']([^"']+)["']/i)?.[1]
        || html.match(/content=["']([^"']+)["'][^>]*name=["']csrf-token["']/i)?.[1];
      if (!token) throw new Error('AnimeUnity CSRF token unavailable');
      csrfToken = token;
      return token;
    }).finally(() => {
      csrfRequest = null;
    });
  }
  return csrfRequest;
};

const getArchiveHeaders = async (): Promise<Record<string, string>> => ({
  'User-Agent': userAgent,
  Accept: 'application/json, text/plain, */*',
  'Content-Type': 'application/json;charset=UTF-8',
  'X-CSRF-TOKEN': await ensureCsrfToken(),
  'X-Requested-With': 'XMLHttpRequest',
  Referer: `${ANIMEUNITY_BASE_URL}/archivio`,
  Origin: ANIMEUNITY_BASE_URL,
});

const normalizeArchiveResponse = (data: unknown): ArchiveResponse => {
  if (Array.isArray(data)) return { records: data as AnimeUnityRecord[] };
  if (!data || typeof data !== 'object') return { records: [] };
  const value = data as Record<string, unknown>;
  const records = Array.isArray(value.records)
    ? value.records
    : Array.isArray(value.data)
      ? value.data
      : Array.isArray(value.animes)
        ? value.animes
        : [];
  const totalCandidates = [value.recordsFiltered, value.recordsTotal, value.total, value.tot];
  const total = totalCandidates
    .map(getNumericValue)
    .find(candidate => candidate !== undefined);
  return { records: records as AnimeUnityRecord[], total };
};

const requestArchive = async (
  title: string,
  offset: number,
  filters: ArchiveFilters,
  retry = true,
): Promise<ArchiveResponse> => {
  try {
    const response = await client.post(
      '/archivio/get-animes',
      {
        title: title.trim() || false,
        type: filters.type,
        year: filters.year,
        order: filters.order,
        status: filters.status,
        genres: filters.genres,
        offset,
        dubbed: filters.dubbed,
        season: filters.season,
      },
      { headers: await getArchiveHeaders() },
    );
    return normalizeArchiveResponse(response.data);
  } catch (error) {
    const status = error instanceof AxiosError ? error.response?.status : undefined;
    if (retry && (status === 403 || status === 419)) {
      csrfToken = null;
      csrfRequest = null;
      return requestArchive(title, offset, filters, false);
    }
    throw error;
  }
};

const getQueryValues = (filtersQuery: string, key: string): string[] => {
  const query = filtersQuery.replace(/^\?/, '').replace(/^&/, '');
  if (!query) return [];
  const params = new URLSearchParams(query);
  return params.getAll(key).filter(Boolean);
};

const getArchiveFilters = (filtersQuery: string): ArchiveFilters => {
  const typeMap: Record<string, string> = {
    '0': 'TV',
    '1': 'OVA',
    '2': 'ONA',
    '3': 'Special',
    '4': 'Movie',
    '5': 'Music',
  };
  const statusMap: Record<string, string> = {
    '0': 'In Corso',
    '1': 'Terminato',
    '2': 'Non rilasciato',
    '3': 'Droppato',
  };
  const seasonMap: Record<string, string> = {
    winter: 'Inverno',
    spring: 'Primavera',
    summer: 'Estate',
    fall: 'Autunno',
  };
  const orderMap: Record<string, string | false> = {
    '0': false,
    '1': false,
    '2': false,
    '3': false,
    '4': false,
    '5': false,
    '6': 'Visite',
    '7': 'Valutazione',
  };
  const type = getQueryValues(filtersQuery, 'type')[0];
  const year = getQueryValues(filtersQuery, 'year')[0];
  const status = getQueryValues(filtersQuery, 'status')[0];
  const season = getQueryValues(filtersQuery, 'season')[0];
  const sort = getQueryValues(filtersQuery, 'sort')[0];
  const order = getQueryValues(filtersQuery, 'order')[0];
  const genreIds = getQueryValues(filtersQuery, 'genre');
  const genres = genreIds.flatMap(id => {
    const option = ANIMEUNITY_GENRES.find(genreOption => genreOption.id === id);
    return option ? [{ id: Number(option.id), name: option.label }] : [];
  });
  const dubbed = getQueryValues(filtersQuery, 'dub').includes('1');

  return {
    type: typeMap[type] || type || false,
    year: year || false,
    order: order || orderMap[sort] || false,
    status: statusMap[status] || status || false,
    genres: genres.length ? genres : false,
    dubbed: dubbed ? 1 : false,
    season: seasonMap[season] || season || false,
  };
};

const emptyFilters = (order: string | false = false): ArchiveFilters => ({
  type: false,
  year: false,
  order,
  status: false,
  genres: false,
  dubbed: false,
  season: false,
});

const fetchArchiveAnime = async (
  title: string,
  page: number,
  filters: ArchiveFilters,
): Promise<PagedSearchResult> => {
  const normalizedPage = Math.max(1, page);
  const offset = (normalizedPage - 1) * PAGE_SIZE;
  const { records, total } = await requestArchive(title, offset, filters);
  const items = records.map(mapRecordToAnime).filter(anime => anime.id && anime.url && anime.image);
  const hasNext = total !== undefined ? offset + records.length < total : records.length >= PAGE_SIZE;
  return {
    items,
    hasPrev: normalizedPage > 1,
    hasNext,
    totalPages: total !== undefined ? Math.max(1, Math.ceil(total / PAGE_SIZE)) : undefined,
  };
};

export const searchAnimeUnityAdvancedWithMeta = async (
  keyword: string,
  filtersQuery: string,
  page = 1,
): Promise<PagedSearchResult> => fetchArchiveAnime(keyword, page, getArchiveFilters(filtersQuery));

export const searchAnimeUnity = async (query: string): Promise<Anime[]> =>
  (await fetchArchiveAnime(query, 1, emptyFilters())).items;

export const searchAnimeUnityAdvanced = async (
  keyword: string,
  filtersQuery: string,
  page = 1,
): Promise<Anime[]> => (await searchAnimeUnityAdvancedWithMeta(keyword, filtersQuery, page)).items;

const createCarousel = (anime: AnimeUnityRecord[]): CarouselItem[] =>
  anime.map(record => {
    const mapped = mapRecordToAnime(record);
    return {
      id: mapped.id,
      image: resolveUrl(record.imageurl_cover || record.imageurl),
      title: mapped.title,
      url: mapped.url,
      description: getTextValue(record.plot) || mapped.subtitle || '',
    };
  });

const parseJsonAttribute = <T,>(root: ReturnType<typeof parse>, selector: string, attribute: string, fallback: T): T => {
  const value = root.querySelector(selector)?.getAttribute(attribute);
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const fetchTopAnime = async (path: string): Promise<Anime[]> => {
  const response = await client.get(path);
  const html = typeof response.data === 'string' ? response.data : String(response.data ?? '');
  const root = parse(html);
  const payload = parseJsonAttribute<{ data?: AnimeUnityRecord[] }>(root, 'top-anime', 'animes', {});
  const records = Array.isArray(payload.data) ? payload.data : [];
  return records.map(mapRecordToAnime);
};

const fetchAnimeUnityHomeData = async (): Promise<AnimeUnityHomeData> => {
  if (homeDataCache && Date.now() - homeDataCache.timestamp < 30000) return homeDataCache.data;
  if (!homeDataRequest) {
    homeDataRequest = client.get('/').then(response => {
      const html = typeof response.data === 'string' ? response.data : String(response.data ?? '');
      const root = parse(html);
      const carouselRecords = parseJsonAttribute<AnimeUnityRecord[]>(root, 'the-carousel', 'animes', []);
      const rawEpisodes = root.querySelector('#ultimi-episodi layout-items')?.getAttribute('items-json') || '';
      let episodeRecords: AnimeUnityEpisode[] = [];
      try {
        const parsedData = JSON.parse(rawEpisodes) as { data?: AnimeUnityEpisode[] };
        episodeRecords = Array.isArray(parsedData.data) ? parsedData.data : [];
      } catch {
        episodeRecords = [];
      }
      const latestEpisodes = episodeRecords.flatMap(episode => {
        if (!episode.anime) return [];
        const anime = mapRecordToAnime(episode.anime);
        return [{
          ...anime,
          subtitle: `Episodio ${getTextValue(episode.number)}`,
        }];
      });
      const latestAnime = root.querySelectorAll('.home-sidebar .latest-anime-container').flatMap(container => {
        const link = container.querySelector('a[href*="/anime/"]')?.getAttribute('href');
        const title = getTextValue(container.querySelector('.latest-anime-title')?.text);
        const image = container.querySelector('img')?.getAttribute('src');
        if (!link || !title || !image) return [];
        const url = resolveUrl(link);
        const subtitle = getTextValue(container.querySelector('.latest-anime-info')?.text);
        return [{
          id: getAnimeIdFromUrl(url) || `animeunity:${url}`,
          title,
          image: resolveUrl(image),
          url,
          subtitle,
        }];
      });
      const data = {
        carousel: createCarousel(carouselRecords),
        latestEpisodes,
        latestAnime,
      };
      homeDataCache = { timestamp: Date.now(), data };
      return data;
    }).finally(() => {
      homeDataRequest = null;
    });
  }
  return homeDataRequest;
};

export const fetchHomePageSectionsAnimeUnity = async (): Promise<HomePageSections> => {
  const [popular, mostViewed, rated, homeData] = await Promise.all([
    fetchTopAnime('/top-anime?popular=true'),
    fetchTopAnime('/top-anime?order=most_viewed'),
    fetchTopAnime('/top-anime'),
    fetchAnimeUnityHomeData(),
  ]);

  return {
    newAdditions: homeData.latestAnime.length ? homeData.latestAnime : homeData.latestEpisodes,
    randomAnime: [],
    carousel: homeData.carousel,
    topAnime: {
      day: popular,
      week: mostViewed,
      month: rated,
    },
  };
};

export const fetchLatestEpisodesAnimeUnity = async (): Promise<Anime[]> =>
  (await fetchAnimeUnityHomeData()).latestEpisodes;

const getAnimeFragmentFromUrl = (url: string): string | null => {
  try {
    const parts = new URL(url).pathname.split('/').filter(Boolean);
    const animeIndex = parts.indexOf('anime');
    return animeIndex >= 0 ? parts[animeIndex + 1] || null : null;
  } catch {
    const parts = url.split('/').filter(Boolean);
    const animeIndex = parts.indexOf('anime');
    return animeIndex >= 0 ? parts[animeIndex + 1] || null : null;
  }
};

const getRecordByFragment = async (fragment: string): Promise<AnimeUnityRecord | null> => {
  const cachedRecord = recordCache.get(fragment);
  if (cachedRecord) return cachedRecord;
  const numericId = fragment.match(/^\d+/)?.[0];
  const searchTitle = fragment.replace(/^\d+-?/, '').replace(/-/g, ' ');
  const { records } = await requestArchive(searchTitle, 0, emptyFilters());
  return records.find(record => getTextValue(record.id) === numericId)
    || records.find(record => getRecordFragment(record) === fragment)
    || records[0]
    || null;
};

const fetchAnimePageDetails = async (fragment: string): Promise<AnimeUnityPageDetails> => {
  const response = await client.get(`/anime/${fragment}`, {
    headers: {
      'User-Agent': userAgent,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      Referer: ANIMEUNITY_BASE_URL,
    },
  });
  const html = typeof response.data === 'string' ? response.data : String(response.data ?? '');
  const root = parse(html);
  const genres = root.querySelectorAll('.genre-link')
    .map(link => getCleanText(link.text).replace(/,\s*$/, ''))
    .filter(Boolean);
  const info = root.querySelectorAll('.anime-info-wrapper .info-item').reduce<Record<string, string>>(
    (details, item) => {
      const label = getCleanText(item.querySelector('strong')?.text);
      const value = getCleanText(item.querySelector('small')?.text);
      if (label && value) details[label] = value;
      return details;
    },
    {},
  );
  const relatedAnime = root.querySelectorAll('.related-wrapper .related-item').flatMap(item => {
    const href = item.querySelector('a[href*="/anime/"]')?.getAttribute('href');
    const title = getCleanText(item.querySelector('.related-anime-title')?.text);
    const image = item.querySelector('img')?.getAttribute('src');
    if (!href || !title || !image) return [];
    const relatedUrl = resolveUrl(href);
    return [{
      id: getAnimeIdFromUrl(relatedUrl) || `animeunity:${relatedUrl}`,
      title,
      image: resolveUrl(image),
      url: relatedUrl,
      subtitle: getCleanText(item.querySelector('.related-info')?.text),
    }];
  });
  const embeddedEpisodes = parseJsonAttribute<AnimeUnityEpisode[]>(
    root,
    'video-player',
    'episodes',
    [],
  );

  return { genres, info, relatedAnime, embeddedEpisodes };
};

const normalizeEpisodeRecords = (
  fragment: string,
  records: AnimeUnityEpisode[],
  fallbackStart: number,
): Episode[] => records.flatMap((episode, index) => {
  const episodeId = getTextValue(episode.id);
  const rawNumber = getTextValue(episode.number) || String(fallbackStart + index);
  const combinedNumbers = rawNumber.split('-').map(value => value.trim()).filter(Boolean);
  const numbers = combinedNumbers.length > 1 && combinedNumbers.every(value => /^\d+(?:\.\d+)?$/.test(value))
    ? combinedNumbers
    : [rawNumber];
  const episodeUrl = episodeId
    ? `${ANIMEUNITY_BASE_URL}/embed-url/${episodeId}`
    : resolveUrl(episode.link || episode.file_name);
  if (!episodeUrl) return [];
  return numbers.map(number => ({
    id: episodeId ? `${episodeId}:${number}` : `${fragment}-${number}`,
    number,
    url: episodeUrl,
  }));
});

const fetchEpisodes = async (fragment: string, totalEpisodes: number): Promise<AnimeUnityEpisodeCollection> => {
  const episodes: Episode[] = [];
  const seen = new Set<string>();

  const requestRange = async (rangeStart: number, rangeEnd: number): Promise<AnimeUnityEpisodeRange> => {
    const response = await client.get(`/info_api/${fragment}/0`, {
      params: { start_range: rangeStart, end_range: rangeEnd },
      headers: {
        'User-Agent': userAgent,
        Accept: 'application/json, text/plain, */*',
        Referer: `${ANIMEUNITY_BASE_URL}/anime/${fragment}`,
      },
    });
    const data = response.data as unknown;
    if (Array.isArray(data)) {
      return { episodes: data as AnimeUnityEpisode[] };
    }
    if (!data || typeof data !== 'object') {
      return { episodes: [] };
    }
    const value = data as Record<string, unknown>;
    return {
      episodes: Array.isArray(value.episodes) ? value.episodes as AnimeUnityEpisode[] : [],
      totalEpisodes: getNumericValue(value.episodes_count),
    };
  };

  const appendEpisodes = (records: AnimeUnityEpisode[], fallbackStart: number) => {
    normalizeEpisodeRecords(fragment, records, fallbackStart).forEach(episode => {
      if (seen.has(episode.number)) return;
      seen.add(episode.number);
      episodes.push(episode);
    });
  };

  const zeroRange = await requestRange(0, 0);
  appendEpisodes(zeroRange.episodes, 0);

  let expectedTotal = Math.max(0, totalEpisodes, zeroRange.totalEpisodes || 0);
  const firstEnd = expectedTotal > 0
    ? Math.min(EPISODE_BATCH_SIZE, expectedTotal)
    : EPISODE_BATCH_SIZE;
  const firstRange = await requestRange(1, firstEnd);
  appendEpisodes(firstRange.episodes, 1);
  expectedTotal = Math.max(expectedTotal, firstRange.totalEpisodes || 0);

  let start = firstEnd + 1;
  while (start <= expectedTotal) {
    const ranges: { start: number; end: number }[] = [];
    while (ranges.length < 4 && start <= expectedTotal) {
      const end = Math.min(start + EPISODE_BATCH_SIZE - 1, expectedTotal);
      ranges.push({ start, end });
      start = end + 1;
    }
    const responses = await Promise.all(ranges.map(range => requestRange(range.start, range.end)));
    responses.forEach((response, index) => {
      appendEpisodes(response.episodes, ranges[index].start);
      expectedTotal = Math.max(expectedTotal, response.totalEpisodes || 0);
    });
  }

  return {
    episodeList: episodes.sort((left, right) => Number(left.number) - Number(right.number)),
    totalEpisodes: expectedTotal,
  };
};

export const fetchAnimeDetailsAnimeUnity = async (url: string): Promise<AnimeDetail | null> => {
  const fragment = getAnimeFragmentFromUrl(url);
  if (!fragment) return null;
  const record = await getRecordByFragment(fragment);
  if (!record) return null;
  const anime = mapRecordToAnime(record);
  const totalEpisodes = getNumericValue(record.episodes_count) || 0;
  const [episodes, pageDetails] = await Promise.all([
    fetchEpisodes(fragment, totalEpisodes),
    fetchAnimePageDetails(fragment),
  ]);
  const episodeMap = new Map<string, Episode>();
  episodes.episodeList.forEach(episode => episodeMap.set(episode.number, episode));
  normalizeEpisodeRecords(fragment, pageDetails.embeddedEpisodes, 1)
    .forEach(episode => episodeMap.set(episode.number, episode));
  const episodeList = Array.from(episodeMap.values())
    .sort((left, right) => Number(left.number) - Number(right.number));
  const pageEpisodeCount = getNumericValue(pageDetails.info.Episodi);
  const availableEpisodes = Math.max(
    episodes.totalEpisodes,
    episodeList.length,
    totalEpisodes,
    pageEpisodeCount || 0,
  );
  const releaseDate = pageDetails.info.Anno || getTextValue(record.date) || undefined;

  return {
    ...anime,
    year: getNumericValue(releaseDate),
    episodes: availableEpisodes,
    description: getTextValue(record.plot),
    genres: pageDetails.genres.length
      ? pageDetails.genres
      : (record.genres || []).map(genre => getTextValue(genre.name)).filter(Boolean),
    episodeUrl: '',
    studio: pageDetails.info.Studio || getTextValue(record.studio) || undefined,
    status: pageDetails.info.Stato || getTextValue(record.status) || undefined,
    releaseDate,
    episodeDuration: pageDetails.info['Durata episodio']
      || getTextValue(record.episodes_length || record.duration)
      || undefined,
    episodeList,
    existEpisodes: availableEpisodes,
    ratingText: pageDetails.info.Valutazione || getTextValue(record.score) || undefined,
    viewsText: pageDetails.info.Visite || undefined,
    favoritesText: pageDetails.info.Preferiti || undefined,
    membersText: pageDetails.info.Membri || undefined,
    category: pageDetails.info.Tipo || getTextValue(record.type) || undefined,
    audio: record.dub ? 'Dub ITA' : 'Sub ITA',
    season: pageDetails.info.Stagione || getTextValue(record.season) || undefined,
    relatedAnime: pageDetails.relatedAnime,
  };
};

const getEmbedUrl = async (url: string): Promise<string | null> => {
  if (/vixcloud\.(?:co|ru)/i.test(url)) {
    playbackDiagnostic('animeunity.embed.direct', { target: describeMediaUrl(url) });
    return url;
  }
  const startedAt = Date.now();
  playbackDiagnostic('animeunity.embed.resolve.start', { target: describeMediaUrl(url) });
  try {
    const response = await client.get(url, {
      headers: {
        'User-Agent': userAgent,
        Accept: 'application/json, text/plain, */*',
        Referer: ANIMEUNITY_BASE_URL,
      },
    });
    const data = response.data;
    let embedUrl: string | null = null;
    if (typeof data === 'string') {
      embedUrl = data.match(/https?:\/\/[^"'\s]+/i)?.[0] || null;
    } else if (data && typeof data === 'object') {
      const value = data as Record<string, unknown>;
      const candidate = value.url || value.embed_url || value.link;
      embedUrl = typeof candidate === 'string' ? candidate : null;
    }
    playbackDiagnostic('animeunity.embed.resolve.success', {
      status: response.status,
      durationMs: Date.now() - startedAt,
      target: describeMediaUrl(url),
      embed: describeMediaUrl(embedUrl),
    });
    return embedUrl;
  } catch (error) {
    playbackDiagnostic('animeunity.embed.resolve.error', {
      durationMs: Date.now() - startedAt,
      target: describeMediaUrl(url),
      error: describeDiagnosticError(error),
    }, 'error');
    throw error;
  }
};

const decodeScriptUrl = (value: string): string =>
  value.replace(/\\\//g, '/').replace(/&amp;/g, '&').trim();

export const fetchEpisodeVideoUrlAnimeUnity = async (tokenOrUrl: string): Promise<string | null> => {
  const targetUrl = resolveUrl(tokenOrUrl);
  const startedAt = Date.now();
  playbackDiagnostic('animeunity.stream.resolve.start', { target: describeMediaUrl(targetUrl) });
  try {
    const embedUrl = await getEmbedUrl(targetUrl);
    if (!embedUrl) {
      playbackDiagnostic('animeunity.stream.resolve.empty', {
        durationMs: Date.now() - startedAt,
        target: describeMediaUrl(targetUrl),
      }, 'error');
      return null;
    }
    const response = await axios.get(embedUrl, {
      timeout: 20000,
      headers: {
        'User-Agent': userAgent,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        Referer: ANIMEUNITY_BASE_URL,
      },
    });
    const html = typeof response.data === 'string' ? response.data : String(response.data ?? '');
    const playlistUrl = html.match(/window\.masterPlaylist\s*=\s*\{[\s\S]*?['"]?url['"]?\s*:\s*['"](https?:\/\/[^'"]+)['"]/i)?.[1];
    const token = html.match(/['"]?token['"]?\s*:\s*['"]([^'"]+)['"]/i)?.[1];
    const expires = html.match(/['"]?expires['"]?\s*:\s*['"]([^'"]+)['"]/i)?.[1];
    const asn = html.match(/['"]?asn['"]?\s*:\s*['"]([^'"]*)['"]/i)?.[1];
    if (playlistUrl) {
      const playlist = new URL(decodeScriptUrl(playlistUrl));
      if (token) playlist.searchParams.set('token', token);
      if (expires) playlist.searchParams.set('expires', expires);
      if (asn) playlist.searchParams.set('asn', asn);
      if (new URL(embedUrl).searchParams.has('canPlayFHD')) {
        playlist.searchParams.set('h', '1');
      }
      const resolvedUrl = playlist.toString();
      playbackDiagnostic('animeunity.stream.resolve.success', {
        status: response.status,
        durationMs: Date.now() - startedAt,
        embed: describeMediaUrl(embedUrl),
        media: describeMediaUrl(resolvedUrl),
        delivery: 'hls',
      });
      return resolvedUrl;
    }
    const directUrl = html.match(/window\.downloadUrl\s*=\s*['"](https?:\/\/[^'"]+)['"]/i)?.[1];
    if (directUrl) {
      const resolvedUrl = decodeScriptUrl(directUrl);
      playbackDiagnostic('animeunity.stream.resolve.success', {
        status: response.status,
        durationMs: Date.now() - startedAt,
        embed: describeMediaUrl(embedUrl),
        media: describeMediaUrl(resolvedUrl),
        delivery: 'mp4-fallback',
      });
      return resolvedUrl;
    }
    playbackDiagnostic('animeunity.stream.playlist.missing', {
      status: response.status,
      durationMs: Date.now() - startedAt,
      embed: describeMediaUrl(embedUrl),
    }, 'error');
    return null;
  } catch (error) {
    playbackDiagnostic('animeunity.stream.resolve.error', {
      durationMs: Date.now() - startedAt,
      target: describeMediaUrl(targetUrl),
      error: describeDiagnosticError(error),
    }, 'error');
    throw error;
  }
};
