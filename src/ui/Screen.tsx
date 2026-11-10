import { router, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from './Icon';
import { C, R, S, shadowLift, T } from './theme';

/** A phone screen. On web it stays phone-width and centred. */
export function Screen({ children, tabs, contentStyle, scroll = true, bg = C.paper }: { children: ReactNode; tabs?: TabKey; contentStyle?: ViewStyle; scroll?: boolean; bg?: string }) {
  const insets = useSafeAreaInsets();
  const inner = [{ paddingTop: insets.top + S[8], paddingHorizontal: S[5], paddingBottom: tabs ? 120 : insets.bottom + S[8], gap: S[4] }, contentStyle];
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
        {tabs && <TabBar active={tabs} />}
      </View>
    </View>
  );
}

export type TabKey = 'Home' | 'Week' | 'Grow' | 'Family';
const TABS: { key: TabKey; icon: IconName; href: Href }[] = [
  { key: 'Home', icon: 'home', href: '/home' },
  { key: 'Week', icon: 'calendar', href: '/week' },
  { key: 'Grow', icon: 'sprout', href: '/grow' },
  { key: 'Family', icon: 'family', href: '/family' },
];

/** Floating pill navigation (design system TabBar). The active tab inverts to soil. */
export function TabBar({ active }: { active: TabKey }) {
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={[styles.tabWrap, { bottom: Math.max(S[5], insets.bottom + S[2]) }]}>
      <View accessibilityRole="tablist" style={styles.tabBar}>
        {TABS.map((t) => {
          const on = t.key === active;
          return (
            <Pressable key={t.key} accessibilityRole="tab" accessibilityState={{ selected: on }} aria-selected={on} onPress={() => !on && router.replace(t.href)} style={[styles.tab, on && { backgroundColor: C.soil }]}>
              <Icon name={t.icon} size={20} color={on ? C.paper : C.soilMuted} />
              <Text style={[T.caption, { color: on ? C.paper : C.soilMuted }]}>{t.key}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function BackButton({ onPress, label, onDark }: { onPress: () => void; label: string; onDark?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={[styles.back, { backgroundColor: onDark ? C.canopyRaised : C.oat }]}>
      <Icon name="back" size={20} color={onDark ? C.onCanopy : C.soil} />
    </Pressable>
  );
}

export function goBack(fallback: Href) {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}

const styles = StyleSheet.create({
  outer: { flex: 1, alignItems: 'center' },
  phone: { flex: 1, width: '100%', maxWidth: Platform.OS === 'web' ? 480 : undefined },
  tabWrap: { position: 'absolute', left: S[5], right: S[5], alignItems: 'center' },
  tabBar: { flexDirection: 'row', backgroundColor: C.bubble, borderRadius: R.pill, padding: 6, gap: 4, ...shadowLift },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 14, borderRadius: R.pill, minHeight: 44 },
  back: { width: 44, height: 44, borderRadius: R.pill, alignItems: 'center', justifyContent: 'center' },
});
