import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { body, C } from './theme';

/** Shared form bits so every screen's inputs and buttons look the same. */
export function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  secure?: boolean;
  keyboardType?: 'email-address' | 'number-pad' | 'default';
  autoCapitalize?: 'none' | 'words' | 'sentences' | 'characters';
  dark?: boolean;
  hint?: string;
  maxLength?: number;
  textContentType?: 'password' | 'emailAddress' | 'name' | 'username' | 'newPassword' | 'oneTimeCode' | 'none';
  autoFocus?: boolean;
}) {
  const dark = props.dark ?? true;
  return (
    <View style={{ gap: 6 }}>
      <Text style={[body(800), { fontSize: 14, color: dark ? C.cream : C.ink }]}>{props.label}</Text>
      <TextInput
        accessibilityLabel={props.label}
        value={props.value}
        onChangeText={props.onChange}
        placeholder={props.placeholder}
        placeholderTextColor={C.faint}
        secureTextEntry={props.secure}
        keyboardType={props.keyboardType}
        autoCapitalize={props.autoCapitalize ?? 'none'}
        autoCorrect={false}
        autoFocus={props.autoFocus}
        maxLength={props.maxLength}
        textContentType={props.textContentType ?? (props.secure ? 'password' : 'none')}
        style={[body(400), styles.input, dark ? styles.inputDark : styles.inputLight]}
      />
      {!!props.hint && <Text style={[body(400), { fontSize: 12, color: dark ? C.creamMuted : C.muted }]}>{props.hint}</Text>}
    </View>
  );
}

export function Button({ label, onPress, disabled, variant = 'primary', tone = 'student' }: { label: string; onPress: () => void; disabled?: boolean; variant?: 'primary' | 'secondary' | 'ghost'; tone?: 'student' | 'parent' | 'gold' }) {
  const fill = tone === 'parent' ? C.greenParent : tone === 'gold' ? C.gold : C.fox;
  const fg = tone === 'gold' ? C.ink : C.white;
  const style = variant === 'primary' ? { backgroundColor: fill } : variant === 'secondary' ? { borderWidth: 1.5, borderColor: fill } : {};
  const color = variant === 'primary' ? fg : tone === 'gold' ? C.gold : fill;
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress} style={[styles.btn, style, disabled && { opacity: 0.5 }]}>
      <Text style={[body(800), { fontSize: 16, color }]}>{label}</Text>
    </Pressable>
  );
}

export function ErrorText({ children, dark }: { children: string; dark?: boolean }) {
  if (!children) return null;
  return (
    <Text accessibilityRole="alert" style={[body(700), { fontSize: 14, color: dark ? C.gold : C.rustDeep, textAlign: 'center' }]}>
      {children}
    </Text>
  );
}

export function Check({ checked, onToggle, label, dark }: { checked: boolean; onToggle: () => void; label: string; dark?: boolean }) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} aria-checked={checked} onPress={onToggle} style={styles.checkRow}>
      <View style={[styles.checkBox, checked ? { backgroundColor: C.gold, borderColor: C.gold } : { borderColor: dark ? C.burrowLine : C.faint }]}>
        {checked && <Text style={[body(800), { fontSize: 14, color: C.ink }]}>✓</Text>}
      </View>
      <Text style={[body(600), { fontSize: 15, color: dark ? C.cream : C.ink, flex: 1 }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  input: { fontSize: 16, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1.5, minHeight: 48 },
  inputDark: { borderColor: C.burrowLine, backgroundColor: C.burrowDeep, color: C.cream },
  inputLight: { borderColor: C.line, backgroundColor: C.card, color: C.ink },
  btn: { borderRadius: 18, padding: 15, alignItems: 'center', minHeight: 50, justifyContent: 'center' },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  checkBox: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
