import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AppIcon from '../components/ui/AppIcon';
import { useAppStore } from '../hooks/useAppStore';
import { DarkTheme, LightTheme, Spacing, FontSize, BorderRadius } from '../constants/theme';
import { ACHIEVEMENTS } from '../features/profile/achievements';
import { getWeekTotal } from '../features/stats/statsCalculator';
import Card from '../components/ui/Card';

export default function ProfileScreen() {
  const isDark = useAppStore((s) => s.theme === 'dark');
  const currentStreak = useAppStore((s) => s.currentStreak) || 0;
  const totalPrayers = useAppStore((s) => s.totalPrayers) || 0;
  const totalDhikr = useAppStore((s) => s.totalDhikr) || 0;
  const surahsRead = useAppStore((s) => s.surahsRead) || [];
  const longestStreak = useAppStore((s) => s.longestStreak) || 0;
  const fajrStreak = useAppStore((s) => s.fajrStreak) || 0;
  const quranStreak = useAppStore((s) => s.quranStreak) || 0;
  const dhikrStreak = useAppStore((s) => s.dhikrStreak) || 0;
  const memorizedVerses = useAppStore((s) => s.memorizedVerses) || [];
  const memberSince = useAppStore((s) => s.memberSince);
  const weeklyPrayers = useAppStore((s) => s.weeklyPrayers) || {};
  const t = isDark ? DarkTheme : LightTheme;
  const router = useRouter();

  const storeState = { totalPrayers, totalDhikr, surahsRead, longestStreak, fajrStreak, memorizedVerses };

  const weekPrayers = getWeekTotal(weeklyPrayers);

  const memberDate = memberSince
    ? new Date(memberSince).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Heute';

  const stats = [
    { icon: 'flame-outline', value: currentStreak, label: 'Aktuelle Streak' },
    { icon: 'star-outline', value: longestStreak, label: 'Längste Streak' },
    { icon: 'mosque', isCustom: true, value: totalPrayers, label: 'Gebete verrichtet' },
    { icon: 'sunny-outline', value: fajrStreak, label: 'Fajr-Streak' },
    { icon: 'quran', isCustom: true, value: quranStreak, label: 'Quran-Streak' },
    { icon: 'tasbih', isCustom: true, value: dhikrStreak, label: 'Dhikr-Streak' },
    { icon: 'bulb-outline', value: memorizedVerses.length, label: 'Verse auswendig' },
  ];

  const quranProgress = surahsRead.length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 16 }}>
        {/* Profile Header */}
        <View style={{ alignItems: 'center', marginBottom: 16 }}>
          <View style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            borderWidth: 2,
            borderColor: '#B8860B',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(184,134,11,0.08)',
            marginBottom: 12,
          }}>
            <Ionicons name="person-outline" size={36} color="#B8860B" />
          </View>
          <Text style={{ fontSize: FontSize.xxl, fontWeight: '700', color: t.text, marginBottom: 4 }}>Nutzer</Text>
          <Text style={{ fontSize: FontSize.sm, color: t.textDim, marginBottom: 16 }}>Mitglied seit {memberDate}</Text>
          {currentStreak > 0 && (
            <View style={[styles.streakBadge, { backgroundColor: t.accent + '18', marginBottom: 24 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="flame" size={18} color={t.accent} />
                <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: t.accent }}>{currentStreak} Tage Streak</Text>
              </View>
            </View>
          )}
        </View>

        {/* Stats Grid - 2 columns */}
        <Text style={[styles.sectionTitle, { color: t.text }]}>Ibadah-Statistiken</Text>
        <View style={styles.statsGrid}>
          {stats.map((s) => (
            <View key={s.label} style={styles.statItem}>
              <View style={[styles.statCard, { backgroundColor: t.card, borderColor: t.border }]}>
                {s.isCustom ? (
                  <AppIcon name={s.icon} size={24} color={t.accent} />
                ) : (
                  <Ionicons name={s.icon} size={24} color={t.accent} />
                )}
                <Text style={{ fontSize: 22, fontWeight: '700', color: t.accent, marginTop: 6 }}>{s.value}</Text>
                <Text style={{ fontSize: 11, color: t.textDim, textAlign: 'center', marginTop: 6 }}>{s.label}</Text>
              </View>
            </View>
          ))}
        </View>

        <Pressable
          style={[styles.detailBtn, { borderColor: t.accent + '44' }]}
          onPress={() => router.push('/stats')}
        >
          <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: t.accent }}>Statistiken ansehen</Text>
        </Pressable>

        {/* Progress Bars */}
        <Text style={[styles.sectionTitle, { color: t.text }]}>Fortschritt</Text>
        <Card>
          <View style={styles.progressRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <AppIcon name="quran" size={14} color={t.accent} />
              <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: t.text }}>Quran</Text>
            </View>
            <Text style={{ fontSize: FontSize.xs, color: t.textDim }}>{quranProgress}/114 Suren</Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: t.border, marginBottom: 12 }]}>
            <View style={[styles.progressFill, { width: `${(quranProgress / 114) * 100}%`, backgroundColor: t.accent }]} />
          </View>

          <View style={styles.progressRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <AppIcon name="mosque" size={14} color={t.accent} />
              <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: t.text }}>Gebete diese Woche</Text>
            </View>
            <Text style={{ fontSize: FontSize.xs, color: t.textDim }}>{weekPrayers}/35</Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: t.border }]}>
            <View style={[styles.progressFill, { width: `${(weekPrayers / 35) * 100}%`, backgroundColor: t.accent }]} />
          </View>
        </Card>

        {/* Achievements - 3 columns */}
        <Text style={[styles.sectionTitle, { color: t.text }]}>Errungenschaften</Text>
        <View style={styles.badgeGrid}>
          {ACHIEVEMENTS.map((badge) => {
            const unlocked = badge.check(storeState);
            return (
              <View key={badge.id} style={styles.badgeItem}>
                <View style={[styles.badgeCard, { backgroundColor: t.card, borderColor: t.border }]}>
                  {unlocked ? (
                    <Ionicons name={badge.icon || 'trophy-outline'} size={28} color={t.accent} />
                  ) : (
                    <Ionicons name="lock-closed-outline" size={28} color={t.textDim} style={{ opacity: 0.3 }} />
                  )}
                  <Text style={{ fontSize: 11, fontWeight: '600', color: unlocked ? t.text : t.textDim, textAlign: 'center', marginTop: 6 }}>
                    {badge.name}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakBadge: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    marginBottom: 12,
    marginTop: Spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statItem: {
    width: '47%',
  },
  statCard: {
    padding: 16,
    minHeight: 80,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailBtn: {
    alignSelf: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginBottom: 16,
    minHeight: 44,
    justifyContent: 'center',
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  badgeItem: {
    width: '30%',
  },
  badgeCard: {
    padding: 12,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
});
