'use server';

import { db } from '@/lib/db';
import { activityLogs } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';
import type { ActivityLog } from '@/types/database';

function toLog(row: typeof activityLogs.$inferSelect): ActivityLog {
  return {
    id: row.id,
    event_type: row.eventType as ActivityLog['event_type'],
    actor_id: row.actorId,
    target_member_id: row.targetMemberId,
    task_title: row.taskTitle,
    category_emoji: row.categoryEmoji,
    points: row.points,
    created_at: row.createdAt.toISOString(),
  };
}

export async function getActivityLogs(): Promise<ActivityLog[]> {
  const rows = await db
    .select()
    .from(activityLogs)
    .orderBy(desc(activityLogs.createdAt))
    .limit(30);
  return rows.map(toLog);
}

export async function deleteActivityLog(id: string): Promise<void> {
  await db.delete(activityLogs).where(eq(activityLogs.id, id));
}
