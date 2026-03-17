import { View, Text, StyleSheet, ScrollView, Pressable, SafeAreaView } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from '../../hooks/useLocation';
import { useAppStore } from '../../hooks/useAppStore';
import { fetchPrayerTimes, getNextPrayer } from '../../features/prayer/prayerCalculation';
import { DarkTheme, LightTheme, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { DUAS } from '../../features/duas/duaData';
import Card from '../../components/ui/Card';
import HeaderBar from '../../components/ui/HeaderBar';
import { getStreakEmoji, getStreakMessage } from '../../features/streaks/streakManager';
import { PRAYER_META, TRACKABLE_KEYS } from '../../features/prayer/prayerMeta';

const DAILY_AYAHS = [
  { arabic: 'إِنَّ مَعَ ٱلْعُسْرِ يُسْرًا', translation: 'Wahrlich, mit der Erschwernis kommt die Erleichterung.', ref: 'Ash-Sharh 94:6' },
  { arabic: 'وَمَن يَتَوَكَّلْ عَلَى ٱللَّهِ فَهُوَ حَسْبُهُۥ', translation: 'Und wer auf Allah vertraut, dem genügt Er.', ref: 'At-Talaq 65:3' },
  { arabic: 'فَٱذْكُرُونِىٓ أَذْكُرْكُمْ', translation: 'So gedenkt Meiner, damit Ich eurer gedenke.', ref: 'Al-Baqarah 2:152' },
  { arabic: 'وَلَسَوْفَ يُعْطِيكَ رَبُّكَ فَتَرْضَىٰٓ', translation: 'Und dein Herr wird dir bestimmt geben, und du wirst zufrieden sein.', ref: 'Ad-Duha 93:5' },
  { arabic: 'رَبِّ ٱشْرَحْ لِى صَدْرِى', translation: 'Mein Herr, weite mir meine Brust.', ref: 'Ta-Ha 20:25' },
  { arabic: 'وَقُل رَّبِّ زِدْنِى عِلْمًا', translation: 'Und sprich: Mein Herr, mehre mir mein Wissen.', ref: 'Ta-Ha 20:114' },
  { arabic: 'إِنَّ ٱللَّهَ مَعَ ٱلصَّـٰبِرِينَ', translation: 'Wahrlich, Allah ist mit den Geduldigen.', ref: 'Al-Baqarah 2:153' },
];

const DAILY_HADITHS = [
  { arabic: 'إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ', translation: '"Wahrlich, die Taten sind nur entsprechend den Absichten."', source: 'Sahih al-Bukhari, Hadith 1' },
  { arabic: 'خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ', translation: '"Die Besten unter euch sind diejenigen, die den Quran lernen und lehren."', source: 'Sahih al-Bukhari, Hadith 5027' },
  { arabic: 'تَبَسُّمُكَ فِي وَجْهِ أَخِيكَ صَدَقَةٌ', translation: '"Dein Lächeln für deinen Bruder ist eine Sadaqah."', source: 'At-Tirmidhi, Hadith 1956' },
  { arabic: 'لَا يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لِأَخِيهِ مَا يُحِبَّ لِنَفْسِهِ', translation: '"Keiner von euch glaubt wirklich, bis er für seinen Bruder liebt, was er für sich selbst liebt."', source: 'Sahih al-Bukhari, Hadith 13' },
  { arabic: 'مَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا سَهَّلَ اللَّهُ لَهُ طَرِيقًا إِلَى الْجَنَّةِ', translation: '"Wer einen Weg beschreitet, um Wissen zu erlangen, dem erleichtert Allah den Weg ins Paradies."', source: 'Sahih Muslim, Hadith 2699' },
  { arabic: 'الدُّنْيَا سِجْنُ الْمُؤْمِنِ وَجَنَّةُ الْكَافِرِ', translation: '"Die Dunya ist das Gefängnis des Gläubigen und das Paradies des Ungläubigen."', source: 'Sahih Muslim, Hadith 2956' },
  { arabic: 'الْمُسْلِمُ مَنْ سَلِمَ الْمُسْلِمُونَ مِنْ لِسَانِهِ وَيَدِهِ', translation: '"Der Muslim ist derjenige, vor dessen Zunge und Hand die anderen Muslime sicher sind."', source: 'Sahih al-Bukhari, Hadith 10' },
];

const DHIKR_MINI = [
  { arabic: 'سُبْحَانَ اللَّهِ', text: 'SubhanAllah' },
  { arabic: 'الْحَمْدُ لِلَّهِ', text: 'Alhamdulillah' },
  { arabic: 'اللَّهُ أَكْبَرُ', text: 'Allahu Akbar' },
];

const PRAYER_ORDER = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

function getDailyIndex(arr) {
  const now = new Date();
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
  return dayOfYear % arr.length;
}

function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function getCurrentPrayer(times) {
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  for (let i = PRAYER_ORDER.length - 1; i >= 0; i--) {
    const mins = timeToMinutes(times[PRAYER_ORDER[i]]);
    if (cur >= mins) {
      const k = PRAYER_ORDER[i];
      return { key: k, name: PRAYER_META[k].name, time: times[k] };
    }
  }
  return { key: 'isha', name: 'Isha', time: times.isha };
}

function getPrayerProgress(times) {
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  let currentIdx = -1;
  for (let i = PRAYER_ORDER.length - 1; i >= 0; i--) {
    if (cur >= timeToMinutes(times[PRAYER_ORDER[i]])) { currentIdx = i; break; }
  }
  if (currentIdx === -1) {
    const prevEnd = timeToMinutes(times.isha);
    const nextStart = timeToMinutes(times.fajr);
    const totalSpan = (1440 - prevEnd) + nextStart;
    const elapsed = cur < nextStart ? (1440 - prevEnd) + cur : cur - prevEnd;
    return Math.min(1, Math.max(0, elapsed / totalSpan));
  }
  const currentTime = timeToMinutes(times[PRAYER_ORDER[currentIdx]]);
  const nextIdx = currentIdx + 1;
  if (nextIdx >= PRAYER_ORDER.length) {
    const nextFajr = timeToMinutes(times.fajr) + 1440;
    const totalSpan = nextFajr - currentTime;
    return Math.min(1, Math.max(0, (cur - currentTime) / totalSpan));
  }
  const nextTime = timeToMinutes(times[PRAYER_ORDER[nextIdx]]);
  const totalSpan = nextTime - currentTime;
  if (totalSpan <= 0) return 0;
  return Math.min(1, Math.max(0, (cur - currentTime) / totalSpan));
}

const GOAL_META = {
  dhikr: { emoji: '📿', label: 'Dhikr' },
  quran: { emoji: '📖', label: 'Quran Verse' },
  dua: { emoji: '🤲', label: 'Duas gelesen' },
};

function DailyGoalsRing({ goals, progress, t }) {
  const enabled = Object.entries(goals).filter(([, v]) => v.enabled);
  const completed = enabled.filter(([key]) => (progress[key] || 0) >= goals[key].target).length;
  const total = enabled.length;
  const ratio = total > 0 ? completed / total : 0;
  const allDone = total > 0 && completed === total;

  const size = 80;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - ratio);

  return (
    <Card centered>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
          <Circle cx={size / 2} cy={size / 2} r={radius} stroke={t.border} strokeWidth={strokeWidth} fill="none" />
          <Circle
            cx={size / 2} cy={size / 2} r={radius}
            stroke={allDone ? '#D4A843' : t.accent}
            strokeWidth={strokeWidth} fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <Text style={{ fontSize: FontSize.xl, fontWeight: '700', color: allDone ? '#D4A843' : t.accent }}>{completed}/{total}</Text>
      </View>
      <Text style={{ fontSize: FontSize.xs, color: t.textDim, marginTop: Spacing.xs }}>Tagesziele</Text>
    </Card>
  );
}

