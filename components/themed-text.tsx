import { StyleSheet, Text, type TextProps } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';
import { useScaledFontSize } from '@/hooks/use-scaled-font-size';
import { useUserPreferences } from '@/hooks/use-user-preferences';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  const scale = useScaledFontSize();
  const { preferences } = useUserPreferences();
  const highContrast = preferences.highContrast;

  const scaledStyles = {
    default: { fontSize: scale(16), lineHeight: scale(24) },
    defaultSemiBold: { fontSize: scale(16), lineHeight: scale(24), fontWeight: '600' as const },
    title: { fontSize: scale(32), lineHeight: scale(36), fontWeight: 'bold' as const },
    subtitle: { fontSize: scale(20), fontWeight: 'bold' as const },
    link: { fontSize: scale(16), lineHeight: scale(30), color: '#0a7ea4' },
  };

  return (
    <Text
      style={[
        { color: highContrast ? (color === '#ECEDEE' ? '#ffffff' : '#000000') : color },
        scaledStyles[type],
        style,
      ]}
      accessibilityRole={type === 'title' ? 'header' : undefined}
      {...rest}
    />
  );
}
