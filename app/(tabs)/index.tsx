import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Image, ActivityIndicator, Dimensions, StatusBar, RefreshControl, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect, Stack, useNavigation } from 'expo-router';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { fetchLatestEpisodes, fetchHomePageSections } from '../../services/scraperManager';
import { theme, fw } from '../styles/theme';
import { Ionicons } from '@expo/vector-icons';
import { getContinueWatchingList, removeWatchedEpisode, getWatchedEpisodes } from '../../services/cacheService';
import { Anime, CarouselItem } from '../../types/anime';
import { PremiumAnimeCard } from '../../components/PremiumAnimeCard';
import { useHideTabBarOnScroll } from '../../hooks/useTabBarVisibility';
import { AnimeProvider, getUserPreferences } from '../../services/userPreferences';
const {
  width,
  height: screenHeight
} = Dimensions.get('window');
const HERO_MIN = 430;
const HERO_MAX = 560;
const HERO_HEIGHT = Math.min(HERO_MAX, Math.max(HERO_MIN, screenHeight * 0.64));
const IS_SMALL = width < 380;
const BOTTOM_PADDING = IS_SMALL ? 120 : 100;
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedCard = ({
  children,
  onPress,
  style,
  index = 0
}: any) => {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{
      scale: scale.value
    }]
  }));
  return <Animated.View entering={FadeInDown.duration(400).delay(Math.min(index * 50, 500))} style={style}>
      <AnimatedPressable onPress={onPress} onPressIn={() => {
        scale.value = withSpring(0.96, {
          damping: 20,
          stiffness: 400
        });
      }} onPressOut={() => {
        scale.value = withSpring(1, {
          damping: 20,
          stiffness: 400
        });
      }} style={[styles.animatedCardPressable, animatedStyle]}>
        {children}
      </AnimatedPressable>
    </Animated.View>;
};
const AnimatedHeroButton = ({
  onPress,
  children,
  style
}: any) => {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{
      scale: scale.value
    }]
  }));
  return <AnimatedPressable onPress={onPress} onPressIn={() => {
    scale.value = withSpring(0.95, {
      damping: 20,
      stiffness: 400
    });
  }} onPressOut={() => {
    scale.value = withSpring(1, {
      damping: 20,
      stiffness: 400
    });
  }} style={[style, animatedStyle]}>
      {children}
    </AnimatedPressable>;
};
type HeroCarouselItem = CarouselItem & {
  nextEpisode?: number;
  category?: string;
  audio?: string;
  genresText?: string;
  descriptionFull?: string;
};
const EnhancedSectionHeader = ({
  title,
  cta
}: {
  title: string;
  cta?: string;
}) => <View style={styles.enhancedSectionHeader}>
    <View style={styles.sectionTitleGroup}>
      <View style={styles.sectionAccent} />
      <Text style={styles.enhancedSectionTitle}>{title}</Text>
    </View>
    {cta && <View style={styles.sectionCtaRow}>
        <Text style={styles.enhancedSectionCta}>{cta}</Text>
        <Ionicons name="chevron-forward" size={14} color={theme.colorPalette.accent.primary} />
      </View>}
  </View>;
