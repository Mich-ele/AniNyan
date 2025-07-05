import React from 'react';
import { View, Text, Image, StyleSheet, Animated, ViewStyle, TextStyle, ImageStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Anime } from '../types/anime';
import theme, { px } from '../app/styles/theme';
import { AnimatedTouchable } from './AnimatedTouchable';

interface AnimeCardProps {
  anime: Anime;
  onPress?: () => void;
  showProgress?: boolean;
}

export function AnimeCard({ anime, onPress, showProgress = false }: AnimeCardProps) {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <AnimatedTouchable 
      onPress={onPress} 
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.container, { transform: [{ scale: scaleAnim }] }]}
    >
      <View style={styles.imageContainer}>
        <Image source={{ uri: anime.image }} style={styles.image} />
        {showProgress && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${anime.progress || 0}%` }
                ]} 
              />
            </View>
          </View>
        )}
        <LinearGradient
          colors={['transparent', theme.colorPalette.interactive.cardOverlay]}
          style={styles.gradient}
        />
      </View>
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>{anime.title}</Text>
        {anime.subtitle && (
          <Text style={styles.subtitle} numberOfLines={1}>{anime.subtitle}</Text>
        )}
      </View>
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create<{
  container: ViewStyle;
  imageContainer: ViewStyle;
  image: ImageStyle;
  progressContainer: ViewStyle;
  progressBar: ViewStyle;
  progressFill: ViewStyle;
  gradient: ViewStyle;
  content: ViewStyle;
  title: TextStyle;
  subtitle: TextStyle;
}>({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: theme.colorPalette.primary.backgroundSecondary,
    margin: 8,
    flex: 1,
    maxWidth: '45%',
    aspectRatio: 2 / 3,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  imageContainer: {
    width: '100%',
    height: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  progressContainer: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    right: 4,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
  },
  progressBar: {
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colorPalette.accent.primary,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
  },
  content: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
  },
  title: {
    color: theme.colorPalette.text.primary,
    fontSize: 14,
    fontFamily: 'Raleway-Bold',
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  subtitle: {
    color: theme.colorPalette.text.secondary,
    fontSize: 12,
    fontFamily: 'Raleway-Regular',
  },
});