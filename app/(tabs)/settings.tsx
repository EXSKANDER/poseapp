import React, { useCallback, useState } from 'react';
import {
  Alert,
  I18nManager,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import Slider from '@react-native-community/slider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  useUserPreferences,
  DEFAULT_PREFERENCES,
  type ThemeOption,
  type RenderQuality,
  type PerformanceMode,
  type TextSizeOption,
  type ReminderFrequency,
} from '@/hooks/use-user-preferences';
import { SUPPORTED_LANGUAGES, saveLanguage } from '@/i18n';
import i18n from '@/i18n';
import type { TransitionStyle } from '@/constants/presets';
import { STORAGE_KEYS } from '@/constants/storage-keys';

// ─── Section Header ─────────────────────────────────────────────────────────

function SectionHeader({
  icon,
  title,
  subtitle,
  isDark,
}: {
  icon: string;
  title: string;
  subtitle: string;
  isDark: boolean;
}) {
  return (
    <View style={[styles.sectionHeader, isDark && styles.sectionHeaderDark]}>
      <Text style={styles.sectionIcon}>{icon}</Text>
      <View style={styles.sectionHeaderText}>
        <Text style={[styles.sectionTitle, isDark && styles.textLight]}>{title}</Text>
        <Text style={[styles.sectionSubtitle, isDark && styles.textMuted]}>{subtitle}</Text>
      </View>
    </View>
  );
}

// ─── Row Components ──────────────────────────────────────────────────────────

function SettingRow({
  label,
  description,
  isDark,
  children,
}: {
  label: string;
  description?: string;
  isDark: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingLabelContainer}>
        <Text style={[styles.settingLabel, isDark && styles.textLight]}>{label}</Text>
        {description ? (
          <Text style={[styles.settingDescription, isDark && styles.textMuted]}>{description}</Text>
        ) : null}
      </View>
      <View style={styles.settingControl}>{children}</View>
    </View>
  );
}

function ToggleButton({
  value,
  onToggle,
  isDark,
}: {
  value: boolean;
  onToggle: () => void;
  isDark: boolean;
}) {
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={onToggle}
      style={[
        styles.toggleBtn,
        value ? styles.toggleBtnActive : (isDark ? styles.toggleBtnInactiveDark : styles.toggleBtnInactive),
      ]}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
    >
      <Text style={[styles.toggleBtnText, value && styles.toggleBtnTextActive]}>
        {value ? t('common.on') : t('common.off')}
      </Text>
    </Pressable>
  );
}

