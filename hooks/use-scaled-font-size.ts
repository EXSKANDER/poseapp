import { useMemo } from 'react';
import { useUserPreferences } from './use-user-preferences';

const SCALE_FACTORS: Record<string, number> = {
  system: 1,
  small: 0.85,
  medium: 1,
  large: 1.2,
  xlarge: 1.4,
};

/**
 * Returns a function that scales a base font size according to the user's text size preference.
 */
export function useScaledFontSize() {
  const { preferences } = useUserPreferences();
  const scale = SCALE_FACTORS[preferences.textSize] ?? 1;

  return useMemo(
    () => (baseFontSize: number) => Math.round(baseFontSize * scale),
    [scale],
  );
}
