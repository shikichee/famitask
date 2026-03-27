# タスク並べ替え機能 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** タスクカードを長押しでドラッグ&ドロップし、グループ内の並び替えとグループ間の移動を実現する

**Architecture:** @dnd-kit でドラッグ&ドロップを実装。tasksテーブルに `position` カラムを追加し、グループ（assigned_to）ごとに position 昇順でソート。DndContext を page.tsx に配置し、各グループを SortableContext でラップ。

**Tech Stack:** @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, Supabase, Next.js 16, React 19

---

## ファイル構成

| ファイル | 操作 | 責務 |
|---------|------|------|
| `supabase/migrations/add_position_column.sql` | 新規 | position カラム追加マイグレーション |
| `supabase/schema.sql` | 変更 | position カラムをスキーマに反映 |
| `src/types/database.ts` | 変更 | Task 型に position 追加 |
| `src/hooks/use-tasks.ts` | 変更 | ソート順変更、reorderTasks 追加、addTask の position 対応 |
| `src/components/board/sortable-task-card.tsx` | 新規 | useSortable をラップした TaskCard |
| `src/components/board/task-list.tsx` | 変更 | SortableContext + useDroppable でラップ |
| `src/components/board/task-board-dnd.tsx` | 新規 | DndContext + センサー + DragOverlay + ドラッグハンドラ |
| `src/app/page.tsx` | 変更 | TaskBoardDnd を使用するよう変更 |

---

### Task 1: @dnd-kit のインストール

**Files:**
- Modify: `package.json`

- [ ] **Step 1: パッケージをインストール**

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

- [ ] **Step 2: ビルド確認**

Run: `npm run build`
Expected: ビルド成功（既存コードに変更なし）

- [ ] **Step 3: コミット**

```bash
git add package.json package-lock.json
git commit -m "chore: @dnd-kit パッケージを追加"
```

---

### Task 2: DB マイグレーション — position カラム追加

**Files:**
- Create: `supabase/migrations/add_position_column.sql`
- Modify: `supabase/schema.sql:26-39`

- [ ] **Step 1: マイグレーションファイルを作成**

`supabase/migrations/add_position_column.sql`:
```sql
-- Add position column for task ordering
ALTER TABLE tasks ADD COLUMN position INTEGER NOT NULL DEFAULT 0;

-- Backfill existing pending tasks with position based on created_at (newest = smallest)
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY COALESCE(assigned_to, '00000000-0000-0000-0000-000000000000')
    ORDER BY created_at DESC
  ) - 1 AS pos
  FROM tasks
  WHERE status = 'pending'
)
UPDATE tasks SET position = ranked.pos FROM ranked WHERE tasks.id = ranked.id;

-- Index for efficient ordering
CREATE INDEX idx_tasks_position ON tasks(assigned_to, position);
```

- [ ] **Step 2: schema.sql を更新（ドキュメントとして）**

`supabase/schema.sql` の tasks テーブル定義に `position` を追加:

```sql
  is_recurring boolean not null default false,
  created_at timestamptz not null default now(),
  position integer not null default 0
```

また、インデックスセクションに追加:

```sql
create index idx_tasks_position on tasks(assigned_to, position);
```

- [ ] **Step 3: コミット**

```bash
git add supabase/migrations/add_position_column.sql supabase/schema.sql
git commit -m "db: tasks テーブルに position カラムを追加"
```

---

### Task 3: 型定義とフック更新 — position 対応

**Files:**
- Modify: `src/types/database.ts:18-31`
- Modify: `src/hooks/use-tasks.ts`

- [ ] **Step 1: Task 型に position を追加**

`src/types/database.ts` の Task 型を更新:

```typescript
export type Task = {
  id: string;
  title: string;
  category_id: string;
  status: 'pending' | 'done';
  adult_only: boolean;
  points: number;
  created_by: string;
  completed_by: string | null;
  completed_at: string | null;
  assigned_to: string | null;
  is_recurring: boolean;
  created_at: string;
  position: number;
};
```

- [ ] **Step 2: use-tasks.ts のソート順を position に変更**

`src/hooks/use-tasks.ts` の fetchTasks（53行目）を変更:

```typescript
// Before:
.order('created_at', { ascending: false });

// After:
.order('position', { ascending: true });
```

- [ ] **Step 3: addTask で position=0 を設定し、既存タスクの position をインクリメント**

`src/hooks/use-tasks.ts` の addTask 関数内、insert の前に既存タスクの position をずらすロジックを追加。insert 部分を更新:

```typescript
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
  // ... rest of push notification logic stays the same
```

- [ ] **Step 4: Supabase に increment_positions RPC を追加**

