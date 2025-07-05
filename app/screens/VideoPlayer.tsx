import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Animated, ActivityIndicator, Text } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as Haptics from 'expo-haptics';
import * as NavigationBar from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';
import { useEvent } from 'expo';

import { VideoPlayerControls } from '../../components/VideoPlayerControls';

export default function VideoPlayerScreen() {
  const { videoUrl, title } = useLocalSearchParams<{ videoUrl: string; title?: string }>();
  const router = useRouter();
  const player = useVideoPlayer(videoUrl, (player) => {
    player.play();
    player.preservesPitch = true;
    player.timeUpdateEventInterval = 0.5; // seconds
  });
  const videoViewRef = useRef<VideoView>(null);

  // Core State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);

  // Controls Visibility State
  const [showControls, setShowControls] = useState(true);
  const controlsTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controlsOpacity = useRef(new Animated.Value(1)).current;

  // Slider & Seeking State
  const [sliderValue, setSliderValue] = useState(0);
  const [sliderWidth, setSliderWidth] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [previewTime, setPreviewTime] = useState(0);
  const thumbScale = useRef(new Animated.Value(1)).current;
  const isSeeking = useRef(false);
  const seekStartPosition = useRef(0);

  // Native fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSettings, setShowSettings] = useState(false);

  // Lock to landscape on mount, unlock on unmount
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);

  // Player Listeners
  const timeUpdate = useEvent(player, 'timeUpdate');

  useEffect(() => {
    const playingListener = player.addListener('playingChange', (e) => setIsPlaying(e.isPlaying));
    const statusListener = player.addListener('statusChange', (e) => setIsBuffering(e.status === 'loading'));
    const sourceListener = player.addListener('sourceLoad', (e) => {
      if (e.duration) {
        setDuration(e.duration);
        NavigationBar.setVisibilityAsync('hidden');
      }
    });

    return () => {
      playingListener.remove();
      statusListener.remove();
      sourceListener.remove();
    };
  }, [player]);

  // Real-time playback update for custom timeline
  useEffect(() => {
    const timeListener = player.addListener('timeUpdate', (e) => {
      setPosition(e.currentTime);
      if (!isSeeking) {
        setSliderValue(e.currentTime);
      }
    });
    return () => {
      timeListener.remove();
    };
  }, [player, isSeeking]);


  // Controls visibility animation
  useEffect(() => {
    Animated.timing(controlsOpacity, {
      toValue: showControls ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [showControls]);

  // Auto-hide controls
  
  useEffect(() => {
    if (controlsTimeout.current && (!showControls || isSeeking)) {
      clearTimeout(controlsTimeout.current);
      return;
    }

    if (showControls && isPlaying && !isSeeking) {
      controlsTimeout.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [showControls, isPlaying, isSeeking]);

  // --- HANDLERS ---

  const handleBack = () => {
    if (isFullscreen) {
      videoViewRef.current?.exitFullscreen();
    } else {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).then(() => {
        router.back();
      });
    }
  };

  const handlePlayPause = () => {
    player.playing ? player.pause() : player.play();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleRewind = () => {
    const newTime = Math.max(0, player.currentTime - 15);
    player.currentTime = newTime;
    setPosition(newTime);
    setSliderValue(newTime);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleForward = () => {
    const newTime = Math.min(duration, player.currentTime + 15);
    player.currentTime = newTime;
    setPosition(newTime);
    setSliderValue(newTime);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const toggleControls = () => {
    setShowControls(!showControls);
  };

  // Advanced Slider Handlers
  const snapInterval = duration > 300 ? 10 : 5;

  const handleValueChange = (value: number) => {
    if (!isSeeking.current) {
        isSeeking.current = true;
        seekStartPosition.current = position;
    }
    setSliderValue(value);
    setPreviewTime(value);
    if (!showPreview) setShowPreview(true);
  };

  const handleSlidingStart = () => {
    isSeeking.current = true;
    setShowPreview(true);
    Animated.spring(thumbScale, { toValue: 1.2, useNativeDriver: true }).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSlidingComplete = (value: number) => {
    isSeeking.current = false;
    setShowPreview(false);
    player.currentTime = value;
    setPosition(value);
    Animated.spring(thumbScale, { toValue: 1, useNativeDriver: true }).start();
  };

  const handleToggleFullscreen = () => {
    if (isFullscreen) {
      videoViewRef.current?.exitFullscreen();
    } else {
      videoViewRef.current?.enterFullscreen();
    }
  };

  // --- RENDER ---

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <VideoView
        ref={videoViewRef}
        style={styles.video}
        player={player}
        nativeControls={false}
        contentFit="contain"
        allowsFullscreen
        onFullscreenEnter={() => {
          setIsFullscreen(true);
        }}
        onFullscreenExit={() => {
          setIsFullscreen(false);
          // When fullscreen is exited, navigate back as per the "fullscreen-only" requirement
          ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).then(() => {
            router.back();
          });
        }}
        onFirstFrameRender={() => {
          // Automatically enter fullscreen once the video is ready
          videoViewRef.current?.enterFullscreen();
        }}
      />
      <VideoPlayerControls
        player={player}
        title={title}
        isPlaying={isPlaying}
        isBuffering={isBuffering}
        position={position}
        duration={duration}
        sliderValue={sliderValue}
        showPreview={showPreview}
        previewTime={previewTime}
        snapInterval={snapInterval}
        sliderWidth={sliderWidth}
        thumbScale={thumbScale}
        controlsOpacity={controlsOpacity}
        showControls={showControls}
        handleBack={handleBack}
        handleRewind={handleRewind}
        handlePlayPause={handlePlayPause}
        handleForward={handleForward}
        handleValueChange={handleValueChange}
        handleSlidingStart={handleSlidingStart}
        handleSlidingComplete={handleSlidingComplete}
        setSliderWidth={setSliderWidth}
        toggleControls={toggleControls}
        // Settings
        showSettings={showSettings}
        toggleSettings={() => setShowSettings(!showSettings)}
        playbackSpeed={playbackSpeed}
        setPlaybackSpeed={setPlaybackSpeed}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
});

