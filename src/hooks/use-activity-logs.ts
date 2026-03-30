'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRealtimeEvent } from './use-realtime';
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch for external data
    fetchActivityLogs();
  }, [fetchActivityLogs]);

  useRealtimeEvent('activity_logs', 'INSERT', (payload) => {
    const newItem = payload.new as ActivityLog;
    setActivityLogs(prev => {
      if (prev.some(a => a.id === newItem.id)) return prev;
      return [newItem, ...prev].slice(0, 30);
    });
  });

  useRealtimeEvent('activity_logs', 'DELETE', (payload) => {
    const deleted = payload.old as ActivityLog;
    setActivityLogs(prev => prev.filter(a => a.id !== deleted.id));
  });

  const deleteActivityLog = useCallback(async (id: string) => {
    await supabase
      .from('activity_logs')
      .delete()
      .eq('id', id);
    setActivityLogs(prev => prev.filter(a => a.id !== id));
  }, []);

  return { activityLogs, refetch: fetchActivityLogs, deleteActivityLog };
}
