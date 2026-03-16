import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '../../hooks/useAppStore';
import { DarkTheme, LightTheme, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { SURAH_LIST, QURAN_LANGUAGES } from '../../features/quran/surahData';
import { getSurah, saveSurah, isSurahCached } from '../../lib/database';

async function fetchSurahWithCache(num, edition) {
  // Try loading from SQLite cache first
  const cached = await getSurah(num, edition);
  if (cached) {
    return { ayahs: cached, fromCache: true };
  }

  // Not cached — fetch from API
  const res = await fetch(`https://api.alquran.cloud/v1/surah/${num}/${edition}`);
  const data = await res.json();
  if (data.code !== 200) throw new Error('Fehler');
  const ayahs = data.data.ayahs;

  // Save to SQLite for offline use
  await saveSurah(num, edition, ayahs);

  return { ayahs, fromCache: false };
}

export default function SurahDetail() {
  const { surah } = useLocalSearchParams();
  const router = useRouter();
  const num = parseInt(surah, 10);
  const isDark = useAppStore((s) => s.theme === 'dark');
  const lang = useAppStore((s) => s.quranLanguage);
  const lang2 = useAppStore((s) => s.quranSecondLanguage);
  const setLastRead = useAppStore((s) => s.setLastRead);
  const t = isDark ? DarkTheme : LightTheme;

  const ed = QURAN_LANGUAGES.find(l => l.code === lang)?.edition || 'quran-uthmani';
  const ed2 = lang2 ? QURAN_LANGUAGES.find(l => l.code === lang2)?.edition : null;
  const meta = SURAH_LIST[num - 1];
  const prevMeta = num > 1 ? SURAH_LIST[num - 2] : null;
  const nextMeta = num < 114 ? SURAH_LIST[num] : null;
  const isAr = lang === 'ar';

  const goToSurah = (n) => router.replace(`/quran/${n}`);

  const [cached1, setCached1] = useState(false);
  const [cached2, setCached2] = useState(false);

  useEffect(() => {
    isSurahCached(num, ed).then(setCached1);
    if (ed2) isSurahCached(num, ed2).then(setCached2);
  }, [num, ed, ed2]);

  const { data: result1, isLoading, error } = useQuery({
    queryKey: ['surah', num, ed],
    queryFn: () => fetchSurahWithCache(num, ed),
  });

  const { data: result2 } = useQuery({
    queryKey: ['surah', num, ed2],
    queryFn: () => fetchSurahWithCache(num, ed2),
    enabled: !!ed2,
  });

  const ayahs = result1?.ayahs;
  const ayahs2 = result2?.ayahs;
  const fromCache = result1?.fromCache;

  useEffect(() => {
    if (ayahs) {
      setLastRead(num, 1);
      setCached1(true);
    }
  }, [ayahs]);

  useEffect(() => {
    if (ayahs2) setCached2(true);
  }, [ayahs2]);

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
      {cached1 && (
        <View style={[styles.offlineBadge, { backgroundColor: '#4CAF5020', borderColor: '#4CAF5040' }]}>
          <Text style={{ fontSize: FontSize.xs, color: '#4CAF50', fontWeight: '600' }}>✓ Offline verfügbar</Text>
        </View>
      )}
      <View style={styles.headerNav}>
        <TouchableOpacity onPress={() => goToSurah(num - 1)} disabled={!prevMeta} style={{ opacity: prevMeta ? 1 : 0.3 }}>
          <Text style={{ fontSize: FontSize.sm, color: t.accent }}>← {prevMeta?.englishName || ''}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => goToSurah(num + 1)} disabled={!nextMeta} style={{ opacity: nextMeta ? 1 : 0.3 }}>
          <Text style={{ fontSize: FontSize.sm, color: t.accent }}>{nextMeta?.englishName || ''} →</Text>
        </TouchableOpacity>
      </View>
      {num !== 1 && num !== 9 && (
        <View style={{ marginTop: Spacing.lg, padding: Spacing.lg, borderRadius: BorderRadius.md, backgroundColor: t.accent + '08', borderWidth: 1, borderColor: t.accent + '15' }}>
          <Text style={{ fontSize: 24, textAlign: 'center', color: t.accent }}>بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</Text>
        </View>
      )}
    </View>
  );

  const Footer = () => (
    <View style={styles.footerNav}>
      <TouchableOpacity
        onPress={() => goToSurah(num - 1)}
        disabled={!prevMeta}
        style={[styles.navBtn, { borderColor: t.accent + '44' }, !prevMeta && { opacity: 0.3 }]}
      >
        <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: t.accent }}>← Vorherige Sure</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => goToSurah(num + 1)}
        disabled={!nextMeta}
        style={[styles.navBtn, { borderColor: t.accent + '44' }, !nextMeta && { opacity: 0.3 }]}
      >
        <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: t.accent }}>Nächste Sure →</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    const loadingText = cached1 ? 'Wird aus Cache geladen...' : 'Wird heruntergeladen...';
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={t.accent} />
          <Text style={{ marginTop: 12, color: t.textDim }}>{loadingText}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) return <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}><View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 36, marginBottom: 12 }}>⚠️</Text><Text style={{ color: t.textDim }}>Fehler beim Laden. Prüfe deine Internetverbindung.</Text></View></SafeAreaView>;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <FlatList data={ayahs} keyExtractor={i => String(i.numberInSurah)} renderItem={renderAyah} ListHeaderComponent={Header} ListFooterComponent={Footer} contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 60 }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  ayahRow: { paddingVertical: Spacing.lg, borderBottomWidth: 1 },
  ayahNum: { width: 34, height: 34, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  offlineBadge: { marginTop: 8, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  headerNav: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: Spacing.md, paddingHorizontal: Spacing.xs },
  footerNav: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xl },
  navBtn: { flex: 1, paddingVertical: Spacing.lg, borderRadius: BorderRadius.md, borderWidth: 1.5, alignItems: 'center' },
});
