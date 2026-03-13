import React, { useCallback, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';

import { Colors } from '@/constants/theme';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import {
  useUserPreferences,
  type ThemeOption,
  type RenderQuality,
} from '@/hooks/use-user-preferences';
import {
  requestNotificationPermission,
  setupNotificationChannels,
} from '@/utils/notifications';

type OnboardingStep = 'welcome' | 'notifications' | 'theme' | 'performance';

const STEPS: OnboardingStep[] = ['welcome', 'notifications', 'theme', 'performance'];

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { updatePreference } = useUserPreferences();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedTheme, setSelectedTheme] = useState<ThemeOption>('system');
  const [selectedQuality, setSelectedQuality] = useState<RenderQuality>('medium');
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const animateTransition = useCallback(
    (next: () => void) => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        next();
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
    },
    [fadeAnim],
  );

  const goNext = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      animateTransition(() => setCurrentStep((s) => s + 1));
    }
  }, [currentStep, animateTransition]);

  const finishOnboarding = useCallback(async () => {
    updatePreference('theme', selectedTheme);
    updatePreference('renderQuality', selectedQuality);
    if (selectedQuality === 'low') {
      updatePreference('frameRateCap', 30);
    }
    await AsyncStorage.setItem(STORAGE_KEYS.onboardingComplete, 'true');
    router.replace('/(tabs)');
  }, [selectedTheme, selectedQuality, updatePreference, router]);

  const handleNotificationEnable = useCallback(async () => {
    if (Platform.OS === 'android') {
      await setupNotificationChannels();
    }
    await requestNotificationPermission();
    updatePreference('practiceReminders', true);
    goNext();
  }, [goNext, updatePreference]);

  const handleNotificationSkip = useCallback(() => {
    goNext();
  }, [goNext]);

  const handleThemeSelect = useCallback(
    (theme: ThemeOption) => {
      setSelectedTheme(theme);
    },
    [],
  );

  const handleQualitySelect = useCallback((quality: RenderQuality) => {
    setSelectedQuality(quality);
  }, []);

  const step = STEPS[currentStep];

  return (
    <View style={styles.container}>
      {/* Progress dots */}
      <View style={styles.dotsRow}>
        {STEPS.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i <= currentStep && styles.dotActive]}
            accessibilityLabel={`Step ${i + 1} of ${STEPS.length}${i === currentStep ? ', current' : ''}`}
          />
        ))}
      </View>

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {step === 'welcome' && <WelcomeStep t={t} onNext={goNext} />}
        {step === 'notifications' && (
          <NotificationsStep
            t={t}
            onEnable={handleNotificationEnable}
            onSkip={handleNotificationSkip}
          />
        )}
        {step === 'theme' && (
          <ThemeStep
            t={t}
            selected={selectedTheme}
            onSelect={handleThemeSelect}
            onNext={goNext}
          />
        )}
        {step === 'performance' && (
          <PerformanceStep
            t={t}
            selected={selectedQuality}
            onSelect={handleQualitySelect}
            onFinish={finishOnboarding}
          />
        )}
      </Animated.View>
    </View>
  );
}

function WelcomeStep({ t, onNext }: { t: (key: string, options?: Record<string, unknown>) => string; onNext: () => void }) {
  return (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <Text style={styles.heroIcon} accessibilityLabel="PoseApp logo">
          {'\u{1F3A8}'}
        </Text>
      </View>
      <Text
        style={styles.title}
        accessibilityRole="header"
      >
        {t('onboarding.welcomeTitle')}
      </Text>
      <Text style={styles.subtitle}>{t('onboarding.welcomeSubtitle')}</Text>

      <View style={styles.featuresContainer}>
        <FeatureRow icon={'\u{1F9CD}'} text={t('onboarding.welcomeFeature1')} />
        <FeatureRow icon={'\u{23F1}'} text={t('onboarding.welcomeFeature2')} />
        <FeatureRow icon={'\u{1F4C8}'} text={t('onboarding.welcomeFeature3')} />
      </View>

      <Pressable
        style={styles.primaryButton}
        onPress={onNext}
        accessibilityRole="button"
        accessibilityLabel={t('onboarding.next')}
      >
        <Text style={styles.primaryButtonText}>{t('onboarding.next')}</Text>
      </Pressable>
    </View>
  );
}

