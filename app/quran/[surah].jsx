import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, ActivityIndicator, TouchableOpacity, Pressable, Platform, Alert, Dimensions, Animated } from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '../../hooks/useAppStore';
import { DarkTheme, LightTheme, Spacing, FontSize, BorderRadius, Colors } from '../../constants/theme';
import { SURAH_LIST, QURAN_LANGUAGES, toArabicNumerals } from '../../features/quran/surahData';
import { getSurah, saveSurah, isSurahCached } from '../../lib/database';
import * as AudioPlayer from '../../features/quran/audioPlayer';
import AyahOrnament from '../../components/ui/AyahOrnament';
import SurahBanner from '../../components/ui/SurahBanner';
import SurahPicker from '../../components/ui/SurahPicker';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 100;
const SWIPE_ANGLE_LOCK = 20; // px before deciding horizontal vs vertical

const ARABIC_FONT = 'ScheherazadeNew';
const ARABIC_FONT_FALLBACK = Platform.OS === 'ios' ? 'Al Nile' : 'serif';
const BISMILLAH_DISPLAY = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';
const BISMILLAH_BASE = 'بسم الله الرحمن الرحيم';

// Strip Arabic diacritical marks (tashkeel, small letters, tatweel)
function isDiacritic(ch) {
  const c = ch.charCodeAt(0);
  return (c >= 0x064B && c <= 0x065F) || c === 0x0670 ||
    (c >= 0x06D6 && c <= 0x06DC) || (c >= 0x06DF && c <= 0x06E4) ||
    c === 0x06E7 || c === 0x06E8 || (c >= 0x06EA && c <= 0x06ED) || c === 0x0640;
}

function stripDiacritics(text) {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (isDiacritic(ch)) continue;
    result += ch === 'ٱ' ? 'ا' : ch;
  }
  return result;
}

