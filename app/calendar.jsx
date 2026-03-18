import { useState, useMemo, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { buildMonthGrid, getHijriForDate } from '../features/calendar/hijriCalendar';
import { ISLAMIC_EVENTS, getEventsForHijriDate, getRangePosition } from '../features/calendar/islamicEvents';
import { useAppStore } from '../hooks/useAppStore';
import { DarkTheme, LightTheme, Spacing, FontSize, BorderRadius } from '../constants/theme';
import Card from '../components/ui/Card';

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

const HIJRI_MONTH_NAMES = [
  '', 'Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani',
  'Jumada al-Ula', 'Jumada al-Thani', 'Rajab', "Sha'ban",
  'Ramadan', 'Shawwal', "Dhul Qi'dah", 'Dhul Hijja',
];

const DE_MONTHS = ['', 'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const DE_WEEKDAYS_LONG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

function getMondayOffset(weekdayEn) {
  const map = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6 };
  return map[weekdayEn] ?? 0;
}

export default function CalendarScreen() {
  const isDark = useAppStore((s) => s.theme === 'dark');
  const t = isDark ? DarkTheme : LightTheme;
  const router = useRouter();

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState(null);

  const days = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  const monthLabel = `${DE_MONTHS[viewMonth]} ${viewYear}`;

  const hijriMonthLabel = useMemo(() => {
    if (!days || days.length === 0) return '';
    const first = days[0].hijri;
    const last = days[days.length - 1].hijri;
    if (first.month === last.month) {
      return `${HIJRI_MONTH_NAMES[first.month]} ${first.year}`;
    }
    return `${HIJRI_MONTH_NAMES[first.month]} / ${HIJRI_MONTH_NAMES[last.month]} ${last.year}`;
  }, [days]);

  const prevMonth = useCallback(() => {
    if (viewMonth === 1) { setViewMonth(12); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
    setSelectedDay(null);
  }, [viewMonth]);

  const nextMonth = useCallback(() => {
    if (viewMonth === 12) { setViewMonth(1); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
    setSelectedDay(null);
  }, [viewMonth]);

  const grid = useMemo(() => {
    if (!days || days.length === 0) return [];
    const firstDayOffset = getMondayOffset(days[0].gregorian.weekday);
    const cells = [];
    for (let i = 0; i < firstDayOffset; i++) {
      cells.push({ empty: true, key: `e${i}` });
    }
    for (const day of days) {
      const events = getEventsForHijriDate(day.hijri.month, day.hijri.day);
      const primaryEvent = events.find((e) => !e.endDay) || events[0] || null;
      const periodEvent = events.find((e) => e.endDay) || null;
      const rangePos = periodEvent ? getRangePosition(periodEvent, day.hijri.day) : null;
      const dayKey = `${day.gregorian.year}-${day.gregorian.month}-${day.gregorian.day}`;
      const isToday = dayKey === todayStr;
      const isPast = new Date(day.gregorian.year, day.gregorian.month - 1, day.gregorian.day) < new Date(now.getFullYear(), now.getMonth(), now.getDate());

      cells.push({
        ...day,
        events,
        event: primaryEvent,
        periodEvent,
        rangePos,
        isToday,
        isPast,
        key: `d${day.gregorian.day}`,
      });
    }
    return cells;
  }, [days]);

  // Upcoming events (offline — scan next 400 days)
  const upcomingEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const results = [];
    const seen = new Set();

    for (let offset = 0; offset <= 400; offset++) {
      const date = new Date(today);
      date.setDate(date.getDate() + offset);
      const hijri = getHijriForDate(date);
      if (!hijri) continue;

      const dayEvents = getEventsForHijriDate(hijri.month, hijri.day);
      for (const ev of dayEvents) {
        if (ev.type === 'period' && ev.name === 'Erste 10 Tage Dhul Hijja') continue;
        // Only track start of events
        if (ev.endDay && hijri.day !== ev.startDay) continue;
        const evKey = `${ev.name}-${hijri.year}`;
        if (seen.has(evKey)) continue;
        seen.add(evKey);

        const gregStr = `${date.getDate()}. ${DE_MONTHS[date.getMonth() + 1]} ${date.getFullYear()}`;
        const hijriStr = `${hijri.day}. ${HIJRI_MONTH_NAMES[hijri.month]} ${hijri.year}`;
        results.push({ ...ev, gregStr, hijriStr, daysUntil: offset });
        if (results.length >= 5) break;
      }
      if (results.length >= 5) break;
    }
    return results;
  }, []);

  const selectedInfo = selectedDay && !selectedDay.empty ? selectedDay : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.lg }}>
          <Pressable onPress={() => router.back()} style={s.backBtn}>
            <Text style={{ fontSize: 20, color: t.accent }}>←</Text>
          </Pressable>
          <Text style={{ fontSize: FontSize.xl, fontWeight: '700', color: t.text, flex: 1, textAlign: 'center' }}>Islamischer Kalender</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Month Navigation */}
        <Card>
          <View style={s.nav}>
            <Pressable onPress={prevMonth} style={s.navArrow}>
              <Text style={{ fontSize: 20, color: t.accent }}>←</Text>
            </Pressable>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: t.text }}>{monthLabel}</Text>
              {hijriMonthLabel ? (
                <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: t.accent, marginTop: Spacing.xs }}>{hijriMonthLabel}</Text>
              ) : null}
            </View>
            <Pressable onPress={nextMonth} style={s.navArrow}>
              <Text style={{ fontSize: 20, color: t.accent }}>→</Text>
            </Pressable>
          </View>

          {/* Weekday headers */}
          <View style={s.weekRow}>
            {WEEKDAYS.map((d, i) => (
              <View key={d} style={[s.weekCell, i === 4 && { backgroundColor: t.accent + '08' }]}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: i === 4 ? t.accent : t.textDim }}>{d}</Text>
              </View>
            ))}
          </View>

          {/* Day grid */}
          <View style={s.grid}>
            {grid.map((cell, cellIdx) => {
              if (cell.empty) {
                const colIdx = cellIdx % 7;
                return <View key={cell.key} style={[s.dayCell, colIdx === 4 && { backgroundColor: t.accent + '06' }]} />;
              }

              const colIdx = cellIdx % 7;
              const isFriday = colIdx === 4;
              const isSelected = selectedInfo?.gregorian?.day === cell.gregorian.day;
              const hasEvent = cell.events && cell.events.length > 0;
              const hasPeriod = !!cell.periodEvent;
              const hasSingleEvent = cell.event && !cell.event.endDay;

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
                    s.dayCell,
                    isFriday && !hasPeriod && !cell.isToday && !isSelected && { backgroundColor: t.accent + '06' },
                    bandStyle,
                    isSelected && { backgroundColor: t.accent + '30', borderRadius: 8 },
                    cell.isPast && !cell.isToday && { opacity: 0.5 },
                  ]}
                  onPress={() => setSelectedDay(isSelected ? null : cell)}
                >
                  {cell.isToday ? (
                    <View style={[s.todayCircle, { backgroundColor: t.accent }]}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>{cell.gregorian.day}</Text>
                    </View>
                  ) : (
                    <Text style={{
                      fontSize: 14,
                      fontWeight: hasEvent ? '700' : '600',
                      color: hasEvent ? t.accent : t.text,
                    }}>
                      {cell.gregorian.day}
                    </Text>
                  )}
                  <Text style={{ fontSize: 9, color: hasEvent ? t.accent : t.textDim, marginTop: 1 }}>
                    {cell.hijri.day}
                  </Text>
                  {hasSingleEvent && (
                    <View style={[s.eventDot, { backgroundColor: t.accent }]} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </Card>

        {/* Hint or selected day detail */}
        {!selectedInfo ? (
          <Card centered>
            <Text style={{ fontSize: FontSize.sm, color: t.textDim }}>Tippe auf einen Tag</Text>
          </Card>
        ) : (
          <Card>
            <View style={{ marginBottom: Spacing.md }}>
              <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: t.text }}>
                {DE_WEEKDAYS_LONG[new Date(selectedInfo.gregorian.year, selectedInfo.gregorian.month - 1, selectedInfo.gregorian.day).getDay()]}, {selectedInfo.gregorian.day}. {DE_MONTHS[selectedInfo.gregorian.month]} {selectedInfo.gregorian.year}
              </Text>
              <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: t.accent, marginTop: Spacing.xs }}>
                {selectedInfo.hijri.day}. {selectedInfo.hijri.monthNameEn} {selectedInfo.hijri.year} AH
              </Text>
            </View>

            {/* Events */}
            {selectedInfo.events && selectedInfo.events.length > 0 && (
              <View>
                {selectedInfo.events.map((ev) => (
                  <View key={ev.name} style={[s.eventDetail, { backgroundColor: t.accent + '08', borderColor: t.accent + '20' }]}>
                    <Text style={{ fontSize: 24, marginRight: Spacing.md }}>{ev.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: t.accent }}>{ev.name}</Text>
                      <Text style={{ fontSize: FontSize.xs, color: t.textDim, marginTop: 2 }}>{ev.nameAr}</Text>
                      <Text style={{ fontSize: FontSize.sm, color: t.textDim, marginTop: Spacing.xs, lineHeight: 20 }}>{ev.description}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </Card>
        )}

        {/* Upcoming events */}
        <Card>
          <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: t.text, marginBottom: Spacing.md }}>Nächste Feiertage</Text>
          {upcomingEvents.length > 0 ? (
            upcomingEvents.map((ev, i) => (
              <View key={`${ev.hijriMonth}-${ev.startDay}-${ev.name}`} style={[s.eventRow, i < upcomingEvents.length - 1 && { borderBottomWidth: 1, borderBottomColor: t.border }]}>
                <Text style={{ fontSize: 24, marginRight: Spacing.md }}>{ev.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: t.text }}>{ev.name}</Text>
                  <Text style={{ fontSize: FontSize.xs, color: t.textDim, marginTop: 2 }}>{ev.gregStr}</Text>
                </View>
                <View style={[s.countdownBadge, { backgroundColor: t.accent + '15' }]}>
                  <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: t.accent }}>
                    {ev.daysUntil === 0 ? 'Heute' : ev.daysUntil === 1 ? 'Morgen' : `in ${ev.daysUntil}d`}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={{ fontSize: FontSize.sm, color: t.textDim, textAlign: 'center' }}>Keine Daten verfügbar</Text>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  nav: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  navArrow: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  weekRow: { flexDirection: 'row', marginBottom: Spacing.xs },
  weekCell: { flex: 1, alignItems: 'center', paddingVertical: Spacing.xs, borderRadius: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  dayCell: { width: '13.5%', alignItems: 'center', paddingVertical: Spacing.xs, minHeight: 48, justifyContent: 'center' },
  todayCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  eventDot: { width: 5, height: 5, borderRadius: 2.5, marginTop: 1 },
  eventDetail: { flexDirection: 'row', alignItems: 'flex-start', padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, marginBottom: Spacing.sm },
  eventRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm },
  countdownBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
});
