'use server';

import { db } from '@/lib/db';
import { completions } from '@/lib/schema';
import { eq, desc, gte, sql } from 'drizzle-orm';
import type { Completion } from '@/types/database';

function toCompletion(row: typeof completions.$inferSelect): Completion {
  return {
    id: row.id,
    task_title: row.taskTitle,
    category_emoji: row.categoryEmoji,
    member_id: row.memberId,
    points: row.points,
    completed_at: row.completedAt.toISOString(),
    task_id: row.taskId,
    reported_by: row.reportedBy,
    adult_only: row.adultOnly,
  };
}

export async function getCompletions(since?: string): Promise<Completion[]> {
  const condition = since
    ? gte(completions.completedAt, new Date(since))
    : undefined;

  const rows = await db
    .select()
    .from(completions)
    .where(condition)
    .orderBy(desc(completions.completedAt))
    .limit(30);

  return rows.map(toCompletion);
}

export async function deleteCompletion(completionId: string): Promise<void> {
  await db.execute(sql`SELECT delete_completion(${completionId})`);
}

export async function updateCompletionPoints(completionId: string, newPoints: number): Promise<void> {
  await db.execute(sql`SELECT update_completion_points(${completionId}, ${newPoints})`);
}

export async function updateCompletion(completionId: string, updates: {
  task_title: string;
  category_emoji: string;
  points: number;
}): Promise<void> {
  // Get old completion to check if points changed
  const [old] = await db
    .select()
    .from(completions)
    .where(eq(completions.id, completionId));

  if (!old) return;

  if (old.points !== updates.points) {
    await db.execute(sql`SELECT update_completion_points(${completionId}, ${updates.points})`);
  }

  await db
    .update(completions)
    .set({ taskTitle: updates.task_title, categoryEmoji: updates.category_emoji })
    .where(eq(completions.id, completionId));
}

export async function undoCompletion(completionId: string): Promise<void> {
  await db.execute(sql`SELECT undo_completion(${completionId})`);
}
