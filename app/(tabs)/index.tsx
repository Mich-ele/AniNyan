import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Image, ActivityIndicator, Dimensions, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { fetchLatestEpisodes, fetchHomePageSections } from '../../services/animeService';
import { getContinueWatchingList } from '../../services/cacheService';
import { Anime } from '../../types/anime';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const filters: { name: string; icon: React.ComponentProps<typeof Ionicons>['name'] | null }[] = [
  { name: 'All', icon: null },
  { name: 'Popular', icon: 'flame-outline' },
  { name: 'User ratings', icon: 'star-outline' },
  { name: 'Action', icon: 'flash-outline' },
  { name: 'Futuristic', icon: 'rocket-outline' },
  { name: 'Comedy', icon: 'happy-outline' },
];

// --- Components ---

const Header = ({ activeFilter, onFilterChange }: { activeFilter: string, onFilterChange: (name: string) => void }) => (
  <View style={styles.headerContainer}>
    <View style={styles.topBar}>
      <View style={styles.logoContainer}>
        <Image source={require('../../assets/images/icon.png')} style={{ width: 28, height: 28 }} />
        <Text style={styles.logoText}>nyan</Text>
      </View>
    </View>
    {/*<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersContainer}>
      {filters.map(filter => (
        <TouchableOpacity 
          key={filter.name} 
          style={[styles.filterChip, activeFilter === filter.name && styles.activeFilterChip]}
          onPress={() => onFilterChange(filter.name)}
        >
          {filter.icon && <Ionicons name={filter.icon} size={18} color={activeFilter === filter.name ? 'white' : '#a9a9a9'} style={{marginRight: 6}}/>}
          <Text style={[styles.filterText, activeFilter === filter.name && styles.activeFilterText]}>{filter.name}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>*/}
  </View>
);

const EnhancedSectionHeader = ({ title, cta }: { title: string; cta?: string }) => (
  <View style={styles.enhancedSectionHeader}>
    <Text style={styles.enhancedSectionTitle}>{title}</Text>
    {cta && <Text style={styles.enhancedSectionCta}>{cta}</Text>}
  </View>
);

const EnhancedAnimeCard = ({ anime, showProgress, style, onPress }: { anime: Anime, showProgress?: boolean, style?: any, onPress: () => void }) => (
  <TouchableOpacity onPress={onPress} style={[styles.enhancedAnimeCard, style]}>
    <View style={styles.enhancedImageContainer}>
      <Image source={{ uri: anime.image }} style={styles.enhancedAnimeImage} />
      {showProgress && anime.progress != null && (
        <View style={styles.enhancedProgressContainer}>
          <View style={styles.enhancedProgressBar}>
            <View style={[styles.enhancedProgressFill, { width: `${anime.progress * 100}%` }]} />
          </View>
        </View>
      )}
    </View>
    <Text style={styles.enhancedAnimeTitle} numberOfLines={2}>{anime.title}</Text>
    {anime.subtitle && <Text style={styles.enhancedAnimeSubtitle} numberOfLines={1}>{anime.subtitle}</Text>}
  </TouchableOpacity>
);

// --- Screen ---

