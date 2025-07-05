import axios from 'axios';
import { parse } from 'node-html-parser';
import { Anime, AnimeDetail, CarouselItem, HomePageSections } from '../types/anime';
import { getAnimeIdFromUrl } from '../utils/utils';

const BASE_URL = 'https://www.animesaturn.cx';

export const getAnimeDetails = async (url: string): Promise<AnimeDetail | null> => {
  try {
    const { data: html } = await axios.get(url);
    const root = parse(html);

    const title = root.querySelector('h1.font-weight-bold')?.text.trim() || '';
    const image = root.querySelector('.cover-image')?.getAttribute('src') || '';
    const description = root.querySelector('.desc-anime')?.text.trim() || '';
    const genres = root.querySelectorAll('.generi a').map(genre => genre.text.trim());
    const status = root.querySelector('dd.stato')?.text.trim();
    const studio = root.querySelector('dd.studio')?.text.trim();
    const releaseDate = root.querySelector('dd.data')?.text.trim();

    const episodes: { number: string; url: string }[] = root.querySelectorAll('.bottone-ep a').map(ep => ({
      number: ep.text.trim(),
      url: ep.getAttribute('href') || '',
    }));

    const id = getAnimeIdFromUrl(url);

    if (!id) return null;

    return {
      id,
      url,
      title,
      image,
      description,
      genres,
      status,
      studio,
      releaseDate,
      episodeUrl: episodes.length > 0 ? episodes[0].url : '', // Default to first episode
      episodes: episodes.length,
      episodeList: episodes.map(ep => ({...ep, id: ep.url})),
    };
  } catch (error) {
    console.error('Error fetching anime details:', error);
    return null;
  }
};

export const searchAnime = async (query: string): Promise<Anime[]> => {
  if (!query) {
    return [];
  }
  try {
    const searchUrl = `https://www.animesaturn.cx/index.php?search=1&key=${encodeURIComponent(query)}`;
    const { data } = await axios.get<any[]>(searchUrl);

    if (!Array.isArray(data)) {
      return [];
    }

    const animeList: Anime[] = data.map(item => {
      const url = `${BASE_URL}/anime/${item.link}`;
      const id = getAnimeIdFromUrl(url);
      return {
        id: id || item.link,
        url: url,
        title: item.name,
        image: item.image,
      };
    }).filter((anime): anime is Anime => !!anime.id && !!anime.url && !!anime.title);

    return animeList;
  } catch (error) {
    console.error('Error searching anime:', error);
    return [];
  }
};
const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
    'scheme': 'https',
    'accept': 'text/html, */*; q=0.01',
    'accept-encoding': 'identity',
    'pragma': 'no-cache',
    'referer': 'https://www.animesaturn.cx/',
    'sec-ch-ua': '"Google Chrome";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'x-requested-with': 'XMLHttpRequest',
  },
});

export const fetchLatestEpisodes = async (): Promise<Anime[]> => {
  try {
    const response = await client.get('/fetch_pages.php?request=episodes');
    const html = response.data;
    const episodes: Anime[] = [];

    const regex = /<div class="anime-card main-anime-card">.*?<a href="([^"]*)" title="([^"]*)"><img src="([^"]*)".*?<div class="anime-episode">\s*([^<]*?)\s*<\/div>/gs;
    let match;

    while ((match = regex.exec(html)) !== null) {
      const episodeUrlPath = match[1];
      const animeSlug = episodeUrlPath.split("-ep-")[0].split("/ep/")[1];
      const title = match[2];
      const image = match[3];
      const episodeText = match[4].trim();

      if (title && image && animeSlug) {
        episodes.push({
          id: episodeUrlPath,
          title: title,
          image: image,
          subtitle: episodeText,
          url: "https://www.animesaturn.cx/anime/" + animeSlug,
        });
      }
    }

    return episodes;
  } catch (error) {
    console.error('Failed to fetch latest episodes:', error);
    return [];
  }
};

