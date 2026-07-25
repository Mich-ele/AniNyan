import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Animated, Pressable, Text } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as Haptics from 'expo-haptics';
import * as NavigationBar from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';
import { Platform, PermissionsAndroid } from 'react-native';
import { isExpoGo, useSafeRemoteMediaClient, useSafeCastSession } from '../../components/SafeCastButton';

import { VideoPlayerControls } from '../../components/VideoPlayerControls';
import { DEFAULT_USER_PREFERENCES, UserPreferences, getUserPreferences } from '../../services/userPreferences';


export default function VideoPlayerScreen() {
  const { videoUrl, title, animeUrl, episodeNumber, hasNextEpisode, nextEpisodeNumber } = useLocalSearchParams<{
    videoUrl: string;
    title?: string;
    animeUrl?: string;
    episodeNumber?: string;
    hasNextEpisode?: string;
    nextEpisodeNumber?: string;
  }>();
  const router = useRouter();
  const player = useVideoPlayer(videoUrl, (player) => {
    player.muted = false;
    player.volume = 1.0;
    player.preservesPitch = true;
    player.timeUpdateEventInterval = 0.5;
    player.audioMixingMode = 'duckOthers';
    player.staysActiveInBackground = false;
    player.pause();
  });
  const videoViewRef = useRef<VideoView>(null);


  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);


  const [showControls, setShowControls] = useState(true);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const controlsTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controlsOpacity = useRef(new Animated.Value(1)).current;
  const feedbackOpacity = useRef(new Animated.Value(0)).current;
  const lastTapRef = useRef<{ side: 'left' | 'right' | null; time: number }>({ side: null, time: 0 });
  const [seekFeedback, setSeekFeedback] = useState<'left' | 'right' | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_USER_PREFERENCES);
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [trackVersion, setTrackVersion] = useState(0);
  const autoplayAppliedRef = useRef(false);


  const [sliderValue, setSliderValue] = useState(0);
  const [sliderWidth, setSliderWidth] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [previewTime, setPreviewTime] = useState(0);
  const thumbScale = useRef(new Animated.Value(1)).current;
  const isSeeking = useRef(false);
  const seekStartPosition = useRef(0);


  const castClient = useSafeRemoteMediaClient();
  const castSession = useSafeCastSession();
  const [isCasting, setIsCasting] = useState(false);
  const castSentRef = useRef(false);

  useEffect(() => {
    const loadPreferences = async () => {
      const storedPreferences = await getUserPreferences();
      setPreferences(storedPreferences);
      setPreferencesReady(true);
    };

    void loadPreferences();
  }, []);


  useEffect(() => {
    if (isExpoGo || !preferencesReady) return;

    if (Platform.OS === 'android' && Platform.Version >= 31) {
      const requestCastPermissions = async () => {
        try {
          const permissions = [
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
          ];


          if (Platform.OS === 'android' && (Platform.Version as number) >= 33) {

            permissions.push(PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES);
          }

          await PermissionsAndroid.requestMultiple(permissions);


          try {
            const CastLib = require('react-native-google-cast');
            const gcast = CastLib.default || CastLib;
            if (gcast && gcast.getDiscoveryManager) {
              const dm = await gcast.getDiscoveryManager();
              dm.startDiscovery();
            }
          } catch (e) {
            console.warn('[Cast] Discovery start error:', e);
          }
        } catch (err) {
          console.warn('Casting permissions error:', err);
        }
      };
      requestCastPermissions();
    }
  }, []);


  useEffect(() => {
    if (isExpoGo) return;

    if (castClient && videoUrl && !castSentRef.current) {
      castSentRef.current = true;
      setIsCasting(true);


      player.pause();

      castClient.loadMedia({
        autoplay: preferences.autoplay,
        mediaInfo: {
          contentUrl: videoUrl,
          contentType: 'video/mp4',
          metadata: {
            title: title || 'Anime',
            type: 'movie',
          },
        },
        startTime: position > 0 ? position : 0,
      }).catch((err: any) => {
        console.warn('Failed to load media on Cast device:', err);
        setIsCasting(false);
        castSentRef.current = false;

        if (preferences.autoplay) {
          player.play();
        }
      });
    }


    if (!castClient && isCasting) {
      setIsCasting(false);
      castSentRef.current = false;
      if (preferences.autoplay) {
        player.play();
      }
    }
  }, [castClient, isCasting, player, preferences.autoplay, preferencesReady, title, videoUrl]);


  const resetAutoHideTimer = useCallback(() => {
    if (controlsTimeout.current) {
      clearTimeout(controlsTimeout.current);
      controlsTimeout.current = null;
    }
    if (showSettings) {
      return;
    }
    if (showControls && isPlaying && !isSeeking.current && videoLoaded) {
      controlsTimeout.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [showControls, isPlaying, videoLoaded, showSettings]);

  useEffect(() => {
    return () => {
      if (controlsTimeout.current) {
        clearTimeout(controlsTimeout.current);
        controlsTimeout.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (showSettings) {
      setShowControls(true);
    }
  }, [showSettings]);

  const handleToggleSettings = useCallback(() => {
    if (controlsTimeout.current) {
      clearTimeout(controlsTimeout.current);
      controlsTimeout.current = null;
    }
    setShowControls(true);
    setShowSettings(prev => !prev);
  }, []);


  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);


  useEffect(() => {
    if (player && videoLoaded) {
      player.muted = false;
      player.volume = 1.0;
    }
  }, [player, videoLoaded]);

  useEffect(() => {
    const playingListener = player.addListener('playingChange', (e) => setIsPlaying(e.isPlaying));
    const statusListener = player.addListener('statusChange', (e) => setIsBuffering(e.status === 'loading'));
    const sourceListener = player.addListener('sourceLoad', (e) => {
      if (e.duration) {
        autoplayAppliedRef.current = false;
        setDuration(e.duration);
        setVideoLoaded(true);
        setShowControls(true);
        NavigationBar.setVisibilityAsync('hidden');
      }
    });
    const audioTracksListener = player.addListener('availableAudioTracksChange', () => {
      setTrackVersion(version => version + 1);
    });
    const subtitleTracksListener = player.addListener('availableSubtitleTracksChange', () => {
      setTrackVersion(version => version + 1);
    });

    return () => {
      playingListener.remove();
      statusListener.remove();
      sourceListener.remove();
      audioTracksListener.remove();
      subtitleTracksListener.remove();
    };
  }, [player]);

  useEffect(() => {
    if (!videoLoaded || !preferencesReady) {
      return;
    }

    if (!autoplayAppliedRef.current) {
      autoplayAppliedRef.current = true;
      if (preferences.autoplay && !isCasting) {
        player.play();
      }
    }

    const italianTrack = (track: { language: string; label: string }) => {
      const language = track.language.toLowerCase();
      const label = track.label.toLowerCase();
      return language === 'it' || language.startsWith('it-') || label.includes('ital');
    };

    if (preferences.audioPreference === 'dubbed') {
      const italianAudio = player.availableAudioTracks.find(italianTrack);
      if (italianAudio) {
        player.audioTrack = italianAudio;
      }
      return;
    }

    const italianSubtitles = player.availableSubtitleTracks.find(italianTrack);
    if (italianSubtitles) {
      player.subtitleTrack = italianSubtitles;
    }
  }, [isCasting, player, preferences, preferencesReady, trackVersion, videoLoaded]);

  useEffect(() => {
    const endListener = player.addListener('playToEnd', () => {
      const currentEpisode = Number(episodeNumber);
      const configuredNextEpisode = Number(nextEpisodeNumber);
      const nextEpisode = Number.isFinite(configuredNextEpisode) ? configuredNextEpisode : currentEpisode + 1;
      if (
        !preferences.playNext ||
        !animeUrl ||
        !Number.isFinite(currentEpisode) ||
        (hasNextEpisode !== 'true' && !Number.isFinite(configuredNextEpisode)) ||
        !Number.isFinite(nextEpisode)
      ) {
        return;
      }

      router.replace({
        pathname: '/anime',
        params: {
          url: animeUrl,
          autoplayEpisode: String(nextEpisode),
        },
      });
    });

    return () => {
      endListener.remove();
    };
  }, [animeUrl, episodeNumber, hasNextEpisode, nextEpisodeNumber, player, preferences.playNext, router]);


  useEffect(() => {
    const timeListener = player.addListener('timeUpdate', (e) => {
      setPosition(e.currentTime);

      if (!isSeeking.current) {
        setSliderValue(e.currentTime);
      }
    });
    return () => {
      timeListener.remove();
    };
  }, [player]);



  useEffect(() => {
    Animated.timing(controlsOpacity, {
      toValue: showControls ? 1 : 0,
      duration: preferences.reduceMotion ? 0 : 200,
      useNativeDriver: true,
    }).start();
  }, [preferences.reduceMotion, showControls]);


  useEffect(() => {
    if (controlsTimeout.current) {
      clearTimeout(controlsTimeout.current);
      controlsTimeout.current = null;
    }
    if (showSettings) {
      return;
    }
    if (showControls && isPlaying && !isSeeking.current && videoLoaded) {
      controlsTimeout.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [showControls, isPlaying, videoLoaded, showSettings]);


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
    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    resetAutoHideTimer();
  };

  const handleRewind = () => {
    const newTime = Math.max(0, player.currentTime - 10);
    player.currentTime = newTime;
    setPosition(newTime);
    setSliderValue(newTime);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    resetAutoHideTimer();
  };

  const handleForward = () => {
    const newTime = Math.min(duration, player.currentTime + 10);
    player.currentTime = newTime;
    setPosition(newTime);
    setSliderValue(newTime);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    resetAutoHideTimer();
  };

  const toggleControls = () => {
    setShowControls(prev => {
      const next = !prev;
      if (next) {
        resetAutoHideTimer();
      } else if (controlsTimeout.current) {
        clearTimeout(controlsTimeout.current);
        controlsTimeout.current = null;
      }
      return next;
    });
  };

  const showSeekFeedback = useCallback((side: 'left' | 'right') => {
    setSeekFeedback(side);
    feedbackOpacity.stopAnimation();
    feedbackOpacity.setValue(1);
    Animated.timing(feedbackOpacity, {
      toValue: 0,
      duration: 650,
      useNativeDriver: true,
    }).start(() => setSeekFeedback(null));
  }, [feedbackOpacity]);

  const handleTapZonePress = useCallback((side: 'left' | 'right') => {
    const now = Date.now();
    if (showSettings) {
      setShowSettings(false);
      setShowControls(true);
      return;
    }

    const isDoubleTap = lastTapRef.current.side === side && now - lastTapRef.current.time < 300;
    lastTapRef.current = { side, time: now };

    if (isDoubleTap) {
      if (side === 'left') {
        handleRewind();
      } else {
        handleForward();
      }
      showSeekFeedback(side);
      setShowControls(true);
      resetAutoHideTimer();
      return;
    }

    toggleControls();
  }, [handleForward, handleRewind, resetAutoHideTimer, showSeekFeedback, showSettings, toggleControls]);


  const snapInterval = duration > 300 ? 10 : 5;

  const handleValueChange = (value: number) => {
    if (!isSeeking.current) {
      isSeeking.current = true;
      seekStartPosition.current = position;
    }
    setSliderValue(value);
    setPreviewTime(value);
    if (!showPreview) setShowPreview(true);
    resetAutoHideTimer();
  };

  const handleSlidingStart = () => {
    isSeeking.current = true;
    setShowPreview(true);
    Animated.spring(thumbScale, { toValue: 1.2, useNativeDriver: true }).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    resetAutoHideTimer();
  };

  const handleSlidingComplete = (value: number) => {
    isSeeking.current = false;
    setShowPreview(false);
    player.currentTime = value;
    setPosition(value);
    Animated.spring(thumbScale, { toValue: 1, useNativeDriver: true }).start();
    resetAutoHideTimer();
  };

  const handleToggleFullscreen = () => {
    if (isFullscreen) {
      videoViewRef.current?.exitFullscreen();
    } else {
      videoViewRef.current?.enterFullscreen();
    }
  };

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const tagName = (event.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tagName === 'input' || tagName === 'textarea') return;

      switch (event.key) {
        case ' ':
        case 'k':
        case 'K':
          event.preventDefault();
          handlePlayPause();
          setShowControls(true);
          break;
        case 'ArrowLeft':
        case 'j':
        case 'J':
          event.preventDefault();
          handleRewind();
          showSeekFeedback('left');
          setShowControls(true);
          break;
        case 'ArrowRight':
        case 'l':
        case 'L':
          event.preventDefault();
          handleForward();
          showSeekFeedback('right');
          setShowControls(true);
          break;
        case 'f':
        case 'F':
          event.preventDefault();
          handleToggleFullscreen();
          setShowControls(true);
          break;
        case 'm':
        case 'M':
          event.preventDefault();
          player.muted = !player.muted;
          setShowControls(true);
          break;
      }
      resetAutoHideTimer();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleForward, handlePlayPause, handleRewind, handleToggleFullscreen, player, resetAutoHideTimer, showSeekFeedback]);



  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <VideoView
        ref={videoViewRef}
        style={styles.video}
        player={player}
        nativeControls={false}
        contentFit="contain"
        onFullscreenEnter={() => {
          setIsFullscreen(true);
        }}
        onFullscreenExit={() => {
          setIsFullscreen(false);

          ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).then(() => {
            router.back();
          });
        }}
      />
      <View style={styles.tapZones} pointerEvents="box-none">
        <Pressable style={styles.tapZone} onPress={() => handleTapZonePress('left')} />
        <Pressable style={styles.tapZone} onPress={() => handleTapZonePress('right')} />
      </View>
      {seekFeedback && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.seekFeedback,
            seekFeedback === 'left' ? styles.seekFeedbackLeft : styles.seekFeedbackRight,
            { opacity: feedbackOpacity },
          ]}
        >
          <View style={styles.seekFeedbackCircle}>
            <MaterialFeedbackIcon side={seekFeedback} />
            <Text style={styles.seekFeedbackText}>10 sec</Text>
          </View>
        </Animated.View>
      )}
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

        showSettings={showSettings}
        toggleSettings={handleToggleSettings}
        playbackSpeed={playbackSpeed}
        setPlaybackSpeed={setPlaybackSpeed}

        isCasting={isCasting}
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
  tapZones: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
  },
  tapZone: {
    flex: 1,
  },
  seekFeedback: {
    position: 'absolute',
    top: '40%',
  },
  seekFeedbackLeft: {
    left: 72,
  },
  seekFeedbackRight: {
    right: 72,
  },
  seekFeedbackCircle: {
    width: 118,
    height: 118,
    borderRadius: 59,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.58)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  seekFeedbackIcon: {
    color: '#ffffff',
    fontSize: 42,
    lineHeight: 42,
    fontWeight: '800',
  },
  seekFeedbackText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
});

const MaterialFeedbackIcon = ({ side }: { side: 'left' | 'right' }) => (
  <Text style={styles.seekFeedbackIcon}>{side === 'left' ? '<<' : '>>'}</Text>
);
