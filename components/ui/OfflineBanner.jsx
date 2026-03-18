import { View, Text } from 'react-native';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

export default function OfflineBanner() {
  const isOnline = useNetworkStatus();

  if (isOnline) return null;

  return (
    <View style={{ backgroundColor: '#E65100', paddingVertical: 8, paddingHorizontal: 16, alignItems: 'center' }}>
      <Text style={{ fontSize: 12, color: '#fff', fontWeight: '600', textAlign: 'center' }}>
        📡 Kein Internet — Offline-Modus aktiv
      </Text>
    </View>
  );
}
