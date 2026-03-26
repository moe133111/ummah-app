import { Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const CUSTOM_ICONS = {
  home: require('../../assets/icons/home.png'),
  quran: require('../../assets/icons/quran.png'),
  prayer: require('../../assets/icons/prayer.png'),
  dhikr: require('../../assets/icons/dhikr.png'),
  more: require('../../assets/icons/more.png'),
  mosque: require('../../assets/icons/mosque.png'),
  qibla: require('../../assets/icons/qibla.png'),
  calendar: require('../../assets/icons/calendar.png'),
  tasbih: require('../../assets/icons/tasbih.png'),
  daynight: require('../../assets/icons/daynight.png'),
};

export function AppIcon({ name, size = 20, color = '#B8860B', style }) {
  if (CUSTOM_ICONS[name]) {
    return (
      <Image
        source={CUSTOM_ICONS[name]}
        style={[{ width: size, height: size, tintColor: color, resizeMode: 'contain' }, style]}
      />
    );
  }
  return <Ionicons name={name} size={size} color={color} style={style} />;
}

export default AppIcon;
