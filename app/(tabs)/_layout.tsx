import { Tabs } from 'expo-router';
import { Home, Search, Bookmark, Settings } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import Constants from 'expo-constants';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { theme } from '../styles/theme';
import {
  TabBarVisibilityProvider,
  useTabBarVisibility,
} from '../../hooks/useTabBarVisibility';
import { WatchlistActionOverlayProvider } from '../../components/WatchlistActionOverlay';

const isExpoGo =
  Constants.appOwnership === 'expo' ||
  Constants.executionEnvironment === 'storeClient';

const TabBackground = () => (
  <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    {isExpoGo ? (
      <View style={styles.fallback} />
    ) : (
      <BlurView
        intensity={42}
        tint="dark"
        experimentalBlurMethod="dimezisBlurView"
        style={StyleSheet.absoluteFill}
      />
    )}
    <View style={styles.overlay} />
  </View>
);

const AnimatedTabBar = ({ state, descriptors, navigation, insets }: BottomTabBarProps) => {
  const { isTabBarVisible } = useTabBarVisibility();
  const visibilityProgress = useSharedValue(1);

  useEffect(() => {
    visibilityProgress.value = withTiming(isTabBarVisible ? 1 : 0, {
      duration: isTabBarVisible ? 180 : 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [isTabBarVisible, visibilityProgress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: visibilityProgress.value,
    transform: [{ translateY: (1 - visibilityProgress.value) * 110 }],
  }));

  return (
    <Animated.View
      pointerEvents={isTabBarVisible ? 'auto' : 'none'}
      style={[
        styles.tabBarPosition,
        { height: 62 + insets.bottom },
        animatedStyle,
      ]}
    >
      <View style={[styles.tabBarSurface, { paddingBottom: insets.bottom }]}>
        <TabBackground />
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const color = focused
            ? theme.colorPalette.accent.primary
            : theme.colorPalette.text.tertiary;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({ type: 'tabLongPress', target: route.key });
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={
                options.tabBarAccessibilityLabel ?? options.title ?? route.name
              }
              testID={options.tabBarButtonTestID}
              onPress={onPress}
              onLongPress={onLongPress}
              style={({ pressed }) => [styles.tabItem, pressed && styles.tabItemPressed]}
            >
              <Animated.View
                key={focused ? 'focused' : 'idle'}
                entering={focused ? ZoomIn.duration(170) : FadeIn.duration(130)}
                exiting={FadeOut.duration(90)}
                style={[styles.iconContainer, focused && styles.iconContainerActive]}
              >
                {options.tabBarIcon?.({ focused, color, size: 23 })}
                {focused && (
                  <Animated.View entering={FadeIn.duration(150)} style={styles.activeIndicator} />
                )}
              </Animated.View>
            </Pressable>
          );
        })}
      </View>
    </Animated.View>
  );
};

export default function TabLayout() {
  return (
    <TabBarVisibilityProvider>
      <WatchlistActionOverlayProvider>
      <Tabs
        tabBar={props => <AnimatedTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          tabBarHideOnKeyboard: true,
          tabBarShowLabel: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarAccessibilityLabel: 'Home',
            tabBarIcon: ({ color, focused }) => (
              <Home size={23} color={color} strokeWidth={focused ? 2.6 : 1.9} />
            ),
          }}
        />
        <Tabs.Screen
          name="browse"
          options={{
            title: 'Scopri',
            tabBarAccessibilityLabel: 'Scopri',
            tabBarIcon: ({ color, focused }) => (
              <Search size={23} color={color} strokeWidth={focused ? 2.6 : 1.9} />
            ),
          }}
        />
        <Tabs.Screen
          name="watchlist"
          options={{
            title: 'La mia lista',
            tabBarAccessibilityLabel: 'La mia lista',
            tabBarIcon: ({ color, focused }) => (
              <Bookmark size={23} color={color} strokeWidth={focused ? 2.6 : 1.9} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Impostazioni',
            tabBarAccessibilityLabel: 'Impostazioni',
            tabBarIcon: ({ color, focused }) => (
              <Settings size={23} color={color} strokeWidth={focused ? 2.6 : 1.9} />
            ),
          }}
        />
      </Tabs>
      </WatchlistActionOverlayProvider>
    </TabBarVisibilityProvider>
  );
}

const styles = StyleSheet.create({
  tabBarPosition: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  tabBarSurface: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    overflow: 'hidden',
  },
  tabItem: {
    flex: 1,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItemPressed: {
    opacity: 0.68,
  },
  iconContainer: {
    width: 48,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerActive: {
    backgroundColor: 'transparent',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 5,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  fallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.98)',
  },
});
