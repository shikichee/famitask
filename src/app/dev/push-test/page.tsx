'use client';

import { useState } from 'react';
import { useCurrentMember } from '@/hooks/use-current-member';
import { usePushNotifications } from '@/hooks/use-push-notifications';

export default function PushTestPage() {
  const { currentMemberId, authLoading } = useCurrentMember();
  const { isSupported, permission, isSubscribed, subscribe, unsubscribe } =
    usePushNotifications(currentMemberId);

  const [result, setResult] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const sendTest = async () => {
    setSending(true);
    setResult(null);
    try {
      const res = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_ids: [currentMemberId],
          title: 'テスト通知',
          body: `これはテスト通知です (${new Date().toLocaleTimeString('ja-JP')})`,
          url: '/dev/push-test',
        }),
      });
      const text = await res.text();
      let data: Record<string, unknown> | null = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        // non-JSON response
      }
      if (!res.ok) {
        setResult(`Error ${res.status}: ${data?.error || text || res.statusText}`);
      } else if (data) {
        setResult(`sent: ${data.sent}, expired: ${data.expired ?? 0}`);
      } else {
        setResult(`Error: empty response (${res.status})`);
      }
    } catch (e) {
      setResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSending(false);
    }
  };

  if (authLoading) {
    return <div className="p-6 text-gray-500">Loading...</div>;
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-6">
      <h1 className="text-xl font-bold">Push通知テスト</h1>

      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-gray-500">対応ブラウザ</dt>
          <dd>{isSupported ? 'Yes' : 'No'}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">Permission</dt>
          <dd>{permission}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">購読状態</dt>
          <dd>{isSubscribed ? '購読中' : '未購読'}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">Member ID</dt>
          <dd className="font-mono text-xs truncate max-w-[200px]">
            {currentMemberId || '—'}
          </dd>
        </div>
      </dl>

      <div className="space-y-3">
        {!isSubscribed ? (
          <button
            onClick={subscribe}
            disabled={!isSupported}
            className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-white font-medium disabled:opacity-50"
          >
            通知を購読する
          </button>
        ) : (
          <>
            <button
              onClick={sendTest}
              disabled={sending}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white font-medium disabled:opacity-50"
            >
              {sending ? '送信中...' : 'テスト通知を送信'}
            </button>
            <button
              onClick={unsubscribe}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-600 text-sm"
            >
              購読を解除
            </button>
          </>
        )}
      </div>

      {result && (
        <pre className="rounded-lg bg-gray-100 p-3 text-xs whitespace-pre-wrap">
          {result}
        </pre>
      )}
    </div>
  );
}
