'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
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
import { Task } from '@/types/database';

export default function BoardPage() {
  const { tasks, loading, addTask, completeTask, assignTask, deleteTask, updateTask, reorderTasks, sendAssignNotification } = useTasks();
  const categories = useCategories();
  const members = useFamilyMembers();
  const { reportEffort } = useReportEffort();

  const [celebration, setCelebration] = useState<{
    show: boolean;
    points: number;
    memberName: string;
  }>({ show: false, points: 0, memberName: '' });

  const [editTask, setEditTask] = useState<Task | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  // Refs for stable callbacks that need render-prop values
  const tasksRef = useRef(tasks);
  const categoriesRef = useRef(categories);
  const membersRef = useRef(members);
  const currentMemberIdRef = useRef('');
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);
  useEffect(() => { categoriesRef.current = categories; }, [categories]);
  useEffect(() => { membersRef.current = members; }, [members]);

  const handleComplete = useCallback(
    async (taskId: string, currentMemberId: string) => {
      const task = tasksRef.current.find(t => t.id === taskId);
      const category = categoriesRef.current.find(c => c.id === task?.category_id);
      const member = membersRef.current.find(m => m.id === currentMemberId);

      const result = await completeTask(taskId, currentMemberId, category?.emoji ?? '📦', member?.name);
      if (result) {
        setCelebration({
          show: true,
          points: result.points,
          memberName: member?.name ?? '',
        });
      }
    },
    [completeTask],
  );

  const handleEdit = useCallback((task: Task) => {
    setEditTask(task);
    setEditOpen(true);
  }, []);

  const handleEditOpenChange = useCallback((open: boolean) => {
    setEditOpen(open);
    if (!open) setEditTask(null);
  }, []);

  const handleAssign = useCallback((taskId: string, memberId: string) => {
    const currentMember = membersRef.current.find(m => m.id === currentMemberIdRef.current);
    assignTask(taskId, memberId, currentMemberIdRef.current, currentMember?.name);
  }, [assignTask]);

  const handleAdd = useCallback((task: Parameters<typeof addTask>[0]) => {
    const currentMember = membersRef.current.find(m => m.id === currentMemberIdRef.current);
    return addTask(task, currentMember?.name);
  }, [addTask]);

  const handleCompleteWithMember = useCallback((taskId: string) => {
    handleComplete(taskId, currentMemberIdRef.current);
  }, [handleComplete]);

  const handleSendAssignNotification = useCallback((taskId: string, memberId: string) => {
    const currentMember = membersRef.current.find(m => m.id === currentMemberIdRef.current);
    sendAssignNotification(taskId, memberId, currentMemberIdRef.current, currentMember?.name);
  }, [sendAssignNotification]);

  return (
    <AppShell>
      {({ currentMemberId, isChild }) => {
        currentMemberIdRef.current = currentMemberId;

        if (loading) {
          return (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
            </div>
          );
        }

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
              onComplete={handleCompleteWithMember}
              onAssign={handleAssign}
              onDelete={deleteTask}
              onReorder={reorderTasks}
              onSendAssignNotification={handleSendAssignNotification}
              onEdit={handleEdit}
            />
            <ReportEffort
              categories={categories}
              members={members}
              currentMemberId={currentMemberId}
              isChild={isChild}
              onReport={async (targetMemberId, taskTitle, categoryEmoji, targetName, adultOnly) => {
                await reportEffort(currentMemberId, targetMemberId, taskTitle, categoryEmoji, membersRef.current.find(m => m.id === currentMemberId)?.name, adultOnly);
                setCelebration({ show: true, points: 1, memberName: targetName });
              }}
            />
            <QuickAdd
              categories={categories}
              currentMemberId={currentMemberId}
              isChild={isChild}
              onAdd={handleAdd}
            />
            {editOpen && (
              <QuickAdd
                key={editTask?.id}
                categories={categories}
                currentMemberId={currentMemberId}
                isChild={isChild}
                onAdd={handleAdd}
                editTask={editTask}
                editOpen={editOpen}
                onEditOpenChange={handleEditOpenChange}
                onUpdate={updateTask}
              />
            )}
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
