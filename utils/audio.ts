import { Audio } from 'expo-av';

let changeChimeSound: Audio.Sound | null = null;
let sessionEndSound: Audio.Sound | null = null;

/**
 * Generate a simple WAV buffer for a sine-wave beep.
 * @param frequency Hz
 * @param durationMs milliseconds
 * @param volume 0–1
 */
function generateBeepWav(
  frequency: number,
  durationMs: number,
  volume: number = 0.5,
): string {
  const sampleRate = 22050;
  const numSamples = Math.floor((sampleRate * durationMs) / 1000);
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = numSamples * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, totalSize - 8, true);
  writeString(view, 8, 'WAVE');

  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Generate sine wave with fade-in/out
  const fadeInSamples = Math.floor(numSamples * 0.05);
  const fadeOutSamples = Math.floor(numSamples * 0.3);
  for (let i = 0; i < numSamples; i++) {
    let amplitude = volume;
    if (i < fadeInSamples) {
      amplitude *= i / fadeInSamples;
    } else if (i > numSamples - fadeOutSamples) {
      amplitude *= (numSamples - i) / fadeOutSamples;
    }
    const sample = Math.sin(2 * Math.PI * frequency * (i / sampleRate)) * amplitude;
    const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
    view.setInt16(headerSize + i * 2, intSample, true);
  }

  // Convert to base64 data URI
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return 'data:audio/wav;base64,' + btoa(binary);
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

function btoa(str: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  let i = 0;
  while (i < str.length) {
    const a = str.charCodeAt(i++);
    const b = i < str.length ? str.charCodeAt(i++) : 0;
    const c = i < str.length ? str.charCodeAt(i++) : 0;
    const padding = i > str.length ? i - str.length : 0;

    const n = (a << 16) | (b << 8) | c;
    result += chars[(n >> 18) & 63];
    result += chars[(n >> 12) & 63];
    result += padding >= 2 ? '=' : chars[(n >> 6) & 63];
    result += padding >= 1 ? '=' : chars[n & 63];
  }
  return result;
}

/** Play a short chime when the subject/pose changes */
export async function playChangeChime(): Promise<void> {
  try {
    if (changeChimeSound) {
      await changeChimeSound.replayAsync();
      return;
    }
    const uri = generateBeepWav(880, 150, 0.4); // A5 note, 150ms
    const { sound } = await Audio.Sound.createAsync({ uri });
    changeChimeSound = sound;
    await sound.playAsync();
  } catch {
    // Audio may fail silently on some devices
  }
}

/** Play a distinct sound when the session ends */
export async function playSessionEndSound(): Promise<void> {
  try {
    if (sessionEndSound) {
      await sessionEndSound.replayAsync();
      return;
    }
    // Two-tone descending chime: 880Hz then 440Hz
    const uri = generateBeepWav(660, 300, 0.45);
    const { sound } = await Audio.Sound.createAsync({ uri });
    sessionEndSound = sound;
    await sound.playAsync();
  } catch {
    // Audio may fail silently on some devices
  }
}

/** Configure audio mode for playback alongside other audio */
export async function configureAudio(): Promise<void> {
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: false,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
  } catch {
    // ignore
  }
}

/** Clean up loaded sounds */
export async function unloadSounds(): Promise<void> {
  try {
    if (changeChimeSound) {
      await changeChimeSound.unloadAsync();
      changeChimeSound = null;
    }
    if (sessionEndSound) {
      await sessionEndSound.unloadAsync();
      sessionEndSound = null;
    }
  } catch {
    // ignore
  }
}
