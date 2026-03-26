'use client';

import { AppShell } from '@/components/app-shell';
import { useFamilyMembers } from '@/hooks/use-family-members';
import { useCompletions } from '@/hooks/use-completions';
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
  const { completions } = useCompletions();
  const memberMap = new Map<string, FamilyMember>(members.map(m => [m.id, m]));

  const grouped = groupByDate(completions);

  return (
    <AppShell>
      {({ isChild }) => (
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
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={isChild ? 'text-lg' : 'text-base'}>{member?.avatar}</span>
                          <span className="text-sm font-bold text-amber-500">
                            +{item.points}pt
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </AppShell>
  );
}
