import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import Slider from '@react-native-community/slider';
import { TouchableOpacity } from 'react-native';

import { Viewer3D } from '@/components/Viewer3D';
import { STRINGS } from '@/constants/strings';
import { Colors } from '@/constants/theme';
import { ThemedView } from '@/components/themed-view';

const INITIAL_DURATION_SECONDS = 60;

export default function ViewerScreen() {
  useKeepAwake();

  const router = useRouter();
  const [remaining, setRemaining] = useState(INITIAL_DURATION_SECONDS);
  const [isPlaying, setIsPlaying] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [directionalIntensity, setDirectionalIntensity] = useState(1);
  const [ambientIntensity, setAmbientIntensity] = useState(0.4);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying]);

  useEffect(() => {
    if (remaining === 0 && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      setIsPlaying(false);
    }
  }, [remaining]);

  const handleTogglePlay = () => {
    if (remaining === 0) {
      setRemaining(INITIAL_DURATION_SECONDS);
    }
    setIsPlaying((prev) => !prev);
  };

  const handleSkip = () => {
    setRemaining(INITIAL_DURATION_SECONDS);
  };

  const handleClose = () => {
    router.back();
  };

  const minutes = Math.floor(remaining / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (remaining % 60).toString().padStart(2, '0');

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={handleClose} style={styles.topButton}>
            <Text style={styles.topButtonText}>{STRINGS.viewer.close}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{STRINGS.viewer.title}</Text>
          <View style={styles.topButtonPlaceholder} />
        </View>

        <View style={styles.viewerContainer}>
          <Viewer3D
            directionalIntensity={directionalIntensity}
            ambientIntensity={ambientIntensity}
          />
        </View>

        <View style={styles.bottomPanel}>
          <View style={styles.timerRow}>
            <Text style={styles.timerLabel}>{STRINGS.viewer.timerLabel}</Text>
            <Text style={styles.timerValue}>
              {minutes}:{seconds}
            </Text>
          </View>
          <View style={styles.controlsRow}>
            <TouchableOpacity onPress={handleTogglePlay} style={styles.controlButton}>
              <Text style={styles.controlButtonText}>
                {isPlaying ? STRINGS.viewer.pause : STRINGS.viewer.play}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSkip} style={styles.controlButton}>
              <Text style={styles.controlButtonText}>{STRINGS.viewer.skip}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.slidersContainer}>
            <View style={styles.sliderRow}>
              <Text style={styles.sliderLabel}>{STRINGS.viewer.directionalLight}</Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={2}
                value={directionalIntensity}
                onValueChange={setDirectionalIntensity}
                minimumTrackTintColor={Colors.light.tint}
                maximumTrackTintColor="#666"
                thumbTintColor={Colors.light.tint}
              />
            </View>
            <View style={styles.sliderRow}>
              <Text style={styles.sliderLabel}>{STRINGS.viewer.ambientLight}</Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={2}
                value={ambientIntensity}
                onValueChange={setAmbientIntensity}
                minimumTrackTintColor={Colors.light.tint}
                maximumTrackTintColor="#666"
                thumbTintColor={Colors.light.tint}
              />
            </View>
          </View>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  topButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#00000055',
  },
  topButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  topButtonPlaceholder: {
    width: 64,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  viewerContainer: {
    flex: 1,
  },
  bottomPanel: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#00000088',
  },
  timerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timerLabel: {
    color: '#fff',
    fontSize: 14,
  },
  timerValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginBottom: 12,
  },
  controlButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: Colors.light.tint,
  },
  controlButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  slidersContainer: {
    gap: 8,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sliderLabel: {
    width: 140,
    color: '#fff',
    fontSize: 12,
  },
  slider: {
    flex: 1,
  },
});

