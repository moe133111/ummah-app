import { useState, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, Dimensions } from 'react-native';
import { getHijriForDate } from '../features/calendar/hijriCalendar';
import { ISLAMIC_EVENTS, getEventsForHijriDate } from '../features/calendar/islamicEvents';
import { useAppStore } from '../hooks/useAppStore';
import { DarkTheme, LightTheme, FontSize, Spacing, BorderRadius } from '../constants/theme';
import Card from '../components/ui/Card';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_PADDING = 16;
const CARD_PADDING = 16;
const GAP = 4;
const CELL_SIZE = Math.floor((SCREEN_WIDTH - SCREEN_PADDING * 2 - CARD_PADDING * 2 - GAP * 6) / 7);

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

const HIJRI_MONTH_NAMES = [
  '', 'Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani',
  'Jumada al-Ula', 'Jumada al-Thani', 'Rajab', "Sha'ban",
  'Ramadan', 'Shawwal', "Dhul Qi'dah", 'Dhul Hijja',
];

const DE_MONTHS = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

const DE_WEEKDAYS_LONG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

// ── Helpers ──

function generateMonthDays(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const totalDays = lastDay.getDate();

  // getDay(): 0=Sonntag … 6=Samstag → convert to Monday-start: 0=Mo … 6=So
  let startOffset = firstDay.getDay() - 1;
  if (startOffset < 0) startOffset = 6; // Sonntag → 6

  const days = [];
  for (let i = 0; i < startOffset; i++) days.push(null);
  for (let d = 1; d <= totalDays; d++) days.push(new Date(year, month, d));
  return days;
}

function getHijriDay(date) {
  try {
    return new Intl.DateTimeFormat('en-US-u-ca-islamic-civil', { day: 'numeric' }).format(date);
  } catch {
    return '';
  }
}

function getHijriMonthYear(date) {
  try {
    return new Intl.DateTimeFormat('de-DE-u-ca-islamic-civil', { month: 'long', year: 'numeric' }).format(date);
  } catch {
    return '';
  }
}

function getHijriFull(date) {
  try {
    const parts = new Intl.DateTimeFormat('en-US-u-ca-islamic-civil', {
      day: 'numeric', month: 'numeric', year: 'numeric',
    }).formatToParts(date);
    let day, month, year;
    for (const p of parts) {
      if (p.type === 'day') day = parseInt(p.value, 10);
      if (p.type === 'month') month = parseInt(p.value, 10);
      if (p.type === 'year') year = parseInt(p.value, 10);
    }
    return { day, month, year, monthName: HIJRI_MONTH_NAMES[month] || '' };
  } catch {
    return null;
  }
}

function isSameDay(a, b) {
  if (!a || !b) return false;
  return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
}

function isFeastDay(date) {
  const hijri = getHijriFull(date);
  if (!hijri) return false;
  const events = getEventsForHijriDate(hijri.month, hijri.day);
  return events.some((e) => !e.endDay || e.startDay === hijri.day);
}

function getEventsForDate(date) {
  const hijri = getHijriFull(date);
  if (!hijri) return [];
  return getEventsForHijriDate(hijri.month, hijri.day);
}

// ── Component ──

