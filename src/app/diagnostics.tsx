import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useApp } from '@/data/AppStore';
import { LOG_SESSION, recentLogs, type LogEntry } from '@/observability/logger';
import { isStandalone } from '@/pwa/register';
import { Screen } from '@/ui/Screen';
import { body, C, display, eyebrow } from '@/ui/theme';

const LEVEL_COLOR: Record<LogEntry['level'], string> = { debug: C.faint, info: C.creamMuted, warn: C.gold, error: C.fox };

/**
 * Support screen at /diagnostics. Shows version, install state and the last
 * 100 log entries. Entries are already redacted: no names, notes or drafts.
 */
export default function Diagnostics() {
  const { user, resetDemo, backend } = useApp();
  const [logs, setLogs] = useState(() => recentLogs().slice(-100).reverse());
  const [copied, setCopied] = useState(false);
  const errors = logs.filter((l) => l.level === 'error').length;

  const facts = [
    ['Release', process.env.EXPO_PUBLIC_RELEASE ?? 'dev'],
    ['Session', LOG_SESSION],
    ['Platform', Platform.OS + (isStandalone() ? ' · installed app' : '')],
    ['Signed in as', user ? `${user.role} (${user.id})` : 'nobody'],
    ['Backend', backend.kind === 'supabase' ? 'Supabase' : 'demo data on this device'],
    ['Log sink', process.env.EXPO_PUBLIC_LOG_ENDPOINT ? 'remote + device' : 'device only'],
    ['Errors in buffer', String(errors)],
  ];

  return (
    <Screen bg={C.burrowDeep} contentStyle={{ gap: 14 }}>
      <Text style={eyebrow(C.gold)}>Support</Text>
      <Text accessibilityRole="header" style={[display(800), { fontSize: 28, color: C.cream }]}>Diagnostics</Text>

      <View style={styles.card}>
        {facts.map(([k, v]) => (
          <View key={k} style={styles.fact}>
            <Text style={[body(700), { fontSize: 13, color: C.creamMuted }]}>{k}</Text>
            <Text style={[body(800), { fontSize: 13, color: C.cream }]} selectable>{v}</Text>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <Btn label="Refresh" onPress={() => setLogs(recentLogs().slice(-100).reverse())} />
        <Btn
          label={copied ? 'Copied ✓' : 'Copy logs'}
          onPress={async () => {
            await Clipboard.setStringAsync(JSON.stringify(recentLogs(), null, 1));
            setCopied(true);
          }}
        />
        {backend.kind === 'mock' && (
          <Btn
            label="Reset demo data"
            onPress={() => {
              void resetDemo().then(() => router.replace('/'));
            }}
          />
        )}
        <Btn label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      </View>

      <View style={[styles.card, { gap: 6 }]}>
        <Text style={[body(800), { fontSize: 13, color: C.cream }]}>Recent events (newest first)</Text>
        {logs.map((l, i) => (
          <Text key={i} style={[body(400), { fontSize: 11, color: LEVEL_COLOR[l.level], fontFamily: Platform.OS === 'web' ? 'ui-monospace, monospace' : undefined }]} selectable>
            {l.ts.slice(11, 19)} {l.category}/{l.event}
            {l.data ? ` ${JSON.stringify(l.data).slice(0, 140)}` : ''}
          </Text>
        ))}
      </View>
    </Screen>
  );
}

function Btn({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.btn}>
      <Text style={[body(800), { fontSize: 14, color: C.ink }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: C.burrow, borderRadius: 18, padding: 16, gap: 8 },
  fact: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  btn: { backgroundColor: C.gold, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, minHeight: 44, justifyContent: 'center' },
});
