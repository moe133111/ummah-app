import { View, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';

// 8-pointed star (octagram) as Ayah number frame
export default function AyahMarker({ number, size = 36, color = '#D4A843' }) {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 1;
  const innerR = outerR * 0.55;

  // Generate 8-pointed star path
  const points = [];
  for (let i = 0; i < 16; i++) {
    const angle = (Math.PI * 2 * i) / 16 - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    points.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  const d = `M${points[0]} ${points.slice(1).map((p) => `L${p}`).join(' ')} Z`;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Path d={d} fill="none" stroke={color} strokeWidth={1.5} opacity={0.8} />
      </Svg>
      <Text style={{ fontSize: size * 0.33, fontWeight: '600', color, textAlign: 'center' }}>{number}</Text>
    </View>
  );
}
