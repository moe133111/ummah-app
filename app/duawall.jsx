import { useState, useMemo, useCallback } from 'react';
import { View, Text, TextInput, Pressable, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { useAppStore } from '../hooks/useAppStore';
import { DarkTheme, LightTheme, FontSize, Spacing, BorderRadius } from '../constants/theme';
import { MOCK_DUAS } from '../features/community/mockDuas';
import Card from '../components/ui/Card';

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'gerade eben';
  if (mins < 60) return `vor ${mins} Min.`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `vor ${hrs} Stunde${hrs > 1 ? 'n' : ''}`;
  const days = Math.floor(hrs / 24);
  return `vor ${days} Tag${days > 1 ? 'en' : ''}`;
}

// TODO: Ersetze lokale Reaktionen mit Supabase RPC
function DuaCard({ item, isOwn, t, ameenSet, heartSet, onAmeen, onHeart }) {
  const hasAmeen = ameenSet.has(item.id);
  const hasHeart = heartSet.has(item.id);
  const ameenCount = item.ameenCount + (hasAmeen ? 1 : 0);
  const heartCount = item.heartCount + (hasHeart ? 1 : 0);
  const timestamp = item.timestamp.includes('T') ? timeAgo(item.timestamp) : item.timestamp;

  return (
    <View style={{
      backgroundColor: t.surface,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      marginBottom: Spacing.sm,
      borderWidth: 1,
      borderColor: isOwn ? t.accent + '30' : t.border,
    }}>
      {isOwn && (
        <View style={{
          backgroundColor: t.accent + '15',
          paddingHorizontal: 8,
          paddingVertical: 2,
          borderRadius: 6,
          alignSelf: 'flex-start',
          marginBottom: Spacing.sm,
        }}>
          <Text style={{ fontSize: FontSize.xs, fontWeight: '600', color: t.accent }}>Deine Dua</Text>
        </View>
      )}

      <Text style={{ fontSize: 15, lineHeight: 24, color: t.text, marginBottom: Spacing.sm }}>
        {item.text}
      </Text>

      <Text style={{ fontSize: 11, color: t.textDim, marginBottom: Spacing.md }}>
        {timestamp}
      </Text>

      <View style={{ flexDirection: 'row', gap: Spacing.lg }}>
        <Pressable
          onPress={() => onAmeen(item.id)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 16,
            backgroundColor: hasAmeen ? t.accent + '15' : 'transparent',
          }}
        >
          <Text style={{ fontSize: 16, marginRight: 6 }}>🤲</Text>
          <Text style={{
            fontSize: FontSize.xs,
            fontWeight: hasAmeen ? '700' : '500',
            color: hasAmeen ? t.accent : t.textDim,
          }}>
            Ameen · {ameenCount}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => onHeart(item.id)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 16,
            backgroundColor: hasHeart ? t.accent + '15' : 'transparent',
          }}
        >
          <Text style={{ fontSize: 16, marginRight: 6 }}>❤️</Text>
          <Text style={{
            fontSize: FontSize.xs,
            fontWeight: hasHeart ? '700' : '500',
            color: hasHeart ? t.accent : t.textDim,
          }}>
            {heartCount}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function DuaWallScreen() {
  const isDark = useAppStore((s) => s.theme === 'dark');
  const t = isDark ? DarkTheme : LightTheme;
  const userDuas = useAppStore((s) => s.userDuas);
  const addUserDua = useAppStore((s) => s.addUserDua);

  const [text, setText] = useState('');
  const [ameenSet, setAmeenSet] = useState(new Set());
  const [heartSet, setHeartSet] = useState(new Set());

  const handlePost = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    // TODO: Ersetze lokalen Post mit Supabase Insert
    addUserDua(trimmed);
    setText('');
  }, [text, addUserDua]);

  const toggleAmeen = useCallback((id) => {
    setAmeenSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleHeart = useCallback((id) => {
    setHeartSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // TODO: Ersetze mockDuas mit Supabase Realtime Query
  const allDuas = useMemo(() => {
    const ownWithFlag = userDuas.map((d) => ({ ...d, isOwn: true }));
    const mockWithFlag = MOCK_DUAS.map((d) => ({ ...d, isOwn: false }));
    return [...ownWithFlag, ...mockWithFlag];
  }, [userDuas]);

  const renderDua = useCallback(({ item }) => (
    <DuaCard
      item={item}
      isOwn={item.isOwn}
      t={t}
      ameenSet={ameenSet}
      heartSet={heartSet}
      onAmeen={toggleAmeen}
      onHeart={toggleHeart}
    />
  ), [t, ameenSet, heartSet, toggleAmeen, toggleHeart]);

  const totalActive = userDuas.length + MOCK_DUAS.length;

  const header = (
    <View style={{ marginBottom: Spacing.md }}>
      {/* Subtitle */}
      <Text style={{ fontSize: FontSize.sm, color: t.textDim, textAlign: 'center', marginBottom: Spacing.lg }}>
        Anonyme Bittgebete der Ummah
      </Text>

      {/* Post area */}
      <View style={{
        backgroundColor: t.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: t.border,
        marginBottom: Spacing.sm,
      }}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Teile dein Bittgebet mit der Ummah..."
          placeholderTextColor={t.textDim}
          multiline
          maxLength={500}
          style={{
            fontSize: 15,
            lineHeight: 22,
            color: t.text,
            minHeight: 80,
            textAlignVertical: 'top',
            marginBottom: Spacing.md,
          }}
        />

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: FontSize.xs, color: t.textDim, flex: 1 }}>
            Anonym — dein Name wird nicht angezeigt
          </Text>
          <Pressable
            onPress={handlePost}
            style={{
              backgroundColor: text.trim() ? t.accent : t.accent + '40',
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: BorderRadius.md,
            }}
          >
            <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: '#fff' }}>Posten</Text>
          </Pressable>
        </View>

        <Text style={{ fontSize: 10, color: t.textDim, marginTop: Spacing.sm }}>
          Bitte nur respektvolle Bittgebete. Keine Beleidigungen oder persönliche Angriffe.
        </Text>
      </View>

      {/* Feed header */}
      <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: t.text, marginTop: Spacing.md, marginBottom: Spacing.sm }}>
        {totalActive} Bittgebete aktiv
      </Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: t.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <FlatList
        data={allDuas}
        keyExtractor={(item) => item.id}
        renderItem={renderDua}
        ListHeaderComponent={header}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
      />
    </KeyboardAvoidingView>
  );
}
