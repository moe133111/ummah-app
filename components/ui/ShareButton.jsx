import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { useState, useRef, useCallback } from 'react';
import ShareCard from './ShareCard';
import { shareAsImage } from '../../lib/sharing';

export default function ShareButton({ type, arabic, translation, reference, transliteration, t }) {
  const [visible, setVisible] = useState(false);
  const cardRef = useRef(null);
  const [sharing, setSharing] = useState(false);

  const handleShare = useCallback(async () => {
    if (!cardRef.current || sharing) return;
    setSharing(true);
    try {
      await shareAsImage(cardRef);
    } finally {
      setSharing(false);
      setVisible(false);
    }
  }, [sharing]);

  return (
    <>
      <Pressable
        onPress={() => setVisible(true)}
        hitSlop={8}
        style={({ pressed }) => [
          styles.button,
          { borderColor: t.border, opacity: pressed ? 0.6 : 1 },
        ]}
      >
        <Text style={{ fontSize: 14 }}>📤</Text>
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.modal}>
            {/* Preview */}
            <View style={styles.previewContainer}>
              <ShareCard
                ref={cardRef}
                type={type}
                arabic={arabic}
                translation={translation}
                reference={reference}
                transliteration={transliteration}
              />
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <Pressable
                onPress={handleShare}
                style={[styles.shareBtn, sharing && { opacity: 0.5 }]}
                disabled={sharing}
              >
                <Text style={styles.shareBtnText}>
                  {sharing ? 'Wird geteilt...' : 'Jetzt teilen'}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setVisible(false)}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelBtnText}>Abbrechen</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    alignItems: 'center',
    maxWidth: 380,
    width: '100%',
  },
  previewContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  actions: {
    marginTop: 20,
    gap: 10,
    width: '100%',
    alignItems: 'center',
  },
  shareBtn: {
    backgroundColor: '#E8D48B',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  shareBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0A1628',
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 40,
    width: '100%',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
});
