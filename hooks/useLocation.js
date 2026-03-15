import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { useAppStore } from './useAppStore';

export function useLocation() {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useAppStore((s) => s.location);
  const setLocation = useAppStore((s) => s.setLocation);

  useEffect(() => {
    let isMounted = true;
    async function getLocation() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Standort-Berechtigung verweigert');
          setLocation({ lat: 52.52, lng: 13.405, name: 'Berlin' });
          setLoading(false);
          return;
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!isMounted) return;
        const { latitude: lat, longitude: lng } = loc.coords;
        try {
          const [place] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
          const name = place?.city || place?.subregion || place?.region || '';
          setLocation({ lat, lng, name });
        } catch { setLocation({ lat, lng, name: '' }); }
      } catch (err) {
        if (isMounted) { setError(err.message); setLocation({ lat: 52.52, lng: 13.405, name: 'Berlin' }); }
      } finally { if (isMounted) setLoading(false); }
    }
    if (!location) getLocation(); else setLoading(false);
    return () => { isMounted = false; };
  }, []);

  return { location, loading, error };
}
