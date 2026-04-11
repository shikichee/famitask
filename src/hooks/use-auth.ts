'use client';

import { useState, useEffect, useCallback } from 'react';
import type { FamilyMember } from '@/types/database';

export function useAuth() {
  const [member, setMember] = useState<FamilyMember | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : { member: null }))
      .then(({ member: m }) => {
        if (m) {
          setMember(m);
          setIsAdmin(m.is_admin ?? false);
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const signOut = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setMember(null);
    setIsAdmin(false);
    window.location.href = '/login';
  }, []);

  return { member, isAdmin, isLoading, signOut };
}
