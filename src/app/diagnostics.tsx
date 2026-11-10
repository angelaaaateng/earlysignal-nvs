import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { useApp } from '@/data/AppStore';
import { LOG_SESSION, recentLogs, type LogEntry } from '@/observability/logger';
import { isStandalone } from '@/pwa/register';
import { Button, Card } from '@/ui/Kit';
import { Screen } from '@/ui/Screen';
import { C, S, T } from '@/ui/theme';

const LEVEL_COLOR: Record<LogEntry['level'], string> = { debug: C.soilMuted, info: C.soil, warn: C.bark, error: C.rust };

/** Support screen at /diagnostics: version, install state and the last 100 redacted log entries. */
export default function Diagnostics() {
  const { user, resetDemo, backend } = useApp();
  const [logs, setLogs] = useState(() => recentLogs().slice(-100).reverse());
  const [copied, setCopied] = useState(false);
  const facts = [
    ['Release', process.env.EXPO_PUBLIC_RELEASE ?? 'dev'],
    ['Session', LOG_SESSION],
    ['Platform', Platform.OS + (isStandalone() ? ' · installed app' : '')],
    ['Signed in', user ? user.id : 'no'],
    ['Backend', backend.kind === 'supabase' ? 'Supabase' : 'demo data on this device'],
    ['Log sink', process.env.EXPO_PUBLIC_LOG_ENDPOINT ? 'remote + device' : 'device only'],
    ['Errors in buffer', String(logs.filter((l) => l.level === 'error').length)],
  ];
  return (
    <Screen contentStyle={{ gap: S[4] }}>
      <Text style={T.overline}>Support</Text>
      <Text accessibilityRole="header" style={T.display}>
        Diagnostics
      </Text>
      <Card>
        {facts.map(([k, v]) => (
          <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: S[3] }}>
            <Text style={T.caption}>{k}</Text>
            <Text style={[T.monoSm, { color: C.soil }]} selectable>
              {v}
            </Text>
          </View>
        ))}
      </Card>
      <View style={{ flexDirection: 'row', gap: S[2], flexWrap: 'wrap' }}>
        <Button label="Refresh" variant="soft" size="sm" onPress={() => setLogs(recentLogs().slice(-100).reverse())} />
        <Button
          label={copied ? 'Copied' : 'Copy logs'}
          variant="soft"
          size="sm"
          onPress={() => {
            void Clipboard.setStringAsync(JSON.stringify(recentLogs(), null, 1)).then(() => setCopied(true));
          }}
        />
        {backend.kind === 'mock' && <Button label="Reset demo data" variant="danger" size="sm" onPress={() => void resetDemo().then(() => router.replace('/'))} />}
        <Button label="Back" variant="quiet" size="sm" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      </View>
      <Card style={{ gap: 4 }}>
        <Text style={T.subhead}>Recent events (newest first)</Text>
        {logs.map((l, i) => (
          <Text key={i} style={[T.monoSm, { fontSize: 11, lineHeight: 15, color: LEVEL_COLOR[l.level] }]} selectable>
            {l.ts.slice(11, 19)} {l.category}/{l.event}
            {l.data ? ` ${JSON.stringify(l.data).slice(0, 140)}` : ''}
          </Text>
        ))}
      </Card>
    </Screen>
  );
}
