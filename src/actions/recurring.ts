'use server';

import { db } from '@/lib/db';
import { recurringTaskTemplates, activityLogs } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';
import type { RecurringTaskTemplate } from '@/types/database';

function toTemplate(row: typeof recurringTaskTemplates.$inferSelect): RecurringTaskTemplate {
  return {
    id: row.id,
    title: row.title,
    category_id: row.categoryId,
    points: row.points,
    adult_only: row.adultOnly,
    created_by: row.createdBy,
    recurrence_type: row.recurrenceType as 'weekly' | 'monthly_nth',
    days_of_week: row.daysOfWeek,
    weeks_of_month: row.weeksOfMonth,
    generation_time: row.generationTime,
    is_active: row.isActive,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

export async function getTemplates(): Promise<RecurringTaskTemplate[]> {
  const rows = await db
    .select()
    .from(recurringTaskTemplates)
    .orderBy(desc(recurringTaskTemplates.createdAt));
  return rows.map(toTemplate);
}

export async function createTemplate(template: {
  title: string;
  category_id: string;
  points: number;
  adult_only: boolean;
  created_by: string;
  recurrence_type: 'weekly' | 'monthly_nth';
  days_of_week: number[];
  weeks_of_month: number[] | null;
  generation_time: string;
}): Promise<RecurringTaskTemplate> {
  const [row] = await db
    .insert(recurringTaskTemplates)
    .values({
      title: template.title,
      categoryId: template.category_id,
      points: template.points,
      adultOnly: template.adult_only,
      createdBy: template.created_by,
      recurrenceType: template.recurrence_type,
      daysOfWeek: template.days_of_week,
      weeksOfMonth: template.weeks_of_month,
      generationTime: template.generation_time,
    })
    .returning();

  // Activity log
  db.insert(activityLogs).values({
    eventType: 'recurring_template_created',
    actorId: template.created_by,
    taskTitle: template.title,
  }).catch(() => {});

  return toTemplate(row);
}

export async function updateTemplate(
  id: string,
  updates: Partial<{
    title: string;
    category_id: string;
    points: number;
    adult_only: boolean;
    recurrence_type: 'weekly' | 'monthly_nth';
    days_of_week: number[];
    weeks_of_month: number[] | null;
    generation_time: string;
    is_active: boolean;
  }>
): Promise<RecurringTaskTemplate> {
  const values: Record<string, unknown> = { updatedAt: new Date() };
  if (updates.title !== undefined) values.title = updates.title;
  if (updates.category_id !== undefined) values.categoryId = updates.category_id;
  if (updates.points !== undefined) values.points = updates.points;
  if (updates.adult_only !== undefined) values.adultOnly = updates.adult_only;
  if (updates.recurrence_type !== undefined) values.recurrenceType = updates.recurrence_type;
  if (updates.days_of_week !== undefined) values.daysOfWeek = updates.days_of_week;
  if (updates.weeks_of_month !== undefined) values.weeksOfMonth = updates.weeks_of_month;
  if (updates.generation_time !== undefined) values.generationTime = updates.generation_time;
  if (updates.is_active !== undefined) values.isActive = updates.is_active;

  const [row] = await db
    .update(recurringTaskTemplates)
    .set(values)
    .where(eq(recurringTaskTemplates.id, id))
    .returning();

  return toTemplate(row);
}

export async function deleteTemplate(id: string): Promise<void> {
  await db.delete(recurringTaskTemplates).where(eq(recurringTaskTemplates.id, id));
}