function DailyGoalsDetail({ goals, progress, t }) {
  const entries = Object.entries(goals).filter(([, v]) => v.enabled);
  if (entries.length === 0) return null;

  return (
    <Card>
      <Text style={{ fontSize: FontSize.xs, color: t.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.md }}>Tagesziele</Text>
      {entries.map(([key, goal]) => {
        const current = Math.min(progress[key] || 0, goal.target);
        const done = current >= goal.target;
        const pct = goal.target > 0 ? (current / goal.target) * 100 : 0;
        const meta = GOAL_META[key] || { emoji: '🎯', label: key };
        return (
          <View key={key} style={{ marginBottom: key !== entries[entries.length - 1]?.[0] ? Spacing.md : 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.xs }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                <Text style={{ fontSize: 18 }}>{meta.emoji}</Text>
                <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: t.text }}>{meta.label}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                <Text style={{ fontSize: FontSize.sm, color: done ? '#D4A843' : t.textDim }}>{current}/{goal.target}</Text>
                {done && <Text style={{ fontSize: 14 }}>✅</Text>}
              </View>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: done ? '#D4A843' : t.accent }]} />
            </View>
          </View>
        );
      })}
    </Card>
  );
}

export default function HomeScreen() {
  const { location, loading } = useLocation();
  const isDark = useAppStore((s) => s.theme === 'dark');
  const method = useAppStore((s) => s.calculationMethod);
  const todayPrayers = useAppStore((s) => s.todayPrayers);
  const lastReadSurah = useAppStore((s) => s.lastReadSurah);
  const incrementDhikr = useAppStore((s) => s.incrementDhikr);
  const currentStreak = useAppStore((s) => s.currentStreak) || 0;
  const fajrStreak = useAppStore((s) => s.fajrStreak) || 0;
  const dailyGoals = useAppStore((s) => s.dailyGoals);
  const dailyProgress = useAppStore((s) => s.dailyProgress);
  const t = isDark ? DarkTheme : LightTheme;
  const router = useRouter();

  const [miniCount, setMiniCount] = useState(0);
  const [miniSel, setMiniSel] = useState(0);
  const [countdown, setCountdown] = useState('');
  const [progress, setProgress] = useState(0);

  const dateString = new Date().toISOString().slice(0, 10);
  const { data: prayerData } = useQuery({
    queryKey: ['prayerTimes', location?.lat, location?.lng, method, dateString],
    queryFn: () => fetchPrayerTimes(location.lat, location.lng, method),
    enabled: !!location,
    staleTime: 1000 * 60 * 60,
  });

  const times = prayerData?.times || null;
  const nextPrayer = useMemo(() => (times ? getNextPrayer(times) : null), [times]);
  const currentPrayer = useMemo(() => (times ? getCurrentPrayer(times) : null), [times]);

  useEffect(() => {
    if (!nextPrayer || !times) return;
    const update = () => {
      const now = new Date();
      const [h, m] = nextPrayer.time.split(':').map(Number);
      const target = new Date(now);
      target.setHours(h, m, 0, 0);
      if (target <= now) target.setDate(target.getDate() + 1);
      const diff = target - now;
      const hrs = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setCountdown(`${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
      setProgress(getPrayerProgress(times));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [nextPrayer, times]);

  const hijriDate = useMemo(() => {
    try { return new Intl.DateTimeFormat('de-DE', { calendar: 'islamic-civil', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()); }
    catch { return ''; }
  }, []);

  const gregorianDate = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const completedCount = Object.values(todayPrayers).filter(Boolean).length;
  const dailyAyah = DAILY_AYAHS[getDailyIndex(DAILY_AYAHS)];
  const dailyHadith = DAILY_HADITHS[getDailyIndex(DAILY_HADITHS)];
  const dailyDua = DUAS[getDailyIndex(DUAS)];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={styles.content}>
        {/* Header */}
        <HeaderBar titleAr="بِسْمِ ٱللَّهِ" title="Dein täglicher Begleiter" t={t} />

        {/* Date & Location */}
        <Card centered>
          <Text style={{ fontSize: FontSize.sm, color: t.textDim }}>{gregorianDate}</Text>
          {hijriDate ? <Text style={{ fontSize: FontSize.md, color: t.accent, marginTop: Spacing.xs }}>{hijriDate}</Text> : null}
          {location?.name ? (
            <View style={[styles.badge, { backgroundColor: t.accent + '18' }]}>
              <Text style={{ fontSize: FontSize.xs, fontWeight: '600', color: t.accent }}>📍 {location.name}</Text>
            </View>
          ) : null}
        </Card>

        {/* Enhanced Prayer Countdown */}
        {nextPrayer && currentPrayer && (() => {
          const nextMeta = PRAYER_META[nextPrayer.key];
          const curMeta = PRAYER_META[currentPrayer.key];
          return (
            <View style={[styles.prayerCountdownCard, { borderColor: nextMeta.color + '44', backgroundColor: t.card }]}>
              <View style={[StyleSheet.absoluteFill, { backgroundColor: nextMeta.color + '08', borderRadius: BorderRadius.md }]} />

              <View style={{ padding: Spacing.lg }}>
                {/* Current & Next Prayer */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md }}>
                  <View>
                    <Text style={{ fontSize: FontSize.xs, color: t.textDim, textTransform: 'uppercase', letterSpacing: 1 }}>Aktuelles Gebet</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.xs }}>
                      <Text style={{ fontSize: 24 }}>{curMeta.emoji}</Text>
                      <View>
                        <Text style={{ fontSize: FontSize.xl, fontWeight: '700', color: t.text }}>{currentPrayer.name}</Text>
                        <Text style={{ fontSize: FontSize.xs, color: t.textDim }}>{curMeta.description}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: FontSize.xs, color: t.textDim, textTransform: 'uppercase', letterSpacing: 1 }}>Nächstes Gebet</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.xs }}>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: FontSize.xl, fontWeight: '700', color: nextMeta.color }}>{nextPrayer.name}</Text>
                        <Text style={{ fontSize: FontSize.xs, color: t.textDim }}>{nextMeta.description}</Text>
                      </View>
                      <Text style={{ fontSize: 24 }}>{nextMeta.emoji}</Text>
                    </View>
                  </View>
                </View>

                {/* Progress bar between prayers */}
                <View style={[styles.prayerProgressBar, { backgroundColor: t.border }]}>
                  <View style={[styles.prayerProgressFill, { width: `${progress * 100}%`, backgroundColor: nextMeta.color }]} />
                </View>

                {/* Countdown */}
                <View style={{ alignItems: 'center', marginTop: Spacing.md }}>
                  <Text style={{ fontSize: 36, fontWeight: '700', color: nextMeta.color, fontVariant: ['tabular-nums'] }}>{countdown}</Text>
                  <Text style={{ fontSize: FontSize.xs, color: t.textDim, marginTop: Spacing.xs }}>bis {nextPrayer.name}</Text>
                </View>

                {/* Prayer dots - colored per prayer */}
                <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.md, gap: Spacing.sm }}>
                  {TRACKABLE_KEYS.map((p) => (
                    <View key={p} style={[styles.miniDot, { backgroundColor: todayPrayers[p] ? PRAYER_META[p].color : t.border }]} />
                  ))}
                </View>
                <Text style={{ fontSize: FontSize.xs, color: t.textDim, textAlign: 'center', marginTop: Spacing.xs }}>{completedCount}/5 verrichtet</Text>
              </View>
            </View>
          );
        })()}

        {/* Streak & Daily Goals side by side */}
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Card centered>
              <Text style={{ fontSize: 28 }}>{getStreakEmoji(currentStreak) || '🔥'}</Text>
              <Text style={{ fontSize: FontSize.xxl, fontWeight: '700', color: t.accent, marginTop: Spacing.xs }}>{currentStreak}</Text>
              <Text style={{ fontSize: FontSize.xs, color: t.textDim }}>Tage Streak</Text>
              <Text style={{ fontSize: FontSize.xs, color: t.accent, marginTop: Spacing.xs }}>{getStreakMessage(currentStreak)}</Text>
            </Card>
          </View>
          <View style={{ flex: 1 }}>
            <DailyGoalsRing goals={dailyGoals} progress={dailyProgress} t={t} />
          </View>
        </View>

        {/* Daily Goals Detail */}
        <DailyGoalsDetail goals={dailyGoals} progress={dailyProgress} t={t} />

        {/* Ayah des Tages */}
        <Card>
          <Text style={{ fontSize: FontSize.xs, color: t.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.md }}>Ayah des Tages</Text>
          <Text style={{ fontSize: FontSize.arabicLarge, color: t.accentLight, textAlign: 'right', lineHeight: 44, marginBottom: Spacing.md }}>{dailyAyah.arabic}</Text>
          <Text style={{ fontSize: FontSize.md, color: t.text, fontStyle: 'italic', lineHeight: 24, marginBottom: Spacing.sm }}>{dailyAyah.translation}</Text>
          <Text style={{ fontSize: FontSize.xs, color: t.textDim }}>— {dailyAyah.ref}</Text>
        </Card>

        {/* Hadith des Tages */}
        <Card>
          <Text style={{ fontSize: FontSize.xs, color: t.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.md }}>Hadith des Tages</Text>
          <Text style={{ fontSize: FontSize.arabic, color: t.accentLight, textAlign: 'right', lineHeight: 36, marginBottom: Spacing.md }}>{dailyHadith.arabic}</Text>
          <Text style={{ fontSize: FontSize.md, color: t.text, fontStyle: 'italic', lineHeight: 24, marginBottom: Spacing.sm }}>{dailyHadith.translation}</Text>
          <Text style={{ fontSize: FontSize.xs, color: t.textDim }}>— {dailyHadith.source}</Text>
        </Card>

        {/* Dua des Tages */}
        <Card>
          <Text style={{ fontSize: FontSize.xs, color: t.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.md }}>Dua des Tages</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md }}>
            <Text style={{ fontSize: 24 }}>{dailyDua.emoji || '🤲'}</Text>
            <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: t.text }}>{dailyDua.title}</Text>
          </View>
          <View style={{ padding: Spacing.md, borderRadius: BorderRadius.md, backgroundColor: t.accent + '08', borderWidth: 1, borderColor: t.accent + '15', marginBottom: Spacing.sm }}>
            <Text style={{ fontSize: FontSize.arabic, lineHeight: 36, textAlign: 'right', color: t.accentLight }}>{dailyDua.arabic}</Text>
          </View>
          <Text style={{ fontSize: FontSize.sm, fontStyle: 'italic', color: t.textDim, lineHeight: 22 }}>{dailyDua.translation}</Text>
        </Card>

        {/* Mini Dhikr Counter */}
        <Card centered>
          <Text style={{ fontSize: FontSize.xs, color: t.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.md }}>Schneller Dhikr</Text>
          <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md }}>
            {DHIKR_MINI.map((d, i) => (
              <Pressable
                key={i}
                style={[styles.miniChip, { borderColor: t.border }, miniSel === i && { borderColor: t.accent, backgroundColor: t.accent + '15' }]}
                onPress={() => { setMiniSel(i); setMiniCount(0); }}
              >
                <Text style={{ fontSize: FontSize.xs, color: miniSel === i ? t.accent : t.textDim }}>{d.text}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable onPress={() => { setMiniCount((c) => c + 1); incrementDhikr(); }} style={[styles.miniCounter, { borderColor: t.accent + '44' }]}>
            <Text style={{ fontSize: 36, fontWeight: '700', color: t.accent }}>{miniCount}</Text>
          </Pressable>
          <Pressable onPress={() => setMiniCount(0)} style={styles.resetTouch}>
            <Text style={{ fontSize: FontSize.xs, color: t.textDim }}>Zurücksetzen</Text>
          </Pressable>
        </Card>

        {/* Quran Fortschritt */}
        <Pressable onPress={() => router.push(`/quran/${lastReadSurah}`)}>
          <Card>
            <Text style={{ fontSize: FontSize.xs, color: t.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.md }}>Quran-Fortschritt</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: t.text }}>Weiterlesen</Text>
                <Text style={{ fontSize: FontSize.sm, color: t.textDim, marginTop: Spacing.xs }}>Sure {lastReadSurah} von 114</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: FontSize.xxl, fontWeight: '700', color: t.accent }}>{Math.round((lastReadSurah / 114) * 100)}%</Text>
              </View>
            </View>
            <View style={[styles.progressBar, { marginTop: Spacing.md }]}>
              <View style={[styles.progressFill, { width: `${(lastReadSurah / 114) * 100}%`, backgroundColor: t.accent }]} />
            </View>
          </Card>
        </Pressable>

        {/* Global Dhikr Placeholder */}
        <Card centered>
          <Text style={{ fontSize: 32 }}>🌍</Text>
          <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: t.text, marginTop: Spacing.sm }}>Globaler Tasbih heute</Text>
          <Text style={{ fontSize: FontSize.xxl, fontWeight: '700', color: t.accent, marginTop: Spacing.xs }}>--</Text>
          <View style={[styles.phaseBadge, { backgroundColor: t.accent + '10' }]}>
            <Text style={{ color: t.accent, fontSize: FontSize.xs, fontWeight: '600' }}>Kommt in Phase 3</Text>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: 100 },
  badge: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.xl, marginTop: Spacing.sm },
  miniDot: { width: 10, height: 10, borderRadius: 5 },
  miniChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, borderWidth: 1 },
  miniCounter: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  resetTouch: { marginTop: Spacing.sm, minHeight: 44, justifyContent: 'center' },
  prayerCountdownCard: { borderRadius: BorderRadius.md, overflow: 'hidden', borderWidth: 1, marginBottom: Spacing.md },
  prayerProgressBar: { width: '100%', height: Spacing.sm, borderRadius: Spacing.xs, overflow: 'hidden' },
  prayerProgressFill: { height: '100%', borderRadius: Spacing.xs },
  progressBar: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  phaseBadge: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, marginTop: Spacing.sm },
});
