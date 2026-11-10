import type { TextStyle } from 'react-native';

/**
 * Rooted tokens (Daylight theme), from the design system. Names match the
 * token names there so a designer and an engineer mean the same thing.
 */
export const C = {
  paper: '#f6f4f0',
  paperSunk: '#eeeae3',
  bubble: '#ffffff',
  oat: '#ebe5dc',
  soil: '#1f1a16',
  soilMuted: '#665d55',
  bark: '#7a4a2b',
  onBark: '#ffffff',
  barkTint: '#f3e8dd',
  trunk: '#33251c',
  onTrunk: '#f6f4f0',
  trunkRaised: '#47352a',
  moss: '#1b7044',
  onMoss: '#ffffff',
  sprout: '#ddf2e3',
  canopy: '#123a28',
  onCanopy: '#f6f4f0',
  canopyRaised: '#1d4d37',
  sage: '#9fcfae',
  spark: '#c5ef6a',
  onSpark: '#1f1a16',
  sparkTint: '#effad6',
  rust: '#b03a22',
  rustTint: '#fbe6e0',
} as const;

export const R = { tail: 6, sm: 12, md: 16, lg: 24, xl: 32, pill: 999 } as const;
export const S = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 12: 48 } as const;

/** Elevation: a faint ring plus a soft blur. RN web gets the real shadow; native gets elevation. */
export const shadowSoft = { shadowColor: '#1f1a16', shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 2 } as const;
export const shadowLift = { shadowColor: '#1f1a16', shadowOpacity: 0.14, shadowRadius: 40, shadowOffset: { width: 0, height: 18 }, elevation: 8 } as const;

const JAK: Record<400 | 500 | 600 | 700 | 800, string> = {
  400: 'PlusJakartaSans_400Regular',
  500: 'PlusJakartaSans_500Medium',
  600: 'PlusJakartaSans_600SemiBold',
  700: 'PlusJakartaSans_700Bold',
  800: 'PlusJakartaSans_800ExtraBold',
};
const MONO = 'GeistMono_500Medium';

/** Type styles, named as in the design system. */
export const T = {
  display: { fontFamily: JAK[800], fontSize: 36, lineHeight: 40, letterSpacing: -1.08, color: C.soil } as TextStyle,
  title: { fontFamily: JAK[700], fontSize: 26, lineHeight: 32, letterSpacing: -0.52, color: C.soil } as TextStyle,
  heading: { fontFamily: JAK[700], fontSize: 20, lineHeight: 26, letterSpacing: -0.2, color: C.soil } as TextStyle,
  stat: { fontFamily: JAK[800], fontSize: 32, lineHeight: 36, letterSpacing: -0.64, color: C.soil, fontVariant: ['tabular-nums'] } as TextStyle,
  subhead: { fontFamily: JAK[700], fontSize: 17, lineHeight: 24, color: C.soil } as TextStyle,
  body: { fontFamily: JAK[400], fontSize: 16, lineHeight: 24, color: C.soil } as TextStyle,
  bodySm: { fontFamily: JAK[500], fontSize: 14, lineHeight: 20, color: C.soilMuted } as TextStyle,
  label: { fontFamily: JAK[700], fontSize: 15, lineHeight: 20, color: C.soil } as TextStyle,
  caption: { fontFamily: JAK[500], fontSize: 13, lineHeight: 18, color: C.soilMuted } as TextStyle,
  overline: { fontFamily: MONO, fontSize: 12, lineHeight: 16, letterSpacing: 0.96, textTransform: 'uppercase', color: C.soilMuted } as TextStyle,
  monoSm: { fontFamily: MONO, fontSize: 13, lineHeight: 18, color: C.soilMuted } as TextStyle,
} as const;

export const FONTS = { ...Object.fromEntries(Object.values(JAK).map((f) => [f, f])), [MONO]: MONO };
