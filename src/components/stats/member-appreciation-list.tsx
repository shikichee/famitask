'use client';

import { FamilyMember, Completion, Thanks } from '@/types/database';
import { MemberAppreciationCard } from './member-appreciation-card';

interface MemberAppreciationListProps {
  members: FamilyMember[];
  completions: Completion[];
  currentMemberId: string;
  thanksList: Thanks[];
  onSendThanks: (completionId: string, fromMemberId: string, toMemberId: string) => void;
  onRemoveThanks: (completionId: string, fromMemberId: string, toMemberId: string) => void;
  isChild: boolean;
  onDeleteCompletion?: (completion: Completion) => void;
}

export function MemberAppreciationList({
  members,
  completions,
  currentMemberId,
  thanksList,
  onSendThanks,
  onRemoveThanks,
  isChild,
  onDeleteCompletion,
}: MemberAppreciationListProps) {
  return (
    <div className="space-y-4">
      <h2 className={`font-bold ${isChild ? 'text-xl' : 'text-lg'}`}>
        {isChild ? 'みんなのがんばり' : 'みんなの活動'}
      </h2>

      <div className="space-y-4">
        {members.map((member) => {
          const memberCompletions = completions.filter((c) => c.member_id === member.id);
          return (
            <MemberAppreciationCard
              key={member.id}
              member={member}
              completions={memberCompletions}
              currentMemberId={currentMemberId}
              thanksList={thanksList}
              onSendThanks={onSendThanks}
              onRemoveThanks={onRemoveThanks}
              isChild={isChild}
              onDeleteCompletion={onDeleteCompletion}
            />
          );
        })}
      </div>
    </div>
  );
}
