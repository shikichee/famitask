'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePolling } from './use-polling';
import {
  getThanks as fetchThanksAction,
  sendThanks as sendThanksAction,
  removeThanks as removeThanksAction,
} from '@/actions/thanks';
import { Thanks } from '@/types/database';

export function useThanks(currentMemberId: string) {
  const [thanksList, setThanksList] = useState<Thanks[]>([]);
  const [latestReceivedThanks, setLatestReceivedThanks] = useState<Thanks | null>(null);
  const prevThanksRef = useRef<Thanks[]>([]);

  const currentMemberIdRef = useRef(currentMemberId);
  useEffect(() => { currentMemberIdRef.current = currentMemberId; }, [currentMemberId]);

  const fetchThanks = useCallback(async () => {
    const data = await fetchThanksAction();
    // Detect new thanks received since last fetch
    const prevIds = new Set(prevThanksRef.current.map(t => t.id));
    for (const t of data) {
      if (!prevIds.has(t.id) && t.to_member_id === currentMemberIdRef.current) {
        setLatestReceivedThanks(t);
        break;
      }
    }
    prevThanksRef.current = data;
    setThanksList(data);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch for external data
    fetchThanks();
  }, [fetchThanks]);

  usePolling(fetchThanks, 3000);

  const sendThanks = useCallback(async (completionId: string, fromMemberId: string, toMemberId: string) => {
    const optimistic: Thanks = {
      id: `optimistic-${completionId}-${fromMemberId}`,
      completion_id: completionId,
      from_member_id: fromMemberId,
      to_member_id: toMemberId,
      created_at: new Date().toISOString(),
    };
    setThanksList(prev => [optimistic, ...prev]);
    await sendThanksAction(completionId, fromMemberId, toMemberId);
  }, []);

  const removeThanks = useCallback(async (completionId: string, fromMemberId: string, toMemberId: string) => {
    setThanksList(prev => prev.filter(
      t => !(t.completion_id === completionId && t.from_member_id === fromMemberId)
    ));
    await removeThanksAction(completionId, fromMemberId, toMemberId);
  }, []);

  const clearReceivedThanks = useCallback(() => {
    setLatestReceivedThanks(null);
  }, []);

  return { thanksList, sendThanks, removeThanks, latestReceivedThanks, clearReceivedThanks };
}
