// Hochwertige Adhan-Aufnahmen von bekannten islamischen Audio-CDNs
// Falls eine URL nicht erreichbar ist, zeigt die App "Audio nicht verfügbar"
// TODO: Lokale Adhan-Dateien in assets/audio/ ablegen für offline-Nutzung
export const ADHAN_SOUNDS = [
  {
    id: 'standard',
    name: 'Standard',
    description: 'System-Benachrichtigungston',
    uri: null,
  },
  {
    id: 'makkah',
    name: 'Makkah Adhan',
    description: 'Ali Ahmed Mulla — Heilige Moschee',
    uri: 'https://download.tvquran.com/download/selections/azanSounds/Azan_Makka.mp3',
  },
  {
    id: 'madinah',
    name: 'Madinah Adhan',
    description: 'Prophetenmoschee in Medina',
    uri: 'https://download.tvquran.com/download/selections/azanSounds/Azan_Madina.mp3',
  },
  {
    id: 'mishary',
    name: 'Mishary Rashid',
    description: 'Mishary Rashid Alafasy',
    uri: 'https://server6.mp3quran.net/thubati/Adhan.mp3',
  },
  {
    id: 'alaqsa',
    name: 'Al-Aqsa Adhan',
    description: 'Al-Aqsa Moschee, Jerusalem',
    uri: 'https://download.tvquran.com/download/selections/azanSounds/Azan_Quds.mp3',
  },
];

export const MINUTES_BEFORE_OPTIONS = [5, 10, 15];
