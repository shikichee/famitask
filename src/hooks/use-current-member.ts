'use client';

import { useState, useEffect, useCallback } from 'react';
import { MEMBER_IDS } from '@/lib/constants';

const STORAGE_KEY = 'famitask-current-member';

export function useCurrentMember() {
  const [currentMemberId, setCurrentMemberId] = useState<string>(MEMBER_IDS.wife);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setCurrentMemberId(stored);
    }
  }, []);

  const switchMember = useCallback((memberId: string) => {
    setCurrentMemberId(memberId);
    localStorage.setItem(STORAGE_KEY, memberId);
  }, []);

  const isChild = currentMemberId === MEMBER_IDS.daughter;

  return { currentMemberId, switchMember, isChild };
}
