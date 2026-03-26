const HIJRI_MONTH_NAMES_EN = [
  '', 'Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani',
  'Jumada al-Ula', 'Jumada al-Thani', 'Rajab', "Sha'ban",
  'Ramadan', 'Shawwal', "Dhul Qi'dah", 'Dhul Hijja',
];

const WEEKDAY_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Get Hijri date for any gregorian Date using Intl (offline, no API).
 */
export function getHijriForDate(date) {
  try {
    const parts = new Intl.DateTimeFormat('en-US-u-ca-islamic-civil', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    }).formatToParts(date);

    let day, month, year;
    for (const p of parts) {
      if (p.type === 'day') day = parseInt(p.value, 10);
      if (p.type === 'month') month = parseInt(p.value, 10);
      if (p.type === 'year') year = parseInt(p.value, 10);
    }
    return {
      day,
      month,
      monthNameEn: HIJRI_MONTH_NAMES_EN[month] || '',
      year,
    };
  } catch {
    return null;
  }
}

/**
 * Build a full month of day objects with gregorian + hijri data (offline).
 */
export function buildMonthGrid(year, month) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const days = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d);
    const hijri = getHijriForDate(date);
    days.push({
      gregorian: {
        day: d,
        month,
        year,
        weekday: WEEKDAY_EN[date.getDay()],
      },
      hijri: hijri || { day: d, month: 1, monthNameEn: '', year: 1400 },
    });
  }

  return days;
}

/**
 * Get the current Hijri date using Intl (fast, no API needed).
 */
export function getCurrentHijriDate() {
  return getHijriForDate(new Date());
}
