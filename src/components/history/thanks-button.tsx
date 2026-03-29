'use client';

import { memo, useMemo, useState, useCallback } from 'react';
import { Heart } from 'lucide-react';
import { Thanks, FamilyMember } from '@/types/database';

interface ThanksButtonProps {
  completionId: string;
  completionMemberId: string;
  currentMemberId: string;
  thanksList: Thanks[];
  members: Map<string, FamilyMember>;
  onSendThanks: (completionId: string, fromMemberId: string, toMemberId: string) => void;
  onRemoveThanks: (completionId: string, fromMemberId: string, toMemberId: string) => void;
}

export const ThanksButton = memo(function ThanksButton({
  completionId,
  completionMemberId,
  currentMemberId,
  thanksList,
  members,
  onSendThanks,
  onRemoveThanks,
}: ThanksButtonProps) {
  const [popKey, setPopKey] = useState(0);
  const [optimisticSent, setOptimisticSent] = useState(false);

  const thanksForCompletion = useMemo(
    () => thanksList.filter((t) => t.completion_id === completionId),
    [thanksList, completionId]
  );
  const isMine = completionMemberId === currentMemberId;
  const dbSent = thanksForCompletion.some((t) => t.from_member_id === currentMemberId);
  const sent = dbSent || optimisticSent;

  const handleClick = useCallback(() => {
    if (sent) {
      setOptimisticSent(false);
      onRemoveThanks(completionId, currentMemberId, completionMemberId);
    } else {
      setOptimisticSent(true);
      setPopKey((k) => k + 1);
      onSendThanks(completionId, currentMemberId, completionMemberId);
    }
  }, [sent, onSendThanks, onRemoveThanks, completionId, currentMemberId, completionMemberId]);

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
      onClick={handleClick}
      className={`flex items-center gap-1 transition-colors ${
        sent
          ? 'text-pink-500 hover:text-pink-400 active:scale-90 transition-transform'
          : 'text-muted-foreground hover:text-pink-500 active:scale-125 transition-transform'
      }`}
    >
      <Heart
        key={popKey}
        className={`w-5 h-5 transition-all duration-300 ${
          sent ? 'fill-pink-500' : ''
        } ${optimisticSent && !dbSent ? 'animate-thanks-pop' : ''}`}
      />
    </button>
  );
});
