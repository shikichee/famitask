'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { RecurringTaskTemplate } from '@/types/database';

const supabase = createClient();

export function useRecurringTemplates() {
  const [templates, setTemplates] = useState<RecurringTaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = useCallback(async () => {
    const { data } = await supabase
      .from('recurring_task_templates')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setTemplates(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch for external data
    fetchTemplates();

    const channel = supabase
      .channel('recurring_templates_changes')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'recurring_task_templates' }, (payload: any) => {
        const newTemplate = payload.new as RecurringTaskTemplate;
        setTemplates(prev => {
          if (prev.some(t => t.id === newTemplate.id)) return prev;
          return [newTemplate, ...prev];
        });
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'recurring_task_templates' }, (payload: any) => {
        const updated = payload.new as RecurringTaskTemplate;
        setTemplates(prev => prev.map(t => t.id === updated.id ? updated : t));
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'recurring_task_templates' }, (payload: any) => {
        const deleted = payload.old as RecurringTaskTemplate;
        setTemplates(prev => prev.filter(t => t.id !== deleted.id));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchTemplates]);

  const addTemplate = useCallback(async (template: {
    title: string;
    category_id: string;
    points: number;
    adult_only: boolean;
    created_by: string;
    recurrence_type: 'weekly' | 'monthly_nth';
    days_of_week: number[];
    weeks_of_month: number[] | null;
    generation_time: string;
  }) => {
    const { data, error } = await supabase
      .from('recurring_task_templates')
      .insert(template)
      .select()
      .single();
    if (error) throw new Error(error.message);

    // Activity log
    if (data) {
      supabase.from('activity_logs').insert({
        event_type: 'recurring_template_created',
        actor_id: template.created_by,
        task_title: template.title,
      }).then(() => {}, () => {});
    }

    return data;
  }, []);

  const updateTemplate = useCallback(async (
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
  ) => {
    const { data, error } = await supabase
      .from('recurring_task_templates')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }, []);

  const deleteTemplate = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('recurring_task_templates')
      .delete()
      .eq('id', id);
    if (error) throw new Error(error.message);
  }, []);

  const toggleActive = useCallback(async (id: string, isActive: boolean) => {
    return updateTemplate(id, { is_active: isActive });
  }, [updateTemplate]);

  return { templates, loading, addTemplate, updateTemplate, deleteTemplate, toggleActive };
}
