import { useEffect, useRef } from 'react';
import { useAudioPlayer } from 'expo-audio';

const clickSound = require('./assets/sounds/click.mp3');
const options = { keepAudioSessionActive: true, updateInterval: 1000 };

// Preserve the existing native playback while web uses useClickSound.web.ts.
export function useClickSound(volume = 1) {
  const one = useAudioPlayer(clickSound, options);
  const two = useAudioPlayer(clickSound, options);
  const three = useAudioPlayer(clickSound, options);
  const next = useRef(0);
  useEffect(() => {
    one.volume = volume;
    two.volume = volume;
    three.volume = volume;
  }, [volume, one, two, three]);

  function play() {
    const players = [one, two, three];
    const player = players[next.current];
    next.current = (next.current + 1) % players.length;
    player.play();
    setTimeout(() => {
      player.pause();
      player.seekTo(0);
    }, 1500);
  }

  return { press: play, release: () => {}, error: null as string | null };
}
