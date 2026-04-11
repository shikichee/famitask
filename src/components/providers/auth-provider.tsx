'use client';

import { createContext, useContext, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import type { FamilyMember } from '@/types/database';

type AuthContextType = {
  member: FamilyMember | null;
  isAdmin: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  member: null,
  isAdmin: false,
  isLoading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { member, isAdmin, isLoading, signOut } = useAuth();

  const value = useMemo(
    () => ({ member, isAdmin, isLoading, signOut }),
    [member, isAdmin, isLoading, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  return useContext(AuthContext);
}
