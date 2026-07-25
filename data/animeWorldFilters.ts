export type AnimeWorldFilterOption = {
  id: string;
  label: string;
  query: string;
};

export type AnimeWorldFilterGroup = {
  id: string;
  label: string;
  hint: string;
  multi: boolean;
  options: AnimeWorldFilterOption[];
};

const genre = (id: string, label: string, value: number): AnimeWorldFilterOption => ({
  id,
  label,
  query: `&genre=${value}`,
});

export const ANIMEWORLD_GENRES: AnimeWorldFilterOption[] = [
  genre('martial-arts', 'Arti Marziali', 3),
  genre('avant-garde', 'Avanguardia', 5),
  genre('adventure', 'Avventura', 2),
  genre('action', 'Azione', 1),
  genre('kids', 'Bambini', 47),
  genre('comedy', 'Commedia', 4),
  genre('demons', 'Demoni', 6),
  genre('drama', 'Drammatico', 7),
  genre('ecchi', 'Ecchi', 8),
  genre('fantasy', 'Fantasy', 9),
  genre('game', 'Gioco', 10),
  genre('harem', 'Harem', 11),
  genre('hentai', 'Hentai', 43),
  genre('horror', 'Horror', 13),
  genre('josei', 'Josei', 14),
  genre('magic', 'Magia', 16),
  genre('mecha', 'Mecha', 18),
  genre('military', 'Militari', 19),
  genre('mystery', 'Mistero', 21),
  genre('music', 'Musicale', 20),
  genre('parody', 'Parodia', 22),
  genre('police', 'Polizia', 23),
  genre('psychological', 'Psicologico', 24),
  genre('romance', 'Romantico', 46),
  genre('samurai', 'Samurai', 26),
  genre('sci-fi', 'Sci-Fi', 28),
  genre('school', 'Scolastico', 27),
  genre('seinen', 'Seinen', 29),
  genre('sentimental', 'Sentimentale', 25),
  genre('shoujo', 'Shoujo', 30),
  genre('shoujo-ai', 'Shoujo Ai', 31),
  genre('shounen', 'Shounen', 32),
  genre('shounen-ai', 'Shounen Ai', 33),
  genre('slice-of-life', 'Slice of Life', 34),
  genre('space', 'Spazio', 35),
  genre('supernatural', 'Soprannaturale', 37),
  genre('sports', 'Sport', 36),
  genre('historical', 'Storico', 12),
  genre('super-power', 'Superpoteri', 38),
  genre('thriller', 'Thriller', 39),
  genre('vampire', 'Vampiri', 40),
  genre('vehicles', 'Veicoli', 48),
  genre('yaoi', 'Yaoi', 41),
  genre('yuri', 'Yuri', 42),
];

export const ANIMEWORLD_YEARS: AnimeWorldFilterOption[] = Array.from(
  { length: 2027 - 1966 + 1 },
  (_, index) => {
    const year = String(2027 - index);
    return { id: year, label: year, query: `&year=${year}` };
  },
);

export const ANIMEWORLD_FILTER_GROUPS: AnimeWorldFilterGroup[] = [
  {
    id: 'genres',
    label: 'Generi',
    hint: '44 generi disponibili',
    multi: true,
    options: ANIMEWORLD_GENRES,
  },
  {
    id: 'season',
    label: 'Stagioni',
    hint: 'Periodo di pubblicazione',
    multi: true,
    options: [
      { id: 'winter', label: 'Inverno', query: '&season=winter' },
      { id: 'spring', label: 'Primavera', query: '&season=spring' },
      { id: 'summer', label: 'Estate', query: '&season=summer' },
      { id: 'fall', label: 'Autunno', query: '&season=fall' },
      { id: 'unknown', label: 'Sconosciuta', query: '&season=unknown' },
    ],
  },
  {
    id: 'year',
    label: 'Anno',
    hint: 'Dal 1966 al 2027',
    multi: true,
    options: ANIMEWORLD_YEARS,
  },
  {
    id: 'type',
    label: 'Tipo',
    hint: 'Formato del contenuto',
    multi: true,
    options: [
      { id: 'anime', label: 'Anime', query: '&type=0' },
      { id: 'movie', label: 'Movie', query: '&type=4' },
      { id: 'ova', label: 'OVA', query: '&type=1' },
      { id: 'ona', label: 'ONA', query: '&type=2' },
      { id: 'special', label: 'Special', query: '&type=3' },
      { id: 'music', label: 'Music', query: '&type=5' },
    ],
  },
  {
    id: 'status',
    label: 'Stato',
    hint: 'Stato di pubblicazione',
    multi: true,
    options: [
      { id: 'airing', label: 'In corso', query: '&status=0' },
      { id: 'finished', label: 'Finito', query: '&status=1' },
      { id: 'upcoming', label: 'Non rilasciato', query: '&status=2' },
      { id: 'dropped', label: 'Droppato', query: '&status=3' },
    ],
  },
  {
    id: 'subtitles',
    label: 'Sottotitoli',
    hint: 'Subbato o doppiato',
    multi: true,
    options: [
      { id: 'subbed', label: 'Subbato', query: '&dub=0' },
      { id: 'dubbed', label: 'Doppiato', query: '&dub=1' },
    ],
  },
  {
    id: 'audio',
    label: 'Audio',
    hint: 'Lingua originale',
    multi: true,
    options: [
      { id: 'jp', label: 'Giapponese', query: '&language=jp' },
      { id: 'it', label: 'Italiano', query: '&language=it' },
      { id: 'ch', label: 'Cinese', query: '&language=ch' },
      { id: 'kr', label: 'Coreano', query: '&language=kr' },
      { id: 'en', label: 'Inglese', query: '&language=en' },
    ],
  },
  {
    id: 'order',
    label: 'Ordine',
    hint: 'Come ordinare i risultati',
    multi: false,
    options: [
      { id: 'standard', label: 'Standard', query: '&sort=0' },
      { id: 'latest', label: 'Ultime aggiunte', query: '&sort=1' },
      { id: 'az', label: 'Lista A-Z', query: '&sort=2' },
      { id: 'za', label: 'Lista Z-A', query: '&sort=3' },
      { id: 'oldest', label: 'Più vecchi', query: '&sort=4' },
      { id: 'newest', label: 'Più recenti', query: '&sort=5' },
      { id: 'views', label: 'Più visti', query: '&sort=6' },
      { id: 'rating', label: 'Meglio valutati', query: '&sort=7' },
    ],
  },
];

export const DEFAULT_ANIMEWORLD_FILTERS: Record<string, string[]> = {
  type: ['anime'],
  order: ['standard'],
};