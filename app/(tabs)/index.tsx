import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import {
  BUILTIN_PRESETS,
  DEFAULT_SESSION_CONFIG,
  DEFAULT_PRESET_LAYOUT,
  PRESET_LAYOUT_STORAGE_KEY,
  PRESETS_STORAGE_KEY,
  PresetLayoutState,
  SessionConfig,
  SessionPreset,
} from '@/constants/presets';
import { useUserPreferences } from '@/hooks/use-user-preferences';

const SESSION_DATES_STORAGE_KEY = 'poseapp.sessionStartDates';

type PresetWithMeta = SessionPreset & {
  isCustom?: boolean;
};

type ContextAction =
  | 'edit'
  | 'rename'
  | 'delete'
  | 'hide'
  | 'moveUp'
  | 'moveDown';

export default function PracticeScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const [userPresets, setUserPresets] = useState<SessionPreset[]>([]);
  const [layoutState, setLayoutState] = useState<PresetLayoutState>(DEFAULT_PRESET_LAYOUT);
  const [streakDays, setStreakDays] = useState<number>(0);
  const [isContextMenuVisible, setIsContextMenuVisible] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<PresetWithMeta | null>(null);
  const [isRenameModalVisible, setIsRenameModalVisible] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  const { preferences } = useUserPreferences();
  const reduceMotion = preferences.reduceMotion;

  // Entry animation (respects reduce motion)
  const fadeAnim = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const slideAnim = useRef(new Animated.Value(reduceMotion ? 0 : 20)).current;

  useEffect(() => {
    if (reduceMotion) return;
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, reduceMotion]);

  useEffect(() => {
    const loadPresetsAndLayout = async () => {
      try {
        const [storedPresetsRaw, storedLayoutRaw] = await Promise.all([
          AsyncStorage.getItem(PRESETS_STORAGE_KEY),
          AsyncStorage.getItem(PRESET_LAYOUT_STORAGE_KEY),
        ]);

        const storedPresets: SessionPreset[] = storedPresetsRaw
          ? JSON.parse(storedPresetsRaw)
          : [];
        setUserPresets(storedPresets);

        const parsedLayout: PresetLayoutState | null = storedLayoutRaw
          ? JSON.parse(storedLayoutRaw)
          : null;
        setLayoutState(parsedLayout ?? DEFAULT_PRESET_LAYOUT);
      } catch {
        setLayoutState(DEFAULT_PRESET_LAYOUT);
      }
    };

    const loadStreak = async () => {
      try {
        const stored = await AsyncStorage.getItem(SESSION_DATES_STORAGE_KEY);
        const dates: string[] = stored ? JSON.parse(stored) : [];
        setStreakDays(calculateStreak(dates));
      } catch {
        setStreakDays(0);
      }
    };

    loadPresetsAndLayout();
    loadStreak();
  }, []);

  const allPresets: PresetWithMeta[] = useMemo(() => {
    const hiddenBuiltInSet = new Set(layoutState.hiddenBuiltInIds);

    const builtInVisible: PresetWithMeta[] = BUILTIN_PRESETS.filter(
      (preset) => !hiddenBuiltInSet.has(preset.id),
    ).map((preset) => ({
      ...preset,
      isCustom: false,
    }));

    const user: PresetWithMeta[] = userPresets.map((preset) => ({
      ...preset,
      isCustom: !BUILTIN_PRESETS.some((p) => p.id === preset.id),
    }));

    const map = new Map<string, PresetWithMeta>();
    [...builtInVisible, ...user].forEach((preset) => {
      map.set(preset.id, preset);
    });

    const ordered: PresetWithMeta[] = [];
    layoutState.order.forEach((id) => {
      const preset = map.get(id);
      if (preset) {
        ordered.push(preset);
        map.delete(id);
      }
    });

    map.forEach((preset) => {
      ordered.push(preset);
    });

    return ordered;
  }, [layoutState, userPresets]);

  const handleOpenConfig = () => {
    router.push('/session-config');
  };

  const handleStartFromPreset = (preset: PresetWithMeta) => {
    const encodedConfig = JSON.stringify(preset.config ?? DEFAULT_SESSION_CONFIG);
    router.push({
      pathname: '/viewer',
      params: { config: encodedConfig },
    });
  };

  const handleEditPreset = (preset: PresetWithMeta) => {
    router.push({
      pathname: '/session-config',
      params: { presetId: preset.id },
    });
  };

  const handleOpenContextMenu = (preset: PresetWithMeta) => {
    setSelectedPreset(preset);
    setIsContextMenuVisible(true);
  };

  const closeContextMenu = () => {
    setIsContextMenuVisible(false);
    setSelectedPreset(null);
  };

  const handleContextAction = (action: ContextAction) => {
    if (!selectedPreset) {
      return;
    }

    switch (action) {
      case 'edit':
        closeContextMenu();
        handleEditPreset(selectedPreset);
        break;
      case 'rename':
        setRenameValue(selectedPreset.name);
        setIsRenameModalVisible(true);
        setIsContextMenuVisible(false);
        break;
      case 'delete':
        deletePreset(selectedPreset);
        closeContextMenu();
        break;
      case 'hide':
        hideBuiltInPreset(selectedPreset);
        closeContextMenu();
        break;
      case 'moveUp':
        reorderPreset(selectedPreset.id, -1);
        break;
      case 'moveDown':
        reorderPreset(selectedPreset.id, 1);
        break;
      default:
        break;
    }
  };

  const deletePreset = async (preset: PresetWithMeta) => {
    if (!preset.isCustom) {
      return;
    }

    const nextPresets = userPresets.filter((p) => p.id !== preset.id);
    setUserPresets(nextPresets);

    const nextOrder = layoutState.order.filter((id) => id !== preset.id);
    const nextLayout: PresetLayoutState = { ...layoutState, order: nextOrder };
    setLayoutState(nextLayout);

    try {
      await Promise.all([
        AsyncStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(nextPresets)),
        AsyncStorage.setItem(PRESET_LAYOUT_STORAGE_KEY, JSON.stringify(nextLayout)),
      ]);
    } catch {
      // ignore persistence errors
    }
  };

  const hideBuiltInPreset = async (preset: PresetWithMeta) => {
    if (preset.isCustom) {
      return;
    }

    const hiddenSet = new Set(layoutState.hiddenBuiltInIds);
    hiddenSet.add(preset.id);
    const nextHidden = Array.from(hiddenSet);

    const nextOrder = layoutState.order.filter((id) => id !== preset.id);
    const nextLayout: PresetLayoutState = {
      ...layoutState,
      hiddenBuiltInIds: nextHidden,
      order: nextOrder,
    };

    setLayoutState(nextLayout);

    try {
      await AsyncStorage.setItem(PRESET_LAYOUT_STORAGE_KEY, JSON.stringify(nextLayout));
    } catch {
      // ignore persistence errors
    }
  };

  const reorderPreset = (presetId: string, direction: -1 | 1) => {
    const ids = allPresets.map((p) => p.id);
    const currentIndex = ids.indexOf(presetId);
    if (currentIndex < 0) {
      return;
    }

    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= ids.length) {
      return;
    }

    const nextOrder = [...ids];
    const [moved] = nextOrder.splice(currentIndex, 1);
    nextOrder.splice(targetIndex, 0, moved);

    const nextLayout: PresetLayoutState = {
      ...layoutState,
      order: nextOrder,
    };

    setLayoutState(nextLayout);

    AsyncStorage.setItem(PRESET_LAYOUT_STORAGE_KEY, JSON.stringify(nextLayout)).catch(() => {
      // ignore persistence errors
    });
  };

  const handleConfirmRename = async () => {
    if (!selectedPreset || !renameValue.trim()) {
      setIsRenameModalVisible(false);
      return;
    }

    const updatedName = renameValue.trim();
    const nextUserPresets = userPresets.map((preset) =>
      preset.id === selectedPreset.id
        ? {
            ...preset,
            name: updatedName,
          }
        : preset,
    );

    setUserPresets(nextUserPresets);

    try {
      await AsyncStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(nextUserPresets));
    } catch {
      // ignore persistence errors
    }

    setIsRenameModalVisible(false);
  };

  const renderPresetCard = ({ item }: { item: PresetWithMeta }) => (
    <Pressable
      onPress={() => handleStartFromPreset(item)}
      onLongPress={() => handleOpenContextMenu(item)}
      style={({ pressed }) => [
        styles.presetCard,
        item.isCustom ? styles.presetCardCustom : styles.presetCardBuiltIn,
        pressed && styles.presetCardPressed,
      ]}
      accessibilityLabel={`Start ${item.name} preset`}
      accessibilityRole="button"
    >
      <View style={styles.presetHeaderRow}>
        <ThemedText type="defaultSemiBold" style={styles.presetName} numberOfLines={2}>
          {item.name}
        </ThemedText>
        <Pressable
          onPress={() => handleEditPreset(item)}
          hitSlop={8}
          style={styles.cogButton}
          accessibilityLabel={`Edit ${item.name}`}
          accessibilityRole="button"
        >
          <Text style={styles.cogButtonText}>⚙︎</Text>
        </Pressable>
      </View>
      <Text style={styles.presetMeta}>
        {formatPresetMeta(item.config ?? DEFAULT_SESSION_CONFIG)}
      </Text>
      <View style={styles.presetBadgeRow}>
        <View style={[styles.presetBadge, item.isCustom && styles.presetBadgeCustom]}>
          <Text style={styles.presetBadgeText}>
            {item.isCustom ? t('practice.presetsCustomBadge') : t('practice.presetsBuiltInBadge')}
          </Text>
        </View>
      </View>
    </Pressable>
  );

  return (
    <ThemedView style={styles.container}>
      <Animated.ScrollView
        contentContainerStyle={styles.scrollContent}
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
      >
        <ThemedText type="title" style={styles.title}>
          {t('practice.title')}
        </ThemedText>

        <Pressable
          style={({ pressed }) => [
            styles.startButton,
            pressed && styles.startButtonPressed,
          ]}
          onPress={handleOpenConfig}
          accessibilityLabel="Start a new practice session"
          accessibilityRole="button"
        >
          <Text style={styles.startButtonIcon}>▶</Text>
          <ThemedText type="defaultSemiBold" style={styles.startButtonLabel}>
            {t('practice.startPracticeButton')}
          </ThemedText>
        </Pressable>

        <View style={styles.streakCard}>
          <View style={styles.streakHeader}>
            <Text style={styles.streakIcon}>🔥</Text>
            <ThemedText type="subtitle" style={styles.streakTitle}>
              {t('practice.streakLabel')}
            </ThemedText>
          </View>
          <Text style={styles.streakValue}>
            {streakDays > 0
              ? t('practice.streakDays', { count: streakDays })
              : t('practice.streakNoDays')}
          </Text>
        </View>

        <View style={styles.presetsHeaderRow}>
          <ThemedText type="subtitle">{t('practice.presetsSectionTitle')}</ThemedText>
        </View>

        <FlatList
          data={allPresets}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.presetRow}
          renderItem={renderPresetCard}
          scrollEnabled={false}
          contentContainerStyle={styles.presetListContent}
        />
      </Animated.ScrollView>

      <Modal
        visible={isContextMenuVisible && !!selectedPreset}
        transparent
        animationType="fade"
        onRequestClose={closeContextMenu}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.contextMenu}>
            <ThemedText type="subtitle" style={styles.contextMenuTitle}>
              {selectedPreset?.name}
            </ThemedText>
            <Pressable
              style={styles.contextMenuItem}
              onPress={() => handleContextAction('edit')}
              accessibilityRole="button"
            >
              <Text style={styles.contextMenuItemText}>
                {t('practice.presetContextEdit')}
              </Text>
            </Pressable>
            <Pressable
              style={styles.contextMenuItem}
              onPress={() => handleContextAction('rename')}
              accessibilityRole="button"
            >
              <Text style={styles.contextMenuItemText}>
                {t('practice.presetContextRename')}
              </Text>
            </Pressable>
            {!selectedPreset?.isCustom ? (
              <Pressable
                style={styles.contextMenuItem}
                onPress={() => handleContextAction('hide')}
                accessibilityRole="button"
              >
                <Text style={styles.contextMenuItemText}>
                  {t('practice.presetContextHide')}
                </Text>
              </Pressable>
            ) : (
              <Pressable
                style={styles.contextMenuItem}
                onPress={() => handleContextAction('delete')}
                accessibilityRole="button"
              >
                <Text style={styles.contextMenuItemText}>
                  {t('practice.presetContextDelete')}
                </Text>
              </Pressable>
            )}
            <Pressable
              style={styles.contextMenuItem}
              onPress={() => handleContextAction('moveUp')}
              accessibilityRole="button"
            >
              <Text style={styles.contextMenuItemText}>
                {t('practice.presetContextMoveUp')}
              </Text>
            </Pressable>
            <Pressable
              style={styles.contextMenuItem}
              onPress={() => handleContextAction('moveDown')}
              accessibilityRole="button"
            >
              <Text style={styles.contextMenuItemText}>
                {t('practice.presetContextMoveDown')}
              </Text>
            </Pressable>
            <Pressable style={styles.contextMenuCancel} onPress={closeContextMenu}>
              <Text style={styles.contextMenuCancelText}>{t('viewer.close')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isRenameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsRenameModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.renameModal}>
            <ThemedText type="subtitle" style={styles.renameTitle}>
              {t('practice.presetContextRename')}
            </ThemedText>
            <TextInput
              value={renameValue}
              onChangeText={setRenameValue}
              style={styles.renameInput}
              accessibilityLabel="New preset name"
            />
            <View style={styles.renameButtonsRow}>
              <Pressable
                style={styles.renameButtonSecondary}
                onPress={() => setIsRenameModalVisible(false)}
              >
                <Text style={styles.renameButtonSecondaryText}>{t('viewer.close')}</Text>
              </Pressable>
              <Pressable style={styles.renameButtonPrimary} onPress={handleConfirmRename}>
                <Text style={styles.renameButtonPrimaryText}>{t('sessionConfig.updatePresetButton')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

function calculateStreak(dates: string[]): number {
  if (!dates.length) {
    return 0;
  }

  const dateSet = new Set(dates);
  let streak = 0;
  const today = new Date();

  while (true) {
    const d = new Date(today);
    d.setDate(today.getDate() - streak);
    const key = d.toISOString().slice(0, 10);
    if (dateSet.has(key)) {
      streak += 1;
    } else {
      break;
    }
  }

  return streak;
}

function formatPresetMeta(config: SessionConfig): string {
  const durationLabel =
    config.poseDurationSeconds >= 60
      ? `${config.poseDurationSeconds / 60}m`
      : `${config.poseDurationSeconds}s`;
  return `${durationLabel} × ${config.poseCount} poses`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
    gap: 16,
  },
  title: {
    marginBottom: 4,
  },
  // Start Practice button - prominent and inviting
  startButton: {
    marginTop: 8,
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    backgroundColor: Colors.light.tint,
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  startButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  startButtonIcon: {
    color: '#fff',
    fontSize: 18,
  },
  startButtonLabel: {
    color: '#fff',
    fontSize: 17,
  },
  // Streak card
  streakCard: {
    marginTop: 12,
    padding: 18,
    borderRadius: 16,
    backgroundColor: '#00000044',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  streakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  streakIcon: {
    fontSize: 20,
  },
  streakTitle: {
    marginBottom: 0,
  },
  streakValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 28,
  },
  presetsHeaderRow: {
    marginTop: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  presetRow: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  presetListContent: {
    paddingBottom: 8,
  },
  // Polished preset cards
  presetCard: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  presetCardBuiltIn: {
    backgroundColor: '#1a2a3a',
  },
  presetCardCustom: {
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: Colors.light.tint,
  },
  presetCardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  presetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  presetName: {
    flex: 1,
    marginRight: 8,
    fontSize: 14,
    lineHeight: 18,
  },
  cogButton: {
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#ffffff22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cogButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  presetMeta: {
    color: '#bbb',
    fontSize: 12,
    marginBottom: 8,
  },
  presetBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  presetBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  presetBadgeCustom: {
    backgroundColor: Colors.light.tint + '33',
  },
  presetBadgeText: {
    color: '#fff',
    fontSize: 10,
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  // Modals
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#000000aa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contextMenu: {
    width: '80%',
    borderRadius: 20,
    padding: 20,
    backgroundColor: '#1a1a2e',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  contextMenuTitle: {
    marginBottom: 12,
  },
  contextMenuItem: {
    minHeight: 44,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  contextMenuItemText: {
    color: '#fff',
    fontSize: 15,
  },
  contextMenuCancel: {
    marginTop: 12,
    minHeight: 44,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 999,
    backgroundColor: '#ffffff22',
    justifyContent: 'center',
  },
  contextMenuCancelText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  renameModal: {
    width: '80%',
    borderRadius: 20,
    padding: 20,
    backgroundColor: '#1a1a2e',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  renameTitle: {
    marginBottom: 12,
  },
  renameInput: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#444',
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#fff',
    marginBottom: 16,
    fontSize: 15,
    backgroundColor: '#ffffff0a',
  },
  renameButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  renameButtonSecondary: {
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#ffffff22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  renameButtonSecondaryText: {
    color: '#fff',
  },
  renameButtonPrimary: {
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: Colors.light.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  renameButtonPrimaryText: {
    color: '#fff',
    fontWeight: '600',
  },
});
