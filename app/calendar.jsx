import { useState, useMemo, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Dimensions } from 'react-native';
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

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_PADDING = 16;
const CARD_PADDING = 20;
const GAP = 2;
const CELL_SIZE = Math.floor((SCREEN_WIDTH - GRID_PADDING * 2 - CARD_PADDING * 2 - GAP * 6) / 7);

function getMondayOffset(weekdayEn) {
  const map = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6 };
  return map[weekdayEn] ?? 0;
}

export default function CalendarScreen() {
  const isDark = useAppStore((s) => s.theme === 'dark');
  const t = isDark ? DarkTheme : LightTheme;

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
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ padding: GRID_PADDING, paddingBottom: 120 }}>
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
            <View key={d} style={[s.weekCell, { width: CELL_SIZE }, i === 4 && { backgroundColor: 'rgba(184,134,11,0.05)' }]}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: i === 4 ? t.accent : t.textDim }}>{d}</Text>
            </View>
          ))}
        </View>

        {/* Day grid */}
        <View style={s.grid}>
          {grid.map((cell, cellIdx) => {
            const colIdx = cellIdx % 7;
            const isFriday = colIdx === 4;

            if (cell.empty) {
              return <View key={cell.key} style={[s.dayCell, { width: CELL_SIZE, height: CELL_SIZE }, isFriday && { backgroundColor: 'rgba(184,134,11,0.05)' }]} />;
            }

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
                  { width: CELL_SIZE, height: CELL_SIZE },
                  isFriday && !hasPeriod && !cell.isToday && !isSelected && { backgroundColor: 'rgba(184,134,11,0.05)' },
                  bandStyle,
                  cell.isToday && !isSelected && { backgroundColor: t.accent + '20', borderRadius: 999, borderWidth: 1, borderColor: t.accent },
                  isSelected && { backgroundColor: t.accent, borderRadius: 999 },
                  cell.isPast && !cell.isToday && !isSelected && { opacity: 0.5 },
                ]}
                onPress={() => setSelectedDay(isSelected ? null : cell)}
              >
                <Text style={{
                  fontSize: 14,
                  fontWeight: hasEvent || cell.isToday ? '700' : '500',
                  color: isSelected ? '#fff' : cell.isToday ? t.accent : hasEvent ? t.accent : t.text,
                }}>
                  {cell.gregorian.day}
                </Text>
                <Text style={{ fontSize: 8, color: isSelected ? 'rgba(255,255,255,0.7)' : (hasEvent ? t.accent : t.textDim), marginTop: 1 }}>
                  {cell.hijri.day}
                </Text>
                {hasSingleEvent && !isSelected && (
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
  );
}

const s = StyleSheet.create({
  nav: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  navArrow: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: Spacing.xs },
  weekCell: { alignItems: 'center', paddingVertical: Spacing.xs, borderRadius: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP, justifyContent: 'flex-start' },
  dayCell: { alignItems: 'center', justifyContent: 'center' },
  eventDot: { width: 4, height: 4, borderRadius: 2, marginTop: 1 },
  eventDetail: { flexDirection: 'row', alignItems: 'flex-start', padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, marginBottom: Spacing.sm },
  eventRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm },
  countdownBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
});