export default function CalendarScreen() {
  const isDark = useAppStore((s) => s.theme === 'dark');
  const t = isDark ? DarkTheme : LightTheme;

  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth()); // 0-11
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [selectedDay, setSelectedDay] = useState(null);

  function changeMonth(delta) {
    let newMonth = currentMonth + delta;
    let newYear = currentYear;
    if (newMonth > 11) { newMonth = 0; newYear++; }
    if (newMonth < 0) { newMonth = 11; newYear--; }
    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
    setSelectedDay(null);
  }

  const days = useMemo(() => generateMonthDays(currentYear, currentMonth), [currentYear, currentMonth]);

  const hijriLabel = useMemo(() => {
    return getHijriMonthYear(new Date(currentYear, currentMonth, 15));
  }, [currentYear, currentMonth]);

  const gregLabel = useMemo(() => {
    return new Date(currentYear, currentMonth).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  }, [currentYear, currentMonth]);

  // Upcoming events (scan next 400 days)
  const upcomingEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const results = [];
    const seen = new Set();

    for (let offset = 0; offset <= 400; offset++) {
      const date = new Date(today);
      date.setDate(date.getDate() + offset);
      const hijri = getHijriFull(date);
      if (!hijri) continue;

      const dayEvents = getEventsForHijriDate(hijri.month, hijri.day);
      for (const ev of dayEvents) {
        if (ev.type === 'period' && ev.name === 'Erste 10 Tage Dhul Hijja') continue;
        if (ev.endDay && hijri.day !== ev.startDay) continue;
        const evKey = `${ev.name}-${hijri.year}`;
        if (seen.has(evKey)) continue;
        seen.add(evKey);

        const gregStr = `${date.getDate()}. ${DE_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
        const hijriStr = `${hijri.day}. ${hijri.monthName} ${hijri.year}`;
        results.push({ ...ev, gregStr, hijriStr, daysUntil: offset });
        if (results.length >= 5) break;
      }
      if (results.length >= 5) break;
    }
    return results;
  }, []);

  // Selected day info
  const selectedHijri = selectedDay ? getHijriFull(selectedDay) : null;
  const selectedEvents = selectedDay ? getEventsForDate(selectedDay) : [];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ padding: SCREEN_PADDING, paddingBottom: 120 }}>
      {/* Month Navigation */}
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Pressable onPress={() => changeMonth(-1)} style={{ padding: 12 }}>
            <Text style={{ fontSize: 20, color: t.accent }}>←</Text>
          </Pressable>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: t.text }}>{gregLabel}</Text>
            <Text style={{ fontSize: 14, color: t.accent, marginTop: 2 }}>{hijriLabel}</Text>
          </View>
          <Pressable onPress={() => changeMonth(1)} style={{ padding: 12 }}>
            <Text style={{ fontSize: 20, color: t.accent }}>→</Text>
          </Pressable>
        </View>

        {/* Weekday headers */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          {WEEKDAYS.map((day) => (
            <View key={day} style={{ width: CELL_SIZE, alignItems: 'center' }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: day === 'Fr' ? t.accent : t.textDim }}>{day}</Text>
            </View>
          ))}
        </View>

        {/* Day Grid */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
          {days.map((day, index) => {
            const colIdx = index % 7;
            const isFriday = colIdx === 4;
            const today = day ? isSameDay(day, now) : false;
            const selected = day ? isSameDay(day, selectedDay) : false;
            const feast = day ? isFeastDay(day) : false;

            return (
              <View
                key={index}
                style={{
                  width: CELL_SIZE,
                  height: CELL_SIZE + 8,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isFriday ? 'rgba(184,134,11,0.05)' : 'transparent',
                  borderRadius: 4,
                }}
              >
                {day ? (
                  <Pressable
                    onPress={() => setSelectedDay(selected ? null : day)}
                    style={{
                      width: CELL_SIZE - 4,
                      height: CELL_SIZE + 4,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 8,
                      backgroundColor: selected
                        ? t.accent + '30'
                        : today
                          ? t.accent + '25'
                          : 'transparent',
                      borderWidth: today ? 1 : 0,
                      borderColor: t.accent,
                    }}
                  >
                    <Text style={{
                      fontSize: 14,
                      fontWeight: today ? '700' : '400',
                      color: today ? t.accent : feast ? t.accent : t.text,
                    }}>
                      {day.getDate()}
                    </Text>
                    <Text style={{ fontSize: 8, color: t.textDim, marginTop: 1 }}>
                      {getHijriDay(day)}
                    </Text>
                    {feast && (
                      <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: t.accent, marginTop: 2 }} />
                    )}
                  </Pressable>
                ) : (
                  <View />
                )}
              </View>
            );
          })}
        </View>
      </Card>

      {/* Selected day detail */}
      {!selectedDay ? (
        <Card centered>
          <Text style={{ fontSize: FontSize.sm, color: t.textDim }}>Tippe auf einen Tag</Text>
        </Card>
      ) : (
        <Card>
          <View style={{ marginBottom: Spacing.md }}>
            <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: t.text }}>
              {DE_WEEKDAYS_LONG[selectedDay.getDay()]}, {selectedDay.getDate()}. {DE_MONTHS[selectedDay.getMonth()]} {selectedDay.getFullYear()}
            </Text>
            {selectedHijri && (
              <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: t.accent, marginTop: Spacing.xs }}>
                {selectedHijri.day}. {selectedHijri.monthName} {selectedHijri.year} AH
              </Text>
            )}
          </View>

          {selectedEvents.length > 0 && (
            <View>
              {selectedEvents.map((ev) => (
                <View
                  key={ev.name}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    padding: Spacing.md,
                    borderRadius: BorderRadius.md,
                    borderWidth: 1,
                    backgroundColor: t.accent + '08',
                    borderColor: t.accent + '20',
                    marginBottom: Spacing.sm,
                  }}
                >
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
            <View
              key={`${ev.hijriMonth}-${ev.startDay}-${ev.name}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: Spacing.sm,
                borderBottomWidth: i < upcomingEvents.length - 1 ? 1 : 0,
                borderBottomColor: t.border,
              }}
            >
              <Text style={{ fontSize: 24, marginRight: Spacing.md }}>{ev.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: t.text }}>{ev.name}</Text>
                <Text style={{ fontSize: FontSize.xs, color: t.textDim, marginTop: 2 }}>{ev.gregStr}</Text>
              </View>
              <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: t.accent + '15' }}>
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
