// Adhan-Sounds — CDN-URLs von aladhan.com
// Falls eine URL nicht erreichbar ist, zeigt die App einen Alert
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
    uri: 'https://cdn.aladhan.com/audio/adhaan/1.mp3',
  },
  {
    id: 'madinah',
    name: 'Madinah Adhan',
    description: 'Prophetenmoschee in Medina',
    uri: 'https://cdn.aladhan.com/audio/adhaan/2.mp3',
  },
  {
    id: 'mishary',
    name: 'Mishary Rashid',
    description: 'Mishary Rashid Alafasy',
    uri: 'https://cdn.aladhan.com/audio/adhaan/3.mp3',
  },
  {
    id: 'alaqsa',
    name: 'Al-Aqsa Adhan',
    description: 'Al-Aqsa Moschee, Jerusalem',
    uri: 'https://cdn.aladhan.com/audio/adhaan/4.mp3',
  },
];

export const REMINDER_OPTIONS = [
  { value: 0, label: 'Sofort' },
  { value: 5, label: '5 Min' },
  { value: 10, label: '10 Min' },
  { value: 15, label: '15 Min' },
];
