'use server';

import { db } from '@/lib/db';
import { familyMembers, activityLogs, thanks, completions } from '@/lib/schema';
import { eq, gt, sql } from 'drizzle-orm';

export async function getUnreadCount(memberId: string): Promise<{ count: number; lastSeenAt: string }> {
  const [member] = await db
    .select({ lastSeenHistoryAt: familyMembers.lastSeenHistoryAt })
    .from(familyMembers)
    .where(eq(familyMembers.id, memberId));

  if (!member) return { count: 0, lastSeenAt: new Date().toISOString() };

  const since = member.lastSeenHistoryAt;

  const [logResult, thanksResult] = await Promise.all([
    db.select({ count: sql<number>`count(*)` })
      .from(activityLogs)
      .where(gt(activityLogs.createdAt, since)),
    db.select({ count: sql<number>`count(*)` })
      .from(thanks)
      .where(gt(thanks.createdAt, since)),
  ]);

  const total = Number(logResult[0]?.count ?? 0) + Number(thanksResult[0]?.count ?? 0);
  return { count: total, lastSeenAt: since.toISOString() };
}

export async function reportEffort(
  reporterId: string,
  targetMemberId: string,
  taskTitle: string,
  categoryEmoji: string,
  adultOnly: boolean,
): Promise<void> {
  await db.insert(completions).values({
    taskTitle,
    categoryEmoji,
    memberId: targetMemberId,
    points: 1,
    reportedBy: reporterId,
    adultOnly,
  });

  await db.execute(sql`SELECT increment_points(${targetMemberId}, 1)`);

  // Activity log
  db.insert(activityLogs).values({
    eventType: 'effort_reported',
    actorId: reporterId,
    targetMemberId,
    taskTitle,
    categoryEmoji,
    points: 1,
  }).catch(() => {});
}
