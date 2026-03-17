import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Audio } from 'expo-av';
import * as Notifications from 'expo-notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAppStore } from '../hooks/useAppStore';
import { requestNotificationPermission } from '../features/prayer/notifications';
import { initDatabase } from '../lib/database';
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
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        <Onboarding />
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="quran/[surah]" options={{ headerShown: true, headerStyle: { backgroundColor: theme === 'dark' ? '#0A1628' : '#F8F6F0' }, headerTintColor: theme === 'dark' ? '#E8E0D4' : '#1A1A2E' }} />
        <Stack.Screen name="profile" options={{ headerShown: true, title: 'Profil', headerStyle: { backgroundColor: theme === 'dark' ? '#0A1628' : '#F8F6F0' }, headerTintColor: theme === 'dark' ? '#E8E0D4' : '#1A1A2E' }} />
        <Stack.Screen name="stats" options={{ headerShown: true, title: 'Statistiken', headerStyle: { backgroundColor: theme === 'dark' ? '#0A1628' : '#F8F6F0' }, headerTintColor: theme === 'dark' ? '#E8E0D4' : '#1A1A2E' }} />
      </Stack>
    </QueryClientProvider>
  );
}
