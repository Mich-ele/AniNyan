import { Link, Stack } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FileQuestion } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import theme, { px, fw } from './styles/theme';

export default function NotFoundScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <Animated.View entering={FadeInDown.delay(200)} style={styles.content}>
        <FileQuestion size={48} color={theme.colorPalette.accent.primary} />
        <Text style={styles.title}>Oops!</Text>
        <Text style={styles.subtitle}>This screen does not exist.</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Go to home screen</Text>
        </Link>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colorPalette.primary.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    padding: px(theme.spacing.lg),
  },
  title: {
    fontSize: px(theme.typography.sizes.title),
    fontWeight: fw(theme.typography.weights.bold),
    color: theme.colorPalette.text.primary,
    marginTop: px(theme.spacing.md),
    fontFamily: theme.typography.fontFamily.primaryBold,
  },
  subtitle: {
    fontSize: px(theme.typography.sizes.body),
    color: theme.colorPalette.text.secondary,
    marginTop: px(theme.spacing.sm),
    fontFamily: theme.typography.fontFamily.primary,
  },
  link: {
    marginTop: px(theme.spacing.xl),
    paddingVertical: px(theme.spacing.md),
    paddingHorizontal: px(theme.spacing.lg),
    backgroundColor: theme.colorPalette.accent.primary,
    borderRadius: px(theme.borderRadius.round),
  },
  linkText: {
    color: theme.colorPalette.text.primary,
    fontWeight: fw(theme.typography.weights.medium),
    fontFamily: theme.typography.fontFamily.primary,
  },
});
