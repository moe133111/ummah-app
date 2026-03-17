import { useState, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TextInput, FlatList, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SURAH_LIST } from '../../features/quran/surahData';
import { useAppStore } from '../../hooks/useAppStore';
import { DarkTheme, LightTheme, Spacing, FontSize, BorderRadius, Colors } from '../../constants/theme';

const ARABIC_FONT = 'ScheherazadeNew';

export default function SurahPicker({ visible, onClose, currentSurah }) {
  const [search, setSearch] = useState('');
  const router = useRouter();
  const isDark = useAppStore((s) => s.theme === 'dark');
  const t = isDark ? DarkTheme : LightTheme;
  const listRef = useRef(null);

  const filtered = search.trim()
    ? SURAH_LIST.filter((s) => {
        const q = search.toLowerCase();
        return (
          s.englishName.toLowerCase().includes(q) ||
          s.name.includes(search) ||
          s.englishTranslation.toLowerCase().includes(q) ||
          String(s.number) === q
        );
      })
    : SURAH_LIST;

  const handleSelect = (num) => {
    setSearch('');
    onClose();
    router.replace(`/quran/${num}`);
  };

  const renderItem = ({ item }) => {
    const isActive = item.number === currentSurah;
    return (
      <Pressable
        style={[styles.item, isActive && { backgroundColor: t.accent + '18' }]}
        onPress={() => handleSelect(item.number)}
      >
        <View style={[styles.numBadge, { backgroundColor: isActive ? t.accent + '30' : t.text + '10' }]}>
          <Text style={[styles.numText, { color: isActive ? t.accent : t.textDim }]}>{item.number}</Text>
        </View>
        <View style={styles.itemTexts}>
          <Text style={[styles.itemEnglish, { color: isActive ? t.accent : t.text }]}>{item.englishName}</Text>
          <Text style={[styles.itemMeta, { color: t.textDim }]}>{item.englishTranslation} · {item.numberOfAyahs} Ayat</Text>
        </View>
        <Text style={[styles.itemArabic, { color: isActive ? t.accent : t.text, fontFamily: ARABIC_FONT }]}>
          {item.name}
        </Text>
      </Pressable>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.container, { backgroundColor: t.card }]} onPress={(e) => e.stopPropagation()}>
          {/* Title */}
          <Text style={[styles.title, { color: t.text }]}>Sure auswählen</Text>

          {/* Search */}
          <View style={[styles.searchWrap, { backgroundColor: t.surface, borderColor: t.border }]}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={[styles.searchInput, { color: t.text }]}
              placeholder="Suche nach Name oder Nummer..."
              placeholderTextColor={t.textDim}
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
            />
          </View>

          {/* List */}
          <FlatList
            ref={listRef}
            data={filtered}
            keyExtractor={(item) => String(item.number)}
            renderItem={renderItem}
            initialNumToRender={20}
            getItemLayout={(_, index) => ({ length: 64, offset: 64 * index, index })}
            style={styles.list}
            keyboardShouldPersistTaps="handled"
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  container: {
    width: '100%',
    maxHeight: '70%',
    borderRadius: 20,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12 },
      android: { elevation: 10 },
    }),
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    height: 44,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
    paddingVertical: 0,
  },
  list: {
    flex: 1,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    height: 64,
    gap: Spacing.md,
  },
  numBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  itemTexts: {
    flex: 1,
  },
  itemEnglish: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  itemMeta: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  itemArabic: {
    fontSize: 20,
    lineHeight: 36,
  },
});
