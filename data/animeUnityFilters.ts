import { AnimeWorldFilterGroup, AnimeWorldFilterOption } from './animeWorldFilters';

const option = (id: string, label: string, query: string): AnimeWorldFilterOption => ({
  id,
  label,
  query,
});

const genre = (value: number, label: string): AnimeWorldFilterOption =>
  option(String(value), label, `&genre=${value}`);

export const ANIMEUNITY_GENRES: AnimeWorldFilterOption[] = [
  genre(51, 'Action'),
  genre(21, 'Adventure'),
  genre(43, 'Avant Garde'),
  genre(59, 'Boys Love'),
  genre(37, 'Comedy'),
  genre(13, 'Demons'),
  genre(22, 'Drama'),
  genre(5, 'Ecchi'),
  genre(9, 'Fantasy'),
  genre(44, 'Game'),
  genre(58, 'Girls Love'),
  genre(52, 'Gore'),
  genre(56, 'Gourmet'),
  genre(15, 'Harem'),
  genre(4, 'Hentai'),
  genre(30, 'Historical'),
  genre(3, 'Horror'),
  genre(53, 'Isekai'),
  genre(45, 'Josei'),
  genre(14, 'Kids'),
  genre(57, 'Mahou Shoujo'),
  genre(31, 'Martial Arts'),
  genre(38, 'Mecha'),
  genre(46, 'Military'),
  genre(16, 'Music'),
  genre(24, 'Mystery'),
  genre(32, 'Parody'),
  genre(39, 'Police'),
  genre(47, 'Psychological'),
  genre(29, 'Racing'),
  genre(54, 'Reincarnation'),
  genre(17, 'Romance'),
  genre(25, 'Samurai'),
  genre(33, 'School'),
  genre(40, 'Sci-fi'),
  genre(49, 'Seinen'),
  genre(18, 'Shoujo'),
  genre(34, 'Shounen'),
  genre(50, 'Slice of Life'),
  genre(19, 'Space'),
  genre(27, 'Sports'),
  genre(35, 'Super Power'),
  genre(42, 'Supernatural'),
  genre(55, 'Survival'),
  genre(48, 'Thriller'),
  genre(20, 'Vampire'),
];

const ANIMEUNITY_YEARS: AnimeWorldFilterOption[] = Array.from(
  { length: 2027 - 1966 + 1 },
  (_, index) => {
    const year = String(2027 - index);
    return option(year, year, `&year=${year}`);
  },
);

export const ANIMEUNITY_FILTER_GROUPS: AnimeWorldFilterGroup[] = [
  {
    id: 'genres',
    label: 'Genere',
    hint: '46 generi disponibili',
    multi: true,
    options: ANIMEUNITY_GENRES,
  },
  {
    id: 'year',
    label: 'Anno',
    hint: 'Dal 1966 al 2027',
    multi: false,
    options: ANIMEUNITY_YEARS,
  },
  {
    id: 'order',
    label: 'Ordine',
    hint: 'Ordina i risultati',
    multi: false,
    options: [
      option('az', 'Lista A-Z', '&order=Lista%20A-Z'),
      option('za', 'Lista Z-A', '&order=Lista%20Z-A'),
      option('popular', 'Popolarità', '&order=Popolarit%C3%A0'),
      option('rating', 'Valutazione', '&order=Valutazione'),
    ],
  },
  {
    id: 'status',
    label: 'Stato',
    hint: 'Stato di pubblicazione',
    multi: false,
    options: [
      option('airing', 'In Corso', '&status=In%20Corso'),
      option('finished', 'Terminato', '&status=Terminato'),
      option('upcoming', 'In Uscita', '&status=In%20Uscita'),
      option('dropped', 'Droppato', '&status=Droppato'),
    ],
  },
  {
    id: 'type',
    label: 'Tipo',
    hint: 'Formato del contenuto',
    multi: false,
    options: [
      option('tv', 'TV', '&type=TV'),
      option('tv-short', 'TV Short', '&type=TV%20Short'),
      option('ova', 'OVA', '&type=OVA'),
      option('ona', 'ONA', '&type=ONA'),
      option('special', 'Special', '&type=Special'),
      option('movie', 'Movie', '&type=Movie'),
    ],
  },
  {
    id: 'season',
    label: 'Stagione',
    hint: 'Periodo di pubblicazione',
    multi: false,
    options: [
      option('winter', 'Inverno', '&season=Inverno'),
      option('spring', 'Primavera', '&season=Primavera'),
      option('summer', 'Estate', '&season=Estate'),
      option('fall', 'Autunno', '&season=Autunno'),
    ],
  },
  {
    id: 'subtitles',
    label: 'Doppiaggio',
    hint: 'Solo contenuti doppiati',
    multi: false,
    options: [
      option('dubbed', 'Dub ITA', '&dub=1'),
    ],
  },
];

export const DEFAULT_ANIMEUNITY_FILTERS: Record<string, string[]> = {
  order: ['popular'],
};
