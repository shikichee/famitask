'use client';

import { useState } from 'react';
import { useCurrentMember } from '@/hooks/use-current-member';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { getTemplates } from '@/actions/recurring';

export default function PushTestPage() {
  const { currentMemberId, authLoading } = useCurrentMember();
  const { isSupported, permission, isSubscribed, subscribe, unsubscribe } =
    usePushNotifications(currentMemberId);

  const [result, setResult] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [recurringResult, setRecurringResult] = useState<string | null>(null);
  const [runningSim, setRunningSim] = useState(false);

  const sendPush = async (payload: Record<string, unknown>, setRes: (r: string) => void) => {
    try {
      const res = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      let data: Record<string, unknown> | null = null;
      try { data = text ? JSON.parse(text) : null; } catch { /* non-JSON */ }
      if (!res.ok) {
        setRes(`Error ${res.status}: ${data?.error || text || res.statusText}`);
      } else if (data) {
        setRes(`sent: ${data.sent}, expired: ${data.expired ?? 0}`);
      } else {
        setRes(`Error: empty response (${res.status})`);
      }
    } catch (e) {
      setRes(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const sendTest = async () => {
    setSending(true);
    setResult(null);
    await sendPush(
      {
        member_ids: [currentMemberId],
        title: 'テスト通知',
        body: `これはテスト通知です (${new Date().toLocaleTimeString('ja-JP')})`,
        url: '/dev/push-test',
      },
      setResult,
    );
    setSending(false);
  };

  const sendAllTest = async () => {
    setSending(true);
    setResult(null);
    await sendPush(
      {
        title: 'テスト通知（全員）',
        body: `全員宛のテスト通知です (${new Date().toLocaleTimeString('ja-JP')})`,
        url: '/dev/push-test',
      },
      setResult,
    );
    setSending(false);
  };

  const simulateRecurring = async (sendToAll: boolean) => {
    setRunningSim(true);
    setRecurringResult(null);

    try {
      const templates = await getTemplates();
      const activeTemplates = templates.filter(t => t.is_active);

      if (activeTemplates.length === 0) {
        setRecurringResult('有効なくりかえしテンプレートがありません');
        return;
      }

      const titles = activeTemplates.map(t => t.title);
      const body = titles.length === 1
        ? `くりかえしタスク「${titles[0]}」が追加されました`
        : `くりかえしタスクが${titles.length}件追加されました（${titles.join('、')}）`;

      const payload: Record<string, unknown> = { title: 'くりかえしタスク', body, url: '/' };
      if (!sendToAll) {
        payload.member_ids = [currentMemberId];
      }

      await sendPush(
        payload,
        (msg) => setRecurringResult(`通知結果: ${msg}\n送信先: ${sendToAll ? '全員' : '自分のみ'}\n\nテンプレート: ${titles.join(', ')}`),
      );
    } catch (e) {
      setRecurringResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setRunningSim(false);
    }
  };

  if (authLoading) {
    return <div className="p-6 text-gray-500">Loading...</div>;
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-8">
      <h1 className="text-xl font-bold">Push通知テスト</h1>

      {/* Status */}
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

      {/* Basic notification tests */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">基本テスト</h2>
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
              {sending ? '送信中...' : '自分にテスト通知'}
            </button>
            <button
              onClick={sendAllTest}
              disabled={sending}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-white font-medium disabled:opacity-50"
            >
              {sending ? '送信中...' : '全員にテスト通知'}
            </button>
            <button
              onClick={unsubscribe}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-600 text-sm"
            >
              購読を解除
            </button>
          </>
        )}
        {result && (
          <pre className="rounded-lg bg-gray-100 p-3 text-xs whitespace-pre-wrap">
            {result}
          </pre>
        )}
      </section>

      {/* Recurring task notification simulation */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">くりかえしタスク通知テスト</h2>
        <p className="text-xs text-gray-500">
          実際のくりかえしテンプレートを使って通知をシミュレーションします。タスクは生成されません。
        </p>
        <button
          onClick={() => simulateRecurring(false)}
          disabled={runningSim || !isSubscribed}
          className="w-full rounded-lg bg-amber-600 px-4 py-2 text-white font-medium disabled:opacity-50"
        >
          {runningSim ? 'シミュレーション中...' : 'くりかえし通知（自分だけ）'}
        </button>
        <button
          onClick={() => simulateRecurring(true)}
          disabled={runningSim || !isSubscribed}
          className="w-full rounded-lg bg-orange-600 px-4 py-2 text-white font-medium disabled:opacity-50"
        >
          {runningSim ? 'シミュレーション中...' : 'くりかえし通知（全員）'}
        </button>
        {recurringResult && (
          <pre className="rounded-lg bg-gray-100 p-3 text-xs whitespace-pre-wrap">
            {recurringResult}
          </pre>
        )}
      </section>
    </div>
  );
}