function ChipGroup<T extends string>({
  options,
  value,
  onChange,
  isDark,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (key: T) => void;
  isDark: boolean;
}) {
  return (
    <View style={styles.chipGroup}>
      {options.map(({ key, label }) => (
        <Pressable
          key={key}
          onPress={() => onChange(key)}
          style={[
            styles.chip,
            isDark && styles.chipDark,
            value === key && styles.chipSelected,
          ]}
          accessibilityRole="button"
          accessibilityState={{ selected: value === key }}
        >
          <Text style={[styles.chipText, value === key && styles.chipTextSelected]}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  destructive,
  isDark,
}: {
  label: string;
  onPress: () => void;
  destructive?: boolean;
  isDark: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        isDark && styles.actionButtonDark,
        destructive && styles.actionButtonDestructive,
        pressed && styles.actionButtonPressed,
      ]}
      accessibilityRole="button"
    >
      <Text
        style={[
          styles.actionButtonText,
          destructive && styles.actionButtonTextDestructive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ─── Duration Picker Options ─────────────────────────────────────────────────

const DURATION_OPTIONS = [
  { key: '10', label: '10s', value: 10 },
  { key: '30', label: '30s', value: 30 },
  { key: '45', label: '45s', value: 45 },
  { key: '60', label: '1m', value: 60 },
  { key: '120', label: '2m', value: 120 },
  { key: '300', label: '5m', value: 300 },
  { key: '600', label: '10m', value: 600 },
];

const POSE_COUNT_OPTIONS = [
  { key: '1', label: '1', value: 1 },
  { key: '5', label: '5', value: 5 },
  { key: '10', label: '10', value: 10 },
  { key: '20', label: '20', value: 20 },
  { key: '50', label: '50', value: 50 },
];

const BREAK_OPTIONS = [
  { key: '0', label: 'Off', value: 0 },
  { key: '5', label: '5s', value: 5 },
  { key: '10', label: '10s', value: 10 },
  { key: '30', label: '30s', value: 30 },
];

const BACKGROUND_COLOURS = [
  { key: '#1a1a1a', label: '', color: '#1a1a1a' },
  { key: '#2c2c2c', label: '', color: '#2c2c2c' },
  { key: '#3a3a3a', label: '', color: '#3a3a3a' },
  { key: '#555555', label: '', color: '#555555' },
  { key: '#888888', label: '', color: '#888888' },
  { key: '#cccccc', label: '', color: '#cccccc' },
  { key: '#e0e0e0', label: '', color: '#e0e0e0' },
];

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const { preferences, updatePreference, resetPreferences } = useUserPreferences();
  const [languagePickerVisible, setLanguagePickerVisible] = useState(false);

  // Determine theme: if user set a preference, use it; otherwise system
  const effectiveTheme =
    preferences.theme === 'system' ? (colorScheme ?? 'dark') : preferences.theme;
  const isDark = effectiveTheme === 'dark';

  const handleLanguageChange = useCallback(
    async (langCode: string) => {
      updatePreference('language', langCode);
      await saveLanguage(langCode);
      i18n.changeLanguage(langCode);
      // Handle RTL for Arabic
      const isRTL = langCode === 'ar';
      if (I18nManager.isRTL !== isRTL) {
        I18nManager.forceRTL(isRTL);
        I18nManager.allowRTL(isRTL);
      }
      setLanguagePickerVisible(false);
    },
    [updatePreference],
  );

  const handleClearCache = useCallback(() => {
    Alert.alert(
      t('settings.clearCache'),
      t('settings.clearCacheConfirm'),
      [
        { text: t('settings.cancel'), style: 'cancel' },
        {
          text: t('settings.confirm'),
          onPress: async () => {
            // Clear image/model caches (in a real app, clear actual cache dirs)
            Alert.alert(t('common.success'), t('settings.cacheCleared'));
          },
        },
      ],
    );
  }, [t]);

  const handleDeleteAllData = useCallback(() => {
    Alert.alert(
      t('settings.deleteAllData'),
      t('settings.deleteAllDataConfirm'),
      [
        { text: t('settings.cancel'), style: 'cancel' },
        {
          text: t('settings.deleteAllDataButton'),
          style: 'destructive',
          onPress: async () => {
            try {
              await Promise.all([
                AsyncStorage.removeItem(STORAGE_KEYS.favourites),
                AsyncStorage.removeItem(STORAGE_KEYS.playlists),
                AsyncStorage.removeItem(STORAGE_KEYS.sessionPresets),
                AsyncStorage.removeItem(STORAGE_KEYS.presetLayout),
              ]);
              Alert.alert(t('common.success'), t('settings.dataDeleted'));
            } catch {
              // ignore
            }
          },
        },
      ],
    );
  }, [t]);

  const handleResetSettings = useCallback(() => {
    Alert.alert(
      t('settings.resetAllSettings'),
      t('settings.resetAllSettingsConfirm'),
      [
        { text: t('settings.cancel'), style: 'cancel' },
        {
          text: t('settings.reset'),
          style: 'destructive',
          onPress: () => {
            resetPreferences();
            Alert.alert(t('common.success'), t('settings.settingsReset'));
          },
        },
      ],
    );
  }, [t, resetPreferences]);

  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === preferences.language);
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <View style={[styles.container, isDark ? styles.containerDark : styles.containerLight]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.screenTitle, isDark && styles.textLight]}>{t('settings.title')}</Text>

        {/* ─── 5.1 Practice Defaults ────────────────────────────────────── */}
        <SectionHeader
          icon="🎯"
          title={t('settings.practiceDefaults')}
          subtitle={t('settings.practiceDefaultsDesc')}
          isDark={isDark}
        />
        <View style={[styles.sectionCard, isDark && styles.sectionCardDark]}>
          <SettingRow label={t('settings.defaultPoseDuration')} isDark={isDark}>
            <ChipGroup
              options={DURATION_OPTIONS.map((d) => ({ key: d.key, label: d.label }))}
              value={String(preferences.defaultPoseDuration)}
              onChange={(k) => updatePreference('defaultPoseDuration', Number(k))}
              isDark={isDark}
            />
          </SettingRow>
          <SettingRow label={t('settings.defaultPoseCount')} isDark={isDark}>
            <ChipGroup
              options={POSE_COUNT_OPTIONS.map((d) => ({ key: d.key, label: d.label }))}
              value={String(preferences.defaultPoseCount)}
              onChange={(k) => updatePreference('defaultPoseCount', Number(k))}
              isDark={isDark}
            />
          </SettingRow>
          <SettingRow label={t('settings.defaultBreakDuration')} isDark={isDark}>
            <ChipGroup
              options={BREAK_OPTIONS.map((d) => ({ key: d.key, label: d.label }))}
              value={String(preferences.defaultBreakDuration)}
              onChange={(k) => updatePreference('defaultBreakDuration', Number(k))}
              isDark={isDark}
            />
          </SettingRow>
          <SettingRow label={t('settings.defaultTransitionStyle')} isDark={isDark}>
            <ChipGroup
              options={[
                { key: 'cut' as TransitionStyle, label: t('sessionConfig.transitionCut') },
                { key: 'fade' as TransitionStyle, label: t('sessionConfig.transitionFade') },
                { key: 'countdown' as TransitionStyle, label: t('sessionConfig.transitionCountdown') },
              ]}
              value={preferences.defaultTransitionStyle}
              onChange={(k) => updatePreference('defaultTransitionStyle', k)}
              isDark={isDark}
            />
          </SettingRow>
          <SettingRow label={t('settings.defaultAudioCue')} isDark={isDark}>
            <ToggleButton
              value={preferences.defaultAudioCue}
              onToggle={() => updatePreference('defaultAudioCue', !preferences.defaultAudioCue)}
              isDark={isDark}
            />
          </SettingRow>
          <SettingRow label={t('settings.defaultGender')} isDark={isDark}>
            <ChipGroup
              options={[
                { key: 'male' as const, label: t('common.male') },
                { key: 'female' as const, label: t('common.female') },
                { key: 'both' as const, label: t('common.both') },
              ]}
              value={preferences.defaultGender}
              onChange={(k) => updatePreference('defaultGender', k)}
              isDark={isDark}
            />
          </SettingRow>
        </View>

        {/* ─── 5.2 Display & Graphics ──────────────────────────────────── */}
        <SectionHeader
          icon="🎨"
          title={t('settings.displayGraphics')}
          subtitle={t('settings.displayGraphicsDesc')}
          isDark={isDark}
        />
        <View style={[styles.sectionCard, isDark && styles.sectionCardDark]}>
          <SettingRow label={t('settings.theme')} isDark={isDark}>
            <ChipGroup
              options={[
                { key: 'light' as ThemeOption, label: t('settings.themeLight') },
                { key: 'dark' as ThemeOption, label: t('settings.themeDark') },
                { key: 'system' as ThemeOption, label: t('settings.themeSystem') },
              ]}
              value={preferences.theme}
              onChange={(k) => updatePreference('theme', k)}
              isDark={isDark}
            />
          </SettingRow>
          <SettingRow label={t('settings.renderQuality')} isDark={isDark}>
            <ChipGroup
              options={[
                { key: 'low' as RenderQuality, label: t('settings.renderQualityLow') },
                { key: 'medium' as RenderQuality, label: t('settings.renderQualityMedium') },
                { key: 'high' as RenderQuality, label: t('settings.renderQualityHigh') },
              ]}
              value={preferences.renderQuality}
              onChange={(k) => updatePreference('renderQuality', k)}
              isDark={isDark}
            />
          </SettingRow>
          <SettingRow
            label={t('settings.frameRateCap')}
            description={t('settings.frameRateCapNote')}
            isDark={isDark}
          >
            <ChipGroup
              options={[
                { key: '30', label: '30 fps' },
                { key: '60', label: '60 fps' },
              ]}
              value={String(preferences.frameRateCap)}
              onChange={(k) => updatePreference('frameRateCap', Number(k) as 30 | 60)}
              isDark={isDark}
            />
          </SettingRow>
          <SettingRow label={t('settings.keepScreenAwake')} isDark={isDark}>
            <ToggleButton
              value={preferences.keepScreenAwake}
              onToggle={() => updatePreference('keepScreenAwake', !preferences.keepScreenAwake)}
              isDark={isDark}
            />
          </SettingRow>
          <SettingRow label={t('settings.backgroundColour')} isDark={isDark}>
            <View style={styles.colourPickerRow}>
              {BACKGROUND_COLOURS.map(({ key, color }) => (
                <Pressable
                  key={key}
                  onPress={() => updatePreference('viewerBackgroundColour', key)}
                  style={[
                    styles.colourSwatch,
                    { backgroundColor: color },
                    preferences.viewerBackgroundColour === key && styles.colourSwatchSelected,
                  ]}
                  accessibilityLabel={`Background colour ${key}`}
                  accessibilityRole="button"
                />
              ))}
            </View>
          </SettingRow>
          <SettingRow label={t('settings.showGridByDefault')} isDark={isDark}>
            <ToggleButton
              value={preferences.showGridByDefault}
              onToggle={() => updatePreference('showGridByDefault', !preferences.showGridByDefault)}
              isDark={isDark}
            />
          </SettingRow>
        </View>

        {/* ─── 5.3 Performance & Battery ───────────────────────────────── */}
        <SectionHeader
          icon="⚡"
          title={t('settings.performanceBattery')}
          subtitle={t('settings.performanceBatteryDesc')}
          isDark={isDark}
        />
        <View style={[styles.sectionCard, isDark && styles.sectionCardDark]}>
          <SettingRow label={t('settings.performanceMode')} isDark={isDark}>
            <View style={styles.performanceModeContainer}>
              {(
                [
                  {
                    key: 'balanced' as PerformanceMode,
                    label: t('settings.performanceModeBalanced'),
                    desc: t('settings.performanceModeBalancedDesc'),
                  },
                  {
                    key: 'performance' as PerformanceMode,
                    label: t('settings.performanceModePerformance'),
                    desc: t('settings.performanceModePerformanceDesc'),
                  },
                  {
                    key: 'battery' as PerformanceMode,
                    label: t('settings.performanceModeBatterySaver'),
                    desc: t('settings.performanceModeBatterySaverDesc'),
                  },
                ] as const
              ).map(({ key, label, desc }) => (
                <Pressable
                  key={key}
                  onPress={() => {
                    updatePreference('performanceMode', key);
                    // Apply battery saver constraints
                    if (key === 'battery') {
                      updatePreference('renderQuality', 'low');
                      updatePreference('frameRateCap', 30);
                      updatePreference('defaultStaticFor2D', true);
                    } else if (key === 'performance') {
                      updatePreference('renderQuality', 'high');
                      updatePreference('frameRateCap', 60);
                    }
                  }}
                  style={[
                    styles.performanceModeOption,
                    isDark && styles.performanceModeOptionDark,
                    preferences.performanceMode === key && styles.performanceModeOptionSelected,
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: preferences.performanceMode === key }}
                >
                  <Text
                    style={[
                      styles.performanceModeLabel,
                      preferences.performanceMode === key && styles.performanceModeLabelSelected,
                    ]}
                  >
                    {label}
                  </Text>
                  <Text style={styles.performanceModeDesc}>{desc}</Text>
                </Pressable>
              ))}
            </View>
          </SettingRow>
          <SettingRow
            label={t('settings.preloadNextPose')}
            description={t('settings.preloadNextPoseDesc')}
            isDark={isDark}
          >
            <ToggleButton
              value={preferences.preloadNextPose}
              onToggle={() => updatePreference('preloadNextPose', !preferences.preloadNextPose)}
              isDark={isDark}
            />
          </SettingRow>
          <SettingRow
            label={t('settings.cacheSizeLimit')}
            description={t('settings.cacheSizeMB', { size: preferences.cacheSizeLimit })}
            isDark={isDark}
          >
            <Slider
              style={styles.sliderControl}
              minimumValue={100}
              maximumValue={1000}
              step={50}
              value={preferences.cacheSizeLimit}
              onSlidingComplete={(v) => updatePreference('cacheSizeLimit', v)}
              minimumTrackTintColor={Colors.light.tint}
              maximumTrackTintColor={isDark ? '#666' : '#ccc'}
              thumbTintColor={Colors.light.tint}
            />
          </SettingRow>
          <SettingRow
            label={t('settings.defaultStaticFor2D')}
            description={t('settings.defaultStaticFor2DDesc')}
            isDark={isDark}
          >
            <ToggleButton
              value={preferences.defaultStaticFor2D}
              onToggle={() => updatePreference('defaultStaticFor2D', !preferences.defaultStaticFor2D)}
              isDark={isDark}
            />
          </SettingRow>
        </View>

        {/* ─── 5.4 Notifications ───────────────────────────────────────── */}
        <SectionHeader
          icon="🔔"
          title={t('settings.notifications')}
          subtitle={t('settings.notificationsDesc')}
          isDark={isDark}
        />
        <View style={[styles.sectionCard, isDark && styles.sectionCardDark]}>
          <SettingRow label={t('settings.practiceReminders')} isDark={isDark}>
            <ToggleButton
              value={preferences.practiceReminders}
              onToggle={() => updatePreference('practiceReminders', !preferences.practiceReminders)}
              isDark={isDark}
            />
          </SettingRow>
          {preferences.practiceReminders && (
            <>
              <SettingRow label={t('settings.reminderFrequency')} isDark={isDark}>
                <ChipGroup
                  options={[
                    { key: 'daily' as ReminderFrequency, label: t('settings.reminderFrequencyDaily') },
                    { key: 'every-other' as ReminderFrequency, label: t('settings.reminderFrequencyEveryOther') },
                    { key: 'weekly' as ReminderFrequency, label: t('settings.reminderFrequencyWeekly') },
                  ]}
                  value={preferences.reminderFrequency}
                  onChange={(k) => updatePreference('reminderFrequency', k)}
                  isDark={isDark}
                />
              </SettingRow>
              <SettingRow label={t('settings.reminderTime')} isDark={isDark}>
                <Text style={[styles.settingValueText, isDark && styles.textMuted]}>
                  {preferences.reminderTime}
                </Text>
              </SettingRow>
              <SettingRow label={t('settings.quietHours')} isDark={isDark}>
                <Text style={[styles.settingValueText, isDark && styles.textMuted]}>
                  {preferences.quietHoursStart} – {preferences.quietHoursEnd}
                </Text>
              </SettingRow>
            </>
          )}
          <SettingRow
            label={t('settings.streakWarnings')}
            description={t('settings.streakWarningsDesc')}
            isDark={isDark}
          >
            <ToggleButton
              value={preferences.streakWarnings}
              onToggle={() => updatePreference('streakWarnings', !preferences.streakWarnings)}
              isDark={isDark}
            />
          </SettingRow>
          <SettingRow label={t('settings.sessionCompleteFeedback')} isDark={isDark}>
            <View style={styles.feedbackRow}>
              <Pressable
                onPress={() =>
                  updatePreference('sessionCompleteFeedback', {
                    ...preferences.sessionCompleteFeedback,
                    vibration: !preferences.sessionCompleteFeedback.vibration,
                  })
                }
                style={[
                  styles.feedbackChip,
                  preferences.sessionCompleteFeedback.vibration && styles.feedbackChipActive,
                ]}
                accessibilityRole="switch"
              >
                <Text style={styles.feedbackChipText}>{t('settings.vibration')}</Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  updatePreference('sessionCompleteFeedback', {
                    ...preferences.sessionCompleteFeedback,
                    sound: !preferences.sessionCompleteFeedback.sound,
                  })
                }
                style={[
                  styles.feedbackChip,
                  preferences.sessionCompleteFeedback.sound && styles.feedbackChipActive,
                ]}
                accessibilityRole="switch"
              >
                <Text style={styles.feedbackChipText}>{t('settings.sound')}</Text>
              </Pressable>
            </View>
          </SettingRow>
        </View>

        {/* ─── 5.5 Storage & Data ──────────────────────────────────────── */}
        <SectionHeader
          icon="💾"
          title={t('settings.storageData')}
          subtitle={t('settings.storageDataDesc')}
          isDark={isDark}
        />
        <View style={[styles.sectionCard, isDark && styles.sectionCardDark]}>
          <SettingRow label={t('settings.currentCacheSize')} isDark={isDark}>
            <ActionButton
              label={t('settings.clearCache')}
              onPress={handleClearCache}
              isDark={isDark}
            />
          </SettingRow>
          <SettingRow label={t('settings.wifiOnlyDownloads')} isDark={isDark}>
            <ToggleButton
              value={preferences.wifiOnlyDownloads}
              onToggle={() => updatePreference('wifiOnlyDownloads', !preferences.wifiOnlyDownloads)}
              isDark={isDark}
            />
          </SettingRow>
          <View style={styles.destructiveSection}>
            <ActionButton
              label={t('settings.deleteAllData')}
              onPress={handleDeleteAllData}
              destructive
              isDark={isDark}
            />
          </View>
        </View>

        {/* ─── 5.6 Language ────────────────────────────────────────────── */}
        <SectionHeader
          icon="🌐"
          title={t('settings.language')}
          subtitle={t('settings.languageDesc')}
          isDark={isDark}
        />
        <View style={[styles.sectionCard, isDark && styles.sectionCardDark]}>
          <SettingRow label={t('settings.languageLabel')} isDark={isDark}>
            <Pressable
              onPress={() => setLanguagePickerVisible(true)}
              style={[styles.languagePicker, isDark && styles.languagePickerDark]}
              accessibilityRole="button"
            >
              <Text style={styles.languageFlag}>{currentLang?.flag ?? ''}</Text>
              <Text style={[styles.languagePickerText, isDark && styles.textLight]}>
                {currentLang?.name ?? 'English'}
              </Text>
              <Text style={[styles.chevron, isDark && styles.textMuted]}>▼</Text>
            </Pressable>
          </SettingRow>
        </View>

        {/* ─── 5.7 Accessibility ───────────────────────────────────────── */}
        <SectionHeader
          icon="♿"
          title={t('settings.accessibility')}
          subtitle={t('settings.accessibilityDesc')}
          isDark={isDark}
        />
        <View style={[styles.sectionCard, isDark && styles.sectionCardDark]}>
          <SettingRow label={t('settings.textSize')} isDark={isDark}>
            <ChipGroup
              options={[
                { key: 'system' as TextSizeOption, label: t('settings.textSizeSystem') },
                { key: 'small' as TextSizeOption, label: t('settings.textSizeSmall') },
                { key: 'medium' as TextSizeOption, label: t('settings.textSizeMedium') },
                { key: 'large' as TextSizeOption, label: t('settings.textSizeLarge') },
                { key: 'xlarge' as TextSizeOption, label: t('settings.textSizeXLarge') },
              ]}
              value={preferences.textSize}
              onChange={(k) => updatePreference('textSize', k)}
              isDark={isDark}
            />
          </SettingRow>
          <SettingRow label={t('settings.highContrast')} isDark={isDark}>
            <ToggleButton
              value={preferences.highContrast}
              onToggle={() => updatePreference('highContrast', !preferences.highContrast)}
              isDark={isDark}
            />
          </SettingRow>
          <SettingRow
            label={t('settings.reduceMotion')}
            description={t('settings.reduceMotionDesc')}
            isDark={isDark}
          >
            <ToggleButton
              value={preferences.reduceMotion}
              onToggle={() => updatePreference('reduceMotion', !preferences.reduceMotion)}
              isDark={isDark}
            />
          </SettingRow>
          <SettingRow label={t('settings.hapticFeedback')} isDark={isDark}>
            <ToggleButton
              value={preferences.hapticFeedback}
              onToggle={() => updatePreference('hapticFeedback', !preferences.hapticFeedback)}
              isDark={isDark}
            />
          </SettingRow>
          <SettingRow label={t('settings.screenReaderOptimisations')} isDark={isDark}>
            <ToggleButton
              value={preferences.screenReaderOptimisations}
              onToggle={() =>
                updatePreference('screenReaderOptimisations', !preferences.screenReaderOptimisations)
              }
              isDark={isDark}
            />
          </SettingRow>
        </View>

        {/* ─── 5.8 Privacy ─────────────────────────────────────────────── */}
        <SectionHeader
          icon="🔒"
          title={t('settings.privacy')}
          subtitle={t('settings.privacyDesc')}
          isDark={isDark}
        />
        <View style={[styles.sectionCard, isDark && styles.sectionCardDark]}>
          <SettingRow
            label={t('settings.analytics')}
            description={t('settings.analyticsDesc')}
            isDark={isDark}
          >
            <ToggleButton
              value={preferences.analyticsEnabled}
              onToggle={() => updatePreference('analyticsEnabled', !preferences.analyticsEnabled)}
              isDark={isDark}
            />
          </SettingRow>
          <SettingRow
            label={t('settings.crashReporting')}
            description={t('settings.crashReportingDesc')}
            isDark={isDark}
          >
            <ToggleButton
              value={preferences.crashReportingEnabled}
              onToggle={() =>
                updatePreference('crashReportingEnabled', !preferences.crashReportingEnabled)
              }
              isDark={isDark}
            />
          </SettingRow>
          <SettingRow label={t('settings.privacyPolicy')} isDark={isDark}>
            <ActionButton
              label={t('settings.privacyPolicy')}
              onPress={() => Linking.openURL('https://poseapp.example.com/privacy')}
              isDark={isDark}
            />
          </SettingRow>
          <View style={styles.dataSummaryContainer}>
            <Text style={[styles.dataSummaryTitle, isDark && styles.textLight]}>
              {t('settings.dataSummary')}
            </Text>
            <Text style={[styles.dataSummaryText, isDark && styles.textMuted]}>
              {t('settings.dataSummaryText')}
            </Text>
          </View>
        </View>

        {/* ─── 5.9 About ───────────────────────────────────────────────── */}
        <SectionHeader
          icon="ℹ️"
          title={t('settings.about')}
          subtitle={t('settings.aboutDesc')}
          isDark={isDark}
        />
        <View style={[styles.sectionCard, isDark && styles.sectionCardDark]}>
          <SettingRow label={t('settings.appVersion')} isDark={isDark}>
            <Text style={[styles.settingValueText, isDark && styles.textMuted]}>{appVersion}</Text>
          </SettingRow>
          <SettingRow label={t('settings.checkForUpdates')} isDark={isDark}>
            <ActionButton
              label={t('settings.checkForUpdates')}
              onPress={() => Alert.alert(t('settings.checkForUpdates'), t('settings.upToDate'))}
              isDark={isDark}
            />
          </SettingRow>
          <SettingRow label={t('settings.openSourceLicences')} isDark={isDark}>
            <ActionButton
              label={t('settings.openSourceLicences')}
              onPress={() => {}}
              isDark={isDark}
            />
          </SettingRow>
          <View style={styles.dataSummaryContainer}>
            <Text style={[styles.dataSummaryTitle, isDark && styles.textLight]}>
              {t('settings.credits')}
            </Text>
            <Text style={[styles.dataSummaryText, isDark && styles.textMuted]}>
              {t('settings.creditsText')}
            </Text>
          </View>
          <SettingRow label={t('settings.feedbackLink')} isDark={isDark}>
            <ActionButton
              label={t('settings.feedbackLink')}
              onPress={() => Linking.openURL('mailto:feedback@poseapp.example.com')}
              isDark={isDark}
            />
          </SettingRow>
          <View style={styles.destructiveSection}>
            <ActionButton
              label={t('settings.resetAllSettings')}
              onPress={handleResetSettings}
              destructive
              isDark={isDark}
            />
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* ─── Language Picker Modal ──────────────────────────────────────── */}
      <Modal
        visible={languagePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLanguagePickerVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.languageModal, isDark && styles.languageModalDark]}>
            <Text style={[styles.modalTitle, isDark && styles.textLight]}>
              {t('settings.languageLabel')}
            </Text>
            <ScrollView style={styles.languageList}>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <Pressable
                  key={lang.code}
                  onPress={() => handleLanguageChange(lang.code)}
                  style={[
                    styles.languageItem,
                    preferences.language === lang.code && styles.languageItemSelected,
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: preferences.language === lang.code }}
                >
                  <Text style={styles.languageItemFlag}>{lang.flag}</Text>
                  <Text
                    style={[
                      styles.languageItemText,
                      isDark && styles.textLight,
                      preferences.language === lang.code && styles.languageItemTextSelected,
                    ]}
                  >
                    {lang.name}
                  </Text>
                  {preferences.language === lang.code && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              onPress={() => setLanguagePickerVisible(false)}
              style={styles.modalCloseButton}
            >
              <Text style={styles.modalCloseButtonText}>{t('settings.done')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  containerDark: {
    backgroundColor: '#151718',
  },
  containerLight: {
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
  },
  screenTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#11181C',
  },
  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 8,
    gap: 10,
  },
  sectionHeaderDark: {},
  sectionIcon: {
    fontSize: 22,
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#11181C',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#687076',
    marginTop: 1,
  },
  // Section card
  sectionCard: {
    borderRadius: 16,
    padding: 14,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionCardDark: {
    backgroundColor: '#1e2022',
  },
  // Setting row
  settingRow: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#00000015',
  },
  settingLabelContainer: {
    marginBottom: 6,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#11181C',
  },
  settingDescription: {
    fontSize: 11,
    color: '#687076',
    marginTop: 2,
  },
  settingControl: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValueText: {
    fontSize: 14,
    color: '#687076',
    fontWeight: '500',
  },
  // Toggle button
  toggleBtn: {
    minWidth: 52,
    minHeight: 32,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBtnActive: {
    backgroundColor: Colors.light.tint,
  },
  toggleBtnInactive: {
    backgroundColor: '#e0e0e0',
  },
  toggleBtnInactiveDark: {
    backgroundColor: '#333',
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  toggleBtnTextActive: {
    color: '#fff',
  },
  // Chip group
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f5f5f5',
  },
  chipDark: {
    borderColor: '#444',
    backgroundColor: '#2a2a2a',
  },
  chipSelected: {
    backgroundColor: Colors.light.tint,
    borderColor: Colors.light.tint,
  },
  chipText: {
    fontSize: 12,
    color: '#666',
  },
  chipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  // Action button
  actionButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
  },
  actionButtonDark: {
    backgroundColor: '#2a2a2a',
  },
  actionButtonDestructive: {
    backgroundColor: '#ff3b3022',
  },
  actionButtonPressed: {
    opacity: 0.7,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.tint,
  },
  actionButtonTextDestructive: {
    color: '#ff3b30',
  },
  // Colour picker
  colourPickerRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  colourSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colourSwatchSelected: {
    borderColor: Colors.light.tint,
    borderWidth: 3,
  },
  // Performance mode
  performanceModeContainer: {
    gap: 8,
    flex: 1,
  },
  performanceModeOption: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f8f8f8',
  },
  performanceModeOptionDark: {
    borderColor: '#444',
    backgroundColor: '#2a2a2a',
  },
  performanceModeOptionSelected: {
    borderColor: Colors.light.tint,
    backgroundColor: Colors.light.tint + '15',
  },
  performanceModeLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#666',
    marginBottom: 2,
  },
  performanceModeLabelSelected: {
    color: Colors.light.tint,
  },
  performanceModeDesc: {
    fontSize: 11,
    color: '#999',
  },
  // Slider
  sliderControl: {
    flex: 1,
    height: 40,
  },
  // Feedback chips
  feedbackRow: {
    flexDirection: 'row',
    gap: 8,
  },
  feedbackChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#444',
    backgroundColor: '#2a2a2a',
  },
  feedbackChipActive: {
    backgroundColor: Colors.light.tint,
    borderColor: Colors.light.tint,
  },
  feedbackChipText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  // Language picker
  languagePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
  },
  languagePickerDark: {
    backgroundColor: '#2a2a2a',
  },
  languageFlag: {
    fontSize: 18,
  },
  languagePickerText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#11181C',
  },
  chevron: {
    fontSize: 10,
    color: '#999',
    marginLeft: 4,
  },
  // Data summary
  dataSummaryContainer: {
    paddingVertical: 10,
  },
  dataSummaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#11181C',
    marginBottom: 4,
  },
  dataSummaryText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#687076',
  },
  // Destructive section
  destructiveSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ff3b3033',
  },
  // Text helpers
  textLight: {
    color: '#ECEDEE',
  },
  textMuted: {
    color: '#9BA1A6',
  },
  // Bottom spacer
  bottomSpacer: {
    height: 40,
  },
  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#000000aa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  languageModal: {
    width: '85%',
    maxHeight: '70%',
    borderRadius: 20,
    padding: 20,
    backgroundColor: '#fff',
  },
  languageModalDark: {
    backgroundColor: '#1e2022',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    color: '#11181C',
    textAlign: 'center',
  },
  languageList: {
    maxHeight: 400,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 12,
  },
  languageItemSelected: {
    backgroundColor: Colors.light.tint + '15',
  },
  languageItemFlag: {
    fontSize: 24,
  },
  languageItemText: {
    fontSize: 16,
    flex: 1,
    color: '#11181C',
  },
  languageItemTextSelected: {
    fontWeight: '700',
    color: Colors.light.tint,
  },
  checkmark: {
    fontSize: 18,
    color: Colors.light.tint,
    fontWeight: '700',
  },
  modalCloseButton: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: Colors.light.tint,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});
