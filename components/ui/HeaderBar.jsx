import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
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
      <Pressable onPress={() => router.push('/profile')} hitSlop={8}>
        <View style={[styles.avatar, { backgroundColor: t.surface, borderColor: t.accent }]}>
          <Text style={{ fontSize: 18 }}>👤</Text>
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
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
  },
  titleAr: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
