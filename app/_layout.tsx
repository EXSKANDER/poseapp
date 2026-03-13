import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect, useState } from 'react';
import { I18nManager } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { PreferencesProvider, useUserPreferences } from '@/hooks/use-user-preferences';
import '@/i18n';
import { loadSavedLanguage } from '@/i18n';
import i18n from '@/i18n';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayoutInner() {
  const { t } = useTranslation();
  const systemColorScheme = useColorScheme();
  const { preferences, isLoaded } = useUserPreferences();

  const effectiveScheme =
    preferences.theme === 'system'
      ? (systemColorScheme ?? 'dark')
      : preferences.theme;

  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeProvider value={effectiveScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="viewer"
          options={{
            presentation: 'fullScreenModal',
            headerShown: false,
            title: t('viewer.title'),
          }}
        />
        <Stack.Screen
          name="session-config"
          options={{
            presentation: 'modal',
            headerShown: false,
            title: t('sessionConfig.title'),
          }}
        />
      </Stack>
      <StatusBar style={effectiveScheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      const lang = await loadSavedLanguage();
      await i18n.changeLanguage(lang);
      const isRTL = lang === 'ar';
      if (I18nManager.isRTL !== isRTL) {
        I18nManager.forceRTL(isRTL);
        I18nManager.allowRTL(isRTL);
      }
      setReady(true);
    };
    init();
  }, []);

  if (!ready) {
    return null;
  }

  return (
    <PreferencesProvider>
      <RootLayoutInner />
    </PreferencesProvider>
  );
}

