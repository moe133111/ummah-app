import { View, Text, StyleSheet, ScrollView, Pressable, SafeAreaView } from 'react-native';
import { useState, useMemo } from 'react';
import { useLocation } from '../../hooks/useLocation';
import { useAppStore } from '../../hooks/useAppStore';
import { calculatePrayerTimes, getNextPrayer, calculateQiblaDirection, distanceToKaaba } from '../../features/prayer/prayerCalculation';
import { DarkTheme, LightTheme, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import Card from '../../components/ui/Card';

const PRAYER_META = {
  fajr: { name: 'Fajr', icon: '🌙', trackable: true },
  sunrise: { name: 'Sunrise', icon: '🌅', trackable: false },
  dhuhr: { name: 'Dhuhr', icon: '☀️', trackable: true },
  asr: { name: 'Asr', icon: '🌤', trackable: true },
  maghrib: { name: 'Maghrib', icon: '🌇', trackable: true },
  isha: { name: 'Isha', icon: '🌃', trackable: true },
};

export default function PrayerScreen() {
  const { location, loading } = useLocation();
  const isDark = useAppStore((s) => s.theme === 'dark');
  const method = useAppStore((s) => s.calculationMethod);
  const todayPrayers = useAppStore((s) => s.todayPrayers);
  const togglePrayerDone = useAppStore((s) => s.togglePrayerDone);
  const t = isDark ? DarkTheme : LightTheme;
  const [tab, setTab] = useState('times');

  const times = useMemo(() => {
    if (!location) return null;
    return calculatePrayerTimes(location.lat, location.lng, new Date(), method);
  }, [location, method]);

  const nextPrayer = useMemo(() => (times ? getNextPrayer(times) : null), [times]);
  const completedCount = Object.values(todayPrayers).filter(Boolean).length;

  const qibla = location ? calculateQiblaDirection(location.lat, location.lng) : null;
  const dist = location ? distanceToKaaba(location.lat, location.lng) : null;

  const tabs = [
    { id: 'times', label: 'Zeiten', emoji: '🕐' },
    { id: 'qibla', label: 'Qibla', emoji: '🧭' },
    { id: 'tracker', label: 'Tracker', emoji: '✅' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 40 }}>
        <View style={{ alignItems: 'center', paddingVertical: Spacing.xl }}>
          <Text style={{ fontSize: FontSize.xxl, fontWeight: '700', color: t.text }}>Gebet</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: Spacing.lg }}>
          {tabs.map((tb) => (
            <Pressable
              key={tb.id}
              style={[styles.tab, tab === tb.id && { backgroundColor: t.accent + '18', borderColor: t.accent + '44' }]}
              onPress={() => setTab(tb.id)}
            >
              <Text style={{ fontSize: 20, marginBottom: 4 }}>{tb.emoji}</Text>
              <Text style={{ fontSize: FontSize.xs, fontWeight: '600', color: tab === tb.id ? t.accent : t.textDim }}>{tb.label}</Text>
            </Pressable>
          ))}
        </View>

        {tab === 'times' && (
          <>
            {nextPrayer && (
              <Card centered style={{ borderColor: t.accent + '44' }}>
                <Text style={{ fontSize: FontSize.xs, color: t.textDim }}>Nächstes Gebet</Text>
                <Text style={{ fontSize: FontSize.xxl, fontWeight: '700', color: t.accent }}>{nextPrayer.name}</Text>
                <Text style={{ fontSize: FontSize.lg, color: t.accentLight, marginTop: 2 }}>{nextPrayer.time}</Text>
              </Card>
            )}
            <Card>
              {loading || !times ? (
                <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                  <Text style={{ fontSize: 28, marginBottom: 8 }}>📍</Text>
                  <Text style={{ color: t.textDim }}>Standort wird ermittelt...</Text>
                </View>
              ) : (
                Object.entries(PRAYER_META).map(([key, meta]) => {
                  const isNext = nextPrayer?.key === key;
                  return (
                    <Pressable
                      key={key}
                      onPress={() => meta.trackable && togglePrayerDone(key)}
                      style={[styles.prayerRow, isNext && { backgroundColor: t.accent + '12', borderColor: t.accent + '33', borderWidth: 1 }]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <Text style={{ fontSize: 20 }}>{meta.icon}</Text>
                        <Text style={[{ fontSize: FontSize.lg, color: isNext ? t.accent : t.text }, isNext && { fontWeight: '700' }]}>{meta.name}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        {meta.trackable && (
                          <View style={[styles.checkbox, { borderColor: t.accent }, todayPrayers[key] && { backgroundColor: t.accent }]}>
                            {todayPrayers[key] && <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>✓</Text>}
                          </View>
                        )}
                        <Text style={{ fontSize: FontSize.lg, fontWeight: '600', color: isNext ? t.accentLight : t.textDim }}>{times[key]}</Text>
                      </View>
                    </Pressable>
                  );
                })
              )}
            </Card>
          </>
        )}

        {tab === 'qibla' && (
          <>
            <Card centered>
              <Text style={{ fontSize: 48, marginBottom: Spacing.md }}>🕋</Text>
              <Text style={{ fontSize: FontSize.xl, fontWeight: '700', color: t.accent, marginBottom: 4 }}>Qibla Richtung</Text>
              {qibla !== null && (
                <Text style={{ fontSize: 32, fontWeight: '700', color: t.accentLight, marginBottom: 4 }}>{qibla.toFixed(1)}° von Norden</Text>
              )}
              {dist && (
                <Text style={{ fontSize: FontSize.sm, color: t.textDim }}>Entfernung zur Kaaba: {dist.toLocaleString('de-DE')} km</Text>
              )}
            </Card>
            <Card centered>
              <Text style={{ color: t.textDim, fontSize: FontSize.sm, textAlign: 'center' }}>
                Vollständiger Kompass mit Geräte-Ausrichtung{'\n'}kommt in Phase 1. Am besten auf einem Mobilgerät.
              </Text>
            </Card>
          </>
        )}

        {tab === 'tracker' && (
          <>
            <Card centered>
              <Text style={{ fontSize: FontSize.xs, color: t.textDim }}>Heute verrichtet</Text>
              <Text style={{ fontSize: 48, fontWeight: '700', color: t.accent }}>{completedCount}/5</Text>
              <View style={styles.trackerBar}>
                <View style={[styles.trackerFill, { width: `${(completedCount / 5) * 100}%`, backgroundColor: t.accent }]} />
              </View>
            </Card>
            <Card>
              <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: t.text, marginBottom: Spacing.md }}>Gebete abhaken</Text>
              {Object.entries(PRAYER_META)
                .filter(([, meta]) => meta.trackable)
                .map(([key, meta]) => (
                  <Pressable key={key} onPress={() => togglePrayerDone(key)} style={styles.trackerRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Text style={{ fontSize: 20 }}>{meta.icon}</Text>
                      <Text style={{ fontSize: FontSize.lg, color: t.text }}>{meta.name}</Text>
                    </View>
                    <View style={[styles.checkbox, { borderColor: t.accent }, todayPrayers[key] && { backgroundColor: t.accent }]}>
                      {todayPrayers[key] && <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>✓</Text>}
                    </View>
                  </Pressable>
                ))}
            </Card>
            {completedCount === 5 && (
              <Card centered style={{ borderColor: t.accent + '44' }}>
                <Text style={{ fontSize: 28, marginBottom: 4 }}>✨</Text>
                <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: t.accent }}>MashaAllah! Alle Gebete verrichtet!</Text>
              </Card>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: 'transparent' },
  prayerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: Spacing.lg, borderRadius: BorderRadius.md, marginBottom: 4 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  trackerBar: { width: '100%', height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, marginTop: 8, overflow: 'hidden' },
  trackerFill: { height: '100%', borderRadius: 3 },
  trackerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: Spacing.sm },
});
