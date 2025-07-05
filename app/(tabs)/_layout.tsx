import { Tabs } from 'expo-router';
import { Home, Search, Heart } from 'lucide-react-native';
import { View, Animated, Pressable, PressableProps, GestureResponderEvent } from 'react-native';
import { useEffect, useRef, ElementType, ReactNode } from 'react';
import theme, { px, fw } from '../styles/theme';

// Ultra-fluid animated tab icon component with click pulse
const FluidTabIcon = ({ IconComponent, color, focused, size = 24 }: { IconComponent: ElementType; color: string; focused: boolean; size?: number }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(focused ? 1 : 0.6)).current;
  const rippleScale = useRef(new Animated.Value(0)).current;
  const rippleOpacity = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  
  // New pulse animation refs
  const pulseScale = useRef(new Animated.Value(1)).current;
  const clickPulseScale = useRef(new Animated.Value(0)).current;
  const clickPulseOpacity = useRef(new Animated.Value(0)).current;

  // Trigger click pulse effect when focused changes (tab is pressed)
  useEffect(() => {
    if (focused) {
      // Trigger pulse effect when becoming active
      clickPulseScale.setValue(0);
      clickPulseOpacity.setValue(0.6);

      // Create expanding pulse effect
      Animated.parallel([
        Animated.timing(clickPulseScale, {
          toValue: 2,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(clickPulseOpacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();

      // Icon pulse feedback
      Animated.sequence([
        Animated.timing(pulseScale, {
          toValue: 1.3,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(pulseScale, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [focused]);

  useEffect(() => {
    if (focused) {
      // Multi-layered entrance animation
      Animated.parallel([
        // Scale with overshoot
        Animated.spring(scaleAnim, {
          toValue: 1.15,
          useNativeDriver: true,
          tension: 200,
          friction: 6,
          overshootClamping: false,
        }),
        // Smooth upward float
        Animated.spring(translateYAnim, {
          toValue: -3,
          useNativeDriver: true,
          tension: 180,
          friction: 8,
        }),
        // Fade in smoothly
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        // Ripple effect
        Animated.sequence([
          Animated.timing(rippleOpacity, {
            toValue: 0.3,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.parallel([
            Animated.timing(rippleScale, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(rippleOpacity, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ]),
        ]),
        // Subtle rotation for dynamic feel
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();

      // Continuous glow pulse
      const glowLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.3,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );
      glowLoop.start();

      return () => glowLoop.stop();
    } else {
      // Smooth exit animations
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 150,
          friction: 10,
        }),
        Animated.spring(translateYAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 150,
          friction: 10,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.6,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Reset ripple and pulse
      rippleScale.setValue(0);
      rippleOpacity.setValue(0);
      glowAnim.setValue(0);
      pulseScale.setValue(1);
    }
  }, [focused]);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '5deg'],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0],
  });

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', height: 50 }}>
      {/* Click pulse effect - outer ring */}
      <Animated.View
        style={{
          position: 'absolute',
          width: 60,
          height: 60,
          borderRadius: 30,
          borderWidth: 2,
          borderColor: color,
          opacity: clickPulseOpacity,
          transform: [{ scale: clickPulseScale }],
        }}
      />

      {/* Ripple effect */}
      <Animated.View
        style={{
          position: 'absolute',
          width: 45,
          height: 45,
          borderRadius: 22.5,
          backgroundColor: theme.colorPalette.text.primary,
          opacity: rippleOpacity,
          transform: [{ scale: rippleScale }],
        }}
      />

      {/* Glow effect */}
      <Animated.View
        style={{
          position: 'absolute',
          width: 35,
          height: 35,
          borderRadius: 17.5,
          backgroundColor: theme.colorPalette.text.primary,
          opacity: glowOpacity,
          transform: [{ scale: 1.2 }],
        }}
      />

      {/* Active indicator line */}
      {focused && (
        <Animated.View
          style={{
            position: 'absolute',
            top: -5,
            width: 20,
            height: 2,
            borderRadius: 1,
            backgroundColor: theme.colorPalette.text.primary,
            opacity: opacityAnim,
          }}
        />
      )}

      {/* Main icon with all animations */}
      <Animated.View
        style={{
          transform: [
            { scale: Animated.multiply(scaleAnim, pulseScale) },
            { translateY: translateYAnim },
            { rotate: rotation },
          ],
          opacity: opacityAnim,
        }}
      >
        <IconComponent 
          size={size} 
          color={color} 
          fill={'none'}
          strokeWidth={focused ? 2.5 : 2}
        />
      </Animated.View>
    </View>
  );
};

// Custom pressable tab button with enhanced haptic feedback
const AnimatedTabButton = (props: Omit<PressableProps, 'children'> & { children: ReactNode }) => {
  const { children, style, onPress, onPressIn, onPressOut, ...rest } = props;
  const pressScale = useRef(new Animated.Value(1)).current;
  const pressOpacity = useRef(new Animated.Value(1)).current;

  const handlePressIn = (e: GestureResponderEvent) => {
    Animated.parallel([
      Animated.spring(pressScale, { toValue: 0.95, useNativeDriver: true, tension: 300, friction: 10 }),
      Animated.timing(pressOpacity, { toValue: 0.8, duration: 100, useNativeDriver: true }),
    ]).start();
    onPressIn?.(e);
  };

  const handlePressOut = (e: GestureResponderEvent) => {
    Animated.parallel([
      Animated.spring(pressScale, { toValue: 1, useNativeDriver: true, tension: 300, friction: 10 }),
      Animated.timing(pressOpacity, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    onPressOut?.(e);
  };

  return (
    <Pressable
      {...rest}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={(state) => [
        typeof style === 'function' ? style(state) : style,
        { flex: 1, alignItems: 'center', justifyContent: 'center' }
      ]}
    >
      <Animated.View
        style={{
          transform: [{ scale: pressScale }],
          opacity: pressOpacity,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
};

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,

        tabBarLabelStyle: {
          fontFamily: 'Raleway-SemiBold',
          fontSize: 12,
          marginTop: -5,
          marginBottom: 5,
        },
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: theme.colorPalette.primary.background,
          borderTopWidth: 0,
          height: 90,
          paddingBottom: 20,
          paddingTop: 10,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: theme.colorPalette.text.primary,
        tabBarInactiveTintColor: theme.colorPalette.interactive.buttonInactive,
        tabBarItemStyle: { 
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        },
        tabBarIconStyle: {
          marginTop: 0,
        },
        tabBarButton: (props) => <AnimatedTabButton {...props} />,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <FluidTabIcon
              IconComponent={Home}
              color={color}
              focused={focused}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="browse"
        options={{
          title: 'Cerca',
          tabBarIcon: ({ color, focused }) => (
            <FluidTabIcon
              IconComponent={Search}
              color={color}
              focused={focused}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="watchlist"
        options={{
          title: 'Watchlist',
          tabBarIcon: ({ color, focused }) => (
            <FluidTabIcon
              IconComponent={Heart}
              color={color}
              focused={focused}
              size={24}
            />
          ),
        }}
      />
    </Tabs>
  );
}