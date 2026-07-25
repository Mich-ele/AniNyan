import React, { createContext, ReactNode, useContext, useRef, useState } from 'react';
import { GestureResponderEvent, Image, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Anime } from '../types/anime';
import { theme } from '../app/styles/theme';

const ACTION_SIZE = 68;

type CardLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type ActionBounds = {
  x: number;
  y: number;
  size: number;
};

type WatchlistActionRequest = {
  anime: Anime;
  layout: CardLayout;
  actionBounds: ActionBounds;
  isWatchlisted: boolean;
  onActivate: () => void;
};

type WatchlistActionContextValue = {
  open: (request: WatchlistActionRequest) => void;
  updateDrag: (pageX: number, pageY: number) => void;
  completeDrag: () => void;
  close: () => void;
};

const WatchlistActionContext = createContext<WatchlistActionContextValue | null>(null);

export const useWatchlistActionOverlay = (): WatchlistActionContextValue => {
  const context = useContext(WatchlistActionContext);
  if (!context) {
    throw new Error('WatchlistActionOverlayProvider is required.');
  }
  return context;
};

export function WatchlistActionOverlayProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<WatchlistActionRequest | null>(null);
  const [isOverAction, setIsOverAction] = useState(false);
  const requestRef = useRef<WatchlistActionRequest | null>(null);
  const isOverActionRef = useRef(false);

  const close = () => {
    requestRef.current = null;
    isOverActionRef.current = false;
    setRequest(null);
    setIsOverAction(false);
  };

  const open = (nextRequest: WatchlistActionRequest) => {
    requestRef.current = nextRequest;
    isOverActionRef.current = false;
    setRequest(nextRequest);
    setIsOverAction(false);
  };

  const updateDrag = (pageX: number, pageY: number) => {
    const bounds = requestRef.current?.actionBounds;
    if (!bounds) {
      return;
    }

    const nextIsOverAction = pageX >= bounds.x && pageX <= bounds.x + bounds.size && pageY >= bounds.y && pageY <= bounds.y + bounds.size;
    if (nextIsOverAction !== isOverActionRef.current) {
      isOverActionRef.current = nextIsOverAction;
      setIsOverAction(nextIsOverAction);
      if (nextIsOverAction) {
        void Haptics.selectionAsync();
      }
    }
  };

  const completeDrag = () => {
    const activeRequest = requestRef.current;
    const shouldActivate = isOverActionRef.current;
    close();
    if (activeRequest && shouldActivate) {
      activeRequest.onActivate();
    }
  };

  const handleTouchEnd = (event: GestureResponderEvent) => {
    if (!requestRef.current) {
      return;
    }

    updateDrag(event.nativeEvent.pageX, event.nativeEvent.pageY);
    completeDrag();
  };

  const handleOverlayPress = (event: GestureResponderEvent) => {
    const activeRequest = requestRef.current;
    if (!activeRequest) {
      return;
    }

    const { pageX, pageY } = event.nativeEvent;
    const { actionBounds, layout } = activeRequest;
    const isOnAction = pageX >= actionBounds.x && pageX <= actionBounds.x + actionBounds.size && pageY >= actionBounds.y && pageY <= actionBounds.y + actionBounds.size;
    const isOnCard = pageX >= layout.x && pageX <= layout.x + layout.width && pageY >= layout.y && pageY <= layout.y + layout.height;

    if (isOnAction) {
      updateDrag(pageX, pageY);
      completeDrag();
      return;
    }

    if (!isOnCard) {
      close();
    }
  };

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponderCapture: () => requestRef.current !== null,
    onPanResponderMove: event => {
      updateDrag(event.nativeEvent.pageX, event.nativeEvent.pageY);
    },
    onPanResponderRelease: handleTouchEnd,
    onPanResponderTerminate: close,
    onPanResponderTerminationRequest: () => false,
  })).current;

  return (
    <WatchlistActionContext.Provider value={{ open, updateDrag, completeDrag, close }}>
      <View style={styles.container} onTouchEndCapture={handleTouchEnd} {...panResponder.panHandlers}>
        {children}
        {request ? (
          <Animated.View pointerEvents="box-none" entering={FadeIn.duration(100)} exiting={FadeOut.duration(140)} style={styles.overlay}>
            <Pressable onPress={handleOverlayPress} style={styles.dismissLayer}>
              <Animated.View entering={FadeIn.duration(130)} style={styles.backdrop} />
            </Pressable>
            <Animated.View
              pointerEvents="none"
              entering={ZoomIn.duration(180)}
              style={[styles.preview, { left: request.layout.x, top: request.layout.y, width: request.layout.width, height: request.layout.height }]}
            >
              <Image source={{ uri: request.anime.image }} style={styles.previewImage} resizeMode="cover" />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.78)']}
                locations={[0.48, 1]}
                style={StyleSheet.absoluteFill}
              />
              <Text style={styles.previewTitle} numberOfLines={2}>{request.anime.title}</Text>
            </Animated.View>
            <Animated.View
              pointerEvents="none"
              entering={ZoomIn.delay(80).duration(160)}
              style={[styles.action, { left: request.actionBounds.x, top: request.actionBounds.y }, isOverAction && styles.actionActive]}
            >
              <Ionicons name={request.isWatchlisted ? 'trash-outline' : 'bookmark'} size={25} color={isOverAction ? '#000000' : '#ffffff'} />
              <Text style={[styles.actionText, isOverAction && styles.actionTextActive]}>{request.isWatchlisted ? 'Rimuovi' : 'Salva'}</Text>
            </Animated.View>
          </Animated.View>
        ) : null}
      </View>
    </WatchlistActionContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    elevation: 1000,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  dismissLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  preview: {
    position: 'absolute',
    overflow: 'hidden',
    borderRadius: 6,
    backgroundColor: theme.colorPalette.primary.backgroundSecondary,
    transform: [{ scale: 1.045 }, { rotate: '-2.2deg' }],
    elevation: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.48,
    shadowRadius: 18,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewTitle: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    color: '#ffffff',
    fontFamily: theme.typography.fontFamily.primaryBold,
    fontSize: 15,
    lineHeight: 19,
  },
  action: {
    position: 'absolute',
    width: ACTION_SIZE,
    height: ACTION_SIZE,
    borderRadius: ACTION_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16,16,16,0.98)',
    elevation: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.48,
    shadowRadius: 12,
  },
  actionActive: {
    backgroundColor: theme.colorPalette.accent.primary,
  },
  actionText: {
    color: '#ffffff',
    fontFamily: theme.typography.fontFamily.primaryBold,
    fontSize: 10,
    marginTop: 3,
  },
  actionTextActive: {
    color: '#000000',
  },
});
