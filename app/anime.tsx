import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  ActivityIndicator,
  ImageBackground,
  TouchableOpacity,
  StatusBar,
  Platform,
  Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { fetchAnimeDetails, fetchEpisodeVideoUrl, getAnimeDetails } from '../services/animeService';
import { getWatchedEpisodes, addWatchedEpisode, removeWatchedEpisode, isAnimeInWatchlist, addToWatchlist, removeFromWatchlist } from '../services/cacheService';
import { AnimeDetail } from '../types/anime';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getAnimeIdFromUrl } from '../utils/utils';
import theme from './styles/theme';



const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

const AnimeDetailScreen = () => {
  const { url } = useLocalSearchParams<{ url: string }>();
  const router = useRouter();
  const [anime, setAnime] = useState<AnimeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingEpisode, setLoadingEpisode] = useState<number | null>(null);
  const [watchedEpisodes, setWatchedEpisodes] = useState<Set<number>>(new Set());
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const scrollY = new Animated.Value(0);

  useEffect(() => {
    const loadData = async () => {
      if (url) {
        await loadAnimeDetails();
        await loadWatchedEpisodes();
        await checkWatchlistStatus();
      }
    };
    loadData();
  }, [url]);

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
        const details = await fetchAnimeDetails(url);
        setAnime(details);
      } catch (error) {
        console.error("Failed to load anime details", error);
      } finally {
        setLoading(false);
      }
    }
  };

  const loadWatchedEpisodes = async () => {
    if (!url) return;
    const animeId = getAnimeIdFromUrl(url);
    if (animeId) {
      const watched = await getWatchedEpisodes(animeId);
      setWatchedEpisodes(watched);
    }
  };

  const handleEpisodePress = async (episodeNumber: number) => {
    if (!anime?.episodeUrl) return;
    setLoadingEpisode(episodeNumber);
    try {
      const episodeUrl = `${anime.episodeUrl}${episodeNumber}`;
      const videoUrl = await fetchEpisodeVideoUrl(episodeUrl);
      if (videoUrl) {
        router.push({ pathname: '/screens/VideoPlayer', params: { videoUrl, title: anime.title } });
        if (url) {
          if (anime) {
            await addWatchedEpisode(anime, episodeNumber);
            setWatchedEpisodes(prev => new Set(prev).add(episodeNumber));
          }
        }
      } else {
        console.log('Could not fetch video URL.');
      }
    } catch (error) {
      console.error('Failed to handle episode press:', error);
    } finally {
      setLoadingEpisode(null);
    }
  };

  const handleToggleWatched = async (episodeNumber: number) => {
    if (!url) return;
    const animeId = getAnimeIdFromUrl(url);
    if (animeId) {
      const newWatchedEpisodes = new Set(watchedEpisodes);
      if (newWatchedEpisodes.has(episodeNumber)) {
        await removeWatchedEpisode(animeId, episodeNumber);
        newWatchedEpisodes.delete(episodeNumber);
      } else {
        if (anime) {
          await addWatchedEpisode(anime, episodeNumber);
          newWatchedEpisodes.add(episodeNumber);
        }
      }
      setWatchedEpisodes(newWatchedEpisodes);
    }
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
    if (!anime || !anime.existEpisodes) return;
    const totalEpisodes = anime.existEpisodes;
    let nextEpisodeToPlay = 1;
    for (let i = 1; i <= totalEpisodes; i++) {
      if (!watchedEpisodes.has(i)) {
        nextEpisodeToPlay = i;
        break;
      }
      if (i === totalEpisodes) {
        nextEpisodeToPlay = totalEpisodes;
      }
    }
    handleEpisodePress(nextEpisodeToPlay);
  };

  const navBarOpacity = scrollY.interpolate({
    inputRange: [300, 400],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  if (!anime) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Failed to load anime details.</Text>
      </View>
    );
  }



  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <View style={styles.navBar}>
        <Animated.View style={[styles.navBarBackground, { opacity: navBarOpacity }]} />
        <TouchableOpacity onPress={() => router.back()} style={styles.navButton} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.navRightButtons}>
          <TouchableOpacity style={styles.navButton} activeOpacity={0.7}>
            <Ionicons name="tv-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navButton} activeOpacity={0.7}>
            <Ionicons name="share-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <AnimatedScrollView
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.heroContainer}>
          <ImageBackground source={{ uri: anime.image }} style={styles.heroImage} imageStyle={styles.heroImageStyle}>
            <LinearGradient
              colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.7)', '#0F0F0F']}
              locations={[0, 0.3, 0.8, 1]}
              style={styles.heroOverlay}
            >
              <View style={styles.heroContent}>
                <View style={styles.badgeContainer}>
                  {anime.rating ? (
                    <View style={styles.ratingBadge}>
                      <Text style={styles.ratingText} numberOfLines={1} ellipsizeMode="tail">
                        {String(anime.rating).split(/[\s\-]/)[0]}
                      </Text>
                    </View>
                  ) : null}
                  <Text style={styles.durationText}>{anime.episodeDuration}</Text>
                </View>
                <Text style={styles.title} numberOfLines={2}>{anime.title}</Text>
                <View style={styles.metaContainer}>
                  {anime.genres?.slice(0, 3).map((genre, index, arr) => (
                    <React.Fragment key={index}>
                      <Text style={styles.metaText}>{genre}</Text>
                      {index < arr.length - 1 && <Text style={styles.metaSeparator}>|</Text>}
                    </React.Fragment>
                  ))}
                  {anime.releaseDate && (
                    <>
                      <Text style={styles.metaSeparator}>|</Text>
                      <Text style={styles.metaText}>{anime.releaseDate}</Text>
                    </>
                  )}
                </View>
              </View>
            </LinearGradient>
          </ImageBackground>
        </View>

        <View style={styles.actionSection}>
          <TouchableOpacity style={styles.playButton} activeOpacity={0.8} onPress={handlePlayNext}>
            <Ionicons name="play" size={18} color="#FFFFFF" style={styles.playIcon} />
            <Text style={styles.playButtonText}>Riproduci</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.favoriteButton} activeOpacity={0.7} onPress={handleToggleWatchlist}>
            <Ionicons name={isInWatchlist ? 'heart' : 'heart-outline'} size={22} color={isInWatchlist ? theme.colorPalette.accent.primary : '#8E8E93'} />
          </TouchableOpacity>
        </View>

        <View style={styles.aboutSection}>
          <Text style={styles.sectionTitle}>Trama</Text>
          <Text style={styles.description} numberOfLines={10}>{anime.description}</Text>
        </View>

        <View style={styles.episodesSection}>
          <View style={styles.episodesHeader}>
            <Text style={styles.sectionTitle}>Episodi ({anime.existEpisodes})</Text>
          </View>
          <FlatList
            data={Array.from({ length: anime.existEpisodes || 0 }, (_, i) => i + 1)}
            renderItem={({ item: episodeNumber }) => {
              const isWatched = watchedEpisodes.has(episodeNumber);
              return (
                <View style={styles.episodeButtonContainer}>
                  <TouchableOpacity
                    style={[styles.episodeButton, isWatched && styles.watchedEpisodeButton]}
                    onPress={() => handleEpisodePress(episodeNumber)}
                    onLongPress={() => handleToggleWatched(episodeNumber)}
                    disabled={loadingEpisode === episodeNumber}
                    activeOpacity={0.8}
                  >
                    {loadingEpisode === episodeNumber ? (
                      <View style={styles.loadingOverlay}>
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      </View>
                    ) : (
                      <Text style={[styles.episodeButtonText, isWatched && styles.watchedEpisodeButtonText]}>{episodeNumber}</Text>
                    )}
                  </TouchableOpacity>
                  {isWatched && (
                    <TouchableOpacity
                      style={styles.watchedIconContainer}
                      onPress={() => handleToggleWatched(episodeNumber)}
                    >
                      <Ionicons name="checkmark-circle" size={28} color="#5B8DEF" />
                    </TouchableOpacity>
                  )}
                </View>
              );
            }}
            keyExtractor={(item) => item.toString()}
            numColumns={4}
            contentContainerStyle={styles.episodesGrid}
            scrollEnabled={false}
          />
        </View>
      </AnimatedScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colorPalette.primary.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colorPalette.primary.background,
  },
  errorText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 16,
    fontFamily: 'Raleway-Regular',
  },
  navBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight! + 10 : 54,
    paddingBottom: 10,
    zIndex: 10,
  },
  navBarBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colorPalette.primary.background,
  },
  navButton: {
    padding: 6,
  },
  navRightButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  heroContainer: {
    height: 520,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroImageStyle: {
    resizeMode: 'cover',
  },
  heroOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  heroContent: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  ratingBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  ratingText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: 'Raleway-SemiBold',
    letterSpacing: 0.5,
  },
  durationText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 13,
    fontFamily: 'Raleway-Medium',
  },
  title: {
    fontSize: 32,
    fontFamily: 'Raleway-Bold',
    color: '#FFFFFF',
    marginBottom: 14,
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  metaText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
    fontFamily: 'Raleway-Medium',
  },
  metaSeparator: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    marginHorizontal: 8,
  },
  actionSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 28,
    gap: 16,
  },
  playButton: {
    flex: 1,
    backgroundColor: '#5B8DEF',
    borderRadius: 26,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  playIcon: {},
  playButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Raleway-SemiBold',
  },
  favoriteButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aboutSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontFamily: 'Raleway-Bold',
    marginBottom: 8,
  },
  description: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    lineHeight: 22,
    fontFamily: 'Raleway-Regular',
  },
  episodesSection: {
    paddingHorizontal: 20,
  },
  episodesHeader: {
    marginBottom: 16,
  },
  episodesGrid: {
    paddingBottom: 20,
  },
  episodeButtonContainer: {
    width: '25%',
    padding: 7,
    position: 'relative',
  },
  episodeButton: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  watchedEpisodeButton: {
    backgroundColor: 'rgba(91, 141, 239, 0.15)',
    borderColor: 'rgba(91, 141, 239, 0.4)',
  },
  episodeButtonText: {
    color: '#E0E0E0',
    fontSize: 16,
    fontFamily: 'Raleway-SemiBold',
  },
  watchedEpisodeButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Raleway-Bold',
  },
  watchedIconContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: 'rgba(15, 15, 15, 0.0)',
    borderRadius: 50,
    padding: 0,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
  },
});

export default AnimeDetailScreen;