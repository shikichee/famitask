'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRealtimeEvent } from './use-realtime';

const supabase = createClient();

export function useUnreadNotifications(currentMemberId: string) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(null);

  const fetchCount = useCallback(async () => {
    if (!currentMemberId) { setUnreadCount(0); return; }

    const { data: member } = await supabase
      .from('family_members')
      .select('last_seen_history_at')
      .eq('id', currentMemberId)
      .single();

    if (!member) { setUnreadCount(0); return; }

    const since = member.last_seen_history_at;
    setLastSeenAt(since);

    const [{ count: logCount }, { count: thanksCount }] = await Promise.all([
      supabase
        .from('activity_logs')
        .select('*', { count: 'exact', head: true })
        .gt('created_at', since),
      supabase
        .from('thanks')
        .select('*', { count: 'exact', head: true })
        .gt('created_at', since),
    ]);

    setUnreadCount((logCount ?? 0) + (thanksCount ?? 0));
  }, [currentMemberId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch for external data
    fetchCount();
  }, [fetchCount]);

  useRealtimeEvent('activity_logs', 'INSERT', () => {
    setUnreadCount(prev => prev + 1);
  });

  useRealtimeEvent('thanks', 'INSERT', () => {
    setUnreadCount(prev => prev + 1);
  });

  const markAsRead = useCallback(async () => {
    if (!currentMemberId) return;
    setUnreadCount(0);
    await supabase
      .from('family_members')
      .update({ last_seen_history_at: new Date().toISOString() })
      .eq('id', currentMemberId);
  }, [currentMemberId]);

  return { unreadCount, lastSeenAt, markAsRead };
}
