import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

/**
 * Sets up Android notification channels.
 * Android 8.0+ requires explicit channels for notifications.
 */
export async function setupNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('practice-reminders', {
    name: 'Practice Reminders',
    description: 'Daily reminders to practice drawing',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#0a7ea4',
    sound: 'default',
  });

  await Notifications.setNotificationChannelAsync('streak-warnings', {
    name: 'Streak Warnings',
    description: 'Alerts when your practice streak is about to end',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
  });
}

/**
 * Requests notification permissions from the user.
 * Returns true if permission was granted.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Checks if notification permissions are currently granted.
 */
export async function hasNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}
