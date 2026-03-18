// Adhan-Audio-Quellen
// Primär: islamcan.com (frei verfügbar)
// Fallback: Die App zeigt "Audio nicht verfügbar" wenn URLs nicht erreichbar sind
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
    description: 'Adhan aus der Heiligen Moschee in Mekka',
    uri: 'https://www.islamcan.com/audio/adhan/azan1.mp3',
  },
  {
    id: 'madinah',
    name: 'Madinah Adhan',
    description: 'Adhan aus der Prophetenmoschee in Medina',
    uri: 'https://www.islamcan.com/audio/adhan/azan2.mp3',
  },
  {
    id: 'mishary',
    name: 'Mishary Rashid',
    description: 'Mishary Rashid Alafasy',
    uri: 'https://www.islamcan.com/audio/adhan/azan3.mp3',
  },
  {
    id: 'alaqsa',
    name: 'Al-Aqsa Adhan',
    description: 'Adhan aus der Al-Aqsa Moschee',
    uri: 'https://www.islamcan.com/audio/adhan/azan4.mp3',
  },
];

export const MINUTES_BEFORE_OPTIONS = [0, 5, 10, 15, 30];
