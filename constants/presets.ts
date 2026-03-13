import i18n from '@/i18n';

export type GenderOption = 'male' | 'female' | 'both';

export type ModelStyle = 'solid' | 'muscle' | 'skeleton' | 'forms' | 'coloured-anatomy';

export type GridOverlayDivisions = 'off' | '4' | '9' | '16';

export type BodyRegion =
  | 'head'
  | 'torso'
  | 'left-arm'
  | 'right-arm'
  | 'left-leg'
  | 'right-leg';

export type PerspectiveMode =
  | 'flat'
  | '1-point'
  | '2-point'
  | '3-point'
  | '4-point'
  | 'fisheye';

export type TransitionStyle = 'cut' | 'fade' | 'countdown';

export const ALL_BODY_REGIONS: BodyRegion[] = [
  'head',
  'torso',
  'left-arm',
  'right-arm',
  'left-leg',
  'right-leg',
];

export type SessionConfig = {
  poseDurationSeconds: number;
  poseCount: number;
  breakDurationSeconds: number;
  randomOrder: boolean;
  gender: GenderOption;
  categories: string[];
  showGrid: boolean;
  background: 'dark' | 'mid' | 'light';
  directionalIntensity: number;
  ambientIntensity: number;
  // Phase 5: Display modes
  modelStyle: ModelStyle;
  wireframeOverlay: boolean;
  negativeSpace: boolean;
  gridOverlay: GridOverlayDivisions;
  showBoundingBox: boolean;
  showFloorPlane: boolean;
  showPoseShadow: boolean;
  modelOpacity: number;
  mirrorX: boolean;
  staticMode: boolean;
  selectedBodyRegions: BodyRegion[];
  // Phase 6: Perspective & transitions
  perspectiveMode: PerspectiveMode;
  transitionStyle: TransitionStyle;
  audioCue: boolean;
};

export type SessionPreset = {
  id: string;
  name: string;
  config: SessionConfig;
  isBuiltIn?: boolean;
};

export type PresetLayoutState = {
  order: string[];
  hiddenBuiltInIds: string[];
};

export const PRESETS_STORAGE_KEY = 'poseapp.sessionPresets';

export const PRESET_LAYOUT_STORAGE_KEY = 'poseapp.presetLayout';

export const DEFAULT_SESSION_CONFIG: SessionConfig = {
  poseDurationSeconds: 60,
  poseCount: 10,
  breakDurationSeconds: 0,
  randomOrder: true,
  gender: 'both',
  categories: [],
  showGrid: true,
  background: 'dark',
  directionalIntensity: 1,
  ambientIntensity: 0.4,
  // Phase 5 defaults
  modelStyle: 'solid',
  wireframeOverlay: false,
  negativeSpace: false,
  gridOverlay: 'off',
  showBoundingBox: false,
  showFloorPlane: false,
  showPoseShadow: false,
  modelOpacity: 1,
  mirrorX: false,
  staticMode: false,
  selectedBodyRegions: [...ALL_BODY_REGIONS],
  // Phase 6 defaults
  perspectiveMode: '1-point',
  transitionStyle: 'cut',
  audioCue: false,
};

export const DEFAULT_PRESET_LAYOUT: PresetLayoutState = {
  order: [],
  hiddenBuiltInIds: [],
};

export const BUILTIN_PRESETS: SessionPreset[] = [
  {
    id: 'builtin-30-second-gestures',
    name: i18n.t('practice.preset30SecondGesturesName'),
    isBuiltIn: true,
    config: {
      ...DEFAULT_SESSION_CONFIG,
      poseDurationSeconds: 30,
      poseCount: 20,
      categories: ['full-body'],
      randomOrder: true,
    },
  },
  {
    id: 'builtin-1-minute-poses',
    name: i18n.t('practice.preset1MinutePosesName'),
    isBuiltIn: true,
    config: {
      ...DEFAULT_SESSION_CONFIG,
      poseDurationSeconds: 60,
      poseCount: 10,
      categories: ['full-body'],
      randomOrder: true,
    },
  },
  {
    id: 'builtin-2-minute-poses',
    name: i18n.t('practice.preset2MinutePosesName'),
    isBuiltIn: true,
    config: {
      ...DEFAULT_SESSION_CONFIG,
      poseDurationSeconds: 120,
      poseCount: 10,
      categories: ['full-body'],
      randomOrder: true,
    },
  },
  {
    id: 'builtin-5-minute-study',
    name: i18n.t('practice.preset5MinuteStudyName'),
    isBuiltIn: true,
    config: {
      ...DEFAULT_SESSION_CONFIG,
      poseDurationSeconds: 300,
      poseCount: 5,
      categories: ['full-body'],
      randomOrder: true,
    },
  },
  {
    id: 'builtin-portrait-practice',
    name: i18n.t('practice.presetPortraitPracticeName'),
    isBuiltIn: true,
    config: {
      ...DEFAULT_SESSION_CONFIG,
      poseDurationSeconds: 120,
      poseCount: 10,
      categories: ['portraits'],
      randomOrder: true,
    },
  },
  {
    id: 'builtin-object-sketching',
    name: i18n.t('practice.presetObjectSketchingName'),
    isBuiltIn: true,
    config: {
      ...DEFAULT_SESSION_CONFIG,
      poseDurationSeconds: 180,
      poseCount: 10,
      categories: ['simple objects'],
      randomOrder: true,
    },
  },
];

