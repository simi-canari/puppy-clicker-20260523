import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  useColorScheme,
  View,
} from 'react-native';

const clickSound = require('./assets/sounds/click.mp3');
const clickerImage = require('./assets/images/clicker.png');

const audioOptions = {
  keepAudioSessionActive: true,
  updateInterval: 1000,
};
const resetDelayMs = 1500;
const settingsStorageKey = 'dog-clicker-settings';
const socialLink = 'https://github.com/simi-canari';
const soundCreditLink =
  'https://pixabay.com/fr/sound-effects/films-et-effets-sp%C3%A9ciaux-metal-clicker-dog-training-stereo-clip-74690/';

type Screen = 'main' | 'settings' | 'about';
type ThemeSetting = 'light' | 'dark' | 'system';

type SavedSettings = {
  theme: ThemeSetting;
  hapticsEnabled: boolean;
  showCounter: boolean;
};

const defaultSettings: SavedSettings = {
  theme: 'system',
  hapticsEnabled: true,
  showCounter: true,
};

export default function App() {
  const systemTheme = useColorScheme();
  const clickPlayerOne = useAudioPlayer(clickSound, audioOptions);
  const clickPlayerTwo = useAudioPlayer(clickSound, audioOptions);
  const clickPlayerThree = useAudioPlayer(clickSound, audioOptions);
  const nextPlayerIndex = useRef(0);
  const buttonScale = useRef(new Animated.Value(1)).current;
  const [screen, setScreen] = useState<Screen>('main');
  const [theme, setThemeState] = useState<ThemeSetting>(defaultSettings.theme);
  const [hapticsEnabled, setHapticsEnabledState] = useState(
    defaultSettings.hapticsEnabled
  );
  const [showCounter, setShowCounterState] = useState(defaultSettings.showCounter);
  const [clickCount, setClickCount] = useState(0);

  const activeTheme = theme === 'system' ? systemTheme ?? 'light' : theme;
  const colors = activeTheme === 'dark' ? darkColors : lightColors;
  const styles = createStyles(colors);

  useEffect(() => {
    setAudioModeAsync({
      interruptionMode: 'mixWithOthers',
      playsInSilentMode: true,
    });
  }, []);

  useEffect(() => {
    async function loadSettings() {
      const savedSettings = await AsyncStorage.getItem(settingsStorageKey);

      if (!savedSettings) {
        return;
      }

      const parsedSettings = JSON.parse(savedSettings) as Partial<SavedSettings>;

      if (isThemeSetting(parsedSettings.theme)) {
        setThemeState(parsedSettings.theme);
      }

      if (typeof parsedSettings.hapticsEnabled === 'boolean') {
        setHapticsEnabledState(parsedSettings.hapticsEnabled);
      }

      if (typeof parsedSettings.showCounter === 'boolean') {
        setShowCounterState(parsedSettings.showCounter);
      }
    }

    loadSettings();
  }, []);

  async function saveSettings(nextSettings: SavedSettings) {
    await AsyncStorage.setItem(
      settingsStorageKey,
      JSON.stringify(nextSettings)
    );
  }

  function setTheme(nextTheme: ThemeSetting) {
    setThemeState(nextTheme);
    saveSettings({ theme: nextTheme, hapticsEnabled, showCounter });
  }

  function setHapticsEnabled(nextValue: boolean) {
    setHapticsEnabledState(nextValue);
    saveSettings({ theme, hapticsEnabled: nextValue, showCounter });
  }

  function setShowCounter(nextValue: boolean) {
    setShowCounterState(nextValue);
    saveSettings({ theme, hapticsEnabled, showCounter: nextValue });
  }

  function playHapticFeedback() {
    if (Platform.OS === 'android') {
      Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Context_Click);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  function playClick() {
    const clickPlayers = [clickPlayerOne, clickPlayerTwo, clickPlayerThree];
    const clickPlayer = clickPlayers[nextPlayerIndex.current];
    nextPlayerIndex.current = (nextPlayerIndex.current + 1) % clickPlayers.length;

    if (hapticsEnabled) {
      playHapticFeedback();
    }

    setClickCount((currentCount) => currentCount + 1);
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
    ]).start();
  }

  function renderMainScreen() {
    return (
      <View style={styles.container}>
        <Pressable style={styles.settingsButton} onPress={() => setScreen('settings')}>
          <Text style={styles.settingsButtonText}>⚙</Text>
        </Pressable>

        <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut}>
          <Animated.View
            style={[styles.button, { transform: [{ scale: buttonScale }] }]}
          >
            <Animated.Image
              source={clickerImage}
              style={styles.buttonImage}
              resizeMode="contain"
            />
          </Animated.View>
        </Pressable>

        {showCounter && (
          <View style={styles.counterGroup}>
            <Text style={styles.counterLabel}>Total clicks</Text>
            <View style={styles.counterRow}>
              <Pressable
                style={styles.resetCounterButton}
                onPress={() => setClickCount(0)}
              >
                <Text style={styles.resetCounterButtonText}>↻</Text>
              </Pressable>
              <Text style={styles.clickCounter}>{clickCount}</Text>
            </View>
          </View>
        )}

        <Text style={styles.mainHint}>Tap to click</Text>
      </View>
    );
  }

  function renderSettingsScreen() {
    return (
      <ScrollView
        contentContainerStyle={styles.screenContent}
        style={styles.scrollScreen}
      >
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => setScreen('main')}>
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
          <Text style={styles.title}>Settings</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Theme</Text>
          <View style={styles.segmentedControl}>
            {(['light', 'dark', 'system'] as ThemeSetting[]).map((item) => (
              <Pressable
                key={item}
                style={[
                  styles.segmentButton,
                  theme === item && styles.segmentButtonActive,
                ]}
                onPress={() => setTheme(item)}
              >
                <Text
                  style={[
                    styles.segmentButtonText,
                    theme === item && styles.segmentButtonTextActive,
                  ]}
                >
                  {capitalize(item)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.settingRow}>
            <View>
              <Text style={styles.sectionTitle}>Haptics</Text>
              <Text style={styles.settingDescription}>Vibrate on click</Text>
            </View>
            <Switch
              value={hapticsEnabled}
              onValueChange={setHapticsEnabled}
              trackColor={{
                false: colors.switchTrackOff,
                true: colors.switchTrackOn,
              }}
              thumbColor={colors.switchThumb}
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.settingRow}>
            <View>
              <Text style={styles.sectionTitle}>Click Counter</Text>
              <Text style={styles.settingDescription}>Show clicks on the main screen</Text>
            </View>
            <Switch
              value={showCounter}
              onValueChange={setShowCounter}
              trackColor={{
                false: colors.switchTrackOff,
                true: colors.switchTrackOn,
              }}
              thumbColor={colors.switchThumb}
            />
          </View>
        </View>

        <Pressable style={styles.aboutButton} onPress={() => setScreen('about')}>
          <Text style={styles.aboutButtonText}>About 🐕</Text>
        </Pressable>
      </ScrollView>
    );
  }

  function renderAboutScreen() {
    return (
      <ScrollView
        contentContainerStyle={styles.screenContent}
        style={styles.scrollScreen}
      >
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => setScreen('settings')}>
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
          <Text style={styles.title}>About 🐕</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Socials</Text>
          <Pressable onPress={() => Linking.openURL(socialLink)}>
            <Text style={styles.linkText}>{socialLink}</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sound Credit</Text>
          <Pressable onPress={() => Linking.openURL(soundCreditLink)}>
            <Text style={styles.linkText}>{soundCreditLink}</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  return (
    <>
      {screen === 'main' && renderMainScreen()}
      {screen === 'settings' && renderSettingsScreen()}
      {screen === 'about' && renderAboutScreen()}
      <StatusBar style={activeTheme === 'dark' ? 'light' : 'dark'} />
    </>
  );
}

function isThemeSetting(value: unknown): value is ThemeSetting {
  return value === 'light' || value === 'dark' || value === 'system';
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const lightColors = {
  background: '#ffffff',
  text: '#171717',
  mutedText: '#666666',
  border: '#dedede',
  controlBackground: '#f2f2f2',
  activeBackground: '#171717',
  activeText: '#ffffff',
  link: '#0b6bcb',
  switchTrackOff: '#d6d6d6',
  switchTrackOn: '#111111',
  switchThumb: '#ffffff',
};

const darkColors = {
  background: '#121212',
  text: '#f4f4f4',
  mutedText: '#b8b8b8',
  border: '#383838',
  controlBackground: '#222222',
  activeBackground: '#f4f4f4',
  activeText: '#121212',
  link: '#75b7ff',
  switchTrackOff: '#4a4a4a',
  switchTrackOn: '#f4f4f4',
  switchThumb: '#ffffff',
};

function createStyles(colors: typeof lightColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    settingsButton: {
      position: 'absolute',
      top: 64,
      right: 24,
      width: 48,
      height: 48,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      backgroundColor: colors.controlBackground,
      alignItems: 'center',
      justifyContent: 'center',
    },
    settingsButtonText: {
      color: colors.text,
      fontSize: 26,
      lineHeight: 28,
    },
    button: {
      width: 460,
      height: 460,
      borderRadius: 190,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    buttonImage: {
      width: '100%',
      height: '100%',
    },
    counterGroup: {
      alignItems: 'center',
      marginTop: 18,
    },
    counterLabel: {
      color: colors.mutedText,
      fontSize: 16,
      fontWeight: '400',
      textAlign: 'center',
      marginBottom: 4,
    },
    counterRow: {
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      minWidth: 120,
    },
    clickCounter: {
      color: '#4e92fc',
      fontSize: 42,
      fontWeight: '700',
    },
    resetCounterButton: {
      position: 'absolute',
      left: 0,
      width: 30,
      height: 30,
      alignItems: 'center',
      justifyContent: 'center',
    },
    resetCounterButtonText: {
      color: '#4e92fc',
      fontSize: 28,
      lineHeight: 28,
      fontWeight: '700',
    },
    mainHint: {
      position: 'absolute',
      bottom: 48,
      color: colors.mutedText,
      fontSize: 16,
      fontWeight: '400',
      textAlign: 'center',
      paddingHorizontal: 24,
    },
    scrollScreen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    screenContent: {
      paddingHorizontal: 24,
      paddingTop: 64,
      paddingBottom: 40,
    },
    header: {
      marginBottom: 32,
    },
    backButton: {
      alignSelf: 'flex-start',
      marginBottom: 24,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: colors.controlBackground,
    },
    backButtonText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    title: {
      color: colors.text,
      fontSize: 34,
      fontWeight: '700',
    },
    section: {
      borderTopWidth: 1,
      borderColor: colors.border,
      paddingTop: 20,
      marginBottom: 28,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '700',
      marginBottom: 12,
    },
    segmentedControl: {
      flexDirection: 'row',
      gap: 8,
      backgroundColor: colors.controlBackground,
      borderRadius: 999,
      padding: 4,
    },
    segmentButton: {
      flex: 1,
      borderRadius: 999,
      paddingVertical: 12,
      alignItems: 'center',
    },
    segmentButtonActive: {
      backgroundColor: colors.activeBackground,
    },
    segmentButtonText: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '600',
    },
    segmentButtonTextActive: {
      color: colors.activeText,
    },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
    },
    settingDescription: {
      color: colors.mutedText,
      fontSize: 15,
    },
    aboutButton: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 18,
      paddingVertical: 14,
      backgroundColor: colors.controlBackground,
      alignItems: 'center',
    },
    aboutButtonText: {
      color: colors.text,
      fontSize: 17,
      fontWeight: '700',
    },
    linkText: {
      color: colors.link,
      fontSize: 16,
      lineHeight: 24,
    },
  });
}
