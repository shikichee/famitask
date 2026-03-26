'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import type { User } from '@supabase/supabase-js';
import type { FamilyMember } from '@/types/database';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [member, setMember] = useState<FamilyMember | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createClient();

  const fetchMember = useCallback(
    async (userId: string) => {
      const { data } = await supabase
        .from('family_members')
        .select('*')
        .eq('auth_user_id', userId)
        .single();

      if (data) {
        setMember(data as FamilyMember);
        setIsAdmin(data.is_admin ?? false);
      }
    },
    [supabase],
  );

  useEffect(() => {
    // onAuthStateChange fires INITIAL_SESSION synchronously from local storage,
    // so we don't need a separate getUser() call that hits the network.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const newUser = session?.user ?? null;
      setUser(newUser);
      if (newUser) {
        await fetchMember(newUser.id);
      } else {
        setMember(null);
        setIsAdmin(false);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setMember(null);
    setIsAdmin(false);
  }, [supabase]);

  return { user, member, isAdmin, isLoading, signOut };
}
