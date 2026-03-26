import { View, Text, StyleSheet, ScrollView, Pressable, Platform, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Audio } from 'expo-av'; // TODO: Migration zu expo-audio vor SDK 55
import Svg, { Circle, Line, Text as SvgText, G, Defs, RadialGradient, Stop } from 'react-native-svg';
import { useLocation } from '../../hooks/useLocation';
import { useAppStore } from '../../hooks/useAppStore';
import { fetchPrayerTimes, getNextPrayer, calculateQiblaDirection, distanceToKaaba } from '../../features/prayer/prayerCalculation';
import { schedulePrayerNotifications } from '../../features/prayer/notifications';
import { useCompass, requestIOSPermission } from '../../features/qibla/useCompass';
import { DarkTheme, LightTheme, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { PRAYER_META, TRACKABLE_KEYS } from '../../features/prayer/prayerMeta';
import { Ionicons } from '@expo/vector-icons';
import Card from '../../components/ui/Card';
import HeaderBar from '../../components/ui/HeaderBar';
import QiblaMap from '../../components/ui/QiblaMap';
import MosqueMap from '../../components/ui/MosqueMap';

const REMINDER_OPTIONS = [
  { value: 0, label: 'Sofort' },
  { value: 5, label: '5 Min' },
  { value: 10, label: '10 Min' },
  { value: 15, label: '15 Min' },
];

const COMPASS_SIZE = 280;
const CX = COMPASS_SIZE / 2;
const CY = COMPASS_SIZE / 2;
const OUTER_R = 134;
const INNER_R = 110;
const TICK_R = OUTER_R - 2;
const LABEL_R = 95;

const DE_WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const DE_MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

function toDateString(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatGregorianDE(d) {
  return `${DE_WEEKDAYS[d.getDay()]}, ${d.getDate()}. ${DE_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function gregorianToHijri(date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();

  let jd = Math.floor((11 * y + 3) / 30) + 354 * y + 30 * m - Math.floor((m - 1) / 2) + d + 1948440 - 385;
  // More accurate: use the standard algorithm
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  jd = d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;

  const l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  const ll = l - 10631 * n + 354;
  const j = Math.floor((10985 - ll) / 5316) * Math.floor((50 * ll) / 17719) + Math.floor(ll / 5670) * Math.floor((43 * ll) / 15238);
  const lll = ll - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const hijriMonth = Math.floor((24 * lll) / 709);
  const hijriDay = lll - Math.floor((709 * hijriMonth) / 24);
  const hijriYear = 30 * n + j - 30;

  const hijriMonths = [
    'Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani',
    'Jumada al-Ula', 'Jumada al-Thani', 'Rajab', 'Sha\'ban',
    'Ramadan', 'Shawwal', 'Dhul-Qi\'dah', 'Dhul-Hijjah',
  ];

  return `${hijriDay}. ${hijriMonths[hijriMonth - 1] || ''} ${hijriYear}`;
}

function isNightTime(times) {
  if (!times) return false;
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  const [ih, im] = times.isha.split(':').map(Number);
  const [fh, fm] = times.fajr.split(':').map(Number);
  return cur >= ih * 60 + im || cur < fh * 60 + fm;
}

function NightStars({ t }) {
  const stars = Array.from({ length: 20 }, (_, i) => ({
    left: `${(i * 37 + 13) % 100}%`,
    top: (i * 23 + 7) % 60,
    opacity: 0.1 + (i % 5) * 0.06,
    size: 2 + (i % 3),
  }));
  return (
    <View style={StyleSheet.absoluteFill}>
      {stars.map((s, i) => (
        <View key={i} style={{ position: 'absolute', left: s.left, top: s.top, width: s.size, height: s.size, borderRadius: s.size / 2, backgroundColor: '#fff', opacity: s.opacity }} />
      ))}
    </View>
  );
}

// Helper to read notification settings (supports old boolean and new object format)
function getNotifSettings(notifications, key) {
  const val = notifications[key];
  if (typeof val === 'boolean') return { enabled: val, adhan: false, minutesBefore: 0 };
  if (typeof val === 'object' && val !== null) return val;
  return { enabled: false, adhan: false, minutesBefore: 0 };
}

function NotificationSettingsModal({ visible, onClose, prayerKey, t }) {
  const notifications = useAppStore((s) => s.notifications);
  const updateNotificationSetting = useAppStore((s) => s.updateNotificationSetting);
  const toggleNotification = useAppStore((s) => s.toggleNotification);
  const settings = getNotifSettings(notifications, prayerKey);
  const meta = PRAYER_META[prayerKey];
  const previewSoundRef = useRef(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);

  const handleToggleEnabled = () => toggleNotification(prayerKey);
  const handleToggleAdhan = () => updateNotificationSetting(prayerKey, { adhan: !settings.adhan });
  const handleSetMinutes = (min) => updateNotificationSetting(prayerKey, { minutesBefore: min });

  // Initialize audio mode
  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    }).catch(() => {});
  }, []);

  async function previewAdhan() {
    // Toggle: if playing → stop
    if (previewSoundRef.current) {
      try {
        await previewSoundRef.current.stopAsync();
        await previewSoundRef.current.unloadAsync();
      } catch {}
      previewSoundRef.current = null;
      setPreviewPlaying(false);
      return;
    }

    try {
      setPreviewPlaying(true);
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/audio/adhan.mp3'),
        { shouldPlay: true }
      );
      previewSoundRef.current = sound;

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setPreviewPlaying(false);
          previewSoundRef.current = null;
        }
      });

      // Auto-stop after 15 seconds preview
      setTimeout(async () => {
        if (previewSoundRef.current === sound) {
          try { await sound.stopAsync(); await sound.unloadAsync(); } catch {}
          previewSoundRef.current = null;
          setPreviewPlaying(false);
        }
      }, 15000);
    } catch (error) {
      console.error('Adhan error:', error);
      setPreviewPlaying(false);
    }
  }

  const handleClose = useCallback(() => {
    if (previewSoundRef.current) {
      previewSoundRef.current.stopAsync().catch(() => {});
      previewSoundRef.current.unloadAsync().catch(() => {});
      previewSoundRef.current = null;
      setPreviewPlaying(false);
    }
    onClose();
  }, [onClose]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (previewSoundRef.current) {
        previewSoundRef.current.unloadAsync().catch(() => {});
        previewSoundRef.current = null;
      }
    };
  }, []);

  if (!meta) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={handleClose} />
        <View style={{ backgroundColor: t.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 }}>
          {/* Drag handle */}
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: t.textDim + '40' }} />
          </View>

          {/* Title */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
            <Ionicons name={meta.icon} size={28} color={meta.color} style={{ marginRight: 12 }} />
            <Text style={{ fontSize: 18, fontWeight: '700', color: t.text, flex: 1 }}>{meta.name} Benachrichtigung</Text>
          </View>

          {/* Toggle: Benachrichtigung aktiv */}
          <Pressable onPress={handleToggleEnabled} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: t.border }}>
            <Text style={{ fontSize: 15, color: t.text }}>Benachrichtigung aktiv</Text>
            <View style={{ width: 48, height: 28, borderRadius: 14, backgroundColor: settings.enabled ? t.accent : t.border, justifyContent: 'center', paddingHorizontal: 2 }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', alignSelf: settings.enabled ? 'flex-end' : 'flex-start' }} />
            </View>
          </Pressable>

          {/* Toggle: Adhan abspielen (only if notification enabled) */}
          {settings.enabled && (
            <Pressable onPress={handleToggleAdhan} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: t.border }}>
              <Text style={{ fontSize: 15, color: t.text }}>Adhan abspielen</Text>
              <View style={{ width: 48, height: 28, borderRadius: 14, backgroundColor: settings.adhan ? t.accent : t.border, justifyContent: 'center', paddingHorizontal: 2 }}>
                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', alignSelf: settings.adhan ? 'flex-end' : 'flex-start' }} />
              </View>
            </Pressable>
          )}

          {/* Adhan preview button (only if adhan enabled) */}
          {settings.enabled && settings.adhan && (
            <Pressable
              onPress={previewAdhan}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                paddingVertical: 12, paddingHorizontal: 24, marginTop: 12,
                borderRadius: 12, borderWidth: 1, borderColor: '#B8860B',
                backgroundColor: previewPlaying ? '#B8860B15' : 'transparent',
              }}
            >
              <Ionicons name={previewPlaying ? 'stop' : 'play'} size={18} color="#B8860B" />
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#B8860B' }}>{previewPlaying ? 'Stoppen' : 'Adhan anhören'}</Text>
            </Pressable>
          )}

          {/* Erinnerung vorher */}
          <View style={{ marginTop: 12 }}>
            <Text style={{ fontSize: 13, color: t.textDim, marginBottom: 8 }}>Erinnerung vorher</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {REMINDER_OPTIONS.map((opt) => {
                const active = settings.minutesBefore === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => handleSetMinutes(opt.value)}
                    style={{
                      flex: 1, alignItems: 'center',
                      paddingVertical: 10, borderRadius: 10, borderWidth: 1,
                      borderColor: active ? t.accent : t.border,
                      backgroundColor: active ? t.accent + '15' : 'transparent',
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: active ? '600' : '400', color: active ? t.accent : t.textDim }}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Speichern */}
          <Pressable onPress={handleClose} style={{ marginTop: 24, backgroundColor: t.accent, paddingVertical: 14, borderRadius: 12, alignItems: 'center' }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#0A1628' }}>Speichern</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export default function PrayerScreen() {
  const { location, loading, error: locationError } = useLocation();
  const isDark = useAppStore((s) => s.theme === 'dark');
  const method = useAppStore((s) => s.calculationMethod);
  const todayPrayers = useAppStore((s) => s.todayPrayers);
  const togglePrayerDone = useAppStore((s) => s.togglePrayerDone);
  const notifications = useAppStore((s) => s.notifications);
  const toggleNotification = useAppStore((s) => s.toggleNotification);
  const t = isDark ? DarkTheme : LightTheme;
  const [tab, setTab] = useState('times');
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [settingsModal, setSettingsModal] = useState(null); // prayer key or null

  const today = useMemo(() => new Date(), []);
  const isToday = isSameDay(selectedDate, today);
  const dateString = toDateString(selectedDate);

  const canGoBack = useMemo(() => {
    const min = new Date(today);
    min.setDate(min.getDate() - 7);
    return selectedDate > min;
  }, [selectedDate, today]);

  const canGoForward = useMemo(() => {
    const max = new Date(today);
    max.setDate(max.getDate() + 7);
    return selectedDate < max;
  }, [selectedDate, today]);

  const goBack = useCallback(() => {
    if (!canGoBack) return;
    setSelectedDate((d) => { const n = new Date(d); n.setDate(n.getDate() - 1); return n; });
  }, [canGoBack]);

  const goForward = useCallback(() => {
    if (!canGoForward) return;
    setSelectedDate((d) => { const n = new Date(d); n.setDate(n.getDate() + 1); return n; });
  }, [canGoForward]);

  const goToday = useCallback(() => setSelectedDate(new Date()), []);

  const { data: prayerData, isLoading: timesLoading } = useQuery({
    queryKey: ['prayerTimes', location?.lat, location?.lng, method, dateString],
    queryFn: () => fetchPrayerTimes(location.lat, location.lng, method, selectedDate),
    enabled: !!location,
    staleTime: 1000 * 60 * 60,
  });

  const times = prayerData?.times || null;
  const prayerSource = prayerData?.source || null;
  const nextPrayer = useMemo(() => (isToday && times ? getNextPrayer(times) : null), [times, isToday]);
  const completedCount = Object.values(todayPrayers).filter(Boolean).length;
  const activeNotifCount = TRACKABLE_KEYS.filter((k) => getNotifSettings(notifications, k).enabled).length;
  const allNotifsOn = activeNotifCount === TRACKABLE_KEYS.length;
  const nightMode = times ? isNightTime(times) : false;

  const toggleAllNotifications = () => {
    const targetState = !allNotifsOn;
    TRACKABLE_KEYS.forEach((k) => {
      const current = getNotifSettings(notifications, k);
      if (current.enabled !== targetState) toggleNotification(k);
    });
  };

  useEffect(() => {
    if (times) {
      schedulePrayerNotifications(times, notifications);
    }
  }, [times, notifications]);

  const qibla = location ? calculateQiblaDirection(location.lat, location.lng) : null;
  const dist = location ? distanceToKaaba(location.lat, location.lng) : null;

  const tabs = [
    { id: 'times', label: 'Zeiten', icon: 'time-outline' },
    { id: 'qibla', label: 'Qibla', icon: 'compass-outline' },
    { id: 'mosques', label: 'Moscheen', icon: 'business-outline' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={[]}>
      <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 16 }}>
        <HeaderBar title="Gebet" t={t} />

        <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg }}>
          {tabs.map((tb) => (
            <Pressable
              key={tb.id}
              style={[styles.tab, tab === tb.id && { backgroundColor: t.accent + '18', borderColor: t.accent + '44' }]}
              onPress={() => setTab(tb.id)}
            >
              <Ionicons name={tb.icon} size={20} color={tab === tb.id ? t.accent : t.textDim} style={{ marginBottom: Spacing.xs }} />
              <Text style={{ fontSize: FontSize.xs, fontWeight: '600', color: tab === tb.id ? t.accent : t.textDim }}>{tb.label}</Text>
            </Pressable>
          ))}
        </View>

        {tab === 'times' && (
          <>
            {/* Date Navigation */}
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Pressable onPress={goBack} style={styles.dateArrow} disabled={!canGoBack}>
                  <Text style={{ fontSize: 20, color: canGoBack ? t.accent : t.textDim + '44' }}>←</Text>
                </Pressable>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontSize: FontSize.sm, color: t.textDim }}>{formatGregorianDE(selectedDate)}</Text>
                  <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: t.accent, marginTop: Spacing.xs }}>{gregorianToHijri(selectedDate)}</Text>
                  {!isToday && (
                    <Pressable onPress={goToday} style={[styles.todayBtn, { borderColor: t.accent + '44' }]}>
                      <Text style={{ fontSize: FontSize.xs, color: t.accent, fontWeight: '600' }}>Heute</Text>
                    </Pressable>
                  )}
                </View>
                <Pressable onPress={goForward} style={styles.dateArrow} disabled={!canGoForward}>
                  <Text style={{ fontSize: 20, color: canGoForward ? t.accent : t.textDim + '44' }}>→</Text>
                </Pressable>
              </View>
            </Card>

            {/* Next prayer hero card */}
            {nextPrayer && (() => {
              const nextMeta = PRAYER_META[nextPrayer.key];
              return (
                <View style={{ borderRadius: BorderRadius.md, overflow: 'hidden', marginBottom: Spacing.md }}>
                  {nightMode && <NightStars t={t} />}
                  <View style={[styles.nextPrayerCard, { backgroundColor: nextMeta.color + '18', borderColor: nextMeta.color + '44' }]}>
                    <Ionicons name={nextMeta.icon} size={48} color={nextMeta.color} />
                    <View style={{ marginLeft: Spacing.md, flex: 1 }}>
                      <Text style={{ fontSize: FontSize.xs, color: t.textDim, textTransform: 'uppercase', letterSpacing: 1 }}>Nächstes Gebet</Text>
                      <Text style={{ fontSize: FontSize.xxl, fontWeight: '700', color: nextMeta.color }}>{nextPrayer.name}</Text>
                      <Text style={{ fontSize: FontSize.xs, color: t.textDim }}>{nextMeta.description}</Text>
                    </View>
                    <Text style={{ fontSize: FontSize.xxl, fontWeight: '700', color: nextMeta.color }}>{nextPrayer.time}</Text>
                  </View>
                </View>
              );
            })()}

            {/* Notification summary */}
            {isToday && times && (
              <Pressable onPress={toggleAllNotifications} style={[styles.notifSummary, { backgroundColor: t.accent + '10', borderColor: t.accent + '30' }]}>
                <Ionicons name={allNotifsOn ? 'notifications' : 'notifications-off-outline'} size={16} color={t.accent} />
                <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: t.accent, flex: 1, marginLeft: Spacing.sm }}>
                  {activeNotifCount}/5 Benachrichtigungen aktiv
                </Text>
                <Text style={{ fontSize: FontSize.xs, color: t.textDim }}>{allNotifsOn ? 'Alle aus' : 'Alle an'}</Text>
              </Pressable>
            )}
            {/* Source indicator */}
            {prayerSource && (
              <View style={{ alignItems: 'center', marginBottom: Spacing.sm }}>
                <Text style={{ fontSize: FontSize.xs, color: prayerSource === 'local' ? '#E6A700' : t.textDim, textAlign: 'center' }}>
                  {prayerSource === 'aladhan' ? 'via Aladhan API' : prayerSource === 'cache' ? 'via Aladhan (Cache)' : 'Offline-Berechnung — Zeiten können leicht abweichen'}
                </Text>
              </View>
            )}
            {locationError && (
              <View style={{ alignItems: 'center', marginBottom: Spacing.sm, backgroundColor: '#E6510015', padding: Spacing.sm, borderRadius: BorderRadius.sm }}>
                <Text style={{ fontSize: FontSize.xs, color: '#E65100', textAlign: 'center' }}>{locationError} — Fallback auf Berlin</Text>
              </View>
            )}

            {/* Prayer time cards */}
            {loading || timesLoading || !times ? (
              <Card>
                <View style={{ alignItems: 'center', paddingVertical: Spacing.xxl }}>
                  {timesLoading ? <ActivityIndicator size="small" color={t.accent} style={{ marginBottom: Spacing.sm }} /> : <Ionicons name="location-outline" size={28} color={t.textDim} style={{ marginBottom: Spacing.sm }} />}
                  <Text style={{ color: t.textDim }}>{timesLoading ? 'Gebetszeiten werden geladen...' : 'Standort wird ermittelt...'}</Text>
                </View>
              </Card>
            ) : (
              Object.entries(PRAYER_META).map(([key, meta]) => {
                const isNext = nextPrayer?.key === key;
                const notifS = getNotifSettings(notifications, key);
                const done = todayPrayers[key];
                return (
                  <View key={key} style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: t.card,
                    borderRadius: BorderRadius.md,
                    borderWidth: 1,
                    borderColor: isNext ? 'transparent' : t.border,
                    borderLeftWidth: isNext ? 3 : 1,
                    borderLeftColor: isNext ? meta.color : t.border,
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    marginBottom: 6,
                  }}>
                    <Ionicons name={meta.icon} size={22} color={isNext ? meta.color : t.textDim} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={{ fontSize: 16, fontWeight: '600', color: isNext ? meta.color : t.text }}>{meta.name}</Text>
                      <Text style={{ fontSize: 11, color: t.textDim, marginTop: 1 }}>{meta.description}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Text style={{ fontSize: 17, fontWeight: '600', color: isNext ? meta.color : t.text, fontVariant: ['tabular-nums'] }}>{times[key]}</Text>
                      {meta.trackable && (
                        <>
                          <Pressable onPress={() => setSettingsModal(key)} hitSlop={8} style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
                            <Ionicons name={notifS.enabled ? 'notifications' : 'notifications-off-outline'} size={18} color={notifS.enabled ? '#B8860B' : t.textDim} />
                          </Pressable>
                          <Pressable onPress={() => togglePrayerDone(key)} hitSlop={8} style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: done ? '#2E7D32' : '#B8860B', backgroundColor: done ? '#2E7D32' : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                            {done && <Ionicons name="checkmark" size={14} color="white" />}
                          </Pressable>
                        </>
                      )}
                    </View>
                  </View>
                );
              })
            )}

            {/* Prayer tracker progress */}
            {isToday && times && (
              <View style={{ marginTop: 16, marginBottom: 8 }}>
                <Text style={{ fontSize: 13, color: t.textDim, textAlign: 'center' }}>{completedCount}/5 Gebete verrichtet</Text>
                <View style={{ flexDirection: 'row', marginTop: 8, gap: 3 }}>
                  {TRACKABLE_KEYS.map((key) => {
                    const pm = PRAYER_META[key];
                    return (
                      <View key={key} style={{ flex: 1, height: 5, borderRadius: 2.5, backgroundColor: todayPrayers[key] ? pm.color : t.border }} />
                    );
                  })}
                </View>
                {completedCount === 5 && (
                  <Text style={{ fontSize: 13, color: '#B8860B', textAlign: 'center', marginTop: 8 }}>MashaAllah!</Text>
                )}
              </View>
            )}
          </>
        )}

        {tab === 'qibla' && (
          <QiblaCompass qibla={qibla} dist={dist} t={t} location={location} />
        )}

        {tab === 'mosques' && (
          <>
            {location ? (
              <MosqueMap userLat={location.lat} userLng={location.lng} t={t} />
            ) : (
              <Card centered>
                <ActivityIndicator size="small" color={t.accent} style={{ marginBottom: Spacing.sm }} />
                <Text style={{ color: t.textDim }}>Standort wird ermittelt...</Text>
              </Card>
            )}
          </>
        )}
      </ScrollView>

      {/* Notification settings modal */}
      {settingsModal && (
        <NotificationSettingsModal
          visible={!!settingsModal}
          onClose={() => setSettingsModal(null)}
          prayerKey={settingsModal}
          t={t}
        />
      )}
    </SafeAreaView>
  );
}

function polarToXY(cx, cy, r, deg) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function QiblaCompass({ qibla, dist, t, location }) {
  const { heading, available } = useCompass();
  const compassPermissionGranted = useAppStore((s) => s.compassPermissionGranted);
  const setCompassPermission = useAppStore((s) => s.setCompassPermission);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Auto-grant on Android
  useEffect(() => {
    if (Platform.OS === 'android' && !compassPermissionGranted) {
      setCompassPermission(true);
    }
  }, []);

  const iosGranted = compassPermissionGranted || Platform.OS !== 'ios';

  const hasHeading = available === true;
  const compassRotation = hasHeading ? -heading : 0;
  const qiblaRotation = qibla !== null ? (hasHeading ? qibla - heading : qibla) : 0;

  const accentColor = t.accent;
  const dimColor = t.textDim;
  const borderColor = t.border;
  const textColor = t.text;

  const ticks = [];
  for (let i = 0; i < 72; i++) {
    const deg = i * 5;
    const isMajor = deg % 90 === 0;
    const isMid = deg % 45 === 0;
    const len = isMajor ? 14 : isMid ? 9 : 5;
    const sw = isMajor ? 2.5 : 1.2;
    const color = isMajor ? accentColor : dimColor + '55';
    const p1 = polarToXY(CX, CY, TICK_R, deg);
    const p2 = polarToXY(CX, CY, TICK_R - len, deg);
    ticks.push(<Line key={`t${i}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={color} strokeWidth={sw} />);
  }

  const dirs = [
    { label: 'N', deg: 0, color: accentColor },
    { label: 'E', deg: 90, color: textColor },
    { label: 'S', deg: 180, color: textColor },
    { label: 'W', deg: 270, color: textColor },
  ];

  const arrowTip = polarToXY(CX, CY, OUTER_R - 6, qiblaRotation);
  const headBack = polarToXY(CX, CY, OUTER_R - 22, qiblaRotation);
  const headL = polarToXY(headBack.x, headBack.y, 10, qiblaRotation - 90);
  const headR = polarToXY(headBack.x, headBack.y, 10, qiblaRotation + 90);
  const arrowLineTip = polarToXY(CX, CY, OUTER_R - 20, qiblaRotation);
  const kaabaPos = polarToXY(CX, CY, OUTER_R + 8, qiblaRotation);

  if (available === false) {
    return (
      <>
        <View style={compassStyles.compassContainer}>
          <Svg width={COMPASS_SIZE} height={COMPASS_SIZE} viewBox={`0 0 ${COMPASS_SIZE} ${COMPASS_SIZE}`}>
            <Defs>
              <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor={accentColor} stopOpacity="0.4" />
                <Stop offset="100%" stopColor={accentColor} stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Circle cx={CX} cy={CY} r={OUTER_R} stroke={accentColor} strokeWidth={2} fill="none" />
            <Circle cx={CX} cy={CY} r={INNER_R} stroke={borderColor} strokeWidth={1} strokeDasharray="4,4" fill="none" />
            {ticks}
            {dirs.map((d) => {
              const pos = polarToXY(CX, CY, LABEL_R, d.deg);
              return (
                <SvgText key={d.label} x={pos.x} y={pos.y + 5} textAnchor="middle" fontSize={16} fontWeight="800" fill={d.color}>
                  {d.label}
                </SvgText>
              );
            })}
            {qibla !== null && (
              <>
                <Line x1={CX} y1={CY} x2={arrowLineTip.x} y2={arrowLineTip.y} stroke={accentColor} strokeWidth={3} strokeLinecap="round" />
                <Line x1={headL.x} y1={headL.y} x2={arrowTip.x} y2={arrowTip.y} stroke={accentColor} strokeWidth={2.5} strokeLinecap="round" />
                <Line x1={headR.x} y1={headR.y} x2={arrowTip.x} y2={arrowTip.y} stroke={accentColor} strokeWidth={2.5} strokeLinecap="round" />
              </>
            )}
            <Circle cx={CX} cy={CY} r={14} fill="url(#glow)" />
            <Circle cx={CX} cy={CY} r={5} fill={accentColor} />
          </Svg>
          {qibla !== null && (
            <View style={[compassStyles.kaabaEmoji, { left: kaabaPos.x - 14, top: kaabaPos.y - 14 }]}>
              <Ionicons name="navigate" size={22} color="#B8860B" />
            </View>
          )}
        </View>
        <Card centered>
          <Text style={{ fontSize: FontSize.xs, color: t.textDim, textTransform: 'uppercase', letterSpacing: 1 }}>Qibla Richtung</Text>
          {qibla !== null && (
            <Text style={{ fontSize: FontSize.arabicLarge, fontWeight: '700', color: accentColor, marginTop: Spacing.xs }}>{qibla.toFixed(1)}° von Norden</Text>
          )}
          {dist != null && (
            <Text style={{ fontSize: FontSize.sm, color: t.textDim, marginTop: Spacing.xs }}>Entfernung: {dist.toLocaleString('de-DE')} km</Text>
          )}
          <Text style={{ color: t.textDim, fontSize: FontSize.xs, textAlign: 'center', marginTop: Spacing.sm }}>
            Magnetometer nicht verfügbar.{'\n'}Statische Qibla-Richtung wird angezeigt.
          </Text>
        </Card>
        {location && qibla !== null && <QiblaMap userLat={location.lat} userLng={location.lng} qiblaAngle={qibla} t={t} />}
      </>
    );
  }

  if (available === null) {
    return (
      <Card centered>
        <Ionicons name="compass-outline" size={28} color={t.textDim} style={{ marginBottom: Spacing.sm }} />
        <Text style={{ color: t.textDim }}>Kompass wird initialisiert...</Text>
      </Card>
    );
  }

  return (
    <>
      {Platform.OS === 'ios' && !iosGranted && (
        <Card centered>
          <Ionicons name="compass-outline" size={48} color={t.accent} style={{ marginBottom: Spacing.md }} />
          <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: t.text, textAlign: 'center', marginBottom: Spacing.sm }}>Qibla-Richtung bestimmen</Text>
          <Text style={{ fontSize: 14, color: t.textDim, textAlign: 'center', marginBottom: Spacing.lg, lineHeight: 22 }}>
            {permissionDenied
              ? 'Kompass-Zugriff wurde verweigert.\nDu kannst den Zugriff in den Geräte-Einstellungen erlauben.'
              : 'Um die Gebetsrichtung zu ermitteln, benötigt die App Zugriff auf den Kompass-Sensor.'}
          </Text>
          <Pressable
            onPress={async () => {
              const ok = await requestIOSPermission();
              if (ok) {
                setCompassPermission(true);
                setPermissionDenied(false);
              } else {
                setPermissionDenied(true);
              }
            }}
            style={{ backgroundColor: accentColor, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12 }}
          >
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#0A1628' }}>
              {permissionDenied ? 'Erneut versuchen' : 'Zugriff erlauben'}
            </Text>
          </Pressable>
        </Card>
      )}

      <View style={compassStyles.compassContainer}>
        <Svg width={COMPASS_SIZE} height={COMPASS_SIZE} viewBox={`0 0 ${COMPASS_SIZE} ${COMPASS_SIZE}`}>
          <Defs>
            <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={accentColor} stopOpacity="0.4" />
              <Stop offset="100%" stopColor={accentColor} stopOpacity="0" />
            </RadialGradient>
          </Defs>

          <G rotation={compassRotation} origin={`${CX}, ${CY}`}>
            <Circle cx={CX} cy={CY} r={OUTER_R} stroke={accentColor} strokeWidth={2} fill="none" />
            <Circle cx={CX} cy={CY} r={INNER_R} stroke={borderColor} strokeWidth={1} strokeDasharray="4,4" fill="none" />
            {ticks}
            {dirs.map((d) => {
              const pos = polarToXY(CX, CY, LABEL_R, d.deg);
              return (
                <SvgText key={d.label} x={pos.x} y={pos.y + 5} textAnchor="middle" fontSize={16} fontWeight="800" fill={d.color}
                  rotation={-compassRotation} origin={`${pos.x}, ${pos.y}`}>
                  {d.label}
                </SvgText>
              );
            })}
          </G>

          {qibla !== null && (
            <G>
              <Line x1={CX} y1={CY} x2={arrowLineTip.x} y2={arrowLineTip.y} stroke={accentColor} strokeWidth={3} strokeLinecap="round" />
              <Line x1={headL.x} y1={headL.y} x2={arrowTip.x} y2={arrowTip.y} stroke={accentColor} strokeWidth={2.5} strokeLinecap="round" />
              <Line x1={headR.x} y1={headR.y} x2={arrowTip.x} y2={arrowTip.y} stroke={accentColor} strokeWidth={2.5} strokeLinecap="round" />
            </G>
          )}

          <Circle cx={CX} cy={CY} r={14} fill="url(#glow)" />
          <Circle cx={CX} cy={CY} r={5} fill={accentColor} />
        </Svg>

        {qibla !== null && (
          <View style={[compassStyles.kaabaEmoji, { left: kaabaPos.x - 14, top: kaabaPos.y - 14 }]}>
            <Ionicons name="navigate" size={22} color="#B8860B" />
          </View>
        )}
      </View>

      <Card centered>
        <Text style={{ fontSize: FontSize.xs, color: t.textDim, textTransform: 'uppercase', letterSpacing: 1 }}>Qibla Richtung</Text>
        {qibla !== null && (
          <Text style={{ fontSize: FontSize.arabicLarge, fontWeight: '700', color: accentColor, marginTop: Spacing.xs }}>{qibla.toFixed(1)}°</Text>
        )}
        <Text style={{ fontSize: FontSize.sm, color: t.textDim, marginTop: Spacing.xs }}>
          Kompass: {Math.round(heading)}° | {dist ? `${dist.toLocaleString('de-DE')} km zur Kaaba` : ''}
        </Text>
      </Card>

      {location && qibla !== null && <QiblaMap userLat={location.lat} userLng={location.lng} qiblaAngle={qibla} t={t} />}
    </>
  );
}

const compassStyles = StyleSheet.create({
  compassContainer: { alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginVertical: Spacing.lg, width: COMPASS_SIZE, height: COMPASS_SIZE },
  kaabaEmoji: { position: 'absolute', width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  iosBtn: { paddingHorizontal: Spacing.xxl, paddingVertical: Spacing.lg, borderRadius: BorderRadius.md, borderWidth: 1 },
});

const styles = StyleSheet.create({
  tab: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: 'transparent' },
  dateArrow: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  todayBtn: { marginTop: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.full, borderWidth: 1 },
  notifSummary: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1, marginBottom: Spacing.md },
  nextPrayerCard: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, borderRadius: BorderRadius.md, borderWidth: 1 },
});
