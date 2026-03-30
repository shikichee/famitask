'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRealtimeEvent } from './use-realtime';

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

  const sinceRef = useRef(since);
  useEffect(() => { sinceRef.current = since; }, [since]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch for external data
    fetchCompletions();
  }, [fetchCompletions, since]);

  useRealtimeEvent('completions', 'INSERT', (payload) => {
    const newItem = payload.new as Completion;
    if (sinceRef.current && newItem.completed_at < sinceRef.current) return;
    setCompletions(prev => {
      if (prev.some(c => c.id === newItem.id)) return prev;
      return [newItem, ...prev].slice(0, 30);
    });
  });

  useRealtimeEvent('completions', 'UPDATE', (payload) => {
    const updated = payload.new as Completion;
    setCompletions(prev => prev.map(c => c.id === updated.id ? updated : c));
  });

  useRealtimeEvent('completions', 'DELETE', (payload) => {
    const deleted = payload.old as Completion;
    setCompletions(prev => prev.filter(c => c.id !== deleted.id));
  });

  const deleteCompletion = useCallback(async (completion: Completion) => {
    if (!isSupabaseConfigured) return;

    // Optimistic update first
    setCompletions(prev => prev.filter(c => c.id !== completion.id));

    await supabase.rpc('delete_completion', { p_completion_id: completion.id });
  }, []);

  const updateCompletionPoints = useCallback(async (completionId: string, newPoints: number) => {
    if (!isSupabaseConfigured) return;

    setCompletions(prev => prev.map(c =>
      c.id === completionId ? { ...c, points: newPoints } : c
    ));

    await supabase.rpc('update_completion_points', {
      p_completion_id: completionId,
      p_new_points: newPoints,
    });
  }, []);

  const completionsRef = useRef(completions);
  useEffect(() => { completionsRef.current = completions; }, [completions]);

  const updateCompletion = useCallback(async (completionId: string, updates: {
    task_title: string;
    category_emoji: string;
    points: number;
  }) => {
    if (!isSupabaseConfigured) return;

    const snapshot = [...completionsRef.current];
    const oldCompletion = completionsRef.current.find(c => c.id === completionId);
    setCompletions(cs => cs.map(c => c.id === completionId ? { ...c, ...updates } : c));

    // If points changed, use the RPC to adjust member total_points
    if (oldCompletion && oldCompletion.points !== updates.points) {
      const { error } = await supabase.rpc('update_completion_points', {
        p_completion_id: completionId,
        p_new_points: updates.points,
      });
      if (error) {
        console.error('Failed to update completion points:', error);
        setCompletions(snapshot);
        return;
      }
    }

    // Update title and category_emoji
    const { error } = await supabase
      .from('completions')
      .update({ task_title: updates.task_title, category_emoji: updates.category_emoji })
      .eq('id', completionId);

    if (error) {
      console.error('Failed to update completion:', error);
      setCompletions(snapshot);
    }
  }, []);

  const undoCompletion = useCallback(async (completion: Completion) => {
    if (!isSupabaseConfigured) return;

    // Optimistic update
    setCompletions(prev => prev.filter(c => c.id !== completion.id));

    await supabase.rpc('undo_completion', { p_completion_id: completion.id });
  }, []);

  return { completions, loading, refetch: fetchCompletions, deleteCompletion, undoCompletion, updateCompletionPoints, updateCompletion };
}
