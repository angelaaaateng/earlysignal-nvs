import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type ViewStyle } from 'react-native';
import { Icon, type IconName } from './Icon';
import { C, R, S, shadowSoft, T } from './theme';

/** Rooted components, mirroring the design system bundle. */

type Variant = 'primary' | 'soft' | 'bark' | 'spark' | 'quiet' | 'danger' | 'onCanopy';
const FILL: Record<Variant, { bg: string; fg: string }> = {
  primary: { bg: C.moss, fg: C.onMoss },
  soft: { bg: C.oat, fg: C.soil },
  bark: { bg: C.bark, fg: C.onBark },
  spark: { bg: C.spark, fg: C.onSpark },
  quiet: { bg: 'transparent', fg: C.moss },
  danger: { bg: C.rustTint, fg: C.rust },
  onCanopy: { bg: C.canopyRaised, fg: C.onCanopy },
};

export function Button({ label, onPress, variant = 'primary', icon, size = 'md', disabled, busy, block, style }: { label: string; onPress: () => void; variant?: Variant; icon?: IconName; size?: 'sm' | 'md' | 'lg'; disabled?: boolean; busy?: boolean; block?: boolean; style?: ViewStyle }) {
  const f = FILL[variant];
  const h = size === 'sm' ? 40 : size === 'lg' ? 56 : 48;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled || !!busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [styles.btn, { backgroundColor: f.bg, minHeight: h, paddingHorizontal: size === 'sm' ? 14 : 20, opacity: disabled ? 0.45 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }, block && { alignSelf: 'stretch' }, variant === 'primary' && shadowSoft, style]}
    >
      {busy ? <ActivityIndicator color={f.fg} /> : icon ? <Icon name={icon} size={20} color={f.fg} /> : null}
      <Text style={[T.label, { color: f.fg }]}>{label}</Text>
    </Pressable>
  );
}

export function Chip({ label, selected, onPress, tone = 'oat', icon }: { label: string; selected?: boolean; onPress?: () => void; tone?: 'oat' | 'moss' | 'bark' | 'spark'; icon?: IconName }) {
  const bg = selected ? C.moss : tone === 'moss' ? C.sprout : tone === 'bark' ? C.barkTint : tone === 'spark' ? C.sparkTint : C.oat;
  const fg = selected ? C.onMoss : tone === 'bark' ? C.bark : C.soil;
  return (
    <Pressable accessibilityRole={onPress ? 'button' : undefined} accessibilityState={onPress ? { selected: !!selected } : undefined} aria-pressed={onPress ? !!selected : undefined} onPress={onPress} disabled={!onPress} style={[styles.chip, { backgroundColor: bg }]}>
      {icon && <Icon name={icon} size={18} color={fg} />}
      <Text style={[T.label, { fontSize: 14, color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function KidChip({ name, detail, selected, onPress, tone = 'bark' }: { name: string; detail: string; selected?: boolean; onPress?: () => void; tone?: 'bark' | 'moss' }) {
  const disc = tone === 'bark' ? C.bark : C.moss;
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: !!selected }} aria-pressed={!!selected} accessibilityLabel={`${name}, ${detail}`} onPress={onPress} style={[styles.kid, { backgroundColor: selected ? C.sprout : C.bubble }, !selected && shadowSoft]}>
      <View style={[styles.avatar, { backgroundColor: disc }]}>
        <Text style={[T.label, { color: C.onBark }]}>{name.slice(0, 1).toUpperCase()}</Text>
      </View>
      <View>
        <Text style={T.label}>{name}</Text>
        <Text style={T.caption}>{detail}</Text>
      </View>
    </Pressable>
  );
}

/** The signature speech-bubble card. `tone="moss"` paints canopy (the hero), `bark` paints trunk (saved notes). */
export function PromptCard({ tone = 'bubble', eyebrow, topic, meta, question, tip, tipIcon = 'car', tail = 'left', actions, children }: { tone?: 'bubble' | 'moss' | 'bark'; eyebrow?: string; topic?: string; meta?: string; question: string; tip?: string; tipIcon?: IconName; tail?: 'left' | 'right'; actions?: ReactNode; children?: ReactNode }) {
  const dark = tone !== 'bubble';
  const bg = tone === 'moss' ? C.canopy : tone === 'bark' ? C.trunk : C.bubble;
  const raised = tone === 'moss' ? C.canopyRaised : tone === 'bark' ? C.trunkRaised : C.paperSunk;
  const fg = dark ? C.onCanopy : C.soil;
  const muted = dark ? (tone === 'moss' ? '#bfd9c9' : '#d8c8ba') : C.soilMuted;
  const radius = { borderTopLeftRadius: R.lg, borderTopRightRadius: R.lg, borderBottomLeftRadius: tail === 'left' ? R.tail : R.lg, borderBottomRightRadius: tail === 'right' ? R.tail : R.lg };
  return (
    <View style={[styles.card, radius, { backgroundColor: bg }, !dark && shadowSoft]}>
      {(eyebrow || topic || meta) && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: S[2] }}>
          <Text style={[T.overline, { color: tone === 'moss' ? C.spark : muted }]}>{eyebrow ?? topic}</Text>
          {!!meta && <Text style={[T.monoSm, { color: muted }]}>{meta}</Text>}
        </View>
      )}
      <Text accessibilityRole="header" style={[T.title, { color: fg }]}>
        {question}
      </Text>
      {!!tip && (
        <View style={[styles.tip, { backgroundColor: raised }]}>
          <Icon name={tipIcon} size={18} color={fg} />
          <Text style={[T.bodySm, { color: dark ? fg : C.soilMuted, flex: 1 }]}>{tip}</Text>
        </View>
      )}
      {children}
      {actions && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S[2] }}>{actions}</View>}
    </View>
  );
}

