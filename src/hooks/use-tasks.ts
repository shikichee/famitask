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
  { id: '1', title: '食器洗い', category_id: 'b0000000-0000-0000-0000-000000000003', status: 'pending', adult_only: false, points: 2, created_by: 'a0000000-0000-0000-0000-000000000001', completed_by: null, completed_at: null, assigned_to: null, is_recurring: true, created_at: new Date().toISOString(), position: 0 },
  { id: '2', title: '洗濯物たたむ', category_id: 'b0000000-0000-0000-0000-000000000002', status: 'pending', adult_only: false, points: 2, created_by: 'a0000000-0000-0000-0000-000000000001', completed_by: null, completed_at: null, assigned_to: null, is_recurring: true, created_at: new Date().toISOString(), position: 1 },
  { id: '3', title: 'お風呂掃除', category_id: 'b0000000-0000-0000-0000-000000000001', status: 'pending', adult_only: false, points: 3, created_by: 'a0000000-0000-0000-0000-000000000002', completed_by: null, completed_at: null, assigned_to: null, is_recurring: true, created_at: new Date().toISOString(), position: 2 },
  { id: '4', title: 'ゴミ出し', category_id: 'b0000000-0000-0000-0000-000000000001', status: 'pending', adult_only: false, points: 1, created_by: 'a0000000-0000-0000-0000-000000000002', completed_by: null, completed_at: null, assigned_to: null, is_recurring: true, created_at: new Date().toISOString(), position: 3 },
  { id: '5', title: '習い事の準備', category_id: 'b0000000-0000-0000-0000-000000000005', status: 'pending', adult_only: false, points: 2, created_by: 'a0000000-0000-0000-0000-000000000001', completed_by: null, completed_at: null, assigned_to: null, is_recurring: false, created_at: new Date().toISOString(), position: 4 },
  { id: '6', title: '病院予約', category_id: 'b0000000-0000-0000-0000-000000000007', status: 'pending', adult_only: true, points: 2, created_by: 'a0000000-0000-0000-0000-000000000001', completed_by: null, completed_at: null, assigned_to: null, is_recurring: false, created_at: new Date().toISOString(), position: 5 },
  { id: '7', title: '保険の書類提出', category_id: 'b0000000-0000-0000-0000-000000000007', status: 'pending', adult_only: true, points: 3, created_by: 'a0000000-0000-0000-0000-000000000002', completed_by: null, completed_at: null, assigned_to: null, is_recurring: false, created_at: new Date().toISOString(), position: 6 },
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
  const [tasks, setTasks] = useState<Task[]>(isSupabaseConfigured ? [] : DEMO_TASKS);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  const fetchTasks = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('status', 'pending')
      .order('position', { ascending: true });
    if (data) setTasks(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch for external data
    fetchTasks();

    const channel = supabase
      .channel('tasks_changes')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tasks', filter: 'status=eq.pending' }, (payload: any) => {
        const newTask = payload.new as Task;
        setTasks(prev => {
          if (prev.some(t => t.id === newTask.id)) return prev;
          return [newTask, ...prev];
        });
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tasks' }, (payload: any) => {
        const updated = payload.new as Task;
        if (updated.status !== 'pending') {
          setTasks(prev => prev.filter(t => t.id !== updated.id));
        } else {
          setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
        }
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'tasks' }, (payload: any) => {
        const deleted = payload.old as Task;
        setTasks(prev => prev.filter(t => t.id !== deleted.id));
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
  }, creatorName?: string) => {
    if (!isSupabaseConfigured) {
      const newTask: Task = {
        id: crypto.randomUUID(),
        ...task,
        status: 'pending',
        completed_by: null,
        completed_at: null,
        assigned_to: null,
        created_at: new Date().toISOString(),
        position: 0,
      };
      setTasks(prev => [newTask, ...prev.map(t => ({ ...t, position: t.position + 1 }))]);
      return newTask;
    }

    // Increment position of all unassigned pending tasks (new task goes to unassigned group)
    await supabase.rpc('increment_positions', {
      p_assigned_to: null,
    });

    const { data, error } = await supabase
      .from('tasks')
      .insert({ ...task, status: 'pending', position: 0 })
      .select()
      .single();
    if (error) {
      throw new Error(error.message);
    }
    if (data) {
      setTasks(prev => [data, ...prev]);

      // Send push notification to all family members except the creator
      fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exclude_member_id: task.created_by,
          title: '新しいタスク',
          body: `${creatorName ?? 'メンバー'}が「${data.title}」を追加しました`,
          url: '/history',
        }),
      }).catch(() => {});

      // Log activity
      supabase.from('activity_logs').insert({
        event_type: 'task_created',
        actor_id: task.created_by,
        task_title: data.title,
      }).then(() => {}, () => {});
    }
    return data;
  }, []);

  const completeTask = useCallback(async (taskId: string, memberId: string, categoryEmoji: string, memberName?: string) => {
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

    // Send push notification to all family members except the completer
    fetch('/api/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        exclude_member_id: memberId,
        title: 'タスク完了！',
        body: `${memberName ?? 'メンバー'}が「${task.title}」を完了しました 🎉`,
        url: '/history',
      }),
    }).catch(() => {});

    // Log activity
    supabase.from('activity_logs').insert({
      event_type: 'task_completed',
      actor_id: memberId,
      task_title: task.title,
      category_emoji: categoryEmoji,
      points: task.points,
    }).then(() => {}, () => {});

    return { task_title: task.title, points: task.points };
  }, [tasks]);

  const assignTask = useCallback(async (taskId: string, memberId: string, currentMemberId?: string, currentMemberName?: string) => {
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

    // Send push notification
    const task = tasks.find(t => t.id === taskId);
    const isSelfAssign = memberId === currentMemberId;

    if (isSelfAssign) {
      // Self-assign ("やる!"): notify everyone else
      fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exclude_member_id: memberId,
          title: 'タスクを引き受けました',
          body: `${currentMemberName ?? 'メンバー'}が「${task?.title ?? 'タスク'}」をやると言いました`,
          url: '/history',
        }),
      }).catch(() => {});

      // Log activity
      supabase.from('activity_logs').insert({
        event_type: 'task_self_assigned',
        actor_id: memberId,
        task_title: task?.title ?? 'タスク',
      }).then(() => {}, () => {});
    } else {
      // Request assign ("おねがい"): notify the assigned member
      fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_ids: [memberId],
          title: 'タスクがおねがいされました',
          body: `${currentMemberName ?? 'メンバー'}から「${task?.title ?? 'タスク'}」をおねがいされました`,
          url: '/history',
        }),
      }).catch(() => {});

      // Log activity
      supabase.from('activity_logs').insert({
        event_type: 'task_request_assigned',
        actor_id: currentMemberId!,
        target_member_id: memberId,
        task_title: task?.title ?? 'タスク',
      }).then(() => {}, () => {});
    }
  }, [tasks]);

  const deleteTask = useCallback(async (taskId: string) => {
    if (!isSupabaseConfigured) {
      setTasks(prev => prev.filter(t => t.id !== taskId));
      return;
    }

    // Optimistic update first
    setTasks(prev => prev.filter(t => t.id !== taskId));

    await supabase.rpc('delete_task', { p_task_id: taskId });
  }, []);

  const reorderTasks = useCallback(async (reorderedTasks: { id: string; position: number; assigned_to: string | null }[]) => {
    // Capture for rollback
    const prevTasks = [...tasks];

    // Optimistic update
    setTasks(prev => {
      const updates = new Map(reorderedTasks.map(t => [t.id, t]));
      return prev.map(t => {
        const update = updates.get(t.id);
        if (update) {
          return { ...t, position: update.position, assigned_to: update.assigned_to };
        }
        return t;
      });
    });

    // Batch update to Supabase
    try {
      const promises = reorderedTasks.map(t =>
        supabase
          .from('tasks')
          .update({ position: t.position, assigned_to: t.assigned_to })
          .eq('id', t.id)
      );
      await Promise.all(promises);
    } catch {
      setTasks(prevTasks);
    }
  }, [tasks]);

  const sendAssignNotification = useCallback(async (taskId: string, memberId: string, currentMemberId?: string, currentMemberName?: string) => {
    const task = tasks.find(t => t.id === taskId);
    const isSelfAssign = memberId === currentMemberId;

    if (isSelfAssign) {
      fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exclude_member_id: memberId,
          title: 'タスクを引き受けました',
          body: `${currentMemberName ?? 'メンバー'}が「${task?.title ?? 'タスク'}」をやると言いました`,
          url: '/',
        }),
      }).catch(() => {});
    } else {
      fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_ids: [memberId],
          title: 'タスクがおねがいされました',
          body: `${currentMemberName ?? 'メンバー'}から「${task?.title ?? 'タスク'}」をおねがいされました`,
          url: '/',
        }),
      }).catch(() => {});
    }
  }, [tasks]);

  return { tasks, loading, addTask, completeTask, assignTask, deleteTask, reorderTasks, sendAssignNotification, refetch: fetchTasks };
}
