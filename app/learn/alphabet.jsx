import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../hooks/useAppStore';
import { DarkTheme, LightTheme, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { ARABIC_ALPHABET } from '../../features/learn/alphabetData';

const ARABIC_FONT = 'ScheherazadeNew';
const FORM_LABELS = { isolated: 'Einzeln', initial: 'Anfang', medial: 'Mitte', final: 'Ende' };

export default function AlphabetScreen() {
  const isDark = useAppStore((s) => s.theme === 'dark');
  const learnedLetters = useAppStore((s) => s.learnedLetters) || [];
  const toggleLearnedLetter = useAppStore((s) => s.toggleLearnedLetter);
  const t = isDark ? DarkTheme : LightTheme;
  const [selectedId, setSelectedId] = useState(null);

  const selected = selectedId ? ARABIC_ALPHABET.find((l) => l.id === selectedId) : null;

  if (selected) {
    const isLearned = learnedLetters.includes(selected.id);
    const prevId = selected.id > 1 ? selected.id - 1 : null;
    const nextId = selected.id < 28 ? selected.id + 1 : null;

    return (
      <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 40 }}>
        {/* Back button */}
        <Pressable onPress={() => setSelectedId(null)} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.lg, minHeight: 44 }}>
          <Ionicons name="arrow-back" size={20} color={t.accent} />
          <Text style={{ fontSize: FontSize.sm, color: t.accent, marginLeft: Spacing.xs }}>Alle Buchstaben</Text>
        </Pressable>

        {/* Large letter */}
        <View style={{ alignItems: 'center', marginBottom: Spacing.xl }}>
          <Text style={{ fontSize: 120, color: t.accent, fontFamily: ARABIC_FONT, lineHeight: 160 }}>
            {selected.letter}
          </Text>
          <Text style={{ fontSize: FontSize.xl, fontWeight: '700', color: t.text, marginTop: Spacing.sm }}>
            {selected.name} — {selected.transliteration}
          </Text>
          <Text style={{ fontSize: FontSize.sm, color: t.textDim, textAlign: 'center', marginTop: Spacing.sm, lineHeight: 22, paddingHorizontal: Spacing.lg }}>
            {selected.description}
          </Text>
        </View>

        {/* Connection forms */}
        <Text style={{ fontSize: FontSize.xs, color: t.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.md }}>
          Verbindungsformen
        </Text>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: Spacing.xl }}>
          {Object.entries(selected.forms).map(([key, form]) => (
            <View key={key} style={{
              flex: 1,
              backgroundColor: t.card,
              borderRadius: BorderRadius.md,
              borderWidth: 1,
              borderColor: t.border,
              padding: Spacing.md,
              alignItems: 'center',
            }}>
              <Text style={{ fontSize: 28, color: t.text, fontFamily: ARABIC_FONT, lineHeight: 50 }}>{form}</Text>
              <Text style={{ fontSize: 10, color: t.textDim, marginTop: Spacing.xs }}>{FORM_LABELS[key]}</Text>
            </View>
          ))}
        </View>

        {/* Example word */}
        <Text style={{ fontSize: FontSize.xs, color: t.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.md }}>
          Beispielwort
        </Text>
        <View style={{
          backgroundColor: t.accent + '08',
          borderRadius: BorderRadius.lg,
          padding: Spacing.xl,
          alignItems: 'center',
          marginBottom: Spacing.xl,
        }}>
          <Text style={{ fontSize: 32, color: t.accent, fontFamily: ARABIC_FONT, lineHeight: 56 }}>
            {selected.example.word}
          </Text>
          <Text style={{ fontSize: FontSize.md, color: t.text, marginTop: Spacing.sm, fontStyle: 'italic' }}>
            {selected.example.transliteration}
          </Text>
          <Text style={{ fontSize: FontSize.sm, color: t.textDim, marginTop: Spacing.xs }}>
            {selected.example.meaning}
          </Text>
        </View>

        {/* Mark as learned */}
        <Pressable
          onPress={() => toggleLearnedLetter(selected.id)}
          style={{
            backgroundColor: isLearned ? t.accent : 'transparent',
            borderWidth: isLearned ? 0 : 1.5,
            borderColor: t.accent,
            borderRadius: BorderRadius.md,
            paddingVertical: 14,
            alignItems: 'center',
            marginBottom: Spacing.xl,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
            <Ionicons name={isLearned ? 'checkmark-circle' : 'checkmark-circle-outline'} size={20} color={isLearned ? '#0A1628' : t.accent} />
            <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: isLearned ? '#0A1628' : t.accent }}>
              {isLearned ? 'Gelernt' : 'Als gelernt markieren'}
            </Text>
          </View>
        </Pressable>

        {/* Navigation prev/next */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Pressable
            onPress={() => prevId && setSelectedId(prevId)}
            disabled={!prevId}
            style={{ flexDirection: 'row', alignItems: 'center', opacity: prevId ? 1 : 0.3, minHeight: 44, paddingHorizontal: Spacing.sm }}
          >
            <Ionicons name="chevron-back" size={18} color={t.accent} />
            <Text style={{ fontSize: FontSize.sm, color: t.accent, marginLeft: Spacing.xs }}>
              {prevId ? ARABIC_ALPHABET[prevId - 1].name : ''}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => nextId && setSelectedId(nextId)}
            disabled={!nextId}
            style={{ flexDirection: 'row', alignItems: 'center', opacity: nextId ? 1 : 0.3, minHeight: 44, paddingHorizontal: Spacing.sm }}
          >
            <Text style={{ fontSize: FontSize.sm, color: t.accent, marginRight: Spacing.xs }}>
              {nextId ? ARABIC_ALPHABET[nextId - 1].name : ''}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={t.accent} />
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  // Grid overview
  const learnedCount = learnedLetters.length;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 40 }}>
      {/* Title */}
      <Text style={{ fontSize: FontSize.xl, fontWeight: '700', color: t.text, marginBottom: Spacing.xs }}>
        Das arabische Alphabet
      </Text>
      <Text style={{ fontSize: FontSize.sm, color: t.textDim, marginBottom: Spacing.lg }}>
        28 Buchstaben
      </Text>

      {/* Progress bar */}
      <View style={{ marginBottom: Spacing.xl }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm }}>
          <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: t.text }}>Fortschritt</Text>
          <Text style={{ fontSize: FontSize.sm, color: t.accent, fontWeight: '700' }}>{learnedCount}/28 gelernt</Text>
        </View>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: t.border, overflow: 'hidden' }}>
          <View style={{ height: '100%', borderRadius: 3, width: `${(learnedCount / 28) * 100}%`, backgroundColor: t.accent }} />
        </View>
      </View>

      {/* Grid — 4 columns */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {ARABIC_ALPHABET.map((item) => {
          const isLearned = learnedLetters.includes(item.id);
          return (
            <Pressable
              key={item.id}
              onPress={() => setSelectedId(item.id)}
              style={{
                width: '23%',
                aspectRatio: 1,
                backgroundColor: t.card,
                borderRadius: BorderRadius.md,
                borderWidth: isLearned ? 1.5 : 1,
                borderColor: isLearned ? t.accent : t.border,
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              {isLearned && (
                <View style={{ position: 'absolute', top: 4, right: 4 }}>
                  <Ionicons name="checkmark-circle" size={14} color={t.accent} />
                </View>
              )}
              <Text style={{ fontSize: 36, color: t.text, fontFamily: ARABIC_FONT, lineHeight: 50 }}>
                {item.letter}
              </Text>
              <Text style={{ fontSize: 10, color: t.textDim }}>{item.name}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Hint */}
      <Text style={{ fontSize: FontSize.xs, color: t.textDim, textAlign: 'center', marginTop: Spacing.lg }}>
        Tippe auf einen Buchstaben zum Lernen
      </Text>
    </ScrollView>
  );
}
