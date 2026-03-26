import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, FontSize, BorderRadius } from '../../constants/theme';

export default function HeaderBar({ title, titleAr, t }) {
  const router = useRouter();

  return (
    <View style={[styles.container, { borderBottomColor: t.border }]}>
      <View style={styles.titleWrap}>
        {titleAr ? (
          <>
            <Text style={[styles.titleAr, { color: t.accent }]}>{titleAr}</Text>
            <Text style={[styles.subtitle, { color: t.textDim }]}>{title}</Text>
          </>
        ) : (
          <Text style={[styles.title, { color: t.text }]}>{title}</Text>
        )}
      </View>
      <Pressable onPress={() => router.push('/profile')} hitSlop={Spacing.sm} style={styles.avatarTouch}>
        <View style={{
          width: 38,
          height: 38,
          borderRadius: 19,
          borderWidth: 1.5,
          borderColor: '#B8860B',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(184,134,11,0.08)',
        }}>
          <Ionicons name="person-outline" size={20} color="#B8860B" />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: 56,
  },
  titleWrap: {
    flex: 1,
    marginRight: Spacing.md,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
  },
  titleAr: {
    fontSize: FontSize.arabicLarge,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: FontSize.sm,
    marginTop: Spacing.xs,
  },
  avatarTouch: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
