import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useApp } from '@/data/AppStore';
import { Icon, type IconName } from '@/ui/Icon';
import { Pip } from '@/ui/Pip';
import { Screen } from '@/ui/Screen';
import { body, C, display } from '@/ui/theme';

/** Canvas 0 · Sign in (pick a role). Mock auth: each card signs in a demo account. */
export default function SignIn() {
  const { signInAs } = useApp();

  return (
    <Screen bg={C.burrow} contentStyle={{ paddingTop: 56, paddingHorizontal: 24, gap: 20 }}>
      <View style={{ alignItems: 'center', gap: 10 }}>
        <Pip size={150} variant="peek" label="Pip the fox peeking out of a burrow" />
        <Text accessibilityRole="header" style={[display(800), { fontSize: 40, color: C.cream, letterSpacing: -0.4 }]}>
          EarlySignal<Text style={{ color: C.gold }}>.</Text>
        </Text>
        <Text style={[body(400), { fontSize: 16, color: C.creamMuted, maxWidth: 290, textAlign: 'center' }]}>
          Better study habits for kids. Calm, early signals for families.
        </Text>
      </View>

      <View style={{ flexGrow: 1 }} />

      <Text accessibilityRole="header" style={[display(700), { fontSize: 20, color: C.cream }]}>
        Who’s signing in?
      </Text>
      <View style={{ gap: 12 }}>
        <RoleCard onPress={() => signInAs('student')} title="I’m a student" sub="Go to your Burrow" icon="student" variant="gold" />
        <RoleCard onPress={() => signInAs('parent')} title="I’m a parent" sub="Your weekly summary" icon="family" variant="paper" />
        <RoleCard onPress={() => signInAs('admin')} title="School or clinic admin" sub="Partner dashboard" icon="monitor" variant="outline" />
      </View>
      <Text style={[body(400), { fontSize: 13, color: C.creamMuted, textAlign: 'center' }]}>
        Under 13? A parent sets up your account first.
      </Text>
    </Screen>
  );
}

function RoleCard({ title, sub, icon, variant, onPress }: { title: string; sub: string; icon: IconName; variant: 'gold' | 'paper' | 'outline'; onPress: () => void }) {
  const v = {
    gold: { bg: C.gold, fg: C.ink, sub: C.ink, chip: C.ink, chipIcon: C.gold, chev: C.ink },
    paper: { bg: C.card, fg: C.ink, sub: C.muted, chip: C.greenSoft, chipIcon: C.greenParent, chev: C.muted },
    outline: { bg: 'transparent', fg: C.cream, sub: C.creamMuted, chip: C.burrowEdge, chipIcon: C.cream, chev: C.creamMuted },
  }[variant];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.card,
        { backgroundColor: v.bg },
        variant === 'outline' && { borderWidth: 1.5, borderColor: C.burrowLine, paddingVertical: 14 },
      ]}
    >
      <View style={[styles.chip, { backgroundColor: v.chip }]}>
        <Icon name={icon} size={22} color={v.chipIcon} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[body(800), { fontSize: 17, color: v.fg }]}>{title}</Text>
        <Text style={[body(variant === 'gold' ? 600 : 400), { fontSize: 13, color: v.sub }]}>{sub}</Text>
      </View>
      <Icon name="chevronRight" size={20} color={v.chev} strokeWidth={2.5} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, paddingVertical: 16, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 44 },
  chip: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
