'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';

const supabase = createClient();
const isSupabaseConfigured = true;
import { Completion } from '@/types/database';

export function useCompletions(options?: { since?: string }) {
  const [completions, setCompletions] = useState<Completion[]>([]);
  const since = options?.since;

  const fetchCompletions = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    let query = supabase
      .from('completions')
      .select('*')
      .order('completed_at', { ascending: false })
      .limit(100);
    if (since) {
      query = query.gte('completed_at', since);
    }
    const { data } = await query;
    if (data) setCompletions(data);
  }, [since]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const channel = supabase
      .channel('completions_changes')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'completions' }, (payload: any) => {
        const newItem = payload.new as Completion;
        if (since && newItem.completed_at < since) return;
        setCompletions(prev => {
          if (prev.some(c => c.id === newItem.id)) return prev;
          return [newItem, ...prev].slice(0, 100);
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
      .subscribe(() => {
        fetchCompletions();
      });

    return () => { supabase.removeChannel(channel); };
  }, [fetchCompletions, since]);

  const deleteCompletion = useCallback(async (completion: Completion) => {
    if (!isSupabaseConfigured) return;

    // Delete completion record
    const { error } = await supabase
      .from('completions')
      .delete()
      .eq('id', completion.id);
    if (error) return;

    // Revert task to pending if task_id is available
    if (completion.task_id) {
      await supabase
        .from('tasks')
        .update({ status: 'pending', completed_by: null, completed_at: null })
        .eq('id', completion.task_id);
    }

    // Subtract points from member
    try {
      await supabase.rpc('decrement_points', {
        member_id: completion.member_id,
        amount: completion.points,
      });
    } catch {
      // Fallback: direct update
      const { data } = await supabase
        .from('family_members')
        .select('total_points')
        .eq('id', completion.member_id)
        .single();
      if (data) {
        await supabase
          .from('family_members')
          .update({ total_points: Math.max((data as { total_points: number }).total_points - completion.points, 0) })
          .eq('id', completion.member_id);
      }
    }

    // Optimistic update
    setCompletions(prev => prev.filter(c => c.id !== completion.id));
  }, []);

  return { completions, refetch: fetchCompletions, deleteCompletion };
}
