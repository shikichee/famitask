'use client';

import { FamilyMember } from '@/types/database';
import { LogOut } from 'lucide-react';

interface HeaderProps {
  authMember: FamilyMember | null;
  onSignOut: () => void;
}

export function Header({ authMember, onSignOut }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b">
      <div className="flex items-center justify-between px-4 py-3">
        <h1 className="text-lg font-bold text-[#F28705]">
          ファミタス
        </h1>
        <div className="flex items-center gap-3">
          {authMember && (
            <div className="flex items-center gap-2">
              <span className="text-xl">{authMember.avatar}</span>
              <span className="text-sm font-medium">{authMember.name}</span>
            </div>
          )}
          <button
            onClick={onSignOut}
            className="flex items-center justify-center w-8 h-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="ログアウト"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="h-0.5 bg-[#F29F05]" />
    </header>
  );
}
