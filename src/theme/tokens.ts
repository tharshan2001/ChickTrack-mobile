/** Design tokens taken from the ChickTrack mockups (red accent palette). */
export const colors = {
  accent: '#A2080C',
  accentPressed: '#7E0609',
  tint: '#F5D3B8',
  tintBorder: '#E8B593',
  ink: '#231F20',
  secondary: '#636366',
  surface: '#FFFFFF',
  field: '#F5F5F7',
  separator: '#E5E5EA',
  success: '#2F6F4E',
  successBg: '#E1ECE3',
  successBorder: '#BFD6C5',
  warning: '#7A4B0E',
  warningBg: '#F2E5CC',
  warningBorder: '#E3C891',
  warningDot: '#C97F1E',
  danger: '#8E2A20',
  dangerBg: '#F3E2DE',
  dangerBorder: '#E3BFB7',
} as const;

export const fonts = {
  title: 'SpaceGrotesk_700Bold',
  body: 'IBMPlexSans_400Regular',
  bodyMedium: 'IBMPlexSans_500Medium',
  bodySemiBold: 'IBMPlexSans_600SemiBold',
  mono: 'IBMPlexMono_500Medium',
} as const;

/** Text styles for inputs and controls (Text components use the variants in components/text.tsx). */
export const type = {
  input: { fontFamily: fonts.body, fontSize: 16, lineHeight: 22 },
  inputMedium: { fontFamily: fonts.bodyMedium, fontSize: 16, lineHeight: 22 },
  inputMono: { fontFamily: fonts.mono, fontSize: 16, lineHeight: 22 },
  inputMonoLarge: { fontFamily: fonts.mono, fontSize: 20, lineHeight: 26 },
  inputMonoMid: { fontFamily: fonts.mono, fontSize: 18, lineHeight: 24 },
  inputMonoHuge: { fontFamily: fonts.mono, fontSize: 22, lineHeight: 28 },
  inputCompact: { fontFamily: fonts.body, fontSize: 15, lineHeight: 20 },
  inputMonoSmall: { fontFamily: fonts.mono, fontSize: 15, lineHeight: 20 },
  textarea: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21 },
  search: { fontFamily: fonts.body, fontSize: 15, lineHeight: 20 },
  control: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  controlActive: { fontFamily: fonts.bodySemiBold, fontSize: 13, lineHeight: 18 },
  tab: { fontFamily: fonts.bodyMedium, fontSize: 11 },
  tabActive: { fontFamily: fonts.bodySemiBold, fontSize: 11 },
} as const;

export const radius = { field: 10, card: 10, pill: 6 } as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

/** Card shadow: 0 2px 12px rgba(0,0,0,0.08). */
export const cardShadow = {
  boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
} as const;
