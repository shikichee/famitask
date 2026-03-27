'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthContext } from '@/components/providers/auth-provider';

const STORAGE_KEY = 'famitask-current-member';

export function useCurrentMember() {
  const { member, isAdmin, isLoading: authLoading } = useAuthContext();
  const [overrideMemberId, setOverrideMemberId] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin) {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        // Syncing state from external storage (localStorage)
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setOverrideMemberId(stored);
      }
    }
  }, [isAdmin]);

  const currentMemberId = isAdmin
    ? overrideMemberId ?? member?.id ?? ''
    : member?.id ?? '';

  const switchMember = useCallback(
    (memberId: string) => {
      if (!isAdmin) return;
      setOverrideMemberId(memberId);
      localStorage.setItem(STORAGE_KEY, memberId);
    },
    [isAdmin],
  );

  const isChild = member?.role === 'child';

  return { currentMemberId, switchMember, isChild, isAdmin, authLoading };
}
