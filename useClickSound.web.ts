import { Asset } from 'expo-asset';
import { useEffect, useRef, useState } from 'react';

const clickIn = require('./assets/sounds/click in.mp3');
const clickOut = require('./assets/sounds/click out.mp3');
type ClickBuffers = { in: AudioBuffer; out: AudioBuffer };

export class WebClickSound {
  private context: AudioContext | null = null;
  private gain: GainNode | null = null;
  private volume = 1;
  private buffer: ClickBuffers | null = null;
  private loading: Promise<ClickBuffers> | null = null;
  private source: AudioBufferSourceNode | null = null;
  private request = 0;
  private disposed = false;
  private resumeStartedAt: number | null = null;
  private phase: 'idle' | 'loading' | 'in' | 'held' | 'out' = 'idle';
  private released = false;

  constructor(private reportError: (message: string | null) => void) {}

  private getContext() {
    // A suspended context may fail to resume after an iOS PWA is restored.
    // On the next gesture, replace a context whose resume has stalled.
    if (this.context && (this.context.state === 'closed' ||
      (this.context.state !== 'running' && this.resumeStartedAt !== null &&
        Date.now() - this.resumeStartedAt > 1000))) {
      this.stop();
      void this.context.close().catch(() => {});
      this.context = null;
      this.gain = null;
      this.resumeStartedAt = null;
    }
    if (!this.context) {
      this.context = new AudioContext({ latencyHint: 'interactive' });
      this.gain = this.context.createGain();
      this.gain.gain.value = this.volume;
      this.gain.connect(this.context.destination);
    }
    return this.context;
  }

  private load(context: AudioContext): Promise<ClickBuffers> {
    if (this.buffer) return Promise.resolve(this.buffer);
    if (!this.loading) {
      this.loading = (async () => {
        const decode = async (asset: number) => {
          const response = await fetch(Asset.fromModule(asset).uri);
          if (!response.ok) throw new Error('Unable to load click sound');
          return context.decodeAudioData(await response.arrayBuffer());
        };
        const [press, release] = await Promise.all([decode(clickIn), decode(clickOut)]);
        const buffer = { in: press, out: release };
        this.buffer = buffer;
        return buffer;
      })().catch((error) => {
        this.loading = null;
        throw error;
      });
    }
    return this.loading;
  }

  setVolume(volume: number) {
    this.volume = Number.isFinite(volume) ? Math.max(0, Math.min(1, volume)) : 1;
    if (this.gain) this.gain.gain.value = this.volume;
  }

  preload() {
    try {
      void this.load(this.getContext()).catch(() => {
        if (!this.disposed) this.reportError('Sound could not load. Tap to retry.');
      });
    } catch {
      this.reportError('Sound is unavailable in this browser.');
    }
  }

  private stop() {
    if (this.source) {
      this.source.onended = null;
      this.source.stop();
      this.source.disconnect();
      this.source = null;
    }
  }

  private start(context: AudioContext, phase: 'in' | 'out', request: number) {
    const source = context.createBufferSource();
    source.buffer = this.buffer![phase];
    source.connect(this.gain!);
    this.source = source;
    this.phase = phase;
    source.onended = () => {
      source.disconnect();
      if (this.disposed || request !== this.request || this.source !== source) return;
      this.source = null;
      if (phase === 'in') {
        this.phase = 'held';
        if (this.released) this.start(context, 'out', request);
      } else {
        this.phase = 'idle';
      }
    };
    source.start(0);
  }

  press = () => {
    if (this.disposed) return;
    const request = ++this.request;
    this.stop();
    this.phase = 'loading';
    this.released = false;
    try {
      const context = this.getContext();
      // Call resume synchronously in the input handler, before any fetch/await.
      const ready = context.state === 'running' ? Promise.resolve() : context.resume();
      if (context.state !== 'running' && this.resumeStartedAt === null) {
        this.resumeStartedAt = Date.now();
      }
      void Promise.all([ready, this.load(context)]).then(([, buffer]) => {
        // Never replay an obsolete tap after loading, resuming, or backgrounding.
        if (this.disposed || request !== this.request || context !== this.context) return;
        if (context.state !== 'running') throw new Error('Audio is suspended');
        this.resumeStartedAt = null;
        this.start(context, 'in', request);
        this.reportError(null);
      }).catch(() => {
        if (!this.disposed && request === this.request) {
          this.phase = 'idle';
          this.reportError('Sound could not start. Tap to retry.');
        }
      });
    } catch {
      this.phase = 'idle';
      this.reportError('Sound could not start. Tap to retry.');
    }
  };

  release = () => {
    this.unlock();
    if (this.disposed || this.phase === 'idle' || this.phase === 'out' || this.released) return;
    this.released = true;
    if (this.phase === 'held' && this.context) {
      this.start(this.context, 'out', this.request);
    }
  };

  interrupt = () => {
    ++this.request;
    this.stop();
    this.phase = 'idle';
    this.released = false;
  };

  unlock = () => {
    // Some touch browsers grant audio activation on release rather than down.
    // Resume the pending press without starting a second click.
    if (this.context && this.context.state !== 'running' && this.context.state !== 'closed') {
      void this.context.resume().catch(() => {});
    }
  };

  dispose() {
    this.disposed = true;
    this.interrupt();
    void this.context?.close().catch(() => {});
  }
}

export function useClickSound(volume = 1) {
  const player = useRef<WebClickSound | null>(null);
  const [error, setError] = useState<string | null>(null);
  const latestVolume = useRef(volume);
  latestVolume.current = volume;

  useEffect(() => {
    player.current?.setVolume(volume);
  }, [volume]);

  useEffect(() => {
    const sound = new WebClickSound(setError);
    sound.setVolume(latestVolume.current);
    player.current = sound;
    sound.preload();
    const onVisibility = () => {
      if (document.hidden) sound.interrupt();
    };
    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('pointerup', sound.unlock);
    document.addEventListener('keydown', sound.unlock);
    window.addEventListener('pagehide', sound.interrupt);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      document.removeEventListener('pointerup', sound.unlock);
      document.removeEventListener('keydown', sound.unlock);
      window.removeEventListener('pagehide', sound.interrupt);
      sound.dispose();
      player.current = null;
    };
  }, []);

  return {
    press: () => player.current?.press(),
    release: () => player.current?.release(),
    error,
  };
}
