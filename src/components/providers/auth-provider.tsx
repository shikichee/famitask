'use client';

import { createContext, useContext, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import type { User } from '@supabase/supabase-js';
import type { FamilyMember } from '@/types/database';

type AuthContextType = {
  user: User | null;
  member: FamilyMember | null;
  isAdmin: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  member: null,
  isAdmin: false,
  isLoading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, member, isAdmin, isLoading, signOut } = useAuth();

  const value = useMemo(
    () => ({ user, member, isAdmin, isLoading, signOut }),
    [user, member, isAdmin, isLoading, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  return useContext(AuthContext);
}