const EnhancedAnimeCard = ({
  anime,
  showProgress,
  rank,
  style,
  onPress,
  index = 0
}: {
  anime: Anime;
  showProgress?: boolean;
  rank?: number;
  style?: any;
  onPress: () => void;
  index?: number;
}) => {
  return <PremiumAnimeCard anime={anime} onPress={onPress} index={index} width={136} progress={showProgress ? anime.progress : undefined} badge={showProgress ? 'Continua' : undefined} rank={rank} style={style} />;
};
const WideAnimeCard = ({
  anime,
  onPress,
  index = 0
}: {
  anime: Anime;
  onPress: () => void;
  index?: number;
}) => {
  return <AnimatedCard onPress={onPress} index={index} style={styles.wideAnimeCard}>
      <View style={{
      flex: 1
    }}>
        <Image source={{
        uri: anime.image
      }} style={styles.wideAnimeImage} />
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.9)']} style={styles.wideAnimeOverlay}>
          <Text style={styles.wideAnimeTitle} numberOfLines={2}>{anime.title}</Text>
          {anime.subtitle && <Text style={styles.wideAnimeSubtitle} numberOfLines={1}>{anime.subtitle}</Text>}
        </LinearGradient>
      </View>
    </AnimatedCard>;
};
const CarouselCard = ({
  item,
  onPress,
  onRemove
}: {
  item: HeroCarouselItem;
  onPress: () => void;
  onRemove?: () => void;
}) => {
  const isContinueWatching = typeof item.nextEpisode === 'number';
  const ageTag = item.category || '16+';
  const audioTag = item.audio || 'Dub | Sub';
  const genresTag = item.genresText || 'Action, Fantasy, Shonen';
  const descriptionText = item.descriptionFull || item.description;
  return <View style={[styles.carouselCard, {
    height: HERO_HEIGHT
  }]}>
      {isContinueWatching ? <Image source={{
      uri: item.image
    }} style={styles.carouselImage} /> : <TouchableOpacity style={styles.carouselArtworkButton} onPress={onPress} activeOpacity={0.9}>
          <Image source={{
        uri: item.image
      }} style={styles.carouselImage} />
        </TouchableOpacity>}

      <LinearGradient colors={["rgba(0,0,0,0.8)", "transparent"]} style={styles.carouselGradientTop} />

      <LinearGradient colors={["transparent", "rgba(0,0,0,0.3)", "rgba(0,0,0,1)", theme.colorPalette.primary.background]} locations={[0.0, 0.4, 0.8, 1]} style={styles.carouselGradient}>
        <View style={styles.heroContentOverlay}>
          <View style={styles.heroKickerRow}>
            <View style={styles.heroAccentMark} />
            <Text style={styles.heroKicker}>{isContinueWatching ? 'Riprendi da dove eri rimasto' : 'In evidenza oggi'}</Text>
          </View>
          <Text style={styles.carouselTitle} numberOfLines={2}>{item.title}</Text>

          <View style={styles.heroMetaRow}>
            <Text style={styles.heroMetaTag}>{ageTag}</Text>
            <Text style={styles.heroMetaDot}>•</Text>
            <Text style={styles.heroMetaTag}>{audioTag}</Text>
            <Text style={styles.heroMetaDot}>•</Text>
            <Text style={styles.heroMetaTag}>{genresTag}</Text>
          </View>

          <Text style={styles.heroDescription} numberOfLines={2}>
            {descriptionText}
          </Text>

          <View style={styles.heroButtonRow}>
            <AnimatedHeroButton style={styles.heroCtaButton} onPress={onPress}>
              <Ionicons name="play" size={20} color="#ffffff" style={styles.heroCtaIcon} />
              <Text style={styles.heroCtaText}>
                {isContinueWatching ? `Continua${item.nextEpisode ? ` E${item.nextEpisode}` : ''}` : 'Guarda ora'}
              </Text>
            </AnimatedHeroButton>
            <TouchableOpacity style={styles.heroInfoButton} onPress={onPress}>
              <Ionicons name="information-circle-outline" size={22} color={theme.colorPalette.text.primary} />
            </TouchableOpacity>
            {isContinueWatching && onRemove && <TouchableOpacity style={styles.heroRemoveButton} onPress={onRemove}>
                <Ionicons name="trash-outline" size={22} color={theme.colorPalette.text.primary} />
              </TouchableOpacity>}
          </View>
        </View>
      </LinearGradient>
    </View>;
};
class HomeErrorBoundary extends React.Component<{
  children: React.ReactNode;
}, {
  hasError: boolean;
}> {
  constructor(props: any) {
    super(props);
    this.state = {
      hasError: false
    };
  }
  static getDerivedStateFromError() {
    return {
      hasError: true
    };
  }
  componentDidCatch(error: any, info: any) {
    console.error('HomeScreen ErrorBoundary caught:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return <View style={{
        flex: 1,
        backgroundColor: theme.colorPalette.primary.background,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32
      }}>
          <Ionicons name="warning-outline" size={48} color={theme.colorPalette.accent.primary} />
          <Text style={{
          color: theme.colorPalette.text.primary,
          fontSize: 18,
          fontWeight: '700',
          marginTop: 16,
          textAlign: 'center'
        }}>
            Qualcosa è andato storto
          </Text>
          <Text style={{
          color: theme.colorPalette.text.secondary,
          fontSize: 14,
          marginTop: 8,
          textAlign: 'center'
        }}>
            Premi per riprovare
          </Text>
          <TouchableOpacity onPress={() => this.setState({
          hasError: false
        })} style={{
          marginTop: 20,
          backgroundColor: theme.colorPalette.accent.primary,
          paddingHorizontal: 24,
          paddingVertical: 12,
          borderRadius: 8
        }}>
            <Text style={{
            color: '#fff',
            fontWeight: '700',
            fontSize: 16
          }}>Riprova</Text>
          </TouchableOpacity>
        </View>;
    }
    return this.props.children;
  }
}
let sessionCache: {
  provider?: AnimeProvider;
  continueWatching?: {
    anime: Anime;
    nextEpisode: number;
  }[];
  newAdditions?: Anime[];
  randomAnime?: Anime[];
  latestEpisodes?: Anime[];
  carouselData?: CarouselItem[];
  topAnime?: {
    day: Anime[];
    week: Anime[];
    month: Anime[];
  } | null;
} = {};
const ContentSection = React.memo(({
  item,
  index,
  heroCarousel,
  carouselRef,
  activeHeroIndex,
  setActiveHeroIndex,
  topAnimeFilter,
  setTopAnimeFilter,
  activeProvider,
  handleCarouselPress,
  handleRemoveFromContinueWatching,
  handleAnimePress
}: any) => {
  const isFeaturedSection = item.type === 'featured';
  const isTopAnimeSection = item.type === 'topAnime';
  const isFirstSection = index === 0;
  const isContinueWatchingSection = item.type === 'continueWatching';
  const showScrollHint = heroCarousel.length > 1;
  const getItemLayout = (_: any, idx: number) => ({
    length: width,
    offset: width * idx,
    index: idx
  });
  return <View>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      {isFirstSection && heroCarousel.length > 0 && <View style={styles.carouselContainer}>

          <FlatList ref={carouselRef} data={heroCarousel} horizontal pagingEnabled showsHorizontalScrollIndicator={false} renderItem={({
        item: carouselItem
      }) => <CarouselCard item={carouselItem} onPress={() => handleCarouselPress(carouselItem)} onRemove={carouselItem.nextEpisode ? () => handleRemoveFromContinueWatching(carouselItem.id) : undefined} />} keyExtractor={(carouselItem, idx) => `hero-${carouselItem.id}-${idx}`} snapToInterval={width} decelerationRate="fast" getItemLayout={getItemLayout} onScrollToIndexFailed={() => {}} onMomentumScrollEnd={event => {
        const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
        setActiveHeroIndex(nextIndex);
      }} contentContainerStyle={styles.carouselContentContainer} />

          <View style={styles.heroTopBar}>
            <View style={styles.brandLockup}>
              <Image source={require('@/assets/images/icon.png')} style={styles.logoIcon} />
              <View>
                <Text style={styles.brandName}>ANINYAN</Text>
              </View>
            </View>
          </View>
          {showScrollHint && <View style={styles.carouselIndicators}>
              {heroCarousel.map((carouselItem: HeroCarouselItem, heroIndex: number) => <View key={`indicator-${carouselItem.id}-${heroIndex}`} style={[styles.carouselIndicator, activeHeroIndex === heroIndex && styles.carouselIndicatorActive]} />)}
            </View>}
        </View>}
      {!isContinueWatchingSection && <>
          {isTopAnimeSection ? <View style={styles.enhancedSectionHeader}>
              <View style={styles.sectionTitleGroup}>
                <View style={styles.sectionAccent} />
                <Text style={styles.enhancedSectionTitle}>{item.title}</Text>
              </View>
              <View style={styles.topAnimeTabs}>
                {(['day', 'week', 'month'] as const).map(period => <TouchableOpacity key={period} style={[styles.topAnimeTab, topAnimeFilter === period && styles.topAnimeTabActive]} onPress={() => setTopAnimeFilter(period)}>
                    <Text style={[styles.topAnimeTabText, topAnimeFilter === period && styles.topAnimeTabTextActive]}>
                      {activeProvider === 'animeunity'
                        ? period === 'day' ? 'Popolari' : period === 'week' ? 'Più visti' : 'Voto'
                        : period === 'day' ? 'Giorno' : period === 'week' ? 'Settimana' : 'Mese'}
                    </Text>
                  </TouchableOpacity>)}
              </View>
            </View> : <EnhancedSectionHeader title={item.title} />}
          <FlatList horizontal data={item.data} renderItem={({
        item: animeItem,
        index: idx
      }) => {
        const isContinueWatching = item.type === 'continueWatching';
        const anime = isContinueWatching ? animeItem.anime : animeItem;
        const animeForCard: Anime = isContinueWatching ? {
          ...anime,
          subtitle: `Episodio ${animeItem.nextEpisode}`
        } : anime;
        if (isFeaturedSection) {
          return <WideAnimeCard anime={animeForCard} onPress={() => handleAnimePress(anime)} index={idx} />;
        }
        return <EnhancedAnimeCard anime={animeForCard} showProgress={isContinueWatching} onPress={() => handleAnimePress(anime)} index={idx} rank={isTopAnimeSection ? idx + 1 : undefined} style={isTopAnimeSection ? styles.rankingCard : undefined} />;
      }} keyExtractor={(animeItem, index) => `${item.type}-${item.type === 'continueWatching' ? animeItem.anime.id : animeItem.id}-${index}`} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.enhancedHorizontalList} ItemSeparatorComponent={() => <View style={styles.itemSeparator} />} />
        </>}
    </View>;
});
ContentSection.displayName = 'ContentSection';
function HomeScreenInner() {
  const router = useRouter();
  const {
    onScroll: onTabBarScroll
  } = useHideTabBarOnScroll();
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [latestEpisodes, setLatestEpisodes] = useState<Anime[]>([]);
  const [newAdditions, setNewAdditions] = useState<Anime[]>([]);
  const [randomAnime, setRandomAnime] = useState<Anime[]>([]);
  const [topAnime, setTopAnime] = useState<{
    day: Anime[];
    week: Anime[];
    month: Anime[];
  } | null>(null);
  const [topAnimeFilter, setTopAnimeFilter] = useState<'day' | 'week' | 'month'>('month');
  const [activeProvider, setActiveProvider] = useState<AnimeProvider>('animeunity');
  const [continueWatching, setContinueWatching] = useState<{
    anime: Anime;
    nextEpisode: number;
  }[]>([]);
  const [contentSections, setContentSections] = useState<any[]>([]);
  const [carouselData, setCarouselData] = useState<CarouselItem[]>([]);
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);
  const carouselRef = useRef<FlatList>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const providerRef = useRef<AnimeProvider | null>(sessionCache.provider || null);
  const applyProviderSections = useCallback((sections: any) => {
    const carousel = sections.carousel || [];
    const newItems = sections.newAdditions || [];
    const randomItems = sections.randomAnime || [];
    const top = sections.topAnime || null;
    setNewAdditions(newItems);
    setRandomAnime(randomItems);
    setCarouselData(carousel);
    setTopAnime(top);
    sessionCache.newAdditions = newItems;
    sessionCache.randomAnime = randomItems;
    sessionCache.carouselData = carousel;
    sessionCache.topAnime = top;
  }, []);
  const heroCarousel: HeroCarouselItem[] = continueWatching.length > 0 ? continueWatching.map(({
    anime,
    nextEpisode
  }) => {
    const extendedAnime = anime as Anime & {
      description?: string;
      genres?: string[];
      category?: string;
      audio?: string;
      ratingText?: string;
      viewsText?: string;
    };
    const genresText = extendedAnime.genres && extendedAnime.genres.length > 0 ? extendedAnime.genres.slice(0, 3).join(', ') : undefined;
    return {
      id: extendedAnime.id,
      image: extendedAnime.image,
      title: extendedAnime.title,
      url: extendedAnime.url,
      description: extendedAnime.description || `Episodio ${nextEpisode}`,
      nextEpisode,
      category: extendedAnime.category,
      audio: extendedAnime.audio,
      genresText,
      descriptionFull: extendedAnime.description
    };
  }) : carouselData;
  const safeFetch = useCallback(async <T,>(fetcher: () => Promise<T>, cacheKey: keyof typeof sessionCache, fallback: T): Promise<T> => {
    try {
      const result = await fetcher();
      (sessionCache as any)[cacheKey] = result;
      return result;
    } catch (error) {
      console.warn(`Failed to fetch ${cacheKey}, using cached data:`, error);
      return (sessionCache as any)[cacheKey] as T ?? fallback;
    }
  }, []);
  const fetchFreshData = useCallback(async () => {
    try {
      const provider = (await getUserPreferences()).animeProvider;
      setActiveProvider(provider);
      if (providerRef.current !== provider) {
        providerRef.current = provider;
        sessionCache = {
          provider,
          continueWatching: sessionCache.continueWatching,
        };
        setNewAdditions([]);
        setRandomAnime([]);
        setLatestEpisodes([]);
        setCarouselData([]);
        setTopAnime(null);
        setActiveHeroIndex(0);
      }
      const [watched, sections, latest] = await Promise.all([safeFetch(() => getContinueWatchingList(), 'continueWatching', []), safeFetch(() => fetchHomePageSections(), 'newAdditions', null), safeFetch(() => fetchLatestEpisodes(), 'latestEpisodes', [])]);
      setContinueWatching(watched as {
        anime: Anime;
        nextEpisode: number;
      }[]);
      if (sections && typeof sections === 'object' && 'newAdditions' in (sections as any)) {
        const s = sections as any;
        applyProviderSections(s);
      } else {
        setNewAdditions(sessionCache.newAdditions || []);
        setRandomAnime(sessionCache.randomAnime || []);
        setCarouselData(sessionCache.carouselData || []);
        setTopAnime(sessionCache.topAnime || null);
      }
      setLatestEpisodes(latest as Anime[]);
    } catch (error) {
      console.error('Failed to load home screen data:', error);
      setContinueWatching(sessionCache.continueWatching || []);
      setNewAdditions(sessionCache.newAdditions || []);
      setRandomAnime(sessionCache.randomAnime || []);
      setLatestEpisodes(sessionCache.latestEpisodes || []);
      setCarouselData(sessionCache.carouselData || []);
      setTopAnime(sessionCache.topAnime || null);
    }
  }, [applyProviderSections, safeFetch]);
  const loadData = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      await fetchFreshData();
    } catch (e) {
      console.error('loadData unexpected error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchFreshData]);
  const refreshContinueWatching = useCallback(async () => {
    try {
      const watched = await getContinueWatchingList();
      setContinueWatching(watched);
      sessionCache.continueWatching = watched;
    } catch (e) {
      console.error('Failed to refresh continue watching:', e);
    }
  }, []);
  useFocusEffect(useCallback(() => {
    let active = true;
    const refreshFocusedScreen = async () => {
      const provider = (await getUserPreferences()).animeProvider;
      if (!active) return;
      if (providerRef.current !== provider) {
        await loadData(true);
        return;
      }
      await refreshContinueWatching();
    };
    void refreshFocusedScreen();
    return () => {
      active = false;
    };
  }, [loadData, refreshContinueWatching]));
  useEffect(() => {
    const unsub = navigation.addListener('tabPress', () => {
      refreshContinueWatching();
    });
    return unsub;
  }, [navigation, refreshContinueWatching]);
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      setLoading(true);
      try {
        await fetchFreshData();
      } catch (e) {
        console.error('Initial fetch failed:', e);
        if (mounted) {
          retryTimerRef.current = setTimeout(async () => {
            if (!mounted) return;
            try {
              await fetchFreshData();
            } catch (retryError) {
              console.error('Retry also failed:', retryError);
            }
          }, 3000);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    init();
    return () => {
      mounted = false;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, [fetchFreshData]);
  useEffect(() => {
    const sections: any[] = [];
    if (continueWatching.length > 0) {
      sections.push({
        type: 'continueWatching',
        title: 'Continua a guardare',
        data: continueWatching
      });
    }
    if (carouselData.length > 0) {
      const featured: Anime[] = carouselData.map(item => ({
        id: item.id,
        title: item.title,
        image: item.image,
        url: item.url,
        subtitle: item.description
      }));
      sections.push({
        type: 'featured',
        title: 'In Evidenza',
        data: featured
      });
    }
    if (topAnime) {
      const activeList = topAnime[topAnimeFilter] || [];
      if (activeList.length > 0) {
        sections.push({
          type: 'topAnime',
          title: 'Top Anime',
          data: activeList
        });
      }
    }
    if (activeProvider === 'animeunity') {
      if (latestEpisodes.length > 0) {
        sections.push({
          type: 'topPicks',
          title: 'Ultimi Episodi',
          data: latestEpisodes
        });
      }
      if (newAdditions.length > 0) {
        sections.push({
          type: 'randomAnime',
          title: 'Ultime aggiunte',
          data: newAdditions
        });
      }
    } else {
      if (newAdditions.length > 0) {
        sections.push({
          type: 'topPicks',
          title: 'Ultimi Episodi',
          data: newAdditions
        });
      } else if (latestEpisodes.length > 0) {
        sections.push({
          type: 'topPicks',
          title: 'Ultimi Episodi',
          data: latestEpisodes
        });
      }
      if (randomAnime.length > 0) {
        sections.push({
          type: 'randomAnime',
          title: 'In Corso',
          data: randomAnime
        });
      }
    }
    setContentSections(sections);
  }, [activeProvider, continueWatching, carouselData, newAdditions, randomAnime, topAnime, topAnimeFilter, latestEpisodes]);
  const handleAnimePress = (anime: Anime) => {
    router.push({
      pathname: '/anime',
      params: {
        url: anime.url
      }
    });
  };
  const handleCarouselPress = (item: CarouselItem) => {
    router.push({
      pathname: '/anime',
      params: {
        url: item.url
      }
    });
  };
  const handleRemoveFromContinueWatching = async (animeId: string) => {
    try {
      const watchedEpisodes = await getWatchedEpisodes(animeId);
      for (const episodeNumber of watchedEpisodes) {
        await removeWatchedEpisode(animeId, episodeNumber);
      }
      loadData(true);
    } catch (error) {
      console.error('Failed to remove from continue watching:', error);
    }
  };
  const onRefresh = useCallback(() => {
    loadData(true);
  }, [loadData]);
  const renderContentSection = ({
    item,
    index
  }: {
    item: any;
    index: number;
  }) => <ContentSection item={item} index={index} heroCarousel={heroCarousel} carouselRef={carouselRef} activeHeroIndex={activeHeroIndex} setActiveHeroIndex={setActiveHeroIndex} topAnimeFilter={topAnimeFilter} setTopAnimeFilter={setTopAnimeFilter} activeProvider={activeProvider} handleCarouselPress={handleCarouselPress} handleRemoveFromContinueWatching={handleRemoveFromContinueWatching} handleAnimePress={handleAnimePress} />;
  return <View style={styles.container}>
      <LinearGradient colors={[theme.colorPalette.primary.background, theme.colorPalette.primary.background]} style={styles.gradientBackground}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <Stack screenOptions={{
          header: () => null
        }} />
          <FlatList data={contentSections} renderItem={renderContentSection} keyExtractor={(item, index) => `${item.type}-${index}`} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} onScroll={onTabBarScroll} scrollEventThrottle={16} ListEmptyComponent={loading ? <View style={styles.emptyStateContainer}>
                  <ActivityIndicator size="large" color={theme.colorPalette.accent.primary} />
                </View> : null} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colorPalette.accent.primary} colors={[theme.colorPalette.accent.primary]} progressBackgroundColor={theme.colorPalette.primary.backgroundSecondary} />} />

        </SafeAreaView>
      </LinearGradient>
    </View>;
}
export default function HomeScreen() {
  return <HomeErrorBoundary>
      <HomeScreenInner />
    </HomeErrorBoundary>;
}
const styles = StyleSheet.create({
  animatedCardPressable: {
    flex: 1
  },
  container: {
    flex: 1,
    backgroundColor: theme.colorPalette.primary.background
  },
  gradientBackground: {
    flex: 1
  },
  safeArea: {
    flex: 1
  },
  loaderContainer: {
    flex: 1,
    backgroundColor: theme.colorPalette.primary.background,
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center'
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  logoText: {
    color: theme.colorPalette.text.primary,
    fontSize: 20,
    fontWeight: '700',
    fontFamily: theme.typography.fontFamily.primaryBold,
    marginLeft: 8,
    letterSpacing: 0.5
  },
  newBadge: {
    backgroundColor: theme.colorPalette.accent.primary,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 10
  },
  newBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: theme.typography.fontFamily.primaryBold,
    textTransform: 'uppercase'
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingBottom: 8
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colorPalette.primary.backgroundTertiary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 4,
    marginRight: 12
  },
  activeFilterChip: {
    backgroundColor: theme.colorPalette.accent.primary
  },
  filterEmoji: {
    fontSize: 18,
    marginRight: 8
  },
  filterText: {
    color: theme.colorPalette.text.primary,
    fontSize: 15,
    fontWeight: '500',
    fontFamily: theme.typography.fontFamily.primary
  },
  activeFilterText: {
    color: theme.colorPalette.text.primary,
    fontWeight: '600',
    fontFamily: theme.typography.fontFamily.primaryBold
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: BOTTOM_PADDING,
    backgroundColor: theme.colorPalette.primary.background
  },
  emptyStateContainer: {
    flex: 1,
    minHeight: screenHeight,
    paddingHorizontal: 20,
    paddingTop: 120,
    paddingBottom: BOTTOM_PADDING,
    alignItems: 'center'
  },
  section: {
    marginTop: 28,
    marginBottom: 16
  },
  contentSectionn: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: "ComicNeue-Regular",
    color: theme.colorPalette.text.primary
  },
  enhancedSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
    marginTop: 30
  },
  sectionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1
  },
  sectionAccent: {
    width: 4,
    height: 22,
    borderRadius: 2,
    marginRight: 10,
    backgroundColor: theme.colorPalette.accent.primary
  },
  enhancedSectionTitle: {
    color: theme.colorPalette.text.primary,
    fontFamily: theme.typography.fontFamily.primaryBold,
    fontSize: 21,
    letterSpacing: -0.3
  },
  sectionCtaRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  enhancedSectionCta: {
    color: theme.colorPalette.accent.primary,
    fontSize: 13,
    fontWeight: fw(theme.typography.weights.medium),
    letterSpacing: 0.5
  },
  topAnimeTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colorPalette.primary.backgroundSecondary,
    borderRadius: 8,
    padding: 3
  },
  topAnimeTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6
  },
  topAnimeTabActive: {
    backgroundColor: theme.colorPalette.accent.primary
  },
  topAnimeTabText: {
    color: theme.colorPalette.text.secondary,
    fontSize: 12,
    fontFamily: theme.typography.fontFamily.primary,
    fontWeight: '500'
  },
  topAnimeTabTextActive: {
    color: '#ffffff',
    fontFamily: theme.typography.fontFamily.primaryBold
  },
  enhancedHorizontalList: {
    paddingHorizontal: 20,
    paddingBottom: 20
  },
  itemSeparator: {
    width: 14
  },
  rankingCard: {
    width: 136
  },
  enhancedAnimeCard: {
    width: 128,
    maxWidth: 128
  },
  enhancedImageContainer: {
    position: 'relative',
    marginBottom: 9,
    width: 128
  },
  enhancedAnimeImage: {
    width: 128,
    height: 184,
    borderRadius: 8,
    backgroundColor: theme.colorPalette.primary.backgroundSecondary
  },
  enhancedProgressContainer: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 2,
    overflow: 'hidden'
  },
  enhancedProgressBar: {
    height: 4,
    width: '100%',
    borderRadius: 2
  },
  enhancedProgressFill: {
    height: '100%',
    backgroundColor: theme.colorPalette.accent.primary,
    borderRadius: 2
  },
  enhancedAnimeTitle: {
    color: theme.colorPalette.text.primary,
    fontSize: 14,
    fontWeight: '700',
    fontFamily: theme.typography.fontFamily.primaryBold,
    marginBottom: 2
  },
  enhancedAnimeSubtitle: {
    color: theme.colorPalette.text.secondary,
    fontSize: 12,
    fontFamily: theme.typography.fontFamily.primary,
    opacity: 0.8
  },
  wideAnimeCard: {
    width: width * 0.78,
    height: 176,
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: theme.colorPalette.primary.backgroundSecondary
  },
  wideAnimeImage: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colorPalette.primary.backgroundSecondary
  },
  wideAnimeOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    justifyContent: 'flex-end'
  },
  wideAnimeTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontFamily: theme.typography.fontFamily.primaryBold,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {
      width: 0,
      height: 2
    },
    textShadowRadius: 4
  },
  wideAnimeSubtitle: {
    color: '#dddddd',
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.primary,
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {
      width: 0,
      height: 1
    },
    textShadowRadius: 3
  },
  carouselContainer: {
    marginTop: 0,
    marginBottom: 2
  },
  carouselContentContainer: {
    paddingHorizontal: 0
  },
  carouselCard: {
    width: width,
    height: 800,
    marginRight: 0,
    borderRadius: 2,
    overflow: 'hidden',
    position: 'relative'
  },
  carouselImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover'
  },
  carouselArtworkButton: {
    width: '100%',
    height: '100%'
  },
  carouselGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '100%',
    justifyContent: 'flex-end'
  },
  carouselGradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '20%'
  },
  heroContentOverlay: {
    paddingHorizontal: 20,
    paddingBottom: 38
  },
  carouselTitle: {
    color: theme.colorPalette.text.primary,
    fontSize: IS_SMALL ? 29 : 34,
    fontWeight: '700',
    fontFamily: theme.typography.fontFamily.primaryBold,
    lineHeight: IS_SMALL ? 34 : 39,
    marginBottom: 12,
    letterSpacing: -0.7
  },
  heroKickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  heroAccentMark: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: theme.colorPalette.accent.primary,
    marginRight: 8
  },
  heroKicker: {
    color: theme.colorPalette.text.secondary,
    fontSize: 12,
    fontFamily: theme.typography.fontFamily.primaryBold,
    textTransform: 'uppercase',
    letterSpacing: 0.8
  },
  carouselDescription: {
    color: theme.colorPalette.text.primary,
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.primary,
    lineHeight: 20
  },
  heroMetaContainer: {
    paddingHorizontal: 20,
    marginTop: 12
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap'
  },
  heroMetaTag: {
    color: theme.colorPalette.text.secondary,
    fontSize: 11,
    fontFamily: theme.typography.fontFamily.primaryBold
  },
  heroMetaDot: {
    color: theme.colorPalette.text.secondary,
    fontSize: 12,
    marginHorizontal: 4
  },
  heroDescription: {
    color: theme.colorPalette.text.secondary,
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.primary,
    lineHeight: 19,
    marginBottom: 20
  },
  heroButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12
  },
  heroCtaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colorPalette.accent.primary,
    paddingHorizontal: 18,
    height: 48,
    borderRadius: 2,
    flex: 1
  },
  heroInfoButton: {
    width: 48,
    height: 48,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colorPalette.surface.raised
  },
  heroRemoveButton: {
    width: 48,
    height: 48,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colorPalette.surface.raised
  },
  heroCtaIcon: {
    marginRight: 8
  },
  heroCtaText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: theme.typography.fontFamily.primaryBold
  },
  carouselIndicators: {
    position: 'absolute',
    right: 20,
    bottom: 22,
    flexDirection: 'row',
    alignItems: 'center'
  },
  carouselIndicator: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginLeft: 6
  },
  carouselIndicatorActive: {
    width: 22,
    backgroundColor: theme.colorPalette.accent.primary
  },
  carouselCtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 16
  },
  carouselPrimaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: 48,
    borderRadius: 8,
    backgroundColor: theme.colorPalette.accent.primary,
    marginRight: 12
  },
  carouselPrimaryIcon: {
    marginRight: 8
  },
  carouselPrimaryText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: theme.typography.fontFamily.primaryBold
  },
  carouselSecondaryButton: {
    width: 48,
    height: 48,
    borderRadius: 2,
    backgroundColor: theme.colorPalette.surface.raised,
    alignItems: 'center',
    justifyContent: 'center'
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    justifyContent: 'space-between'
  },
  gridItem: {
    width: (width - 60) / 3,
    aspectRatio: 2 / 3,
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden'
  },
  gridImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover'
  },
  heroTopBar: {
    position: 'absolute',
    top: 16,
    left: 20,
    right: 20,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  brandLockup: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  logoIcon: {
    width: 36,
    height: 36,
    marginRight: 9
  },
  brandName: {
    color: theme.colorPalette.text.primary,
    fontFamily: theme.typography.fontFamily.primaryBold,
    fontSize: 15,
    letterSpacing: 1.6
  },
  brandTagline: {
    color: theme.colorPalette.text.tertiary,
    fontFamily: theme.typography.fontFamily.primaryBold,
    fontSize: 7,
    letterSpacing: 1.3,
    marginTop: 1
  },
  premiumPill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 4,
    backgroundColor: theme.colorPalette.surface.raised
  },
  premiumPillText: {
    color: theme.colorPalette.accent.secondary,
    fontSize: 9,
    fontFamily: theme.typography.fontFamily.primaryBold,
    letterSpacing: 0.7,
    marginLeft: 5
  }
});
