'use client';

import { useState, useCallback } from 'react';
import { AppShell } from '@/components/app-shell';
import { TaskList } from '@/components/board/task-list';
import { QuickAdd } from '@/components/board/quick-add';
import { CelebrationOverlay } from '@/components/celebration/celebration-overlay';
import { useTasks, useCategories } from '@/hooks/use-tasks';
import { useFamilyMembers } from '@/hooks/use-family-members';

export default function BoardPage() {
  const { tasks, addTask, completeTask } = useTasks();
  const categories = useCategories();
  const members = useFamilyMembers();

  const [celebration, setCelebration] = useState<{
    show: boolean;
    points: number;
    memberName: string;
  }>({ show: false, points: 0, memberName: '' });

  const handleComplete = useCallback(
    async (taskId: string, currentMemberId: string) => {
      const task = tasks.find(t => t.id === taskId);
      const category = categories.find(c => c.id === task?.category_id);
      const member = members.find(m => m.id === currentMemberId);

      const result = await completeTask(taskId, currentMemberId, category?.emoji ?? '📦');
      if (result) {
        setCelebration({
          show: true,
          points: result.points,
          memberName: member?.name ?? '',
        });
      }
    },
    [tasks, categories, members, completeTask],
  );

  return (
    <AppShell>
      {({ currentMemberId, isChild }) => (
        <>
          <TaskList
            tasks={tasks}
            categories={categories}
            isChild={isChild}
            onComplete={(taskId) => handleComplete(taskId, currentMemberId)}
          />
          <QuickAdd
            categories={categories}
            currentMemberId={currentMemberId}
            isChild={isChild}
            onAdd={addTask}
          />
          <CelebrationOverlay
            show={celebration.show}
            points={celebration.points}
            memberName={celebration.memberName}
            onDone={() => setCelebration(prev => ({ ...prev, show: false }))}
          />
        </>
      )}
    </AppShell>
  );
}
