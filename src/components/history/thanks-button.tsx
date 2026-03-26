'use client';

import { Heart } from 'lucide-react';
import { Thanks, FamilyMember } from '@/types/database';

interface ThanksButtonProps {
  completionId: string;
  completionMemberId: string;
  currentMemberId: string;
  thanksList: Thanks[];
  members: Map<string, FamilyMember>;
  onSendThanks: (completionId: string, fromMemberId: string, toMemberId: string) => void;
}

export function ThanksButton({
  completionId,
  completionMemberId,
  currentMemberId,
  thanksList,
  members,
  onSendThanks,
}: ThanksButtonProps) {
  const thanksForCompletion = thanksList.filter((t) => t.completion_id === completionId);
  const isMine = completionMemberId === currentMemberId;
  const alreadySent = thanksForCompletion.some((t) => t.from_member_id === currentMemberId);

  if (isMine) {
    // Show received thanks count and sender avatars
    if (thanksForCompletion.length === 0) return null;
    return (
      <div className="flex items-center gap-1 text-pink-500">
        <Heart className="w-4 h-4 fill-pink-500" />
        <span className="text-xs font-medium">{thanksForCompletion.length}</span>
        <div className="flex -space-x-1">
          {thanksForCompletion.map((t) => {
            const sender = members.get(t.from_member_id);
            return (
              <span key={t.id} className="text-xs" title={sender?.name}>
                {sender?.avatar}
              </span>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => {
        if (!alreadySent) {
          onSendThanks(completionId, currentMemberId, completionMemberId);
        }
      }}
      disabled={alreadySent}
      className={`flex items-center gap-1 transition-colors ${
        alreadySent
          ? 'text-pink-500 cursor-default'
          : 'text-muted-foreground hover:text-pink-500 active:scale-110'
      }`}
    >
      <Heart className={`w-5 h-5 ${alreadySent ? 'fill-pink-500' : ''}`} />
    </button>
  );
}
