import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useAppStore } from '../../hooks/useAppStore';
import { DarkTheme, LightTheme } from '../../constants/theme';

function TabIcon({ emoji, focused }) {
  return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>;
}

export default function TabLayout() {
  const isDark = useAppStore((s) => s.theme === 'dark');
  const t = isDark ? DarkTheme : LightTheme;
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarStyle: { backgroundColor: isDark ? '#0D1B2E' : '#FFFFFF', borderTopColor: t.border, borderTopWidth: 1, height: 85, paddingBottom: 28, paddingTop: 8 }, tabBarActiveTintColor: t.accent, tabBarInactiveTintColor: t.textDim, tabBarLabelStyle: { fontSize: 11, fontWeight: '600' }, sceneStyle: { backgroundColor: isDark ? '#0A1628' : '#F8F6F0' } }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ focused }) => <TabIcon emoji="🕌" focused={focused} /> }} />
      <Tabs.Screen name="quran" options={{ title: 'Quran', tabBarIcon: ({ focused }) => <TabIcon emoji="📖" focused={focused} /> }} />
      <Tabs.Screen name="prayer" options={{ title: 'Gebet', tabBarIcon: ({ focused }) => <TabIcon emoji="🕐" focused={focused} /> }} />
      <Tabs.Screen name="dhikr" options={{ title: 'Dhikr', tabBarIcon: ({ focused }) => <TabIcon emoji="📿" focused={focused} /> }} />
      <Tabs.Screen name="more" options={{ title: 'Mehr', tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️" focused={focused} /> }} />
    </Tabs>
  );
}
