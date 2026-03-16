import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'hijri_cal_';

/**
 * Fetch a Gregorian month's calendar data with Hijri dates from Aladhan API.
 * Returns array of day objects with gregorian and hijri info.
 */
export async function fetchGregorianMonth(year, month) {
  const cacheKey = `${CACHE_PREFIX}${year}_${month}`;

  // Try cache
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch {
    // ignore
  }

  try {
    const url = `https://api.aladhan.com/v1/gpiCalendar/${month}/${year}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    if (json.code !== 200 || !json.data) throw new Error('Invalid response');

    const days = json.data.map((day) => ({
      gregorian: {
        date: day.gregorian.date, // DD-MM-YYYY
        day: parseInt(day.gregorian.day, 10),
        month: parseInt(day.gregorian.month.number, 10),
        year: parseInt(day.gregorian.year, 10),
        weekday: day.gregorian.weekday.en,
      },
      hijri: {
        day: parseInt(day.hijri.day, 10),
        month: parseInt(day.hijri.month.number, 10),
        monthName: day.hijri.month.ar,
        monthNameEn: day.hijri.month.en,
        year: parseInt(day.hijri.year, 10),
      },
    }));

    // Cache for this month
    try {
      await AsyncStorage.setItem(cacheKey, JSON.stringify(days));
    } catch {
      // ignore
    }

    return days;
  } catch {
    return null;
  }
}

/**
 * Get the current Hijri date using Intl (fast, no API needed).
 */
export function getCurrentHijriDate() {
  try {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    }).formatToParts(now);

    let day, month, year;
    for (const p of parts) {
      if (p.type === 'day') day = parseInt(p.value, 10);
      if (p.type === 'month') month = parseInt(p.value, 10);
      if (p.type === 'year') year = parseInt(p.value, 10);
    }
    return { day, month, year };
  } catch {
    return null;
  }
}
