function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isToday(dateString) {
  return dateString === todayString();
}

function isYesterday(dateString) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const ys = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  return dateString === ys;
}

export function checkAndUpdateStreak(lastDate, currentStreak) {
  const today = todayString();
  if (lastDate && isToday(lastDate)) {
    return { streak: currentStreak, date: today };
  }
  if (lastDate && isYesterday(lastDate)) {
    return { streak: currentStreak + 1, date: today };
  }
  return { streak: 1, date: today };
}

export function getStreakEmoji(streak) {
  if (streak >= 100) return '\u{1F451}';
  if (streak >= 30) return '\u{1F525}\u{1F525}\u{1F525}';
  if (streak >= 7) return '\u{1F525}\u{1F525}';
  if (streak >= 1) return '\u{1F525}';
  return '';
}

export function getStreakMessage(streak) {
  if (streak >= 30) return 'MashaAllah! Unaufhaltbar!';
  if (streak >= 14) return 'Zwei Wochen stark!';
  if (streak >= 7) return 'Eine Woche! Weiter so!';
  if (streak >= 1) return 'Guter Anfang!';
  return 'Starte deine Streak!';
}
