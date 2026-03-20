import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable, Platform, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '../../hooks/useAppStore';
import { DarkTheme, LightTheme, Spacing, FontSize, BorderRadius, Colors } from '../../constants/theme';
import { SURAH_LIST, QURAN_LANGUAGES, toArabicNumerals } from '../../features/quran/surahData';
import { getSurah, saveSurah, isSurahCached } from '../../lib/database';
import * as AudioPlayer from '../../features/quran/audioPlayer';
import { Ionicons } from '@expo/vector-icons';
import AyahOrnament from '../../components/ui/AyahOrnament';
import SurahBanner from '../../components/ui/SurahBanner';
import ShareButton from '../../components/ui/ShareButton';


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
  const [showPicker, setShowPicker] = useState(false);
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

  // Swipe navigation refs
  const swipeStartX = useRef(0);
  const swipeStartY = useRef(0);
  const swipeDecided = useRef(false);
  const swipeIsHorizontal = useRef(false);

  const langMeta = QURAN_LANGUAGES.find(l => l.code === lang);
  const lang2Meta = lang2 ? QURAN_LANGUAGES.find(l => l.code === lang2) : null;
  const ed = langMeta?.edition || 'quran-uthmani';
  const ed2 = lang2 ? lang2Meta?.edition : null;
  const meta = SURAH_LIST[num - 1];
  const prevMeta = num > 1 ? SURAH_LIST[num - 2] : null;
  const nextMeta = num < 114 ? SURAH_LIST[num] : null;
  const isAr = lang === 'ar';

  const goToSurah = (n) => router.replace(`/quran/${n}`);

  // Set dynamic header title with tappable dropdown trigger
  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <Pressable
          onPress={() => setShowPicker(true)}
          style={{ flexDirection: 'row', alignItems: 'center' }}
        >
          <Text style={{ fontSize: 17, fontWeight: '600', color: isDark ? '#E8E0D4' : '#1A1A2E' }}>
            {meta?.englishName || 'Quran'}
          </Text>
          <Text style={{ fontSize: 12, marginLeft: 6, color: isDark ? '#E8E0D4' : '#1A1A2E' }}>▼</Text>
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

  const { data: result1, isLoading, error, refetch } = useQuery({
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

  const stopAudio = useCallback(async () => {
    await AudioPlayer.stop();
    setIsPlaying(false);
    playingRef.current = false;
    setCurrentPlayingAyah(-1);
    currentIndexRef.current = -1;
    setAudioLoading(false);
  }, []);

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
          {/* Aya label chip + share/play button row */}
          <View style={styles.ayahTopRow}>
            <View style={[styles.ayaChip, { backgroundColor: t.text + '10' }]}>
              <Text style={{ fontSize: FontSize.xs, color: t.textDim }}>Aya {num}:{item.numberInSurah}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ShareButton
                type="ayah"
                arabic={arabicText || ''}
                translation={!isAr ? item.text : ''}
                reference={`Quran ${num}:${item.numberInSurah}`}
                t={t}
              />
              <Pressable onPress={() => playFromAyah(index)} style={[styles.ayahPlayBtn, { borderColor: isActive ? t.accent + '66' : t.border + '44' }]}>
                {isLoadingThis ? (
                  <ActivityIndicator size={12} color={t.accent} />
                ) : (
                  <Ionicons name={isActive && isPlaying ? 'pause' : 'play'} size={13} color={isActive ? '#B8860B' : '#8B9BB4'} />
                )}
              </Pressable>
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
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={24} color="#fff" style={{ marginLeft: isPlaying ? 0 : 2 }} />
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
        <Pressable onPress={() => goToSurah(num - 1)} disabled={!prevMeta} style={[styles.navTouch, { opacity: prevMeta ? 1 : 0.3 }]}>
          <Text style={{ fontSize: FontSize.sm, color: t.accent }}>← {prevMeta?.englishName || ''}</Text>
        </Pressable>
        <Pressable onPress={() => goToSurah(num + 1)} disabled={!nextMeta} style={[styles.navTouch, { opacity: nextMeta ? 1 : 0.3 }]}>
          <Text style={{ fontSize: FontSize.sm, color: t.accent }}>{nextMeta?.englishName || ''} →</Text>
        </Pressable>
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
      <Pressable onPress={() => goToSurah(num - 1)} disabled={!prevMeta}
        style={[styles.navBtn, { borderColor: t.accent + '44' }, !prevMeta && { opacity: 0.3 }]}>
        <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: t.accent }}>← Vorherige Sure</Text>
      </Pressable>
      <Pressable onPress={() => goToSurah(num + 1)} disabled={!nextMeta}
        style={[styles.navBtn, { borderColor: t.accent + '44' }, !nextMeta && { opacity: 0.3 }]}>
        <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: t.accent }}>Nächste Sure →</Text>
      </Pressable>
    </View>
  );

  const showPlayer = isPlaying || currentPlayingAyah >= 0;

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <ActivityIndicator size="large" color={t.accent} />
          <Text style={{ marginTop: Spacing.md, color: t.textDim, textAlign: 'center' }}>
            {cached1 ? 'Wird aus Cache geladen...' : 'Sure wird geladen...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ fontSize: 48, marginBottom: Spacing.md }}>📖</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: t.text, textAlign: 'center', marginBottom: 8 }}>
            Sure konnte nicht geladen werden
          </Text>
          <Text style={{ fontSize: 14, color: t.textDim, textAlign: 'center', marginBottom: 24, lineHeight: 22 }}>
            Bitte prüfe deine Internetverbindung und versuche es erneut.
          </Text>
          <Pressable
            onPress={() => refetch()}
            style={{ backgroundColor: t.accent, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12 }}
          >
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#0A1628' }}>Erneut versuchen</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <View
        style={{ flex: 1, backgroundColor: t.bg }}
        onTouchStart={(e) => {
          swipeStartX.current = e.nativeEvent.pageX;
          swipeStartY.current = e.nativeEvent.pageY;
          swipeDecided.current = false;
          swipeIsHorizontal.current = false;
        }}
        onTouchMove={(e) => {
          if (swipeDecided.current) return;
          const dx = e.nativeEvent.pageX - swipeStartX.current;
          const dy = e.nativeEvent.pageY - swipeStartY.current;
          if (Math.abs(dx) > 25 || Math.abs(dy) > 25) {
            swipeDecided.current = true;
            swipeIsHorizontal.current = Math.abs(dx) > Math.abs(dy) * 2;
          }
        }}
        onTouchEnd={(e) => {
          if (!swipeIsHorizontal.current) return;
          const dx = e.nativeEvent.pageX - swipeStartX.current;
          if (dx < -100 && num < 114) {
            router.replace('/quran/' + (num + 1));
          } else if (dx > 100 && num > 1) {
            router.replace('/quran/' + (num - 1));
          }
        }}
      >
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
          style={{ backgroundColor: t.bg }}
          contentContainerStyle={{ padding: Spacing.lg, paddingBottom: showPlayer ? 90 : 16 }}
          onScrollToIndexFailed={handleScrollFail}
        />
      </View>

      {/* Surah Picker Modal */}
      {showPicker && (
        <Modal visible={true} transparent animationType="slide" onRequestClose={() => setShowPicker(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
            <Pressable style={{ flex: 1 }} onPress={() => setShowPicker(false)} />
            <View style={{ maxHeight: '70%', backgroundColor: isDark ? '#0F1F38' : '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 }}>
              <View style={{ alignItems: 'center', paddingVertical: 12 }}>
                <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: isDark ? '#1A3055' : '#E0DCD4' }} />
              </View>
              <Text style={{ fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 12, color: isDark ? '#E8E0D4' : '#1A1A2E' }}>Sure auswählen</Text>
              <FlatList
                data={SURAH_LIST}
                keyExtractor={(item) => String(item.number)}
                initialScrollIndex={Math.max(0, num - 3)}
                getItemLayout={(data, index) => ({ length: 56, offset: 56 * index, index })}
                onScrollToIndexFailed={() => {}}
                renderItem={({ item }) => {
                  const isActive = item.number === num;
                  return (
                    <Pressable
                      onPress={() => {
                        setShowPicker(false);
                        if (item.number !== num) {
                          router.replace('/quran/' + item.number);
                        }
                      }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        height: 56,
                        paddingHorizontal: 16,
                        backgroundColor: isActive ? '#B8860B22' : 'transparent',
                      }}
                    >
                      <Text style={{ width: 36, fontSize: 14, color: isActive ? '#B8860B' : (isDark ? '#8B9BB4' : '#666'), textAlign: 'center' }}>{item.number}</Text>
                      <Text style={{ flex: 1, fontSize: 20, color: isActive ? '#B8860B' : (isDark ? '#E8E0D4' : '#1A1A2E'), textAlign: 'center' }}>{item.name}</Text>
                      <View style={{ width: 120 }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: isActive ? '#B8860B' : (isDark ? '#E8E0D4' : '#1A1A2E') }}>{item.englishName}</Text>
                        <Text style={{ fontSize: 10, color: isDark ? '#8B9BB4' : '#666', marginTop: 1 }}>{item.englishTranslation}</Text>
                      </View>
                    </Pressable>
                  );
                }}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Audio error toast */}
      {audioError && !isPlaying && (
        <View style={{ position: 'absolute', bottom: showPlayer ? 80 : 16, left: 16, right: 16, backgroundColor: '#E6510020', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E6510040' }}>
          <Text style={{ fontSize: 13, color: '#E65100', textAlign: 'center' }}>Audio nicht verfügbar — Quran-Text bleibt nutzbar</Text>
        </View>
      )}

      {/* Floating Mini Player */}
      {showPlayer && (
        <View style={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          right: 16,
          backgroundColor: isDark ? '#152238' : '#FFFFFF',
          borderRadius: 16,
          paddingVertical: 12,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.25, shadowRadius: 8 },
            android: { elevation: 8 },
          }),
          borderWidth: 1,
          borderColor: isDark ? '#1A3055' : '#E0DCD4',
        }}>
          <Pressable onPress={scrollToCurrentAyah} style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, color: t.textDim }} numberOfLines={1}>Mishary Rashid Alafasy</Text>
            <Text style={{ fontSize: 14, fontWeight: '600', color: t.text, marginTop: 2 }} numberOfLines={1}>
              {meta?.englishName} — Ayah {currentPlayingAyah >= 0 ? currentPlayingAyah + 1 : '-'}
            </Text>
          </Pressable>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Pressable onPress={toggleAudio} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#B8860B', alignItems: 'center', justifyContent: 'center' }}>
              {audioLoading ? (
                <ActivityIndicator size="small" color="#0A1628" />
              ) : (
                <Ionicons name={isPlaying ? 'pause' : 'play'} size={22} color="#0A1628" />
              )}
            </Pressable>
            <Pressable onPress={stopAudio} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="close" size={20} color={t.textDim} />
            </Pressable>
          </View>
        </View>
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

});
