import { View, Text, StyleSheet, ScrollView, Pressable, SafeAreaView } from 'react-native';
import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from '../../hooks/useLocation';
import { useAppStore } from '../../hooks/useAppStore';
import { fetchPrayerTimes, getNextPrayer } from '../../features/prayer/prayerCalculation';
import { DarkTheme, LightTheme, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { DUAS } from '../../features/duas/duaData';
import Card from '../../components/ui/Card';

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
  { arabic: 'لَا يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لِأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ', translation: '"Keiner von euch glaubt wirklich, bis er für seinen Bruder liebt, was er für sich selbst liebt."', source: 'Sahih al-Bukhari, Hadith 13' },
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
const PRAYER_NAMES = { fajr: 'Fajr', sunrise: 'Sunrise', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha' };

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
      return { key: PRAYER_ORDER[i], name: PRAYER_NAMES[PRAYER_ORDER[i]], time: times[PRAYER_ORDER[i]] };
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

export default function HomeScreen() {
  const { location, loading } = useLocation();
  const isDark = useAppStore((s) => s.theme === 'dark');
  const method = useAppStore((s) => s.calculationMethod);
  const todayPrayers = useAppStore((s) => s.todayPrayers);
  const lastReadSurah = useAppStore((s) => s.lastReadSurah);
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
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]}>
      <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.bismillah, { color: t.accent }]}>بِسْمِ ٱللَّهِ</Text>
          <Text style={[styles.subtitle, { color: t.textDim }]}>Dein täglicher Begleiter</Text>
        </View>

        {/* Date & Location */}
        <Card centered>
          <Text style={{ fontSize: FontSize.sm, color: t.textDim }}>{gregorianDate}</Text>
          {hijriDate ? <Text style={{ fontSize: FontSize.md, color: t.accent, marginTop: 4 }}>{hijriDate}</Text> : null}
          {location?.name ? (
            <View style={[styles.badge, { backgroundColor: t.accent + '18' }]}>
              <Text style={{ fontSize: FontSize.xs, fontWeight: '600', color: t.accent }}>📍 {location.name}</Text>
            </View>
          ) : null}
        </Card>

        {/* Enhanced Prayer Countdown */}
        {nextPrayer && currentPrayer && (
          <Card style={{ borderColor: t.accent + '44' }}>
            {/* Current Prayer */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md }}>
              <View>
                <Text style={{ fontSize: FontSize.xs, color: t.textDim, textTransform: 'uppercase', letterSpacing: 1 }}>Aktuelles Gebet</Text>
                <Text style={{ fontSize: FontSize.xl, fontWeight: '700', color: t.text }}>{currentPrayer.name}</Text>
                <Text style={{ fontSize: FontSize.sm, color: t.textDim }}>{currentPrayer.time}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: FontSize.xs, color: t.textDim, textTransform: 'uppercase', letterSpacing: 1 }}>Nächstes Gebet</Text>
                <Text style={{ fontSize: FontSize.xl, fontWeight: '700', color: t.accent }}>{nextPrayer.name}</Text>
                <Text style={{ fontSize: FontSize.sm, color: t.accentLight }}>{nextPrayer.time}</Text>
              </View>
            </View>

            {/* Progress bar between prayers */}
            <View style={[styles.prayerProgressBar, { backgroundColor: t.border }]}>
              <View style={[styles.prayerProgressFill, { width: `${progress * 100}%`, backgroundColor: t.accent }]} />
            </View>

            {/* Countdown */}
            <View style={{ alignItems: 'center', marginTop: Spacing.md }}>
              <Text style={{ fontSize: 36, fontWeight: '700', color: t.accent, fontVariant: ['tabular-nums'] }}>{countdown}</Text>
              <Text style={{ fontSize: FontSize.xs, color: t.textDim, marginTop: 2 }}>bis {nextPrayer.name}</Text>
            </View>

            {/* Prayer dots */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.md, gap: 6 }}>
              {['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].map((p) => (
                <View key={p} style={[styles.miniDot, { backgroundColor: todayPrayers[p] ? t.accent : t.border }]} />
              ))}
            </View>
            <Text style={{ fontSize: FontSize.xs, color: t.textDim, textAlign: 'center', marginTop: 4 }}>{completedCount}/5 verrichtet</Text>
          </Card>
        )}

        {/* Streak & Daily Goals side by side */}
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Card centered>
              <Text style={{ fontSize: 28 }}>🔥</Text>
              <Text style={{ fontSize: FontSize.xxl, fontWeight: '700', color: t.accent, marginTop: 4 }}>0</Text>
              <Text style={{ fontSize: FontSize.xs, color: t.textDim }}>Tage Streak</Text>
            </Card>
          </View>
          <View style={{ flex: 1 }}>
            <Card centered>
              <Text style={{ fontSize: 28 }}>🎯</Text>
              <Text style={{ fontSize: FontSize.xxl, fontWeight: '700', color: t.accent, marginTop: 4 }}>0/3</Text>
              <Text style={{ fontSize: FontSize.xs, color: t.textDim }}>Tagesziele</Text>
            </Card>
          </View>
        </View>

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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.md }}>
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
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: Spacing.md }}>
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
          <Pressable onPress={() => setMiniCount((c) => c + 1)} style={[styles.miniCounter, { borderColor: t.accent + '44' }]}>
            <Text style={{ fontSize: 36, fontWeight: '700', color: t.accent }}>{miniCount}</Text>
          </Pressable>
          <Pressable onPress={() => setMiniCount(0)}>
            <Text style={{ fontSize: FontSize.xs, color: t.textDim, marginTop: Spacing.sm }}>Zurücksetzen</Text>
          </Pressable>
        </Card>

        {/* Quran Fortschritt */}
        <Pressable onPress={() => router.push(`/quran/${lastReadSurah}`)}>
          <Card>
            <Text style={{ fontSize: FontSize.xs, color: t.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.md }}>Quran-Fortschritt</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: t.text }}>Weiterlesen</Text>
                <Text style={{ fontSize: FontSize.sm, color: t.textDim, marginTop: 2 }}>Sure {lastReadSurah} von 114</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: FontSize.xxl, fontWeight: '700', color: t.accent }}>{Math.round((lastReadSurah / 114) * 100)}%</Text>
              </View>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${(lastReadSurah / 114) * 100}%`, backgroundColor: t.accent }]} />
            </View>
          </Card>
        </Pressable>

        {/* Global Dhikr Placeholder */}
        <Card centered>
          <Text style={{ fontSize: 32 }}>🌍</Text>
          <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: t.text, marginTop: Spacing.sm }}>Globaler Tasbih heute</Text>
          <Text style={{ fontSize: FontSize.xxl, fontWeight: '700', color: t.accent, marginTop: 4 }}>--</Text>
          <View style={{ backgroundColor: t.accent + '10', paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.full, marginTop: Spacing.sm }}>
            <Text style={{ color: t.accent, fontSize: FontSize.xs, fontWeight: '600' }}>Kommt in Phase 3</Text>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: 40 },
  header: { alignItems: 'center', paddingVertical: Spacing.xl },
  bismillah: { fontSize: 32, fontWeight: '700' },
  subtitle: { fontSize: FontSize.sm, letterSpacing: 3, textTransform: 'uppercase', marginTop: 4 },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginTop: 8 },
  miniDot: { width: 10, height: 10, borderRadius: 5 },
  miniChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9999, borderWidth: 1 },
  miniCounter: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  prayerProgressBar: { width: '100%', height: 8, borderRadius: 4, overflow: 'hidden' },
  prayerProgressFill: { height: '100%', borderRadius: 4 },
  progressBar: { width: '100%', height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, marginTop: Spacing.md, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
});
