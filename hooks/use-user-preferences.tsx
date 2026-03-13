import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TransitionStyle } from '@/constants/presets';

export type ThemeOption = 'light' | 'dark' | 'system';
export type RenderQuality = 'low' | 'medium' | 'high';
export type PerformanceMode = 'balanced' | 'performance' | 'battery';
export type TextSizeOption = 'system' | 'small' | 'medium' | 'large' | 'xlarge';
export type ReminderFrequency = 'daily' | 'every-other' | 'weekly';

export type UserPreferences = {
  // Practice defaults (5.1)
  defaultPoseDuration: number;
  defaultPoseCount: number;
  defaultBreakDuration: number;
  defaultTransitionStyle: TransitionStyle;
  defaultAudioCue: boolean;
  defaultCategories: string[];
  defaultGender: 'male' | 'female' | 'both';

  // Display & Graphics (5.2)
  theme: ThemeOption;
  renderQuality: RenderQuality;
  frameRateCap: 30 | 60;
  keepScreenAwake: boolean;
  viewerBackgroundColour: string;
  showGridByDefault: boolean;

  // Performance & Battery (5.3)
  performanceMode: PerformanceMode;
  preloadNextPose: boolean;
  cacheSizeLimit: number;
  defaultStaticFor2D: boolean;

  // Notifications (5.4)
  practiceReminders: boolean;
  reminderFrequency: ReminderFrequency;
  reminderTime: string;
  quietHoursStart: string;
  quietHoursEnd: string;
  streakWarnings: boolean;
  sessionCompleteFeedback: { vibration: boolean; sound: boolean };

  // Storage (5.5)
  wifiOnlyDownloads: boolean;

  // Language (5.6)
  language: string;

  // Accessibility (5.7)
  textSize: TextSizeOption;
  highContrast: boolean;
  reduceMotion: boolean;
  hapticFeedback: boolean;
  screenReaderOptimisations: boolean;

  // Privacy (5.8)
  analyticsEnabled: boolean;
  crashReportingEnabled: boolean;
};

export const DEFAULT_PREFERENCES: UserPreferences = {
  defaultPoseDuration: 60,
  defaultPoseCount: 10,
  defaultBreakDuration: 0,
  defaultTransitionStyle: 'cut',
  defaultAudioCue: false,
  defaultCategories: [],
  defaultGender: 'both',

  theme: 'system',
  renderQuality: 'medium',
  frameRateCap: 60,
  keepScreenAwake: true,
  viewerBackgroundColour: '#2c2c2c',
  showGridByDefault: true,

  performanceMode: 'balanced',
  preloadNextPose: true,
  cacheSizeLimit: 500,
  defaultStaticFor2D: false,

  practiceReminders: false,
  reminderFrequency: 'daily',
  reminderTime: '09:00',
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  streakWarnings: true,
  sessionCompleteFeedback: { vibration: true, sound: true },

  wifiOnlyDownloads: true,

  language: 'en',

  textSize: 'system',
  highContrast: false,
  reduceMotion: false,
  hapticFeedback: true,
  screenReaderOptimisations: false,

  analyticsEnabled: true,
  crashReportingEnabled: true,
};

const PREFERENCES_STORAGE_KEY = 'poseapp.userPreferences';

type PreferencesContextType = {
  preferences: UserPreferences;
  updatePreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;
  resetPreferences: () => void;
  isLoaded: boolean;
};

const PreferencesContext = createContext<PreferencesContextType>({
  preferences: DEFAULT_PREFERENCES,
  updatePreference: () => {},
  resetPreferences: () => {},
  isLoaded: false,
});

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const stored = await AsyncStorage.getItem(PREFERENCES_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
        }
      } catch {
        // use defaults
      }
      setIsLoaded(true);
    };
    loadPreferences();
  }, []);

  const updatePreference = useCallback(
    <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
      setPreferences((prev) => {
        const next = { ...prev, [key]: value };
        AsyncStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    [],
  );

  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
    AsyncStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(DEFAULT_PREFERENCES)).catch(() => {});
  }, []);

  const value = useMemo(
    () => ({ preferences, updatePreference, resetPreferences, isLoaded }),
    [preferences, updatePreference, resetPreferences, isLoaded],
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function useUserPreferences() {
  return useContext(PreferencesContext);
}
