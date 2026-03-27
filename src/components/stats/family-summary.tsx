'use client';

import { Completion } from '@/types/database';
import { Period } from '@/lib/period-utils';

interface FamilySummaryProps {
  completions: Completion[];
  period: Period;
  isChild: boolean;
}

export function FamilySummary({ completions, period, isChild }: FamilySummaryProps) {
  const totalTasks = completions.length;
  const totalPoints = completions.reduce((sum, c) => sum + c.points, 0);

  // Aggregate category emoji counts
  const categoryMap = new Map<string, number>();
  completions.forEach((c) => {
    categoryMap.set(c.category_emoji, (categoryMap.get(c.category_emoji) ?? 0) + 1);
  });
  const sortedCategories = [...categoryMap.entries()].sort((a, b) => b[1] - a[1]);

  const periodLabel = period === 'week'
    ? (isChild ? 'こんしゅうのおうち' : '今週のおうち')
    : (isChild ? 'こんげつのおうち' : '今月のおうち');

  return (
    <div className="space-y-3">
      <h2 className={`font-bold ${isChild ? 'text-xl' : 'text-lg'}`}>
        {periodLabel}
      </h2>

      <div className="rounded-xl bg-[#F2B199]/10 border border-[#F2B199]/20 p-5 space-y-4">
        {totalTasks > 0 ? (
          <>
            <p className={`text-center ${isChild ? 'text-lg' : 'text-base'}`}>
              {isChild ? 'みんなで' : '家族で'}{' '}
              <span className="text-2xl font-bold text-primary">{totalTasks}</span>{' '}
              {isChild ? 'のタスクをやったよ！' : 'タスク完了'}
            </p>

            {sortedCategories.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2">
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
            )}

            <p className={`text-center text-muted-foreground ${isChild ? 'text-sm' : 'text-xs'}`}>
              {isChild
                ? 'みんなのおかげで おうちがまわっているよ'
                : 'みんなのおかげで おうちがまわっています'}
            </p>

            <p className="text-center text-xs text-muted-foreground">
              {isChild ? 'ごうけい' : '合計'} {totalPoints}pt
            </p>
          </>
        ) : (
          <p className={`text-center text-muted-foreground ${isChild ? 'text-base' : 'text-sm'}`}>
            {isChild ? 'まだタスクがないよ' : 'まだタスクがありません'}
          </p>
        )}
      </div>
    </div>
  );
}
