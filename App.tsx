import { StatusBar } from 'expo-status-bar';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Vibration,
  View,
} from 'react-native';

export default function App() {
  const clickSound = useRef<Audio.Sound | null>(null);
  const buttonScale = useRef(new Animated.Value(1)).current;
  const buttonHighlight = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    async function loadClickSound() {
      const { sound } = await Audio.Sound.createAsync(
        require('./assets/sounds/click.mp3')
      );

      clickSound.current = sound;
    }

    loadClickSound();

    return () => {
      clickSound.current?.unloadAsync();
    };
  }, []);

  async function playClick() {
    Vibration.vibrate(20);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (clickSound.current) {
      await clickSound.current.replayAsync();
    }
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
