import { View, Text, ScrollView, SafeAreaView, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
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
  const memberSince = useAppStore((s) => s.memberSince);
  const todayPrayers = useAppStore((s) => s.todayPrayers);
  const weeklyPrayers = useAppStore((s) => s.weeklyPrayers) || {};
  const t = isDark ? DarkTheme : LightTheme;
  const router = useRouter();

  const storeState = { totalPrayers, totalDhikr, surahsRead, longestStreak, fajrStreak };

  const weekPrayers = getWeekTotal(weeklyPrayers);

  const memberDate = memberSince
    ? new Date(memberSince).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Heute';

  const stats = [
    { emoji: '🔥', value: currentStreak, label: 'Aktuelle Streak' },
    { emoji: '⭐', value: longestStreak, label: 'Längste Streak' },
    { emoji: '🕌', value: totalPrayers, label: 'Gebete verrichtet' },
    { emoji: '🌅', value: fajrStreak, label: 'Fajr-Streak' },
    { emoji: '📖', value: quranStreak, label: 'Quran-Streak' },
    { emoji: '📿', value: dhikrStreak, label: 'Dhikr-Streak' },
  ];

  const quranProgress = surahsRead.length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 40 }}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={[styles.avatarLarge, { backgroundColor: t.surface, borderColor: t.accent }]}>
            <Text style={{ fontSize: 36 }}>👤</Text>
          </View>
          <Text style={[styles.name, { color: t.text }]}>Nutzer</Text>
          <Text style={{ fontSize: FontSize.sm, color: t.textDim, marginTop: 2 }}>Mitglied seit {memberDate}</Text>
          {currentStreak > 0 && (
            <View style={[styles.streakBadge, { backgroundColor: t.accent + '18' }]}>
              <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: t.accent }}>🔥 {currentStreak} Tage Streak</Text>
            </View>
          )}
        </View>

        {/* Stats Grid */}
        <Text style={[styles.sectionTitle, { color: t.text }]}>Ibadah-Statistiken</Text>
        <View style={styles.statsGrid}>
          {stats.map((s) => (
            <View key={s.label} style={styles.statItem}>
              <Card centered>
                <Text style={{ fontSize: 24 }}>{s.emoji}</Text>
                <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: t.accent, marginTop: 4 }}>{s.value}</Text>
                <Text style={{ fontSize: 10, color: t.textDim, textAlign: 'center', marginTop: 2 }}>{s.label}</Text>
              </Card>
            </View>
          ))}
        </View>

        <Pressable
          style={{ alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 10, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: t.accent + '44', marginTop: Spacing.sm, marginBottom: Spacing.sm }}
          onPress={() => router.push('/stats')}
        >
          <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: t.accent }}>Statistiken ansehen</Text>
        </Pressable>

        {/* Progress Bars */}
        <Text style={[styles.sectionTitle, { color: t.text }]}>Fortschritt</Text>
        <Card>
          <View style={styles.progressRow}>
            <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: t.text }}>📖 Quran</Text>
            <Text style={{ fontSize: FontSize.xs, color: t.textDim }}>{quranProgress}/114 Suren</Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: t.border }]}>
            <View style={[styles.progressFill, { width: `${(quranProgress / 114) * 100}%`, backgroundColor: t.accent }]} />
          </View>

          <View style={[styles.progressRow, { marginTop: Spacing.md }]}>
            <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: t.text }}>🕌 Gebete diese Woche</Text>
            <Text style={{ fontSize: FontSize.xs, color: t.textDim }}>{weekPrayers}/35</Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: t.border }]}>
            <View style={[styles.progressFill, { width: `${(weekPrayers / 35) * 100}%`, backgroundColor: t.accent }]} />
          </View>
        </Card>

        {/* Achievements */}
        <Text style={[styles.sectionTitle, { color: t.text }]}>Errungenschaften</Text>
        <View style={styles.badgeGrid}>
          {ACHIEVEMENTS.map((badge) => {
            const unlocked = badge.check(storeState);
            return (
              <View key={badge.id} style={styles.badgeItem}>
                <Card centered>
                  <View style={[styles.badgeIcon, !unlocked && { opacity: 0.3 }]}>
                    <Text style={{ fontSize: 28 }}>{unlocked ? badge.emoji : '🔒'}</Text>
                  </View>
                  <Text style={{ fontSize: FontSize.xs, fontWeight: '600', color: unlocked ? t.text : t.textDim, textAlign: 'center', marginTop: 4 }}>
                    {badge.name}
                  </Text>
                  <Text style={{ fontSize: 9, color: t.textDim, textAlign: 'center', marginTop: 2 }}>{badge.description}</Text>
                </Card>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  profileHeader: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    marginTop: Spacing.md,
  },
  streakBadge: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 0,
  },
  statItem: {
    width: '50%',
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
  },
  badgeItem: {
    width: '33.33%',
  },
  badgeIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