export default function HomeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [latestEpisodes, setLatestEpisodes] = useState<Anime[]>([]);
  const [newAdditions, setNewAdditions] = useState<Anime[]>([]);
  const [randomAnime, setRandomAnime] = useState<Anime[]>([]);
  const [continueWatching, setContinueWatching] = useState<{ anime: Anime; nextEpisode: number }[]>([]);
  const [contentSections, setContentSections] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState('All');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [watched, sections, latest] = await Promise.all([
        getContinueWatchingList(),
        fetchHomePageSections(),
        fetchLatestEpisodes(),
      ]);
      setContinueWatching(watched);
      setNewAdditions(sections.newAdditions);
      setRandomAnime(sections.randomAnime);
      setLatestEpisodes(latest);
    } catch (error) {
      console.error('Failed to load home screen data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  useEffect(() => {
    const sections = [];

    if (continueWatching.length > 0) {
      sections.push({ type: 'continueWatching', title: 'Continua a guardare', data: continueWatching });
    }
    if (latestEpisodes.length > 0) {
      sections.push({ type: 'latestEpisodes', title: 'Ultimi Episodi', data: latestEpisodes });
    }
    if (newAdditions.length > 0) {
      sections.push({ type: 'newAdditions', title: 'Nuove aggiunte', data: newAdditions });
    }
    if (randomAnime.length > 0) {
      sections.push({ type: 'randomAnime', title: 'Anime Random', data: randomAnime });
    }
    
    setContentSections(sections);
  }, [latestEpisodes, continueWatching, newAdditions, randomAnime]);

  const handleAnimePress = (anime: Anime) => {
    router.push({ pathname: '/anime', params: { url: anime.url } });
  };

  const renderContentSection = ({ item }: { item: any }) => (
    <View style={styles.section}>
      <EnhancedSectionHeader title={item.title} cta={item.cta} />
      <FlatList
        horizontal
        data={item.data}
        renderItem={({ item: animeItem }) => {
          const isContinueWatching = item.type === 'continueWatching';
          const anime = isContinueWatching ? animeItem.anime : animeItem;
          const animeForCard: Anime = isContinueWatching
            ? { ...anime, subtitle: `Episodio ${animeItem.nextEpisode}` }
            : anime;

          return (
            <EnhancedAnimeCard
              anime={animeForCard}
              showProgress={isContinueWatching}
              onPress={() => handleAnimePress(anime)}
            />
          );
        }}
        keyExtractor={(animeItem, index) => `${item.type}-${item.type === 'continueWatching' ? animeItem.anime.id : animeItem.id}-${index}`}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.enhancedHorizontalList}
        ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
      />
    </View>
  );

  if (loading) {
    return <View style={styles.loaderContainer}><ActivityIndicator size="large" color="#FFFFFF" /></View>;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        ListHeaderComponent={<Header activeFilter={activeFilter} onFilterChange={setActiveFilter} />}
        data={contentSections}
        renderItem={renderContentSection}
        keyExtractor={(item, index) => `${item.type}-${index}`}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#101014',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#101014',
  },
  headerContainer: {
    paddingHorizontal: 0,
    paddingTop: 10,
    paddingBottom: 10,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 0,
    marginTop: 10,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    color: 'white',
    fontSize: 22,
    fontFamily: 'Raleway-Bold',
    marginLeft: 8,
  },
  newBadge: {
    backgroundColor: '#c53f3f',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 10,
  },
  newBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingBottom: 10,
    paddingLeft: 10,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2e',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
  },
  activeFilterChip: {
    backgroundColor: '#444448',
  },
  filterText: {
    color: '#a9a9a9',
    fontSize: 14,
    fontFamily: 'Raleway-Regular',
  },
  activeFilterText: {
    color: 'white',
    fontFamily: 'Raleway-SemiBold',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  section: {
    marginTop: 24,
    marginBottom: 8,
  },
  enhancedSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  enhancedSectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontFamily: 'Raleway-Medium',
  },
  enhancedSectionCta: {
    color: '#888888',
    fontSize: 14,
    fontFamily: 'Raleway-Medium',
  },
  enhancedHorizontalList: {
    paddingHorizontal: 20,
  },
  itemSeparator: {
    width: 16,
  },
  enhancedAnimeCard: {
    width: 140,
    maxWidth: 140,
  },
  enhancedImageContainer: {
    position: 'relative',
    marginBottom: 10,
    width: 140,
  },
  enhancedAnimeImage: {
    width: 140,
    height: 200,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
  },
  enhancedProgressContainer: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
  },
  enhancedProgressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  enhancedProgressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  enhancedAnimeTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Raleway-SemiBold',
    marginTop: 4,
  },
  enhancedAnimeSubtitle: {
    color: '#888888',
    fontSize: 14,
    fontFamily: 'Raleway-Regular',
    marginTop: 2,
  },
});