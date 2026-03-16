// Islamic events keyed by Hijri month and day
// month: 1=Muharram, 2=Safar, 3=Rabi al-Awwal, ... 9=Ramadan, 10=Shawwal, 12=Dhul Hijja

export const ISLAMIC_EVENTS = [
  {
    hijriMonth: 1,
    hijriDay: 1,
    emoji: '🌙',
    name: 'Islamisches Neujahr',
    nameAr: 'رأس السنة الهجرية',
    description: 'Beginn des neuen islamischen Jahres (1. Muharram).',
  },
  {
    hijriMonth: 1,
    hijriDay: 10,
    emoji: '🕌',
    name: 'Aschura',
    nameAr: 'عاشوراء',
    description: 'Tag des Fastens. Gedenken an die Errettung von Musa (Moses) durch Allah.',
  },
  {
    hijriMonth: 3,
    hijriDay: 12,
    emoji: '🕋',
    name: 'Mawlid an-Nabi',
    nameAr: 'المولد النبوي',
    description: 'Geburtstag des Propheten Muhammad ﷺ.',
  },
  {
    hijriMonth: 7,
    hijriDay: 27,
    emoji: '✨',
    name: 'Isra und Miraj',
    nameAr: 'الإسراء والمعراج',
    description: 'Die Nachtreise und Himmelfahrt des Propheten Muhammad ﷺ.',
  },
  {
    hijriMonth: 9,
    hijriDay: 1,
    emoji: '🌙',
    name: 'Ramadan Beginn',
    nameAr: 'بداية رمضان',
    description: 'Beginn des heiligen Fastenmonats Ramadan.',
  },
  {
    hijriMonth: 9,
    hijriDay: 27,
    emoji: '🌟',
    name: 'Laylat al-Qadr',
    nameAr: 'ليلة القدر',
    description: 'Die Nacht der Bestimmung — besser als tausend Monate.',
  },
  {
    hijriMonth: 10,
    hijriDay: 1,
    emoji: '🎉',
    name: 'Eid al-Fitr',
    nameAr: 'عيد الفطر',
    description: 'Fest des Fastenbrechens zum Ende des Ramadan.',
  },
  {
    hijriMonth: 12,
    hijriDay: 10,
    emoji: '🐑',
    name: 'Eid al-Adha',
    nameAr: 'عيد الأضحى',
    description: 'Opferfest — Gedenken an die Bereitschaft Ibrahims.',
  },
];

/**
 * Find event for a given Hijri month and day.
 */
export function getEventForHijriDate(hijriMonth, hijriDay) {
  return ISLAMIC_EVENTS.find(
    (e) => e.hijriMonth === hijriMonth && e.hijriDay === hijriDay
  ) || null;
}
