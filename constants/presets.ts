import { STRINGS } from '@/constants/strings';

export type GenderOption = 'male' | 'female' | 'both';

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
};

export const DEFAULT_PRESET_LAYOUT: PresetLayoutState = {
  order: [],
  hiddenBuiltInIds: [],
};

export const BUILTIN_PRESETS: SessionPreset[] = [
  {
    id: 'builtin-30-second-gestures',
    name: STRINGS.practice.preset30SecondGesturesName,
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
    name: STRINGS.practice.preset1MinutePosesName,
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
    name: STRINGS.practice.preset2MinutePosesName,
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
    name: STRINGS.practice.preset5MinuteStudyName,
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
    name: STRINGS.practice.presetPortraitPracticeName,
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
    name: STRINGS.practice.presetObjectSketchingName,
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

