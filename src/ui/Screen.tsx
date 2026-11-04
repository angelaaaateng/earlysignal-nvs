import { router, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from './Icon';
import { body, C } from './theme';

/**
 * A phone screen from the canvas. On web it stays phone-width and centred,
 * so the student and parent apps look the same in a browser as on a device.
 */
export function Screen({
  bg,
  children,
  footer,
  contentStyle,
  scroll = true,
}: {
  bg: string;
  children: ReactNode;
  footer?: ReactNode;
  contentStyle?: ViewStyle;
  scroll?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const inner = [{ paddingTop: insets.top + 24, paddingHorizontal: 20, paddingBottom: footer ? 16 : insets.bottom + 32, gap: 16 }, contentStyle];
  return (
    <View style={[styles.outer, { backgroundColor: bg }]}>
      <View style={styles.phone}>
        {scroll ? (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={[{ flexGrow: 1 }, inner]} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        ) : (
          <View style={[{ flex: 1 }, inner]}>{children}</View>
        )}
        {footer}
      </View>
    </View>
  );
}

export interface NavItem {
  label: string;
  icon: IconName;
  href: Href;
}

/** Bottom nav bar, as drawn on the student and parent artboards. */
export function BottomNav({
  label,
  items,
  active,
  activeColor,
  bg,
  border,
}: {
  label: string;
  items: NavItem[];
  active: string;
  activeColor: string;
  bg: string;
  border: string;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      accessibilityRole="tablist"
      aria-label={label}
      style={[styles.nav, { backgroundColor: bg, borderTopColor: border, paddingBottom: Math.max(22, insets.bottom + 8) }]}
    >
      {items.map((it) => {
        const on = it.label === active;
        const color = on ? activeColor : C.muted;
        return (
          <Pressable
            key={it.label}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            aria-selected={on}
            onPress={() => !on && router.replace(it.href)}
            style={styles.navItem}
          >
            <Icon name={it.icon} color={color} />
            <Text style={[body(on ? 800 : 700), { fontSize: 12, color }]}>{it.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export const STUDENT_NAV: NavItem[] = [
  { label: 'Burrow', icon: 'home', href: '/student' },
  { label: 'Quests', icon: 'list', href: '/student/quests' },
  { label: 'Focus', icon: 'timer', href: '/student/focus' },
  { label: 'Me', icon: 'user', href: '/student/me' },
];

export const PARENT_NAV: NavItem[] = [
  { label: 'Summary', icon: 'summary', href: '/parent' },
  { label: 'Help', icon: 'help', href: '/parent/help' },
  { label: 'Account', icon: 'user', href: '/parent/account' },
];

export function StudentNav({ active }: { active: 'Burrow' | 'Quests' | 'Focus' | 'Me' }) {
  return <BottomNav label="Student" items={STUDENT_NAV} active={active} activeColor={C.rust} bg={C.card} border={C.line} />;
}

export function ParentNav({ active }: { active: 'Summary' | 'Help' | 'Account' }) {
  return <BottomNav label="Parent" items={PARENT_NAV} active={active} activeColor={C.greenParent} bg={C.white} border={C.lineParent} />;
}

/** 44×44 back button used on check-in, focus and parent help. */
export function BackButton({ onPress, label, dark }: { onPress: () => void; label: string; dark?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[
        styles.back,
        dark ? { backgroundColor: C.burrow } : { backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
      ]}
    >
      <Icon name="chevronLeft" size={20} color={dark ? C.cream : C.ink} strokeWidth={2.5} />
    </Pressable>
  );
}

/** Go back if there is history (e.g. deep link), else go to a fallback. */
export function goBack(fallback: Href) {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}

const styles = StyleSheet.create({
  outer: { flex: 1, alignItems: 'center' },
  phone: { flex: 1, width: '100%', maxWidth: Platform.OS === 'web' ? 480 : undefined },
  nav: { borderTopWidth: 1, paddingTop: 10, paddingHorizontal: 16, flexDirection: 'row' },
  navItem: { flex: 1, alignItems: 'center', gap: 4, minHeight: 44 },
  back: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
