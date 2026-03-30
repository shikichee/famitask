'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRealtimeEvent } from './use-realtime';
import { Thanks } from '@/types/database';

const supabase = createClient();

export function useThanks(currentMemberId: string) {
  const [thanksList, setThanksList] = useState<Thanks[]>([]);
  const [latestReceivedThanks, setLatestReceivedThanks] = useState<Thanks | null>(null);

  const fetchThanks = useCallback(async () => {
    const { data } = await supabase
      .from('thanks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (data) setThanksList(data);
  }, []);

  const currentMemberIdRef = useRef(currentMemberId);
  useEffect(() => { currentMemberIdRef.current = currentMemberId; }, [currentMemberId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch for external data
    fetchThanks();
  }, [fetchThanks]);

  useRealtimeEvent('thanks', 'INSERT', (payload) => {
    const newThanks = payload.new as Thanks;
    setThanksList((prev) => [newThanks, ...prev]);
    if (newThanks.to_member_id === currentMemberIdRef.current) {
      setLatestReceivedThanks(newThanks);
    }
  });

  const sendThanks = useCallback(async (completionId: string, fromMemberId: string, toMemberId: string) => {
    // Optimistic update
    const optimistic: Thanks = {
      id: `optimistic-${completionId}-${fromMemberId}`,
      completion_id: completionId,
      from_member_id: fromMemberId,
      to_member_id: toMemberId,
      created_at: new Date().toISOString(),
    };
    setThanksList((prev) => [optimistic, ...prev]);
    await supabase.from('thanks').upsert(
      { completion_id: completionId, from_member_id: fromMemberId, to_member_id: toMemberId },
      { onConflict: 'completion_id,from_member_id' }
    );
    await supabase.rpc('increment_points', { member_id: toMemberId, amount: 1 });
  }, []);

  const removeThanks = useCallback(async (completionId: string, fromMemberId: string, toMemberId: string) => {
    // Optimistic update
    setThanksList((prev) => prev.filter(
      (t) => !(t.completion_id === completionId && t.from_member_id === fromMemberId)
    ));
    await supabase
      .from('thanks')
      .delete()
      .eq('completion_id', completionId)
      .eq('from_member_id', fromMemberId);
    await supabase.rpc('increment_points', { member_id: toMemberId, amount: -1 });
  }, []);

  const clearReceivedThanks = useCallback(() => {
    setLatestReceivedThanks(null);
  }, []);

  return { thanksList, sendThanks, removeThanks, latestReceivedThanks, clearReceivedThanks };
}
