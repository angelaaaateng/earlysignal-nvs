import { router, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/data/AppStore';
import { Icon, type IconName } from './Icon';
import { C, R, S, shadowLift, shadowSoft, T } from './theme';

/** Phones get a single column and a floating tab bar; a wide browser gets a sidebar and two columns. */
export function useLayout() {
  const { width } = useWindowDimensions();
  const wide = Platform.OS === 'web' && width >= 960;
  return { wide, width };
}

export function Screen({ children, tabs, aside, contentStyle, scroll = true, bg = C.paper, narrow }: { children: ReactNode; tabs?: TabKey; aside?: ReactNode; contentStyle?: ViewStyle; scroll?: boolean; bg?: string; narrow?: boolean }) {
  const insets = useSafeAreaInsets();
  const { wide } = useLayout();
  const { user } = useApp();

  if (wide) {
    const showSidebar = !!tabs || (!!user && !narrow);
    return (
      <View style={[styles.outer, { backgroundColor: bg, flexDirection: 'row', alignItems: 'stretch' }]}>
        {showSidebar && <Sidebar active={tabs} />}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, alignItems: 'center' }} keyboardShouldPersistTaps="handled">
          <View style={[styles.wideBody, narrow && { maxWidth: 640 }, contentStyle && { gap: (contentStyle as { gap?: number }).gap }]}>
            <View style={[styles.wideMain, { gap: (contentStyle as { gap?: number })?.gap ?? S[4] }]}>{children}</View>
            {aside && <View style={[styles.wideAside, { gap: (contentStyle as { gap?: number })?.gap ?? S[4] }]}>{aside}</View>}
          </View>
        </ScrollView>
      </View>
    );
  }

  const inner = [{ paddingTop: insets.top + S[8], paddingHorizontal: S[5], paddingBottom: tabs ? 120 : insets.bottom + S[8], gap: S[4] }, contentStyle];
  const body = (
    <>
      {children}
      {aside}
    </>
  );
  return (
    <View style={[styles.outer, { backgroundColor: bg }]}>
      <View style={styles.phone}>
        {scroll ? (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={[{ flexGrow: 1 }, inner]} keyboardShouldPersistTaps="handled">
            {body}
          </ScrollView>
        ) : (
          <View style={[{ flex: 1 }, inner]}>{body}</View>
        )}
        {tabs && <TabBar active={tabs} />}
      </View>
    </View>
  );
}

export type TabKey = 'Home' | 'Week' | 'Grow' | 'Family';
const TABS: { key: TabKey; icon: IconName; href: Href; hint: string }[] = [
  { key: 'Home', icon: 'home', href: '/home', hint: 'Tonight’s starter' },
  { key: 'Week', icon: 'calendar', href: '/week', hint: 'What’s coming up' },
  { key: 'Grow', icon: 'sprout', href: '/grow', hint: 'Sunday check-in' },
  { key: 'Family', icon: 'family', href: '/family', hint: 'Your kids and account' },
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

/** Desktop navigation: the same four destinations, down the left. */
function Sidebar({ active }: { active?: TabKey }) {
  const { user, signOut } = useApp();
  return (
    <View style={styles.sidebar} accessibilityRole="navigation">
      <Pressable accessibilityRole="link" onPress={() => router.replace('/home')} style={{ paddingHorizontal: S[3], paddingVertical: S[2] }}>
        <Text style={[T.title, { letterSpacing: -1 }]}>Rooted</Text>
        <Text style={T.caption}>Small talks. Deep roots.</Text>
      </Pressable>
      <View accessibilityRole="tablist" style={{ gap: 4, marginTop: S[4] }}>
        {TABS.map((t) => {
          const on = t.key === active;
          return (
            <Pressable key={t.key} accessibilityRole="tab" accessibilityState={{ selected: on }} aria-selected={on} onPress={() => !on && router.replace(t.href)} style={[styles.sideItem, on && { backgroundColor: C.soil }]}>
              <Icon name={t.icon} size={20} color={on ? C.paper : C.soilMuted} />
              <View>
                <Text style={[T.label, { color: on ? C.paper : C.soil }]}>{t.key}</Text>
                <Text style={[T.caption, { color: on ? '#cfc8bf' : C.soilMuted }]}>{t.hint}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <View style={{ flex: 1 }} />
      <View style={{ gap: S[2], paddingHorizontal: S[3] }}>
        <Text style={T.caption}>{user?.displayName}</Text>
        <Pressable accessibilityRole="button" onPress={() => void signOut()} style={{ minHeight: 40, justifyContent: 'center' }}>
          <Text style={[T.label, { color: C.moss }]}>Sign out</Text>
        </Pressable>
        <Text style={[T.caption, { fontSize: 11 }]}>Notes stay on this device.</Text>
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
  sidebar: { width: 272, backgroundColor: C.bubble, margin: S[5], marginRight: 0, borderRadius: R.xl, padding: S[4], ...shadowSoft },
  sideItem: { flexDirection: 'row', alignItems: 'center', gap: S[3], paddingVertical: 10, paddingHorizontal: S[3], borderRadius: R.md, minHeight: 52 },
  wideBody: { width: '100%', maxWidth: 1160, flexDirection: 'row', alignItems: 'flex-start', gap: S[8], paddingVertical: S[12], paddingHorizontal: S[8] },
  wideMain: { flex: 1, minWidth: 0, maxWidth: 680 },
  wideAside: { width: 360 },
});
