import { View, Text, ScrollView, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useRef } from 'react';
import { useAppStore } from '../hooks/useAppStore';
import { DarkTheme, LightTheme, Spacing, FontSize, BorderRadius } from '../constants/theme';
import { getWeekData, getWeekTotal, getLastWeekTotal, getMonthTotal, getLastMonthTotal, getTrendPercent, WEEKDAY_LABELS } from '../features/stats/statsCalculator';
import Card from '../components/ui/Card';
import { Ionicons } from '@expo/vector-icons';
import AppIcon from '../components/ui/AppIcon';

const BAR_MAX_HEIGHT = 120;

function AnimatedBar({ value, maxValue, color, delay }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: maxValue > 0 ? value / maxValue : 0,
      duration: 600,
      delay: delay || 0,
      useNativeDriver: false,
    }).start();
  }, [value, maxValue]);

  const height = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, BAR_MAX_HEIGHT],
  });

  return (
    <Animated.View style={{ width: '100%', borderRadius: 4, backgroundColor: color, height }} />
  );
}

function BarChart({ data, maxValue, labels, getColor, t }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: BAR_MAX_HEIGHT + 24 }}>
      {data.map((val, i) => (
        <View key={i} style={{ flex: 1, alignItems: 'center' }}>
          <View style={{ height: BAR_MAX_HEIGHT, width: '100%', justifyContent: 'flex-end' }}>
            <AnimatedBar value={val} maxValue={maxValue} color={getColor(val)} delay={i * 60} />
          </View>
          <Text style={{ fontSize: 9, color: t.textDim, marginTop: 4 }}>{labels[i]}</Text>
        </View>
      ))}
    </View>
  );
}

function TrendBadge({ current, previous, label }) {
  if (previous === 0 && current === 0) return null;
  const pct = previous === 0 ? (current > 0 ? 100 : 0) : Math.round(((current - previous) / previous) * 100);
  const isUp = pct > 0;
  const isSame = pct === 0;
  const color = isSame ? '#888' : isUp ? '#4CAF50' : '#F44336';
  const arrow = isSame ? '→' : isUp ? '↑' : '↓';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
      <Text style={{ fontSize: FontSize.xs, color }}>{arrow} {Math.abs(pct)}%</Text>
      <Text style={{ fontSize: 9, color: '#888' }}>{label}</Text>
    </View>
  );
}

function MonthCompareRow({ iconName, isCustom, label, thisMonth, lastMonth, t }) {
  const pct = lastMonth === 0 ? (thisMonth > 0 ? 100 : 0) : Math.round(((thisMonth - lastMonth) / lastMonth) * 100);
  const isUp = pct > 0;
  const isSame = pct === 0;
  const trendColor = isSame ? t.textDim : isUp ? '#4CAF50' : '#F44336';
  const arrow = isSame ? '→' : isUp ? '↑' : '↓';

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
        {isCustom ? (
          <AppIcon name={iconName} size={20} color={t.accent} />
        ) : (
          <Ionicons name={iconName} size={20} color={t.accent} />
        )}
        <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: t.text }}>{label}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: t.accent }}>{thisMonth}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={{ fontSize: FontSize.xs, color: trendColor, fontWeight: '600' }}>{arrow} {Math.abs(pct)}%</Text>
          <Text style={{ fontSize: 9, color: t.textDim }}>vs. {lastMonth}</Text>
        </View>
      </View>
    </View>
  );
}

