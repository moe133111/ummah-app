import { View, Text, StyleSheet, FlatList, Pressable, TextInput, SafeAreaView } from 'react-native';
import { useState, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { useAppStore } from '../../hooks/useAppStore';
import { DarkTheme, LightTheme, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { SURAH_LIST } from '../../features/quran/surahData';
import Card from '../../components/ui/Card';
import LanguagePicker from '../../components/ui/LanguagePicker';
import HeaderBar from '../../components/ui/HeaderBar';

export default function QuranScreen() {
  const isDark = useAppStore((s) => s.theme === 'dark');
  const lastRead = useAppStore((s) => s.lastReadSurah);
  const quranLanguage = useAppStore((s) => s.quranLanguage);
  const quranSecondLanguage = useAppStore((s) => s.quranSecondLanguage);
  const setQuranLanguage = useAppStore((s) => s.setQuranLanguage);
  const setQuranSecondLanguage = useAppStore((s) => s.setQuranSecondLanguage);
  const t = isDark ? DarkTheme : LightTheme;
  const router = useRouter();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return SURAH_LIST;
    const q = search.toLowerCase();
    return SURAH_LIST.filter(s => s.name.includes(q) || s.englishName.toLowerCase().includes(q) || String(s.number).includes(q));
  }, [search]);

  const renderSurah = ({ item }) => (
    <Pressable style={[styles.row, { borderBottomColor: t.border }, item.number === lastRead && { backgroundColor: t.accent + '10' }]}
      onPress={() => router.push(`/quran/${item.number}`)}>
      <View style={[styles.num, { backgroundColor: t.accent + '15', borderColor: t.accent + '30' }]}>
        <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: t.accent }}>{item.number}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: t.text }}>{item.englishName}</Text>
        <Text style={{ fontSize: FontSize.xs, color: t.textDim, marginTop: Spacing.xs }}>{item.englishTranslation} · {item.numberOfAyahs} Ayat</Text>
      </View>
      <Text style={{ fontSize: FontSize.xl, fontWeight: '600', color: t.accent }}>{item.name}</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]}>
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <HeaderBar titleAr="القرآن الكريم" title="Der edle Quran" t={t} />
        {lastRead > 0 && (
          <Pressable onPress={() => router.push(`/quran/${lastRead}`)} style={{ paddingHorizontal: Spacing.lg }}>
            <Card style={{ borderColor: t.accent + '33' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ fontSize: FontSize.xs, color: t.textDim }}>Weiterlesen</Text>
                  <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: t.accent, marginTop: Spacing.xs }}>{SURAH_LIST[lastRead - 1]?.englishName}</Text>
                </View>
                <Text style={{ fontSize: 24 }}>📖</Text>
              </View>
            </Card>
          </Pressable>
        )}
        <View style={styles.langRow}>
          <LanguagePicker label="Sprache 1" value={quranLanguage} onChange={setQuranLanguage} t={t} />
          <LanguagePicker label="Sprache 2" value={quranSecondLanguage} onChange={setQuranSecondLanguage} allowClear t={t} />
        </View>
        <View style={[styles.searchWrap, { backgroundColor: t.surface, borderColor: t.border }]}>
          <Text style={{ fontSize: 16, marginRight: Spacing.sm }}>🔍</Text>
          <TextInput style={{ flex: 1, paddingVertical: Spacing.md, fontSize: FontSize.md, color: t.text }} placeholder="Sure suchen..." placeholderTextColor={t.textDim} value={search} onChangeText={setSearch} />
        </View>
        <FlatList data={filtered} keyExtractor={i => String(i.number)} renderItem={renderSurah} contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: 100 }} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  langRow: { flexDirection: 'row', gap: Spacing.sm, marginHorizontal: Spacing.lg, marginBottom: Spacing.md },
  searchWrap: { flexDirection: 'row', alignItems: 'center', marginHorizontal: Spacing.lg, marginBottom: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, paddingHorizontal: Spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.lg, borderBottomWidth: 1, gap: Spacing.md },
  num: { width: 44, height: 44, borderRadius: BorderRadius.sm, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
