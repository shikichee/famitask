'use client';

import { FamilyMember, Completion } from '@/types/database';
import { Period } from '@/lib/period-utils';

interface WeeklySummaryProps {
  members: FamilyMember[];
  completions: Completion[];
  period: Period;
  isChild: boolean;
}

export function WeeklySummary({ members, completions, period, isChild }: WeeklySummaryProps) {
  // completions are pre-filtered by period from parent
  const totalTasks = completions.length;
  const totalPoints = completions.reduce((sum, c) => sum + c.points, 0);

  return (
    <div className="space-y-3">
      <h2 className={`font-bold ${isChild ? 'text-xl' : 'text-lg'}`}>
        {period === 'week'
          ? (isChild ? 'こんしゅうのまとめ' : '今週のまとめ')
          : (isChild ? 'こんげつのまとめ' : '今月のまとめ')}
      </h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col items-center p-4 rounded-xl bg-card border">
          <span className="text-3xl mb-1">✅</span>
          <span className={`font-bold ${isChild ? 'text-2xl' : 'text-xl'}`}>{totalTasks}</span>
          <span className="text-xs text-muted-foreground">
            {isChild ? 'かんりょう' : '完了タスク'}
          </span>
        </div>
        <div className="flex flex-col items-center p-4 rounded-xl bg-card border">
          <span className="text-3xl mb-1">⭐</span>
          <span className={`font-bold ${isChild ? 'text-2xl' : 'text-xl'}`}>{totalPoints}</span>
          <span className="text-xs text-muted-foreground">
            {isChild ? 'ごうけいpt' : '合計ポイント'}
          </span>
        </div>
      </div>

      {/* Total points per member */}
      <div className="space-y-2">
        <h3 className={`font-semibold ${isChild ? 'text-base' : 'text-sm'} text-muted-foreground`}>
          {isChild ? 'るいけいポイント' : '累計ポイント'}
        </h3>
        {members.map((member) => (
          <div key={member.id} className="flex items-center justify-between p-2 rounded-lg bg-card border">
            <div className="flex items-center gap-2">
              <span>{member.avatar}</span>
              <span className={`font-medium ${isChild ? 'text-base' : 'text-sm'}`}>{member.name}</span>
            </div>
            <span className={`font-bold ${isChild ? 'text-base' : 'text-sm'}`}>
              {member.total_points}pt
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
