import { useState, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { fetchGregorianMonth } from '../../features/calendar/hijriCalendar';
import { ISLAMIC_EVENTS, getEventForHijriDate } from '../../features/calendar/islamicEvents';
import { Spacing, FontSize, BorderRadius } from '../../constants/theme';
import Card from './Card';

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

function getMonday(weekday) {
  const map = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6 };
  return map[weekday] ?? 0;
}

function getUpcomingEvents() {
  const now = new Date();
  let currentHijriMonth, currentHijriDay, currentHijriYear;
  try {
    const parts = new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura', {
      day: 'numeric', month: 'numeric', year: 'numeric',
    }).formatToParts(now);
    for (const p of parts) {
      if (p.type === 'day') currentHijriDay = parseInt(p.value, 10);
      if (p.type === 'month') currentHijriMonth = parseInt(p.value, 10);
      if (p.type === 'year') currentHijriYear = parseInt(p.value, 10);
    }
  } catch {
    return [];
  }

  if (!currentHijriMonth || !currentHijriYear) return [];

  // Calculate approximate days until each event
  const results = [];
  for (const ev of ISLAMIC_EVENTS) {
    let monthDiff = ev.hijriMonth - currentHijriMonth;
    if (monthDiff < 0) monthDiff += 12;
    if (monthDiff === 0 && ev.hijriDay < currentHijriDay) monthDiff = 12;
    const approxDays = monthDiff * 29.5 + (ev.hijriDay - currentHijriDay);
    const daysUntil = Math.max(0, Math.round(approxDays));
    results.push({ ...ev, daysUntil });
  }

  results.sort((a, b) => a.daysUntil - b.daysUntil);
  return results.slice(0, 4);
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

  const upcomingEvents = useMemo(() => getUpcomingEvents(), []);

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

    // Empty cells before first day
    for (let i = 0; i < firstDayOffset; i++) {
      cells.push({ empty: true, key: `e${i}` });
    }

    for (const day of days) {
      const event = getEventForHijriDate(day.hijri.month, day.hijri.day);
      const isToday =
        day.gregorian.day === now.getDate() &&
        day.gregorian.month === now.getMonth() + 1 &&
        day.gregorian.year === now.getFullYear();

      cells.push({
        ...day,
        event,
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
              return (
                <Pressable
                  key={cell.key}
                  style={[
                    cs.dayCell,
                    cell.isToday && { backgroundColor: t.accent + '20', borderRadius: 6 },
                    isSelected && { backgroundColor: t.accent + '30', borderRadius: 6 },
                    cell.event && { borderWidth: 1, borderColor: t.accent + '55', borderRadius: 6 },
                  ]}
                  onPress={() => setSelectedDay(cell)}
                >
                  <Text style={[
                    { fontSize: 12, fontWeight: cell.isToday ? '700' : '400', color: cell.isToday ? t.accent : t.text },
                  ]}>
                    {cell.gregorian.day}
                  </Text>
                  <Text style={{ fontSize: 8, color: cell.event ? t.accent : t.textDim }}>
                    {cell.hijri.day}
                  </Text>
                  {cell.event && (
                    <Text style={{ fontSize: 8, lineHeight: 10 }}>{cell.event.emoji}</Text>
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
            {selectedInfo.event && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                <Text style={{ fontSize: 18 }}>{selectedInfo.event.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: t.accent }}>{selectedInfo.event.name}</Text>
                  <Text style={{ fontSize: FontSize.xs, color: t.textDim, marginTop: 2 }}>{selectedInfo.event.description}</Text>
                </View>
              </View>
            )}
          </View>
        )}
      </Card>

      {/* Upcoming events */}
      {upcomingEvents.length > 0 && (
        <Card>
          <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: t.text, marginBottom: Spacing.md }}>Kommende Feiertage</Text>
          {upcomingEvents.map((ev) => (
            <View key={`${ev.hijriMonth}-${ev.hijriDay}`} style={[cs.eventRow, { borderBottomColor: t.border }]}>
              <Text style={{ fontSize: 24, marginRight: 12 }}>{ev.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: t.text }}>{ev.name}</Text>
                <Text style={{ fontSize: FontSize.xs, color: t.textDim }}>{ev.nameAr}</Text>
              </View>
              <View style={[cs.countdownBadge, { backgroundColor: t.accent + '15' }]}>
                <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: t.accent }}>
                  {ev.daysUntil === 0 ? 'Heute' : `${ev.daysUntil} Tage`}
                </Text>
              </View>
            </View>
          ))}
        </Card>
      )}
    </>
  );
}

const cs = StyleSheet.create({
  nav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekCell: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', alignItems: 'center', paddingVertical: 4, minHeight: 40, justifyContent: 'center' },
  selectedBox: { marginTop: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1 },
  eventRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1 },
  countdownBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
});
