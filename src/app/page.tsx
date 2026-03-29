'use client';

import { useState, useCallback } from 'react';
import { AppShell } from '@/components/app-shell';
import { TaskBoardDnd } from '@/components/board/task-board-dnd';
import { QuickAdd } from '@/components/board/quick-add';
import { CelebrationOverlay } from '@/components/celebration/celebration-overlay';
import { ReportEffort } from '@/components/board/report-effort';
import { useTasks, useCategories } from '@/hooks/use-tasks';
import { useFamilyMembers } from '@/hooks/use-family-members';
import { useReportEffort } from '@/hooks/use-report-effort';
import { PushNotificationPrompt } from '@/components/push-notification-prompt';
import { RecurringGenerationRunner } from '@/components/board/recurring-generation-runner';

export default function BoardPage() {
  const { tasks, loading, addTask, completeTask, assignTask, deleteTask, reorderTasks, sendAssignNotification } = useTasks();
  const categories = useCategories();
  const members = useFamilyMembers();
  const { reportEffort } = useReportEffort();

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

      const result = await completeTask(taskId, currentMemberId, category?.emoji ?? '📦', member?.name);
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
      {({ currentMemberId, isChild }) => {
        if (loading) {
          return (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
            </div>
          );
        }

        const currentMember = members.find(m => m.id === currentMemberId);

        const handleAssign = (taskId: string, memberId: string) => {
          assignTask(taskId, memberId, currentMemberId, currentMember?.name);
        };

        const handleAdd = (task: Parameters<typeof addTask>[0]) => {
          return addTask(task, currentMember?.name);
        };

        return (
          <>
            <RecurringGenerationRunner currentMemberId={currentMemberId} />
            <PushNotificationPrompt memberId={currentMemberId} />
            <TaskBoardDnd
              tasks={tasks}
              categories={categories}
              members={members}
              currentMemberId={currentMemberId}
              isChild={isChild}
              onComplete={(taskId) => handleComplete(taskId, currentMemberId)}
              onAssign={handleAssign}
              onDelete={deleteTask}
              onReorder={reorderTasks}
              onSendAssignNotification={(taskId, memberId) => sendAssignNotification(taskId, memberId, currentMemberId, currentMember?.name)}
            />
            <ReportEffort
              categories={categories}
              members={members}
              currentMemberId={currentMemberId}
              isChild={isChild}
              onReport={async (targetMemberId, taskTitle, categoryEmoji, targetName, adultOnly) => {
                await reportEffort(currentMemberId, targetMemberId, taskTitle, categoryEmoji, currentMember?.name, adultOnly);
                setCelebration({ show: true, points: 1, memberName: targetName });
              }}
            />
            <QuickAdd
              categories={categories}
              currentMemberId={currentMemberId}
              isChild={isChild}
              onAdd={handleAdd}
            />
            <CelebrationOverlay
              show={celebration.show}
              points={celebration.points}
              memberName={celebration.memberName}
              onDone={() => setCelebration(prev => ({ ...prev, show: false }))}
            />
          </>
        );
      }}
    </AppShell>
  );
}
