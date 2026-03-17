import { View, Text, StyleSheet, FlatList, Pressable, TextInput, SafeAreaView, Platform } from 'react-native';
import { useState, useMemo } from 'react';

const ARABIC_CALLIGRAPHY = Platform.OS === 'ios' ? 'Geeza Pro' : 'serif';
const SCHEHERAZADE = 'ScheherazadeNew';
import { useRouter } from 'expo-router';
import { useAppStore } from '../../hooks/useAppStore';
import { DarkTheme, LightTheme, Spacing, FontSize, BorderRadius, Colors } from '../../constants/theme';
import { SURAH_LIST } from '../../features/quran/surahData';
import LanguagePicker from '../../components/ui/LanguagePicker';

const SUB_TABS = [
  { id: 'read', label: 'Lesen' },
  { id: 'learn', label: 'Lernen' },
  { id: 'progress', label: 'Mein Fortschritt' },
];

export default function QuranScreen() {
  const isDark = useAppStore((s) => s.theme === 'dark');
  const lastRead = useAppStore((s) => s.lastReadSurah);
  const quranLanguage = useAppStore((s) => s.quranLanguage);
  const quranSecondLanguage = useAppStore((s) => s.quranSecondLanguage);
  const setQuranLanguage = useAppStore((s) => s.setQuranLanguage);
  const setQuranSecondLanguage = useAppStore((s) => s.setQuranSecondLanguage);
  const t = isDark ? DarkTheme : LightTheme;
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [activeTab, setActiveTab] = useState('read');

  const filtered = useMemo(() => {
    if (!search.trim()) return SURAH_LIST;
    const q = search.toLowerCase();
    return SURAH_LIST.filter(s => s.name.includes(q) || s.englishName.toLowerCase().includes(q) || String(s.number).includes(q));
  }, [search]);

  const cardBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)';

  const renderSurah = ({ item }) => {
    const isLastRead = item.number === lastRead;
    return (
      <Pressable
        style={[styles.surahCard, { backgroundColor: isLastRead ? t.accent + '12' : cardBg }, isLastRead && { borderWidth: 1, borderColor: t.accent + '30' }]}
        onPress={() => router.push(`/quran/${item.number}`)}
      >
        <Text style={[styles.surahNum, { color: t.textDim }]}>{item.number}</Text>
        <Text style={[styles.surahArabic, { color: t.text, fontFamily: SCHEHERAZADE || ARABIC_CALLIGRAPHY }]}>{item.name}</Text>
        <View style={styles.surahInfo}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: t.text }}>{item.englishName}</Text>
          <Text style={{ fontSize: FontSize.sm, color: t.textDim, marginTop: Spacing.xs }}>{item.englishTranslation}</Text>
        </View>
      </Pressable>
    );
  };

  const ListHeader = () => (
    <View>
      {/* Language pickers */}
      <View style={styles.langRow}>
        <LanguagePicker label="Sprache 1" value={quranLanguage} onChange={setQuranLanguage} t={t} />
        <LanguagePicker label="Sprache 2" value={quranSecondLanguage} onChange={setQuranSecondLanguage} allowClear t={t} />
      </View>

      {/* Continue reading */}
      {lastRead > 0 && (
        <Pressable
          onPress={() => router.push(`/quran/${lastRead}`)}
          style={[styles.continueCard, { backgroundColor: Colors.green, borderColor: Colors.greenLight + '44' }]}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: FontSize.xs, color: '#ffffffaa' }}>Weiterlesen</Text>
            <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: '#fff', marginTop: Spacing.xs }}>
              {SURAH_LIST[lastRead - 1]?.englishName} — {SURAH_LIST[lastRead - 1]?.name}
            </Text>
          </View>
          <Text style={{ fontSize: 28 }}>📖</Text>
        </Pressable>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]}>
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        {/* Header row */}
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: t.text }]}>Quran</Text>
          <View style={{ flexDirection: 'row', gap: Spacing.md }}>
            {lastRead > 0 && (
              <Pressable onPress={() => router.push(`/quran/${lastRead}`)} hitSlop={Spacing.sm} style={styles.headerIcon}>
                <Text style={{ fontSize: 22 }}>🔖</Text>
              </Pressable>
            )}
            <Pressable onPress={() => setShowSearch(!showSearch)} hitSlop={Spacing.sm} style={styles.headerIcon}>
              <Text style={{ fontSize: 22 }}>🔍</Text>
            </Pressable>
          </View>
        </View>

        {/* Sub-tabs */}
        <View style={styles.tabRow}>
          {SUB_TABS.map((tab) => (
            <Pressable key={tab.id} onPress={() => setActiveTab(tab.id)} style={styles.tabBtn}>
              <Text style={[
                styles.tabText,
                { color: activeTab === tab.id ? t.accent : t.textDim },
                activeTab === tab.id && styles.tabTextActive,
              ]}>
                {tab.label}
              </Text>
              {activeTab === tab.id && <View style={[styles.tabUnderline, { backgroundColor: t.accent }]} />}
            </Pressable>
          ))}
        </View>

        {/* Search bar (toggled) */}
        {showSearch && (
          <View style={[styles.searchWrap, { backgroundColor: t.surface, borderColor: t.border }]}>
            <Text style={{ fontSize: 16, marginRight: Spacing.sm }}>🔍</Text>
            <TextInput
              style={{ flex: 1, paddingVertical: Spacing.md, fontSize: FontSize.md, color: t.text }}
              placeholder="Sure suchen..."
              placeholderTextColor={t.textDim}
              value={search}
              onChangeText={setSearch}
              autoFocus
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')} hitSlop={Spacing.sm}>
                <Text style={{ fontSize: 18, color: t.textDim }}>✕</Text>
              </Pressable>
            )}
          </View>
        )}

        {activeTab === 'read' && (
          <FlatList
            data={filtered}
            keyExtractor={i => String(i.number)}
            renderItem={renderSurah}
            ListHeaderComponent={ListHeader}
            contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: 100 }}
          />
        )}

        {activeTab === 'learn' && (
          <View style={styles.placeholderWrap}>
            <Text style={{ fontSize: 48, marginBottom: Spacing.md }}>📚</Text>
            <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: t.text }}>Lernmodus</Text>
            <Text style={{ fontSize: FontSize.sm, color: t.textDim, marginTop: Spacing.sm, textAlign: 'center' }}>
              Tajweed-Regeln, Aussprache-Übungen{'\n'}und Memorisierungs-Tools
            </Text>
            <View style={[styles.phaseBadge, { backgroundColor: t.accent + '10' }]}>
              <Text style={{ color: t.accent, fontSize: FontSize.xs, fontWeight: '600' }}>Phase 2</Text>
            </View>
          </View>
        )}

        {activeTab === 'progress' && (
          <View style={styles.placeholderWrap}>
            <Text style={{ fontSize: 48, marginBottom: Spacing.md }}>📊</Text>
            <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: t.text }}>Mein Fortschritt</Text>
            <Text style={{ fontSize: FontSize.sm, color: t.textDim, marginTop: Spacing.sm, textAlign: 'center' }}>
              Verfolge deinen Quran-Lesefortschritt{'\n'}und setze persönliche Ziele
            </Text>
            <View style={[styles.phaseBadge, { backgroundColor: t.accent + '10' }]}>
              <Text style={{ color: t.accent, fontSize: FontSize.xs, fontWeight: '600' }}>Phase 2</Text>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
  },
  headerIcon: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.xl,
  },
  tabBtn: {
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  tabText: {
    fontSize: FontSize.md,
    fontWeight: '500',
  },
  tabTextActive: {
    fontWeight: '700',
  },
  tabUnderline: {
    height: 2,
    width: '100%',
    marginTop: Spacing.xs,
    borderRadius: 1,
  },
  langRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
  },
  continueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  surahCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: 10,
    minHeight: 80,
  },
  surahNum: {
    fontSize: 28,
    fontWeight: '300',
    width: 50,
    textAlign: 'center',
  },
  surahArabic: {
    fontSize: 32,
    flex: 1,
    textAlign: 'center',
    lineHeight: 56,
  },
  surahInfo: {
    alignItems: 'flex-end',
    maxWidth: 140,
  },
  placeholderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  phaseBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.lg,
  },
});
