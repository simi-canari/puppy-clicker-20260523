import { Asset } from 'expo-asset';
import { useEffect, useRef, useState } from 'react';

const clickSound = require('./assets/sounds/click.mp3');

export class WebClickSound {
  private context: AudioContext | null = null;
  private buffer: AudioBuffer | null = null;
  private loading: Promise<AudioBuffer> | null = null;
  private source: AudioBufferSourceNode | null = null;
  private request = 0;
  private disposed = false;
  private resumeStartedAt: number | null = null;

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
      this.resumeStartedAt = null;
    }
    if (!this.context) {
      this.context = new AudioContext({ latencyHint: 'interactive' });
    }
    return this.context;
  }

  private load(context: AudioContext): Promise<AudioBuffer> {
    if (this.buffer) return Promise.resolve(this.buffer);
    if (!this.loading) {
      this.loading = (async () => {
        const uri = Asset.fromModule(clickSound).uri;
        const response = await fetch(uri);
        if (!response.ok) throw new Error('Unable to load click sound');
        const buffer = await context.decodeAudioData(await response.arrayBuffer());
        this.buffer = buffer;
        return buffer;
      })().catch((error) => {
        this.loading = null;
        throw error;
      });
    }
    return this.loading;
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
      this.source.stop();
      this.source.disconnect();
      this.source = null;
    }
  }

  play = () => {
    if (this.disposed) return;
    const request = ++this.request;
    this.stop();
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
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(context.destination);
        this.source = source;
        source.onended = () => {
          source.disconnect();
          if (this.source === source) this.source = null;
        };
        source.start(0);
        this.reportError(null);
      }).catch(() => {
        if (!this.disposed && request === this.request) {
          this.reportError('Sound could not start. Tap to retry.');
        }
      });
    } catch {
      this.reportError('Sound could not start. Tap to retry.');
    }
  };

  interrupt = () => {
    ++this.request;
    this.stop();
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

export function useClickSound() {
  const player = useRef<WebClickSound | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sound = new WebClickSound(setError);
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

  return { play: () => player.current?.play(), error };
}
