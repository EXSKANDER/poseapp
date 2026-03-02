import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { STRINGS } from '@/constants/strings';
import { Colors } from '@/constants/theme';
import { Pressable } from 'react-native';

export default function PracticeScreen() {
  const router = useRouter();

  const handleOpenViewer = () => {
    router.push('/session-config');
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">{STRINGS.practice.title}</ThemedText>
      <View style={styles.content}>
        <Pressable style={styles.button} onPress={handleOpenViewer}>
          <ThemedText type="defaultSemiBold">
            {STRINGS.practice.startPracticeButton}
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  content: {
    marginTop: 24,
    alignItems: 'center',
  },
  button: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 999,
    backgroundColor: Colors.light.tint,
  },
});

