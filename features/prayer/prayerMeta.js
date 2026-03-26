export const PRAYER_META = {
  fajr: { name: 'Fajr', emoji: '🌄', icon: 'moon-outline', color: '#1A237E', gradient: ['#1A237E', '#283593'], description: 'Morgendämmerung', trackable: true },
  sunrise: { name: 'Sunrise', emoji: '🌅', icon: 'sunny-outline', color: '#E65100', gradient: ['#E65100', '#FF6D00'], description: 'Sonnenaufgang', trackable: false },
  dhuhr: { name: 'Dhuhr', emoji: '☀️', icon: 'sunny', color: '#F9A825', gradient: ['#F57F17', '#F9A825'], description: 'Mittag', trackable: true },
  asr: { name: 'Asr', emoji: '🌤️', icon: 'partly-sunny-outline', color: '#FF8F00', gradient: ['#FF8F00', '#FFA726'], description: 'Nachmittag', trackable: true },
  maghrib: { name: 'Maghrib', emoji: '🌇', icon: 'cloudy-night-outline', color: '#BF360C', gradient: ['#BF360C', '#E64A19'], description: 'Sonnenuntergang', trackable: true },
  isha: { name: 'Isha', emoji: '🌙', icon: 'moon', color: '#0D47A1', gradient: ['#0D47A1', '#1565C0'], description: 'Nacht', trackable: true },
};

export const PRAYER_ORDER = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

export const TRACKABLE_KEYS = Object.entries(PRAYER_META)
  .filter(([, m]) => m.trackable)
  .map(([k]) => k);
