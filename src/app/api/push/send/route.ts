import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { getAuthMember } from '@/lib/api-auth';
import { db } from '@/lib/db';
import { familyMembers, pushSubscriptions } from '@/lib/schema';
import { ne, inArray } from 'drizzle-orm';

let vapidConfigured = false;

function ensureVapidConfigured() {
  if (vapidConfigured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    throw new Error('VAPID keys not configured');
  }
  let subject = process.env.VAPID_SUBJECT || 'mailto:admin@famitask.example.com';
  if (!subject.startsWith('mailto:') && !subject.startsWith('https://')) {
    subject = `mailto:${subject}`;
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
}

export async function POST(request: NextRequest) {
  const { member_ids, exclude_member_id, title, body, url } = await request.json();

  if (!title || !body) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const member = await getAuthMember();
  if (!member) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let targetMemberIds: string[] = member_ids || [];

  if (!member_ids && exclude_member_id) {
    const members = await db
      .select({ id: familyMembers.id })
      .from(familyMembers)
      .where(ne(familyMembers.id, exclude_member_id));
    targetMemberIds = members.map(m => m.id);
  } else if (!member_ids && !exclude_member_id) {
    const members = await db.select({ id: familyMembers.id }).from(familyMembers);
    targetMemberIds = members.map(m => m.id);
  }

  if (targetMemberIds.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  const subscriptions = await db
    .select()
    .from(pushSubscriptions)
    .where(inArray(pushSubscriptions.memberId, targetMemberIds));

  if (!subscriptions.length) {
    return NextResponse.json({ sent: 0 });
  }

  ensureVapidConfigured();

  const payload = JSON.stringify({ title, body, url: url || '/' });
  const expiredEndpoints: string[] = [];

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload,
        );
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          expiredEndpoints.push(sub.endpoint);
        }
        throw err;
      }
    })
  );

  if (expiredEndpoints.length > 0) {
    await db
      .delete(pushSubscriptions)
      .where(inArray(pushSubscriptions.endpoint, expiredEndpoints));
  }

  const sent = results.filter((r) => r.status === 'fulfilled').length;
  return NextResponse.json({ sent, expired: expiredEndpoints.length });
}
