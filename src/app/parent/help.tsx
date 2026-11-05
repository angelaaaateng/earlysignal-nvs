import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLoad } from '@/data/AppStore';
import type { HelpContact } from '@/domain/types';
import { Icon } from '@/ui/Icon';
import { useParent } from '@/ui/parent';
import { BackButton, goBack, ParentNav, Screen } from '@/ui/Screen';
import { body, C, display, eyebrow } from '@/ui/theme';

/** Canvas P2 · Parent: get human help. */
export default function ParentHelp() {
  const { studentId } = useParent();
  const loaded = useLoad<HelpContact[]>((b, s) => (studentId ? b.helpContacts(s, studentId) : Promise.resolve([])), [studentId]);
  const opts = loaded.data ?? [];
  const [picked, setPicked] = useState(0);
  const [copied, setCopied] = useState(false);
  const cur = opts[picked];

  return (
    <Screen bg={C.paperParent} footer={<ParentNav active="Help" />} contentStyle={{ paddingTop: 24, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <BackButton label="Back to summary" onPress={() => goBack('/parent')} />
        <Text accessibilityRole="header" style={[display(800), { fontSize: 26, color: C.ink }]}>
          Talk to a person
        </Text>
      </View>
      <Text style={[body(400), { fontSize: 15, color: C.muted }]}>
        Pip handles study habits. For anything bigger, here’s who can help, starting with the closest.
      </Text>

      <View accessibilityRole="radiogroup" aria-label="Who to contact" style={{ gap: 8 }}>
        {opts.map((o, i) => {
          const on = i === picked;
          return (
            <Pressable
              key={o.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              aria-checked={on}
              onPress={() => {
                setPicked(i);
                setCopied(false);
              }}
              style={[styles.opt, { borderColor: on ? C.greenParent : C.lineParent }]}
            >
              <View style={[styles.radio, { borderColor: on ? C.greenParent : C.lineParent }]}>
                <View style={[styles.dot, { backgroundColor: on ? C.greenParent : 'transparent' }]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[body(800), { fontSize: 15, color: C.ink }]}>{o.name}</Text>
                <Text style={[body(400), { fontSize: 13, color: C.muted }]}>{o.sub}</Text>
              </View>
              <Text style={[body(800), styles.tag]}>{o.tag}</Text>
            </Pressable>
          );
        })}
      </View>

      {cur && (
        <View style={styles.draft}>
          <Text style={eyebrow(C.greenParent, 12)}>Message we drafted for you</Text>
          <Text style={[body(400), { fontSize: 14, lineHeight: 20, color: C.ink }]}>{cur.draft}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={async () => {
              await Clipboard.setStringAsync(cur.draft);
              setCopied(true);
            }}
            style={styles.copy}
          >
            <Text style={[body(800), { fontSize: 14, color: C.white }]}>{copied ? 'Copied ✓' : 'Copy message'}</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.crisis}>
        <Icon name="phone" size={22} color={C.gold} />
        <Text style={[body(400), { fontSize: 13, color: C.creamMuted, flex: 1 }]}>
          If your child may be in danger, call or text <Text style={[body(800), { color: C.cream }]}>988</Text> now (U.S.).
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  opt: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.white, borderWidth: 2, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 14, minHeight: 64 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  tag: { fontSize: 12, color: C.greenDeep, backgroundColor: C.greenSoft, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 9, overflow: 'hidden' },
  draft: { backgroundColor: C.white, borderWidth: 1, borderColor: C.lineParent, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 16, gap: 8 },
  copy: { alignSelf: 'flex-start', backgroundColor: C.greenParent, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, minHeight: 44, justifyContent: 'center' },
  crisis: { backgroundColor: C.burrow, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', gap: 10, alignItems: 'center' },
});
