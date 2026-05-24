import { StatusBar } from 'expo-status-bar';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Vibration,
  View,
} from 'react-native';

const clickSound = require('./assets/sounds/click.mp3');
const audioOptions = {
  keepAudioSessionActive: true,
  updateInterval: 1000,
};
const resetDelayMs = 1500;

export default function App() {
  const clickPlayerOne = useAudioPlayer(clickSound, audioOptions);
  const clickPlayerTwo = useAudioPlayer(clickSound, audioOptions);
  const clickPlayerThree = useAudioPlayer(clickSound, audioOptions);
  const nextPlayerIndex = useRef(0);
  const buttonScale = useRef(new Animated.Value(1)).current;
  const buttonHighlight = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setAudioModeAsync({
      interruptionMode: 'mixWithOthers',
      playsInSilentMode: true,
    });
  }, []);

  function playClick() {
    const clickPlayers = [clickPlayerOne, clickPlayerTwo, clickPlayerThree];
    const clickPlayer = clickPlayers[nextPlayerIndex.current];
    nextPlayerIndex.current = (nextPlayerIndex.current + 1) % clickPlayers.length;

    Vibration.vibrate(20);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    clickPlayer.play();

    setTimeout(() => {
      clickPlayer.pause();
      clickPlayer.seekTo(0);
    }, resetDelayMs);
  }

  function handlePressIn() {
    playClick();

    Animated.parallel([
      Animated.timing(buttonScale, {
        toValue: 0.94,
        duration: 70,
        useNativeDriver: true,
      }),
      Animated.timing(buttonHighlight, {
        toValue: 0.22,
        duration: 70,
        useNativeDriver: true,
      }),
    ]).start();
  }

  function handlePressOut() {
    Animated.parallel([
      Animated.spring(buttonScale, {
        toValue: 1,
        speed: 28,
        bounciness: 4,
        useNativeDriver: true,
      }),
      Animated.timing(buttonHighlight, {
        toValue: 0,
        duration: 90,
        useNativeDriver: true,
      }),
    ]).start();
  }

  return (
    <View style={styles.container}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Animated.View
          style={[styles.button, { transform: [{ scale: buttonScale }] }]}
        >
          <Animated.Image
            source={require('./assets/images/clicker.png')}
            style={styles.buttonImage}
            resizeMode="contain"
          />
          <Animated.View
            pointerEvents="none"
            style={[styles.highlight, { opacity: buttonHighlight }]}
          />
        </Animated.View>
      </Pressable>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    width: 220,
    height: 220,
    borderRadius: 110,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  buttonImage: {
    width: '100%',
    height: '100%',
  },
  highlight: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff',
  },
});
