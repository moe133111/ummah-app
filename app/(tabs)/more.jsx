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
import { getEventsForHijriDate } from '../../features/calendar/islamicEvents';
import { Ionicons } from '@expo/vector-icons';
import Card from '../../components/ui/Card';
import AppIcon from '../../components/ui/AppIcon';
import FeaturePreview from '../../components/ui/FeaturePreview';
import HeaderBar from '../../components/ui/HeaderBar';

const HIJRI_MONTH_NAMES = [
  '', 'Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani',
  'Jumada al-Ula', 'Jumada al-Thani', 'Rajab', "Sha'ban",
  'Ramadan', 'Shawwal', "Dhul Qi'dah", 'Dhul Hijja',
];

const GOAL_LIMITS = {
  dhikr: { min: 50, max: 500, step: 50, iconName: 'tasbih', isCustom: true, label: 'Dhikr' },
  quran: { min: 5, max: 50, step: 5, iconName: 'quran', isCustom: true, label: 'Quran Verse' },
  dua: { min: 3, max: 20, step: 1, iconName: 'prayer', isCustom: true, label: 'Duas' },
};

export default function MoreScreen() {
  const isDark = useAppStore((s) => s.theme === 'dark');
  const setTheme = useAppStore((s) => s.setTheme);
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
    { id: 'tools', label: 'Tools', icon: 'construct-outline' },
    { id: 'community', label: 'Community', icon: 'globe-outline' },
    { id: 'settings', label: 'Settings', icon: 'settings-outline' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={[]}>
      <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 16 }}>
        <HeaderBar title="Mehr" t={t} />

        <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg }}>
          {sections.map((s) => (
            <Pressable
              key={s.id}
              style={[styles.tab, sec === s.id && { backgroundColor: t.accent + '18', borderColor: t.accent + '44' }]}
              onPress={() => setSec(s.id)}
            >
              <Ionicons name={s.icon} size={20} color={sec === s.id ? t.accent : t.textDim} style={{ marginBottom: Spacing.xs }} />
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
              <AppIcon name="calendar" size={32} color={t.accent} />
              <View style={{ flex: 1, marginLeft: Spacing.md }}>
                <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: t.accent }}>Islamischer Kalender</Text>
                <Text style={{ fontSize: FontSize.sm, color: t.textDim, marginTop: Spacing.xs }}>
                  {hijriTodayStr || 'Hijri-Datum, Feiertage & Gebetszeiten'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={t.accent} />
            </Pressable>

            {nextHoliday && (
              <View style={[styles.nextHoliday, { backgroundColor: t.accent + '08', borderColor: t.accent + '20' }]}>
                <Ionicons name={nextHoliday.icon || 'calendar-outline'} size={24} color={t.accent} />
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
                  <AppIcon name="mosque" size={22} color={t.accent} />
                  <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: t.accent, marginTop: Spacing.xs }}>{prayerWeekTotal}/35</Text>
                  <Text style={{ fontSize: FontSize.xs, color: t.textDim }}>Gebete/Woche</Text>
                  {prayerTrend !== 'same' && <Text style={{ fontSize: FontSize.xs, color: prayerTrend === 'up' ? '#4CAF50' : '#F44336', marginTop: Spacing.xs }}>{prayerTrend === 'up' ? '↑' : '↓'}</Text>}
                </Card>
              </View>
              <View style={{ flex: 1 }}>
                <Card centered>
                  <AppIcon name="tasbih" size={22} color={t.accent} />
                  <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: t.accent, marginTop: Spacing.xs }}>{dhikrWeekTotal}</Text>
                  <Text style={{ fontSize: FontSize.xs, color: t.textDim }}>Dhikr/Woche</Text>
                  {dhikrTrend !== 'same' && <Text style={{ fontSize: FontSize.xs, color: dhikrTrend === 'up' ? '#4CAF50' : '#F44336', marginTop: Spacing.xs }}>{dhikrTrend === 'up' ? '↑' : '↓'}</Text>}
                </Card>
              </View>
              <View style={{ flex: 1 }}>
                <Card centered>
                  <AppIcon name="quran" size={22} color={t.accent} />
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
              icon={<Ionicons name="moon-outline" size={36} color={t.accent} />}
              title="Ramadan-Tools"
              description="Iftar/Suhoor-Zeiten & Fasten-Tracker"
            />
            <FeaturePreview
              icon={<Ionicons name="calculator-outline" size={36} color={t.accent} />}
              title="Zakat-Rechner"
              description="Berechne deinen Zakat-Betrag"
            />
          </>
        )}

        {sec === 'community' && (
          <>
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md }}>
                <Ionicons name="help-circle-outline" size={32} color={t.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: t.text }}>Islam Quiz</Text>
                  <Text style={{ fontSize: FontSize.sm, color: t.textDim, marginTop: Spacing.xs }}>Teste dein Wissen</Text>
                </View>
              </View>
              <View style={[styles.phaseBadge, { backgroundColor: t.accent + '10' }]}>
                <Text style={{ color: t.accent, fontSize: FontSize.xs, fontWeight: '600' }}>Bald</Text>
              </View>
            </Card>

            <Card>
              <Pressable onPress={() => router.push('/duawall')}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
                  <AppIcon name="prayer" size={32} color={t.accent} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: t.text }}>Dua Wall</Text>
                    <Text style={{ fontSize: FontSize.sm, color: t.textDim, marginTop: Spacing.xs }}>Duas teilen & Ameen sagen</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={t.textDim} />
                </View>
              </Pressable>
            </Card>

            <FeaturePreview
              icon={<AppIcon name="tasbih" size={36} color={t.accent} />}
              title="Globaler Dhikr"
              description="Gemeinsam mit der Ummah zählen"
            />
          </>
        )}

        {sec === 'settings' && (
          <>
            <Card>
              <Text style={{ fontSize: 13, color: t.textDim, marginBottom: 8 }}>Erscheinungsbild</Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Pressable
                  onPress={() => setTheme('light')}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    paddingVertical: 14,
                    borderRadius: 12,
                    borderWidth: 1.5,
                    borderColor: !isDark ? '#B8860B' : t.border,
                    backgroundColor: !isDark ? '#B8860B15' : 'transparent',
                  }}
                >
                  <Ionicons name="sunny-outline" size={20} color={!isDark ? '#B8860B' : t.textDim} />
                  <Text style={{ fontSize: 14, fontWeight: !isDark ? '600' : '400', color: !isDark ? '#B8860B' : t.textDim }}>Light</Text>
                </Pressable>
                <Pressable
                  onPress={() => setTheme('dark')}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    paddingVertical: 14,
                    borderRadius: 12,
                    borderWidth: 1.5,
                    borderColor: isDark ? '#B8860B' : t.border,
                    backgroundColor: isDark ? '#B8860B15' : 'transparent',
                  }}
                >
                  <Ionicons name="moon-outline" size={20} color={isDark ? '#B8860B' : t.textDim} />
                  <Text style={{ fontSize: 14, fontWeight: isDark ? '600' : '400', color: isDark ? '#B8860B' : t.textDim }}>Dark</Text>
                </Pressable>
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
                <Ionicons name="location-outline" size={20} color={t.accent} />
              </View>
            </Card>

            <Card>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: t.text }}>Sprache</Text>
                  <Text style={{ fontSize: FontSize.sm, color: t.textDim, marginTop: Spacing.xs }}>Deutsch</Text>
                </View>
                <Ionicons name="globe-outline" size={20} color={t.accent} />
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
                        {limits.isCustom ? <AppIcon name={limits.iconName} size={18} color={t.accent} /> : <Ionicons name={limits.iconName} size={18} color={t.accent} />}
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
              <Text style={{ fontSize: FontSize.xxl, fontWeight: '700', color: t.accent, marginBottom: Spacing.xs }}>Imaniq</Text>
              <Text style={{ fontSize: FontSize.sm, color: t.textDim, marginBottom: Spacing.sm }}>Version 1.0.0 · Build 2026.03</Text>
              <Text style={{ fontSize: FontSize.sm, color: t.textDim, textAlign: 'center', lineHeight: 22 }}>
                Gebetszeiten · Quran · Dhikr · Duas{'\n'}
                Qibla · Hijri-Kalender · Community
              </Text>
              <Text style={{ fontSize: FontSize.xs, color: t.textDim, marginTop: Spacing.md }}>
                Kontakt: feedback@imaniq.com
              </Text>
              <Pressable
                onPress={() => {
                  const { Linking } = require('react-native');
                  Linking.openURL('mailto:feedback@imaniq.com?subject=Imaniq Feedback');
                }}
                style={({ pressed }) => [styles.detailBtn, { borderColor: t.accent + '44', marginTop: Spacing.md, marginBottom: 0, opacity: pressed ? 0.8 : 1 }]}
              >
                <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: t.accent }}>Feedback geben</Text>
              </Pressable>
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
  goalBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  calendarBtn: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, borderRadius: BorderRadius.md, borderWidth: 1, marginBottom: Spacing.md },
  nextHoliday: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, marginBottom: Spacing.md },
  countdownBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  detailBtn: { alignSelf: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: BorderRadius.full, borderWidth: 1, marginBottom: Spacing.md, minHeight: 44, justifyContent: 'center' },
  phaseBadge: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, alignSelf: 'center', marginTop: Spacing.md },
});
