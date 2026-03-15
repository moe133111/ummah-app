import { View, Text, StyleSheet, ScrollView, Pressable, SafeAreaView } from 'react-native';
import { useState, useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '../../hooks/useAppStore';
import { DarkTheme, LightTheme, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import Card from '../../components/ui/Card';

const DHIKR = [
  { id: 1, arabic: 'سُبْحَانَ اللَّهِ', text: 'SubhanAllah', target: 33 },
  { id: 2, arabic: 'الْحَمْدُ لِلَّهِ', text: 'Alhamdulillah', target: 33 },
  { id: 3, arabic: 'اللَّهُ أَكْبَرُ', text: 'Allahu Akbar', target: 33 },
  { id: 4, arabic: 'لَا إِلَهَ إِلَّا اللَّهُ', text: 'La ilaha illallah', target: 100 },
];

export default function DiscoverScreen() {
  const isDark = useAppStore((s) => s.theme === 'dark');
  const t = isDark ? DarkTheme : LightTheme;
  const [tab, setTab] = useState('dhikr');
  const [sel, setSel] = useState(DHIKR[0]);
  const [count, setCount] = useState(0);

  const handleCount = useCallback(async () => {
    if (count < sel.target) {
      setCount(c => c + 1);
      try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    }
    if (count + 1 >= sel.target) {
      try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    }
  }, [count, sel]);

  const hijri = (() => { try { return new Intl.DateTimeFormat('de-DE', { calendar: 'islamic-civil', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()); } catch { return ''; } })();
  const tabs = [{ id: 'dhikr', label: 'Dhikr', emoji: '📿' }, { id: 'calendar', label: 'Kalender', emoji: '📅' }, { id: 'hadith', label: 'Hadith', emoji: '📜' }];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 40 }}>
        <View style={{ alignItems: 'center', paddingVertical: Spacing.xl }}>
          <Text style={{ fontSize: FontSize.xxl, fontWeight: '700', color: t.text }}>Entdecken</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: Spacing.lg }}>
          {tabs.map(tb => (
            <Pressable key={tb.id} style={[styles.tab, tab === tb.id && { backgroundColor: t.accent + '18', borderColor: t.accent + '44' }]} onPress={() => setTab(tb.id)}>
              <Text style={{ fontSize: 20, marginBottom: 4 }}>{tb.emoji}</Text>
              <Text style={{ fontSize: FontSize.xs, fontWeight: '600', color: tab === tb.id ? t.accent : t.textDim }}>{tb.label}</Text>
            </Pressable>
          ))}
        </View>

        {tab === 'dhikr' && (<>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.lg }}>
            {DHIKR.map(d => (
              <Pressable key={d.id} style={[styles.chip, { borderColor: t.border }, sel.id === d.id && { borderColor: t.accent, backgroundColor: t.accent + '15' }]}
                onPress={() => { setSel(d); setCount(0); }}>
                <Text style={{ fontSize: FontSize.sm, fontWeight: '500', color: sel.id === d.id ? t.accent : t.textDim }}>{d.text}</Text>
              </Pressable>
            ))}
          </View>
          <Card centered>
            <Text style={{ fontSize: 32, color: t.accentLight }}>{sel.arabic}</Text>
            <Text style={{ fontSize: FontSize.md, color: t.textDim }}>{sel.text}</Text>
          </Card>
          <Pressable onPress={handleCount} style={[styles.counterBtn, { borderColor: t.accent + '44' }]}>
            <Text style={{ fontSize: 56, fontWeight: '700', color: t.accent }}>{count}</Text>
            <Text style={{ fontSize: FontSize.lg, color: t.textDim }}>/ {sel.target}</Text>
          </Pressable>
          <View style={[styles.bar, { backgroundColor: t.border }]}>
            <View style={[styles.barFill, { width: `${Math.min((count / sel.target) * 100, 100)}%`, backgroundColor: t.accent }]} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: Spacing.lg }}>
            <Pressable style={[styles.resetBtn, { borderColor: t.border }]} onPress={() => setCount(0)}>
              <Text style={{ fontSize: FontSize.sm, color: t.textDim }}>Zurücksetzen</Text>
            </Pressable>
          </View>
          {count >= sel.target && <Card centered style={{ borderColor: t.accent + '44' }}><Text style={{ fontSize: 28, marginBottom: 4 }}>✨</Text><Text style={{ fontSize: FontSize.md, fontWeight: '600', color: t.accent }}>MashaAllah! Ziel erreicht!</Text></Card>}
        </>)}

        {tab === 'calendar' && (
          <Card centered>
            <Text style={{ fontSize: 48, marginBottom: Spacing.md }}>📅</Text>
            <Text style={{ fontSize: FontSize.xl, fontWeight: '700', color: t.accent }}>{hijri}</Text>
            <Text style={{ fontSize: FontSize.md, color: t.textDim, marginTop: 4 }}>{new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</Text>
            <View style={[styles.badge, { backgroundColor: t.accent + '10' }]}><Text style={{ color: t.accent, fontSize: FontSize.sm }}>Vollständiger Kalender kommt in Phase 2</Text></View>
          </Card>
        )}

        {tab === 'hadith' && (
          <Card>
            <Text style={{ fontSize: FontSize.xs, color: t.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.md }}>Hadith des Tages</Text>
            <Text style={{ fontSize: 24, color: t.accentLight, textAlign: 'right', marginBottom: Spacing.md }}>إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ</Text>
            <Text style={{ fontSize: FontSize.md, color: t.text, fontStyle: 'italic', lineHeight: 24, marginBottom: Spacing.md }}>"Wahrlich, die Taten sind nur entsprechend den Absichten, und jedem Menschen steht nur das zu, was er beabsichtigt hat."</Text>
            <Text style={{ fontSize: FontSize.sm, color: t.textDim }}>— Sahih al-Bukhari, Hadith 1</Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: 'transparent' },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9999, borderWidth: 1 },
  counterBtn: { alignSelf: 'center', width: 180, height: 180, borderRadius: 90, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginVertical: Spacing.xl },
  bar: { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: Spacing.lg },
  barFill: { height: '100%', borderRadius: 3 },
  resetBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: BorderRadius.md, borderWidth: 1 },
  badge: { padding: Spacing.md, borderRadius: BorderRadius.md, marginTop: Spacing.lg },
});