export default function StatsScreen() {
  const isDark = useAppStore((s) => s.theme === 'dark');
  const weeklyPrayers = useAppStore((s) => s.weeklyPrayers) || {};
  const weeklyDhikr = useAppStore((s) => s.weeklyDhikr) || {};
  const weeklyQuranMinutes = useAppStore((s) => s.weeklyQuranMinutes) || {};
  const surahsRead = useAppStore((s) => s.surahsRead) || [];
  const t = isDark ? DarkTheme : LightTheme;

  const prayerData = getWeekData(weeklyPrayers);
  const dhikrData = getWeekData(weeklyDhikr);
  const quranData = getWeekData(weeklyQuranMinutes);

  const prayerWeekTotal = getWeekTotal(weeklyPrayers);
  const prayerLastWeek = getLastWeekTotal(weeklyPrayers);
  const dhikrWeekTotal = getWeekTotal(weeklyDhikr);
  const dhikrLastWeek = getLastWeekTotal(weeklyDhikr);
  const quranWeekTotal = getWeekTotal(weeklyQuranMinutes);

  const prayerMonth = getMonthTotal(weeklyPrayers);
  const prayerLastMonth = getLastMonthTotal(weeklyPrayers);
  const dhikrMonth = getMonthTotal(weeklyDhikr);
  const dhikrLastMonth = getLastMonthTotal(weeklyDhikr);
  const quranMonth = getMonthTotal(weeklyQuranMinutes);
  const quranLastMonth = getLastMonthTotal(weeklyQuranMinutes);

  const maxDhikr = Math.max(...dhikrData, 1);
  const maxQuran = Math.max(...quranData, 1);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 40 }}>

        {/* Prayers */}
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <AppIcon name="mosque" size={22} color={t.accent} />
              <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: t.text }}>Gebete</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: t.accent }}>{prayerWeekTotal}/35</Text>
              <TrendBadge current={prayerWeekTotal} previous={prayerLastWeek} label="vs. letzte Woche" />
            </View>
          </View>
          <BarChart
            data={prayerData}
            maxValue={5}
            labels={WEEKDAY_LABELS}
            getColor={(val) => val === 5 ? '#D4A843' : val > 0 ? t.accent : t.border}
            t={t}
          />
        </Card>

        {/* Dhikr */}
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <AppIcon name="tasbih" size={22} color={t.accent} />
              <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: t.text }}>Dhikr</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: t.accent }}>{dhikrWeekTotal}</Text>
              <TrendBadge current={dhikrWeekTotal} previous={dhikrLastWeek} label="vs. letzte Woche" />
            </View>
          </View>
          <BarChart
            data={dhikrData}
            maxValue={maxDhikr}
            labels={WEEKDAY_LABELS}
            getColor={(val) => val > 0 ? t.accent : t.border}
            t={t}
          />
        </Card>

        {/* Quran */}
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <AppIcon name="quran" size={22} color={t.accent} />
              <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: t.text }}>Quran</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: t.accent }}>{quranWeekTotal} Min</Text>
              <Text style={{ fontSize: 9, color: t.textDim, marginTop: 2 }}>{surahsRead.length} Suren gelesen</Text>
            </View>
          </View>
          <BarChart
            data={quranData}
            maxValue={maxQuran}
            labels={WEEKDAY_LABELS}
            getColor={(val) => val > 0 ? t.accent : t.border}
            t={t}
          />
        </Card>

        {/* Monthly Comparison */}
        <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: t.text, marginTop: Spacing.md, marginBottom: Spacing.sm }}>Monatsvergleich</Text>
        <Card>
          <Text style={{ fontSize: FontSize.xs, color: t.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.sm }}>Dieser Monat vs. letzter Monat</Text>
          <MonthCompareRow iconName="mosque" isCustom label="Gebete" thisMonth={prayerMonth} lastMonth={prayerLastMonth} t={t} />
          <View style={{ height: 1, backgroundColor: t.border, marginVertical: 4 }} />
          <MonthCompareRow iconName="tasbih" isCustom label="Dhikr" thisMonth={dhikrMonth} lastMonth={dhikrLastMonth} t={t} />
          <View style={{ height: 1, backgroundColor: t.border, marginVertical: 4 }} />
          <MonthCompareRow iconName="quran" isCustom label="Quran (Min)" thisMonth={quranMonth} lastMonth={quranLastMonth} t={t} />
        </Card>

      </ScrollView>
    </SafeAreaView>
  );
}
