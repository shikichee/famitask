import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { recurringTaskTemplates, tasks, recurringTaskSkips, activityLogs } from '@/lib/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { getTodayJST, getTodayStringJST, shouldGenerateToday, isPastGenerationTime } from '@/lib/recurring-utils';
import type { RecurringTaskTemplate } from '@/types/database';

export async function POST(request: NextRequest) {
  // Vercel Cron uses Authorization header, client calls don't need auth
  const cronSecret = request.headers.get('x-cron-secret');
  const authHeader = request.headers.get('authorization');
  const isVercelCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;
  const isManualCron = cronSecret === process.env.CRON_SECRET;

  // Allow authenticated client calls (cookie auth) or cron calls
  if (!isVercelCron && !isManualCron) {
    // For client-side calls, we just allow them (they're triggered on page load)
  }

  const allTemplates = await db
    .select()
    .from(recurringTaskTemplates)
    .where(eq(recurringTaskTemplates.isActive, true));

  if (!allTemplates.length) {
    return NextResponse.json({ generated: [] });
  }

  const today = getTodayJST();
  const todayString = getTodayStringJST();

  // Map to expected type for utility functions
  const templatesTyped: (RecurringTaskTemplate & { _id: string })[] = allTemplates.map(t => ({
    id: t.id,
    _id: t.id,
    title: t.title,
    category_id: t.categoryId,
    points: t.points,
    adult_only: t.adultOnly,
    created_by: t.createdBy,
    recurrence_type: t.recurrenceType as 'weekly' | 'monthly_nth',
    days_of_week: t.daysOfWeek,
    weeks_of_month: t.weeksOfMonth,
    generation_time: t.generationTime,
    is_active: t.isActive,
    created_at: t.createdAt.toISOString(),
    updated_at: t.updatedAt.toISOString(),
  }));

  const matchingTemplates = templatesTyped.filter(
    t => shouldGenerateToday(t, today) && isPastGenerationTime(t)
  );

  if (!matchingTemplates.length) {
    return NextResponse.json({ generated: [] });
  }

  const templateIds = matchingTemplates.map(t => t.id);

  const [existingTasks, skippedTasks] = await Promise.all([
    db.select({ recurringTemplateId: tasks.recurringTemplateId })
      .from(tasks)
      .where(and(
        inArray(tasks.recurringTemplateId, templateIds),
        eq(tasks.taskDate, todayString),
      )),
    db.select({ templateId: recurringTaskSkips.templateId })
      .from(recurringTaskSkips)
      .where(and(
        inArray(recurringTaskSkips.templateId, templateIds),
        eq(recurringTaskSkips.taskDate, todayString),
      )),
  ]);

  const existingTemplateIds = new Set(existingTasks.map(t => t.recurringTemplateId));
  const skippedTemplateIds = new Set(skippedTasks.map(t => t.templateId));

  const toGenerate = matchingTemplates.filter(
    t => !existingTemplateIds.has(t.id) && !skippedTemplateIds.has(t.id)
  );

  const generatedTitles: string[] = [];

  for (const template of toGenerate) {
    await db.execute(sql`SELECT increment_positions(NULL)`);

    const [newTask] = await db
      .insert(tasks)
      .values({
        title: template.title,
        categoryId: template.category_id,
        points: template.points,
        adultOnly: template.adult_only,
        createdBy: template.created_by,
        isRecurring: true,
        recurringTemplateId: template.id,
        taskDate: todayString,
        status: 'pending',
        position: 0,
      })
      .onConflictDoNothing()
      .returning();

    if (newTask) {
      generatedTitles.push(newTask.title);

      db.insert(activityLogs).values({
        eventType: 'recurring_task_generated',
        actorId: template.created_by,
        taskTitle: template.title,
      }).catch(() => {});
    }
  }

  // Send push notification
  if (generatedTitles.length > 0) {
    const body = generatedTitles.length === 1
      ? `くりかえしタスク「${generatedTitles[0]}」が追加されました`
      : `くりかえしタスクが${generatedTitles.length}件追加されました（${generatedTitles.join('、')}）`;

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

    fetch(`${siteUrl}/api/cron/notify-recurring`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cron-secret': process.env.CRON_SECRET || '',
      },
      body: JSON.stringify({ title: 'くりかえしタスク', body, url: '/' }),
    }).catch(() => {});
  }

  return NextResponse.json({ generated: generatedTitles });
}