function cleanBismillah(ayahs, surahNumber) {
  if (!ayahs || ayahs.length === 0) return { showBismillah: false, ayahs: ayahs || [] };

  // Surah 1 (Al-Fatiha): Bismillah IS verse 1 — return unchanged
  if (surahNumber === 1) return { showBismillah: false, ayahs };

  // Surah 9 (At-Tawbah): No bismillah at all
  if (surahNumber === 9) return { showBismillah: false, ayahs };

  // All other surahs: strip bismillah from first ayah text
  const modifiedAyahs = [...ayahs];
  const originalText = modifiedAyahs[0]?.text || '';
  const stripped = stripDiacritics(originalText);

  if (!stripped.startsWith(BISMILLAH_BASE)) {
    // No bismillah found in text — still show decorative header
    return { showBismillah: true, ayahs: modifiedAyahs };
  }

  // Map stripped position back to original text to find cut point
  let baseCount = 0;
  let cutPos = originalText.length;
  for (let i = 0; i < originalText.length; i++) {
    if (!isDiacritic(originalText[i])) {
      baseCount++;
    }
    if (baseCount >= BISMILLAH_BASE.length) {
      cutPos = i + 1;
      break;
    }
  }

  const remaining = originalText.slice(cutPos).trim();
  if (remaining.length > 0) {
    modifiedAyahs[0] = { ...modifiedAyahs[0], text: remaining };
  }

  return { showBismillah: true, ayahs: modifiedAyahs };
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
  const navigation = useNavigation();
  const num = parseInt(surah, 10);
  const isDark = useAppStore((s) => s.theme === 'dark');
  const lang = useAppStore((s) => s.quranLanguage);
  const lang2 = useAppStore((s) => s.quranSecondLanguage);
  const setQuranLanguage = useAppStore((s) => s.setQuranLanguage);
  const setQuranSecondLanguage = useAppStore((s) => s.setQuranSecondLanguage);
  const setLastRead = useAppStore((s) => s.setLastRead);
  const t = isDark ? DarkTheme : LightTheme;

  const [showLangPicker, setShowLangPicker] = useState(null);
  const [showSurahPicker, setShowSurahPicker] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [currentPlayingAyah, setCurrentPlayingAyah] = useState(-1);
  const [audioError, setAudioError] = useState(false);
  const flatListRef = useRef(null);
  const currentIndexRef = useRef(-1);
  const ayahsRef = useRef(null);
  const arabicAyahsRef = useRef(null);
  const translitAyahsRef = useRef(null);
  const ayahs2Ref = useRef(null);
  const playingRef = useRef(false);

  // Swipe navigation state (touch-based with Animated feedback)
  const [swipeHint, setSwipeHint] = useState(null);
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  const swipeLockedRef = useRef(null); // null | 'horizontal' | 'vertical'
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

  // Set dynamic header title with tappable SurahPicker trigger
  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <Pressable
          onPress={() => setShowSurahPicker(true)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
        >
          <Text style={{ fontSize: 17, fontWeight: '600', color: isDark ? '#E8E0D4' : '#1A1A2E' }}>
            {meta?.englishName || 'Quran'}
          </Text>
          <Text style={{ fontSize: 12, color: isDark ? '#E8E0D4' : '#1A1A2E' }}>▾</Text>
        </Pressable>
      ),
      headerBackTitle: 'Quran',
    });
  }, [meta, isDark, navigation]);

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

  // Clean bismillah — memoized to avoid recalculating every render
  const { showBismillah, ayahs: cleanedAyahs } = useMemo(() => cleanBismillah(rawAyahs, num), [rawAyahs, num]);
  const { ayahs: arabicAyahs } = useMemo(() => cleanBismillah(rawArabicAyahs, num), [rawArabicAyahs, num]);
  const { ayahs: translitAyahs } = useMemo(() => cleanBismillah(rawTranslitAyahs, num), [rawTranslitAyahs, num]);
  const { ayahs: ayahs2 } = useMemo(() => cleanBismillah(rawAyahs2, num), [rawAyahs2, num]);

  const ayahs = cleanedAyahs;

  // Keep refs in sync so callbacks always read current data
  ayahsRef.current = ayahs;
  arabicAyahsRef.current = arabicAyahs;
  translitAyahsRef.current = translitAyahs;
  ayahs2Ref.current = ayahs2;

  useEffect(() => {
    if (ayahs) { setLastRead(num, 1); setCached1(true); }
  }, [ayahs]);
  useEffect(() => { if (ayahs2) setCached2(true); }, [ayahs2]);

  // --- Touch-based Swipe Navigation with Animated feedback ---
  const handleTouchStart = useCallback((e) => {
    touchStartRef.current = {
      x: e.nativeEvent.pageX,
      y: e.nativeEvent.pageY,
      time: Date.now(),
    };
    swipeLockedRef.current = null;
  }, []);

  const handleTouchMove = useCallback((e) => {
    const dx = e.nativeEvent.pageX - touchStartRef.current.x;
    const dy = e.nativeEvent.pageY - touchStartRef.current.y;

    // Decide direction lock after minimum movement
    if (swipeLockedRef.current === null) {
      if (Math.abs(dx) > SWIPE_ANGLE_LOCK || Math.abs(dy) > SWIPE_ANGLE_LOCK) {
        // Only lock horizontal if clearly horizontal
        if (Math.abs(dx) > Math.abs(dy)) {
          swipeLockedRef.current = 'horizontal';
        } else {
          swipeLockedRef.current = 'vertical';
        }
      }
      return;
    }

    if (swipeLockedRef.current !== 'horizontal') return;

    // Update animated value for visual feedback
    swipeAnim.setValue(dx);

    // Swipe left (dx < 0) → next surah; Swipe right (dx > 0) → prev surah
    if (dx < -40 && nextMeta) setSwipeHint('next');
    else if (dx > 40 && prevMeta) setSwipeHint('prev');
    else setSwipeHint(null);
  }, [prevMeta, nextMeta, swipeAnim]);

  const handleTouchEnd = useCallback((e) => {
    if (swipeLockedRef.current !== 'horizontal') {
      setSwipeHint(null);
      return;
    }

    const dx = e.nativeEvent.pageX - touchStartRef.current.x;

    // Swipe left → next surah (like turning a page forward)
    if (dx < -SWIPE_THRESHOLD && num < 114) {
      Animated.timing(swipeAnim, { toValue: -400, duration: 200, useNativeDriver: true }).start(() => {
        goToSurah(num + 1);
        swipeAnim.setValue(0);
      });
    // Swipe right → previous surah
    } else if (dx > SWIPE_THRESHOLD && num > 1) {
      Animated.timing(swipeAnim, { toValue: 400, duration: 200, useNativeDriver: true }).start(() => {
        goToSurah(num - 1);
        swipeAnim.setValue(0);
      });
    } else {
      // Snap back
      Animated.spring(swipeAnim, { toValue: 0, useNativeDriver: true }).start();
    }

    setSwipeHint(null);
    swipeLockedRef.current = null;
  }, [num, swipeAnim]);

  // --- Audio ---
  const scrollToAyah = useCallback((index) => {
    if (flatListRef.current && index >= 0) {
      try { flatListRef.current.scrollToIndex({ index, animated: true, viewPosition: 0.3 }); } catch {}
    }
  }, []);

  // onFinish reads from refs to avoid stale closure over ayahs
  const playNextAyah = useCallback(async () => {
    const currentAyahs = ayahsRef.current;
    const nextIdx = currentIndexRef.current + 1;

    if (!currentAyahs || nextIdx >= currentAyahs.length) {
      // End of surah
      setIsPlaying(false);
      playingRef.current = false;
      setCurrentPlayingAyah(-1);
      currentIndexRef.current = -1;
      setAudioLoading(false);
      return;
    }

    currentIndexRef.current = nextIdx;
    setCurrentPlayingAyah(nextIdx);
    scrollToAyah(nextIdx);

    const nextGlobalNum = currentAyahs[nextIdx].number;
    console.log('[SurahDetail] Auto-advancing to ayah index', nextIdx, 'global:', nextGlobalNum);

    if (!nextGlobalNum) {
      console.error('[SurahDetail] Missing global number for ayah index', nextIdx);
      setIsPlaying(false);
      playingRef.current = false;
      setCurrentPlayingAyah(-1);
      currentIndexRef.current = -1;
      setAudioError(true);
      return;
    }

    try {
      await AudioPlayer.playAyah(nextGlobalNum);
    } catch (err) {
      console.error('[SurahDetail] Error playing next ayah:', err);
      // On error, try to skip to the next one
      playNextAyah();
    }
  }, [scrollToAyah]);

  // Set the onFinish callback once and keep it stable
  useEffect(() => {
    AudioPlayer.setOnFinish(() => {
      if (playingRef.current) {
        playNextAyah();
      }
    });
    return () => {
      AudioPlayer.stop();
      AudioPlayer.setOnFinish(null);
      playingRef.current = false;
    };
  }, [num, playNextAyah]);

  const startPlaybackFromIndex = useCallback(async (index) => {
    const currentAyahs = ayahsRef.current;
    if (!currentAyahs || index < 0 || index >= currentAyahs.length) return;
    setAudioError(false);
    currentIndexRef.current = index;

    try {
      setAudioLoading(true);
      setCurrentPlayingAyah(index);
      setIsPlaying(true);
      playingRef.current = true;
      scrollToAyah(index);
      const globalNum = currentAyahs[index].number;
      if (!globalNum) throw new Error(`Ayah ${index + 1} hat keine globale Nummer.`);
      console.log('[SurahDetail] Starting playback at index', index, 'global:', globalNum);
      await AudioPlayer.initAudioMode();
      await AudioPlayer.playAyah(globalNum);
      setAudioLoading(false);
    } catch (err) {
      console.error('[SurahDetail] Audio error:', err);
      setAudioLoading(false);
      setIsPlaying(false);
      playingRef.current = false;
      setCurrentPlayingAyah(-1);
      currentIndexRef.current = -1;
      setAudioError(true);
      Alert.alert('Audio-Fehler', err?.message || 'Unbekannter Fehler.');
    }
  }, [scrollToAyah]);

  const toggleAudio = useCallback(async () => {
    if (isPlaying) {
      await AudioPlayer.pause();
      setIsPlaying(false);
      playingRef.current = false;
      return;
    }
    if (currentPlayingAyah >= 0) {
      const resumed = await AudioPlayer.resume();
      if (resumed) {
        setIsPlaying(true);
        playingRef.current = true;
        return;
      }
    }
    await startPlaybackFromIndex(currentPlayingAyah >= 0 ? currentPlayingAyah : 0);
  }, [isPlaying, currentPlayingAyah, startPlaybackFromIndex]);

  const playFromStart = useCallback(async () => {
    if (isPlaying) {
      await AudioPlayer.pause();
      setIsPlaying(false);
      playingRef.current = false;
      return;
    }
    if (currentPlayingAyah >= 0) {
      const resumed = await AudioPlayer.resume();
      if (resumed) {
        setIsPlaying(true);
        playingRef.current = true;
        return;
      }
    }
    await startPlaybackFromIndex(0);
  }, [isPlaying, currentPlayingAyah, startPlaybackFromIndex]);

  const playFromAyah = useCallback(async (index) => {
    if (isPlaying && currentPlayingAyah === index) {
      await AudioPlayer.pause();
      setIsPlaying(false);
      playingRef.current = false;
      return;
    }
    await startPlaybackFromIndex(index);
  }, [isPlaying, currentPlayingAyah, startPlaybackFromIndex]);

  const scrollToCurrentAyah = useCallback(() => scrollToAyah(currentPlayingAyah), [currentPlayingAyah, scrollToAyah]);

  const keyExtractor = useCallback((i) => String(i.numberInSurah), []);
  const handleScrollFail = useCallback((info) => {
    flatListRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: true });
  }, []);

  const highlightBg = isDark ? '#1C2D4A' : '#FFF9EF';

  // --- Render Ayah (memoized) ---
  const totalAyahs = ayahs?.length || 0;
  const renderAyah = useCallback(({ item, index }) => {
    const curArabic = arabicAyahsRef.current;
    const curTranslit = translitAyahsRef.current;
    const curAyahs2 = ayahs2Ref.current;
    const isActive = currentPlayingAyah === index;
    const isLoadingThis = audioLoading && currentPlayingAyah === index;
    const isLast = index === totalAyahs - 1;

    const arabicText = curArabic?.[index]?.text;
    const dynamicSize = arabicText ? getArabicFontSize(arabicText) : 26;

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
          {arabicText && (
            <View style={styles.arabicRow}>
              <Text style={[styles.arabicText, { color: t.text, fontFamily: ARABIC_FONT, fontSize: dynamicSize, lineHeight: dynamicSize * 2.2 }]}>
                {arabicText}
              </Text>
              <View style={{ marginLeft: Spacing.sm }}>
                <AyahOrnament number={toArabicNumerals(item.numberInSurah)} color={t.accent} />
              </View>
            </View>
          )}

          {/* Transliteration */}
          {curTranslit?.[index] && (
            <Text style={[styles.translitText, { color: t.accent }]}>
              {curTranslit[index].text}
            </Text>
          )}

          {/* Primary translation */}
          {!isAr && (
            <Text style={[styles.translationText, { color: t.text }]}>
              {item.text}
            </Text>
          )}

          {/* Second language */}
          {curAyahs2?.[index] && (
            <Text style={[styles.secondLangText, { color: t.textDim }]}>
              {curAyahs2[index].text}
            </Text>
          )}

          {/* Separator line */}
          {!isLast && <View style={[styles.separator, { backgroundColor: t.border + '26' }]} />}
        </View>
      </Pressable>
    );
  }, [currentPlayingAyah, audioLoading, isPlaying, totalAyahs, num, isAr, t, highlightBg, playFromAyah]);

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
      {/* Surah Banner with calligraphy */}
      <SurahBanner
        name={meta?.name}
        englishName={meta?.englishName}
        translation={meta?.englishTranslation}
        ayahCount={meta?.numberOfAyahs}
        revelationType={meta?.revelationType}
        surahNumber={num}
        isDark={isDark}
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
            {BISMILLAH_DISPLAY}
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

  const swipeOpacity = swipeAnim.interpolate({
    inputRange: [-500, 0, 500],
    outputRange: [0.4, 1, 0.4],
    extrapolate: 'clamp',
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <View
        style={{ flex: 1 }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <Animated.View style={{ flex: 1, transform: [{ translateX: swipeAnim }], opacity: swipeOpacity }}>
        <FlatList
          ref={flatListRef}
          data={ayahs}
          keyExtractor={keyExtractor}
          renderItem={renderAyah}
          extraData={currentPlayingAyah}
          ListHeaderComponent={Header}
          ListFooterComponent={Footer}
          initialNumToRender={10}
          maxToRenderPerBatch={5}
          windowSize={5}
          removeClippedSubviews={true}
          contentContainerStyle={{ padding: Spacing.lg, paddingBottom: showPlayerBar ? 110 : 100 }}
          onScrollToIndexFailed={handleScrollFail}
        />
        </Animated.View>

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

      {/* Surah Picker Modal */}
      <SurahPicker
        visible={showSurahPicker}
        onClose={() => setShowSurahPicker(false)}
        currentSurah={num}
      />

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
