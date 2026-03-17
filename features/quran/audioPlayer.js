import { Audio } from 'expo-av';

let sound = null;
let onFinishCallback = null;
let isLoadingAudio = false;

/**
 * Central audio manager for Quran ayah-by-ayah playback.
 * Uses global ayah numbers for the CDN URL.
 */

export async function initAudioMode() {
  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    staysActiveInBackground: true,
    shouldDuckAndroid: true,
  });
}

export async function playAyah(globalNumber) {
  isLoadingAudio = true;

  // Unload previous sound
  if (sound) {
    try {
      await sound.unloadAsync();
    } catch {}
    sound = null;
  }

  const url = `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${globalNumber}.mp3`;

  try {
    const { sound: newSound } = await Audio.Sound.createAsync(
      { uri: url },
      { shouldPlay: true },
      (status) => {
        if (status.didJustFinish && onFinishCallback) {
          onFinishCallback();
        }
      }
    );
    sound = newSound;
    isLoadingAudio = false;
    return true;
  } catch (err) {
    isLoadingAudio = false;
    sound = null;
    throw err;
  }
}

export async function pause() {
  if (sound) {
    try {
      await sound.pauseAsync();
    } catch {}
  }
}

export async function resume() {
  if (sound) {
    try {
      const status = await sound.getStatusAsync();
      if (status.isLoaded && !status.isPlaying) {
        await sound.playAsync();
        return true;
      }
    } catch {}
  }
  return false;
}

export async function stop() {
  if (sound) {
    try {
      await sound.stopAsync();
      await sound.unloadAsync();
    } catch {}
    sound = null;
  }
}

export function setOnFinish(callback) {
  onFinishCallback = callback;
}

export function getIsLoading() {
  return isLoadingAudio;
}
