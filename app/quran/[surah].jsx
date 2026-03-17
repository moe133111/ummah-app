import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, ActivityIndicator, TouchableOpacity, Pressable, Platform, Alert, PanResponder, Dimensions, Animated } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '../../hooks/useAppStore';
import { DarkTheme, LightTheme, Spacing, FontSize, BorderRadius, Colors } from '../../constants/theme';
import { SURAH_LIST, QURAN_LANGUAGES, toArabicNumerals } from '../../features/quran/surahData';
import { getSurah, saveSurah, isSurahCached } from '../../lib/database';
import * as AudioPlayer from '../../features/quran/audioPlayer';
import AyahOrnament from '../../components/ui/AyahOrnament';
import SurahBanner from '../../components/ui/SurahBanner';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 100;

const BISMILLAH_PREFIX = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';

const ARABIC_FONT = Platform.OS === 'ios' ? 'Al Nile' : 'serif';

function cleanBismillah(ayahs, surahNumber) {
  if (!ayahs || ayahs.length === 0) return { showBismillah: false, ayahs: ayahs || [] };

  // Surah 1 (Al-Fatiha): Bismillah IS verse 1 — return unchanged
  if (surahNumber === 1) return { showBismillah: false, ayahs };

  // Surah 9 (At-Tawbah): No bismillah at all
  if (surahNumber === 9) return { showBismillah: false, ayahs };

  // All other surahs: strip bismillah prefix from first ayah
  const first = ayahs[0];
  const text = first.text || '';
  const stripped = text.replace(BISMILLAH_PREFIX, '').trim();
  const cleaned = [{ ...first, text: stripped || text }, ...ayahs.slice(1)];
  return { showBismillah: true, ayahs: cleaned };
}

function getArabicFontSize(text) {
  const len = (text || '').length;
  if (len < 50) return 30;
  if (len <= 200) return 26;
  return 24;
}