`supabase/migrations/add_position_column.sql` に追記:

```sql
-- RPC: increment positions for a group (to make room for position=0)
CREATE OR REPLACE FUNCTION increment_positions(p_assigned_to uuid DEFAULT NULL)
RETURNS void AS $$
BEGIN
  IF p_assigned_to IS NULL THEN
    UPDATE tasks
    SET position = position + 1
    WHERE status = 'pending' AND assigned_to IS NULL;
  ELSE
    UPDATE tasks
    SET position = position + 1
    WHERE status = 'pending' AND assigned_to = p_assigned_to;
  END IF;
END;
$$ LANGUAGE plpgsql;
```

- [ ] **Step 5: reorderTasks 関数を use-tasks.ts に追加**

`src/hooks/use-tasks.ts` の return 文の前に追加:

```typescript
const reorderTasks = useCallback(async (reorderedTasks: { id: string; position: number; assigned_to: string | null }[]) => {
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
  const promises = reorderedTasks.map(t =>
    supabase
      .from('tasks')
      .update({ position: t.position, assigned_to: t.assigned_to })
      .eq('id', t.id)
  );
  await Promise.all(promises);
}, []);
```

return 文を更新:

```typescript
return { tasks, addTask, completeTask, assignTask, deleteTask, reorderTasks, refetch: fetchTasks };
```

- [ ] **Step 6: DEMO_TASKS に position を追加**

```typescript
const DEMO_TASKS: Task[] = [
  { id: '1', title: '食器洗い', category_id: 'b0000000-0000-0000-0000-000000000003', status: 'pending', adult_only: false, points: 2, created_by: 'a0000000-0000-0000-0000-000000000001', completed_by: null, completed_at: null, assigned_to: null, is_recurring: true, created_at: new Date().toISOString(), position: 0 },
  { id: '2', title: '洗濯物たたむ', category_id: 'b0000000-0000-0000-0000-000000000002', status: 'pending', adult_only: false, points: 2, created_by: 'a0000000-0000-0000-0000-000000000001', completed_by: null, completed_at: null, assigned_to: null, is_recurring: true, created_at: new Date().toISOString(), position: 1 },
  { id: '3', title: 'お風呂掃除', category_id: 'b0000000-0000-0000-0000-000000000001', status: 'pending', adult_only: false, points: 3, created_by: 'a0000000-0000-0000-0000-000000000002', completed_by: null, completed_at: null, assigned_to: null, is_recurring: true, created_at: new Date().toISOString(), position: 2 },
  { id: '4', title: 'ゴミ出し', category_id: 'b0000000-0000-0000-0000-000000000001', status: 'pending', adult_only: false, points: 1, created_by: 'a0000000-0000-0000-0000-000000000002', completed_by: null, completed_at: null, assigned_to: null, is_recurring: true, created_at: new Date().toISOString(), position: 3 },
  { id: '5', title: '習い事の準備', category_id: 'b0000000-0000-0000-0000-000000000005', status: 'pending', adult_only: false, points: 2, created_by: 'a0000000-0000-0000-0000-000000000001', completed_by: null, completed_at: null, assigned_to: null, is_recurring: false, created_at: new Date().toISOString(), position: 4 },
  { id: '6', title: '病院予約', category_id: 'b0000000-0000-0000-0000-000000000007', status: 'pending', adult_only: true, points: 2, created_by: 'a0000000-0000-0000-0000-000000000001', completed_by: null, completed_at: null, assigned_to: null, is_recurring: false, created_at: new Date().toISOString(), position: 5 },
  { id: '7', title: '保険の書類提出', category_id: 'b0000000-0000-0000-0000-000000000007', status: 'pending', adult_only: true, points: 3, created_by: 'a0000000-0000-0000-0000-000000000002', completed_by: null, completed_at: null, assigned_to: null, is_recurring: false, created_at: new Date().toISOString(), position: 6 },
];
```

- [ ] **Step 7: ビルド確認**

Run: `npm run build`
Expected: ビルド成功

- [ ] **Step 8: コミット**

```bash
git add src/types/database.ts src/hooks/use-tasks.ts supabase/migrations/add_position_column.sql
git commit -m "feat: Task に position を追加し、ソート順と reorderTasks を実装"
```

---

### Task 4: SortableTaskCard コンポーネント作成

**Files:**
- Create: `src/components/board/sortable-task-card.tsx`

- [ ] **Step 1: SortableTaskCard を作成**

`src/components/board/sortable-task-card.tsx`:

