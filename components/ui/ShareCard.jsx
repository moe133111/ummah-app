import { View, Text, StyleSheet } from 'react-native';
import { forwardRef } from 'react';

function DiamondPattern() {
  const rows = 3;
  const cols = 9;
  const diamonds = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const offset = r % 2 === 1 ? 20 : 0;
      diamonds.push(
        <View
          key={`${r}-${c}`}
          style={[
            styles.diamond,
            { top: r * 18, left: c * 40 + offset },
          ]}
        />,
      );
    }
  }
  return <View style={styles.patternContainer}>{diamonds}</View>;
}

const ShareCard = forwardRef(function ShareCard(
  { type, arabic, translation, reference, transliteration },
  ref,
) {
  const typeLabel =
    type === 'ayah' ? 'Ayah des Tages' : type === 'hadith' ? 'Hadith des Tages' : 'Dua des Tages';

  return (
    <View ref={ref} style={styles.card} collapsable={false}>
      {/* Background gradient layers */}
      <View style={styles.bgBase} />
      <View style={styles.bgOverlay} />

      {/* Geometric pattern */}
      <DiamondPattern />

      {/* Content */}
      <View style={styles.content}>
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
        <Text style={styles.branding}>Ummah App</Text>
      </View>
    </View>
  );
});

export default ShareCard;

const GOLD = '#E8D48B';

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
    backgroundColor: '#152238',
    opacity: 0.6,
  },
  patternContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 70,
    overflow: 'hidden',
  },
  diamond: {
    position: 'absolute',
    width: 12,
    height: 12,
    backgroundColor: GOLD,
    opacity: 0.05,
    transform: [{ rotate: '45deg' }],
  },
  content: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 400,
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
    color: GOLD,
    textAlign: 'center',
    lineHeight: 46,
    marginBottom: 16,
  },
  divider: {
    width: 60,
    height: 1,
    backgroundColor: GOLD,
    opacity: 0.4,
    marginBottom: 16,
  },
  transliteration: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 12,
  },
  translation: {
    fontSize: 15,
    color: '#E8E0D4',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  reference: {
    fontSize: 11,
    color: GOLD,
    textAlign: 'center',
    marginBottom: 20,
  },
  branding: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
  },
});
