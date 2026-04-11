'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePolling } from './use-polling';
import {
  getCompletions as fetchCompletionsAction,
  deleteCompletion as deleteCompletionAction,
  updateCompletionPoints as updateCompletionPointsAction,
  updateCompletion as updateCompletionAction,
  undoCompletion as undoCompletionAction,
} from '@/actions/completions';
import { Completion } from '@/types/database';

export function useCompletions(options?: { since?: string }) {
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [loading, setLoading] = useState(true);
  const since = options?.since;

  const fetchCompletions = useCallback(async () => {
    const data = await fetchCompletionsAction(since);
    setCompletions(data);
    setLoading(false);
  }, [since]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch for external data
    fetchCompletions();
  }, [fetchCompletions, since]);

  usePolling(fetchCompletions, 3000);

  const completionsRef = useRef(completions);
  useEffect(() => { completionsRef.current = completions; }, [completions]);

  const deleteCompletion = useCallback(async (completion: Completion) => {
    setCompletions(prev => prev.filter(c => c.id !== completion.id));
    await deleteCompletionAction(completion.id);
  }, []);

  const updateCompletionPoints = useCallback(async (completionId: string, newPoints: number) => {
    setCompletions(prev => prev.map(c =>
      c.id === completionId ? { ...c, points: newPoints } : c
    ));
    await updateCompletionPointsAction(completionId, newPoints);
  }, []);

  const updateCompletion = useCallback(async (completionId: string, updates: {
    task_title: string;
    category_emoji: string;
    points: number;
  }) => {
    const snapshot = [...completionsRef.current];
    setCompletions(cs => cs.map(c => c.id === completionId ? { ...c, ...updates } : c));

    try {
      await updateCompletionAction(completionId, updates);
    } catch {
      setCompletions(snapshot);
    }
  }, []);

  const undoCompletion = useCallback(async (completion: Completion) => {
    setCompletions(prev => prev.filter(c => c.id !== completion.id));
    await undoCompletionAction(completion.id);
  }, []);

  return { completions, loading, refetch: fetchCompletions, deleteCompletion, undoCompletion, updateCompletionPoints, updateCompletion };
}
