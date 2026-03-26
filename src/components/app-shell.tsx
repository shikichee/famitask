'use client';

import { ReactNode } from 'react';
import { Header } from '@/components/layout/header';
import { BottomNav } from '@/components/layout/bottom-nav';
import { useCurrentMember } from '@/hooks/use-current-member';
import { useFamilyMembers } from '@/hooks/use-family-members';

interface AppShellProps {
  children: (props: { currentMemberId: string; isChild: boolean }) => ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { currentMemberId, switchMember, isChild } = useCurrentMember();
  const members = useFamilyMembers();

  return (
    <>
      <Header
        members={members}
        currentMemberId={currentMemberId}
        onSwitchMember={switchMember}
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
