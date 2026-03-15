import { View, StyleSheet } from 'react-native';
import { DarkTheme, LightTheme, BorderRadius, Spacing } from '../../constants/theme';
import { useAppStore } from '../../hooks/useAppStore';

export default function Card({ children, style, centered }) {
  const isDark = useAppStore((s) => s.theme === 'dark');
  const t = isDark ? DarkTheme : LightTheme;
  return (
    <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }, centered && styles.centered, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.lg, marginBottom: Spacing.md },
  centered: { alignItems: 'center' },
});
