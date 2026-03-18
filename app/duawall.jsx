import { useState, useMemo, useCallback } from 'react';
import { View, Text, TextInput, Pressable, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { useAppStore } from '../hooks/useAppStore';
import { DarkTheme, LightTheme } from '../constants/theme';
import { MOCK_DUAS } from '../features/community/mockDuas';
import ShareButton from '../components/ui/ShareButton';

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

function isArabic(text) {
  return /[\u0600-\u06FF]/.test(text);
}

// TODO: Ersetze lokale Reaktionen mit Supabase RPC
function DuaCard({ item, isOwn, t, ameenSet, heartSet, onAmeen, onHeart }) {
  const hasAmeen = ameenSet.has(item.id);
  const hasHeart = heartSet.has(item.id);
  const ameenCount = item.ameenCount + (hasAmeen ? 1 : 0);
  const heartCount = item.heartCount + (hasHeart ? 1 : 0);
  const timestamp = item.timestamp.includes('T') ? timeAgo(item.timestamp) : item.timestamp;
  const arabic = isArabic(item.text);

  return (
    <View style={{
      backgroundColor: t.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: isOwn ? t.accent + '30' : t.border,
    }}>
      {/* Own badge + Share button row */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: isOwn ? 10 : 0 }}>
        {isOwn ? (
          <View style={{
            backgroundColor: t.accent + '15',
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 10,
          }}>
            <Text style={{ fontSize: 10, fontWeight: '600', color: t.accent }}>Deine Dua</Text>
          </View>
        ) : (
          <View />
        )}
        <ShareButton
          type="dua"
          arabic={arabic ? item.text : ''}
          translation={arabic ? '' : item.text}
          reference={isOwn ? 'Bittgebet — Ummah App' : 'Dua Wall — Ummah App'}
          transliteration=""
          t={t}
        />
      </View>

      {/* Dua text */}
      <Text style={{
        fontSize: 16,
        lineHeight: 26,
        color: t.text,
        marginBottom: 12,
        textAlign: arabic ? 'right' : 'left',
        fontFamily: arabic ? 'ScheherazadeNew' : undefined,
      }}>
        {item.text}
      </Text>

      {/* Timestamp */}
      <Text style={{ fontSize: 11, color: t.textDim, marginBottom: 12 }}>
        {timestamp}
      </Text>

      {/* Reactions row */}
      <View style={{ flexDirection: 'row', gap: 20 }}>
        <Pressable
          onPress={() => onAmeen(item.id)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingVertical: 8,
            paddingHorizontal: 14,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: hasAmeen ? t.accent : t.border,
            backgroundColor: hasAmeen ? t.accent + '15' : 'transparent',
          }}
        >
          <Text style={{ fontSize: 16 }}>🤲</Text>
          <Text style={{ fontSize: 13, fontWeight: '500', color: hasAmeen ? t.accent : t.textDim }}>
            Ameen · {ameenCount}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => onHeart(item.id)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingVertical: 8,
            paddingHorizontal: 14,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: hasHeart ? t.accent : t.border,
            backgroundColor: hasHeart ? t.accent + '15' : 'transparent',
          }}
        >
          <Text style={{ fontSize: 16 }}>❤️</Text>
          <Text style={{ fontSize: 13, fontWeight: '500', color: hasHeart ? t.accent : t.textDim }}>
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
  const hasOwnDuas = userDuas.length > 0;

  const header = (
    <View style={{ marginBottom: 16 }}>
      {/* Subtitle */}
      <Text style={{ fontSize: 13, color: t.textDim, textAlign: 'center', marginBottom: 16 }}>
        Anonyme Bittgebete der Ummah
      </Text>

      {/* Invite hint when no own duas */}
      {!hasOwnDuas && (
        <View style={{ padding: 16, marginBottom: 14, alignItems: 'center' }}>
          <Text style={{ fontSize: 13, color: t.textDim, textAlign: 'center', lineHeight: 20 }}>
            Teile dein Bittgebet mit der Ummah.{'\n'}Deine Dua wird anonym gepostet. Andere können mit Ameen reagieren.
          </Text>
        </View>
      )}

      {/* Post area */}
      <View style={{
        backgroundColor: t.surface,
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: t.border,
        marginBottom: 14,
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
            padding: 14,
            borderRadius: 12,
            backgroundColor: t.bg,
            borderWidth: 1,
            borderColor: t.border,
            textAlignVertical: 'top',
            marginBottom: 12,
          }}
        />

        <Pressable
          onPress={handlePost}
          style={{
            alignSelf: 'flex-end',
            backgroundColor: text.trim() ? t.accent : t.accent + '40',
            paddingVertical: 10,
            paddingHorizontal: 24,
            borderRadius: 12,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#0A1628' }}>Posten</Text>
        </Pressable>

        <Text style={{ fontSize: 11, color: t.textDim, marginTop: 8 }}>
          Anonym — dein Name wird nicht angezeigt
        </Text>

        <Text style={{ fontSize: 10, color: t.textDim, marginTop: 4 }}>
          Bitte nur respektvolle Bittgebete. Keine Beleidigungen oder persönliche Angriffe.
        </Text>
      </View>

      {/* Feed header */}
      <Text style={{ fontSize: 15, fontWeight: '700', color: t.text, marginTop: 4, marginBottom: 4 }}>
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
