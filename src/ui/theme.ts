/** Tokens lifted from the Claude Design canvas. Hex values are exact. */
export const C = {
  // Burrow (dark)
  burrow: '#3A2416',
  burrowDeep: '#2A1B12',
  burrowEdge: '#5A3A24',
  burrowLine: '#6B4A33',
  ink: '#2E1B10',
  // Paper (light)
  paper: '#F7EFE4',
  paperParent: '#FBF6EE',
  card: '#FFF9F1',
  white: '#FFFFFF',
  line: '#E4D3BF',
  lineParent: '#E9DCCB',
  lineSoft: '#EFE3D3',
  muted: '#6B5444',
  muted2: '#4A3A2E',
  faint: '#A8957F',
  cream: '#FBF1E4',
  creamMuted: '#E2CDB8',
  // Accents
  fox: '#D9652B',
  foxSoft: '#F9DCC8',
  foxLine: '#F0C3A3',
  rust: '#A8471A',
  rustDeep: '#7E3412',
  gold: '#E8B23A',
  goldSoft: '#F8E8BF',
  goldInk: '#6B4A12',
  goldInk2: '#5C4310',
  green: '#4E8A3E',
  greenParent: '#3B6E2E',
  greenDeep: '#2C5422',
  greenSoft: '#DCEBD2',
} as const;

type Weight = 400 | 600 | 700 | 800;

const BODY: Record<Weight, string> = {
  400: 'NunitoSans_400Regular',
  600: 'NunitoSans_600SemiBold',
  700: 'NunitoSans_700Bold',
  800: 'NunitoSans_800ExtraBold',
};
const DISPLAY: Record<Exclude<Weight, 400>, string> = {
  600: 'BricolageGrotesque_600SemiBold',
  700: 'BricolageGrotesque_700Bold',
  800: 'BricolageGrotesque_800ExtraBold',
};

/** Nunito Sans, the canvas body face. */
export const body = (w: Weight = 400) => ({ fontFamily: BODY[w] });
/** Bricolage Grotesque, the canvas display face. 650/750 in the canvas map to 600/700. */
export const display = (w: 600 | 700 | 800 = 800) => ({ fontFamily: DISPLAY[w] });

/** The canvas's small uppercase eyebrow label. */
export const eyebrow = (color: string, size = 13) => ({
  ...body(800),
  fontSize: size,
  letterSpacing: size * 0.12,
  textTransform: 'uppercase' as const,
  color,
});
