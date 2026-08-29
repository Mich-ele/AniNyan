import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { getWatchlist } from '../../services/cacheService';
import { AnimeDetail } from '../../types/anime';
import { theme } from '../styles/theme';
import { Ionicons } from '@expo/vector-icons';
import { PremiumAnimeCard } from '../../components/PremiumAnimeCard';
import { useHideTabBarOnScroll } from '../../hooks/useTabBarVisibility';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const numColumns = 2;
const cardMargin = 8;
const listHorizontalPadding = 12;
const cardWidth = (width - listHorizontalPadding * 2 - cardMargin * 4) / numColumns;

const EnhancedAnimeCard = ({ anime, onPress, onWatchlistChange, index = 0 }: { anime: AnimeDetail; onPress: () => void; onWatchlistChange: (isWatchlisted: boolean) => void; index?: number }) => (
  <PremiumAnimeCard
    anime={anime}
    onPress={onPress}
    index={index}
    width={cardWidth}
    badge={anime.source === 'animeunity' ? 'AnimeUnity' : 'AnimeWorld'}
    initialWatchlisted
    onWatchlistChange={onWatchlistChange}
    style={styles.enhancedAnimeCard}
  />
);

const WatchlistScreen = () => {
  const router = useRouter();
  const { onScroll: onTabBarScroll } = useHideTabBarOnScroll();
  const [watchlist, setWatchlist] = useState<AnimeDetail[]>([]);
  const [loading, setLoading] = useState(true);

  const handleWatchlistChange = (animeId: string, isWatchlisted: boolean) => {
    if (!isWatchlisted) {
      setWatchlist(items => items.filter(anime => anime.id !== animeId));
    }
  };

  useFocusEffect(
    useCallback(() => {
      const loadWatchlist = async () => {
        setLoading(true);
        const items = await getWatchlist();
        setWatchlist(items);
        setLoading(false);
      };

      loadWatchlist();
    }, [])
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colorPalette.accent.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
          <Animated.View entering={FadeInDown.duration(240)} style={styles.header}>
            <Text style={styles.eyebrow}>Salvati</Text>
            <View style={styles.titleRow}>
              <Text style={styles.title}>La mia Lista</Text>
              {watchlist.length > 0 && (
                <View style={styles.countPill}>
                  <Text style={styles.countText}>{watchlist.length}</Text>
                </View>
              )}
            </View>
            <Text style={styles.subtitle}>
              {watchlist.length > 0
                ? `${watchlist.length} titoli salvati per dopo`
                : 'Conserva qui gli anime che vuoi guardare'}
            </Text>
          </Animated.View>

          {watchlist.length === 0 ? (
            <Animated.View entering={FadeIn.duration(220)} style={styles.emptyContainer}>
              <View style={styles.emptyIcon}>
                <Ionicons name="heart-outline" size={34} color={theme.colorPalette.accent.primary} />
              </View>
              <Text style={styles.emptyTitle}>La tua lista è vuota</Text>
              <Text style={styles.emptyText}>Salva gli anime dal dettaglio e ritrovali qui quando vuoi.</Text>
              <TouchableOpacity style={styles.browseButton} onPress={() => router.push('/(tabs)/browse')}>
                <Ionicons name="search" size={16} color="#ffffff" style={styles.browseButtonIcon} />
                <Text style={styles.browseButtonText}>Esplora Anime</Text>
              </TouchableOpacity>
            </Animated.View>
          ) : (
            <FlatList
              data={watchlist}
              renderItem={({ item, index }) => (
                <EnhancedAnimeCard
                  anime={item}
                  index={index}
                  onPress={() => router.push({ pathname: '/anime', params: { url: item.url } })}
                  onWatchlistChange={isWatchlisted => handleWatchlistChange(item.id, isWatchlisted)}
                />
              )}
              keyExtractor={(item) => item.id}
              numColumns={numColumns}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              onScroll={onTabBarScroll}
              scrollEventThrottle={16}
            />
          )}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colorPalette.primary.background,
  },
  safeArea: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colorPalette.primary.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  eyebrow: {
    color: theme.colorPalette.accent.primary,
    fontSize: 12,
    fontFamily: theme.typography.fontFamily.primaryBold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 12,
    marginBottom: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: theme.colorPalette.text.primary,
    fontSize: 28,
    fontFamily: theme.typography.fontFamily.primaryBold,
    letterSpacing: 0,
  },
  subtitle: {
    color: theme.colorPalette.text.tertiary,
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.primary,
    marginTop: 7,
  },
  countPill: {
    minWidth: 36,
    height: 30,
    borderRadius: 4,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(244,117,33,0.18)',
  },
  countText: {
    color: theme.colorPalette.accent.primary,
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.primaryBold,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 100,
    paddingHorizontal: 28,
  },
  emptyIcon: {
    width: 74,
    height: 74,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(244,117,33,0.12)',
    marginBottom: 18,
  },
  emptyTitle: {
    color: theme.colorPalette.text.primary,
    fontSize: 22,
    fontFamily: theme.typography.fontFamily.primaryBold,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.primary,
    color: theme.colorPalette.text.secondary,
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colorPalette.accent.primary,
    paddingHorizontal: 18,
    height: 44,
    borderRadius: 2,
  },
  browseButtonIcon: {
    marginRight: 8,
  },
  browseButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.primaryBold,
  },
  list: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 120,
  },
  enhancedAnimeCard: {
    width: cardWidth,
    marginBottom: cardMargin * 3,
    marginHorizontal: cardMargin,
  },
});

export default WatchlistScreen;
