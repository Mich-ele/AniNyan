import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, GestureResponderEvent, Image, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Anime } from '../types/anime';
import { theme } from '../app/styles/theme';
import { addToWatchlist, isAnimeInWatchlist, removeFromWatchlist } from '../services/cacheService';
import { fetchAnimeDetailsWithScraper } from '../services/scraperManager';
import { getAnimeIdFromUrl } from '../utils/utils';
import { useWatchlistActionOverlay } from './WatchlistActionOverlay';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const ACTION_SIZE = 68;
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type PremiumAnimeCardProps = {
  anime: Anime;
  onPress: () => void;
  index?: number;
  width?: number;
  rank?: number;
  progress?: number;
  badge?: string;
  style?: ViewStyle;
  initialWatchlisted?: boolean;
  onWatchlistChange?: (isWatchlisted: boolean) => void;
};

export function PremiumAnimeCard({
  anime,
  onPress,
  index = 0,
  width = 136,
  rank,
  progress,
  badge,
  style,
  initialWatchlisted,
  onWatchlistChange,
}: PremiumAnimeCardProps) {
  const cardRef = useRef<View>(null);
  const scale = useSharedValue(1);
  const [isWatchlisted, setIsWatchlisted] = useState(initialWatchlisted ?? false);
  const [isUpdatingWatchlist, setIsUpdatingWatchlist] = useState(false);
  const menuVisibleRef = useRef(false);
  const suppressPressRef = useRef(false);
  const isReleasingRef = useRef(false);
  const { completeDrag, open, updateDrag } = useWatchlistActionOverlay();
  const watchlistId = getAnimeIdFromUrl(anime.url) || anime.id;
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const normalizedProgress = progress == null
    ? undefined
    : Math.min(1, Math.max(0, progress > 1 ? progress / 100 : progress));

  useEffect(() => {
    let isMounted = true;

    const loadWatchlistState = async () => {
      const saved = initialWatchlisted ?? await isAnimeInWatchlist(watchlistId);
      if (isMounted) {
        setIsWatchlisted(saved);
      }
    };

    void loadWatchlistState();
    return () => {
      isMounted = false;
    };
  }, [initialWatchlisted, watchlistId]);

  const toggleWatchlist = async () => {
    if (isUpdatingWatchlist) {
      return;
    }

    setIsUpdatingWatchlist(true);
    try {
      if (isWatchlisted) {
        await removeFromWatchlist(watchlistId);
        setIsWatchlisted(false);
        onWatchlistChange?.(false);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return;
      }

      const details = await fetchAnimeDetailsWithScraper(anime.url);
      if (details) {
        await addToWatchlist(details);
        setIsWatchlisted(true);
        onWatchlistChange?.(true);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsUpdatingWatchlist(false);
    }
  };

  const finishDrag = () => {
    menuVisibleRef.current = false;
    completeDrag();
  };

  const handleLongPress = () => {
    if (isUpdatingWatchlist || !cardRef.current) {
      return;
    }

    suppressPressRef.current = true;
    isReleasingRef.current = false;
    cardRef.current.measureInWindow((x, y, measuredWidth, measuredHeight) => {
      const cardWidth = measuredWidth || width;
      const previewHeight = cardWidth * 1.48;
      const actionX = Math.min(screenWidth - ACTION_SIZE - 14, Math.max(14, x + cardWidth - ACTION_SIZE / 2));
      const actionY = Math.min(screenHeight - ACTION_SIZE - 30, Math.max(30, y + previewHeight - ACTION_SIZE / 2));

      menuVisibleRef.current = true;
      open({
        anime,
        layout: { x, y, width: cardWidth, height: Math.min(measuredHeight || previewHeight, previewHeight) },
        actionBounds: { x: actionX, y: actionY, size: ACTION_SIZE },
        isWatchlisted,
        onActivate: () => void toggleWatchlist(),
      });
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 18, stiffness: 320 });
  };

  const handleTouchEnd = (event: GestureResponderEvent) => {
    if (!suppressPressRef.current || isReleasingRef.current) {
      return;
    }

    isReleasingRef.current = true;
    if (menuVisibleRef.current) {
      updateDrag(event.nativeEvent.pageX, event.nativeEvent.pageY);
      finishDrag();
    }
    setTimeout(() => {
      suppressPressRef.current = false;
      isReleasingRef.current = false;
    }, 0);
  };

  const handlePress = () => {
    if (!suppressPressRef.current) {
      onPress();
    }
  };

  return (
    <Animated.View
      entering={FadeInDown.duration(360).delay(Math.min(index * 45, 360))}
      style={[styles.card, { width }, style]}
    >
      <View ref={cardRef} collapsable={false} onTouchEndCapture={handleTouchEnd}>
        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel={`Apri ${anime.title}`}
          onPress={handlePress}
          onLongPress={handleLongPress}
          onTouchMove={(event: GestureResponderEvent) => {
            if (menuVisibleRef.current) {
              updateDrag(event.nativeEvent.pageX, event.nativeEvent.pageY);
            }
          }}
          onTouchEnd={handleTouchEnd}
          delayLongPress={360}
          pressRetentionOffset={{ top: screenHeight, right: screenWidth, bottom: screenHeight, left: screenWidth }}
          onPressIn={() => {
            scale.value = withSpring(0.97, { damping: 18, stiffness: 320 });
          }}
          onPressOut={handlePressOut}
          style={animatedStyle}
        >
        <View style={[styles.artwork, { width, height: width * 1.48 }]}>
          <Image source={{ uri: anime.image }} style={styles.image} resizeMode="cover" />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.08)', 'rgba(0,0,0,0.78)']}
            locations={[0.45, 0.66, 1]}
            style={StyleSheet.absoluteFill}
          />

          {badge ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          ) : null}

          {rank ? (
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>{rank}</Text>
            </View>
          ) : null}

          {normalizedProgress != null ? (
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${normalizedProgress * 100}%` }]} />
            </View>
          ) : null}
        </View>

        <Text style={styles.title} numberOfLines={2}>{anime.title}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta} numberOfLines={1}>{anime.subtitle || 'Serie'}</Text>
          <View style={styles.metaDot} />
          <Text style={styles.metaAccent}>SUB</Text>
        </View>
        </AnimatedPressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexShrink: 0,
  },
  artwork: {
    overflow: 'hidden',
    borderRadius: 6,
    backgroundColor: theme.colorPalette.primary.backgroundSecondary,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    minHeight: 22,
    justifyContent: 'center',
    paddingHorizontal: 7,
    borderRadius: 5,
    backgroundColor: theme.colorPalette.accent.primary,
  },
  badgeText: {
    color: '#ffffff',
    fontFamily: theme.typography.fontFamily.primaryBold,
    fontSize: 9,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  rankBadge: {
    position: 'absolute',
    left: 8,
    top: 9,
    width: 30,
    height: 30,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.88)',
  },
  rankText: {
    color: '#ffffff',
    fontFamily: theme.typography.fontFamily.primaryBold,
    fontSize: 15,
  },
  progressTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colorPalette.accent.primary,
  },
  title: {
    color: theme.colorPalette.text.primary,
    fontFamily: theme.typography.fontFamily.primaryBold,
    fontSize: 14,
    lineHeight: 18,
    marginTop: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  meta: {
    flexShrink: 1,
    color: theme.colorPalette.text.tertiary,
    fontFamily: theme.typography.fontFamily.primary,
    fontSize: 11,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    marginHorizontal: 6,
    backgroundColor: theme.colorPalette.text.tertiary,
  },
  metaAccent: {
    color: theme.colorPalette.accent.secondary,
    fontFamily: theme.typography.fontFamily.primaryBold,
    fontSize: 10,
    letterSpacing: 0.4,
  },
});
