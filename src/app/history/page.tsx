'use client';

import { useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { useFamilyMembers } from '@/hooks/use-family-members';
import { useCompletions } from '@/hooks/use-completions';
import { useThanks } from '@/hooks/use-thanks';
import { ThanksButton } from '@/components/history/thanks-button';
import { ThanksOverlay } from '@/components/celebration/thanks-overlay';
import { Completion, FamilyMember } from '@/types/database';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = d.getHours().toString().padStart(2, '0');
  const mins = d.getMinutes().toString().padStart(2, '0');
  return `${month}/${day} ${hours}:${mins}`;
}

function groupByDate(completions: Completion[]): Map<string, Completion[]> {
  const groups = new Map<string, Completion[]>();
  completions.forEach((c) => {
    const d = new Date(c.completed_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const arr = groups.get(key) ?? [];
    arr.push(c);
    groups.set(key, arr);
  });
  return groups;
}

function formatGroupDate(key: string): string {
  const [, m, d] = key.split('-');
  return `${Number(m)}月${Number(d)}日`;
}

export default function HistoryPage() {
  const members = useFamilyMembers();
  const { completions, deleteCompletion } = useCompletions();
  const memberMap = new Map<string, FamilyMember>(members.map(m => [m.id, m]));

  return (
    <AppShell>
      {({ currentMemberId, isChild }) => (
        <HistoryContent
          currentMemberId={currentMemberId}
          isChild={isChild}
          completions={completions}
          memberMap={memberMap}
          deleteCompletion={deleteCompletion}
        />
      )}
    </AppShell>
  );
}

function HistoryContent({
  currentMemberId,
  isChild,
  completions,
  memberMap,
  deleteCompletion,
}: {
  currentMemberId: string;
  isChild: boolean;
  completions: Completion[];
  memberMap: Map<string, FamilyMember>;
  deleteCompletion: (completion: Completion) => Promise<void>;
}) {
  const { thanksList, sendThanks, latestReceivedThanks, clearReceivedThanks } = useThanks(currentMemberId);
  const [confirmTarget, setConfirmTarget] = useState<Completion | null>(null);
  const [deleting, setDeleting] = useState(false);
  const grouped = groupByDate(completions);

  const handleDelete = async () => {
    if (!confirmTarget) return;
    setDeleting(true);
    await deleteCompletion(confirmTarget);
    setDeleting(false);
    setConfirmTarget(null);
  };

  return (
    <div className="space-y-4">
      <h2 className={`font-bold ${isChild ? 'text-xl' : 'text-lg'}`}>
        {isChild ? 'りれき' : '完了履歴'}
      </h2>

      {completions.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-muted-foreground">
          <span className="text-4xl mb-3">📝</span>
          <p>{isChild ? 'まだりれきがないよ' : 'まだ履歴がありません'}</p>
        </div>
      ) : (
        [...grouped.entries()].map(([dateKey, items]) => (
          <div key={dateKey}>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">
              {formatGroupDate(dateKey)}
            </h3>
            <div className="space-y-2">
              {items.map((item) => {
                const member = memberMap.get(item.member_id);
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-card border"
                  >
                    <span className={isChild ? 'text-xl' : 'text-lg'}>{item.category_emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium truncate ${isChild ? 'text-base' : 'text-sm'}`}>
                        {item.task_title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(item.completed_at)}
                      </p>
                      <ThanksButton
                        completionId={item.id}
                        completionMemberId={item.member_id}
                        currentMemberId={currentMemberId}
                        thanksList={thanksList}
                        members={memberMap}
                        onSendThanks={sendThanks}
                      />
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={isChild ? 'text-lg' : 'text-base'}>{member?.avatar}</span>
                      <span className="text-sm font-bold text-primary">
                        +{item.points}pt
                      </span>
                      {!isChild && (
                        <button
                          type="button"
                          onClick={() => setConfirmTarget(item)}
                          className="ml-1 p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
                          aria-label="削除"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* Confirmation dialog */}
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

      <ThanksOverlay
        show={!!latestReceivedThanks}
        onDone={clearReceivedThanks}
      />
    </div>
  );
}
