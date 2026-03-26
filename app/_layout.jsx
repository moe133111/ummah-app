import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
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
  const isDark = theme === 'dark';
  const onboardingComplete = useAppStore((s) => s.onboardingComplete);
  const checkDailyReset = useAppStore((s) => s.checkDailyReset);
  const resetDailyProgressIfNewDay = useAppStore((s) => s.resetDailyProgressIfNewDay);

  const [fontsLoaded] = useFonts({
    'ScheherazadeNew': require('../assets/fonts/ScheherazadeNew-Regular.ttf'),
    'ScheherazadeNew-Bold': require('../assets/fonts/ScheherazadeNew-Bold.ttf'),
  });

  const [hydrated, setHydrated] = useState(useAppStore.persist.hasHydrated());
  useEffect(() => {
    if (hydrated) return;
    return useAppStore.persist.onFinishHydration(() => setHydrated(true));
  }, [hydrated]);

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

  if (!fontsLoaded || !hydrated) {
    return <View style={{ flex: 1, backgroundColor: '#0A1628' }} />;
  }

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
          <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#0A1628' : '#F8F6F0' }} edges={['top']}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <OfflineBanner />
            <Stack screenOptions={{
              headerShown: false,
              headerStyle: { backgroundColor: isDark ? '#0A1628' : '#F8F6F0' },
              headerTintColor: isDark ? '#E8E0D4' : '#1A1A2E',
              headerTitleStyle: { fontWeight: '600' },
              contentStyle: { backgroundColor: isDark ? '#0A1628' : '#F8F6F0' },
            }}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="quran/[surah]" options={{ headerShown: true, headerBackTitle: 'Quran', title: '' }} />
              <Stack.Screen name="profile" options={{ headerShown: true, headerBackTitle: 'Zurück', title: 'Profil' }} />
              <Stack.Screen name="stats" options={{ headerShown: true, headerBackTitle: 'Zurück', title: 'Statistiken' }} />
              <Stack.Screen name="calendar" options={{ headerShown: true, headerBackTitle: 'Zurück', title: 'Islamischer Kalender', animation: 'slide_from_right' }} />
              <Stack.Screen name="duawall" options={{ headerShown: true, headerBackTitle: 'Zurück', title: 'Dua Wall', animation: 'slide_from_right' }} />
              <Stack.Screen name="learn/alphabet" options={{ headerShown: true, title: 'Arabisches Alphabet', headerBackTitle: 'Quran' }} />
              <Stack.Screen name="learn/tajweed" options={{ headerShown: true, title: 'Tajweed-Grundlagen', headerBackTitle: 'Quran' }} />
              <Stack.Screen name="learn/daily-verse" options={{ headerShown: true, title: 'Vers des Tages', headerBackTitle: 'Quran' }} />
              <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            </Stack>
          </SafeAreaView>
        </ErrorBoundary>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
