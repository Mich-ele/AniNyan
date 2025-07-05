import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import theme from './styles/theme';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

import { Animated } from 'react-native';
import { useRef, useState } from 'react';

export default function RootLayout() {
  const [loaded, error] = useFonts({
    'Raleway-Black': require('../assets/font/Raleway-Black.ttf'),
    'Raleway-BlackItalic': require('../assets/font/Raleway-BlackItalic.ttf'),
    'Raleway-Bold': require('../assets/font/Raleway-Bold.ttf'),
    'Raleway-BoldItalic': require('../assets/font/Raleway-BoldItalic.ttf'),
    'Raleway-ExtraBold': require('../assets/font/Raleway-ExtraBold.ttf'),
    'Raleway-ExtraBoldItalic': require('../assets/font/Raleway-ExtraBoldItalic.ttf'),
    'Raleway-ExtraLight': require('../assets/font/Raleway-ExtraLight.ttf'),
    'Raleway-ExtraLightItalic': require('../assets/font/Raleway-ExtraLightItalic.ttf'),
    'Raleway-Italic': require('../assets/font/Raleway-Italic.ttf'),
    'Raleway-Light': require('../assets/font/Raleway-Light.ttf'),
    'Raleway-LightItalic': require('../assets/font/Raleway-LightItalic.ttf'),
    'Raleway-Medium': require('../assets/font/Raleway-Medium.ttf'),
    'Raleway-MediumItalic': require('../assets/font/Raleway-MediumItalic.ttf'),
    'Raleway-Regular': require('../assets/font/Raleway-Regular.ttf'),
    'Raleway-SemiBold': require('../assets/font/Raleway-SemiBold.ttf'),
    'Raleway-SemiBoldItalic': require('../assets/font/Raleway-SemiBoldItalic.ttf'),
    'Raleway-Thin': require('../assets/font/Raleway-Thin.ttf'),
    'Raleway-ThinItalic': require('../assets/font/Raleway-ThinItalic.ttf'),
  });
  const [animationDone, setAnimationDone] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        setAnimationDone(true);
        SplashScreen.hideAsync();
      });
    }
  }, [loaded]);

  if (!loaded) {
    // Black screen until fonts are loaded
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