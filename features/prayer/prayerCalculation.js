import { fetchPrayerTimesFromApi } from './aladhanApi';

const METHODS = {
  MWL: { name: 'Muslim World League', fajrAngle: 18, ishaAngle: 17 },
  ISNA: { name: 'Islamic Society of North America', fajrAngle: 15, ishaAngle: 15 },
  EGYPTIAN: { name: 'Egyptian General Authority', fajrAngle: 19.5, ishaAngle: 17.5 },
  UMM_AL_QURA: { name: 'Umm al-Qura, Makkah', fajrAngle: 18.5, ishaAngle: 90, ishaMinutes: 90 },
  KARACHI: { name: 'University of Islamic Sciences, Karachi', fajrAngle: 18, ishaAngle: 18 },
  DIYANET: { name: 'Diyanet İşleri Başkanlığı, Türkei', fajrAngle: 18, ishaAngle: 17 },
};

function toJulianDate(y, m, d) {
  if (m <= 2) { y--; m += 12; }
  const A = Math.floor(y / 100);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + 2 - A + Math.floor(A / 4) - 1524.5;
}

function sunPosition(jd) {
  const D = jd - 2451545.0;
  const g = (357.529 + 0.98560028 * D) % 360;
  const q = (280.459 + 0.98564736 * D) % 360;
  const L = (q + 1.915 * Math.sin(g * Math.PI / 180) + 0.020 * Math.sin(2 * g * Math.PI / 180)) % 360;
  const e = 23.439 - 0.00000036 * D;
  const RA = Math.atan2(Math.cos(e * Math.PI / 180) * Math.sin(L * Math.PI / 180), Math.cos(L * Math.PI / 180)) * 180 / Math.PI;
  const dec = Math.asin(Math.sin(e * Math.PI / 180) * Math.sin(L * Math.PI / 180)) * 180 / Math.PI;
  let EqT = q / 15 - ((RA / 15 + 24) % 24);
  return { dec, EqT: EqT > 12 ? EqT - 24 : EqT < -12 ? EqT + 24 : EqT };
}

function hourAngle(lat, dec, angle) {
  const cosHA = (Math.sin(angle * Math.PI / 180) - Math.sin(lat * Math.PI / 180) * Math.sin(dec * Math.PI / 180)) / (Math.cos(lat * Math.PI / 180) * Math.cos(dec * Math.PI / 180));
  return Math.acos(Math.min(1, Math.max(-1, cosHA))) * 180 / Math.PI / 15;
}

function fmt(h) { h = ((h % 24) + 24) % 24; const hr = Math.floor(h); const m = Math.round((h - hr) * 60); return `${String(hr).padStart(2,'0')}:${String(m === 60 ? 0 : m).padStart(2,'0')}`; }

export function calculatePrayerTimes(lat, lng, date, method = 'MWL') {
  const c = METHODS[method] || METHODS.MWL;
  const jd = toJulianDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const { dec, EqT } = sunPosition(jd);
  const tz = -date.getTimezoneOffset() / 60;
  const dhuhr = 12 + tz - lng / 15 - EqT;
  const fajrHA = hourAngle(lat, dec, -c.fajrAngle);
  const sunriseHA = hourAngle(lat, dec, -0.833);
  const asrA = Math.atan(1 / (1 + Math.tan(Math.abs(lat - dec) * Math.PI / 180))) * 180 / Math.PI;
  const asrHA = hourAngle(lat, dec, asrA);
  const isha = c.ishaMinutes ? dhuhr + sunriseHA + c.ishaMinutes / 60 : dhuhr + hourAngle(lat, dec, -c.ishaAngle);
  return { fajr: fmt(dhuhr - fajrHA), sunrise: fmt(dhuhr - sunriseHA), dhuhr: fmt(dhuhr), asr: fmt(dhuhr + asrHA), maghrib: fmt(dhuhr + sunriseHA), isha: fmt(isha) };
}

export function calculateQiblaDirection(lat, lng) {
  const kLat = 21.4225 * Math.PI / 180, kLng = 39.8262 * Math.PI / 180, lR = lat * Math.PI / 180, lgR = lng * Math.PI / 180;
  return (Math.atan2(Math.sin(kLng - lgR), Math.cos(lR) * Math.tan(kLat) - Math.sin(lR) * Math.cos(kLng - lgR)) * 180 / Math.PI + 360) % 360;
}

export function distanceToKaaba(lat, lng) {
  return Math.round(6371 * Math.acos(Math.sin(lat * Math.PI / 180) * Math.sin(21.4225 * Math.PI / 180) + Math.cos(lat * Math.PI / 180) * Math.cos(21.4225 * Math.PI / 180) * Math.cos((39.8262 - lng) * Math.PI / 180)));
}

export function getNextPrayer(times) {
  const now = new Date(), cur = now.getHours() * 60 + now.getMinutes();
  const order = ['fajr','sunrise','dhuhr','asr','maghrib','isha'];
  const names = { fajr:'Fajr', sunrise:'Sunrise', dhuhr:'Dhuhr', asr:'Asr', maghrib:'Maghrib', isha:'Isha' };
  for (const k of order) { const [h,m] = times[k].split(':').map(Number); if (h*60+m > cur) return { key:k, name:names[k], time:times[k] }; }
  return { key:'fajr', name:'Fajr', time:times.fajr, tomorrow:true };
}

export function getAvailableMethods() { return Object.entries(METHODS).map(([key, val]) => ({ key, name: val.name })); }

/**
 * Fetch prayer times: try Aladhan API first, fall back to local calculation.
 * Returns { times, source } where source is 'aladhan', 'cache', or 'local'.
 */
export async function fetchPrayerTimes(lat, lng, method = 'MWL', date = new Date()) {
  const apiResult = await fetchPrayerTimesFromApi(lat, lng, method, date);
  if (apiResult) return apiResult;
  // Fallback to local calculation
  return { times: calculatePrayerTimes(lat, lng, date, method), source: 'local' };
}

export const METHOD_RECOMMENDATIONS = [
  { region: 'Europa / Deutschland', methods: ['MWL', 'ISNA'] },
  { region: 'Türkei', methods: ['DIYANET'] },
  { region: 'Ägypten / Nordafrika', methods: ['EGYPTIAN'] },
  { region: 'Saudi-Arabien / Golf', methods: ['UMM_AL_QURA'] },
  { region: 'Pakistan / Südasien', methods: ['KARACHI'] },
];

export { METHODS };
