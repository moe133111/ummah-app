import { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TextInput, FlatList, Platform, Animated, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SURAH_LIST } from '../../features/quran/surahData';
import { useAppStore } from '../../hooks/useAppStore';
import { DarkTheme, LightTheme, Spacing, FontSize, BorderRadius, Colors } from '../../constants/theme';
import SurahCalligraphy from './SurahCalligraphy';
const SCREEN_HEIGHT = Dimensions.get('window').height;
const ITEM_HEIGHT = 72;

export default function SurahPicker({ visible, onClose, currentSurah }) {
  const [search, setSearch] = useState('');
  const router = useRouter();
  const isDark = useAppStore((s) => s.theme === 'dark');
  const t = isDark ? DarkTheme : LightTheme;
  const listRef = useRef(null);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      slideAnim.setValue(SCREEN_HEIGHT);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 25,
        stiffness: 200,
      }).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setSearch('');
      onClose();
    });
  };

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
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      onClose();
      router.replace(`/quran/${num}`);
    });
  };

  const initialIndex = search.trim() ? 0 : Math.max(0, currentSurah - 1);
  const calliColor = isDark ? '#E8E0D4' : '#1A1A2E';

  const renderItem = ({ item }) => {
    const isActive = item.number === currentSurah;

    return (
      <Pressable
        style={[styles.item, isActive && { backgroundColor: t.accent + '18' }]}
        onPress={() => handleSelect(item.number)}
      >
        {/* Number */}
        <Text style={[styles.numText, { color: isActive ? t.accent : t.textDim }]}>{item.number}</Text>

        {/* Arabic name — calligraphy WebView */}
        <View style={styles.itemCenter}>
          <SurahCalligraphy
            name={item.name}
            width={80}
            height={30}
            color={isActive ? Colors.gold : calliColor}
            fontSize={22}
          />
        </View>

        {/* English name + translation */}
        <View style={styles.itemRight}>
          <Text style={[styles.itemEnglish, { color: isActive ? t.accent : t.text }]} numberOfLines={1}>
            {item.englishName}
          </Text>
          <Text style={[styles.itemTranslation, { color: t.textDim }]} numberOfLines={1}>
            {item.englishTranslation}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        {/* Backdrop — tap to close */}
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

        {/* Bottom sheet */}
        <Animated.View
          style={[
            styles.container,
            { backgroundColor: t.card, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Drag handle */}
          <View style={styles.handleRow}>
            <View style={[styles.handle, { backgroundColor: t.textDim + '40' }]} />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: t.text }]}>Sure auswählen</Text>

          {/* Search (optional filter) */}
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
            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')} hitSlop={8}>
                <Text style={{ fontSize: 16, color: t.textDim }}>✕</Text>
              </Pressable>
            )}
          </View>

          {/* Full surah list */}
          <FlatList
            ref={listRef}
            data={filtered}
            keyExtractor={(item) => String(item.number)}
            renderItem={renderItem}
            initialNumToRender={20}
            getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
            initialScrollIndex={initialIndex}
            style={styles.list}
            keyboardShouldPersistTaps="handled"
            onScrollToIndexFailed={() => {}}
          />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    maxHeight: '75%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Spacing.md,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.25, shadowRadius: 16 },
      android: { elevation: 16 },
    }),
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
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
    height: ITEM_HEIGHT,
  },
  numText: {
    fontSize: FontSize.md,
    fontWeight: '300',
    width: 36,
    textAlign: 'center',
  },
  itemCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemRight: {
    width: 130,
    alignItems: 'flex-end',
  },
  itemEnglish: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  itemTranslation: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
});
