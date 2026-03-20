import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { calculateStreak, getTodayString, getYesterdayString } from '../features/streaks/streakManager';

export const useAppStore = create(
  persist(
    (set, get) => ({
      location: null,
      setLocation: (location) => set({ location }),
      theme: 'dark',
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
      setTheme: (theme) => set({ theme }),
      calculationMethod: 'MWL',
      setCalculationMethod: (method) => set({ calculationMethod: method }),
      compassPermissionGranted: false,
      setCompassPermission: (granted) => set({ compassPermissionGranted: granted }),
      notifications: {
        fajr: { enabled: true, adhan: false, minutesBefore: 0 },
        sunrise: { enabled: false, adhan: false, minutesBefore: 0 },
        dhuhr: { enabled: true, adhan: false, minutesBefore: 0 },
        asr: { enabled: true, adhan: false, minutesBefore: 0 },
        maghrib: { enabled: true, adhan: false, minutesBefore: 0 },
        isha: { enabled: true, adhan: false, minutesBefore: 0 },
      },
      toggleNotification: (prayer) => set((s) => {
        const current = s.notifications[prayer];
        const wasEnabled = typeof current === 'boolean' ? current : current?.enabled;
        return {
          notifications: {
            ...s.notifications,
            [prayer]: { ...(typeof current === 'object' ? current : { adhan: false, minutesBefore: 0 }), enabled: !wasEnabled },
          },
        };
      }),
      updateNotificationSetting: (prayer, settings) => set((s) => {
        const current = s.notifications[prayer];
        const base = typeof current === 'object' ? current : { enabled: !!current, adhan: false, minutesBefore: 0 };
        return {
          notifications: {
            ...s.notifications,
            [prayer]: { ...base, ...settings },
          },
        };
      }),
      quranLanguage: 'ar',
      quranSecondLanguage: '',
      lastReadSurah: 1,
      lastReadAyah: 1,
      setQuranLanguage: (lang) => set({ quranLanguage: lang }),
      setQuranSecondLanguage: (lang) => set({ quranSecondLanguage: lang }),
      setLastRead: (surah, ayah) => {
        const state = get();
        const today = getTodayString();
        const result = calculateStreak(state.lastQuranDate, state.quranStreak);
        set({
          lastReadSurah: surah,
          lastReadAyah: ayah,
          surahsRead: (state.surahsRead || []).includes(surah) ? state.surahsRead : [...(state.surahsRead || []), surah],
          quranStreak: result.streak,
          lastQuranDate: result.date,
          weeklyQuranMinutes: { ...(state.weeklyQuranMinutes || {}), [today]: ((state.weeklyQuranMinutes || {})[today] || 0) + 1 },
        });
        get().incrementDailyProgress('quran', 1);
      },
      todayPrayers: { fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false },
      lastTrackerDate: getTodayString(),
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
          const result = calculateStreak(state.lastStreakDate, state.currentStreak);
          updates.currentStreak = result.streak;
          updates.lastStreakDate = result.date;
          updates.longestStreak = Math.max(state.longestStreak || 0, result.streak);
        }

        // Track Fajr streak separately
        if (prayer === 'fajr' && wasOff) {
          const fajrResult = calculateStreak(state.lastFajrDate, state.fajrStreak);
          updates.fajrStreak = fajrResult.streak;
          updates.lastFajrDate = fajrResult.date;
        }

        // Track weekly prayers
        const today = getTodayString();
        const prayerCount = Object.values(newPrayers).filter(Boolean).length;
        updates.weeklyPrayers = { ...(state.weeklyPrayers || {}), [today]: prayerCount };

        set(updates);
      },

      // Streak fields
      currentStreak: 0,
      longestStreak: 0,
      lastStreakDate: null,
      fajrStreak: 0,
      lastFajrDate: null,
      quranStreak: 0,
      lastQuranDate: null,
      dhikrStreak: 0,
      lastDhikrDate: null,
      dailyDhikrGoal: 100,

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
        const today = getTodayString();
        const updates = { totalDhikr: newTotal };

        // Check if daily dhikr goal reached
        const todayCount = (state.todayDhikrCount || 0) + 1;
        updates.todayDhikrCount = todayCount;
        if (todayCount >= (state.dailyDhikrGoal || 100)) {
          const result = calculateStreak(state.lastDhikrDate, state.dhikrStreak);
          updates.dhikrStreak = result.streak;
          updates.lastDhikrDate = result.date;
        }

        // Track weekly dhikr
        updates.weeklyDhikr = { ...(state.weeklyDhikr || {}), [today]: ((state.weeklyDhikr || {})[today] || 0) + 1 };

        set(updates);
        get().incrementDailyProgress('dhikr', 1);
      },

      todayDhikrCount: 0,

      // Adhkar tracking
      adhkarCounts: { morning: {}, evening: {} },
      lastAdhkarDate: null,
      incrementAdhkar: (period, adhkarId) => {
        const today = getTodayString();
        set((s) => {
          const counts = s.lastAdhkarDate === today ? s.adhkarCounts : { morning: {}, evening: {} };
          return {
            adhkarCounts: {
              ...counts,
              [period]: { ...counts[period], [adhkarId]: (counts[period]?.[adhkarId] || 0) + 1 },
            },
            lastAdhkarDate: today,
          };
        });
      },
      resetAdhkarIfNewDay: () => {
        const today = getTodayString();
        const { lastAdhkarDate } = get();
        if (lastAdhkarDate && lastAdhkarDate !== today) {
          set({ adhkarCounts: { morning: {}, evening: {} }, lastAdhkarDate: today });
        } else if (!lastAdhkarDate) {
          set({ lastAdhkarDate: today });
        }
      },

      // Dua Wall — user-posted duas (persisted locally)
      userDuas: [],
      addUserDua: (text) => set((s) => ({
        userDuas: [
          { id: `u${Date.now()}`, text, timestamp: Date.now(), ameenCount: 0, heartCount: 0 },
          ...s.userDuas,
        ],
      })),

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
        const today = getTodayString();
        set((s) => {
          const dp = s.dailyProgress.date === today ? s.dailyProgress : { dhikr: 0, quran: 0, dua: 0, date: today };
          return { dailyProgress: { ...dp, [type]: dp[type] + (amount || 1), date: today } };
        });
      },
      resetDailyProgressIfNewDay: () => {
        const today = getTodayString();
        const { dailyProgress } = get();
        if (dailyProgress.date && dailyProgress.date !== today) {
          set({ dailyProgress: { dhikr: 0, quran: 0, dua: 0, date: today } });
        } else if (!dailyProgress.date) {
          set({ dailyProgress: { ...dailyProgress, date: today } });
        }
      },

      // Called on app start to reset daily tracker if needed
      checkDailyReset: () => {
        const today = getTodayString();
        const yesterday = getYesterdayString();
        const state = get();
        const { lastTrackerDate, todayPrayers } = state;

        if (lastTrackerDate === today) {
          // Already reset today, just ensure memberSince
          if (!state.memberSince) set({ memberSince: today });
          return;
        }

        const updates = {
          todayPrayers: { fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false },
          lastTrackerDate: today,
          todayDhikrCount: 0,
          memberSince: state.memberSince || today,
        };

        // Only process yesterday's prayer data if lastTrackerDate was yesterday.
        // If >1 day gap, todayPrayers is stale and should NOT be used.
        if (lastTrackerDate === yesterday) {
          const allDone = Object.values(todayPrayers).filter(Boolean).length === 5;
          const fajrDone = todayPrayers.fajr;

          // If all prayers were done yesterday and not yet recorded via togglePrayerDone
          if (allDone && state.lastStreakDate !== yesterday) {
            const result = calculateStreak(state.lastStreakDate, state.currentStreak);
            updates.currentStreak = result.streak;
            updates.lastStreakDate = result.date;
            updates.longestStreak = Math.max(state.longestStreak || 0, result.streak);
          }

          // Fajr streak check for yesterday
          if (fajrDone && state.lastFajrDate !== yesterday) {
            const fajrResult = calculateStreak(state.lastFajrDate, state.fajrStreak);
            updates.fajrStreak = fajrResult.streak;
            updates.lastFajrDate = fajrResult.date;
          }
        }
        // If lastTrackerDate < yesterday: todayPrayers is stale data from >1 day ago.
        // Streaks will naturally break on next trigger (calculateStreak handles the gap).

        set(updates);

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
        onboardingComplete: state.onboardingComplete,
        appLanguage: state.appLanguage,
        favorites: state.favorites,
        totalPrayers: state.totalPrayers,
        totalDhikr: state.totalDhikr,
        surahsRead: state.surahsRead,
        memberSince: state.memberSince,
        // Streak fields
        currentStreak: state.currentStreak,
        longestStreak: state.longestStreak,
        lastStreakDate: state.lastStreakDate,
        fajrStreak: state.fajrStreak,
        lastFajrDate: state.lastFajrDate,
        quranStreak: state.quranStreak,
        lastQuranDate: state.lastQuranDate,
        dhikrStreak: state.dhikrStreak,
        lastDhikrDate: state.lastDhikrDate,
        dailyDhikrGoal: state.dailyDhikrGoal,
        todayDhikrCount: state.todayDhikrCount,
        adhkarCounts: state.adhkarCounts,
        lastAdhkarDate: state.lastAdhkarDate,
        dailyGoals: state.dailyGoals,
        dailyProgress: state.dailyProgress,
        weeklyPrayers: state.weeklyPrayers,
        weeklyDhikr: state.weeklyDhikr,
        weeklyQuranMinutes: state.weeklyQuranMinutes,
        userDuas: state.userDuas,
      }),
      // Migrate old lastPrayerDate → lastStreakDate
      migrate: (persisted) => {
        if (persisted.lastPrayerDate && !persisted.lastStreakDate) {
          persisted.lastStreakDate = persisted.lastPrayerDate;
          delete persisted.lastPrayerDate;
        }
        delete persisted.streak;
        // Migrate notification minutesBefore: clamp legacy 30 to 15
        if (persisted.notifications && typeof persisted.notifications === 'object') {
          for (const key of Object.keys(persisted.notifications)) {
            const val = persisted.notifications[key];
            if (typeof val === 'object' && val !== null) {
              if (val.minutesBefore === 30) {
                val.minutesBefore = 15;
              }
            }
          }
        }
        return persisted;
      },
      version: 1,
    }
  )
);