async function fetchSurahWithCache(num, edition) {
  const cached = await getSurah(num, edition);
  if (cached && cached[0]?.number) {
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

  // Swipe navigation
  const [swipeHint, setSwipeHint] = useState(null);
  const swipeAnim = useRef(new Animated.Value(0)).current;

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
  const { data: arabicResult } = useQuery({
    queryKey: ['surah', num, 'quran-uthmani'],
    queryFn: () => fetchSurahWithCache(num, 'quran-uthmani'),
    enabled: !isAr,
  });

  const rawAyahs = result1?.ayahs;
  const rawAyahs2 = result2?.ayahs;
  const rawTranslitAyahs = translitResult?.ayahs;
  const rawArabicAyahs = isAr ? rawAyahs : arabicResult?.ayahs;

  // Clean bismillah from all text sources
  const arabicCleaned = cleanBismillah(rawArabicAyahs, num);
  const primaryCleaned = cleanBismillah(rawAyahs, num);
  const secondCleaned = cleanBismillah(rawAyahs2, num);
  const translitCleaned = cleanBismillah(rawTranslitAyahs, num);
  const showBismillah = arabicCleaned.showBismillah;

  const ayahs = primaryCleaned.ayahs;
  const ayahs2 = secondCleaned.ayahs;
  const translitAyahs = translitCleaned.ayahs;
  const arabicAyahs = arabicCleaned.ayahs;

  useEffect(() => {
    if (ayahs) { setLastRead(num, 1); setCached1(true); }
  }, [ayahs]);
  useEffect(() => { if (ayahs2) setCached2(true); }, [ayahs2]);

  // --- Swipe PanResponder ---
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 20 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.5,
      onPanResponderMove: (_, gs) => {
        if (gs.dx > 30 && prevMeta) setSwipeHint('prev');
        else if (gs.dx < -30 && nextMeta) setSwipeHint('next');
        else setSwipeHint(null);
        swipeAnim.setValue(gs.dx);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dx > SWIPE_THRESHOLD && prevMeta) {
          goToSurah(num - 1);
        } else if (gs.dx < -SWIPE_THRESHOLD && nextMeta) {
          goToSurah(num + 1);
        }
        setSwipeHint(null);
        Animated.spring(swipeAnim, { toValue: 0, useNativeDriver: false }).start();
      },
      onPanResponderTerminate: () => {
        setSwipeHint(null);
        Animated.spring(swipeAnim, { toValue: 0, useNativeDriver: false }).start();
      },
    })
  ).current;

  // --- Audio ---
  const scrollToAyah = useCallback((index) => {
    if (flatListRef.current && index >= 0) {
      try { flatListRef.current.scrollToIndex({ index, animated: true, viewPosition: 0.3 }); } catch {}
    }
  }, []);

  const startPlaybackFromIndex = useCallback(async (index) => {
    if (!ayahs || index < 0 || index >= ayahs.length) return;
    setAudioError(false);
    currentIndexRef.current = index;

    AudioPlayer.setOnFinish(() => {
      const nextIdx = currentIndexRef.current + 1;
      if (ayahs && nextIdx < ayahs.length) {
        currentIndexRef.current = nextIdx;
        setCurrentPlayingAyah(nextIdx);
        scrollToAyah(nextIdx);
        const nextGlobalNum = ayahs[nextIdx].number;
        AudioPlayer.playAyah(nextGlobalNum).catch(() => {
          setIsPlaying(false);
          setCurrentPlayingAyah(-1);
          currentIndexRef.current = -1;
          setAudioError(true);
        });
      } else {
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
      const globalNum = ayahs[index].number;
      if (!globalNum) throw new Error(`Ayah ${index + 1} hat keine globale Nummer.`);
      await AudioPlayer.initAudioMode();
      await AudioPlayer.playAyah(globalNum);
      setAudioLoading(false);
    } catch (err) {
      console.error('[SurahDetail] Audio error:', err);
      setAudioLoading(false);
      setIsPlaying(false);
      setCurrentPlayingAyah(-1);
      currentIndexRef.current = -1;
      setAudioError(true);
      Alert.alert('Audio-Fehler', err?.message || 'Unbekannter Fehler.');
    }
  }, [ayahs, scrollToAyah]);

  const toggleAudio = useCallback(async () => {
    if (isPlaying) { await AudioPlayer.pause(); setIsPlaying(false); return; }
    if (currentPlayingAyah >= 0) {
      const resumed = await AudioPlayer.resume();
      if (resumed) { setIsPlaying(true); return; }
    }
    await startPlaybackFromIndex(currentPlayingAyah >= 0 ? currentPlayingAyah : 0);
  }, [isPlaying, currentPlayingAyah, startPlaybackFromIndex]);

  const playFromStart = useCallback(async () => {
    if (isPlaying) { await AudioPlayer.pause(); setIsPlaying(false); return; }
    if (currentPlayingAyah >= 0) {
      const resumed = await AudioPlayer.resume();
      if (resumed) { setIsPlaying(true); return; }
    }
    await startPlaybackFromIndex(0);
  }, [isPlaying, currentPlayingAyah, startPlaybackFromIndex]);

  const playFromAyah = useCallback(async (index) => {
    if (isPlaying && currentPlayingAyah === index) { await AudioPlayer.pause(); setIsPlaying(false); return; }
    await startPlaybackFromIndex(index);
  }, [isPlaying, currentPlayingAyah, startPlaybackFromIndex]);

  useEffect(() => {
    return () => { AudioPlayer.stop(); AudioPlayer.setOnFinish(null); };
  }, [num]);

  const scrollToCurrentAyah = useCallback(() => scrollToAyah(currentPlayingAyah), [currentPlayingAyah, scrollToAyah]);

  const highlightBg = isDark ? '#1C2D4A' : '#FFF9EF';

  // --- Render Ayah ---
  const renderAyah = ({ item, index }) => {
    const isActive = currentPlayingAyah === index;
    const isLoadingThis = audioLoading && currentPlayingAyah === index;
    const isLast = index === (ayahs?.length || 0) - 1;

    return (
      <Pressable onPress={() => playFromAyah(index)}>
        <View style={[styles.ayahContainer, isActive && { backgroundColor: highlightBg }]}>
          {/* Aya label chip + play button row */}
          <View style={styles.ayahTopRow}>
            <View style={[styles.ayaChip, { backgroundColor: t.text + '10' }]}>
              <Text style={{ fontSize: FontSize.xs, color: t.textDim }}>Aya {num}:{item.numberInSurah}</Text>
            </View>
            <View style={[styles.ayahPlayBtn, { borderColor: isActive ? t.accent + '66' : t.border + '44' }]}>
              {isLoadingThis ? (
                <ActivityIndicator size={12} color={t.accent} />
              ) : (
                <Text style={{ fontSize: 13, color: isActive ? t.accent : t.textDim }}>
                  {isActive && isPlaying ? '⏸' : '▶'}
                </Text>
              )}
            </View>
          </View>

          {/* Arabic text with ornament */}
          {arabicAyahs?.[index] && (() => {
            const arabicText = arabicAyahs[index].text;
            const dynamicSize = getArabicFontSize(arabicText);
            return (
              <View style={styles.arabicRow}>
                <Text style={[styles.arabicText, { color: t.text, fontFamily: ARABIC_FONT, fontSize: dynamicSize, lineHeight: dynamicSize * 2.2 }]}>
                  {arabicText}
                </Text>
                <View style={{ marginLeft: Spacing.sm }}>
                  <AyahOrnament number={toArabicNumerals(item.numberInSurah)} color={t.accent} />
                </View>
              </View>
            );
          })()}

          {/* Transliteration */}
          {translitAyahs?.[index] && (
            <Text style={[styles.translitText, { color: t.accent }]}>
              {translitAyahs[index].text}
            </Text>
          )}

          {/* Primary translation */}
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

          {/* Separator line */}
          {!isLast && <View style={[styles.separator, { backgroundColor: t.border + '26' }]} />}
        </View>
      </Pressable>
    );
  };

  // --- Lang picker ---
  const LangChip = ({ label, langObj, slot }) => (
    <Pressable
      style={[styles.langChip, { borderColor: t.accent + '55', backgroundColor: t.accent + '10' }]}
      onPress={() => setShowLangPicker(showLangPicker === slot ? null : slot)}
    >
      <Text style={{ fontSize: FontSize.xs, color: t.textDim }}>{label}:</Text>
      <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: t.accent, marginLeft: Spacing.xs }}>{langObj?.label || 'Keine'}</Text>
    </Pressable>
  );

  const LangOptions = ({ slot }) => (
    <View style={[styles.langOptions, { backgroundColor: t.card, borderColor: t.border }]}>
      {QURAN_LANGUAGES.map((l) => {
        const active = slot === '1' ? l.code === lang : l.code === lang2;
        return (
          <Pressable key={l.code} style={[styles.langOption, active && { backgroundColor: t.accent + '18' }]}
            onPress={() => { slot === '1' ? setQuranLanguage(l.code) : setQuranSecondLanguage(l.code); setShowLangPicker(null); }}>
            <Text style={{ fontSize: FontSize.sm, color: active ? t.accent : t.text, fontWeight: active ? '700' : '400' }}>{l.label}</Text>
          </Pressable>
        );
      })}
      {slot === '2' && (
        <Pressable style={[styles.langOption, !lang2 && { backgroundColor: t.accent + '18' }]}
          onPress={() => { setQuranSecondLanguage(''); setShowLangPicker(null); }}>
          <Text style={{ fontSize: FontSize.sm, color: !lang2 ? t.accent : t.textDim }}>Keine</Text>
        </Pressable>
      )}
    </View>
  );

  // --- Header ---
  const Header = () => (
    <View>
      {/* Surah Banner */}
      <SurahBanner
        name={meta?.name}
        englishName={meta?.englishName}
        translation={meta?.englishTranslation}
        ayahCount={meta?.numberOfAyahs}
        revelationType={meta?.revelationType}
      />

      {cached1 && (
        <View style={[styles.offlineBadge, { backgroundColor: '#4CAF5020', borderColor: '#4CAF5040' }]}>
          <Text style={{ fontSize: FontSize.xs, color: '#4CAF50', fontWeight: '600' }}>✓ Offline verfügbar</Text>
        </View>
      )}

      {/* Play button */}
      <Pressable onPress={playFromStart} disabled={audioLoading && currentPlayingAyah === 0}
        style={({ pressed }) => [styles.headerPlayRow, { opacity: pressed ? 0.7 : 1 }]}>
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

      {/* Language chips */}
      <View style={styles.langRow}>
        <LangChip label="Sprache 1" langObj={langMeta} slot="1" />
        <LangChip label="Sprache 2" langObj={lang2Meta} slot="2" />
      </View>
      {showLangPicker && <LangOptions slot={showLangPicker} />}

      {/* Nav */}
      <View style={styles.headerNav}>
        <TouchableOpacity onPress={() => goToSurah(num - 1)} disabled={!prevMeta} style={[styles.navTouch, { opacity: prevMeta ? 1 : 0.3 }]}>
          <Text style={{ fontSize: FontSize.sm, color: t.accent }}>← {prevMeta?.englishName || ''}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => goToSurah(num + 1)} disabled={!nextMeta} style={[styles.navTouch, { opacity: nextMeta ? 1 : 0.3 }]}>
          <Text style={{ fontSize: FontSize.sm, color: t.accent }}>{nextMeta?.englishName || ''} →</Text>
        </TouchableOpacity>
      </View>

      {/* Bismillah — shown decoratively when stripped from ayah 1 */}
      {showBismillah && (
        <View style={styles.bismillahWrap}>
          <Text style={[styles.bismillahText, { color: t.accentLight, fontFamily: ARABIC_FONT }]}>
            {BISMILLAH_PREFIX}
          </Text>
        </View>
      )}
    </View>
  );

  const Footer = () => (
    <View style={styles.footerNav}>
      <TouchableOpacity onPress={() => goToSurah(num - 1)} disabled={!prevMeta}
        style={[styles.navBtn, { borderColor: t.accent + '44' }, !prevMeta && { opacity: 0.3 }]}>
        <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: t.accent }}>← Vorherige Sure</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => goToSurah(num + 1)} disabled={!nextMeta}
        style={[styles.navBtn, { borderColor: t.accent + '44' }, !nextMeta && { opacity: 0.3 }]}>
        <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: t.accent }}>Nächste Sure →</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={t.accent} />
          <Text style={{ marginTop: Spacing.md, color: t.textDim }}>
            {cached1 ? 'Wird aus Cache geladen...' : 'Wird heruntergeladen...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 36, marginBottom: Spacing.md }}>⚠️</Text>
          <Text style={{ color: t.textDim }}>Fehler beim Laden. Prüfe deine Internetverbindung.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const showPlayerBar = isPlaying || currentPlayingAyah >= 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ flex: 1 }} {...panResponder.panHandlers}>
        <FlatList
          ref={flatListRef}
          data={ayahs}
          keyExtractor={(i) => String(i.numberInSurah)}
          renderItem={renderAyah}
          ListHeaderComponent={Header}
          ListFooterComponent={Footer}
          contentContainerStyle={{ padding: Spacing.lg, paddingBottom: showPlayerBar ? 110 : 100 }}
          onScrollToIndexFailed={(info) => {
            flatListRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: true });
          }}
        />

        {/* Swipe hints */}
        {swipeHint === 'prev' && prevMeta && (
          <View style={[styles.swipeHint, styles.swipeHintLeft, { backgroundColor: t.card + 'E0' }]}>
            <Text style={{ fontSize: FontSize.sm, color: t.accent }}>← {prevMeta.englishName}</Text>
          </View>
        )}
        {swipeHint === 'next' && nextMeta && (
          <View style={[styles.swipeHint, styles.swipeHintRight, { backgroundColor: t.card + 'E0' }]}>
            <Text style={{ fontSize: FontSize.sm, color: t.accent }}>{nextMeta.englishName} →</Text>
          </View>
        )}
      </View>

      {/* Floating Audio Player Bar */}
      {showPlayerBar && (
        <Pressable onPress={scrollToCurrentAyah} style={[styles.playerBar, { backgroundColor: isDark ? '#152238F2' : '#FFFFFFF2', borderColor: t.border }]}>
          <View style={{ flex: 1, marginRight: Spacing.md }}>
            <Text style={{ fontSize: FontSize.xs, color: t.textDim }} numberOfLines={1}>
              Mishary Rashid Alafasy
            </Text>
            <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: t.text, marginTop: Spacing.xs }} numberOfLines={1}>
              {meta?.englishName} · Ayah {currentPlayingAyah >= 0 ? currentPlayingAyah + 1 : '-'}/{ayahs?.length}
            </Text>
          </View>
          <Pressable onPress={(e) => { e.stopPropagation?.(); toggleAudio(); }}
            style={[styles.playerPlayBtn, { backgroundColor: t.accent }]}>
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
  // --- Ayah styles ---
  ayahContainer: {
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.xs,
  },
  ayahTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  ayaChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xl,
  },
  ayahPlayBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  arabicRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  arabicText: {
    textAlign: 'right',
    flex: 1,
    letterSpacing: 0.5,
    paddingHorizontal: Spacing.sm,
  },
  translitText: {
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 24,
    textAlign: 'right',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  translationText: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 24,
    textAlign: 'right',
    marginTop: Spacing.sm,
  },
  secondLangText: {
    fontSize: FontSize.sm,
    fontStyle: 'italic',
    lineHeight: 22,
    textAlign: 'right',
    marginTop: Spacing.sm,
  },
  separator: {
    height: 1,
    marginTop: Spacing.xl,
    marginHorizontal: Spacing.xxl,
  },

  // --- Bismillah ---
  bismillahWrap: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  bismillahText: {
    fontSize: 30,
    textAlign: 'center',
    lineHeight: 60,
    fontFamily: Platform.OS === 'ios' ? 'Al Nile' : 'serif',
  },

  // --- Header controls ---
  headerPlayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
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
  offlineBadge: {
    alignSelf: 'center',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  langRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md, alignSelf: 'center' },
  langChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm, borderWidth: 1, minHeight: 44 },
  langOptions: { width: '100%', borderRadius: BorderRadius.md, borderWidth: 1, padding: Spacing.sm, marginTop: Spacing.sm },
  langOption: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.sm, minHeight: 44, justifyContent: 'center' },
  headerNav: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: Spacing.md, paddingHorizontal: Spacing.xs },
  navTouch: { minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.sm },
  footerNav: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xl },
  navBtn: { flex: 1, paddingVertical: Spacing.lg, borderRadius: BorderRadius.md, borderWidth: 1.5, alignItems: 'center', minHeight: 44 },

  // --- Swipe hints ---
  swipeHint: {
    position: 'absolute',
    top: '45%',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  swipeHintLeft: { left: Spacing.sm },
  swipeHintRight: { right: Spacing.sm },

  // --- Player bar ---
  playerBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
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
