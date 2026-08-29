import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Animated, Easing, Pressable, Text, Platform, PermissionsAndroid } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import type { CastSession, MediaStatus } from 'react-native-google-cast';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as Haptics from 'expo-haptics';
import * as NavigationBar from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';
import {
  endSafeCastSession,
  isExpoGo,
  startSafeCastDiscovery,
  useSafeCastSession,
  useSafeCastState,
} from '../../components/SafeCastButton';

import { VideoPlayerControls } from '../../components/VideoPlayerControls';
import { addWatchedEpisode } from '../../services/cacheService';
import { fetchAnimeDetailsWithScraper, fetchEpisodeVideoUrl } from '../../services/scraperManager';
import { DEFAULT_USER_PREFERENCES, UserPreferences, getUserPreferences } from '../../services/userPreferences';
import type { AnimeDetail } from '../../types/anime';
import { getAnimeEpisodeNumbers, getEpisodeByNumber } from '../../utils/episodeUtils';


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
  const initialEpisodeNumber = Number(episodeNumber);
  const initialNextEpisodeNumber = Number(nextEpisodeNumber);
  const [activeVideoUrl, setActiveVideoUrl] = useState(videoUrl);
  const [activeEpisodeNumber, setActiveEpisodeNumber] = useState(initialEpisodeNumber);
  const [activeNextEpisodeNumber, setActiveNextEpisodeNumber] = useState<number | null>(
    hasNextEpisode === 'true' && Number.isFinite(initialNextEpisodeNumber) ? initialNextEpisodeNumber : null,
  );
  const [isLoadingNextEpisode, setIsLoadingNextEpisode] = useState(false);
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
  const activeVideoUrlRef = useRef(activeVideoUrl);
  const loadedSourceRef = useRef<string | null>(null);
  const localAutoplaySourceRef = useRef<string | null>(null);
  const castTargetRef = useRef<{ session: CastSession; videoUrl: string } | null>(null);
  const castRequestRef = useRef(0);
  const nextEpisodeRequestedRef = useRef(false);
  const animeDetailsRef = useRef<AnimeDetail | null>(null);
  const animeDetailsRequestRef = useRef<Promise<AnimeDetail | null> | null>(null);
  const watchedEpisodeWriteRef = useRef<Promise<void>>(Promise.resolve());
  const [sliderValue, setSliderValue] = useState(0);
  const [sliderWidth, setSliderWidth] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [previewTime, setPreviewTime] = useState(0);
  const thumbScale = useRef(new Animated.Value(1)).current;
  const isSeeking = useRef(false);
  const seekStartPosition = useRef(0);
  const castSession = useSafeCastSession();
  const castState = useSafeCastState();
  const isCasting = castState === 'connected' && Boolean(castSession);

  useEffect(() => {
    const loadPreferences = async () => {
      const storedPreferences = await getUserPreferences();
      setPreferences(storedPreferences);
      setPreferencesReady(true);
    };

    void loadPreferences();
  }, []);

  useEffect(() => {
    if (isExpoGo) return;

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
            await startSafeCastDiscovery();
          } catch {
            return;
          }
        } catch {
          return;
        }
      };
      void requestCastPermissions();
    }
  }, []);

  useEffect(() => {
    if (!videoLoaded || !preferencesReady || loadedSourceRef.current !== activeVideoUrl) return;

    if (!isExpoGo && (castState === undefined || castState === 'connecting')) {
      localAutoplaySourceRef.current = null;
      if (player.playing) player.pause();
      return;
    }

    if (!isExpoGo && castState === 'connected') {
      localAutoplaySourceRef.current = null;
      if (player.playing) player.pause();
      if (!castSession) return;

      const currentTarget = castTargetRef.current;
      if (currentTarget?.session === castSession && currentTarget?.videoUrl === activeVideoUrl) return;

      const requestId = ++castRequestRef.current;
      const startTime = Math.max(0, player.currentTime || 0);
      const contentType = /\.m3u8(?:$|\?)/i.test(activeVideoUrl) ? 'application/x-mpegURL' : 'video/mp4';
      castTargetRef.current = { session: castSession, videoUrl: activeVideoUrl };

      void castSession.client.loadMedia({
        autoplay: preferences.autoplay,
        mediaInfo: {
          contentUrl: activeVideoUrl,
          contentType,
          metadata: {
            title: title || 'Anime',
            type: 'movie',
          },
        },
        startTime,
      }).catch(async () => {
        if (castRequestRef.current !== requestId) return;
        castTargetRef.current = null;
        try {
          await endSafeCastSession();
        } catch {
          return;
        }
      });
      return;
    }

    castTargetRef.current = null;
    castRequestRef.current += 1;
    if (preferences.autoplay && localAutoplaySourceRef.current !== activeVideoUrl) {
      localAutoplaySourceRef.current = activeVideoUrl;
      player.play();
    }
  }, [activeVideoUrl, castSession, castState, player, preferences.autoplay, preferencesReady, title, videoLoaded]);

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
        loadedSourceRef.current = activeVideoUrlRef.current;
        nextEpisodeRequestedRef.current = false;
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

    if (/\.mp4(?:$|[?#])/i.test(activeVideoUrl)) {
      player.subtitleTrack = null;
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

    if (/\.mp4(?:$|[?#])/i.test(activeVideoUrl)) {
      return;
    }

    const italianSubtitles = player.availableSubtitleTracks.find(italianTrack);
    if (italianSubtitles) {
      player.subtitleTrack = italianSubtitles;
    }
  }, [activeVideoUrl, player, preferences.audioPreference, preferencesReady, trackVersion, videoLoaded]);

  const getAnimeDetails = useCallback(async () => {
    if (animeDetailsRef.current) return animeDetailsRef.current;
    if (animeDetailsRequestRef.current) return animeDetailsRequestRef.current;
    if (!animeUrl) return null;

    const request = fetchAnimeDetailsWithScraper(animeUrl);
    animeDetailsRequestRef.current = request;
    try {
      const details = await request;
      if (details) animeDetailsRef.current = details;
      return details;
    } finally {
      if (animeDetailsRequestRef.current === request) {
        animeDetailsRequestRef.current = null;
      }
    }
  }, [animeUrl]);

  useEffect(() => {
    let active = true;
    void getAnimeDetails().then((anime) => {
      if (!active || !anime || !Number.isFinite(activeEpisodeNumber)) return;
      const episodeNumbers = getAnimeEpisodeNumbers(anime);
      const currentIndex = episodeNumbers.indexOf(activeEpisodeNumber);
      if (currentIndex < 0) return;
      setActiveNextEpisodeNumber(episodeNumbers[currentIndex + 1] ?? null);
    }).catch(() => undefined);

    return () => {
      active = false;
    };
  }, [activeEpisodeNumber, getAnimeDetails]);

  const handleNextEpisode = useCallback(async () => {
    if (nextEpisodeRequestedRef.current || isLoadingNextEpisode) return;
    nextEpisodeRequestedRef.current = true;
    setIsLoadingNextEpisode(true);
    let sourceChanged = false;

    try {
      const anime = await getAnimeDetails();
      if (!anime) return;

      const episodeNumbers = getAnimeEpisodeNumbers(anime);
      const currentIndex = episodeNumbers.indexOf(activeEpisodeNumber);
      const nextEpisode = currentIndex >= 0
        ? episodeNumbers[currentIndex + 1]
        : activeNextEpisodeNumber ?? undefined;
      if (nextEpisode === undefined) return;

      const episode = getEpisodeByNumber(anime, nextEpisode);
      const episodeUrl = episode?.url || (anime.episodeUrl ? `${anime.episodeUrl}${nextEpisode}` : null);
      if (!episodeUrl) return;

      const nextVideoUrl = await fetchEpisodeVideoUrl(episodeUrl);
      if (!nextVideoUrl) return;

      const nextIndex = episodeNumbers.indexOf(nextEpisode);
      const followingEpisode = nextIndex >= 0 ? episodeNumbers[nextIndex + 1] : undefined;
      const previousVideoUrl = activeVideoUrlRef.current;
      const previousSourceLoaded = loadedSourceRef.current;
      const wasPlaying = player.playing;

      player.pause();
      loadedSourceRef.current = null;
      localAutoplaySourceRef.current = null;
      castTargetRef.current = null;
      castRequestRef.current += 1;
      activeVideoUrlRef.current = nextVideoUrl;
      setVideoLoaded(false);
      setIsBuffering(true);
      setDuration(0);
      setPosition(0);
      setSliderValue(0);
      setTrackVersion(0);

      try {
        await player.replaceAsync(nextVideoUrl);
      } catch {
        activeVideoUrlRef.current = previousVideoUrl;
        loadedSourceRef.current = previousSourceLoaded;
        setVideoLoaded(Boolean(previousSourceLoaded));
        setIsBuffering(false);
        if (wasPlaying) player.play();
        return;
      }

      setActiveVideoUrl(nextVideoUrl);
      setActiveEpisodeNumber(nextEpisode);
      setActiveNextEpisodeNumber(followingEpisode ?? null);
      if (!preferences.autoplay || isCasting) player.pause();
      sourceChanged = true;
      watchedEpisodeWriteRef.current = watchedEpisodeWriteRef.current
        .catch(() => undefined)
        .then(() => addWatchedEpisode(anime, nextEpisode));
    } finally {
      if (!sourceChanged) nextEpisodeRequestedRef.current = false;
      setIsLoadingNextEpisode(false);
    }
  }, [activeEpisodeNumber, activeNextEpisodeNumber, getAnimeDetails, isCasting, isLoadingNextEpisode, player, preferences.autoplay]);

  useEffect(() => {
    if (!isCasting || !castSession) return;

    const client = castSession.client;
    const updateMediaStatus = (status: MediaStatus | null) => {
      if (!status) return;
      setIsPlaying(status.playerState === 'playing');
      setIsBuffering(status.playerState === 'loading' || status.playerState === 'buffering');
      if (Number.isFinite(status.streamPosition)) {
        setPosition(status.streamPosition);
        if (!isSeeking.current) setSliderValue(status.streamPosition);
      }
      const streamDuration = status.mediaInfo?.streamDuration;
      if (typeof streamDuration === 'number' && Number.isFinite(streamDuration)) {
        setDuration(streamDuration);
      }
    };
    const statusListener = client.onMediaStatusUpdated(updateMediaStatus);
    const progressListener = client.onMediaProgressUpdated((currentPosition: number, currentDuration: number) => {
      setPosition(currentPosition);
      setDuration(currentDuration);
      if (!isSeeking.current) setSliderValue(currentPosition);
    }, 0.5);

    void client.getMediaStatus().then(updateMediaStatus).catch(() => undefined);

    return () => {
      statusListener.remove();
      progressListener.remove();
    };
  }, [castSession, isCasting]);

  useEffect(() => {
    const endListener = player.addListener('playToEnd', () => {
      if (preferences.playNext) void handleNextEpisode();
    });

    return () => {
      endListener.remove();
    };
  }, [handleNextEpisode, player, preferences.playNext]);


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
      duration: preferences.reduceMotion ? 0 : showControls ? 240 : 180,
      easing: showControls ? Easing.out(Easing.cubic) : Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [controlsOpacity, preferences.reduceMotion, showControls]);


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


  const returnToAnime = useCallback(async () => {
    await watchedEpisodeWriteRef.current.catch(() => undefined);
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    router.back();
  }, [router]);

  const handleBack = () => {
    if (isFullscreen) {
      videoViewRef.current?.exitFullscreen();
    } else {
      void returnToAnime();
    }
  };

  const handlePlayPause = useCallback(() => {
    if (isCasting && castSession) {
      const client = castSession.client;
      void client.getMediaStatus().then((status) => {
        if (status?.playerState === 'playing') return client.pause();
        return client.play();
      }).catch(() => undefined);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      resetAutoHideTimer();
      return;
    }

    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    resetAutoHideTimer();
  }, [castSession, isCasting, player, resetAutoHideTimer]);

  const handleRewind = useCallback(() => {
    const currentTime = isCasting ? position : player.currentTime;
    const newTime = Math.max(0, currentTime - 10);
    if (isCasting && castSession) {
      void castSession.client.seek({ position: newTime }).catch(() => undefined);
    } else {
      player.currentTime = newTime;
    }
    setPosition(newTime);
    setSliderValue(newTime);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    resetAutoHideTimer();
  }, [castSession, isCasting, player, position, resetAutoHideTimer]);

  const handleForward = useCallback(() => {
    const currentTime = isCasting ? position : player.currentTime;
    const newTime = Math.min(duration, currentTime + 10);
    if (isCasting && castSession) {
      void castSession.client.seek({ position: newTime }).catch(() => undefined);
    } else {
      player.currentTime = newTime;
    }
    setPosition(newTime);
    setSliderValue(newTime);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    resetAutoHideTimer();
  }, [castSession, duration, isCasting, player, position, resetAutoHideTimer]);

  const toggleControls = useCallback(() => {
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
  }, [resetAutoHideTimer]);

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
    if (isCasting && castSession) {
      void castSession.client.seek({ position: value }).catch(() => undefined);
    } else {
      player.currentTime = value;
    }
    setPosition(value);
    Animated.spring(thumbScale, { toValue: 1, useNativeDriver: true }).start();
    resetAutoHideTimer();
  };

  const handleToggleFullscreen = useCallback(() => {
    if (isFullscreen) {
      videoViewRef.current?.exitFullscreen();
    } else {
      videoViewRef.current?.enterFullscreen();
    }
  }, [isFullscreen]);

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
          void returnToAnime();
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
        episodeNumber={activeEpisodeNumber}
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
        handleNextEpisode={() => void handleNextEpisode()}
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
        hasNextEpisode={activeNextEpisodeNumber !== null}
        isNextEpisodeLoading={isLoadingNextEpisode}
        reduceMotion={preferences.reduceMotion}
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
