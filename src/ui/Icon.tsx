import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

/** Stroke icons copied from the canvas (24×24 grid). */
const PATHS = {
  chevronRight: <Path d="M9 6l6 6-6 6" />,
  chevronLeft: <Path d="M15 6l-6 6 6 6" />,
  student: (
    <>
      <Path d="M22 10L12 5 2 10l10 5 10-5z" />
      <Path d="M6 12v5c3 2 9 2 12 0v-5" />
    </>
  ),
  family: (
    <>
      <Circle cx="9" cy="7" r="3" />
      <Circle cx="17" cy="9" r="2.5" />
      <Path d="M3 20c.8-3.5 3.2-5 6-5s5.2 1.5 6 5M15 20c.4-2 1.6-3.5 4-3.5 1.2 0 2.2.4 2.8 1.2" />
    </>
  ),
  monitor: (
    <>
      <Rect x="3" y="4" width="18" height="14" rx="2" />
      <Path d="M8 21h8M12 18v3" />
    </>
  ),
  home: <Path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  list: <Path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />,
  timer: (
    <>
      <Circle cx="12" cy="13" r="8" />
      <Path d="M12 9v4l2 2M10 2h4" />
    </>
  ),
  user: (
    <>
      <Circle cx="12" cy="8" r="4" />
      <Path d="M4 21c1-4 4-6 8-6s7 2 8 6" />
    </>
  ),
  check: <Path d="M5 12l5 5L20 7" />,
  smile: (
    <>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <Path d="M9 9h.01M15 9h.01" />
    </>
  ),
  swords: <Path d="M14.5 17.5L3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2" />,
  bulb: <Path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" />,
  lock: (
    <>
      <Rect x="4" y="11" width="16" height="10" rx="2" />
      <Path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  summary: (
    <>
      <Rect x="4" y="3" width="16" height="18" rx="2" />
      <Path d="M8 8h8M8 12h8M8 16h5" />
    </>
  ),
  help: <Path d="M20 12a8 8 0 1 1-3-6.2L21 4v5h-5" />,
  phone: (
    <Path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
  ),
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 24, color, strokeWidth = 2.2 }: { name: IconName; size?: number; color: string; strokeWidth?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {PATHS[name]}
    </Svg>
  );
}

export function Acorn({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" aria-label="Acorns" role="img">
      <Ellipse cx="8" cy="10" rx="5" ry="5" fill="#C9822F" />
      <Path d="M3 7 Q8 1 13 7 Z" fill="#6B4423" />
    </Svg>
  );
}

export function Flame({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" aria-label="Streak" role="img">
      <Path d="M8 1 C10 5 13 6 13 10 A5 5 0 0 1 3 10 C3 7 5 6 6 3 C7 5 8 5 8 1 Z" fill="#D9652B" />
    </Svg>
  );
}
