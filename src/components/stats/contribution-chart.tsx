'use client';

import { FamilyMember } from '@/types/database';
import { Completion } from '@/types/database';
import { Period } from '@/lib/period-utils';

interface ContributionChartProps {
  members: FamilyMember[];
  completions: Completion[];
  period: Period;
  isChild: boolean;
}

export function ContributionChart({ members, completions, period, isChild }: ContributionChartProps) {
  // Calculate points per member from pre-filtered completions
  const weeklyPoints = new Map<string, number>();
  completions.forEach((c) => {
    weeklyPoints.set(c.member_id, (weeklyPoints.get(c.member_id) ?? 0) + c.points);
  });

  const maxPoints = Math.max(1, ...weeklyPoints.values());

  // Find MVP
  let mvpId = '';
  let mvpPoints = 0;
  weeklyPoints.forEach((pts, id) => {
    if (pts > mvpPoints) {
      mvpId = id;
      mvpPoints = pts;
    }
  });

  return (
    <div className="space-y-4">
      <h2 className={`font-bold ${isChild ? 'text-xl' : 'text-lg'}`}>
        {period === 'week'
          ? (isChild ? 'こんしゅうのがんばり' : '今週の貢献')
          : (isChild ? 'こんげつのがんばり' : '今月の貢献')}
      </h2>

      <div className="space-y-3">
        {members.map((member) => {
          const pts = weeklyPoints.get(member.id) ?? 0;
          const width = maxPoints > 0 ? (pts / maxPoints) * 100 : 0;
          const isMvp = member.id === mvpId && mvpPoints > 0;

          return (
            <div key={member.id} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={isChild ? 'text-2xl' : 'text-lg'}>{member.avatar}</span>
                  <span className={`font-medium ${isChild ? 'text-base' : 'text-sm'}`}>
                    {member.name}
                  </span>
                  {isMvp && <span className="text-sm">👑 MVP!</span>}
                </div>
                <span className={`font-bold ${isChild ? 'text-base' : 'text-sm'}`}>
                  {pts}pt
                </span>
              </div>
              <div className="h-4 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${width}%`,
                    backgroundColor: member.color,
                    minWidth: pts > 0 ? '8px' : '0',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
