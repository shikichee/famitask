'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePolling } from './use-polling';
import {
  getTasks as fetchTasksAction,
  getCategories as fetchCategoriesAction,
  createTask as createTaskAction,
  completeTask as completeTaskAction,
  assignTask as assignTaskAction,
  deleteTask as deleteTaskAction,
  reorderTasks as reorderTasksAction,
  updateTask as updateTaskAction,
  createActivityLog,
} from '@/actions/tasks';
import { Task, TaskCategory } from '@/types/database';

export function useCategories() {
  const [categories, setCategories] = useState<TaskCategory[]>([]);

  useEffect(() => {
    fetchCategoriesAction().then(setCategories);
  }, []);

  return categories;
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const tasksRef = useRef(tasks);
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);

  const fetchTasks = useCallback(async () => {
    const data = await fetchTasksAction();
    setTasks(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  usePolling(fetchTasks, 3000);

  const addTask = useCallback(async (task: {
    title: string;
    category_id: string;
    points: number;
    adult_only: boolean;
    created_by: string;
    is_recurring: boolean;
  }, creatorName?: string) => {
    const data = await createTaskAction(task);
    setTasks(prev => [data, ...prev]);

    // Push notification
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

    return data;
  }, []);

  const completeTask = useCallback(async (taskId: string, memberId: string, categoryEmoji: string, memberName?: string) => {
    const task = tasksRef.current.find(t => t.id === taskId);
    if (!task) return null;

    // Optimistic UI
    setTasks(prev => prev.filter(t => t.id !== taskId));

    const result = await completeTaskAction(taskId, memberId, categoryEmoji);

    // Push notification
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

    return result;
  }, []);

  const assignTask = useCallback(async (taskId: string, memberId: string, currentMemberId?: string, currentMemberName?: string) => {
    await assignTaskAction(taskId, memberId);

    const task = tasksRef.current.find(t => t.id === taskId);
    const isSelfAssign = memberId === currentMemberId;

    if (isSelfAssign) {
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

      createActivityLog({
        event_type: 'task_self_assigned',
        actor_id: memberId,
        task_title: task?.title ?? 'タスク',
      }).catch(() => {});
    } else {
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

      createActivityLog({
        event_type: 'task_request_assigned',
        actor_id: currentMemberId!,
        target_member_id: memberId,
        task_title: task?.title ?? 'タスク',
      }).catch(() => {});
    }
  }, []);

  const deleteTask = useCallback(async (taskId: string) => {
    const prevTasks = [...tasksRef.current];
    setTasks(prev => prev.filter(t => t.id !== taskId));

    try {
      await deleteTaskAction(taskId);
    } catch {
      setTasks(prevTasks);
    }
  }, []);

  const reorderTasks = useCallback(async (reorderedTasks: { id: string; position: number; assigned_to: string | null }[]) => {
    const prevTasks = [...tasksRef.current];

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

    try {
      await reorderTasksAction(reorderedTasks);
    } catch {
      setTasks(prevTasks);
    }
  }, []);

  const updateTask = useCallback(async (taskId: string, updates: {
    title: string;
    category_id: string;
    points: number;
    adult_only: boolean;
  }) => {
    const prevTasks = [...tasksRef.current];
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));

    try {
      await updateTaskAction(taskId, updates);
    } catch {
      setTasks(prevTasks);
    }
  }, []);

  const sendAssignNotification = useCallback(async (taskId: string, memberId: string, currentMemberId?: string, currentMemberName?: string) => {
    const task = tasksRef.current.find(t => t.id === taskId);
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
  }, []);

  return { tasks, loading, addTask, completeTask, assignTask, deleteTask, updateTask, reorderTasks, sendAssignNotification, refetch: fetchTasks };
}
