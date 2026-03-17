import { View, Text } from 'react-native';
import Svg, { Line, Circle, Path, Defs, RadialGradient, Stop, Rect, Pattern, G } from 'react-native-svg';
import { Spacing, FontSize, BorderRadius } from '../../constants/theme';

// Ornamental divider line with diamond in the center
export function AyahDivider({ color = '#D4A843', width = '100%' }) {
  return (
    <View style={{ width, alignItems: 'center', justifyContent: 'center', height: 16, opacity: 0.2 }}>
      <Svg width="100%" height={16}>
        <Line x1="10%" y1={8} x2="43%" y2={8} stroke={color} strokeWidth={0.8} />
        {/* Center diamond */}
        <Path d="M50%,2 L53%,8 L50%,14 L47%,8 Z" fill={color} opacity={0.6} />
        <Line x1="57%" y1={8} x2="90%" y2={8} stroke={color} strokeWidth={0.8} />
      </Svg>
    </View>
  );
}

// Simple View-based divider (fallback that avoids SVG percentage issues)
export function AyahDividerSimple({ color = '#D4A843' }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', height: 20, flexDirection: 'row', opacity: 0.2 }}>
      <View style={{ flex: 1, height: 0.8, backgroundColor: color, marginHorizontal: 20 }} />
      <View style={{ width: 8, height: 8, backgroundColor: color, transform: [{ rotate: '45deg' }], opacity: 0.6 }} />
      <View style={{ flex: 1, height: 0.8, backgroundColor: color, marginHorizontal: 20 }} />
    </View>
  );
}

// Decorative Bismillah with ornamental lines
export function BismillahDecoration({ t }) {
  const color = t.accent;
  return (
    <View style={{ marginTop: Spacing.lg, alignItems: 'center', paddingVertical: Spacing.xl, paddingHorizontal: Spacing.lg }}>
      {/* Top ornamental border */}
      <OrnamentalBorder color={color} />

      {/* Bismillah with radial glow */}
      <View style={{ position: 'relative', alignItems: 'center', marginVertical: Spacing.md }}>
        <Svg width={240} height={80} style={{ position: 'absolute', top: -10, left: -20 }}>
          <Defs>
            <RadialGradient id="bismillahGlow" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor={color} stopOpacity={0.08} />
              <Stop offset="100%" stopColor={color} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width={240} height={80} fill="url(#bismillahGlow)" />
        </Svg>
        <Text style={{ fontSize: 28, textAlign: 'center', color: t.accentLight, lineHeight: 50 }}>
          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
        </Text>
      </View>

      {/* Bottom ornamental border */}
      <OrnamentalBorder color={color} />
    </View>
  );
}

// Ornamental line with scroll-like ends
export function OrnamentalBorder({ color = '#D4A843', width = 200 }) {
  const h = 12;
  return (
    <Svg width={width} height={h}>
      {/* Left curl */}
      <Path
        d={`M10,${h / 2} Q20,0 30,${h / 2}`}
        fill="none" stroke={color} strokeWidth={1} opacity={0.4}
      />
      {/* Center line */}
      <Line x1={30} y1={h / 2} x2={width - 30} y2={h / 2} stroke={color} strokeWidth={0.8} opacity={0.3} />
      {/* Center diamond */}
      <Path
        d={`M${width / 2 - 4},${h / 2} L${width / 2},${h / 2 - 4} L${width / 2 + 4},${h / 2} L${width / 2},${h / 2 + 4} Z`}
        fill={color} opacity={0.4}
      />
      {/* Right curl */}
      <Path
        d={`M${width - 30},${h / 2} Q${width - 20},${h} ${width - 10},${h / 2}`}
        fill="none" stroke={color} strokeWidth={1} opacity={0.4}
      />
    </Svg>
  );
}

// Geometric pattern overlay for header background
export function GeometricPattern({ color = '#D4A843', width = 300, height = 200 }) {
  const spacing = 40;
  const r = 18;
  const circles = [];
  let key = 0;
  for (let x = 0; x <= width + spacing; x += spacing) {
    for (let y = 0; y <= height + spacing; y += spacing) {
      circles.push(<Circle key={key++} cx={x} cy={y} r={r} fill="none" stroke={color} strokeWidth={0.5} opacity={0.04} />);
    }
  }

  return (
    <Svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }}>
      {circles}
    </Svg>
  );
}

// Surah header frame with decorative border
export function SurahHeaderFrame({ name, englishName, translation, ayahCount, t }) {
  const color = t.accent;
  return (
    <View style={{ alignItems: 'center', paddingVertical: Spacing.lg, position: 'relative', overflow: 'hidden' }}>
      {/* Geometric pattern background */}
      <GeometricPattern color={color} width={360} height={220} />

      {/* Top ornamental border */}
      <OrnamentalBorder color={color} width={260} />

      {/* Arabic name with glow */}
      <View style={{ marginTop: Spacing.md, marginBottom: Spacing.sm }}>
        <Text style={{
          fontSize: 42,
          fontWeight: '700',
          color: color,
          textAlign: 'center',
          textShadowColor: color + '30',
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 20,
        }}>
          {name}
        </Text>
      </View>

      <Text style={{ fontSize: FontSize.xl, fontWeight: '700', color: t.text, marginTop: 2 }}>{englishName}</Text>
      <Text style={{ fontSize: FontSize.sm, color: t.textDim, marginTop: 4 }}>{translation} · {ayahCount} Ayat</Text>

      {/* Bottom ornamental border */}
      <View style={{ marginTop: Spacing.md }}>
        <OrnamentalBorder color={color} width={260} />
      </View>
    </View>
  );
}
