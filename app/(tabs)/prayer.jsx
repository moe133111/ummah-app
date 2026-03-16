import { View, Text, StyleSheet, ScrollView, Pressable, SafeAreaView, Switch, Platform } from 'react-native';
import { useState, useMemo, useEffect } from 'react';
import { useLocation } from '../../hooks/useLocation';
import { useAppStore } from '../../hooks/useAppStore';
import { calculatePrayerTimes, getNextPrayer, calculateQiblaDirection, distanceToKaaba } from '../../features/prayer/prayerCalculation';
import { schedulePrayerNotifications } from '../../features/prayer/notifications';
import { useCompass, requestIOSPermission } from '../../features/qibla/useCompass';
import { DarkTheme, LightTheme, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import Card from '../../components/ui/Card';

const COMPASS_SIZE = 280;
const COMPASS_R = COMPASS_SIZE / 2;
const DIRECTIONS = [
  { label: 'N', deg: 0 },
  { label: 'E', deg: 90 },
  { label: 'S', deg: 180 },
  { label: 'W', deg: 270 },
];
const TICK_COUNT = 72; // every 5 degrees

const PRAYER_META = {
  fajr: { name: 'Fajr', icon: '🌙', trackable: true },
  sunrise: { name: 'Sunrise', icon: '🌅', trackable: false },
  dhuhr: { name: 'Dhuhr', icon: '☀️', trackable: true },
  asr: { name: 'Asr', icon: '🌤', trackable: true },
  maghrib: { name: 'Maghrib', icon: '🌇', trackable: true },
  isha: { name: 'Isha', icon: '🌃', trackable: true },
};

export default function PrayerScreen() {
  const { location, loading } = useLocation();
  const isDark = useAppStore((s) => s.theme === 'dark');
  const method = useAppStore((s) => s.calculationMethod);
  const todayPrayers = useAppStore((s) => s.todayPrayers);
  const togglePrayerDone = useAppStore((s) => s.togglePrayerDone);
  const notifications = useAppStore((s) => s.notifications);
  const toggleNotification = useAppStore((s) => s.toggleNotification);
  const t = isDark ? DarkTheme : LightTheme;
  const [tab, setTab] = useState('times');

  const times = useMemo(() => {
    if (!location) return null;
    return calculatePrayerTimes(location.lat, location.lng, new Date(), method);
  }, [location, method]);

  const nextPrayer = useMemo(() => (times ? getNextPrayer(times) : null), [times]);
  const completedCount = Object.values(todayPrayers).filter(Boolean).length;

  // Schedule notifications when times or settings change
  useEffect(() => {
    if (times) {
      schedulePrayerNotifications(times, notifications);
    }
  }, [times, notifications]);

  const qibla = location ? calculateQiblaDirection(location.lat, location.lng) : null;
  const dist = location ? distanceToKaaba(location.lat, location.lng) : null;

  const tabs = [
    { id: 'times', label: 'Zeiten', emoji: '🕐' },
    { id: 'qibla', label: 'Qibla', emoji: '🧭' },
    { id: 'tracker', label: 'Tracker', emoji: '✅' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 40 }}>
        <View style={{ alignItems: 'center', paddingVertical: Spacing.xl }}>
          <Text style={{ fontSize: FontSize.xxl, fontWeight: '700', color: t.text }}>Gebet</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: Spacing.lg }}>
          {tabs.map((tb) => (
            <Pressable
              key={tb.id}
              style={[styles.tab, tab === tb.id && { backgroundColor: t.accent + '18', borderColor: t.accent + '44' }]}
              onPress={() => setTab(tb.id)}
            >
              <Text style={{ fontSize: 20, marginBottom: 4 }}>{tb.emoji}</Text>
              <Text style={{ fontSize: FontSize.xs, fontWeight: '600', color: tab === tb.id ? t.accent : t.textDim }}>{tb.label}</Text>
            </Pressable>
          ))}
        </View>

        {tab === 'times' && (
          <>
            {nextPrayer && (
              <Card centered style={{ borderColor: t.accent + '44' }}>
                <Text style={{ fontSize: FontSize.xs, color: t.textDim }}>Nächstes Gebet</Text>
                <Text style={{ fontSize: FontSize.xxl, fontWeight: '700', color: t.accent }}>{nextPrayer.name}</Text>
                <Text style={{ fontSize: FontSize.lg, color: t.accentLight, marginTop: 2 }}>{nextPrayer.time}</Text>
              </Card>
            )}
            <Card>
              {loading || !times ? (
                <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                  <Text style={{ fontSize: 28, marginBottom: 8 }}>📍</Text>
                  <Text style={{ color: t.textDim }}>Standort wird ermittelt...</Text>
                </View>
              ) : (
                Object.entries(PRAYER_META).map(([key, meta]) => {
                  const isNext = nextPrayer?.key === key;
                  return (
                    <Pressable
                      key={key}
                      onPress={() => meta.trackable && togglePrayerDone(key)}
                      style={[styles.prayerRow, isNext && { backgroundColor: t.accent + '12', borderColor: t.accent + '33', borderWidth: 1 }]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <Text style={{ fontSize: 20 }}>{meta.icon}</Text>
                        <Text style={[{ fontSize: FontSize.lg, color: isNext ? t.accent : t.text }, isNext && { fontWeight: '700' }]}>{meta.name}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        {meta.trackable && (
                          <View style={[styles.checkbox, { borderColor: t.accent }, todayPrayers[key] && { backgroundColor: t.accent }]}>
                            {todayPrayers[key] && <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>✓</Text>}
                          </View>
                        )}
                        <Text style={{ fontSize: FontSize.lg, fontWeight: '600', color: isNext ? t.accentLight : t.textDim }}>{times[key]}</Text>
                      </View>
                    </Pressable>
                  );
                })
              )}
            </Card>
          </>
        )}

        {tab === 'qibla' && (
          <QiblaCompass qibla={qibla} dist={dist} t={t} />
        )}

        {tab === 'tracker' && (
          <>
            <Card centered>
              <Text style={{ fontSize: FontSize.xs, color: t.textDim }}>Heute verrichtet</Text>
              <Text style={{ fontSize: 48, fontWeight: '700', color: t.accent }}>{completedCount}/5</Text>
              <View style={styles.trackerBar}>
                <View style={[styles.trackerFill, { width: `${(completedCount / 5) * 100}%`, backgroundColor: t.accent }]} />
              </View>
            </Card>
            <Card>
              <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: t.text, marginBottom: Spacing.md }}>Gebete abhaken</Text>
              {Object.entries(PRAYER_META)
                .filter(([, meta]) => meta.trackable)
                .map(([key, meta]) => (
                  <Pressable key={key} onPress={() => togglePrayerDone(key)} style={styles.trackerRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Text style={{ fontSize: 20 }}>{meta.icon}</Text>
                      <Text style={{ fontSize: FontSize.lg, color: t.text }}>{meta.name}</Text>
                    </View>
                    <View style={[styles.checkbox, { borderColor: t.accent }, todayPrayers[key] && { backgroundColor: t.accent }]}>
                      {todayPrayers[key] && <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>✓</Text>}
                    </View>
                  </Pressable>
                ))}
            </Card>
            <Card>
              <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: t.text, marginBottom: Spacing.md }}>Benachrichtigungen</Text>
              {Object.entries(PRAYER_META)
                .filter(([, meta]) => meta.trackable)
                .map(([key, meta]) => (
                  <View key={`notif-${key}`} style={styles.trackerRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Text style={{ fontSize: 20 }}>{meta.icon}</Text>
                      <Text style={{ fontSize: FontSize.md, color: t.text }}>{meta.name}</Text>
                    </View>
                    <Switch
                      value={notifications[key]}
                      onValueChange={() => toggleNotification(key)}
                      trackColor={{ false: '#ccc', true: t.accent + '66' }}
                      thumbColor={notifications[key] ? t.accent : '#f4f3f4'}
                    />
                  </View>
                ))}
            </Card>
            {completedCount === 5 && (
              <Card centered style={{ borderColor: t.accent + '44' }}>
                <Text style={{ fontSize: 28, marginBottom: 4 }}>✨</Text>
                <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: t.accent }}>MashaAllah! Alle Gebete verrichtet!</Text>
              </Card>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function QiblaCompass({ qibla, dist, t }) {
  const { heading, available } = useCompass();
  const [iosGranted, setIosGranted] = useState(Platform.OS !== 'ios');

  // Rotation: compass ring rotates opposite to device heading
  const compassRotation = -heading;
  // Qibla arrow: always points to qibla relative to device
  const qiblaRotation = qibla !== null ? qibla - heading : 0;

  // Static fallback when no sensor
  if (available === false) {
    return (
      <>
        <Card centered>
          <Text style={{ fontSize: 48, marginBottom: Spacing.md }}>🕋</Text>
          <Text style={{ fontSize: FontSize.xl, fontWeight: '700', color: t.accent, marginBottom: 4 }}>Qibla Richtung</Text>
          {qibla !== null && (
            <Text style={{ fontSize: 32, fontWeight: '700', color: t.accentLight, marginBottom: 4 }}>{qibla.toFixed(1)}° von Norden</Text>
          )}
          {dist && (
            <Text style={{ fontSize: FontSize.sm, color: t.textDim }}>Entfernung zur Kaaba: {dist.toLocaleString('de-DE')} km</Text>
          )}
        </Card>
        <Card centered>
          <Text style={{ color: t.textDim, fontSize: FontSize.sm, textAlign: 'center' }}>
            Magnetometer nicht verfügbar auf diesem Gerät.{'\n'}Am besten auf einem Mobilgerät nutzen.
          </Text>
        </Card>
      </>
    );
  }

  // Loading state
  if (available === null) {
    return (
      <Card centered>
        <Text style={{ fontSize: 28, marginBottom: 8 }}>🧭</Text>
        <Text style={{ color: t.textDim }}>Kompass wird initialisiert...</Text>
      </Card>
    );
  }

  return (
    <>
      {/* iOS permission button */}
      {Platform.OS === 'ios' && !iosGranted && (
        <Card centered>
          <Pressable
            onPress={async () => {
              const ok = await requestIOSPermission();
              setIosGranted(ok);
            }}
            style={[compassStyles.iosBtn, { backgroundColor: t.accent + '18', borderColor: t.accent }]}
          >
            <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: t.accent }}>🧭 Kompass aktivieren</Text>
          </Pressable>
        </Card>
      )}

      {/* Compass */}
      <View style={compassStyles.compassWrapper}>
        {/* Rotating compass ring */}
        <View style={[compassStyles.compassRing, { borderColor: t.border }]}>
          <View style={{ width: COMPASS_SIZE, height: COMPASS_SIZE, transform: [{ rotate: `${compassRotation}deg` }] }}>
            {/* Tick marks */}
            {Array.from({ length: TICK_COUNT }, (_, i) => {
              const deg = i * (360 / TICK_COUNT);
              const isMajor = deg % 90 === 0;
              const isMid = deg % 45 === 0;
              return (
                <View
                  key={i}
                  style={[
                    compassStyles.tick,
                    {
                      height: isMajor ? 16 : isMid ? 10 : 6,
                      width: isMajor ? 2.5 : 1.5,
                      backgroundColor: isMajor ? t.accent : t.textDim + '55',
                      transform: [
                        { translateX: -0.75 },
                        { rotate: `${deg}deg` },
                        { translateY: -(COMPASS_R - 2) },
                      ],
                    },
                  ]}
                />
              );
            })}

            {/* Direction labels N E S W */}
            {DIRECTIONS.map((d) => (
              <View
                key={d.label}
                style={[
                  compassStyles.dirLabel,
                  {
                    transform: [
                      { rotate: `${d.deg}deg` },
                      { translateY: -(COMPASS_R - 34) },
                    ],
                  },
                ]}
              >
                <Text
                  style={[
                    compassStyles.dirText,
                    {
                      color: d.label === 'N' ? '#C0392B' : t.text,
                      transform: [{ rotate: `${-d.deg - compassRotation}deg` }],
                    },
                  ]}
                >
                  {d.label}
                </Text>
              </View>
            ))}

            {/* Degree markers at 30° intervals */}
            {[30, 60, 120, 150, 210, 240, 300, 330].map((deg) => (
              <View
                key={`d${deg}`}
                style={[
                  compassStyles.dirLabel,
                  {
                    transform: [
                      { rotate: `${deg}deg` },
                      { translateY: -(COMPASS_R - 34) },
                    ],
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: 10,
                    color: t.textDim,
                    fontWeight: '500',
                    transform: [{ rotate: `${-deg - compassRotation}deg` }],
                  }}
                >
                  {deg}°
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Qibla arrow overlay (not affected by compass rotation) */}
        {qibla !== null && (
          <View style={compassStyles.arrowOverlay} pointerEvents="none">
            <View style={{ width: COMPASS_SIZE, height: COMPASS_SIZE, transform: [{ rotate: `${qiblaRotation}deg` }] }}>
              {/* Arrow line */}
              <View style={[compassStyles.arrowLine, { backgroundColor: t.accent }]} />
              {/* Arrow head (triangle via borders) */}
              <View style={compassStyles.arrowHeadWrap}>
                <View style={[compassStyles.arrowHead, { borderBottomColor: t.accent }]} />
              </View>
              {/* Kaaba emoji at arrow tip */}
              <View style={compassStyles.kaabaWrap}>
                <Text style={{ fontSize: 24, transform: [{ rotate: `${-qiblaRotation}deg` }] }}>🕋</Text>
              </View>
            </View>
          </View>
        )}

        {/* Center dot */}
        <View style={[compassStyles.centerDot, { backgroundColor: t.accent }]} />
      </View>

      {/* Info below compass */}
      <Card centered>
        <Text style={{ fontSize: FontSize.xs, color: t.textDim, textTransform: 'uppercase', letterSpacing: 1 }}>Qibla Richtung</Text>
        {qibla !== null && (
          <Text style={{ fontSize: 28, fontWeight: '700', color: t.accent, marginTop: 4 }}>{qibla.toFixed(1)}°</Text>
        )}
        <Text style={{ fontSize: FontSize.sm, color: t.textDim, marginTop: 2 }}>
          Kompass: {Math.round(heading)}° | {dist ? `${dist.toLocaleString('de-DE')} km zur Kaaba` : ''}
        </Text>
      </Card>
    </>
  );
}

const compassStyles = StyleSheet.create({
  compassWrapper: { alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginVertical: Spacing.lg, width: COMPASS_SIZE + 20, height: COMPASS_SIZE + 20 },
  compassRing: { width: COMPASS_SIZE, height: COMPASS_SIZE, borderRadius: COMPASS_R, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  tick: { position: 'absolute', left: COMPASS_R, top: COMPASS_R, transformOrigin: '0.75px 0px' },
  dirLabel: { position: 'absolute', left: COMPASS_R - 12, top: COMPASS_R - 8, width: 24, height: 16, alignItems: 'center', justifyContent: 'center', transformOrigin: '12px 8px' },
  dirText: { fontSize: 16, fontWeight: '800' },
  arrowOverlay: { position: 'absolute', top: 10, left: 10, width: COMPASS_SIZE, height: COMPASS_SIZE },
  arrowLine: { position: 'absolute', width: 3, height: COMPASS_R - 30, left: COMPASS_R - 1.5, top: 30, borderRadius: 2 },
  arrowHeadWrap: { position: 'absolute', left: COMPASS_R - 10, top: 18 },
  arrowHead: { width: 0, height: 0, borderLeftWidth: 10, borderRightWidth: 10, borderBottomWidth: 16, borderLeftColor: 'transparent', borderRightColor: 'transparent' },
  kaabaWrap: { position: 'absolute', left: COMPASS_R - 14, top: 0, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  centerDot: { position: 'absolute', top: (COMPASS_SIZE + 20) / 2 - 6, left: (COMPASS_SIZE + 20) / 2 - 6, width: 12, height: 12, borderRadius: 6 },
  iosBtn: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: BorderRadius.md, borderWidth: 1 },
});

const styles = StyleSheet.create({
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: 'transparent' },
  prayerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: Spacing.lg, borderRadius: BorderRadius.md, marginBottom: 4 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  trackerBar: { width: '100%', height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, marginTop: 8, overflow: 'hidden' },
  trackerFill: { height: '100%', borderRadius: 3 },
  trackerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: Spacing.sm },
});
