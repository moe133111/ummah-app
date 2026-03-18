import { View, Text, StyleSheet, ScrollView, Pressable, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { useAppStore } from '../../hooks/useAppStore';
import { useLocation } from '../../hooks/useLocation';
import { getAvailableMethods, METHOD_RECOMMENDATIONS } from '../../features/prayer/prayerCalculation';
import { getWeekTotal, getTrend } from '../../features/stats/statsCalculator';
import { DarkTheme, LightTheme, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { getCurrentHijriDate, getHijriForDate } from '../../features/calendar/hijriCalendar';
import { ISLAMIC_EVENTS, getEventsForHijriDate } from '../../features/calendar/islamicEvents';
import Card from '../../components/ui/Card';
import FeaturePreview from '../../components/ui/FeaturePreview';
import HeaderBar from '../../components/ui/HeaderBar';

const HIJRI_MONTH_NAMES = [
  '', 'Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani',
  'Jumada al-Ula', 'Jumada al-Thani', 'Rajab', "Sha'ban",
  'Ramadan', 'Shawwal', "Dhul Qi'dah", 'Dhul Hijja',
];

const GOAL_LIMITS = {
  dhikr: { min: 50, max: 500, step: 50, emoji: '📿', label: 'Dhikr' },
  quran: { min: 5, max: 50, step: 5, emoji: '📖', label: 'Quran Verse' },
  dua: { min: 3, max: 20, step: 1, emoji: '🤲', label: 'Duas' },
};

export default function MoreScreen() {
  const isDark = useAppStore((s) => s.theme === 'dark');
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const method = useAppStore((s) => s.calculationMethod);
  const setMethod = useAppStore((s) => s.setCalculationMethod);
  const dailyGoals = useAppStore((s) => s.dailyGoals);
  const setDailyGoalTarget = useAppStore((s) => s.setDailyGoalTarget);
  const toggleDailyGoal = useAppStore((s) => s.toggleDailyGoal);
  const weeklyPrayers = useAppStore((s) => s.weeklyPrayers) || {};
  const weeklyDhikr = useAppStore((s) => s.weeklyDhikr) || {};
  const weeklyQuranMinutes = useAppStore((s) => s.weeklyQuranMinutes) || {};
  const t = isDark ? DarkTheme : LightTheme;
  const { location } = useLocation();
  const router = useRouter();
  const [sec, setSec] = useState('tools');
  const hijriToday = getCurrentHijriDate();
  const hijriTodayStr = hijriToday
    ? `${hijriToday.day}. ${HIJRI_MONTH_NAMES[hijriToday.month]} ${hijriToday.year} AH`
    : '';

  // Next upcoming holiday
  const nextHoliday = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let offset = 0; offset <= 400; offset++) {
      const date = new Date(today);
      date.setDate(date.getDate() + offset);
      const hijri = getHijriForDate(date);
      if (!hijri) continue;
      const events = getEventsForHijriDate(hijri.month, hijri.day);
      for (const ev of events) {
        if (ev.endDay && hijri.day !== ev.startDay) continue;
        if (ev.type === 'period' && ev.name === 'Erste 10 Tage Dhul Hijja') continue;
        const DE_M = ['', 'Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
        return {
          ...ev,
          daysUntil: offset,
          gregStr: `${date.getDate()}. ${DE_M[date.getMonth() + 1]}`,
        };
      }
    }
    return null;
  }, []);

  const prayerWeekTotal = getWeekTotal(weeklyPrayers);
  const dhikrWeekTotal = getWeekTotal(weeklyDhikr);
  const quranWeekTotal = getWeekTotal(weeklyQuranMinutes);
  const prayerTrend = getTrend(weeklyPrayers);
  const dhikrTrend = getTrend(weeklyDhikr);

  const methods = getAvailableMethods();

  const sections = [
    { id: 'tools', label: 'Tools', emoji: '🛠️' },
    { id: 'community', label: 'Community', emoji: '🌍' },
    { id: 'settings', label: 'Settings', emoji: '⚙️' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 90 }}>
        <HeaderBar title="Mehr" t={t} />

        <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg }}>
          {sections.map((s) => (
            <Pressable
              key={s.id}
              style={[styles.tab, sec === s.id && { backgroundColor: t.accent + '18', borderColor: t.accent + '44' }]}
              onPress={() => setSec(s.id)}
            >
              <Text style={{ fontSize: 20, marginBottom: Spacing.xs }}>{s.emoji}</Text>
              <Text style={{ fontSize: FontSize.xs, fontWeight: '600', color: sec === s.id ? t.accent : t.textDim }}>{s.label}</Text>
            </Pressable>
          ))}
        </View>

        {sec === 'tools' && (
          <>
            <Pressable
              style={[styles.calendarBtn, { backgroundColor: t.accent + '10', borderColor: t.accent + '30' }]}
              onPress={() => router.push('/calendar')}
            >
              <Text style={{ fontSize: 32 }}>📅</Text>
              <View style={{ flex: 1, marginLeft: Spacing.md }}>
                <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: t.accent }}>Islamischer Kalender</Text>
                <Text style={{ fontSize: FontSize.sm, color: t.textDim, marginTop: Spacing.xs }}>
                  {hijriTodayStr || 'Hijri-Datum, Feiertage & Gebetszeiten'}
                </Text>
              </View>
              <Text style={{ fontSize: 20, color: t.accent }}>→</Text>
            </Pressable>

            {nextHoliday && (
              <View style={[styles.nextHoliday, { backgroundColor: t.accent + '08', borderColor: t.accent + '20' }]}>
                <Text style={{ fontSize: 24 }}>{nextHoliday.emoji}</Text>
                <View style={{ flex: 1, marginLeft: Spacing.md }}>
                  <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: t.accent }}>{nextHoliday.name}</Text>
                  <Text style={{ fontSize: FontSize.xs, color: t.textDim, marginTop: 2 }}>{nextHoliday.gregStr}</Text>
                </View>
                <View style={[styles.countdownBadge, { backgroundColor: t.accent + '15' }]}>
                  <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: t.accent }}>
                    {nextHoliday.daysUntil === 0 ? 'Heute' : nextHoliday.daysUntil === 1 ? 'Morgen' : `in ${nextHoliday.daysUntil}d`}
                  </Text>
                </View>
              </View>
            )}

            <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: t.text, marginBottom: Spacing.sm, marginTop: Spacing.sm }}>Ibadah-Statistik</Text>
            <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Card centered>
                  <Text style={{ fontSize: 22 }}>🕌</Text>
                  <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: t.accent, marginTop: Spacing.xs }}>{prayerWeekTotal}/35</Text>
                  <Text style={{ fontSize: FontSize.xs, color: t.textDim }}>Gebete/Woche</Text>
                  {prayerTrend !== 'same' && <Text style={{ fontSize: FontSize.xs, color: prayerTrend === 'up' ? '#4CAF50' : '#F44336', marginTop: Spacing.xs }}>{prayerTrend === 'up' ? '↑' : '↓'}</Text>}
                </Card>
              </View>
              <View style={{ flex: 1 }}>
                <Card centered>
                  <Text style={{ fontSize: 22 }}>📿</Text>
                  <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: t.accent, marginTop: Spacing.xs }}>{dhikrWeekTotal}</Text>
                  <Text style={{ fontSize: FontSize.xs, color: t.textDim }}>Dhikr/Woche</Text>
                  {dhikrTrend !== 'same' && <Text style={{ fontSize: FontSize.xs, color: dhikrTrend === 'up' ? '#4CAF50' : '#F44336', marginTop: Spacing.xs }}>{dhikrTrend === 'up' ? '↑' : '↓'}</Text>}
                </Card>
              </View>
              <View style={{ flex: 1 }}>
                <Card centered>
                  <Text style={{ fontSize: 22 }}>📖</Text>
                  <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: t.accent, marginTop: Spacing.xs }}>{quranWeekTotal} Min</Text>
                  <Text style={{ fontSize: FontSize.xs, color: t.textDim }}>Quran/Woche</Text>
                </Card>
              </View>
            </View>
            <Pressable
              style={[styles.detailBtn, { borderColor: t.accent + '44' }]}
              onPress={() => router.push('/stats')}
            >
              <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: t.accent }}>Details ansehen</Text>
            </Pressable>

            <FeaturePreview
              emoji="🌙"
              title="Ramadan-Tools"
              description={'Iftar/Suhoor-Zeiten, Fasten-Tracker\nund mehr — kommt bald inshaAllah'}
              phase="Phase 2"
            />
            <FeaturePreview
              emoji="🤖"
              title="KI-Islamberater"
              description={'Stelle Fragen zu Islam, Fiqh\nund täglicher Praxis'}
              phase="Phase 3"
            />
            <FeaturePreview
              emoji="💰"
              title="Zakat-Rechner"
              description="Berechne deinen Zakat-Betrag basierend auf deinem Vermögen"
              phase="Phase 2"
            />
          </>
        )}

        {sec === 'community' && (
          <>
            <Card centered>
              <Text style={{ fontSize: 36 }}>🌍</Text>
              <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: t.text, marginTop: Spacing.sm }}>Community</Text>
              <Text style={{ fontSize: FontSize.sm, color: t.textDim, marginTop: Spacing.xs, textAlign: 'center' }}>
                Verbinde dich mit der globalen Ummah
              </Text>
            </Card>

            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md }}>
                <Text style={{ fontSize: 32 }}>🎯</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: t.text }}>Islam Quiz</Text>
                  <Text style={{ fontSize: FontSize.sm, color: t.textDim, marginTop: Spacing.xs }}>Teste dein Wissen</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                {[{ label: 'Singleplayer', icon: '👤' }, { label: 'Multiplayer', icon: '👥' }, { label: 'Ranking', icon: '🏅' }].map((item) => (
                  <View key={item.label} style={[styles.quizChip, { backgroundColor: t.surface, borderColor: t.border }]}>
                    <Text style={{ fontSize: 16 }}>{item.icon}</Text>
                    <Text style={{ fontSize: FontSize.xs, color: t.textDim, marginTop: Spacing.xs }}>{item.label}</Text>
                  </View>
                ))}
              </View>
              <View style={[styles.phaseBadge, { backgroundColor: t.accent + '10' }]}>
                <Text style={{ color: t.accent, fontSize: FontSize.xs, fontWeight: '600' }}>Phase 2</Text>
              </View>
            </Card>

            <Card>
              <Pressable onPress={() => router.push('/duawall')}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.sm }}>
                  <Text style={{ fontSize: 32 }}>🤲</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: t.text }}>Live Dua Wall</Text>
                    <Text style={{ fontSize: FontSize.sm, color: t.textDim, marginTop: Spacing.xs }}>Anonyme Duas teilen & Ameen sagen</Text>
                  </View>
                </View>
                <View style={[styles.duaWallPreview, { backgroundColor: t.surface, borderColor: t.border }]}>
                  <Text style={{ fontSize: FontSize.sm, color: t.textDim, fontStyle: 'italic' }}>"Ya Allah, heile alle Kranken..."</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.xs }}>
                    <Text style={{ fontSize: 14 }}>🤲</Text>
                    <Text style={{ fontSize: FontSize.xs, color: t.accent }}>Ameen · 127</Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => router.push('/duawall')}
                  style={[styles.calendarBtn, { backgroundColor: t.accent + '10', borderColor: t.accent + '20' }]}
                >
                  <Text style={{ fontSize: 20, marginRight: Spacing.sm }}>🤲</Text>
                  <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: t.accent }}>Dua Wall öffnen</Text>
                </Pressable>
              </Pressable>
            </Card>

            <FeaturePreview
              emoji="🌍"
              title="Globaler Dhikr"
              description="Zähle gemeinsam mit Muslimen weltweit — ein globaler Tasbih-Counter"
              phase="Phase 3"
            />
            <FeaturePreview
              emoji="🏆"
              title="Community Challenges"
              description={'Wöchentliche Herausforderungen:\nQuran lesen, Dhikr, Fasten, Sadaqah'}
              phase="Phase 3"
            />
            <FeaturePreview
              emoji="🕌"
              title="Live Prayer Map"
              description="Sieh, wer gerade betet — eine interaktive Weltkarte der Ummah"
              phase="Phase 4"
            />
          </>
        )}

        {sec === 'settings' && (
          <>
            <Card>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: t.text }}>Dark Mode</Text>
                  <Text style={{ fontSize: FontSize.sm, color: t.textDim, marginTop: Spacing.xs }}>{isDark ? 'Dunkel' : 'Hell'}</Text>
                </View>
                <Switch value={isDark} onValueChange={toggleTheme} trackColor={{ false: '#ccc', true: t.accent + '66' }} thumbColor={isDark ? t.accent : '#f4f3f4'} />
              </View>
            </Card>

            <Card>
              <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: t.text, marginBottom: Spacing.md }}>Berechnungsmethode</Text>
              {methods.map((m) => (
                <Pressable
                  key={m.key}
                  style={[styles.methodRow, { borderColor: t.border }, method === m.key && { borderColor: t.accent, backgroundColor: t.accent + '10' }]}
                  onPress={() => setMethod(m.key)}
                >
                  <View style={[styles.radio, { borderColor: method === m.key ? t.accent : t.textDim }]}>
                    {method === m.key && <View style={[styles.dot, { backgroundColor: t.accent }]} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: t.text }}>{m.key}</Text>
                    <Text style={{ fontSize: FontSize.xs, color: t.textDim, marginTop: Spacing.xs }}>{m.name}</Text>
                  </View>
                </Pressable>
              ))}
              <View style={{ marginTop: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.md, backgroundColor: t.accent + '08', borderWidth: 1, borderColor: t.accent + '15' }}>
                <Text style={{ fontSize: FontSize.xs, fontWeight: '600', color: t.accent, marginBottom: Spacing.sm }}>Empfehlung nach Region</Text>
                {METHOD_RECOMMENDATIONS.map((r) => (
                  <Text key={r.region} style={{ fontSize: FontSize.xs, color: t.textDim, lineHeight: 18 }}>
                    {r.region}: {r.methods.join(', ')}
                  </Text>
                ))}
              </View>
            </Card>

            <Card>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: t.text }}>Standort</Text>
                  <Text style={{ fontSize: FontSize.sm, color: t.textDim, marginTop: Spacing.xs }}>
                    {location?.name || 'Wird ermittelt...'}
                    {location ? ` (${location.lat.toFixed(2)}, ${location.lng.toFixed(2)})` : ''}
                  </Text>
                </View>
                <Text style={{ fontSize: 20 }}>📍</Text>
              </View>
            </Card>

            <Card>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: t.text }}>Sprache</Text>
                  <Text style={{ fontSize: FontSize.sm, color: t.textDim, marginTop: Spacing.xs }}>Deutsch</Text>
                </View>
                <Text style={{ fontSize: 20 }}>🌐</Text>
              </View>
              <View style={{ backgroundColor: t.accent + '10', padding: Spacing.sm, borderRadius: BorderRadius.md, marginTop: Spacing.md }}>
                <Text style={{ fontSize: FontSize.xs, color: t.accent, textAlign: 'center' }}>Türkisch priorisiert in Phase 2</Text>
              </View>
            </Card>

            <Card>
              <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: t.text, marginBottom: Spacing.md }}>Tagesziele anpassen</Text>
              {Object.entries(GOAL_LIMITS).map(([key, limits]) => {
                const goal = dailyGoals[key];
                return (
                  <View key={key} style={{ marginBottom: Spacing.md }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                        <Text style={{ fontSize: 18 }}>{limits.emoji}</Text>
                        <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: t.text }}>{limits.label}</Text>
                      </View>
                      <Switch
                        value={goal.enabled}
                        onValueChange={() => toggleDailyGoal(key)}
                        trackColor={{ false: '#ccc', true: t.accent + '66' }}
                        thumbColor={goal.enabled ? t.accent : '#f4f3f4'}
                      />
                    </View>
                    {goal.enabled && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.md }}>
                        <Pressable
                          style={[styles.goalBtn, { borderColor: t.border }]}
                          onPress={() => setDailyGoalTarget(key, Math.max(limits.min, goal.target - limits.step))}
                        >
                          <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: t.textDim }}>−</Text>
                        </Pressable>
                        <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: t.accent, minWidth: 50, textAlign: 'center' }}>{goal.target}</Text>
                        <Pressable
                          style={[styles.goalBtn, { borderColor: t.border }]}
                          onPress={() => setDailyGoalTarget(key, Math.min(limits.max, goal.target + limits.step))}
                        >
                          <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: t.textDim }}>+</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                );
              })}
            </Card>

            <Card centered>
              <Text style={{ fontSize: FontSize.xxl, fontWeight: '700', color: t.accent, marginBottom: Spacing.xs }}>Ummah App</Text>
              <Text style={{ fontSize: FontSize.sm, color: t.textDim, marginBottom: Spacing.lg }}>Version 0.3.0</Text>
              <Text style={{ fontSize: FontSize.md, color: t.textDim, textAlign: 'center', lineHeight: 24 }}>
                Dein täglicher islamischer Begleiter.{'\n'}
                Gebetszeiten · Quran · Dhikr · Duas{'\n'}
                Qibla · Hijri-Kalender · Community{'\n\n'}
                Entwickelt mit ❤️ und Tawakkul
              </Text>
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tab: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: 'transparent' },
  methodRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, marginBottom: Spacing.sm },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6 },
  quizChip: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1 },
  duaWallPreview: { padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1 },
  goalBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  calendarBtn: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, borderRadius: BorderRadius.md, borderWidth: 1, marginBottom: Spacing.md },
  nextHoliday: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, marginBottom: Spacing.md },
  countdownBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  detailBtn: { alignSelf: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: BorderRadius.full, borderWidth: 1, marginBottom: Spacing.md, minHeight: 44, justifyContent: 'center' },
  phaseBadge: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, alignSelf: 'center', marginTop: Spacing.md },
});
