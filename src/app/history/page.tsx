'use client';

import { useState, useMemo } from 'react';
import { AppShell } from '@/components/app-shell';
import { useFamilyMembers } from '@/hooks/use-family-members';
import { useCompletions } from '@/hooks/use-completions';
import { useActivityLogs } from '@/hooks/use-activity-logs';
import { useThanks } from '@/hooks/use-thanks';
import { ThanksButton } from '@/components/history/thanks-button';
import { ThanksOverlay } from '@/components/celebration/thanks-overlay';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Completion, FamilyMember, ActivityLog, Thanks } from '@/types/database';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = d.getHours().toString().padStart(2, '0');
  const mins = d.getMinutes().toString().padStart(2, '0');
  return `${month}/${day} ${hours}:${mins}`;
}

function groupByDate<T extends { completed_at?: string; created_at?: string }>(
  items: T[],
  dateField: 'completed_at' | 'created_at'
): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  items.forEach((item) => {
    const dateStr = dateField === 'completed_at'
      ? (item as { completed_at: string }).completed_at
      : (item as { created_at: string }).created_at;
    const d = new Date(dateStr);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const arr = groups.get(key) ?? [];
    arr.push(item);
    groups.set(key, arr);
  });
  return groups;
}

function formatGroupDate(key: string): string {
  const [, m, d] = key.split('-');
  return `${Number(m)}月${Number(d)}日`;
}

const EVENT_CONFIG: Record<ActivityLog['event_type'], { icon: string; label: (actor: string, target: string, title: string) => string }> = {
  task_created: {
    icon: '➕',
    label: (actor, _target, title) => `${actor}が「${title}」を追加しました`,
  },
  task_completed: {
    icon: '✅',
    label: (actor, _target, title) => `${actor}が「${title}」を完了しました`,
  },
  task_self_assigned: {
    icon: '🙋',
    label: (actor, _target, title) => `${actor}が「${title}」をやると言いました`,
  },
  task_request_assigned: {
    icon: '🙏',
    label: (actor, target, title) => `${actor}が${target}に「${title}」をおねがいしました`,
  },
  effort_reported: {
    icon: '📣',
    label: (actor, target, title) => `${actor}が${target}のがんばりを報告：「${title}」`,
  },
};

export default function HistoryPage() {
  const members = useFamilyMembers();
  const { completions, deleteCompletion } = useCompletions();
  const { activityLogs, deleteActivityLog } = useActivityLogs();
  const memberMap = useMemo(() => new Map<string, FamilyMember>(members.map(m => [m.id, m])), [members]);

  return (
    <AppShell>
      {({ currentMemberId, isChild }) => (
        <HistoryContent
          currentMemberId={currentMemberId}
          isChild={isChild}
          completions={isChild ? completions.filter(c => !c.adult_only) : completions}
          activityLogs={activityLogs}
          memberMap={memberMap}
          deleteCompletion={deleteCompletion}
          deleteActivityLog={deleteActivityLog}
        />
      )}
    </AppShell>
  );
}

