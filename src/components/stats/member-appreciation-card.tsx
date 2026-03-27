'use client';

import { Heart } from 'lucide-react';
import { FamilyMember, Completion, Thanks } from '@/types/database';

interface MemberAppreciationCardProps {
  member: FamilyMember;
  completions: Completion[];
  currentMemberId: string;
  thanksList: Thanks[];
  onSendThanks: (completionId: string, fromMemberId: string, toMemberId: string) => void;
  isChild: boolean;
}

export function MemberAppreciationCard({
  member,
  completions,
  currentMemberId,
  thanksList,
  onSendThanks,
  isChild,
}: MemberAppreciationCardProps) {
  const taskCount = completions.length;
  const totalPoints = completions.reduce((sum, c) => sum + c.points, 0);
  const isSelf = member.id === currentMemberId;

  // Category chips
  const categoryMap = new Map<string, number>();
  completions.forEach((c) => {
    categoryMap.set(c.category_emoji, (categoryMap.get(c.category_emoji) ?? 0) + 1);
  });
  const sortedCategories = [...categoryMap.entries()].sort((a, b) => b[1] - a[1]);

  // Received thanks for self (per completion)
  const receivedThanksMap = new Map<string, Thanks[]>();
  if (isSelf) {
    thanksList.forEach((t) => {
      if (t.to_member_id === member.id && completions.some((c) => c.id === t.completion_id)) {
        const arr = receivedThanksMap.get(t.completion_id) ?? [];
        arr.push(t);
        receivedThanksMap.set(t.completion_id, arr);
      }
    });
  }
  const totalReceivedCount = isSelf
    ? new Set(
        thanksList
          .filter((t) => t.to_member_id === member.id && completions.some((c) => c.id === t.completion_id))
          .map((t) => t.from_member_id)
      ).size
    : 0;

  return (
    <div
      className="rounded-xl bg-card border p-4 space-y-3 border-l-4"
      style={{ borderLeftColor: member.color }}
    >
      {/* Header: avatar + name */}
      <div className="flex items-center gap-2">
        <span className={isChild ? 'text-2xl' : 'text-xl'}>{member.avatar}</span>
        <span
          className={`font-bold ${isChild ? 'text-lg' : 'text-base'}`}
          style={{ color: member.color }}
        >
          {member.name}
        </span>
      </div>

      {taskCount > 0 ? (
        <>
          {/* Main metric: task count */}
          <p className={isChild ? 'text-base' : 'text-sm'}>
            {isChild ? (
              <>
                <span className="text-2xl font-bold text-primary">{taskCount}つ</span>
                のタスクをやってくれたよ！
              </>
            ) : (
              <>
                <span className="text-2xl font-bold text-primary">{taskCount}</span>
                {' '}タスク完了
              </>
            )}
            <span className="text-xs text-muted-foreground ml-1">（{totalPoints}pt）</span>
          </p>

          {/* Category chips */}
          <div className="flex flex-wrap gap-2">
            {sortedCategories.map(([emoji, count]) => (
              <span
                key={emoji}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted ${isChild ? 'text-base' : 'text-sm'}`}
              >
                {emoji}
                <span className="font-medium">{'\u00d7'}{count}</span>
              </span>
            ))}
          </div>

          {/* Received thanks summary for self */}
          {isSelf && totalReceivedCount > 0 && (
            <div className="flex items-center gap-2 pt-1">
              <Heart className="w-4 h-4 fill-[#F2B199] text-[#F2B199]" />
              <span className={`${isChild ? 'text-sm' : 'text-xs'} text-muted-foreground`}>
                {isChild
                  ? `${totalReceivedCount}にんからありがとうをもらったよ！`
                  : `${totalReceivedCount}人からありがとうをもらいました`}
              </span>
            </div>
          )}

          {/* Task detail list */}
          <div className="space-y-2 pt-1">
            {completions.map((c) => {
              const alreadySent = !isSelf && thanksList.some(
                (t) => t.completion_id === c.id && t.from_member_id === currentMemberId
              );
              const receivedForTask = isSelf ? (receivedThanksMap.get(c.id) ?? []) : [];

              return (
                <div
                  key={c.id}
                  className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-muted/50"
                >
                  <span className={isChild ? 'text-base' : 'text-sm'}>{c.category_emoji}</span>
                  <span className={`flex-1 min-w-0 truncate ${isChild ? 'text-sm' : 'text-xs'} font-medium`}>
                    {c.task_title}
                  </span>

                  {isSelf ? (
                    // Show received hearts on own tasks
                    receivedForTask.length > 0 && (
                      <span className="flex items-center gap-0.5 shrink-0">
                        <Heart className="w-3.5 h-3.5 fill-[#F2B199] text-[#F2B199]" />
                        <span className="text-xs text-[#F2B199] font-medium">{receivedForTask.length}</span>
                      </span>
                    )
                  ) : (
                    // Thanks button per task
                    <button
                      type="button"
                      onClick={() => {
                        if (!alreadySent) {
                          onSendThanks(c.id, currentMemberId, member.id);
                        }
                      }}
                      disabled={alreadySent}
                      className={`shrink-0 p-1 rounded-full transition-colors ${
                        alreadySent
                          ? 'text-[#F2B199] cursor-default'
                          : 'text-muted-foreground hover:text-[#F2B199] active:scale-110 transition-transform'
                      }`}
                      aria-label={`${c.task_title}にありがとう`}
                    >
                      <Heart className={`w-4 h-4 ${alreadySent ? 'fill-[#F2B199]' : ''}`} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <p className={`text-muted-foreground ${isChild ? 'text-base' : 'text-sm'}`}>
          {isChild ? 'おやすみちゅう 😴' : 'この期間のタスクはありません'}
        </p>
      )}
    </div>
  );
}
