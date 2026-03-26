import { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../hooks/useAppStore';
import { DarkTheme, LightTheme, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { TAJWEED_CATEGORIES } from '../../features/learn/tajweedData';

const ARABIC_FONT = 'ScheherazadeNew';

const totalRules = TAJWEED_CATEGORIES.reduce((sum, cat) => sum + cat.rules.length, 0);

export default function TajweedScreen() {
  const isDark = useAppStore((s) => s.theme === 'dark');
  const learnedRules = useAppStore((s) => s.learnedTajweedRules) || [];
  const toggleLearnedRule = useAppStore((s) => s.toggleLearnedTajweedRule);
  const t = isDark ? DarkTheme : LightTheme;

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedRule, setSelectedRule] = useState(null);

  const cardBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
  const learnedCount = learnedRules.length;

  // === RULE DETAIL VIEW ===
  if (selectedRule) {
    const category = TAJWEED_CATEGORIES.find((c) => c.id === selectedCategory);
    const rule = category?.rules.find((r) => r.id === selectedRule);
    if (!rule) return null;

    const isLearned = learnedRules.includes(rule.id);

    return (
      <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 40 }}>
        {/* Back */}
        <Pressable onPress={() => setSelectedRule(null)} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.lg, minHeight: 44 }}>
          <Ionicons name="arrow-back" size={20} color={t.accent} />
          <Text style={{ fontSize: FontSize.sm, color: t.accent, marginLeft: Spacing.xs }}>{category.title}</Text>
        </Pressable>

        {/* Name */}
        <Text style={{ fontSize: 20, fontWeight: '700', color: t.text, marginBottom: Spacing.xs }}>{rule.name}</Text>
        <Text style={{ fontSize: 24, color: t.accent, fontFamily: ARABIC_FONT, lineHeight: 36, marginBottom: Spacing.md }}>{rule.nameAr}</Text>

        {/* Category badge */}
        <View style={{ alignSelf: 'flex-start', backgroundColor: (rule.color || t.accent) + '20', paddingHorizontal: 12, paddingVertical: 4, borderRadius: BorderRadius.full, marginBottom: Spacing.lg }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: rule.color || t.accent }}>{category.title}</Text>
        </View>

        {/* Description */}
        <Text style={{ fontSize: 14, color: t.text, lineHeight: 24, marginBottom: Spacing.xl }}>{rule.description}</Text>

        {/* Arabic text (for Grundlagen rules) */}
        {rule.text && (
          <View style={{ backgroundColor: t.accent + '08', borderRadius: BorderRadius.lg, padding: Spacing.xl, alignItems: 'center', marginBottom: Spacing.lg }}>
            <Text style={{ fontSize: 26, color: t.accent, fontFamily: ARABIC_FONT, lineHeight: 44, textAlign: 'center' }}>{rule.text}</Text>
            {rule.transliteration && (
              <Text style={{ fontSize: 13, color: t.accent, fontStyle: 'italic', marginTop: Spacing.sm }}>{rule.transliteration}</Text>
            )}
            {rule.translation && (
              <Text style={{ fontSize: 13, color: t.textDim, marginTop: Spacing.xs }}>{rule.translation}</Text>
            )}
          </View>
        )}

        {/* Letters section */}
        {rule.letters && (
          <View style={{ marginBottom: Spacing.xl }}>
            <Text style={{ fontSize: FontSize.xs, color: t.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.md }}>Buchstaben</Text>
            <View style={{ backgroundColor: cardBg, borderRadius: BorderRadius.lg, padding: Spacing.lg, alignItems: 'center' }}>
              <Text style={{ fontSize: 28, color: t.text, fontFamily: ARABIC_FONT, lineHeight: 48, textAlign: 'center', letterSpacing: 8 }}>{rule.letters}</Text>
              {rule.lettersName && (
                <Text style={{ fontSize: 12, color: t.textDim, marginTop: Spacing.sm, textAlign: 'center' }}>{rule.lettersName}</Text>
              )}
            </View>
          </View>
        )}

        {/* Example */}
        {rule.example && (
          <View style={{ marginBottom: Spacing.xl }}>
            <Text style={{ fontSize: FontSize.xs, color: t.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.md }}>Beispiel</Text>
            <View style={{ backgroundColor: t.accent + '08', borderRadius: BorderRadius.lg, padding: Spacing.xl, alignItems: 'center' }}>
              <Text style={{ fontSize: 26, color: t.accent, fontFamily: ARABIC_FONT, lineHeight: 44 }}>{rule.example.text}</Text>
              <Text style={{ fontSize: 13, color: t.accent, fontStyle: 'italic', marginTop: Spacing.sm }}>{rule.example.transliteration}</Text>
              <Text style={{ fontSize: 13, color: t.textDim, marginTop: Spacing.xs, textAlign: 'center' }}>{rule.example.explanation}</Text>
            </View>
          </View>
        )}

        {/* Duration badge */}
        {rule.duration && (
          <View style={{ alignSelf: 'flex-start', backgroundColor: (rule.color || t.accent) + '20', paddingHorizontal: 14, paddingVertical: 8, borderRadius: BorderRadius.full, marginBottom: Spacing.xl }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: rule.color || t.accent }}>Dauer: {rule.duration}</Text>
          </View>
        )}

        {/* Extra explanation */}
        {rule.explanation && (
          <View style={{ marginBottom: Spacing.xl }}>
            <Text style={{ fontSize: FontSize.xs, color: t.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.md }}>Erklärung</Text>
            <Text style={{ fontSize: 14, color: t.text, lineHeight: 24 }}>{rule.explanation}</Text>
          </View>
        )}

        {/* Mark as learned */}
        <Pressable
          onPress={() => toggleLearnedRule(rule.id)}
          style={{
            backgroundColor: isLearned ? t.accent : 'transparent',
            borderWidth: isLearned ? 0 : 1.5,
            borderColor: t.accent,
            borderRadius: BorderRadius.md,
            paddingVertical: 14,
            alignItems: 'center',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
            <Ionicons name={isLearned ? 'checkmark-circle' : 'checkmark-circle-outline'} size={20} color={isLearned ? '#0A1628' : t.accent} />
            <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: isLearned ? '#0A1628' : t.accent }}>
              {isLearned ? 'Gelernt' : 'Als gelernt markieren'}
            </Text>
          </View>
        </Pressable>
      </ScrollView>
    );
  }

  // === CATEGORY RULES LIST ===
  if (selectedCategory) {
    const category = TAJWEED_CATEGORIES.find((c) => c.id === selectedCategory);
    if (!category) return null;

    return (
      <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 40 }}>
        {/* Back */}
        <Pressable onPress={() => setSelectedCategory(null)} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.lg, minHeight: 44 }}>
          <Ionicons name="arrow-back" size={20} color={t.accent} />
          <Text style={{ fontSize: FontSize.sm, color: t.accent, marginLeft: Spacing.xs }}>Alle Kategorien</Text>
        </Pressable>

        <Text style={{ fontSize: FontSize.xl, fontWeight: '700', color: t.text, marginBottom: Spacing.lg }}>{category.icon} {category.title}</Text>

        {category.rules.map((rule) => {
          const isLearned = learnedRules.includes(rule.id);
          return (
            <Pressable
              key={rule.id}
              onPress={() => setSelectedRule(rule.id)}
              style={{
                backgroundColor: cardBg,
                borderRadius: BorderRadius.md,
                padding: Spacing.lg,
                marginBottom: Spacing.md,
                borderLeftWidth: 4,
                borderLeftColor: rule.color || t.accent,
                borderWidth: 1,
                borderColor: t.border,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                    <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: t.text }}>{rule.name}</Text>
                    {isLearned && <Ionicons name="checkmark-circle" size={16} color={t.accent} />}
                  </View>
                  <Text style={{ fontSize: 16, color: t.accent, fontFamily: ARABIC_FONT, marginTop: 2 }}>{rule.nameAr}</Text>
                  <Text style={{ fontSize: FontSize.sm, color: t.textDim, marginTop: Spacing.sm, lineHeight: 20 }} numberOfLines={2}>{rule.description}</Text>
                  <Text style={{ fontSize: FontSize.xs, color: t.accent, marginTop: Spacing.sm }}>Mehr erfahren</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={t.textDim} style={{ marginLeft: Spacing.sm }} />
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    );
  }

  // === CATEGORIES OVERVIEW ===
  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 40 }}>
      <Text style={{ fontSize: FontSize.xl, fontWeight: '700', color: t.text, marginBottom: Spacing.xs }}>Tajweed-Grundlagen</Text>
      <Text style={{ fontSize: 13, color: t.textDim, marginBottom: Spacing.lg }}>Die Regeln der Quran-Rezitation</Text>

      {/* Progress */}
      <View style={{ marginBottom: Spacing.xl }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm }}>
          <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: t.text }}>Fortschritt</Text>
          <Text style={{ fontSize: FontSize.sm, color: t.accent, fontWeight: '700' }}>{learnedCount}/{totalRules} Regeln gelernt</Text>
        </View>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: t.border, overflow: 'hidden' }}>
          <View style={{ height: '100%', borderRadius: 3, width: `${(learnedCount / totalRules) * 100}%`, backgroundColor: t.accent }} />
        </View>
      </View>

      {/* Category cards */}
      {TAJWEED_CATEGORIES.map((category) => {
        const catLearned = category.rules.filter((r) => learnedRules.includes(r.id)).length;
        return (
          <Pressable
            key={category.id}
            onPress={() => setSelectedCategory(category.id)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: cardBg,
              borderRadius: 14,
              padding: Spacing.lg,
              marginBottom: Spacing.md,
              borderWidth: 1,
              borderColor: t.border,
              minHeight: 72,
            }}
          >
            <Text style={{ fontSize: 32, width: 48, textAlign: 'center' }}>{category.icon}</Text>
            <View style={{ flex: 1, marginLeft: Spacing.md }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: t.text }}>{category.title}</Text>
              <Text style={{ fontSize: 12, color: t.textDim, marginTop: 2 }}>
                {category.rules.length} Regeln{catLearned > 0 ? ` · ${catLearned} gelernt` : ''}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={t.textDim} />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
