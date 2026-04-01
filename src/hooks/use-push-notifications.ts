'use client';

import { useState, useEffect, useCallback } from 'react';

type PushState = {
  isSupported: boolean;
  permission: NotificationPermission | 'unsupported';
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
};

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const array = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    array[i] = raw.charCodeAt(i);
  }
  return array;
}

function waitForServiceWorker(timeoutMs = 5000): Promise<ServiceWorkerRegistration> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Service Worker の準備がタイムアウトしました')), timeoutMs);
    navigator.serviceWorker.ready.then((reg) => {
      clearTimeout(timer);
      resolve(reg);
    });
  });
}

function getInitialPermission(): NotificationPermission | 'unsupported' {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    return Notification.permission;
  }
  return 'unsupported';
}

export function usePushNotifications(memberId: string | undefined): PushState {
  const [permission, setPermission] = useState(getInitialPermission);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSupported = typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window;

  useEffect(() => {
    if (!isSupported) return;

    waitForServiceWorker().then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setIsSubscribed(!!sub);
      });
    }).catch(() => {
      // SW未準備の場合は未購読のまま
    });
  }, [isSupported]);

  const subscribe = useCallback(async () => {
    if (!isSupported || !memberId) return;

    setIsLoading(true);
    setError(null);

    try {
      if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
        setError('プッシュ通知の設定が不足しています（VAPID key）');
        return;
      }

      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') return;

      const reg = await waitForServiceWorker();
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
      });

      const json = sub.toJSON();

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: memberId,
          endpoint: sub.endpoint,
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth,
        }),
      });

      if (!res.ok) {
        await sub.unsubscribe();
        setError('通知の登録に失敗しました');
        return;
      }

      setIsSubscribed(true);
    } catch {
      setError('通知の有効化に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, memberId]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported) return;

    const reg = await waitForServiceWorker();
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      await sub.unsubscribe();

      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint }),
      });
    }

    setIsSubscribed(false);
  }, [isSupported]);

  return { isSupported, permission, isSubscribed, isLoading, error, subscribe, unsubscribe };
}
