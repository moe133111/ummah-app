import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, ActivityIndicator, TouchableOpacity, Pressable, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Audio } from 'expo-av';
import { useAppStore } from '../../hooks/useAppStore';
import { DarkTheme, LightTheme, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { SURAH_LIST, QURAN_LANGUAGES, toArabicNumerals } from '../../features/quran/surahData';
import { getSurah, saveSurah, isSurahCached } from '../../lib/database';
import AyahOrnament from '../../components/ui/AyahOrnament';
import { SurahHeaderFrame, OrnamentalBorder } from '../../components/ui/QuranDecorations';

async function fetchSurahWithCache(num, edition) {
  const cached = await getSurah(num, edition);
  if (cached) {
    return { ayahs: cached, fromCache: true };
  }

  const res = await fetch(`https://api.alquran.cloud/v1/surah/${num}/${edition}`);
  const data = await res.json();
  if (data.code !== 200) throw new Error('Fehler');
  const ayahs = data.data.ayahs;

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
  const setQuranLanguage = useAppStore((s) => s.setQuranLanguage);
  const setQuranSecondLanguage = useAppStore((s) => s.setQuranSecondLanguage);
  const setLastRead = useAppStore((s) => s.setLastRead);
  const t = isDark ? DarkTheme : LightTheme;

  const [showLangPicker, setShowLangPicker] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [currentPlayingAyah, setCurrentPlayingAyah] = useState(-1);
  const soundRef = useRef(null);
  const flatListRef = useRef(null);

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
      setCurrentPlayingAyah(-1);
      setIsPlaying(false);
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

  const { data: translitResult } = useQuery({
    queryKey: ['surah', num, 'en.transliteration'],
    queryFn: () => fetchSurahWithCache(num, 'en.transliteration'),
  });

  // Always fetch Arabic text for display when primary lang is not Arabic
  const { data: arabicResult } = useQuery({
    queryKey: ['surah', num, 'quran-uthmani'],
    queryFn: () => fetchSurahWithCache(num, 'quran-uthmani'),
    enabled: !isAr,
  });

  const ayahs = result1?.ayahs;
  const ayahs2 = result2?.ayahs;
  const translitAyahs = translitResult?.ayahs;
  const arabicAyahs = isAr ? ayahs : arabicResult?.ayahs;

  useEffect(() => {
    if (ayahs) {
      setLastRead(num, 1);
      setCached1(true);
    }
  }, [ayahs]);

  useEffect(() => {
    if (ayahs2) setCached2(true);
  }, [ayahs2]);

  // --- Ayah-by-ayah audio playback ---
  const playAyah = useCallback(async (ayahNumber, index, totalCount) => {
    if (index >= totalCount) {
      setIsPlaying(false);
      setCurrentPlayingAyah(-1);
      return;
    }

    setCurrentPlayingAyah(index);

    // Scroll to the active ayah
    if (flatListRef.current) {
      try {
        flatListRef.current.scrollToIndex({ index, animated: true, viewPosition: 0.3 });
      } catch {}
    }

    if (soundRef.current) {
      await soundRef.current.unloadAsync();
    }

    const url = `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${ayahNumber}.mp3`;

    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true },
        (status) => {
          if (status.didJustFinish) {
            // Play next ayah
            const nextAyahNum = ayahNumber + 1;
            playAyah(nextAyahNum, index + 1, totalCount);
          }
        }
      );
      soundRef.current = sound;
    } catch {
      setIsPlaying(false);
      setCurrentPlayingAyah(-1);
    }
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
      // Resume if paused
      if (soundRef.current && currentPlayingAyah >= 0) {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded && !status.isPlaying) {
          await soundRef.current.playAsync();
          setIsPlaying(true);
          return;
        }
      }

      if (!ayahs || ayahs.length === 0) return;

      setAudioLoading(true);
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: true });

      const startIndex = currentPlayingAyah >= 0 ? currentPlayingAyah : 0;
      const startAyahNumber = ayahs[startIndex].number;

      setIsPlaying(true);
      setAudioLoading(false);
      await playAyah(startAyahNumber, startIndex, ayahs.length);
    } catch {
      setAudioLoading(false);
      setIsPlaying(false);
    }
  }, [isPlaying, ayahs, currentPlayingAyah, playAyah]);

  const playFromAyah = useCallback(async (index) => {
    if (!ayahs || index >= ayahs.length) return;

    try {
      setAudioLoading(true);
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: true });
      setIsPlaying(true);
      setAudioLoading(false);
      await playAyah(ayahs[index].number, index, ayahs.length);
    } catch {
      setAudioLoading(false);
      setIsPlaying(false);
    }
  }, [ayahs, playAyah]);

  const scrollToCurrentAyah = useCallback(() => {
    if (flatListRef.current && currentPlayingAyah >= 0) {
      try {
        flatListRef.current.scrollToIndex({ index: currentPlayingAyah, animated: true, viewPosition: 0.3 });
      } catch {}
    }
  }, [currentPlayingAyah]);

  // Card colors
  const cardBg = isDark ? '#152238' : '#FFFFFF';
  const highlightBg = isDark ? '#1C2D4A' : '#FFF9EF';

  // --- Render ---
  const renderAyah = ({ item, index }) => {
    const isActive = currentPlayingAyah === index;

    return (
      <Pressable onLongPress={() => playFromAyah(index)}>
        <View style={[
          styles.ayahCard,
          { backgroundColor: isActive ? highlightBg : cardBg, borderColor: isActive ? t.accent + '44' : t.border + '66' },
          isActive && styles.ayahCardActive,
        ]}>
          {/* Ornamental number top-right */}
          <View style={styles.ornamentPos}>
            <AyahOrnament number={toArabicNumerals(item.numberInSurah)} color={t.accent} />
          </View>

          {/* Arabic text (always shown) */}
          {arabicAyahs?.[index] && (
            <Text style={[styles.arabicText, { color: t.accentLight, paddingRight: 52 }]}>
              {arabicAyahs[index].text}
            </Text>
          )}

          {/* Transliteration */}
          {translitAyahs?.[index] && (
            <Text style={[styles.translitText, { color: t.accent }]}>
              {translitAyahs[index].text}
            </Text>
          )}

          {/* Primary language translation (when not Arabic) */}
          {!isAr && (
            <Text style={[styles.translationText, { color: t.text }]}>
              {item.text}
            </Text>
          )}

          {/* Second language */}
          {ayahs2?.[index] && (
            <Text style={[styles.secondLangText, { color: t.textDim }]}>
              {ayahs2[index].text}
            </Text>
          )}
        </View>
      </Pressable>
    );
  };

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
    <View style={{ alignItems: 'center' }}>
      <SurahHeaderFrame
        name={meta?.name}
        englishName={meta?.englishName}
        translation={meta?.englishTranslation}
        ayahCount={meta?.numberOfAyahs}
        t={t}
      />

      {cached1 && (
        <View style={[styles.offlineBadge, { backgroundColor: '#4CAF5020', borderColor: '#4CAF5040' }]}>
          <Text style={{ fontSize: FontSize.xs, color: '#4CAF50', fontWeight: '600' }}>✓ Offline verfügbar</Text>
        </View>
      )}

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

      {/* Bismillah Card */}
      {num !== 1 && num !== 9 && (
        <View style={[styles.bismillahCard, { backgroundColor: cardBg, borderColor: t.border + '66' }]}>
          <OrnamentalBorder color={t.accent} width={80} />
          <Text style={styles.bismillahText}>
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </Text>
          <OrnamentalBorder color={t.accent} width={80} />
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

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 36, marginBottom: 12 }}>⚠️</Text>
          <Text style={{ color: t.textDim }}>Fehler beim Laden. Prüfe deine Internetverbindung.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <FlatList
        ref={flatListRef}
        data={ayahs}
        keyExtractor={(i) => String(i.numberInSurah)}
        renderItem={renderAyah}
        ListHeaderComponent={Header}
        ListFooterComponent={Footer}
        contentContainerStyle={{ padding: Spacing.lg, paddingBottom: isPlaying ? 100 : 60 }}
        onScrollToIndexFailed={(info) => {
          flatListRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: true });
        }}
      />

      {/* Audio Player Bar */}
      {(isPlaying || currentPlayingAyah >= 0) && (
        <Pressable onPress={scrollToCurrentAyah} style={[styles.playerBar, { backgroundColor: isDark ? '#152238EE' : '#FFFFFFEE', borderColor: t.border }]}>
          <View style={{ flex: 1, marginRight: Spacing.md }}>
            <Text style={{ fontSize: FontSize.xs, color: t.textDim }} numberOfLines={1}>Mishary Rashid Alafasy</Text>
            <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: t.text, marginTop: 2 }} numberOfLines={1}>
              {meta?.englishName} · Ayah {currentPlayingAyah >= 0 ? currentPlayingAyah + 1 : '-'}/{ayahs?.length}
            </Text>
          </View>
          <Pressable
            onPress={(e) => { e.stopPropagation?.(); toggleAudio(); }}
            style={[styles.playerPlayBtn, { backgroundColor: t.accent }]}
          >
            {audioLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={{ fontSize: 18, color: '#fff' }}>{isPlaying ? '⏸' : '▶️'}</Text>
            )}
          </Pressable>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  ayahCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    position: 'relative',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  ayahCardActive: {
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#B8860B', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 10 },
      android: { elevation: 4 },
    }),
  },
  ornamentPos: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
  },
  arabicText: {
    fontSize: FontSize.arabic,
    lineHeight: 44,
    textAlign: 'right',
  },
  translitText: {
    fontSize: FontSize.sm,
    fontStyle: 'italic',
    lineHeight: 24,
    marginTop: 10,
  },
  translationText: {
    fontSize: FontSize.md,
    lineHeight: 26,
    marginTop: 8,
  },
  secondLangText: {
    fontSize: FontSize.sm,
    fontStyle: 'italic',
    lineHeight: 22,
    marginTop: 8,
  },
  bismillahCard: {
    borderRadius: 16,
    padding: 20,
    marginTop: Spacing.lg,
    borderWidth: 1,
    alignItems: 'center',
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  bismillahText: {
    fontSize: 26,
    textAlign: 'center',
    color: '#D4A843',
    lineHeight: 46,
    flex: 1,
  },
  offlineBadge: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  langRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  langChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm, borderWidth: 1 },
  langOptions: { width: '100%', borderRadius: BorderRadius.md, borderWidth: 1, padding: Spacing.sm, marginTop: Spacing.sm },
  langOption: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.sm },
  headerNav: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: Spacing.md, paddingHorizontal: Spacing.xs },
  footerNav: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xl },
  navBtn: { flex: 1, paddingVertical: Spacing.lg, borderRadius: BorderRadius.md, borderWidth: 1.5, alignItems: 'center' },
  playerBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.12, shadowRadius: 8 },
      android: { elevation: 8 },
    }),
  },
  playerPlayBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
