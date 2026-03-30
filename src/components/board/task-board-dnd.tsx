'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { Task, TaskCategory, FamilyMember } from '@/types/database';
import { TaskCard } from './task-card';
import { TaskList } from './task-list';

const UNASSIGNED_GROUP = 'group:unassigned';
function groupId(memberId: string | null): string {
  return memberId ? `group:${memberId}` : UNASSIGNED_GROUP;
}
function memberIdFromGroupId(gid: string): string | null {
  if (gid === UNASSIGNED_GROUP) return null;
  return gid.replace('group:', '');
}

interface TaskBoardDndProps {
  tasks: Task[];
  categories: TaskCategory[];
  members: FamilyMember[];
  currentMemberId: string;
  isChild: boolean;
  onComplete: (taskId: string) => void;
  onAssign: (taskId: string, memberId: string) => void;
  onDelete: (taskId: string) => void;
  onReorder: (updates: { id: string; position: number; assigned_to: string | null }[]) => void;
  onSendAssignNotification: (taskId: string, memberId: string) => void;
  onEdit?: (task: Task) => void;
}

export function TaskBoardDnd({
  tasks,
  categories,
  members,
  currentMemberId,
  isChild,
  onComplete,
  onAssign,
  onDelete,
  onReorder,
  onSendAssignNotification,
  onEdit,
}: TaskBoardDndProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 300, tolerance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 300, tolerance: 5 },
    }),
  );

  const categoryMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);

  // Group tasks by assigned_to
  const unassignedTasks = useMemo(
    () => tasks.filter(t => !t.assigned_to).sort((a, b) => a.position - b.position),
    [tasks]
  );
  const myTasks = useMemo(
    () => tasks.filter(t => t.assigned_to === currentMemberId).sort((a, b) => a.position - b.position),
    [tasks, currentMemberId]
  );
  const otherMembers = useMemo(() => members.filter(m => m.id !== currentMemberId), [members, currentMemberId]);
  const currentMember = useMemo(() => members.find(m => m.id === currentMemberId), [members, currentMemberId]);

  const findGroupForTask = useCallback((taskId: string): string | null => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return null;
    return groupId(task.assigned_to);
  }, [tasks]);

  const getTasksForGroup = useCallback((gid: string): Task[] => {
    const memberId = memberIdFromGroupId(gid);
    return tasks
      .filter(t => t.assigned_to === memberId)
      .sort((a, b) => a.position - b.position);
  }, [tasks]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id);
    if (task) setActiveTask(task);
  }, [tasks]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveTask(null);

    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Determine source and destination groups
    const sourceGroup = findGroupForTask(activeId);
    if (!sourceGroup) return;

    // If dropped on a group container directly
    let destGroup: string;
    let overTaskId: string | null = null;

    if (overId.startsWith('group:')) {
      destGroup = overId;
    } else {
      // Dropped on another task
      const overGroup = findGroupForTask(overId);
      if (!overGroup) return;
      destGroup = overGroup;
      overTaskId = overId;
    }

    const sourceTasks = getTasksForGroup(sourceGroup);
    const destMemberId = memberIdFromGroupId(destGroup);

    if (sourceGroup === destGroup) {
      // Same group reorder
      const oldIndex = sourceTasks.findIndex(t => t.id === activeId);
      const newIndex = overTaskId
        ? sourceTasks.findIndex(t => t.id === overTaskId)
        : sourceTasks.length;
      if (oldIndex === -1 || oldIndex === newIndex) return;

      const reordered = arrayMove(sourceTasks, oldIndex, newIndex);
      const updates = reordered.map((t, i) => ({
        id: t.id,
        position: i,
        assigned_to: t.assigned_to,
      }));
      onReorder(updates);
    } else {
      // Cross-group move
      const task = tasks.find(t => t.id === activeId);
      if (!task) return;

      // Remove from source, add to destination
      const newSourceTasks = sourceTasks.filter(t => t.id !== activeId);
      const destTasks = getTasksForGroup(destGroup);

      let insertIndex: number;
      if (overTaskId) {
        insertIndex = destTasks.findIndex(t => t.id === overTaskId);
        if (insertIndex === -1) insertIndex = destTasks.length;
      } else {
        insertIndex = destTasks.length;
      }

      const newDestTasks = [...destTasks];
      newDestTasks.splice(insertIndex, 0, { ...task, assigned_to: destMemberId });

      // Build updates for both groups
      const updates = [
        ...newSourceTasks.map((t, i) => ({
          id: t.id,
          position: i,
          assigned_to: t.assigned_to,
        })),
        ...newDestTasks.map((t, i) => ({
          id: t.id,
          position: i,
          assigned_to: destMemberId,
        })),
      ];
      onReorder(updates);

      // Send notification for cross-group assignment change (DB update already handled by onReorder)
      const sourceMemberId = memberIdFromGroupId(sourceGroup);
      if (destMemberId !== null && destMemberId !== currentMemberId) {
        onSendAssignNotification(activeId, destMemberId);
      } else if (destMemberId === currentMemberId && sourceMemberId === null) {
        onSendAssignNotification(activeId, currentMemberId);
      }
    }
  }, [tasks, findGroupForTask, getTasksForGroup, onReorder, onSendAssignNotification, currentMemberId]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
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
            groupId={UNASSIGNED_GROUP}
            onComplete={onComplete}
            onAssign={onAssign}
            onDelete={onDelete}
            onEdit={onEdit}
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
            groupId={groupId(currentMemberId)}
            onComplete={onComplete}
            onAssign={onAssign}
            onDelete={onDelete}
            onEdit={onEdit}
          />
        </section>

        {otherMembers.map(member => {
          const memberTasks = tasks
            .filter(t => t.assigned_to === member.id)
            .sort((a, b) => a.position - b.position);
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
                groupId={groupId(member.id)}
                onComplete={onComplete}
                onAssign={onAssign}
                onDelete={onDelete}
              />
            </section>
          );
        })}
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="rotate-2 scale-105 shadow-xl">
            <TaskCard
              task={activeTask}
              category={categoryMap.get(activeTask.category_id)}
              isChild={isChild}
              members={members}
              currentMemberId={currentMemberId}
              onComplete={() => {}}
              onAssign={() => {}}
              onDelete={() => {}}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
