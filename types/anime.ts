export interface Anime {
  id: string;
  title: string;
  image: string;
  url: string;
  subtitle?: string;
  logo?: string;
  progress?: number;
  rating?: number;
  year?: number;
  episodes?: number;
  existEpisodes?: number;
}

export interface Episode {
  id: string;
  number: string;
  url: string;
}

export interface AnimeDetail extends Anime {
  description: string;
  genres: string[];
  episodeUrl: string;
  studio?: string;
  status?: string;
  releaseDate?: string;
  episodeDuration?: string;
  views?: number;
  episodeList?: Episode[];
}

export interface HomePageSections {
  newAdditions: Anime[];
  randomAnime: Anime[];
}

export interface CarouselItem {
  id: string;
  image: string;
  title: string;
  url: string;
  description: string;
}