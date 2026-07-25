import AsyncStorage from '@react-native-async-storage/async-storage';

export type AudioPreference = 'subtitles' | 'dubbed';

export type UserPreferences = {
  autoplay: boolean;
  playNext: boolean;
  audioPreference: AudioPreference;
  reduceMotion: boolean;
};

const PREFERENCES_KEY = 'user_preferences';

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  autoplay: true,
  playNext: true,
  audioPreference: 'subtitles',
  reduceMotion: false,
};

export const getUserPreferences = async (): Promise<UserPreferences> => {
  try {
    const stored = await AsyncStorage.getItem(PREFERENCES_KEY);
    if (!stored) {
      return DEFAULT_USER_PREFERENCES;
    }

    return {
      ...DEFAULT_USER_PREFERENCES,
      ...JSON.parse(stored),
    };
  } catch {
    return DEFAULT_USER_PREFERENCES;
  }
};

export const saveUserPreferences = async (preferences: UserPreferences): Promise<void> => {
  try {
    await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  } catch {
    return;
  }
};
