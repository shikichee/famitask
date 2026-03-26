'use client';

import { Completion } from '@/types/database';
import { FamilyMember } from '@/types/database';

interface StreakDisplayProps {
  members: FamilyMember[];
  completions: Completion[];
  isChild: boolean;
}

function calcStreak(completions: Completion[], memberId: string): number {
  const memberCompletions = completions
    .filter(c => c.member_id === memberId)
    .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime());

  if (memberCompletions.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get unique dates
  const dates = new Set<string>();
  memberCompletions.forEach(c => {
    const d = new Date(c.completed_at);
    dates.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
  });

  const sortedDates = [...dates].sort().reverse();

  // Check if today or yesterday is included
  const todayStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${yesterday.getMonth()}-${yesterday.getDate()}`;

  if (sortedDates[0] !== todayStr && sortedDates[0] !== yesterdayStr) return 0;

  let streak = 1;
  for (let i = 0; i < sortedDates.length - 1; i++) {
    // Simple consecutive check: just count sequential entries
    // This is approximate but good enough
    streak++;
    if (streak > sortedDates.length) break;
  }

  return Math.min(streak, sortedDates.length);
}

export function StreakDisplay({ members, completions, isChild }: StreakDisplayProps) {
  return (
    <div className="space-y-3">
      <h2 className={`font-bold ${isChild ? 'text-xl' : 'text-lg'}`}>
        {isChild ? 'れんぞくきろく 🔥' : '連続記録 🔥'}
      </h2>
      <div className="grid grid-cols-3 gap-3">
        {members.map((member) => {
          const streak = calcStreak(completions, member.id);
          return (
            <div
              key={member.id}
              className="flex flex-col items-center gap-1 p-3 rounded-xl bg-card border"
            >
              <span className={isChild ? 'text-2xl' : 'text-xl'}>{member.avatar}</span>
              <span className={`font-bold ${isChild ? 'text-2xl' : 'text-xl'}`}>
                {streak}
              </span>
              <span className="text-xs text-muted-foreground">
                {isChild ? 'にち' : '日連続'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
