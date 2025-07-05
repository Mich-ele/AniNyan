import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, ActivityIndicator } from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import VideoPlayerCustomThumb from './VideoPlayerCustomThumb';
import { VideoPlayer } from 'expo-video';

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

interface VideoPlayerControlsProps {
  player: VideoPlayer;
  title?: string;
  isBuffering: boolean;
  isPlaying: boolean;
  position: number;
  duration: number;
  sliderValue: number;
  showPreview: boolean;
  previewTime: number;
  snapInterval: number;
  sliderWidth: number;
  thumbScale: Animated.Value;
  controlsOpacity: Animated.Value;
  showControls: boolean;
  handleBack: () => void;
  handleRewind: () => void;
  handlePlayPause: () => void;
  handleForward: () => void;
  handleValueChange: (value: number) => void;
  handleSlidingStart: () => void;
  handleSlidingComplete: (value: number) => void;
  setSliderWidth: (width: number) => void;
  toggleControls: () => void;
  // Settings
  showSettings: boolean;
  toggleSettings: () => void;
  playbackSpeed: number;
  setPlaybackSpeed: (speed: number) => void;
}

export const VideoPlayerControls: React.FC<VideoPlayerControlsProps> = (props) => {
  const { 
    player,
    title,
    isBuffering,
    isPlaying,
    position,
    duration,
    sliderValue,
    showPreview,
    previewTime,
    snapInterval,
    sliderWidth,
    thumbScale,
    controlsOpacity,
    showControls,
    handleBack,
    handleRewind,
    handlePlayPause,
    handleForward,
    handleValueChange,
    handleSlidingStart,
    handleSlidingComplete,
    setSliderWidth,
    toggleControls,
    // Settings
    showSettings,
    toggleSettings,
    playbackSpeed,
    setPlaybackSpeed,
  } = props;

  const handleMainPress = () => {
    if (showSettings) {
      toggleSettings();
    } else {
      toggleControls();
    }
  };

  const playbackSpeeds = [0.5, 1, 1.25, 1.5, 1.75, 2];

  return (
    <TouchableOpacity
      style={styles.fullscreenContainer}
      activeOpacity={1}
      onPress={handleMainPress}
    >
      <Animated.View style={[styles.controlsOverlay, { opacity: controlsOpacity }]}>
        {isBuffering && <ActivityIndicator style={StyleSheet.absoluteFill} size="large" color="white" />}
        
        <View style={styles.topControls}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.titleText} numberOfLines={1}>{title}</Text>
          <View style={styles.topRightControls}>
              <TouchableOpacity style={styles.topControlButton}><MaterialIcons name="cast" size={24} color="white" /></TouchableOpacity>
              <TouchableOpacity onPress={toggleSettings} style={styles.topControlButton}><Ionicons name="settings-outline" size={24} color="white" /></TouchableOpacity>
          </View>
        </View>

        <View style={styles.middleControls} pointerEvents={showControls ? 'auto' : 'none'}>
          <TouchableOpacity onPress={handleRewind} style={styles.controlButton} disabled={!showControls}>
              <MaterialCommunityIcons name="rewind-15" size={30} color="white" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handlePlayPause} style={[styles.controlButton, styles.playPauseButton]} disabled={!showControls}>
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={32} color="white" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleForward} style={styles.controlButton} disabled={!showControls}>
              <MaterialCommunityIcons name="fast-forward-15" size={30} color="white" />
          </TouchableOpacity>
        </View>

        <View style={styles.bottomControls} pointerEvents={showControls ? 'auto' : 'none'}>
          <Text style={styles.timeText}>{formatTime(position)} / {formatTime(duration)}</Text>
          <View style={{ flex: 1, position: 'relative', justifyContent: 'center' }}>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={duration || 1}
              value={sliderValue}
              onValueChange={handleValueChange}
              onSlidingStart={handleSlidingStart}
              onSlidingComplete={handleSlidingComplete}
              minimumTrackTintColor="#A973FF"
              maximumTrackTintColor="rgba(255, 255, 255, 0.5)"
              thumbTintColor="transparent"
              onLayout={e => setSliderWidth(e.nativeEvent.layout.width)}
              disabled={!showControls}
            />
            {sliderWidth > 0 && (
              <VideoPlayerCustomThumb
                position={sliderValue / (duration || 1)}
                sliderWidth={sliderWidth}
                isActive={showPreview}
                scale={thumbScale}
              />
            )}
            {showPreview && sliderWidth > 0 && (
              <View
                style={[
                  styles.previewContainer,
                  {
                    left: Math.max(
                      0,
                      Math.min(
                        sliderWidth * (previewTime / (duration || 1)) + 25,
                        sliderWidth - 60
                      )
                    ),
                  },
                ]}
                pointerEvents="none"
              >
                <Text style={styles.previewText}>{formatTime(Math.round(previewTime / snapInterval) * snapInterval)}</Text>
              </View>
            )}
          </View>

        </View>

        {showSettings && (
          <View style={styles.settingsMenu}>
            <Text style={styles.settingsTitle}>Playback Speed</Text>
            {playbackSpeeds.map(speed => (
              <TouchableOpacity 
                key={speed} 
                style={styles.speedOption}
                onPress={() => {
                  player.playbackRate = speed;
                  setPlaybackSpeed(speed);
                }}
              >
                {playbackSpeed === speed && <View style={styles.activeSpeedIndicator} />}
                <Text style={[styles.speedText, playbackSpeed === speed && styles.activeSpeedText]}>
                  {speed === 1 ? 'Normal' : `${speed}x`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  settingsMenu: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.9)',
    borderRadius: 12,
    paddingVertical: 10,
    width: 160,
  },
  settingsTitle: {
    color: '#CCC',
    fontSize: 13,
    fontFamily: 'Raleway-Bold',
    paddingHorizontal: 15,
    marginBottom: 5,
  },
  speedOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  activeSpeedIndicator: {
    width: 4,
    height: 20,
    backgroundColor: '#A973FF',
    borderRadius: 2,
    marginRight: 10,
  },
  speedText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: 'Raleway-SemiBold',
  },
  activeSpeedText: {
    color: '#A973FF',
    fontFamily: 'Raleway-Bold',
  },
  previewContainer: {
    position: 'absolute',
    left: '50%',
    bottom: 30,
    transform: [{ translateX: -30 }],
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  previewText: {
    color: '#FFF',
    fontSize: 13,
    fontFamily: 'Raleway-Bold',
  },
  fullscreenContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'space-between',
    padding: 20,
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  backButton: {
    padding: 8,
  },
  titleText: {
      color: 'white',
      fontSize: 18,
      fontWeight: 'bold',
      flex: 1,
      textAlign: 'center',
      marginHorizontal: 8,
  },
  topRightControls: {
      flexDirection: 'row',
  },
  topControlButton: {
      marginLeft: 16,
  },
  middleControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButton: {
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      borderRadius: 50,
      width: 50,
      height: 50,
      justifyContent: 'center',
      alignItems: 'center',
      marginHorizontal: 10,
  },
  playPauseButton: {
      width: 70,
      height: 70,
  },
  bottomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
    marginHorizontal: 16,
    paddingBottom: 8,
  },

  timeText: {
    color: 'white',
    fontSize: 14,
    minWidth: 80, // To prevent layout shifts
  },
  slider: {
    flex: 1,
    marginHorizontal: 8,
    height: 10,
  },
});
