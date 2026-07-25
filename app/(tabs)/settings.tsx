import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { useHideTabBarOnScroll } from '../../hooks/useTabBarVisibility';
import {
  DEFAULT_USER_PREFERENCES,
  UserPreferences,
  getUserPreferences,
  saveUserPreferences,
} from '../../services/userPreferences';

type ToggleSettingProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
};

type ValueSettingProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  value: string;
  onPress: () => void;
};

const ToggleSetting = ({ icon, title, description, value, onValueChange }: ToggleSettingProps) => (
  <View style={styles.settingRow}>
    <View style={styles.settingIcon}>
      <Ionicons name={icon} size={19} color={theme.colorPalette.accent.primary} />
    </View>
    <View style={styles.settingCopy}>
      <Text style={styles.settingTitle}>{title}</Text>
      <Text style={styles.settingDescription}>{description}</Text>
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: theme.colorPalette.interactive.buttonInactive, true: theme.colorPalette.accent.primary }}
      thumbColor={theme.colorPalette.text.primary}
      ios_backgroundColor={theme.colorPalette.interactive.buttonInactive}
    />
  </View>
);

const ValueSetting = ({ icon, title, description, value, onPress }: ValueSettingProps) => (
  <TouchableOpacity style={styles.settingRow} onPress={onPress} activeOpacity={0.82}>
    <View style={styles.settingIcon}>
      <Ionicons name={icon} size={19} color={theme.colorPalette.accent.primary} />
    </View>
    <View style={styles.settingCopy}>
      <Text style={styles.settingTitle}>{title}</Text>
      <Text style={styles.settingDescription}>{description}</Text>
    </View>
    <View style={styles.valueControl}>
      <Text style={styles.valueText}>{value}</Text>
      <Ionicons name="chevron-forward" size={16} color={theme.colorPalette.text.tertiary} />
    </View>
  </TouchableOpacity>
);

const SettingsScreen = () => {
  const { onScroll: onTabBarScroll } = useHideTabBarOnScroll();
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_USER_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPreferences = async () => {
      const storedPreferences = await getUserPreferences();
      setPreferences(storedPreferences);
      setIsLoading(false);
    };

    loadPreferences();
  }, []);

  const updatePreference = <Key extends keyof UserPreferences>(key: Key, value: UserPreferences[Key]) => {
    setPreferences(current => {
      const next = { ...current, [key]: value };
      void saveUserPreferences(next);
      return next;
    });
  };

  const toggleAudioPreference = () => {
    updatePreference(
      'audioPreference',
      preferences.audioPreference === 'subtitles' ? 'dubbed' : 'subtitles',
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colorPalette.accent.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <Text style={styles.headerEyebrow}>IMPOSTAZIONI</Text>
          <Text style={styles.headerTitle}>Il tuo profilo</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          onScroll={onTabBarScroll}
          scrollEventThrottle={16}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionEyebrow}>RIPRODUZIONE</Text>
            <Text style={styles.sectionTitle}>Guarda come preferisci</Text>
          </View>
          <View style={styles.settingsGroup}>
            <ToggleSetting
              icon="play-circle-outline"
              title="Avvio automatico"
              description="Avvia il video quando è pronto"
              value={preferences.autoplay}
              onValueChange={value => updatePreference('autoplay', value)}
            />
            <ToggleSetting
              icon="play-skip-forward-outline"
              title="Prossimo episodio"
              description="Apri l'episodio successivo alla fine del video"
              value={preferences.playNext}
              onValueChange={value => updatePreference('playNext', value)}
            />
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionEyebrow}>ESPERIENZA</Text>
            <Text style={styles.sectionTitle}>Catalogo e lingua</Text>
          </View>
          <View style={styles.settingsGroup}>
            <ValueSetting
              icon="language-outline"
              title="Lingua preferita"
              description="Applica la traccia disponibile al video"
              value={preferences.audioPreference === 'subtitles' ? 'Sub ITA' : 'Dub ITA'}
              onPress={toggleAudioPreference}
            />
            <ToggleSetting
              icon="flash-off-outline"
              title="Riduci animazioni"
              description="Rende più immediate le transizioni del player"
              value={preferences.reduceMotion}
              onValueChange={value => updatePreference('reduceMotion', value)}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colorPalette.primary.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colorPalette.primary.background,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 26,
  },
  headerEyebrow: {
    color: theme.colorPalette.accent.primary,
    fontSize: 11,
    letterSpacing: 1.1,
    fontFamily: theme.typography.fontFamily.primaryBold,
    marginBottom: 6,
  },
  headerTitle: {
    color: theme.colorPalette.text.primary,
    fontSize: 28,
    fontFamily: theme.typography.fontFamily.primaryBold,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 112,
  },
  sectionHeader: {
    marginBottom: 11,
  },
  sectionEyebrow: {
    color: theme.colorPalette.accent.primary,
    fontSize: 10,
    fontFamily: theme.typography.fontFamily.primaryBold,
    letterSpacing: 1.1,
    marginBottom: 5,
  },
  sectionTitle: {
    color: theme.colorPalette.text.primary,
    fontSize: 18,
    fontFamily: theme.typography.fontFamily.primaryBold,
  },
  settingsGroup: {
    gap: 2,
    marginBottom: 28,
  },
  settingRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: theme.colorPalette.primary.backgroundSecondary,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: theme.colorPalette.primary.backgroundTertiary,
  },
  settingCopy: {
    flex: 1,
    paddingRight: 10,
  },
  settingTitle: {
    color: theme.colorPalette.text.primary,
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.primaryBold,
    marginBottom: 3,
  },
  settingDescription: {
    color: theme.colorPalette.text.tertiary,
    fontSize: 11,
    lineHeight: 15,
    fontFamily: theme.typography.fontFamily.primary,
  },
  valueControl: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  valueText: {
    color: theme.colorPalette.accent.secondary,
    fontSize: 12,
    fontFamily: theme.typography.fontFamily.primaryBold,
    marginRight: 4,
  },
});

export default SettingsScreen;
