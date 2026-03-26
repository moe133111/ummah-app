import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { WebView } from 'react-native-webview';
import { BorderRadius, Spacing, FontSize } from '../../constants/theme';

const KAABA_LAT = 21.4225;
const KAABA_LNG = 39.8262;

export default function QiblaMap({ userLat, userLng, qiblaAngle, t }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const isDark = t.bg === '#0A1628';
  const tileUrl = isDark
    ? 'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  // Calculate distance to Kaaba using Haversine
  const R = 6371;
  const dLat = ((KAABA_LAT - userLat) * Math.PI) / 180;
  const dLng = ((KAABA_LNG - userLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((userLat * Math.PI) / 180) * Math.cos((KAABA_LAT * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  const distance = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));

  const html = `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
<style>
  *{margin:0;padding:0}
  html,body,#map{width:100%;height:100%;background:${isDark ? '#0A1628' : '#F8F6F0'}}
  .user-label,.kaaba-label{
    font-size:11px;font-weight:700;padding:2px 6px;border-radius:6px;white-space:nowrap;
    text-align:center;
  }
  .user-label{background:rgba(59,130,246,0.9);color:#fff}
  .kaaba-label{background:rgba(184,134,11,0.9);color:#fff}
</style></head>
<body><div id="map"></div>
<script>
var map=L.map('map',{zoomControl:false,attributionControl:false});
map.fitBounds([[${userLat},${userLng}],[${KAABA_LAT},${KAABA_LNG}]],{padding:[35,35]});
L.tileLayer('${tileUrl}',{maxZoom:18}).addTo(map);

// Dashed gold line
L.polyline([[${userLat},${userLng}],[${KAABA_LAT},${KAABA_LNG}]],{
  color:'#D4A843',weight:2.5,dashArray:'8,6',opacity:0.85
}).addTo(map);

// User marker (blue dot)
L.circleMarker([${userLat},${userLng}],{
  radius:7,fillColor:'#3B82F6',color:'#fff',weight:2.5,fillOpacity:1
}).addTo(map);
var userIcon=L.divIcon({className:'',html:'<div class="user-label">Du</div>',iconAnchor:[12,-8]});
L.marker([${userLat},${userLng}],{icon:userIcon}).addTo(map);

// Kaaba marker
var kaabaIcon=L.divIcon({
  className:'',
  html:'<div style="font-size:24px;text-align:center">🕋</div><div class="kaaba-label">Kaaba</div>',
  iconSize:[50,50],iconAnchor:[25,25]
});
L.marker([${KAABA_LAT},${KAABA_LNG}],{icon:kaabaIcon}).addTo(map);

window.ReactNativeWebView.postMessage('loaded');
<\/script></body></html>`;

  if (error) return null;

  return (
    <View style={{ marginTop: Spacing.md }}>
      <View style={[styles.mapContainer, { backgroundColor: isDark ? '#0A1628' : '#F8F6F0', borderColor: t.border }]}>
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color={t.accent} />
          </View>
        )}
        <WebView
          source={{ html }}
          style={{ height: 220, borderRadius: BorderRadius.lg, opacity: loading ? 0 : 1 }}
          scrollEnabled={false}
          onMessage={() => setLoading(false)}
          onError={() => setError(true)}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
        />
      </View>
      <View style={[styles.infoRow, { borderColor: t.border, backgroundColor: t.card }]}>
        <View style={styles.infoItem}>
          <Text style={{ fontSize: FontSize.xs, color: t.textDim, textTransform: 'uppercase', letterSpacing: 0.5 }}>Entfernung</Text>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: t.accent }}>{distance.toLocaleString('de-DE')} km</Text>
        </View>
        <View style={[styles.infoDivider, { backgroundColor: t.border }]} />
        <View style={styles.infoItem}>
          <Text style={{ fontSize: FontSize.xs, color: t.textDim, textTransform: 'uppercase', letterSpacing: 0.5 }}>Qibla-Richtung</Text>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: t.accent }}>{qiblaAngle?.toFixed(1)}°</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    height: 220,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingVertical: Spacing.md,
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
  },
  infoDivider: {
    width: 1,
    height: 32,
  },
});
