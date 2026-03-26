'use client';

import { createContext, useContext } from 'react';
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
  const auth = useAuth();

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  return useContext(AuthContext);
}
