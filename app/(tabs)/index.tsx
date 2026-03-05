import React, { useEffect, useMemo, useState } from 'react';
import {
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

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { STRINGS } from '@/constants/strings';
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
  const router = useRouter();

  const [userPresets, setUserPresets] = useState<SessionPreset[]>([]);
  const [layoutState, setLayoutState] = useState<PresetLayoutState>(DEFAULT_PRESET_LAYOUT);
  const [streakDays, setStreakDays] = useState<number>(0);
  const [isContextMenuVisible, setIsContextMenuVisible] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<PresetWithMeta | null>(null);
  const [isRenameModalVisible, setIsRenameModalVisible] = useState(false);
  const [renameValue, setRenameValue] = useState('');

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
      style={[styles.presetCard, item.isCustom ? styles.presetCardCustom : styles.presetCardBuiltIn]}
    >
      <View style={styles.presetHeaderRow}>
        <ThemedText type="defaultSemiBold" style={styles.presetName}>
          {item.name}
        </ThemedText>
        <Pressable onPress={() => handleEditPreset(item)} hitSlop={8} style={styles.cogButton}>
          <Text style={styles.cogButtonText}>⚙︎</Text>
        </Pressable>
      </View>
      <Text style={styles.presetMeta}>
        {formatPresetMeta(item.config ?? DEFAULT_SESSION_CONFIG)}
      </Text>
      <View style={styles.presetBadgeRow}>
        <Text style={styles.presetBadgeText}>
          {item.isCustom ? STRINGS.practice.presetsCustomBadge : STRINGS.practice.presetsBuiltInBadge}
        </Text>
      </View>
    </Pressable>
  );

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ThemedText type="title" style={styles.title}>
          {STRINGS.practice.title}
        </ThemedText>

        <Pressable style={styles.startButton} onPress={handleOpenConfig}>
          <ThemedText type="defaultSemiBold" style={styles.startButtonLabel}>
            {STRINGS.practice.startPracticeButton}
          </ThemedText>
        </Pressable>

        <View style={styles.streakCard}>
          <ThemedText type="subtitle" style={styles.streakTitle}>
            {STRINGS.practice.streakLabel}
          </ThemedText>
          <Text style={styles.streakValue}>
            {streakDays > 0
              ? `${streakDays} ${
                  streakDays === 1
                    ? STRINGS.practice.streakSingleDaySuffix
                    : STRINGS.practice.streakDaysSuffix
                }`
              : STRINGS.practice.streakNoDays}
          </Text>
        </View>

        <View style={styles.presetsHeaderRow}>
          <ThemedText type="subtitle">{STRINGS.practice.presetsSectionTitle}</ThemedText>
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
      </ScrollView>

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
            >
              <Text style={styles.contextMenuItemText}>
                {STRINGS.practice.presetContextEdit}
              </Text>
            </Pressable>
            <Pressable
              style={styles.contextMenuItem}
              onPress={() => handleContextAction('rename')}
            >
              <Text style={styles.contextMenuItemText}>
                {STRINGS.practice.presetContextRename}
              </Text>
            </Pressable>
            {!selectedPreset?.isCustom ? (
              <Pressable
                style={styles.contextMenuItem}
                onPress={() => handleContextAction('hide')}
              >
                <Text style={styles.contextMenuItemText}>
                  {STRINGS.practice.presetContextHide}
                </Text>
              </Pressable>
            ) : (
              <Pressable
                style={styles.contextMenuItem}
                onPress={() => handleContextAction('delete')}
              >
                <Text style={styles.contextMenuItemText}>
                  {STRINGS.practice.presetContextDelete}
                </Text>
              </Pressable>
            )}
            <Pressable
              style={styles.contextMenuItem}
              onPress={() => handleContextAction('moveUp')}
            >
              <Text style={styles.contextMenuItemText}>
                {STRINGS.practice.presetContextMoveUp}
              </Text>
            </Pressable>
            <Pressable
              style={styles.contextMenuItem}
              onPress={() => handleContextAction('moveDown')}
            >
              <Text style={styles.contextMenuItemText}>
                {STRINGS.practice.presetContextMoveDown}
              </Text>
            </Pressable>
            <Pressable style={styles.contextMenuCancel} onPress={closeContextMenu}>
              <Text style={styles.contextMenuCancelText}>{STRINGS.viewer.close}</Text>
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
              {STRINGS.practice.presetContextRename}
            </ThemedText>
            <TextInput
              value={renameValue}
              onChangeText={setRenameValue}
              style={styles.renameInput}
            />
            <View style={styles.renameButtonsRow}>
              <Pressable
                style={styles.renameButtonSecondary}
                onPress={() => setIsRenameModalVisible(false)}
              >
                <Text style={styles.renameButtonSecondaryText}>{STRINGS.viewer.close}</Text>
              </Pressable>
              <Pressable style={styles.renameButtonPrimary} onPress={handleConfirmRename}>
                <Text style={styles.renameButtonPrimaryText}>{STRINGS.sessionConfig.updatePresetButton}</Text>
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
  return `${durationLabel} · ${config.poseCount}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 32,
    gap: 16,
  },
  title: {
    marginBottom: 4,
  },
  startButton: {
    marginTop: 8,
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.tint,
  },
  startButtonLabel: {
    color: '#fff',
  },
  streakCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#00000055',
  },
  streakTitle: {
    marginBottom: 4,
  },
  streakValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  presetCard: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    marginHorizontal: 4,
  },
  presetCardBuiltIn: {
    backgroundColor: '#00000033',
  },
  presetCardCustom: {
    backgroundColor: '#00000066',
    borderWidth: 1,
    borderColor: Colors.light.tint,
  },
  presetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  presetName: {
    flex: 1,
    marginRight: 8,
  },
  cogButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#ffffff22',
  },
  cogButtonText: {
    color: '#fff',
    fontSize: 12,
  },
  presetMeta: {
    color: '#ddd',
    fontSize: 12,
    marginBottom: 6,
  },
  presetBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  presetBadgeText: {
    color: '#fff',
    fontSize: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#ffffff22',
    textTransform: 'uppercase',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#000000aa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contextMenu: {
    width: '80%',
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#1e1e1e',
  },
  contextMenuTitle: {
    marginBottom: 8,
  },
  contextMenuItem: {
    paddingVertical: 8,
  },
  contextMenuItemText: {
    color: '#fff',
    fontSize: 14,
  },
  contextMenuCancel: {
    marginTop: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 999,
    backgroundColor: '#ffffff22',
  },
  contextMenuCancelText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  renameModal: {
    width: '80%',
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#1e1e1e',
  },
  renameTitle: {
    marginBottom: 8,
  },
  renameInput: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#666',
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#fff',
    marginBottom: 12,
  },
  renameButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  renameButtonSecondary: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#ffffff22',
  },
  renameButtonSecondaryText: {
    color: '#fff',
  },
  renameButtonPrimary: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: Colors.light.tint,
  },
  renameButtonPrimaryText: {
    color: '#fff',
    fontWeight: '600',
  },
});

