import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, ActivityIndicator, TouchableOpacity, Pressable, Platform, Alert, Modal, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '../../hooks/useAppStore';
import { DarkTheme, LightTheme, Spacing, FontSize, BorderRadius, Colors } from '../../constants/theme';
import { SURAH_LIST, QURAN_LANGUAGES, toArabicNumerals } from '../../features/quran/surahData';
import { getSurah, saveSurah, isSurahCached } from '../../lib/database';
import * as AudioPlayer from '../../features/quran/audioPlayer';
import AyahOrnament from '../../components/ui/AyahOrnament';
import SurahBanner from '../../components/ui/SurahBanner';
import { FONTS, getArabicDisplayFont } from '../../lib/fonts';

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
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState('');
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

  // Simple swipe navigation refs
  const touchStart = useRef({ x: 0, y: 0 });
  const isHorizontal = useRef(false);
  const hasMoved = useRef(false);

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
          onPress={() => setShowDropdown(true)}
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

  // --- Simple swipe navigation ---
  const handleTouchStart = useCallback((e) => {
    touchStart.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
    isHorizontal.current = false;
    hasMoved.current = false;
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (hasMoved.current) return;
    const dx = e.nativeEvent.pageX - touchStart.current.x;
    const dy = e.nativeEvent.pageY - touchStart.current.y;
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      isHorizontal.current = Math.abs(dx) > Math.abs(dy);
    }
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (!isHorizontal.current || hasMoved.current) return;
    const dx = e.nativeEvent.pageX - touchStart.current.x;
    if (dx < -80 && num < 114) {
      hasMoved.current = true;
      router.replace(`/quran/${num + 1}`);
    } else if (dx > 80 && num > 1) {
      hasMoved.current = true;
      router.replace(`/quran/${num - 1}`);
    }
  }, [num, router]);

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

  const dropdownFiltered = useMemo(() => {
    if (!dropdownSearch.trim()) return SURAH_LIST;
    const q = dropdownSearch.toLowerCase();
    return SURAH_LIST.filter(s =>
      s.englishName.toLowerCase().includes(q) ||
      s.name.includes(dropdownSearch) ||
      s.englishTranslation.toLowerCase().includes(q) ||
      String(s.number) === q
    );
  }, [dropdownSearch]);

  const ITEM_HEIGHT = 72;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <View
        style={{ flex: 1 }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
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
          contentContainerStyle={{ padding: Spacing.lg, paddingBottom: showPlayerBar ? 110 : 100 }}
          onScrollToIndexFailed={handleScrollFail}
        />
      </View>

      {/* Inline Surah Dropdown Modal */}
      <Modal visible={showDropdown} transparent animationType="slide" onRequestClose={() => { setShowDropdown(false); setDropdownSearch(''); }}>
        <View style={styles.dropdownOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => { setShowDropdown(false); setDropdownSearch(''); }} />
          <View style={[styles.dropdownContainer, { backgroundColor: t.card }]}>
            <View style={styles.dropdownHandle}>
              <View style={[styles.dropdownHandleBar, { backgroundColor: t.textDim + '40' }]} />
            </View>
            <Text style={[styles.dropdownTitle, { color: t.text }]}>Sure auswählen</Text>
            <View style={[styles.dropdownSearch, { backgroundColor: t.surface, borderColor: t.border }]}>
              <Text style={{ fontSize: 14, marginRight: Spacing.sm }}>🔍</Text>
              <TextInput
                style={{ flex: 1, fontSize: FontSize.md, paddingVertical: 0, color: t.text }}
                placeholder="Suche nach Name oder Nummer..."
                placeholderTextColor={t.textDim}
                value={dropdownSearch}
                onChangeText={setDropdownSearch}
                autoCorrect={false}
              />
              {dropdownSearch.length > 0 && (
                <Pressable onPress={() => setDropdownSearch('')} hitSlop={8}>
                  <Text style={{ fontSize: 16, color: t.textDim }}>✕</Text>
                </Pressable>
              )}
            </View>
            <FlatList
              data={dropdownFiltered}
              keyExtractor={(item) => String(item.number)}
              initialScrollIndex={dropdownSearch.trim() ? 0 : Math.max(0, num - 1)}
              getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
              onScrollToIndexFailed={() => {}}
              keyboardShouldPersistTaps="handled"
              style={{ flex: 1 }}
              renderItem={({ item }) => {
                const isActive = item.number === num;
                return (
                  <Pressable
                    style={[styles.dropdownItem, { height: ITEM_HEIGHT }, isActive && { backgroundColor: t.accent + '18' }]}
                    onPress={() => {
                      setShowDropdown(false);
                      setDropdownSearch('');
                      router.replace(`/quran/${item.number}`);
                    }}
                  >
                    <Text style={[styles.dropdownNum, { color: isActive ? t.accent : t.textDim }]}>{item.number}</Text>
                    <Text
                      style={[styles.dropdownArabic, { color: isActive ? t.accent : t.text, fontFamily: FONTS.arabicText }]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    <View style={styles.dropdownRight}>
                      <Text style={[styles.dropdownEnglish, { color: isActive ? t.accent : t.text }]} numberOfLines={1}>
                        {item.englishName}
                      </Text>
                      <Text style={[styles.dropdownTranslation, { color: t.textDim }]} numberOfLines={1}>
                        {item.englishTranslation}
                      </Text>
                    </View>
                  </Pressable>
                );
              }}
            />
          </View>
        </View>
      </Modal>

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

  // --- Dropdown ---
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  dropdownContainer: {
    maxHeight: '75%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.25, shadowRadius: 16 },
      android: { elevation: 16 },
    }),
  },
  dropdownHandle: {
    alignItems: 'center',
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  dropdownHandleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  dropdownTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  dropdownSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    height: 44,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  dropdownNum: {
    fontSize: FontSize.md,
    fontWeight: '300',
    width: 36,
    textAlign: 'center',
  },
  dropdownArabic: {
    fontSize: 22,
    lineHeight: 38,
    flex: 1,
    textAlign: 'center',
  },
  dropdownRight: {
    width: 130,
    alignItems: 'flex-end',
  },
  dropdownEnglish: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  dropdownTranslation: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },

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
