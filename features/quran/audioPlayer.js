import { Audio } from 'expo-av';

let sound = null;
let onFinishCallback = null;
let isLoadingAudio = false;

const PRIMARY_URL = (n) => `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${n}.mp3`;
const FALLBACK_URL = (n) => `https://verses.quran.com/Alafasy/mp3/${String(n).padStart(3, '0')}.mp3`;

export async function initAudioMode() {
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
    });
    console.log('[AudioPlayer] Audio mode initialized');
  } catch (err) {
    console.error('[AudioPlayer] Failed to set audio mode:', err);
  }
}

export async function playAyah(globalNumber) {
  if (!globalNumber || globalNumber < 1 || globalNumber > 6236) {
    const msg = `Invalid global ayah number: ${globalNumber}`;
    console.error('[AudioPlayer]', msg);
    throw new Error(msg);
  }

  isLoadingAudio = true;

  // Unload previous sound
  if (sound) {
    try {
      await sound.unloadAsync();
    } catch {}
    sound = null;
  }

  const url = PRIMARY_URL(globalNumber);
  console.log('[AudioPlayer] Playing ayah', globalNumber, '→', url);

  // Try primary URL first, then fallback
  for (const tryUrl of [url, FALLBACK_URL(globalNumber)]) {
    try {
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: tryUrl },
        { shouldPlay: true },
        (status) => {
          if (status.didJustFinish && onFinishCallback) {
            onFinishCallback();
          }
        }
      );
      sound = newSound;
      isLoadingAudio = false;
      console.log('[AudioPlayer] Playback started from:', tryUrl);
      return true;
    } catch (err) {
      console.warn('[AudioPlayer] Failed to load from', tryUrl, ':', err.message);
      // Continue to fallback
    }
  }

  // Both URLs failed
  isLoadingAudio = false;
  sound = null;
  const errorMsg = `Could not load audio for ayah ${globalNumber} from either CDN`;
  console.error('[AudioPlayer]', errorMsg);
  throw new Error(errorMsg);
}

export async function pause() {
  if (sound) {
    try {
      await sound.pauseAsync();
      console.log('[AudioPlayer] Paused');
    } catch (err) {
      console.error('[AudioPlayer] Pause failed:', err);
    }
  }
}

export async function resume() {
  if (sound) {
    try {
      const status = await sound.getStatusAsync();
      if (status.isLoaded && !status.isPlaying) {
        await sound.playAsync();
        console.log('[AudioPlayer] Resumed');
        return true;
      }
    } catch (err) {
      console.error('[AudioPlayer] Resume failed:', err);
    }
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
    console.log('[AudioPlayer] Stopped');
  }
}

export function setOnFinish(callback) {
  onFinishCallback = callback;
}

export function getIsLoading() {
  return isLoadingAudio;
}
