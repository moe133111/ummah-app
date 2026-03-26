import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  Pressable,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useAppStore } from '../hooks/useAppStore';
import { Colors, DarkTheme, Spacing, FontSize, BorderRadius } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');
const t = DarkTheme;

const LANGUAGES = [
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
];

const METHODS = [
  { key: 'MWL', label: 'Muslim World League', desc: 'Europa, Asien' },
  { key: 'ISNA', label: 'ISNA', desc: 'Nordamerika' },
  { key: 'EGYPTIAN', label: 'Egyptian Authority', desc: 'Afrika, Nahost' },
  { key: 'UMM_AL_QURA', label: 'Umm al-Qura', desc: 'Saudi-Arabien' },
  { key: 'KARACHI', label: 'Karachi', desc: 'Pakistan, Südasien' },
];

export default function Onboarding() {
  const scrollRef = useRef(null);
  const [page, setPage] = useState(0);
  const [selectedLang, setSelectedLang] = useState('de');
  const [selectedMethod, setSelectedMethod] = useState('MWL');
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [locationGranted, setLocationGranted] = useState(false);

  const setAppLanguage = useAppStore((s) => s.setAppLanguage);
  const setCalculationMethod = useAppStore((s) => s.setCalculationMethod);
  const setLocation = useAppStore((s) => s.setLocation);
  const setOnboardingComplete = useAppStore((s) => s.setOnboardingComplete);
  const toggleNotification = useAppStore((s) => s.toggleNotification);

  const goTo = (p) => {
    scrollRef.current?.scrollTo({ x: p * width, animated: true });
    setPage(p);
  };

  const handleScroll = (e) => {
    const p = Math.round(e.nativeEvent.contentOffset.x / width);
    if (p !== page) setPage(p);
  };

  const requestLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const geo = await Location.reverseGeocodeAsync({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      const name = geo[0]?.city || geo[0]?.region || 'Unbekannt';
      setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, name });
      setLocationGranted(true);
    }
    goTo(2);
  };

  const skipLocation = () => {
    setLocation({ lat: 52.52, lng: 13.405, name: 'Berlin' });
    goTo(2);
  };

  const finish = () => {
    setAppLanguage(selectedLang);
    setCalculationMethod(selectedMethod);
    if (!notifEnabled) {
      ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].forEach((p) => {
        const current = useAppStore.getState().notifications[p];
        if (current) toggleNotification(p);
      });
    }
    setOnboardingComplete();
  };

  const Deco = ({ style }) => (
    <Text style={[styles.decoText, style]}>﷽</Text>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Decorative elements */}
      <Text style={styles.decoCornerTL}>۞</Text>
      <Text style={styles.decoCornerBR}>۞</Text>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
      >
        {/* Screen 1: Welcome */}
        <View style={styles.page}>
          <View style={styles.content}>
            <Text style={styles.bismillah}>بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</Text>
            <Text style={styles.appName}>Imaniq</Text>
            <Text style={styles.subtitle}>Dein islamischer Begleiter</Text>
            <Text style={styles.desc}>
              Gebetszeiten, Quran, Qibla-Kompass{'\n'}und Duas — alles in einer App.
            </Text>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sprache wählen</Text>
              <View style={styles.langGrid}>
                {LANGUAGES.map((l) => (
                  <Pressable
                    key={l.code}
                    style={[
                      styles.langBtn,
                      selectedLang === l.code && styles.langBtnActive,
                    ]}
                    onPress={() => setSelectedLang(l.code)}
                  >
                    <Text style={styles.langFlag}>{l.flag}</Text>
                    <Text
                      style={[
                        styles.langLabel,
                        selectedLang === l.code && styles.langLabelActive,
                      ]}
                    >
                      {l.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Pressable style={styles.primaryBtn} onPress={() => goTo(1)}>
              <Text style={styles.primaryBtnText}>Weiter</Text>
            </Pressable>
          </View>
        </View>

        {/* Screen 2: Location */}
        <View style={styles.page}>
          <View style={styles.content}>
            <Ionicons name="location-outline" size={48} color="#B8860B" style={{ marginBottom: 16 }} />
            <Text style={styles.screenTitle}>Standort</Text>
            <Text style={styles.desc}>
              Dein Standort wird benötigt, um{'\n'}genaue Gebetszeiten zu berechnen{'\n'}und die Qibla-Richtung zu bestimmen.
            </Text>

            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Ionicons name="business-outline" size={20} color="#B8860B" style={{ marginRight: 10 }} />
                <Text style={styles.infoText}>Präzise Gebetszeiten für deinen Ort</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="compass-outline" size={20} color="#B8860B" style={{ marginRight: 10 }} />
                <Text style={styles.infoText}>Qibla-Kompass zeigt Richtung nach Mekka</Text>
              </View>
            </View>

            {locationGranted ? (
              <View style={styles.successBadge}>
                <Text style={styles.successText}>Standort erlaubt</Text>
              </View>
            ) : (
              <Pressable style={styles.primaryBtn} onPress={requestLocation}>
                <Text style={styles.primaryBtnText}>Standort erlauben</Text>
              </Pressable>
            )}

            <Pressable style={styles.skipBtn} onPress={skipLocation}>
              <Text style={styles.skipBtnText}>
                {locationGranted ? 'Weiter' : 'Überspringen (Berlin als Fallback)'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Screen 3: Prayer Settings */}
        <View style={styles.page}>
          <View style={styles.content}>
            <Ionicons name="navigate" size={48} color="#B8860B" style={{ marginBottom: 16 }} />
            <Text style={styles.screenTitle}>Gebetszeiten</Text>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Berechnungsmethode</Text>
              {METHODS.map((m) => (
                <Pressable
                  key={m.key}
                  style={[
                    styles.radioRow,
                    selectedMethod === m.key && styles.radioRowActive,
                  ]}
                  onPress={() => setSelectedMethod(m.key)}
                >
                  <View
                    style={[
                      styles.radio,
                      selectedMethod === m.key && styles.radioActive,
                    ]}
                  >
                    {selectedMethod === m.key && <View style={styles.radioDot} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.radioLabel}>{m.label}</Text>
                    <Text style={styles.radioDesc}>{m.desc}</Text>
                  </View>
                </Pressable>
              ))}
            </View>

            <View style={styles.notifRow}>
              <View>
                <Text style={styles.notifLabel}>Gebets-Benachrichtigungen</Text>
                <Text style={styles.notifDesc}>Erinnerung bei jeder Gebetszeit</Text>
              </View>
              <Switch
                value={notifEnabled}
                onValueChange={setNotifEnabled}
                trackColor={{ false: '#333', true: Colors.gold + '60' }}
                thumbColor={notifEnabled ? Colors.gold : '#888'}
              />
            </View>

            <Pressable style={styles.finishBtn} onPress={finish}>
              <Text style={styles.finishBtnText}>Los geht's</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* Dot indicator */}
      <View style={styles.dots}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={[styles.dot, page === i && styles.dotActive]}
          />
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: t.bg,
  },
  page: {
    width,
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl + 4,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Decorative
  decoCornerTL: {
    position: 'absolute',
    top: 50,
    left: 20,
    fontSize: 28,
    color: Colors.gold + '20',
    zIndex: 1,
  },
  decoCornerBR: {
    position: 'absolute',
    bottom: 60,
    right: 20,
    fontSize: 28,
    color: Colors.gold + '20',
    zIndex: 1,
  },
  decoText: {
    fontSize: 20,
    color: Colors.gold + '15',
  },

  // Screen 1
  bismillah: {
    fontSize: 26,
    color: Colors.goldLight,
    marginBottom: Spacing.xl,
    textAlign: 'center',
  },
  appName: {
    fontSize: 42,
    fontWeight: '800',
    color: t.text,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: FontSize.lg,
    color: Colors.goldLight,
    marginTop: Spacing.xs,
    fontWeight: '500',
  },
  desc: {
    fontSize: FontSize.md,
    color: t.textDim,
    textAlign: 'center',
    lineHeight: 24,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xxl,
  },

  // Section
  section: {
    width: '100%',
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.goldLight,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },

  // Language grid
  langGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: t.border,
    backgroundColor: t.card,
    gap: Spacing.sm,
  },
  langBtnActive: {
    borderColor: Colors.gold,
    backgroundColor: Colors.gold + '15',
  },
  langFlag: {
    fontSize: 18,
  },
  langLabel: {
    fontSize: FontSize.md,
    color: t.textDim,
    fontWeight: '500',
  },
  langLabelActive: {
    color: Colors.goldLight,
  },

  // Buttons
  primaryBtn: {
    width: '100%',
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.gold,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: '#FFF',
  },
  skipBtn: {
    marginTop: Spacing.md,
    padding: Spacing.md,
  },
  skipBtnText: {
    fontSize: FontSize.sm,
    color: t.textDim,
  },

  // Screen 2
  screenIcon: {
    fontSize: 48,
    marginBottom: Spacing.lg,
  },
  screenTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: t.text,
    marginBottom: Spacing.sm,
  },
  infoCard: {
    width: '100%',
    backgroundColor: t.card,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.xxl,
    borderWidth: 1,
    borderColor: t.border,
    gap: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  infoIcon: {
    fontSize: 22,
  },
  infoText: {
    fontSize: FontSize.md,
    color: t.text,
    flex: 1,
  },
  successBadge: {
    width: '100%',
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.success + '20',
    borderWidth: 1,
    borderColor: Colors.success + '40',
    alignItems: 'center',
  },
  successText: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.success,
  },

  // Screen 3: Radio buttons
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xs,
    gap: Spacing.md,
  },
  radioRowActive: {
    backgroundColor: Colors.gold + '10',
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: t.textDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: Colors.gold,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.gold,
  },
  radioLabel: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: t.text,
  },
  radioDesc: {
    fontSize: FontSize.xs,
    color: t.textDim,
    marginTop: 2,
  },

  // Notifications toggle
  notifRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: t.card,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.xxl,
    borderWidth: 1,
    borderColor: t.border,
  },
  notifLabel: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: t.text,
  },
  notifDesc: {
    fontSize: FontSize.xs,
    color: t.textDim,
    marginTop: 2,
  },

  // Finish button
  finishBtn: {
    width: '100%',
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.green,
    alignItems: 'center',
  },
  finishBtnText: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: '#FFF',
  },

  // Dots
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingBottom: 40,
    gap: Spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: t.textDim + '40',
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.gold,
    borderRadius: 4,
  },
});
