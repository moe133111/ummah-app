import { View, Text, StyleSheet, ScrollView, Pressable, SafeAreaView, Modal, StatusBar } from 'react-native';
import { useState, useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '../../hooks/useAppStore';
import { DarkTheme, LightTheme, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { DUAS } from '../../features/duas/duaData';
import Card from '../../components/ui/Card';
import HeaderBar from '../../components/ui/HeaderBar';

const DHIKR = [
  { id: 1, arabic: 'سُبْحَانَ اللَّهِ', text: 'SubhanAllah', target: 33 },
  { id: 2, arabic: 'الْحَمْدُ لِلَّهِ', text: 'Alhamdulillah', target: 33 },
  { id: 3, arabic: 'اللَّهُ أَكْبَرُ', text: 'Allahu Akbar', target: 33 },
  { id: 4, arabic: 'لَا إِلَٰهَ إِلَّا اللَّهُ', text: 'La ilaha illallah', target: 100 },
];

const SLEEP_CONTENT = [
  {
    id: 'ayatul-kursi',
    title: 'Ayatul Kursi',
    ref: 'Al-Baqarah 2:255',
    arabic: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَن ذَا الَّذِي يَشْفَعُ عِندَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِّنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ',
  },
  {
    id: 'sleep-dua',
    title: 'Dua vor dem Schlafen',
    ref: 'Sahih al-Bukhari',
    arabic: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا',
    transliteration: 'Bismika Allahumma amutu wa ahya',
    translation: 'In Deinem Namen, o Allah, sterbe ich und lebe ich.',
  },
  {
    id: 'al-ikhlas',
    title: 'Sure Al-Ikhlas',
    ref: 'Sure 112',
    arabic: 'قُلْ هُوَ اللَّهُ أَحَدٌ ۝ اللَّهُ الصَّمَدُ ۝ لَمْ يَلِدْ وَلَمْ يُولَدْ ۝ وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ',
  },
  {
    id: 'al-falaq',
    title: 'Sure Al-Falaq',
    ref: 'Sure 113',
    arabic: 'قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ ۝ مِن شَرِّ مَا خَلَقَ ۝ وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ ۝ وَمِن شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ ۝ وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ',
  },
  {
    id: 'an-nas',
    title: 'Sure An-Nas',
    ref: 'Sure 114',
    arabic: 'قُلْ أَعُوذُ بِرَبِّ النَّاسِ ۝ مَلِكِ النَّاسِ ۝ إِلَٰهِ النَّاسِ ۝ مِن شَرِّ الْوَسْوَاسِ الْخَنَّاسِ ۝ الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ ۝ مِنَ الْجِنَّةِ وَالنَّاسِ',
  },
];

export default function DhikrScreen() {
  const isDark = useAppStore((s) => s.theme === 'dark');
  const favorites = useAppStore((s) => s.favorites);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const incrementDhikr = useAppStore((s) => s.incrementDhikr);
  const incrementDailyProgress = useAppStore((s) => s.incrementDailyProgress);
  const t = isDark ? DarkTheme : LightTheme;
  const [tab, setTab] = useState('dhikr');
  const [sel, setSel] = useState(DHIKR[0]);
  const [count, setCount] = useState(0);
  const [expanded, setExpanded] = useState(null);
  const [focusMode, setFocusMode] = useState(false);

  const handleCount = useCallback(async () => {
    if (count < sel.target) {
      setCount((c) => c + 1);
      incrementDhikr();
      try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    }
    if (count + 1 >= sel.target) {
      try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    }
  }, [count, sel]);

  const tabs = [
    { id: 'dhikr', label: 'Dhikr', emoji: '📿' },
    { id: 'duas', label: 'Duas', emoji: '🤲' },
    { id: 'sleep', label: 'Schlaf', emoji: '🌙' },
    { id: 'favorites', label: 'Favoriten', emoji: '⭐' },
  ];

  const favDuas = DUAS.filter((d) => favorites.includes(d.id));

  const renderDuaCard = (dua) => (
    <Pressable key={dua.id} onPress={() => {
      const opening = expanded !== dua.id;
      setExpanded(opening ? dua.id : null);
      if (opening) incrementDailyProgress('dua', 1);
    }}>
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 }}>
            <Text style={{ fontSize: 24 }}>{dua.emoji || '🤲'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: expanded === dua.id ? t.accent : t.text }}>{dua.title}</Text>
              <Text style={{ fontSize: FontSize.xs, color: t.textDim, marginTop: Spacing.xs }}>{dua.category}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
            <Pressable onPress={() => toggleFavorite(dua.id)} hitSlop={Spacing.sm} style={styles.favTouch}>
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
            <Text style={{ fontSize: FontSize.sm, color: t.accent, marginBottom: Spacing.sm }}>{dua.transliteration}</Text>
            <Text style={{ fontSize: FontSize.sm, fontStyle: 'italic', color: t.textDim, lineHeight: 22 }}>{dua.translation}</Text>
          </View>
        )}
      </Card>
    </Pressable>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      {/* Focus Mode Modal */}
      <Modal visible={focusMode} animationType="fade" statusBarTranslucent>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <Pressable onPress={handleCount} style={styles.focusContainer}>
          <Text style={styles.focusArabic}>{sel.arabic}</Text>
          <Text style={styles.focusCount}>{count}</Text>
          <Text style={styles.focusTarget}>/ {sel.target}</Text>
          <View style={styles.focusDots}>
            {Array.from({ length: sel.target }, (_, i) => (
              <View
                key={i}
                style={[
                  styles.focusDot,
                  { backgroundColor: i < count ? '#B8860B' : '#222' },
                  sel.target > 40 && i % Math.ceil(sel.target / 33) !== 0 && i !== sel.target - 1 && { display: 'none' },
                ]}
              />
            ))}
          </View>
          {count >= sel.target && (
            <Text style={styles.focusComplete}>✨ MashaAllah!</Text>
          )}
          <View style={styles.focusExitWrap}>
            <Pressable onPress={() => setFocusMode(false)} style={styles.focusExitBtn}>
              <Text style={styles.focusExitText}>Beenden</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 100 }}>
        <HeaderBar title="Dhikr & Duas" t={t} />

        <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg }}>
          {tabs.map((tb) => (
            <Pressable
              key={tb.id}
              style={[styles.tab, tab === tb.id && { backgroundColor: t.accent + '18', borderColor: t.accent + '44' }]}
              onPress={() => setTab(tb.id)}
            >
              <Text style={{ fontSize: 18, marginBottom: Spacing.xs }}>{tb.emoji}</Text>
              <Text style={{ fontSize: FontSize.xs, fontWeight: '600', color: tab === tb.id ? t.accent : t.textDim }}>{tb.label}</Text>
            </Pressable>
          ))}
        </View>

        {tab === 'dhikr' && (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg }}>
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
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: Spacing.md, marginBottom: Spacing.lg }}>
              <Pressable style={[styles.resetBtn, { borderColor: t.border }]} onPress={() => setCount(0)}>
                <Text style={{ fontSize: FontSize.sm, color: t.textDim }}>Zurücksetzen</Text>
              </Pressable>
              <Pressable
                style={[styles.resetBtn, { borderColor: t.accent, backgroundColor: t.accent + '15' }]}
                onPress={() => setFocusMode(true)}
              >
                <Text style={{ fontSize: FontSize.sm, color: t.accent }}>🧘 Focus Mode</Text>
              </Pressable>
            </View>
            {count >= sel.target && (
              <Card centered style={{ borderColor: t.accent + '44' }}>
                <Text style={{ fontSize: 28, marginBottom: Spacing.xs }}>✨</Text>
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

        {tab === 'sleep' && (
          <>
            <Card centered>
              <Text style={{ fontSize: 36 }}>🌙</Text>
              <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: t.text, marginTop: Spacing.sm }}>Schlafmodus</Text>
              <Text style={{ fontSize: FontSize.sm, color: t.textDim, marginTop: Spacing.xs, textAlign: 'center' }}>Adhkar und Suren zum Lesen vor dem Schlafen</Text>
            </Card>
            {SLEEP_CONTENT.map((item) => (
              <Card key={item.id}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md }}>
                  <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: t.text }}>{item.title}</Text>
                  <Text style={{ fontSize: FontSize.xs, color: t.textDim }}>{item.ref}</Text>
                </View>
                <View style={{ padding: Spacing.lg, borderRadius: BorderRadius.md, backgroundColor: t.accent + '08', borderWidth: 1, borderColor: t.accent + '15' }}>
                  <Text style={{ fontSize: FontSize.arabic, lineHeight: 42, textAlign: 'right', color: t.accentLight }}>{item.arabic}</Text>
                </View>
                {item.transliteration && (
                  <Text style={{ fontSize: FontSize.sm, color: t.accent, marginTop: Spacing.md }}>{item.transliteration}</Text>
                )}
                {item.translation && (
                  <Text style={{ fontSize: FontSize.sm, fontStyle: 'italic', color: t.textDim, marginTop: Spacing.xs, lineHeight: 22 }}>{item.translation}</Text>
                )}
              </Card>
            ))}
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
  tab: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: 'transparent' },
  chip: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, borderWidth: 1 },
  counterBtn: { alignSelf: 'center', width: 180, height: 180, borderRadius: 90, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginVertical: Spacing.xl },
  bar: { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: Spacing.lg },
  barFill: { height: '100%', borderRadius: 3 },
  resetBtn: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, minHeight: 44, justifyContent: 'center' },
  favTouch: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  // Focus Mode styles
  focusContainer: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl },
  focusArabic: { fontSize: 36, color: '#D4A843', textAlign: 'center', marginBottom: Spacing.xxl },
  focusCount: { fontSize: 120, fontWeight: '700', color: '#B8860B', fontVariant: ['tabular-nums'] },
  focusTarget: { fontSize: 24, color: '#555' },
  focusDots: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.xs, marginTop: Spacing.xxl, paddingHorizontal: Spacing.xl, maxWidth: 300 },
  focusDot: { width: 6, height: 6, borderRadius: 3 },
  focusComplete: { fontSize: 28, color: '#B8860B', marginTop: Spacing.xxl },
  focusExitWrap: { marginTop: Spacing.xxxl },
  focusExitBtn: { paddingHorizontal: 32, paddingVertical: Spacing.lg, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: '#333', minHeight: 44, justifyContent: 'center' },
  focusExitText: { fontSize: 16, color: '#888' },
});
