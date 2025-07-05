import { useLocalSearchParams, Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Image, StyleSheet, ScrollView } from 'react-native';
import { AnimeDetail } from '../../types/anime';
import { fetchAnimeDetails } from '../../services/animeService';

const AnimeDetailsPage = () => {
  const { id } = useLocalSearchParams();
  const [anime, setAnime] = useState<AnimeDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      const loadData = async () => {
        setLoading(true);
        const animeId = Array.isArray(id) ? id[0] : id;
        const animeUrl = `https://www.animesaturn.cx/anime/${animeId}`;
        const data = await fetchAnimeDetails(animeUrl);
        console.log(data);
        setLoading(false);
      };
      loadData();
    }
  }, [id]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (!anime) {
    return (
      <View style={styles.container}>
        <Text>Anime not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.page}>
      <Stack.Screen options={{ title: anime.title }} />
      <Image source={{ uri: anime.image }} style={styles.image} />
      <View style={styles.content}>
        <Text style={styles.title}>{anime.title}</Text>
        {anime.studio && <Text style={styles.detailItem}>Studio: {anime.studio}</Text>}
        {anime.status && <Text style={styles.detailItem}>Stato: {anime.status}</Text>}
        {anime.releaseDate && <Text style={styles.detailItem}>Data di uscita: {anime.releaseDate}</Text>}
        {anime.episodes && <Text style={styles.detailItem}>Episodi: {anime.episodes}</Text>}
        {anime.episodeDuration && <Text style={styles.detailItem}>Durata episodi: {anime.episodeDuration}</Text>}
        {anime.views && <Text style={styles.detailItem}>Visualizzazioni: {anime.views}</Text>}
        {anime.rating && <Text style={styles.detailItem}>Voto: {anime.rating}</Text>}
        {anime.genres && anime.genres.length > 0 && (
          <View style={styles.genresContainer}>
            <Text style={styles.detailItem}>Generi:</Text>
            <View style={styles.genresList}>
              {anime.genres.map((genre, index) => (
                <Text key={index} style={styles.genreItem}>{genre}</Text>
              ))}
            </View>
          </View>
        )}
        <Text style={styles.sectionTitle}>Trama</Text>
        <Text style={styles.description}>{anime.description}</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  page: {
    flex: 1,
    backgroundColor: '#111',
  },
  image: {
    width: '100%',
    height: 400,
    resizeMode: 'cover',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: '#ccc',
    lineHeight: 24,
  },
  detailItem: {
    fontSize: 16,
    color: '#ddd',
    marginBottom: 5,
  },
  genresContainer: {
    marginTop: 10,
  },
  genresList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
  },
  genreItem: {
    backgroundColor: '#333',
    color: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    marginRight: 10,
    marginBottom: 10,
    fontSize: 14,
  },
});

export default AnimeDetailsPage;
