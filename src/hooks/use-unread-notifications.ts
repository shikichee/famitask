'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePolling } from './use-polling';
import { getUnreadCount as getUnreadCountAction } from '@/actions/notifications';
import { updateLastSeen } from '@/actions/family-members';

export function useUnreadNotifications(currentMemberId: string) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(null);

  const fetchCount = useCallback(async () => {
    if (!currentMemberId) { setUnreadCount(0); return; }
    const { count, lastSeenAt: since } = await getUnreadCountAction(currentMemberId);
    setUnreadCount(count);
    setLastSeenAt(since);
  }, [currentMemberId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch for external data
    fetchCount();
  }, [fetchCount]);

  usePolling(fetchCount, 5000);

  const markAsRead = useCallback(async () => {
    if (!currentMemberId) return;
    setUnreadCount(0);
    await updateLastSeen(currentMemberId);
  }, [currentMemberId]);

  return { unreadCount, lastSeenAt, markAsRead };
}
