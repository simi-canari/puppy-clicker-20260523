import { StatusBar } from 'expo-status-bar';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, Vibration, View } from 'react-native';

export default function App() {
  const clickSound = useRef<Audio.Sound | null>(null);

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

  async function handlePress() {
    Vibration.vibrate(20);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (clickSound.current) {
      await clickSound.current.replayAsync();
    }
  }

  return (
    <View style={styles.container}>
      <Pressable style={styles.button} onPress={handlePress}>
        <Text style={styles.buttonText}>Click</Text>
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
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: '700',
  },
});
