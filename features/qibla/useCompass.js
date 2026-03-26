import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { Magnetometer } from 'expo-sensors';

const BUFFER_SIZE = 5;

function angle(x, y) {
  let deg = Math.atan2(y, x) * (180 / Math.PI);
  // Magnetometer gives x=East, y=North on most devices
  // heading = degrees clockwise from North
  deg = (90 - deg + 360) % 360;
  return deg;
}

function circularMean(angles) {
  if (angles.length === 0) return 0;
  let sinSum = 0;
  let cosSum = 0;
  for (const a of angles) {
    const rad = (a * Math.PI) / 180;
    sinSum += Math.sin(rad);
    cosSum += Math.cos(rad);
  }
  let mean = Math.atan2(sinSum / angles.length, cosSum / angles.length) * (180 / Math.PI);
  return (mean + 360) % 360;
}

export function useCompass() {
  const [heading, setHeading] = useState(0);
  const [available, setAvailable] = useState(null);
  const buffer = useRef([]);

  useEffect(() => {
    let subscription = null;

    async function start() {
      const isAvailable = await Magnetometer.isAvailableAsync();
      setAvailable(isAvailable);
      if (!isAvailable) return;

      Magnetometer.setUpdateInterval(100);

      subscription = Magnetometer.addListener((data) => {
        const h = angle(data.x, data.y);
        const buf = buffer.current;
        buf.push(h);
        if (buf.length > BUFFER_SIZE) buf.shift();
        setHeading(circularMean(buf));
      });
    }

    start();

    return () => {
      if (subscription) subscription.remove();
    };
  }, []);

  return { heading, available };
}

export async function requestIOSPermission() {
  if (Platform.OS !== 'ios') return true;
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    try {
      const result = await DeviceOrientationEvent.requestPermission();
      return result === 'granted';
    } catch {
      return false;
    }
  }
  return true;
}
