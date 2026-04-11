'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePolling } from './use-polling';
import { getFamilyMembers as fetchMembersAction } from '@/actions/family-members';
import { FamilyMember } from '@/types/database';

export function useFamilyMembers() {
  const [members, setMembers] = useState<FamilyMember[]>([]);

  const fetchMembers = useCallback(async () => {
    const data = await fetchMembersAction();
    setMembers(data);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch for external data
    fetchMembers();
  }, [fetchMembers]);

  usePolling(fetchMembers, 5000);

  return members;
}
