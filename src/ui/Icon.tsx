import Svg, { Circle, Path } from 'react-native-svg';

/** Line icons on a 24px grid, 1.75px stroke, round caps (the design system's starter set, extended). */
const PATHS = {
  home: <Path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z" />,
  talk: <Path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-5 4v-4H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />,
  sprout: <Path d="M12 21v-8M12 13c0-4 3-7 8-7-1 5-4 7-8 7zM12 13c0-3-2-6-7-6 1 4 3 6 7 6" />,
  family: (
    <>
      <Circle cx="9" cy="8" r="3" />
      <Circle cx="17" cy="9" r="2.5" />
      <Path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6M15 20c0-2.6 1.6-4.5 4-5" />
    </>
  ),
  calendar: <Path d="M4 6h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zM3 10h18M8 3v5M16 3v5" />,
  car: <Path d="M5 16l1.5-6A2 2 0 0 1 8.4 8.5h7.2a2 2 0 0 1 1.9 1.5L19 16M4 16h16v3H4zM7 19v1.5M17 19v1.5M7.5 13.5h.01M16.5 13.5h.01" />,
  shuffle: <Path d="M3 7h3l9 10h6M3 17h3l3-3.3M15 7h6M18 4l3 3-3 3M18 14l3 3-3 3" />,
  check: <Path d="M5 12.5l4.5 4.5L19 7.5" />,
  arrow: <Path d="M5 12h14M13 6l6 6-6 6" />,
  back: <Path d="M19 12H5M11 6l-6 6 6 6" />,
  plus: <Path d="M12 5v14M5 12h14" />,
  alert: <Path d="M12 3l10 18H2zM12 10v4M12 17.5v.01" />,
  bookmark: <Path d="M6 4h12v17l-6-4-6 4z" />,
  close: <Path d="M6 6l12 12M18 6L6 18" />,
  trash: <Path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" />,
  more: <Path d="M6 12h.01M12 12h.01M18 12h.01" />,
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 24, color, strokeWidth = 1.75 }: { name: IconName; size?: number; color: string; strokeWidth?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {PATHS[name]}
    </Svg>
  );
}
