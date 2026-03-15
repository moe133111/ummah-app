import { View, Text, StyleSheet, FlatList, Pressable, TextInput, SafeAreaView } from 'react-native';
import { useState, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { useAppStore } from '../../hooks/useAppStore';
import { DarkTheme, LightTheme, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { SURAH_LIST } from '../../features/quran/surahData';
import Card from '../../components/ui/Card';

export default function QuranScreen() {
  const isDark = useAppStore((s) => s.theme === 'dark');
  const lastRead = useAppStore((s) => s.lastReadSurah);
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
        <Text style={{ fontSize: FontSize.xs, color: t.textDim, marginTop: 2 }}>{item.englishTranslation} · {item.numberOfAyahs} Ayat</Text>
      </View>
      <Text style={{ fontSize: FontSize.xl, fontWeight: '600', color: t.accent }}>{item.name}</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]}>
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <View style={styles.header}>
          <Text style={{ fontSize: 28, fontWeight: '700', color: t.accent }}>القرآن الكريم</Text>
          <Text style={{ fontSize: FontSize.sm, color: t.textDim, marginTop: 2 }}>Der edle Quran</Text>
        </View>
        {lastRead > 0 && (
          <Pressable onPress={() => router.push(`/quran/${lastRead}`)} style={{ paddingHorizontal: Spacing.lg }}>
            <Card style={{ borderColor: t.accent + '33' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ fontSize: FontSize.xs, color: t.textDim }}>Weiterlesen</Text>
                  <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: t.accent, marginTop: 2 }}>{SURAH_LIST[lastRead - 1]?.englishName}</Text>
                </View>
                <Text style={{ fontSize: 24 }}>📖</Text>
              </View>
            </Card>
          </Pressable>
        )}
        <View style={[styles.searchWrap, { backgroundColor: t.surface, borderColor: t.border }]}>
          <Text style={{ fontSize: 16, marginRight: 8 }}>🔍</Text>
          <TextInput style={{ flex: 1, paddingVertical: 12, fontSize: FontSize.md, color: t.text }} placeholder="Sure suchen..." placeholderTextColor={t.textDim} value={search} onChangeText={setSearch} />
        </View>
        <FlatList data={filtered} keyExtractor={i => String(i.number)} renderItem={renderSurah} contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: 40 }} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { alignItems: 'center', paddingTop: Spacing.xl, paddingBottom: Spacing.md },
  searchWrap: { flexDirection: 'row', alignItems: 'center', marginHorizontal: Spacing.lg, marginBottom: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, paddingHorizontal: Spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1 },
  num: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
});