function FeatureRow({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureRow} accessibilityRole="text">
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

function NotificationsStep({
  t,
  onEnable,
  onSkip,
}: {
  t: (key: string, options?: Record<string, unknown>) => string;
  onEnable: () => void;
  onSkip: () => void;
}) {
  return (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <Text style={styles.heroIcon} accessibilityLabel="Notification bell">
          {'\u{1F514}'}
        </Text>
      </View>
      <Text style={styles.title} accessibilityRole="header">
        {t('onboarding.notificationsTitle')}
      </Text>
      <Text style={styles.subtitle}>{t('onboarding.notificationsSubtitle')}</Text>

      <Pressable
        style={styles.primaryButton}
        onPress={onEnable}
        accessibilityRole="button"
        accessibilityLabel={t('onboarding.enableNotifications')}
      >
        <Text style={styles.primaryButtonText}>
          {t('onboarding.enableNotifications')}
        </Text>
      </Pressable>
      <Pressable
        style={styles.secondaryButton}
        onPress={onSkip}
        accessibilityRole="button"
        accessibilityLabel={t('onboarding.skipNotifications')}
      >
        <Text style={styles.secondaryButtonText}>
          {t('onboarding.skipNotifications')}
        </Text>
      </Pressable>
    </View>
  );
}

function ThemeStep({
  t,
  selected,
  onSelect,
  onNext,
}: {
  t: (key: string, options?: Record<string, unknown>) => string;
  selected: ThemeOption;
  onSelect: (theme: ThemeOption) => void;
  onNext: () => void;
}) {
  const themes: { key: ThemeOption; label: string; bg: string; fg: string }[] = [
    { key: 'light', label: t('settings.themeLight'), bg: '#ffffff', fg: '#11181C' },
    { key: 'dark', label: t('settings.themeDark'), bg: '#151718', fg: '#ECEDEE' },
    { key: 'system', label: t('settings.themeSystem'), bg: '#333', fg: '#fff' },
  ];

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.title} accessibilityRole="header">
        {t('onboarding.themeTitle')}
      </Text>
      <Text style={styles.subtitle}>{t('onboarding.themeSubtitle')}</Text>

      <View style={styles.themeOptionsRow}>
        {themes.map(({ key, label, bg, fg }) => (
          <Pressable
            key={key}
            style={[
              styles.themeOption,
              selected === key && styles.themeOptionSelected,
            ]}
            onPress={() => onSelect(key)}
            accessibilityRole="button"
            accessibilityState={{ selected: selected === key }}
            accessibilityLabel={`${label} theme`}
          >
            <View style={[styles.themePreview, { backgroundColor: bg }]}>
              <Text style={[styles.themePreviewText, { color: fg }]}>Aa</Text>
            </View>
            <Text style={styles.themeLabel}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        style={styles.primaryButton}
        onPress={onNext}
        accessibilityRole="button"
        accessibilityLabel={t('onboarding.next')}
      >
        <Text style={styles.primaryButtonText}>{t('onboarding.next')}</Text>
      </Pressable>
    </View>
  );
}

function PerformanceStep({
  t,
  selected,
  onSelect,
  onFinish,
}: {
  t: (key: string, options?: Record<string, unknown>) => string;
  selected: RenderQuality;
  onSelect: (quality: RenderQuality) => void;
  onFinish: () => void;
}) {
  const qualities: {
    key: RenderQuality;
    label: string;
    desc: string;
    recommended: boolean;
  }[] = [
    {
      key: 'low',
      label: t('onboarding.qualityLow'),
      desc: t('onboarding.qualityLowDesc'),
      recommended: false,
    },
    {
      key: 'medium',
      label: t('onboarding.qualityMedium'),
      desc: t('onboarding.qualityMediumDesc'),
      recommended: true,
    },
    {
      key: 'high',
      label: t('onboarding.qualityHigh'),
      desc: t('onboarding.qualityHighDesc'),
      recommended: false,
    },
  ];

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.title} accessibilityRole="header">
        {t('onboarding.performanceTitle')}
      </Text>
      <Text style={styles.subtitle}>{t('onboarding.performanceSubtitle')}</Text>

      <View style={styles.qualityOptions}>
        {qualities.map(({ key, label, desc, recommended }) => (
          <Pressable
            key={key}
            style={[
              styles.qualityOption,
              selected === key && styles.qualityOptionSelected,
            ]}
            onPress={() => onSelect(key)}
            accessibilityRole="button"
            accessibilityState={{ selected: selected === key }}
            accessibilityLabel={`${label}: ${desc}${recommended ? ` (${t('onboarding.recommended')})` : ''}`}
          >
            <View style={styles.qualityHeader}>
              <Text
                style={[
                  styles.qualityLabel,
                  selected === key && styles.qualityLabelSelected,
                ]}
              >
                {label}
              </Text>
              {recommended && (
                <View style={styles.recommendedBadge}>
                  <Text style={styles.recommendedText}>
                    {t('onboarding.recommended')}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.qualityDesc}>{desc}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        style={styles.primaryButton}
        onPress={onFinish}
        accessibilityRole="button"
        accessibilityLabel={t('onboarding.getStarted')}
      >
        <Text style={styles.primaryButtonText}>{t('onboarding.getStarted')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#151718',
    paddingTop: 60,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dotActive: {
    backgroundColor: Colors.light.tint,
    width: 24,
  },
  content: {
    flex: 1,
  },
  stepContainer: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  iconContainer: {
    marginBottom: 8,
  },
  heroIcon: {
    fontSize: 72,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  featuresContainer: {
    gap: 16,
    width: '100%',
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 8,
  },
  featureIcon: {
    fontSize: 28,
    width: 40,
    textAlign: 'center',
  },
  featureText: {
    flex: 1,
    fontSize: 16,
    color: '#ddd',
    lineHeight: 22,
  },
  primaryButton: {
    width: '100%',
    minHeight: 52,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: Colors.light.tint,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  secondaryButton: {
    width: '100%',
    minHeight: 48,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#aaa',
    fontSize: 15,
    fontWeight: '600',
  },
  // Theme step
  themeOptionsRow: {
    flexDirection: 'row',
    gap: 16,
    marginVertical: 24,
  },
  themeOption: {
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  themeOptionSelected: {
    borderColor: Colors.light.tint,
    backgroundColor: 'rgba(10,126,164,0.15)',
  },
  themePreview: {
    width: 80,
    height: 120,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  themePreviewText: {
    fontSize: 24,
    fontWeight: '700',
  },
  themeLabel: {
    color: '#ddd',
    fontSize: 14,
    fontWeight: '600',
  },
  // Quality step
  qualityOptions: {
    width: '100%',
    gap: 12,
    marginVertical: 16,
  },
  qualityOption: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#333',
    backgroundColor: '#1e1e1e',
  },
  qualityOptionSelected: {
    borderColor: Colors.light.tint,
    backgroundColor: 'rgba(10,126,164,0.15)',
  },
  qualityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  qualityLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ddd',
  },
  qualityLabelSelected: {
    color: '#fff',
  },
  recommendedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: Colors.light.tint,
  },
  recommendedText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  qualityDesc: {
    fontSize: 13,
    color: '#999',
  },
});
