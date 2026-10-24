import { useEffect, useState } from 'react';

type AudioSession = { type: string };
type AudioNavigator = {
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
  audioSession?: AudioSession;
};

export function getIOSAudioSession(device: AudioNavigator): AudioSession | null {
  const ios = /iPhone|iPad|iPod/.test(device.userAgent) ||
    (device.platform === 'MacIntel' && device.maxTouchPoints > 1);
  return ios && device.audioSession && typeof device.audioSession.type === 'string'
    ? device.audioSession : null;
}

export function useSilentMode(enabled: boolean) {
  const [supported, setSupported] = useState(false);
  useEffect(() => {
    const session = getIOSAudioSession(navigator as AudioNavigator);
    if (!session) return;
    const previousType = session.type;
    try {
      session.type = enabled ? 'playback' : 'auto';
      setSupported(true);
    } catch {
      setSupported(false);
      return;
    }
    return () => {
      try { session.type = previousType; } catch { /* Browser may revoke access. */ }
    };
  }, [enabled]);
  return supported;
}
