import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from './auth';
import { db } from './db';
import { familyMembers } from './schema';
import { eq } from 'drizzle-orm';
import type { FamilyMember } from '@/types/database';

export async function getAuthMember(): Promise<FamilyMember | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  const [member] = await db
    .select()
    .from(familyMembers)
    .where(eq(familyMembers.id, payload.memberId));

  if (!member) return null;

  return {
    id: member.id,
    name: member.name,
    avatar: member.avatar,
    color: member.color,
    role: member.role as 'adult' | 'child',
    total_points: member.totalPoints,
    is_admin: member.isAdmin,
    email: member.email,
    last_seen_history_at: member.lastSeenHistoryAt.toISOString(),
  };
}
