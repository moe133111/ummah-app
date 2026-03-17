import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

const SIZE = 44;
const CX = SIZE / 2;
const CY = SIZE / 2;
const OUTER_R = SIZE / 2 - 1;
const INNER_R = OUTER_R - 4;
const DOT_R = 1.8;
const DOT_DIST = (OUTER_R + INNER_R) / 2;

export default function AyahOrnament({ number, color = '#B8860B' }) {
  return (
    <View style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={SIZE} height={SIZE} style={{ position: 'absolute' }}>
        {/* Outer ring */}
        <Circle cx={CX} cy={CY} r={OUTER_R} fill="none" stroke={color} strokeWidth={1.5} opacity={0.85} />
        {/* Inner ring */}
        <Circle cx={CX} cy={CY} r={INNER_R} fill="none" stroke={color} strokeWidth={1} opacity={0.6} />
        {/* Inner fill */}
        <Circle cx={CX} cy={CY} r={INNER_R - 1} fill={color} fillOpacity={0.08} />
        {/* Decoration dots at 4 cardinal positions */}
        <Circle cx={CX} cy={CY - DOT_DIST} r={DOT_R} fill={color} opacity={0.7} />
        <Circle cx={CX} cy={CY + DOT_DIST} r={DOT_R} fill={color} opacity={0.7} />
        <Circle cx={CX - DOT_DIST} cy={CY} r={DOT_R} fill={color} opacity={0.7} />
        <Circle cx={CX + DOT_DIST} cy={CY} r={DOT_R} fill={color} opacity={0.7} />
      </Svg>
      <Text style={{ fontSize: 14, fontWeight: '700', color, textAlign: 'center' }}>{number}</Text>
    </View>
  );
}
