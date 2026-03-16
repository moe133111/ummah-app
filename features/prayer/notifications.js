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

  for (const [key, enabled] of Object.entries(settings)) {
    if (!enabled || !times[key]) continue;

    const [hour, minute] = times[key].split(':').map(Number);
    const name = PRAYER_LABELS[key] || key;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: name,
        body: `Es ist Zeit für das ${name}-Gebet`,
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
