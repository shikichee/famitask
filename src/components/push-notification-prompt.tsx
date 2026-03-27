'use client';

import { useState, useEffect } from 'react';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { Bell, X } from 'lucide-react';

const DISMISS_KEY = 'famitask-push-dismissed';

export function PushNotificationPrompt({ memberId }: { memberId: string }) {
  const { isSupported, permission, isSubscribed, subscribe } = usePushNotifications(memberId);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === 'true');
  }, []);

  if (!isSupported || isSubscribed || permission === 'granted' || dismissed) return null;

  if (permission === 'denied') {
    return (
      <div className="mx-4 mb-4 rounded-xl bg-muted p-3 text-sm text-muted-foreground">
        <p>通知がブロックされています。ブラウザの設定から通知を許可してください。</p>
      </div>
    );
  }

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, 'true');
    setDismissed(true);
  };

  return (
    <div className="mx-4 mb-4 flex items-center gap-3 rounded-xl bg-primary/10 p-3">
      <Bell className="h-5 w-5 shrink-0 text-primary" />
      <p className="flex-1 text-sm">
        タスクの追加や割り当てを通知で受け取れます
      </p>
      <button
        onClick={subscribe}
        className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
      >
        有効にする
      </button>
      <button
        onClick={handleDismiss}
        className="shrink-0 text-muted-foreground"
        aria-label="閉じる"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
