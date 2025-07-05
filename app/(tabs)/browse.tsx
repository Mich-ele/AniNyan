import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  Dimensions,
} from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { searchAnime } from '../../services/animeService';
import { Anime } from '../../types/anime';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const numColumns = 2;
const cardMargin = 8;
const cardWidth = (width - cardMargin * (numColumns + 1) * 2) / numColumns;

const EnhancedAnimeCard = ({ anime, onPress }: { anime: Anime; onPress: () => void }) => (
  <TouchableOpacity onPress={onPress} style={styles.enhancedAnimeCard}>
    <View style={styles.enhancedImageContainer}>
      <Image source={{ uri: anime.image }} style={styles.enhancedAnimeImage} />
    </View>
    <Text style={styles.enhancedAnimeTitle} numberOfLines={2}>
      {anime.title}
    </Text>
  </TouchableOpacity>
);

const Browse = () => {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    if (query.trim().length < 3) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceTimeout.current = setTimeout(async () => {
      const data = await searchAnime(query);
      setResults(data);
      setLoading(false);
    }, 500);

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [query]);

  const renderItem = ({ item }: { item: Anime }) => (
    <EnhancedAnimeCard
      anime={item}
      onPress={() => router.push({ pathname: '/anime', params: { url: item.url } })}
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cerca un anime..."
            placeholderTextColor="#888"
            value={query}
            onChangeText={setQuery}
          />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 20 }} size="large" color="#fff" />
      ) : (
        <FlatList
          data={results}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          numColumns={numColumns}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={() =>
            query.length > 2 && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No results found for "{query}"</Text>
              </View>
            )
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#101014',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1F1F23',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F1F23',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Raleway-Regular',
  },
  listContainer: {
    paddingHorizontal: cardMargin * 2,
    paddingTop: 16,
    paddingBottom: 100,
  },
  enhancedAnimeCard: {
    width: cardWidth,
    marginBottom: cardMargin * 2,
    marginHorizontal: cardMargin,
  },
  enhancedImageContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#222',
  },
  enhancedAnimeImage: {
    width: '100%',
    aspectRatio: 2 / 3,
  },
  enhancedAnimeTitle: {
    color: '#e0e0e0',
    fontSize: 14,
    fontFamily: 'Raleway-SemiBold',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    marginTop: 80,
    alignItems: 'center',
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
  },
});

export default Browse;