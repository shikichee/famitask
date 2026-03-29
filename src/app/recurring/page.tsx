'use client';

import { useState, useCallback } from 'react';
import { RecurringTaskTemplate } from '@/types/database';
import { AppShell } from '@/components/app-shell';
import { TemplateList } from '@/components/recurring/template-list';
import { TemplateForm } from '@/components/recurring/template-form';
import { useRecurringTemplates } from '@/hooks/use-recurring-templates';
import { useCategories } from '@/hooks/use-tasks';
import { Plus } from 'lucide-react';

export default function RecurringPage() {
  return (
    <AppShell>
      {({ currentMemberId }) => (
        <RecurringContent currentMemberId={currentMemberId} />
      )}
    </AppShell>
  );
}

function RecurringContent({ currentMemberId }: { currentMemberId: string }) {
  const { templates, loading, addTemplate, updateTemplate, deleteTemplate, toggleActive } = useRecurringTemplates();
  const categories = useCategories();
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<RecurringTaskTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RecurringTaskTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleEdit = useCallback((template: RecurringTaskTemplate) => {
    setEditTarget(template);
    setFormOpen(true);
  }, []);

  const handleFormSubmit = useCallback(async (data: Parameters<typeof addTemplate>[0]) => {
    if (editTarget) {
      await updateTemplate(editTarget.id, data);
    } else {
      await addTemplate(data);
    }
  }, [editTarget, addTemplate, updateTemplate]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await deleteTemplate(deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
  }, [deleteTarget, deleteTemplate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold">くりかえしタスク設定</h2>
        <button
          onClick={() => { setEditTarget(null); setFormOpen(true); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F25C05] text-white text-sm font-medium hover:opacity-85 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          追加
        </button>
      </div>

      <TemplateList
        templates={templates}
        categories={categories}
        onToggleActive={toggleActive}
        onEdit={handleEdit}
        onDelete={setDeleteTarget}
      />

      <TemplateForm
        key={editTarget?.id ?? 'new'}
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditTarget(null); }}
        categories={categories}
        currentMemberId={currentMemberId}
        editTemplate={editTarget}
        onSubmit={handleFormSubmit}
      />

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-card rounded-2xl p-6 mx-4 max-w-sm w-full shadow-xl space-y-4">
            <p className="font-bold text-base">くりかえし設定を削除しますか？</p>
            <p className="text-sm text-muted-foreground">
              「{deleteTarget.title}」のくりかえし設定を削除します。既に作成されたタスクはそのまま残ります。
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2 rounded-xl border text-sm font-medium"
                disabled={deleting}
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 py-2 rounded-xl bg-destructive text-white text-sm font-medium hover:opacity-90 transition-colors disabled:opacity-50"
                disabled={deleting}
              >
                {deleting ? '削除中...' : '削除する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