function HistoryContent({
  currentMemberId,
  isChild,
  completions,
  activityLogs,
  memberMap,
  deleteCompletion,
  deleteActivityLog,
}: {
  currentMemberId: string;
  isChild: boolean;
  completions: Completion[];
  activityLogs: ActivityLog[];
  memberMap: Map<string, FamilyMember>;
  deleteCompletion: (completion: Completion) => Promise<void>;
  deleteActivityLog: (id: string) => Promise<void>;
}) {
  const { thanksList, sendThanks, latestReceivedThanks, clearReceivedThanks } = useThanks(currentMemberId);
  const [confirmTarget, setConfirmTarget] = useState<Completion | null>(null);
  const [deleting, setDeleting] = useState(false);

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
        {isChild ? 'できごと' : 'アクティビティ'}
      </h2>

      <Tabs defaultValue="all">
        <TabsList className={`w-full ${isChild ? 'h-10' : 'h-8'}`}>
          <TabsTrigger value="all" className={isChild ? 'text-base' : 'text-sm'}>
            {isChild ? 'ぜんぶ' : 'すべて'}
          </TabsTrigger>
          <TabsTrigger value="completions" className={isChild ? 'text-base' : 'text-sm'}>
            {isChild ? 'かんりょう' : '完了'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <ActivityFeed
            activityLogs={activityLogs}
            memberMap={memberMap}
            isChild={isChild}
            deleteActivityLog={deleteActivityLog}
          />
        </TabsContent>

        <TabsContent value="completions">
          <CompletionsList
            completions={completions}
            memberMap={memberMap}
            isChild={isChild}
            currentMemberId={currentMemberId}
            thanksList={thanksList}
            sendThanks={sendThanks}
            setConfirmTarget={setConfirmTarget}
          />
        </TabsContent>
      </Tabs>

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

function ActivityFeed({
  activityLogs,
  memberMap,
  isChild,
  deleteActivityLog,
}: {
  activityLogs: ActivityLog[];
  memberMap: Map<string, FamilyMember>;
  isChild: boolean;
  deleteActivityLog: (id: string) => Promise<void>;
}) {
  const grouped = useMemo(() => groupByDate(activityLogs, 'created_at'), [activityLogs]);

  if (activityLogs.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-muted-foreground">
        <span className="text-4xl mb-3">📋</span>
        <p>{isChild ? 'まだできごとがないよ' : 'まだアクティビティがありません'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-3">
      {[...grouped.entries()].map(([dateKey, items]) => (
        <div key={dateKey}>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">
            {formatGroupDate(dateKey)}
          </h3>
          <div className="space-y-2">
            {items.map((item) => {
              const actor = memberMap.get(item.actor_id);
              const target = item.target_member_id ? memberMap.get(item.target_member_id) : null;
              const config = EVENT_CONFIG[item.event_type];
              const icon = item.event_type === 'task_completed' && item.category_emoji
                ? item.category_emoji
                : config.icon;

              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-card border"
                >
                  <span className={isChild ? 'text-xl' : 'text-lg'}>{icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium ${isChild ? 'text-base' : 'text-sm'}`}>
                      {config.label(
                        actor?.name ?? 'メンバー',
                        target?.name ?? 'メンバー',
                        item.task_title,
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(item.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={isChild ? 'text-lg' : 'text-base'}>{actor?.avatar}</span>
                    {(item.event_type === 'task_completed' || item.event_type === 'effort_reported') && item.points != null && (
                      <span className="text-sm font-bold text-primary">
                        +{item.points}pt
                      </span>
                    )}
                    {!isChild && (
                      <button
                        type="button"
                        onClick={() => deleteActivityLog(item.id)}
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
      ))}
    </div>
  );
}

function CompletionsList({
  completions,
  memberMap,
  isChild,
  currentMemberId,
  thanksList,
  sendThanks,
  setConfirmTarget,
}: {
  completions: Completion[];
  memberMap: Map<string, FamilyMember>;
  isChild: boolean;
  currentMemberId: string;
  thanksList: Thanks[];
  sendThanks: (completionId: string, fromMemberId: string, toMemberId: string) => Promise<void>;
  setConfirmTarget: (completion: Completion | null) => void;
}) {
  const grouped = useMemo(() => groupByDate(completions, 'completed_at'), [completions]);

  if (completions.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-muted-foreground">
        <span className="text-4xl mb-3">📝</span>
        <p>{isChild ? 'まだりれきがないよ' : 'まだ履歴がありません'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-3">
      {[...grouped.entries()].map(([dateKey, items]) => (
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
                    <p className={`font-medium line-clamp-2 ${isChild ? 'text-base' : 'text-sm'}`}>
                      {item.task_title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(item.completed_at)}
                    </p>
                    {item.reported_by && (
                      <p className="text-xs text-muted-foreground">
                        📣 {memberMap.get(item.reported_by)?.avatar} {isChild ? 'がほうこく' : 'が報告'}
                      </p>
                    )}
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
      ))}
    </div>
  );
}
