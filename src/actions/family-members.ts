'use server';

import { db } from '@/lib/db';
import { familyMembers } from '@/lib/schema';
import { eq, asc } from 'drizzle-orm';
import type { FamilyMember } from '@/types/database';

function toMember(row: typeof familyMembers.$inferSelect): FamilyMember {
  return {
    id: row.id,
    name: row.name,
    avatar: row.avatar,
    color: row.color,
    role: row.role as 'adult' | 'child',
    total_points: row.totalPoints,
    is_admin: row.isAdmin,
    email: row.email,
    last_seen_history_at: row.lastSeenHistoryAt.toISOString(),
  };
}

export async function getFamilyMembers(): Promise<FamilyMember[]> {
  const rows = await db
    .select()
    .from(familyMembers)
    .orderBy(asc(familyMembers.name));
  return rows.map(toMember);
}

export async function updateLastSeen(memberId: string): Promise<void> {
  await db
    .update(familyMembers)
    .set({ lastSeenHistoryAt: new Date() })
    .where(eq(familyMembers.id, memberId));
}
