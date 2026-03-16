import { useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { QURAN_LANGUAGES } from '../../features/quran/surahData';
import { BorderRadius, FontSize, Spacing } from '../../constants/theme';

export default function LanguagePicker({ label, value, onChange, allowClear, t }) {
  const [open, setOpen] = useState(false);
  const selected = QURAN_LANGUAGES.find((l) => l.code === value);

  return (
    <>
      <Pressable
        style={[styles.chip, { borderColor: value ? t.accent + '66' : t.border, backgroundColor: value ? t.accent + '12' : t.card }]}
        onPress={() => setOpen(true)}
      >
        <Text style={{ fontSize: FontSize.xs, color: t.textDim }}>{label}</Text>
        <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: value ? t.accent : t.textDim }}>
          {selected?.label || 'Keine'}
        </Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <View style={[styles.modal, { backgroundColor: t.card, borderColor: t.border }]}>
            <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: t.text, marginBottom: Spacing.md }}>{label}</Text>
            {QURAN_LANGUAGES.map((l) => (
              <Pressable
                key={l.code}
                style={[styles.option, l.code === value && { backgroundColor: t.accent + '15' }]}
                onPress={() => { onChange(l.code); setOpen(false); }}
              >
                <Text style={{ fontSize: FontSize.md, color: l.code === value ? t.accent : t.text, fontWeight: l.code === value ? '700' : '400' }}>
                  {l.label}
                </Text>
              </Pressable>
            ))}
            {allowClear && (
              <Pressable
                style={[styles.option, !value && { backgroundColor: t.accent + '15' }]}
                onPress={() => { onChange(''); setOpen(false); }}
              >
                <Text style={{ fontSize: FontSize.md, color: !value ? t.accent : t.textDim, fontWeight: !value ? '700' : '400' }}>
                  Keine
                </Text>
              </Pressable>
            )}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  chip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm, borderWidth: 1, alignItems: 'center', gap: 2 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modal: { width: '80%', borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.xl },
  option: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.sm },
});
