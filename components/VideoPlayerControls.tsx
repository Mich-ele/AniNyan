import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  TouchableWithoutFeedback,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Reanimated, {
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutRight,
  ZoomIn,
} from 'react-native-reanimated';
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
  reduceMotion: boolean;
}

type AnimatedControlButtonProps = React.ComponentProps<typeof TouchableOpacity> & {
  reduceMotion: boolean;
};

const AnimatedControlButton = ({
  reduceMotion,
  children,
  disabled,
  ...props
}: AnimatedControlButtonProps) => {
  const scale = React.useRef(new Animated.Value(1)).current;

  const animateScale = (value: number) => {
    if (reduceMotion) return;
    Animated.spring(scale, {
      toValue: value,
      damping: 16,
      stiffness: 260,
      mass: 0.55,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        {...props}
        disabled={disabled}
        activeOpacity={0.86}
        onPressIn={() => animateScale(0.91)}
        onPressOut={() => animateScale(1)}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

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
    reduceMotion,
  } = props;

  const playbackSpeeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
  const remaining = Math.max(0, duration - position);
  const previewLabel = showPreview ? formatTime(previewTime) : formatTime(position);
  const topTranslateY = controlsOpacity.interpolate({
    inputRange: [0, 1],
    outputRange: [-12, 0],
  });
  const centerScale = controlsOpacity.interpolate({
    inputRange: [0, 1],
    outputRange: [0.94, 1],
  });
  const bottomTranslateY = controlsOpacity.interpolate({
    inputRange: [0, 1],
    outputRange: [14, 0],
  });
  const instantEnter = FadeIn.duration(0);
  const instantExit = FadeOut.duration(0);

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
          <Reanimated.View
            entering={reduceMotion ? instantEnter : FadeIn.duration(160)}
            exiting={reduceMotion ? instantExit : FadeOut.duration(120)}
            pointerEvents="none"
            style={styles.bufferingLayer}
          >
            <View style={styles.bufferingIndicator}>
              <ActivityIndicator size="large" color={theme.colorPalette.accent.primary} />
            </View>
          </Reanimated.View>
        )}

        <Animated.View
          style={[styles.topControls, { transform: [{ translateY: topTranslateY }] }]}
          pointerEvents={showControls ? 'auto' : 'none'}
        >
          <AnimatedControlButton reduceMotion={reduceMotion} onPress={handleBack} style={styles.iconButton}>
            <Ionicons name="arrow-back" size={28} color={theme.colorPalette.text.primary} />
          </AnimatedControlButton>

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
            <AnimatedControlButton
              reduceMotion={reduceMotion}
              onPress={toggleSettings}
              style={[styles.iconButton, showSettings && styles.iconButtonActive]}
            >
              <Ionicons
                name="settings-outline"
                size={24}
                color={showSettings ? theme.colorPalette.accent.primary : theme.colorPalette.text.primary}
              />
            </AnimatedControlButton>
            {hasNextEpisode && (
              <AnimatedControlButton
                reduceMotion={reduceMotion}
                onPress={handleNextEpisode}
                style={styles.iconButton}
                disabled={!showControls || isNextEpisodeLoading}
                accessibilityRole="button"
                accessibilityLabel="Episodio successivo"
              >
                {isNextEpisodeLoading ? (
                  <ActivityIndicator size="small" color={theme.colorPalette.text.primary} />
                ) : (
                  <Ionicons name="play-skip-forward" size={24} color={theme.colorPalette.text.primary} />
                )}
              </AnimatedControlButton>
            )}
          </View>
        </Animated.View>

        <Animated.View
          style={[styles.centerControls, { transform: [{ scale: centerScale }] }]}
          pointerEvents={showControls ? 'auto' : 'none'}
        >
          <AnimatedControlButton
            reduceMotion={reduceMotion}
            onPress={handleRewind}
            style={styles.skipButton}
            disabled={!showControls}
          >
            <MaterialCommunityIcons name="rewind-10" size={42} color={theme.colorPalette.text.primary} />
          </AnimatedControlButton>

          <AnimatedControlButton
            reduceMotion={reduceMotion}
            onPress={handlePlayPause}
            style={styles.playButton}
            disabled={!showControls}
          >
            <Reanimated.View
              key={isPlaying ? 'pause' : 'play'}
              entering={reduceMotion ? instantEnter : ZoomIn.duration(140)}
            >
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={46}
                color={theme.colorPalette.primary.background}
                style={!isPlaying && styles.playIconOffset}
              />
            </Reanimated.View>
          </AnimatedControlButton>

          <AnimatedControlButton
            reduceMotion={reduceMotion}
            onPress={handleForward}
            style={styles.skipButton}
            disabled={!showControls}
          >
            <MaterialCommunityIcons name="fast-forward-10" size={42} color={theme.colorPalette.text.primary} />
          </AnimatedControlButton>
        </Animated.View>

        <Animated.View
          style={[styles.bottomControls, { transform: [{ translateY: bottomTranslateY }] }]}
          pointerEvents={showControls ? 'auto' : 'none'}
        >
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
        </Animated.View>

        {showSettings && (
          <>
            <Reanimated.View
              entering={reduceMotion ? instantEnter : FadeIn.duration(150)}
              exiting={reduceMotion ? instantExit : FadeOut.duration(110)}
              pointerEvents="none"
              style={styles.settingsScrim}
            />
            <Reanimated.View
              entering={reduceMotion ? instantEnter : SlideInRight.duration(220)}
              exiting={reduceMotion ? instantExit : SlideOutRight.duration(160)}
              style={styles.settingsMenu}
              pointerEvents="auto"
            >
              <View style={styles.settingsHeader}>
                <View style={styles.settingsHeaderIcon}>
                  <Ionicons name="options-outline" size={21} color={theme.colorPalette.accent.primary} />
                </View>
                <View style={styles.settingsHeaderCopy}>
                  <Text style={styles.settingsEyebrow}>PLAYER</Text>
                  <Text style={styles.settingsHeading}>Impostazioni</Text>
                </View>
                <TouchableOpacity
                  onPress={toggleSettings}
                  style={styles.settingsCloseButton}
                  activeOpacity={0.76}
                  accessibilityRole="button"
                  accessibilityLabel="Chiudi impostazioni"
                >
                  <Ionicons name="close" size={20} color={theme.colorPalette.text.secondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.currentSetting}>
                <View>
                  <Text style={styles.currentSettingLabel}>Velocità di riproduzione</Text>
                </View>
                <View style={styles.currentSpeedPill}>
                  <Text style={styles.currentSpeedText}>
                    {playbackSpeed === 1 ? '1×' : `${playbackSpeed}×`}
                  </Text>
                </View>
              </View>

              <View style={styles.speedGrid}>
                {playbackSpeeds.map((speed) => {
                  const isActive = playbackSpeed === speed;
                  return (
                    <TouchableOpacity
                      key={speed}
                      style={[styles.speedOption, isActive && styles.speedOptionActive]}
                      activeOpacity={0.78}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isActive }}
                      onPress={() => {
                        player.playbackRate = speed;
                        setPlaybackSpeed(speed);
                      }}
                    >
                      <Text style={[styles.speedText, isActive && styles.activeSpeedText]}>
                        {speed === 1 ? 'Normale' : `${speed}×`}
                      </Text>
                      {isActive && (
                        <Reanimated.View entering={reduceMotion ? instantEnter : ZoomIn.duration(120)}>
                          <Ionicons name="checkmark-circle" size={17} color={theme.colorPalette.primary.background} />
                        </Reanimated.View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Reanimated.View>
          </>
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
  bufferingIndicator: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8,8,8,0.78)',
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
    backgroundColor: 'rgba(18,18,18,0.64)',
  },
  iconButtonActive: {
    backgroundColor: 'rgba(244,117,33,0.16)',
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
  settingsScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  settingsMenu: {
    position: 'absolute',
    right: 26,
    top: 74,
    width: 344,
    borderRadius: 16,
    padding: 18,
    backgroundColor: 'rgba(15,15,16,0.98)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.48,
    shadowRadius: 28,
    elevation: 18,
  },
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  settingsHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(244,117,33,0.14)',
  },
  settingsHeaderCopy: {
    flex: 1,
    marginLeft: 12,
  },
  settingsEyebrow: {
    color: theme.colorPalette.text.tertiary,
    fontSize: 10,
    fontFamily: theme.typography.fontFamily.primaryBold,
    letterSpacing: 1,
    marginBottom: 2,
  },
  settingsHeading: {
    color: theme.colorPalette.text.primary,
    fontSize: 18,
    fontFamily: theme.typography.fontFamily.primaryBold,
  },
  settingsCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colorPalette.primary.backgroundTertiary,
  },
  currentSetting: {
    minHeight: 58,
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colorPalette.primary.backgroundTertiary,
    marginBottom: 12,
  },
  currentSettingLabel: {
    color: theme.colorPalette.text.primary,
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.primaryBold,
  },
  currentSettingHint: {
    color: theme.colorPalette.text.tertiary,
    fontSize: 11,
    fontFamily: theme.typography.fontFamily.primary,
    marginTop: 2,
  },
  currentSpeedPill: {
    minWidth: 46,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(244,117,33,0.14)',
  },
  currentSpeedText: {
    color: theme.colorPalette.accent.primary,
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.primaryBold,
  },
  speedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  speedOption: {
    width: '31.5%',
    height: 42,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    gap: 5,
    backgroundColor: theme.colorPalette.primary.backgroundTertiary,
  },
  speedOptionActive: {
    backgroundColor: theme.colorPalette.accent.primary,
  },
  speedText: {
    color: theme.colorPalette.text.secondary,
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.primary,
  },
  activeSpeedText: {
    color: theme.colorPalette.primary.background,
    fontFamily: theme.typography.fontFamily.primaryBold,
  },
});
