import { View, Text, StyleSheet, ActivityIndicator, Pressable, Linking } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import AppIcon from './AppIcon';
import { BorderRadius, Spacing, FontSize } from '../../constants/theme';

const CACHE_KEY = 'mosque_cache';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(meters) {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

function openInMaps(lat, lng, name) {
  const encodedName = encodeURIComponent(name);
  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${encodedName}`;
  Linking.openURL(url);
}

export default function MosqueMap({ userLat, userLng, t }) {
  const [mosques, setMosques] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mapLoading, setMapLoading] = useState(true);

  const isDark = t.bg === '#0A1628';
  const tileUrl = isDark
    ? 'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  const fetchMosques = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Check cache first
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp, lat, lng } = JSON.parse(cached);
        const age = Date.now() - timestamp;
        const cacheDist = haversineDistance(lat, lng, userLat, userLng);
        // Use cache if < 1 hour old and user hasn't moved > 500m
        if (age < CACHE_DURATION && cacheDist < 500) {
          setMosques(data);
          setLoading(false);
          return;
        }
      }

      const query = `[out:json];node["amenity"="place_of_worship"]["religion"="muslim"](around:5000,${userLat},${userLng});out body;`;
      const res = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
      });

      if (!res.ok) throw new Error('network');

      const json = await res.json();
      const results = json.elements
        .map((el) => ({
          id: el.id,
          name: el.tags?.name || 'Moschee',
          lat: el.lat,
          lng: el.lon,
          address: [el.tags?.['addr:street'], el.tags?.['addr:housenumber'], el.tags?.['addr:city']]
            .filter(Boolean)
            .join(' ') || null,
          distance: haversineDistance(userLat, userLng, el.lat, el.lon),
        }))
        .sort((a, b) => a.distance - b.distance);

      setMosques(results);

      // Cache results
      await AsyncStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ data: results, timestamp: Date.now(), lat: userLat, lng: userLng })
      );
    } catch (e) {
      setError(e.message === 'network' ? 'Kein Internet oder Server nicht erreichbar.' : 'Fehler beim Laden der Moscheen.');
    } finally {
      setLoading(false);
    }
  }, [userLat, userLng]);

  useEffect(() => {
    fetchMosques();
  }, [fetchMosques]);

  const markersJs = mosques
    .slice(0, 50) // limit markers for performance
    .map(
      (m) =>
        `L.marker([${m.lat},${m.lng}],{icon:mosqueIcon}).addTo(map).bindPopup('${m.name.replace(/'/g, "\\'")}');`
    )
    .join('\n');

  const html = `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
<style>
  *{margin:0;padding:0}
  html,body,#map{width:100%;height:100%;background:${isDark ? '#0A1628' : '#F8F6F0'}}
  .mosque-icon{font-size:22px;text-align:center;line-height:1}
</style></head>
<body><div id="map"></div>
<script>
var map=L.map('map',{zoomControl:false,attributionControl:false}).setView([${userLat},${userLng}],13);
L.tileLayer('${tileUrl}',{maxZoom:18}).addTo(map);

// User marker
L.circleMarker([${userLat},${userLng}],{
  radius:8,fillColor:'#3B82F6',color:'#fff',weight:2.5,fillOpacity:1
}).addTo(map);

var mosqueIcon=L.divIcon({
  className:'',
  html:'<div class="mosque-icon">🕌</div>',
  iconSize:[28,28],iconAnchor:[14,14]
});

${markersJs}

window.ReactNativeWebView.postMessage('loaded');
<\/script></body></html>`;

  return (
    <View>
      {/* Map */}
      <View style={[styles.mapContainer, { backgroundColor: isDark ? '#0A1628' : '#F8F6F0', borderColor: t.border }]}>
        {mapLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color={t.accent} />
          </View>
        )}
        <WebView
          source={{ html }}
          style={{ height: 250, borderRadius: BorderRadius.lg, opacity: mapLoading ? 0 : 1 }}
          scrollEnabled={false}
          onMessage={() => setMapLoading(false)}
          onError={() => setMapLoading(false)}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
        />
      </View>

      {/* Loading state */}
      {loading && (
        <View style={[styles.statusCard, { backgroundColor: t.card, borderColor: t.border }]}>
          <ActivityIndicator size="small" color={t.accent} style={{ marginRight: Spacing.sm }} />
          <Text style={{ color: t.textDim, fontSize: FontSize.sm }}>Moscheen werden gesucht...</Text>
        </View>
      )}

      {/* Error state */}
      {error && !loading && (
        <View style={[styles.statusCard, { backgroundColor: t.card, borderColor: t.border }]}>
          <Ionicons name="warning-outline" size={20} color="#E6A700" style={{ marginRight: Spacing.sm }} />
          <Text style={{ color: t.textDim, fontSize: FontSize.sm, flex: 1 }}>{error}</Text>
          <Pressable onPress={fetchMosques} style={[styles.retryBtn, { borderColor: t.accent }]}>
            <Text style={{ color: t.accent, fontSize: FontSize.xs, fontWeight: '600' }}>Erneut</Text>
          </Pressable>
        </View>
      )}

      {/* Mosque list */}
      {!loading && !error && mosques.length === 0 && (
        <View style={[styles.statusCard, { backgroundColor: t.card, borderColor: t.border }]}>
          <AppIcon name="mosque" size={20} color="#8B9BB4" style={{ marginRight: Spacing.sm }} />
          <Text style={{ color: t.textDim, fontSize: FontSize.sm }}>Keine Moscheen in der Nähe gefunden</Text>
        </View>
      )}

      {!loading && mosques.length > 0 && (
        <View style={{ marginTop: Spacing.md }}>
          <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: t.text, marginBottom: Spacing.sm }}>
            {mosques.length} Moschee{mosques.length !== 1 ? 'n' : ''} in der Nähe
          </Text>
          {mosques.map((m) => (
            <Pressable
              key={m.id}
              onPress={() => openInMaps(m.lat, m.lng, m.name)}
              style={({ pressed }) => [
                styles.mosqueCard,
                { backgroundColor: t.card, borderColor: t.border, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <AppIcon name="mosque" size={24} color="#B8860B" style={{ marginRight: Spacing.md }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: t.text }} numberOfLines={1}>
                  {m.name}
                </Text>
                {m.address && (
                  <Text style={{ fontSize: FontSize.xs, color: t.textDim, marginTop: 2 }} numberOfLines={1}>
                    {m.address}
                  </Text>
                )}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: t.accent }}>
                  {formatDistance(m.distance)}
                </Text>
                <Text style={{ fontSize: FontSize.xs, color: t.textDim, marginTop: 2 }}>Navigation ›</Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    height: 250,
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
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  retryBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  mosqueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
});
