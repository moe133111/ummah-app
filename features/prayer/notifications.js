import * as Notifications from 'expo-notifications';

const PRAYER_LABELS = {
  fajr: 'Fajr',
  sunrise: 'Sunrise',
  dhuhr: 'Dhuhr',
  asr: 'Asr',
  maghrib: 'Maghrib',
  isha: 'Isha',
};

export async function requestNotificationPermission() {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function schedulePrayerNotifications(times, settings) {
  await cancelAllNotifications();

  const granted = await requestNotificationPermission();
  if (!granted) return;

  for (const [key, config] of Object.entries(settings)) {
    // Support both old boolean format and new object format
    const enabled = typeof config === 'boolean' ? config : config?.enabled;
    if (!enabled || !times[key]) continue;

    const minutesBefore = (typeof config === 'object' ? config.minutesBefore : 0) || 0;
    const [rawHour, rawMinute] = times[key].split(':').map(Number);
    const name = PRAYER_LABELS[key] || key;

    // Calculate adjusted time (subtract minutesBefore)
    let totalMinutes = rawHour * 60 + rawMinute - minutesBefore;
    if (totalMinutes < 0) totalMinutes += 1440; // wrap around midnight
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;

    const body = minutesBefore > 0
      ? `${name}-Gebet in ${minutesBefore} Minuten`
      : `Es ist Zeit für das ${name}-Gebet`;

    // TODO: Use adhan sound when config.adhan is true and config.sound !== 'standard'
    await Notifications.scheduleNotificationAsync({
      content: {
        title: name,
        body,
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
  }
}

export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
