import { useState, useMemo, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { fetchGregorianMonth } from '../../features/calendar/hijriCalendar';
import { ISLAMIC_EVENTS, getEventsForHijriDate, getRangePosition } from '../../features/calendar/islamicEvents';
import { Spacing, FontSize, BorderRadius } from '../../constants/theme';
import Card from './Card';

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

const HIJRI_MONTH_NAMES = [
  '', 'Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani',
  'Jumada al-Ula', 'Jumada al-Thani', 'Rajab', 'Sha\'ban',
  'Ramadan', 'Shawwal', 'Dhul Qi\'dah', 'Dhul Hijja',
];

function getMonday(weekday) {
  const map = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6 };
  return map[weekday] ?? 0;
}

async function fetchHijriToGregorian(day, month, year) {
  try {
    const url = `https://api.aladhan.com/v1/hToG/${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}-${year}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    if (json.code !== 200 || !json.data) return null;
    const g = json.data.gregorian;
    return {
      day: parseInt(g.day, 10),
      month: parseInt(g.month.number, 10),
      year: parseInt(g.year, 10),
      monthName: g.month.en,
    };
  } catch {
    return null;
  }
}

function getCurrentHijriParts() {
  try {
    const parts = new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura', {
      day: 'numeric', month: 'numeric', year: 'numeric',
    }).formatToParts(new Date());
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

const DE_MONTHS = ['', 'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

function useUpcomingEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const hijri = getCurrentHijriParts();
      if (!hijri) { setLoading(false); return; }

      // Build list of upcoming single-day events + period start days
      const candidates = [];
      for (const ev of ISLAMIC_EVENTS) {
        // Skip sub-periods that overlap with major events on the same date
        if (ev.type === 'period' && ev.name === 'Erste 10 Tage Dhul Hijja') continue;

        const eventDay = ev.startDay;
        let monthDiff = ev.hijriMonth - hijri.month;
        if (monthDiff < 0) monthDiff += 12;
        if (monthDiff === 0 && eventDay < hijri.day) monthDiff = 12;
        const approxDays = Math.max(0, Math.round(monthDiff * 29.5 + (eventDay - hijri.day)));

        // Determine which Hijri year this occurrence falls in
        let eventYear = hijri.year;
        if (ev.hijriMonth < hijri.month || (ev.hijriMonth === hijri.month && eventDay < hijri.day)) {
          eventYear = hijri.year + 1;
        }

        candidates.push({ ...ev, approxDays, eventYear });
      }

      candidates.sort((a, b) => a.approxDays - b.approxDays);
      const top5 = candidates.slice(0, 5);

      // Fetch exact Gregorian dates from Aladhan API
      const results = [];
      for (const ev of top5) {
        const greg = await fetchHijriToGregorian(ev.startDay, ev.hijriMonth, ev.eventYear);
        if (cancelled) return;

        let gregStr = '';
        let daysUntil = ev.approxDays;

        if (greg) {
          gregStr = `${greg.day}. ${DE_MONTHS[greg.month]} ${greg.year}`;
          const target = new Date(greg.year, greg.month - 1, greg.day);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          target.setHours(0, 0, 0, 0);
          daysUntil = Math.max(0, Math.round((target - today) / 86400000));
        }

        const hijriStr = `${ev.startDay}. ${HIJRI_MONTH_NAMES[ev.hijriMonth]} ${ev.eventYear}`;

        results.push({ ...ev, gregStr, hijriStr, daysUntil });
      }

      if (!cancelled) {
        results.sort((a, b) => a.daysUntil - b.daysUntil);
        setEvents(results);
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return { events, loading };
}

export default function HijriCalendar({ t }) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState(null);

  const { data: days, isLoading } = useQuery({
    queryKey: ['hijriCalendar', viewYear, viewMonth],
    queryFn: () => fetchGregorianMonth(viewYear, viewMonth),
    staleTime: 1000 * 60 * 60 * 24,
  });

  const { events: upcomingEvents, loading: eventsLoading } = useUpcomingEvents();

  const monthLabel = new Date(viewYear, viewMonth - 1, 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });

  const prevMonth = () => {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
    setSelectedDay(null);
  };

  const nextMonth = () => {
    if (viewMonth === 12) { setViewMonth(1); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
    setSelectedDay(null);
  };

  // Build calendar grid
  const grid = useMemo(() => {
    if (!days || days.length === 0) return [];

    const firstDayOffset = getMonday(days[0].gregorian.weekday);
    const cells = [];

    for (let i = 0; i < firstDayOffset; i++) {
      cells.push({ empty: true, key: `e${i}` });
    }

    for (const day of days) {
      const events = getEventsForHijriDate(day.hijri.month, day.hijri.day);
      // Pick the most specific event for display (single-day > period)
      const primaryEvent = events.find((e) => !e.endDay) || events[0] || null;
      // Find any period event for band rendering
      const periodEvent = events.find((e) => e.endDay) || null;
      const rangePos = periodEvent ? getRangePosition(periodEvent, day.hijri.day) : null;

      const isToday =
        day.gregorian.day === now.getDate() &&
        day.gregorian.month === now.getMonth() + 1 &&
        day.gregorian.year === now.getFullYear();

      cells.push({
        ...day,
        events,
        event: primaryEvent,
        periodEvent,
        rangePos,
        isToday,
        key: `d${day.gregorian.day}`,
      });
    }

    return cells;
  }, [days]);

  const selectedInfo = selectedDay && !selectedDay.empty ? selectedDay : null;

  return (
    <>
      {/* Calendar Card */}
      <Card>
        {/* Month navigation */}
        <View style={cs.nav}>
          <Pressable onPress={prevMonth} hitSlop={12}>
            <Text style={{ fontSize: FontSize.lg, color: t.accent }}>{'<'}</Text>
          </Pressable>
          <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: t.text }}>{monthLabel}</Text>
          <Pressable onPress={nextMonth} hitSlop={12}>
            <Text style={{ fontSize: FontSize.lg, color: t.accent }}>{'>'}</Text>
          </Pressable>
        </View>

        {/* Weekday headers */}
        <View style={cs.weekRow}>
          {WEEKDAYS.map((d) => (
            <View key={d} style={cs.weekCell}>
              <Text style={{ fontSize: 10, fontWeight: '600', color: t.textDim }}>{d}</Text>
            </View>
          ))}
        </View>

        {/* Day grid */}
        {isLoading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={t.accent} />
            <Text style={{ fontSize: FontSize.xs, color: t.textDim, marginTop: 8 }}>Kalender wird geladen...</Text>
          </View>
        ) : (
          <View style={cs.grid}>
            {grid.map((cell) => {
              if (cell.empty) {
                return <View key={cell.key} style={cs.dayCell} />;
              }

              const isSelected = selectedInfo?.gregorian?.day === cell.gregorian.day;
              const hasEvent = cell.events && cell.events.length > 0;
              const hasPeriod = !!cell.periodEvent;
              const hasSingleEvent = cell.event && !cell.event.endDay;

              // Band styling for periods
              const bandStyle = hasPeriod ? {
                backgroundColor: t.accent + '18',
                borderTopLeftRadius: cell.rangePos?.isStart ? 6 : 0,
                borderBottomLeftRadius: cell.rangePos?.isStart ? 6 : 0,
                borderTopRightRadius: cell.rangePos?.isEnd ? 6 : 0,
                borderBottomRightRadius: cell.rangePos?.isEnd ? 6 : 0,
              } : {};

              return (
                <Pressable
                  key={cell.key}
                  style={[
                    cs.dayCell,
                    bandStyle,
                    cell.isToday && { backgroundColor: t.accent + '30', borderRadius: 6 },
                    isSelected && { backgroundColor: t.accent + '40', borderRadius: 6 },
                  ]}
                  onPress={() => setSelectedDay(cell)}
                >
                  <Text style={{
                    fontSize: 12,
                    fontWeight: cell.isToday || hasEvent ? '700' : '400',
                    color: cell.isToday ? t.accent : hasEvent ? t.accent : t.text,
                  }}>
                    {cell.gregorian.day}
                  </Text>
                  <Text style={{ fontSize: 8, color: hasEvent ? t.accent : t.textDim }}>
                    {cell.hijri.day}
                  </Text>
                  {hasSingleEvent && (
                    <View style={[cs.eventDot, { backgroundColor: t.accent }]} />
                  )}
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Selected day info */}
        {selectedInfo && (
          <View style={[cs.selectedBox, { backgroundColor: t.accent + '08', borderColor: t.accent + '20' }]}>
            <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: t.text }}>
              {selectedInfo.gregorian.day}. {new Date(selectedInfo.gregorian.year, selectedInfo.gregorian.month - 1).toLocaleDateString('de-DE', { month: 'long' })} {selectedInfo.gregorian.year}
            </Text>
            <Text style={{ fontSize: FontSize.sm, color: t.accent, marginTop: 2 }}>
              {selectedInfo.hijri.day}. {selectedInfo.hijri.monthNameEn} {selectedInfo.hijri.year} AH
            </Text>
            {selectedInfo.events && selectedInfo.events.length > 0 && selectedInfo.events.map((ev) => (
              <View key={ev.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                <Text style={{ fontSize: 18 }}>{ev.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: t.accent }}>{ev.name}</Text>
                  <Text style={{ fontSize: FontSize.xs, color: t.textDim, marginTop: 1 }}>{ev.nameAr}</Text>
                  <Text style={{ fontSize: FontSize.xs, color: t.textDim, marginTop: 2 }}>{ev.description}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </Card>

      {/* Upcoming events */}
      <Card>
        <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: t.text, marginBottom: Spacing.md }}>Nächste Feiertage</Text>
        {eventsLoading ? (
          <View style={{ paddingVertical: Spacing.lg, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={t.accent} />
            <Text style={{ fontSize: FontSize.xs, color: t.textDim, marginTop: 8 }}>Daten werden geladen...</Text>
          </View>
        ) : upcomingEvents.length > 0 ? (
          upcomingEvents.map((ev, i) => (
            <View key={`${ev.hijriMonth}-${ev.startDay}-${ev.name}`} style={[cs.eventRow, i < upcomingEvents.length - 1 && { borderBottomWidth: 1, borderBottomColor: t.border }]}>
              <Text style={{ fontSize: 24, marginRight: 12 }}>{ev.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: t.text }}>{ev.name}</Text>
                {ev.gregStr ? (
                  <Text style={{ fontSize: FontSize.xs, color: t.textDim, marginTop: 2 }}>
                    {ev.gregStr} ({ev.hijriStr})
                  </Text>
                ) : (
                  <Text style={{ fontSize: FontSize.xs, color: t.textDim, marginTop: 2 }}>{ev.hijriStr}</Text>
                )}
              </View>
              <View style={[cs.countdownBadge, { backgroundColor: t.accent + '15' }]}>
                <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: t.accent }}>
                  {ev.daysUntil === 0 ? 'Heute' : ev.daysUntil === 1 ? 'Morgen' : `in ${ev.daysUntil} Tagen`}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={{ fontSize: FontSize.sm, color: t.textDim, textAlign: 'center' }}>Keine Daten verfügbar</Text>
        )}
      </Card>
    </>
  );
}

const cs = StyleSheet.create({
  nav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekCell: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', alignItems: 'center', paddingVertical: 4, minHeight: 44, justifyContent: 'center' },
  eventDot: { width: 5, height: 5, borderRadius: 2.5, marginTop: 1 },
  selectedBox: { marginTop: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1 },
  eventRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm },
  countdownBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
});
