import { View, Text, StyleSheet, ScrollView, Pressable, SafeAreaView } from 'react-native';
import { useState, useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '../../hooks/useAppStore';
import { DarkTheme, LightTheme, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { DUAS } from '../../features/duas/duaData';
import Card from '../../components/ui/Card';

const DHIKR = [
  { id: 1, arabic: 'سُبْحَانَ اللَّهِ', text: 'SubhanAllah', target: 33 },
  { id: 2, arabic: 'الْحَمْدُ لِلَّهِ', text: 'Alhamdulillah', target: 33 },
  { id: 3, arabic: 'اللَّهُ أَكْبَرُ', text: 'Allahu Akbar', target: 33 },
  { id: 4, arabic: 'لَا إِلَهَ إِلَّا اللَّهُ', text: 'La ilaha illallah', target: 100 },
];

export default function DhikrScreen() {
  const isDark = useAppStore((s) => s.theme === 'dark');
  const t = isDark ? DarkTheme : LightTheme;
  const [tab, setTab] = useState('dhikr');
  const [sel, setSel] = useState(DHIKR[0]);
  const [count, setCount] = useState(0);
  const [expanded, setExpanded] = useState(null);
  const [favorites, setFavorites] = useState([]);

  const toggleFavorite = (id) => {
    setFavorites((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));
  };

  const handleCount = useCallback(async () => {
    if (count < sel.target) {
      setCount((c) => c + 1);
      try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    }
    if (count + 1 >= sel.target) {
      try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    }
  }, [count, sel]);

  const tabs = [
    { id: 'dhikr', label: 'Dhikr', emoji: '📿' },
    { id: 'duas', label: 'Duas', emoji: '🤲' },
    { id: 'favorites', label: 'Favoriten', emoji: '⭐' },
  ];

  const favDuas = DUAS.filter((d) => favorites.includes(d.id));

  const renderDuaCard = (dua) => (
    <Pressable key={dua.id} onPress={() => setExpanded(expanded === dua.id ? null : dua.id)}>
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
            <Text style={{ fontSize: 24 }}>{dua.emoji || '🤲'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: expanded === dua.id ? t.accent : t.text }}>{dua.title}</Text>
              <Text style={{ fontSize: FontSize.xs, color: t.textDim, marginTop: 2 }}>{dua.category}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Pressable onPress={() => toggleFavorite(dua.id)} hitSlop={8}>
              <Text style={{ fontSize: 18 }}>{favorites.includes(dua.id) ? '⭐' : '☆'}</Text>
            </Pressable>
            <Text style={{ fontSize: 18, color: t.textDim, transform: [{ rotate: expanded === dua.id ? '180deg' : '0deg' }] }}>▾</Text>
          </View>
        </View>
        {expanded === dua.id && (
          <View style={{ marginTop: Spacing.lg }}>
            <View style={{ padding: Spacing.lg, borderRadius: BorderRadius.md, backgroundColor: t.accent + '08', borderWidth: 1, borderColor: t.accent + '15', marginBottom: Spacing.md }}>
              <Text style={{ fontSize: FontSize.arabic, lineHeight: 40, textAlign: 'right', color: t.accentLight }}>{dua.arabic}</Text>
            </View>
            <Text style={{ fontSize: FontSize.sm, color: t.accent, marginBottom: 8 }}>{dua.transliteration}</Text>
            <Text style={{ fontSize: FontSize.sm, fontStyle: 'italic', color: t.textDim, lineHeight: 22 }}>{dua.translation}</Text>
          </View>
        )}
      </Card>
    </Pressable>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 40 }}>
        <View style={{ alignItems: 'center', paddingVertical: Spacing.xl }}>
          <Text style={{ fontSize: FontSize.xxl, fontWeight: '700', color: t.text }}>Dhikr & Duas</Text>
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

        {tab === 'dhikr' && (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.lg }}>
              {DHIKR.map((d) => (
                <Pressable
                  key={d.id}
                  style={[styles.chip, { borderColor: t.border }, sel.id === d.id && { borderColor: t.accent, backgroundColor: t.accent + '15' }]}
                  onPress={() => { setSel(d); setCount(0); }}
                >
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
            {count >= sel.target && (
              <Card centered style={{ borderColor: t.accent + '44' }}>
                <Text style={{ fontSize: 28, marginBottom: 4 }}>✨</Text>
                <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: t.accent }}>MashaAllah! Ziel erreicht!</Text>
              </Card>
            )}
          </>
        )}

        {tab === 'duas' && (
          <>
            <Text style={{ fontSize: FontSize.sm, color: t.textDim, marginBottom: Spacing.md }}>Tippe auf ein Dua, um es aufzuklappen</Text>
            {DUAS.map(renderDuaCard)}
          </>
        )}

        {tab === 'favorites' && (
          <>
            {favDuas.length === 0 ? (
              <Card centered>
                <Text style={{ fontSize: 36, marginBottom: Spacing.md }}>⭐</Text>
                <Text style={{ fontSize: FontSize.md, color: t.textDim, textAlign: 'center' }}>
                  Noch keine Favoriten.{'\n'}Markiere Duas mit dem Stern-Symbol.
                </Text>
              </Card>
            ) : (
              favDuas.map(renderDuaCard)
            )}
          </>
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
});
