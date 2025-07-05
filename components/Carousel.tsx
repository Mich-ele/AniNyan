import React from 'react';
import { View, StyleSheet, FlatList, Dimensions, ImageBackground, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, interpolate, Extrapolate } from 'react-native-reanimated';
import { CarouselItem } from '../types/anime';
import theme, { px, fw } from '../app/styles/theme';

const { width: screenWidth } = Dimensions.get('window');

interface CarouselProps {
  data: CarouselItem[];
}

const Carousel: React.FC<CarouselProps> = ({ data }) => {
  const scrollX = useSharedValue(0);

  const renderItem = ({ item }: { item: CarouselItem }) => (
    <View style={styles.slide}>
            <ImageBackground source={{ uri: item.image }} style={styles.imageBackground} resizeMode="cover">
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.gradient}
        />
        <View style={styles.textContainer}>
          <Text style={styles.title}>{item.title}</Text>
        </View>
      </ImageBackground>
    </View>
  );

  const Pagination = ({ data }: { data: CarouselItem[] }) => (
    <View style={styles.paginationContainer}>
      {data.map((_, idx) => {
        const animatedStyle = useAnimatedStyle(() => {
          const width = interpolate(
            scrollX.value,
            [(idx - 1) * screenWidth, idx * screenWidth, (idx + 1) * screenWidth],
            [8, 24, 8],
            Extrapolate.CLAMP
          );
          const opacity = interpolate(
            scrollX.value,
            [(idx - 1) * screenWidth, idx * screenWidth, (idx + 1) * screenWidth],
            [0.5, 1, 0.5],
            Extrapolate.CLAMP
          );
          return { width, opacity };
        });
        return <Animated.View key={idx} style={[styles.dot, animatedStyle]} />;
      })}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={(event) => {
          scrollX.value = event.nativeEvent.contentOffset.x;
        }}
        scrollEventThrottle={16}
        nestedScrollEnabled
      />
      <Pagination data={data} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 500,
    width: '100%',
  },
  slide: {
    width: screenWidth,
    height: '100%',
  },
  imageBackground: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  textContainer: {
    padding: px(theme.spacing.lg),
  },
  title: {
    color: theme.colorPalette.text.primary,
    fontSize: px(theme.typography.sizes.title),
    fontWeight: fw(theme.typography.weights.bold),
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  paginationContainer: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colorPalette.accent.primary,
    marginHorizontal: 4,
  },
});

export default Carousel;
