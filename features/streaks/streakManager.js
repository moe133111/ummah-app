export function getTodayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getYesterdayString() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function calculateStreak(lastDate, currentStreak) {
  const today = getTodayString();
  const yesterday = getYesterdayString();

  if (lastDate === today) {
    // Already counted today — no change
    return { streak: currentStreak, date: today };
  }
  if (lastDate === yesterday) {
    // Active yesterday — continue streak
    return { streak: currentStreak + 1, date: today };
  }
  // More than 1 day gap — reset streak
  return { streak: 1, date: today };
}

export function getStreakEmoji(streak) {
  if (streak >= 100) return '\u{1F451}'; // 👑
  if (streak >= 30) return '\u{1F525}\u{1F525}\u{1F525}'; // 🔥🔥🔥
  if (streak >= 7) return '\u{1F525}\u{1F525}'; // 🔥🔥
  if (streak >= 1) return '\u{1F525}'; // 🔥
  return '\u{1F525}'; // 🔥 (dimmed in UI)
}

export function getStreakMessage(streak) {
  if (streak >= 100) return 'Legende! SubhanAllah!';
  if (streak >= 30) return 'MashaAllah! Unaufhaltbar!';
  if (streak >= 14) return 'Zwei Wochen stark!';
  if (streak >= 7) return 'Eine Woche! Weiter so!';
  if (streak >= 1) return 'Guter Anfang!';
  return 'Starte deine Streak!';
}
