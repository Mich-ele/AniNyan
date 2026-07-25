import { Anime, AnimeDetail, Episode } from '../types/anime';

type AnimeEpisodeSource = Pick<Anime, 'existEpisodes'> & {
  episodeList?: Episode[];
};

export const getEpisodeNumber = (value: string): number | null => {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) {
    return null;
  }

  const episodeNumber = Number(normalized);
  return Number.isFinite(episodeNumber) ? episodeNumber : null;
};

export const getAnimeEpisodeNumbers = (anime: AnimeEpisodeSource): number[] => {
  const explicitNumbers = anime.episodeList?.map(episode => getEpisodeNumber(episode.number));

  if (
    explicitNumbers &&
    explicitNumbers.length === anime.episodeList?.length &&
    explicitNumbers.every((episodeNumber): episodeNumber is number => episodeNumber !== null) &&
    new Set(explicitNumbers).size === explicitNumbers.length
  ) {
    return explicitNumbers;
  }

  const episodeCount = anime.existEpisodes ?? 0;
  return Array.from({ length: episodeCount }, (_, index) => index + 1);
};

export const getEpisodeByNumber = (anime: AnimeDetail, episodeNumber: number): Episode | undefined =>
  anime.episodeList?.find(episode => getEpisodeNumber(episode.number) === episodeNumber);
