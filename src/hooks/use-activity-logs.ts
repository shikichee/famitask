'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { ActivityLog } from '@/types/database';

const supabase = createClient();

export function useActivityLogs() {
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  const fetchActivityLogs = useCallback(async () => {
    const { data } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);
    if (data) setActivityLogs(data);
  }, []);

  useEffect(() => {
    fetchActivityLogs();

    const channel = supabase
      .channel('activity_logs_changes')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_logs' }, (payload: any) => {
        const newItem = payload.new as ActivityLog;
        setActivityLogs(prev => {
          if (prev.some(a => a.id === newItem.id)) return prev;
          return [newItem, ...prev].slice(0, 30);
        });
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'activity_logs' }, (payload: any) => {
        const deleted = payload.old as ActivityLog;
        setActivityLogs(prev => prev.filter(a => a.id !== deleted.id));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchActivityLogs]);

  const deleteActivityLog = useCallback(async (id: string) => {
    await supabase
      .from('activity_logs')
      .delete()
      .eq('id', id);
    setActivityLogs(prev => prev.filter(a => a.id !== id));
  }, []);

  return { activityLogs, refetch: fetchActivityLogs, deleteActivityLog };
}
