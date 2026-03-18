import { useState, useMemo, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, SafeAreaView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { fetchGregorianMonth } from '../features/calendar/hijriCalendar';
import { ISLAMIC_EVENTS, getEventsForHijriDate, getRangePosition } from '../features/calendar/islamicEvents';
import { fetchPrayerTimes } from '../features/prayer/prayerCalculation';
import { useLocation } from '../hooks/useLocation';
import { useAppStore } from '../hooks/useAppStore';
import { DarkTheme, LightTheme, Spacing, FontSize, BorderRadius } from '../constants/theme';
import Card from '../components/ui/Card';

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

const HIJRI_MONTH_NAMES = [
  '', 'Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani',
  'Jumada al-Ula', 'Jumada al-Thani', 'Rajab', 'Sha\'ban',
  'Ramadan', 'Shawwal', 'Dhul Qi\'dah', 'Dhul Hijja',
];

const DE_MONTHS = ['', 'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const DE_WEEKDAYS_LONG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

function getMonday(weekday) {
  const map = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6 };
  return map[weekday] ?? 0;
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
    };
  } catch {
    return null;
  }
}

export default function CalendarScreen() {
  const isDark = useAppStore((s) => s.theme === 'dark');
  const method = useAppStore((s) => s.calculationMethod);
  const t = isDark ? DarkTheme : LightTheme;
  const router = useRouter();
  const { location } = useLocation();

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState(null);

  const { data: days, isLoading } = useQuery({
    queryKey: ['hijriCalendar', viewYear, viewMonth],
    queryFn: () => fetchGregorianMonth(viewYear, viewMonth),
    staleTime: 1000 * 60 * 60 * 24,
  });

  // Prayer times for selected day
  const selectedDate = selectedDay && !selectedDay.empty
    ? new Date(selectedDay.gregorian.year, selectedDay.gregorian.month - 1, selectedDay.gregorian.day)
    : null;

  const { data: prayerData, isLoading: prayerLoading } = useQuery({
    queryKey: ['prayerTimes', location?.lat, location?.lng, method, selectedDate?.toISOString()?.slice(0, 10)],
    queryFn: () => fetchPrayerTimes(location.lat, location.lng, method, selectedDate),
    enabled: !!location && !!selectedDate,
    staleTime: 1000 * 60 * 60,
  });

  // Upcoming events
  const { data: upcomingEvents } = useQuery({
    queryKey: ['upcomingEvents'],
    queryFn: async () => {
      const hijri = getCurrentHijriParts();
      if (!hijri) return [];

      const candidates = [];
      for (const ev of ISLAMIC_EVENTS) {
        if (ev.type === 'period' && ev.name === 'Erste 10 Tage Dhul Hijja') continue;
        let monthDiff = ev.hijriMonth - hijri.month;
        if (monthDiff < 0) monthDiff += 12;
        if (monthDiff === 0 && ev.startDay < hijri.day) monthDiff = 12;
        const approxDays = Math.max(0, Math.round(monthDiff * 29.5 + (ev.startDay - hijri.day)));
        let eventYear = hijri.year;
        if (ev.hijriMonth < hijri.month || (ev.hijriMonth === hijri.month && ev.startDay < hijri.day)) {
          eventYear = hijri.year + 1;
        }
        candidates.push({ ...ev, approxDays, eventYear });
      }
      candidates.sort((a, b) => a.approxDays - b.approxDays);
      const top5 = candidates.slice(0, 5);

      const results = [];
      for (const ev of top5) {
        const greg = await fetchHijriToGregorian(ev.startDay, ev.hijriMonth, ev.eventYear);
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
      results.sort((a, b) => a.daysUntil - b.daysUntil);
      return results;
    },
    staleTime: 1000 * 60 * 60,
  });

  const monthLabel = `${DE_MONTHS[viewMonth]} ${viewYear}`;

  // Hijri month label from first day of data
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

  // Build grid
  const grid = useMemo(() => {
    if (!days || days.length === 0) return [];
    const firstDayOffset = getMonday(days[0].gregorian.weekday);
    const cells = [];
    for (let i = 0; i < firstDayOffset; i++) {
      cells.push({ empty: true, key: `e${i}` });
    }
    for (const day of days) {
      const events = getEventsForHijriDate(day.hijri.month, day.hijri.day);
      const primaryEvent = events.find((e) => !e.endDay) || events[0] || null;
      const periodEvent = events.find((e) => e.endDay) || null;
      const rangePos = periodEvent ? getRangePosition(periodEvent, day.hijri.day) : null;
      const isToday =
        day.gregorian.day === now.getDate() &&
        day.gregorian.month === now.getMonth() + 1 &&
        day.gregorian.year === now.getFullYear();

      // Friday column: index in week is 4 (Mo=0..Fr=4)
      const dayIdx = (firstDayOffset + cells.length - firstDayOffset) % 7;
      // actually compute column from cell position
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
  const prayerTimes = prayerData?.times || null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 120 }}>
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
          {isLoading ? (
            <View style={{ paddingVertical: 60, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={t.accent} />
              <Text style={{ fontSize: FontSize.xs, color: t.textDim, marginTop: Spacing.sm }}>Kalender wird geladen...</Text>
            </View>
          ) : (
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
                    ]}
                    onPress={() => setSelectedDay(isSelected ? null : cell)}
                  >
                    {cell.isToday ? (
                      <View style={[s.todayCircle, { backgroundColor: t.accent }]}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>{cell.gregorian.day}</Text>
                      </View>
                    ) : (
                      <Text style={{
                        fontSize: 13,
                        fontWeight: hasEvent ? '700' : '500',
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
          )}
        </Card>

        {/* Selected day detail */}
        {selectedInfo && (
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: t.text }}>
                  {DE_WEEKDAYS_LONG[new Date(selectedInfo.gregorian.year, selectedInfo.gregorian.month - 1, selectedInfo.gregorian.day).getDay()]}, {selectedInfo.gregorian.day}. {DE_MONTHS[selectedInfo.gregorian.month]} {selectedInfo.gregorian.year}
                </Text>
                <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: t.accent, marginTop: Spacing.xs }}>
                  {selectedInfo.hijri.day}. {selectedInfo.hijri.monthNameEn} {selectedInfo.hijri.year} AH
                </Text>
              </View>
            </View>

            {/* Events */}
            {selectedInfo.events && selectedInfo.events.length > 0 && (
              <View style={{ marginBottom: Spacing.md }}>
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

            {/* Prayer times for selected day */}
            {location && (
              <>
                <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: t.textDim, marginBottom: Spacing.sm }}>Gebetszeiten</Text>
                {prayerLoading ? (
                  <ActivityIndicator size="small" color={t.accent} />
                ) : prayerTimes ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
                    {[
                      { key: 'fajr', label: 'Fajr', emoji: '🌅' },
                      { key: 'sunrise', label: 'Sunrise', emoji: '☀️' },
                      { key: 'dhuhr', label: 'Dhuhr', emoji: '🌤️' },
                      { key: 'asr', label: 'Asr', emoji: '⛅' },
                      { key: 'maghrib', label: 'Maghrib', emoji: '🌅' },
                      { key: 'isha', label: 'Isha', emoji: '🌙' },
                    ].map((p) => (
                      <View key={p.key} style={[s.prayerChip, { backgroundColor: t.surface, borderColor: t.border }]}>
                        <Text style={{ fontSize: 14 }}>{p.emoji}</Text>
                        <Text style={{ fontSize: FontSize.xs, color: t.textDim }}>{p.label}</Text>
                        <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: t.accent }}>{prayerTimes[p.key]}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={{ fontSize: FontSize.xs, color: t.textDim }}>Nicht verfügbar</Text>
                )}
              </>
            )}
          </Card>
        )}

        {/* Upcoming events */}
        <Card>
          <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: t.text, marginBottom: Spacing.md }}>Nächste Feiertage</Text>
          {!upcomingEvents ? (
            <View style={{ paddingVertical: Spacing.lg, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={t.accent} />
            </View>
          ) : upcomingEvents.length > 0 ? (
            upcomingEvents.map((ev, i) => (
              <View key={`${ev.hijriMonth}-${ev.startDay}-${ev.name}`} style={[s.eventRow, i < upcomingEvents.length - 1 && { borderBottomWidth: 1, borderBottomColor: t.border }]}>
                <Text style={{ fontSize: 24, marginRight: Spacing.md }}>{ev.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: t.text }}>{ev.name}</Text>
                  {ev.gregStr ? (
                    <Text style={{ fontSize: FontSize.xs, color: t.textDim, marginTop: 2 }}>{ev.gregStr}</Text>
                  ) : null}
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
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', alignItems: 'center', paddingVertical: Spacing.xs, minHeight: 52, justifyContent: 'center' },
  todayCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  eventDot: { width: 5, height: 5, borderRadius: 2.5, marginTop: 1 },
  eventDetail: { flexDirection: 'row', alignItems: 'flex-start', padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, marginBottom: Spacing.sm },
  prayerChip: { width: '31%', alignItems: 'center', paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1, gap: 2 },
  eventRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm },
  countdownBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
});
