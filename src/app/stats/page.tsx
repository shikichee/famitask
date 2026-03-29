'use client';

import { useState, useMemo, useCallback } from 'react';
import { Completion } from '@/types/database';
import { AppShell } from '@/components/app-shell';
import { PeriodToggle } from '@/components/stats/period-toggle';
import { FamilySummary } from '@/components/stats/family-summary';
import { MemberAppreciationList } from '@/components/stats/member-appreciation-list';
import { ThanksOverlay } from '@/components/celebration/thanks-overlay';
import { useFamilyMembers } from '@/hooks/use-family-members';
import { useCompletions } from '@/hooks/use-completions';
import { useThanks } from '@/hooks/use-thanks';
import { Period, getPeriodStart, filterByPeriod } from '@/lib/period-utils';

export default function StatsPage() {
  return (
    <AppShell>
      {({ currentMemberId, isChild }) => (
        <StatsContent currentMemberId={currentMemberId} isChild={isChild} />
      )}
    </AppShell>
  );
}

function StatsContent({ currentMemberId, isChild }: { currentMemberId: string; isChild: boolean }) {
  const [period, setPeriod] = useState<Period>('week');
  const members = useFamilyMembers();

  const since = useMemo(() => getPeriodStart('month').toISOString(), []);
  const { completions, loading, deleteCompletion } = useCompletions({ since });
  const [confirmTarget, setConfirmTarget] = useState<Completion | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = useCallback(async () => {
    if (!confirmTarget) return;
    setDeleting(true);
    await deleteCompletion(confirmTarget);
    setDeleting(false);
    setConfirmTarget(null);
  }, [confirmTarget, deleteCompletion]);

  const filteredCompletions = useMemo(
    () => filterByPeriod(completions, period),
    [completions, period]
  );

  const { thanksList, sendThanks, latestReceivedThanks, clearReceivedThanks } = useThanks(currentMemberId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PeriodToggle
        period={period}
        onPeriodChange={setPeriod}
        isChild={isChild}
      />
      <FamilySummary
        completions={filteredCompletions}
        period={period}
        isChild={isChild}
      />
      <MemberAppreciationList
        members={members}
        completions={filteredCompletions}
        currentMemberId={currentMemberId}
        thanksList={thanksList}
        onSendThanks={sendThanks}
        isChild={isChild}
        onDeleteCompletion={isChild ? undefined : setConfirmTarget}
      />
      <ThanksOverlay
        show={!!latestReceivedThanks}
        onDone={clearReceivedThanks}
      />

      {confirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-card rounded-2xl p-6 mx-4 max-w-sm w-full shadow-xl space-y-4">
            <p className="font-bold text-base">履歴を削除しますか？</p>
            <p className="text-sm text-muted-foreground">
              「{confirmTarget.task_title}」の完了記録を削除し、{confirmTarget.points}ptを差し引きます。
              {confirmTarget.task_id && 'タスクはボードに戻ります。'}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmTarget(null)}
                className="flex-1 py-2 rounded-xl border text-sm font-medium"
                disabled={deleting}
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 py-2 rounded-xl bg-destructive text-white text-sm font-medium hover:opacity-90 transition-colors disabled:opacity-50"
                disabled={deleting}
              >
                {deleting ? '削除中...' : '削除する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
