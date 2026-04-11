'use client';

import { useEffect, useRef } from 'react';

export function useRecurringGeneration(currentMemberId: string) {
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current || !currentMemberId) return;
    hasRun.current = true;

    // Trigger server-side recurring task generation
    fetch('/api/cron/generate-recurring', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => {});
  }, [currentMemberId]);
}
