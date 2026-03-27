'use client';

import { useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';

const supabase = createClient();

export function useReportEffort() {
  const reportEffort = useCallback(async (
    reporterId: string,
    targetMemberId: string,
    taskTitle: string,
    categoryEmoji: string,
    reporterName?: string,
    adultOnly?: boolean,
  ) => {
    // 1. Create completion record (task_id=null, reported_by set)
    const { error } = await supabase.from('completions').insert({
      task_title: taskTitle,
      category_emoji: categoryEmoji,
      member_id: targetMemberId,
      points: 1,
      reported_by: reporterId,
      adult_only: adultOnly ?? false,
    });
    if (error) throw error;

    // 2. Award 1pt to target member
    await supabase.rpc('increment_points', { member_id: targetMemberId, amount: 1 });

    // 3. Log activity (fire-and-forget)
    supabase.from('activity_logs').insert({
      event_type: 'effort_reported',
      actor_id: reporterId,
      target_member_id: targetMemberId,
      task_title: taskTitle,
      category_emoji: categoryEmoji,
      points: 1,
    }).then(() => {}, () => {});

    // 4. Push notification to target member
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
