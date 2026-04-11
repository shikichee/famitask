'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePolling } from './use-polling';
import {
  getTemplates as fetchTemplatesAction,
  createTemplate as createTemplateAction,
  updateTemplate as updateTemplateAction,
  deleteTemplate as deleteTemplateAction,
} from '@/actions/recurring';
import { RecurringTaskTemplate } from '@/types/database';

export function useRecurringTemplates() {
  const [templates, setTemplates] = useState<RecurringTaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = useCallback(async () => {
    const data = await fetchTemplatesAction();
    setTemplates(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch for external data
    fetchTemplates();
  }, [fetchTemplates]);

  usePolling(fetchTemplates, 5000);

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
    const data = await createTemplateAction(template);
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
    const data = await updateTemplateAction(id, updates);
    return data;
  }, []);

  const deleteTemplate = useCallback(async (id: string) => {
    await deleteTemplateAction(id);
  }, []);

  const toggleActive = useCallback(async (id: string, isActive: boolean) => {
    return updateTemplate(id, { is_active: isActive });
  }, [updateTemplate]);

  return { templates, loading, addTemplate, updateTemplate, deleteTemplate, toggleActive };
}
