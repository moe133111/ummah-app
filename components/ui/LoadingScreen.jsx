import { View, Text, ActivityIndicator } from 'react-native';
import { useAppStore } from '../../hooks/useAppStore';
import { DarkTheme, LightTheme } from '../../constants/theme';

export default function LoadingScreen({ message = 'Wird geladen...' }) {
  const isDark = useAppStore((s) => s.theme === 'dark');
  const t = isDark ? DarkTheme : LightTheme;

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bg, padding: 32 }}>
      <ActivityIndicator size="large" color={t.accent} style={{ marginBottom: 16 }} />
      <Text style={{ fontSize: 14, color: t.textDim }}>{message}</Text>
    </View>
  );
}
