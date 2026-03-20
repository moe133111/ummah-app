import { Tabs } from 'expo-router';
import { Image } from 'react-native';
import { useAppStore } from '../../hooks/useAppStore';

function TabIcon({ source, focused }) {
  return (
    <Image
      source={source}
      style={{
        width: 24,
        height: 24,
        tintColor: focused ? '#B8860B' : '#8B9BB4',
        resizeMode: 'contain',
      }}
    />
  );
}

export default function TabLayout() {
  const isDark = useAppStore((s) => s.theme === 'dark');
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: { backgroundColor: isDark ? '#0D1B2E' : '#FFFFFF', borderTopWidth: 0, height: 80, paddingBottom: 24, paddingTop: 8 },
      tabBarActiveTintColor: '#B8860B',
      tabBarInactiveTintColor: '#8B9BB4',
      tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      sceneStyle: { backgroundColor: isDark ? '#0A1628' : '#F8F6F0' },
    }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ focused }) => <TabIcon source={require('../../assets/icons/home.png')} focused={focused} /> }} />
      <Tabs.Screen name="quran" options={{ title: 'Quran', tabBarIcon: ({ focused }) => <TabIcon source={require('../../assets/icons/quran.png')} focused={focused} /> }} />
      <Tabs.Screen name="prayer" options={{ title: 'Gebet', tabBarIcon: ({ focused }) => <TabIcon source={require('../../assets/icons/prayer.png')} focused={focused} /> }} />
      <Tabs.Screen name="dhikr" options={{ title: 'Dhikr', tabBarIcon: ({ focused }) => <TabIcon source={require('../../assets/icons/dhikr.png')} focused={focused} /> }} />
      <Tabs.Screen name="more" options={{ title: 'Mehr', tabBarIcon: ({ focused }) => <TabIcon source={require('../../assets/icons/more.png')} focused={focused} /> }} />
    </Tabs>
  );
}
