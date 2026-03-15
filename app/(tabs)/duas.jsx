import { View, Text, StyleSheet, ScrollView, Pressable, SafeAreaView } from 'react-native';
import { useState } from 'react';
import { useAppStore } from '../../hooks/useAppStore';
import { DarkTheme, LightTheme, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { DUAS } from '../../features/duas/duaData';
import Card from '../../components/ui/Card';

export default function DuasScreen() {
  const isDark = useAppStore((s) => s.theme === 'dark');
  const t = isDark ? DarkTheme : LightTheme;
  const [expanded, setExpanded] = useState(null);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 40 }}>
        <View style={{ alignItems: 'center', paddingVertical: Spacing.xl }}>
          <Text style={{ fontSize: 36 }}>🤲</Text>
          <Text style={{ fontSize: FontSize.xxl, fontWeight: '700', color: t.text, marginTop: 8 }}>Duas & Bittgebete</Text>
          <Text style={{ fontSize: FontSize.sm, color: t.textDim, marginTop: 4 }}>Tippe auf ein Dua, um es aufzuklappen</Text>
        </View>
        {DUAS.map((dua) => (
          <Pressable key={dua.id} onPress={() => setExpanded(expanded === dua.id ? null : dua.id)}>
            <Card>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                  <Text style={{ fontSize: 24 }}>{dua.emoji || '🤲'}</Text>
                  <View>
                    <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: expanded === dua.id ? t.accent : t.text }}>{dua.title}</Text>
                    <Text style={{ fontSize: FontSize.xs, color: t.textDim, marginTop: 2 }}>{dua.category}</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 18, color: t.textDim, transform: [{ rotate: expanded === dua.id ? '180deg' : '0deg' }] }}>▾</Text>
              </View>
              {expanded === dua.id && (
                <View style={{ marginTop: Spacing.lg }}>
                  <View style={{ padding: Spacing.lg, borderRadius: BorderRadius.md, backgroundColor: t.accent + '08', borderWidth: 1, borderColor: t.accent + '15', marginBottom: Spacing.md }}>
                    <Text style={{ fontSize: FontSize.arabic, lineHeight: 40, textAlign: 'right', color: t.accentLight }}>{dua.arabic}</Text>
                  </View>
                  <Text style={{ fontSize: FontSize.sm, color: t.accent, marginBottom: 8 }}>{dua.transliteration}</Text>
                  <Text style={{ fontSize: FontSize.sm, fontStyle: 'italic', color: t.textDim, lineHeight: 22 }}>{dua.translation}</Text>
                </View>
              )}
            </Card>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