export function StatTile({ label, value, note }: { label: string; value: string | number; note?: string }) {
  const word = typeof value === 'string' && !/^[\d.,]+/.test(value);
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}${note ? `, ${note}` : ''}`}>
      <Text style={T.overline}>{label}</Text>
      <Text style={[T.stat, word && { fontSize: 22, lineHeight: 28 }]}>{value}</Text>
      {!!note && <Text style={T.caption}>{note}</Text>}
    </View>
  );
}

export function WeekRow({ title, note, days }: { title: string; note?: string; days: { label: string; name: string; state: 'talked' | 'today' | 'open'; count?: number }[] }) {
  return (
    <View style={[styles.bubble, shadowSoft]}>
      <Text style={T.subhead}>{title}</Text>
      {!!note && <Text style={T.bodySm}>{note}</Text>}
      <View style={{ flexDirection: 'row', gap: S[2], marginTop: S[1] }}>
        {days.map((d, i) => {
          const bg = d.state === 'talked' ? C.moss : d.state === 'today' ? C.spark : C.oat;
          const fg = d.state === 'talked' ? C.onMoss : d.state === 'today' ? C.onSpark : C.soilMuted;
          return (
            <View key={i} accessible accessibilityLabel={`${d.name}${d.state === 'today' ? ', today' : ''}${d.state === 'talked' ? `, ${d.count ?? 1} talk${(d.count ?? 1) > 1 ? 's' : ''}` : ''}`} style={[styles.day, { backgroundColor: bg }]}>
              <Text style={[T.overline, { color: fg, letterSpacing: 0 }]}>{d.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const OUTCOMES: { key: 'not_tonight' | 'wrong_moment' | 'few_words' | 'good_talk' | 'really_talked'; label: string; seed: number }[] = [
  { key: 'not_tonight', label: 'Not tonight', seed: 6 },
  { key: 'wrong_moment', label: 'Wrong moment', seed: 8 },
  { key: 'few_words', label: 'A few words', seed: 10 },
  { key: 'good_talk', label: 'Good talk', seed: 14 },
  { key: 'really_talked', label: 'We really talked', seed: 18 },
];

/** Four growing seeds for "How did it go?". A radio group; "Not tonight" is a valid answer. */
export function CheckIn({ value, onChange, question = 'How did it go?' }: { value?: string; onChange: (v: (typeof OUTCOMES)[number]['key']) => void; question?: string }) {
  return (
    <View accessibilityRole="radiogroup" style={{ gap: S[3] }}>
      <Text style={T.subhead}>{question}</Text>
      <View style={{ flexDirection: 'row', gap: S[2] }}>
        {OUTCOMES.map((o) => {
          const on = value === o.key;
          return (
            <Pressable key={o.key} accessibilityRole="radio" accessibilityState={{ checked: on }} aria-checked={on} accessibilityLabel={o.label} onPress={() => onChange(o.key)} style={[styles.pod, { backgroundColor: on ? C.moss : C.oat }]}>
              <View style={{ width: o.seed, height: o.seed, borderRadius: R.pill, backgroundColor: on ? C.onMoss : C.moss }} />
              <Text style={[T.caption, { fontSize: 12, lineHeight: 15, color: on ? C.onMoss : C.soil, textAlign: 'center' }]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function TextField({ label, value, onChange, placeholder, secure, multiline, keyboardType, autoCapitalize, hint, error, textContentType, autoFocus, maxLength }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; secure?: boolean; multiline?: boolean; keyboardType?: 'email-address' | 'number-pad' | 'default'; autoCapitalize?: 'none' | 'words' | 'sentences'; hint?: string; error?: string; textContentType?: 'password' | 'emailAddress' | 'name' | 'newPassword' | 'none'; autoFocus?: boolean; maxLength?: number }) {
  return (
    <View style={{ gap: S[2] }}>
      <Text style={T.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={C.soilMuted}
        secureTextEntry={secure}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? (secure || keyboardType === 'email-address' ? 'none' : 'sentences')}
        autoCorrect={!secure}
        autoFocus={autoFocus}
        maxLength={maxLength}
        textContentType={textContentType}
        style={[T.body, styles.field, multiline && { minHeight: 96, textAlignVertical: 'top' }, !!error && { backgroundColor: C.rustTint }]}
      />
      {!!error && (
        <View style={{ flexDirection: 'row', gap: S[2], alignItems: 'center' }}>
          <Icon name="alert" size={16} color={C.rust} />
          <Text accessibilityRole="alert" style={[T.bodySm, { color: C.rust }]}>{error}</Text>
        </View>
      )}
      {!error && !!hint && <Text style={T.bodySm}>{hint}</Text>}
    </View>
  );
}

export function ErrorLine({ children }: { children: string }) {
  if (!children) return null;
  return (
    <View style={{ flexDirection: 'row', gap: S[2], alignItems: 'center', backgroundColor: C.rustTint, padding: S[3], borderRadius: R.md }}>
      <Icon name="alert" size={18} color={C.rust} />
      <Text accessibilityRole="alert" style={[T.bodySm, { color: C.rust, flex: 1 }]}>{children}</Text>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.bubble, shadowSoft, style]}>{children}</View>;
}

export function Loading() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: S[6] }} accessibilityLabel="Loading">
      <ActivityIndicator color={C.moss} />
    </View>
  );
}

export function LoadError({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', gap: S[3] }} accessibilityRole="alert">
      <Text style={T.heading}>That didn’t load</Text>
      <Text style={T.body}>{error.message}</Text>
      <Button label="Try again" variant="soft" onPress={retry} style={{ alignSelf: 'flex-start' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: S[2], borderRadius: R.pill, paddingVertical: 12 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: 14, borderRadius: R.pill, minHeight: 40 },
  kid: { flexDirection: 'row', alignItems: 'center', gap: S[3], paddingVertical: 8, paddingLeft: 8, paddingRight: 16, borderRadius: R.pill, minHeight: 56 },
  avatar: { width: 40, height: 40, borderRadius: R.pill, alignItems: 'center', justifyContent: 'center' },
  card: { padding: S[5], gap: S[3] },
  tip: { flexDirection: 'row', gap: S[2], alignItems: 'flex-start', padding: S[3], borderRadius: R.md },
  stat: { flex: 1, minWidth: 140, backgroundColor: C.bubble, borderRadius: R.md, padding: S[4], gap: 6, ...shadowSoft },
  bubble: { backgroundColor: C.bubble, borderRadius: R.lg, padding: S[5], gap: S[2] },
  day: { flex: 1, aspectRatio: 1, borderRadius: R.sm, alignItems: 'center', justifyContent: 'center' },
  pod: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 8, paddingVertical: 12, paddingHorizontal: 2, borderRadius: R.md, minHeight: 84 },
  field: { backgroundColor: C.paperSunk, borderRadius: R.md, paddingVertical: 13, paddingHorizontal: 16, minHeight: 48 },
});
