'use client';

import { useState, useCallback } from 'react';
import { AppShell } from '@/components/app-shell';
import { TaskList } from '@/components/board/task-list';
import { QuickAdd } from '@/components/board/quick-add';
import { CelebrationOverlay } from '@/components/celebration/celebration-overlay';
import { TodaysEfforts } from '@/components/board/todays-efforts';
import { useTasks, useCategories } from '@/hooks/use-tasks';
import { useFamilyMembers } from '@/hooks/use-family-members';
import { PushNotificationPrompt } from '@/components/push-notification-prompt';

export default function BoardPage() {
  const { tasks, addTask, completeTask, assignTask, deleteTask } = useTasks();
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
        const unassignedTasks = tasks.filter(t => !t.assigned_to);
        const myTasks = tasks.filter(t => t.assigned_to === currentMemberId);
        const otherMembers = members.filter(m => m.id !== currentMemberId);
        const currentMember = members.find(m => m.id === currentMemberId);

        const handleAssign = (taskId: string, memberId: string) => {
          assignTask(taskId, memberId, currentMemberId, currentMember?.name);
        };

        const handleAdd = (task: Parameters<typeof addTask>[0]) => {
          return addTask(task, currentMember?.name);
        };

        return (
          <>
            <PushNotificationPrompt memberId={currentMemberId} />
            <div className="flex flex-col gap-6 pb-24">
              <section>
                <h2 className="text-lg font-bold mb-2 flex items-center gap-1">
                  📋 {isChild ? 'みんなのおしごと' : 'みんなのタスク'}
                </h2>
                <TaskList
                  tasks={unassignedTasks}
                  categories={categories}
                  members={members}
                  currentMemberId={currentMemberId}
                  isChild={isChild}
                  onComplete={(taskId) => handleComplete(taskId, currentMemberId)}
                  onAssign={handleAssign}
                  onDelete={deleteTask}
                />
              </section>

              <section>
                <h2 className="text-lg font-bold mb-2 flex items-center gap-1">
                  {currentMember?.avatar ?? '👤'} {isChild ? 'じぶんのおしごと' : 'じぶんのタスク'}
                </h2>
                <TaskList
                  tasks={myTasks}
                  categories={categories}
                  members={members}
                  currentMemberId={currentMemberId}
                  isChild={isChild}
                  onComplete={(taskId) => handleComplete(taskId, currentMemberId)}
                  onAssign={handleAssign}
                  onDelete={deleteTask}
                />
              </section>

              <TodaysEfforts
                currentMemberId={currentMemberId}
                isChild={isChild}
                members={members}
              />

              {otherMembers.map(member => {
                const memberTasks = tasks.filter(t => t.assigned_to === member.id);
                return (
                  <section key={member.id}>
                    <h2 className="text-lg font-bold mb-2 flex items-center gap-1 text-muted-foreground">
                      {member.avatar} {member.name}のタスク
                    </h2>
                    <TaskList
                      tasks={memberTasks}
                      categories={categories}
                      members={members}
                      currentMemberId={currentMemberId}
                      isChild={isChild}
                      onComplete={(taskId) => handleComplete(taskId, currentMemberId)}
                      onAssign={handleAssign}
                      onDelete={deleteTask}
                    />
                  </section>
                );
              })}
            </div>

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