export const fetchAnimeDetails = async (url: string): Promise<AnimeDetail | null> => {
  try {
    const { data: html } = await client.get(url);

    // Essential info
    const titleRegex = /<title>AnimeSaturn - (.*?)<\/title>/s;
    const imageRegex = /<meta property="og:image" content="(.*?)"\s*\/?>/s;

    // New Regexes based on the updated HTML structure
    const descriptionRegex = /<div id="shown-trama">\s*(.*?)\s*<\/div>/s;
    const studioRegex = /<b>Studio:<\/b>\s*(.*?)<br/s;
    const statusRegex = /<b>Stato:<\/b>\s*(.*?)<br/s;
    const releaseDateRegex = /<b>Data di uscita:<\/b>\s*(.*?)<br/s;
    const episodesRegex = /<b>Episodi:<\/b>\s*(.*?)<br/s;
    const episodeDurationRegex = /<b>Durata episodi:<\/b>\s*(.*?)<br/s;
    const viewsRegex = /<b>Visualizzazioni:<\/b>\s*(.*?)<br/s;
    const ratingRegex = /<b>Voto:<\/b>\s*([\d\.]+\/5)/s;
    const genresRegex = /class="badge badge-light generi-as mb-1">([^<]+)<\/a>/g;
    const actualEpisodeRegex = /class="btn-group episodes-button episodi-link-button">([^<]+)/g;
    const episodeUrlRegex = /<a\s+href="(.*?)"\s+target="_blank"\s+class="btn btn-dark mb-1 bottone-ep">[\s\S]*?Episodio 1[\s\S]*?<\/a>/;

    const titleMatch = html.match(titleRegex);
    const imageMatch = html.match(imageRegex);

    if (!titleMatch || !imageMatch) {
      console.error('Failed to parse essential anime details (title or image) from HTML for url:', url);
      return null;
    }

    if (titleMatch[1].includes("Streaming")) {
      titleMatch[1] = titleMatch[1].split("Streaming")[0];
    }

    const descriptionMatch = html.match(descriptionRegex);
    const studioMatch = html.match(studioRegex);
    const statusMatch = html.split(studioMatch[1].trim())[1].match(statusRegex);
    const releaseDateMatch = html.match(releaseDateRegex);
    const episodesMatch = html.match(episodesRegex);
    const episodeDurationMatch = html.match(episodeDurationRegex);
    const viewsMatch = html.match(viewsRegex);
    const ratingMatch = html.match(ratingRegex);
    const actualEpisodeMatch = html.match(actualEpisodeRegex);
    const episodeUrlMatch = html.match(episodeUrlRegex);

    let genres: string[] = [];
    let match;
    while ((match = genresRegex.exec(html)) !== null) {
      genres.push(match[1]);
    }

    let episodesBtn: string[] = [];
    let episodesMatchBtn;
    while ((episodesMatchBtn = actualEpisodeRegex.exec(html)) !== null) {
      episodesBtn.push(episodesMatchBtn[1]);
    }

    const episodeUrl = episodeUrlMatch ? episodeUrlMatch[1].trim().split("-ep-")[0] + "-ep-" : '';

    const id = getAnimeIdFromUrl(url);
    if (!id) {
      console.error('Failed to parse anime ID from URL:', url);
      return null;
    }

    const details: AnimeDetail = {
      id,
      url,
      title: titleMatch[1].trim(),
      description: descriptionMatch ? descriptionMatch[1].trim() : 'No description available.',
      image: imageMatch[1].trim(),
      studio: studioMatch ? studioMatch[1].trim() : 'N/A',
      status: statusMatch ? statusMatch[1].trim() : 'N/A',
      releaseDate: releaseDateMatch ? releaseDateMatch[1].trim() : 'N/A',
      episodes: episodesMatch ? episodesMatch[1].trim() : 'N/A',
      episodeDuration: episodeDurationMatch ? episodeDurationMatch[1].trim() : 'N/A',
      views: viewsMatch ? viewsMatch[1].trim() : 'N/A',
      rating: ratingMatch ? ratingMatch[1].trim() : 'N/A',
      genres,
      existEpisodes: episodesBtn.length,
      episodeUrl: episodeUrl,
    };

    return details;

  } catch (error) {
    console.error('Failed to fetch anime details:', error);
    return null;
  }
};

export const fetchCarouselData = async (): Promise<CarouselItem[]> => {
  try {
    const { data: html } = await client.get('/');
    const carouselItems: CarouselItem[] = [];

    const root = parse(html);

    root.querySelectorAll('.carousel-item').forEach((item) => {
      const url = item.querySelector('a')?.getAttribute('href');
      const image = item.querySelector('img')?.getAttribute('src');
      const title = item.querySelector('.carousel-caption h5')?.text.trim();
      const description = item.querySelector('.carousel-caption p')?.text.trim();

      if (url && image && title && description) {
        carouselItems.push({
          id: url, // Using URL as ID
          url: `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url.trim()}`,
          image: `${BASE_URL}${image.startsWith('/') ? '' : '/'}${image.trim()}`,
          title,
          description,
        });
      }
    });

    return carouselItems;
  } catch (error) {
    console.error('Failed to fetch carousel data:', error);
    return [];
  }
};

export const fetchEpisodeVideoUrl = async (url: string): Promise<string | null> => {
  try {
    const { data: initialHtml } = await client.get(url);
    const root = parse(initialHtml);
    const watchLink = root.querySelector('a[href*="watch?file="]')?.getAttribute('href');

    if (!watchLink) {
      console.error('Could not find watch link on page:', url);
      return null;
    }

    const { data: watchHtml } = await client.get(watchLink);
    const watchRoot = parse(watchHtml);
    const videoSrc = watchRoot.querySelector('video#myvideo source')?.getAttribute('src');

    if (!videoSrc) {
      console.error('Could not find video source on page:', watchLink);
      return null;
    }

    return videoSrc;
  } catch (error) {
    console.error('Failed to fetch episode video URL:', error);
    return null;
  }
};

// Fetches sections like 'New Additions' and 'Random Anime' from the main page
export const fetchHomePageSections = async (): Promise<HomePageSections> => {
  try {
    const { data: html } = await client.get('/');
    const root = parse(html);

    const sections: HomePageSections = {
      newAdditions: [],
      randomAnime: [],
    };

    // Helper function to parse a section
    const parseSection = (headerText: string): Anime[] => {
      const animeList: Anime[] = [];
      const header = root.querySelectorAll('h4').find(h => h.text.trim().includes(headerText));
      
      if (header) {
        const container = header.parentNode;
        container.querySelectorAll('.anime-card-newanime').forEach(card => {
          const link = card.querySelector('a');
          const img = card.querySelector('img');
          
          const url = link?.getAttribute('href');
          const title = link?.getAttribute('title');
          const image = img?.getAttribute('src');

          if (url && title && image) {
            animeList.push({
              id: getAnimeIdFromUrl(url) || url,
              url,
              title,
              image,
            });
          }
        });
      }
      return animeList;
    };

    sections.newAdditions = parseSection('Nuove aggiunte');
    sections.randomAnime = parseSection('Anime random');

    return sections;
  } catch (error) {
    console.error('Failed to fetch homepage sections:', error);
    return { newAdditions: [], randomAnime: [] };
  }
};
