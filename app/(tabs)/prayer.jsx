import { View, Text, StyleSheet, ScrollView, Pressable, SafeAreaView, Platform, ActivityIndicator } from 'react-native';
import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Svg, { Circle, Line, Text as SvgText, G, Defs, RadialGradient, Stop } from 'react-native-svg';
import { WebView } from 'react-native-webview';
import { useLocation } from '../../hooks/useLocation';
import { useAppStore } from '../../hooks/useAppStore';
import { fetchPrayerTimes, getNextPrayer, calculateQiblaDirection, distanceToKaaba } from '../../features/prayer/prayerCalculation';
import { schedulePrayerNotifications } from '../../features/prayer/notifications';
import { useCompass, requestIOSPermission } from '../../features/qibla/useCompass';
import { DarkTheme, LightTheme, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import Card from '../../components/ui/Card';

const COMPASS_SIZE = 280;
const CX = COMPASS_SIZE / 2;
const CY = COMPASS_SIZE / 2;
const OUTER_R = 134;
const INNER_R = 110;
const TICK_R = OUTER_R - 2;
const LABEL_R = 95;
const KAABA_LAT = 21.4225;
const KAABA_LNG = 39.8262;

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

  const dateString = new Date().toISOString().slice(0, 10);
  const { data: prayerData, isLoading: timesLoading } = useQuery({
    queryKey: ['prayerTimes', location?.lat, location?.lng, method, dateString],
    queryFn: () => fetchPrayerTimes(location.lat, location.lng, method),
    enabled: !!location,
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  const times = prayerData?.times || null;
  const prayerSource = prayerData?.source || null;
  const nextPrayer = useMemo(() => (times ? getNextPrayer(times) : null), [times]);
  const completedCount = Object.values(todayPrayers).filter(Boolean).length;
  const trackableKeys = Object.entries(PRAYER_META).filter(([, m]) => m.trackable).map(([k]) => k);
  const activeNotifCount = trackableKeys.filter((k) => notifications[k]).length;
  const allNotifsOn = activeNotifCount === trackableKeys.length;

  const toggleAllNotifications = () => {
    const targetState = !allNotifsOn;
    trackableKeys.forEach((k) => {
      if (notifications[k] !== targetState) toggleNotification(k);
    });
  };

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
            {/* Notification summary */}
            {times && (
              <Pressable onPress={toggleAllNotifications} style={[styles.notifSummary, { backgroundColor: t.accent + '10', borderColor: t.accent + '30' }]}>
                <Text style={{ fontSize: 16 }}>{allNotifsOn ? '🔔' : '🔕'}</Text>
                <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: t.accent, flex: 1, marginLeft: 8 }}>
                  {activeNotifCount}/5 Benachrichtigungen aktiv
                </Text>
                <Text style={{ fontSize: FontSize.xs, color: t.textDim }}>{allNotifsOn ? 'Alle aus' : 'Alle an'}</Text>
              </Pressable>
            )}
            {/* Source indicator */}
            {prayerSource && (
              <Text style={{ fontSize: FontSize.xs, color: t.textDim, textAlign: 'center', marginBottom: Spacing.sm }}>
                {prayerSource === 'aladhan' ? 'via Aladhan API' : prayerSource === 'cache' ? 'via Aladhan (Cache)' : 'Offline-Berechnung'}
              </Text>
            )}
            <Card>
              {loading || timesLoading || !times ? (
                <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                  {timesLoading ? <ActivityIndicator size="small" color={t.accent} style={{ marginBottom: 8 }} /> : <Text style={{ fontSize: 28, marginBottom: 8 }}>📍</Text>}
                  <Text style={{ color: t.textDim }}>{timesLoading ? 'Gebetszeiten werden geladen...' : 'Standort wird ermittelt...'}</Text>
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
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Text style={{ fontSize: FontSize.lg, fontWeight: '600', color: isNext ? t.accentLight : t.textDim }}>{times[key]}</Text>
                        {meta.trackable && (
                          <Pressable
                            onPress={(e) => { e.stopPropagation(); toggleNotification(key); }}
                            hitSlop={8}
                          >
                            <Text style={{ fontSize: 18, color: notifications[key] ? t.accent : t.textDim }}>
                              {notifications[key] ? '🔔' : '🔕'}
                            </Text>
                          </Pressable>
                        )}
                      </View>
                    </Pressable>
                  );
                })
              )}
            </Card>
          </>
        )}

        {tab === 'qibla' && (
          <QiblaCompass qibla={qibla} dist={dist} t={t} location={location} />
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

function polarToXY(cx, cy, r, deg) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function QiblaMap({ lat, lng, t }) {
  const [mapError, setMapError] = useState(false);

  const html = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>body{margin:0}#map{width:100%;height:100%}</style></head>
<body><div id="map"></div><script>
var map=L.map('map',{zoomControl:false,attributionControl:false}).fitBounds([[${lat},${lng}],[${KAABA_LAT},${KAABA_LNG}]],{padding:[30,30]});
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
L.polyline([[${lat},${lng}],[${KAABA_LAT},${KAABA_LNG}]],{color:'#D4A04A',weight:2,dashArray:'6,6'}).addTo(map);
L.circleMarker([${lat},${lng}],{radius:6,fillColor:'#3B82F6',color:'#fff',weight:2,fillOpacity:1}).addTo(map);
L.marker([${KAABA_LAT},${KAABA_LNG}]).addTo(map).bindPopup('Kaaba');
</script></body></html>`;

  if (mapError) {
    return null;
  }

  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <WebView
        source={{ html }}
        style={{ height: 200, borderRadius: BorderRadius.md }}
        scrollEnabled={false}
        onError={() => setMapError(true)}
      />
    </Card>
  );
}

function QiblaCompass({ qibla, dist, t, location }) {
  const { heading, available } = useCompass();
  const [iosGranted, setIosGranted] = useState(Platform.OS !== 'ios');

  const hasHeading = available === true;
  const compassRotation = hasHeading ? -heading : 0;
  const qiblaRotation = qibla !== null ? (hasHeading ? qibla - heading : qibla) : 0;

  const accentColor = t.accent;
  const dimColor = t.textDim;
  const borderColor = t.border;
  const textColor = t.text;

  // Generate tick marks
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

  // Direction labels
  const dirs = [
    { label: 'N', deg: 0, color: accentColor },
    { label: 'E', deg: 90, color: textColor },
    { label: 'S', deg: 180, color: textColor },
    { label: 'W', deg: 270, color: textColor },
  ];

  // Qibla arrow geometry
  const arrowTip = polarToXY(CX, CY, OUTER_R - 6, qiblaRotation);
  const headBack = polarToXY(CX, CY, OUTER_R - 22, qiblaRotation);
  const headL = polarToXY(headBack.x, headBack.y, 10, qiblaRotation - 90);
  const headR = polarToXY(headBack.x, headBack.y, 10, qiblaRotation + 90);
  const arrowLineTip = polarToXY(CX, CY, OUTER_R - 20, qiblaRotation);

  // Kaaba emoji position (beyond arrow tip)
  const kaabaPos = polarToXY(CX, CY, OUTER_R + 8, qiblaRotation);

  // Static fallback when no sensor
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
            {/* Outer circle */}
            <Circle cx={CX} cy={CY} r={OUTER_R} stroke={accentColor} strokeWidth={2} fill="none" />
            {/* Inner dashed circle */}
            <Circle cx={CX} cy={CY} r={INNER_R} stroke={borderColor} strokeWidth={1} strokeDasharray="4,4" fill="none" />
            {/* Ticks */}
            {ticks}
            {/* Direction labels */}
            {dirs.map((d) => {
              const pos = polarToXY(CX, CY, LABEL_R, d.deg);
              return (
                <SvgText key={d.label} x={pos.x} y={pos.y + 5} textAnchor="middle" fontSize={16} fontWeight="800" fill={d.color}>
                  {d.label}
                </SvgText>
              );
            })}
            {/* Qibla arrow line */}
            {qibla !== null && (
              <>
                <Line x1={CX} y1={CY} x2={arrowLineTip.x} y2={arrowLineTip.y} stroke={accentColor} strokeWidth={3} strokeLinecap="round" />
                <Line x1={headL.x} y1={headL.y} x2={arrowTip.x} y2={arrowTip.y} stroke={accentColor} strokeWidth={2.5} strokeLinecap="round" />
                <Line x1={headR.x} y1={headR.y} x2={arrowTip.x} y2={arrowTip.y} stroke={accentColor} strokeWidth={2.5} strokeLinecap="round" />
              </>
            )}
            {/* Center glow */}
            <Circle cx={CX} cy={CY} r={14} fill="url(#glow)" />
            {/* Center dot */}
            <Circle cx={CX} cy={CY} r={5} fill={accentColor} />
          </Svg>
          {/* Kaaba emoji overlay */}
          {qibla !== null && (
            <View style={[compassStyles.kaabaEmoji, { left: kaabaPos.x - 14, top: kaabaPos.y - 14 }]}>
              <Text style={{ fontSize: 22 }}>🕋</Text>
            </View>
          )}
        </View>
        <Card centered>
          <Text style={{ fontSize: FontSize.xs, color: t.textDim, textTransform: 'uppercase', letterSpacing: 1 }}>Qibla Richtung</Text>
          {qibla !== null && (
            <Text style={{ fontSize: 28, fontWeight: '700', color: accentColor, marginTop: 4 }}>{qibla.toFixed(1)}° von Norden</Text>
          )}
          {dist != null && (
            <Text style={{ fontSize: FontSize.sm, color: t.textDim, marginTop: 2 }}>Entfernung: {dist.toLocaleString('de-DE')} km</Text>
          )}
          <Text style={{ color: t.textDim, fontSize: FontSize.xs, textAlign: 'center', marginTop: 8 }}>
            Magnetometer nicht verfügbar.{'\n'}Statische Qibla-Richtung wird angezeigt.
          </Text>
        </Card>
        {location && <QiblaMap lat={location.lat} lng={location.lng} t={t} />}
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
            style={[compassStyles.iosBtn, { backgroundColor: accentColor + '18', borderColor: accentColor }]}
          >
            <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: accentColor }}>🧭 Kompass aktivieren</Text>
          </Pressable>
        </Card>
      )}

      {/* SVG Compass */}
      <View style={compassStyles.compassContainer}>
        <Svg width={COMPASS_SIZE} height={COMPASS_SIZE} viewBox={`0 0 ${COMPASS_SIZE} ${COMPASS_SIZE}`}>
          <Defs>
            <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={accentColor} stopOpacity="0.4" />
              <Stop offset="100%" stopColor={accentColor} stopOpacity="0" />
            </RadialGradient>
          </Defs>

          {/* Rotating compass group */}
          <G rotation={compassRotation} origin={`${CX}, ${CY}`}>
            {/* Outer circle */}
            <Circle cx={CX} cy={CY} r={OUTER_R} stroke={accentColor} strokeWidth={2} fill="none" />
            {/* Inner dashed circle */}
            <Circle cx={CX} cy={CY} r={INNER_R} stroke={borderColor} strokeWidth={1} strokeDasharray="4,4" fill="none" />
            {/* Tick marks */}
            {ticks}
            {/* Direction labels (counter-rotate so they stay upright) */}
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

          {/* Qibla arrow (rotates to qibla relative to device) */}
          {qibla !== null && (
            <G>
              <Line x1={CX} y1={CY} x2={arrowLineTip.x} y2={arrowLineTip.y} stroke={accentColor} strokeWidth={3} strokeLinecap="round" />
              <Line x1={headL.x} y1={headL.y} x2={arrowTip.x} y2={arrowTip.y} stroke={accentColor} strokeWidth={2.5} strokeLinecap="round" />
              <Line x1={headR.x} y1={headR.y} x2={arrowTip.x} y2={arrowTip.y} stroke={accentColor} strokeWidth={2.5} strokeLinecap="round" />
            </G>
          )}

          {/* Center glow */}
          <Circle cx={CX} cy={CY} r={14} fill="url(#glow)" />
          {/* Center dot */}
          <Circle cx={CX} cy={CY} r={5} fill={accentColor} />
        </Svg>

        {/* Kaaba emoji overlay (positioned outside SVG for proper rendering) */}
        {qibla !== null && (
          <View style={[compassStyles.kaabaEmoji, { left: kaabaPos.x - 14, top: kaabaPos.y - 14 }]}>
            <Text style={{ fontSize: 22 }}>🕋</Text>
          </View>
        )}
      </View>

      {/* Info below compass */}
      <Card centered>
        <Text style={{ fontSize: FontSize.xs, color: t.textDim, textTransform: 'uppercase', letterSpacing: 1 }}>Qibla Richtung</Text>
        {qibla !== null && (
          <Text style={{ fontSize: 28, fontWeight: '700', color: accentColor, marginTop: 4 }}>{qibla.toFixed(1)}°</Text>
        )}
        <Text style={{ fontSize: FontSize.sm, color: t.textDim, marginTop: 2 }}>
          Kompass: {Math.round(heading)}° | {dist ? `${dist.toLocaleString('de-DE')} km zur Kaaba` : ''}
        </Text>
      </Card>

      {/* Map */}
      {location && <QiblaMap lat={location.lat} lng={location.lng} t={t} />}
    </>
  );
}

const compassStyles = StyleSheet.create({
  compassContainer: { alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginVertical: Spacing.lg, width: COMPASS_SIZE, height: COMPASS_SIZE },
  kaabaEmoji: { position: 'absolute', width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  iosBtn: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: BorderRadius.md, borderWidth: 1 },
});

const styles = StyleSheet.create({
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: 'transparent' },
  notifSummary: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1, marginBottom: Spacing.md },
  prayerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: Spacing.lg, borderRadius: BorderRadius.md, marginBottom: 4 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  trackerBar: { width: '100%', height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, marginTop: 8, overflow: 'hidden' },
  trackerFill: { height: '100%', borderRadius: 3 },
  trackerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: Spacing.sm },
});
