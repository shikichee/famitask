'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';

const supabase = createClient();
const isSupabaseConfigured = true;
import { Completion } from '@/types/database';

export function useCompletions() {
  const [completions, setCompletions] = useState<Completion[]>([]);

  const fetchCompletions = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const { data } = await supabase
      .from('completions')
      .select('*')
      .order('completed_at', { ascending: false })
      .limit(100);
    if (data) setCompletions(data);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    fetchCompletions();

    const channel = supabase
      .channel('completions_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'completions' }, () => {
        fetchCompletions();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchCompletions]);

  return { completions, refetch: fetchCompletions };
}
