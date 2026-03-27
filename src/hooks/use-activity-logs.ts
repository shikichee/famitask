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
      .limit(100);
    if (data) setActivityLogs(data);
  }, []);

  useEffect(() => {
    // Delay subscribe to avoid auth token lock contention with other hooks
    const timer = setTimeout(() => {
      const ch = supabase
        .channel('activity_logs_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_logs' }, () => {
          fetchActivityLogs();
        })
        .subscribe(() => {
          fetchActivityLogs();
        });
      channelRef = ch;
    }, 100);

    let channelRef: ReturnType<typeof supabase.channel> | null = null;

    return () => {
      clearTimeout(timer);
      if (channelRef) supabase.removeChannel(channelRef);
    };
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