```typescript
'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task, TaskCategory, FamilyMember } from '@/types/database';
import { TaskCard } from './task-card';

interface SortableTaskCardProps {
  task: Task;
  category: TaskCategory | undefined;
  isChild: boolean;
  members: FamilyMember[];
  currentMemberId: string;
  onComplete: (taskId: string) => void;
  onAssign: (taskId: string, memberId: string) => void;
  onDelete: (taskId: string) => void;
}

export function SortableTaskCard(props: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    touchAction: 'manipulation',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard {...props} />
    </div>
  );
}
```

- [ ] **Step 2: ビルド確認**

Run: `npm run build`
Expected: ビルド成功（まだ使われていないが、型チェックは通る）

- [ ] **Step 3: コミット**

```bash
git add src/components/board/sortable-task-card.tsx
git commit -m "feat: SortableTaskCard コンポーネントを作成"
```

---

### Task 5: TaskList を SortableContext 対応に変更

**Files:**
- Modify: `src/components/board/task-list.tsx`

- [ ] **Step 1: TaskList を更新**

`src/components/board/task-list.tsx` を以下に書き換え:

```typescript
'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Task, TaskCategory, FamilyMember } from '@/types/database';
import { SortableTaskCard } from './sortable-task-card';

interface TaskListProps {
  tasks: Task[];
  categories: TaskCategory[];
  members: FamilyMember[];
  currentMemberId: string;
  isChild: boolean;
  groupId: string;
  onComplete: (taskId: string) => void;
  onAssign: (taskId: string, memberId: string) => void;
  onDelete: (taskId: string) => void;
}

export function TaskList({ tasks, categories, members, currentMemberId, isChild, groupId, onComplete, onAssign, onDelete }: TaskListProps) {
  const filteredTasks = isChild
    ? tasks.filter(t => !t.adult_only)
    : tasks;

  const categoryMap = new Map(categories.map(c => [c.id, c]));

  const { setNodeRef } = useDroppable({ id: groupId });

  if (filteredTasks.length === 0) {
    return (
      <div ref={setNodeRef} className="flex flex-col items-center justify-center py-16 text-muted-foreground min-h-[80px]">
        <span className="text-4xl mb-3">🎉</span>
        <p className={`font-medium ${isChild ? 'text-lg' : ''}`}>
          {isChild ? 'ぜんぶおわったよ!' : 'タスクがありません'}
        </p>
        <p className={`text-sm mt-1 ${isChild ? 'text-base' : ''}`}>
          {isChild ? 'あたらしいおしごとをついかしよう' : '「+」ボタンでタスクを追加しましょう'}
        </p>
      </div>
    );
  }

  return (
    <SortableContext items={filteredTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
      <div ref={setNodeRef} className="flex flex-col gap-2 min-h-[40px]">
        {filteredTasks.map((task) => (
          <SortableTaskCard
            key={task.id}
            task={task}
            category={categoryMap.get(task.category_id)}
            isChild={isChild}
            members={members}
            currentMemberId={currentMemberId}
            onComplete={onComplete}
            onAssign={onAssign}
            onDelete={onDelete}
          />
        ))}
      </div>
    </SortableContext>
  );
}
```

**重要な変更点:**
- `groupId` prop を追加（ドロップ先の識別に使用）
- `useDroppable` でグループをドロップ可能に
- `SortableContext` でソート可能に
- `TaskCard` → `SortableTaskCard` に変更
- 空のグループにも `min-h` を設定（ドロップターゲットになるよう）

- [ ] **Step 2: ビルド確認（型エラーが出る — page.tsx で groupId を渡していないため）**

この時点ではビルドエラーになるのは期待通り。次のタスクで修正する。

- [ ] **Step 3: コミット**

```bash
git add src/components/board/task-list.tsx
git commit -m "feat: TaskList を SortableContext + useDroppable 対応に変更"
```

---

### Task 6: TaskBoardDnd コンポーネント作成

**Files:**
- Create: `src/components/board/task-board-dnd.tsx`

- [ ] **Step 1: TaskBoardDnd を作成**

`src/components/board/task-board-dnd.tsx`:

```typescript
'use client';

import { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
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

  const categoryMap = new Map(categories.map(c => [c.id, c]));

  // Group tasks by assigned_to
  const unassignedTasks = tasks
    .filter(t => !t.assigned_to)
    .sort((a, b) => a.position - b.position);
  const myTasks = tasks
    .filter(t => t.assigned_to === currentMemberId)
    .sort((a, b) => a.position - b.position);
  const otherMembers = members.filter(m => m.id !== currentMemberId);
  const currentMember = members.find(m => m.id === currentMemberId);

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

  const handleDragOver = useCallback((_event: DragOverEvent) => {
    // Visual feedback is handled by dnd-kit internally
  }, []);

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

      // Trigger notification for cross-group assignment change
      const sourceMemberId = memberIdFromGroupId(sourceGroup);
      if (destMemberId !== null && destMemberId !== currentMemberId) {
        // Moving to someone else's group → "おねがい" notification
        onAssign(activeId, destMemberId);
      } else if (destMemberId === currentMemberId && sourceMemberId === null) {
        // Moving from unassigned to myself → "やる!" (self-assign, no notification to self)
        // onAssign handles the notification logic via currentMemberId comparison
        onAssign(activeId, currentMemberId);
      } else if (destMemberId === null && sourceMemberId !== null) {
        // Moving back to unassigned — update assigned_to to null
        // Already handled by onReorder which sets assigned_to: null
      }
    }
  }, [tasks, findGroupForTask, getTasksForGroup, onReorder, onAssign, currentMemberId]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
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
```

