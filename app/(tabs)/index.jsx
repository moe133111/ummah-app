import { View, Text, StyleSheet, ScrollView, Pressable, SafeAreaView } from 'react-native';
import { useMemo, useState, useCallback, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useLocation } from '../../hooks/useLocation';
import { useAppStore } from '../../hooks/useAppStore';
import { calculatePrayerTimes, getNextPrayer } from '../../features/prayer/prayerCalculation';
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

function getDailyIndex(arr) {
  const now = new Date();
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
  return dayOfYear % arr.length;
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

  const times = useMemo(() => {
    if (!location) return null;
    return calculatePrayerTimes(location.lat, location.lng, new Date(), method);
  }, [location, method]);

  const nextPrayer = useMemo(() => (times ? getNextPrayer(times) : null), [times]);

  // Live countdown
  useEffect(() => {
    if (!nextPrayer) return;
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
      setCountdown(`${hrs}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [nextPrayer]);

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

        {/* Live Countdown */}
        {nextPrayer && (
          <Card centered style={{ borderColor: t.accent + '44' }}>
            <Text style={{ fontSize: FontSize.xs, color: t.textDim, textTransform: 'uppercase', letterSpacing: 1 }}>Nächstes Gebet</Text>
            <Text style={{ fontSize: FontSize.xxl, fontWeight: '700', color: t.accent }}>{nextPrayer.name}</Text>
            <Text style={{ fontSize: FontSize.lg, color: t.accentLight }}>{nextPrayer.time}</Text>
            <Text style={{ fontSize: 28, fontWeight: '700', color: t.text, marginTop: Spacing.sm, fontVariant: ['tabular-nums'] }}>{countdown}</Text>
            <View style={{ flexDirection: 'row', marginTop: Spacing.sm, gap: 4 }}>
              {['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].map((p) => (
                <View key={p} style={[styles.miniDot, { backgroundColor: todayPrayers[p] ? t.accent : t.border }]} />
              ))}
            </View>
            <Text style={{ fontSize: FontSize.xs, color: t.textDim, marginTop: 4 }}>{completedCount}/5 verrichtet</Text>
          </Card>
        )}

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
  miniDot: { width: 8, height: 8, borderRadius: 4 },
  miniChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9999, borderWidth: 1 },
  miniCounter: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  progressBar: { width: '100%', height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, marginTop: Spacing.md, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
});
