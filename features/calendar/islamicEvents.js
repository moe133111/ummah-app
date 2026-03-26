// Islamic events keyed by Hijri month and day
// month: 1=Muharram, 2=Safar, 3=Rabi al-Awwal, ... 9=Ramadan, 10=Shawwal, 12=Dhul Hijja

export const ISLAMIC_EVENTS = [
  {
    name: 'Islamisches Neujahr',
    nameAr: 'رأس السنة الهجرية',
    icon: 'moon-outline',
    hijriMonth: 1,
    startDay: 1,
    endDay: null,
    description: 'Beginn des neuen islamischen Jahres (1. Muharram).',
    type: 'major',
  },
  {
    name: 'Aschura',
    nameAr: 'عاشوراء',
    icon: 'business-outline',
    hijriMonth: 1,
    startDay: 10,
    endDay: null,
    description: 'Tag des Fastens. Gedenken an die Errettung von Musa (Moses) durch Allah.',
    type: 'major',
  },
  {
    name: 'Mawlid an-Nabi',
    nameAr: 'المولد النبوي',
    icon: 'star-outline',
    hijriMonth: 3,
    startDay: 12,
    endDay: null,
    description: 'Geburtstag des Propheten Muhammad ﷺ.',
    type: 'major',
  },
  {
    name: 'Isra und Miraj',
    nameAr: 'الإسراء والمعراج',
    icon: 'sparkles',
    hijriMonth: 7,
    startDay: 27,
    endDay: null,
    description: 'Die Nachtreise und Himmelfahrt des Propheten Muhammad ﷺ.',
    type: 'major',
  },
  {
    name: 'Laylat al-Bara\'a',
    nameAr: 'ليلة البراءة',
    icon: 'ellipse-outline',
    hijriMonth: 8,
    startDay: 15,
    endDay: null,
    description: 'Die Nacht der Vergebung (Sha\'ban Nacht).',
    type: 'minor',
  },
  {
    name: 'Ramadan',
    nameAr: 'رمضان',
    icon: 'moon-outline',
    hijriMonth: 9,
    startDay: 1,
    endDay: 30,
    description: 'Der heilige Fastenmonat.',
    type: 'period',
  },
  {
    name: 'Laylat al-Qadr',
    nameAr: 'ليلة القدر',
    icon: 'sparkles',
    hijriMonth: 9,
    startDay: 27,
    endDay: null,
    description: 'Die Nacht der Bestimmung — besser als tausend Monate.',
    type: 'major',
  },
  {
    name: 'Eid al-Fitr',
    nameAr: 'عيد الفطر',
    icon: 'gift-outline',
    hijriMonth: 10,
    startDay: 1,
    endDay: 3,
    description: 'Fest des Fastenbrechens zum Ende des Ramadan.',
    type: 'period',
  },
  {
    name: 'Erste 10 Tage Dhul Hijja',
    nameAr: 'عشر ذي الحجة',
    icon: 'calendar-outline',
    hijriMonth: 12,
    startDay: 1,
    endDay: 10,
    description: 'Die gesegneten ersten zehn Tage von Dhul Hijja.',
    type: 'period',
  },
  {
    name: 'Arafat-Tag',
    nameAr: 'يوم عرفة',
    icon: 'hand-left-outline',
    hijriMonth: 12,
    startDay: 9,
    endDay: null,
    description: 'Der Tag der Bittgebete auf dem Berg Arafat.',
    type: 'major',
  },
  {
    name: 'Eid al-Adha',
    nameAr: 'عيد الأضحى',
    icon: 'gift-outline',
    hijriMonth: 12,
    startDay: 10,
    endDay: 13,
    description: 'Opferfest — Gedenken an die Bereitschaft Ibrahims.',
    type: 'period',
  },
];

/**
 * Find all events for a given Hijri month and day.
 * Returns an array of matching events (a day can belong to multiple events/periods).
 */
export function getEventsForHijriDate(hijriMonth, hijriDay) {
  return ISLAMIC_EVENTS.filter((e) => {
    if (e.hijriMonth !== hijriMonth) return false;
    if (e.endDay) {
      return hijriDay >= e.startDay && hijriDay <= e.endDay;
    }
    return hijriDay === e.startDay;
  });
}

/**
 * Get range info for a day within an event period.
 * Returns { isStart, isEnd, isMid } or null.
 */
export function getRangePosition(event, hijriDay) {
  if (!event.endDay) return null;
  const isStart = hijriDay === event.startDay;
  const isEnd = hijriDay === event.endDay;
  return { isStart, isEnd, isMid: !isStart && !isEnd };
}

// Keep backward compat
export function getEventForHijriDate(hijriMonth, hijriDay) {
  const events = getEventsForHijriDate(hijriMonth, hijriDay);
  return events.length > 0 ? events[0] : null;
}
