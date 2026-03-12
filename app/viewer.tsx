import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import Slider from '@react-native-community/slider';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Viewer3D } from '@/components/Viewer3D';
import { Static2DViewer } from '@/components/Static2DViewer';
import { STRINGS } from '@/constants/strings';
import { Colors } from '@/constants/theme';
import { ThemedView } from '@/components/themed-view';
import {
  ALL_BODY_REGIONS,
  type BodyRegion,
  type GridOverlayDivisions,
  type ModelStyle,
} from '@/constants/presets';

const FALLBACK_DURATION_SECONDS = 60;
const SESSION_DATES_STORAGE_KEY = 'poseapp.sessionStartDates';

type ViewerSessionConfig = {
  poseDurationSeconds?: number;
  directionalIntensity?: number;
  ambientIntensity?: number;
  showGrid?: boolean;
  background?: 'dark' | 'mid' | 'light';
  // Phase 5
  modelStyle?: ModelStyle;
  wireframeOverlay?: boolean;
  negativeSpace?: boolean;
  gridOverlay?: GridOverlayDivisions;
  showBoundingBox?: boolean;
  showFloorPlane?: boolean;
  showPoseShadow?: boolean;
  modelOpacity?: number;
  mirrorX?: boolean;
  staticMode?: boolean;
  selectedBodyRegions?: BodyRegion[];
};

const MODEL_STYLES: { key: ModelStyle; label: string }[] = [
  { key: 'solid', label: STRINGS.viewer.modelStyleSolid },
  { key: 'muscle', label: STRINGS.viewer.modelStyleMuscle },
  { key: 'skeleton', label: STRINGS.viewer.modelStyleSkeleton },
  { key: 'forms', label: STRINGS.viewer.modelStyleForms },
  { key: 'coloured-anatomy', label: STRINGS.viewer.modelStyleColouredAnatomy },
];

const GRID_OPTIONS: { key: GridOverlayDivisions; label: string }[] = [
  { key: 'off', label: STRINGS.viewer.gridOverlayOff },
  { key: '4', label: STRINGS.viewer.gridOverlay4 },
  { key: '9', label: STRINGS.viewer.gridOverlay9 },
  { key: '16', label: STRINGS.viewer.gridOverlay16 },
];

const BODY_REGION_LABELS: Record<BodyRegion, string> = {
  head: STRINGS.viewer.regionHead,
  torso: STRINGS.viewer.regionTorso,
  'left-arm': STRINGS.viewer.regionLeftArm,
  'right-arm': STRINGS.viewer.regionRightArm,
  'left-leg': STRINGS.viewer.regionLeftLeg,
  'right-leg': STRINGS.viewer.regionRightLeg,
};

