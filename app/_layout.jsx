import { useEffect } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Audio } from 'expo-av'; // TODO: Migration zu expo-audio vor SDK 55
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAppStore } from '../hooks/useAppStore';
import { requestNotificationPermission } from '../features/prayer/notifications';
import { initDatabase } from '../lib/database';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import OfflineBanner from '../components/ui/OfflineBanner';
import Onboarding from './onboarding';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 300000, retry: 2 } } });

export default function RootLayout() {
  const theme = useAppStore((s) => s.theme);
  const onboardingComplete = useAppStore((s) => s.onboardingComplete);
  const checkDailyReset = useAppStore((s) => s.checkDailyReset);
  const resetDailyProgressIfNewDay = useAppStore((s) => s.resetDailyProgressIfNewDay);

  const [fontsLoaded] = useFonts({
    'ScheherazadeNew': require('../assets/fonts/ScheherazadeNew-Regular.ttf'),
    'ScheherazadeNew-Bold': require('../assets/fonts/ScheherazadeNew-Bold.ttf'),
  });

  useEffect(() => {
    requestNotificationPermission();
    initDatabase();
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
    }).catch((err) => console.error('[Layout] Audio mode init failed:', err));
    checkDailyReset();
    resetDailyProgressIfNewDay();
  }, []);

  if (!onboardingComplete) {
    return (
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" />
          <Onboarding />
        </QueryClientProvider>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
          <View style={{ flex: 1 }}>
            <OfflineBanner />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="quran/[surah]" options={{ headerShown: true, headerTitle: 'Quran', headerBackTitle: 'Quran', animation: 'none', headerStyle: { backgroundColor: theme === 'dark' ? '#0A1628' : '#F8F6F0' }, headerTintColor: theme === 'dark' ? '#E8E0D4' : '#1A1A2E' }} />
              <Stack.Screen name="profile" options={{ headerShown: true, title: 'Profil', headerStyle: { backgroundColor: theme === 'dark' ? '#0A1628' : '#F8F6F0' }, headerTintColor: theme === 'dark' ? '#E8E0D4' : '#1A1A2E' }} />
              <Stack.Screen name="stats" options={{ headerShown: true, title: 'Statistiken', headerStyle: { backgroundColor: theme === 'dark' ? '#0A1628' : '#F8F6F0' }, headerTintColor: theme === 'dark' ? '#E8E0D4' : '#1A1A2E' }} />
              <Stack.Screen name="calendar" options={{ headerShown: true, title: 'Islamischer Kalender', headerBackTitle: 'Zurück', animation: 'slide_from_right', headerStyle: { backgroundColor: theme === 'dark' ? '#0A1628' : '#F8F6F0' }, headerTintColor: theme === 'dark' ? '#E8E0D4' : '#1A1A2E' }} />
              <Stack.Screen name="duawall" options={{ headerShown: true, title: 'Dua Wall', headerBackTitle: 'Zurück', animation: 'slide_from_right', headerStyle: { backgroundColor: theme === 'dark' ? '#0A1628' : '#F8F6F0' }, headerTintColor: theme === 'dark' ? '#E8E0D4' : '#1A1A2E' }} />
            </Stack>
          </View>
        </ErrorBoundary>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
