import { View, Text, StyleSheet, ScrollView, Pressable, Switch, SafeAreaView } from 'react-native';
import { useState } from 'react';
import { useAppStore } from '../../hooks/useAppStore';
import { useLocation } from '../../hooks/useLocation';
import { calculateQiblaDirection, distanceToKaaba, getAvailableMethods } from '../../features/prayer/prayerCalculation';
import { DarkTheme, LightTheme, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import Card from '../../components/ui/Card';

export default function MoreScreen() {
  const isDark = useAppStore((s) => s.theme === 'dark');
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const method = useAppStore((s) => s.calculationMethod);
  const setMethod = useAppStore((s) => s.setCalculationMethod);
  const t = isDark ? DarkTheme : LightTheme;
  const { location } = useLocation();
  const [sec, setSec] = useState('qibla');

  const qibla = location ? calculateQiblaDirection(location.lat, location.lng) : null;
  const dist = location ? distanceToKaaba(location.lat, location.lng) : null;
  const methods = getAvailableMethods();
  const sections = [{ id: 'qibla', label: 'Qibla', emoji: '🧭' }, { id: 'settings', label: 'Einstellungen', emoji: '⚙️' }, { id: 'about', label: 'Über', emoji: 'ℹ️' }];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 40 }}>
        <View style={{ alignItems: 'center', paddingVertical: Spacing.xl }}>
          <Text style={{ fontSize: FontSize.xxl, fontWeight: '700', color: t.text }}>Mehr</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: Spacing.lg }}>
          {sections.map(s => (
            <Pressable key={s.id} style={[styles.tab, sec === s.id && { backgroundColor: t.accent + '18', borderColor: t.accent + '44' }]} onPress={() => setSec(s.id)}>
              <Text style={{ fontSize: 20, marginBottom: 4 }}>{s.emoji}</Text>
              <Text style={{ fontSize: FontSize.xs, fontWeight: '600', color: sec === s.id ? t.accent : t.textDim }}>{s.label}</Text>
            </Pressable>
          ))}
        </View>

        {sec === 'qibla' && (<>
          <Card centered>
            <Text style={{ fontSize: 48, marginBottom: Spacing.md }}>🕋</Text>
            <Text style={{ fontSize: FontSize.xl, fontWeight: '700', color: t.accent, marginBottom: 4 }}>Qibla Richtung</Text>
            {qibla !== null && <Text style={{ fontSize: 32, fontWeight: '700', color: t.accentLight, marginBottom: 4 }}>{qibla.toFixed(1)}° von Norden</Text>}
            {dist && <Text style={{ fontSize: FontSize.sm, color: t.textDim }}>Entfernung zur Kaaba: {dist.toLocaleString('de-DE')} km</Text>}
          </Card>
          <Card centered><Text style={{ color: t.textDim, fontSize: FontSize.sm, textAlign: 'center' }}>Vollständiger Kompass mit Geräte-Ausrichtung{'\n'}kommt in Phase 1. Am besten auf einem Mobilgerät.</Text></Card>
        </>)}

        {sec === 'settings' && (<>
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View><Text style={{ fontSize: FontSize.md, fontWeight: '600', color: t.text }}>Dark Mode</Text><Text style={{ fontSize: FontSize.sm, color: t.textDim, marginTop: 2 }}>{isDark ? 'Dunkel' : 'Hell'}</Text></View>
              <Switch value={isDark} onValueChange={toggleTheme} trackColor={{ false: '#ccc', true: t.accent + '66' }} thumbColor={isDark ? t.accent : '#f4f3f4'} />
            </View>
          </Card>
          <Card>
            <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: t.text, marginBottom: Spacing.md }}>Berechnungsmethode</Text>
            {methods.map(m => (
              <Pressable key={m.key} style={[styles.methodRow, { borderColor: t.border }, method === m.key && { borderColor: t.accent, backgroundColor: t.accent + '10' }]} onPress={() => setMethod(m.key)}>
                <View style={[styles.radio, { borderColor: method === m.key ? t.accent : t.textDim }]}>
                  {method === m.key && <View style={[styles.dot, { backgroundColor: t.accent }]} />}
                </View>
                <View style={{ flex: 1 }}><Text style={{ fontSize: FontSize.md, fontWeight: '600', color: t.text }}>{m.key}</Text><Text style={{ fontSize: FontSize.xs, color: t.textDim, marginTop: 2 }}>{m.name}</Text></View>
              </Pressable>
            ))}
          </Card>
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View><Text style={{ fontSize: FontSize.md, fontWeight: '600', color: t.text }}>Standort</Text><Text style={{ fontSize: FontSize.sm, color: t.textDim, marginTop: 2 }}>{location?.name || 'Wird ermittelt...'}{location ? ` (${location.lat.toFixed(2)}, ${location.lng.toFixed(2)})` : ''}</Text></View>
              <Text style={{ fontSize: 20 }}>📍</Text>
            </View>
          </Card>
        </>)}

        {sec === 'about' && (
          <Card centered>
            <Text style={{ fontSize: FontSize.xxl, fontWeight: '700', color: t.accent, marginBottom: 4 }}>Ummah App</Text>
            <Text style={{ fontSize: FontSize.sm, color: t.textDim, marginBottom: Spacing.lg }}>Version 0.1.0 (MVP)</Text>
            <Text style={{ fontSize: FontSize.md, color: t.textDim, textAlign: 'center', lineHeight: 24 }}>Dein täglicher islamischer Begleiter.{'\n'}Gebetszeiten · Quran · Duas · Dhikr{'\n\n'}Entwickelt mit ❤️ und Tawakkul</Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: 'transparent' },
  methodRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, marginBottom: 8 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6 },
});
