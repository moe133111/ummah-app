import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import { useAppStore } from '../../hooks/useAppStore';
import { DarkTheme, LightTheme, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { MEMORIZE_VERSES, getTodayVerseIndex, getDayInCycle, getGlobalAyahNumber } from '../../features/learn/dailyVerseData';
import { SURAH_LIST } from '../../features/quran/surahData';
import { FONTS } from '../../lib/fonts';

export default function DailyVerseScreen() {
  const isDark = useAppStore((s) => s.theme === 'dark');
  const memorizedVerses = useAppStore((s) => s.memorizedVerses) || [];
  const toggleMemorizedVerse = useAppStore((s) => s.toggleMemorizedVerse);
  const t = isDark ? DarkTheme : LightTheme;

  const [dayOffset, setDayOffset] = useState(0);
  const [arabic, setArabic] = useState('');
  const [transliteration, setTransliteration] = useState('');
  const [translation, setTranslation] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hidden, setHidden] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [repeatMode, setRepeatMode] = useState(false);
  const soundRef = useRef(null);
  const playingRef = useRef(false);

  const verseIndex = getTodayVerseIndex(dayOffset);
  const verseInfo = MEMORIZE_VERSES[verseIndex];
  const dayNum = getDayInCycle(dayOffset);
  const verseRef = `${verseInfo.surah}:${verseInfo.ayah}`;
  const isMemorized = memorizedVerses.includes(verseRef);
  const surahMeta = SURAH_LIST[verseInfo.surah - 1];

  const canGoBack = dayOffset > -6;
  const canGoForward = dayOffset < 0;

  const fetchVerseData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setHidden(false);
    try {
      const [arabicRes, translitRes, translationRes] = await Promise.all([
        fetch(`https://api.alquran.cloud/v1/ayah/${verseInfo.surah}:${verseInfo.ayah}/quran-uthmani`),
        fetch(`https://api.alquran.cloud/v1/ayah/${verseInfo.surah}:${verseInfo.ayah}/en.transliteration`),
        fetch(`https://api.alquran.cloud/v1/ayah/${verseInfo.surah}:${verseInfo.ayah}/de.aburida`),
      ]);
      const [arabicData, translitData, translationData] = await Promise.all([
        arabicRes.json(),
        translitRes.json(),
        translationRes.json(),
      ]);
      setArabic(arabicData?.data?.text || '');
      setTransliteration(translitData?.data?.text || '');
      setTranslation(translationData?.data?.text || '');
    } catch (err) {
      setError('Vers konnte nicht geladen werden. Bitte prüfe deine Internetverbindung.');
    } finally {
      setLoading(false);
    }
  }, [verseInfo.surah, verseInfo.ayah]);

  useEffect(() => {
    fetchVerseData();
    return () => stopAudio();
  }, [fetchVerseData]);

  const stopAudio = async () => {
    playingRef.current = false;
    setIsPlaying(false);
    if (soundRef.current) {
      try {
        await soundRef.current.unloadAsync();
      } catch {}
      soundRef.current = null;
    }
  };

  const playOnce = async (audioUrl) => {
    const { sound } = await Audio.Sound.createAsync(
      { uri: audioUrl },
      { shouldPlay: true }
    );
    soundRef.current = sound;
    return new Promise((resolve) => {
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          sound.unloadAsync().catch(() => {});
          soundRef.current = null;
          resolve();
        }
      });
    });
  };

  const playWithRepeat = async (audioUrl, times = 3) => {
    playingRef.current = true;
    setIsPlaying(true);
    try {
      for (let i = 0; i < times; i++) {
        if (!playingRef.current) break;
        await playOnce(audioUrl);
        if (i < times - 1 && playingRef.current) {
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
    } catch (err) {
      console.warn('[DailyVerse] Audio error:', err);
    }
    playingRef.current = false;
    setIsPlaying(false);
  };

  const handlePlay = async () => {
    if (isPlaying) {
      await stopAudio();
      return;
    }
    const globalNum = getGlobalAyahNumber(verseInfo.surah, verseInfo.ayah);
    const audioUrl = `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${globalNum}.mp3`;
    if (repeatMode) {
      playWithRepeat(audioUrl, 3);
    } else {
      playWithRepeat(audioUrl, 1);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]} edges={[]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={t.accent} />
          <Text style={{ color: t.textDim, marginTop: Spacing.md, fontSize: FontSize.sm }}>Vers wird geladen...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]} edges={[]}>
        <View style={styles.centered}>
          <Text style={{ fontSize: 48, marginBottom: Spacing.md }}>📡</Text>
          <Text style={{ color: t.textDim, fontSize: FontSize.md, textAlign: 'center', paddingHorizontal: Spacing.xxl }}>{error}</Text>
          <Pressable onPress={fetchVerseData} style={[styles.retryBtn, { borderColor: t.accent }]}>
            <Text style={{ color: t.accent, fontWeight: '600' }}>Erneut versuchen</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]} edges={[]}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
        {/* Header Card */}
        <View style={[styles.card, { backgroundColor: t.card, borderColor: isMemorized ? t.accent : t.border }]}>
          <Text style={{ fontSize: FontSize.xs, color: t.textDim, textTransform: 'uppercase', letterSpacing: 1 }}>
            Vers des Tages
          </Text>
          <View style={[styles.themeBadge, { backgroundColor: t.accent + '15' }]}>
            <Text style={{ color: t.accent, fontSize: 12 }}>{verseInfo.theme}</Text>
          </View>
          <Text style={{ fontSize: FontSize.sm, color: t.textDim, marginTop: Spacing.sm }}>
            Sure {verseInfo.surah} ({surahMeta?.englishName || ''}), Vers {verseInfo.ayah}
          </Text>
          <Text style={{ fontSize: FontSize.xs, color: t.textDim, marginTop: Spacing.xs }}>
            Tag {dayNum} von {MEMORIZE_VERSES.length}
          </Text>
        </View>

        {/* Arabic Text Card */}
        <View style={[styles.card, styles.arabicCard, {
          backgroundColor: t.accent + '06',
          borderColor: isMemorized ? t.accent : t.border,
        }]}>
          {hidden ? (
            <View style={styles.hiddenOverlay}>
              <Text style={{ fontSize: 48 }}>🧠</Text>
              <Text style={{ fontSize: FontSize.md, color: t.textDim, marginTop: Spacing.md, textAlign: 'center' }}>
                Versuche den Vers aus dem Gedächtnis aufzusagen
              </Text>
              <Pressable
                onPress={() => setHidden(false)}
                style={[styles.actionBtn, { backgroundColor: t.accent + '15', marginTop: Spacing.lg }]}
              >
                <Text style={{ color: t.accent, fontWeight: '600' }}>Anzeigen</Text>
              </Pressable>
            </View>
          ) : (
            <Text style={[styles.arabicText, {
              color: t.accentLight || t.accent,
              fontFamily: FONTS.arabic || 'ScheherazadeNew',
            }]}>
              {arabic}
            </Text>
          )}
        </View>

        {/* Transliteration Card */}
        <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
          <Text style={[styles.sectionLabel, { color: t.textDim }]}>TRANSLITERATION</Text>
          <Text style={[styles.translitText, { color: t.accent }]}>{transliteration}</Text>
        </View>

        {/* Translation Card */}
        <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
          <Text style={[styles.sectionLabel, { color: t.textDim }]}>ÜBERSETZUNG</Text>
          <Text style={{ fontSize: FontSize.md, color: t.text, lineHeight: 24 }}>{translation}</Text>
        </View>

        {/* Learning Tools */}
        <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
          <Text style={[styles.sectionLabel, { color: t.textDim }]}>LERN-WERKZEUGE</Text>

          {/* Audio Play */}
          <View style={styles.toolRow}>
            <Pressable
              onPress={handlePlay}
              style={[styles.toolBtn, { backgroundColor: isPlaying ? t.accent + '20' : t.accent + '10' }]}
            >
              <Text style={{ fontSize: 18 }}>{isPlaying ? '⏹' : '🔊'}</Text>
              <Text style={{ color: t.accent, fontWeight: '600', marginLeft: Spacing.sm }}>
                {isPlaying ? 'Stoppen' : 'Anhören'}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setRepeatMode(!repeatMode)}
              style={[styles.toolBtn, {
                backgroundColor: repeatMode ? t.accent + '20' : t.accent + '10',
                borderWidth: repeatMode ? 1 : 0,
                borderColor: t.accent + '40',
              }]}
            >
              <Text style={{ fontSize: 18 }}>🔁</Text>
              <Text style={{ color: t.accent, fontWeight: '600', marginLeft: Spacing.sm }}>
                3x {repeatMode ? 'An' : 'Aus'}
              </Text>
            </Pressable>
          </View>

          {/* Hide & Test */}
          <Pressable
            onPress={() => setHidden(true)}
            style={[styles.toolBtn, { backgroundColor: t.accent + '10', marginTop: Spacing.sm }]}
          >
            <Text style={{ fontSize: 18 }}>🙈</Text>
            <Text style={{ color: t.accent, fontWeight: '600', marginLeft: Spacing.sm }}>Verbergen & Testen</Text>
          </Pressable>

          {/* Mark as memorized */}
          <Pressable
            onPress={() => toggleMemorizedVerse(verseRef)}
            style={[styles.memorizeBtn, {
              backgroundColor: isMemorized ? t.accent + '20' : t.accent + '08',
              borderColor: isMemorized ? t.accent : t.border,
            }]}
          >
            <Text style={{ fontSize: 20 }}>{isMemorized ? '✅' : '⬜'}</Text>
            <Text style={{
              color: isMemorized ? t.accent : t.text,
              fontWeight: '700',
              marginLeft: Spacing.sm,
              fontSize: FontSize.md,
            }}>
              {isMemorized ? 'Auswendig gelernt!' : 'Auswendig gelernt'}
            </Text>
          </Pressable>
        </View>

        {/* Navigation */}
        <View style={styles.navRow}>
          <Pressable
            onPress={() => canGoBack && setDayOffset(dayOffset - 1)}
            style={[styles.navBtn, { opacity: canGoBack ? 1 : 0.3, backgroundColor: t.card, borderColor: t.border }]}
            disabled={!canGoBack}
          >
            <Text style={{ color: t.text, fontWeight: '600' }}>← Gestern</Text>
          </Pressable>
          <Pressable
            onPress={() => canGoForward && setDayOffset(dayOffset + 1)}
            style={[styles.navBtn, { opacity: canGoForward ? 1 : 0.3, backgroundColor: t.card, borderColor: t.border }]}
            disabled={!canGoForward}
          >
            <Text style={{ color: t.text, fontWeight: '600' }}>Morgen →</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: 32 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  arabicCard: {
    padding: 24,
    alignItems: 'center',
  },
  arabicText: {
    fontSize: 28,
    lineHeight: 56,
    textAlign: 'center',
  },
  themeBadge: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: Spacing.sm,
  },
  sectionLabel: {
    fontSize: FontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  translitText: {
    fontSize: FontSize.md,
    fontStyle: 'italic',
    lineHeight: 26,
  },
  toolRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
  },
  memorizeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.md,
    minHeight: 52,
  },
  hiddenOverlay: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  actionBtn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  retryBtn: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  navBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
});
