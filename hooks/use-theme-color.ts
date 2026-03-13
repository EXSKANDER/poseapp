/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUserPreferences } from '@/hooks/use-user-preferences';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  const systemScheme = useColorScheme() ?? 'light';
  const { preferences } = useUserPreferences();
  const theme =
    preferences.theme === 'system' ? systemScheme : preferences.theme;
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return Colors[theme][colorName];
  }
}
