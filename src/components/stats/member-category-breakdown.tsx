'use client';

import Link from 'next/link';
import { FamilyMember, Completion } from '@/types/database';

interface MemberCategoryBreakdownProps {
  members: FamilyMember[];
  completions: Completion[];
  isChild: boolean;
}

interface CategoryStat {
  emoji: string;
  count: number;
  points: number;
}

export function MemberCategoryBreakdown({ members, completions, isChild }: MemberCategoryBreakdownProps) {
  // Group completions by member_id → category_emoji
  const memberStats = new Map<string, Map<string, CategoryStat>>();
  const memberTotals = new Map<string, number>();

  completions.forEach((c) => {
    if (!memberStats.has(c.member_id)) memberStats.set(c.member_id, new Map());
    const cats = memberStats.get(c.member_id)!;
    const existing = cats.get(c.category_emoji) ?? { emoji: c.category_emoji, count: 0, points: 0 };
    existing.count++;
    existing.points += c.points;
    cats.set(c.category_emoji, existing);
    memberTotals.set(c.member_id, (memberTotals.get(c.member_id) ?? 0) + c.points);
  });

  // Sort members by total points descending
  const sortedMembers = [...members].sort(
    (a, b) => (memberTotals.get(b.id) ?? 0) - (memberTotals.get(a.id) ?? 0)
  );

  return (
    <div className="space-y-4">
      <h2 className={`font-bold ${isChild ? 'text-xl' : 'text-lg'}`}>
        {isChild ? 'みんなのがんばり' : 'みんなの貢献'}
      </h2>

      <div className="space-y-3">
        {sortedMembers.map((member) => {
          const cats = memberStats.get(member.id);
          const total = memberTotals.get(member.id) ?? 0;

          // Sort categories by points descending
          const sortedCats = cats
            ? [...cats.values()].sort((a, b) => b.points - a.points)
            : [];

          return (
            <div
              key={member.id}
              className="rounded-xl bg-card border p-4 space-y-3"
            >
              {/* Member header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={isChild ? 'text-2xl' : 'text-lg'}>{member.avatar}</span>
                  <span
                    className={`font-bold ${isChild ? 'text-lg' : 'text-base'}`}
                    style={{ color: member.color }}
                  >
                    {member.name}
                  </span>
                </div>
                <span className={`font-bold ${isChild ? 'text-base' : 'text-sm'} text-muted-foreground`}>
                  {total}pt
                </span>
              </div>

              {/* Category chips */}
              {sortedCats.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {sortedCats.map((cat) => (
                    <span
                      key={cat.emoji}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted ${isChild ? 'text-base' : 'text-sm'}`}
                    >
                      {cat.emoji}
                      <span className="font-medium">{'\u00d7'}{cat.count}</span>
                      <span className="text-muted-foreground">({cat.points}pt)</span>
                    </span>
                  ))}
                </div>
              ) : (
                <p className={`text-muted-foreground ${isChild ? 'text-base' : 'text-sm'}`}>
                  {isChild ? 'おやすみちゅう 😴' : 'まだタスクなし'}
                </p>
              )}

              {/* Link to history for thanks */}
              {sortedCats.length > 0 && (
                <Link
                  href="/history"
                  className={`block text-right ${isChild ? 'text-sm' : 'text-xs'}`}
                  style={{ color: member.color }}
                >
                  {isChild ? 'ありがとうをつたえる →' : 'りれきでありがとうを伝える →'}
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
