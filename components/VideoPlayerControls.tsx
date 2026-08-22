import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeCastButton } from './SafeCastButton';

import VideoPlayerCustomThumb from './VideoPlayerCustomThumb';
import { VideoPlayer } from 'expo-video';
import { theme } from '../app/styles/theme';

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60).toString().padStart(2, '0');
  return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${s}` : `${m}:${s}`;
};

interface VideoPlayerControlsProps {
  player: VideoPlayer;
  title?: string;
  episodeNumber: number;
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
  handleNextEpisode: () => void;
  handleValueChange: (value: number) => void;
  handleSlidingStart: () => void;
  handleSlidingComplete: (value: number) => void;
  setSliderWidth: (width: number) => void;
  toggleControls: () => void;
  showSettings: boolean;
  toggleSettings: () => void;
  playbackSpeed: number;
  setPlaybackSpeed: (speed: number) => void;
  isCasting: boolean;
  hasNextEpisode: boolean;
  isNextEpisodeLoading: boolean;
}

export const VideoPlayerControls: React.FC<VideoPlayerControlsProps> = (props) => {
  const {
    player,
    title,
    episodeNumber,
    isBuffering,
    isPlaying,
    position,
    duration,
    sliderValue,
    showPreview,
    previewTime,
    sliderWidth,
    thumbScale,
    controlsOpacity,
    showControls,
    handleBack,
    handleRewind,
    handlePlayPause,
    handleForward,
    handleNextEpisode,
    handleValueChange,
    handleSlidingStart,
    handleSlidingComplete,
    setSliderWidth,
    toggleControls,
    showSettings,
    toggleSettings,
    playbackSpeed,
    setPlaybackSpeed,
    isCasting,
    hasNextEpisode,
    isNextEpisodeLoading,
  } = props;

  const playbackSpeeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
  const remaining = Math.max(0, duration - position);
  const previewLabel = showPreview ? formatTime(previewTime) : formatTime(position);

  const handleMainPress = () => {
    if (showSettings) {
      toggleSettings();
      return;
    }
    toggleControls();
  };

  return (
    <View style={styles.fullscreenContainer}>
      <TouchableWithoutFeedback onPress={handleMainPress}>
        <View style={StyleSheet.absoluteFill} />
      </TouchableWithoutFeedback>

      <Animated.View
        pointerEvents="box-none"
        style={[styles.controlsOverlay, { opacity: controlsOpacity }]}
      >
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(0,0,0,0.88)', 'rgba(0,0,0,0.18)', 'rgba(0,0,0,0.92)']}
          locations={[0, 0.46, 1]}
          style={StyleSheet.absoluteFill}
        />

        {isBuffering && (
          <View pointerEvents="none" style={styles.bufferingLayer}>
            <ActivityIndicator size="large" color={theme.colorPalette.accent.primary} />
          </View>
        )}

        <View style={styles.topControls} pointerEvents={showControls ? 'auto' : 'none'}>
          <TouchableOpacity onPress={handleBack} style={styles.iconButton}>
            <Ionicons name="arrow-back" size={28} color={theme.colorPalette.text.primary} />
          </TouchableOpacity>

          <View style={styles.titleBlock}>
            <Text style={styles.nowPlayingText}>Stai guardando</Text>
            <Text style={styles.titleText} numberOfLines={1}>{title || 'Anime'}</Text>
            <Text style={styles.episodeText}>Episodio: {episodeNumber}</Text>
          </View>

          <View style={styles.topRightControls}>
            {isCasting && (
              <View style={styles.castingPill}>
                <Ionicons name="radio" size={14} color={theme.colorPalette.accent.primary} />
                <Text style={styles.castingText}>Cast</Text>
              </View>
            )}
            <SafeCastButton style={styles.castButton} tintColor={theme.colorPalette.text.primary} />
            <TouchableOpacity onPress={toggleSettings} style={styles.iconButton}>
              <Ionicons name="settings-outline" size={24} color={theme.colorPalette.text.primary} />
            </TouchableOpacity>
            {hasNextEpisode && (
              <TouchableOpacity
                onPress={handleNextEpisode}
                style={[styles.iconButton, styles.nextEpisodeTopButton]}
                disabled={!showControls || isNextEpisodeLoading}
                accessibilityRole="button"
                accessibilityLabel="Episodio successivo"
              >
                {isNextEpisodeLoading ? (
                  <ActivityIndicator size="small" color={theme.colorPalette.text.primary} />
                ) : (
                  <Ionicons name="play-skip-forward" size={24} color={theme.colorPalette.text.primary} />
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.centerControls} pointerEvents={showControls ? 'auto' : 'none'}>
          <TouchableOpacity onPress={handleRewind} style={styles.skipButton} disabled={!showControls}>
            <MaterialCommunityIcons name="rewind-10" size={42} color={theme.colorPalette.text.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handlePlayPause}
            style={styles.playButton}
            disabled={!showControls}
            activeOpacity={0.84}
          >
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={46}
              color={theme.colorPalette.primary.background}
              style={!isPlaying && styles.playIconOffset}
            />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleForward} style={styles.skipButton} disabled={!showControls}>
            <MaterialCommunityIcons name="fast-forward-10" size={42} color={theme.colorPalette.text.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.bottomControls} pointerEvents={showControls ? 'auto' : 'none'}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTime}>{previewLabel}</Text>
            <Text style={styles.remainingText}>-{formatTime(remaining)}</Text>
          </View>

          <View style={styles.sliderWrap}>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={duration || 1}
              value={sliderValue}
              onValueChange={handleValueChange}
              onSlidingStart={handleSlidingStart}
              onSlidingComplete={handleSlidingComplete}
              minimumTrackTintColor={theme.colorPalette.accent.primary}
              maximumTrackTintColor="rgba(255,255,255,0.34)"
              thumbTintColor="transparent"
              onLayout={(e) => setSliderWidth(e.nativeEvent.layout.width)}
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
          </View>
        </View>

        {showSettings && (
          <View style={styles.settingsMenu} pointerEvents="auto">
            <Text style={styles.settingsTitle}>Velocita riproduzione</Text>
            <ScrollView
              style={styles.settingsScroll}
              contentContainerStyle={styles.settingsScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {playbackSpeeds.map((speed) => (
                <TouchableOpacity
                  key={speed}
                  style={styles.speedOption}
                  onPress={() => {
                    player.playbackRate = speed;
                    setPlaybackSpeed(speed);
                  }}
                >
                  <View style={[styles.speedDot, playbackSpeed === speed && styles.speedDotActive]} />
                  <Text style={[styles.speedText, playbackSpeed === speed && styles.activeSpeedText]}>
                    {speed === 1 ? 'Normale' : `${speed}x`}
                  </Text>
                  {playbackSpeed === speed && (
                    <Ionicons name="checkmark" size={18} color={theme.colorPalette.accent.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  fullscreenContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    paddingHorizontal: 26,
    paddingVertical: 18,
  },
  bufferingLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topControls: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
  },
  iconButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  titleBlock: {
    flex: 1,
    marginHorizontal: 16,
  },
  nowPlayingText: {
    color: theme.colorPalette.text.tertiary,
    fontSize: 11,
    fontFamily: theme.typography.fontFamily.primaryBold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  titleText: {
    color: theme.colorPalette.text.primary,
    fontSize: 20,
    fontFamily: theme.typography.fontFamily.primaryBold,
  },
  episodeText: {
    color: theme.colorPalette.text.secondary,
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.primaryBold,
    marginTop: 2,
  },
  topRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  castingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 10,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  castingText: {
    color: theme.colorPalette.text.primary,
    fontSize: 12,
    fontFamily: theme.typography.fontFamily.primaryBold,
  },
  castButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextEpisodeTopButton: {
  },
  centerControls: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '39%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 52,
  },
  skipButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  playButton: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colorPalette.accent.primary,
    shadowColor: theme.colorPalette.accent.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.32,
    shadowRadius: 18,
    elevation: 10,
  },
  playIconOffset: {
    marginLeft: 4,
  },
  bottomControls: {
    width: '100%',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 8,
    marginBottom: 2,
  },
  progressTime: {
    color: theme.colorPalette.text.primary,
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.primaryBold,
  },
  remainingText: {
    color: theme.colorPalette.text.secondary,
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.primary,
  },
  sliderWrap: {
    height: 34,
    justifyContent: 'center',
  },
  slider: {
    width: '100%',
    height: 28,
  },
  compactTime: {
    color: theme.colorPalette.text.secondary,
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.primary,
    marginHorizontal: 8,
    marginTop: 2,
  },
  settingsMenu: {
    position: 'absolute',
    right: 26,
    top: 64,
    bottom: 76,
    backgroundColor: 'rgba(12,12,12,0.96)',
    borderRadius: 8,
    paddingTop: 10,
    paddingBottom: 8,
    width: 220,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  settingsTitle: {
    color: theme.colorPalette.text.tertiary,
    fontSize: 12,
    fontFamily: theme.typography.fontFamily.primaryBold,
    paddingHorizontal: 16,
    paddingBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  settingsScroll: {
    flex: 1,
  },
  settingsScrollContent: {
    paddingBottom: 4,
  },
  speedOption: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
  },
  speedDot: {
    width: 5,
    height: 22,
    borderRadius: 3,
    backgroundColor: 'transparent',
  },
  speedDotActive: {
    backgroundColor: theme.colorPalette.accent.primary,
  },
  speedText: {
    flex: 1,
    color: theme.colorPalette.text.primary,
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.primary,
  },
  activeSpeedText: {
    color: theme.colorPalette.accent.primary,
    fontFamily: theme.typography.fontFamily.primaryBold,
  },
});
