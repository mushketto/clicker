import { useEffect, useState } from 'react';

export function useTelegramInit() {
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    tg.ready();
    tg.expand();

    const unsafe = tg.initDataUnsafe;
    if (unsafe?.user?.id) {
      setUserId(unsafe.user.id);
    }
  }, []);

  return userId;
}
