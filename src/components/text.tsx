import { Platform, Text as RNText, type TextProps } from 'react-native';

import { colors, fonts } from '@/theme/tokens';

/**
 * The app's type scale. Every text style comes from here; screens pick a variant
 * instead of setting font sizes. Sizes follow the mockups (Space Grotesk titles,
 * IBM Plex Sans body, IBM Plex Mono numbers).
 */
const variants = {
  display: { fontFamily: fonts.title, fontSize: 34, lineHeight: 40, letterSpacing: -0.68, color: colors.ink },
  largeTitle: { fontFamily: fonts.title, fontSize: 28, lineHeight: 34, letterSpacing: -0.28, color: colors.ink },
  title: { fontFamily: fonts.title, fontSize: 22, lineHeight: 28, color: colors.ink },
  headline: { fontFamily: fonts.bodyMedium, fontSize: 16, lineHeight: 22, color: colors.ink },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.ink },
  bodyMedium: { fontFamily: fonts.bodyMedium, fontSize: 15, lineHeight: 21, color: colors.ink },
  subhead: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.secondary },
  caption: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, letterSpacing: 0.3, color: colors.secondary },
  footnote: { fontFamily: fonts.body, fontSize: 12, lineHeight: 16, color: colors.secondary },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.3,
    color: colors.secondary,
    textTransform: 'uppercase',
  },
  labelSmall: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.3,
    color: colors.secondary,
    textTransform: 'uppercase',
  },
  numLarge: { fontFamily: fonts.mono, fontSize: 28, lineHeight: 34, color: colors.ink },
  numBig: { fontFamily: fonts.mono, fontSize: 30, lineHeight: 36, letterSpacing: -0.6, color: colors.ink },
  numMoney: { fontFamily: fonts.mono, fontSize: 20, lineHeight: 26, color: colors.ink },
  numDisplay: { fontFamily: fonts.mono, fontSize: 34, lineHeight: 40, letterSpacing: -0.68, color: colors.ink },
  numTitle: { fontFamily: fonts.mono, fontSize: 22, lineHeight: 28, color: colors.ink },
  num: { fontFamily: fonts.mono, fontSize: 18, lineHeight: 24, color: colors.ink },
  numTile: { fontFamily: fonts.mono, fontSize: 17, lineHeight: 24, color: colors.ink },
  monoTitle: { fontFamily: fonts.mono, fontSize: 24, lineHeight: 32, letterSpacing: -0.3, color: colors.ink },
  mono: { fontFamily: fonts.mono, fontSize: 15, lineHeight: 21, color: colors.ink },
  monoSmall: { fontFamily: fonts.mono, fontSize: 13, lineHeight: 18, color: colors.ink },
  badge: {
    fontFamily: fonts.mono,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
} as const;

export type Variant = keyof typeof variants;

/** Big figures must stay on one line, so they grow less with the phone's text size. */
const NUMBER_VARIANTS: ReadonlySet<Variant> = new Set([
  'num',
  'numTitle',
  'numLarge',
  'numBig',
  'numMoney',
  'numDisplay',
  'badge',
]);

/** Text follows the phone's text-size setting, up to a limit the layouts are built for. */
export const MAX_FONT_SCALE = 1.4;
const MAX_NUMBER_SCALE = 1.15;

/** Android adds extra padding above custom fonts; removing it centres text in buttons and pills. */
export const androidText = Platform.OS === 'android' ? ({ includeFontPadding: false, textAlignVertical: 'center' } as const) : {};

export function Text({ variant = 'body', style, maxFontSizeMultiplier, ...rest }: TextProps & { variant?: Variant }) {
  return (
    <RNText
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? (NUMBER_VARIANTS.has(variant) ? MAX_NUMBER_SCALE : MAX_FONT_SCALE)}
      {...rest}
      style={[variants[variant], androidText, style]}
    />
  );
}
