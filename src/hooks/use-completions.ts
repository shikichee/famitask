'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';

const supabase = createClient();
const isSupabaseConfigured = true;
import { Completion } from '@/types/database';

export function useCompletions(options?: { since?: string }) {
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const since = options?.since;

  const fetchCompletions = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    let query = supabase
      .from('completions')
      .select('*')
      .order('completed_at', { ascending: false })
      .limit(30);
    if (since) {
      query = query.gte('completed_at', since);
    }
    const { data } = await query;
    if (data) setCompletions(data);
    setLoading(false);
  }, [since]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch for external data
    fetchCompletions();

    const channel = supabase
      .channel('completions_changes')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'completions' }, (payload: any) => {
        const newItem = payload.new as Completion;
        if (since && newItem.completed_at < since) return;
        setCompletions(prev => {
          if (prev.some(c => c.id === newItem.id)) return prev;
          return [newItem, ...prev].slice(0, 30);
        });
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'completions' }, (payload: any) => {
        const updated = payload.new as Completion;
        setCompletions(prev => prev.map(c => c.id === updated.id ? updated : c));
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'completions' }, (payload: any) => {
        const deleted = payload.old as Completion;
        setCompletions(prev => prev.filter(c => c.id !== deleted.id));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchCompletions, since]);

  const deleteCompletion = useCallback(async (completion: Completion) => {
    if (!isSupabaseConfigured) return;

    // Optimistic update first
    setCompletions(prev => prev.filter(c => c.id !== completion.id));

    await supabase.rpc('delete_completion', { p_completion_id: completion.id });
  }, []);

  return { completions, loading, refetch: fetchCompletions, deleteCompletion };
}
