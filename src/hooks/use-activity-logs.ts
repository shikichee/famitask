'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePolling } from './use-polling';
import {
  getActivityLogs as fetchLogsAction,
  deleteActivityLog as deleteLogAction,
} from '@/actions/activity-logs';
import { ActivityLog } from '@/types/database';

export function useActivityLogs() {
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  const fetchActivityLogs = useCallback(async () => {
    const data = await fetchLogsAction();
    setActivityLogs(data);
  }, []);

  useEffect(() => {
    fetchActivityLogs();
  }, [fetchActivityLogs]);

  usePolling(fetchActivityLogs, 3000);

  const deleteActivityLog = useCallback(async (id: string) => {
    setActivityLogs(prev => prev.filter(a => a.id !== id));
    await deleteLogAction(id);
  }, []);

  return { activityLogs, refetch: fetchActivityLogs, deleteActivityLog };
}
