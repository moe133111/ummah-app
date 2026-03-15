import { View, Text, StyleSheet, ScrollView, Pressable, SafeAreaView } from 'react-native';
import { useMemo } from 'react';
import { useLocation } from '../../hooks/useLocation';
import { useAppStore } from '../../hooks/useAppStore';
import { calculatePrayerTimes, getNextPrayer } from '../../features/prayer/prayerCalculation';
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

export default function HomeScreen() {
  const { location, loading } = useLocation();
  const isDark = useAppStore((s) => s.theme === 'dark');
  const method = useAppStore((s) => s.calculationMethod);
  const todayPrayers = useAppStore((s) => s.todayPrayers);
  const togglePrayerDone = useAppStore((s) => s.togglePrayerDone);
  const t = isDark ? DarkTheme : LightTheme;

  const times = useMemo(() => {
    if (!location) return null;
    return calculatePrayerTimes(location.lat, location.lng, new Date(), method);
  }, [location, method]);

  const nextPrayer = useMemo(() => times ? getNextPrayer(times) : null, [times]);

  const hijriDate = useMemo(() => {
    try { return new Intl.DateTimeFormat('de-DE', { calendar: 'islamic-civil', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()); }
    catch { return ''; }
  }, []);

  const gregorianDate = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const completedCount = Object.values(todayPrayers).filter(Boolean).length;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]}>
      <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.bismillah, { color: t.accent }]}>بِسْمِ ٱللَّهِ</Text>
          <Text style={[styles.subtitle, { color: t.textDim }]}>Dein täglicher Begleiter</Text>
        </View>

        <Card centered>
          <Text style={{ fontSize: FontSize.sm, color: t.textDim }}>{gregorianDate}</Text>
          {hijriDate ? <Text style={{ fontSize: FontSize.md, color: t.accent, marginTop: 4 }}>{hijriDate}</Text> : null}
          {location?.name ? (
            <View style={[styles.badge, { backgroundColor: t.accent + '18' }]}>
              <Text style={{ fontSize: FontSize.xs, fontWeight: '600', color: t.accent }}>📍 {location.name}</Text>
            </View>
          ) : null}
        </Card>

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
                <Pressable key={key} onPress={() => meta.trackable && togglePrayerDone(key)}
                  style={[styles.prayerRow, isNext && { backgroundColor: t.accent + '12', borderColor: t.accent + '33', borderWidth: 1 }]}>
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

        <Card centered>
          <Text style={{ fontSize: FontSize.xs, color: t.textDim }}>Heute verrichtet</Text>
          <Text style={{ fontSize: FontSize.xxl, fontWeight: '700', color: t.accent }}>{completedCount}/5</Text>
          <View style={styles.trackerBar}>
            <View style={[styles.trackerFill, { width: `${(completedCount / 5) * 100}%`, backgroundColor: t.accent }]} />
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: 40 },
  header: { alignItems: 'center', paddingVertical: Spacing.xl },
  bismillah: { fontSize: 32, fontWeight: '700' },
  subtitle: { fontSize: FontSize.sm, letterSpacing: 3, textTransform: 'uppercase', marginTop: 4 },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginTop: 8 },
  prayerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: Spacing.lg, borderRadius: BorderRadius.md, marginBottom: 4 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  trackerBar: { width: '100%', height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, marginTop: 8, overflow: 'hidden' },
  trackerFill: { height: '100%', borderRadius: 3 },
});
