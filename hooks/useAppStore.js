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
      setLastRead: (surah, ayah) => set((s) => ({
        lastReadSurah: surah,
        lastReadAyah: ayah,
        surahsRead: (s.surahsRead || []).includes(surah) ? s.surahsRead : [...(s.surahsRead || []), surah],
      })),
      todayPrayers: { fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false },
      lastTrackerDate: todayString(),
      togglePrayerDone: (prayer) => set((s) => {
        const wasOff = !s.todayPrayers[prayer];
        return {
          todayPrayers: { ...s.todayPrayers, [prayer]: !s.todayPrayers[prayer] },
          totalPrayers: wasOff ? (s.totalPrayers || 0) + 1 : Math.max(0, (s.totalPrayers || 0) - 1),
        };
      }),
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

      // Profile stats
      totalPrayers: 0,
      totalDhikr: 0,
      surahsRead: [],
      longestStreak: 0,
      fajrStreak: 0,
      memberSince: null,

      incrementDhikr: () => set((s) => ({ totalDhikr: (s.totalDhikr || 0) + 1 })),

      // Called on app start to reset daily tracker if needed
      checkDailyReset: () => {
        const today = todayString();
        const { lastTrackerDate, todayPrayers, streak, longestStreak, fajrStreak } = get();
        if (lastTrackerDate !== today) {
          const allDone = Object.values(todayPrayers).filter(Boolean).length === 5;
          const fajrDone = todayPrayers.fajr;
          const newStreak = allDone ? streak + 1 : 0;
          const newFajrStreak = fajrDone ? (fajrStreak || 0) + 1 : 0;
          set({
            todayPrayers: { fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false },
            lastTrackerDate: today,
            streak: newStreak,
            longestStreak: Math.max(longestStreak || 0, newStreak),
            fajrStreak: newFajrStreak,
            memberSince: get().memberSince || today,
          });
        }
        // Set memberSince if not yet set
        if (!get().memberSince) {
          set({ memberSince: today });
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
        totalPrayers: state.totalPrayers,
        totalDhikr: state.totalDhikr,
        surahsRead: state.surahsRead,
        longestStreak: state.longestStreak,
        fajrStreak: state.fajrStreak,
        memberSince: state.memberSince,
      }),
    }
  )
);
