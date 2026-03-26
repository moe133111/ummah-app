import { useState, useEffect, useRef } from 'react';

const CHECK_URL = 'https://dns.google/resolve?name=example.com&type=A';
const CHECK_INTERVAL = 15000; // 15 seconds

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const intervalRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        await fetch(CHECK_URL, { method: 'HEAD', signal: controller.signal });
        clearTimeout(timeout);
        if (mounted) setIsOnline(true);
      } catch {
        if (mounted) setIsOnline(false);
      }
    };

    check();
    intervalRef.current = setInterval(check, CHECK_INTERVAL);

    return () => {
      mounted = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return isOnline;
}
