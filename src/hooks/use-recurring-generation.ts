'use client';

import { useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { RecurringTaskTemplate } from '@/types/database';
import { getTodayJST, getTodayStringJST, shouldGenerateToday, isPastGenerationTime } from '@/lib/recurring-utils';

const supabase = createClient();

export function useRecurringGeneration(currentMemberId: string) {
  const hasRun = useRef(false);

  const generateTodaysTasks = useCallback(async () => {
    const { data: templates } = await supabase
      .from('recurring_task_templates')
      .select('*')
      .eq('is_active', true);

    if (!templates || templates.length === 0) return;

    const today = getTodayJST();
    const todayString = getTodayStringJST();

    const matchingTemplates = (templates as RecurringTaskTemplate[]).filter(
      t => shouldGenerateToday(t, today) && isPastGenerationTime(t)
    );

    if (matchingTemplates.length === 0) return;

    // Check which tasks already exist for today
    const templateIds = matchingTemplates.map(t => t.id);
    const { data: existingTasks } = await supabase
      .from('tasks')
      .select('recurring_template_id')
      .in('recurring_template_id', templateIds)
      .eq('task_date', todayString);

    const existingTemplateIds = new Set(
      (existingTasks ?? []).map(t => t.recurring_template_id)
    );

    const toGenerate = matchingTemplates.filter(t => !existingTemplateIds.has(t.id));

    for (const template of toGenerate) {
      // Increment positions for unassigned group
      await supabase.rpc('increment_positions', { p_assigned_to: null });

      // Insert task — unique constraint prevents duplicates from concurrent devices
      const { data: newTask } = await supabase
        .from('tasks')
        .insert({
          title: template.title,
          category_id: template.category_id,
          points: template.points,
          adult_only: template.adult_only,
          created_by: template.created_by,
          is_recurring: true,
          recurring_template_id: template.id,
          task_date: todayString,
          status: 'pending',
          position: 0,
        })
        .select()
        .maybeSingle();

      // Log activity only if task was actually created (not a duplicate)
      if (newTask) {
        supabase.from('activity_logs').insert({
          event_type: 'recurring_task_generated',
          actor_id: template.created_by,
          task_title: template.title,
        }).then(() => {}, () => {});
      }
    }
  }, []);

  useEffect(() => {
    if (hasRun.current || !currentMemberId) return;
    hasRun.current = true;

    generateTodaysTasks();
  }, [currentMemberId, generateTodaysTasks]);
}
