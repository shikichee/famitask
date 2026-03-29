'use client';

import { useMemo } from 'react';
import { FamilyMember } from '@/types/database';
import { useCompletions } from '@/hooks/use-completions';
import { useThanks } from '@/hooks/use-thanks';
import { ThanksButton } from '@/components/history/thanks-button';
import { ThanksOverlay } from '@/components/celebration/thanks-overlay';

interface TodaysEffortsProps {
  currentMemberId: string;
  isChild: boolean;
  members: FamilyMember[];
}

export function TodaysEfforts({ currentMemberId, isChild, members }: TodaysEffortsProps) {
  const { completions } = useCompletions();
  const { thanksList, sendThanks, removeThanks, latestReceivedThanks, clearReceivedThanks } = useThanks(currentMemberId);

  const memberMap = useMemo(
    () => new Map<string, FamilyMember>(members.map(m => [m.id, m])),
    [members],
  );

  const todaysEfforts = useMemo(() => {
    const today = new Date().toDateString();
    return completions.filter(
      c => new Date(c.completed_at).toDateString() === today && c.member_id !== currentMemberId,
    );
  }, [completions, currentMemberId]);

  return (
    <section>
      <h2 className="text-lg font-bold mb-2 flex items-center gap-1">
        {isChild ? 'きょうのがんばり' : '今日のがんばり'}
      </h2>

      {todaysEfforts.length === 0 ? (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-card border text-muted-foreground">
          <span className="text-lg">🌱</span>
          <p className={isChild ? 'text-sm' : 'text-xs'}>
            {isChild ? 'きょうはまだだれもおしごとしてないよ' : '今日はまだ完了タスクがありません'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {todaysEfforts.map(item => {
            const member = memberMap.get(item.member_id);
            return (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-card border"
              >
                <span className={isChild ? 'text-xl' : 'text-lg'}>{item.category_emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium line-clamp-2 ${isChild ? 'text-base' : 'text-sm'}`}>
                    {item.task_title}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={isChild ? 'text-lg' : 'text-base'}>{member?.avatar}</span>
                  <ThanksButton
                    completionId={item.id}
                    completionMemberId={item.member_id}
                    currentMemberId={currentMemberId}
                    thanksList={thanksList}
                    members={memberMap}
                    onSendThanks={sendThanks}
                    onRemoveThanks={removeThanks}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ThanksOverlay
        show={!!latestReceivedThanks}
        onDone={clearReceivedThanks}
      />
    </section>
  );
}
