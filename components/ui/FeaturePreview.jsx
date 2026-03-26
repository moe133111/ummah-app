import { View, Text } from 'react-native';
import { useAppStore } from '../../hooks/useAppStore';
import { DarkTheme, LightTheme, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import Card from './Card';

export default function FeaturePreview({ emoji, title, description, phase }) {
  const isDark = useAppStore((s) => s.theme === 'dark');
  const t = isDark ? DarkTheme : LightTheme;
  return (
    <Card centered>
      <Text style={{ fontSize: 40, marginBottom: Spacing.sm }}>{emoji}</Text>
      <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: t.text }}>{title}</Text>
      {description ? (
        <Text style={{ fontSize: FontSize.sm, color: t.textDim, marginTop: 4, textAlign: 'center', lineHeight: 20 }}>{description}</Text>
      ) : null}
      <View style={{ backgroundColor: t.accent + '10', paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.full, marginTop: Spacing.md }}>
        <Text style={{ color: t.accent, fontSize: FontSize.xs, fontWeight: '600' }}>{phase || 'Bald'}</Text>
      </View>
    </Card>
  );
}
