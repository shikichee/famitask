'use server';

import { db } from '@/lib/db';
import { thanks } from '@/lib/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { Thanks } from '@/types/database';

function toThanks(row: typeof thanks.$inferSelect): Thanks {
  return {
    id: row.id,
    completion_id: row.completionId,
    from_member_id: row.fromMemberId,
    to_member_id: row.toMemberId,
    created_at: row.createdAt.toISOString(),
  };
}

export async function getThanks(): Promise<Thanks[]> {
  const rows = await db
    .select()
    .from(thanks)
    .orderBy(desc(thanks.createdAt))
    .limit(100);
  return rows.map(toThanks);
}

export async function sendThanks(completionId: string, fromMemberId: string, toMemberId: string): Promise<void> {
  await db
    .insert(thanks)
    .values({ completionId, fromMemberId, toMemberId })
    .onConflictDoNothing();
  await db.execute(sql`SELECT increment_points(${toMemberId}, 1)`);
}

export async function removeThanks(completionId: string, fromMemberId: string, toMemberId: string): Promise<void> {
  await db
    .delete(thanks)
    .where(and(
      eq(thanks.completionId, completionId),
      eq(thanks.fromMemberId, fromMemberId),
    ));
  await db.execute(sql`SELECT increment_points(${toMemberId}, -1)`);
}
