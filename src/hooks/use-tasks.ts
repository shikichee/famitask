'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';

const supabase = createClient();
const isSupabaseConfigured = true;
import { Task, TaskCategory } from '@/types/database';

const DEMO_CATEGORIES: TaskCategory[] = [
  { id: 'b0000000-0000-0000-0000-000000000001', name: '掃除', emoji: '🧹' },
  { id: 'b0000000-0000-0000-0000-000000000002', name: '洗濯', emoji: '👕' },
  { id: 'b0000000-0000-0000-0000-000000000003', name: '料理', emoji: '🍳' },
  { id: 'b0000000-0000-0000-0000-000000000004', name: '買い物', emoji: '🛒' },
  { id: 'b0000000-0000-0000-0000-000000000005', name: '子ども', emoji: '🎒' },
  { id: 'b0000000-0000-0000-0000-000000000006', name: 'おでかけ', emoji: '🚗' },
  { id: 'b0000000-0000-0000-0000-000000000007', name: '手続き', emoji: '📋' },
  { id: 'b0000000-0000-0000-0000-000000000008', name: 'その他', emoji: '📦' },
];

const DEMO_TASKS: Task[] = [
  { id: '1', title: '食器洗い', category_id: 'b0000000-0000-0000-0000-000000000003', status: 'pending', adult_only: false, points: 2, created_by: 'a0000000-0000-0000-0000-000000000001', completed_by: null, completed_at: null, assigned_to: null, is_recurring: true, created_at: new Date().toISOString() },
  { id: '2', title: '洗濯物たたむ', category_id: 'b0000000-0000-0000-0000-000000000002', status: 'pending', adult_only: false, points: 2, created_by: 'a0000000-0000-0000-0000-000000000001', completed_by: null, completed_at: null, assigned_to: null, is_recurring: true, created_at: new Date().toISOString() },
  { id: '3', title: 'お風呂掃除', category_id: 'b0000000-0000-0000-0000-000000000001', status: 'pending', adult_only: false, points: 3, created_by: 'a0000000-0000-0000-0000-000000000002', completed_by: null, completed_at: null, assigned_to: null, is_recurring: true, created_at: new Date().toISOString() },
  { id: '4', title: 'ゴミ出し', category_id: 'b0000000-0000-0000-0000-000000000001', status: 'pending', adult_only: false, points: 1, created_by: 'a0000000-0000-0000-0000-000000000002', completed_by: null, completed_at: null, assigned_to: null, is_recurring: true, created_at: new Date().toISOString() },
  { id: '5', title: '習い事の準備', category_id: 'b0000000-0000-0000-0000-000000000005', status: 'pending', adult_only: false, points: 2, created_by: 'a0000000-0000-0000-0000-000000000001', completed_by: null, completed_at: null, assigned_to: null, is_recurring: false, created_at: new Date().toISOString() },
  { id: '6', title: '病院予約', category_id: 'b0000000-0000-0000-0000-000000000007', status: 'pending', adult_only: true, points: 2, created_by: 'a0000000-0000-0000-0000-000000000001', completed_by: null, completed_at: null, assigned_to: null, is_recurring: false, created_at: new Date().toISOString() },
  { id: '7', title: '保険の書類提出', category_id: 'b0000000-0000-0000-0000-000000000007', status: 'pending', adult_only: true, points: 3, created_by: 'a0000000-0000-0000-0000-000000000002', completed_by: null, completed_at: null, assigned_to: null, is_recurring: false, created_at: new Date().toISOString() },
];

export function useCategories() {
  const [categories, setCategories] = useState<TaskCategory[]>(DEMO_CATEGORIES);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase.from('task_categories').select('*').then(({ data }: { data: TaskCategory[] | null }) => {
      if (data) setCategories(data);
    });
  }, []);

  return categories;
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>(DEMO_TASKS);

  const fetchTasks = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (data) setTasks(data);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    fetchTasks();

    const channel = supabase
      .channel('tasks_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        fetchTasks();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchTasks]);

  const addTask = useCallback(async (task: {
    title: string;
    category_id: string;
    points: number;
    adult_only: boolean;
    created_by: string;
    is_recurring: boolean;
  }) => {
    if (!isSupabaseConfigured) {
      const newTask: Task = {
        id: crypto.randomUUID(),
        ...task,
        status: 'pending',
        completed_by: null,
        completed_at: null,
        assigned_to: null,
        created_at: new Date().toISOString(),
      };
      setTasks(prev => [newTask, ...prev]);
      return newTask;
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert({ ...task, status: 'pending' })
      .select()
      .single();
    if (error) {
      throw new Error(error.message);
    }
    if (data) {
      setTasks(prev => [data, ...prev]);
    }
    return data;
  }, []);

  const completeTask = useCallback(async (taskId: string, memberId: string, categoryEmoji: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return null;

    if (!isSupabaseConfigured) {
      setTasks(prev => prev.filter(t => t.id !== taskId));
      return { task_title: task.title, points: task.points };
    }

    const now = new Date().toISOString();

    // Update task
    await supabase
      .from('tasks')
      .update({ status: 'done', completed_by: memberId, completed_at: now })
      .eq('id', taskId);

    // Add completion record
    await supabase
      .from('completions')
      .insert({
        task_title: task.title,
        category_emoji: categoryEmoji,
        member_id: memberId,
        points: task.points,
        completed_at: now,
        task_id: taskId,
      });

    // Update member points
    try {
      await supabase.rpc('increment_points', { member_id: memberId, amount: task.points });
    } catch {
      // Fallback: direct update if RPC doesn't exist
      const { data } = await supabase
        .from('family_members')
        .select('total_points')
        .eq('id', memberId)
        .single();
      if (data) {
        await supabase
          .from('family_members')
          .update({ total_points: (data as { total_points: number }).total_points + task.points })
          .eq('id', memberId);
      }
    }

    return { task_title: task.title, points: task.points };
  }, [tasks]);

  const assignTask = useCallback(async (taskId: string, memberId: string) => {
    if (!isSupabaseConfigured) {
      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, assigned_to: memberId } : t
      ));
      return;
    }

    await supabase
      .from('tasks')
      .update({ assigned_to: memberId })
      .eq('id', taskId);
  }, []);

  const deleteTask = useCallback(async (taskId: string) => {
    if (!isSupabaseConfigured) {
      setTasks(prev => prev.filter(t => t.id !== taskId));
      return;
    }

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (!error) {
      setTasks(prev => prev.filter(t => t.id !== taskId));
    }
  }, []);

  return { tasks, addTask, completeTask, assignTask, deleteTask, refetch: fetchTasks };
}
