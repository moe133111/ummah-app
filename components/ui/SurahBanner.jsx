import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Line, Path, Circle } from 'react-native-svg';
import { Spacing, FontSize, BorderRadius, Colors } from '../../constants/theme';

function CornerOrnament({ size = 24, color = '#fff', flipX = false, flipY = false }) {
  const sx = flipX ? -1 : 1;
  const sy = flipY ? -1 : 1;
  const tx = flipX ? size : 0;
  const ty = flipY ? size : 0;
  return (
    <Svg width={size} height={size}>
      <Path
        d={`M${tx},${ty} L${tx + sx * size * 0.8},${ty} M${tx},${ty} L${tx},${ty + sy * size * 0.8}`}
        stroke={color}
        strokeWidth={2}
        fill="none"
        opacity={0.5}
      />
      <Circle cx={tx + sx * 3} cy={ty + sy * 3} r={2} fill={color} opacity={0.4} />
    </Svg>
  );
}

function DecorativeLine({ width, color = '#fff' }) {
  return (
    <View style={{ width, height: 12, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={width} height={12}>
        <Line x1={20} y1={6} x2={width - 20} y2={6} stroke={color} strokeWidth={0.8} opacity={0.3} />
        <Path
          d={`M${width / 2 - 5},6 L${width / 2},1 L${width / 2 + 5},6 L${width / 2},11 Z`}
          fill={color}
          opacity={0.4}
        />
        <Circle cx={30} cy={6} r={1.5} fill={color} opacity={0.3} />
        <Circle cx={width - 30} cy={6} r={1.5} fill={color} opacity={0.3} />
      </Svg>
    </View>
  );
}

export default function SurahBanner({ name, englishName, translation, ayahCount, revelationType }) {
  return (
    <View style={styles.container}>
      {/* Green gradient background */}
      <View style={[StyleSheet.absoluteFill, styles.gradientBg]} />

      {/* Corner ornaments */}
      <View style={styles.cornerTL}><CornerOrnament color="#fff" /></View>
      <View style={styles.cornerTR}><CornerOrnament color="#fff" flipX /></View>
      <View style={styles.cornerBL}><CornerOrnament color="#fff" flipY /></View>
      <View style={styles.cornerBR}><CornerOrnament color="#fff" flipX flipY /></View>

      {/* Top decorative line */}
      <DecorativeLine width={260} color="#fff" />

      {/* Surah name in Arabic */}
      <Text style={styles.arabicName}>{name}</Text>

      {/* English name */}
      <Text style={styles.englishName}>{englishName}</Text>

      {/* Subtitle info */}
      <Text style={styles.info}>
        {translation} · {ayahCount} Ayat · {revelationType === 'Meccan' ? 'Mekkanisch' : 'Medinensisch'}
      </Text>

      {/* Bottom decorative line */}
      <DecorativeLine width={260} color="#fff" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  gradientBg: {
    backgroundColor: Colors.green,
    borderRadius: BorderRadius.sm,
  },
  cornerTL: { position: 'absolute', top: Spacing.sm, left: Spacing.sm },
  cornerTR: { position: 'absolute', top: Spacing.sm, right: Spacing.sm },
  cornerBL: { position: 'absolute', bottom: Spacing.sm, left: Spacing.sm },
  cornerBR: { position: 'absolute', bottom: Spacing.sm, right: Spacing.sm },
  arabicName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginVertical: Spacing.sm,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  englishName: {
    fontSize: FontSize.xl,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  info: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
});
