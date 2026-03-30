'use client';

import { useState, useMemo, useCallback } from 'react';
import { Completion, TaskCategory } from '@/types/database';
import { AppShell } from '@/components/app-shell';
import { PeriodToggle } from '@/components/stats/period-toggle';
import { FamilySummary } from '@/components/stats/family-summary';
import { MemberAppreciationList } from '@/components/stats/member-appreciation-list';
import { ThanksOverlay } from '@/components/celebration/thanks-overlay';
import { useFamilyMembers } from '@/hooks/use-family-members';
import { useCompletions } from '@/hooks/use-completions';
import { useCategories } from '@/hooks/use-tasks';
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
  const { completions, loading, deleteCompletion, undoCompletion, updateCompletion } = useCompletions({ since });
  const categories = useCategories();
  const [confirmTarget, setConfirmTarget] = useState<Completion | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [undoTarget, setUndoTarget] = useState<Completion | null>(null);
  const [undoing, setUndoing] = useState(false);
  const [editTarget, setEditTarget] = useState<Completion | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editEmoji, setEditEmoji] = useState('');

  const handleDelete = useCallback(async () => {
    if (!confirmTarget) return;
    setDeleting(true);
    await deleteCompletion(confirmTarget);
    setDeleting(false);
    setConfirmTarget(null);
  }, [confirmTarget, deleteCompletion]);

  const handleUndo = useCallback(async () => {
    if (!undoTarget) return;
    setUndoing(true);
    await undoCompletion(undoTarget);
    setUndoing(false);
    setUndoTarget(null);
  }, [undoTarget, undoCompletion]);

  const [editPoints, setEditPoints] = useState(2);

  const handleEditOpen = useCallback((item: Completion) => {
    setEditTarget(item);
    setEditTitle(item.task_title);
    setEditEmoji(item.category_emoji);
    setEditPoints(item.points);
  }, []);

  const handleEditSave = useCallback(async () => {
    if (!editTarget || !editTitle.trim()) return;
    await updateCompletion(editTarget.id, {
      task_title: editTitle.trim(),
      category_emoji: editEmoji,
      points: editPoints,
    });
    setEditTarget(null);
  }, [editTarget, editTitle, editEmoji, editPoints, updateCompletion]);

  const filteredCompletions = useMemo(
    () => filterByPeriod(completions, period),
    [completions, period]
  );

  const { thanksList, sendThanks, removeThanks, latestReceivedThanks, clearReceivedThanks } = useThanks(currentMemberId);

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
        onRemoveThanks={removeThanks}
        isChild={isChild}
        onDeleteCompletion={isChild ? undefined : setConfirmTarget}
        onUndoCompletion={isChild ? undefined : setUndoTarget}
        onEditCompletion={isChild ? undefined : handleEditOpen}
      />
      <ThanksOverlay
        show={!!latestReceivedThanks}
        onDone={clearReceivedThanks}
      />

      {/* Edit completion dialog */}
      {editTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setEditTarget(null)}
        >
          <div
            className="bg-card rounded-2xl p-6 mx-4 max-w-sm w-full shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-bold text-base">履歴を編集</p>
            <div>
              <label className="text-sm font-medium">タスク名</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium">カテゴリ</label>
              <div className="grid grid-cols-4 gap-2 mt-1">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setEditEmoji(cat.emoji)}
                    className={`
                      flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all
                      ${cat.emoji === editEmoji
                        ? 'border-primary bg-accent'
                        : 'border-transparent bg-muted hover:bg-muted/80'
                      }
                    `}
                  >
                    <span className="text-xl">{cat.emoji}</span>
                    <span className="text-[10px] font-medium">{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">ポイント</label>
              <div className="flex gap-2 mt-1">
                {[1, 2, 3].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setEditPoints(p)}
                    className={`
                      flex-1 flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all
                      ${p === editPoints
                        ? 'border-primary bg-accent'
                        : 'border-transparent bg-muted hover:bg-muted/80'
                      }
                    `}
                  >
                    <span className="text-sm">{'★'.repeat(p)}</span>
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {p === 1 ? 'かるい' : p === 2 ? 'ふつう' : 'がんばった'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="flex-1 py-2 rounded-xl border text-sm font-medium"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleEditSave}
                disabled={!editTitle.trim()}
                className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-colors disabled:opacity-50"
              >
                更新
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-card rounded-2xl p-6 mx-4 max-w-sm w-full shadow-xl space-y-4">
            <p className="font-bold text-base">履歴を削除しますか？</p>
            <p className="text-sm text-muted-foreground">
              「{confirmTarget.task_title}」の完了記録を削除し、{confirmTarget.points}ptを差し引きます。
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

      {undoTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-card rounded-2xl p-6 mx-4 max-w-sm w-full shadow-xl space-y-4">
            <p className="font-bold text-base">完了を取り消しますか？</p>
            <p className="text-sm text-muted-foreground">
              「{undoTarget.task_title}」の完了を取り消し、{undoTarget.points}ptを差し引いてタスクをボードに戻します。
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setUndoTarget(null)}
                className="flex-1 py-2 rounded-xl border text-sm font-medium"
                disabled={undoing}
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleUndo}
                className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-colors disabled:opacity-50"
                disabled={undoing}
              >
                {undoing ? '取り消し中...' : '取り消す'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
