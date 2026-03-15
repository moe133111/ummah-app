import { View, Text, StyleSheet, FlatList, SafeAreaView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '../../hooks/useAppStore';
import { DarkTheme, LightTheme, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { SURAH_LIST, QURAN_LANGUAGES } from '../../features/quran/surahData';

async function fetchSurah(num, edition) {
  const res = await fetch(`https://api.alquran.cloud/v1/surah/${num}/${edition}`);
  const data = await res.json();
  if (data.code !== 200) throw new Error('Fehler');
  return data.data.ayahs;
}

export default function SurahDetail() {
  const { surah } = useLocalSearchParams();
  const num = parseInt(surah, 10);
  const isDark = useAppStore((s) => s.theme === 'dark');
  const lang = useAppStore((s) => s.quranLanguage);
  const lang2 = useAppStore((s) => s.quranSecondLanguage);
  const setLastRead = useAppStore((s) => s.setLastRead);
  const t = isDark ? DarkTheme : LightTheme;

  const ed = QURAN_LANGUAGES.find(l => l.code === lang)?.edition || 'quran-uthmani';
  const ed2 = lang2 ? QURAN_LANGUAGES.find(l => l.code === lang2)?.edition : null;
  const meta = SURAH_LIST[num - 1];
  const isAr = lang === 'ar';

  const { data: ayahs, isLoading, error } = useQuery({ queryKey: ['surah', num, ed], queryFn: () => fetchSurah(num, ed) });
  const { data: ayahs2 } = useQuery({ queryKey: ['surah', num, ed2], queryFn: () => fetchSurah(num, ed2), enabled: !!ed2 });

  if (ayahs) setLastRead(num, 1);

  const renderAyah = ({ item, index }) => (
    <View style={[styles.ayahRow, { borderBottomColor: t.border }]}>
      <View style={{ flexDirection: 'row', marginBottom: 8 }}>
        <View style={[styles.ayahNum, { backgroundColor: t.accent + '15', borderColor: t.accent + '30' }]}>
          <Text style={{ fontSize: FontSize.xs, fontWeight: '600', color: t.accent }}>{item.numberInSurah}</Text>
        </View>
      </View>
      <Text style={[{ fontSize: isAr ? FontSize.arabic : FontSize.md, lineHeight: isAr ? 44 : 26, textAlign: isAr ? 'right' : 'left', color: isAr ? t.accentLight : t.text }]}>{item.text}</Text>
      {ayahs2?.[index] && <Text style={{ fontSize: FontSize.sm, fontStyle: 'italic', lineHeight: 22, marginTop: 8, color: t.textDim }}>{ayahs2[index].text}</Text>}
    </View>
  );

  const Header = () => (
    <View style={{ alignItems: 'center', paddingVertical: Spacing.xl }}>
      <Text style={{ fontSize: 36, fontWeight: '700', color: t.accent }}>{meta?.name}</Text>
      <Text style={{ fontSize: FontSize.xl, fontWeight: '700', color: t.text, marginTop: 4 }}>{meta?.englishName}</Text>
      <Text style={{ fontSize: FontSize.sm, color: t.textDim, marginTop: 4 }}>{meta?.englishTranslation} · {meta?.numberOfAyahs} Ayat</Text>
      {num !== 1 && num !== 9 && (
        <View style={{ marginTop: Spacing.xl, padding: Spacing.lg, borderRadius: BorderRadius.md, backgroundColor: t.accent + '08', borderWidth: 1, borderColor: t.accent + '15' }}>
          <Text style={{ fontSize: 24, textAlign: 'center', color: t.accent }}>بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</Text>
        </View>
      )}
    </View>
  );

  if (isLoading) return <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}><View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="large" color={t.accent} /><Text style={{ marginTop: 12, color: t.textDim }}>Wird geladen...</Text></View></SafeAreaView>;
  if (error) return <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}><View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 36, marginBottom: 12 }}>⚠️</Text><Text style={{ color: t.textDim }}>Fehler beim Laden. Prüfe deine Internetverbindung.</Text></View></SafeAreaView>;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <FlatList data={ayahs} keyExtractor={i => String(i.number)} renderItem={renderAyah} ListHeaderComponent={Header} contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 60 }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  ayahRow: { paddingVertical: Spacing.lg, borderBottomWidth: 1 },
  ayahNum: { width: 34, height: 34, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
