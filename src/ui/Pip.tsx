import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

/**
 * Pip the fox, drawn exactly as on the canvas.
 * - peek: sign-in, peeking out of the burrow with a leaf and an acorn
 * - burrow: home, sitting on the burrow floor
 * - plain: check-in, slightly gentler smile
 * - focus: eyes closed, reading a green book
 */
export function Pip({ size = 120, variant = 'plain', label = 'Pip the fox' }: { size?: number; variant?: 'peek' | 'burrow' | 'plain' | 'focus'; label?: string }) {
  const focus = variant === 'focus';
  return (
    <Svg width={size} height={size} viewBox="0 0 240 240" aria-hidden={focus || undefined} aria-label={focus ? undefined : label} role={focus ? undefined : "img"}>
      {variant === 'peek' && (
        <>
          <Path d="M16 214 Q120 120 224 214 Z" fill="#5A3A24" />
          <Path d="M36 214 Q120 140 204 214 Z" fill="#1E120A" />
        </>
      )}
      {variant === 'burrow' && <Ellipse cx="120" cy="214" rx="104" ry="22" fill="#2A190E" />}
      <Path d="M68 110 L80 46 L112 92 Z" fill="#D9652B" />
      <Path d="M172 110 L160 46 L128 92 Z" fill="#D9652B" />
      {!focus && (
        <>
          <Path d="M80 98 L84 64 L102 90 Z" fill="#2A190E" />
          <Path d="M160 98 L156 64 L138 90 Z" fill="#2A190E" />
        </>
      )}
      <Path d="M58 132 Q60 84 120 82 Q180 84 182 132 Q178 176 120 190 Q62 176 58 132 Z" fill="#E07B39" />
      <Path d="M70 140 Q96 150 120 190 Q144 150 170 140 Q160 178 120 192 Q80 178 70 140 Z" fill="#FBF1E4" />
      {focus ? (
        <>
          <Path d="M86 128 Q96 120 106 128" stroke="#2E1B10" strokeWidth={5} fill="none" strokeLinecap="round" />
          <Path d="M134 128 Q144 120 154 128" stroke="#2E1B10" strokeWidth={5} fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <Circle cx="96" cy="128" r="9" fill="#2E1B10" />
          <Circle cx="144" cy="128" r="9" fill="#2E1B10" />
          <Circle cx="99" cy="125" r="3" fill="#FBF1E4" />
          <Circle cx="147" cy="125" r="3" fill="#FBF1E4" />
        </>
      )}
      <Ellipse cx="120" cy="160" rx="9" ry="6.5" fill="#2E1B10" />
      {!focus && (
        <Path
          d={variant === 'plain' ? 'M110 172 Q120 176 130 172' : 'M110 170 Q120 178 130 170'}
          stroke="#2E1B10"
          strokeWidth={3}
          fill="none"
          strokeLinecap="round"
        />
      )}
      {variant === 'peek' && (
        <>
          <Path d="M150 196 q10 -16 24 -10 q-6 12 -24 10 Z" fill="#6A994E" />
          <Circle cx="58" cy="198" r="7" fill="#E8B23A" />
        </>
      )}
      {focus && (
        <>
          <Rect x="70" y="186" width="100" height="40" rx="6" fill="#4E8A3E" />
          <Rect x="118" y="186" width="4" height="40" fill="#2E1B10" />
        </>
      )}
    </Svg>
  );
}
