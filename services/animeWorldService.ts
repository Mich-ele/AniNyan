import axios from 'axios';
import { parse } from 'node-html-parser';
import { Anime, AnimeDetail, CarouselItem, HomePageSections } from '../types/anime';
import { getAnimeIdFromUrl } from '../utils/utils';
const AW_BASE_URL = 'https://www.animeworld.ac';
const userAgent = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const client = axios.create({
  baseURL: AW_BASE_URL,
  headers: {
    'User-Agent': userAgent,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
  },
  timeout: 15000
});
let sessionCookie: string | null = null;
export type PagedSearchResult = {
  items: Anime[];
  hasNext: boolean;
  hasPrev: boolean;
  totalPages?: number;
};
const resolveUrl = (url: string): string => {
  if (!url) return AW_BASE_URL;
  if (/^https?:\/\//i.test(url)) {
    return url.replace(/^http:\/\/www\.animeworld\.ac/i, AW_BASE_URL);
  }
  return `${AW_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};
const getAnimeWorldChallenge = (html: string): {
  cookie: string;
  url: string;
} | null => {
  const cookieMatch = html.match(/document\.cookie\s*=\s*["']([^"']+)["']/i);
  const redirectMatch = html.match(/location\.href\s*=\s*["']([^"']+)["']/i);
  if (!cookieMatch || !redirectMatch) return null;
  const cookie = cookieMatch[1].split(';')[0].trim();
  const url = resolveUrl(redirectMatch[1]);
  if (!cookie || !url) return null;
  return {
    cookie,
    url
  };
};
const getAnimeWorldBlockReason = (html: string): string | null => {
  const title = html.match(/<title[^>]*>(.*?)<\/title>/i)?.[1]?.trim() || '';
  if (/abilita i cookie/i.test(title) || /cookies\.html/i.test(html)) {
    return 'AnimeWorld returned the cookie-required page';
  }
  return null;
};
const buildHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    'User-Agent': userAgent
  };
  if (sessionCookie) headers['Cookie'] = sessionCookie;
  return headers;
};
const rawGet = async (url: string): Promise<{
  status: number;
  html: string;
}> => {
  const response = await client.get(url, {
    headers: buildHeaders()
  });
  const html = typeof response.data === 'string' ? response.data : String(response.data ?? '');
  return {
    status: response.status,
    html
  };
};
const getPage = async (url: string, retries = 3): Promise<string> => {
  const target = resolveUrl(url);
  let lastError: any;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      let {
        status,
        html
      } = await rawGet(target);
      let hops = 0;
      while (hops < 5) {
        const challenge = getAnimeWorldChallenge(html);
        if (!challenge) break;
        sessionCookie = challenge.cookie;
        ({
          status,
          html
        } = await rawGet(challenge.url));
        hops++;
      }
      if (hops > 0) {
        ({
          status,
          html
        } = await rawGet(target));
      }
      if (getAnimeWorldChallenge(html)) {
        sessionCookie = null;
        throw new Error('AnimeWorld challenge did not resolve');
      }
      const blockReason = getAnimeWorldBlockReason(html);
      if (blockReason) {
        sessionCookie = null;
        throw new Error(blockReason);
      }
      return html;
    } catch (e) {
      lastError = e;
      if (attempt < retries - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
};
const parseAnimeWorldSearchResultsWithMeta = (html: string): PagedSearchResult => {
  const items = parseAnimeWorldSearchResults(html);
  const root = parse(html);
  let hasPrev = false;
  let hasNext = false;
  let totalPages: number | undefined;
  const prevEl: any = root.querySelector('#go-previous-page');
  const nextEl: any = root.querySelector('#go-next-page');
  if (prevEl) hasPrev = !/disabled/.test(prevEl.getAttribute('class') || '');
  if (nextEl) hasNext = !/disabled/.test(nextEl.getAttribute('class') || '');
  const totalEl = root.querySelector('.paging-wrapper .total');
  if (totalEl) {
    const t = parseInt((totalEl.text || '').trim(), 10);
    if (!Number.isNaN(t)) totalPages = t;
  } else {
    const script = root.querySelector('script');
    const htmlText = script ? script.text : html;
    const m = htmlText.match(/paginationMaxPage\s*=\s*parseInt\("(\d+)"\)/);
    if (m) {
      const t = parseInt(m[1], 10);
      if (!Number.isNaN(t)) totalPages = t;
    }
  }
  return {
    items,
    hasNext,
    hasPrev,
    totalPages
  };
};
const buildAnime = (thumbnail: string, title: string, link: string): Anime => {
  const finalUrl = resolveUrl(link);
  const id = getAnimeIdFromUrl(finalUrl) || finalUrl;
  return {
    id,
    title: title.trim(),
    image: thumbnail,
    url: finalUrl
  };
};
const normalizeText = (text?: string): string => (text || '').replace(/\s+/g, ' ').trim();
const getImageSrc = (imgEl: any): string => imgEl?.getAttribute('src') || imgEl?.getAttribute('data-src') || imgEl?.getAttribute('data-original') || imgEl?.getAttribute('data-lazy-src') || '';
const parseAnimeItem = (el: any): Anime | null => {
  const selfIsLink = String(el.tagName || '').toLowerCase() === 'a';
  const nameEl = el.querySelector('a.name');
  const posterEl = el.querySelector('a.poster');
  const linkEl = nameEl || posterEl || (selfIsLink ? el : null);
  const imgEl = el.querySelector('img');
  if (!linkEl || !imgEl) return null;
  const title = normalizeText(nameEl?.text || linkEl.getAttribute('title') || imgEl.getAttribute('alt'));
  const href = linkEl.getAttribute('href') || '';
  const thumbnail = getImageSrc(imgEl);
  if (!title || !href || !thumbnail) return null;
  return buildAnime(thumbnail, title, href);
};
const parseGenericAnimeList = (html: string): Anime[] => {
  const root = parse(html);
  const list: Anime[] = [];
  const seen = new Set<string>();
  root.querySelectorAll('.film-list .item').forEach(item => {
    const anime = parseAnimeItem(item);
    if (!anime || seen.has(anime.id)) return;
    seen.add(anime.id);
    list.push(anime);
  });
  return list;
};
const parseAnimeWorldSearchResults = (html: string): Anime[] => {
  const root = parse(html);
  const results: Anime[] = [];
  root.querySelectorAll('div.film-list > div.item').forEach(item => {
    const anime = parseAnimeItem(item);
    if (anime) results.push(anime);
  });
  return results;
};
export const searchAnimeWorld = async (query: string): Promise<Anime[]> => {
  const trimmed = query.trim();
  if (!trimmed) return [];
  try {
    const html = await getPage(`/search?keyword=${encodeURIComponent(trimmed)}`);
    return parseAnimeWorldSearchResults(html);
  } catch (e) {
    console.error('AnimeWorld search failed', e);
    return [];
  }
};
export const searchAnimeWorldAdvanced = async (keyword: string, filtersQuery: string, page?: number): Promise<Anime[]> => {
  const trimmed = keyword.trim();
  if (!trimmed && !filtersQuery) return [];
  try {
    let query = '';
    if (trimmed) query += `keyword=${encodeURIComponent(trimmed)}`;
    if (filtersQuery) {
      if (query) query += filtersQuery;else query += filtersQuery.startsWith('&') ? filtersQuery.substring(1) : filtersQuery;
    }
    if (typeof page === 'number' && page > 0) {
      query += `${query ? '&' : ''}page=${page}`;
    }
    const html = await getPage(`/filter?${query}`);
    return parseAnimeWorldSearchResultsWithMeta(html).items;
  } catch (e) {
    console.error('AnimeWorld advanced search failed', e);
    return [];
  }
};
export const searchAnimeWorldAdvancedWithMeta = async (keyword: string, filtersQuery: string, page?: number): Promise<PagedSearchResult> => {
  const trimmed = keyword.trim();
  if (!trimmed && !filtersQuery) return {
    items: [],
    hasNext: false,
    hasPrev: false
  };
  try {
    let query = '';
    if (trimmed) query += `keyword=${encodeURIComponent(trimmed)}`;
    if (filtersQuery) {
      if (query) query += filtersQuery;else query += filtersQuery.startsWith('&') ? filtersQuery.substring(1) : filtersQuery;
    }
    if (typeof page === 'number' && page > 0) {
      query += `${query ? '&' : ''}page=${page}`;
    }
    const html = await getPage(`/filter?${query}`);
    return parseAnimeWorldSearchResultsWithMeta(html);
  } catch (e) {
    console.error('AnimeWorld advanced search (meta) failed', e);
    return {
      items: [],
      hasNext: false,
      hasPrev: false
    };
  }
};
export const parseHomePageSectionsAnimeWorldHtml = (html: string): HomePageSections => {
  const root = parse(html);
  const carousel: CarouselItem[] = [];
  const sliderRegex = /https?:[^'"\)]+/i;
  const sliderElements = root.querySelectorAll('#swiper-container > div.items.swiper-wrapper > div.item.swiper-slide');
  for (const el of sliderElements) {
    const nameEl = el.querySelector('a.name');
    const title = nameEl?.text.trim() || '';
    const href = nameEl?.getAttribute('href') || '';
    const styleAttr = el.getAttribute('style') || '';
    const imgMatch = styleAttr.match(sliderRegex);
    const thumbnail = imgMatch ? imgMatch[0] : '';
    if (!title || !href || !thumbnail) continue;
    const anime = buildAnime(thumbnail, title, href);
    carousel.push({
      id: anime.id,
      url: anime.url,
      image: anime.image,
      title: anime.title,
      description: anime.title
    });
  }
  let newAdditions: Anime[] = [];
  let ongoing: Anime[] = [];
  let topAnimeDay: Anime[] = [];
  let topAnimeWeek: Anime[] = [];
  let topAnimeMonth: Anime[] = [];
  const widgets = root.querySelectorAll('.widget');
  let newAdditionsWidget: any = null;
  let hotNewWidget: any = null;
  let ongoingWidget: any = null;
  widgets.forEach((widget: any) => {
    const titleEl = widget.querySelector('h2.title, span.title');
    const titleText = normalizeText(titleEl?.text || widget.text).toLowerCase();
    if (!newAdditionsWidget && titleText.includes('nuove aggiunte')) newAdditionsWidget = widget;else if (!hotNewWidget && titleText.includes('ultimi episodi')) hotNewWidget = widget;else if (!ongoingWidget && titleText.includes('anime in corso')) ongoingWidget = widget;
  });
  if (newAdditionsWidget) {
    const items = newAdditionsWidget.querySelectorAll('.owl-item .item, .film-list .item, .widget-body > .item, a.poster');
    const seen = new Set<string>();
    items.forEach((item: any) => {
      const anime = parseAnimeItem(item);
      if (!anime || seen.has(anime.id)) return;
      seen.add(anime.id);
      newAdditions.push(anime);
    });
  } else if (hotNewWidget) {
    const latestContent = hotNewWidget.querySelector('.widget-body .content[data-name="all"]');
    const firstPage = latestContent?.querySelector('.page:not(.hidden)');
    const segmentHtml = firstPage?.innerHTML || latestContent?.innerHTML || '';
    if (segmentHtml) newAdditions = parseGenericAnimeList(segmentHtml);
  }
  if (ongoingWidget) {
    const items = ongoingWidget.querySelectorAll('.owl-item .item, .film-list .item, .widget-body > .item, a.poster');
    const seen = new Set<string>();
    items.forEach((item: any) => {
      const anime = parseAnimeItem(item);
      if (!anime || seen.has(anime.id)) return;
      seen.add(anime.id);
      ongoing.push(anime);
    });
  }
  const rankingWidget = root.querySelector('.widget.ranking');
  if (rankingWidget) {
    const parseRanking = (dataName: string): Anime[] => {
      const list: Anime[] = [];
      const seen = new Set<string>();
      const content = rankingWidget.querySelector(`.content[data-name="${dataName}"]`);
      if (!content) return list;
      const entries = [...content.querySelectorAll('.item-top'), ...content.querySelectorAll('.item')];
      entries.forEach((entry: any) => {
        const anime = parseAnimeItem(entry);
        if (!anime || seen.has(anime.id)) return;
        seen.add(anime.id);
        list.push(anime);
      });
      return list;
    };
    topAnimeDay = parseRanking('day');
    topAnimeWeek = parseRanking('week');
    topAnimeMonth = parseRanking('month');
  }
  return {
    newAdditions,
    randomAnime: ongoing,
    carousel,
    topAnime: {
      day: topAnimeDay,
      week: topAnimeWeek,
      month: topAnimeMonth
    }
  };
};
export const fetchHomePageSectionsAnimeWorld = async (): Promise<HomePageSections> => {
  try {
    const html = await getPage('/');
    return parseHomePageSectionsAnimeWorldHtml(html);
  } catch (e) {
    console.error('AnimeWorld homepage scrape failed', e);
    return {
      newAdditions: [],
      randomAnime: [],
      carousel: []
    };
  }
};
export const fetchLatestEpisodesAnimeWorld = async (): Promise<Anime[]> => {
  try {
    const html = await getPage('/updated?page=1');
    return parseGenericAnimeList(html);
  } catch (e) {
    console.error('AnimeWorld latest episodes scrape failed', e);
    return [];
  }
};
export const fetchAnimeDetailsAnimeWorld = async (url: string): Promise<AnimeDetail | null> => {
  try {
    const html = await getPage(url);
    const page = parse(html);
    const image = page.querySelector('#thumbnail-watch > img')?.getAttribute('src') || '';
    const title = page.querySelector('h2.title')?.text.trim() || '';
    const descNode = page.querySelector('div.desc');
    const description = descNode ? descNode.text.replace(/\s+/g, ' ').trim() : 'Nessuna descrizione disponibile';
    const infoRow = page.querySelector('#main > div > div.widget.info > div > div > div.info.col-md-9 > div.row');
    const infoDd = infoRow ? infoRow.querySelectorAll('dd') : [];
    const getDdText = (i: number): string | undefined => infoDd[i] ? infoDd[i].text.trim() : undefined;
    const category = getDdText(0);
    const audio = getDdText(1);
    const releaseDate = getDdText(2);
    const season = getDdText(3);
    const studioText = infoDd[4] ? infoDd[4].querySelectorAll('a').map(e => e.text.trim()).join(', ') : undefined;
    const genres = infoDd[5] ? infoDd[5].querySelectorAll('a').map(a => a.text.trim()) : [];
    const ratingText = getDdText(6);
    const durata = getDdText(7);
    const numberEpisode = getDdText(8);
    const status = getDdText(9);
    const viewsText = getDdText(10);
    let existEpisodes: number | undefined;
    if (numberEpisode) {
      const parsed = parseInt(numberEpisode, 10);
      if (!Number.isNaN(parsed)) existEpisodes = parsed;
    }
    let views: number | undefined;
    if (viewsText) {
      const numeric = parseInt(viewsText.replace(/[^0-9]/g, ''), 10);
      if (!Number.isNaN(numeric)) views = numeric;
    }
    const episodes = page.querySelectorAll('div.server a');
    const episodeList = episodes.map((episodeEl, idx) => {
      const titleEp = episodeEl.text.trim() || `Ep ${idx + 1}`;
      const dataId = episodeEl.getAttribute('data-id') || '';
      const refererPath = episodeEl.getAttribute('href') || '';
      const referer = resolveUrl(refererPath);
      const token = `aw-episode:${dataId}:${encodeURIComponent(referer)}`;
      return {
        id: dataId || `${idx + 1}`,
        number: titleEp,
        url: token
      };
    });
    const nextEpEl = page.querySelector('#next-episode');
    let nextEpisode: string | undefined;
    if (nextEpEl) {
      const date = nextEpEl.getAttribute('data-calendar-date') || '';
      const time = nextEpEl.getAttribute('data-calendar-time') || '';
      nextEpisode = `${date} ${time}`.trim();
    }
    const finalUrl = resolveUrl(url);
    const id = getAnimeIdFromUrl(finalUrl) || finalUrl;
    const anilistLink = page.querySelector('#anilist-button')?.getAttribute('href') || undefined;
    const myanimelistLink = page.querySelector('#mal-button')?.getAttribute('href') || undefined;
    return {
      id,
      url: finalUrl,
      title,
      image,
      description,
      genres,
      episodeUrl: '',
      episodeList,
      existEpisodes: episodeList.length || existEpisodes,
      studio: studioText,
      status,
      releaseDate,
      episodeDuration: durata,
      views,
      ratingText,
      viewsText,
      category,
      audio,
      season,
      nextEpisode,
      anilistLink,
      myanimelistLink
    };
  } catch (e) {
    console.error('AnimeWorld anime details scrape failed', e);
    return null;
  }
};
export const fetchEpisodeVideoUrlAnimeWorld = async (tokenOrUrl: string): Promise<string | null> => {
  try {
    let dataId: string | null = null;
    let referer: string | null = null;
    if (tokenOrUrl.startsWith('aw-episode:')) {
      const parts = tokenOrUrl.substring('aw-episode:'.length).split(':');
      dataId = parts[0] || null;
      referer = parts[1] ? decodeURIComponent(parts[1]) : null;
    }
    if (!dataId) return null;
    if (!sessionCookie) {
      await getPage('/');
    }
    const headers: Record<string, string> = {
      'User-Agent': userAgent,
      'X-Requested-With': 'XMLHttpRequest'
    };
    if (sessionCookie) headers['Cookie'] = sessionCookie;
    if (referer) headers['Referer'] = referer;
    const url = `${AW_BASE_URL}/api/episode/info?id=${encodeURIComponent(dataId)}`;
    const response = await client.get(url, {
      headers
    });
    const json = response.data as any;
    const grabber: string = json?.grabber || '';
    if (!grabber) return null;
    const linkIndex = grabber.indexOf('link=');
    return linkIndex !== -1 ? grabber.substring(linkIndex + 5) : grabber;
  } catch (e) {
    console.error('AnimeWorld episode video URL fetch failed', e);
    return null;
  }
};