- [ ] **Step 2: ビルド確認**

Run: `npm run build`
Expected: ビルド成功（task-board-dnd はまだ page.tsx で使われていない）

- [ ] **Step 3: コミット**

```bash
git add src/components/board/task-board-dnd.tsx
git commit -m "feat: TaskBoardDnd — DndContext + ドラッグハンドラを実装"
```

---

### Task 7: page.tsx を TaskBoardDnd に切り替え

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: page.tsx を更新**

`src/app/page.tsx` を以下に書き換え:

```typescript
'use client';

import { useState, useCallback } from 'react';
import { AppShell } from '@/components/app-shell';
import { TaskBoardDnd } from '@/components/board/task-board-dnd';
import { QuickAdd } from '@/components/board/quick-add';
import { CelebrationOverlay } from '@/components/celebration/celebration-overlay';
import { TodaysEfforts } from '@/components/board/todays-efforts';
import { useTasks, useCategories } from '@/hooks/use-tasks';
import { useFamilyMembers } from '@/hooks/use-family-members';
import { PushNotificationPrompt } from '@/components/push-notification-prompt';

export default function BoardPage() {
  const { tasks, addTask, completeTask, assignTask, deleteTask, reorderTasks } = useTasks();
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
            />
            <TodaysEfforts
              currentMemberId={currentMemberId}
              isChild={isChild}
              members={members}
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
```

**変更点:**
- `TaskList` の直接使用を `TaskBoardDnd` に置き換え
- `TodaysEfforts` は DndContext の外に移動（ドラッグ対象ではない）
- `reorderTasks` を TaskBoardDnd に渡す

- [ ] **Step 2: ビルド確認**

Run: `npm run build`
Expected: ビルド成功

- [ ] **Step 3: 動作確認**

Run: `npm run dev`

ブラウザで以下を確認:
1. タスクが position 順に表示される
2. タスクを長押し（300ms）でドラッグ開始
3. 同グループ内でドラッグ&ドロップで並べ替えできる
4. 別グループにドラッグで移動できる
5. 「みんなのタスク」から自分にドラッグ → 通知なし
6. 他人のグループにドラッグ → 通知あり
7. ボタン（やる!、おねがい、✓、削除）が通常通り動作する

- [ ] **Step 4: コミット**

```bash
git add src/app/page.tsx
git commit -m "feat: page.tsx を TaskBoardDnd に切り替え、ドラッグ&ドロップ完成"
```

---

### Task 8: TaskCard のボタンクリックとドラッグの競合解消

**Files:**
- Modify: `src/components/board/task-card.tsx`
- Modify: `src/components/board/sortable-task-card.tsx`

- [ ] **Step 1: TaskCard のボタン領域にドラッグ防止を追加**

ボタンクリックがドラッグと競合しないよう、ボタンエリアに `onPointerDown` で `stopPropagation` を追加。

`src/components/board/task-card.tsx` のボタンコンテナ（61行目付近）を修正:

```typescript
      <div
        className="flex items-center gap-1.5 shrink-0"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
```

- [ ] **Step 2: SortableTaskCard でドラッグハンドルの視覚フィードバック追加**

`src/components/board/sortable-task-card.tsx` を更新してカーソルスタイルを追加:

```typescript
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    touchAction: 'manipulation',
    cursor: 'grab',
  };
```

- [ ] **Step 3: ビルド確認**

Run: `npm run build`
Expected: ビルド成功

- [ ] **Step 4: 動作確認**

ブラウザで以下を確認:
1. ボタン（やる!、おねがい、✓、削除）をタップしてもドラッグが始まらない
2. カード本体の長押しでドラッグが正常に開始される
3. ドロップダウンメニューが正常に動作する

- [ ] **Step 5: コミット**

```bash
git add src/components/board/task-card.tsx src/components/board/sortable-task-card.tsx
git commit -m "fix: ボタンクリックとドラッグの競合を解消"
```