export default function ViewerScreen() {
  useKeepAwake();

  const router = useRouter();
  const params = useLocalSearchParams<{
    config?: string;
    mode?: string;
    poseId?: string;
    poseName?: string;
  }>();

  const isFreeStudy = params.mode === 'free-study';

  const parsedConfig: ViewerSessionConfig | null = useMemo(() => {
    if (!params.config || typeof params.config !== 'string') {
      return null;
    }
    try {
      return JSON.parse(params.config) as ViewerSessionConfig;
    } catch {
      return null;
    }
  }, [params.config]);

  const initialDuration = parsedConfig?.poseDurationSeconds ?? FALLBACK_DURATION_SECONDS;

  // Timer state
  const [remaining, setRemaining] = useState(initialDuration);
  const [isPlaying, setIsPlaying] = useState(!isFreeStudy);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Lighting
  const [directionalIntensity, setDirectionalIntensity] = useState(
    parsedConfig?.directionalIntensity ?? 1,
  );
  const [ambientIntensity, setAmbientIntensity] = useState(
    parsedConfig?.ambientIntensity ?? 0.4,
  );
  const [showGrid, setShowGrid] = useState(parsedConfig?.showGrid ?? true);

  // Phase 5 display state
  const [modelStyle, setModelStyle] = useState<ModelStyle>(
    parsedConfig?.modelStyle ?? 'solid',
  );
  const [wireframeOverlay, setWireframeOverlay] = useState(
    parsedConfig?.wireframeOverlay ?? false,
  );
  const [negativeSpace, setNegativeSpace] = useState(
    parsedConfig?.negativeSpace ?? false,
  );
  const [gridOverlay, setGridOverlay] = useState<GridOverlayDivisions>(
    parsedConfig?.gridOverlay ?? 'off',
  );
  const [showBoundingBox, setShowBoundingBox] = useState(
    parsedConfig?.showBoundingBox ?? false,
  );
  const [showFloorPlane, setShowFloorPlane] = useState(
    parsedConfig?.showFloorPlane ?? false,
  );
  const [showPoseShadow, setShowPoseShadow] = useState(
    parsedConfig?.showPoseShadow ?? false,
  );
  const [modelOpacity, setModelOpacity] = useState(
    parsedConfig?.modelOpacity ?? 1,
  );
  const [mirrorX, setMirrorX] = useState(parsedConfig?.mirrorX ?? false);
  const [staticMode, setStaticMode] = useState(parsedConfig?.staticMode ?? false);
  const [selectedBodyRegions, setSelectedBodyRegions] = useState<BodyRegion[]>(
    parsedConfig?.selectedBodyRegions ?? [...ALL_BODY_REGIONS],
  );

  // Toolbar collapsed/expanded
  const [toolbarOpen, setToolbarOpen] = useState(false);

  const viewerBackground =
    parsedConfig?.background === 'light'
      ? '#e0e0e0'
      : parsedConfig?.background === 'mid'
        ? '#3a3a3a'
        : '#2c2c2c';

  // Record session start
  useEffect(() => {
    if (isFreeStudy) return;

    const recordSessionStart = async () => {
      const today = new Date();
      const dateKey = today.toISOString().slice(0, 10);

      try {
        const stored = await AsyncStorage.getItem(SESSION_DATES_STORAGE_KEY);
        const dates: string[] = stored ? JSON.parse(stored) : [];

        if (!dates.includes(dateKey)) {
          const nextDates = [...dates, dateKey];
          await AsyncStorage.setItem(SESSION_DATES_STORAGE_KEY, JSON.stringify(nextDates));
        }
      } catch {
        // ignore
      }
    };

    recordSessionStart();
  }, [isFreeStudy]);

  // Timer
  useEffect(() => {
    if (isFreeStudy) return;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) return 0;
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, isFreeStudy]);

  useEffect(() => {
    if (remaining === 0 && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      setIsPlaying(false);
    }
  }, [remaining]);

  const handleTogglePlay = () => {
    if (remaining === 0) setRemaining(initialDuration);
    setIsPlaying((prev) => !prev);
  };

  const handleSkip = () => {
    setRemaining(initialDuration);
  };

  const handleClose = () => {
    router.back();
  };

  const toggleBodyRegion = (region: BodyRegion) => {
    setSelectedBodyRegions((prev) => {
      if (prev.includes(region)) {
        if (prev.length <= 1) return prev; // keep at least one
        return prev.filter((r) => r !== region);
      }
      return [...prev, region];
    });
  };

  const minutes = Math.floor(remaining / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (remaining % 60).toString().padStart(2, '0');

  const displayTitle = isFreeStudy
    ? params.poseName || STRINGS.viewer.freeStudyTitle
    : STRINGS.viewer.title;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={handleClose} style={styles.topButton}>
            <Text style={styles.topButtonText}>
              {isFreeStudy ? STRINGS.viewer.back : STRINGS.viewer.close}
            </Text>
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>
            {displayTitle}
          </Text>
          <TouchableOpacity
            onPress={() => setToolbarOpen((prev) => !prev)}
            style={styles.topButton}
          >
            <Text style={styles.topButtonText}>{STRINGS.viewer.toolbarToggle}</Text>
          </TouchableOpacity>
        </View>

        {/* 3D / 2D Viewport */}
        <View style={styles.viewerContainer}>
          {staticMode ? (
            <Static2DViewer backgroundColor={viewerBackground} />
          ) : (
            <Viewer3D
              directionalIntensity={directionalIntensity}
              ambientIntensity={ambientIntensity}
              showGrid={showGrid}
              backgroundColor={viewerBackground}
              modelStyle={modelStyle}
              wireframeOverlay={wireframeOverlay}
              negativeSpace={negativeSpace}
              gridOverlay={gridOverlay}
              showBoundingBox={showBoundingBox}
              showFloorPlane={showFloorPlane}
              showPoseShadow={showPoseShadow}
              modelOpacity={modelOpacity}
              mirrorX={mirrorX}
              selectedBodyRegions={selectedBodyRegions}
            />
          )}
        </View>

        {/* Bottom panel */}
        <View style={styles.bottomPanel}>
          {/* Timer & session controls */}
          {!isFreeStudy && (
            <>
              <View style={styles.timerRow}>
                <Text style={styles.timerLabel}>{STRINGS.viewer.timerLabel}</Text>
                <Text style={styles.timerValue}>
                  {minutes}:{seconds}
                </Text>
              </View>
              <View style={styles.controlsRow}>
                <TouchableOpacity onPress={handleTogglePlay} style={styles.controlButton}>
                  <Text style={styles.controlButtonText}>
                    {isPlaying ? STRINGS.viewer.pause : STRINGS.viewer.play}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSkip} style={styles.controlButton}>
                  <Text style={styles.controlButtonText}>{STRINGS.viewer.skip}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Lighting sliders (always visible) */}
          <View style={styles.slidersContainer}>
            <View style={styles.sliderRow}>
              <Text style={styles.sliderLabel}>{STRINGS.viewer.directionalLight}</Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={2}
                value={directionalIntensity}
                onValueChange={setDirectionalIntensity}
                minimumTrackTintColor={Colors.light.tint}
                maximumTrackTintColor="#666"
                thumbTintColor={Colors.light.tint}
              />
            </View>
            <View style={styles.sliderRow}>
              <Text style={styles.sliderLabel}>{STRINGS.viewer.ambientLight}</Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={2}
                value={ambientIntensity}
                onValueChange={setAmbientIntensity}
                minimumTrackTintColor={Colors.light.tint}
                maximumTrackTintColor="#666"
                thumbTintColor={Colors.light.tint}
              />
            </View>
            <View style={styles.sliderRow}>
              <Text style={styles.sliderLabel}>{STRINGS.sessionConfig.showGridLabel}</Text>
              <TouchableOpacity
                onPress={() => setShowGrid((prev) => !prev)}
                style={styles.toggleButton}
              >
                <Text style={styles.toggleButtonText}>
                  {showGrid ? STRINGS.common.on : STRINGS.common.off}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Expanded toolbar */}
          {toolbarOpen && (
            <ScrollView style={styles.toolbarScroll} nestedScrollEnabled>
              {/* Model Style */}
              <Text style={styles.toolbarSectionLabel}>
                {STRINGS.viewer.modelStyleLabel}
              </Text>
              <View style={styles.chipRow}>
                {MODEL_STYLES.map(({ key, label }) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.chip,
                      modelStyle === key && styles.chipSelected,
                    ]}
                    onPress={() => setModelStyle(key)}
                  >
                    <Text style={styles.chipText}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Toggles row */}
              <View style={styles.togglesGrid}>
                <ToolbarToggle
                  label={STRINGS.viewer.wireframeOverlay}
                  value={wireframeOverlay}
                  onToggle={() => setWireframeOverlay((p) => !p)}
                />
                <ToolbarToggle
                  label={STRINGS.viewer.negativeSpaceMode}
                  value={negativeSpace}
                  onToggle={() => setNegativeSpace((p) => !p)}
                />
                <ToolbarToggle
                  label={STRINGS.viewer.showBoundingBox}
                  value={showBoundingBox}
                  onToggle={() => setShowBoundingBox((p) => !p)}
                />
                <ToolbarToggle
                  label={STRINGS.viewer.showFloorPlane}
                  value={showFloorPlane}
                  onToggle={() => setShowFloorPlane((p) => !p)}
                />
                <ToolbarToggle
                  label={STRINGS.viewer.showPoseShadow}
                  value={showPoseShadow}
                  onToggle={() => setShowPoseShadow((p) => !p)}
                />
                <ToolbarToggle
                  label={STRINGS.viewer.mirrorLabel}
                  value={mirrorX}
                  onToggle={() => setMirrorX((p) => !p)}
                />
                <ToolbarToggle
                  label={STRINGS.viewer.staticModeLabel}
                  value={staticMode}
                  onToggle={() => setStaticMode((p) => !p)}
                />
              </View>

              {/* Grid overlay */}
              <Text style={styles.toolbarSectionLabel}>
                {STRINGS.viewer.gridOverlayLabel}
              </Text>
              <View style={styles.chipRow}>
                {GRID_OPTIONS.map(({ key, label }) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.chip,
                      gridOverlay === key && styles.chipSelected,
                    ]}
                    onPress={() => setGridOverlay(key)}
                  >
                    <Text style={styles.chipText}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Opacity slider */}
              <View style={styles.sliderRow}>
                <Text style={styles.sliderLabel}>
                  {STRINGS.viewer.modelOpacityLabel}
                </Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0.05}
                  maximumValue={1}
                  value={modelOpacity}
                  onValueChange={setModelOpacity}
                  minimumTrackTintColor={Colors.light.tint}
                  maximumTrackTintColor="#666"
                  thumbTintColor={Colors.light.tint}
                />
              </View>

              {/* Body region selection */}
              <Text style={styles.toolbarSectionLabel}>
                {STRINGS.viewer.limbSelectionLabel}
              </Text>
              <View style={styles.chipRow}>
                {ALL_BODY_REGIONS.map((region) => (
                  <TouchableOpacity
                    key={region}
                    style={[
                      styles.chip,
                      selectedBodyRegions.includes(region) && styles.chipSelected,
                    ]}
                    onPress={() => toggleBodyRegion(region)}
                  >
                    <Text style={styles.chipText}>
                      {BODY_REGION_LABELS[region]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

type ToolbarToggleProps = {
  label: string;
  value: boolean;
  onToggle: () => void;
};

function ToolbarToggle({ label, value, onToggle }: ToolbarToggleProps) {
  return (
    <TouchableOpacity
      style={[styles.togglePill, value && styles.togglePillActive]}
      onPress={onToggle}
    >
      <Text style={styles.togglePillText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  topButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#00000055',
  },
  topButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  viewerContainer: {
    flex: 1,
  },
  bottomPanel: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#00000088',
  },
  timerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timerLabel: {
    color: '#fff',
    fontSize: 14,
  },
  timerValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginBottom: 12,
  },
  controlButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: Colors.light.tint,
  },
  controlButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  slidersContainer: {
    gap: 8,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sliderLabel: {
    width: 140,
    color: '#fff',
    fontSize: 12,
  },
  slider: {
    flex: 1,
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#ffffff22',
  },
  toggleButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  // Toolbar styles
  toolbarScroll: {
    maxHeight: 280,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#ffffff22',
    paddingTop: 12,
  },
  toolbarSectionLabel: {
    color: '#ccc',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#666',
    backgroundColor: '#ffffff11',
  },
  chipSelected: {
    backgroundColor: Colors.light.tint,
    borderColor: Colors.light.tint,
  },
  chipText: {
    color: '#fff',
    fontSize: 11,
  },
  togglesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    marginBottom: 4,
  },
  togglePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#555',
    backgroundColor: '#ffffff11',
  },
  togglePillActive: {
    backgroundColor: Colors.light.tint + 'aa',
    borderColor: Colors.light.tint,
  },
  togglePillText: {
    color: '#fff',
    fontSize: 11,
  },
});
