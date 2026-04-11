'use client';

import { useCallback } from 'react';
import { reportEffort as reportEffortAction } from '@/actions/notifications';

export function useReportEffort() {
  const reportEffort = useCallback(async (
    reporterId: string,
    targetMemberId: string,
    taskTitle: string,
    categoryEmoji: string,
    reporterName?: string,
    adultOnly?: boolean,
  ) => {
    await reportEffortAction(reporterId, targetMemberId, taskTitle, categoryEmoji, adultOnly ?? false);

    // Push notification
    fetch('/api/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        member_ids: [targetMemberId],
        title: 'がんばりを報告されました!',
        body: `${reporterName ?? 'メンバー'}が「${taskTitle}」を報告しました +1pt 📣`,
        url: '/history',
      }),
    }).catch(() => {});
  }, []);

  return { reportEffort };
}
