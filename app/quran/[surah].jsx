import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, ActivityIndicator, TouchableOpacity, Pressable, Platform, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '../../hooks/useAppStore';
import { DarkTheme, LightTheme, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { SURAH_LIST, QURAN_LANGUAGES, toArabicNumerals } from '../../features/quran/surahData';
import { getSurah, saveSurah, isSurahCached } from '../../lib/database';
import * as AudioPlayer from '../../features/quran/audioPlayer';
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
  const [audioError, setAudioError] = useState(false);
  const flatListRef = useRef(null);
  const currentIndexRef = useRef(-1);

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

  // --- Audio: scroll helper ---
  const scrollToAyah = useCallback((index) => {
    if (flatListRef.current && index >= 0) {
      try {
        flatListRef.current.scrollToIndex({ index, animated: true, viewPosition: 0.3 });
      } catch {}
    }
  }, []);

  // --- Audio: play a specific ayah by index, with auto-advance ---
  const startPlaybackFromIndex = useCallback(async (index) => {
    if (!ayahs || index < 0 || index >= ayahs.length) return;

    setAudioError(false);
    currentIndexRef.current = index;

    // Set up the onFinish callback for auto-advance
    AudioPlayer.setOnFinish(() => {
      const nextIdx = currentIndexRef.current + 1;
      if (ayahs && nextIdx < ayahs.length) {
        // Play next ayah
        currentIndexRef.current = nextIdx;
        setCurrentPlayingAyah(nextIdx);
        scrollToAyah(nextIdx);

        AudioPlayer.playAyah(ayahs[nextIdx].number).catch(() => {
          setIsPlaying(false);
          setCurrentPlayingAyah(-1);
          currentIndexRef.current = -1;
          setAudioError(true);
        });
      } else {
        // Surah finished
        setIsPlaying(false);
        setCurrentPlayingAyah(-1);
        currentIndexRef.current = -1;
      }
    });

    try {
      setAudioLoading(true);
      setCurrentPlayingAyah(index);
      setIsPlaying(true);
      scrollToAyah(index);

      await AudioPlayer.initAudioMode();
      await AudioPlayer.playAyah(ayahs[index].number);
      setAudioLoading(false);
    } catch {
      setAudioLoading(false);
      setIsPlaying(false);
      setCurrentPlayingAyah(-1);
      currentIndexRef.current = -1;
      setAudioError(true);
      Alert.alert('Audio nicht verfügbar', 'Prüfe deine Internetverbindung und versuche es erneut.');
    }
  }, [ayahs, scrollToAyah]);

  // --- Toggle play/pause ---
  const toggleAudio = useCallback(async () => {
    if (isPlaying) {
      await AudioPlayer.pause();
      setIsPlaying(false);
      return;
    }

    // Try to resume if paused
    if (currentPlayingAyah >= 0) {
      const resumed = await AudioPlayer.resume();
      if (resumed) {
        setIsPlaying(true);
        return;
      }
    }

    // Start from beginning or current position
    const startIdx = currentPlayingAyah >= 0 ? currentPlayingAyah : 0;
    await startPlaybackFromIndex(startIdx);
  }, [isPlaying, currentPlayingAyah, startPlaybackFromIndex]);

  // --- Play from header button (always from ayah 1) ---
  const playFromStart = useCallback(async () => {
    if (isPlaying) {
      await AudioPlayer.pause();
      setIsPlaying(false);
      return;
    }

    // If paused, resume
    if (currentPlayingAyah >= 0) {
      const resumed = await AudioPlayer.resume();
      if (resumed) {
        setIsPlaying(true);
        return;
      }
    }

    await startPlaybackFromIndex(0);
  }, [isPlaying, currentPlayingAyah, startPlaybackFromIndex]);

  // --- Tap on ayah to play from there ---
  const playFromAyah = useCallback(async (index) => {
    // If already playing this ayah, pause
    if (isPlaying && currentPlayingAyah === index) {
      await AudioPlayer.pause();
      setIsPlaying(false);
      return;
    }
    await startPlaybackFromIndex(index);
  }, [isPlaying, currentPlayingAyah, startPlaybackFromIndex]);

  // --- Cleanup on unmount or surah change ---
  useEffect(() => {
    return () => {
      AudioPlayer.stop();
      AudioPlayer.setOnFinish(null);
    };
  }, [num]);

  const scrollToCurrentAyah = useCallback(() => {
    scrollToAyah(currentPlayingAyah);
  }, [currentPlayingAyah, scrollToAyah]);

  // Card colors
  const cardBg = isDark ? '#152238' : '#FFFFFF';
  const highlightBg = isDark ? '#1C2D4A' : '#FFF9EF';

  // --- Render ayah card ---
  const renderAyah = ({ item, index }) => {
    const isActive = currentPlayingAyah === index;
    const isLoadingThis = audioLoading && currentPlayingAyah === index;

    return (
      <Pressable onPress={() => playFromAyah(index)}>
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

          {/* Small play indicator bottom-left */}
          <View style={styles.ayahPlayIcon}>
            {isLoadingThis ? (
              <ActivityIndicator size={12} color={t.accent} />
            ) : (
              <Text style={{ fontSize: 12, color: isActive ? t.accent : t.textDim + '66' }}>
                {isActive && isPlaying ? '⏸' : '▶'}
              </Text>
            )}
          </View>
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

      {/* Big play button */}
      <Pressable
        onPress={playFromStart}
        disabled={audioLoading && currentPlayingAyah === 0}
        style={({ pressed }) => [styles.headerPlayRow, { opacity: pressed ? 0.7 : 1 }]}
      >
        <View style={[styles.headerPlayBtn, { backgroundColor: t.accent }]}>
          {audioLoading && currentPlayingAyah === 0 ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={{ fontSize: 24, color: '#fff', marginLeft: isPlaying ? 0 : 2 }}>
              {isPlaying ? '⏸' : '▶'}
            </Text>
          )}
        </View>
        <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: t.accent, marginLeft: Spacing.md }}>
          {isPlaying ? 'Rezitation pausieren' : 'Rezitation abspielen'}
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

  const showPlayerBar = isPlaying || currentPlayingAyah >= 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <FlatList
        ref={flatListRef}
        data={ayahs}
        keyExtractor={(i) => String(i.numberInSurah)}
        renderItem={renderAyah}
        ListHeaderComponent={Header}
        ListFooterComponent={Footer}
        contentContainerStyle={{ padding: Spacing.lg, paddingBottom: showPlayerBar ? 110 : 60 }}
        onScrollToIndexFailed={(info) => {
          flatListRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: true });
        }}
      />

      {/* Floating Audio Player Bar */}
      {showPlayerBar && (
        <Pressable onPress={scrollToCurrentAyah} style={[styles.playerBar, { backgroundColor: isDark ? '#152238F2' : '#FFFFFFF2', borderColor: t.border }]}>
          <View style={{ flex: 1, marginRight: Spacing.md }}>
            <Text style={{ fontSize: FontSize.xs, color: t.textDim }} numberOfLines={1}>
              Mishary Rashid Alafasy
            </Text>
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
              <Text style={{ fontSize: 22, color: '#fff' }}>{isPlaying ? '⏸' : '▶'}</Text>
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
  ayahPlayIcon: {
    position: 'absolute',
    bottom: 10,
    left: 14,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
  headerPlayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  headerPlayBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#B8860B', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 6 },
    }),
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
    height: 70,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 10 },
      android: { elevation: 10 },
    }),
  },
  playerPlayBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#B8860B', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 6 },
      android: { elevation: 4 },
    }),
  },
});
