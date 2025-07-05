import { View, Text, StyleSheet, Image, TouchableOpacity, ViewStyle } from 'react-native';
import theme, { px, fw } from '@/app/styles/theme';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Anime } from '@/types/anime';

interface AnimeBannerCardProps {
  anime: Anime;
  style?: ViewStyle;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function AnimeBannerCard({ anime, style }: AnimeBannerCardProps) {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.98);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  return (
    <AnimatedTouchable
      style={[styles.container, style, animatedStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      <Image source={{ uri: anime.image }} style={styles.image} />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.8)']}
        style={styles.gradient}
      />
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>{anime.title}</Text>
      </View>
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: px(theme.borderRadius.large),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    aspectRatio: 16 / 9, // Banner aspect ratio
  },
  image: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '70%',
  },
  content: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: px(theme.spacing.md),
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
  },
  title: {
    color: theme.colorPalette.text.primary,
    fontSize: px(theme.typography.sizes.body),
    fontWeight: fw(theme.typography.weights.semibold),
  },
});
