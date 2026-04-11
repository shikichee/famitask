import { NextRequest, NextResponse } from 'next/server';
import { getAuthMember } from '@/lib/api-auth';
import { db } from '@/lib/db';
import { pushSubscriptions } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  const { member_id, endpoint, p256dh, auth } = await request.json();

  if (!member_id || !endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const member = await getAuthMember();
  if (!member) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await db
    .insert(pushSubscriptions)
    .values({ memberId: member_id, endpoint, p256dh, auth })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { memberId: member_id, p256dh, auth },
    });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const { endpoint } = await request.json();

  if (!endpoint) {
    return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 });
  }

  const member = await getAuthMember();
  if (!member) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));

  return NextResponse.json({ ok: true });
}
