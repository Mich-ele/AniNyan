import AsyncStorage from '@react-native-async-storage/async-storage';

export type AudioPreference = 'subtitles' | 'dubbed';
export type AnimeProvider = 'animeworld' | 'animeunity';

export type UserPreferences = {
  autoplay: boolean;
  playNext: boolean;
  audioPreference: AudioPreference;
  reduceMotion: boolean;
  animeProvider: AnimeProvider;
};

const PREFERENCES_KEY = 'user_preferences';

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  autoplay: true,
  playNext: true,
  audioPreference: 'subtitles',
  reduceMotion: false,
  animeProvider: 'animeunity',
};

export const getUserPreferences = async (): Promise<UserPreferences> => {
  try {
    const stored = await AsyncStorage.getItem(PREFERENCES_KEY);
    if (!stored) {
      const initialPreferences = { ...DEFAULT_USER_PREFERENCES };
      await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(initialPreferences));
      return initialPreferences;
    }

    const parsed = JSON.parse(stored) as Partial<UserPreferences>;
    return {
      ...DEFAULT_USER_PREFERENCES,
      ...parsed,
      animeProvider: parsed.animeProvider === 'animeworld' ? 'animeworld' : 'animeunity',
    };
  } catch {
    return { ...DEFAULT_USER_PREFERENCES };
  }
};

export const saveUserPreferences = async (preferences: UserPreferences): Promise<void> => {
  try {
    await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  } catch {
    return;
  }
};
