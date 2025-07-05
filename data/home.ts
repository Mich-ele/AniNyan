import { Anime } from '@/types/anime';

interface HomeData {
  featured: Anime;
  continueWatching: Anime[];
  upcoming: Anime[];
}

export const homeData: HomeData = {
  featured: {
    id: '1',
    title: 'Demon Slayer',
    subtitle: 'Kimetsu no Yaiba',
    image: 'https://img.flawlessfiles.com/_r/1920x1080/100/e3/86/e3862b68bce249499839286c1660c1d7/e3862b68bce249499839286c1660c1d7.jpg',
  },
  continueWatching: [
    {
      id: '2',
      title: 'Attack on Titan',
      subtitle: 'Season 2, Episode 2',
      image: 'https://img.flawlessfiles.com/_r/300x400/100/a1/97/a197922d579435600497534d4933900b/a197922d579435600497534d4933900b.jpg',
      progress: 60,
    },
    {
      id: '3',
      title: 'My Hero Academia',
      subtitle: 'Season 1, Episode 3',
      image: 'https://img.flawlessfiles.com/_r/300x400/100/a5/60/a5601550233613b38e8594315f2ed62d/a5601550233613b38e8594315f2ed62d.jpg',
      progress: 25,
    },
  ],
  upcoming: [
    {
      id: '4',
      title: 'Jujutsu Kaisen',
      image: 'https://img.flawlessfiles.com/_r/300x400/100/70/43/7043a8526d71c980345b8f6833a23367/7043a8526d71c980345b8f6833a23367.jpg',
    },
    {
      id: '5',
      title: 'Chainsaw Man',
      image: 'https://img.flawlessfiles.com/_r/300x400/100/58/07/58074036a719c23aa123b37199e31579/58074036a719c23aa123b37199e31579.jpg',
    },
    {
      id: '6',
      title: 'Vinland Saga',
      image: 'https://img.flawlessfiles.com/_r/300x400/100/98/be/98be9e6c287e076392335327282fc7a8/98be9e6c287e076392335327282fc7a8.jpg',
    },
  ],
};
