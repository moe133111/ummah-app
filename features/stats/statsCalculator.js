function dateString(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Returns Monday of the current week
function getMonday(ref) {
  const d = new Date(ref);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d;
}

// Returns array of 7 values (Mo-So) for the current week
export function getWeekData(weeklyData) {
  const monday = getMonday(new Date());
  const result = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = dateString(d);
    result.push(weeklyData[key] || 0);
  }
  return result;
}

// Returns array of 7 values for last week (Mo-So)
export function getLastWeekData(weeklyData) {
  const monday = getMonday(new Date());
  monday.setDate(monday.getDate() - 7);
  const result = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = dateString(d);
    result.push(weeklyData[key] || 0);
  }
  return result;
}

export function getWeekTotal(weeklyData) {
  return getWeekData(weeklyData).reduce((a, b) => a + b, 0);
}

export function getLastWeekTotal(weeklyData) {
  return getLastWeekData(weeklyData).reduce((a, b) => a + b, 0);
}

export function getMonthTotal(weeklyData) {
  const today = new Date();
  let total = 0;
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    total += weeklyData[dateString(d)] || 0;
  }
  return total;
}

export function getLastMonthTotal(weeklyData) {
  const today = new Date();
  let total = 0;
  for (let i = 30; i < 60; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    total += weeklyData[dateString(d)] || 0;
  }
  return total;
}

export function getTrend(weeklyData) {
  const thisWeek = getWeekTotal(weeklyData);
  const lastWeek = getLastWeekTotal(weeklyData);
  if (thisWeek > lastWeek) return 'up';
  if (thisWeek < lastWeek) return 'down';
  return 'same';
}

export function getTrendPercent(weeklyData) {
  const thisMonth = getMonthTotal(weeklyData);
  const lastMonth = getLastMonthTotal(weeklyData);
  if (lastMonth === 0) return thisMonth > 0 ? 100 : 0;
  return Math.round(((thisMonth - lastMonth) / lastMonth) * 100);
}

export const WEEKDAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
