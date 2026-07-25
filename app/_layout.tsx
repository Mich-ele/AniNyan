import { useFonts } from 'expo-font';
import {
  Rubik_300Light,
  Rubik_400Regular,
  Rubik_500Medium,
  Rubik_600SemiBold,
  Rubik_700Bold,
} from '@expo-google-fonts/rubik';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import theme from './styles/theme';


SplashScreen.preventAutoHideAsync();

import { Animated, Text } from 'react-native';
import { useRef, useState } from 'react';

export default function RootLayout() {
  const [loaded, error] = useFonts({

    'Rubik-Light': Rubik_300Light,
    'Rubik-Regular': Rubik_400Regular,
    'Rubik-Medium': Rubik_500Medium,
    'Rubik-SemiBold': Rubik_600SemiBold,
    'Rubik-Bold': Rubik_700Bold,


    'ComicNeue-Light': Rubik_300Light,
    'ComicNeue-Regular': Rubik_400Regular,
    'ComicNeue-Bold': Rubik_700Bold,
    'Inter-Light': Rubik_300Light,
    'Inter-Regular': Rubik_400Regular,
    'Inter-Medium': Rubik_500Medium,
    'Inter-SemiBold': Rubik_600SemiBold,
    'Inter-Bold': Rubik_700Bold,
  });
  const [animationDone, setAnimationDone] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (error) {


      console.warn('Font loading error (non-fatal, using system fonts):', error);
    }
  }, [error]);

  useEffect(() => {
    if (loaded || error) {

      if (loaded && !error) {
        try {
          const RNText: any = Text as any;
          RNText.defaultProps = RNText.defaultProps || {};
          RNText.defaultProps.style = [{ fontFamily: 'Rubik-Regular' }, RNText.defaultProps.style];
        } catch (e) {
          console.warn('Failed to set default font props:', e);
        }
      }
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        setAnimationDone(true);
        SplashScreen.hideAsync().catch(() => { });
      });
    }
  }, [loaded, error]);

  if (!loaded && !error) {

    return <Animated.View style={{ flex: 1, backgroundColor: '#000' }} />;
  }

  return (
    <Animated.View style={{ flex: 1, backgroundColor: '#000', opacity: fadeAnim }}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'fade',
            contentStyle: { backgroundColor: theme.colorPalette.primary.background },
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="anime" />
          <Stack.Screen name="screens/VideoPlayer" />
        </Stack>
      </GestureHandlerRootView>
    </Animated.View>
  );
}