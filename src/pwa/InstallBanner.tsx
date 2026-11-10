import { useEffect, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { Icon } from '@/ui/Icon';
import { C, R, S, T } from '@/ui/theme';
import { canPromptInstall, isIosSafari, isStandalone, onInstallAvailabilityChange, promptInstall } from './register';

const DISMISS_KEY = 'rooted.install_dismissed';
function dismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

/** "Keep Rooted on your home screen" on the web. Chrome gets one-tap Install; iPhone Safari gets the steps. */
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
    } catch {}
    setHidden(true);
  };
  return (
    <View accessibilityRole="summary" style={{ backgroundColor: C.sparkTint, borderRadius: R.md, paddingVertical: 10, paddingLeft: 14, paddingRight: 6, flexDirection: 'row', alignItems: 'center', gap: S[2] }}>
      <View style={{ flex: 1 }}>
        <Text style={T.label}>Keep Rooted on your home screen</Text>
        <Text style={T.caption}>{ios ? 'Tap Share, then “Add to Home Screen”.' : 'Install it on this device. No app store needed.'}</Text>
      </View>
      {chrome && (
        <Pressable accessibilityRole="button" onPress={() => void promptInstall()} style={{ backgroundColor: C.spark, borderRadius: R.pill, paddingVertical: 8, paddingHorizontal: 14, minHeight: 40, justifyContent: 'center' }}>
          <Text style={[T.label, { color: C.onSpark }]}>Install</Text>
        </Pressable>
      )}
      <Pressable accessibilityRole="button" accessibilityLabel="Dismiss" onPress={dismiss} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="close" size={18} color={C.soilMuted} />
      </Pressable>
    </View>
  );
}
