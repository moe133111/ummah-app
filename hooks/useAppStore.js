import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const useAppStore = create(
  persist(
    (set, get) => ({
      location: null,
      setLocation: (location) => set({ location }),
      theme: 'dark',
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
      calculationMethod: 'MWL',
      setCalculationMethod: (method) => set({ calculationMethod: method }),
      notifications: { fajr: true, sunrise: false, dhuhr: true, asr: true, maghrib: true, isha: true },
      toggleNotification: (prayer) => set((s) => ({ notifications: { ...s.notifications, [prayer]: !s.notifications[prayer] } })),
      quranLanguage: 'ar',
      quranSecondLanguage: '',
      lastReadSurah: 1,
      lastReadAyah: 1,
      setQuranLanguage: (lang) => set({ quranLanguage: lang }),
      setQuranSecondLanguage: (lang) => set({ quranSecondLanguage: lang }),
      setLastRead: (surah, ayah) => set({ lastReadSurah: surah, lastReadAyah: ayah }),
      todayPrayers: { fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false },
      lastTrackerDate: todayString(),
      togglePrayerDone: (prayer) => set((s) => ({ todayPrayers: { ...s.todayPrayers, [prayer]: !s.todayPrayers[prayer] } })),
      streak: 0,
      onboardingComplete: false,
      setOnboardingComplete: () => set({ onboardingComplete: true }),
      appLanguage: 'de',
      setAppLanguage: (lang) => set({ appLanguage: lang }),
      favorites: [],
      toggleFavorite: (id) => set((s) => ({
        favorites: s.favorites.includes(id)
          ? s.favorites.filter((x) => x !== id)
          : [...s.favorites, id],
      })),
      // Called on app start to reset daily tracker if needed
      checkDailyReset: () => {
        const today = todayString();
        const { lastTrackerDate, todayPrayers } = get();
        if (lastTrackerDate !== today) {
          const allDone = Object.values(todayPrayers).filter(Boolean).length === 5;
          set({
            todayPrayers: { fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false },
            lastTrackerDate: today,
            streak: allDone ? get().streak + 1 : 0,
          });
        }
      },
    }),
    {
      name: 'ummah-app-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        theme: state.theme,
        calculationMethod: state.calculationMethod,
        notifications: state.notifications,
        quranLanguage: state.quranLanguage,
        quranSecondLanguage: state.quranSecondLanguage,
        lastReadSurah: state.lastReadSurah,
        lastReadAyah: state.lastReadAyah,
        todayPrayers: state.todayPrayers,
        lastTrackerDate: state.lastTrackerDate,
        streak: state.streak,
        onboardingComplete: state.onboardingComplete,
        appLanguage: state.appLanguage,
        favorites: state.favorites,
      }),
    }
  )
);
