'use server';

import { db } from '@/lib/db';
import { tasks, taskCategories, completions, activityLogs } from '@/lib/schema';
import { eq, sql } from 'drizzle-orm';
import type { Task, TaskCategory } from '@/types/database';

function toTask(row: typeof tasks.$inferSelect): Task {
  return {
    id: row.id,
    title: row.title,
    category_id: row.categoryId,
    status: row.status as 'pending' | 'done',
    adult_only: row.adultOnly,
    points: row.points,
    created_by: row.createdBy,
    completed_by: row.completedBy,
    completed_at: row.completedAt?.toISOString() ?? null,
    assigned_to: row.assignedTo,
    is_recurring: row.isRecurring,
    recurring_template_id: row.recurringTemplateId,
    task_date: row.taskDate,
    created_at: row.createdAt.toISOString(),
    position: row.position,
  };
}

export async function getCategories(): Promise<TaskCategory[]> {
  const rows = await db.select().from(taskCategories);
  return rows.map(r => ({ id: r.id, name: r.name, emoji: r.emoji }));
}

export async function getTasks(): Promise<Task[]> {
  const rows = await db
    .select()
    .from(tasks)
    .where(eq(tasks.status, 'pending'))
    .orderBy(tasks.position);
  return rows.map(toTask);
}

export async function createTask(task: {
  title: string;
  category_id: string;
  points: number;
  adult_only: boolean;
  created_by: string;
  is_recurring: boolean;
}): Promise<Task> {
  // Increment positions of unassigned pending tasks
  await db.execute(sql`SELECT increment_positions(NULL)`);

  const [row] = await db
    .insert(tasks)
    .values({
      title: task.title,
      categoryId: task.category_id,
      points: task.points,
      adultOnly: task.adult_only,
      createdBy: task.created_by,
      isRecurring: task.is_recurring,
      status: 'pending',
      position: 0,
    })
    .returning();

  // Activity log (fire-and-forget)
  db.insert(activityLogs).values({
    eventType: 'task_created',
    actorId: task.created_by,
    taskTitle: row.title,
  }).catch(() => {});

  return toTask(row);
}

export async function completeTask(taskId: string, memberId: string, categoryEmoji: string): Promise<{ task_title: string; points: number } | null> {
  const [task] = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, taskId));
  if (!task) return null;

  const now = new Date();

  await Promise.all([
    db.update(tasks)
      .set({ status: 'done', completedBy: memberId, completedAt: now })
      .where(eq(tasks.id, taskId)),
    db.insert(completions).values({
      taskTitle: task.title,
      categoryEmoji,
      memberId,
      points: task.points,
      completedAt: now,
      taskId,
    }),
    db.execute(sql`SELECT increment_points(${memberId}, ${task.points})`),
  ]);

  // Activity log
  db.insert(activityLogs).values({
    eventType: 'task_completed',
    actorId: memberId,
    taskTitle: task.title,
    categoryEmoji,
    points: task.points,
  }).catch(() => {});

  return { task_title: task.title, points: task.points };
}

export async function assignTask(taskId: string, memberId: string): Promise<void> {
  await db
    .update(tasks)
    .set({ assignedTo: memberId })
    .where(eq(tasks.id, taskId));
}

export async function deleteTask(taskId: string): Promise<void> {
  await db.execute(sql`SELECT delete_task(${taskId})`);
}

export async function reorderTasks(updates: { id: string; position: number; assigned_to: string | null }[]): Promise<void> {
  await Promise.all(
    updates.map(u =>
      db.update(tasks)
        .set({ position: u.position, assignedTo: u.assigned_to })
        .where(eq(tasks.id, u.id))
    )
  );
}

export async function updateTask(taskId: string, updates: {
  title: string;
  category_id: string;
  points: number;
  adult_only: boolean;
}): Promise<void> {
  await db
    .update(tasks)
    .set({
      title: updates.title,
      categoryId: updates.category_id,
      points: updates.points,
      adultOnly: updates.adult_only,
    })
    .where(eq(tasks.id, taskId));
}

export async function createActivityLog(log: {
  event_type: string;
  actor_id: string;
  target_member_id?: string;
  task_title: string;
  category_emoji?: string;
  points?: number;
}): Promise<void> {
  await db.insert(activityLogs).values({
    eventType: log.event_type,
    actorId: log.actor_id,
    targetMemberId: log.target_member_id,
    taskTitle: log.task_title,
    categoryEmoji: log.category_emoji ?? '',
    points: log.points,
  });
}
