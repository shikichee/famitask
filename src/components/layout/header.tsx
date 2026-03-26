'use client';

import { FamilyMember } from '@/types/database';
import { LogOut } from 'lucide-react';

interface HeaderProps {
  members: FamilyMember[];
  currentMemberId: string;
  onSwitchMember: (id: string) => void;
  isAdmin: boolean;
  onSignOut: () => void;
}

export function Header({ members, currentMemberId, onSwitchMember, isAdmin, onSignOut }: HeaderProps) {
  const currentMember = members.find(m => m.id === currentMemberId);
  const displayMembers = isAdmin ? members : members.filter(m => m.id === currentMemberId);

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b">
      <div className="flex items-center justify-between px-4 py-3">
        <h1 className="text-lg font-bold">
          ファミタス
        </h1>
        <div className="flex items-center gap-1">
          {displayMembers.map((member) => (
            <button
              key={member.id}
              onClick={() => isAdmin && onSwitchMember(member.id)}
              className={`
                flex items-center justify-center w-10 h-10 rounded-full text-xl
                transition-all duration-200
                ${member.id === currentMemberId
                  ? 'ring-2 ring-offset-2 scale-110'
                  : 'opacity-50 hover:opacity-80'
                }
                ${!isAdmin ? 'cursor-default' : ''}
              `}
              style={{
                ['--tw-ring-color' as string]: member.color,
              } as React.CSSProperties}
              title={member.name}
            >
              {member.avatar}
            </button>
          ))}
          <button
            onClick={onSignOut}
            className="ml-2 flex items-center justify-center w-8 h-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="ログアウト"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
      {currentMember && (
        <div
          className="h-0.5"
          style={{ backgroundColor: currentMember.color }}
        />
      )}
    </header>
  );
}
