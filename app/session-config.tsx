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
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import {
  ALL_BODY_REGIONS,
  BUILTIN_PRESETS,
  DEFAULT_SESSION_CONFIG,
  PRESETS_STORAGE_KEY,
  SessionConfig,
  SessionPreset,
  type BodyRegion,
  type GridOverlayDivisions,
  type ModelStyle,
  type PerspectiveMode,
  type TransitionStyle,
} from '@/constants/presets';

const DURATION_OPTIONS = [30, 60, 120, 300];
const POSE_COUNT_OPTIONS = [1, 5, 10, 20];
const BREAK_OPTIONS = [0, 5, 10, 30];

type SessionConfigParams = {
  presetId?: string;
  filterPoseIds?: string;
  filterLabel?: string;
};

export default function SessionConfigScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<SessionConfigParams>();

  const [config, setConfig] = useState<SessionConfig>(DEFAULT_SESSION_CONFIG);
  const [presetName, setPresetName] = useState('');
  const [presets, setPresets] = useState<SessionPreset[]>([]);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);

  // Pre-filtered subject pool from Library
  const filterPoseIds: string[] | null = params.filterPoseIds
    ? (() => {
        try {
          return JSON.parse(params.filterPoseIds);
        } catch {
          return null;
        }
      })()
    : null;
  const filterLabel = params.filterLabel || null;

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
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ThemedText type="title" style={styles.title}>
          {t('sessionConfig.title')}
        </ThemedText>

        {filterLabel && (
          <View style={styles.filterBanner}>
            <Text style={styles.filterBannerText}>{filterLabel}</Text>
            {filterPoseIds && (
              <Text style={styles.filterBannerCount}>
                {filterPoseIds.length} {t('library.sessionSubjectCountLabel')}
              </Text>
            )}
          </View>
        )}

        {/* Subject Selection */}
        <SectionCard icon="👤" title={t('sessionConfig.subjectSectionTitle')}>
          <View style={styles.fieldRow}>
            <ThemedText style={styles.fieldLabel}>{t('sessionConfig.genderLabel')}</ThemedText>
            <View style={styles.chipRow}>
              <Chip
                label={t('sessionConfig.genderMale')}
                selected={config.gender === 'male'}
                onPress={() => setConfig((prev) => ({ ...prev, gender: 'male' }))}
              />
              <Chip
                label={t('sessionConfig.genderFemale')}
                selected={config.gender === 'female'}
                onPress={() => setConfig((prev) => ({ ...prev, gender: 'female' }))}
              />
              <Chip
                label={t('sessionConfig.genderBoth')}
                selected={config.gender === 'both'}
                onPress={() => setConfig((prev) => ({ ...prev, gender: 'both' }))}
              />
            </View>
          </View>
        </SectionCard>

        {/* Display Options */}
        <SectionCard icon="🎨" title={t('sessionConfig.displaySectionTitle')}>
          <View style={styles.fieldRow}>
            <ThemedText style={styles.fieldLabel}>
              {t('sessionConfig.showGridLabel')}
            </ThemedText>
            <Switch
              value={config.showGrid}
              onValueChange={(value) => setConfig((prev) => ({ ...prev, showGrid: value }))}
              trackColor={{ false: '#555', true: Colors.light.tint }}
              accessibilityLabel="Show ground grid"
            />
          </View>

          <View style={styles.fieldRow}>
            <ThemedText style={styles.fieldLabel}>
              {t('sessionConfig.backgroundLabel')}
            </ThemedText>
            <View style={styles.chipRow}>
              <Chip
                label={t('sessionConfig.backgroundDark')}
                selected={config.background === 'dark'}
                onPress={() => setConfig((prev) => ({ ...prev, background: 'dark' }))}
              />
              <Chip
                label={t('sessionConfig.backgroundMid')}
                selected={config.background === 'mid'}
                onPress={() => setConfig((prev) => ({ ...prev, background: 'mid' }))}
              />
              <Chip
                label={t('sessionConfig.backgroundLight')}
                selected={config.background === 'light'}
                onPress={() => setConfig((prev) => ({ ...prev, background: 'light' }))}
              />
            </View>
          </View>
        </SectionCard>

        {/* Perspective & Camera */}
        <SectionCard icon="📷" title={t('sessionConfig.perspectiveSectionTitle')}>
          <View style={styles.fieldRow}>
            <ThemedText style={styles.fieldLabel}>
              {t('sessionConfig.perspectiveModeLabel')}
            </ThemedText>
          </View>
          <View style={styles.chipRowFull}>
            {(
              [
                { key: 'flat', label: t('viewer.perspectiveFlat') },
                { key: '1-point', label: t('viewer.perspective1Point') },
                { key: '2-point', label: t('viewer.perspective2Point') },
                { key: '3-point', label: t('viewer.perspective3Point') },
                { key: '4-point', label: t('viewer.perspective4Point') },
                { key: 'fisheye', label: t('viewer.perspectiveFisheye') },
              ] as { key: PerspectiveMode; label: string }[]
            ).map(({ key, label }) => (
              <Chip
                key={key}
                label={label}
                selected={config.perspectiveMode === key}
                onPress={() => setConfig((prev) => ({ ...prev, perspectiveMode: key }))}
              />
            ))}
          </View>
        </SectionCard>

        {/* Model Display */}
        <SectionCard icon="🧍" title={t('sessionConfig.displayModesSectionTitle')}>
          <View style={styles.fieldRow}>
            <ThemedText style={styles.fieldLabel}>
              {t('sessionConfig.modelStyleLabel')}
            </ThemedText>
          </View>
          <View style={styles.chipRowFull}>
            {(
              [
                { key: 'solid', label: t('viewer.modelStyleSolid') },
                { key: 'muscle', label: t('viewer.modelStyleMuscle') },
                { key: 'skeleton', label: t('viewer.modelStyleSkeleton') },
                { key: 'forms', label: t('viewer.modelStyleForms') },
                { key: 'coloured-anatomy', label: t('viewer.modelStyleColouredAnatomy') },
              ] as { key: ModelStyle; label: string }[]
            ).map(({ key, label }) => (
              <Chip
                key={key}
                label={label}
                selected={config.modelStyle === key}
                onPress={() => setConfig((prev) => ({ ...prev, modelStyle: key }))}
              />
            ))}
          </View>

          <View style={styles.toggleRow}>
            <ToggleRow
              label={t('sessionConfig.wireframeOverlayLabel')}
              value={config.wireframeOverlay}
              onToggle={(v) => setConfig((prev) => ({ ...prev, wireframeOverlay: v }))}
            />
            <ToggleRow
              label={t('sessionConfig.negativeSpaceLabel')}
              value={config.negativeSpace}
              onToggle={(v) => setConfig((prev) => ({ ...prev, negativeSpace: v }))}
            />
            <ToggleRow
              label={t('sessionConfig.staticModeLabel')}
              value={config.staticMode}
              onToggle={(v) => setConfig((prev) => ({ ...prev, staticMode: v }))}
            />
            <ToggleRow
              label={t('sessionConfig.mirrorLabel')}
              value={config.mirrorX}
              onToggle={(v) => setConfig((prev) => ({ ...prev, mirrorX: v }))}
            />
          </View>

          <LabeledSlider
            label={t('sessionConfig.modelOpacityLabel')}
            value={config.modelOpacity}
            min={0.05}
            max={1}
            onChange={(v) => setConfig((prev) => ({ ...prev, modelOpacity: v }))}
          />
        </SectionCard>

        {/* Overlays & Helpers */}
        <SectionCard icon="📐" title={t('sessionConfig.overlaysSectionTitle')}>
          <View style={styles.fieldRow}>
            <ThemedText style={styles.fieldLabel}>
              {t('sessionConfig.gridOverlayLabel')}
            </ThemedText>
            <View style={styles.chipRow}>
              {(
                [
                  { key: 'off', label: t('viewer.gridOverlayOff') },
                  { key: '4', label: t('viewer.gridOverlay4') },
                  { key: '9', label: t('viewer.gridOverlay9') },
                  { key: '16', label: t('viewer.gridOverlay16') },
                ] as { key: GridOverlayDivisions; label: string }[]
              ).map(({ key, label }) => (
                <Chip
                  key={key}
                  label={label}
                  selected={config.gridOverlay === key}
                  onPress={() => setConfig((prev) => ({ ...prev, gridOverlay: key }))}
                />
              ))}
            </View>
          </View>

          <View style={styles.toggleRow}>
            <ToggleRow
              label={t('sessionConfig.boundingBoxLabel')}
              value={config.showBoundingBox}
              onToggle={(v) => setConfig((prev) => ({ ...prev, showBoundingBox: v }))}
            />
            <ToggleRow
              label={t('sessionConfig.floorPlaneLabel')}
              value={config.showFloorPlane}
              onToggle={(v) => setConfig((prev) => ({ ...prev, showFloorPlane: v }))}
            />
            <ToggleRow
              label={t('sessionConfig.poseShadowLabel')}
              value={config.showPoseShadow}
              onToggle={(v) => setConfig((prev) => ({ ...prev, showPoseShadow: v }))}
            />
          </View>

          <View style={styles.fieldRow}>
            <ThemedText style={styles.fieldLabel}>
              {t('sessionConfig.limbSelectionLabel')}
            </ThemedText>
          </View>
          <View style={styles.chipRowFull}>
            {ALL_BODY_REGIONS.map((region) => {
              const labels: Record<BodyRegion, string> = {
                head: t('viewer.regionHead'),
                torso: t('viewer.regionTorso'),
                'left-arm': t('viewer.regionLeftArm'),
                'right-arm': t('viewer.regionRightArm'),
                'left-leg': t('viewer.regionLeftLeg'),
                'right-leg': t('viewer.regionRightLeg'),
              };
              return (
                <Chip
                  key={region}
                  label={labels[region]}
                  selected={config.selectedBodyRegions.includes(region)}
                  onPress={() =>
                    setConfig((prev) => {
                      const has = prev.selectedBodyRegions.includes(region);
                      if (has && prev.selectedBodyRegions.length <= 1) return prev;
                      return {
                        ...prev,
                        selectedBodyRegions: has
                          ? prev.selectedBodyRegions.filter((r) => r !== region)
                          : [...prev.selectedBodyRegions, region],
                      };
                    })
                  }
                />
              );
            })}
          </View>
        </SectionCard>

        {/* Lighting */}
        <SectionCard icon="💡" title={t('sessionConfig.lightingSectionTitle')}>
          <LabeledSlider
            label={t('sessionConfig.directionalLightLabel')}
            value={config.directionalIntensity}
            min={0}
            max={2}
            onChange={(value) =>
              setConfig((prev) => ({ ...prev, directionalIntensity: value }))
            }
          />
          <LabeledSlider
            label={t('sessionConfig.ambientLightLabel')}
            value={config.ambientIntensity}
            min={0}
            max={2}
            onChange={(value) => setConfig((prev) => ({ ...prev, ambientIntensity: value }))}
          />
        </SectionCard>

        {/* Time Options */}
        <SectionCard icon="⏱" title={t('sessionConfig.timeSectionTitle')}>
          <View style={styles.fieldRow}>
            <ThemedText style={styles.fieldLabel}>
              {t('sessionConfig.poseDurationLabel')}
            </ThemedText>
            <View style={styles.chipRow}>
              {DURATION_OPTIONS.map((seconds) => {
                const minutes = seconds / 60;
                const isMinute = minutes >= 1;
                const label = isMinute
                  ? `${minutes}${t('sessionConfig.durationMinutes')}`
                  : `${seconds}${t('sessionConfig.durationSeconds')}`;

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
              {t('sessionConfig.poseCountLabel')}
            </ThemedText>
            <View style={styles.chipRow}>
              {POSE_COUNT_OPTIONS.map((count) => (
                <Chip
                  key={count}
                  label={`${count} ${t('sessionConfig.posesSuffix')}`}
                  selected={config.poseCount === count}
                  onPress={() => setConfig((prev) => ({ ...prev, poseCount: count }))}
                />
              ))}
            </View>
          </View>

          <View style={styles.fieldRow}>
            <ThemedText style={styles.fieldLabel}>
              {t('sessionConfig.breakDurationLabel')}
            </ThemedText>
            <View style={styles.chipRow}>
              {BREAK_OPTIONS.map((seconds) => {
                const label =
                  seconds === 0
                    ? t('sessionConfig.breakOff')
                    : `${seconds}${t('sessionConfig.breakSecondsSuffix')}`;
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

          <ToggleRow
            label={t('sessionConfig.randomOrderLabel')}
            value={config.randomOrder}
            onToggle={(value) => setConfig((prev) => ({ ...prev, randomOrder: value }))}
          />
        </SectionCard>

        {/* Transitions & Audio */}
        <SectionCard icon="🎬" title={t('sessionConfig.transitionSectionTitle')}>
          <View style={styles.fieldRow}>
            <ThemedText style={styles.fieldLabel}>
              {t('sessionConfig.transitionStyleLabel')}
            </ThemedText>
            <View style={styles.chipRow}>
              {(
                [
                  { key: 'cut', label: t('sessionConfig.transitionCut') },
                  { key: 'fade', label: t('sessionConfig.transitionFade') },
                  { key: 'countdown', label: t('sessionConfig.transitionCountdown') },
                ] as { key: TransitionStyle; label: string }[]
              ).map(({ key, label }) => (
                <Chip
                  key={key}
                  label={label}
                  selected={config.transitionStyle === key}
                  onPress={() => setConfig((prev) => ({ ...prev, transitionStyle: key }))}
                />
              ))}
            </View>
          </View>

          <ToggleRow
            label={t('sessionConfig.audioCueLabel')}
            value={config.audioCue}
            onToggle={(v) => setConfig((prev) => ({ ...prev, audioCue: v }))}
          />
        </SectionCard>

        {/* Presets */}
        <SectionCard icon="💾" title={t('sessionConfig.presetsSectionTitle')}>
          <View style={styles.presetRow}>
            <TextInput
              value={presetName}
              onChangeText={setPresetName}
              placeholder={t('sessionConfig.presetNameLabel')}
              placeholderTextColor="#777"
              style={styles.presetInput}
              accessibilityLabel="Preset name"
            />
            <Pressable
              style={styles.primaryButton}
              onPress={handleSavePreset}
              accessibilityLabel="Save preset"
              accessibilityRole="button"
            >
              <Text style={styles.primaryButtonText}>
                {editingPresetId
                  ? t('sessionConfig.savePresetAsNewButton')
                  : t('sessionConfig.savePresetButton')}
              </Text>
            </Pressable>
            {editingPresetId && (
              <Pressable
                style={styles.secondaryButton}
                onPress={handleUpdatePreset}
                accessibilityLabel="Update preset"
                accessibilityRole="button"
              >
                <Text style={styles.secondaryButtonText}>
                  {t('sessionConfig.updatePresetButton')}
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
                  accessibilityLabel={`Load ${preset.name} preset`}
                  accessibilityRole="button"
                >
                  <Text style={styles.presetChipText}>{preset.name}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </SectionCard>

        <Pressable
          style={({ pressed }) => [
            styles.startButton,
            pressed && styles.startButtonPressed,
          ]}
          onPress={handleStartSession}
          accessibilityLabel="Start practice session"
          accessibilityRole="button"
        >
          <Text style={styles.startButtonIcon}>▶</Text>
          <Text style={styles.startButtonText}>{t('sessionConfig.startSessionButton')}</Text>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

/** Section card with icon and title header */
function SectionCard({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionIcon}>{icon}</Text>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          {title}
        </ThemedText>
      </View>
      {children}
    </View>
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
          backgroundColor: selected ? Colors.light.tint : '#ffffff0d',
          borderColor: selected ? Colors.light.tint : '#555',
        },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

type ToggleRowProps = {
  label: string;
  value: boolean;
  onToggle: (value: boolean) => void;
};

function ToggleRow({ label, value, onToggle }: ToggleRowProps) {
  return (
    <View style={styles.fieldRow}>
      <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: '#555', true: Colors.light.tint }}
        accessibilityLabel={label}
      />
    </View>
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
        maximumTrackTintColor="#555"
        thumbTintColor={Colors.light.tint}
        accessibilityLabel={label}
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
    paddingBottom: 40,
    gap: 16,
  },
  title: {
    marginBottom: 8,
  },
  section: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.35)',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionIcon: {
    fontSize: 18,
  },
  sectionTitle: {
    flex: 1,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    minHeight: 44,
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
  chipRowFull: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  chip: {
    minHeight: 36,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    color: '#ccc',
    fontSize: 13,
  },
  chipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  toggleRow: {
    gap: 0,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 12,
    minHeight: 44,
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
    flexWrap: 'wrap',
  },
  presetInput: {
    flex: 1,
    minWidth: 120,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#555',
    color: '#fff',
    fontSize: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  primaryButton: {
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: Colors.light.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  secondaryButton: {
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#ffffff22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  presetList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  presetChip: {
    minHeight: 36,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetChipText: {
    color: '#fff',
    fontSize: 13,
  },
  filterBanner: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: Colors.light.tint + '33',
    borderWidth: 1,
    borderColor: Colors.light.tint,
    gap: 4,
  },
  filterBannerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  filterBannerCount: {
    color: '#ccc',
    fontSize: 12,
  },
  startButton: {
    marginTop: 8,
    paddingVertical: 16,
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
    fontSize: 16,
  },
  startButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
