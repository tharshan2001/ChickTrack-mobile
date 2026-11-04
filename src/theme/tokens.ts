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
  warningBg: '#FBEBD3',
  warningBorder: '#C97F1E',
  danger: '#8E2A20',
} as const;

export const fonts = {
  title: 'SpaceGrotesk_700Bold',
  body: 'IBMPlexSans_400Regular',
  bodyMedium: 'IBMPlexSans_500Medium',
  bodySemiBold: 'IBMPlexSans_600SemiBold',
  mono: 'IBMPlexMono_500Medium',
} as const;

export const radius = { field: 10, card: 10, pill: 6 } as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

/** Card shadow: 0 2px 12px rgba(0,0,0,0.08). */
export const cardShadow = {
  boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
} as const;
