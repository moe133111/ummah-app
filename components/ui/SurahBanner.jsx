import { View, Text, StyleSheet, Platform } from 'react-native';
import Svg, { Line, Path, Circle } from 'react-native-svg';
import { Spacing, FontSize, BorderRadius, Colors } from '../../constants/theme';

const ARABIC_FONT = 'ScheherazadeNew';
const ARABIC_FONT_BOLD = 'ScheherazadeNew-Bold';
const ARABIC_FONT_FALLBACK = Platform.OS === 'ios' ? 'Al Nile' : 'serif';

function OrnamentalLine({ width, color = Colors.gold }) {
  return (
    <View style={{ width, height: 12, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={width} height={12}>
        <Line x1={0} y1={6} x2={width * 0.4} y2={6} stroke={color} strokeWidth={1} opacity={0.5} />
        <Line x1={width * 0.6} y1={6} x2={width} y2={6} stroke={color} strokeWidth={1} opacity={0.5} />
        <Path
          d={`M${width / 2 - 6},6 L${width / 2},0 L${width / 2 + 6},6 L${width / 2},12 Z`}
          fill={color}
          opacity={0.6}
        />
        <Circle cx={width * 0.4 - 2} cy={6} r={1.5} fill={color} opacity={0.4} />
        <Circle cx={width * 0.6 + 2} cy={6} r={1.5} fill={color} opacity={0.4} />
      </Svg>
    </View>
  );
}

export default function SurahBanner({ name, englishName, translation, ayahCount, revelationType, surahNumber, isDark }) {
  const goldColor = Colors.gold;
  const bgStart = isDark ? 'rgba(184, 134, 11, 0.05)' : 'rgba(184, 134, 11, 0.05)';

  return (
    <View style={[styles.container, { backgroundColor: bgStart }]}>
      {/* Top ornamental line */}
      <OrnamentalLine width={280} color={goldColor} />

      {/* Arabic Surah name — large calligraphy */}
      <Text style={[styles.arabicName, { fontFamily: ARABIC_FONT_BOLD, color: goldColor }]}>
        {name}
      </Text>

      {/* English name */}
      <Text style={[styles.englishName, { color: isDark ? '#E8E0D4' : '#1A1A2E' }]}>
        {englishName}
      </Text>

      {/* German translation */}
      <Text style={[styles.translation, { color: isDark ? '#8B9BB4' : '#666666' }]}>
        {translation}
      </Text>

      {/* Metadata line */}
      <Text style={[styles.metaLine, { color: isDark ? '#8B9BB4' : '#888888' }]}>
        Sure {surahNumber} · {ayahCount} Ayat · {revelationType === 'Meccan' ? 'Mekkanisch' : 'Medinensisch'}
      </Text>

      {/* Bottom ornamental line */}
      <OrnamentalLine width={280} color={goldColor} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
    marginBottom: 16,
  },
  arabicName: {
    fontSize: 40,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    lineHeight: 70,
    textShadowColor: 'rgba(184, 134, 11, 0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  englishName: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  translation: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  metaLine: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: Spacing.md,
    letterSpacing: 0.5,
  },
});
