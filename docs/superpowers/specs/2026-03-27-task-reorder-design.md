# タスク並べ替え機能 設計書

## 概要

タスクカードを長押しでドラッグ&ドロップし、並び替え・グループ間移動を行う機能。

## 要件

- 長押し（約300ms）でドラッグ開始（PC・モバイル共通）
- 同一グループ内での並び替え
- グループ間のドラッグ移動（assigned_toの変更を伴う）
- 並び順は家族全体で共有（Supabase Realtimeで同期）
- グループ間移動時の通知は既存ボタンと同じロジック:
  - みんな→自分: 通知なし
  - 自分/みんな→他人: 通知あり
  - 同グループ内並べ替え: 通知なし

## 技術選定

**@dnd-kit** を採用。理由:

- React向けモダン設計
- TouchSensor / PointerSensor に `activationConstraint.delay` が内蔵（長押し対応）
- DragOverlay でドラッグ中のビジュアルフィードバックが容易
- 複数コンテナ（グループ）間の移動をサポート（SortableContext + droppable）

### インストールパッケージ

- `@dnd-kit/core`
- `@dnd-kit/sortable`
- `@dnd-kit/utilities`

## データモデル変更

### マイグレーション

`tasks` テーブルに `position` カラムを追加:

```sql
ALTER TABLE tasks ADD COLUMN position INTEGER NOT NULL DEFAULT 0;

-- 既存タスクにcreated_at降順でpositionを付与
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) AS rn
  FROM tasks
  WHERE status = 'pending'
)
UPDATE tasks SET position = ranked.rn FROM ranked WHERE tasks.id = ranked.id;
```

### 型定義更新

`src/types/database.ts` の `Task` 型に `position: number` を追加。

## アーキテクチャ

### コンポーネント構成

```
page.tsx
└── DndContext (sensors, onDragStart, onDragEnd, onDragOver)
    ├── SortableContext (group: unassigned)
    │   └── SortableTaskCard[] (useSortable)
    ├── SortableContext (group: member-A)
    │   └── SortableTaskCard[]
    ├── SortableContext (group: member-B)
    │   └── SortableTaskCard[]
    └── DragOverlay
        └── TaskCard (ドラッグ中の見た目)
```

### 新規ファイル

- `src/components/board/sortable-task-card.tsx` — useSortable をラップした TaskCard
- `src/components/board/task-board-dnd.tsx` — DndContext + DragOverlay + ドラッグロジック

### 変更ファイル

- `supabase/schema.sql` — position カラム追加
- `src/types/database.ts` — Task 型に position 追加
- `src/hooks/use-tasks.ts`:
  - クエリを `order('position', { ascending: true })` に変更
  - `reorderTasks(taskId, newPosition, groupTasks)` 関数追加
  - addTask 時に position=0 を設定し、既存タスクの position をインクリメント
- `src/components/board/task-list.tsx` — SortableContext でラップ
- `src/app/page.tsx` — DndContext を配置、ドラッグイベントハンドラ

## UIインタラクション

1. **ドラッグ開始**: 長押し300ms → カードが浮き上がる（scale + shadow + opacity変化）
2. **ドラッグ中**: DragOverlay でカードのゴースト表示、移動先にプレースホルダー（枠線）
3. **ドロップ**:
   - 同グループ: position の一括更新
   - 別グループ: assigned_to 変更 + position 更新 + 条件付き通知
4. **キャンセル**: ドラッグ中にエリア外でドロップ → 元の位置に戻る

## 並べ替えロジック

position更新は「移動先のグループ内タスクのposition再計算」で行う:

1. ドロップ先グループのタスク配列を取得
2. ドラッグしたタスクを新しいインデックスに挿入
3. 配列全体に 0, 1, 2, ... と position を振り直す
4. Supabase に一括更新（各タスクの id と新 position）

## リアルタイム同期

既存の Realtime subscription が UPDATE イベントを検知するため、position 変更は自動的に他のクライアントに反映される。ローカルでは楽観的更新を行い、サーバー応答後に確定する。

## エッジケース

- **同時編集**: 2人が同時に並べ替えた場合、後勝ち（最後のUPDATEが反映）
- **ドラッグ中のタスク削除**: Realtime で削除イベント受信時、ドラッグをキャンセル
- **新規タスク追加**: position=0 で先頭に挿入、既存タスクの position を +1
