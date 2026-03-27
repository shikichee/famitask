'use client';

import { ReactNode } from 'react';
import { Header } from '@/components/layout/header';
import { BottomNav } from '@/components/layout/bottom-nav';
import { useCurrentMember } from '@/hooks/use-current-member';
import { useAuthContext } from '@/components/providers/auth-provider';

interface AppShellProps {
  children: (props: { currentMemberId: string; isChild: boolean }) => ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { currentMemberId, isChild, authLoading } = useCurrentMember();
  const { member, signOut } = useAuthContext();

  if (authLoading) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  return (
    <>
      <Header
        authMember={member}
        onSignOut={signOut}
      />
      <main className="flex-1 pb-20">
        <div className="max-w-lg mx-auto px-4 py-4">
          {children({ currentMemberId, isChild })}
        </div>
      </main>
      <BottomNav isChild={isChild} />
    </>
  );
}
