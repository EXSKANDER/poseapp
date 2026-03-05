import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
  Switch,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { STRINGS } from '@/constants/strings';
import { Colors } from '@/constants/theme';
import {
  BUILTIN_PRESETS,
  DEFAULT_SESSION_CONFIG,
  PRESETS_STORAGE_KEY,
  SessionConfig,
  SessionPreset,
} from '@/constants/presets';

const DURATION_OPTIONS = [30, 60, 120, 300];
const POSE_COUNT_OPTIONS = [1, 5, 10, 20];
const BREAK_OPTIONS = [0, 5, 10, 30];

type SessionConfigParams = {
  presetId?: string;
};

export default function SessionConfigScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<SessionConfigParams>();

  const [config, setConfig] = useState<SessionConfig>(DEFAULT_SESSION_CONFIG);
  const [presetName, setPresetName] = useState('');
  const [presets, setPresets] = useState<SessionPreset[]>([]);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);

  useEffect(() => {
    const loadPresetsAndMaybeApplyEditing = async () => {
      try {
        const stored = await AsyncStorage.getItem(PRESETS_STORAGE_KEY);
        const storedPresets: SessionPreset[] = stored ? JSON.parse(stored) : [];
        setPresets(storedPresets);

        if (params.presetId && !editingPresetId) {
          const allPresets: SessionPreset[] = [...BUILTIN_PRESETS, ...storedPresets];
          const preset = allPresets.find((p) => p.id === params.presetId);

          if (preset) {
            setConfig(preset.config);
            setPresetName(preset.name);
            setEditingPresetId(preset.id);
          }
        }
      } catch {
        // ignore read errors
      }
    };

    loadPresetsAndMaybeApplyEditing();
  }, [params.presetId, editingPresetId]);

  const handleStartSession = () => {
    const encodedConfig = JSON.stringify(config);
    router.push({
      pathname: '/viewer',
      params: { config: encodedConfig },
    });
  };

  const handleSavePreset = async () => {
    if (!presetName.trim()) {
      return;
    }

    const newPreset: SessionPreset = {
      id: Date.now().toString(),
      name: presetName.trim(),
      config,
    };

    const nextPresets = [...presets, newPreset];
    setPresets(nextPresets);

    try {
      await AsyncStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(nextPresets));
    } catch {
      // ignore write errors
    }

    setPresetName('');
    setEditingPresetId(null);
  };

  const handleUpdatePreset = async () => {
    if (!editingPresetId) {
      return;
    }

    try {
      const stored = await AsyncStorage.getItem(PRESETS_STORAGE_KEY);
      const storedPresets: SessionPreset[] = stored ? JSON.parse(stored) : [];

      const isBuiltIn = BUILTIN_PRESETS.some((p) => p.id === editingPresetId);

      let nextPresets: SessionPreset[];

      if (isBuiltIn) {
        const existingIndex = storedPresets.findIndex((p) => p.id === editingPresetId);
        const updated: SessionPreset = {
          id: editingPresetId,
          name:
            presetName.trim() ||
            BUILTIN_PRESETS.find((p) => p.id === editingPresetId)?.name ||
            '',
          config,
        };

        if (existingIndex >= 0) {
          nextPresets = [...storedPresets];
          nextPresets[existingIndex] = updated;
        } else {
          nextPresets = [...storedPresets, updated];
        }
      } else {
        nextPresets = storedPresets.map((preset) =>
          preset.id === editingPresetId
            ? {
                ...preset,
                name: presetName.trim() || preset.name,
                config,
              }
            : preset,
        );
      }

      await AsyncStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(nextPresets));
      setPresets(nextPresets);
    } catch {
      // ignore write errors
    }
  };

  const applyPreset = (preset: SessionPreset) => {
    setConfig(preset.config);
  };

  const backgroundColor =
    config.background === 'dark'
      ? '#1e1e1e'
      : config.background === 'mid'
        ? '#3a3a3a'
        : '#e0e0e0';

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ThemedText type="title" style={styles.title}>
          {STRINGS.sessionConfig.title}
        </ThemedText>

        <View style={styles.section}>
          <ThemedText type="subtitle">{STRINGS.sessionConfig.subjectSectionTitle}</ThemedText>

          <View style={styles.fieldRow}>
            <ThemedText style={styles.fieldLabel}>{STRINGS.sessionConfig.genderLabel}</ThemedText>
            <View style={styles.chipRow}>
              <Chip
                label={STRINGS.sessionConfig.genderMale}
                selected={config.gender === 'male'}
                onPress={() => setConfig((prev) => ({ ...prev, gender: 'male' }))}
              />
              <Chip
                label={STRINGS.sessionConfig.genderFemale}
                selected={config.gender === 'female'}
                onPress={() => setConfig((prev) => ({ ...prev, gender: 'female' }))}
              />
              <Chip
                label={STRINGS.sessionConfig.genderBoth}
                selected={config.gender === 'both'}
                onPress={() => setConfig((prev) => ({ ...prev, gender: 'both' }))}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle">{STRINGS.sessionConfig.displaySectionTitle}</ThemedText>

          <View style={styles.fieldRow}>
            <ThemedText style={styles.fieldLabel}>
              {STRINGS.sessionConfig.showGridLabel}
            </ThemedText>
            <Switch
              value={config.showGrid}
              onValueChange={(value) => setConfig((prev) => ({ ...prev, showGrid: value }))}
            />
          </View>

          <View style={styles.fieldRow}>
            <ThemedText style={styles.fieldLabel}>
              {STRINGS.sessionConfig.backgroundLabel}
            </ThemedText>
            <View style={styles.chipRow}>
              <Chip
                label={STRINGS.sessionConfig.backgroundDark}
                selected={config.background === 'dark'}
                onPress={() => setConfig((prev) => ({ ...prev, background: 'dark' }))}
              />
              <Chip
                label={STRINGS.sessionConfig.backgroundMid}
                selected={config.background === 'mid'}
                onPress={() => setConfig((prev) => ({ ...prev, background: 'mid' }))}
              />
              <Chip
                label={STRINGS.sessionConfig.backgroundLight}
                selected={config.background === 'light'}
                onPress={() => setConfig((prev) => ({ ...prev, background: 'light' }))}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle">{STRINGS.sessionConfig.lightingSectionTitle}</ThemedText>

          <LabeledSlider
            label={STRINGS.sessionConfig.directionalLightLabel}
            value={config.directionalIntensity}
            min={0}
            max={2}
            onChange={(value) =>
              setConfig((prev) => ({ ...prev, directionalIntensity: value }))
            }
          />

          <LabeledSlider
            label={STRINGS.sessionConfig.ambientLightLabel}
            value={config.ambientIntensity}
            min={0}
            max={2}
            onChange={(value) => setConfig((prev) => ({ ...prev, ambientIntensity: value }))}
          />
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle">{STRINGS.sessionConfig.timeSectionTitle}</ThemedText>

          <View style={styles.fieldRow}>
            <ThemedText style={styles.fieldLabel}>
              {STRINGS.sessionConfig.poseDurationLabel}
            </ThemedText>
            <View style={styles.chipRow}>
              {DURATION_OPTIONS.map((seconds) => {
                const minutes = seconds / 60;
                const isMinute = minutes >= 1;
                const label = isMinute
                  ? `${minutes}${STRINGS.sessionConfig.durationMinutes}`
                  : `${seconds}${STRINGS.sessionConfig.durationSeconds}`;

                return (
                  <Chip
                    key={seconds}
                    label={label}
                    selected={config.poseDurationSeconds === seconds}
                    onPress={() =>
                      setConfig((prev) => ({ ...prev, poseDurationSeconds: seconds }))
                    }
                  />
                );
              })}
            </View>
          </View>

          <View style={styles.fieldRow}>
            <ThemedText style={styles.fieldLabel}>
              {STRINGS.sessionConfig.poseCountLabel}
            </ThemedText>
            <View style={styles.chipRow}>
              {POSE_COUNT_OPTIONS.map((count) => (
                <Chip
                  key={count}
                  label={`${count} ${STRINGS.sessionConfig.posesSuffix}`}
                  selected={config.poseCount === count}
                  onPress={() => setConfig((prev) => ({ ...prev, poseCount: count }))}
                />
              ))}
            </View>
          </View>

          <View style={styles.fieldRow}>
            <ThemedText style={styles.fieldLabel}>
              {STRINGS.sessionConfig.breakDurationLabel}
            </ThemedText>
            <View style={styles.chipRow}>
              {BREAK_OPTIONS.map((seconds) => {
                const label =
                  seconds === 0
                    ? STRINGS.sessionConfig.breakOff
                    : `${seconds}${STRINGS.sessionConfig.breakSecondsSuffix}`;
                return (
                  <Chip
                    key={seconds}
                    label={label}
                    selected={config.breakDurationSeconds === seconds}
                    onPress={() =>
                      setConfig((prev) => ({ ...prev, breakDurationSeconds: seconds }))
                    }
                  />
                );
              })}
            </View>
          </View>

          <View style={styles.fieldRow}>
            <ThemedText style={styles.fieldLabel}>
              {STRINGS.sessionConfig.randomOrderLabel}
            </ThemedText>
            <Switch
              value={config.randomOrder}
              onValueChange={(value) => setConfig((prev) => ({ ...prev, randomOrder: value }))}
            />
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle">{STRINGS.sessionConfig.presetsSectionTitle}</ThemedText>

          <View style={styles.presetRow}>
            <TextInput
              value={presetName}
              onChangeText={setPresetName}
              placeholder={STRINGS.sessionConfig.presetNameLabel}
              placeholderTextColor="#888"
              style={styles.presetInput}
            />
            <Pressable style={styles.primaryButton} onPress={handleSavePreset}>
              <Text style={styles.primaryButtonText}>
                {editingPresetId
                  ? STRINGS.sessionConfig.savePresetAsNewButton
                  : STRINGS.sessionConfig.savePresetButton}
              </Text>
            </Pressable>
            {editingPresetId && (
              <Pressable style={styles.secondaryButton} onPress={handleUpdatePreset}>
                <Text style={styles.secondaryButtonText}>
                  {STRINGS.sessionConfig.updatePresetButton}
                </Text>
              </Pressable>
            )}
          </View>

          {presets.length > 0 && (
            <View style={styles.presetList}>
              {presets.map((preset) => (
                <Pressable
                  key={preset.id}
                  style={styles.presetChip}
                  onPress={() => applyPreset(preset)}
                >
                  <Text style={styles.presetChipText}>{preset.name}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <Pressable style={styles.startButton} onPress={handleStartSession}>
          <Text style={styles.startButtonText}>{STRINGS.sessionConfig.startSessionButton}</Text>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

type ChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

function Chip({ label, selected, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? Colors.light.tint : '#ffffff11',
          borderColor: selected ? Colors.light.tint : '#666',
        },
      ]}
    >
      <Text style={styles.chipText}>{label}</Text>
    </Pressable>
  );
}

type LabeledSliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
};

function LabeledSlider({ label, value, min, max, onChange }: LabeledSliderProps) {
  const Slider = require('@react-native-community/slider').default;

  return (
    <View style={styles.sliderRow}>
      <ThemedText style={styles.sliderLabel}>{label}</ThemedText>
      <Slider
        style={styles.slider}
        minimumValue={min}
        maximumValue={max}
        value={value}
        onValueChange={onChange}
        minimumTrackTintColor={Colors.light.tint}
        maximumTrackTintColor="#666"
        thumbTintColor={Colors.light.tint}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 32,
    gap: 24,
  },
  title: {
    marginBottom: 8,
  },
  section: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#00000055',
    gap: 12,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  fieldLabel: {
    flex: 1,
    marginRight: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-end',
    maxWidth: '60%',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: {
    color: '#fff',
    fontSize: 12,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 12,
  },
  sliderLabel: {
    flex: 1,
  },
  slider: {
    flex: 1.5,
  },
  presetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  presetInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#666',
    color: '#fff',
  },
  primaryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: Colors.light.tint,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  secondaryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#ffffff22',
  },
  secondaryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  presetList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#ffffff11',
  },
  presetChipText: {
    color: '#fff',
    fontSize: 12,
  },
  startButton: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
    backgroundColor: Colors.light.tint,
  },
  startButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});

