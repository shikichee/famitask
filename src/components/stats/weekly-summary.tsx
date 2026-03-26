'use client';

import { FamilyMember, Completion } from '@/types/database';

interface WeeklySummaryProps {
  members: FamilyMember[];
  completions: Completion[];
  isChild: boolean;
}

export function WeeklySummary({ members, completions, isChild }: WeeklySummaryProps) {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const weekCompletions = completions.filter(c => new Date(c.completed_at) >= weekStart);
  const totalTasks = weekCompletions.length;
  const totalPoints = weekCompletions.reduce((sum, c) => sum + c.points, 0);

  // Count per member
  const memberCounts = new Map<string, number>();
  weekCompletions.forEach(c => {
    memberCounts.set(c.member_id, (memberCounts.get(c.member_id) ?? 0) + 1);
  });

  return (
    <div className="space-y-3">
      <h2 className={`font-bold ${isChild ? 'text-xl' : 'text-lg'}`}>
        {isChild ? 'こんしゅうのまとめ' : '今週のまとめ'}
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
            <span className={`font-bold ${isChild ? 'text-base' : 'text-sm'}`} style={{ color: member.color }}>
              {member.total_points}pt
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
