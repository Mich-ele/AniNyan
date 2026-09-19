import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, ActivityIndicator, ImageBackground, TouchableOpacity, StatusBar, Platform, Animated, Linking, PanResponder, GestureResponderEvent, PanResponderGestureState, Dimensions } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { fetchAnimeDetailsWithScraper, fetchEpisodeVideoUrl } from '../services/scraperManager';
import { getWatchedEpisodes, addWatchedEpisode, removeWatchedEpisode, isAnimeInWatchlist, addToWatchlist, removeFromWatchlist } from '../services/cacheService';
import { Anime, AnimeDetail } from '../types/anime';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getAnimeIdFromUrl } from '../utils/utils';
import { theme } from './styles/theme';
import { getAnimeEpisodeNumbers, getEpisodeByNumber } from '../utils/episodeUtils';
const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);
interface EpisodeButtonProps {
  episodeNumber: number;
  isWatched: boolean;
  isLoading: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onToggleWatched: () => void;
}
const EpisodeButton: React.FC<EpisodeButtonProps> = ({
  episodeNumber,
  isWatched,
  isLoading,
  onPress,
  onLongPress,
  onToggleWatched
}) => {
  const fillAnimation = useRef(new Animated.Value(0)).current;
  const selectionAnim = useRef(new Animated.Value(isWatched ? 1 : 0)).current;
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    Animated.timing(selectionAnim, {
      toValue: isWatched ? 1 : 0,
      duration: 300,
      useNativeDriver: true
    }).start();
  }, [isWatched]);
  const startFillAnimation = () => {
    fillAnimation.setValue(0);
    Animated.timing(fillAnimation, {
      toValue: 1,
      duration: 500,
      useNativeDriver: false
    }).start();
  };
  const resetFillAnimation = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    Animated.timing(fillAnimation, {
      toValue: 0,
      duration: 150,
      useNativeDriver: false
    }).start();
  };
  const handlePressIn = () => {
    startFillAnimation();
  };
  const handlePressOut = () => {
    resetFillAnimation();
  };
  const fillScale = fillAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 2.5]
  });
  const fillOpacity = fillAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.3, 0.5]
  });
  const selectionOpacity = selectionAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1]
  });
  const selectionScale = selectionAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1]
  });
  return <View style={styles.episodeButtonContainer}>
      <TouchableOpacity style={[styles.episodeButton, isWatched && styles.watchedEpisodeButton]} onPress={onPress} onLongPress={onLongPress} onPressIn={handlePressIn} onPressOut={handlePressOut} delayLongPress={500} disabled={isLoading} activeOpacity={0.8}>

        <Animated.View style={[styles.watchedFillLayer, {
        opacity: selectionOpacity,
        transform: [{
          scale: selectionScale
        }]
      }]} />


        <Animated.View style={[styles.fillAnimationOverlay, {
        transform: [{
          scale: fillScale
        }],
        opacity: fillOpacity
      }]} />

        {isLoading ? <View style={styles.loadingOverlay}>
            <ActivityIndicator color={theme.colorPalette.text.primary} size="small" />
          </View> : <Text style={[styles.episodeButtonText, isWatched && styles.watchedEpisodeButtonText]}>
            {episodeNumber}
          </Text>}
      </TouchableOpacity>
      {isWatched && <TouchableOpacity style={styles.watchedIconContainer} onPress={onToggleWatched}>
          <Ionicons name="checkmark-circle" size={28} color="#ef8a5bff" />
        </TouchableOpacity>}
    </View>;
};
const RelatedAnimeCard = ({ anime, onPress }: { anime: Anime; onPress: () => void }) => (
  <TouchableOpacity style={styles.relatedCard} onPress={onPress} activeOpacity={0.82}>
    <ImageBackground
      source={{ uri: anime.image }}
      style={styles.relatedImage}
      imageStyle={styles.relatedImageStyle}
    >
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.92)']}
        style={styles.relatedGradient}
      >
        <Text style={styles.relatedTitle} numberOfLines={2}>{anime.title}</Text>
        {anime.subtitle && (
          <Text style={styles.relatedSubtitle} numberOfLines={1}>{anime.subtitle}</Text>
        )}
      </LinearGradient>
    </ImageBackground>
  </TouchableOpacity>
);
const AnimeDetailScreen = () => {
  const {
    url,
    autoplayEpisode
  } = useLocalSearchParams<{
    url: string;
    autoplayEpisode?: string;
  }>();
  const router = useRouter();
  const [anime, setAnime] = useState<AnimeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingEpisode, setLoadingEpisode] = useState<number | null>(null);
  const [watchedEpisodes, setWatchedEpisodes] = useState<Set<number>>(new Set());
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const PAGE_SIZE = 50;
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const defaultPageSetRef = useRef(false);
  const [watchedLoaded, setWatchedLoaded] = useState(false);
  const autoplayEpisodeStartedRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const gridRef = useRef<View>(null);
  const gridOriginRef = useRef<{
    x: number;
    y: number;
    width: number;
  } | null>(null);
  const initialScrollYRef = useRef<number>(0);
  const touchedDuringDragRef = useRef<Set<number>>(new Set());
  const dragTargetStateRef = useRef<boolean>(false);
  const panResponderRef = useRef<any>(null);
  const handleDragMoveRef = useRef<((evt: GestureResponderEvent) => void) | null>(null);
  const endDragRef = useRef<(() => void) | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const autoScrollIntervalRef = useRef<any>(null);
  const currentScrollYRef = useRef<number>(0);
  const scrollSpeedRef = useRef<number>(0);
  useFocusEffect(useCallback(() => {
    let active = true;
    defaultPageSetRef.current = false;

    const refreshWatchedEpisodes = async () => {
      if (!url) return;
      const animeId = getAnimeIdFromUrl(url);
      if (!animeId) return;
      const watched = await getWatchedEpisodes(animeId);
      if (!active) return;
      setWatchedEpisodes(watched);
      setWatchedLoaded(true);
    };

    void refreshWatchedEpisodes();
    return () => {
      active = false;
    };
  }, [url]));
  useEffect(() => {
    const listenerId = scrollY.addListener(({
      value
    }) => {
      currentScrollYRef.current = value;
    });
    return () => {
      scrollY.removeListener(listenerId);
    };
  }, [scrollY]);
  useEffect(() => {
    const loadData = async () => {
      if (url) {
        await loadAnimeDetails();
        await checkWatchlistStatus();
      }
    };
    loadData();
  }, [url]);
  useEffect(() => {
    if (!anime) return;
    const episodeNumbers = getAnimeEpisodeNumbers(anime);
    const total = episodeNumbers.length;
    if (!total) return;
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    setTotalPages(pages);
    if (watchedLoaded && !defaultPageSetRef.current) {
      const lastWatchedIndex = episodeNumbers.reduce(
        (latestIndex, episodeNumber, index) => watchedEpisodes.has(episodeNumber) ? index : latestIndex,
        -1
      );
      if (lastWatchedIndex >= 0) {
        setCurrentPage(Math.min(pages, Math.floor(lastWatchedIndex / PAGE_SIZE) + 1));
      } else {
        setCurrentPage(1);
      }
      defaultPageSetRef.current = true;
    }
  }, [anime, watchedEpisodes, watchedLoaded]);
  useEffect(() => {
    handleDragMoveRef.current = handleDragMove;
    endDragRef.current = endDrag;
  });
  useEffect(() => {
    if (!panResponderRef.current) {
      panResponderRef.current = PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_evt, _gestureState) => isDraggingRef.current,
        onPanResponderGrant: () => {},
        onPanResponderMove: (evt: GestureResponderEvent, _gestureState: PanResponderGestureState) => {
          if (!isDraggingRef.current) return;
          if (handleDragMoveRef.current) handleDragMoveRef.current(evt);
        },
        onPanResponderRelease: () => {
          if (endDragRef.current) endDragRef.current();
        },
        onPanResponderTerminate: () => {
          if (endDragRef.current) endDragRef.current();
        }
      });
    }
  }, []);
  const checkWatchlistStatus = async () => {
    if (url) {
      const id = getAnimeIdFromUrl(url);
      if (id) {
        const inWatchlist = await isAnimeInWatchlist(id);
        setIsInWatchlist(inWatchlist);
      }
    }
  };
  const loadAnimeDetails = async () => {
    if (url) {
      try {
        const details = await fetchAnimeDetailsWithScraper(url);
        setAnime(details);
      } catch (error) {
        console.error("Failed to load anime details", error);
      } finally {
        setLoading(false);
      }
    }
  };
  const handleEpisodePress = async (episodeNumber: number, replaceCurrentRoute = false) => {
    if (!anime) return;
    setLoadingEpisode(episodeNumber);
    try {
      let episodeUrl: string | null = null;
      const episode = getEpisodeByNumber(anime, episodeNumber);
      if (episode) {
        episodeUrl = episode.url;
      } else if (anime.episodeUrl) {
        episodeUrl = `${anime.episodeUrl}${episodeNumber}`;
      }
      if (!episodeUrl) {
        return;
      }
      const videoUrl = await fetchEpisodeVideoUrl(episodeUrl);
      if (videoUrl) {
        const episodeNumbers = getAnimeEpisodeNumbers(anime);
        const episodeIndex = episodeNumbers.indexOf(episodeNumber);
        const nextEpisodeNumber = episodeIndex >= 0 ? episodeNumbers[episodeIndex + 1] : undefined;
        const route = {
          pathname: '/screens/VideoPlayer',
          params: {
            videoUrl,
            title: anime.title,
            animeUrl: url,
            episodeNumber: `${episodeNumber}`,
            hasNextEpisode: `${nextEpisodeNumber !== undefined}`,
            ...(nextEpisodeNumber !== undefined ? { nextEpisodeNumber: `${nextEpisodeNumber}` } : {})
          }
        } as const;
        if (replaceCurrentRoute) {
          router.replace(route);
        } else {
          router.push(route);
        }
        if (url) {
          if (anime) {
            await addWatchedEpisode(anime, episodeNumber);
            setWatchedEpisodes(prev => new Set(prev).add(episodeNumber));
          }
        }
      }
    } catch (error) {
      console.error('Failed to handle episode press:', error);
    } finally {
      setLoadingEpisode(null);
    }
  };
  useEffect(() => {
    const episodeNumber = Number(autoplayEpisode);
    if (!anime || autoplayEpisodeStartedRef.current || !Number.isInteger(episodeNumber) || episodeNumber < 0) {
      return;
    }
    autoplayEpisodeStartedRef.current = true;
    void handleEpisodePress(episodeNumber, true);
  }, [anime, autoplayEpisode]);
  const toggleWatchedImmediate = async (episodeNumber: number) => {
    if (!url) return;
    const id = getAnimeIdFromUrl(url);
    if (!id) return;
    const newSet = new Set(watchedEpisodes);
    if (newSet.has(episodeNumber)) {
      await removeWatchedEpisode(id, episodeNumber);
      newSet.delete(episodeNumber);
    } else {
      if (anime) {
        await addWatchedEpisode(anime, episodeNumber);
        newSet.add(episodeNumber);
      }
    }
    setWatchedEpisodes(newSet);
  };
  const setWatchedToMatchFirst = async (episodeNumber: number) => {
    if (!url) return;
    const id = getAnimeIdFromUrl(url);
    if (!id) return;
    const shouldBeWatched = dragTargetStateRef.current;
    setWatchedEpisodes(prevSet => {
      const newSet = new Set(prevSet);
      if (shouldBeWatched) {
        if (!newSet.has(episodeNumber)) {
          if (anime) {
            addWatchedEpisode(anime, episodeNumber);
            newSet.add(episodeNumber);
          }
        }
      } else {
        if (newSet.has(episodeNumber)) {
          removeWatchedEpisode(id, episodeNumber);
          newSet.delete(episodeNumber);
        }
      }
      return newSet;
    });
  };
  const handleToggleWatched = async (episodeNumber: number) => {
    await toggleWatchedImmediate(episodeNumber);
  };
  const handleToggleWatchlist = async () => {
    if (!anime) return;
    if (isInWatchlist) {
      await removeFromWatchlist(anime.id);
      setIsInWatchlist(false);
    } else {
      await addToWatchlist(anime);
      setIsInWatchlist(true);
    }
  };
  const handlePlayNext = () => {
    if (!anime) return;
    const episodeNumbers = getAnimeEpisodeNumbers(anime);
    const nextEpisodeToPlay = episodeNumbers.find(episodeNumber => !watchedEpisodes.has(episodeNumber)) ?? episodeNumbers[episodeNumbers.length - 1];
    if (nextEpisodeToPlay !== undefined) {
      handleEpisodePress(nextEpisodeToPlay);
    }
  };
  const navBarOpacity = scrollY.interpolate({
    inputRange: [300, 400],
    outputRange: [0, 1],
    extrapolate: 'clamp'
  });
  if (loading) {
    return <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colorPalette.text.primary} />
      </View>;
  }
  if (!anime) {
    return <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Failed to load anime details.</Text>
      </View>;
  }
  const episodeNumbers = getAnimeEpisodeNumbers(anime);
  const listedEpisodes = episodeNumbers.length;
  const totalEpisodes = Math.max(listedEpisodes, anime.existEpisodes || 0);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageEpisodeNumbers = episodeNumbers.slice(pageStart, pageStart + PAGE_SIZE);
  const visibleEpisodeNumbers = pageEpisodeNumbers;
  const ratingDisplay = anime.ratingText || (anime.rating != null ? String(anime.rating) : undefined);
  const viewsDisplay = anime.viewsText || (anime.views != null ? anime.views.toString() : undefined);
  const ratingNumberMatch = ratingDisplay?.match(/(\d+(?:\.\d+)?)/);
  const ratingValue = ratingNumberMatch ? parseFloat(ratingNumberMatch[1]) : undefined;
  const heroTags: string[] = [];
  if (anime.category) heroTags.push(anime.category);
  if (anime.audio) heroTags.push(anime.audio);
  if (anime.genres && anime.genres.length > 0) {
    heroTags.push(anime.genres.slice(0, 3).join(', '));
  }
  const badgeLabel = anime.category || ratingDisplay;
  const badgeSecondary = anime.audio || anime.episodeDuration || undefined;
  const numColumns = 4;
  const episodeNumberFromTouch = (pageX: number, pageY: number): number | null => {
    const origin = gridOriginRef.current;
    if (!origin || !anime) return null;
    const scrollDelta = currentScrollYRef.current - initialScrollYRef.current;
    const effectiveGridY = origin.y - scrollDelta;
    const relativeX = pageX - origin.x;
    const relativeY = pageY - effectiveGridY;
    if (relativeX < 0 || relativeY < 0) return null;
    const itemOuterWidth = origin.width / numColumns;
    const itemOuterHeight = itemOuterWidth;
    const col = Math.floor(relativeX / itemOuterWidth);
    const row = Math.floor(relativeY / itemOuterHeight);
    if (col < 0 || col >= numColumns || row < 0) return null;
    const index = row * numColumns + col;
    return visibleEpisodeNumbers[index] ?? null;
  };
  const startDrag = (episodeNumber: number) => {
    gridRef.current?.measure((x, y, width, height, pageX, pageY) => {
      gridOriginRef.current = {
        x: pageX,
        y: pageY,
        width
      };
      initialScrollYRef.current = currentScrollYRef.current;
      setIsDragging(true);
      isDraggingRef.current = true;
      const wasWatched = watchedEpisodes.has(episodeNumber);
      dragTargetStateRef.current = !wasWatched;
      touchedDuringDragRef.current = new Set<number>();
      touchedDuringDragRef.current.add(episodeNumber);
      setWatchedToMatchFirst(episodeNumber);
    });
  };
  const processAutoScroll = () => {
    if (scrollSpeedRef.current === 0) return;
    const newScrollY = currentScrollYRef.current + scrollSpeedRef.current;
    if (newScrollY < 0) return;
    scrollViewRef.current?.scrollTo({
      y: newScrollY,
      animated: false
    });
  };
  const startAutoScroll = () => {
    if (autoScrollIntervalRef.current) return;
    autoScrollIntervalRef.current = setInterval(processAutoScroll, 16);
  };
  const stopAutoScroll = () => {
    if (autoScrollIntervalRef.current) {
      clearInterval(autoScrollIntervalRef.current);
      autoScrollIntervalRef.current = null;
    }
    scrollSpeedRef.current = 0;
  };
  const handleDragMove = (evt: GestureResponderEvent) => {
    const pageX = evt.nativeEvent.pageX;
    const pageY = evt.nativeEvent.pageY;
    const SCROLL_ZONE_HEIGHT = 100;
    const MAX_SCROLL_SPEED = 15;
    const screenHeight = Dimensions.get('window').height;
    const TOP_THRESHOLD = 150;
    const BOTTOM_THRESHOLD = screenHeight - 100;
    if (pageY < TOP_THRESHOLD) {
      const intensity = (TOP_THRESHOLD - pageY) / SCROLL_ZONE_HEIGHT;
      scrollSpeedRef.current = -MAX_SCROLL_SPEED * Math.min(Math.max(intensity, 0.1), 1);
      startAutoScroll();
    } else if (pageY > BOTTOM_THRESHOLD) {
      const intensity = (pageY - BOTTOM_THRESHOLD) / SCROLL_ZONE_HEIGHT;
      scrollSpeedRef.current = MAX_SCROLL_SPEED * Math.min(Math.max(intensity, 0.1), 1);
      startAutoScroll();
    } else {
      stopAutoScroll();
    }
    const ep = episodeNumberFromTouch(pageX, pageY);
    if (ep === null) return;
    if (touchedDuringDragRef.current.has(ep)) return;
    touchedDuringDragRef.current.add(ep);
    setWatchedToMatchFirst(ep).catch(err => {
      console.error('set watched during drag failed', err);
    });
  };
  const endDrag = () => {
    stopAutoScroll();
    setIsDragging(false);
    isDraggingRef.current = false;
    touchedDuringDragRef.current = new Set<number>();
  };
  return <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <View style={styles.navBar}>
        <Animated.View style={[styles.navBarBackground, {
        opacity: navBarOpacity
      }]} />
        <TouchableOpacity onPress={() => router.back()} style={styles.navButton} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={theme.colorPalette.text.primary} />
        </TouchableOpacity>
      </View>

      <AnimatedScrollView ref={scrollViewRef} onScroll={Animated.event([{
      nativeEvent: {
        contentOffset: {
          y: scrollY
        }
      }
    }], {
      useNativeDriver: true,
      listener: (e: any) => {
        currentScrollYRef.current = e.nativeEvent.contentOffset.y;
      }
    })} scrollEventThrottle={16} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} scrollEnabled={!isDragging}>
        <View style={styles.heroContainer}>
          <ImageBackground source={{
          uri: anime.image
        }} style={styles.heroImage} imageStyle={styles.heroImageStyle}>
            <LinearGradient colors={["rgba(0,0,0,0.8)", "transparent"]} style={styles.carouselGradientTop} />
            <LinearGradient colors={["transparent", "rgba(0,0,0,0.7)", "rgba(0,0,0,0.95)", theme.colorPalette.primary.background]} locations={[0.2, 0.7, 0.8, 1]} style={styles.carouselGradient}>
              <View style={styles.heroContent}>
                <View style={styles.badgeContainer}>
                  {badgeLabel && <View style={styles.ratingBadge}>
                      <Text style={styles.ratingText} numberOfLines={1} ellipsizeMode="tail">
                        {badgeLabel}
                      </Text>
                    </View>}
                  {badgeSecondary && <Text style={styles.durationText}>{badgeSecondary}</Text>}
                </View>
                <Text style={styles.title} numberOfLines={2}>{anime.title}</Text>
                {heroTags.length > 0 && <View style={styles.metaContainer}>
                    {heroTags.map((tag, index) => <React.Fragment key={`${tag}-${index}`}>
                        <Text style={styles.metaText}>{tag}</Text>
                        {index < heroTags.length - 1 && <Text style={styles.metaSeparator}>•</Text>}
                      </React.Fragment>)}
                  </View>}
                {(ratingDisplay || viewsDisplay) && <View style={styles.ratingRow}>
                    <View style={styles.ratingStarsContainer}>
                      {[0, 1, 2, 3, 4].map(index => {
                    let iconName: keyof typeof Ionicons.glyphMap = 'star-outline';
                    if (ratingValue != null) {
                      if (index + 1 <= Math.floor(ratingValue)) {
                        iconName = 'star';
                      } else if (index < ratingValue) {
                        iconName = 'star-half';
                      }
                    }
                    return <Ionicons key={index} name={iconName} size={14} color={theme.colorPalette.accent.primary} style={styles.ratingStarIcon} />;
                  })}
                    </View>
                    <Text style={styles.ratingSummaryText}>
                      {`Average: ${ratingDisplay || '-'}${viewsDisplay ? ` (${viewsDisplay})` : ''}`}
                    </Text>
                  </View>}
              </View>
            </LinearGradient>
          </ImageBackground>
        </View>

        <View style={styles.actionSection}>
          <TouchableOpacity style={styles.playButton} activeOpacity={0.8} onPress={handlePlayNext}>
            <Ionicons name="play" size={18} color="#ffffff" style={styles.playIcon} />
            <Text style={styles.playButtonText}>{watchedEpisodes.size > 0 ? 'Continua' : 'Riproduci'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.favoriteButton} activeOpacity={0.7} onPress={handleToggleWatchlist}>
            <Ionicons name={isInWatchlist ? 'heart' : 'heart-outline'} size={22} color={isInWatchlist ? theme.colorPalette.accent.primary : '#8E8E93'} />
          </TouchableOpacity>
        </View>

        <View style={styles.aboutSection}>
          <Text style={styles.sectionTitle}>Trama</Text>
          <Text style={styles.description} numberOfLines={isDescriptionExpanded ? undefined : 4}>
            {anime.description}
          </Text>
          <TouchableOpacity activeOpacity={0.8} onPress={() => setIsDescriptionExpanded(prev => !prev)}>
            <Text style={styles.moreDetailsText}>
              {isDescriptionExpanded ? 'Mostra meno' : 'Altri dettagli'}
            </Text>
          </TouchableOpacity>

          {anime.genres.length > 0 && <View style={styles.genresSection}>
              <Text style={styles.infoLabel}>Generi</Text>
              <View style={styles.genreChips}>
                {anime.genres.map(genre => <View key={genre} style={styles.genreChip}>
                    <Text style={styles.genreChipText}>{genre}</Text>
                  </View>)}
              </View>
            </View>}

          <View style={styles.infoGrid}>
            {anime.category && <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Tipo</Text>
                <Text style={styles.infoValue}>{anime.category}</Text>
              </View>}
            {totalEpisodes > 0 && <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Episodi</Text>
                <Text style={styles.infoValue}>{totalEpisodes}</Text>
              </View>}
            {anime.episodeDuration && <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Durata episodio</Text>
                <Text style={styles.infoValue}>{anime.episodeDuration}</Text>
              </View>}
            {anime.status && <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Stato</Text>
                <Text style={styles.infoValue}>{anime.status}</Text>
              </View>}
            {(anime.releaseDate || anime.year) && <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Anno</Text>
                <Text style={styles.infoValue}>{anime.releaseDate || anime.year}</Text>
              </View>}
            {anime.season && <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Stagione</Text>
                <Text style={styles.infoValue}>{anime.season}</Text>
              </View>}
            {anime.studio && <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Studio</Text>
                <Text style={styles.infoValue}>{anime.studio}</Text>
              </View>}
            {ratingDisplay && <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Valutazione</Text>
                <Text style={styles.infoValue}>{ratingDisplay}</Text>
              </View>}
            {anime.favoritesText && <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Preferiti</Text>
                <Text style={styles.infoValue}>{anime.favoritesText}</Text>
              </View>}
            {anime.membersText && <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Membri</Text>
                <Text style={styles.infoValue}>{anime.membersText}</Text>
              </View>}
            {viewsDisplay && <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Visite</Text>
                <Text style={styles.infoValue}>{viewsDisplay}</Text>
              </View>}
            {anime.audio && <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Audio</Text>
                <Text style={styles.infoValue}>{anime.audio}</Text>
              </View>}
            {anime.nextEpisode && <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Prossimo episodio</Text>
                <Text style={styles.infoValue}>{anime.nextEpisode}</Text>
              </View>}
          </View>

          {(anime.anilistLink || anime.myanimelistLink) && <View style={styles.externalLinksRow}>
              {anime.anilistLink && <TouchableOpacity style={styles.externalLinkButton} activeOpacity={0.8} onPress={() => Linking.openURL(anime.anilistLink!)}>
                  <Text style={styles.externalLinkText}>Apri su AniList</Text>
                </TouchableOpacity>}
              {anime.myanimelistLink && <TouchableOpacity style={styles.externalLinkButton} activeOpacity={0.8} onPress={() => Linking.openURL(anime.myanimelistLink!)}>
                  <Text style={styles.externalLinkText}>Apri su MyAnimeList</Text>
                </TouchableOpacity>}
            </View>}
        </View>

        <View style={styles.episodesSection}>
          <View style={styles.episodesHeader}>
            <Text style={styles.sectionTitle}>Episodi ({totalEpisodes})</Text>
            {listedEpisodes > PAGE_SIZE && <View style={styles.pagerRow}>
                <TouchableOpacity style={[styles.pagerButton, currentPage <= 1 && styles.pagerButtonDisabled]} disabled={currentPage <= 1} onPress={() => setCurrentPage(p => Math.max(1, p - 1))} activeOpacity={0.7}>
                  <Ionicons name="chevron-back" size={18} color={currentPage <= 1 ? '#666' : theme.colorPalette.text.primary} />
                </TouchableOpacity>
                <Text style={styles.pagerText}>{currentPage} / {totalPages}</Text>
                <TouchableOpacity style={[styles.pagerButton, currentPage >= totalPages && styles.pagerButtonDisabled]} disabled={currentPage >= totalPages} onPress={() => setCurrentPage(p => Math.min(totalPages, p + 1))} activeOpacity={0.7}>
                  <Ionicons name="chevron-forward" size={18} color={currentPage >= totalPages ? '#666' : theme.colorPalette.text.primary} />
                </TouchableOpacity>
              </View>}
          </View>


          <View ref={gridRef} collapsable={false} {...panResponderRef.current ? panResponderRef.current.panHandlers : {}}>
            <FlatList data={visibleEpisodeNumbers} renderItem={({
            item: episodeNumber
          }) => {
            const isWatched = watchedEpisodes.has(episodeNumber);
            return <EpisodeButton episodeNumber={episodeNumber} isWatched={isWatched} isLoading={loadingEpisode === episodeNumber} onPress={() => handleEpisodePress(episodeNumber)} onLongPress={() => startDrag(episodeNumber)} onToggleWatched={() => handleToggleWatched(episodeNumber)} />;
          }} keyExtractor={item => item.toString()} numColumns={numColumns} contentContainerStyle={styles.episodesGrid} scrollEnabled={false} />
          </View>
        </View>
        {anime.relatedAnime && anime.relatedAnime.length > 0 && <View style={styles.relatedSection}>
            <Text style={styles.sectionTitle}>Anime correlati</Text>
            <FlatList
              horizontal
              data={anime.relatedAnime}
              renderItem={({ item }) => <RelatedAnimeCard
                  anime={item}
                  onPress={() => router.push({ pathname: '/anime', params: { url: item.url } })}
                />}
              keyExtractor={item => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.relatedList}
            />
          </View>}
      </AnimatedScrollView>
    </View>;
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colorPalette.primary.background
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colorPalette.primary.background
  },
  errorText: {
    color: theme.colorPalette.text.primary,
    textAlign: 'center',
    fontSize: 16,
    fontFamily: theme.typography.fontFamily.primary
  },
  navBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight! + 12 : 56,
    paddingBottom: 12,
    zIndex: 10
  },
  navBarBackground: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.85)'
  },
  navButton: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.0)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  navRightButtons: {
    flexDirection: 'row',
    gap: 12
  },
  scrollContent: {
    paddingBottom: 40
  },
  heroContainer: {
    height: 580,
    marginBottom: -30
  },
  heroImage: {
    width: '100%',
    height: '100%'
  },
  heroImageStyle: {
    resizeMode: 'cover'
  },
  heroContent: {
    paddingHorizontal: 24,
    paddingBottom: 40
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10
  },
  ratingBadge: {
    backgroundColor: theme.colorPalette.accent.primary,
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  ratingText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: theme.typography.fontFamily.primaryBold,
    textTransform: 'uppercase'
  },
  durationText: {
    color: '#e0e0e0',
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.primary,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    overflow: 'hidden'
  },
  title: {
    fontSize: 36,
    fontFamily: theme.typography.fontFamily.primaryBold,
    color: '#ffffff',
    marginBottom: 16,
    lineHeight: 42,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: {
      width: 0,
      height: 2
    },
    textShadowRadius: 4
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 8
  },
  metaText: {
    color: '#cccccc',
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.primary,
    fontWeight: '500'
  },
  metaSeparator: {
    color: theme.colorPalette.accent.primary,
    fontSize: 16,
    marginHorizontal: 10
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8
  },
  ratingStarsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8
  },
  ratingStarIcon: {
    marginRight: 2
  },
  ratingSummaryText: {
    color: '#e0e0e0',
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.primaryBold
  },
  actionSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 30,
    gap: 12
  },
  playButton: {
    flex: 1,
    backgroundColor: theme.colorPalette.accent.primary,
    borderRadius: 2,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12
  },
  playIcon: {},
  playButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: theme.typography.fontFamily.primaryBold,
    letterSpacing: 0.5
  },
  favoriteButton: {
    width: 52,
    height: 52,
    borderRadius: 2,
    backgroundColor: theme.colorPalette.surface.raised,
    justifyContent: 'center',
    alignItems: 'center'
  },
  aboutSection: {
    paddingHorizontal: 24,
    paddingBottom: 30
  },
  sectionTitle: {
    color: theme.colorPalette.text.primary,
    fontSize: 22,
    fontFamily: theme.typography.fontFamily.primaryBold,
    marginBottom: 12,
    letterSpacing: -0.2
  },
  description: {
    color: '#cccccc',
    fontSize: 15,
    lineHeight: 24,
    fontFamily: theme.typography.fontFamily.primary
  },
  moreDetailsText: {
    marginTop: 10,
    color: theme.colorPalette.accent.primary,
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.primaryBold
  },
  genresSection: {
    marginTop: 24
  },
  genreChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  genreChip: {
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 4,
    backgroundColor: theme.colorPalette.surface.raised
  },
  genreChipText: {
    color: theme.colorPalette.text.secondary,
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.primaryBold
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 24,
    rowGap: 16,
    columnGap: 20
  },
  infoItem: {
    minWidth: '40%'
  },
  infoLabel: {
    color: '#888',
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.primary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  infoValue: {
    color: '#fff',
    fontSize: 15,
    fontFamily: theme.typography.fontFamily.primaryBold
  },
  externalLinksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 20
  },
  externalLinkButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(244,117,33,0.1)'
  },
  externalLinkText: {
    color: theme.colorPalette.accent.primary,
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.primaryBold
  },
  episodesSection: {
    paddingHorizontal: 20,
    marginTop: 10
  },
  episodesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingRight: 4
  },
  pagerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 4,
    paddingHorizontal: 8,
    borderRadius: 4
  },
  pagerButton: {
    width: 36,
    height: 36,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)'
  },
  pagerButtonDisabled: {
    opacity: 0.5
  },
  pagerText: {
    color: theme.colorPalette.text.secondary,
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.primaryBold,
    paddingHorizontal: 6
  },
  episodesGrid: {
    paddingBottom: 20
  },
  relatedSection: {
    marginTop: 26,
    paddingHorizontal: 20
  },
  relatedList: {
    paddingBottom: 12
  },
  relatedCard: {
    width: 142,
    marginRight: 12
  },
  relatedImage: {
    width: 142,
    height: 210,
    justifyContent: 'flex-end',
    backgroundColor: theme.colorPalette.surface.raised
  },
  relatedImageStyle: {
    borderRadius: 6
  },
  relatedGradient: {
    minHeight: 92,
    justifyContent: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 11,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6
  },
  relatedTitle: {
    color: theme.colorPalette.text.primary,
    fontSize: 13,
    lineHeight: 17,
    fontFamily: theme.typography.fontFamily.primaryBold
  },
  relatedSubtitle: {
    color: theme.colorPalette.text.tertiary,
    fontSize: 10,
    marginTop: 5,
    fontFamily: theme.typography.fontFamily.primary
  },
  episodeButtonContainer: {
    width: '25%',
    padding: 7,
    position: 'relative'
  },
  episodeButton: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 4,
    backgroundColor: theme.colorPalette.surface.raised,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden'
  },
  fillAnimationOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: theme.colorPalette.accent.primary,
    borderRadius: 999
  },
  watchedFillLayer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(244, 117, 33, 0.25)'
  },
  watchedEpisodeButton: {
    backgroundColor: 'rgba(244, 117, 33, 0.25)'
  },
  episodeButtonText: {
    color: theme.colorPalette.text.secondary,
    fontSize: 16,
    fontFamily: theme.typography.fontFamily.primaryBold
  },
  watchedEpisodeButtonText: {
    color: theme.colorPalette.text.primary,
    fontFamily: theme.typography.fontFamily.primaryBold
  },
  watchedIconContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: 'rgba(15, 15, 15, 0.0)',
    borderRadius: 50,
    padding: 0
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12
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
  }
});
export default AnimeDetailScreen;
