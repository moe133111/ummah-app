import { View, Text, StyleSheet } from 'react-native';
import { forwardRef } from 'react';

const ShareCard = forwardRef(function ShareCard(
  { type, arabic, translation, reference, transliteration },
  ref,
) {
  const typeLabel =
    type === 'ayah' ? 'Ayah des Tages' : type === 'hadith' ? 'Hadith des Tages' : 'Dua des Tages';

  return (
    <View ref={ref} style={styles.card} collapsable={false}>
      {/* Background layers */}
      <View style={styles.bgBase} />
      <View style={styles.bgOverlay} />

      {/* Content */}
      <View style={styles.content}>
        {/* Top gold line */}
        <View style={styles.topLine} />

        {/* Type label */}
        <Text style={styles.typeLabel}>{typeLabel}</Text>

        {/* Arabic text */}
        {arabic ? <Text style={styles.arabic}>{arabic}</Text> : null}

        {/* Gold divider */}
        <View style={styles.divider} />

        {/* Transliteration */}
        {transliteration ? (
          <Text style={styles.transliteration}>{transliteration}</Text>
        ) : null}

        {/* Translation */}
        {translation ? (
          <Text style={styles.translation}>{translation}</Text>
        ) : null}

        {/* Reference */}
        {reference ? (
          <Text style={styles.reference}>— {reference}</Text>
        ) : null}

        {/* Branding */}
        <Text style={styles.branding}>Imaniq</Text>
      </View>
    </View>
  );
});

export default ShareCard;

const styles = StyleSheet.create({
  card: {
    width: 360,
    minHeight: 400,
    maxHeight: 640,
    overflow: 'hidden',
    position: 'relative',
  },
  bgBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0A1628',
  },
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(184,134,11,0.03)',
  },
  content: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 400,
  },
  topLine: {
    width: '40%',
    height: 2,
    backgroundColor: '#B8860B44',
    marginBottom: 20,
  },
  typeLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.35)',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 20,
  },
  arabic: {
    fontSize: 24,
    color: '#E8D48B',
    textAlign: 'center',
    lineHeight: 48,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  divider: {
    width: 50,
    height: 1,
    backgroundColor: '#B8860B',
    opacity: 0.4,
    marginVertical: 16,
  },
  transliteration: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 12,
  },
  translation: {
    fontSize: 15,
    color: '#E8E0D4',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  reference: {
    fontSize: 11,
    color: '#B8860B',
    textAlign: 'center',
    marginBottom: 20,
  },
  branding: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.2)',
    textAlign: 'center',
    marginTop: 8,
  },
});
