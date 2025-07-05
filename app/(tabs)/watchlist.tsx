import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { getWatchlist } from '../../services/cacheService';
import { AnimeDetail } from '../../types/anime';
import { AnimeCard } from '../../components/AnimeCard';
import theme from '../styles/theme';

const WatchlistScreen = () => {
  const router = useRouter();
  const [watchlist, setWatchlist] = useState<AnimeDetail[]>([]);
  const [loading, setLoading] = useState(true);

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
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>Watchlist</Text>
      {watchlist.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Your watchlist is empty.</Text>
        </View>
      ) : (
        <FlatList
          data={watchlist}
          renderItem={({ item }) => (
            <AnimeCard 
              anime={item} 
              onPress={() => router.push({ pathname: '/anime', params: { url: item.url } })} 
            />
          )}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create<{
  container: ViewStyle;
  centered: ViewStyle;
  title: TextStyle;
  emptyText: TextStyle;
  list: ViewStyle;
}>({
  container: {
    flex: 1,
    backgroundColor: theme.colorPalette.primary.background,
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Raleway-Bold',
    color: theme.colorPalette.text.primary,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Raleway-Regular',
    color: theme.colorPalette.text.secondary,
  },
  list: {
    paddingBottom: 24,
  },
});

export default WatchlistScreen;
