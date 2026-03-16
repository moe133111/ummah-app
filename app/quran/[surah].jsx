import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, ActivityIndicator, TouchableOpacity, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Audio } from 'expo-av';
import { useAppStore } from '../../hooks/useAppStore';
import { DarkTheme, LightTheme, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { SURAH_LIST, QURAN_LANGUAGES, toArabicNumerals } from '../../features/quran/surahData';
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

async function fetchAudioUrl(num) {
  const res = await fetch(`https://api.alquran.cloud/v1/surah/${num}/ar.alafasy`);
  const data = await res.json();
  if (data.code !== 200) throw new Error('Audio nicht verfügbar');
  return data.data.ayahs.map((a) => a.audio);
}

export default function SurahDetail() {
  const { surah } = useLocalSearchParams();
  const router = useRouter();
  const num = parseInt(surah, 10);
  const isDark = useAppStore((s) => s.theme === 'dark');
  const lang = useAppStore((s) => s.quranLanguage);
  const lang2 = useAppStore((s) => s.quranSecondLanguage);
  const setQuranLanguage = useAppStore((s) => s.setQuranLanguage);
  const setQuranSecondLanguage = useAppStore((s) => s.setQuranSecondLanguage);
  const setLastRead = useAppStore((s) => s.setLastRead);
  const t = isDark ? DarkTheme : LightTheme;

  const [showLangPicker, setShowLangPicker] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const soundRef = useRef(null);
  const audioUrlsRef = useRef(null);
  const currentAyahRef = useRef(0);

  const langMeta = QURAN_LANGUAGES.find(l => l.code === lang);
  const lang2Meta = lang2 ? QURAN_LANGUAGES.find(l => l.code === lang2) : null;
  const ed = langMeta?.edition || 'quran-uthmani';
  const ed2 = lang2 ? lang2Meta?.edition : null;
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

  // Audio cleanup on unmount or surah change
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      audioUrlsRef.current = null;
      currentAyahRef.current = 0;
    };
  }, [num]);

  const { data: result1, isLoading, error } = useQuery({
    queryKey: ['surah', num, ed],
    queryFn: () => fetchSurahWithCache(num, ed),
  });

  const { data: result2 } = useQuery({
    queryKey: ['surah', num, ed2],
    queryFn: () => fetchSurahWithCache(num, ed2),
    enabled: !!ed2,
  });

  // Transliteration query
  const { data: translitResult } = useQuery({
    queryKey: ['surah', num, 'en.transliteration'],
    queryFn: () => fetchSurahWithCache(num, 'en.transliteration'),
  });

  const ayahs = result1?.ayahs;
  const ayahs2 = result2?.ayahs;
  const translitAyahs = translitResult?.ayahs;

  useEffect(() => {
    if (ayahs) {
      setLastRead(num, 1);
      setCached1(true);
    }
  }, [ayahs]);

  useEffect(() => {
    if (ayahs2) setCached2(true);
  }, [ayahs2]);

  // --- Audio playback ---
  const playAyah = useCallback(async (urls, index) => {
    if (index >= urls.length) {
      setIsPlaying(false);
      currentAyahRef.current = 0;
      return;
    }
    currentAyahRef.current = index;

    if (soundRef.current) {
      await soundRef.current.unloadAsync();
    }

    const { sound } = await Audio.Sound.createAsync(
      { uri: urls[index] },
      { shouldPlay: true },
      (status) => {
        if (status.didJustFinish) {
          playAyah(urls, index + 1);
        }
      }
    );
    soundRef.current = sound;
  }, []);

  const toggleAudio = useCallback(async () => {
    if (isPlaying) {
      if (soundRef.current) {
        await soundRef.current.pauseAsync();
      }
      setIsPlaying(false);
      return;
    }

    try {
      // Check if we have a paused sound to resume
      if (soundRef.current) {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded && !status.isPlaying) {
          await soundRef.current.playAsync();
          setIsPlaying(true);
          return;
        }
      }

      setAudioLoading(true);
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: true });

      if (!audioUrlsRef.current) {
        audioUrlsRef.current = await fetchAudioUrl(num);
      }

      setIsPlaying(true);
      setAudioLoading(false);
      await playAyah(audioUrlsRef.current, currentAyahRef.current);
    } catch {
      setAudioLoading(false);
      setIsPlaying(false);
    }
  }, [isPlaying, num, playAyah]);

  // --- Render ---
  const renderAyah = ({ item, index }) => (
    <View style={[styles.ayahRow, { borderBottomColor: t.border }]}>
      <View style={{ flexDirection: 'row', marginBottom: 8 }}>
        <View style={[styles.ayahNum, { backgroundColor: t.accent + '15', borderColor: t.accent + '30' }]}>
          <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: t.accent }}>{toArabicNumerals(item.numberInSurah)}</Text>
        </View>
      </View>
      <Text style={[{ fontSize: isAr ? FontSize.arabic : FontSize.md, lineHeight: isAr ? 44 : 26, textAlign: isAr ? 'right' : 'left', color: isAr ? t.accentLight : t.text }]}>{item.text}</Text>
      {translitAyahs?.[index] && (
        <Text style={{ fontSize: FontSize.sm, fontStyle: 'italic', lineHeight: 24, marginTop: 6, color: t.accent }}>{translitAyahs[index].text}</Text>
      )}
      {ayahs2?.[index] && <Text style={{ fontSize: FontSize.sm, fontStyle: 'italic', lineHeight: 22, marginTop: 8, color: t.textDim }}>{ayahs2[index].text}</Text>}
    </View>
  );

  const LangChip = ({ label, langObj, slot }) => (
    <Pressable
      style={[styles.langChip, { borderColor: t.accent + '55', backgroundColor: t.accent + '10' }]}
      onPress={() => setShowLangPicker(showLangPicker === slot ? null : slot)}
    >
      <Text style={{ fontSize: FontSize.xs, color: t.textDim }}>{label}:</Text>
      <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: t.accent, marginLeft: 4 }}>{langObj?.label || 'Keine'}</Text>
    </Pressable>
  );

  const LangOptions = ({ slot }) => (
    <View style={[styles.langOptions, { backgroundColor: t.card, borderColor: t.border }]}>
      {QURAN_LANGUAGES.map((l) => {
        const isActive = slot === '1' ? l.code === lang : l.code === lang2;
        return (
          <Pressable
            key={l.code}
            style={[styles.langOption, isActive && { backgroundColor: t.accent + '18' }]}
            onPress={() => {
              if (slot === '1') setQuranLanguage(l.code);
              else setQuranSecondLanguage(l.code);
              setShowLangPicker(null);
            }}
          >
            <Text style={{ fontSize: FontSize.sm, color: isActive ? t.accent : t.text, fontWeight: isActive ? '700' : '400' }}>{l.label}</Text>
          </Pressable>
        );
      })}
      {slot === '2' && (
        <Pressable
          style={[styles.langOption, !lang2 && { backgroundColor: t.accent + '18' }]}
          onPress={() => { setQuranSecondLanguage(''); setShowLangPicker(null); }}
        >
          <Text style={{ fontSize: FontSize.sm, color: !lang2 ? t.accent : t.textDim, fontWeight: !lang2 ? '700' : '400' }}>Keine</Text>
        </Pressable>
      )}
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
      {/* Audio play/pause */}
      <Pressable
        style={[styles.audioBtn, { borderColor: t.accent + '55', backgroundColor: t.accent + '10' }]}
        onPress={toggleAudio}
        disabled={audioLoading}
      >
        {audioLoading ? (
          <ActivityIndicator size="small" color={t.accent} />
        ) : (
          <Text style={{ fontSize: 18 }}>{isPlaying ? '⏸' : '▶️'}</Text>
        )}
        <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: t.accent, marginLeft: 8 }}>
          {audioLoading ? 'Lädt...' : isPlaying ? 'Pause' : 'Abspielen'}
        </Text>
      </Pressable>
      <View style={styles.langRow}>
        <LangChip label="Sprache 1" langObj={langMeta} slot="1" />
        <LangChip label="Sprache 2" langObj={lang2Meta} slot="2" />
      </View>
      {showLangPicker && <LangOptions slot={showLangPicker} />}
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
  ayahNum: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  offlineBadge: { marginTop: 8, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  audioBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1, marginTop: Spacing.md },
  langRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  langChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm, borderWidth: 1 },
  langOptions: { width: '100%', borderRadius: BorderRadius.md, borderWidth: 1, padding: Spacing.sm, marginTop: Spacing.sm },
  langOption: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.sm },
  headerNav: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: Spacing.md, paddingHorizontal: Spacing.xs },
  footerNav: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xl },
  navBtn: { flex: 1, paddingVertical: Spacing.lg, borderRadius: BorderRadius.md, borderWidth: 1.5, alignItems: 'center' },
});
