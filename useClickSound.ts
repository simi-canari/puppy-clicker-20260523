import { useRef } from 'react';
import { useAudioPlayer } from 'expo-audio';

const clickSound = require('./assets/sounds/click.mp3');
const options = { keepAudioSessionActive: true, updateInterval: 1000 };

// Preserve the existing native playback while web uses useClickSound.web.ts.
export function useClickSound() {
  const one = useAudioPlayer(clickSound, options);
  const two = useAudioPlayer(clickSound, options);
  const three = useAudioPlayer(clickSound, options);
  const next = useRef(0);

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

  return { play, error: null as string | null };
}
