import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
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
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import { ThemedView } from '@/components/themed-view';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import {
  ALL_BODY_REGIONS,
  type BodyRegion,
  type GridOverlayDivisions,
  type ModelStyle,
  type PerspectiveMode,
  type TransitionStyle,
} from '@/constants/presets';
import {
  playChangeChime,
  playSessionEndSound,
  configureAudio,
  unloadSounds,
} from '@/utils/audio';

const FALLBACK_DURATION_SECONDS = 60;
const SESSION_DATES_STORAGE_KEY = 'poseapp.sessionStartDates';
const AUTO_HIDE_DELAY = 3000;

type ViewerSessionConfig = {
  poseDurationSeconds?: number;
  poseCount?: number;
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
  // Phase 6
  perspectiveMode?: PerspectiveMode;
  transitionStyle?: TransitionStyle;
  audioCue?: boolean;
};

export default function ViewerScreen() {
  const { t } = useTranslation();

  const MODEL_STYLES: { key: ModelStyle; label: string }[] = [
    { key: 'solid', label: t('viewer.modelStyleSolid') },
    { key: 'muscle', label: t('viewer.modelStyleMuscle') },
    { key: 'skeleton', label: t('viewer.modelStyleSkeleton') },
    { key: 'forms', label: t('viewer.modelStyleForms') },
    { key: 'coloured-anatomy', label: t('viewer.modelStyleColouredAnatomy') },
  ];

  const GRID_OPTIONS: { key: GridOverlayDivisions; label: string }[] = [
    { key: 'off', label: t('viewer.gridOverlayOff') },
    { key: '4', label: t('viewer.gridOverlay4') },
    { key: '9', label: t('viewer.gridOverlay9') },
    { key: '16', label: t('viewer.gridOverlay16') },
  ];

  const PERSPECTIVE_MODES: { key: PerspectiveMode; label: string }[] = [
    { key: 'flat', label: t('viewer.perspectiveFlat') },
    { key: '1-point', label: t('viewer.perspective1Point') },
    { key: '2-point', label: t('viewer.perspective2Point') },
    { key: '3-point', label: t('viewer.perspective3Point') },
    { key: '4-point', label: t('viewer.perspective4Point') },
    { key: 'fisheye', label: t('viewer.perspectiveFisheye') },
  ];

  const BODY_REGION_LABELS: Record<BodyRegion, string> = {
    head: t('viewer.regionHead'),
    torso: t('viewer.regionTorso'),
    'left-arm': t('viewer.regionLeftArm'),
    'right-arm': t('viewer.regionRightArm'),
    'left-leg': t('viewer.regionLeftLeg'),
    'right-leg': t('viewer.regionRightLeg'),
  };
  const { preferences: userPrefs } = useUserPreferences();
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
  const totalPoses = parsedConfig?.poseCount ?? 1;
  const transitionStyle: TransitionStyle = parsedConfig?.transitionStyle ?? 'cut';
  const audioCueEnabled = parsedConfig?.audioCue ?? false;

  // Session state
  const [currentPoseIndex, setCurrentPoseIndex] = useState(0);
  const [remaining, setRemaining] = useState(initialDuration);
  const [isPlaying, setIsPlaying] = useState(!isFreeStudy);
  const [sessionComplete, setSessionComplete] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Transition state
  const [sceneOpacity, setSceneOpacity] = useState(1);
  const [countdownNumber, setCountdownNumber] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const countdownAnim = useRef(new Animated.Value(1)).current;

  // Auto-hide overlay
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [overlayVisible, setOverlayVisible] = useState(true);

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

  // Phase 6
  const [perspectiveMode, setPerspectiveMode] = useState<PerspectiveMode>(
    parsedConfig?.perspectiveMode ?? '1-point',
  );

  // Toolbar collapsed/expanded
  const [toolbarOpen, setToolbarOpen] = useState(false);

  const viewerBackground =
    parsedConfig?.background === 'light'
      ? '#e0e0e0'
      : parsedConfig?.background === 'mid'
        ? '#3a3a3a'
        : '#2c2c2c';

  // Initialize audio
  useEffect(() => {
    if (audioCueEnabled) {
      configureAudio();
    }
    return () => {
      unloadSounds();
    };
  }, [audioCueEnabled]);

  // Auto-hide overlay logic
  const resetAutoHide = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (!overlayVisible) {
      setOverlayVisible(true);
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
    hideTimerRef.current = setTimeout(() => {
      if (!toolbarOpen) {
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }).start(() => setOverlayVisible(false));
      }
    }, AUTO_HIDE_DELAY);
  }, [overlayVisible, overlayOpacity, toolbarOpen]);

  useEffect(() => {
    if (!isFreeStudy && isPlaying) {
      resetAutoHide();
    }
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [isPlaying, isFreeStudy, resetAutoHide]);

  const handleViewerTouch = useCallback(() => {
    resetAutoHide();
  }, [resetAutoHide]);

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

  // Transition logic
  const performTransition = useCallback(
    async (nextIndex: number) => {
      if (isTransitioning) return;
      setIsTransitioning(true);
      setIsPlaying(false);

      if (audioCueEnabled) {
        if (nextIndex >= totalPoses) {
          playSessionEndSound();
        } else {
          playChangeChime();
        }
      }

      if (nextIndex >= totalPoses) {
        setSessionComplete(true);
        setIsTransitioning(false);
        return;
      }

      if (transitionStyle === 'fade') {
        // Fade out
        const fadeSteps = 10;
        for (let i = fadeSteps; i >= 0; i--) {
          setSceneOpacity(i / fadeSteps);
          await delay(25);
        }
        // Swap pose
        setCurrentPoseIndex(nextIndex);
        setRemaining(initialDuration);
        await delay(50);
        // Fade in
        for (let i = 0; i <= fadeSteps; i++) {
          setSceneOpacity(i / fadeSteps);
          await delay(25);
        }
        setIsPlaying(true);
        setIsTransitioning(false);
      } else if (transitionStyle === 'countdown') {
        // Countdown 3, 2, 1
        for (let n = 3; n >= 1; n--) {
          setCountdownNumber(n);
          countdownAnim.setValue(1);
          Animated.timing(countdownAnim, {
            toValue: 0.4,
            duration: 800,
            useNativeDriver: true,
          }).start();
          await delay(1000);
        }
        setCountdownNumber(null);
        setCurrentPoseIndex(nextIndex);
        setRemaining(initialDuration);
        setIsPlaying(true);
        setIsTransitioning(false);
      } else {
        // Cut - immediate
        setCurrentPoseIndex(nextIndex);
        setRemaining(initialDuration);
        setIsPlaying(true);
        setIsTransitioning(false);
      }
    },
    [
      isTransitioning,
      transitionStyle,
      audioCueEnabled,
      totalPoses,
      initialDuration,
      countdownAnim,
    ],
  );

  // Timer
  useEffect(() => {
    if (isFreeStudy) return;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (isPlaying && !isTransitioning) {
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
  }, [isPlaying, isFreeStudy, isTransitioning]);

  // When timer hits 0, transition to next pose
  useEffect(() => {
    if (remaining === 0 && !isFreeStudy && !isTransitioning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      performTransition(currentPoseIndex + 1);
    }
  }, [remaining, isFreeStudy, isTransitioning, currentPoseIndex, performTransition]);

  const handleTogglePlay = () => {
    if (sessionComplete) return;
    if (remaining === 0) {
      setRemaining(initialDuration);
    }
    setIsPlaying((prev) => !prev);
    resetAutoHide();
  };

  const handleSkip = () => {
    if (isTransitioning) return;
    performTransition(currentPoseIndex + 1);
    resetAutoHide();
  };

  const handlePrevious = () => {
    if (isTransitioning || currentPoseIndex <= 0) return;
    setCurrentPoseIndex(currentPoseIndex - 1);
    setRemaining(initialDuration);
    setIsPlaying(true);
    resetAutoHide();
  };

  const handleClose = () => {
    router.back();
  };

  const toggleBodyRegion = (region: BodyRegion) => {
    setSelectedBodyRegions((prev) => {
      if (prev.includes(region)) {
        if (prev.length <= 1) return prev;
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
    ? params.poseName || t('viewer.freeStudyTitle')
    : t('viewer.poseCounter', { current: currentPoseIndex + 1, total: totalPoses });

  const progressFraction = totalPoses > 1 ? currentPoseIndex / totalPoses : 0;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* 3D / 2D Viewport */}
        <TouchableOpacity
          style={styles.viewerContainer}
          activeOpacity={1}
          onPress={handleViewerTouch}
          accessible={false}
        >
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
              perspectiveMode={perspectiveMode}
              sceneOpacity={sceneOpacity}
            />
          )}

          {/* Countdown overlay */}
          {countdownNumber !== null && (
            <View style={styles.countdownOverlay} pointerEvents="none">
              <Animated.Text
                style={[
                  styles.countdownText,
                  { opacity: countdownAnim, transform: [{ scale: countdownAnim }] },
                ]}
              >
                {countdownNumber}
              </Animated.Text>
            </View>
          )}

          {/* PAUSED indicator */}
          {!isFreeStudy && !isPlaying && !isTransitioning && !sessionComplete && (
            <View style={styles.pausedOverlay} pointerEvents="none">
              <View style={styles.pausedBadge}>
                <Text style={styles.pausedText}>{t('viewer.paused')}</Text>
              </View>
            </View>
          )}

          {/* Session complete overlay */}
          {sessionComplete && (
            <View style={styles.sessionCompleteOverlay}>
              <Text style={styles.sessionCompleteText}>
                {t('viewer.sessionComplete')}
              </Text>
              <TouchableOpacity
                style={styles.sessionCompleteButton}
                onPress={handleClose}
                accessibilityLabel="Return to home"
              >
                <Text style={styles.sessionCompleteButtonText}>
                  {t('viewer.back')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>

        {/* Top bar - auto-hides */}
        <Animated.View
          style={[styles.topBar, { opacity: overlayOpacity }]}
          pointerEvents={overlayVisible ? 'auto' : 'none'}
        >
          <TouchableOpacity
            onPress={handleClose}
            style={styles.topButton}
            accessibilityLabel={isFreeStudy ? 'Go back' : 'Close session'}
            accessibilityRole="button"
          >
            <Text style={styles.topButtonText}>
              {isFreeStudy ? t('viewer.back') : t('viewer.close')}
            </Text>
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>
            {displayTitle}
          </Text>
          <TouchableOpacity
            onPress={() => {
              setToolbarOpen((prev) => !prev);
              resetAutoHide();
            }}
            style={styles.topButton}
            accessibilityLabel="Toggle toolbar"
            accessibilityRole="button"
          >
            <Text style={styles.topButtonText}>{t('viewer.toolbarToggle')}</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Progress bar */}
        {!isFreeStudy && totalPoses > 1 && (
          <View style={styles.progressBarContainer} pointerEvents="none">
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.min(100, progressFraction * 100)}%` },
                ]}
              />
            </View>
            {/* Dot indicators */}
            <View style={styles.progressDots}>
              {Array.from({ length: Math.min(totalPoses, 20) }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.progressDot,
                    i <= currentPoseIndex && styles.progressDotActive,
                  ]}
                />
              ))}
            </View>
          </View>
        )}

        {/* Bottom panel - auto-hides */}
        <Animated.View
          style={[styles.bottomPanel, { opacity: overlayOpacity }]}
          pointerEvents={overlayVisible ? 'auto' : 'none'}
        >
          {/* Timer & session controls */}
          {!isFreeStudy && (
            <>
              <View style={styles.timerRow}>
                <Text style={styles.timerLabel}>{t('viewer.timerLabel')}</Text>
                <Text style={styles.timerValue}>
                  {minutes}:{seconds}
                </Text>
              </View>
              <View style={styles.controlsRow}>
                <TouchableOpacity
                  onPress={handlePrevious}
                  style={[
                    styles.controlButton,
                    styles.controlButtonSecondary,
                    currentPoseIndex <= 0 && styles.controlButtonDisabled,
                  ]}
                  disabled={currentPoseIndex <= 0 || isTransitioning}
                  accessibilityLabel="Previous pose"
                  accessibilityRole="button"
                >
                  <Text style={styles.controlButtonText}>Prev</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleTogglePlay}
                  style={styles.controlButton}
                  accessibilityLabel={isPlaying ? 'Pause timer' : 'Play timer'}
                  accessibilityRole="button"
                >
                  <Text style={styles.controlButtonText}>
                    {isPlaying ? t('viewer.pause') : t('viewer.play')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSkip}
                  style={[
                    styles.controlButton,
                    styles.controlButtonSecondary,
                    isTransitioning && styles.controlButtonDisabled,
                  ]}
                  disabled={isTransitioning}
                  accessibilityLabel="Skip to next pose"
                  accessibilityRole="button"
                >
                  <Text style={styles.controlButtonText}>{t('viewer.skip')}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Lighting sliders (always visible) */}
          <View style={styles.slidersContainer}>
            <View style={styles.sliderRow}>
              <Text style={styles.sliderLabel}>{t('viewer.directionalLight')}</Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={2}
                value={directionalIntensity}
                onValueChange={setDirectionalIntensity}
                minimumTrackTintColor={Colors.light.tint}
                maximumTrackTintColor="#666"
                thumbTintColor={Colors.light.tint}
                accessibilityLabel="Directional light intensity"
              />
            </View>
            <View style={styles.sliderRow}>
              <Text style={styles.sliderLabel}>{t('viewer.ambientLight')}</Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={2}
                value={ambientIntensity}
                onValueChange={setAmbientIntensity}
                minimumTrackTintColor={Colors.light.tint}
                maximumTrackTintColor="#666"
                thumbTintColor={Colors.light.tint}
                accessibilityLabel="Ambient light intensity"
              />
            </View>
            <View style={styles.sliderRow}>
              <Text style={styles.sliderLabel}>{t('sessionConfig.showGridLabel')}</Text>
              <TouchableOpacity
                onPress={() => setShowGrid((prev) => !prev)}
                style={styles.toggleButton}
                accessibilityLabel={`Ground grid ${showGrid ? 'on' : 'off'}`}
                accessibilityRole="switch"
              >
                <Text style={styles.toggleButtonText}>
                  {showGrid ? t('common.on') : t('common.off')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Expanded toolbar */}
          {toolbarOpen && (
            <ScrollView style={styles.toolbarScroll} nestedScrollEnabled>
              {/* Perspective Mode */}
              <Text style={styles.toolbarSectionLabel}>
                {t('viewer.perspectiveModeLabel')}
              </Text>
              <View style={styles.chipRow}>
                {PERSPECTIVE_MODES.map(({ key, label }) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.chip,
                      perspectiveMode === key && styles.chipSelected,
                    ]}
                    onPress={() => setPerspectiveMode(key)}
                    accessibilityLabel={`Perspective mode: ${label}`}
                    accessibilityRole="button"
                  >
                    <Text style={styles.chipText}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Model Style */}
              <Text style={styles.toolbarSectionLabel}>
                {t('viewer.modelStyleLabel')}
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
                    accessibilityLabel={`Model style: ${label}`}
                    accessibilityRole="button"
                  >
                    <Text style={styles.chipText}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Toggles row */}
              <View style={styles.togglesGrid}>
                <ToolbarToggle
                  label={t('viewer.wireframeOverlay')}
                  value={wireframeOverlay}
                  onToggle={() => setWireframeOverlay((p) => !p)}
                />
                <ToolbarToggle
                  label={t('viewer.negativeSpaceMode')}
                  value={negativeSpace}
                  onToggle={() => setNegativeSpace((p) => !p)}
                />
                <ToolbarToggle
                  label={t('viewer.showBoundingBox')}
                  value={showBoundingBox}
                  onToggle={() => setShowBoundingBox((p) => !p)}
                />
                <ToolbarToggle
                  label={t('viewer.showFloorPlane')}
                  value={showFloorPlane}
                  onToggle={() => setShowFloorPlane((p) => !p)}
                />
                <ToolbarToggle
                  label={t('viewer.showPoseShadow')}
                  value={showPoseShadow}
                  onToggle={() => setShowPoseShadow((p) => !p)}
                />
                <ToolbarToggle
                  label={t('viewer.mirrorLabel')}
                  value={mirrorX}
                  onToggle={() => setMirrorX((p) => !p)}
                />
                <ToolbarToggle
                  label={t('viewer.staticModeLabel')}
                  value={staticMode}
                  onToggle={() => setStaticMode((p) => !p)}
                />
              </View>

              {/* Grid overlay */}
              <Text style={styles.toolbarSectionLabel}>
                {t('viewer.gridOverlayLabel')}
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
                    accessibilityLabel={`Grid overlay: ${label}`}
                    accessibilityRole="button"
                  >
                    <Text style={styles.chipText}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Opacity slider */}
              <View style={styles.sliderRow}>
                <Text style={styles.sliderLabel}>
                  {t('viewer.modelOpacityLabel')}
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
                  accessibilityLabel="Model opacity"
                />
              </View>

              {/* Body region selection */}
              <Text style={styles.toolbarSectionLabel}>
                {t('viewer.limbSelectionLabel')}
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
                    accessibilityLabel={`Body region: ${BODY_REGION_LABELS[region]}`}
                    accessibilityRole="button"
                  >
                    <Text style={styles.chipText}>
                      {BODY_REGION_LABELS[region]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}
        </Animated.View>
      </SafeAreaView>
    </ThemedView>
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
      accessibilityLabel={`${label} ${value ? 'on' : 'off'}`}
      accessibilityRole="switch"
    >
      <Text style={styles.togglePillText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  safeArea: {
    flex: 1,
  },
  // Top bar
  topBar: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 10,
  },
  topButton: {
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  // Progress bar
  progressBarContainer: {
    position: 'absolute',
    top: 96,
    left: 16,
    right: 16,
    zIndex: 10,
    gap: 6,
  },
  progressBarTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.light.tint,
    borderRadius: 2,
  },
  progressDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  progressDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  progressDotActive: {
    backgroundColor: Colors.light.tint,
  },
  // Viewer
  viewerContainer: {
    flex: 1,
  },
  // Countdown overlay
  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  countdownText: {
    fontSize: 120,
    fontWeight: '900',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 12,
  },
  // Paused
  pausedOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pausedBadge: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  pausedText: {
    fontSize: 28,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 4,
  },
  // Session complete
  sessionCompleteOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    gap: 24,
  },
  sessionCompleteText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
  },
  sessionCompleteButton: {
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: Colors.light.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionCompleteButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  // Bottom panel
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 32,
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 10,
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
    fontSize: 24,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginBottom: 12,
    gap: 8,
  },
  controlButton: {
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: Colors.light.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonSecondary: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  controlButtonDisabled: {
    opacity: 0.4,
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
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#ffffff22',
    alignItems: 'center',
    justifyContent: 'center',
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
    minHeight: 32,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#666',
    backgroundColor: '#ffffff11',
    alignItems: 'center',
    justifyContent: 'center',
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
    minHeight: 32,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#555',
    backgroundColor: '#ffffff11',
    alignItems: 'center',
    justifyContent: 'center',
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
