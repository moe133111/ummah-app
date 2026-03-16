import { View, Text, StyleSheet, ScrollView, Pressable, Switch, SafeAreaView, TextInput } from 'react-native';
import { useState, useMemo } from 'react';
import { useAppStore } from '../../hooks/useAppStore';
import { useLocation } from '../../hooks/useLocation';
import { getAvailableMethods } from '../../features/prayer/prayerCalculation';
import { DarkTheme, LightTheme, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import Card from '../../components/ui/Card';

export default function MoreScreen() {
  const isDark = useAppStore((s) => s.theme === 'dark');
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const method = useAppStore((s) => s.calculationMethod);
  const setMethod = useAppStore((s) => s.setCalculationMethod);
  const t = isDark ? DarkTheme : LightTheme;
  const { location } = useLocation();
  const [sec, setSec] = useState('tools');

  const methods = getAvailableMethods();

  const hijri = useMemo(() => {
    try { return new Intl.DateTimeFormat('de-DE', { calendar: 'islamic-civil', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()); }
    catch { return ''; }
  }, []);

  // Zakat calculator state
  const [zakatWealth, setZakatWealth] = useState('');
  const zakatAmount = zakatWealth ? (parseFloat(zakatWealth.replace(',', '.')) * 0.025) : 0;

  const sections = [
    { id: 'tools', label: 'Tools', emoji: '🛠️' },
    { id: 'settings', label: 'Einstellungen', emoji: '⚙️' },
    { id: 'about', label: 'Über', emoji: 'ℹ️' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 40 }}>
        <View style={{ alignItems: 'center', paddingVertical: Spacing.xl }}>
          <Text style={{ fontSize: FontSize.xxl, fontWeight: '700', color: t.text }}>Mehr</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: Spacing.lg }}>
          {sections.map((s) => (
            <Pressable
              key={s.id}
              style={[styles.tab, sec === s.id && { backgroundColor: t.accent + '18', borderColor: t.accent + '44' }]}
              onPress={() => setSec(s.id)}
            >
              <Text style={{ fontSize: 20, marginBottom: 4 }}>{s.emoji}</Text>
              <Text style={{ fontSize: FontSize.xs, fontWeight: '600', color: sec === s.id ? t.accent : t.textDim }}>{s.label}</Text>
            </Pressable>
          ))}
        </View>

        {sec === 'tools' && (
          <>
            {/* Hijri Calendar */}
            <Card centered>
              <Text style={{ fontSize: 48, marginBottom: Spacing.md }}>📅</Text>
              <Text style={{ fontSize: FontSize.xl, fontWeight: '700', color: t.accent }}>Hijri-Kalender</Text>
              <Text style={{ fontSize: FontSize.lg, color: t.accentLight, marginTop: Spacing.sm }}>{hijri}</Text>
              <Text style={{ fontSize: FontSize.md, color: t.textDim, marginTop: 4 }}>
                {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
            </Card>

            {/* Zakat Calculator */}
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.md }}>
                <Text style={{ fontSize: 24 }}>💰</Text>
                <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: t.text }}>Zakat-Rechner</Text>
              </View>
              <Text style={{ fontSize: FontSize.sm, color: t.textDim, marginBottom: Spacing.md }}>
                Gib dein Gesamtvermögen ein (2.5% = Zakat)
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: t.surface, color: t.text, borderColor: t.border }]}
                placeholder="Vermögen in €"
                placeholderTextColor={t.textDim}
                keyboardType="numeric"
                value={zakatWealth}
                onChangeText={setZakatWealth}
              />
              {zakatWealth ? (
                <View style={{ alignItems: 'center', marginTop: Spacing.md }}>
                  <Text style={{ fontSize: FontSize.xs, color: t.textDim }}>Dein Zakat-Betrag</Text>
                  <Text style={{ fontSize: FontSize.xxl, fontWeight: '700', color: t.accent }}>{zakatAmount.toFixed(2)} €</Text>
                </View>
              ) : null}
            </Card>

            {/* Ramadan Placeholder */}
            <Card centered>
              <Text style={{ fontSize: 48, marginBottom: Spacing.md }}>🌙</Text>
              <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: t.text }}>Ramadan-Bereich</Text>
              <Text style={{ fontSize: FontSize.sm, color: t.textDim, marginTop: 4, textAlign: 'center' }}>
                Iftar/Suhoor-Zeiten, Fasten-Tracker{'\n'}und mehr — kommt bald inshaAllah
              </Text>
              <View style={[styles.comingSoon, { backgroundColor: t.accent + '10' }]}>
                <Text style={{ color: t.accent, fontSize: FontSize.sm }}>Kommt bald</Text>
              </View>
            </Card>

            {/* AI Bot Placeholder */}
            <Card centered>
              <Text style={{ fontSize: 48, marginBottom: Spacing.md }}>🤖</Text>
              <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: t.text }}>KI-Islamberater</Text>
              <Text style={{ fontSize: FontSize.sm, color: t.textDim, marginTop: 4, textAlign: 'center' }}>
                Stelle Fragen zu Islam, Fiqh{'\n'}und täglicher Praxis
              </Text>
              <View style={[styles.comingSoon, { backgroundColor: t.accent + '10' }]}>
                <Text style={{ color: t.accent, fontSize: FontSize.sm }}>Kommt bald</Text>
              </View>
            </Card>
          </>
        )}

        {sec === 'settings' && (
          <>
            <Card>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: t.text }}>Dark Mode</Text>
                  <Text style={{ fontSize: FontSize.sm, color: t.textDim, marginTop: 2 }}>{isDark ? 'Dunkel' : 'Hell'}</Text>
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
                    <Text style={{ fontSize: FontSize.xs, color: t.textDim, marginTop: 2 }}>{m.name}</Text>
                  </View>
                </Pressable>
              ))}
            </Card>
            <Card>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: t.text }}>Standort</Text>
                  <Text style={{ fontSize: FontSize.sm, color: t.textDim, marginTop: 2 }}>
                    {location?.name || 'Wird ermittelt...'}
                    {location ? ` (${location.lat.toFixed(2)}, ${location.lng.toFixed(2)})` : ''}
                  </Text>
                </View>
                <Text style={{ fontSize: 20 }}>📍</Text>
              </View>
            </Card>
          </>
        )}

        {sec === 'about' && (
          <Card centered>
            <Text style={{ fontSize: FontSize.xxl, fontWeight: '700', color: t.accent, marginBottom: 4 }}>Ummah App</Text>
            <Text style={{ fontSize: FontSize.sm, color: t.textDim, marginBottom: Spacing.lg }}>Version 0.2.0</Text>
            <Text style={{ fontSize: FontSize.md, color: t.textDim, textAlign: 'center', lineHeight: 24 }}>
              Dein täglicher islamischer Begleiter.{'\n'}
              Gebetszeiten · Quran · Dhikr · Duas{'\n'}
              Qibla · Hijri-Kalender · Zakat{'\n\n'}
              Entwickelt mit ❤️ und Tawakkul
            </Text>
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
  input: { borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.md, fontSize: FontSize.lg },
  comingSoon: { padding: Spacing.md, borderRadius: BorderRadius.md, marginTop: Spacing.lg },
});
