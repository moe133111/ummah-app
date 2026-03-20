import { View, Text } from 'react-native';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

export default function OfflineBanner() {
  const isOnline = useNetworkStatus();

  if (isOnline) return null;

  return (
    <View style={{
      backgroundColor: '#E65100',
      paddingTop: 4,
      paddingBottom: 6,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <Text style={{
        color: 'white',
        fontSize: 12,
        fontWeight: '500',
        textAlign: 'center',
      }}>
        Kein Internet — Offline-Modus aktiv
      </Text>
    </View>
  );
}
