import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkAndUpdateStreak } from '../features/streaks/streakManager';

function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function yesterdayString() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
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
      setLastRead: (surah, ayah) => {
        const state = get();
        const today = todayString();
        const result = checkAndUpdateStreak(state.lastQuranDate, state.quranStreak);
        set({
          lastReadSurah: surah,
          lastReadAyah: ayah,
          surahsRead: (state.surahsRead || []).includes(surah) ? state.surahsRead : [...(state.surahsRead || []), surah],
          quranStreak: result.streak,
          lastQuranDate: result.date,
          weeklyQuranMinutes: { ...(state.weeklyQuranMinutes || {}), [today]: ((state.weeklyQuranMinutes || {})[today] || 0) + 1 },
        });
        // Track daily quran progress
        get().incrementDailyProgress('quran', 1);
      },
      todayPrayers: { fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false },
      lastTrackerDate: todayString(),
      togglePrayerDone: (prayer) => {
        const state = get();
        const wasOff = !state.todayPrayers[prayer];
        const newPrayers = { ...state.todayPrayers, [prayer]: !state.todayPrayers[prayer] };
        const updates = {
          todayPrayers: newPrayers,
          totalPrayers: wasOff ? (state.totalPrayers || 0) + 1 : Math.max(0, (state.totalPrayers || 0) - 1),
        };

        // Check if all 5 prayers are now done
        const allDone = Object.values(newPrayers).filter(Boolean).length === 5;
        if (allDone) {
          const result = checkAndUpdateStreak(state.lastPrayerDate, state.currentStreak);
          updates.currentStreak = result.streak;
          updates.lastPrayerDate = result.date;
          updates.longestStreak = Math.max(state.longestStreak || 0, result.streak);
        }

        // Track Fajr streak separately
        if (prayer === 'fajr' && wasOff) {
          const fajrResult = checkAndUpdateStreak(state.lastFajrDate, state.fajrStreak);
          updates.fajrStreak = fajrResult.streak;
          updates.lastFajrDate = fajrResult.date;
        }

        // Track weekly prayers
        const today = todayString();
        const prayerCount = Object.values(newPrayers).filter(Boolean).length;
        updates.weeklyPrayers = { ...(state.weeklyPrayers || {}), [today]: prayerCount };

        set(updates);
      },

      // Streak fields
      currentStreak: 0,
      longestStreak: 0,
      lastPrayerDate: null,
      fajrStreak: 0,
      lastFajrDate: null,
      quranStreak: 0,
      lastQuranDate: null,
      dhikrStreak: 0,
      lastDhikrDate: null,
      dailyDhikrGoal: 100,

      streak: 0, // legacy, kept for compat

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
      memberSince: null,

      // Weekly tracking
      weeklyPrayers: {},
      weeklyDhikr: {},
      weeklyQuranMinutes: {},

      incrementDhikr: () => {
        const state = get();
        const newTotal = (state.totalDhikr || 0) + 1;
        const updates = { totalDhikr: newTotal };

        // Check if daily dhikr goal reached
        const todayCount = (state.todayDhikrCount || 0) + 1;
        updates.todayDhikrCount = todayCount;
        if (todayCount >= (state.dailyDhikrGoal || 100)) {
          const result = checkAndUpdateStreak(state.lastDhikrDate, state.dhikrStreak);
          updates.dhikrStreak = result.streak;
          updates.lastDhikrDate = result.date;
        }

        // Track weekly dhikr
        const today = todayString();
        updates.weeklyDhikr = { ...(state.weeklyDhikr || {}), [today]: ((state.weeklyDhikr || {})[today] || 0) + 1 };

        set(updates);

        // Also increment daily progress for dhikr
        get().incrementDailyProgress('dhikr', 1);
      },

      todayDhikrCount: 0,

      // Daily Goals
      dailyGoals: {
        dhikr: { target: 100, enabled: true },
        quran: { target: 10, enabled: true },
        dua: { target: 5, enabled: true },
      },
      dailyProgress: { dhikr: 0, quran: 0, dua: 0, date: null },

      setDailyGoalTarget: (type, target) => set((s) => ({
        dailyGoals: { ...s.dailyGoals, [type]: { ...s.dailyGoals[type], target } },
      })),
      toggleDailyGoal: (type) => set((s) => ({
        dailyGoals: { ...s.dailyGoals, [type]: { ...s.dailyGoals[type], enabled: !s.dailyGoals[type].enabled } },
      })),
      incrementDailyProgress: (type, amount) => {
        const today = todayString();
        set((s) => {
          const dp = s.dailyProgress.date === today ? s.dailyProgress : { dhikr: 0, quran: 0, dua: 0, date: today };
          return { dailyProgress: { ...dp, [type]: dp[type] + (amount || 1), date: today } };
        });
      },
      resetDailyProgressIfNewDay: () => {
        const today = todayString();
        const { dailyProgress } = get();
        if (dailyProgress.date && dailyProgress.date !== today) {
          set({ dailyProgress: { dhikr: 0, quran: 0, dua: 0, date: today } });
        } else if (!dailyProgress.date) {
          set({ dailyProgress: { ...dailyProgress, date: today } });
        }
      },

      // Called on app start to reset daily tracker if needed
      checkDailyReset: () => {
        const today = todayString();
        const state = get();
        const { lastTrackerDate, todayPrayers } = state;
        if (lastTrackerDate !== today) {
          // Check yesterday's prayer completion for streak
          const allDone = Object.values(todayPrayers).filter(Boolean).length === 5;
          const fajrDone = todayPrayers.fajr;
          const yesterday = yesterdayString();

          const updates = {
            todayPrayers: { fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false },
            lastTrackerDate: today,
            todayDhikrCount: 0,
            memberSince: state.memberSince || today,
          };

          // If yesterday all prayers were done and we haven't already recorded it
          if (allDone && state.lastPrayerDate !== yesterday && state.lastPrayerDate !== today) {
            const result = checkAndUpdateStreak(state.lastPrayerDate, state.currentStreak);
            updates.currentStreak = result.streak;
            updates.lastPrayerDate = result.date;
            updates.longestStreak = Math.max(state.longestStreak || 0, result.streak);
          } else if (!allDone && state.lastPrayerDate && state.lastPrayerDate < yesterday) {
            // Streak is broken - but don't reset to 0 until they complete again
            // The streak value stays, checkAndUpdateStreak will reset when next triggered
          }

          // Fajr streak check
          if (fajrDone && state.lastFajrDate !== yesterday && state.lastFajrDate !== today) {
            const fajrResult = checkAndUpdateStreak(state.lastFajrDate, state.fajrStreak);
            updates.fajrStreak = fajrResult.streak;
            updates.lastFajrDate = fajrResult.date;
          }

          // Sync legacy streak field
          updates.streak = updates.currentStreak ?? state.currentStreak;

          set(updates);
        }
        // Set memberSince if not yet set
        if (!get().memberSince) {
          set({ memberSince: today });
        }

        // Cleanup entries older than 60 days
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 60);
        const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`;
        const cleanup = (obj) => {
          if (!obj) return {};
          const result = {};
          for (const key in obj) { if (key >= cutoffStr) result[key] = obj[key]; }
          return result;
        };
        const s = get();
        set({
          weeklyPrayers: cleanup(s.weeklyPrayers),
          weeklyDhikr: cleanup(s.weeklyDhikr),
          weeklyQuranMinutes: cleanup(s.weeklyQuranMinutes),
        });
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
        // New streak fields
        currentStreak: state.currentStreak,
        lastPrayerDate: state.lastPrayerDate,
        lastFajrDate: state.lastFajrDate,
        quranStreak: state.quranStreak,
        lastQuranDate: state.lastQuranDate,
        dhikrStreak: state.dhikrStreak,
        lastDhikrDate: state.lastDhikrDate,
        dailyDhikrGoal: state.dailyDhikrGoal,
        todayDhikrCount: state.todayDhikrCount,
        dailyGoals: state.dailyGoals,
        dailyProgress: state.dailyProgress,
        weeklyPrayers: state.weeklyPrayers,
        weeklyDhikr: state.weeklyDhikr,
        weeklyQuranMinutes: state.weeklyQuranMinutes,
      }),
    }
  )
);
