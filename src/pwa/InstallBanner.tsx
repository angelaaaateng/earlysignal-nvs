import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { body, C } from '@/ui/theme';
import { canPromptInstall, isIosSafari, isStandalone, onInstallAvailabilityChange, promptInstall } from './register';

const DISMISS_KEY = 'earlysignal.install_dismissed';

function dismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * "Use EarlySignal like an app" banner on the web. Chrome gets a one-tap
 * Install button; iPhone Safari gets the Share → Add to Home Screen steps.
 * Hidden once installed, when dismissed, and on native.
 */
export function InstallBanner() {
  const [, force] = useState(0);
  const [hidden, setHidden] = useState(() => Platform.OS !== 'web' || isStandalone() || dismissed());
  useEffect(() => {
    const off = onInstallAvailabilityChange(() => force((n) => n + 1));
    return () => {
      off();
    };
  }, []);

  if (hidden) return null;
  const ios = isIosSafari();
  const chrome = canPromptInstall();
  if (!ios && !chrome) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* private mode */
    }
    setHidden(true);
  };

  return (
    <View style={styles.wrap} accessibilityRole="summary">
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[body(800), { fontSize: 14, color: C.ink }]}>Use EarlySignal like an app</Text>
        <Text style={[body(400), { fontSize: 13, color: C.muted }]}>
          {ios ? 'Tap Share, then “Add to Home Screen”.' : 'Install it on this device. No app store needed.'}
        </Text>
      </View>
      {chrome && (
        <Pressable accessibilityRole="button" onPress={() => void promptInstall()} style={styles.install}>
          <Text style={[body(800), { fontSize: 14, color: C.ink }]}>Install</Text>
        </Pressable>
      )}
      <Pressable accessibilityRole="button" accessibilityLabel="Dismiss" onPress={dismiss} style={styles.close}>
        <Text style={[body(800), { fontSize: 18, color: C.muted }]}>×</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: C.card, borderRadius: 16, paddingVertical: 10, paddingLeft: 14, paddingRight: 6, flexDirection: 'row', alignItems: 'center', gap: 8 },
  install: { backgroundColor: C.gold, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 14, minHeight: 40, justifyContent: 'center' },
  close: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
