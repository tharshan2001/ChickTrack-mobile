import { Text as RNText, type TextProps } from 'react-native';

import { colors, fonts } from '@/theme/tokens';

type Variant = 'largeTitle' | 'title' | 'body' | 'bodyMedium' | 'caption' | 'label' | 'mono' | 'monoLarge';

const variants = {
  largeTitle: { fontFamily: fonts.title, fontSize: 28, lineHeight: 34, letterSpacing: -0.28, color: colors.ink },
  title: { fontFamily: fonts.title, fontSize: 22, lineHeight: 28, color: colors.ink },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.ink },
  bodyMedium: { fontFamily: fonts.bodyMedium, fontSize: 15, lineHeight: 21, color: colors.ink },
  caption: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, letterSpacing: 0.3, color: colors.secondary },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    letterSpacing: 0.3,
    color: colors.secondary,
    textTransform: 'uppercase',
  },
  mono: { fontFamily: fonts.mono, fontSize: 15, color: colors.ink },
  monoLarge: { fontFamily: fonts.mono, fontSize: 22, color: colors.ink },
} as const;

export function Text({ variant = 'body', style, ...rest }: TextProps & { variant?: Variant }) {
  return <RNText {...rest} style={[variants[variant], style]} />;
}
