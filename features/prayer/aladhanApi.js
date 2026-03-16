import AsyncStorage from '@react-native-async-storage/async-storage';

// Map internal method keys to Aladhan API method numbers
const METHOD_MAP = {
  MWL: 3,
  ISNA: 2,
  EGYPTIAN: 5,
  UMM_AL_QURA: 4,
  KARACHI: 1,
  DIYANET: 13,
};

function getCacheKey(lat, lng, method, dateStr) {
  return `prayer_${lat.toFixed(2)}_${lng.toFixed(2)}_${method}_${dateStr}`;
}

function formatDateForApi(date) {
  const d = date.getDate();
  const m = date.getMonth() + 1;
  const y = date.getFullYear();
  return `${String(d).padStart(2, '0')}-${String(m).padStart(2, '0')}-${y}`;
}

function toDateString(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Fetch prayer times from Aladhan API with AsyncStorage caching.
 * Returns { times, source } where source is 'aladhan', 'cache', or 'local'.
 */
export async function fetchPrayerTimesFromApi(lat, lng, method = 'MWL', date = new Date()) {
  const dateStr = toDateString(date);
  const cacheKey = getCacheKey(lat, lng, method, dateStr);

  // 1. Try cache first
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      return { times: JSON.parse(cached), source: 'cache' };
    }
  } catch {
    // Cache read failed, continue to API
  }

  // 2. Try Aladhan API
  const apiMethod = METHOD_MAP[method] || 3;
  const timestamp = Math.floor(date.getTime() / 1000);
  const url = `https://api.aladhan.com/v1/timings/${timestamp}?latitude=${lat}&longitude=${lng}&method=${apiMethod}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (data.code !== 200 || !data.data?.timings) {
      throw new Error('Invalid API response');
    }

    const t = data.data.timings;
    const times = {
      fajr: t.Fajr?.substring(0, 5),
      sunrise: t.Sunrise?.substring(0, 5),
      dhuhr: t.Dhuhr?.substring(0, 5),
      asr: t.Asr?.substring(0, 5),
      maghrib: t.Maghrib?.substring(0, 5),
      isha: t.Isha?.substring(0, 5),
    };

    // Save to cache
    try {
      await AsyncStorage.setItem(cacheKey, JSON.stringify(times));
    } catch {
      // Cache write failed, non-critical
    }

    return { times, source: 'aladhan' };
  } catch {
    // API failed, return null so caller can use fallback
    return null;
  }
}
