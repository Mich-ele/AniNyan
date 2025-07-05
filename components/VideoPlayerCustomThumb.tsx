import React from 'react';
import { Animated, View, StyleSheet } from 'react-native';

interface Props {
  position: number;
  sliderWidth: number;
  isActive: boolean;
  scale: Animated.Value;
}

const THUMB_SIZE = 28;

const VideoPlayerCustomThumb: React.FC<Props> = ({ position, sliderWidth, isActive, scale }) => {
  const left = sliderWidth * position;
  return (
    <Animated.View
      style={[
        styles.thumb,
        {
          left,
          transform: [{ scale }, { translateY: -THUMB_SIZE / 2 }],
          shadowOpacity: isActive ? 0.5 : 0.2,
        },
      ]}
      pointerEvents="none"
    >
      <View style={styles.innerDot} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  thumb: {
    position: 'absolute',
    top: '50%',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  innerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
});

export default VideoPlayerCustomThumb;
