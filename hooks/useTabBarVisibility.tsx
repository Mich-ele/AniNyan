import { useFocusEffect } from 'expo-router';
import React, {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

type TabBarVisibilityContextValue = {
  isTabBarVisible: boolean;
  setTabBarVisible: (visible: boolean) => void;
};

const TabBarVisibilityContext = createContext<TabBarVisibilityContextValue | null>(null);

const TOP_REVEAL_OFFSET = 12;
const HIDE_DISTANCE = 32;
const SHOW_DISTANCE = 18;

export function TabBarVisibilityProvider({ children }: PropsWithChildren) {
  const [isTabBarVisible, setIsTabBarVisible] = useState(true);

  const setTabBarVisible = useCallback((visible: boolean) => {
    setIsTabBarVisible(current => (current === visible ? current : visible));
  }, []);

  const value = useMemo(
    () => ({ isTabBarVisible, setTabBarVisible }),
    [isTabBarVisible, setTabBarVisible],
  );

  return (
    <TabBarVisibilityContext.Provider value={value}>
      {children}
    </TabBarVisibilityContext.Provider>
  );
}

export function useTabBarVisibility() {
  const context = useContext(TabBarVisibilityContext);

  if (!context) {
    throw new Error('useTabBarVisibility must be used inside TabBarVisibilityProvider');
  }

  return context;
}

export function useHideTabBarOnScroll() {
  const { setTabBarVisible } = useTabBarVisibility();
  const lastOffset = useRef(0);
  const accumulatedDistance = useRef(0);
  const lastDirection = useRef<1 | -1 | 0>(0);

  const resetTracking = useCallback(() => {
    lastOffset.current = 0;
    accumulatedDistance.current = 0;
    lastDirection.current = 0;
  }, []);

  useFocusEffect(
    useCallback(() => {
      resetTracking();
      setTabBarVisible(true);

      return resetTracking;
    }, [resetTracking, setTabBarVisible]),
  );

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offset = Math.max(0, event.nativeEvent.contentOffset.y);
      const delta = offset - lastOffset.current;
      lastOffset.current = offset;

      if (offset <= TOP_REVEAL_OFFSET) {
        accumulatedDistance.current = 0;
        lastDirection.current = 0;
        setTabBarVisible(true);
        return;
      }

      if (Math.abs(delta) < 1) return;

      const direction: 1 | -1 = delta > 0 ? 1 : -1;
      if (direction !== lastDirection.current) {
        accumulatedDistance.current = 0;
        lastDirection.current = direction;
      }

      accumulatedDistance.current += Math.abs(delta);

      if (direction === 1 && accumulatedDistance.current >= HIDE_DISTANCE) {
        setTabBarVisible(false);
        accumulatedDistance.current = 0;
      } else if (direction === -1 && accumulatedDistance.current >= SHOW_DISTANCE) {
        setTabBarVisible(true);
        accumulatedDistance.current = 0;
      }
    },
    [setTabBarVisible],
  );

  return { onScroll };
}